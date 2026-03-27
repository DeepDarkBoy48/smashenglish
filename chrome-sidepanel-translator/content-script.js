const HIGHLIGHT_ATTR = "data-smash-word-highlight";
const HIGHLIGHT_STYLE_ID = "smash-word-highlight-style";
const HIGHLIGHT_CLASS = "smash-word-highlight";
const YOUTUBE_CAPTION_WORD_ATTR = "data-smash-youtube-caption-word";
const YOUTUBE_CAPTION_WORD_ACTIVE_ATTR = "data-smash-youtube-caption-word-active";
const YOUTUBE_CAPTION_WORD_CLASS = "smash-youtube-caption-word";
const BLOCK_SCOPE_SELECTOR = "p, div, li, blockquote, article, section, main, td, th, h1, h2, h3, h4, h5, h6";
const TOKEN_PATTERN = /([A-Za-z][A-Za-z'-]*)/gu;
const SKIP_TAGS = new Set([
  "a",
  "button",
  "code",
  "input",
  "kbd",
  "noscript",
  "option",
  "pre",
  "script",
  "select",
  "style",
  "svg",
  "textarea"
]);
const DEFAULT_SETTINGS = {
  showSavedHighlights: true
};

let lastText = "";
let lastType = "";
let lastAt = 0;
let selectionTimer = 0;
let highlightRefreshTimer = 0;
let highlightObserver = null;
let savedWordSet = new Set();
let highlighterReady = false;
let highlightEnabled = true;
let activeYouTubeCaptionHighlightKey = "";

init();

function init() {
  injectHighlightStyles();
  bindSelectionEvents();
  bindHighlightClickEvents();
  bindYouTubeCaptionEvents();
  bindYouTubeCaptionHoverEvents();
  bindRuntimeEvents();
  refreshSavedWordHighlights();
  startHighlightObserver();
}

function bindSelectionEvents() {
  document.addEventListener("mouseup", () => {
    const payload = getCurrentSelectionPayload();
    if (!payload) {
      return;
    }

    window.clearTimeout(selectionTimer);
    selectionTimer = window.setTimeout(() => {
      sendTrigger("selection", payload);
    }, 220);
  });

  document.addEventListener("dblclick", () => {
    window.clearTimeout(selectionTimer);
    const payload = getCurrentSelectionPayload();
    if (!payload) {
      return;
    }
    sendTrigger("double_click", payload);
  });
}

function bindHighlightClickEvents() {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const highlightEl = target.closest(`[${HIGHLIGHT_ATTR}]`);
      if (!highlightEl) {
        return;
      }

      const word = String(highlightEl.getAttribute(HIGHLIGHT_ATTR) || "").trim();
      if (!word) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const payload = {
        text: word,
        context: extractSentenceContextFromNode(highlightEl, word),
        url: location.href
      };
      sendTrigger("saved_highlight_click", payload, true);
    },
    true
  );
}

function bindYouTubeCaptionEvents() {
  document.addEventListener(
    "click",
    (event) => {
      const payload = getYouTubeCaptionPayload(event);
      if (!payload) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      sendTrigger("youtube_caption_click", payload, true);
    },
    true
  );
}

function bindYouTubeCaptionHoverEvents() {
  document.addEventListener(
    "mousemove",
    (event) => {
      const detail = getYouTubeCaptionWordDetail(event);
      if (!detail?.word) {
        clearActiveYouTubeCaptionHighlight();
        return;
      }

      const nextKey = getYouTubeCaptionHighlightKey(detail);
      if (nextKey === activeYouTubeCaptionHighlightKey) {
        return;
      }

      clearActiveYouTubeCaptionHighlight();
      highlightYouTubeCaptionWord(detail);
    },
    true
  );

  document.addEventListener(
    "mouseleave",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (!target.closest(".ytp-caption-window-container")) {
        return;
      }
      clearActiveYouTubeCaptionHighlight();
    },
    true
  );
}

