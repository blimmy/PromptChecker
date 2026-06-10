# 🛡 PromptChecker

Chrome Extension สำหรับแจ้งเตือนข้อมูลลับก่อนส่ง Prompt บน [claude.ai](https://claude.ai)  
ไม่บล็อกการส่ง — แต่ให้คุณตัดสินใจเองทุกครั้ง

---

## ฟีเจอร์หลัก

- **แจ้งเตือน Toast** ทันทีที่ตรวจพบข้อมูลลับในกล่องพิมพ์
- **3 ระดับความรุนแรง** — 🔴 วิกฤต / 🟠 สูง / 🟡 ทั่วไป
- **Auto-Redact** แทนที่ข้อมูลลับด้วย `[REDACTED-...]` ก่อนส่ง
- **Log การแจ้งเตือน** ย้อนหลัง 90 วัน (ไม่เก็บข้อความต้นฉบับ)
- **Export CSV** สำหรับ audit trail
- **Custom Keywords & Whitelist** ตั้งค่าเองได้

---

## การติดตั้ง

### ขั้นตอน

1. ดาวน์โหลดหรือ clone โปรเจกต์นี้

   ```bash
   git clone git@github.com:blimmy/PromptChecker.git
   ```

2. เปิด Chrome แล้วไปที่ URL:

   ```
   chrome://extensions/
   ```

3. เปิด **Developer mode** ที่มุมขวาบน

   ![Developer mode toggle](https://i.imgur.com/placeholder.png)

4. คลิก **Load unpacked** แล้วเลือกโฟลเดอร์ `PromptChecker`

5. Extension จะปรากฏใน Chrome toolbar พร้อมใช้งาน

> **ต้องการ Chrome 88 ขึ้นไป** (รองรับ Manifest V3)

---

## วิธีใช้งาน

### การแจ้งเตือน Toast

เมื่อพิมพ์ข้อความใน claude.ai แล้วกดส่ง PromptChecker จะสแกนข้อความทันที

**กรณีพบ 1 ประเภท:**

```
⚠️ คุณกำลังจะส่ง "เบอร์โทรศัพท์" หรือเปล่า?
ข้อมูลนี้เป็นระดับ 🟠 สูง — โปรดตรวจสอบก่อนส่ง
[ ส่งต่อ ]  [ แก้ไขก่อน ]
```

**กรณีพบหลายประเภท:**

```
⚠️ พบข้อมูลที่ควรระวัง 3 รายการ
🔴 เลขบัตรประชาชน
🟠 เบอร์โทรศัพท์
🟡 คำว่า "confidential"
ข้อมูลสูงสุดอยู่ระดับ 🔴 วิกฤต — โปรดตรวจสอบก่อนส่ง
[ ส่งต่อ ]  [ แก้ไขก่อน ]
```

| ปุ่ม | ผลลัพธ์ |
|------|---------|
| **ส่งต่อ** | ส่ง prompt ตามปกติ และบันทึก log ว่า "ส่งต่อ" |
| **แก้ไขก่อน** | ปิด toast และแสดง Highlight Panel ให้แก้ไข |

---

### Highlight Panel & Auto-Redact

เมื่อกด **แก้ไขก่อน** จะเห็น:

- **Wavy underline** สีแดง/ส้ม/เหลือง ใต้ข้อความที่ตรวจพบ
- **Panel** แสดงรายการทุกประเภทที่พบ พร้อมจำนวนครั้ง
- **ปุ่ม Auto-Redact** แยกแต่ละประเภท หรือ **Auto-Redact ทั้งหมด**

ตัวอย่างผลลัพธ์หลัง Auto-Redact:

```
ก่อน: โทร 0812345678 หรืออีเมล john@example.com
หลัง: โทร [REDACTED-PHONE] หรืออีเมล [REDACTED-EMAIL]
```

| ประเภท | Redact Label |
|--------|-------------|
| เลขบัตรประชาชน | `[REDACTED-ID]` |
| เลขบัตรเครดิต | `[REDACTED-CARD]` |
| เลขบัญชีธนาคาร | `[REDACTED-ACCOUNT]` |
| Password/API Key | `[REDACTED-PASSWORD]` |
| Private Key | `[REDACTED-KEY]` |
| เบอร์โทรศัพท์ | `[REDACTED-PHONE]` |
| อีเมล | `[REDACTED-EMAIL]` |
| เลข Passport | `[REDACTED-PASSPORT]` |
| IP Address ภายใน | `[REDACTED-IP]` |
| จำนวนเงินสูง | `[REDACTED-AMOUNT]` |
| คำสำคัญลับ | `[REDACTED-CONFIDENTIAL]` |
| Custom Keyword | `[REDACTED]` |

---

## Popup — การตั้งค่าและดู Log

คลิกไอคอน 🛡 ใน Chrome toolbar เพื่อเปิด Popup

### Tab 1 — Dashboard

- **Toggle เปิด/ปิด** PromptChecker (มุมขวาบน)
- **สถิติเดือนนี้:** จำนวนครั้งที่เตือน / ส่งต่อ / แก้ไข
- **Bar Chart** แสดงการแจ้งเตือน 7 วันล่าสุด

### Tab 2 — Settings

**ระดับการแจ้งเตือน** — เปิด/ปิดแต่ละ severity แยกกัน

| Severity | ตรวจจับ |
|----------|---------|
| 🔴 RED (วิกฤต) | บัตรประชาชน, บัตรเครดิต, บัญชีธนาคาร, Password, Private Key |
| 🟠 ORANGE (สูง) | เบอร์โทร, อีเมล, Passport, IP ภายใน, จำนวนเงินสูง |
| 🟡 YELLOW (ทั่วไป) | คำว่า confidential/ลับ/NDA และ Custom Keywords |

**Custom Keywords** — เพิ่มคำที่ต้องการตรวจเพิ่มเติม เช่น ชื่อโปรเจกต์ลับ หรือชื่อลูกค้า

**Whitelist** — เพิ่มคำ, อีเมล, หรือ domain ที่ไม่ต้องแจ้งเตือน เช่น `@company.com`  
(ถ้า prompt มีคำ whitelist PromptChecker จะข้ามการตรวจสอบทั้งหมด)

### Tab 3 — Log

- แสดงประวัติการแจ้งเตือนย้อนหลัง **90 วัน**
- **Filter** ตาม severity (ALL / RED / ORANGE / YELLOW)
- **Export CSV** สำหรับ audit หรือ compliance report
- **Clear** ลบ log ทั้งหมด

> Log เก็บเฉพาะ: timestamp, severity, ประเภทที่พบ, action ที่เลือก  
> **ไม่เก็บข้อความต้นฉบับ** เพื่อความเป็นส่วนตัว

---

## ข้อมูลที่ตรวจจับ

### 🔴 RED — วิกฤต

| ประเภท | ตัวอย่าง |
|--------|---------|
| เลขบัตรประชาชน 13 หลัก | `1234567890123` หรือ `1-2345-67890-12-3` |
| เลขบัตรเครดิต | `4111 1111 1111 1111` |
| เลขบัญชีธนาคาร | `1234567890` (10–12 หลัก) |
| Password / API Key | `password: abc123`, `api_key=sk-xxx` |
| Private Key | `-----BEGIN RSA PRIVATE KEY-----` |

### 🟠 ORANGE — สูง

| ประเภท | ตัวอย่าง |
|--------|---------|
| เบอร์โทรศัพท์ไทย | `0812345678`, `0912345678` |
| อีเมล | `user@example.com` |
| เลข Passport | `AB1234567` |
| IP Address ภายใน | `192.168.1.1`, `10.0.0.1` |
| จำนวนเงินสูง | `1,000,000 บาท`, `500,000 THB` |

### 🟡 YELLOW — ทั่วไป

| ประเภท | ตัวอย่าง |
|--------|---------|
| คำสำคัญ | `confidential`, `ลับ`, `NDA`, `ห้ามเผยแพร่`, `รหัสผ่าน` |
| Custom Keywords | คำที่กำหนดเองใน Settings |

---

## โครงสร้างไฟล์

```
PromptChecker/
├── manifest.json     # Manifest V3 config
├── rules.js          # Detection engine + RULES + SEVERITY_CONFIG
├── logger.js         # Log manager (chrome.storage)
├── content.js        # Content script: toast, highlight, redact
├── styles.css        # Styles สำหรับ toast และ highlight panel
├── popup.html        # Popup UI (dark mode, 3 tabs)
└── popup.js          # Popup logic: dashboard, settings, log
```

---

## Privacy & Security

- ข้อมูลทั้งหมดเก็บใน `chrome.storage.local` บนเครื่องของคุณเท่านั้น
- **ไม่มีการส่งข้อมูลออกไปที่ใดทั้งสิ้น**
- Log ไม่เก็บข้อความต้นฉบับ — เก็บเฉพาะประเภทที่ตรวจพบ
- Extension ทำงานเฉพาะบน `https://claude.ai/*`
- Permissions ที่ขอ: `storage`, `activeTab` เท่านั้น

---

## Troubleshooting

**Toast ไม่แสดง**  
claude.ai อาจอัปเดต DOM — เปิด DevTools (F12) ตรวจสอบ selector ของ input area แล้วแก้ฟังก์ชัน `getInputEl()` และ `getSendBtn()` ใน `content.js`

**Extension ไม่โหลด**  
ตรวจสอบ Chrome version ต้องเป็น 88 ขึ้นไป และ manifest_version ต้องเป็น 3

**Auto-Redact ไม่ทำงาน**  
ฟีเจอร์นี้ใช้ `document.execCommand` ซึ่ง deprecated ใน Chrome บางเวอร์ชัน — ถ้าไม่ทำงาน ให้แก้ไขข้อความเองใน input แล้วกดส่งใหม่

---

## License

MIT
