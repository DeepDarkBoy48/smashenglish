const LANGUAGES = [
  { code: "auto", label: "自动识别" },
  { code: "zh", label: "简体中文" },
  { code: "en", label: "English" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "ru", label: "Russian" }
];

const DEFAULTS = {
  sourceLang: "auto",
  targetLang: "auto",
  backendBaseUrl: "https://learn.nanopixel.uk",
  themeMode: "system",
  showOnSelection: false,
  showOnDoubleClick: true,
  showSavedHighlights: true,
  activePanelTab: "word-card",
  openSettingsPanelNonce: 0
};

const tabEls = Array.from(document.querySelectorAll("[data-tab]"));
const panelEls = Array.from(document.querySelectorAll(".panel-screen"));

const sourceLangEl = document.getElementById("source-lang");
const targetLangEl = document.getElementById("target-lang");
const sourceTextEl = document.getElementById("source-text");
const targetOutputEl = document.getElementById("target-output");
const charCountEl = document.getElementById("char-count");
const translateBtnEl = document.getElementById("translate-btn");
const swapBtnEl = document.getElementById("swap-btn");
const copyBtnEl = document.getElementById("copy-btn");
const analysisTextEl = document.getElementById("analysis-text");
const analysisBtnEl = document.getElementById("analysis-btn");
const analysisStatusEl = document.getElementById("analysis-status");
const analysisOutputEl = document.getElementById("analysis-output");

const apiStatusEl = document.getElementById("api-status");
const runtimeStatusEl = document.getElementById("runtime-status");
const panelMenuBtnEl = document.getElementById("panel-menu-btn");
const panelMenuEl = document.getElementById("panel-menu");
const clearBtnEl = document.getElementById("clear-btn");
const openOptionsBtnEl = document.getElementById("open-options-btn");
const wordCardOutputEl = document.getElementById("word-card-output");
const settingsOverlayEl = document.getElementById("settings-overlay");
const settingsBackdropEl = document.getElementById("settings-backdrop");
const closeSettingsBtnEl = document.getElementById("close-settings-btn");
const cancelSettingsBtnEl = document.getElementById("cancel-settings-btn");
const saveSettingsBtnEl = document.getElementById("save-settings-btn");
const settingsBackendBaseUrlEl = document.getElementById("settings-backend-base-url");
const settingsThemeModeEl = document.getElementById("settings-theme-mode");
const settingsShowSavedHighlightsEl = document.getElementById("settings-show-saved-highlights");
const settingsShowOnSelectionEl = document.getElementById("settings-show-on-selection");
const settingsShowOnDoubleClickEl = document.getElementById("settings-show-on-double-click");
const settingsStatusEl = document.getElementById("settings-status");
const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

let currentTab = DEFAULTS.activePanelTab;
let isTranslating = false;
let hasOutput = false;
let isAnalyzing = false;
let isGeneratingWordCard = false;
let wordCardFeed = [];
let activeThemeMode = DEFAULTS.themeMode;
let isSettingsOpen = false;
let runtimeStatusTimer = null;
let currentSpeechUtterance = null;
let currentSpeechButton = null;

init();

function init() {
  applyTheme(DEFAULTS.themeMode);
  renderLanguageOptions(sourceLangEl);
  renderLanguageOptions(targetLangEl);
  bindEvents();
  restoreState();
  refreshApiStatus();
  syncTranslateButtonState();
  syncAnalyzeButtonState();
}

