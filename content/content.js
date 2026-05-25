/*
Copyright (C) 2026 İsmail Kulak

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

// ============================================================
// RegExe — Content Script
// Regex-powered find-in-page for Zen Browser
// ============================================================

(function () {
  "use strict";

  // Prevent double-injection
  if (window.__regexe_loaded) return;
  window.__regexe_loaded = true;

  // ── State ──────────────────────────────────────────────────
  let isOpen = false;
  let isRegexMode = false;
  let matches = [];        // Array of Range objects
  let activeIndex = -1;
  let debounceTimer = null;
  let findbar = null;
  let inputEl = null;
  let counterEl = null;
  let errorTooltip = null;
  let regexCheckbox = null;
  let colorBtn = null;
  let colorPopup = null;
  let copyBtn = null;
  let copyMenu = null;
  let highlightColor = "#facc15";
  let highlightStyleEl = null;

  // Feature detection: CSS Custom Highlight API
  const hasHighlightAPI = typeof CSS !== "undefined" && CSS.highlights;

  // ── SVG Icons ──────────────────────────────────────────────
  const ICONS = {
    search: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    up: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`,
    down: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
    close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    palette: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2"/><circle cx="17.5" cy="10.5" r="2"/><circle cx="8.5" cy="7.5" r="2"/><circle cx="6.5" cy="12.5" r="2"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
    copy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  };

  // ── Preset Colors ──────────────────────────────────────────
  const PRESET_COLORS = [
    { color: "#facc15", name: "Yellow" },
    { color: "#fb923c", name: "Orange" },
    { color: "#f87171", name: "Red" },
    { color: "#f472b6", name: "Pink" },
    { color: "#a78bfa", name: "Purple" },
    { color: "#60a5fa", name: "Blue" },
    { color: "#34d399", name: "Green" },
    { color: "#2dd4bf", name: "Teal" },
  ];

  // ── Build Find Bar DOM ─────────────────────────────────────
  function createFindBar() {
    const bar = document.createElement("div");
    bar.id = "regexe-findbar";
    bar.setAttribute("role", "search");
    bar.setAttribute("aria-label", "RegExe find bar");

    const SAFE_HTML = String.raw`
      <span class="regexe-search-icon" aria-hidden="true">${ICONS.search}</span>

      <div class="regexe-input-wrapper">
        <input
          type="text"
          class="regexe-input"
          id="regexe-search-input"
          placeholder="Basic regex search (auto 'gi')..."
          autocomplete="off"
          spellcheck="false"
          aria-label="Search pattern"
        />
        <div class="regexe-error-tooltip" id="regexe-error-tooltip" role="alert" aria-live="polite"></div>
      </div>

      <div class="regexe-separator" aria-hidden="true"></div>

      <label class="regexe-toggle" title="JS Regex mode — use /pattern/flags syntax">
        <input type="checkbox" class="regexe-checkbox" id="regexe-regex-toggle" />
        <span class="regexe-toggle-label">JS Regex</span>
      </label>

      <div class="regexe-separator" aria-hidden="true"></div>

      <div class="regexe-color-wrapper">
        <button class="regexe-color-btn" id="regexe-color-btn" title="Highlight color" aria-label="Change highlight color">
          <span class="regexe-color-swatch" id="regexe-color-swatch"></span>
          <span class="regexe-color-icon">${ICONS.palette}</span>
        </button>
        <div class="regexe-color-popup" id="regexe-color-popup" role="listbox" aria-label="Color presets">
          <div class="regexe-color-presets">
            ${PRESET_COLORS.map(c => `<button class="regexe-color-preset" data-color="${c.color}" title="${c.name}" aria-label="${c.name}" style="background:${c.color}"></button>`).join("")}
          </div>
          <div class="regexe-color-custom">
            <label class="regexe-color-custom-label" for="regexe-color-custom-input">Custom</label>
            <input type="color" class="regexe-color-custom-input" id="regexe-color-custom-input" value="#facc15" />
          </div>
        </div>
      </div>

      <div class="regexe-separator" aria-hidden="true"></div>

      <span class="regexe-counter" id="regexe-counter" aria-live="polite">—</span>

      <button class="regexe-nav-btn" id="regexe-prev-btn" title="Previous match (Shift+Enter)" aria-label="Previous match">
        ${ICONS.up}
      </button>
      <button class="regexe-nav-btn" id="regexe-next-btn" title="Next match (Enter)" aria-label="Next match">
        ${ICONS.down}
      </button>

      <div class="regexe-separator" aria-hidden="true"></div>

      <div class="regexe-copy-wrapper">
        <button class="regexe-nav-btn" id="regexe-copy-btn" title="Copy matches" aria-label="Copy matches">
          ${ICONS.copy}
        </button>
        <div class="regexe-copy-menu" id="regexe-copy-menu" role="menu" aria-label="Copy options">
          <button class="regexe-copy-option" id="regexe-copy-html" role="menuitem">
            <span class="regexe-copy-option-icon">&lt;/&gt;</span>
            <span class="regexe-copy-option-text">Copy HTML</span>
          </button>
          <button class="regexe-copy-option" id="regexe-copy-inner" role="menuitem">
            <span class="regexe-copy-option-icon">&lt;&gt;</span>
            <span class="regexe-copy-option-text">Copy Inner HTML</span>
          </button>
          <button class="regexe-copy-option" id="regexe-copy-text" role="menuitem">
            <span class="regexe-copy-option-icon">Aa</span>
            <span class="regexe-copy-option-text">Copy Texts</span>
          </button>
        </div>
      </div>

      <div class="regexe-separator" aria-hidden="true"></div>

      <button class="regexe-close-btn" id="regexe-close-btn" title="Close (Escape)" aria-label="Close find bar">
        ${ICONS.close}
      </button>

      <div class="regexe-toast" id="regexe-toast" aria-live="polite"></div>
    `;

    bar.innerHTML = SAFE_HTML;

    document.documentElement.appendChild(bar);
    return bar;
  }

  // ── Init ───────────────────────────────────────────────────
  function init() {
    findbar = createFindBar();
    inputEl = findbar.querySelector("#regexe-search-input");
    counterEl = findbar.querySelector("#regexe-counter");
    errorTooltip = findbar.querySelector("#regexe-error-tooltip");
    regexCheckbox = findbar.querySelector("#regexe-regex-toggle");
    colorBtn = findbar.querySelector("#regexe-color-btn");
    colorPopup = findbar.querySelector("#regexe-color-popup");
    copyBtn = findbar.querySelector("#regexe-copy-btn");
    copyMenu = findbar.querySelector("#regexe-copy-menu");

    const prevBtn = findbar.querySelector("#regexe-prev-btn");
    const nextBtn = findbar.querySelector("#regexe-next-btn");
    const closeBtn = findbar.querySelector("#regexe-close-btn");
    const colorSwatchEl = findbar.querySelector("#regexe-color-swatch");
    const colorCustomInput = findbar.querySelector("#regexe-color-custom-input");

    // Load saved preferences
    try {
      browser.storage.local.get(["regexe_regex_mode", "regexe_highlight_color"]).then((data) => {
        if (data.regexe_regex_mode) {
          isRegexMode = true;
          regexCheckbox.checked = true;
          findbar.classList.add("regexe-regex-mode");
        }
        if (data.regexe_highlight_color) {
          highlightColor = data.regexe_highlight_color;
          colorSwatchEl.style.background = highlightColor;
          colorCustomInput.value = highlightColor;
          applyHighlightColor();
        } else {
          colorSwatchEl.style.background = highlightColor;
          applyHighlightColor();
        }
      });
    } catch (_) {
      applyHighlightColor();
    }

    // ── Event Listeners ──────────────────────────────────────
    inputEl.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => performSearch(), 200);
    });

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          navigatePrev();
        } else {
          navigateNext();
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeFindBar();
      }
    });

    regexCheckbox.addEventListener("change", () => {
      isRegexMode = regexCheckbox.checked;
      findbar.classList.toggle("regexe-regex-mode", isRegexMode);

      // Persist preference
      try {
        browser.storage.local.set({ regexe_regex_mode: isRegexMode });
      } catch (_) {}

      if (isRegexMode) {
        inputEl.placeholder = "/pattern/flags (Strict JS Regex)";
      } else {
        inputEl.placeholder = "Basic regex search (auto 'gi')...";
      }

      performSearch();
    });

    prevBtn.addEventListener("click", navigatePrev);
    nextBtn.addEventListener("click", navigateNext);
    closeBtn.addEventListener("click", closeFindBar);

    // ── Color Picker ─────────────────────────────────────────
    colorBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyMenu.classList.remove("regexe-copy-menu-visible");
      colorPopup.classList.toggle("regexe-color-popup-visible");
    });

    // Preset color buttons
    colorPopup.querySelectorAll(".regexe-color-preset").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        setHighlightColor(btn.dataset.color);
        colorPopup.classList.remove("regexe-color-popup-visible");
      });
    });

    // Custom color input
    colorCustomInput.addEventListener("input", (e) => {
      setHighlightColor(e.target.value);
    });

    // ── Copy Menu ─────────────────────────────────────────────
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      colorPopup.classList.remove("regexe-color-popup-visible");
      copyMenu.classList.toggle("regexe-copy-menu-visible");
    });

    findbar.querySelector("#regexe-copy-html").addEventListener("click", (e) => {
      e.stopPropagation();
      copyMatchContent("html");
      copyMenu.classList.remove("regexe-copy-menu-visible");
    });

    findbar.querySelector("#regexe-copy-inner").addEventListener("click", (e) => {
      e.stopPropagation();
      copyMatchContent("innerhtml");
      copyMenu.classList.remove("regexe-copy-menu-visible");
    });

    findbar.querySelector("#regexe-copy-text").addEventListener("click", (e) => {
      e.stopPropagation();
      copyMatchContent("text");
      copyMenu.classList.remove("regexe-copy-menu-visible");
    });

    // Close popups when clicking outside
    document.addEventListener("click", (e) => {
      if (colorPopup && !colorPopup.contains(e.target) && !colorBtn.contains(e.target)) {
        colorPopup.classList.remove("regexe-color-popup-visible");
      }
      if (copyMenu && !copyMenu.contains(e.target) && !copyBtn.contains(e.target)) {
        copyMenu.classList.remove("regexe-copy-menu-visible");
      }
    });

    // Global escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) {
        if (colorPopup.classList.contains("regexe-color-popup-visible")) {
          colorPopup.classList.remove("regexe-color-popup-visible");
        } else if (copyMenu.classList.contains("regexe-copy-menu-visible")) {
          copyMenu.classList.remove("regexe-copy-menu-visible");
        } else {
          closeFindBar();
        }
      }
    });
  }

  // ── Open / Close ───────────────────────────────────────────
  function openFindBar() {
    // If the document isn't ready yet (running at document_start),
    // defer until DOMContentLoaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => openFindBar(), { once: true });
      return;
    }

    if (!findbar) init();
    isOpen = true;
    findbar.classList.add("regexe-visible");
    inputEl.focus();
    inputEl.select();
  }

  function closeFindBar() {
    if (!findbar) return;
    isOpen = false;
    findbar.classList.remove("regexe-visible");
    clearHighlights();
    clearError();
    inputEl.value = "";
    counterEl.textContent = "—";
    counterEl.classList.remove("regexe-no-results");
    matches = [];
    activeIndex = -1;
  }

  function toggleFindBar() {
    if (isOpen) {
      closeFindBar();
    } else {
      openFindBar();
    }
  }

  // ── Search Engine ──────────────────────────────────────────
  let currentSearchId = 0;

  async function performSearch() {
    const query = inputEl.value;
    const searchId = ++currentSearchId;

    clearHighlights();
    clearError();
    matches = [];
    activeIndex = -1;

    if (!query) {
      counterEl.textContent = "—";
      counterEl.classList.remove("regexe-no-results");
      inputEl.classList.remove("regexe-input-error");
      return;
    }

    let regex;
    try {
      regex = buildRegex(query);
    } catch (err) {
      showError(err.message);
      inputEl.classList.add("regexe-input-error");
      counterEl.textContent = "Error";
      counterEl.classList.add("regexe-no-results");
      return;
    }

    inputEl.classList.remove("regexe-input-error");
    counterEl.textContent = "Searching...";
    counterEl.classList.remove("regexe-no-results");

    // Walk the DOM and find matches asynchronously
    matches = await findMatchesAsync(regex, searchId);

    if (searchId !== currentSearchId) return;

    if (matches.length === 0) {
      counterEl.textContent = "0 results";
      counterEl.classList.add("regexe-no-results");
    } else {
      activeIndex = 0;
      await applyHighlightsAsync(searchId);
      if (searchId !== currentSearchId) return;

      updateCounter();
      scrollToActive();
    }
  }

  function buildRegex(query) {
    if (!isRegexMode) {
      return new RegExp(query, "gi");
    }

    // Strict JS Regex mode — parse /pattern/flags syntax
    const slashMatch = query.match(/^\/(.+)\/([gimsuy]*)$/);
    if (slashMatch) {
      const flags = slashMatch[2];
      // Always ensure 'g' flag is present to prevent infinite exec() loop
      const finalFlags = flags.includes("g") ? flags : flags + "g";
      return new RegExp(slashMatch[1], finalFlags);
    }

    // No slashes — treat as bare pattern, apply 'g' at minimum
    return new RegExp(query, "g");
  }

  // ── DOM Traversal ──────────────────────────────────────────
  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "OBJECT",
    "EMBED", "TEMPLATE", "SVG", "MATH",
  ]);

  async function findMatchesAsync(regex, searchId) {
    return new Promise((resolve) => {
      const results = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;

            // Skip our own findbar
            if (parent.closest("#regexe-findbar")) return NodeFilter.FILTER_REJECT;

            // Skip invisible / non-content tags
            if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;

            // Skip hidden elements
            if (parent.offsetParent === null && parent.tagName !== "BODY") {
              return NodeFilter.FILTER_REJECT;
            }

            if (!node.textContent || node.textContent.length === 0) {
              return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      const textNodes = [];
      let textNode;
      while ((textNode = walker.nextNode())) {
        textNodes.push(textNode);
      }

      let i = 0;

      function processChunk() {
        if (searchId !== currentSearchId) return resolve([]);
        const startTime = performance.now();
        let processed = 0;

        while (i < textNodes.length) {
          const node = textNodes[i];
          const text = node.textContent;
          regex.lastIndex = 0;
          let match;

          while ((match = regex.exec(text)) !== null) {
            if (match[0].length === 0) {
              regex.lastIndex++;
              continue;
            }

            try {
              const range = document.createRange();
              range.setStart(node, match.index);
              range.setEnd(node, match.index + match[0].length);
              results.push(range);
            } catch (_) {}

            // Safety: cap at 10,000 matches
            if (results.length >= 10000) {
              return resolve(results);
            }
          }

          i++;
          processed++;
          
          if (processed > 50 || performance.now() - startTime > 15) {
            break;
          }
        }

        if (i < textNodes.length) {
          if (counterEl) counterEl.textContent = `Found ${results.length}...`;
          setTimeout(processChunk, 0);
        } else {
          resolve(results);
        }
      }

      processChunk();
    });
  }

  // ── Highlighting ───────────────────────────────────────────

  async function applyHighlightsAsync(searchId) {
    if (hasHighlightAPI) {
      applyHighlightsCSS();
      return Promise.resolve();
    } else {
      return applyHighlightsDOMAsync(searchId);
    }
  }

  // ---------- CSS Custom Highlight API (Modern, Non-destructive) ----------
  function applyHighlightsCSS() {
    if (matches.length === 0) return;

    const allRanges = matches.filter((r) => {
      try { return !r.collapsed; } catch (_) { return false; }
    });

    if (allRanges.length === 0) return;

    // Set all highlights
    const highlight = new Highlight(...allRanges);
    CSS.highlights.set("regexe-highlight", highlight);

    // Set active highlight
    updateActiveHighlightCSS();
  }

  function updateActiveHighlightCSS() {
    if (activeIndex >= 0 && activeIndex < matches.length) {
      try {
        const activeHighlight = new Highlight(matches[activeIndex]);
        CSS.highlights.set("regexe-active", activeHighlight);
      } catch (_) {}
    }
  }

  // ---------- DOM Fallback (mark elements) ----------
  async function applyHighlightsDOMAsync(searchId) {
    return new Promise((resolve) => {
      // We need to wrap matches in <mark> elements, processing from last to first
      // to avoid invalidating earlier ranges
      const sortedMatches = [...matches].sort((a, b) => {
        return a.compareBoundaryPoints(Range.START_TO_START, b);
      });

      // Clear and re-collect: wrapping changes the DOM, so we store position info
      const matchData = sortedMatches.map((range) => ({
        node: range.startContainer,
        start: range.startOffset,
        end: range.endOffset,
      }));

      const newRanges = [];
      let i = matchData.length - 1;

      function processChunk() {
        if (searchId !== currentSearchId) return resolve();
        const startTime = performance.now();
        let processed = 0;

        while (i >= 0) {
          const { node, start, end } = matchData[i];
          try {
            if (node.nodeType === Node.TEXT_NODE && start < node.textContent.length) {
              const range = document.createRange();
              range.setStart(node, start);
              range.setEnd(node, Math.min(end, node.textContent.length));

              const mark = document.createElement("mark");
              mark.className = "regexe-highlight";
              range.surroundContents(mark);

              const newRange = document.createRange();
              newRange.selectNodeContents(mark);
              newRanges.unshift(newRange);
            }
          } catch (_) {}

          i--;
          processed++;
          
          if (processed > 50 || performance.now() - startTime > 15) {
            break;
          }
        }

        if (i >= 0) {
          if (counterEl) counterEl.textContent = `Highlighting...`;
          setTimeout(processChunk, 0);
        } else {
          matches = newRanges;
          updateActiveHighlightDOM();
          resolve();
        }
      }

      processChunk();
    });
  }

  function updateActiveHighlightDOM() {
    // Remove old active class
    document.querySelectorAll(".regexe-highlight-active").forEach((el) => {
      el.classList.remove("regexe-highlight-active");
    });

    if (activeIndex >= 0 && activeIndex < matches.length) {
      try {
        const range = matches[activeIndex];
        const container = range.startContainer;
        const mark =
          container.nodeType === Node.ELEMENT_NODE
            ? container
            : container.parentElement;
        if (mark && mark.classList) {
          mark.classList.add("regexe-highlight-active");
        }
      } catch (_) {}
    }
  }

  function clearHighlights() {
    if (hasHighlightAPI) {
      CSS.highlights.delete("regexe-highlight");
      CSS.highlights.delete("regexe-active");
    } else {
      // Remove all <mark> elements we inserted
      document.querySelectorAll("mark.regexe-highlight").forEach((mark) => {
        const parent = mark.parentNode;
        if (!parent) return;
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
        parent.normalize(); // Merge adjacent text nodes
      });
    }
  }

  // ── Navigation ─────────────────────────────────────────────
  function navigateNext() {
    if (matches.length === 0) return;
    activeIndex = (activeIndex + 1) % matches.length;
    updateActiveHighlight();
    updateCounter();
    scrollToActive();
  }

  function navigatePrev() {
    if (matches.length === 0) return;
    activeIndex = (activeIndex - 1 + matches.length) % matches.length;
    updateActiveHighlight();
    updateCounter();
    scrollToActive();
  }

  function updateActiveHighlight() {
    if (hasHighlightAPI) {
      updateActiveHighlightCSS();
    } else {
      updateActiveHighlightDOM();
    }
  }

  function scrollToActive() {
    if (activeIndex < 0 || activeIndex >= matches.length) return;
    try {
      const range = matches[activeIndex];
      const rect = range.getBoundingClientRect();

      // Check if already visible
      const inView =
        rect.top >= 60 &&
        rect.bottom <= window.innerHeight - 20 &&
        rect.left >= 0 &&
        rect.right <= window.innerWidth;

      if (!inView) {
        const absoluteTop = window.scrollY + rect.top;
        const absoluteLeft = window.scrollX + rect.left;
        
        window.scrollTo({
          top: absoluteTop - window.innerHeight / 2,
          left: absoluteLeft - window.innerWidth / 2,
          behavior: "smooth"
        });
      }
    } catch (_) {}
  }

  function updateCounter() {
    if (matches.length === 0) {
      counterEl.textContent = "0 results";
      counterEl.classList.add("regexe-no-results");
    } else {
      counterEl.textContent = `${activeIndex + 1} / ${matches.length}`;
      counterEl.classList.remove("regexe-no-results");
    }
  }

  // ── Error Handling ─────────────────────────────────────────
  function showError(message) {
    errorTooltip.textContent = message;
    errorTooltip.classList.add("regexe-error-visible");
  }

  function clearError() {
    errorTooltip.textContent = "";
    errorTooltip.classList.remove("regexe-error-visible");
  }

  // ── Copy Functions ─────────────────────────────────────────
  function copyMatchContent(mode) {
    if (matches.length === 0) {
      showToast("No matches to copy", true);
      return;
    }

    let result = "";

    try {
      if (mode === "text") {
        // Copy just the matched text strings
        const texts = matches.map((range) => {
          try { return range.toString(); } catch (_) { return ""; }
        }).filter(Boolean);
        result = texts.join("\n");

      } else if (mode === "html") {
        // Copy outerHTML of parent elements containing matches
        const seen = new Set();
        const htmlParts = [];
        for (const range of matches) {
          try {
            const node = range.startContainer;
            const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
            if (!el || seen.has(el)) continue;
            seen.add(el);
            htmlParts.push(el.outerHTML);
          } catch (_) {}
        }
        result = htmlParts.join("\n");

      } else if (mode === "innerhtml") {
        // Copy innerHTML of parent elements containing matches
        const seen = new Set();
        const htmlParts = [];
        for (const range of matches) {
          try {
            const node = range.startContainer;
            const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
            if (!el || seen.has(el)) continue;
            seen.add(el);
            htmlParts.push(el.innerHTML);
          } catch (_) {}
        }
        result = htmlParts.join("\n");
      }
    } catch (err) {
      showToast("Copy failed", true);
      return;
    }

    if (!result) {
      showToast("Nothing to copy", true);
      return;
    }

    navigator.clipboard.writeText(result).then(() => {
      const count = matches.length;
      const label = mode === "text" ? "text" : mode === "html" ? "HTML" : "inner HTML";
      showToast(`Copied ${count} match${count !== 1 ? "es" : ""} as ${label}`);
    }).catch(() => {
      showToast("Clipboard access denied", true);
    });
  }

  function showToast(message, isError = false) {
    if (!findbar) return;
    const toast = findbar.querySelector("#regexe-toast");
    if (!toast) return;

    toast.textContent = message;
    toast.className = "regexe-toast regexe-toast-visible";
    if (isError) toast.classList.add("regexe-toast-error");

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove("regexe-toast-visible", "regexe-toast-error");
    }, 2000);
  }

  // ── Message Listener ───────────────────────────────────────
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === "toggle-find-bar") {
      toggleFindBar();
    }
  });

  // Ctrl+F override
  document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

    if (ctrlOrCmd && e.key.toLowerCase() === "f") {
      e.preventDefault();
      e.stopPropagation();

      openFindBar();
    }
  }, true);

  // ── Color Management ───────────────────────────────────────
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function darkenHex(hex, amount) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));
    return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
  }

  function setHighlightColor(color) {
    highlightColor = color;

    // Update swatch
    const swatch = findbar && findbar.querySelector("#regexe-color-swatch");
    if (swatch) swatch.style.background = color;

    // Update custom input
    const customInput = findbar && findbar.querySelector("#regexe-color-custom-input");
    if (customInput) customInput.value = color;

    // Persist
    try {
      browser.storage.local.set({ regexe_highlight_color: color });
    } catch (_) {}

    // Apply
    applyHighlightColor();

    // Re-highlight if there are matches
    if (matches.length > 0) {
      clearHighlights();
      applyHighlights();
    }
  }

  function applyHighlightColor() {
    const bgColor = hexToRgba(highlightColor, 0.45);
    const outlineColor = hexToRgba(highlightColor, 0.8);

    // Much darker active state — darken by -80 instead of -40, full opacity
    const activeHex = darkenHex(highlightColor, -80);
    const activeColor = hexToRgba(activeHex, 0.92);
    const activeOutline = hexToRgba(activeHex, 1.0);
    const activeGlow = hexToRgba(darkenHex(highlightColor, -60), 0.5);

    // Calculate YIQ contrast for text color
    const ar = parseInt(activeHex.slice(1, 3), 16);
    const ag = parseInt(activeHex.slice(3, 5), 16);
    const ab = parseInt(activeHex.slice(5, 7), 16);
    const ayiq = (ar * 299 + ag * 587 + ab * 114) / 1000;
    const activeTextColor = ayiq >= 128 ? "#000000" : "#ffffff";

    document.documentElement.style.setProperty("--regexe-highlight", bgColor);
    document.documentElement.style.setProperty("--regexe-highlight-active", activeColor);
    document.documentElement.style.setProperty("--regexe-highlight-outline", outlineColor);
    document.documentElement.style.setProperty("--regexe-highlight-text-active", activeTextColor);

    if (hasHighlightAPI) {
      if (!highlightStyleEl) {
        highlightStyleEl = document.createElement("style");
        highlightStyleEl.id = "regexe-highlight-styles";
        document.documentElement.appendChild(highlightStyleEl);
      }
      highlightStyleEl.textContent = `
      ::highlight(regexe-highlight) {
        background-color: ${bgColor};
        color: inherit;
      }
      ::highlight(regexe-active) {
        background-color: ${activeColor};
        color: ${activeTextColor};
        text-decoration: underline;
        text-decoration-color: ${activeOutline};
        text-shadow: 0 0 6px ${activeGlow};
      }
      `;
    }
  }
})();
