import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Layers,
  Users,
  Clock,
  CheckCircle,
  Tv,
  ArrowRight,
  Sparkles,
  Search,
  Trash2,
  X,
  ExternalLink,
  Shield,
  Activity,
  Zap,
  Crown,
  Headphones,
} from 'lucide-react';
import { api } from '../services/api';
import { Queue } from '../types';
import { useToast } from '../context/ToastContext';
import { sound } from '../utils/audio';
import { getSocket } from '../services/socket';
import confetti from 'canvas-confetti';

const COLOR_OPTIONS = [
  { label: 'Electric Indigo', hex: '#6366F1', bg: 'bg-indigo-500', border: 'border-indigo-500' },
  { label: 'Royal Violet', hex: '#8B5CF6', bg: 'bg-purple-500', border: 'border-purple-500' },
  { label: 'Emerald Mint', hex: '#10B981', bg: 'bg-emerald-500', border: 'border-emerald-500' },
  { label: 'Sunset Amber', hex: '#F59E0B', bg: 'bg-amber-500', border: 'border-amber-500' },
  { label: 'Neon Rose', hex: '#EC4899', bg: 'bg-pink-500', border: 'border-pink-500' },
  { label: 'Cyan Sky', hex: '#06B6D4', bg: 'bg-cyan-500', border: 'border-cyan-500' },
];

