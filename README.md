# PromptChecker

A Chrome Extension that warns you about sensitive data before sending a prompt on [claude.ai](https://claude.ai).
It never blocks your message. You decide every time.

---

## Features

- **Toast notification** shown instantly when sensitive data is detected in the input box
- **3 severity levels** - RED (critical) / ORANGE (high) / YELLOW (general)
- **Auto-Redact** replaces sensitive text with `[REDACTED-...]` before sending
- **Alert log** retained for 90 days, no original text stored
- **CSV export** for audit trails
- **Custom keywords and whitelist** configurable by the user

---

## Installation

1. Clone the repository

   ```bash
   git clone git@github.com:blimmy/PromptChecker.git
   ```

2. Open Chrome and go to

   ```
   chrome://extensions/
   ```

3. Enable **Developer mode** in the top-right corner

4. Click **Load unpacked** and select the `PromptChecker` folder

5. The extension will appear in the Chrome toolbar and is ready to use

> Requires Chrome 88 or later (Manifest V3)

---

## Usage

### Toast Notification

When you type in claude.ai and press send, PromptChecker scans the text immediately.

**Single detection:**

```
! Are you about to send "Phone number"?
This data is level HIGH - please review before sending
[ Proceed ]  [ Edit first ]
```

**Multiple detections:**

```
! 3 sensitive items detected
National ID
Phone number
"confidential" keyword
Highest level is CRITICAL - please review before sending
[ Proceed ]  [ Edit first ]
```

| Button | Result |
|--------|--------|
| **Proceed** | Sends the prompt and logs the action as "proceeded" |
| **Edit first** | Closes the toast and opens the Highlight Panel |

---

### Highlight Panel and Auto-Redact

When you click **Edit first** you will see:

- **Wavy underlines** in red, orange, or yellow under each detected item
- **Panel** listing every detected type with its match count
- **Auto-Redact button** per type, plus an **Auto-Redact All** button

Example result after Auto-Redact:

```
Before: call 0812345678 or email john@example.com
After:  call [REDACTED-PHONE] or email [REDACTED-EMAIL]
```

| Type | Redact label |
|------|-------------|
| National ID | `[REDACTED-ID]` |
| Credit card number | `[REDACTED-CARD]` |
| Bank account number | `[REDACTED-ACCOUNT]` |
| Password / API Key | `[REDACTED-PASSWORD]` |
| Private Key | `[REDACTED-KEY]` |
| Phone number | `[REDACTED-PHONE]` |
| Email address | `[REDACTED-EMAIL]` |
| Passport number | `[REDACTED-PASSPORT]` |
| Internal IP address | `[REDACTED-IP]` |
| Large monetary amount | `[REDACTED-AMOUNT]` |
| Confidential keyword | `[REDACTED-CONFIDENTIAL]` |
| Custom keyword | `[REDACTED]` |

---

## Popup

Click the PromptChecker icon in the Chrome toolbar to open the popup.

### Tab 1 - Dashboard

- **Toggle** to enable or disable PromptChecker
- **Monthly stats** showing alert count, proceeded count, and edited count
- **Bar chart** of alerts over the last 7 days

### Tab 2 - Settings

**Severity toggles** to enable or disable each level independently

| Severity | Detects |
|----------|---------|
| RED (critical) | National ID, credit card, bank account, password, private key |
| ORANGE (high) | Phone number, email, passport, internal IP, large amounts |
| YELLOW (general) | Keywords like confidential / NDA and custom keywords |

**Custom Keywords** - add any words you want to flag, such as project names or client names

**Whitelist** - add words, emails, or domains to skip entirely, for example `@company.com`
If a prompt contains any whitelisted term, PromptChecker skips all checks for that prompt.

### Tab 3 - Log

- Shows alert history for the last **90 days**
- **Filter** by severity (ALL / RED / ORANGE / YELLOW)
- **Export CSV** for audit or compliance reports
- **Clear** to delete all log entries

> The log stores only: timestamp, severity, detected type, and action chosen.
> Original prompt text is never saved.

---

## What Gets Detected

### RED - Critical

| Type | Example |
|------|---------|
| Thai national ID (13 digits) | `1234567890123` or `1-2345-67890-12-3` |
| Credit card number | `4111 1111 1111 1111` |
| Bank account number | `1234567890` (10 to 12 digits) |
| Password or API Key | `password: abc123`, `api_key=sk-xxx` |
| Private Key | `-----BEGIN RSA PRIVATE KEY-----` |

### ORANGE - High

| Type | Example |
|------|---------|
| Thai phone number | `0812345678`, `0912345678` |
| Email address | `user@example.com` |
| Passport number | `AB1234567` |
| Internal IP address | `192.168.1.1`, `10.0.0.1` |
| Large monetary amount | `1,000,000 THB`, `500,000 USD` |

### YELLOW - General

| Type | Example |
|------|---------|
| Sensitive keywords | `confidential`, `NDA`, `internal only` |
| Custom keywords | Any words configured in Settings |

---

## File Structure

```
PromptChecker/
├── manifest.json     # Manifest V3 config
├── rules.js          # Detection engine, RULES, SEVERITY_CONFIG
├── logger.js         # Log manager using chrome.storage
├── content.js        # Content script: toast, highlight, redact
├── styles.css        # Styles for toast and highlight panel
├── popup.html        # Popup UI (dark mode, 3 tabs)
└── popup.js          # Popup logic: dashboard, settings, log
```

---

## Privacy and Security

- All data is stored in `chrome.storage.local` on your machine only
- No data is sent anywhere
- Logs store only the detected type, not the original text
- The extension runs only on `https://claude.ai/*`
- Permissions requested: `storage` and `activeTab` only

---

## Troubleshooting

**Toast does not appear**
claude.ai may have updated its DOM. Open DevTools (F12), find the selector for the input area, and update `getInputEl()` and `getSendBtn()` in `content.js`.

**Extension does not load**
Check that your Chrome version is 88 or later and that `manifest_version` is set to 3.

**Auto-Redact does not work**
This feature uses `document.execCommand` which is deprecated in some Chrome versions. If it fails, edit the text manually in the input box and send again.

---

## License

MIT
