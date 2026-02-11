import Candidate from "../models/Candidate.js";

/* ===============================
   GET ALL CANDIDATES
================================ */
export const getAllCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: candidates,
    });
  } catch (error) {
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
export const getCandidateById = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);

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
    res.status(500).json({
      success: false,
      message: "Error fetching candidate",
      error: error.message,
    });
  }
};

/* ===============================
   CREATE CANDIDATE (Exam Result)
================================ */
export const createCandidate = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      uniqueId,
      score,
      timeTaken,
      examStatus,
      location,
    } = req.body;

    const newCandidate = new Candidate({
      firstName,
      lastName,
      email,
      uniqueId,
      score,
      timeTaken,
      examStatus,
      location,
      examDate: examStatus === "completed" ? new Date() : null,
    });

    await newCandidate.save();

    res.status(201).json({
      success: true,
      message: "Candidate created successfully",
      data: newCandidate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating candidate",
      error: error.message,
    });
  }
};

/* ===============================
   UPDATE CANDIDATE
================================ */
export const updateCandidate = async (req, res) => {
  try {
    const { score, examStatus, timeTaken } = req.body;

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      {
        score,
        examStatus,
        timeTaken,
        examDate: examStatus === "completed" ? new Date() : null,
      },
      { new: true }
    );

    if (!updatedCandidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Candidate updated successfully",
      data: updatedCandidate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating candidate",
      error: error.message,
    });
  }
};
