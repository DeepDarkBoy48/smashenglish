const DEFAULT_SETTINGS = {
  backendBaseUrl: "https://learn.nanopixel.uk",
  showOnSelection: false,
  showOnDoubleClick: true,
  showSavedHighlights: true,
  themeMode: "system"
};

const backendBaseUrlEl = document.getElementById("backend-base-url");
const themeModeEl = document.getElementById("theme-mode");
const showOnSelectionEl = document.getElementById("show-on-selection");
const showOnDoubleClickEl = document.getElementById("show-on-double-click");
const showSavedHighlightsEl = document.getElementById("show-saved-highlights");
const saveBtnEl = document.getElementById("save-btn");
const statusTextEl = document.getElementById("status-text");
const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

let activeThemeMode = DEFAULT_SETTINGS.themeMode;

init();

function init() {
  applyTheme(DEFAULT_SETTINGS.themeMode);
  restoreSettings();
  saveBtnEl.addEventListener("click", saveSettings);
  themeModeEl.addEventListener("change", () => {
    applyTheme(themeModeEl.value);
  });
  systemThemeQuery.addEventListener("change", () => {
    if (activeThemeMode === "system") {
      applyTheme("system");
    }
  });
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }
    if (changes.themeMode?.newValue) {
      const nextMode = String(changes.themeMode.newValue || DEFAULT_SETTINGS.themeMode);
      themeModeEl.value = nextMode;
      applyTheme(nextMode);
    }
  });
}

async function restoreSettings() {
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  backendBaseUrlEl.value = settings.backendBaseUrl || DEFAULT_SETTINGS.backendBaseUrl;
  themeModeEl.value = settings.themeMode || DEFAULT_SETTINGS.themeMode;
  showOnSelectionEl.checked = Boolean(settings.showOnSelection);
  showOnDoubleClickEl.checked = Boolean(settings.showOnDoubleClick);
  showSavedHighlightsEl.checked = Boolean(settings.showSavedHighlights);
  applyTheme(themeModeEl.value);
}

async function saveSettings() {
  const backendBaseUrl = normalizeBaseUrl(
    backendBaseUrlEl.value.trim() || DEFAULT_SETTINGS.backendBaseUrl
  );
  const themeMode = themeModeEl.value || DEFAULT_SETTINGS.themeMode;
  const showOnSelection = showOnSelectionEl.checked;
  const showOnDoubleClick = showOnDoubleClickEl.checked;
  const showSavedHighlights = showSavedHighlightsEl.checked;

  if (!/^https?:\/\//u.test(backendBaseUrl)) {
    setStatus("后端基地址必须以 http:// 或 https:// 开头", "error");
    return;
  }

  await chrome.storage.local.set({
    backendBaseUrl,
    themeMode,
    showOnSelection,
    showOnDoubleClick,
    showSavedHighlights
  });

  setStatus("设置已保存", "ok");
}

function setStatus(message, level) {
  statusTextEl.textContent = message;
  statusTextEl.className = `status-text ${level || ""}`.trim();
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
  activeThemeMode = mode || DEFAULT_SETTINGS.themeMode;
  const resolvedTheme = resolveTheme(activeThemeMode);
  document.documentElement.dataset.themeMode = activeThemeMode;
  document.documentElement.dataset.theme = resolvedTheme;
}