function bindRuntimeEvents() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "REFRESH_SAVED_WORDS_HIGHLIGHTS") {
      refreshSavedWordHighlights(true)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "刷新高亮失败"
          });
        });
      return true;
    }
    return false;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(changes, "showSavedHighlights")) {
      toggleSavedHighlights(Boolean(changes.showSavedHighlights?.newValue));
    }
  });
}

async function refreshSavedWordHighlights(force = false) {
  try {
    const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
    highlightEnabled = Boolean(settings.showSavedHighlights);
    if (!highlightEnabled) {
      clearHighlights();
      savedWordSet = new Set();
      return;
    }

    const response = await sendRuntimeMessage({
      type: "GET_SAVED_WORDS_INDEX",
      payload: { force, url: location.href }
    });
    if (!response?.ok || !Array.isArray(response.words)) {
      return;
    }

    const nextWords = response.words
      .map((word) => normalizeWord(word))
      .filter(Boolean);
    savedWordSet = new Set(nextWords);
    if (!savedWordSet.size) {
      clearHighlights();
      return;
    }

    applyHighlights(document.body);
    highlighterReady = true;
  } catch (_error) {
    // Ignore highlight bootstrap failures on pages where the backend is unavailable.
  }
}

function startHighlightObserver() {
  highlightObserver = new MutationObserver((mutations) => {
    if (!highlighterReady || !savedWordSet.size) {
      return;
    }

    const shouldRefresh = mutations.some((mutation) => {
      if (mutation.type === "characterData") {
        return true;
      }
      return Array.from(mutation.addedNodes || []).some((node) => isProcessableNode(node));
    });

    if (!shouldRefresh) {
      return;
    }

    window.clearTimeout(highlightRefreshTimer);
    highlightRefreshTimer = window.setTimeout(() => {
      applyHighlights(document.body);
    }, 180);
  });

  highlightObserver.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

function applyHighlights(root) {
  if (!highlightEnabled || !root || !savedWordSet.size) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!isEligibleTextNode(node)) {
        return NodeFilter.FILTER_REJECT;
      }
      return containsSavedWord(node.nodeValue || "")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  });

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach((textNode) => highlightTextNode(textNode));
}

function highlightTextNode(textNode) {
  const text = textNode.nodeValue || "";
  if (!text.trim()) {
    return;
  }

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let matchFound = false;
  TOKEN_PATTERN.lastIndex = 0;

  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const token = match[0];
    const start = match.index || 0;
    const end = start + token.length;
    const normalized = normalizeWord(token);
    if (!savedWordSet.has(normalized)) {
      continue;
    }

    matchFound = true;
    if (start > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, start)));
    }

    const mark = document.createElement("span");
    mark.className = HIGHLIGHT_CLASS;
    mark.setAttribute(HIGHLIGHT_ATTR, normalized);
    mark.textContent = token;
    fragment.appendChild(mark);
    lastIndex = end;
  }

  if (!matchFound) {
    return;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  textNode.parentNode?.replaceChild(fragment, textNode);
}

function containsSavedWord(text) {
  TOKEN_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    if (savedWordSet.has(normalizeWord(match[0]))) {
      return true;
    }
  }
  return false;
}

function isEligibleTextNode(node) {
  if (!node || node.nodeType !== Node.TEXT_NODE) {
    return false;
  }

  const parent = node.parentElement;
  if (!parent) {
    return false;
  }

  if (!node.nodeValue || !node.nodeValue.trim()) {
    return false;
  }

  if (parent.closest(`[${HIGHLIGHT_ATTR}]`)) {
    return false;
  }

  const tagName = parent.tagName ? parent.tagName.toLowerCase() : "";
  if (SKIP_TAGS.has(tagName)) {
    return false;
  }

  if (parent.isContentEditable) {
    return false;
  }

  if (getComputedStyle(parent).visibility === "hidden") {
    return false;
  }

  return true;
}

function isProcessableNode(node) {
  if (!node) {
    return false;
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return isEligibleTextNode(node);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }
  const element = node;
  if (element.closest(`[${HIGHLIGHT_ATTR}]`)) {
    return false;
  }
  const tagName = element.tagName ? element.tagName.toLowerCase() : "";
  return !SKIP_TAGS.has(tagName);
}

