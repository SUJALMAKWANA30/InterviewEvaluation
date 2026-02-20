import jwt from "jsonwebtoken";
import UserTimeDetails from "../models/UserTimeDetails.js";
import CandidateDetails from "../models/CandidateDetails.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export const registerUserTimeDetails = async (req, res) => {
  try {
    const { email, phone, firstName, lastName } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    const existing = await UserTimeDetails.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(200).json({ success: true, message: "UserTimeDetails already exists", data: existing });
    }
    const record = await UserTimeDetails.create({
      email: email.toLowerCase(),
      phone,
      firstName,
      lastName,
    });
    res.status(201).json({ success: true, message: "UserTimeDetails created", data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create UserTimeDetails", error: error.message });
  }
};

export const getByEmail = async (req, res) => {
  try {
    const email = req.params.email?.toLowerCase();
    const record = await UserTimeDetails.findOne({ email });
    if (!record) {
      return res.status(404).json({ success: false, message: "UserTimeDetails not found" });
    }
    res.status(200).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch", error: error.message });
  }
};

export const startExam = async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });
    const decoded = jwt.verify(token, JWT_SECRET);
    const candidate = await CandidateDetails.findById(decoded.id);
    if (!candidate) return res.status(404).json({ success: false, message: "Candidate not found" });
    const now = new Date();
    const photo = (candidate?.documents?.photo || "").toString();
    const record = await UserTimeDetails.findOneAndUpdate(
      { email: candidate.email.toLowerCase() },
      {
        email: candidate.email.toLowerCase(),
        phone: candidate.phone,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        passwordHash: candidate.password,
        photo,
        startTime: now
      },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to set startTime", error: error.message });
  }
};

export const endExam = async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });
    const decoded = jwt.verify(token, JWT_SECRET);
    const candidate = await CandidateDetails.findById(decoded.id);
    if (!candidate) return res.status(404).json({ success: false, message: "Candidate not found" });
    const now = new Date();
    const email = candidate.email.toLowerCase();
    const photo = (candidate?.documents?.photo || "").toString();
    const record = await UserTimeDetails.findOneAndUpdate(
      { email },
      {
        $set: { endTime: now, passwordHash: candidate.password, photo },
        $setOnInsert: {
          email,
          phone: candidate.phone,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to set endTime", error: error.message });
  }
};

export const completeExam = async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });
    const decoded = jwt.verify(token, JWT_SECRET);
    const candidate = await CandidateDetails.findById(decoded.id);
    if (!candidate) return res.status(404).json({ success: false, message: "Candidate not found" });
    const now = new Date();
    const email = candidate.email.toLowerCase();
    // ensure endTime exists
    const existing = await UserTimeDetails.findOne({ email });
    let endTime = existing?.endTime || now;
    if (!existing?.endTime) {
      await UserTimeDetails.updateOne(
        { email },
        {
          $set: { endTime },
          $setOnInsert: {
            email,
            phone: candidate.phone,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            passwordHash: candidate.password,
          },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }
    const refreshed = existing || (await UserTimeDetails.findOne({ email }));
    const startTime = refreshed?.startTime;
    const completionSeconds =
      startTime && endTime ? Math.max(0, Math.floor((endTime.getTime() - new Date(startTime).getTime()) / 1000)) : null;
    const photo = (candidate?.documents?.photo || "").toString();
    const record = await UserTimeDetails.findOneAndUpdate(
      { email },
      {
        $set: { completionTime: completionSeconds, passwordHash: candidate.password, photo },
        $setOnInsert: {
          email,
          phone: candidate.phone,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          endTime,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to set completionTime", error: error.message });
  }
};