function bindEvents() {
  systemThemeQuery.addEventListener("change", () => {
    if (activeThemeMode === "system") {
      applyTheme("system");
    }
  });

  tabEls.forEach((tabEl) => {
    tabEl.addEventListener("click", () => {
      setActiveTab(tabEl.dataset.tab || DEFAULTS.activePanelTab);
      closePanelMenu();
    });
  });

  clearBtnEl.addEventListener("click", () => {
    stopWordCardSpeech();
    wordCardFeed = [];
    renderWordCardFeed();
    setRuntimeStatus("");
    closePanelMenu();
  });

  panelMenuBtnEl.addEventListener("click", () => {
    togglePanelMenu();
  });
  openOptionsBtnEl.addEventListener("click", async () => {
    closePanelMenu();
    await openSettingsPanel();
  });
  settingsBackdropEl.addEventListener("click", () => {
    void closeSettingsPanel();
  });
  closeSettingsBtnEl.addEventListener("click", () => {
    void closeSettingsPanel();
  });
  cancelSettingsBtnEl.addEventListener("click", () => {
    void closeSettingsPanel();
  });
  saveSettingsBtnEl.addEventListener("click", saveSettings);
  settingsThemeModeEl.addEventListener("change", () => {
    applyTheme(settingsThemeModeEl.value || DEFAULTS.themeMode);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !isSettingsOpen) {
      closePanelMenu();
    }
    if (event.key === "Escape" && isSettingsOpen) {
      void closeSettingsPanel();
    }
  });
  document.addEventListener("click", (event) => {
    if (!panelMenuEl.contains(event.target) && !panelMenuBtnEl.contains(event.target)) {
      closePanelMenu();
    }
  });

  sourceTextEl.addEventListener("input", () => {
    updateCharCount();
    syncTranslateButtonState();
  });
  analysisTextEl.addEventListener("input", () => {
    syncAnalyzeButtonState();
  });

  sourceTextEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      onTranslate();
    }
  });
  analysisTextEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      onAnalyze();
    }
  });

  translateBtnEl.addEventListener("click", onTranslate);
  analysisBtnEl.addEventListener("click", onAnalyze);
  swapBtnEl.addEventListener("click", onSwapLanguages);

  sourceLangEl.addEventListener("change", persistLanguageSelection);
  targetLangEl.addEventListener("change", persistLanguageSelection);

  copyBtnEl.addEventListener("click", async () => {
    if (!hasOutput) {
      return;
    }
    try {
      await navigator.clipboard.writeText(targetOutputEl.textContent || "");
    } catch (_error) {
      // Ignore clipboard failure.
    }
  });

  wordCardOutputEl.addEventListener("click", (event) => {
    const speakButton = event.target.closest("[data-action='speak-word']");
    if (!speakButton) {
      return;
    }
    const text = String(speakButton.dataset.text || "").trim();
    if (!text) {
      return;
    }
    toggleWordCardSpeech(text, speakButton);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }
    if (changes.backendBaseUrl) {
      refreshApiStatus();
    }
    if (changes.themeMode?.newValue) {
      applyTheme(String(changes.themeMode.newValue || DEFAULTS.themeMode));
    }
    if (changes.activePanelTab?.newValue) {
      setActiveTab(String(changes.activePanelTab.newValue), false);
    }
    if (
      changes.backendBaseUrl ||
      changes.themeMode ||
      changes.showOnSelection ||
      changes.showOnDoubleClick ||
      changes.showSavedHighlights
    ) {
      void restoreSettingsForm();
    }
    if (changes.openSettingsPanelNonce?.newValue) {
      void openSettingsPanel();
      chrome.storage.local.remove("openSettingsPanelNonce");
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "AUTO_PANEL_REQUEST") {
      return;
    }
    handleAutoPanelRequest(message?.payload).catch((error) => {
      if (currentTab === "word-card") {
        renderErrorState(error instanceof Error ? error.message : "生成失败");
      }
      setRuntimeStatus(error instanceof Error ? error.message : "处理失败", "error");
    });
  });
}

function renderLanguageOptions(selectEl) {
  selectEl.innerHTML = LANGUAGES.map(
    (item) => `<option value="${item.code}">${item.label}</option>`
  ).join("");
}

async function restoreState() {
  const saved = await chrome.storage.local.get(DEFAULTS);
  sourceLangEl.value = saved.sourceLang || DEFAULTS.sourceLang;
  targetLangEl.value = saved.targetLang || DEFAULTS.targetLang;
  applyTheme(saved.themeMode || DEFAULTS.themeMode);
  setActiveTab(saved.activePanelTab || DEFAULTS.activePanelTab, false);
  updateCharCount();
  applySettingsForm(saved);

  if (saved.openSettingsPanelNonce) {
    await openSettingsPanel();
    await chrome.storage.local.remove("openSettingsPanelNonce");
  }
}

