import mongoose from "mongoose";
import CandidateDetails from "../models/CandidateDetails.js";
import QuizResult from "../models/QuizResult.js";
import User from "../models/User.js";
import Decision from "../models/Decision.js";
import SavedView from "../models/SavedView.js";
import ScorecardTemplate from "../models/ScorecardTemplate.js";
import AsyncJob from "../models/AsyncJob.js";
import { enqueueJob } from "../services/asyncJobService.js";

const analyticsCache = new Map();

const getRoundOrder = (round = "") => {
  const map = { R1: 1, R2: 2, R3: 3, R4: 4 };
  return map[String(round || "").toUpperCase()] || 999;
};

const safeRegex = (input = "") =>
  String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toPage = (value, fallback = 1) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const toLimit = (value, fallback = 20, max = 100) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
};

const cacheWrap = async (key, ttlMs, producer) => {
  const hit = analyticsCache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.data;
  }

  const data = await producer();
  analyticsCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
  return data;
};

const getCandidateByRef = async ({ candidateId, email }) => {
  if (candidateId && mongoose.Types.ObjectId.isValid(candidateId)) {
    return CandidateDetails.findById(candidateId).lean();
  }

  if (email) {
    return CandidateDetails.findOne({ email: String(email).toLowerCase() }).lean();
  }

  return null;
};

export const getCommandPaletteItems = async (req, res) => {
  try {
    const perms = req.user?.permissions || [];
    const can = (module, action = "view") =>
      req.user?.level === 0 || perms.some((p) => p.module === module && p.actions?.includes(action));

    const items = [
      { id: "go-candidates", label: "Open Candidate Dashboard", path: "/hr/candidate-dashboard", enabled: can("candidates") },
      { id: "go-candidate-360", label: "Open Candidate 360", path: "/hr/candidate-360", enabled: can("search") },
      { id: "go-reports", label: "Open Reports", path: "/hr/reports", enabled: can("reports") },
      { id: "go-analytics", label: "Open Analytics Cockpit", path: "/hr/analytics", enabled: can("reports") },
      { id: "go-drives", label: "Open Drive Manager", path: "/hr/drives", enabled: can("drives") },
      { id: "go-scorecards", label: "Open Scorecards", path: "/hr/scorecards", enabled: can("scorecards") },
      { id: "go-decisions", label: "Open Decisions", path: "/hr/decisions", enabled: can("decisions") },
      { id: "go-audit", label: "Open Audit Logs", path: "/hr/audit-logs", enabled: can("audit_logs") },
      { id: "go-security", label: "Open Security Settings", path: "/hr/security", enabled: true },
      { id: "go-settings", label: "Open Admin Settings", path: "/admin-settings", enabled: can("settings") },
    ].filter((i) => i.enabled);

    return res.status(200).json({ success: true, data: items });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to load command palette.", error: error.message });
  }
};

export const listSavedViews = async (req, res) => {
  try {
    const module = String(req.query?.module || "").trim();
    const query = { userId: req.user.id };
    if (module) query.module = module;

    const views = await SavedView.find(query).sort({ isDefault: -1, updatedAt: -1 }).lean();
    return res.status(200).json({ success: true, data: views });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch saved views.", error: error.message });
  }
};

export const createSavedView = async (req, res) => {
  try {
    const { module, name, filters = {}, sorting = {}, columns = [], isDefault = false } = req.body;
    if (!module || !name) {
      return res.status(400).json({ success: false, message: "module and name are required." });
    }

    if (isDefault) {
      await SavedView.updateMany({ userId: req.user.id, module }, { $set: { isDefault: false } });
    }

    const view = await SavedView.create({
      userId: req.user.id,
      module,
      name,
      filters,
      sorting,
      columns,
      isDefault: !!isDefault,
    });

    return res.status(201).json({ success: true, data: view });
  } catch (error) {
    const duplicate = error?.code === 11000;
    return res.status(duplicate ? 409 : 500).json({
      success: false,
      message: duplicate ? "A saved view with this name already exists for this module." : "Failed to create saved view.",
      error: error.message,
    });
  }
};

