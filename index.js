const express = require("express");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());

const LOG_FILE = path.join(__dirname, "opens.log");

// 1x1 transparent GIF — invisible tracking pixel
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

// Send notification email when pixel is loaded
async function sendNotification(emailId, ip, userAgent, timestamp) {
  if (!process.env.NOTIFY_EMAIL || !process.env.GMAIL_USER || !process.env.GMAIL_PASS) return;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.NOTIFY_EMAIL,
    subject: `Email opened — ${emailId}`,
    text: `Your tracked email was opened.\n\nEmail ID: ${emailId}\nTime: ${timestamp}\nIP: ${ip}\nDevice: ${userAgent}`,
  });
}

// Tracking pixel endpoint
app.get("/track/:emailId", async (req, res) => {
  const { emailId } = req.params;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userAgent = req.headers["user-agent"] || "Unknown";
  const timestamp = new Date().toISOString();

  // Log the open
  const logEntry = `[${timestamp}] EMAIL_ID: ${emailId} | IP: ${ip} | Device: ${userAgent}\n`;
  fs.appendFileSync(LOG_FILE, logEntry);
  console.log("OPENED:", logEntry.trim());

  // Send notification (non-blocking)
  sendNotification(emailId, ip, userAgent, timestamp).catch(console.error);

  // Return invisible pixel
  res.set({
    "Content-Type": "image/gif",
    "Content-Length": PIXEL.length,
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
  });
  res.send(PIXEL);
});

// View all opens as JSON
app.get("/logs", (req, res) => {
  if (!fs.existsSync(LOG_FILE)) return res.json([]);
  const lines = fs.readFileSync(LOG_FILE, "utf8").trim().split("\n").filter(Boolean);
  const parsed = lines.map(line => {
    const timestamp = (line.match(/\[(.+?)\]/) || [])[1] || "";
    const emailId = (line.match(/EMAIL_ID: ([^ |]+)/) || [])[1] || "";
    const ip = (line.match(/IP: ([^ |]+)/) || [])[1] || "";
    const device = (line.match(/Device: (.+)$/) || [])[1] || "";
    return { timestamp, emailId, ip, device };
  });
  res.json(parsed.reverse());
});

// Generate a tracking pixel URL for a new email
app.get("/new/:emailId", (req, res) => {
  const { emailId } = req.params;
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  const pixelUrl = `${baseUrl}/track/${emailId}`;
  const imgTag = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" />`;
  res.json({ emailId, pixelUrl, imgTag });
});

// UI
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Email Tracker</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #f0f0f0; min-height: 100vh; padding: 40px 20px; }
  .container { max-width: 700px; margin: 0 auto; }
  h1 { font-size: 22px; font-weight: 600; margin-bottom: 6px; }
  p.sub { color: #888; font-size: 14px; margin-bottom: 36px; }
  .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
  .card h2 { font-size: 15px; font-weight: 600; margin-bottom: 16px; color: #ccc; }
  .row { display: flex; gap: 10px; }
  input { flex: 1; background: #111; border: 1px solid #333; border-radius: 8px; padding: 10px 14px; color: #f0f0f0; font-size: 14px; outline: none; }
  input:focus { border-color: #555; }
  input::placeholder { color: #555; }
  button { background: #f0f0f0; color: #111; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; }
  button:hover { background: #ddd; }
  button.secondary { background: #222; color: #ccc; border: 1px solid #333; }
  button.secondary:hover { background: #2a2a2a; }
  .result { margin-top: 16px; display: none; }
  .result label { font-size: 12px; color: #888; display: block; margin-bottom: 6px; }
  .code-box { background: #111; border: 1px solid #2a2a2a; border-radius: 8px; padding: 12px 14px; font-family: monospace; font-size: 12px; color: #a8d8a8; word-break: break-all; position: relative; }
  .copy-btn { position: absolute; top: 8px; right: 8px; background: #2a2a2a; color: #ccc; border: none; border-radius: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer; }
  .copy-btn:hover { background: #333; }
  .log-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .log-header h2 { margin: 0; }
  .empty { color: #555; font-size: 14px; text-align: center; padding: 24px 0; }
  .log-item { border-bottom: 1px solid #222; padding: 12px 0; }
  .log-item:last-child { border-bottom: none; }
  .log-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .log-id { font-weight: 600; font-size: 14px; }
  .log-time { font-size: 12px; color: #888; }
  .log-device { font-size: 12px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .badge { display: inline-block; background: #1a3a1a; color: #4caf50; font-size: 11px; padding: 2px 8px; border-radius: 20px; margin-right: 8px; }
</style>
</head>
<body>
<div class="container">
  <h1>Email Tracker</h1>
  <p class="sub">Generate invisible tracking pixels and monitor email opens.</p>

  <div class="card">
    <h2>Generate Tracking Pixel</h2>
    <div class="row">
      <input type="text" id="emailId" placeholder="e.g. james-humble-followup" />
      <button onclick="generate()">Generate</button>
    </div>
    <div class="result" id="result">
      <div style="margin-bottom:14px">
        <label>IMG TAG — paste this invisibly at the bottom of your email</label>
        <div class="code-box" id="imgTag">
          <button class="copy-btn" onclick="copy('imgTag')">Copy</button>
          <span id="imgTagText"></span>
        </div>
      </div>
      <div>
        <label>PIXEL URL</label>
        <div class="code-box" id="pixelUrl">
          <button class="copy-btn" onclick="copy('pixelUrl')">Copy</button>
          <span id="pixelUrlText"></span>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="log-header">
      <h2>Open Logs</h2>
      <button class="secondary" onclick="loadLogs()">Refresh</button>
    </div>
    <div id="logs"><div class="empty">Loading...</div></div>
  </div>
</div>

<script>
async function generate() {
  const id = document.getElementById('emailId').value.trim();
  if (!id) return alert('Enter an email ID first');
  const res = await fetch('/new/' + encodeURIComponent(id));
  const data = await res.json();
  document.getElementById('imgTagText').textContent = data.imgTag;
  document.getElementById('pixelUrlText').textContent = data.pixelUrl;
  document.getElementById('result').style.display = 'block';
}

function copy(id) {
  const text = document.getElementById(id + 'Text').textContent;
  navigator.clipboard.writeText(text);
  const btn = document.querySelector('#' + id + ' .copy-btn');
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = 'Copy', 1500);
}

async function loadLogs() {
  const res = await fetch('/logs');
  const logs = await res.json();
  const el = document.getElementById('logs');
  if (!logs.length) { el.innerHTML = '<div class="empty">No opens logged yet.</div>'; return; }
  el.innerHTML = logs.map(l => {
    const date = new Date(l.timestamp);
    const time = date.toLocaleString();
    return \`<div class="log-item">
      <div class="log-top">
        <span><span class="badge">opened</span><span class="log-id">\${l.emailId}</span></span>
        <span class="log-time">\${time}</span>
      </div>
      <div class="log-device">\${l.device}</div>
    </div>\`;
  }).join('');
}

loadLogs();
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.start = () => app.listen(PORT, () => console.log(`Tracker running on port ${PORT}`));

module.exports = app;
if (require.main === module) app.start();
