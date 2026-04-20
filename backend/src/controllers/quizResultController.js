import QuizResult from "../models/QuizResult.js";
import Exam from "../models/Exam.js";
import ExamAttempt from "../models/ExamAttempt.js";
import CandidateDetails from "../models/CandidateDetails.js";

const normalizeAnswerMap = (answers = {}) => {
  if (Array.isArray(answers)) {
    return answers.reduce((acc, item) => {
      const key = String(item?.questionId || "").trim();
      const value = Number(item?.selectedOption);
      if (key && Number.isFinite(value)) {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  if (answers && typeof answers === "object") {
    return Object.entries(answers).reduce((acc, [key, value]) => {
      const questionId = String(key || "").trim();
      const selectedOption = Number(value);
      if (questionId && Number.isFinite(selectedOption)) {
        acc[questionId] = selectedOption;
      }
      return acc;
    }, {});
  }

  return {};
};

const scoreExam = (exam, answerMap) => {
  let total = 0;
  const sectionWiseMarks = [];

  for (const section of exam.sections || []) {
    let correct = 0;
    const questions = section.questions || [];

    for (const question of questions) {
      const qId = String(question._id);
      const selected = answerMap[qId];
      if (Number.isFinite(selected) && selected === Number(question.correctAnswer)) {
        correct += 1;
      }
    }

    total += correct;
    sectionWiseMarks.push({
      sectionName: section.title || "Untitled",
      marks: correct,
      totalQuestions: questions.length,
      correctAnswers: correct,
    });
  }

  return { total, sectionWiseMarks };
};

const getRoundAction = (update = {}) => {
  const roundKeys = ["R2", "R3", "R4"];
  const statuses = [];

  roundKeys.forEach((key) => {
    if (Array.isArray(update[key]) && update[key][0]?.status) {
      statuses.push(String(update[key][0].status).toLowerCase().trim());
    }
  });

  if (statuses.some((s) => s === "drop" || s === "dropped" || s === "rejected")) {
    return "round.drop";
  }
  if (statuses.some((s) => s === "completed")) {
    return "round.complete";
  }
  return "round.update";
};

const normalizeRoundReviews = (reviews = [], roundKey = "") => {
  if (!Array.isArray(reviews)) return [];

  return reviews.slice(0, 1).map((review) => ({
    rating: review?.rating != null ? String(review.rating) : "",
    comments: review?.comments != null ? String(review.comments) : "",
    interviewer: review?.interviewer != null ? String(review.interviewer) : "",
    status: review?.status != null ? String(review.status).toLowerCase().trim() : "",
    managerialStatus:
      roundKey === "R3"
        ? String(
            review?.managerialStatus ??
              review?.["Managerial status"] ??
              review?.["managerial status"] ??
              ""
          )
            .toUpperCase()
            .trim()
        : "",
  }));
};

const buildQuizResultUpdate = (payload = {}) => {
  const update = {};

  if (payload.mobileNumber !== undefined) update.mobileNumber = payload.mobileNumber;
  if (payload.name !== undefined) update.name = payload.name;
  if (payload.sectionWiseMarks !== undefined) update.sectionWiseMarks = payload.sectionWiseMarks;
  if (payload.driveId !== undefined) update.driveId = payload.driveId || null;
  if (payload.totalMarks !== undefined) {
    update.totalMarks = Number(payload.totalMarks) || 0;
  } else if (payload["Final Score"] !== undefined) {
    update.totalMarks = Number(payload["Final Score"]) || 0;
  }
  if (payload.R2 !== undefined) update.R2 = normalizeRoundReviews(payload.R2, "R2");
  if (payload.R3 !== undefined) update.R3 = normalizeRoundReviews(payload.R3, "R3");
  if (payload.R4 !== undefined) update.R4 = normalizeRoundReviews(payload.R4, "R4");
  if (payload.reasonTags !== undefined) {
    update.reasonTags = Array.isArray(payload.reasonTags)
      ? payload.reasonTags.map((x) => String(x || "").trim()).filter(Boolean)
      : [];
  }

  return update;
};

export const createQuizResult = async (req, res) => {
  try {
    const payloadEmail = String(req.body?.email || "").trim().toLowerCase();
    const authEmail = String(req.user?.email || "").trim().toLowerCase();
    const email = authEmail || payloadEmail;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (authEmail && payloadEmail && authEmail !== payloadEmail) {
      return res.status(403).json({
        success: false,
        message: "You can submit quiz results only for your own account.",
      });
    }

    const update = buildQuizResultUpdate(req.body);
    update.examDate = new Date();

    const quizResult = await QuizResult.findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          ...update,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(201).json({
      success: true,
      message: "Quiz result saved successfully",
      data: quizResult,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating quiz result",
      error: error.message,
    });
  }
};

export const getAllQuizResults = async (req, res) => {
  try {
    const { driveId } = req.query;
    const filter = {};
    if (driveId) filter.driveId = driveId;

    const quizResults = await QuizResult.find(filter).sort({ createdAt: -1 }).lean();
    res.status(200).json({
      success: true,
      data: quizResults,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch quiz results",
      error: error.message,
    });
  }
};

export const getQuizResultById = async (req, res) => {
  try {
    const quizResult = await QuizResult.findById(req.params.id).lean();
    if (!quizResult) {
      return res.status(404).json({
        success: false,
        message: "Quiz result not found",
      });
    }
    res.status(200).json({
      success: true,
      data: quizResult,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching quiz result",
      error: error.message,
    });
  }
};

export const getQuizResultByEmail = async (req, res) => {
  try {
    const email = String(req.params.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (req.user?.type === "candidate" && String(req.user.email || "").trim().toLowerCase() !== email) {
      return res.status(403).json({
        success: false,
        message: "You can access only your own quiz result.",
      });
    }

    const quizResult = await QuizResult.findOne({ email }).sort({ createdAt: -1 }).lean();
    if (!quizResult) {
      return res.status(404).json({
        success: false,
        message: "Quiz result not found for this email",
      });
    }
    res.status(200).json({
      success: true,
      data: quizResult,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching quiz result",
      error: error.message,
    });
  }
};

export const updateQuizResultByEmail = async (req, res) => {
  try {
    const email = String(req.params.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const existing = await QuizResult.findOne({ email });
    const update = buildQuizResultUpdate(req.body);
    const quizResult = await QuizResult.findOneAndUpdate(
      { email },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!quizResult) {
      return res.status(404).json({
        success: false,
        message: "Quiz result not found for this email",
      });
    }

    if (req.user?.type === "hr" && typeof req.audit === "function") {
      const touchedRounds = ["R2", "R3", "R4"].filter((roundKey) => update[roundKey] !== undefined);
      const hasRoundChanges = touchedRounds.length > 0;
      const action = hasRoundChanges ? getRoundAction(update) : "candidate.update";

      await req.audit(action, {
        targetType: "QuizResult",
        targetId: quizResult._id,
        description: hasRoundChanges
          ? `Updated ${touchedRounds.join(", ")} for ${email}`
          : `Updated score data for ${email}`,
        changes: {
          before: {
            totalMarks: existing?.totalMarks ?? null,
            sectionWiseMarks: existing?.sectionWiseMarks ?? [],
            R2: existing?.R2 ?? [],
            R3: existing?.R3 ?? [],
            R4: existing?.R4 ?? [],
          },
          after: {
            totalMarks: quizResult.totalMarks ?? null,
            sectionWiseMarks: quizResult.sectionWiseMarks ?? [],
            R2: quizResult.R2 ?? [],
            R3: quizResult.R3 ?? [],
            R4: quizResult.R4 ?? [],
          },
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Quiz result updated successfully",
      data: quizResult,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating quiz result",
      error: error.message,
    });
  }
};

export const submitQuizAttempt = async (req, res) => {
  try {
    if (!req.user || req.user.type !== "candidate") {
      return res.status(403).json({
        success: false,
        message: "Only candidate users can submit quiz attempts.",
      });
    }

    const attemptId = String(req.body?.attemptId || "").trim();
    if (!attemptId) {
      return res.status(400).json({
        success: false,
        message: "attemptId is required.",
      });
    }

    const attempt = await ExamAttempt.findOne({
      _id: attemptId,
      candidateId: req.user.id,
      status: "active",
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Active exam attempt not found.",
      });
    }

    const exam = await Exam.findById(attempt.examId).lean();
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found for this attempt.",
      });
    }

    const candidate = await CandidateDetails.findById(req.user.id).lean();
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found.",
      });
    }

    const payloadAnswers = normalizeAnswerMap(req.body?.answers);
    const persistedAnswers = normalizeAnswerMap(attempt.answers || []);
    const mergedAnswers = { ...persistedAnswers, ...payloadAnswers };

    const { total, sectionWiseMarks } = scoreExam(exam, mergedAnswers);

    const quizResult = await QuizResult.findOneAndUpdate(
      { email: String(candidate.email || "").toLowerCase() },
      {
        $set: {
          email: String(candidate.email || "").toLowerCase(),
          mobileNumber: candidate.phone || "",
          name: `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim(),
          sectionWiseMarks,
          totalMarks: total,
          driveId: candidate.driveId || attempt.driveId || null,
          examDate: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    attempt.answers = Object.entries(mergedAnswers).map(([questionId, selectedOption]) => ({
      questionId,
      selectedOption,
      updatedAt: new Date(),
    }));
    attempt.totalScore = total;
    attempt.sectionWiseMarks = sectionWiseMarks;
    attempt.status = "submitted";
    attempt.submittedAt = new Date();
    attempt.lastHeartbeatAt = new Date();
    await attempt.save();

    return res.status(200).json({
      success: true,
      message: "Quiz submitted and scored successfully.",
      data: {
        quizResult,
        attemptId: attempt._id,
        totalMarks: total,
        sectionWiseMarks,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to submit quiz attempt.",
      error: error.message,
    });
  }
};