export const updateSavedView = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };

    const existing = await SavedView.findOne({ _id: id, userId: req.user.id });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Saved view not found." });
    }

    if (payload.isDefault) {
      await SavedView.updateMany(
        { userId: req.user.id, module: existing.module, _id: { $ne: existing._id } },
        { $set: { isDefault: false } }
      );
    }

    const updated = await SavedView.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update saved view.", error: error.message });
  }
};

export const deleteSavedView = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SavedView.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Saved view not found." });
    }
    return res.status(200).json({ success: true, message: "Saved view deleted." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete saved view.", error: error.message });
  }
};

export const searchCandidates = async (req, res) => {
  try {
    const q = String(req.query?.q || "").trim();
    const driveId = String(req.query?.driveId || "").trim();
    const status = String(req.query?.status || "").trim();
    const page = toPage(req.query?.page, 1);
    const limit = toLimit(req.query?.limit, 20, 100);

    const filter = {};
    if (driveId && mongoose.Types.ObjectId.isValid(driveId)) {
      filter.driveId = driveId;
    }
    if (status) {
      filter.examStatus = status;
    }

    if (q) {
      const regex = new RegExp(safeRegex(q), "i");
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
        { skills: regex },
      ];
    }

    const [total, data] = await Promise.all([
      CandidateDetails.countDocuments(filter),
      CandidateDetails.find(filter)
        .select("firstName lastName email phone examStatus attendance driveId skills createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Candidate search failed.", error: error.message });
  }
};

