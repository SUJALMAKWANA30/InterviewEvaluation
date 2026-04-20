import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  User2,
  Mail,
  Phone,
  Activity,
  Brain,
  CheckCircle2,
  AlertTriangle,
  ListChecks,
} from "lucide-react";
import toast from "react-hot-toast";
import { advancedAPI } from "../../utils/apiClient";
import { useDrive } from "../../context/DriveContext";

function EventBadge({ type }) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("decision")) {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        Decision
      </span>
    );
  }
  if (normalized.includes("interview")) {
    return (
      <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
        Interview
      </span>
    );
  }
  if (normalized.includes("exam")) {
    return (
      <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
        Exam
      </span>
    );
  }
  return (
    <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
      Event
    </span>
  );
}

function StatCard({ label, value, subtitle, icon: Icon, tone = "slate" }) {
  const toneClass = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
        <div className={`rounded-lg border p-1.5 ${toneClass[tone] || toneClass.slate}`}>
          <Icon size={14} />
        </div>
      </div>
      <p className="truncate text-lg font-semibold text-gray-900">{value}</p>
      <p className="mt-1 truncate text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

const getInitials = (firstName = "", lastName = "") => {
  const value = `${firstName} ${lastName}`.trim();
  if (!value) return "NA";
  return value
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);
};

