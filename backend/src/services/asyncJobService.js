import AsyncJob from "../models/AsyncJob.js";
import CandidateDetails from "../models/CandidateDetails.js";
import { sendRoundStatusUpdate } from "./notificationService.js";

let workerInterval = null;
let isProcessing = false;

export const enqueueJob = async (type, payload = {}, options = {}) => {
  const availableAt = options?.delayMs
    ? new Date(Date.now() + Number(options.delayMs || 0))
    : new Date();

  const job = await AsyncJob.create({
    type: type || "general",
    payload,
    maxAttempts: Number(options?.maxAttempts || 3),
    availableAt,
    status: "queued",
  });

  return job;
};

const handleEmailJob = async (job) => {
  const kind = job.payload?.kind;

  if (kind === "round-status") {
    const candidate = await CandidateDetails.findById(job.payload?.candidateId).lean();
    if (candidate) {
      await sendRoundStatusUpdate(
        candidate,
        String(job.payload?.round || "R2"),
        String(job.payload?.status || "in-progress")
      );
    }
  }
};

const processOneJob = async () => {
  const job = await AsyncJob.findOneAndUpdate(
    {
      status: "queued",
      availableAt: { $lte: new Date() },
    },
    {
      $set: { status: "processing" },
      $inc: { attempts: 1 },
    },
    {
      sort: { createdAt: 1 },
      new: true,
    }
  );

  if (!job) return false;

  try {
    if (job.type === "email" || job.type === "reminder") {
      await handleEmailJob(job);
    }

    job.status = "completed";
    job.processedAt = new Date();
    job.lastError = "";
    await job.save();
  } catch (error) {
    job.lastError = error.message;

    if (job.attempts >= job.maxAttempts) {
      job.status = "failed";
      job.processedAt = new Date();
      await job.save();
    } else {
      job.status = "queued";
      job.availableAt = new Date(Date.now() + 60 * 1000);
      await job.save();
    }
  }

  return true;
};

export const processQueuedJobs = async () => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    let hasMore = true;
    let loops = 0;

    while (hasMore && loops < 20) {
      hasMore = await processOneJob();
      loops += 1;
    }
  } finally {
    isProcessing = false;
  }
};

export const startAsyncJobWorker = () => {
  if (workerInterval) return;
  workerInterval = setInterval(() => {
    processQueuedJobs().catch(() => {});
  }, 5000);
};

export const stopAsyncJobWorker = () => {
  if (!workerInterval) return;
  clearInterval(workerInterval);
  workerInterval = null;
};
