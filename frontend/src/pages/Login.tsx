import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ApiError } from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');
    setLocalLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      const apiErr = err as ApiError;
      if (apiErr.error?.code === 'VALIDATION_ERROR' && apiErr.error.fields) {
        setErrors(apiErr.error.fields);
      } else {
        setGeneralError(apiErr.error?.message || 'Invalid email or password');
      }
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-slate-900/60 p-8 shadow-2xl backdrop-blur-md border border-slate-800">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            TradeComplyAI
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            India &rarr; US Export Compliance Platform
          </p>
        </div>

        {generalError && (
          <div className="rounded-lg bg-red-950/50 border border-red-900/50 p-4 text-sm text-red-400">
            {generalError}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div className="rounded-md space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exporter@msme.in"
                className={`block w-full rounded-lg border bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all ${
                  errors.email ? 'border-red-500/50' : 'border-slate-800'
                }`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`block w-full rounded-lg border bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all ${
                  errors.password ? 'border-red-500/50' : 'border-slate-800'
                }`}
              />
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={localLoading}
              className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {localLoading ? 'Signing In...' : 'Log In'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-400 mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
