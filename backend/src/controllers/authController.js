import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import Session from "../models/Session.js";
import { createAuditLog } from "../middlewares/audit.js";

const DEFAULT_DEV_JWT_SECRET = "dev-only-change-me";
const isProduction = process.env.NODE_ENV === "production";
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? null : DEFAULT_DEV_JWT_SECRET);

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured in production environment.");
}
const JWT_EXPIRES_IN = "8h";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const MFA_STEP_SECONDS = 30;
const MFA_DIGITS = 6;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const hashValue = (value) =>
  crypto.createHash("sha256").update(String(value || "")).digest("hex");

const toBase32 = (buffer) => {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
};

const fromBase32 = (input = "") => {
  const clean = String(input).toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out = [];

  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(out);
};

const counterToBuffer = (counter) => {
  const buffer = Buffer.alloc(8);
  let c = Number(counter);
  for (let i = 7; i >= 0; i--) {
    buffer[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  return buffer;
};

const generateTotpCode = (secret, timestamp = Date.now()) => {
  const key = fromBase32(secret);
  const counter = Math.floor(timestamp / 1000 / MFA_STEP_SECONDS);
  const digest = crypto
    .createHmac("sha1", key)
    .update(counterToBuffer(counter))
    .digest();
  const offset = digest[digest.length - 1] & 0xf;
  const codeInt =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(codeInt % 10 ** MFA_DIGITS).padStart(MFA_DIGITS, "0");
};

const verifyTotpCode = (secret, code, skew = 1) => {
  const normalized = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized) || !secret) return false;

  const now = Date.now();
  for (let w = -skew; w <= skew; w++) {
    if (generateTotpCode(secret, now + w * MFA_STEP_SECONDS * 1000) === normalized) {
      return true;
    }
  }
  return false;
};

const generateBackupCodes = () =>
  Array.from({ length: 8 }, () => crypto.randomBytes(4).toString("hex").toUpperCase());

const decodeRefreshExpiry = (token) => {
  const decoded = jwt.decode(token);
  if (!decoded?.exp) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  return new Date(decoded.exp * 1000);
};

const issueTokensForUser = async (user, req, familyId = crypto.randomUUID()) => {
  const tokenPayload = {
    id: user._id,
    email: user.email,
    type: "hr",
    role: user.role?.slug,
    level: user.role?.level,
    mfaEnabled: !!user.mfaEnabled,
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(
    { id: user._id, type: "refresh", fid: familyId },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  const session = await Session.create({
    userId: user._id,
    refreshTokenHash: hashValue(refreshToken),
    familyId,
    userAgent: req.headers["user-agent"] || "",
    ipAddress: req.ip || "",
    deviceLabel: req.body?.deviceLabel || "",
    expiresAt: decodeRefreshExpiry(refreshToken),
    lastUsedAt: new Date(),
  });

  user.refreshToken = refreshToken;
  await user.save();

  return { token, refreshToken, session };
};

const consumeBackupCode = (user, backupCode) => {
  const normalized = String(backupCode || "").trim().toUpperCase();
  if (!normalized) return false;

  const hash = hashValue(normalized);
  const existing = Array.isArray(user.mfaBackupCodes) ? user.mfaBackupCodes : [];
  const idx = existing.indexOf(hash);
  if (idx === -1) return false;

  user.mfaBackupCodes = existing.filter((_, i) => i !== idx);
  return true;
};

/**
 * HR / Admin Login
 */
export const loginHR = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select("+mfaSecret +mfaBackupCodes")
      .populate("role");

    if (!user) {
      await createAuditLog({
        action: "auth.failed_login",
        description: `Failed login attempt for email: ${email}`,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated. Contact your administrator.",
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await createAuditLog({
        userId: user._id,
        userName: user.name,
        action: "auth.failed_login",
        description: `Failed login attempt (wrong password)`,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.mfaEnabled) {
      const mfaCode = req.body?.mfaCode;
      const backupCode = req.body?.backupCode;
      const codeOk = verifyTotpCode(user.mfaSecret, mfaCode);
      const backupOk = !codeOk && consumeBackupCode(user, backupCode);

      if (!codeOk && !backupOk) {
        return res.status(401).json({
          success: false,
          mfaRequired: true,
          message: "MFA verification failed. Provide a valid MFA code or backup code.",
        });
      }
    }

    user.lastLogin = new Date();
    const { token, refreshToken } = await issueTokensForUser(user, req);

    await createAuditLog({
      userId: user._id,
      userName: user.name,
      action: "auth.login",
      description: `${user.name} logged in`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role?.name || "Unknown",
        roleSlug: user.role?.slug || "unknown",
        level: user.role?.level ?? 99,
        permissions: user.role?.permissions || [],
        drives: user.drives || [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Login failed.",
      error: error.message,
    });
  }
};

/**
 * Refresh token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded?.type !== "refresh") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    const tokenHash = hashValue(token);
    const existingSession = await Session.findOne({ refreshTokenHash: tokenHash });

    if (!existingSession || existingSession.isRevoked || existingSession.expiresAt <= new Date()) {
      if (existingSession?.familyId && existingSession?.userId) {
        await Session.updateMany(
          { userId: existingSession.userId, familyId: existingSession.familyId, isRevoked: false },
          { $set: { isRevoked: true, revokedAt: new Date() } }
        );
      }
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    const user = await User.findById(decoded.id).populate("role");
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    existingSession.isRevoked = true;
    existingSession.revokedAt = new Date();
    await existingSession.save();

    const familyId = existingSession.familyId || decoded.fid || crypto.randomUUID();
    const { token: newToken, refreshToken: newRefreshToken } = await issueTokensForUser(
      user,
      req,
      familyId
    );

    res.status(200).json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid refresh token.",
    });
  }
};

/**
 * Get current HR user profile
 */
export const getHRProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("role")
      .populate("drives", "name location isActive");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role?.name || "Unknown",
        roleSlug: user.role?.slug || "unknown",
        level: user.role?.level ?? 99,
        permissions: user.role?.permissions || [],
        drives: user.drives || [],
        lastLogin: user.lastLogin,
        isActive: user.isActive,
        mfaEnabled: !!user.mfaEnabled,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile.",
      error: error.message,
    });
  }
};

/**
 * Logout — clear refresh token
 */
export const logoutHR = async (req, res) => {
  try {
    const providedToken = req.body?.refreshToken;
    if (providedToken) {
      await Session.updateOne(
        { userId: req.user.id, refreshTokenHash: hashValue(providedToken) },
        { $set: { isRevoked: true, revokedAt: new Date() } }
      );
    } else {
      await Session.updateMany(
        { userId: req.user.id, isRevoked: false },
        { $set: { isRevoked: true, revokedAt: new Date() } }
      );
    }

    await User.findByIdAndUpdate(req.user.id, { refreshToken: null });

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      action: "auth.logout",
      description: `${req.user.name} logged out`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Logout failed.",
      error: error.message,
    });
  }
};


