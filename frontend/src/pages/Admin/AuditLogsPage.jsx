import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Loader2, Shield, Filter } from "lucide-react";
import { adminAPI } from "../../utils/apiClient";

const ACTION_OPTIONS = [
  "auth.login",
  "auth.logout",
  "auth.failed_login",
  "candidate.update",
  "round.update",
  "round.complete",
  "round.drop",
  "exam.create",
  "exam.update",
  "exam.delete",
  "drive.create",
  "drive.update",
  "drive.delete",
  "drive.toggle",
  "role.create",
  "role.update",
  "role.delete",
  "user.create",
  "user.update",
  "user.delete",
  "user.toggle_status",
];

const PAGE_SIZE = 20;

const actionClass = (action = "") => {
  if (action.startsWith("auth.")) return "bg-blue-50 text-blue-700 border-blue-200";
  if (action.startsWith("round.")) return "bg-purple-50 text-purple-700 border-purple-200";
  if (action.startsWith("candidate.")) return "bg-cyan-50 text-cyan-700 border-cyan-200";
  if (action.startsWith("role.") || action.startsWith("user.")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (action.startsWith("exam.") || action.startsWith("drive.")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const fetchLogs = useCallback(
    async (page = 1, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params = {
          page,
          limit: PAGE_SIZE,
        };
        if (search) params.search = search;
        if (actionFilter) params.action = actionFilter;

        const res = await adminAPI.getAuditLogs(params);
        setLogs(res.data || []);
        setPagination(
          res.pagination || {
            page,
            totalPages: 1,
            total: (res.data || []).length,
            limit: PAGE_SIZE,
          }
        );
      } catch (error) {
        setLogs([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, actionFilter]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const actionOptions = useMemo(() => {
    const fromData = Array.from(new Set(logs.map((l) => l.action).filter(Boolean)));
    return Array.from(new Set([...ACTION_OPTIONS, ...fromData]));
  }, [logs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-indigo-600" />
          <p className="text-sm text-gray-500">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 text-left">Audit Logs</h1>
          <p className="text-sm text-gray-500 text-left mt-1">
            Recent activity across users, rounds, exams, and admin actions
          </p>
        </div>
        <button
          onClick={() => fetchLogs(pagination.page, true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by user, action, target, or description..."
            className="w-full border border-gray-200 bg-gray-50 rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Time</th>
                <th className="text-left px-4 py-3 font-semibold">User</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
                <th className="text-left px-4 py-3 font-semibold">Target</th>
                <th className="text-left px-4 py-3 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Shield size={22} className="text-gray-400" />
                      <p>No audit logs found for this filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{log.userName || "System"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${actionClass(log.action)}`}>
                        {log.action || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {log.targetType ? (
                        <span>
                          {log.targetType}
                          {log.targetId ? ` (${String(log.targetId).slice(-6)})` : ""}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.description || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <p>
          Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} logs)
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLogs(Math.max(1, pagination.page - 1))}
            disabled={pagination.page <= 1}
            className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => fetchLogs(Math.min(pagination.totalPages, pagination.page + 1))}
            disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
