import CandidateDetails from "../models/CandidateDetails.js";
import { uploadFileToDrive } from "../services/googleDriveService.js";
import jwt from "jsonwebtoken";
import UserTimeDetails from "../models/UserTimeDetails.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

/* ===============================
   REGISTER CANDIDATE
================================ */
export const registerCandidate = async (req, res) => {
  try {
    const {
      // Personal Information
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      preferredLocation,
      willingToRelocate,

      // Professional Details
      positionApplied,
      totalExperience,
      highestEducation,
      skills,
      noticePeriod,
      currentDesignation,
      currentCTC,
      experienceLevels,

      // Authentication
      password,

      // Terms
      termsAccepted,

      // Document URLs (from URL-based upload)
      documentUrls,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (firstName, lastName, email, phone, password)",
      });
    }

    // Check if candidate already exists
    const existingCandidate = await CandidateDetails.findOne({ email: email.toLowerCase() });
    if (existingCandidate) {
      return res.status(400).json({
        success: false,
        message: "A candidate with this email already exists",
      });
    }

    // Handle file uploads to Google Drive (optional - registration continues even if uploads fail)
    let documentLinks = {
      resume: "",
      idProof: "",
      photo: "",
      payslips: "",
      lastBreakup: "",
    };

    // First, apply any URL-based document links from the frontend
    if (documentUrls) {
      try {
        const parsedUrls = typeof documentUrls === "string" ? JSON.parse(documentUrls) : documentUrls;
        for (const [key, url] of Object.entries(parsedUrls)) {
          if (url && documentLinks.hasOwnProperty(key)) {
            documentLinks[key] = url;
          }
        }
      } catch (e) {
        console.warn("Failed to parse documentUrls:", e.message);
      }
    }

    // Try to upload files to Google Drive, but don't block registration if it fails
    try {
      if (req.files) {
        console.log("📁 Files received for upload:", Object.keys(req.files).join(", "));

        const uploadFile = async (file, folder, linkKey) => {
          try {
            console.log(`⬆️  Uploading ${linkKey}: ${file.originalname} (${(file.size / 1024).toFixed(1)}KB)`);
            const result = await uploadFileToDrive(file, folder);
            if (result && result.directLink) {
              documentLinks[linkKey] = result.directLink;
              console.log(`✅ ${linkKey} uploaded: ${result.directLink}`);
            } else {
              console.warn(`⚠️  ${linkKey} upload returned no link`);
            }
          } catch (err) {
            console.error(`❌ ${linkKey} upload failed:`, err.message);
          }
        };

        const uploadPromises = [];

        if (req.files.resume && req.files.resume[0]) {
          uploadPromises.push(uploadFile(req.files.resume[0], "resumes", "resume"));
        }
        if (req.files.idProof && req.files.idProof[0]) {
          uploadPromises.push(uploadFile(req.files.idProof[0], "id-proofs", "idProof"));
        }
        if (req.files.photo && req.files.photo[0]) {
          uploadPromises.push(uploadFile(req.files.photo[0], "photos", "photo"));
        }
        if (req.files.payslips && req.files.payslips[0]) {
          uploadPromises.push(uploadFile(req.files.payslips[0], "payslips", "payslips"));
        }
        if (req.files.lastBreakup && req.files.lastBreakup[0]) {
          uploadPromises.push(uploadFile(req.files.lastBreakup[0], "last-breakup", "lastBreakup"));
        }

        await Promise.allSettled(uploadPromises);
        console.log("📋 Final document links:", JSON.stringify(documentLinks, null, 2));
      }
    } catch (uploadError) {
      console.warn("File upload process failed, continuing without documents:", uploadError.message);
    }

    // Parse skills if it's a string
    let parsedSkills = skills;
    if (typeof skills === "string") {
      try {
        parsedSkills = JSON.parse(skills);
      } catch {
        parsedSkills = skills.split(",").map((s) => s.trim());
      }
    }

    // Parse experienceLevels if it's a string
    let parsedExperienceLevels = experienceLevels;
    if (typeof experienceLevels === "string") {
      try {
        parsedExperienceLevels = JSON.parse(experienceLevels);
      } catch {
        parsedExperienceLevels = {};
      }
    }

    // Create new candidate
    const candidate = new CandidateDetails({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      preferredLocation,
      willingToRelocate,
      positionApplied,
      totalExperience,
      highestEducation,
      skills: parsedSkills || [],
      noticePeriod,
      currentDesignation,
      currentCTC,
      experienceLevels: parsedExperienceLevels || {},
      documents: documentLinks,
      password,
      termsAccepted: termsAccepted === true || termsAccepted === "true",
    });

    await candidate.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: candidate._id, email: candidate.email, type: "candidate" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      candidate: {
        id: candidate._id,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone,
        uniqueId: candidate.uniqueId,
        documents: candidate.documents,
      },
    });
    try {
      const existing = await UserTimeDetails.findOne({ email: candidate.email.toLowerCase() });
      if (!existing) {
        await UserTimeDetails.create({
          email: candidate.email.toLowerCase(),
          phone: candidate.phone,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          photo: (candidate?.documents?.photo || "").toString(),
          passwordHash: candidate.password,
        });
      }
    } catch (e) {
      console.warn("Failed to initialize UserTimeDetails:", e.message);
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
      error: error.message,
    });
  }
};

/* ===============================
   LOGIN CANDIDATE
================================ */
export const loginCandidate = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find candidate by email
    const candidate = await CandidateDetails.findOne({ email: email.toLowerCase() });

    if (!candidate) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if account is active
    if (!candidate.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    // Compare password
    const isPasswordValid = await candidate.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Mark attendance as true on successful login
    if (!candidate.attendance) {
      candidate.attendance = true;
      await candidate.save();
    }
    // Do not reset timing data on login; preserve start/end/completion to enforce single attempt

    // Generate JWT token
    const token = jwt.sign(
      { id: candidate._id, email: candidate.email, type: "candidate" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      candidate: {
        id: candidate._id,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone,
        uniqueId: candidate.uniqueId,
        examStatus: candidate.examStatus,
        attendance: candidate.attendance,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
      error: error.message,
    });
  }
};

/* ===============================
   GET ALL CANDIDATES (for HR Dashboard)
================================ */
export const getAllCandidateDetails = async (req, res) => {
  try {
    const candidates = await CandidateDetails.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: candidates.length,
      data: candidates,
    });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch candidates",
      error: error.message,
    });
  }
};

/* ===============================
   GET CANDIDATE BY ID
================================ */
export const getCandidateDetailsById = async (req, res) => {
  try {
    const candidate = await CandidateDetails.findById(req.params.id).select("-password");

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found",
      });
    }

    res.status(200).json({
      success: true,
      data: candidate,
    });
  } catch (error) {
    console.error("Error fetching candidate:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching candidate",
      error: error.message,
    });
  }
};

/* ===============================
   GET CURRENT USER (via JWT)
================================ */
export const getMe = async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const candidate = await CandidateDetails.findById(decoded.id).select("-password");
    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate not found" });
    }
    res.status(200).json({
      success: true,
      data: {
        id: candidate._id,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone,
        uniqueId: candidate.uniqueId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch current user", error: error.message });
  }
};

/* ===============================
   UPDATE CANDIDATE
================================ */
export const updateCandidateDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Don't allow password update through this endpoint
    delete updateData.password;

    const candidate = await CandidateDetails.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Candidate updated successfully",
      data: candidate,
    });
  } catch (error) {
    console.error("Error updating candidate:", error);
    res.status(500).json({
      success: false,
      message: "Error updating candidate",
      error: error.message,
    });
  }
};
