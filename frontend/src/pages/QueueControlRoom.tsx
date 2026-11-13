import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  Tv,
  ExternalLink,
  Crown,
  AlertTriangle,
  Sparkles,
  Volume2,
  RefreshCw,
  Search,
  Check,
  X,
  History,
} from 'lucide-react';
import { api } from '../services/api';
import { Queue, Token, Priority } from '../types';
import { useToast } from '../context/ToastContext';
import { sound } from '../utils/audio';
import { getSocket, joinQueueRoom, leaveQueueRoom } from '../services/socket';
import confetti from 'canvas-confetti';

export const QueueControlRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [waitingTokens, setWaitingTokens] = useState<Token[]>([]);
  const [servingToken, setServingToken] = useState<Token | null>(null);
  const [historyTokens, setHistoryTokens] = useState<Token[]>([]);
  const [activeTab, setActiveTab] = useState<'waiting' | 'history'>('waiting');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchToken, setSearchToken] = useState('');
  const { showToast } = useToast();

  // Add Token Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [notes, setNotes] = useState('');
  const [submittingToken, setSubmittingToken] = useState(false);

  // Cancel Token Modal State
  const [cancelModalToken, setCancelModalToken] = useState<Token | null>(null);
  const [cancelReason, setCancelReason] = useState('Customer No-Show');

  // Live Timer tick
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadQueueData = async () => {
    if (!id) return;
    try {
      const [queueRes, tokensRes] = await Promise.all([
        api.getQueueById(id),
        api.getQueueTokens(id),
      ]);

      if (queueRes.success) {
        setQueue(queueRes.queue);
      }
      if (tokensRes.success) {
        setWaitingTokens(tokensRes.waitingTokens);
        setServingToken(tokensRes.servingToken);
        setHistoryTokens(tokensRes.tokens.filter((t) => t.status === 'COMPLETED' || t.status === 'CANCELLED'));
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load queue details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueueData();

    if (id) {
      joinQueueRoom(id);
      const socket = getSocket();

      const onTokenAdded = () => {
        loadQueueData();
        sound.playBlip();
      };

      const onTokensReordered = () => {
        loadQueueData();
      };

      const onTokenServed = () => {
        loadQueueData();
        sound.playChime();
      };

      const onTokenCompleted = () => {
        loadQueueData();
      };

      const onTokenCancelled = () => {
        loadQueueData();
      };

      socket.on('token_added', onTokenAdded);
      socket.on('tokens_reordered', onTokensReordered);
      socket.on('token_served', onTokenServed);
      socket.on('token_completed', onTokenCompleted);
      socket.on('token_cancelled', onTokenCancelled);

      return () => {
        leaveQueueRoom(id);
        socket.off('token_added', onTokenAdded);
        socket.off('tokens_reordered', onTokensReordered);
        socket.off('token_served', onTokenServed);
        socket.off('token_completed', onTokenCompleted);
        socket.off('token_cancelled', onTokenCancelled);
      };
    }
  }, [id]);

  // Req 3: Manager can add new persons / tokens into the queue
  const handleAddToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !customerName.trim()) {
      showToast('Customer name is required', 'error');
      return;
    }

    setSubmittingToken(true);
    try {
      const res = await api.addToken(id, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        priority,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        showToast(`Token ${res.token.tokenNumber} issued to ${res.token.customerName}!`, 'success');
        sound.playBlip();
        setShowAddModal(false);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setPriority('NORMAL');
        setNotes('');
        loadQueueData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create token', 'error');
    } finally {
      setSubmittingToken(false);
    }
  };

  // Req 5: Manager can move tokens up and down in the queue
  const handleMoveToken = async (tokenId: string, direction: 'up' | 'down') => {
    try {
      sound.playBlip();
      const res = await api.moveToken(tokenId, direction);
      if (res.success) {
        setWaitingTokens(res.tokens);
        showToast(`Token moved ${direction}`, 'info');
      }
    } catch (err: any) {
      showToast(err.message || `Failed to move token ${direction}`, 'error');
    }
  };

  // Req 6: Manager can assign the token at the top of the queue for service [With a simple button click]
  const handleServeTopToken = async () => {
    if (!id) return;
    if (waitingTokens.length === 0) {
      showToast('No waiting tokens in the queue to serve', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.serveTopToken(id, true);
      if (res.success) {
        sound.playChime();
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        showToast(
          `🛎️ Now Serving: ${res.servedToken.tokenNumber} - ${res.servedToken.customerName}!`,
          'success'
        );
        loadQueueData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to serve top token', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Complete service for currently serving token
  const handleCompleteService = async () => {
    if (!servingToken) return;
    setActionLoading(true);
    try {
      const res = await api.completeToken(servingToken.id);
      if (res.success) {
        sound.playBlip();
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        showToast(`Token ${servingToken.tokenNumber} service completed!`, 'success');
        loadQueueData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to complete token', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Req 7: Manager can cancel a token from the queue
  const handleConfirmCancel = async () => {
    if (!cancelModalToken) return;
    try {
      const res = await api.cancelToken(cancelModalToken.id, cancelReason);
      if (res.success) {
        sound.playCancel();
        showToast(`Token ${cancelModalToken.tokenNumber} cancelled`, 'info');
        setCancelModalToken(null);
        loadQueueData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel token', 'error');
    }
  };

  // Format elapsed time string
  const formatDuration = (startIso?: string | null) => {
    if (!startIso) return '0s';
    const elapsedSec = Math.max(0, Math.floor((currentTime - new Date(startIso).getTime()) / 1000));
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const filteredWaiting = waitingTokens.filter((t) =>
    t.customerName.toLowerCase().includes(searchToken.toLowerCase()) ||
    t.tokenNumber.toLowerCase().includes(searchToken.toLowerCase()) ||
    (t.notes && t.notes.toLowerCase().includes(searchToken.toLowerCase()))
  );

  if (loading || !queue) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading queue operations console...</p>
      </div>
    );
  }

  const topWaitingToken = waitingTokens[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <Link
            to="/"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span
                className="px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wider uppercase font-mono"
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
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              {queue.name}
            </h1>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Link
            to={`/display/${queue.id}`}
            target="_blank"
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center space-x-1.5 transition-all"
          >
            <Tv className="w-4 h-4 text-indigo-400" />
            <span>TV Display</span>
          </Link>

          <Link
            to={`/kiosk/${queue.id}`}
            target="_blank"
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center space-x-1.5 transition-all"
          >
            <ExternalLink className="w-4 h-4 text-purple-400" />
            <span>Kiosk</span>
          </Link>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center space-x-1.5 transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Token</span>
          </button>
        </div>
      </div>

      {/* Grid: Left Column (Now Serving & Top Action), Right Column (Waiting List & Controls) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Serving Station & Top Dispenser */}
        <div className="lg:col-span-1 space-y-6">
          {/* NOW SERVING HERO CARD */}
          <div className="relative rounded-3xl p-6 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-indigo-500/30 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${servingToken ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Counter Service Station
                </span>
              </div>
              <span className="text-xs font-bold text-purple-400 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                {queue.counterName}
              </span>
            </div>

            {servingToken ? (
              <div className="mt-5 text-center">
                <div className="inline-block px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-2">
                  CURRENTLY IN SERVICE
                </div>

                <div className="text-5xl font-black text-white font-mono tracking-tight my-2 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  {servingToken.tokenNumber}
                </div>

                <div className="text-lg font-bold text-white mt-1">
                  {servingToken.customerName}
                </div>

                {servingToken.customerPhone && (
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center justify-center space-x-1">
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span>{servingToken.customerPhone}</span>
                  </div>
                )}

                {servingToken.notes && (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 italic text-left">
                    "{servingToken.notes}"
                  </div>
                )}

                {/* Live Service Duration Timer */}
                <div className="mt-4 p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Service Time</span>
                  </div>
                  <div className="text-sm font-black text-emerald-400 font-mono">
                    {formatDuration(servingToken.servedAt)}
                  </div>
                </div>

                {/* Complete Service Button */}
                <button
                  onClick={handleCompleteService}
                  disabled={actionLoading}
                  className="w-full mt-4 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-center space-x-2 transition-all transform active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Mark Service Completed</span>
                </button>
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mx-auto mb-3 text-slate-500">
                  <User className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-200">Counter is Idle</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Click the button below to assign the next waiting customer to this counter.
                </p>
              </div>
            )}
          </div>

          {/* REQ 6: ONE-CLICK SERVE TOP TOKEN BUTTON */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-indigo-950/80 via-purple-950/60 to-slate-900 border border-indigo-500/30 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Next Dispatch</span>
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {waitingTokens.length} waiting
              </span>
            </div>

            {topWaitingToken ? (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/20 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Next in Line (#1)
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Waiting {formatDuration(topWaitingToken.createdAt)}
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-mono mt-2">
                  {topWaitingToken.tokenNumber}
                </div>
                <div className="text-sm font-semibold text-slate-200 mt-0.5">
                  {topWaitingToken.customerName}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 text-center text-xs text-slate-500 italic mb-4">
                No tokens currently waiting in queue
              </div>
            )}

            {/* THE ONE-CLICK BUTTON (Requirement 6) */}
            <button
              onClick={handleServeTopToken}
              disabled={actionLoading || waitingTokens.length === 0}
              className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold text-base shadow-xl shadow-indigo-500/30 flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Assign Top Token For Service</span>
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2 font-medium">
              Calls top token #1, moves to service, and shifts queue up
            </p>
          </div>
        </div>

        {/* Right Column: Waiting List with Move Up/Down and Cancel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header tabs & search */}
          <div className="rounded-3xl p-6 bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              {/* Tab selector */}
              <div className="flex items-center space-x-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
                <button
                  onClick={() => setActiveTab('waiting')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'waiting'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Waiting Tokens ({waitingTokens.length})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                    activeTab === 'history'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Completed & Logs ({historyTokens.length})</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchToken}
                  onChange={(e) => setSearchToken(e.target.value)}
                  placeholder="Filter customer or token..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* TAB CONTENT: WAITING LIST (Requirements 4, 5, 7) */}
            {activeTab === 'waiting' ? (
              <div className="mt-4">
                {filteredWaiting.length === 0 ? (
                  <div className="py-16 text-center">
                    <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-200">No Customers Waiting</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      All tokens have been served or the queue is currently clear.
                    </p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center space-x-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Customer to Queue</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredWaiting.map((token, index) => {
                      const isFirst = token.position === 1;
                      const isLast = token.position === waitingTokens.length;

                      // Priority styling
                      const isVIP = token.priority === 'VIP';
                      const isPriority = token.priority === 'PRIORITY';

                      return (
                        <div
                          key={token.id}
                          className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            isFirst
                              ? 'bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                              : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          {/* Left: Position & Token info */}
                          <div className="flex items-center space-x-4">
                            {/* Position Badge */}
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-md ${
                                isFirst
                                  ? 'bg-gradient-to-tr from-amber-400 to-yellow-600 text-black shadow-amber-500/20'
                                  : 'bg-slate-900 border border-slate-700 text-slate-300'
                              }`}
                            >
                              #{token.position}
                            </div>

                            {/* Token Number & Customer */}
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-base font-black text-white font-mono tracking-tight">
                                  {token.tokenNumber}
                                </span>
                                {isVIP && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-gradient-to-r from-amber-400 to-yellow-500 text-black flex items-center space-x-1 shadow-sm">
                                    <Crown className="w-2.5 h-2.5" />
                                    <span>VIP</span>
                                  </span>
                                )}
                                {isPriority && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                                    PRIORITY
                                  </span>
                                )}
                              </div>

                              <div className="text-sm font-bold text-slate-200 mt-0.5">
                                {token.customerName}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
                                {token.customerPhone && (
                                  <span className="flex items-center space-x-1">
                                    <Phone className="w-3 h-3 text-slate-500" />
                                    <span>{token.customerPhone}</span>
                                  </span>
                                )}
                                <span className="flex items-center space-x-1 text-slate-400">
                                  <Clock className="w-3 h-3 text-indigo-400" />
                                  <span>Wait: {formatDuration(token.createdAt)}</span>
                                </span>
                              </div>

                              {token.notes && (
                                <div className="text-[11px] text-slate-400 italic mt-1 bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-800/80 inline-block">
                                  Note: {token.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Actions (Move Up, Move Down, Cancel) */}
                          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                            {/* REQ 5: MOVE UP BUTTON */}
                            <button
                              onClick={() => handleMoveToken(token.id, 'up')}
                              disabled={isFirst}
                              title="Move Token Up in Queue"
                              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-indigo-600 hover:border-indigo-500 transition-all disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>

                            {/* REQ 5: MOVE DOWN BUTTON */}
                            <button
                              onClick={() => handleMoveToken(token.id, 'down')}
                              disabled={isLast}
                              title="Move Token Down in Queue"
                              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-indigo-600 hover:border-indigo-500 transition-all disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>

                            {/* REQ 7: CANCEL TOKEN BUTTON */}
                            <button
                              onClick={() => setCancelModalToken(token)}
                              title="Cancel Token from Queue"
                              className="px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 text-xs font-semibold flex items-center space-x-1 transition-all"
                            >
                              <XCircle className="w-4 h-4" />
                              <span className="hidden sm:inline">Cancel</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* TAB CONTENT: HISTORY & LOGS */
              <div className="mt-4">
                {historyTokens.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 italic">
                    No historical or completed tokens recorded yet for this session.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {historyTokens.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-mono font-bold text-white text-sm">
                            {t.tokenNumber}
                          </span>
                          <div>
                            <div className="font-bold text-slate-200">{t.customerName}</div>
                            <div className="text-[11px] text-slate-400">
                              {t.status === 'COMPLETED' ? (
                                <span className="text-emerald-400">
                                  Served ({Math.round((t.serviceTimeSeconds || 0) / 60)}m service)
                                </span>
                              ) : (
                                <span className="text-rose-400">
                                  Cancelled ({t.cancellationReason || 'Manager cancelled'})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                            t.status === 'COMPLETED'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REQ 3: ADD NEW PERSON / TOKEN MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-7 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Generate Token</h3>
                  <p className="text-xs text-slate-400">Add person to {queue.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddToken} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Customer / Person Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Jessica Alba"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Priority Tier
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority('NORMAL')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      priority === 'NORMAL'
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('PRIORITY')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      priority === 'PRIORITY'
                        ? 'bg-pink-600/30 border-pink-500 text-pink-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Urgent
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('VIP')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      priority === 'VIP'
                        ? 'bg-amber-600/30 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    👑 VIP
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Service Notes / Purpose (Optional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Specific request or documents to review..."
                    rows={2}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingToken}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50"
                >
                  {submittingToken ? 'Generating...' : 'Issue Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQ 7: CANCEL TOKEN CONFIRMATION MODAL */}
      {cancelModalToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white text-center">
              Cancel Token {cancelModalToken.tokenNumber}?
            </h3>
            <p className="text-xs text-slate-400 text-center mt-1">
              Customer: <span className="text-slate-200 font-semibold">{cancelModalToken.customerName}</span> (Position #{cancelModalToken.position})
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Cancellation Reason
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="Customer No-Show">Customer No-Show / Departed</option>
                <option value="Customer Requested Reschedule">Customer Requested Reschedule</option>
                <option value="Duplicate Token Issued">Duplicate Token Issued</option>
                <option value="Shift Ended">Shift Ended / Counter Closing</option>
                <option value="Other">Other Reason</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={() => setCancelModalToken(null)}
                className="py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Keep Token
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