export const QueuesDashboard: React.FC = () => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { showToast } = useToast();

  // New Queue Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prefix, setPrefix] = useState('');
  const [counterName, setCounterName] = useState('Counter 1');
  const [targetServiceTime, setTargetServiceTime] = useState(5);
  const [selectedColor, setSelectedColor] = useState('#6366F1');
  const [selectedIcon, setSelectedIcon] = useState('users');
  const [submitting, setSubmitting] = useState(false);

  const fetchQueues = async () => {
    try {
      const res = await api.getQueues();
      if (res.success) {
        setQueues(res.queues);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load queues', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();

    // Listen to real-time events across all queues
    const socket = getSocket();
    const handleOverviewChange = () => {
      fetchQueues();
    };

    socket.on('queue_overview_change', handleOverviewChange);
    return () => {
      socket.off('queue_overview_change', handleOverviewChange);
    };
  }, []);

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Queue name is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createQueue({
        name: name.trim(),
        description: description.trim(),
        prefix: (prefix || name.substring(0, 3)).toUpperCase(),
        counterName: counterName.trim() || 'Counter 1',
        targetServiceTime: Number(targetServiceTime) || 5,
        color: selectedColor,
        icon: selectedIcon,
      });

      if (res.success) {
        showToast(`Queue "${res.queue.name}" created successfully!`, 'success');
        sound.playBlip();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        setShowCreateModal(false);
        // Reset form
        setName('');
        setDescription('');
        setPrefix('');
        setCounterName('Counter 1');
        setTargetServiceTime(5);
        fetchQueues();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create queue', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQueue = async (id: string, queueName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${queueName}" and all its tokens?`)) {
      return;
    }

    try {
      await api.deleteQueue(id);
      showToast(`Queue "${queueName}" deleted`, 'info');
      sound.playCancel();
      setQueues((prev) => prev.filter((q) => q.id !== id));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete queue', 'error');
    }
  };

  const filteredQueues = queues.filter((q) =>
    q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.prefix.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.counterName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Overall totals
  const totalWaiting = queues.reduce((sum, q) => sum + (q.stats?.waitingCount || 0), 0);
  const totalServing = queues.reduce((sum, q) => sum + (q.stats?.servingCount || 0), 0);
  const totalCompletedToday = queues.reduce((sum, q) => sum + (q.stats?.completedTodayCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner & KPI summary */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-slate-900/90 border border-indigo-500/20 shadow-2xl overflow-hidden mb-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time Token Orchestration</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Queue Control Hub
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Monitor active counters, manage tokens in sequence, and route customers effortlessly with real-time sync.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/30 flex items-center space-x-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Queue</span>
            </button>
          </div>
        </div>

        {/* Global KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Active Queues</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">{queues.length}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Waiting in Line</span>
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">{totalWaiting}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>Currently Serving</span>
            </div>
            <div className="text-2xl font-black text-purple-400 mt-1">{totalServing}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Served Today</span>
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{totalCompletedToday}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search queues by name, prefix or counter..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="text-xs font-semibold text-slate-400">
          Showing <span className="text-indigo-400 font-bold">{filteredQueues.length}</span> of {queues.length} queues
        </div>
      </div>

      {/* Queues Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : filteredQueues.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-200">No queues found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Try adjusting your search criteria' : 'Create your first service queue to start managing tokens!'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all"
            >
              + Create First Queue
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQueues.map((queue) => {
            const waitingCount = queue.stats?.waitingCount || 0;
            const serving = queue.currentServing;
            const estWait = queue.stats?.estimatedWaitTimeMinutes || 0;

            return (
              <div
                key={queue.id}
                className="group relative rounded-3xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
                style={{
                  borderTop: `4px solid ${queue.color || '#6366F1'}`,
                }}
              >
                {/* Header info */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className="px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wider uppercase"
                          style={{
                            backgroundColor: `${queue.color}25`,
                            color: queue.color,
                            border: `1px solid ${queue.color}40`,
                          }}
                        >
                          {queue.prefix}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {queue.counterName}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white mt-2 group-hover:text-indigo-300 transition-colors">
                        {queue.name}
                      </h3>
                      {queue.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                          {queue.description}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteQueue(queue.id, queue.name)}
                      title="Delete Queue"
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Status Box: Serving now */}
                  <div className="mt-5 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                    <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between uppercase tracking-wider mb-1">
                      <span className="flex items-center space-x-1.5">
                        <span className={`w-2 h-2 rounded-full ${serving ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                        <span>Now Serving</span>
                      </span>
                      {serving && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    {serving ? (
                      <div className="flex items-center justify-between mt-1">
                        <div>
                          <div className="text-lg font-black text-white font-mono">
                            {serving.tokenNumber}
                          </div>
                          <div className="text-xs text-slate-300 font-medium truncate max-w-[170px]">
                            {serving.customerName}
                          </div>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {serving.priority}
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic py-1">
                        Counter is currently idle (No token in service)
                      </div>
                    )}
                  </div>

                  {/* Key Metrics row */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Waiting in Line
                      </div>
                      <div className="text-xl font-black text-amber-400 mt-0.5">
                        {waitingCount} <span className="text-xs text-slate-500 font-normal">people</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Est. Wait
                      </div>
                      <div className="text-xl font-black text-indigo-400 mt-0.5">
                        {estWait} <span className="text-xs text-slate-500 font-normal">mins</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Links */}
                <div className="p-4 pt-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    <Link
                      to={`/display/${queue.id}`}
                      target="_blank"
                      title="Open Live Public Display Board (for TV / Monitor)"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center space-x-1 transition-all"
                    >
                      <Tv className="w-3.5 h-3.5 text-indigo-400" />
                      <span>TV</span>
                    </Link>

                    <Link
                      to={`/kiosk/${queue.id}`}
                      target="_blank"
                      title="Open Self-Service Customer Kiosk"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center space-x-1 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                      <span>Kiosk</span>
                    </Link>
                  </div>

                  <Link
                    to={`/queue/${queue.id}`}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center space-x-1.5 transition-all group-hover:scale-105"
                  >
                    <span>Manage Tokens</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Queue Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-7 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/30">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Create New Queue</h3>
                  <p className="text-xs text-slate-400">Configure counter and token prefix settings</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQueue} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Queue Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. VIP Consultation, Tech Support, Billing"
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Token Prefix (Max 4 Chars)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                    placeholder="e.g. VIP, CS, BIL"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 font-mono font-bold uppercase"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Tokens will be {prefix || 'Q'}-001, {prefix || 'Q'}-002...</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Counter / Desk Name
                  </label>
                  <input
                    type="text"
                    value={counterName}
                    onChange={(e) => setCounterName(e.target.value)}
                    placeholder="e.g. Desk 1, Window A"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Service Time (Minutes per Token)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={targetServiceTime}
                  onChange={(e) => setTargetServiceTime(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Used to compute live estimated wait times for customers.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe what services are performed at this queue..."
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Accent Color Theme
                </label>
                <div className="flex items-center space-x-3">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setSelectedColor(c.hex)}
                      className={`w-8 h-8 rounded-full transition-all transform ${
                        selectedColor === c.hex
                          ? 'ring-4 ring-white/40 scale-110 shadow-lg'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

