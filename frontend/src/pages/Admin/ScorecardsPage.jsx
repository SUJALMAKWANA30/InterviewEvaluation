import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { advancedAPI } from "../../utils/apiClient";
import { useDrive } from "../../context/DriveContext";

const DEFAULT_CRITERION = { key: "", label: "", weight: 1, maxScore: 10 };

export default function ScorecardsPage() {
  const { selectedDriveId, selectedDrive } = useDrive();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [scoreInputs, setScoreInputs] = useState({});
  const [lastEvaluation, setLastEvaluation] = useState(null);

  const [templateForm, setTemplateForm] = useState({
    name: "",
    roleName: "",
    round: "R2",
    criteria: [{ ...DEFAULT_CRITERION }],
  });

  const [evaluationForm, setEvaluationForm] = useState({
    candidateEmail: "",
    interviewer: "",
    notes: "",
  });

  const driveFilter = useMemo(() => {
    if (selectedDriveId && selectedDriveId !== "all") {
      return { driveId: selectedDriveId };
    }
    return {};
  }, [selectedDriveId]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => String(t._id) === String(selectedTemplateId)) || null,
    [templates, selectedTemplateId]
  );

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await advancedAPI.listScorecardTemplates({ ...driveFilter, activeOnly: true });
      const list = res?.data || [];
      setTemplates(list);

      if (!selectedTemplateId && list.length > 0) {
        setSelectedTemplateId(list[0]._id);
      }
      if (selectedTemplateId) {
        const exists = list.some((t) => String(t._id) === String(selectedTemplateId));
        if (!exists) {
          setSelectedTemplateId(list[0]?._id || "");
        }
      }
    } catch (error) {
      toast.error(error.message || "Failed to load scorecard templates.");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [driveFilter, selectedTemplateId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (!selectedTemplate) {
      setScoreInputs({});
      return;
    }

    const initial = {};
    for (const criterion of selectedTemplate.criteria || []) {
      initial[criterion.key] = "";
    }
    setScoreInputs(initial);
  }, [selectedTemplate]);

  const updateCriterion = (index, field, value) => {
    setTemplateForm((prev) => {
      const next = [...prev.criteria];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, criteria: next };
    });
  };

  const addCriterion = () => {
    setTemplateForm((prev) => ({
      ...prev,
      criteria: [...prev.criteria, { ...DEFAULT_CRITERION }],
    }));
  };

  const removeCriterion = (index) => {
    setTemplateForm((prev) => {
      if (prev.criteria.length <= 1) return prev;
      return {
        ...prev,
        criteria: prev.criteria.filter((_, idx) => idx !== index),
      };
    });
  };

  const submitTemplate = async (e) => {
    e.preventDefault();

    const normalizedCriteria = templateForm.criteria
      .map((criterion) => ({
        key: String(criterion.key || "").trim(),
        label: String(criterion.label || "").trim(),
        weight: Number(criterion.weight || 0),
        maxScore: Number(criterion.maxScore || 0),
      }))
      .filter((criterion) => criterion.key && criterion.label && criterion.weight > 0 && criterion.maxScore > 0);

    if (!templateForm.name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    if (normalizedCriteria.length === 0) {
      toast.error("Add at least one valid criterion.");
      return;
    }

    setSubmitting(true);
    try {
      await advancedAPI.createScorecardTemplate({
        name: templateForm.name.trim(),
        roleName: templateForm.roleName.trim(),
        round: templateForm.round,
        driveId: selectedDriveId !== "all" ? selectedDriveId : null,
        criteria: normalizedCriteria,
      });

      toast.success("Scorecard template created.");
      setTemplateForm({
        name: "",
        roleName: "",
        round: "R2",
        criteria: [{ ...DEFAULT_CRITERION }],
      });
      fetchTemplates();
    } catch (error) {
      toast.error(error.message || "Failed to create template.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitEvaluation = async (e) => {
    e.preventDefault();

    if (!selectedTemplate) {
      toast.error("Select a scorecard template.");
      return;
    }
    if (!evaluationForm.candidateEmail.trim()) {
      toast.error("Candidate email is required.");
      return;
    }

    const payloadScores = {};
    for (const criterion of selectedTemplate.criteria || []) {
      payloadScores[criterion.key] = Number(scoreInputs[criterion.key] || 0);
    }

    setSubmitting(true);
    try {
      const res = await advancedAPI.evaluateScorecard({
        templateId: selectedTemplate._id,
        candidateEmail: evaluationForm.candidateEmail.trim(),
        interviewer: evaluationForm.interviewer.trim(),
        notes: evaluationForm.notes.trim(),
        round: selectedTemplate.round,
        scores: payloadScores,
      });

      setLastEvaluation(res?.data || null);
      toast.success("Scorecard evaluation submitted.");
    } catch (error) {
      toast.error(error.message || "Failed to submit evaluation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scorecards</h1>
          <p className="text-sm text-gray-500">
            Build reusable interview score templates and record normalized evaluations
            {selectedDrive ? <span className="ml-1 text-blue-600">for {selectedDrive.name}</span> : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTemplates}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-800">Create Template</h2>

          <form onSubmit={submitTemplate} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={templateForm.name}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Template name"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={templateForm.roleName}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, roleName: e.target.value }))}
                placeholder="Role name (optional)"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <select
              value={templateForm.round}
              onChange={(e) => setTemplateForm((prev) => ({ ...prev, round: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="R2">R2</option>
              <option value="R3">R3</option>
              <option value="R4">R4</option>
            </select>

            <div className="space-y-2">
              {(templateForm.criteria || []).map((criterion, index) => (
                <div key={`criterion-${index}`} className="grid gap-2 rounded-lg border border-gray-200 p-3 md:grid-cols-[1fr,1fr,100px,110px,40px]">
                  <input
                    value={criterion.key}
                    onChange={(e) => updateCriterion(index, "key", e.target.value)}
                    placeholder="key (problem_solving)"
                    className="rounded-md border border-gray-300 px-2.5 py-2 text-xs"
                  />
                  <input
                    value={criterion.label}
                    onChange={(e) => updateCriterion(index, "label", e.target.value)}
                    placeholder="Label"
                    className="rounded-md border border-gray-300 px-2.5 py-2 text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    value={criterion.weight}
                    onChange={(e) => updateCriterion(index, "weight", e.target.value)}
                    placeholder="Weight"
                    className="rounded-md border border-gray-300 px-2.5 py-2 text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    value={criterion.maxScore}
                    onChange={(e) => updateCriterion(index, "maxScore", e.target.value)}
                    placeholder="Max"
                    className="rounded-md border border-gray-300 px-2.5 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeCriterion(index)}
                    className="inline-flex items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addCriterion}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              <Plus size={12} /> Add criterion
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Saving..." : "Create Template"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-800">Evaluate Candidate</h2>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-gray-500">Create a template first to start evaluations.</p>
          ) : (
            <form onSubmit={submitEvaluation} className="space-y-3">
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name} · {template.round}
                  </option>
                ))}
              </select>

              <input
                value={evaluationForm.candidateEmail}
                onChange={(e) => setEvaluationForm((prev) => ({ ...prev, candidateEmail: e.target.value }))}
                placeholder="candidate@email.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />

              <input
                value={evaluationForm.interviewer}
                onChange={(e) => setEvaluationForm((prev) => ({ ...prev, interviewer: e.target.value }))}
                placeholder="Interviewer name (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />

              <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                {(selectedTemplate?.criteria || []).map((criterion) => (
                  <div key={criterion.key} className="grid grid-cols-[1fr,100px] items-center gap-2">
                    <label className="text-sm text-gray-700">
                      {criterion.label}
                      <span className="ml-1 text-xs text-gray-400">(max {criterion.maxScore}, weight {criterion.weight})</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={criterion.maxScore}
                      value={scoreInputs[criterion.key] ?? ""}
                      onChange={(e) =>
                        setScoreInputs((prev) => ({
                          ...prev,
                          [criterion.key]: e.target.value,
                        }))
                      }
                      className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
              </div>

              <textarea
                rows={3}
                value={evaluationForm.notes}
                onChange={(e) => setEvaluationForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Submitting..." : "Submit Evaluation"}
              </button>
            </form>
          )}

          {lastEvaluation && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-medium text-emerald-800">
                Evaluation saved · Normalized score: {lastEvaluation.normalizedScore}
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">Available Templates</h2>

        {loading ? (
          <div className="flex h-28 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-gray-500">No templates found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Round</th>
                  <th className="px-2 py-2">Role</th>
                  <th className="px-2 py-2">Criteria</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template._id} className="border-b border-gray-100">
                    <td className="px-2 py-2 text-gray-800">{template.name}</td>
                    <td className="px-2 py-2 text-gray-600">{template.round}</td>
                    <td className="px-2 py-2 text-gray-600">{template.roleName || "-"}</td>
                    <td className="px-2 py-2 text-gray-600">{template.criteria?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
