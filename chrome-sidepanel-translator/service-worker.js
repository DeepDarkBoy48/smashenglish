const DEFAULT_SETTINGS = {
  backendBaseUrl: "https://learn.nanopixel.uk",
  themeMode: "system",
  showOnSelection: false,
  showOnDoubleClick: true,
  showSavedHighlights: true,
  sourceLang: "auto",
  targetLang: "auto",
  activePanelTab: "word-card"
};

const SAVED_WORDS_CACHE_TTL = 60 * 1000;
let savedWordsCache = [];
let savedWordsCacheAt = 0;

function sendRuntimeMessageSafely(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        const msg = chrome.runtime.lastError.message || "";
        if (
          msg.includes("Receiving end does not exist") ||
          msg.includes("Could not establish connection")
        ) {
          resolve({ ok: false, ignored: true });
          return;
        }
        resolve({ ok: false, error: msg });
        return;
      }
      resolve(response);
    });
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(DEFAULT_SETTINGS);
  await chrome.storage.local.set({
    ...DEFAULT_SETTINGS,
    ...current
  });

  await configureSidePanelBehavior();
});

chrome.runtime.onStartup.addListener(async () => {
  await configureSidePanelBehavior();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }
  if (changes.backendBaseUrl) {
    savedWordsCache = [];
    savedWordsCacheAt = 0;
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "TRANSLATE_TEXT") {
    handleTranslateMessage(message.payload)
      .then((translation) => sendResponse({ ok: true, translation }))
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Translation failed"
        });
      });
    return true;
  }

  if (message?.type === "ANALYZE_SENTENCE") {
    handleAnalyzeSentenceMessage(message.payload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Analysis failed"
        });
      });
    return true;
  }

  if (message?.type === "GENERATE_WORD_CARD") {
    handleGenerateWordCardMessage(message.payload)
      .then((card) => sendResponse({ ok: true, card }))
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Word card failed"
        });
      });
    return true;
  }

  if (message?.type === "GET_SAVED_WORDS_INDEX") {
    getSavedWordsIndex(Boolean(message?.payload?.force))
      .then((words) => sendResponse({ ok: true, words }))
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "获取高亮单词失败"
        });
      });
    return true;
  }

  if (message?.type === "LOOKUP_CACHED_WORD_CARD") {
    lookupCachedWordCard(message.payload)
      .then((card) => sendResponse({ ok: true, card }))
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "读取缓存单词卡失败"
        });
      });
    return true;
  }

  if (message?.type === "PAGE_TEXT_TRIGGER") {
    const text = String(message?.payload?.text || "").trim();
    const triggerType = String(message?.payload?.triggerType || "");
    if (!text) {
      sendResponse({ ok: false, error: "empty text" });
      return false;
    }

    sendRuntimeMessageSafely({
      type: "AUTO_PANEL_REQUEST",
      payload: {
        text,
        context: String(message?.payload?.context || "").trim(),
        url: String(message?.payload?.url || "").trim(),
        triggerType
      }
    });
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

async function handleTranslateMessage(payload) {
  const text = String(payload?.text || "").trim();
  const sourceLang = payload?.sourceLang || DEFAULT_SETTINGS.sourceLang;
  const targetLang = payload?.targetLang || DEFAULT_SETTINGS.targetLang;

  if (!text) {
    return "";
  }

  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  const backendBaseUrl = normalizeBaseUrl(
    settings.backendBaseUrl || DEFAULT_SETTINGS.backendBaseUrl
  );

  const response = await fetch(`${backendBaseUrl}/api/fastapi/translate-advanced`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      source_lang: sourceLang,
      target_lang: targetLang
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "后端翻译请求失败");
  }

  return String(data?.translation || "").trim();
}

async function handleAnalyzeSentenceMessage(payload) {
  const sentence = String(payload?.sentence || "").trim();

  if (!sentence) {
    throw new Error("请先输入要分析的英文句子。");
  }

  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  const backendBaseUrl = normalizeBaseUrl(
    settings.backendBaseUrl || DEFAULT_SETTINGS.backendBaseUrl
  );

  const response = await fetch(`${backendBaseUrl}/api/fastapi/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sentence
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "后端句法分析请求失败");
  }

  return normalizeAnalysisResponse(data, sentence);
}

async function handleGenerateWordCardMessage(payload) {
  const word = String(payload?.word || "").trim();
  const context = String(payload?.context || "").trim();
  const url = String(payload?.url || "").trim();

  if (!word || !context) {
    throw new Error("请提供单词和上下文句子。");
  }

  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  const backendBaseUrl = normalizeBaseUrl(
    settings.backendBaseUrl || DEFAULT_SETTINGS.backendBaseUrl
  );

  const response = await fetch(`${backendBaseUrl}/api/fastapi/quick-lookup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      word,
      context,
      url
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "后端单词卡片请求失败");
  }

  const card = normalizeWordCardResponse(data, word);
  upsertSavedWordsCache({
    word: card.word || word,
    context,
    url,
    lookup: card
  });
  await notifyActiveTabHighlightsRefresh();
  return card;
}

