import { getLocationTokens } from "../utils/locationTokens.js";

/* ===============================
   VALIDATE TOKEN
================================ */
export const validateLocationToken = (req, res) => {
  try {
    const { token } = req.query;

    if (!token)
      return res.status(400).json({ success: false, message: "Token required" });

    const tokens = getLocationTokens();
    const location = tokens[token];

    if (!location)
      return res.status(404).json({ success: false, message: "Invalid token" });

    res.json({
      success: true,
      ...location,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Token validation failed",
      error: error.message,
    });
  }
};
