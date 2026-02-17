/**
 * Google Drive OAuth2 Setup Script
 * 
 * This script helps you get a refresh_token for Google Drive API.
 * 
 * Prerequisites:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a project (or use existing one)
 * 3. Enable "Google Drive API" under APIs & Services > Library
 * 4. Go to APIs & Services > Credentials
 * 5. Click "Create Credentials" > "OAuth client ID"
 * 6. Application type: "Desktop app" (or "Web application")
 *    - If Web application, add http://localhost:3333/callback as redirect URI
 * 7. Copy the Client ID and Client Secret
 * 
 * Usage:
 *   node scripts/google-auth.js <CLIENT_ID> <CLIENT_SECRET>
 * 
 * After completing the flow, add the output values to your .env file.
 */

import { google } from "googleapis";
import http from "http";
import { URL } from "url";
import open from "open";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const REDIRECT_URI = "http://localhost:3333/callback";

const clientId = process.argv[2];
const clientSecret = process.argv[3];

if (!clientId || !clientSecret) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          Google Drive OAuth2 Setup                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Usage:                                                      ║
║    node scripts/google-auth.js <CLIENT_ID> <CLIENT_SECRET>  ║
║                                                              ║
║  Steps to get CLIENT_ID and CLIENT_SECRET:                   ║
║                                                              ║
║  1. Go to https://console.cloud.google.com/                  ║
║  2. Select your project (or create one)                      ║
║  3. Enable "Google Drive API"                                ║
║     - APIs & Services > Library > search "Google Drive API"  ║
║  4. Create OAuth credentials:                                ║
║     - APIs & Services > Credentials                          ║
║     - Create Credentials > OAuth client ID                   ║
║     - Application type: "Web application"                    ║
║     - Add redirect URI: http://localhost:3333/callback        ║
║  5. Copy Client ID and Client Secret                         ║
║  6. Run this script with those values                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent",
});

console.log("\n🌐 Opening browser for Google authorization...\n");
console.log("If the browser doesn't open, visit this URL manually:");
console.log(`\n${authUrl}\n`);

// Start a temporary HTTP server to capture the callback
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:3333`);
    
    if (url.pathname !== "/callback") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h1>❌ Authorization denied</h1><p>You can close this window.</p>");
      console.error("❌ Authorization denied:", error);
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h1>❌ No authorization code received</h1>");
      return;
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h1>✅ Authorization successful!</h1>
          <p>You can close this window and go back to the terminal.</p>
        </body>
      </html>
    `);

    console.log("\n✅ Authorization successful!\n");
    console.log("Add these values to your backend/.env file:\n");
    console.log("─".repeat(60));
    console.log(`GOOGLE_DRIVE_CLIENT_ID=${clientId}`);
    console.log(`GOOGLE_DRIVE_CLIENT_SECRET=${clientSecret}`);
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("─".repeat(60));
    console.log("\nDon't forget to also set GOOGLE_DRIVE_FOLDER_ID if you haven't already.\n");

    server.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error exchanging code for tokens:", err.message);
    res.writeHead(500, { "Content-Type": "text/html" });
    res.end("<h1>❌ Error</h1><p>" + err.message + "</p>");
    server.close();
    process.exit(1);
  }
});

server.listen(3333, () => {
  console.log("📡 Listening on http://localhost:3333/callback for OAuth redirect...\n");

  // Try to open the browser
  open(authUrl).catch(() => {
    console.log("⚠️  Could not open browser automatically. Please visit the URL above.\n");
  });
});
