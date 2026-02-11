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
    <div className="min-h-screen bg-linear-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center px-6">

      {/* Card */}
      <div className="w-full max-w-md backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="https://www.tecnoprism.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-full.4865c8ea.png&w=1920&q=75"
            alt="TecnoPrism"
            className="h-12 object-contain"
          />
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white">
            Candidate Login
          </h2>
          <p className="text-sm text-white/70 mt-2">
            Walking Interview Portal
          </p>
        </div>

        {/* Error Box */}
        {error && (
          <div className="flex items-start gap-2 mb-4 bg-red-500/20 border border-red-400/40 text-red-100 px-4 py-3 rounded-lg text-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div>
            <label className="block text-sm text-white/80 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/60 focus:bg-white/30 transition-all duration-300"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-white/80 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/60 focus:bg-white/30 transition-all duration-300"
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white text-purple-600 font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-white/70">
            Don’t have an account?
            <Link
              to="/user-register"
              className="ml-1 text-white font-semibold hover:underline"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
