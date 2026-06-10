// content.js - intercept submit, show toast, manage highlight

let checkerEnabled = true;
let appSettings = {
  enabledSeverities: { RED: true, ORANGE: true, YELLOW: true },
  customKeywords: [],
  whitelist: []
};
let skipIntercept = false; // prevents re-intercept loop after "proceed"
let activeToast = null;
let currentMatches = [];

(async function init() {
  const d = await chrome.storage.local.get(['checkerEnabled', 'appSettings']);
  checkerEnabled = d.checkerEnabled !== false;
  if (d.appSettings) appSettings = Object.assign(appSettings, d.appSettings);

  chrome.storage.onChanged.addListener(changes => {
    if ('checkerEnabled' in changes) checkerEnabled = changes.checkerEnabled.newValue;
    if ('appSettings' in changes) appSettings = Object.assign(appSettings, changes.appSettings.newValue);
  });

  waitForInput();
})();

// wait for claude.ai to render input area (SPA)
function waitForInput() {
  let bound = false;

  const tryBind = () => {
    if (bound) return;
    const input = getInputEl();
    const btn = getSendBtn();
    if (!input || !btn) return;
    bound = true;
    bindEvents(input, btn);

    const onNav = () => { bound = false; removeHighlights(); tryBind(); };
    window.addEventListener('popstate', onNav, { once: true });
  };

  tryBind();
  const obs = new MutationObserver(tryBind);
  obs.observe(document.body, { childList: true, subtree: true });
}

function bindEvents(input, btn) {
  btn.addEventListener('click', onSubmitAttempt, true);

  // intercept Enter but not Shift+Enter (newline)
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      onSubmitAttempt(e);
    }
  }, true);
}

// claude.ai may update DOM selectors — multiple fallbacks
function getInputEl() {
  return (
    document.querySelector('.ProseMirror[contenteditable]') ||
    document.querySelector('[contenteditable="true"][data-placeholder]') ||
    document.querySelector('[contenteditable="true"]')
  );
}

function getSendBtn() {
  return (
    document.querySelector('button[aria-label="Send message"]') ||
    document.querySelector('button[data-testid="send-button"]') ||
    document.querySelector('button[aria-label*="Send"]') ||
    document.querySelector('button[type="submit"]')
  );
}

function getInputText() {
  const el = getInputEl();
  return el ? (el.innerText || el.textContent || '') : '';
}

function onSubmitAttempt(e) {
  if (!checkerEnabled || skipIntercept) return;

  const text = getInputText().trim();
  if (!text) return;

  const found = detectSensitiveData(text, appSettings);
  if (found.length === 0) return;

  e.preventDefault();
  e.stopImmediatePropagation();

  currentMatches = found;
  showToast(found, proceedWithSubmit);
}

// re-trigger submit without passing through interceptor
function proceedWithSubmit() {
  skipIntercept = true;
  const btn = getSendBtn();
  if (btn) btn.click();
  setTimeout(() => { skipIntercept = false; }, 800);
}

function showToast(matches, onProceed) {
  removeToast();

  const topSeverity = matches.reduce((top, m) =>
    SEVERITY_CONFIG[m.severity].priority > SEVERITY_CONFIG[top].priority ? m.severity : top
  , matches[0].severity);

  const cfg = SEVERITY_CONFIG[topSeverity];
  const severityClass = topSeverity.toLowerCase();

  const toast = document.createElement('div');
  toast.id = 'pc-toast';
  toast.className = `pc-toast pc-toast--${severityClass}`;
  toast.innerHTML = matches.length === 1
    ? buildSingleToast(matches[0], cfg)
    : buildMultiToast(matches, cfg);

  document.body.appendChild(toast);
  activeToast = toast;

  toast.querySelector('#pc-proceed').addEventListener('click', async () => {
    await Logger.addEntry(topSeverity, matches.map(m => m.name), 'ส่งต่อ');
    removeToast();
    onProceed();
  });

  toast.querySelector('#pc-edit').addEventListener('click', async () => {
    await Logger.addEntry(topSeverity, matches.map(m => m.name), 'แก้ไขก่อน');
    removeToast();
    showHighlights(matches);
  });
}

function buildSingleToast(match, cfg) {
  return `
    <div class="pc-toast-icon">!</div>
    <div class="pc-toast-body">
      <p class="pc-toast-title">คุณกำลังจะส่ง "<strong>${match.name}</strong>" หรือเปล่า?</p>
      <p class="pc-toast-sub">ข้อมูลนี้เป็นระดับ <strong>${cfg.label}</strong> — โปรดตรวจสอบก่อนส่ง</p>
    </div>
    <div class="pc-toast-actions">
      <button id="pc-proceed" class="pc-btn pc-btn--proceed">ส่งต่อ</button>
      <button id="pc-edit" class="pc-btn pc-btn--edit">แก้ไขก่อน</button>
    </div>`;
}

function buildMultiToast(matches, cfg) {
  const items = matches.map(m => `<li>${m.name}</li>`).join('');
  return `
    <div class="pc-toast-icon">!</div>
    <div class="pc-toast-body">
      <p class="pc-toast-title">พบข้อมูลที่ควรระวัง <strong>${matches.length} รายการ</strong></p>
      <ul class="pc-toast-list">${items}</ul>
      <p class="pc-toast-sub">ข้อมูลสูงสุดอยู่ระดับ <strong>${cfg.label}</strong> — โปรดตรวจสอบก่อนส่ง</p>
    </div>
    <div class="pc-toast-actions">
      <button id="pc-proceed" class="pc-btn pc-btn--proceed">ส่งต่อ</button>
      <button id="pc-edit" class="pc-btn pc-btn--edit">แก้ไขก่อน</button>
    </div>`;
}

