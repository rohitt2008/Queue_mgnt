import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Crown,
  Zap,
  Shield,
  UserCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';

interface PreSeededAccount {
  name: string;
  email: string;
  role: string;
  badge: string;
  roleType: 'ADMIN' | 'LEAD' | 'MANAGER' | 'STAFF';
  counter: string;
  bgGlow: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  icon: any;
}

const PRESEEDED_ACCOUNTS: PreSeededAccount[] = [
  {
    name: 'Sarah Jenkins',
    email: 'admin@rugas.com',
    role: 'System Administrator & Director',
    badge: 'SUPER ADMIN',
    roleType: 'ADMIN',
    counter: 'VIP Wealth & Executive Suite 1',
    bgGlow: 'hover:border-amber-500/70 hover:shadow-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950',
    badgeBg: 'bg-amber-400/20 text-amber-300 border-amber-500/40',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    icon: Crown,
  },
  {
    name: 'Alex Rivera',
    email: 'lead@rugas.com',
    role: 'Operations Lead',
    badge: 'OPERATIONS LEAD',
    roleType: 'LEAD',
    counter: 'Customer Support Desk 2',
    bgGlow: 'hover:border-purple-500/70 hover:shadow-purple-500/20 bg-gradient-to-br from-purple-500/10 via-slate-900 to-slate-950',
    badgeBg: 'bg-purple-400/20 text-purple-300 border-purple-500/40',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    icon: Zap,
  },
  {
    name: 'David K. Miller',
    email: 'manager@rugas.com',
    role: 'Senior Queue Manager',
    badge: 'QUEUE MANAGER',
    roleType: 'MANAGER',
    counter: 'Express Cashier Counter 3',
    bgGlow: 'hover:border-indigo-500/70 hover:shadow-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-slate-950',
    badgeBg: 'bg-indigo-400/20 text-indigo-300 border-indigo-500/40',
    textColor: 'text-indigo-400',
    borderColor: 'border-indigo-500/30',
    icon: Shield,
  },
  {
    name: 'Elena Rostova',
    email: 'staff@rugas.com',
    role: 'Counter Service Specialist',
    badge: 'COUNTER STAFF',
    roleType: 'STAFF',
    counter: 'Prescription Dispense Window A',
    bgGlow: 'hover:border-emerald-500/70 hover:shadow-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950',
    badgeBg: 'bg-emerald-400/20 text-emerald-300 border-emerald-500/40',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    icon: UserCheck,
  },
];

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggingInAccount, setLoggingInAccount] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Instant 1-Click Login for pre-seeded accounts
  const handleInstantLogin = async (acc: PreSeededAccount) => {
    setLoggingInAccount(acc.email);
    try {
      sound.playBlip();
      await login({ email: acc.email, password: 'password123' });
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      showToast(`Welcome back, ${acc.name} (${acc.badge})!`, 'success');
      navigate('/');
    } catch (err: any) {
      showToast(err.message || 'Login failed. Please verify credentials.', 'error');
    } finally {
      setLoggingInAccount(null);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      await login({ email, password });
      showToast('Logged in successfully!', 'success');
      navigate('/');
    } catch (err: any) {
      showToast(err.message || 'Login failed. Please verify credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />

      <div className="w-full max-w-2xl my-6">
        {/* Header Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold mb-3 shadow-lg shadow-indigo-500/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Instant Role-Based Access Available</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Queue Manager Portal
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-md mx-auto">
            Select any pre-configured role below to log in instantly with a single click, or use custom credentials.
          </p>
        </div>

        {/* 🌟 PRESEEDED ACCOUNTS BOX (Requested by User) */}
        <div className="rounded-3xl p-6 sm:p-8 bg-slate-900/90 border border-indigo-500/30 shadow-2xl backdrop-blur-xl relative overflow-hidden mb-6">
          <div className="flex items-center justify-between pb-5 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-amber-500/20">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-tight">
                  Pre-Seeded Roles & Accounts
                </h2>
                <p className="text-xs text-slate-400">Click any card below to log in immediately</p>
              </div>
            </div>

            <span className="hidden sm:inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Password: password123</span>
            </span>
          </div>

          {/* 4 Click-To-Login Account Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {PRESEEDED_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              const isLoggingIn = loggingInAccount === acc.email;

              return (
                <button
                  key={acc.email}
                  onClick={() => handleInstantLogin(acc)}
                  disabled={isLoggingIn || loggingInAccount !== null}
                  className={`group text-left p-4 rounded-2xl border transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex flex-col justify-between ${acc.borderColor} ${acc.bgGlow} disabled:opacity-50`}
                >
                  <div>
                    {/* Top Row: Role Badge & Icon */}
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${acc.badgeBg}`}>
                        {acc.badge}
                      </span>
                      <Icon className={`w-4 h-4 ${acc.textColor} group-hover:scale-110 transition-transform`} />
                    </div>

                    {/* Name & Title */}
                    <div className="text-base font-black text-white mt-2.5 group-hover:text-indigo-200 transition-colors">
                      {acc.name}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                      {acc.role}
                    </div>

                    {/* Assigned Counter */}
                    <div className="text-[11px] text-slate-500 mt-2 truncate">
                      Desk: <span className="text-slate-300 font-semibold">{acc.counter}</span>
                    </div>
                  </div>

                  {/* Bottom Action Pill */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-slate-400">{acc.email}</span>
                    <span className={`font-bold flex items-center space-x-1 ${acc.textColor} group-hover:translate-x-0.5 transition-transform`}>
                      <span>{isLoggingIn ? 'Logging in...' : '1-Click Login'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Manual Login Accordion (Optional / Custom Credentials) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowManualForm(!showManualForm)}
            className="w-full px-6 py-3.5 flex items-center justify-between text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>Or Enter Custom Email & Password</span>
            {showManualForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showManualForm && (
            <div className="p-6 pt-2 border-t border-slate-800">
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="manager@domain.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In With Credentials'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Registration footer link */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Need to configure a new organization?{' '}
          <Link to="/register" className="font-bold text-indigo-400 hover:text-indigo-300 underline">
            Register New Manager Account
          </Link>
        </p>
      </div>
    </div>
  );
};
