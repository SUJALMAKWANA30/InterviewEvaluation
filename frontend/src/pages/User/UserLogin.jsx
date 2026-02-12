import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';
import { authAPI } from '../../utils/api';

export default function UserLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();

      let token = null;

      try {
        const data = await authAPI.loginUser(normalizedEmail, normalizedPassword);
        token = data.token || null;
      } catch (primaryErr) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(
          'https://tecnoprismmainbackend.onrender.com/user-details/credentials',
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('Failed to fetch user credentials');
        }

        const data = await response.json();
        const users = data.data || [];

        const foundUser = users.find(
          (u) => (u.Username || '').trim().toLowerCase() === normalizedEmail
        );

        if (!foundUser) {
          throw new Error('No user found with this email');
        }

        const storedPassword = (foundUser.Password || '').toString().trim();

        if (storedPassword !== normalizedPassword) {
          throw new Error('Incorrect password');
        }

        token = `token-ext-${normalizedEmail}`;
      }

      await fetch('https://tecnoprismmainbackend.onrender.com/qr/set-true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Username: normalizedEmail }),
      });

      localStorage.setItem('authToken', token);
      localStorage.setItem('userType', 'user');
      localStorage.setItem('userData', JSON.stringify({ email: normalizedEmail }));

      toast.success('Login Successful! You may start your exam now.', {
        duration: 3000,
        position: 'top-center',
      });

      navigate('/user-dashboard');
    } catch (err) {
      const msg = err.message || 'Login failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen bg-gray-100 flex justify-center pt-30 px-6">

    {/* Centered Container */}
    <div className="w-full max-w-md text-left">

      {/* Back Link */}
      {/* <Link
        to="/"
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8"
      >
        <span className="text-base">←</span>
        Back to home
      </Link> */}

      {/* Heading */}
      <h1 className="text-3xl font-bold text-gray-900">
        Candidate Login
      </h1>

      <p className="mt-2 text-gray-500">
        Enter your credentials to continue
      </p>

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
        <div className="text-left">
          <label className="block text-sm font-medium text-gray-800 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          />
        </div>

        {/* Password */}
        <div className="text-left">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-800">
              Password
            </label>
            <Link
              to="#"
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          />
        </div>

        {/* Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-md bg-linear-to-r from-blue-600 to-blue-700 text-white font-medium hover:opacity-95 transition disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Sign In"}
        </button>
      </form>

      {/* Footer */}
      <p className="mt-8 text-sm text-center text-gray-500">
        Don't have an account?{" "}
        <Link
          to="/user-register"
          className="text-blue-600 font-medium hover:underline"
        >
          Register here
        </Link>
      </p>

    </div>
  </div>
);

}
