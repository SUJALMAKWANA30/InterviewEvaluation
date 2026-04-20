import Exam from "../models/Exam.js";
import ExamAttempt from "../models/ExamAttempt.js";

const sanitizeExamForCandidate = (examDoc) => {
  const exam = JSON.parse(JSON.stringify(examDoc));
  exam.sections = (exam.sections || []).map((section) => ({
    ...section,
    questions: (section.questions || []).map((question) => {
      const { correctAnswer, ...safeQuestion } = question;
      return safeQuestion;
    }),
  }));
  return exam;
};

const normalizeAnswersPayload = (answers = {}) => {
  if (Array.isArray(answers)) {
    return answers
      .map((item) => ({
        questionId: String(item?.questionId || ""),
        selectedOption: Number(item?.selectedOption),
        updatedAt: new Date(),
      }))
      .filter((item) => item.questionId && Number.isFinite(item.selectedOption));
  }

  if (answers && typeof answers === "object") {
    return Object.entries(answers)
      .map(([questionId, selectedOption]) => ({
        questionId: String(questionId || ""),
        selectedOption: Number(selectedOption),
        updatedAt: new Date(),
      }))
      .filter((item) => item.questionId && Number.isFinite(item.selectedOption));
  }

  return [];
};

const mergeAnswers = (existingAnswers = [], incomingAnswers = []) => {
  const map = new Map();
  for (const ans of existingAnswers) {
    map.set(String(ans.questionId), {
      questionId: String(ans.questionId),
      selectedOption: Number(ans.selectedOption),
      updatedAt: ans.updatedAt || new Date(),
    });
  }
  for (const ans of incomingAnswers) {
    map.set(String(ans.questionId), {
      questionId: String(ans.questionId),
      selectedOption: Number(ans.selectedOption),
      updatedAt: new Date(),
    });
  }
  return Array.from(map.values());
};

// Create a new exam
export const createExam = async (req, res) => {
  try {
    const { title, duration, sections, driveId } = req.body;

    if (!title || !duration || !sections || !sections.length) {
      return res.status(400).json({
        success: false,
        message: "Title, duration, and at least one section are required.",
      });
    }

    const exam = new Exam({
      title,
      duration,
      sections,
      status: "Draft",
      driveId: driveId || null,
    });

    await exam.save();

    return res.status(201).json({
      success: true,
      message: "Exam created successfully.",
      data: exam,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create exam.",
      error: error.message,
    });
  }
};

// Get all exams
export const getAllExams = async (req, res) => {
  try {
    const { driveId } = req.query;
    const filter = {};

    if (driveId) {
      filter.driveId = driveId;
    }

    const exams = await Exam.find(filter).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: exams,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch exams.",
      error: error.message,
    });
  }
};

// Get a single exam by ID
export const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).lean();

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch exam.",
      error: error.message,
    });
  }
};

// Update an exam
export const updateExam = async (req, res) => {
  try {
    const { title, duration, sections, status, driveId } = req.body;

    const updateData = { title, duration, sections, status };
    if (driveId !== undefined) {
      updateData.driveId = driveId || null;
    }

    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Exam updated successfully.",
      data: exam,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update exam.",
      error: error.message,
    });
  }
};

// Delete an exam
export const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Exam deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete exam.",
      error: error.message,
    });
  }
};

// Toggle active status of an exam (only one can be active)
export const toggleActiveExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found.",
      });
    }

    if (exam.isActive) {
      // Deactivate it
      exam.isActive = false;
      await exam.save();
    } else {
      // Deactivate all others, activate this one
      await Exam.updateMany({ isActive: true }, { isActive: false });
      exam.isActive = true;
      exam.status = "Published";
      await exam.save();
    }

    return res.status(200).json({
      success: true,
      message: exam.isActive
        ? "Exam activated successfully."
        : "Exam deactivated successfully.",
      data: exam,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to toggle exam status.",
      error: error.message,
    });
  }
};

// Get the currently active exam (for user-side)
export const getActiveExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({ isActive: true }).lean();

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "No active exam found.",
      });
    }

    if (req.user?.type === "candidate") {
      let attempt = await ExamAttempt.findOne({
        candidateId: req.user.id,
        examId: exam._id,
        status: "active",
      }).sort({ createdAt: -1 });

      if (!attempt) {
        attempt = await ExamAttempt.create({
          candidateId: req.user.id,
          examId: exam._id,
          driveId: exam.driveId || null,
          status: "active",
          startedAt: new Date(),
          lastHeartbeatAt: new Date(),
          answers: [],
        });
      } else {
        attempt.lastHeartbeatAt = new Date();
        await attempt.save();
      }

      const safeExam = sanitizeExamForCandidate(exam);
      return res.status(200).json({
        success: true,
        data: {
          ...safeExam,
          attemptId: attempt._id,
          autosaveEnabled: true,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch active exam.",
      error: error.message,
    });
  }
};

// Autosave candidate exam progress
export const autosaveExamAttempt = async (req, res) => {
  try {
    if (!req.user || req.user.type !== "candidate") {
      return res.status(403).json({
        success: false,
        message: "Only candidate users can autosave attempts.",
      });
    }

    const { id } = req.params;
    const incomingAnswers = normalizeAnswersPayload(req.body?.answers);
    const violationIncrement = Number(req.body?.violationIncrement || 0);

    const attempt = await ExamAttempt.findOne({
      _id: id,
      candidateId: req.user.id,
      status: "active",
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Active exam attempt not found.",
      });
    }

    attempt.answers = mergeAnswers(attempt.answers || [], incomingAnswers);
    attempt.lastHeartbeatAt = new Date();
    if (Number.isFinite(violationIncrement) && violationIncrement > 0) {
      attempt.violationCount += violationIncrement;
    }

    await attempt.save();

    return res.status(200).json({
      success: true,
      message: "Attempt autosaved.",
      data: {
        attemptId: attempt._id,
        answersSaved: attempt.answers.length,
        violationCount: attempt.violationCount,
        lastHeartbeatAt: attempt.lastHeartbeatAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to autosave exam attempt.",
      error: error.message,
    });
  }
};

// Get active attempt for logged-in candidate
export const getMyActiveAttempt = async (req, res) => {
  try {
    if (!req.user || req.user.type !== "candidate") {
      return res.status(403).json({
        success: false,
        message: "Only candidate users can access attempts.",
      });
    }

    const query = {
      candidateId: req.user.id,
      status: "active",
    };

    if (req.query?.examId) {
      query.examId = req.query.examId;
    }

    const attempt = await ExamAttempt.findOne(query).sort({ createdAt: -1 }).lean();
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "No active attempt found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch active attempt.",
      error: error.message,
    });
  }
};
