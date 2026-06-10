// rules.js - detection engine

const RULES = [
  {
    id: 'national_id',
    name: 'เลขบัตรประชาชน',
    severity: 'RED',
    redactLabel: 'REDACTED-ID',
    patterns: [
      /\b\d{1}-\d{4}-\d{5}-\d{2}-\d{1}\b/g,
      /\b(?<!\d)\d{13}(?!\d)\b/g
    ]
  },
  {
    id: 'credit_card',
    name: 'เลขบัตรเครดิต',
    severity: 'RED',
    redactLabel: 'REDACTED-CARD',
    patterns: [/\b(?:\d{4}[\s\-]?){3}\d{4}\b/g]
  },
  {
    id: 'bank_account',
    name: 'เลขบัญชีธนาคาร',
    severity: 'RED',
    redactLabel: 'REDACTED-ACCOUNT',
    // 10-12 digits, avoids collision with 13-digit national_id
    patterns: [/\b(?<!\d)\d{10,12}(?!\d)\b/g]
  },
  {
    id: 'password',
    name: 'Password/API Key',
    severity: 'RED',
    redactLabel: 'REDACTED-PASSWORD',
    patterns: [/(password|passwd|secret|api[_\s]?key|token|bearer)\s*[:=]\s*\S+/gi]
  },
  {
    id: 'private_key',
    name: 'Private Key',
    severity: 'RED',
    redactLabel: 'REDACTED-KEY',
    patterns: [/-----BEGIN .{0,60}PRIVATE KEY-----/g]
  },
  {
    id: 'thai_phone',
    name: 'เบอร์โทรศัพท์',
    severity: 'ORANGE',
    redactLabel: 'REDACTED-PHONE',
    patterns: [/\b0[689]\d{8}\b/g]
  },
  {
    id: 'email',
    name: 'อีเมล',
    severity: 'ORANGE',
    redactLabel: 'REDACTED-EMAIL',
    patterns: [/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g]
  },
  {
    id: 'passport',
    name: 'เลข Passport',
    severity: 'ORANGE',
    redactLabel: 'REDACTED-PASSPORT',
    patterns: [/\b[A-Z]{2}\d{7}\b/g]
  },
  {
    id: 'internal_ip',
    name: 'IP Address ภายใน',
    severity: 'ORANGE',
    redactLabel: 'REDACTED-IP',
    patterns: [/\b(192\.168|10\.\d{1,3}|172\.(1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/g]
  },
  {
    id: 'large_amount',
    name: 'จำนวนเงินสูง',
    severity: 'ORANGE',
    redactLabel: 'REDACTED-AMOUNT',
    patterns: [/\b\d{1,3}(,\d{3})+\s*(บาท|THB|USD|฿|\$)\b/g]
  },
  {
    id: 'confidential',
    name: 'คำสำคัญลับ',
    severity: 'YELLOW',
    redactLabel: 'REDACTED-CONFIDENTIAL',
    patterns: [
      /\b(confidential|internal\s+only|NDA|ห้ามเผยแพร่|รหัสผ่าน)\b/gi,
      /(ลับ|ความลับ)/g
    ]
  }
];

const SEVERITY_CONFIG = {
  RED:    { color: '#DC2626', bg: '#FEF2F2', label: 'วิกฤต',  priority: 3 },
  ORANGE: { color: '#EA580C', bg: '#FFF7ED', label: 'สูง',    priority: 2 },
  YELLOW: { color: '#CA8A04', bg: '#FEFCE8', label: 'ทั่วไป', priority: 1 }
};

// scan text for sensitive data using all rules
function detectSensitiveData(text, settings = {}) {
  const {
    enabledSeverities = { RED: true, ORANGE: true, YELLOW: true },
    customKeywords = [],
    whitelist = []
  } = settings;

  // skip if text contains a whitelisted term
  if (whitelist.some(w => w && text.toLowerCase().includes(w.toLowerCase()))) {
    return [];
  }

  const results = [];

  for (const rule of RULES) {
    if (!enabledSeverities[rule.severity]) continue;

    const seen = new Set();
    const matchList = [];

    for (const pat of rule.patterns) {
      // clone to reset lastIndex
      const re = new RegExp(pat.source, pat.flags);
      let m;
      while ((m = re.exec(text)) !== null) {
        const key = `${m.index}:${m[0].length}`;
        if (!seen.has(key)) {
          seen.add(key);
          matchList.push({ index: m.index, length: m[0].length, text: m[0] });
        }
      }
    }

    if (matchList.length > 0) {
      results.push({
        id: rule.id,
        name: rule.name,
        severity: rule.severity,
        redactLabel: rule.redactLabel,
        matches: matchList
      });
    }
  }

  // custom keywords as YELLOW
  if (enabledSeverities.YELLOW && customKeywords.length > 0) {
    const customList = [];
    for (const kw of customKeywords) {
      if (!kw.trim()) continue;
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'gi');
      let m;
      while ((m = re.exec(text)) !== null) {
        customList.push({ index: m.index, length: m[0].length, text: m[0] });
      }
    }
    if (customList.length > 0) {
      results.push({
        id: 'custom',
        name: 'Custom Keyword',
        severity: 'YELLOW',
        redactLabel: 'REDACTED',
        matches: customList
      });
    }
  }

  return results;
}
