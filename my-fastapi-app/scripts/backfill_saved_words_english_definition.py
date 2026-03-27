#!/usr/bin/env python3
"""
Backfill missing englishDefinition for saved_words.data.encounters[].lookup.

Usage examples:
  ./.venv/bin/python scripts/backfill_saved_words_english_definition.py --dry-run --limit 10
  ./.venv/bin/python scripts/backfill_saved_words_english_definition.py --limit 50
  ./.venv/bin/python scripts/backfill_saved_words_english_definition.py --overwrite
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field

SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

import gemini  # noqa: E402
import main  # noqa: E402
from google.genai import types  # noqa: E402


class EnglishDefinitionResult(BaseModel):
    englishDefinition: str = Field(
        description="A concise natural-English definition for the target word in this context."
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill missing englishDefinition in saved_words JSON.")
    parser.add_argument("--limit", type=int, default=0, help="Maximum number of missing encounters to process.")
    parser.add_argument("--word-id", type=int, default=0, help="Only process one saved_words row by id.")
    parser.add_argument("--overwrite", action="store_true", help="Rewrite existing englishDefinition too.")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing to DB.")
    parser.add_argument(
        "--thinking-level",
        default="minimal",
        choices=["minimal", "low", "medium", "high"],
        help="Gemini thinking level."
    )
    return parser.parse_args()


def should_fill(lookup: dict, overwrite: bool) -> bool:
    if overwrite:
        return True
    return not str((lookup or {}).get("englishDefinition") or "").strip()


async def generate_english_definition(
    client,
    word: str,
    context: str,
    context_meaning: str = "",
    base_form: str = "",
    part_of_speech: str = "",
    thinking_level: str = "minimal",
) -> str:
    prompt = f"""
You are an English lexicographer.
Return a concise English definition for how the target word is used in the sentence.

Rules:
- Output JSON only.
- Field name must be `englishDefinition`.
- Use natural English only.
- Keep it concise, ideally 6-18 words.
- Describe the meaning in this exact context, not all meanings.
- Do not use Chinese.
- Do not include quotes, numbering, or example sentences.

Target word: {word}
Base form: {base_form or word}
Part of speech: {part_of_speech}
Context meaning in Chinese: {context_meaning}
Sentence context: {context}
""".strip()

    response = await client.aio.models.generate_content(
        model=gemini.DEFAULT_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=EnglishDefinitionResult,
            thinking_config=types.ThinkingConfig(thinking_level=thinking_level),
        ),
    )
    if not response.parsed:
        raise ValueError("Empty response from Gemini")
    return str(response.parsed.englishDefinition or "").strip()


async def process(args: argparse.Namespace) -> None:
    client = gemini.get_client()
    connection = main.get_db_connection()
    stats = {
        "rows_scanned": 0,
        "rows_updated": 0,
        "encounters_updated": 0,
        "errors": 0,
    }

    try:
        with connection.cursor() as cursor:
            sql = "SELECT * FROM saved_words"
            params: tuple[object, ...] = ()
            if args.word_id:
                sql += " WHERE id = %s"
                params = (args.word_id,)
            sql += " ORDER BY id ASC"
            cursor.execute(sql, params)
            rows = cursor.fetchall()

            pending: list[tuple[dict, dict, dict]] = []
            for row in rows:
                stats["rows_scanned"] += 1
                payload = main.ensure_v2_payload(row["word"], row.get("data"), row)
                encounters = payload.get("encounters") if isinstance(payload.get("encounters"), list) else []
                for enc in encounters:
                    if not isinstance(enc, dict):
                        continue
                    lookup = main.build_lookup_payload(row["word"], enc.get("lookup"))
                    if should_fill(lookup, args.overwrite):
                        pending.append((row, payload, enc))
                        if args.limit and len(pending) >= args.limit:
                            break
                if args.limit and len(pending) >= args.limit:
                    break

            if not pending:
                print("No encounters need backfill.")
                return

            print(f"Found {len(pending)} encounter(s) to backfill.")

            updated_row_ids: set[int] = set()
            for index, (row, payload, encounter) in enumerate(pending, start=1):
                lookup = main.build_lookup_payload(row["word"], encounter.get("lookup"))
                context = str(encounter.get("context") or row.get("context") or "").strip()
                if not context:
                    print(f"[skip] row={row['id']} word={row['word']} missing context")
                    continue

                try:
                    english_definition = await generate_english_definition(
                        client=client,
                        word=row["word"],
                        context=context,
                        context_meaning=str(lookup.get("contextMeaning") or "").strip(),
                        base_form=str(lookup.get("baseForm") or "").strip(),
                        part_of_speech=str(lookup.get("partOfSpeech") or "").strip(),
                        thinking_level=args.thinking_level,
                    )
                except Exception as exc:
                    stats["errors"] += 1
                    print(f"[error] row={row['id']} word={row['word']} {exc}")
                    continue

                if not english_definition:
                    stats["errors"] += 1
                    print(f"[error] row={row['id']} word={row['word']} empty englishDefinition")
                    continue

                if args.dry_run:
                    print(
                        f"[dry-run {index}/{len(pending)}] row={row['id']} word={row['word']} -> {english_definition}"
                    )
                    continue

                encounter["lookup"] = main.merge_lookup_payload(
                    row["word"],
                    lookup,
                    {"englishDefinition": english_definition},
                )
                payload, latest = main.sync_payload_from_latest_encounter(row["word"], payload)
                cursor.execute(
                    """
                    UPDATE saved_words
                    SET data = %s, note_id = %s, reading_id = %s, video_id = %s
                    WHERE id = %s
                    """,
                    (
                        json.dumps(payload, ensure_ascii=False),
                        latest.get("note_id", row.get("note_id")),
                        latest.get("reading_id", row.get("reading_id")),
                        latest.get("video_id", row.get("video_id")),
                        row["id"],
                    ),
                )
                connection.commit()
                updated_row_ids.add(row["id"])
                stats["encounters_updated"] += 1
                stats["rows_updated"] = len(updated_row_ids)
                print(
                    f"[ok {index}/{len(pending)}] row={row['id']} word={row['word']} -> {english_definition}"
                )

            print(json.dumps(stats, ensure_ascii=False))
    finally:
        connection.close()


def main_entry() -> None:
    args = parse_args()
    asyncio.run(process(args))


if __name__ == "__main__":
    main_entry()