async function refreshApiStatus() {
  const saved = await chrome.storage.local.get(DEFAULTS);
  if ((saved.backendBaseUrl || "").trim()) {
    apiStatusEl.textContent = "";
    apiStatusEl.className = "api-status";
  } else {
    apiStatusEl.textContent = "未配置后端地址";
    apiStatusEl.className = "api-status warn";
  }
}

function togglePanelMenu() {
  const isOpen = !panelMenuEl.hidden;
  if (isOpen) {
    closePanelMenu();
    return;
  }
  panelMenuEl.hidden = false;
  panelMenuBtnEl.setAttribute("aria-expanded", "true");
}

function closePanelMenu() {
  panelMenuEl.hidden = true;
  panelMenuBtnEl.setAttribute("aria-expanded", "false");
}

async function openSettingsPanel() {
  await restoreSettingsForm();
  isSettingsOpen = true;
  settingsOverlayEl.hidden = false;
  settingsOverlayEl.classList.add("show");
}

async function closeSettingsPanel() {
  const saved = await chrome.storage.local.get(DEFAULTS);
  applySettingsForm(saved);
  applyTheme(saved.themeMode || DEFAULTS.themeMode);
  setSettingsStatus("");
  isSettingsOpen = false;
  settingsOverlayEl.classList.remove("show");
  window.setTimeout(() => {
    if (!isSettingsOpen) {
      settingsOverlayEl.hidden = true;
    }
  }, 160);
}

async function restoreSettingsForm() {
  const settings = await chrome.storage.local.get(DEFAULTS);
  applySettingsForm(settings);
}

function applySettingsForm(settings) {
  settingsBackendBaseUrlEl.value = settings.backendBaseUrl || DEFAULTS.backendBaseUrl;
  settingsThemeModeEl.value = settings.themeMode || DEFAULTS.themeMode;
  settingsShowOnSelectionEl.checked = Boolean(settings.showOnSelection);
  settingsShowOnDoubleClickEl.checked = Boolean(settings.showOnDoubleClick);
  settingsShowSavedHighlightsEl.checked = Boolean(settings.showSavedHighlights);
}

async function saveSettings() {
  const backendBaseUrl = normalizeBaseUrl(
    settingsBackendBaseUrlEl.value.trim() || DEFAULTS.backendBaseUrl
  );
  const themeMode = settingsThemeModeEl.value || DEFAULTS.themeMode;
  const showOnSelection = settingsShowOnSelectionEl.checked;
  const showOnDoubleClick = settingsShowOnDoubleClickEl.checked;
  const showSavedHighlights = settingsShowSavedHighlightsEl.checked;

  if (!/^https?:\/\//u.test(backendBaseUrl)) {
    setSettingsStatus("后端基地址必须以 http:// 或 https:// 开头", "error");
    return;
  }

  await chrome.storage.local.set({
    backendBaseUrl,
    themeMode,
    showOnSelection,
    showOnDoubleClick,
    showSavedHighlights
  });

  applyTheme(themeMode);
  await refreshApiStatus();
  setSettingsStatus("设置已保存", "ok");
}

function updateCharCount() {
  charCountEl.textContent = `${sourceTextEl.value.length} CHARS`;
}

function syncTranslateButtonState() {
  translateBtnEl.disabled = isTranslating || !sourceTextEl.value.trim();
}

function syncAnalyzeButtonState() {
  analysisBtnEl.disabled = isAnalyzing || !analysisTextEl.value.trim();
}

async function onSwapLanguages() {
  const oldSource = sourceLangEl.value;
  const oldTarget = targetLangEl.value;
  sourceLangEl.value = oldTarget;
  targetLangEl.value = oldSource;

  const previousSourceText = sourceTextEl.value;
  sourceTextEl.value = hasOutput ? targetOutputEl.textContent || "" : "";
  setOutput(previousSourceText, Boolean(previousSourceText.trim()));
  updateCharCount();
  syncTranslateButtonState();
  await persistLanguageSelection();
}

