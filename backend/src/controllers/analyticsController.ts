import { Response } from 'express';
import prisma from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export const getQueueAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const queueId = req.params.queueId as string | undefined;
    const timeframe = (req.query.timeframe as string) || 'today';

    // Build date filter
    const now = new Date();
    let startDate: Date | undefined;

    if (timeframe === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (timeframe === '7days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === '30days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const whereBase: any = {};
    if (queueId && queueId !== 'all') {
      whereBase.queueId = queueId;
    }
    if (startDate) {
      whereBase.createdAt = { gte: startDate };
    }

    // Fetch all tokens matching the filter
    const tokens = await prisma.token.findMany({
      where: whereBase,
      include: {
        queue: {
          select: { id: true, name: true, prefix: true, color: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Also get active queue counts
    const activeWaitingWhere: any = { status: 'WAITING' };
    if (queueId && queueId !== 'all') {
      activeWaitingWhere.queueId = queueId;
    }
    const activeWaiting = await prisma.token.count({
      where: activeWaitingWhere,
    });

    const activeServingWhere: any = { status: 'SERVING' };
    if (queueId && queueId !== 'all') {
      activeServingWhere.queueId = queueId;
    }
    const activeServing = await prisma.token.count({
      where: activeServingWhere,
    });

    const totalCreated = tokens.length;
    const completedTokens = tokens.filter((t) => t.status === 'COMPLETED');
    const cancelledTokens = tokens.filter((t) => t.status === 'CANCELLED');

    // Calculate Average Wait Time (for completed or served tokens with waitTimeSeconds recorded)
    const tokensWithWaitTime = tokens.filter(
      (t) => t.waitTimeSeconds !== null && t.waitTimeSeconds !== undefined && t.waitTimeSeconds >= 0
    );
    const totalWaitSeconds = tokensWithWaitTime.reduce((sum, t) => sum + (t.waitTimeSeconds || 0), 0);
    const avgWaitSeconds = tokensWithWaitTime.length > 0 ? Math.round(totalWaitSeconds / tokensWithWaitTime.length) : 0;

    // Calculate Average Service Time
    const tokensWithServiceTime = completedTokens.filter(
      (t) => t.serviceTimeSeconds !== null && t.serviceTimeSeconds !== undefined && t.serviceTimeSeconds >= 0
    );
    const totalServiceSeconds = tokensWithServiceTime.reduce((sum, t) => sum + (t.serviceTimeSeconds || 0), 0);
    const avgServiceSeconds =
      tokensWithServiceTime.length > 0 ? Math.round(totalServiceSeconds / tokensWithServiceTime.length) : 0;

    const cancellationRate = totalCreated > 0 ? Number(((cancelledTokens.length / totalCreated) * 100).toFixed(1)) : 0;
    const completionRate = totalCreated > 0 ? Number(((completedTokens.length / totalCreated) * 100).toFixed(1)) : 0;

    // 1. Hourly Trend Analysis (8:00 to 20:00 or 24 hrs)
    const hourlyData: { [hour: number]: { hour: string; arrived: number; served: number; avgWaitMins: number; totalWaitSec: number; waitCount: number } } = {};
    for (let h = 8; h <= 20; h++) {
      const label = `${h % 12 === 0 ? 12 : h % 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
      hourlyData[h] = { hour: label, arrived: 0, served: 0, avgWaitMins: 0, totalWaitSec: 0, waitCount: 0 };
    }

    tokens.forEach((t) => {
      const h = new Date(t.createdAt).getHours();
      if (hourlyData[h]) {
        hourlyData[h].arrived += 1;
      }
      if (t.servedAt) {
        const sh = new Date(t.servedAt).getHours();
        if (hourlyData[sh]) {
          hourlyData[sh].served += 1;
          if (t.waitTimeSeconds) {
            hourlyData[sh].totalWaitSec += t.waitTimeSeconds;
            hourlyData[sh].waitCount += 1;
          }
        }
      }
    });

    const hourlyTrend = Object.values(hourlyData).map((item) => ({
      hour: item.hour,
      arrived: item.arrived,
      served: item.served,
      avgWaitMinutes: item.waitCount > 0 ? Number((item.totalWaitSec / item.waitCount / 60).toFixed(1)) : 0,
    }));

    // 2. Queue Length Trends over recent 7 days / periods
    const dailyVolumeMap: { [dateStr: string]: { date: string; waiting: number; completed: number; cancelled: number } } = {};
    // Last 7 days baseline
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      const display = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      dailyVolumeMap[key] = { date: display, waiting: 0, completed: 0, cancelled: 0 };
    }

    tokens.forEach((t) => {
      const key = new Date(t.createdAt).toISOString().split('T')[0];
      if (dailyVolumeMap[key]) {
        if (t.status === 'COMPLETED') dailyVolumeMap[key].completed += 1;
        else if (t.status === 'CANCELLED') dailyVolumeMap[key].cancelled += 1;
        else dailyVolumeMap[key].waiting += 1;
      }
    });

    const dailyTrend = Object.values(dailyVolumeMap);

    // 3. Priority Breakdown
    const priorityCounts = {
      VIP: tokens.filter((t) => t.priority === 'VIP').length,
      PRIORITY: tokens.filter((t) => t.priority === 'PRIORITY').length,
      NORMAL: tokens.filter((t) => t.priority === 'NORMAL').length,
    };

    const priorityData = [
      { name: 'VIP Priority', value: priorityCounts.VIP, color: '#F59E0B' },
      { name: 'Urgent / Priority', value: priorityCounts.PRIORITY, color: '#EC4899' },
      { name: 'Standard / Normal', value: priorityCounts.NORMAL, color: '#3B82F6' },
    ];

    // 4. Status Breakdown
    const statusData = [
      { name: 'Completed', value: completedTokens.length, color: '#10B981' },
      { name: 'Waiting', value: activeWaiting, color: '#6366F1' },
      { name: 'Serving Now', value: activeServing, color: '#F59E0B' },
      { name: 'Cancelled', value: cancelledTokens.length, color: '#EF4444' },
    ];

    // 5. Multi-queue summary comparison
    const queues = await prisma.queue.findMany({
      include: {
        _count: {
          select: { tokens: true },
        },
      },
    });

    const queueComparison = await Promise.all(
      queues.map(async (q) => {
        const qWaiting = await prisma.token.count({ where: { queueId: q.id, status: 'WAITING' } });
        const qCompleted = await prisma.token.count({ where: { queueId: q.id, status: 'COMPLETED' } });
        const qTokens = await prisma.token.findMany({
          where: { queueId: q.id, waitTimeSeconds: { not: null } },
          select: { waitTimeSeconds: true },
        });
        const qAvgWait =
          qTokens.length > 0
            ? Math.round(qTokens.reduce((s, x) => s + (x.waitTimeSeconds || 0), 0) / qTokens.length / 60)
            : 0;

        return {
          id: q.id,
          name: q.name,
          prefix: q.prefix,
          color: q.color,
          waiting: qWaiting,
          completed: qCompleted,
          avgWaitMinutes: qAvgWait,
        };
      })
    );

    res.json({
      success: true,
      summary: {
        totalCreated,
        completedCount: completedTokens.length,
        cancelledCount: cancelledTokens.length,
        activeWaiting,
        activeServing,
        avgWaitSeconds,
        avgWaitMinutes: Number((avgWaitSeconds / 60).toFixed(1)),
        avgServiceSeconds,
        avgServiceMinutes: Number((avgServiceSeconds / 60).toFixed(1)),
        cancellationRate,
        completionRate,
      },
      hourlyTrend,
      dailyTrend,
      priorityData,
      statusData,
      queueComparison,
    });
  } catch (error: any) {
    console.error('getQueueAnalytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate analytics' });
  }
};