function getCurrentSelectionPayload() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const text = normalizeText(selection.toString());
  if (!text) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const context = extractSentenceContext(range, text);

  return {
    text: text.slice(0, 1200),
    context: (context || text).slice(0, 600),
    url: location.href
  };
}

function getYouTubeCaptionPayload(event) {
  const detail = getYouTubeCaptionWordDetail(event);
  if (!detail?.word) {
    return null;
  }

  const context = getYouTubeCaptionContext(detail.captionContainer);
  if (!context) {
    return null;
  }

  clearActiveYouTubeCaptionHighlight();
  highlightYouTubeCaptionWord(detail);
  pauseYouTubeVideo();

  return {
    text: detail.word,
    context,
    url: location.href
  };
}

function getYouTubeCaptionWordDetail(event) {
  if (!isYouTubeWatchPage()) {
    return null;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return null;
  }

  const captionContainer = target.closest(".ytp-caption-window-container");
  if (!captionContainer) {
    return null;
  }

  const existingHighlight = target.closest(`[${YOUTUBE_CAPTION_WORD_ATTR}]`);
  if (existingHighlight instanceof Element) {
    const word = normalizeWord(existingHighlight.textContent || "");
    if (!word) {
      return null;
    }
    return {
      word,
      textNode: existingHighlight.firstChild,
      start: 0,
      end: (existingHighlight.textContent || "").length,
      token: existingHighlight.textContent || "",
      captionContainer
    };
  }

  const wordDetail = getWordDetailFromPointWithinRoot(event.clientX, event.clientY, captionContainer);
  if (!wordDetail?.word) {
    return null;
  }

  return {
    ...wordDetail,
    captionContainer
  };
}

function extractSentenceContext(range, selectedText) {
  const scope = getContextScope(range);
  const rawText = scope?.textContent || "";
  if (!rawText.trim()) {
    return selectedText;
  }

  let startIndex = 0;
  try {
    const preRange = range.cloneRange();
    preRange.selectNodeContents(scope);
    preRange.setEnd(range.startContainer, range.startOffset);
    startIndex = preRange.toString().length;
  } catch (_error) {
    const fallbackIndex = rawText.indexOf(selectedText);
    startIndex = fallbackIndex >= 0 ? fallbackIndex : 0;
  }

  const endIndex = Math.min(rawText.length, startIndex + selectionLength(range, selectedText));
  const sentence = sliceSentence(rawText, startIndex, endIndex);
  return normalizeText(sentence) || selectedText;
}

function extractSentenceContextFromNode(node, selectedText) {
  const scope = getScopeFromNode(node);
  const rawText = scope?.textContent || "";
  const word = String(selectedText || "").trim();
  if (!rawText.trim()) {
    return word;
  }

  const index = rawText.indexOf(word);
  const safeIndex = index >= 0 ? index : 0;
  return normalizeText(sliceSentence(rawText, safeIndex, safeIndex + word.length)) || word;
}

function getContextScope(range) {
  let node = range.commonAncestorContainer;
  if (node?.nodeType === Node.TEXT_NODE) {
    node = node.parentElement || node.parentNode;
  }

  return getScopeFromNode(node);
}

function getScopeFromNode(node) {
  let current = node instanceof Element ? node : node?.parentElement || node?.parentNode;
  while (current && current !== document.body) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current;
      if (element.matches(BLOCK_SCOPE_SELECTOR)) {
        return element;
      }
    }
    current = current.parentNode;
  }

  return document.body;
}

function getYouTubeCaptionContext(captionContainer) {
  const segments = Array.from(captionContainer.querySelectorAll(".ytp-caption-segment"))
    .map((segment) => normalizeText(segment.textContent || ""))
    .filter(Boolean);

  if (segments.length) {
    return segments.join(" ");
  }

  return normalizeText(captionContainer.textContent || "");
}

function getWordFromPointWithinRoot(clientX, clientY, root) {
  const detail = getWordDetailFromPointWithinRoot(clientX, clientY, root);
  return detail?.word || null;
}

