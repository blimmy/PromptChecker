// popup.js — Popup logic: Dashboard, Settings, Log

// ===== DEFAULT SETTINGS =====
const DEFAULT_SETTINGS = {
  enabledSeverities: { RED: true, ORANGE: true, YELLOW: true },
  customKeywords: [],
  whitelist: []
};

const SEVERITY_COLORS = {
  RED:    '#DC2626',
  ORANGE: '#EA580C',
  YELLOW: '#CA8A04'
};

// ===== STORAGE HELPER =====
const store = {
  get: keys => chrome.storage.local.get(keys),
  set: obj  => chrome.storage.local.set(obj)
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  const { checkerEnabled = true, appSettings = DEFAULT_SETTINGS } =
    await store.get(['checkerEnabled', 'appSettings']);

  initHeader(checkerEnabled);
  initTabs();
  await initDashboard();
  initSettings(appSettings);
  await initLog();
});

// ===== HEADER — master toggle =====
function initHeader(enabled) {
  const toggle = document.getElementById('pc-master-toggle');
  const label  = document.getElementById('toggle-status');

  toggle.checked = enabled;
  label.textContent = enabled ? 'เปิด' : 'ปิด';

  toggle.addEventListener('change', async () => {
    const val = toggle.checked;
    label.textContent = val ? 'เปิด' : 'ปิด';
    await store.set({ checkerEnabled: val });
  });
}

// ===== TAB SWITCHING =====
function initTabs() {
  const btns     = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

// ===== DASHBOARD =====
async function initDashboard() {
  const { pc_logs: logs = [] } = await store.get('pc_logs');

  // สถิติเดือนนี้
  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLogs  = logs.filter(l => new Date(l.timestamp) >= monthStart);

  document.getElementById('stat-total').textContent     = monthLogs.length;
  document.getElementById('stat-proceeded').textContent = monthLogs.filter(l => l.action === 'ส่งต่อ').length;
  document.getElementById('stat-edited').textContent    = monthLogs.filter(l => l.action === 'แก้ไขก่อน').length;

  drawBarChart(logs);
}

// Bar chart 7 วันล่าสุดใช้ Canvas API
function drawBarChart(logs) {
  const canvas = document.getElementById('pc-chart');
  const dpr    = window.devicePixelRatio || 1;
  const W      = canvas.offsetWidth  || 348;
  const H      = 100;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = `${W}px`;
  canvas.style.height = `${H}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // สร้างข้อมูล 7 วัน
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d  = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    days.push({
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      count: logs.filter(l => l.timestamp.startsWith(ds)).length
    });
  }

  const maxCount = Math.max(...days.map(d => d.count), 1);
  const padL = 8, padR = 8, padT = 8, padB = 22;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW   = Math.floor(chartW / days.length) - 4;

  // clear
  ctx.clearRect(0, 0, W, H);

  days.forEach((day, i) => {
    const x   = padL + i * (chartW / days.length) + 2;
    const bH  = day.count === 0 ? 2 : Math.max(4, (day.count / maxCount) * chartH);
    const y   = padT + chartH - bH;

    // bar
    ctx.fillStyle = day.count === 0 ? '#374151' : '#3b82f6';
    roundRect(ctx, x, y, barW, bH, 3);
    ctx.fill();

    // label วันที่
    ctx.fillStyle = '#6b7280';
    ctx.font = `10px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(day.label, x + barW / 2, H - 5);

    // count บน bar
    if (day.count > 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = `9px -apple-system, sans-serif`;
      ctx.fillText(day.count, x + barW / 2, y - 3);
    }
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ===== SETTINGS =====
function initSettings(settings) {
  const s = Object.assign({}, DEFAULT_SETTINGS, settings);

  // Severity toggles
  document.getElementById('sev-red').checked    = s.enabledSeverities.RED    !== false;
  document.getElementById('sev-orange').checked = s.enabledSeverities.ORANGE !== false;
  document.getElementById('sev-yellow').checked = s.enabledSeverities.YELLOW !== false;

  ['red', 'orange', 'yellow'].forEach(lv => {
    document.getElementById(`sev-${lv}`).addEventListener('change', saveSettings);
  });

  // Custom keywords
  renderTags('kw-list', s.customKeywords, 'kw');
  document.getElementById('kw-add').addEventListener('click', () => addTag('kw-input', 'kw-list', 'kw'));
  document.getElementById('kw-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTag('kw-input', 'kw-list', 'kw');
  });

  // Whitelist
  renderTags('wl-list', s.whitelist, 'wl');
  document.getElementById('wl-add').addEventListener('click', () => addTag('wl-input', 'wl-list', 'wl'));
  document.getElementById('wl-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTag('wl-input', 'wl-list', 'wl');
  });
}

