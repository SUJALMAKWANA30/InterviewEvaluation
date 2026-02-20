import express from "express";
import multer from "multer";
import {
  registerCandidate,
  loginCandidate,
  getAllCandidateDetails,
  getCandidateDetailsById,
  updateCandidateDetails,
  getMe,
} from "../controllers/candidateDetailsController.js";

const router = express.Router();

// Configure multer for memory storage (for Google Drive upload)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/jpg",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF, DOC, DOCX, JPEG, PNG allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Multi-file upload fields
const uploadFields = upload.fields([
  { name: "resume", maxCount: 1 },
  { name: "idProof", maxCount: 1 },
  { name: "photo", maxCount: 1 },
  { name: "payslips", maxCount: 1 },
  { name: "lastBreakup", maxCount: 1 },
]);

// Auth routes
router.post("/register", uploadFields, registerCandidate);
router.post("/login", loginCandidate);
router.get("/me", getMe);

// CRUD routes
// router.get("/", getAllCandidateDetails);
router.get("/:id", getCandidateDetailsById);
router.put("/:id", updateCandidateDetails);

export default router;
