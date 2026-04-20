import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogIn, AlertCircle, Building2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { authAPI } from "../../utils/apiClient";

export default function HRLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Clear any stale session data when user lands on login page
  useEffect(() => {
    // If navigated here directly (not via logout), clean up old session
    // so stale tokens don't interfere with the new login
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userType");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userData");
    localStorage.removeItem("selectedDriveId");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await authAPI.loginHR(
        email,
        password,
        useBackupCode ? "" : mfaCode,
        useBackupCode ? backupCode : ""
      );

      if (result.success) {
        // Store auth data securely
        localStorage.setItem("authToken", result.token);
        localStorage.setItem("refreshToken", result.refreshToken || "");
        localStorage.setItem("userType", "hr");
        localStorage.setItem("userRole", result.user.roleSlug || "hr");
        localStorage.setItem(
          "userData",
          JSON.stringify({
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.roleSlug,
            roleName: result.user.role,
            level: result.user.level,
            permissions: result.user.permissions || [],
            drives: result.user.drives || [],
          })
        );

        toast.success(`Welcome, ${result.user.name}!`);
        navigate("/hr-home");
      } else {
        throw new Error(result.message || "Login failed");
      }
    } catch (err) {
      if (err?.data?.mfaRequired) {
        setMfaRequired(true);
        setError("MFA required. Enter your 6-digit authenticator code or use a backup code.");
        toast.error("MFA required.");
      } else {
        setMfaRequired(false);
        const errorMessage =
          err.message || "Network error. Please try again.";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center pt-20 px-6">
      <div className="w-full max-w-md text-left">
        {/* Back Link */}
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8"
        >
          <span className="text-base">←</span>
          Back to home
        </Link>

        {/* Heading */}
        <h1 className="text-3xl font-semibold text-gray-900">HR Login</h1>

        <p className="mt-2 text-gray-500">Walking Interview Tecnoprism</p>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 mt-6 bg-red-100 border border-red-300 text-red-600 px-4 py-3 rounded-md text-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@tecnoprism.com"
              required
              autoComplete="email"
              className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full h-11 rounded-lg border border-gray-300 px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* MFA */}
          {mfaRequired && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-800">
                  {useBackupCode ? "Backup Code" : "Authenticator Code"}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setUseBackupCode((prev) => !prev);
                    setMfaCode("");
                    setBackupCode("");
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {useBackupCode ? "Use authenticator code" : "Use backup code"}
                </button>
              </div>

              {!useBackupCode ? (
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  required={mfaRequired && !useBackupCode}
                  className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              ) : (
                <input
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                  placeholder="Backup code"
                  required={mfaRequired && useBackupCode}
                  className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              )}
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              "Logging in..."
            ) : (
              <>
                <LogIn size={18} />
                Login
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-sm text-gray-500 text-center">
          Don't have an account? Contact your administrator
        </p>
      </div>
    </div>
  );
}
