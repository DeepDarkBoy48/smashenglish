const DEFAULT_SETTINGS = {
  themeMode: "system"
};

const openSidepanelBtnEl = document.getElementById("open-sidepanel-btn");
const openOptionsBtnEl = document.getElementById("open-options-btn");
const popupStatusEl = document.getElementById("popup-status");
const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

let activeThemeMode = DEFAULT_SETTINGS.themeMode;

init();

async function init() {
  await restoreTheme();

  openSidepanelBtnEl.addEventListener("click", openSidepanel);
  openOptionsBtnEl.addEventListener("click", async () => {
    await openSidepanel(true);
    window.close();
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
      applyTheme(String(changes.themeMode.newValue || DEFAULT_SETTINGS.themeMode));
    }
  });
}

async function restoreTheme() {
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  applyTheme(settings.themeMode || DEFAULT_SETTINGS.themeMode);
}

async function openSidepanel(openSettings = false) {
  try {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    const activeTab = tabs[0];

    if (!activeTab?.windowId) {
      throw new Error("无法定位当前浏览器窗口");
    }

    if (openSettings) {
      await chrome.storage.local.set({
        openSettingsPanelNonce: Date.now()
      });
    }

    await chrome.sidePanel.open({
      windowId: activeTab.windowId
    });

    window.close();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "打开侧边栏失败", "error");
  }
}

function setStatus(message, level) {
  popupStatusEl.textContent = message;
  popupStatusEl.className = message
    ? `popup-status ${level || ""}`.trim()
    : "popup-status";
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