async function persistLanguageSelection() {
  await chrome.storage.local.set({
    sourceLang: sourceLangEl.value,
    targetLang: targetLangEl.value
  });
}

async function onTranslate() {
  if (isTranslating) {
    return;
  }

  const text = sourceTextEl.value.trim();
  if (!text) {
    setOutput("翻译结果会显示在这里", false);
    return;
  }

  isTranslating = true;
  syncTranslateButtonState();
  translateBtnEl.textContent = "翻译中...";

  try {
    const response = await sendMessage({
      type: "TRANSLATE_TEXT",
      payload: {
        text,
        sourceLang: sourceLangEl.value,
        targetLang: targetLangEl.value
      }
    });

    if (!response?.ok) {
      throw new Error(response?.error || "翻译失败");
    }

    setOutput(response.translation || "", true);
  } catch (_error) {
    setOutput("翻译失败，请检查 API Key、模型名和网络。", false);
  } finally {
    isTranslating = false;
    translateBtnEl.textContent = "开始翻译";
    syncTranslateButtonState();
  }
}

async function onAnalyze() {
  if (isAnalyzing) {
    return;
  }

  const sentence = analysisTextEl.value.trim();
  if (!sentence) {
    renderAnalysisEmptyState();
    return;
  }

  isAnalyzing = true;
  syncAnalyzeButtonState();
  analysisBtnEl.textContent = "分析中...";
  setAnalysisStatus("正在分析句法结构...", "pending");
  renderAnalysisLoadingState(sentence);

  try {
    const response = await sendMessage({
      type: "ANALYZE_SENTENCE",
      payload: {
        sentence
      }
    });

    if (!response?.ok) {
      throw new Error(response?.error || "句法分析失败");
    }

    renderAnalysisResult(response.result || {});
    setAnalysisStatus("句法分析已完成", "ok");
  } catch (error) {
    renderAnalysisError(error instanceof Error ? error.message : "分析失败");
    setAnalysisStatus(error instanceof Error ? error.message : "分析失败", "error");
  } finally {
    isAnalyzing = false;
    analysisBtnEl.textContent = "开始分析";
    syncAnalyzeButtonState();
  }
}

async function handleAutoPanelRequest(payload) {
  const text = String(payload?.text || "").trim();
  const context = String(payload?.context || "").trim();
  const triggerType = String(payload?.triggerType || "");
  const url = String(payload?.url || "").trim();

  if (!text) {
    return;
  }

  const settings = await chrome.storage.local.get(DEFAULTS);
  if (triggerType === "selection" && !settings.showOnSelection) {
    return;
  }
  if (triggerType === "double_click" && !settings.showOnDoubleClick) {
    return;
  }

  if (triggerType === "saved_highlight_click" || triggerType === "youtube_caption_click") {
    setActiveTab("word-card");
  }

  if (currentTab === "word-card") {
    await showWordCard({
      word: text,
      context: context || text,
      url,
      triggerType
    });
    return;
  }

  if (currentTab === "analysis") {
    analysisTextEl.value = context || text;
    syncAnalyzeButtonState();
    await onAnalyze();
    return;
  }

  sourceTextEl.value = text;
  updateCharCount();
  syncTranslateButtonState();
  await onTranslate();
}

async function showWordCard({ word, context, url, triggerType }) {
  const normalizedWord = normalizeWord(word);
  const normalizedContext = normalizeContext(context);
  const existingCard = wordCardFeed.find((item) => {
    if (item?.isLoading) {
      return false;
    }
    return (
      normalizeWord(item.word || "") === normalizedWord &&
      normalizeContext(item.originalSentence || "") === normalizedContext
    );
  });

  if (existingCard) {
    setRuntimeStatus("当前单词卡片已存在，直接展示", "ok");
    renderWordCardFeed();
    return;
  }

  const cachedCard = await findCachedWordCard({ word, context, url });
  if (cachedCard) {
    wordCardFeed.push({
      id: `cached-${Date.now()}`,
      ...cachedCard,
      word: cachedCard.word || word,
      originalSentence: context || cachedCard.originalSentence || "",
      url: cachedCard.url || url,
      source: cachedCard.source || "saved_words"
    });
    renderWordCardFeed();
    setRuntimeStatus(
      triggerType === "saved_highlight_click"
        ? "已展示已有释义单词卡片"
        : "命中已有释义，未重复调用 AI",
      "ok"
    );
    return;
  }

  await generateWordCard({ word, context, url });
}

