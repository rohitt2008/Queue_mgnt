import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Mail, Lock, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      await login({ email, password });
      showToast('Welcome back! Logged in successfully.', 'success');
      navigate('/');
    } catch (err: any) {
      showToast(err.message || 'Login failed. Please verify credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative gradient glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />

      <div className="w-full max-w-md">
        {/* Header Card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-xl shadow-indigo-500/20 mb-4 animate-float">
            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
            Queue Manager Portal
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Sign in to orchestrate tokens, counters, and real-time queues
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-panel-glow rounded-2xl p-7 border border-indigo-500/30 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Manager Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@rugas.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.98] disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Manager Desk'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Fill */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-xs font-semibold text-slate-400 mb-2.5 flex items-center justify-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>One-Click Demo Credentials:</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@rugas.com')}
                className="px-3 py-2 rounded-lg bg-indigo-950/60 border border-indigo-700/40 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/60 transition-all flex items-center justify-center space-x-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Sarah (Admin)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('alex@rugas.com')}
                className="px-3 py-2 rounded-lg bg-purple-950/60 border border-purple-700/40 text-xs font-semibold text-purple-300 hover:bg-purple-900/60 transition-all flex items-center justify-center space-x-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Alex (Lead)</span>
              </button>
            </div>
            <p className="text-[11px] text-center text-slate-500 mt-2">Password: password123</p>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Don't have a manager account?{' '}
          <Link to="/register" className="font-bold text-indigo-400 hover:text-indigo-300 underline">
            Register New Manager
          </Link>
        </p>
      </div>
    </div>
  );
};
