const STORAGE_KEY = "savedWordCards";
const SEQ_KEY = "savedWordCardSeq";

const DEFAULT_STORAGE = {
  [STORAGE_KEY]: [],
  [SEQ_KEY]: 1
};

function normalizeWord(word) {
  return String(word || "").trim().toLowerCase();
}

function normalizeContext(context) {
  return String(context || "").trim().replace(/\s+/gu, " ").toLowerCase();
}

function formatDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function buildSourceKey(url, readingId, videoId, noteId) {
  if (Number.isInteger(readingId)) {
    return `reading:${readingId}`;
  }
  if (Number.isInteger(videoId)) {
    return `video:${videoId}`;
  }
  if (url) {
    return `url:${String(url).trim()}`;
  }
  if (Number.isInteger(noteId)) {
    return `note:${noteId}`;
  }
  return "manual";
}

async function buildEncounterKey(word, sourceKey, context) {
  const raw = `${normalizeWord(word)}|${sourceKey}|${normalizeContext(context)}`;
  const bytes = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

function sortEncountersDesc(a, b) {
  return String(b?.created_at || "").localeCompare(String(a?.created_at || ""));
}

function buildLookupPayload(word, lookup) {
  const value = lookup && typeof lookup === "object" ? lookup : {};
  const otherMeanings = Array.isArray(value.otherMeanings)
    ? value.otherMeanings
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          meaning: String(item.meaning || "").trim(),
          partOfSpeech: String(item.partOfSpeech || "").trim(),
          example: String(item.example || "").trim()
        }))
        .filter((item) => item.meaning)
    : [];

  return {
    word: String(value.word || word || "").trim(),
    contextMeaning: String(value.contextMeaning || value.m || "").trim(),
    englishDefinition: String(value.englishDefinition || value.english_definition || "").trim(),
    partOfSpeech: String(value.partOfSpeech || value.p || "").trim(),
    grammarRole: String(value.grammarRole || "").trim(),
    explanation: String(value.explanation || "").trim(),
    baseForm: String(value.baseForm || "").trim(),
    otherForms: [],
    otherMeanings
  };
}

function ensurePayload(word, record) {
  const row = record && typeof record === "object" ? record : {};
  const parsedData = row.data && typeof row.data === "object" ? JSON.parse(JSON.stringify(row.data)) : {};
  let encounters = Array.isArray(parsedData.encounters)
    ? parsedData.encounters.filter((item) => item && typeof item === "object")
    : [];

  if (!encounters.length) {
    encounters = [
      {
        key: `legacy-${row.id || "local"}`,
        context: String(row.context || "").trim(),
        url: row.url || null,
        note_id: row.note_id ?? null,
        reading_id: row.reading_id ?? null,
        video_id: row.video_id ?? null,
        created_at: row.created_at || formatDateTime(),
        lookup: buildLookupPayload(word, parsedData)
      }
    ];
  }

  return {
    ...parsedData,
    schemaVersion: 2,
    encounters: encounters
      .map((encounter) => ({
        key: String(encounter.key || ""),
        context: String(encounter.context || "").trim(),
        url: encounter.url || null,
        note_id: encounter.note_id ?? null,
        reading_id: encounter.reading_id ?? null,
        video_id: encounter.video_id ?? null,
        created_at: encounter.created_at || row.created_at || formatDateTime(),
        lookup: buildLookupPayload(word, encounter.lookup)
      }))
      .sort(sortEncountersDesc)
  };
}