async function generateWordCard({ word, context, url }) {
  if (isGeneratingWordCard) {
    return;
  }

  isGeneratingWordCard = true;
  const loadingCardId = `loading-${Date.now()}`;
  wordCardFeed.push({
    id: loadingCardId,
    word,
    originalSentence: context,
    url,
    isLoading: true
  });
  renderWordCardFeed();
  setRuntimeStatus("正在生成单词卡片...");

  try {
    const response = await sendMessage({
      type: "GENERATE_WORD_CARD",
      payload: {
        word,
        context,
        url
      }
    });

    if (!response?.ok) {
      throw new Error(response?.error || "生成单词卡片失败");
    }

    const nextCard = {
      id: `generated-${Date.now()}`,
      ...(response.card || {}),
      word,
      originalSentence: context,
      url
    };
    wordCardFeed = wordCardFeed.map((item) => (item.id === loadingCardId ? nextCard : item));
    renderWordCardFeed();
    setRuntimeStatus("单词卡片已更新，并已同步保存到数据库", "ok");
  } catch (error) {
    wordCardFeed = wordCardFeed.filter((item) => item.id !== loadingCardId);
    renderErrorState(error instanceof Error ? error.message : "生成失败");
    throw error;
  } finally {
    isGeneratingWordCard = false;
  }
}

function setActiveTab(tab, persist = true) {
  currentTab = ["translate", "analysis", "word-card"].includes(tab) ? tab : "word-card";
  tabEls.forEach((tabEl) => {
    tabEl.classList.toggle("active", tabEl.dataset.tab === currentTab);
  });
  panelEls.forEach((panelEl) => {
    panelEl.classList.toggle("active", panelEl.id === `${currentTab}-panel`);
  });

  if (persist) {
    chrome.storage.local.set({
      activePanelTab: currentTab
    });
  }
}

function setOutput(text, outputReady) {
  hasOutput = outputReady;
  targetOutputEl.textContent = text;
  targetOutputEl.classList.toggle("output-empty", !outputReady);
  copyBtnEl.classList.toggle("show", outputReady);
}

function renderWordCardFeed() {
  stopWordCardSpeech();
  if (!wordCardFeed.length) {
    wordCardOutputEl.className = "card-state empty-state";
    wordCardOutputEl.innerHTML =
      '<div class="empty-copy">网页中的已保存单词会高亮显示，点击可直接查看卡片；也可双击新单词，或在 YouTube 视频里直接点击字幕单词生成卡片。</div>';
    return;
  }
  wordCardOutputEl.className = "card-state result-state";
  wordCardOutputEl.innerHTML = `
    <div class="word-card-feed">
      ${wordCardFeed.map((item) => renderWordCardItem(item)).join("")}
    </div>
  `;
  wordCardOutputEl.scrollTop = wordCardOutputEl.scrollHeight;
}

