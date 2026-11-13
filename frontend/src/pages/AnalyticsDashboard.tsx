import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  Layers,
  Sparkles,
  Zap,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import { api } from '../services/api';
import { AnalyticsData, Queue } from '../types';
import { useToast } from '../context/ToastContext';

export const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<string>('today');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [analyticsRes, queuesRes] = await Promise.all([
        api.getAnalytics(selectedQueue === 'all' ? undefined : selectedQueue, timeframe),
        api.getQueues(),
      ]);

      if (analyticsRes.success) {
        setData(analyticsRes as any);
      }
      if (queuesRes.success) {
        setQueues(queuesRes.queues);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [selectedQueue, timeframe]);

  // Export CSV Report
  const handleExportCSV = () => {
    if (!data) return;
    const summary = data.summary;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Metric,Value\n' +
      `Total Tokens Created,${summary.totalCreated}\n` +
      `Completed Tokens,${summary.completedCount}\n` +
      `Active Waiting,${summary.activeWaiting}\n` +
      `Currently Serving,${summary.activeServing}\n` +
      `Cancelled Tokens,${summary.cancelledCount}\n` +
      `Average Wait Time (Mins),${summary.avgWaitMinutes}\n` +
      `Average Service Time (Mins),${summary.avgServiceMinutes}\n` +
      `Cancellation Rate (%),${summary.cancellationRate}%\n` +
      `Completion Rate (%),${summary.completionRate}%\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `qflow_analytics_${timeframe}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Analytics summary exported to CSV', 'success');
  };

  const summary = data?.summary;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Service Intelligence & Queue Trends</span>
          </div>
          <h1 className="text-3xl font-black text-white">Operations & Wait Time Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time telemetry on customer waiting durations, arrival surges, and desk throughput
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Queue selector */}
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold">
            <Layers className="w-4 h-4 text-indigo-400" />
            <select
              value={selectedQueue}
              onChange={(e) => setSelectedQueue(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Queues</option>
              {queues.map((q) => (
                <option key={q.id} value={q.id} className="bg-slate-900">
                  {q.name} ({q.prefix})
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
            {[
              { label: 'Today', value: 'today' },
              { label: '7 Days', value: '7days' },
              { label: '30 Days', value: '30days' },
              { label: 'All Time', value: 'all' },
            ].map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === tf.value
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-3xl bg-slate-900/60 border border-slate-800" />
          ))}
        </div>
      ) : summary ? (
        <>
          {/* Key KPI Metric Cards (6 Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {/* Card 1: Total Volume */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/40 shadow-xl transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Total Tokens</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-3xl font-black text-white mt-2 font-mono">
                {summary.totalCreated}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-medium">In selected timeframe</div>
            </div>

            {/* Card 2: Completed Service */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/40 shadow-xl transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Completed</span>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-emerald-400 mt-2 font-mono">
                {summary.completedCount}
              </div>
              <div className="text-[11px] text-emerald-400/80 mt-1 font-semibold">
                {summary.completionRate}% completion
              </div>
            </div>

            {/* Card 3: Avg Wait Time */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/40 shadow-xl transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Avg Wait Time</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-black text-amber-400 mt-2 font-mono">
                {summary.avgWaitMinutes}
                <span className="text-xs text-slate-400 font-sans ml-1 font-normal">min</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-medium">
                {Math.round(summary.avgWaitSeconds)} seconds total
              </div>
            </div>

            {/* Card 4: Avg Service Time */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 hover:border-purple-500/40 shadow-xl transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Avg Service Time</span>
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-3xl font-black text-purple-400 mt-2 font-mono">
                {summary.avgServiceMinutes}
                <span className="text-xs text-slate-400 font-sans ml-1 font-normal">min</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-medium">Desk interaction speed</div>
            </div>

            {/* Card 5: Active Waiting */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 hover:border-blue-500/40 shadow-xl transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Active Queue</span>
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-3xl font-black text-blue-400 mt-2 font-mono">
                {summary.activeWaiting}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-medium">
                {summary.activeServing} currently at counter
              </div>
            </div>

            {/* Card 6: Cancellation Rate */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 hover:border-rose-500/40 shadow-xl transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span>Cancellation</span>
                <XCircle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-3xl font-black text-rose-400 mt-2 font-mono">
                {summary.cancellationRate}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-medium">
                {summary.cancelledCount} tokens dropped
              </div>
            </div>
          </div>

          {/* Charts Row 1: Hourly Surge & Wait Times */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Chart 1: Hourly Surge Trends */}
            <div className="rounded-3xl p-6 bg-slate-900/90 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    <span>Hourly Influx & Service Throughput</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Tokens arrived vs tokens completed per hour</p>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.hourlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="arrived" name="Tokens Arrived" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="served" name="Tokens Served" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Average Wait Time Trend by Hour */}
            <div className="rounded-3xl p-6 bg-slate-900/90 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Average Wait Duration Curve (Minutes)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Time customers waited in line before being served</p>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.hourlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="waitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="m" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgWaitMinutes"
                      name="Avg Wait (Minutes)"
                      stroke="#F59E0B"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#waitGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2: Priority Distribution & Status Breakdown & Multi-queue Benchmark */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Chart 3: Priority Donut */}
            <div className="rounded-3xl p-6 bg-slate-900/90 border border-slate-800 shadow-xl">
              <h3 className="text-base font-bold text-white mb-1">Customer Priority Mix</h3>
              <p className="text-xs text-slate-400 mb-4">Distribution of VIP, Priority & Standard tickets</p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Status Breakdown */}
            <div className="rounded-3xl p-6 bg-slate-900/90 border border-slate-800 shadow-xl">
              <h3 className="text-base font-bold text-white mb-1">Token Status Resolution</h3>
              <p className="text-xs text-slate-400 mb-4">Completed vs Waiting vs Dropped tickets</p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={data.statusData}
                    margin={{ top: 10, right: 10, left: 15, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
                      {data.statusData.map((entry, index) => (
                        <Cell key={`cell-status-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 5: Multi-Queue Performance Comparison */}
            <div className="rounded-3xl p-6 bg-slate-900/90 border border-slate-800 shadow-xl">
              <h3 className="text-base font-bold text-white mb-1">Desk Benchmark</h3>
              <p className="text-xs text-slate-400 mb-4">Wait times & completed volume by queue</p>

              <div className="space-y-3 mt-4">
                {data.queueComparison.map((q) => (
                  <div
                    key={q.id}
                    className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: q.color }}
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{q.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {q.waiting} waiting · {q.completed} served
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-amber-400 font-mono">
                        {q.avgWaitMinutes}m avg
                      </div>
                      <div className="text-[10px] text-slate-500">Wait Duration</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
