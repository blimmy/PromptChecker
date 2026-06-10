// logger.js — จัดการ log การตรวจจับ (privacy-safe: ไม่เก็บข้อความต้นฉบับ)

const Logger = (() => {
  const KEY = 'pc_logs';
  const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 วัน

  async function _read() {
    const d = await chrome.storage.local.get(KEY);
    return d[KEY] || [];
  }

  async function _write(logs) {
    await chrome.storage.local.set({ [KEY]: logs });
  }

  // ลบ entry เก่าเกิน 90 วันออกก่อน save
  async function addEntry(severity, detected, action) {
    const logs = await _read();
    const cutoff = Date.now() - MAX_AGE_MS;
    const fresh = logs.filter(l => new Date(l.timestamp).getTime() > cutoff);
    fresh.push({
      timestamp: new Date().toISOString(),
      severity,
      detected,   // array ของชื่อประเภท เช่น ['เบอร์โทรศัพท์', 'อีเมล']
      action      // 'ส่งต่อ' หรือ 'แก้ไขก่อน'
    });
    await _write(fresh);
  }

  async function getAll() {
    return _read();
  }

  async function clearAll() {
    await _write([]);
  }

  // Export เป็น CSV สำหรับดาวน์โหลด
  async function exportCSV() {
    const logs = await _read();
    const rows = [['Timestamp', 'Severity', 'Detected', 'Action']];
    for (const l of logs) {
      rows.push([
        l.timestamp,
        l.severity,
        Array.isArray(l.detected) ? l.detected.join('; ') : l.detected,
        l.action
      ]);
    }
    return rows
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  // คืนสถิติสำหรับแสดงใน popup
  async function getStats() {
    const logs = await _read();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthLogs = logs.filter(l => new Date(l.timestamp) >= monthStart);

    // สร้างข้อมูลกราฟ 7 วันล่าสุด
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

  return { addEntry, getAll, clearAll, exportCSV, getStats };
})();