export const getCandidateJourney = async (req, res) => {
  try {
    const candidate = await getCandidateByRef({
      candidateId: req.params?.candidateId || req.query?.candidateId,
      email: req.query?.email,
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate not found." });
    }

    const [quiz, decisions] = await Promise.all([
      QuizResult.findOne({ email: String(candidate.email).toLowerCase() }).lean(),
      Decision.find({ candidateId: candidate._id }).sort({ createdAt: 1 }).lean(),
    ]);

    const events = [
      {
        type: "registration.completed",
        title: "Candidate registered",
        timestamp: candidate.createdAt,
        meta: { email: candidate.email },
      },
    ];

    if (quiz?.examDate) {
      events.push({
        type: "exam.completed",
        title: "Exam completed",
        timestamp: quiz.examDate,
        meta: { score: quiz.totalMarks || 0 },
      });
    }

    ["R2", "R3", "R4"].forEach((roundKey) => {
      const round = Array.isArray(quiz?.[roundKey]) ? quiz[roundKey][0] : null;
      if (round?.status) {
        events.push({
          type: `round.${roundKey.toLowerCase()}.status`,
          title: `${roundKey} marked ${round.status}`,
          timestamp: quiz.updatedAt || quiz.createdAt,
          meta: round,
        });
      }
    });

    for (const decision of decisions) {
      events.push({
        type: "decision.updated",
        title: `Decision ${decision.status}`,
        timestamp: decision.updatedAt,
        meta: {
          stage: decision.stage,
          reasonCode: decision.reasonCode,
          reasonNote: decision.reasonNote,
        },
      });
    }

    events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return res.status(200).json({ success: true, data: { candidate, events } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to build candidate journey.", error: error.message });
  }
};

export const getCandidate360 = async (req, res) => {
  try {
    const candidate = await getCandidateByRef({
      candidateId: req.params?.candidateId || req.query?.candidateId,
      email: req.query?.email,
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate not found." });
    }

    const [quizResult, decisions] = await Promise.all([
      QuizResult.findOne({ email: String(candidate.email).toLowerCase() }).lean(),
      Decision.find({ candidateId: candidate._id }).sort({ createdAt: -1 }).lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        candidate,
        quizResult,
        decisions,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to load candidate 360 view.", error: error.message });
  }
};

export const createScorecardTemplate = async (req, res) => {
  try {
    const { name, roleName = "", driveId = null, round, criteria = [] } = req.body;
    if (!name || !round || !Array.isArray(criteria) || criteria.length === 0) {
      return res.status(400).json({ success: false, message: "name, round, and criteria are required." });
    }

    const normalized = criteria.map((c) => ({
      key: String(c.key || c.label || "").trim().toLowerCase().replace(/\s+/g, "_"),
      label: String(c.label || c.key || "").trim(),
      weight: Number(c.weight || 0),
      maxScore: Number(c.maxScore || 10),
    }));

    const template = await ScorecardTemplate.create({
      name,
      roleName,
      driveId,
      round,
      criteria: normalized,
      createdBy: req.user.id,
      isActive: true,
    });

    return res.status(201).json({ success: true, data: template });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create scorecard template.", error: error.message });
  }
};

export const listScorecardTemplates = async (req, res) => {
  try {
    const filter = {};
    if (req.query?.round) filter.round = req.query.round;
    if (req.query?.driveId && mongoose.Types.ObjectId.isValid(req.query.driveId)) {
      filter.driveId = req.query.driveId;
    }
    if (req.query?.activeOnly === "true") {
      filter.isActive = true;
    }

    // Personal templates by default: users only see their own reusable cards.
    // Super admins can opt out with mineOnly=false for global visibility.
    const mineOnly = String(req.query?.mineOnly ?? "true").toLowerCase() !== "false";
    if (mineOnly || req.user?.level !== 0) {
      filter.createdBy = req.user.id;
    }

    const templates = await ScorecardTemplate.find(filter)
      .sort({ isActive: -1, updatedAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: templates });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch scorecard templates.", error: error.message });
  }
};

export const evaluateCandidateScorecard = async (req, res) => {
  try {
    const { templateId, candidateEmail, scores = {}, notes = "", round = "R2", interviewer = "" } = req.body;
    if (!templateId || !candidateEmail) {
      return res.status(400).json({ success: false, message: "templateId and candidateEmail are required." });
    }

    const template = await ScorecardTemplate.findById(templateId).lean();
    if (!template || !template.isActive) {
      return res.status(404).json({ success: false, message: "Scorecard template not found or inactive." });
    }

    if (
      req.user?.level !== 0 &&
      String(template.createdBy || "") !== String(req.user?.id || "")
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only evaluate with templates created in your account.",
      });
    }

    let weighted = 0;
    let totalWeight = 0;

    const criteriaScores = template.criteria.map((criterion) => {
      const score = Number(scores?.[criterion.key] ?? scores?.[criterion.label] ?? 0);
      const safeScore = Math.min(Math.max(score, 0), Number(criterion.maxScore || 10));
      weighted += (safeScore / Number(criterion.maxScore || 10)) * Number(criterion.weight || 0);
      totalWeight += Number(criterion.weight || 0);

      return {
        key: criterion.key,
        label: criterion.label,
        score: safeScore,
        maxScore: criterion.maxScore,
        weight: criterion.weight,
      };
    });

    const normalizedScore = totalWeight > 0 ? Number(((weighted / totalWeight) * 100).toFixed(2)) : 0;

    const email = String(candidateEmail).toLowerCase();
    const result = await QuizResult.findOne({ email });

    if (!result) {
      return res.status(404).json({ success: false, message: "Quiz result not found for candidate." });
    }

    result.scorecards.push({
      round,
      templateId: template._id,
      templateName: template.name,
      interviewer: interviewer || req.user?.name || "",
      criteriaScores,
      normalizedScore,
      notes,
      evaluatedAt: new Date(),
    });

    const compactLines = criteriaScores.map(
      (c) => `${c.label}: ${c.score}/${c.maxScore}`
    );
    const summaryLine = `[${template.name}] ${compactLines.join(", ")} | normalized=${normalizedScore}%${
      notes ? ` | notes=${notes}` : ""
    }`;

    const updateRoundComment = (key) => {
      const existingRound = Array.isArray(result[key]) && result[key][0] ? { ...result[key][0] } : {};
      const priorComment = String(existingRound.comments || "").trim();
      const mergedComment = priorComment ? `${priorComment}\n${summaryLine}` : summaryLine;
      result[key] = [
        {
          rating: String(existingRound.rating || ""),
          comments: mergedComment,
          interviewer: interviewer || existingRound.interviewer || req.user?.name || "",
          status: existingRound.status || "",
          managerialStatus: existingRound.managerialStatus || "",
        },
      ];
    };

    const normalizedRound = String(round || "R2").toUpperCase();
    if (["R2", "R3", "R4"].includes(normalizedRound)) {
      updateRoundComment(normalizedRound);
    }

    await result.save();

    return res.status(200).json({
      success: true,
      data: {
        normalizedScore,
        criteriaScores,
        quizResultId: result._id,
        roundComment: summaryLine,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to evaluate scorecard.", error: error.message });
  }
};

export const upsertDecision = async (req, res) => {
  try {
    const {
      candidateId,
      driveId = null,
      stage = "interviewer",
      status = "pending",
      reasonCode = "",
      reasonNote = "",
    } = req.body;

    if (!candidateId || !mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ success: false, message: "Valid candidateId is required." });
    }

    const latest = await Decision.findOne({ candidateId }).sort({ createdAt: -1 });

    if (!latest || latest.status !== "pending") {
      const created = await Decision.create({
        candidateId,
        driveId,
        stage,
        status,
        reasonCode,
        reasonNote,
        recommendedBy: req.user.id,
        approvedBy: status === "approved" ? req.user.id : null,
        history: [
          {
            by: req.user.id,
            stage,
            status,
            reasonCode,
            reasonNote,
            at: new Date(),
          },
        ],
      });

      return res.status(201).json({ success: true, data: created });
    }

    latest.stage = stage;
    latest.status = status;
    latest.reasonCode = reasonCode;
    latest.reasonNote = reasonNote;
    if (status === "approved") {
      latest.approvedBy = req.user.id;
    }
    latest.history.push({
      by: req.user.id,
      stage,
      status,
      reasonCode,
      reasonNote,
      at: new Date(),
    });
    await latest.save();

    return res.status(200).json({ success: true, data: latest });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update decision.", error: error.message });
  }
};

export const listDecisions = async (req, res) => {
  try {
    const filter = {};
    if (req.query?.candidateId && mongoose.Types.ObjectId.isValid(req.query.candidateId)) {
      filter.candidateId = req.query.candidateId;
    }
    if (req.query?.driveId && mongoose.Types.ObjectId.isValid(req.query.driveId)) {
      filter.driveId = req.query.driveId;
    }
    if (req.query?.status) filter.status = req.query.status;

    const decisions = await Decision.find(filter)
      .populate("candidateId", "firstName lastName email")
      .populate("recommendedBy", "name")
      .populate("approvedBy", "name")
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: decisions });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch decisions.", error: error.message });
  }
};

export const getFunnelAnalytics = async (req, res) => {
  try {
    const driveId = req.query?.driveId;
    const cacheKey = `funnel:${driveId || "all"}`;

    const data = await cacheWrap(cacheKey, 120000, async () => {
      const candidateFilter = {};
      const quizFilter = {};

      if (driveId && mongoose.Types.ObjectId.isValid(driveId)) {
        candidateFilter.driveId = driveId;
        quizFilter.driveId = driveId;
      }

      const [registered, quizResults, decisions] = await Promise.all([
        CandidateDetails.countDocuments(candidateFilter),
        QuizResult.find(quizFilter).lean(),
        Decision.find(driveId && mongoose.Types.ObjectId.isValid(driveId) ? { driveId } : {}).lean(),
      ]);

      const examPassed = quizResults.filter((q) => Number(q.totalMarks || 0) >= 13).length;
      const r2Completed = quizResults.filter((q) => q?.R2?.[0]?.status === "completed").length;
      const r3Completed = quizResults.filter((q) => q?.R3?.[0]?.status === "completed").length;
      const r4Completed = quizResults.filter((q) => q?.R4?.[0]?.status === "completed").length;
      const offersApproved = decisions.filter((d) => d.status === "approved").length;

      const toPct = (value) => (registered > 0 ? Number(((value / registered) * 100).toFixed(2)) : 0);

      return {
        registered,
        examPassed,
        r2Completed,
        r3Completed,
        r4Completed,
        offersApproved,
        conversion: {
          examPassed: toPct(examPassed),
          r2Completed: toPct(r2Completed),
          r3Completed: toPct(r3Completed),
          r4Completed: toPct(r4Completed),
          offersApproved: toPct(offersApproved),
        },
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to compute funnel analytics.", error: error.message });
  }
};

export const getSlaAnalytics = async (req, res) => {
  try {
    const driveId = req.query?.driveId;
    const cacheKey = `sla:${driveId || "all"}`;

    const data = await cacheWrap(cacheKey, 120000, async () => {
      const decisionFilter = {};

      if (driveId && mongoose.Types.ObjectId.isValid(driveId)) {
        decisionFilter.driveId = driveId;
      }

      const [pendingDecisions] = await Promise.all([
        Decision.find({ ...decisionFilter, status: "pending" }).select("createdAt").lean(),
      ]);

      const now = Date.now();
      const overduePendingDecisions = pendingDecisions.filter(
        (d) => now - new Date(d.createdAt).getTime() > 24 * 60 * 60 * 1000
      ).length;

      return {
        overduePendingDecisions,
        slaBreaches: overduePendingDecisions,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to compute SLA analytics.", error: error.message });
  }
};

export const getReasonAnalytics = async (req, res) => {
  try {
    const driveId = req.query?.driveId;
    const cacheKey = `reasons:${driveId || "all"}`;

    const data = await cacheWrap(cacheKey, 120000, async () => {
      const decisionFilter = {};
      const quizFilter = {};
      if (driveId && mongoose.Types.ObjectId.isValid(driveId)) {
        decisionFilter.driveId = driveId;
        quizFilter.driveId = driveId;
      }

      const [decisions, quiz] = await Promise.all([
        Decision.find(decisionFilter).lean(),
        QuizResult.find(quizFilter).lean(),
      ]);

      const reasonCounts = {};
      for (const d of decisions) {
        const key = String(d.reasonCode || "unspecified").trim().toLowerCase() || "unspecified";
        reasonCounts[key] = (reasonCounts[key] || 0) + 1;
      }

      const roundDropCounts = { r2: 0, r3: 0, r4: 0 };
      for (const q of quiz) {
        if (["drop", "rejected", "dropped"].includes(String(q?.R2?.[0]?.status || "").toLowerCase())) roundDropCounts.r2 += 1;
        if (["drop", "rejected", "dropped"].includes(String(q?.R3?.[0]?.status || "").toLowerCase())) roundDropCounts.r3 += 1;
        if (["drop", "rejected", "dropped"].includes(String(q?.R4?.[0]?.status || "").toLowerCase())) roundDropCounts.r4 += 1;
      }

      return { reasonCounts, roundDropCounts };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to compute reason analytics.", error: error.message });
  }
};

export const getInterviewerCalibration = async (req, res) => {
  try {
    const driveId = req.query?.driveId;
    const cacheKey = `calibration:${driveId || "all"}`;

    const data = await cacheWrap(cacheKey, 120000, async () => {
      const filter = {};
      if (driveId && mongoose.Types.ObjectId.isValid(driveId)) {
        filter.driveId = driveId;
      }

      const quiz = await QuizResult.find(filter).lean();
      const map = new Map();

      const collect = (entry, roundKey) => {
        const round = entry?.[roundKey]?.[0];
        if (!round) return;
        const interviewer = String(round.interviewer || "").trim();
        const rating = Number(round.rating || 0);
        if (!interviewer || !Number.isFinite(rating) || rating <= 0) return;

        if (!map.has(interviewer)) map.set(interviewer, []);
        map.get(interviewer).push(rating);
      };

      for (const q of quiz) {
        collect(q, "R2");
        collect(q, "R4");
      }

      const allScores = Array.from(map.values()).flat();
      const globalAvg =
        allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;

      const interviewers = Array.from(map.entries()).map(([name, values]) => {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
        return {
          interviewer: name,
          samples: values.length,
          averageRating: Number(avg.toFixed(2)),
          stdDev: Number(Math.sqrt(variance).toFixed(2)),
          driftFromGlobal: Number((avg - globalAvg).toFixed(2)),
        };
      });

      return {
        globalAverage: Number(globalAvg.toFixed(2)),
        interviewers: interviewers.sort((a, b) => b.samples - a.samples),
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to compute interviewer calibration.", error: error.message });
  }
};

export const enqueueNotification = async (req, res) => {
  try {
    const { kind = "general", payload = {}, delayMs = 0 } = req.body;
    const job = await enqueueJob("email", { kind, ...payload }, { delayMs, maxAttempts: 3 });
    return res.status(201).json({ success: true, data: job });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to enqueue notification job.", error: error.message });
  }
};

export const getAsyncJobs = async (req, res) => {
  try {
    const page = toPage(req.query?.page, 1);
    const limit = toLimit(req.query?.limit, 20, 100);
    const status = String(req.query?.status || "").trim();

    const query = {};
    if (status) query.status = status;

    const [total, data] = await Promise.all([
      AsyncJob.countDocuments(query),
      AsyncJob.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch async jobs.", error: error.message });
  }
};

export const getCandidateFitScore = async (req, res) => {
  try {
    const candidate = await getCandidateByRef({
      candidateId: req.body?.candidateId || req.query?.candidateId,
      email: req.body?.email || req.query?.email,
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate not found." });
    }

    const requiredSkills = Array.isArray(req.body?.requiredSkills)
      ? req.body.requiredSkills
      : String(req.body?.requiredSkills || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    const normalizedRequired = requiredSkills.map((s) => s.toLowerCase());
    const candidateSkills = (candidate.skills || []).map((s) => String(s || "").toLowerCase());

    const matched = normalizedRequired.filter((skill) => candidateSkills.some((c) => c.includes(skill)));
    const skillMatch = normalizedRequired.length > 0 ? matched.length / normalizedRequired.length : 0.5;

    const quiz = await QuizResult.findOne({ email: String(candidate.email).toLowerCase() }).lean();
    const quizScore = Number(quiz?.totalMarks || 0);
    const quizNormalized = Math.min(Math.max(quizScore / 30, 0), 1);

    const roundSignals = [
      quiz?.R2?.[0]?.status === "completed" ? 1 : 0,
      quiz?.R3?.[0]?.status === "completed" ? 1 : 0,
      quiz?.R4?.[0]?.status === "completed" ? 1 : 0,
    ];
    const roundProgress = roundSignals.reduce((a, b) => a + b, 0) / 3;

    const fitScore = Number(((skillMatch * 0.5 + quizNormalized * 0.3 + roundProgress * 0.2) * 100).toFixed(2));
    const label = fitScore >= 80 ? "Strong Fit" : fitScore >= 60 ? "Moderate Fit" : "Needs Review";

    return res.status(200).json({
      success: true,
      data: {
        candidateId: candidate._id,
        fitScore,
        label,
        factors: {
          skillMatch: Number((skillMatch * 100).toFixed(2)),
          quizScore: Number((quizNormalized * 100).toFixed(2)),
          roundProgress: Number((roundProgress * 100).toFixed(2)),
          matchedSkills: matched,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to compute candidate fit score.", error: error.message });
  }
};

export const generateInterviewSummary = async (req, res) => {
  try {
    const candidate = await getCandidateByRef({
      candidateId: req.body?.candidateId || req.query?.candidateId,
      email: req.body?.email || req.query?.email,
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate not found." });
    }

    const [quiz, latestDecision] = await Promise.all([
      QuizResult.findOne({ email: String(candidate.email).toLowerCase() }).lean(),
      Decision.findOne({ candidateId: candidate._id }).sort({ createdAt: -1 }).lean(),
    ]);

    const roundStatus = {
      r2: quiz?.R2?.[0]?.status || "not started",
      r3: quiz?.R3?.[0]?.status || "not started",
      r4: quiz?.R4?.[0]?.status || "not started",
    };

    const strengths = [];
    if (Number(quiz?.totalMarks || 0) >= 20) strengths.push("Strong exam performance");
    if ((candidate.skills || []).length >= 5) strengths.push("Broad skill coverage");
    if (roundStatus.r2 === "completed") strengths.push("Technical interview completed");

    const concerns = [];
    if (roundStatus.r2 === "drop" || roundStatus.r2 === "rejected") concerns.push("Technical round concern");
    if (roundStatus.r3 === "hold") concerns.push("Managerial hold status");
    if (!quiz) concerns.push("Exam result unavailable");

    const summary = `${candidate.firstName} ${candidate.lastName} scored ${quiz?.totalMarks ?? 0} in the assessment. ` +
      `Round progress: R2=${roundStatus.r2}, R3=${roundStatus.r3}, R4=${roundStatus.r4}. ` +
      `${latestDecision ? `Latest decision is ${latestDecision.status} at ${latestDecision.stage} stage.` : "No final decision recorded yet."}`;

    return res.status(200).json({
      success: true,
      data: {
        summary,
        strengths,
        concerns,
        nextActions:
          concerns.length > 0
            ? ["Conduct panel review", "Collect detailed interviewer remarks"]
            : ["Proceed to next decision stage"],
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to generate interview summary.", error: error.message });
  }
};