function buildRecordFromPayload(record, payload) {
  const latest = payload.encounters[0] || null;
  return {
    id: Number.parseInt(String(record.id), 10),
    word: String(record.word || "").trim(),
    context: latest?.context || "",
    url: latest?.url || null,
    data: payload,
    encounters: payload.encounters,
    created_at: record.created_at || latest?.created_at || formatDateTime(),
    note_id: latest?.note_id ?? record.note_id ?? null,
    reading_id: latest?.reading_id ?? record.reading_id ?? null,
    video_id: latest?.video_id ?? record.video_id ?? null,
    stability: Number(record.stability || 0),
    difficulty: Number(record.difficulty || 0),
    elapsed_days: Number.parseInt(String(record.elapsed_days || 0), 10) || 0,
    scheduled_days: Number.parseInt(String(record.scheduled_days || 0), 10) || 0,
    last_review: record.last_review || null,
    due: record.due || null,
    reps: Number.parseInt(String(record.reps || 0), 10) || 0,
    state: Number.parseInt(String(record.state || 0), 10) || 0
  };
}

function sortWordsDesc(words) {
  return [...words].sort((a, b) =>
    String(b?.created_at || "").localeCompare(String(a?.created_at || ""))
  );
}

export async function getSavedWordCards() {
  const stored = await chrome.storage.local.get(DEFAULT_STORAGE);
  const words = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];

  return sortWordsDesc(
    words
      .filter((item) => item && typeof item === "object")
      .map((item) => buildRecordFromPayload(item, ensurePayload(item.word, item)))
  );
}

export async function saveWordCard(card) {
  const stored = await chrome.storage.local.get(DEFAULT_STORAGE);
  const words = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
  const nextSeq = Number.parseInt(String(stored[SEQ_KEY] || 1), 10) || 1;
  const word = String(card?.word || "").trim();
  const context = String(card?.originalSentence || card?.context || "").trim();

  if (!word || !context) {
    throw new Error("单词和上下文不能为空");
  }

  const sourceKey = buildSourceKey(card?.url, card?.reading_id, card?.video_id, card?.note_id);
  const encounter = {
    key: await buildEncounterKey(word, sourceKey, context),
    context,
    url: card?.url || null,
    note_id: card?.note_id ?? null,
    reading_id: card?.reading_id ?? null,
    video_id: card?.video_id ?? null,
    created_at: formatDateTime(),
    lookup: buildLookupPayload(word, card)
  };

  const matchIndex = words.findIndex((item) => normalizeWord(item?.word) === normalizeWord(word));
  let created = false;
  let appended = false;

  if (matchIndex >= 0) {
    const current = words[matchIndex];
    const payload = ensurePayload(current.word, current);
    const existingEncounter = payload.encounters.find((item) => item.key === encounter.key);

    if (existingEncounter) {
      existingEncounter.lookup = {
        ...existingEncounter.lookup,
        ...encounter.lookup
      };
      existingEncounter.url = encounter.url;
      existingEncounter.context = encounter.context;
    } else {
      payload.encounters.unshift(encounter);
      appended = true;
    }

    payload.encounters.sort(sortEncountersDesc);
    words[matchIndex] = buildRecordFromPayload(
      {
        ...current,
        word,
        created_at: appended ? encounter.created_at : current.created_at
      },
      payload
    );
  } else {
    created = true;
    appended = true;
    const payload = {
      schemaVersion: 2,
      encounters: [encounter]
    };
    words.unshift(
      buildRecordFromPayload(
        {
          id: nextSeq,
          word,
          created_at: encounter.created_at,
          note_id: encounter.note_id,
          reading_id: encounter.reading_id,
          video_id: encounter.video_id,
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          scheduled_days: 0,
          last_review: null,
          due: null,
          reps: 0,
          state: 0
        },
        payload
      )
    );
  }

  const nextWords = sortWordsDesc(words);
  await chrome.storage.local.set({
    [STORAGE_KEY]: nextWords,
    [SEQ_KEY]: created ? nextSeq + 1 : nextSeq
  });

  const savedWord =
    nextWords.find((item) => normalizeWord(item.word) === normalizeWord(word)) || null;

  return {
    savedWord,
    created,
    appended
  };
}

export async function deleteSavedWordCard(id) {
  const words = await getSavedWordCards();
  const nextWords = words.filter((item) => item.id !== id);
  await chrome.storage.local.set({
    [STORAGE_KEY]: nextWords
  });
}

export const wordCardStorageKey = STORAGE_KEY;
