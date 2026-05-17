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

// View all opens
app.get("/logs", (req, res) => {
  if (!fs.existsSync(LOG_FILE)) return res.send("No opens logged yet.");
  res.set("Content-Type", "text/plain");
  res.send(fs.readFileSync(LOG_FILE, "utf8"));
});

// Generate a tracking pixel URL for a new email
app.get("/new/:emailId", (req, res) => {
  const { emailId } = req.params;
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  const pixelUrl = `${baseUrl}/track/${emailId}`;
  const imgTag = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" />`;
  res.json({ emailId, pixelUrl, imgTag });
});

const PORT = process.env.PORT || 3000;
app.start = () => app.listen(PORT, () => console.log(`Tracker running on port ${PORT}`));

module.exports = app;
if (require.main === module) app.start();
