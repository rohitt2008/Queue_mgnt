import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Ticket,
  User,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { api } from '../services/api';
import { Queue, Token } from '../types';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';

export const CustomerKiosk: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdToken, setCreatedToken] = useState<Token | null>(null);

  useEffect(() => {
    if (id) {
      api.getQueueById(id).then((res) => {
        if (res.success) setQueue(res.queue);
      });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !name.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.addToken(id, {
        customerName: name.trim(),
        customerPhone: phone.trim() || undefined,
        customerEmail: email.trim() || undefined,
        notes: notes.trim() || undefined,
        priority: 'NORMAL',
      });

      if (res.success) {
        setCreatedToken(res.token);
        sound.playChime();
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
      }
    } catch (e) {
      console.error('Failed to issue token at kiosk', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCreatedToken(null);
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
  };

  if (!queue) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="text-slate-400">Loading Kiosk Terminal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-radial-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg">
        {createdToken ? (
          /* TICKET RECEIPT SUCCESS VIEW */
          <div className="rounded-3xl p-8 sm:p-10 bg-slate-900 border border-emerald-500/40 shadow-2xl text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              Token Issued Successfully!
            </div>
            <h2 className="text-2xl font-black text-white mt-1">Please Take Your Ticket</h2>

            {/* Simulated Printed Ticket */}
            <div className="mt-6 p-6 rounded-2xl bg-slate-950 border border-slate-800 text-left relative">
              <div className="text-center pb-4 border-b border-dashed border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase">{queue.name}</div>
                <div className="text-5xl font-black text-white font-mono my-2 tracking-tight">
                  {createdToken.tokenNumber}
                </div>
                <div className="text-sm font-bold text-indigo-300">{createdToken.customerName}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Position in Line</span>
                  <span className="text-base font-black text-white font-mono">#{createdToken.position}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Estimated Wait</span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    ~{createdToken.position * queue.targetServiceTime} mins
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-6 max-w-xs mx-auto">
              Please watch the overhead TV screen. Your token number will be chimed when the counter is ready.
            </p>

            <button
              onClick={handleReset}
              className="mt-6 w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Issue Another Token</span>
            </button>
          </div>
        ) : (
          /* KIOSK FORM VIEW */
          <div className="rounded-3xl p-8 sm:p-10 bg-slate-900 border border-slate-800 shadow-2xl relative">
            <div className="text-center mb-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Self-Service Check-In</span>
              </div>
              <h1 className="text-3xl font-black text-white">{queue.name}</h1>
              <p className="text-xs text-slate-400 mt-1">
                Enter your name to join the queue and receive your token
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Your Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Mobile Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Receive SMS notification"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Purpose / Service Request (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Account opening, Prescription refill"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 py-4 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold text-base shadow-xl shadow-indigo-500/30 flex items-center justify-center space-x-2 transition-all transform active:scale-95 disabled:opacity-50"
              >
                <Ticket className="w-5 h-5" />
                <span>{submitting ? 'Generating Token...' : 'Get My Queue Token'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
