# Email Open Tracker

Invisible 1x1 pixel tracker. When someone opens your email, you get notified instantly.

---

## How It Works

1. You generate a unique tracking link for each email you send
2. You embed an invisible image in your email using that link
3. When the recipient opens the email, their client loads the image from your server
4. Your server logs the open and emails you a notification instantly

---

## Setup (10 minutes)

### Step 1 — Deploy to Railway (free)

1. Go to https://railway.app and sign up with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Upload this folder or push to a GitHub repo and connect it
4. Railway will auto-detect Node.js and deploy it

### Step 2 — Set Environment Variables on Railway

In your Railway project, go to Variables and add:

```
GMAIL_USER=your@gmail.com
GMAIL_PASS=your_gmail_app_password
NOTIFY_EMAIL=your@gmail.com
BASE_URL=https://your-app.up.railway.app
```

**Getting a Gmail App Password:**
- Go to https://myaccount.google.com/apppasswords
- Select "Mail" and "Other (custom name)"
- Copy the 16-character password — use this as GMAIL_PASS

### Step 3 — Generate a Tracking Pixel

Once deployed, visit:
```
https://your-app.up.railway.app/new/james-humble
```

You'll get back:
```json
{
  "emailId": "james-humble",
  "pixelUrl": "https://your-app.up.railway.app/track/james-humble",
  "imgTag": "<img src=\"...\" width=\"1\" height=\"1\" style=\"display:none;\" />"
}
```

### Step 4 — Embed in Your Email

In Gmail, click the three dots at the bottom of the compose window → "Insert HTML" (or use a Gmail extension like "Insert HTML" by cloudHQ — free).

Paste the imgTag at the very bottom of your email before sending. It is completely invisible.

---

## View All Opens

Visit:
```
https://your-app.up.railway.app/logs
```

This shows every open with timestamp, IP, and device.

---

## Naming Your Emails

Use descriptive email IDs so you know which email was opened:

- `/new/james-humble-followup`
- `/new/james-second-email`
- `/new/client-proposal-may`

---

## Notes

- Most Gmail and Outlook clients load images automatically, so tracking works well
- Apple Mail Privacy Protection (iOS 15+) may pre-load images, which can show false opens
- Corporate email clients sometimes block external images entirely