function getWordDetailFromPointWithinRoot(clientX, clientY, root) {
  const caret =
    typeof document.caretPositionFromPoint === "function"
      ? getWordDetailFromCaretPosition(document.caretPositionFromPoint(clientX, clientY), root)
      : null;
  if (caret) {
    return caret;
  }

  if (typeof document.caretRangeFromPoint === "function") {
    return getWordDetailFromCaretRange(document.caretRangeFromPoint(clientX, clientY), root);
  }

  return null;
}

function getWordDetailFromCaretPosition(position, root) {
  if (!position?.offsetNode || !root.contains(position.offsetNode)) {
    return null;
  }
  return extractWordDetailAtTextOffset(position.offsetNode, position.offset);
}

function getWordDetailFromCaretRange(range, root) {
  if (!range?.startContainer || !root.contains(range.startContainer)) {
    return null;
  }
  return extractWordDetailAtTextOffset(range.startContainer, range.startOffset);
}

function extractWordAtTextOffset(node, offset) {
  return extractWordDetailAtTextOffset(node, offset)?.word || null;
}

function extractWordDetailAtTextOffset(node, offset) {
  if (!node || node.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  const text = node.textContent || "";
  if (!text.trim()) {
    return null;
  }

  const safeOffset = Math.max(0, Math.min(offset, text.length));
  const matches = Array.from(text.matchAll(TOKEN_PATTERN));
  TOKEN_PATTERN.lastIndex = 0;

  for (const match of matches) {
    const token = match[0];
    const start = match.index || 0;
    const end = start + token.length;
    if (safeOffset >= start && safeOffset <= end) {
      return buildWordDetail(node, token, start, end);
    }
  }

  const previousCharOffset = Math.max(0, safeOffset - 1);
  for (const match of matches) {
    const token = match[0];
    const start = match.index || 0;
    const end = start + token.length;
    if (previousCharOffset >= start && previousCharOffset < end) {
      return buildWordDetail(node, token, start, end);
    }
  }

  return null;
}

function buildWordDetail(textNode, token, start, end) {
  const word = normalizeWord(token);
  if (!word) {
    return null;
  }

  return {
    word,
    textNode,
    start,
    end,
    token
  };
}

function sliceSentence(text, startIndex, endIndex) {
  const boundaryPattern = /[.!?。！？\n]/u;
  let start = startIndex;
  let end = endIndex;

  while (start > 0 && !boundaryPattern.test(text[start - 1])) {
    start -= 1;
  }
  while (end < text.length && !boundaryPattern.test(text[end])) {
    end += 1;
  }
  if (end < text.length) {
    end += 1;
  }

  return text.slice(start, end);
}

function selectionLength(range, selectedText) {
  const raw = range.toString();
  if (raw) {
    return raw.length;
  }
  return selectedText.length;
}

function normalizeText(text) {
  return String(text || "").replace(/\s+/gu, " ").trim();
}

function isYouTubeWatchPage() {
  const hostname = location.hostname.replace(/^www\./u, "");
  return hostname === "youtube.com" && location.pathname === "/watch";
}

function normalizeWord(word) {
  return String(word || "")
    .replace(/^[^A-Za-z]+|[^A-Za-z'-]+$/gu, "")
    .trim()
    .toLowerCase();
}

function sendTrigger(type, payload, bypassDedup = false) {
  const target = document.activeElement;
  if (target && isEditable(target)) {
    return;
  }

  const now = Date.now();
  if (!bypassDedup && lastText === payload.text && lastType === type && now - lastAt < 1200) {
    return;
  }
  lastText = payload.text;
  lastType = type;
  lastAt = now;

  chrome.runtime.sendMessage({
    type: "PAGE_TEXT_TRIGGER",
    payload: {
      triggerType: type,
      text: payload.text,
      context: payload.context,
      url: payload.url
    }
  });
}

function clearActiveYouTubeCaptionHighlight() {
  const nodes = Array.from(document.querySelectorAll(`[${YOUTUBE_CAPTION_WORD_ATTR}]`));
  nodes.forEach((node) => {
    const parent = node.parentNode;
    if (!parent) {
      return;
    }
    parent.replaceChild(document.createTextNode(node.textContent || ""), node);
    parent.normalize();
  });
  activeYouTubeCaptionHighlightKey = "";
}

function highlightYouTubeCaptionWord(detail) {
  const textNode = detail?.textNode;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return;
  }

  const text = textNode.textContent || "";
  const start = Number(detail.start);
  const end = Number(detail.end);
  if (!text || start < 0 || end <= start || end > text.length) {
    return;
  }

  const fragment = document.createDocumentFragment();
  if (start > 0) {
    fragment.appendChild(document.createTextNode(text.slice(0, start)));
  }

  const mark = document.createElement("span");
  mark.className = YOUTUBE_CAPTION_WORD_CLASS;
  mark.setAttribute(YOUTUBE_CAPTION_WORD_ATTR, detail.word || "");
  mark.setAttribute(YOUTUBE_CAPTION_WORD_ACTIVE_ATTR, "true");
  mark.textContent = text.slice(start, end);
  fragment.appendChild(mark);

  if (end < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(end)));
  }

  textNode.parentNode?.replaceChild(fragment, textNode);
  activeYouTubeCaptionHighlightKey = getYouTubeCaptionHighlightKey(detail);
}

