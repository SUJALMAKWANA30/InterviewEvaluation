import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Scopes required for Google Drive API
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// Lazy initialization of Google Drive API
let drive = null;
let authInitialized = false;
let authError = null;

const initializeDrive = () => {
  if (authInitialized) return drive;

  try {
    let auth;

    // Method 1 (Recommended): OAuth2 with refresh token — works with personal Google accounts
    if (
      process.env.GOOGLE_DRIVE_CLIENT_ID &&
      process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN
    ) {
      console.log("🔑 Using OAuth2 credentials for Google Drive");
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_DRIVE_CLIENT_ID,
        process.env.GOOGLE_DRIVE_CLIENT_SECRET
      );
      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
      });
      auth = oauth2Client;
    }
    // Method 2: Service account key file (requires Google Workspace with storage quota)
    else {
      const keyfilePath = process.env.GOOGLE_DRIVE_KEYFILE
        ? path.resolve(process.env.GOOGLE_DRIVE_KEYFILE)
        : path.join(__dirname, "../../config/google-drive-key.json");

      if (fs.existsSync(keyfilePath)) {
        console.log("🔑 Using service account key file for Google Drive:", keyfilePath);
        auth = new google.auth.GoogleAuth({
          keyFile: keyfilePath,
          scopes: SCOPES,
        });
      } else {
        console.warn("⚠️  Google Drive API not configured.");
        console.warn("   Run: node scripts/google-auth.js   to set up OAuth2 credentials");
        authError = new Error("Google Drive API not configured");
        authInitialized = true;
        return null;
      }
    }

    drive = google.drive({ version: "v3", auth });
    authInitialized = true;
    console.log("✅ Google Drive API initialized successfully");
    return drive;
  } catch (error) {
    console.error("❌ Failed to initialize Google Drive API:", error.message);
    authError = error;
    authInitialized = true;
    return null;
  }
};

/**
 * Upload a file to Google Drive
 * @param {Object} file - File object with buffer, originalname, mimetype
 * @param {string} folderName - Folder name to organize files (e.g., "resumes", "idproofs")
 * @returns {Object} - Object containing file ID and public URL
 */
export const uploadFileToDrive = async (file, folderName = "candidate-documents") => {
  const driveClient = initializeDrive();

  if (!driveClient) {
    console.warn("Google Drive not available, skipping file upload");
    return null;
  }

  try {
    // First, check if the folder exists or create it
    const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;
    const folderId = await getOrCreateFolder(driveClient, folderName, parentFolderId);

    // Create unique filename
    const uniqueFilename = `${Date.now()}-${file.originalname}`;

    // Create file metadata
    const fileMetadata = {
      name: uniqueFilename,
      parents: [folderId],
    };

    // Create readable stream from buffer
    const { Readable } = await import("stream");
    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);

    // Upload file
    const response = await driveClient.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: file.mimetype,
        body: bufferStream,
      },
      fields: "id, webViewLink, webContentLink",
    });

    // Make the file publicly accessible
    await driveClient.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // Get the updated file with sharing link
    const fileData = await driveClient.files.get({
      fileId: response.data.id,
      fields: "id, webViewLink, webContentLink",
    });

    console.log(`✅ Uploaded ${file.originalname} to Google Drive (${folderName})`);

    return {
      fileId: fileData.data.id,
      webViewLink: fileData.data.webViewLink,
      webContentLink: fileData.data.webContentLink,
      directLink: `https://drive.google.com/open?id=${fileData.data.id}`,
    };
  } catch (error) {
    console.error("❌ Error uploading file to Google Drive:", error.message);
    return null;
  }
};

/**
 * Get or create a folder in Google Drive
 * @param {Object} driveClient - Google Drive client
 * @param {string} folderName - Name of the folder
 * @returns {string} - Folder ID
 */
const getOrCreateFolder = async (driveClient, folderName, parentFolderId = null) => {
  try {
    // Search for existing folder
    let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
    if (parentFolderId) {
      query += ` and '${parentFolderId}' in parents`;
    }

    const response = await driveClient.files.list({
      q: query,
      fields: "files(id, name)",
      spaces: "drive",
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Create new folder if it doesn't exist
    const folderMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    };
    if (parentFolderId) {
      folderMetadata.parents = [parentFolderId];
    }

    const folder = await driveClient.files.create({
      requestBody: folderMetadata,
      fields: "id",
    });

    // Make folder publicly accessible
    await driveClient.permissions.create({
      fileId: folder.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    return folder.data.id;
  } catch (error) {
    console.error("Error creating/finding folder:", error);
    throw new Error(`Failed to create/find folder: ${error.message}`);
  }
};

/**
 * Delete a file from Google Drive
 * @param {string} fileId - The file ID to delete
 */
export const deleteFileFromDrive = async (fileId) => {
  const driveClient = initializeDrive();
  if (!driveClient) return { success: false, message: "Google Drive not available" };
  
  try {
    await driveClient.files.delete({ fileId });
    return { success: true, message: "File deleted successfully" };
  } catch (error) {
    console.error("Error deleting file from Google Drive:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Get file metadata from Google Drive
 * @param {string} fileId - The file ID
 */
export const getFileMetadata = async (fileId) => {
  const driveClient = initializeDrive();
  if (!driveClient) return null;
  
  try {
    const response = await driveClient.files.get({
      fileId,
      fields: "id, name, mimeType, size, webViewLink, webContentLink, createdTime",
    });
    return response.data;
  } catch (error) {
    console.error("Error getting file metadata:", error);
    return null;
  }
};

export default {
  uploadFileToDrive,
  deleteFileFromDrive,
  getFileMetadata,
};
