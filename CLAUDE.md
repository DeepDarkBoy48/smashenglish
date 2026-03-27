# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmashEnglish is an English learning platform backend. It exposes a FastAPI REST API that powers AI-driven features: grammar analysis, dictionary lookup, writing evaluation, translation, AI chat tutor, and spaced repetition (FSRS) review.

## Commands

All commands run from `my-fastapi-app/`:

```bash
# Activate virtualenv
source .venv/bin/activate

# Run dev server (hot reload)
uvicorn main:app --reload --port 8001

# Run with Docker Compose
docker compose up --build

# Run DB migration
python migrate_db.py

# Test scripts (not a test suite, just ad-hoc scripts)
python test/list_models.py
python test/test_gemini_async.py
```

Required environment variable: `GEMINI_API_KEY` in a `.env` file at project root.

## Architecture

The backend is a single-file FastAPI app with no sub-routers. All code lives in `my-fastapi-app/`:

- **`main.py`** - All FastAPI route handlers + all MySQL CRUD logic. Routes include `/analyze`, `/lookup`, `/quick-lookup`, `/rapid-lookup`, `/translate`, `/writing`, `/chat`, `/saved-words`, `/daily-notes`, `/video-notebooks`, `/reading-notebooks`, `/review/*`.
- **`gemini.py`** - All Gemini AI service functions. Each feature has a `get_*_config()` function returning `(model, thinking_level)`. Model constants: `DEFAULT_MODEL = 'gemini-3-flash-preview'`, `CHEAP_MODEL = 'gemini-2.5-flash-lite'`. All service functions are `async` and accept an optional `user_api_key` parameter.
- **`schemas.py`** - All Pydantic v2 models for request/response validation and Gemini structured output schemas.
- **`migrate_db.py`** - One-off DB migration script; run manually when adding columns.

## Key Patterns

**User API key passthrough**: Routes accept an `X-Gemini-Key` header; if present, a per-request Gemini client is created instead of the global default client.

**Saved words encounter system**: A word is stored once per `word` (case-insensitive). Each time the same word is looked up from a different source (URL, video notebook, reading notebook, daily note), a new "encounter" object is appended to the `data` JSON payload's `encounters` list. The payload schema version is `schemaVersion: 2`. The `build_encounter_key()` function generates a SHA1-based dedup key from `word + source_key + context`.

**FSRS integration**: The `fsrs` library (`Scheduler`, `Card`, `Rating`) handles spaced repetition scheduling. Ratings map as: 1=Again, 2=Hard, 3=Easy. FSRS state fields (`stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `reps`, `state`) are stored as columns on `saved_words`.

**Gemini structured output**: All Gemini calls use `response_mime_type="application/json"` + `response_schema=<PydanticModel>` to get typed, validated responses directly via `response.parsed`.

**Database**: MySQL at remote host, accessed via PyMySQL with `DictCursor`. No ORM. All queries are raw SQL in `main.py`.