function normalizeWordCardResponse(payload, fallbackWord) {
  const parsed = payload && typeof payload === "object" ? payload : {};

  const otherMeanings = Array.isArray(parsed.otherMeanings)
    ? parsed.otherMeanings
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          meaning: String(item.meaning || "").trim(),
          partOfSpeech: String(item.partOfSpeech || "").trim(),
          example: String(item.example || "").trim()
        }))
        .filter((item) => item.meaning)
    : [];

  const card = {
    word: String(parsed.word || fallbackWord || "").trim(),
    contextMeaning: String(parsed.contextMeaning || parsed.meaning || "").trim(),
    englishDefinition: String(parsed.englishDefinition || parsed.english_definition || "").trim(),
    partOfSpeech: String(parsed.partOfSpeech || parsed.p || "").trim(),
    grammarRole: String(parsed.grammarRole || "").trim(),
    explanation: String(parsed.explanation || "").trim(),
    baseForm: String(parsed.baseForm || "").trim(),
    otherForms: [],
    otherMeanings
  };

  if (!card.word || !card.contextMeaning) {
    throw new Error("单词卡片内容不完整，请重试。");
  }

  return card;
}

function normalizeAnalysisResponse(payload, fallbackSentence) {
  const parsed = payload && typeof payload === "object" ? payload : {};

  return {
    englishSentence: String(parsed.englishSentence || fallbackSentence || "").trim(),
    chineseTranslation: String(parsed.chineseTranslation || "").trim(),
    sentencePattern: String(parsed.sentencePattern || "").trim(),
    mainTense: String(parsed.mainTense || "").trim(),
    chunks: Array.isArray(parsed.chunks)
      ? parsed.chunks
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            text: String(item.text || "").trim(),
            grammarDescription: String(item.grammarDescription || "").trim(),
            role: String(item.role || "").trim()
          }))
          .filter((item) => item.text)
      : [],
    detailedTokens: Array.isArray(parsed.detailedTokens)
      ? parsed.detailedTokens
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            text: String(item.text || "").trim(),
            partOfSpeech: String(item.partOfSpeech || "").trim(),
            role: String(item.role || "").trim(),
            explanation: String(item.explanation || "").trim(),
            meaning: String(item.meaning || "").trim()
          }))
          .filter((item) => item.text)
      : []
  };
}

async function configureSidePanelBehavior() {
  try {
    await chrome.sidePanel.setPanelBehavior({
      openPanelOnActionClick: true
    });
  } catch (_error) {
    // Ignore unsupported channels.
  }
}

function normalizeBaseUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/u, "");
}

function normalizeWord(word) {
  return String(word || "")
    .trim()
    .toLowerCase();
}

