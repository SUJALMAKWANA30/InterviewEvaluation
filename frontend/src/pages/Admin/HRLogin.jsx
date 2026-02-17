import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogIn, AlertCircle, Building2 } from "lucide-react";
import toast from "react-hot-toast";

export default function HRLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Fetch roles from API
      const response = await fetch(
        "https://tecnoprismmainbackend.onrender.com/roles?includePassword=true",
      );

      if (!response.ok) {
        throw new Error("Failed to connect to server. Please try again.");
      }

      const roles = await response.json();
      const rolesList = roles.data || roles || [];

      // Find matching user by username (email) OR Role and password
      const matchedUser = rolesList.find(
        (user) =>
          (user.username?.toLowerCase() === email.toLowerCase() ||
            user.Role?.toLowerCase() === email.toLowerCase()) &&
          user.password === password,
      );

      if (matchedUser) {
        // Store auth info in localStorage
        localStorage.setItem("authToken", matchedUser._id);
        localStorage.setItem("userType", "hr");
        localStorage.setItem("userRole", matchedUser.Role || "HR");
        localStorage.setItem("userName", matchedUser.username || email);
        toast.success("Login Successful! Welcome HR.");
        navigate("/hr-dashboard");
      } else {
        throw new Error(
          "Invalid email or password. Please check your credentials.",
        );
      }
    } catch (err) {
      const errorMessage = err.message || "Network error. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(err);
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
          {/* Email / Role */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Email or Role
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hr@company.com or Your Role"
              required
              className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login as HR"}
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
