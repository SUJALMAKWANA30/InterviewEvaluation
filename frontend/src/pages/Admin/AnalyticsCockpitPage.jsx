import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { advancedAPI } from "../../utils/apiClient";
import { useDrive } from "../../context/DriveContext";

export default function AnalyticsCockpitPage() {
  const { selectedDriveId, selectedDrive } = useDrive();

  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState(null);
  const [sla, setSla] = useState(null);
  const [reasons, setReasons] = useState(null);
  const [calibration, setCalibration] = useState(null);

  const driveParams = useMemo(() => {
    if (selectedDriveId && selectedDriveId !== "all") {
      return { driveId: selectedDriveId };
    }
    return {};
  }, [selectedDriveId]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [funnelRes, slaRes, reasonsRes, calibrationRes] = await Promise.all([
        advancedAPI.getFunnelAnalytics(driveParams),
        advancedAPI.getSlaAnalytics(driveParams),
        advancedAPI.getReasonAnalytics(driveParams),
        advancedAPI.getCalibrationAnalytics(driveParams),
      ]);

      setFunnel(funnelRes?.data || null);
      setSla(slaRes?.data || null);
      setReasons(reasonsRes?.data || null);
      setCalibration(calibrationRes?.data || null);
    } catch (error) {
      toast.error(error.message || "Failed to load analytics.");
      setFunnel(null);
      setSla(null);
      setReasons(null);
      setCalibration(null);
    } finally {
      setLoading(false);
    }
  }, [driveParams]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const reasonRows = useMemo(() => {
    const source = reasons?.reasonCounts || {};
    return Object.entries(source)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }, [reasons]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Cockpit</h1>
          <p className="text-sm text-gray-500">
            Funnel, SLA, reasons, and interviewer calibration insights
            {selectedDrive ? <span className="ml-1 text-blue-600">for {selectedDrive.name}</span> : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex h-80 items-center justify-center rounded-xl border border-gray-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Registered</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{funnel?.registered ?? 0}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Exam Passed</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{funnel?.examPassed ?? 0}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">R2 Completed</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{funnel?.r2Completed ?? 0}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">R3 Completed</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{funnel?.r3Completed ?? 0}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Offers Approved</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{funnel?.offersApproved ?? 0}</p>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-800">Conversion Rates</h2>
              <div className="space-y-3">
                {Object.entries(funnel?.conversion || {}).map(([key, value]) => (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                      <span>{key}</span>
                      <span>{value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${Math.max(0, Math.min(Number(value || 0), 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-800">SLA Health</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">SLA breaches</p>
                  <p className="text-xl font-bold text-gray-900">{sla?.slaBreaches ?? 0}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-xs text-amber-600">Pending decisions &gt; 24h</p>
                  <p className="text-xl font-bold text-amber-700">{sla?.overduePendingDecisions ?? 0}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-800">Top Decision Reasons</h2>
              {reasonRows.length === 0 ? (
                <p className="text-sm text-gray-500">No reason analytics yet.</p>
              ) : (
                <div className="space-y-2">
                  {reasonRows.slice(0, 8).map((row) => (
                    <div key={row.reason} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                      <span className="text-sm text-gray-700">{row.reason}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{row.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-800">Round Drop-offs</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">R2</p>
                  <p className="text-xl font-bold text-gray-900">{reasons?.roundDropCounts?.r2 ?? 0}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">R3</p>
                  <p className="text-xl font-bold text-gray-900">{reasons?.roundDropCounts?.r3 ?? 0}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">R4</p>
                  <p className="text-xl font-bold text-gray-900">{reasons?.roundDropCounts?.r4 ?? 0}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-800">Interviewer Calibration</h2>

            {Array.isArray(calibration?.interviewers) && calibration.interviewers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-2 py-2">Interviewer</th>
                      <th className="px-2 py-2">Samples</th>
                      <th className="px-2 py-2">Avg Rating</th>
                      <th className="px-2 py-2">Std Dev</th>
                      <th className="px-2 py-2">Drift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calibration.interviewers.map((interviewer) => (
                      <tr key={interviewer.interviewer} className="border-b border-gray-100">
                        <td className="px-2 py-2 text-gray-800">{interviewer.interviewer}</td>
                        <td className="px-2 py-2 text-gray-600">{interviewer.samples}</td>
                        <td className="px-2 py-2 text-gray-600">{interviewer.averageRating}</td>
                        <td className="px-2 py-2 text-gray-600">{interviewer.stdDev}</td>
                        <td className="px-2 py-2 text-gray-600">{interviewer.driftFromGlobal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No calibration data available yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
