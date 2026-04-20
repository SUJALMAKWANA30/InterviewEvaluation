import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import toast from "react-hot-toast";
import { advancedAPI } from "../../utils/apiClient";
import { useDrive } from "../../context/DriveContext";

const STATUS_OPTIONS = ["pending", "approved", "rejected", "hold"];
const STAGE_OPTIONS = ["interviewer", "manager", "admin", "final"];

const STATUS_CLASS = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  hold: "bg-gray-200 text-gray-700",
};

export default function DecisionsWorkflowPage() {
  const { selectedDriveId, selectedDrive } = useDrive();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [candidateQuery, setCandidateQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [candidates, setCandidates] = useState([]);
  const [decisions, setDecisions] = useState([]);

  const [form, setForm] = useState({
    candidateId: "",
    stage: "interviewer",
    status: "pending",
    reasonCode: "",
    reasonNote: "",
  });

  const driveParams = useMemo(() => {
    if (selectedDriveId && selectedDriveId !== "all") {
      return { driveId: selectedDriveId };
    }
    return {};
  }, [selectedDriveId]);

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => String(candidate._id) === String(form.candidateId)) || null,
    [candidates, form.candidateId]
  );

  const fetchCandidates = useCallback(async () => {
    try {
      const params = {
        ...driveParams,
        q: candidateQuery,
        page: 1,
        limit: 50,
      };
      const res = await advancedAPI.searchCandidates(params);
      const list = res?.data || [];
      setCandidates(list);

      if (!form.candidateId && list.length > 0) {
        setForm((prev) => ({ ...prev, candidateId: list[0]._id }));
      }
      if (form.candidateId) {
        const exists = list.some((candidate) => String(candidate._id) === String(form.candidateId));
        if (!exists) {
          setForm((prev) => ({ ...prev, candidateId: list[0]?._id || "" }));
        }
      }
    } catch (error) {
      toast.error(error.message || "Failed to fetch candidates.");
    }
  }, [candidateQuery, driveParams, form.candidateId]);

  const fetchDecisions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...driveParams,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const res = await advancedAPI.listDecisions(params);
      setDecisions(res?.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to fetch decisions.");
      setDecisions([]);
    } finally {
      setLoading(false);
    }
  }, [driveParams, statusFilter]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchCandidates(), fetchDecisions()]);
  }, [fetchCandidates, fetchDecisions]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const submitDecision = async (e) => {
    e.preventDefault();

    if (!form.candidateId) {
      toast.error("Select a candidate first.");
      return;
    }

    setSaving(true);
    try {
      await advancedAPI.upsertDecision({
        candidateId: form.candidateId,
        driveId: selectedDriveId !== "all" ? selectedDriveId : null,
        stage: form.stage,
        status: form.status,
        reasonCode: form.reasonCode,
        reasonNote: form.reasonNote,
      });
      toast.success("Decision updated.");
      setForm((prev) => ({ ...prev, reasonCode: "", reasonNote: "" }));
      fetchDecisions();
    } catch (error) {
      toast.error(error.message || "Failed to update decision.");
    } finally {
      setSaving(false);
    }
  };

  const groupedCounts = useMemo(() => {
    return STATUS_OPTIONS.reduce((acc, status) => {
      acc[status] = decisions.filter((decision) => decision.status === status).length;
      return acc;
    }, {});
  }, [decisions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Decision Workflow</h1>
          <p className="text-sm text-gray-500">
            Track and approve hiring decisions stage by stage
            {selectedDrive ? <span className="ml-1 text-blue-600">for {selectedDrive.name}</span> : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={refreshAll}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {STATUS_OPTIONS.map((status) => (
          <div key={status} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">{status}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{groupedCounts[status] || 0}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px,1fr]">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-800">Update Decision</h2>

          <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <Search size={15} className="text-gray-400" />
            <input
              value={candidateQuery}
              onChange={(e) => setCandidateQuery(e.target.value)}
              placeholder="Search candidates"
              className="w-full text-sm outline-none"
            />
          </div>

          <form onSubmit={submitDecision} className="space-y-3">
            <select
              value={form.candidateId}
              onChange={(e) => setForm((prev) => ({ ...prev, candidateId: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select candidate</option>
              {candidates.map((candidate) => (
                <option key={candidate._id} value={candidate._id}>
                  {`${candidate.firstName || ""} ${candidate.lastName || ""}`.trim() || "Unnamed"} · {candidate.email}
                </option>
              ))}
            </select>

            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={form.stage}
                onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {STAGE_OPTIONS.map((stage) => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>

              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <input
              value={form.reasonCode}
              onChange={(e) => setForm((prev) => ({ ...prev, reasonCode: e.target.value }))}
              placeholder="Reason code"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />

            <textarea
              rows={3}
              value={form.reasonNote}
              onChange={(e) => setForm((prev) => ({ ...prev, reasonNote: e.target.value }))}
              placeholder="Reason note"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save Decision"}
            </button>
          </form>

          {selectedCandidate && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
              Selected: {`${selectedCandidate.firstName || ""} ${selectedCandidate.lastName || ""}`.trim() || "Unnamed"}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-800">Decision Board</h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : decisions.length === 0 ? (
            <p className="text-sm text-gray-500">No decisions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-2 py-2">Candidate</th>
                    <th className="px-2 py-2">Stage</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Reason</th>
                    <th className="px-2 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {decisions.map((decision) => {
                    const candidate = decision.candidateId;
                    const candidateName = `${candidate?.firstName || ""} ${candidate?.lastName || ""}`.trim();
                    return (
                      <tr key={decision._id} className="border-b border-gray-100">
                        <td className="px-2 py-2 text-gray-800">{candidateName || candidate?.email || "-"}</td>
                        <td className="px-2 py-2 text-gray-600">{decision.stage}</td>
                        <td className="px-2 py-2">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASS[decision.status] || "bg-gray-100 text-gray-700"}`}>
                            {decision.status}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-gray-600">{decision.reasonCode || "-"}</td>
                        <td className="px-2 py-2 text-gray-500">
                          {decision.updatedAt ? new Date(decision.updatedAt).toLocaleString() : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
