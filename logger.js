// logger.js - log manager, no original text stored

const Logger = (() => {
  const KEY = 'pc_logs';
  const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

  async function _read() {
    const d = await chrome.storage.local.get(KEY);
    return d[KEY] || [];
  }

  async function _write(logs) {
    await chrome.storage.local.set({ [KEY]: logs });
  }

  // prefix injection-risk chars with a single quote per OWASP CSV guidelines
  function _sanitize(val) {
    const s = String(val);
    return /^[=+\-@]/.test(s) ? "'" + s : s;
  }

  async function addEntry(severity, detected, action) {
    const logs = await _read();
    const cutoff = Date.now() - MAX_AGE_MS;
    const fresh = logs.filter(l => new Date(l.timestamp).getTime() > cutoff);
    fresh.push({
      timestamp: new Date().toISOString(),
      severity,
      detected,
      action
    });
    await _write(fresh);
  }

  async function getAll() {
    return _read();
  }

  async function clearAll() {
    await _write([]);
  }

  // removes entries older than 90 days without adding a new one
  async function purgeOldLogs() {
    const logs = await _read();
    const cutoff = Date.now() - MAX_AGE_MS;
    const fresh = logs.filter(l => new Date(l.timestamp).getTime() > cutoff);
    if (fresh.length !== logs.length) {
      await _write(fresh);
    }
  }

  // fields: timestamp, severity, detected_type, action — no original text
  async function exportCSV() {
    const logs = await _read();
    const header = 'timestamp,severity,detected_type,action';
    const rows = logs.map(l => {
      const detectedType = Array.isArray(l.detected) ? l.detected.join('; ') : String(l.detected);
      return [l.timestamp, l.severity, detectedType, l.action]
        .map(f => `"${_sanitize(f).replace(/"/g, '""')}"`)
        .join(',');
    });
    return [header, ...rows].join('\n');
  }

  async function getStats() {
    const logs = await _read();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthLogs = logs.filter(l => new Date(l.timestamp) >= monthStart);

    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      last7.push({
        date: ds,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        count: logs.filter(l => l.timestamp.startsWith(ds)).length
      });
    }

    return {
      totalMonth: monthLogs.length,
      proceeded: monthLogs.filter(l => l.action === 'ส่งต่อ').length,
      edited: monthLogs.filter(l => l.action === 'แก้ไขก่อน').length,
      last7Days: last7
    };
  }

  // purge on every extension load
  purgeOldLogs();

  return { addEntry, getAll, clearAll, exportCSV, getStats, purgeOldLogs };
})();