function removeToast() {
  if (activeToast) { activeToast.remove(); activeToast = null; }
}

function showHighlights(matches) {
  removeHighlights();

  const inputEl = getInputEl();
  if (!inputEl) return;

  const text = getInputText();
  buildTextOverlay(inputEl, matches, text);
  buildHighlightPanel(inputEl, matches);
}

// transparent overlay over input with wavy underlines on matched text
function buildTextOverlay(inputEl, matches, text) {
  document.getElementById('pc-overlay')?.remove();

  const rect = inputEl.getBoundingClientRect();
  const cs = window.getComputedStyle(inputEl);

  const overlay = document.createElement('div');
  overlay.id = 'pc-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top}px; left: ${rect.left}px;
    width: ${rect.width}px; height: ${rect.height}px;
    pointer-events: none; z-index: 9997; overflow: hidden;
    font-family: ${cs.fontFamily}; font-size: ${cs.fontSize};
    font-weight: ${cs.fontWeight}; line-height: ${cs.lineHeight};
    letter-spacing: ${cs.letterSpacing}; padding: ${cs.padding};
    box-sizing: border-box; white-space: pre-wrap; word-wrap: break-word;
    color: transparent; background: transparent;
  `;

  // sort descending by index to avoid position shift during insertion
  const all = [];
  for (const rule of matches) {
    for (const m of rule.matches) all.push({ ...m, rule });
  }
  all.sort((a, b) => b.index - a.index);

  let html = escapeHtml(text);
  for (const m of all) {
    const color = SEVERITY_CONFIG[m.rule.severity].color;
    const inner = escapeHtml(m.text);
    const span = `<span style="text-decoration:underline wavy ${color};text-decoration-style:wavy;text-decoration-color:${color}" title="ตรวจพบ: ${m.rule.name}">${inner}</span>`;
    html = html.slice(0, m.index) + span + html.slice(m.index + m.text.length);
  }
  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  const update = () => {
    const r = inputEl.getBoundingClientRect();
    overlay.style.top = `${r.top}px`;
    overlay.style.left = `${r.left}px`;
    overlay.style.width = `${r.width}px`;
    overlay.style.height = `${r.height}px`;
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  inputEl.addEventListener('scroll', update, { passive: true });
}

function buildHighlightPanel(inputEl, matches) {
  const panel = document.createElement('div');
  panel.id = 'pc-hl-panel';
  panel.className = 'pc-hl-panel';

  const items = matches.map(m => {
    const cfg = SEVERITY_CONFIG[m.severity];
    return `
      <div class="pc-hl-item">
        <span class="pc-hl-badge" style="background:${cfg.bg};color:${cfg.color};border-color:${cfg.color}">
          ${m.name} (${m.matches.length})
        </span>
        <button class="pc-hl-redact-btn"
          data-rule-id="${m.id}"
          data-redact-label="${m.redactLabel}">Auto-Redact</button>
      </div>`;
  }).join('');

  panel.innerHTML = `
    <div class="pc-hl-header">
      <span>พบข้อมูลที่ควรระวัง</span>
      <button id="pc-hl-close">X</button>
    </div>
    <div class="pc-hl-items">${items}</div>
    <button id="pc-hl-redact-all">Auto-Redact ทั้งหมด</button>`;

  inputEl.insertAdjacentElement('afterend', panel);

  panel.querySelector('#pc-hl-close').addEventListener('click', removeHighlights);

  panel.querySelectorAll('.pc-hl-redact-btn').forEach(btn => {
    btn.addEventListener('click', () =>
      redactByRule(btn.dataset.ruleId, btn.dataset.redactLabel)
    );
  });

  panel.querySelector('#pc-hl-redact-all').addEventListener('click', redactAll);
}

function removeHighlights() {
  document.getElementById('pc-overlay')?.remove();
  document.getElementById('pc-hl-panel')?.remove();
}

function redactByRule(ruleId, redactLabel) {
  const rule = currentMatches.find(m => m.id === ruleId);
  if (!rule) return;
  let text = getInputText();
  const sorted = [...rule.matches].sort((a, b) => b.index - a.index);
  for (const m of sorted) {
    text = text.slice(0, m.index) + `[${redactLabel}]` + text.slice(m.index + m.length);
  }
  applyText(text);
}

function redactAll() {
  let text = getInputText();
  const all = [];
  for (const rule of currentMatches) {
    for (const m of rule.matches) all.push({ ...m, redactLabel: rule.redactLabel });
  }
  all.sort((a, b) => b.index - a.index);
  for (const m of all) {
    text = text.slice(0, m.index) + `[${m.redactLabel}]` + text.slice(m.index + m.length);
  }
  applyText(text);
}

// update contenteditable in a way React can detect
function applyText(newText) {
  removeHighlights();
  const el = getInputEl();
  if (!el) return;
  el.focus();
  document.execCommand('selectAll');
  document.execCommand('insertText', false, newText);

  const remaining = detectSensitiveData(newText, appSettings);
  if (remaining.length > 0) {
    currentMatches = remaining;
    showHighlights(remaining);
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