const getExamStatusTone = (status = "") => {
  const normalized = String(status || "").toLowerCase();
  if (["qualified", "passed", "completed"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["registered", "pending", "in-progress", "in progress"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["drop", "dropped", "failed", "rejected"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-gray-200 bg-gray-100 text-gray-600";
};

const formatEventTime = (value) => {
  if (!value) return "No timestamp";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "No timestamp";
  return dt.toLocaleString();
};

export default function Candidate360Page() {
  const { selectedDriveId, selectedDrive } = useDrive();

  const [query, setQuery] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [candidate360, setCandidate360] = useState(null);
  const [journey, setJourney] = useState([]);
  const [fitScore, setFitScore] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);

  const [listLoading, setListLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const driveParam = useMemo(() => {
    if (selectedDriveId && selectedDriveId !== "all") {
      return { driveId: selectedDriveId };
    }
    return {};
  }, [selectedDriveId]);

  const fetchCandidates = useCallback(async () => {
    setListLoading(true);
    try {
      const params = {
        ...driveParam,
        q: query,
        page: 1,
        limit: 50,
      };
      const res = await advancedAPI.searchCandidates(params);
      const list = res?.data || [];
      setCandidates(list);

      if (!selectedCandidate && list.length > 0) {
        setSelectedCandidate(list[0]);
      }
      if (selectedCandidate) {
        const stillExists = list.find((c) => String(c._id) === String(selectedCandidate._id));
        if (!stillExists) {
          setSelectedCandidate(list[0] || null);
        }
      }
    } catch (error) {
      toast.error(error.message || "Failed to load candidates.");
    } finally {
      setListLoading(false);
    }
  }, [driveParam, query, selectedCandidate]);

  const fetchCandidateDetails = useCallback(async (candidateId) => {
    if (!candidateId) return;

    setDetailsLoading(true);
    try {
      const [c360Res, journeyRes] = await Promise.all([
        advancedAPI.getCandidate360(candidateId),
        advancedAPI.getCandidateJourney(candidateId),
      ]);

      setCandidate360(c360Res?.data || null);
      setJourney(Array.isArray(journeyRes?.data?.events) ? journeyRes.data.events : []);
    } catch (error) {
      toast.error(error.message || "Failed to load candidate 360 details.");
      setCandidate360(null);
      setJourney([]);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const fetchInsights = useCallback(async (candidateId) => {
    if (!candidateId) return;

    setInsightsLoading(true);
    try {
      const payload = {
        candidateId,
        requiredSkills,
      };

      const [fitRes, summaryRes] = await Promise.all([
        advancedAPI.getFitScore(payload),
        advancedAPI.getInterviewSummary({ candidateId }),
      ]);

      setFitScore(fitRes?.data || null);
      setAiSummary(summaryRes?.data || null);
    } catch (error) {
      toast.error(error.message || "Failed to load AI insights.");
      setFitScore(null);
      setAiSummary(null);
    } finally {
      setInsightsLoading(false);
    }
  }, [requiredSkills]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    fetchCandidateDetails(selectedCandidate?._id);
    fetchInsights(selectedCandidate?._id);
  }, [selectedCandidate, fetchCandidateDetails, fetchInsights]);

  const fullName = useMemo(() => {
    const candidate = candidate360?.candidate;
    if (!candidate) return "";
    return `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim();
  }, [candidate360]);

  const fitScoreValue = useMemo(() => {
    const value = Number(fitScore?.fitScore);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(value, 100));
  }, [fitScore]);

  const fitToneClass = useMemo(() => {
    if (fitScoreValue >= 80) return "text-emerald-700";
    if (fitScoreValue >= 60) return "text-amber-700";
    return "text-rose-700";
  }, [fitScoreValue]);

  const strengths = Array.isArray(aiSummary?.strengths) ? aiSummary.strengths : [];
  const concerns = Array.isArray(aiSummary?.concerns) ? aiSummary.concerns : [];
  const nextActions = Array.isArray(aiSummary?.nextActions) ? aiSummary.nextActions : [];

  const refreshAll = useCallback(() => {
    fetchCandidates();
    if (selectedCandidate?._id) {
      fetchCandidateDetails(selectedCandidate._id);
      fetchInsights(selectedCandidate._id);
    }
  }, [fetchCandidates, fetchCandidateDetails, fetchInsights, selectedCandidate]);

  return (
    <div className="space-y-6 pb-4">
      <div className="rounded-2xl border border-slate-900 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Candidate 360</h1>
            <p className="mt-1 text-sm text-slate-300">
              Deep profile, timeline, and AI signals in one review workspace
            </p>
            {selectedDrive ? (
              <span className="mt-3 inline-flex items-center rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-200">
                Active drive: {selectedDrive.name}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-700"
          >
            <RefreshCw size={14} /> Refresh Data
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Candidate Directory</p>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600">
              {candidates.length} loaded
            </span>
          </div>

          <div className="mb-3 flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 transition focus-within:border-blue-400 focus-within:bg-blue-50/30">
            <Search size={16} className="text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, phone, skill"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <div className="h-[520px] overflow-y-auto pr-1">
            {listLoading ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : candidates.length === 0 ? (
              <p className="pt-10 text-center text-sm text-gray-500">No candidates found.</p>
            ) : (
              <div className="space-y-2">
                {candidates.map((candidate) => {
                  const active = String(candidate?._id) === String(selectedCandidate?._id);
                  const status = candidate.examStatus || "unknown";
                  return (
                    <button
                      key={candidate._id}
                      type="button"
                      onClick={() => setSelectedCandidate(candidate)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-blue-300 bg-blue-50/70 shadow-sm"
                          : "border-gray-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {getInitials(candidate.firstName, candidate.lastName)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {`${candidate.firstName || ""} ${candidate.lastName || ""}`.trim() || "Unnamed"}
                            </p>
                            {active ? (
                              <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                Viewing
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-xs text-gray-500">{candidate.email || "No email"}</p>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className={`rounded-full border px-2 py-1 font-medium ${getExamStatusTone(status)}`}>
                              {status}
                            </span>
                            <span className="inline-flex items-center gap-1 text-gray-400">
                              <Phone size={11} /> {candidate.phone || "No phone"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          {detailsLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="grid animate-pulse gap-4 md:grid-cols-3">
                <div className="h-24 rounded-xl bg-gray-100" />
                <div className="h-24 rounded-xl bg-gray-100" />
                <div className="h-24 rounded-xl bg-gray-100" />
              </div>
              <div className="mt-4 h-72 rounded-xl bg-gray-100" />
              <div className="mt-4 flex items-center justify-center text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            </div>
          ) : !candidate360?.candidate ? (
            <div className="flex h-[520px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm">
              <User2 className="mb-3 h-8 w-8 text-gray-300" />
              Select a candidate to view details.
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  label="Candidate"
                  value={fullName || "Unnamed"}
                  subtitle={candidate360.candidate.email || "No email"}
                  icon={User2}
                />
                <StatCard
                  label="Assessment Score"
                  value={candidate360.quizResult?.totalMarks ?? "-"}
                  subtitle={`${candidate360.quizResult?.sectionWiseMarks?.length || 0} sections evaluated`}
                  icon={Brain}
                  tone="indigo"
                />
                <StatCard
                  label="Decisions Recorded"
                  value={candidate360.decisions?.length || 0}
                  subtitle={`Latest: ${String(candidate360.decisions?.[0]?.status || "none").toUpperCase()}`}
                  icon={Activity}
                  tone="emerald"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-800">Journey Timeline</h2>
                    <span className="text-xs text-gray-400">{journey.length} events</span>
                  </div>

                  <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                    {journey.length === 0 ? (
                      <p className="text-sm text-gray-500">No timeline events found.</p>
                    ) : (
                      journey.map((event, idx) => (
                        <div key={`${event.type}-${idx}`} className="relative pl-5">
                          <span className="absolute left-0 top-2.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
                          {idx !== journey.length - 1 ? (
                            <span className="absolute left-[4px] top-5 h-[calc(100%-6px)] w-px bg-blue-100" />
                          ) : null}

                          <div className="rounded-xl border border-gray-200 bg-slate-50 p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-gray-800">{event.title || "Event"}</p>
                              <EventBadge type={event.type} />
                            </div>

                            <p className="text-xs text-gray-500">{formatEventTime(event.timestamp)}</p>
                            {event?.meta?.round || event?.meta?.status || event?.meta?.score !== undefined ? (
                              <p className="mt-1 text-xs text-gray-500">
                                {event?.meta?.round ? `${event.meta.round}` : ""}
                                {event?.meta?.status ? `${event?.meta?.round ? " - " : ""}${event.meta.status}` : ""}
                                {event?.meta?.score !== undefined
                                  ? `${event?.meta?.round || event?.meta?.status ? " | " : ""}Score: ${event.meta.score}`
                                  : ""}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-gray-800">AI Insights</h2>
                      <button
                        type="button"
                        onClick={() => fetchInsights(selectedCandidate?._id)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        {insightsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles size={13} />}
                        Refresh
                      </button>
                    </div>

                    <label className="mb-1 block text-xs text-gray-500">Required skills (comma separated)</label>
                    <input
                      value={requiredSkills}
                      onChange={(e) => setRequiredSkills(e.target.value)}
                      placeholder="react,node,mongodb"
                      className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs text-gray-500">Fit score</p>
                        <p className={`text-xs font-semibold ${fitToneClass}`}>{fitScore?.label || "No label yet"}</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{fitScore?.fitScore ?? "-"}</p>
                      <div className="mt-2 h-2 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                          style={{ width: `${fitScoreValue}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                      <p className="text-xs font-medium text-blue-700">Summary</p>
                      <p className="mt-1 text-sm text-blue-900">{aiSummary?.summary || "No summary generated yet."}</p>
                    </div>

                    {strengths.length > 0 ? (
                      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 size={13} /> Strengths
                        </div>
                        <ul className="mt-2 space-y-1 text-xs text-emerald-800">
                          {strengths.slice(0, 4).map((item, idx) => (
                            <li key={`${item}-${idx}`} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {concerns.length > 0 ? (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                          <AlertTriangle size={13} /> Concerns
                        </div>
                        <ul className="mt-2 space-y-1 text-xs text-amber-800">
                          {concerns.slice(0, 4).map((item, idx) => (
                            <li key={`${item}-${idx}`} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {nextActions.length > 0 ? (
                      <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                          <ListChecks size={13} /> Recommended next actions
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {nextActions.map((item, idx) => (
                            <span
                              key={`${item}-${idx}`}
                              className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 rounded-xl border border-gray-200 bg-slate-50 p-3 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail size={12} className="text-gray-400" />
                        <span>{candidate360?.candidate?.email || "No email"}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Phone size={12} className="text-gray-400" />
                        <span>{candidate360?.candidate?.phone || "No phone"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