function pauseYouTubeVideo() {
  if (!isYouTubeWatchPage()) {
    return;
  }

  const video = document.querySelector("video");
  if (!(video instanceof HTMLVideoElement)) {
    return;
  }

  if (!video.paused) {
    video.pause();
  }
}

function getYouTubeCaptionHighlightKey(detail) {
  const textNode = detail?.textNode;
  const parent = textNode?.parentNode;
  const parentText = parent?.textContent || "";
  return [
    detail?.word || "",
    Number(detail?.start ?? -1),
    Number(detail?.end ?? -1),
    parentText
  ].join("::");
}

function clearHighlights() {
  const nodes = Array.from(document.querySelectorAll(`[${HIGHLIGHT_ATTR}]`));
  nodes.forEach((node) => {
    const parent = node.parentNode;
    if (!parent) {
      return;
    }
    parent.replaceChild(document.createTextNode(node.textContent || ""), node);
    parent.normalize();
  });
}

function toggleSavedHighlights(enabled) {
  highlightEnabled = Boolean(enabled);
  if (!highlightEnabled) {
    clearHighlights();
    savedWordSet = new Set();
    return;
  }
  refreshSavedWordHighlights(true);
}

function sendRuntimeMessage(message) {
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

function isEditable(el) {
  if (!el) {
    return false;
  }
  if (el.isContentEditable) {
    return true;
  }
  const tag = el.tagName ? el.tagName.toLowerCase() : "";
  return tag === "textarea" || tag === "input";
}

function injectHighlightStyles() {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      background: linear-gradient(180deg, rgba(247,229,111,0.18) 0%, rgba(247,229,111,0.88) 100%);
      border-radius: 0.28em;
      box-shadow: inset 0 -1px 0 rgba(166,117,0,0.18);
      color: inherit;
      cursor: pointer;
      font-weight: 600;
      padding: 0 0.08em;
      transition: background 120ms ease, box-shadow 120ms ease;
    }

    .${HIGHLIGHT_CLASS}:hover {
      background: linear-gradient(180deg, rgba(247,229,111,0.24) 0%, rgba(250,200,70,0.96) 100%);
      box-shadow: inset 0 -1px 0 rgba(166,117,0,0.3), 0 0 0 2px rgba(250,200,70,0.18);
    }

    .${YOUTUBE_CAPTION_WORD_CLASS} {
      background: rgba(84, 109, 255, 0.96);
      border-radius: 0.16em;
      box-shadow: 0 0 0 2px rgba(84, 109, 255, 0.24);
      color: #ffffff;
      cursor: pointer;
      display: inline;
      padding: 0 0.04em;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}