function renderErrorState(message) {
  wordCardOutputEl.className = "card-state error-state";
  wordCardOutputEl.innerHTML = `
    <div class="error-copy">
      <strong>单词卡片生成失败</strong>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderAnalysisEmptyState() {
  analysisOutputEl.className = "analysis-output empty-state";
  analysisOutputEl.innerHTML =
    '<div class="empty-copy">选中网页中的英文句子，或在上方输入一句英文，这里会展示句法结构、核心时态与逐词解析。</div>';
}

function renderAnalysisLoadingState(sentence) {
  analysisOutputEl.className = "analysis-output result-state";
  analysisOutputEl.innerHTML = `
    <article class="analysis-result-card analysis-loading-card">
      <div class="analysis-result-top">
        <div class="analysis-result-kicker">句法分析中</div>
        <h2>${escapeHtml(sentence)}</h2>
      </div>
      <div class="loading-bars">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </article>
  `;
}

function renderAnalysisError(message) {
  analysisOutputEl.className = "analysis-output error-state";
  analysisOutputEl.innerHTML = `
    <div class="error-copy">
      <strong>句法分析失败</strong>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderAnalysisResult(result) {
  const chunks = Array.isArray(result?.chunks) ? result.chunks : [];
  const tokens = Array.isArray(result?.detailedTokens) ? result.detailedTokens : [];
  const tags = [];

  if (result?.sentencePattern) {
    tags.push(`<span class="analysis-tag">${escapeHtml(result.sentencePattern)}</span>`);
  }
  if (result?.mainTense) {
    tags.push(`<span class="analysis-tag">${escapeHtml(result.mainTense)}</span>`);
  }

  analysisOutputEl.className = "analysis-output result-state";
  analysisOutputEl.innerHTML = `
    <article class="analysis-result-card">
      <header class="analysis-result-top">
        <div class="analysis-result-kicker">句法分析结果</div>
        <h2>${escapeHtml(result?.englishSentence || "")}</h2>
        ${result?.chineseTranslation ? `<p class="analysis-translation">${escapeHtml(result.chineseTranslation)}</p>` : ""}
        ${tags.length ? `<div class="analysis-tags">${tags.join("")}</div>` : ""}
      </header>
      ${
        chunks.length
          ? `
            <section class="analysis-section">
              <div class="analysis-section-title">结构拆分</div>
              <div class="analysis-chunks">
                ${chunks
                  .map(
                    (chunk) => `
                      <article class="analysis-chunk">
                        <div class="analysis-chunk-text">${escapeHtml(chunk.text || "")}</div>
                        <div class="analysis-chunk-grammar">${escapeHtml(chunk.grammarDescription || "")}</div>
                        ${chunk.role ? `<div class="analysis-chunk-role">${escapeHtml(chunk.role)}</div>` : ""}
                      </article>
                    `
                  )
                  .join("")}
              </div>
            </section>
          `
          : ""
      }
      ${
        tokens.length
          ? `
            <section class="analysis-section">
              <div class="analysis-section-title">逐词详解</div>
              <div class="analysis-token-list">
                ${tokens
                  .map(
                    (token) => `
                      <article class="analysis-token-card">
                        <div class="analysis-token-head">
                          <strong>${escapeHtml(token.text || "")}</strong>
                          ${token.partOfSpeech ? `<span>${escapeHtml(token.partOfSpeech)}</span>` : ""}
                        </div>
                        ${token.meaning ? `<div class="analysis-token-meaning">${escapeHtml(token.meaning)}</div>` : ""}
                        ${token.role ? `<div class="analysis-token-role">句法角色：${escapeHtml(token.role)}</div>` : ""}
                        ${token.explanation ? `<p>${escapeHtml(token.explanation)}</p>` : ""}
                      </article>
                    `
                  )
                  .join("")}
              </div>
            </section>
          `
          : ""
      }
    </article>
  `;
}

function setAnalysisStatus(message, level) {
  analysisStatusEl.textContent = message;
  analysisStatusEl.className = message
    ? `analysis-status ${level || ""}`.trim()
    : "analysis-status";
}

function renderWordCardItem(card) {
  if (card?.isLoading) {
    return `
      <article class="word-card skeleton-card">
        <header class="word-card-top">
          <div class="word-heading">
            <h2>${escapeHtml(card.word || "")}</h2>
            <span class="role-chip loading-chip">分析中</span>
          </div>
        </header>
        <section class="sentence-box">
          <p>${highlightWordInContext(card.originalSentence || "", card.word || "")}</p>
        </section>
        <div class="loading-bars">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </article>
    `;
  }

  const meanings = Array.isArray(card?.otherMeanings) ? card.otherMeanings : [];
  const lookupWord = String(card?.word || "").trim();
  const baseForm = String(card?.baseForm || "").trim();
  const displayWord = baseForm || lookupWord;
  const currentForm =
    lookupWord && lookupWord.toLowerCase() !== displayWord.toLowerCase()
      ? lookupWord
      : "";
  const badges = buildWordBadges(card);
  const pageMeta = buildSourceMeta(card);

  return `
    <article class="word-card">
      <div class="card-eyebrow">词汇详情</div>
      <header class="word-card-top">
        <div class="word-heading">
          <div class="word-title-stack">
            <div class="word-title-label">原型</div>
            <h2><span class="word-highlight-chip">${escapeHtml(displayWord)}</span></h2>
            ${currentForm ? `<div class="word-variant-row">当前词形 <strong>${escapeHtml(currentForm)}</strong></div>` : ""}
          </div>
          <button
            type="button"
            class="word-speak-btn"
            data-action="speak-word"
            data-text="${escapeAttribute(displayWord)}"
            title="朗读单词"
            aria-label="朗读单词 ${escapeAttribute(displayWord)}"
          >
            朗读
          </button>
        </div>
        ${badges ? `<div class="word-meta-row">${badges}</div>` : ""}
      </header>
      <section class="meaning-hero">
        <div class="section-eyebrow">文中释义</div>
        <div class="meaning-hero-text">${escapeHtml(card?.contextMeaning || "")}</div>
      </section>
      ${
        card?.englishDefinition
          ? `
            <section class="english-definition-block">
              <div class="section-eyebrow">English Definition</div>
              <div class="english-definition-card">${escapeHtml(card.englishDefinition)}</div>
            </section>
          `
          : ""
      }
      <section class="sentence-box">
        <div class="section-eyebrow">原句上下文</div>
        <p>${highlightWordInContext(card?.originalSentence || "", card?.word || "")}</p>
      </section>
      <section class="why-block">
        <div class="section-eyebrow">AI 深度解析</div>
        <div class="why-card">${renderExplanation(card?.explanation || "")}</div>
      </section>
      ${
        meanings.length
          ? `
            <section class="other-block">
              <div class="section-eyebrow">其他常见释义</div>
              <div class="other-list">
                ${meanings
                  .map(
                    (item) => `
                      <article class="other-item">
                        <div class="other-title">
                          ${item.partOfSpeech ? `<span class="mini-pos-chip">${escapeHtml(item.partOfSpeech)}</span>` : ""}
                          <strong>${escapeHtml(item.meaning || "")}</strong>
                        </div>
                        ${item.example ? `<p>"${escapeHtml(item.example)}"</p>` : ""}
                      </article>
                    `
                  )
                  .join("")}
              </div>
            </section>
          `
          : ""
      }
      ${pageMeta ? `<footer class="card-source-row">${pageMeta}</footer>` : ""}
    </article>
  `;
}

function setRuntimeStatus(message, level) {
  if (runtimeStatusTimer) {
    window.clearTimeout(runtimeStatusTimer);
    runtimeStatusTimer = null;
  }
  runtimeStatusEl.textContent = message;
  runtimeStatusEl.className = message
    ? `runtime-status ${level || ""}`.trim()
    : "runtime-status";
  if (message) {
    runtimeStatusTimer = window.setTimeout(() => {
      runtimeStatusEl.textContent = "";
      runtimeStatusEl.className = "runtime-status";
      runtimeStatusTimer = null;
    }, 2600);
  }
}

function setSettingsStatus(message, level) {
  settingsStatusEl.textContent = message;
  settingsStatusEl.className = message
    ? `settings-status ${level || ""}`.trim()
    : "settings-status";
}

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function findCachedWordCard({ word, context, url }) {
  const response = await sendMessage({
    type: "LOOKUP_CACHED_WORD_CARD",
    payload: {
      word,
      context,
      url
    }
  });

  if (!response?.ok) {
    throw new Error(response?.error || "读取已有单词卡失败");
  }

  return response.card || null;
}

function normalizeWord(word) {
  return String(word || "")
    .replace(/[^\p{L}\p{N}'-]+/gu, "")
    .trim()
    .toLowerCase();
}

function normalizeContext(context) {
  return String(context || "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

function renderExplanation(text) {
  return String(text || "")
    .split(/\n+/u)
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function buildWordBadges(card) {
  const chips = [];

  if (card?.partOfSpeech) {
    chips.push(`<span class="pill pill-pink">${escapeHtml(card.partOfSpeech)}</span>`);
  }

  if (card?.grammarRole) {
    chips.push(`<span class="pill pill-blue">${escapeHtml(card.grammarRole)}</span>`);
  }

  if (card?.source === "saved_words") {
    chips.push('<span class="pill pill-gray">已有释义</span>');
  }

  return chips.join("");
}

function buildSourceMeta(card) {
  const labels = [];

  if (Number.isInteger(card?.note_id)) {
    labels.push(`<span>note #${card.note_id}</span>`);
  }
  if (Number.isInteger(card?.reading_id)) {
    labels.push(`<span>reading #${card.reading_id}</span>`);
  }
  if (Number.isInteger(card?.video_id)) {
    labels.push(`<span>video #${card.video_id}</span>`);
  }
  if (card?.url) {
    labels.push(`<a href="${escapeAttribute(card.url)}" target="_blank" rel="noreferrer noopener">查看来源 ↗</a>`);
  }

  return labels.join("");
}

function highlightWordInContext(context, word) {
  const source = String(context || "");
  const target = String(word || "").trim();
  if (!source || !target) {
    return `"${escapeHtml(source)}"`;
  }

  const escaped = escapeRegExp(target);
  const highlighted = escapeHtml(source).replace(
    new RegExp(`(${escaped})`, "giu"),
    '<mark>$1</mark>'
  );
  return `"${highlighted}"`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function normalizeBaseUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/u, "");
}

function resolveTheme(mode) {
  if (mode === "dark") {
    return "dark";
  }
  if (mode === "light") {
    return "light";
  }
  return systemThemeQuery.matches ? "dark" : "light";
}

function applyTheme(mode) {
  activeThemeMode = mode || DEFAULTS.themeMode;
  const resolvedTheme = resolveTheme(activeThemeMode);
  document.documentElement.dataset.themeMode = activeThemeMode;
  document.documentElement.dataset.theme = resolvedTheme;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function toggleWordCardSpeech(text, buttonEl) {
  if (!("speechSynthesis" in window)) {
    setRuntimeStatus("当前浏览器不支持语音朗读", "error");
    return;
  }

  if (
    currentSpeechUtterance &&
    currentSpeechButton === buttonEl &&
    window.speechSynthesis.speaking
  ) {
    stopWordCardSpeech();
    return;
  }

  stopWordCardSpeech();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find(
    (voice) => voice.lang.startsWith("en") && voice.name.includes("English")
  );
  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  currentSpeechUtterance = utterance;
  currentSpeechButton = buttonEl;
  currentSpeechButton.classList.add("is-speaking");
  currentSpeechButton.textContent = "停止";

  utterance.onend = () => {
    resetWordCardSpeechState();
  };
  utterance.onerror = () => {
    setRuntimeStatus("语音播放出错", "error");
    resetWordCardSpeechState();
  };

  window.speechSynthesis.speak(utterance);
}

function stopWordCardSpeech() {
  if (!("speechSynthesis" in window)) {
    resetWordCardSpeechState();
    return;
  }
  if (
    currentSpeechUtterance ||
    window.speechSynthesis.speaking ||
    window.speechSynthesis.pending
  ) {
    window.speechSynthesis.cancel();
  }
  resetWordCardSpeechState();
}

function resetWordCardSpeechState() {
  if (currentSpeechButton) {
    currentSpeechButton.classList.remove("is-speaking");
    currentSpeechButton.textContent = "朗读";
  }
  currentSpeechUtterance = null;
  currentSpeechButton = null;
}