function renderTags(containerId, items, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  (items || []).forEach((item, i) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `${escapeHtml(item)} <button class="tag-remove" data-type="${type}" data-index="${i}">×</button>`;
    tag.querySelector('.tag-remove').addEventListener('click', () => removeTag(type, i));
    container.appendChild(tag);
  });
}

async function addTag(inputId, listId, type) {
  const input = document.getElementById(inputId);
  const val   = input.value.trim();
  if (!val) return;

  const { appSettings = DEFAULT_SETTINGS } = await store.get('appSettings');
  const s = Object.assign({}, DEFAULT_SETTINGS, appSettings);
  const arr = type === 'kw' ? s.customKeywords : s.whitelist;
  if (arr.includes(val)) { input.value = ''; return; }

  arr.push(val);
  await store.set({ appSettings: s });
  input.value = '';
  renderTags(listId, arr, type);
}

async function removeTag(type, index) {
  const { appSettings = DEFAULT_SETTINGS } = await store.get('appSettings');
  const s   = Object.assign({}, DEFAULT_SETTINGS, appSettings);
  const arr = type === 'kw' ? s.customKeywords : s.whitelist;
  arr.splice(index, 1);
  await store.set({ appSettings: s });
  renderTags(type === 'kw' ? 'kw-list' : 'wl-list', arr, type);
}

async function saveSettings() {
  const { appSettings = DEFAULT_SETTINGS } = await store.get('appSettings');
  const s = Object.assign({}, DEFAULT_SETTINGS, appSettings);
  s.enabledSeverities = {
    RED:    document.getElementById('sev-red').checked,
    ORANGE: document.getElementById('sev-orange').checked,
    YELLOW: document.getElementById('sev-yellow').checked
  };
  await store.set({ appSettings: s });
}

// ===== LOG TAB =====
async function initLog() {
  await renderLogs('ALL');

  document.getElementById('log-filter').addEventListener('change', e => renderLogs(e.target.value));

  // Export CSV
  document.getElementById('log-export').addEventListener('click', async () => {
    const { pc_logs: logs = [] } = await store.get('pc_logs');
    const rows = [['Timestamp', 'Severity', 'Detected', 'Action']];
    for (const l of logs) {
      rows.push([l.timestamp, l.severity, (l.detected || []).join('; '), l.action]);
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `promptchecker-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Clear all
  document.getElementById('log-clear').addEventListener('click', async () => {
    if (!confirm('ลบ log ทั้งหมด?')) return;
    await store.set({ pc_logs: [] });
    renderLogs('ALL');
  });
}

async function renderLogs(filter = 'ALL') {
  const { pc_logs: logs = [] } = await store.get('pc_logs');
  const container = document.getElementById('log-list');

  const filtered = filter === 'ALL' ? logs : logs.filter(l => l.severity === filter);
  // เรียงจากใหม่ไปเก่า
  const sorted = [...filtered].reverse();

  if (sorted.length === 0) {
    container.innerHTML = '<div class="log-empty">ยังไม่มี log</div>';
    return;
  }

  container.innerHTML = sorted.map(l => {
    const dt     = new Date(l.timestamp);
    const time   = `${dt.toLocaleDateString('th-TH')} ${dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
    const action = l.action === 'ส่งต่อ'
      ? `<span class="log-action proceed">ส่งต่อ</span>`
      : `<span class="log-action edit">แก้ไข</span>`;
    const detected = Array.isArray(l.detected) ? l.detected.join(', ') : l.detected;

    return `
      <div class="log-item ${l.severity}">
        <div class="log-top">
          <span class="log-time">${time}</span>
          ${action}
        </div>
        <div class="log-detected">${escapeHtml(detected)}</div>
      </div>`;
  }).join('');
}

// ===== UTILS =====
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
