export type Priority = 'NORMAL' | 'PRIORITY' | 'VIP';
export type TokenStatus = 'WAITING' | 'SERVING' | 'COMPLETED' | 'CANCELLED';
export type QueueStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'MANAGER' | 'STAFF' | 'ADMIN';
  createdAt: string;
}

export interface Token {
  id: string;
  tokenNumber: string;
  sequenceNumber: number;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  priority: Priority;
  notes?: string | null;
  status: TokenStatus;
  position: number;
  cancellationReason?: string | null;
  counterName?: string | null;
  servedById?: string | null;
  queueId: string;
  createdAt: string;
  servedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  waitTimeSeconds?: number | null;
  serviceTimeSeconds?: number | null;
  queue?: Queue;
  servedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface Queue {
  id: string;
  name: string;
  description?: string | null;
  prefix: string;
  color: string;
  icon: string;
  status: QueueStatus;
  targetServiceTime: number; // in minutes
  counterName: string;
  managerId: string;
  manager?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  stats?: {
    waitingCount: number;
    servingCount: number;
    completedTodayCount: number;
    completedCount?: number;
    cancelledCount?: number;
    estimatedWaitTimeMinutes: number;
  };
  currentServing?: Token | null;
}

export interface AnalyticsSummary {
  totalCreated: number;
  completedCount: number;
  cancelledCount: number;
  activeWaiting: number;
  activeServing: number;
  avgWaitSeconds: number;
  avgWaitMinutes: number;
  avgServiceSeconds: number;
  avgServiceMinutes: number;
  cancellationRate: number;
  completionRate: number;
}

export interface HourlyData {
  hour: string;
  arrived: number;
  served: number;
  avgWaitMinutes: number;
}

export interface DailyData {
  date: string;
  waiting: number;
  completed: number;
  cancelled: number;
}

export interface ChartItem {
  name: string;
  value: number;
  color: string;
}

export interface QueueComparison {
  id: string;
  name: string;
  prefix: string;
  color: string;
  waiting: number;
  completed: number;
  avgWaitMinutes: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  hourlyTrend: HourlyData[];
  dailyTrend: DailyData[];
  priorityData: ChartItem[];
  statusData: ChartItem[];
  queueComparison: QueueComparison[];
}

