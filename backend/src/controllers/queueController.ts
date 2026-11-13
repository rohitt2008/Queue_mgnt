import { Response } from 'express';
import prisma from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { emitQueueUpdate } from '../services/socket.js';

export const getQueues = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const queues = await prisma.queue.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            tokens: true,
          },
        },
      },
    });

    // Enhance each queue with live token counts
    const enhancedQueues = await Promise.all(
      queues.map(async (queue) => {
        const [waitingCount, servingCount, completedTodayCount] = await Promise.all([
          prisma.token.count({
            where: { queueId: queue.id, status: 'WAITING' },
          }),
          prisma.token.count({
            where: { queueId: queue.id, status: 'SERVING' },
          }),
          prisma.token.count({
            where: {
              queueId: queue.id,
              status: 'COMPLETED',
              completedAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
              },
            },
          }),
        ]);

        // Get currently serving token if any
        const currentServing = await prisma.token.findFirst({
          where: { queueId: queue.id, status: 'SERVING' },
          orderBy: { servedAt: 'desc' },
        });

        return {
          ...queue,
          stats: {
            waitingCount,
            servingCount,
            completedTodayCount,
            estimatedWaitTimeMinutes: waitingCount * queue.targetServiceTime,
          },
          currentServing,
        };
      })
    );

    res.json({ success: true, queues: enhancedQueues });
  } catch (error: any) {
    console.error('getQueues error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch queues' });
  }
};

export const getQueueById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    const queue = await prisma.queue.findUnique({
      where: { id },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!queue) {
      res.status(404).json({ success: false, message: 'Queue not found' });
      return;
    }

    const [waitingCount, servingCount, completedCount, cancelledCount] = await Promise.all([
      prisma.token.count({ where: { queueId: id, status: 'WAITING' } }),
      prisma.token.count({ where: { queueId: id, status: 'SERVING' } }),
      prisma.token.count({ where: { queueId: id, status: 'COMPLETED' } }),
      prisma.token.count({ where: { queueId: id, status: 'CANCELLED' } }),
    ]);

    const currentlyServing = await prisma.token.findFirst({
      where: { queueId: id, status: 'SERVING' },
      orderBy: { servedAt: 'desc' },
    });

    res.json({
      success: true,
      queue: {
        ...queue,
        stats: {
          waitingCount,
          servingCount,
          completedCount,
          cancelledCount,
          estimatedWaitMinutes: waitingCount * queue.targetServiceTime,
        },
        currentlyServing,
      },
    });
  } catch (error: any) {
    console.error('getQueueById error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch queue details' });
  }
};

export const createQueue = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      name,
      description,
      prefix = 'Q',
      color = '#6366F1',
      icon = 'users',
      targetServiceTime = 5,
      counterName = 'Counter 1',
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Queue name is required' });
      return;
    }

    const formattedPrefix = (prefix || 'Q').trim().toUpperCase().slice(0, 4);

    const queue = await prisma.queue.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        prefix: formattedPrefix,
        color: color || '#6366F1',
        icon: icon || 'users',
        targetServiceTime: Number(targetServiceTime) || 5,
        counterName: counterName?.trim() || 'Counter 1',
        managerId: req.user.id,
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    emitQueueUpdate(queue.id, 'queue_created', queue);

    res.status(201).json({
      success: true,
      message: 'Queue created successfully',
      queue: {
        ...queue,
        stats: {
          waitingCount: 0,
          servingCount: 0,
          completedTodayCount: 0,
          estimatedWaitTimeMinutes: 0,
        },
      },
    });
  } catch (error: any) {
    console.error('createQueue error:', error);
    res.status(500).json({ success: false, message: 'Failed to create queue' });
  }
};

export const updateQueue = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, description, prefix, color, icon, targetServiceTime, counterName, status } = req.body;

    const existingQueue = await prisma.queue.findUnique({ where: { id } });
    if (!existingQueue) {
      res.status(404).json({ success: false, message: 'Queue not found' });
      return;
    }

    const updatedQueue = await prisma.queue.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() }),
        ...(prefix && { prefix: prefix.trim().toUpperCase().slice(0, 4) }),
        ...(color && { color }),
        ...(icon && { icon }),
        ...(targetServiceTime !== undefined && { targetServiceTime: Number(targetServiceTime) }),
        ...(counterName && { counterName: counterName.trim() }),
        ...(status && { status }),
      },
    });

    emitQueueUpdate(id, 'queue_updated', updatedQueue);

    res.json({
      success: true,
      message: 'Queue updated successfully',
      queue: updatedQueue,
    });
  } catch (error: any) {
    console.error('updateQueue error:', error);
    res.status(500).json({ success: false, message: 'Failed to update queue' });
  }
};

export const deleteQueue = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    const queue = await prisma.queue.findUnique({ where: { id } });
    if (!queue) {
      res.status(404).json({ success: false, message: 'Queue not found' });
      return;
    }

    await prisma.queue.delete({ where: { id } });

    emitQueueUpdate(id, 'queue_deleted', { queueId: id });

    res.json({ success: true, message: 'Queue deleted successfully' });
  } catch (error: any) {
    console.error('deleteQueue error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete queue' });
  }
};
