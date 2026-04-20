import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Shield, Smartphone, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { authAPI } from "../../utils/apiClient";

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [mfaStatus, setMfaStatus] = useState(null);
  const [setupData, setSetupData] = useState(null);
  const [sessions, setSessions] = useState([]);

  const [enableCode, setEnableCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disableBackupCode, setDisableBackupCode] = useState("");

  const loadSecurityData = useCallback(async () => {
    setLoading(true);
    try {
      const [mfaRes, sessionsRes] = await Promise.all([
        authAPI.getMFAStatus(),
        authAPI.getSessions(),
      ]);
      setMfaStatus(mfaRes?.data || null);
      setSessions(sessionsRes?.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to load security settings.");
      setMfaStatus(null);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecurityData();
  }, [loadSecurityData]);

  const handleSetupMfa = async () => {
    setBusy(true);
    try {
      const res = await authAPI.setupMFA();
      setSetupData(res?.data || null);
      toast.success("MFA setup created. Verify with one authenticator code.");
      loadSecurityData();
    } catch (error) {
      toast.error(error.message || "Failed to setup MFA.");
    } finally {
      setBusy(false);
    }
  };

  const handleEnableMfa = async (e) => {
    e.preventDefault();
    if (!enableCode.trim()) {
      toast.error("Enter MFA code.");
      return;
    }

    setBusy(true);
    try {
      await authAPI.enableMFA(enableCode.trim());
      toast.success("MFA enabled.");
      setEnableCode("");
      setSetupData(null);
      loadSecurityData();
    } catch (error) {
      toast.error(error.message || "Failed to enable MFA.");
    } finally {
      setBusy(false);
    }
  };

  const handleDisableMfa = async (e) => {
    e.preventDefault();
    if (!disableCode.trim() && !disableBackupCode.trim()) {
      toast.error("Enter code or backup code to disable MFA.");
      return;
    }

    setBusy(true);
    try {
      await authAPI.disableMFA({
        code: disableCode.trim(),
        backupCode: disableBackupCode.trim(),
      });
      toast.success("MFA disabled.");
      setDisableCode("");
      setDisableBackupCode("");
      setSetupData(null);
      loadSecurityData();
    } catch (error) {
      toast.error(error.message || "Failed to disable MFA.");
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    setBusy(true);
    try {
      await authAPI.revokeSession(sessionId);
      toast.success("Session revoked.");
      loadSecurityData();
    } catch (error) {
      toast.error(error.message || "Failed to revoke session.");
    } finally {
      setBusy(false);
    }
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Copy failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
        <p className="text-sm text-gray-500">Manage MFA and active login sessions for your account</p>
      </div>

      {loading ? (
        <div className="flex h-72 items-center justify-center rounded-xl border border-gray-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Shield size={18} className="text-blue-600" />
                <h2 className="text-sm font-semibold text-gray-800">Multi-Factor Authentication</h2>
              </div>

              <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Current status</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {mfaStatus?.mfaEnabled ? "Enabled" : "Disabled"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Backup codes remaining: {mfaStatus?.backupCodesRemaining ?? 0}
                </p>
              </div>

              {!mfaStatus?.mfaEnabled && (
                <button
                  type="button"
                  onClick={handleSetupMfa}
                  disabled={busy}
                  className="mb-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Smartphone size={15} /> Setup MFA
                </button>
              )}

              {setupData && (
                <div className="mb-4 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div>
                    <p className="text-xs text-blue-700">Secret</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="break-all text-xs text-blue-900">{setupData.secret}</p>
                      <button
                        type="button"
                        onClick={() => copyText(setupData.secret, "Secret")}
                        className="rounded-md border border-blue-300 p-1 text-blue-700 hover:bg-blue-100"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-blue-700">OTP URI</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="break-all text-xs text-blue-900">{setupData.otpauthUri}</p>
                      <button
                        type="button"
                        onClick={() => copyText(setupData.otpauthUri, "OTP URI")}
                        className="rounded-md border border-blue-300 p-1 text-blue-700 hover:bg-blue-100"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-blue-700">Backup codes</p>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-blue-900">
                      {(setupData.backupCodes || []).map((code) => (
                        <span key={code} className="rounded border border-blue-200 bg-white px-2 py-1">{code}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!mfaStatus?.mfaEnabled ? (
                <form onSubmit={handleEnableMfa} className="space-y-2">
                  <input
                    value={enableCode}
                    onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit authenticator code"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Enable MFA
                  </button>
                </form>
              ) : (
                <form onSubmit={handleDisableMfa} className="space-y-2">
                  <input
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Authenticator code"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={disableBackupCode}
                    onChange={(e) => setDisableBackupCode(e.target.value.toUpperCase())}
                    placeholder="Backup code"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Disable MFA
                  </button>
                </form>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-800">Active Sessions</h2>

              {sessions.length === 0 ? (
                <p className="text-sm text-gray-500">No active sessions found.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div key={session.id} className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">{session.userAgent || "Unknown device"}</p>
                      <p className="mt-1 text-xs text-gray-500">IP: {session.ipAddress || "N/A"}</p>
                      <p className="text-xs text-gray-500">
                        Last used: {session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString() : "-"}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <span className={`rounded-full px-2 py-1 text-xs ${session.isRevoked ? "bg-gray-200 text-gray-600" : "bg-emerald-100 text-emerald-700"}`}>
                          {session.isRevoked ? "Revoked" : "Active"}
                        </span>
                        {!session.isRevoked && (
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(session.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <Trash2 size={12} /> Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
