import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Tv,
  Clock,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Crown,
  Users,
  Radio,
} from 'lucide-react';
import { api } from '../services/api';
import { Queue, Token } from '../types';
import { sound } from '../utils/audio';
import { getSocket, joinQueueRoom, leaveQueueRoom } from '../services/socket';

export const LiveDisplayBoard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [servingToken, setServingToken] = useState<Token | null>(null);
  const [waitingTokens, setWaitingTokens] = useState<Token[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [flashCall, setFlashCall] = useState(false);

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    if (!id) return;
    try {
      const [queueRes, tokensRes] = await Promise.all([
        api.getQueueById(id),
        api.getQueueTokens(id),
      ]);

      if (queueRes.success) setQueue(queueRes.queue);
      if (tokensRes.success) {
        setServingToken(tokensRes.servingToken);
        setWaitingTokens(tokensRes.waitingTokens);
      }
    } catch (e) {
      console.error('Failed to load display board data', e);
    }
  };

  useEffect(() => {
    loadData();

    if (id) {
      joinQueueRoom(id);
      const socket = getSocket();

      const onTokenServed = (payload: any) => {
        loadData();
        sound.playChime();
        setFlashCall(true);
        setTimeout(() => setFlashCall(false), 3000);
      };

      const onChange = () => loadData();

      socket.on('token_served', onTokenServed);
      socket.on('token_added', onChange);
      socket.on('tokens_reordered', onChange);
      socket.on('token_completed', onChange);
      socket.on('token_cancelled', onChange);

      return () => {
        leaveQueueRoom(id);
        socket.off('token_served', onTokenServed);
        socket.off('token_added', onChange);
        socket.off('tokens_reordered', onChange);
        socket.off('token_completed', onChange);
        socket.off('token_cancelled', onChange);
      };
    }
  }, [id]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    sound.setMuted(next);
    setIsMuted(next);
  };

  if (!queue) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <Tv className="w-12 h-12 text-indigo-400 animate-pulse mx-auto mb-3" />
          <h2 className="text-xl font-bold">Connecting to Live Display Board...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070A11] text-white flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Top TV Header Bar */}
      <header className="flex items-center justify-between pb-6 border-b border-slate-800/80">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Tv className="w-6 h-6 text-white" />
          </div>
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
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Official Queue Board
              </span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mt-0.5">
              {queue.name}
            </h1>
          </div>
        </div>

        {/* Live Clock & Fullscreen Controls */}
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-300">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Body: Left Massive NOW SERVING Box, Right UPCOMING TOKENS */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 flex-1 items-stretch">
        {/* Left: Huge NOW SERVING Hero Display (Col 7) */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div
            className={`h-full rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950 border transition-all duration-500 flex flex-col justify-between shadow-2xl relative overflow-hidden ${
              flashCall
                ? 'border-emerald-400 ring-8 ring-emerald-500/30 scale-[1.01]'
                : 'border-indigo-500/40'
            }`}
          >
            {/* Top Indicator */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black text-sm uppercase tracking-widest">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <span>Now Serving at Counter</span>
              </div>

              <div className="px-5 py-2 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-lg font-black font-mono">
                {queue.counterName}
              </div>
            </div>

            {/* Huge Center Token Display */}
            {servingToken ? (
              <div className="my-10 text-center">
                <div className="text-[7rem] sm:text-[9rem] font-black font-mono leading-none tracking-tight bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent drop-shadow-2xl">
                  {servingToken.tokenNumber}
                </div>

                <div className="text-3xl sm:text-4xl font-extrabold text-white mt-4 tracking-tight">
                  {servingToken.customerName}
                </div>

                {servingToken.priority === 'VIP' && (
                  <div className="inline-flex items-center space-x-2 mt-4 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-sm font-black uppercase tracking-wider">
                    <Crown className="w-4 h-4" />
                    <span>VIP Priority Guest</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="my-16 text-center">
                <div className="text-4xl sm:text-5xl font-black text-slate-500 tracking-tight">
                  COUNTER IDLE
                </div>
                <p className="text-lg text-slate-500 mt-2 font-medium">
                  Please wait for the next token call
                </p>
              </div>
            )}

            {/* Bottom Status bar */}
            <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between text-slate-400 text-sm font-semibold">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Audio Call Chimes Enabled</span>
              </div>
              <div>Counter Service Desk</div>
            </div>
          </div>
        </div>

        {/* Right: Upcoming Tokens in Line (Col 5) */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div className="h-full rounded-3xl p-6 sm:p-8 bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">
                    Upcoming in Line
                  </h3>
                </div>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                  {waitingTokens.length} Waiting
                </span>
              </div>

              {/* List of next tokens */}
              <div className="mt-5 space-y-3">
                {waitingTokens.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 text-sm italic">
                    No customers currently waiting in line.
                  </div>
                ) : (
                  waitingTokens.slice(0, 6).map((token, idx) => (
                    <div
                      key={token.id}
                      className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                        idx === 0
                          ? 'bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border-amber-500/40 shadow-md'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                            idx === 0
                              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                              : 'bg-slate-900 border border-slate-800 text-slate-300'
                          }`}
                        >
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="font-mono font-black text-lg text-white">
                            {token.tokenNumber}
                          </div>
                          <div className="text-xs font-bold text-slate-300">
                            {token.customerName}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {token.priority === 'VIP' ? (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            VIP
                          </span>
                        ) : idx === 0 ? (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            NEXT
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-slate-500">
                            ~{(idx + 1) * queue.targetServiceTime}m est
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Target Service Time footer */}
            <div className="pt-4 border-t border-slate-800/80 text-center text-xs text-slate-500 font-semibold">
              Average Target Service Time: {queue.targetServiceTime} minutes per counter session
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Ticker Notification */}
      <footer className="py-3 px-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-slate-300">
            Please watch the display screen and proceed to the counter when your token number is chimed.
          </span>
        </div>
        <div className="font-bold text-indigo-400">QFlow Display Engine v2.5</div>
      </footer>
    </div>
  );
};