function normalizeContext(context) {
  return String(context || "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

function normalizeSavedWordRecord(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const encounters = Array.isArray(item.encounters)
    ? item.encounters
        .filter((encounter) => encounter && typeof encounter === "object")
        .map((encounter) => ({
          key: String(encounter.key || ""),
          context: String(encounter.context || "").trim(),
          url: encounter.url ? String(encounter.url).trim() : "",
          note_id: Number.isInteger(encounter.note_id) ? encounter.note_id : null,
          reading_id: Number.isInteger(encounter.reading_id) ? encounter.reading_id : null,
          video_id: Number.isInteger(encounter.video_id) ? encounter.video_id : null,
          created_at: String(encounter.created_at || ""),
          lookup: normalizeWordCardResponse(encounter.lookup || item.data || {}, item.word)
        }))
        .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    : [];

  return {
    word: String(item.word || "").trim(),
    encounters
  };
}

async function fetchSavedWords(force = false) {
  const now = Date.now();
  if (!force && savedWordsCacheAt && now - savedWordsCacheAt < SAVED_WORDS_CACHE_TTL) {
    return savedWordsCache;
  }

  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  const backendBaseUrl = normalizeBaseUrl(
    settings.backendBaseUrl || DEFAULT_SETTINGS.backendBaseUrl
  );

  const response = await fetch(`${backendBaseUrl}/api/fastapi/saved-words`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "后端单词列表请求失败");
  }

  savedWordsCache = Array.isArray(data?.words)
    ? data.words
        .map(normalizeSavedWordRecord)
        .filter(Boolean)
    : [];
  savedWordsCacheAt = now;
  return savedWordsCache;
}

async function getSavedWordsIndex(force = false) {
  const savedWords = await fetchSavedWords(force);
  return savedWords
    .map((item) => item.word)
    .filter(Boolean);
}

async function lookupCachedWordCard(payload) {
  const word = String(payload?.word || "").trim();
  const context = String(payload?.context || "").trim();
  const url = String(payload?.url || "").trim();

  if (!word) {
    return null;
  }

  const savedWords = await fetchSavedWords();
  const matchedWord = savedWords.find((item) => normalizeWord(item.word) === normalizeWord(word));
  if (!matchedWord || !matchedWord.encounters.length) {
    return null;
  }

  const rankedEncounters = [...matchedWord.encounters].sort((left, right) => {
    return scoreEncounter(right, context, url) - scoreEncounter(left, context, url);
  });
  const encounter = rankedEncounters[0];
  if (!encounter?.lookup) {
    return null;
  }

  return {
    ...encounter.lookup,
    word: encounter.lookup.word || matchedWord.word || word,
    originalSentence: context || encounter.context || "",
    url: encounter.url || url || "",
    note_id: encounter.note_id,
    reading_id: encounter.reading_id,
    video_id: encounter.video_id,
    source: "saved_words"
  };
}

function scoreEncounter(encounter, context, url) {
  if (!encounter || typeof encounter !== "object") {
    return 0;
  }

  let score = 0;
  const encounterUrl = String(encounter.url || "").trim();
  const encounterContext = normalizeContext(encounter.context || "");
  const targetContext = normalizeContext(context);
  const targetUrl = String(url || "").trim();

  if (targetUrl && encounterUrl === targetUrl) {
    score += 100;
  }
  if (targetContext && encounterContext === targetContext) {
    score += 60;
  }
  if (targetContext && encounterContext && encounterContext.includes(targetContext)) {
    score += 20;
  }
  if (targetContext && encounterContext && targetContext.includes(encounterContext)) {
    score += 20;
  }
  if (encounter.created_at) {
    score += 5;
  }

  return score;
}

function upsertSavedWordsCache(entry) {
  const word = String(entry?.word || "").trim();
  const context = String(entry?.context || "").trim();
  if (!word || !context) {
    return;
  }

  const normalizedWord = normalizeWord(word);
  const encounter = {
    key: `extension-${normalizedWord}-${Date.now()}`,
    context,
    url: String(entry?.url || "").trim(),
    note_id: Number.isInteger(entry?.note_id) ? entry.note_id : null,
    reading_id: Number.isInteger(entry?.reading_id) ? entry.reading_id : null,
    video_id: Number.isInteger(entry?.video_id) ? entry.video_id : null,
    created_at: new Date().toISOString(),
    lookup: normalizeWordCardResponse(entry?.lookup || {}, word)
  };

  const index = savedWordsCache.findIndex((item) => normalizeWord(item.word) === normalizedWord);
  if (index >= 0) {
    const current = savedWordsCache[index];
    const existingIndex = current.encounters.findIndex(
      (item) =>
        normalizeContext(item.context) === normalizeContext(context) &&
        String(item.url || "").trim() === encounter.url
    );
    if (existingIndex >= 0) {
      current.encounters[existingIndex] = encounter;
    } else {
      current.encounters.unshift(encounter);
    }
  } else {
    savedWordsCache.unshift({
      word,
      encounters: [encounter]
    });
  }
  savedWordsCacheAt = Date.now();
}

async function notifyActiveTabHighlightsRefresh() {
  try {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    const activeTab = tabs[0];
    if (!activeTab?.id) {
      return;
    }
    await chrome.tabs.sendMessage(activeTab.id, {
      type: "REFRESH_SAVED_WORDS_HIGHLIGHTS"
    });
  } catch (_error) {
    // Ignore tabs without injected content scripts.
  }
}
