import { Response } from 'express';
import prisma from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { emitQueueUpdate } from '../services/socket.js';

// 3. Add new person / token into the queue
export const addToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const queueId = String(req.params.queueId);
    const { customerName, customerPhone, customerEmail, priority = 'NORMAL', notes } = req.body;

    if (!customerName || !customerName.trim()) {
      res.status(400).json({ success: false, message: 'Customer name is required' });
      return;
    }

    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
    });

    if (!queue) {
      res.status(404).json({ success: false, message: 'Queue not found' });
      return;
    }

    // Determine sequence number
    const lastToken = await prisma.token.findFirst({
      where: { queueId },
      orderBy: { sequenceNumber: 'desc' },
    });
    const nextSequence = (lastToken?.sequenceNumber || 0) + 1;

    // Format token number: PREFIX-001, PREFIX-002, etc.
    const tokenNumber = `${queue.prefix}-${String(nextSequence).padStart(3, '0')}`;

    // Get current waiting count to place at the end of the queue
    const waitingTokensCount = await prisma.token.count({
      where: { queueId, status: 'WAITING' },
    });

    const position = waitingTokensCount + 1;

    const token = await prisma.token.create({
      data: {
        tokenNumber,
        sequenceNumber: nextSequence,
        customerName: customerName.trim(),
        customerPhone: customerPhone?.trim() || null,
        customerEmail: customerEmail?.trim() || null,
        priority: priority || 'NORMAL',
        notes: notes?.trim() || null,
        status: 'WAITING',
        position,
        queueId,
      },
    });

    emitQueueUpdate(queueId, 'token_added', { token, queueId });

    res.status(201).json({
      success: true,
      message: `Token ${tokenNumber} created successfully`,
      token,
    });
  } catch (error: any) {
    console.error('addToken error:', error);
    res.status(500).json({ success: false, message: 'Failed to create token' });
  }
};

// 4. Display list of people / tokens waiting in the queue
export const getQueueTokens = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const queueId = String(req.params.queueId);
    const { status, limit = 50 } = req.query;

    const whereClause: any = { queueId };
    if (status) {
      whereClause.status = String(status);
    }

    const tokens = await prisma.token.findMany({
      where: whereClause,
      orderBy: [
        { status: 'asc' },
        { position: 'asc' },
        { createdAt: 'desc' },
      ],
      take: Number(limit),
      include: {
        servedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Also get currently serving token and waiting list specifically
    const waitingTokens = tokens.filter((t) => t.status === 'WAITING').sort((a, b) => a.position - b.position);
    const servingToken = tokens.find((t) => t.status === 'SERVING') || null;

    res.json({
      success: true,
      tokens,
      waitingTokens,
      servingToken,
      totalWaiting: waitingTokens.length,
    });
  } catch (error: any) {
    console.error('getQueueTokens error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch queue tokens' });
  }
};

// 5. Move tokens up and down in the queue
export const moveToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { direction } = req.body; // 'up' or 'down'

    if (direction !== 'up' && direction !== 'down') {
      res.status(400).json({ success: false, message: 'Direction must be "up" or "down"' });
      return;
    }

    const targetToken = await prisma.token.findUnique({
      where: { id },
    });

    if (!targetToken) {
      res.status(404).json({ success: false, message: 'Token not found' });
      return;
    }

    if (targetToken.status !== 'WAITING') {
      res.status(400).json({ success: false, message: 'Only WAITING tokens can be moved' });
      return;
    }

    const currentPos = targetToken.position;
    const queueId = targetToken.queueId;

    if (direction === 'up') {
      if (currentPos <= 1) {
        res.status(400).json({ success: false, message: 'Token is already at the top of the queue' });
        return;
      }

      // Find token right above it
      const neighbor = await prisma.token.findFirst({
        where: { queueId, status: 'WAITING', position: currentPos - 1 },
      });

      if (!neighbor) {
        await normalizeQueuePositions(queueId);
        res.status(400).json({ success: false, message: 'Queue normalized, please retry' });
        return;
      }

      // Swap positions using a transaction
      await prisma.$transaction([
        prisma.token.update({
          where: { id: targetToken.id },
          data: { position: currentPos - 1 },
        }),
        prisma.token.update({
          where: { id: neighbor.id },
          data: { position: currentPos },
        }),
      ]);
    } else {
      // direction === 'down'
      const maxPosition = await prisma.token.count({
        where: { queueId, status: 'WAITING' },
      });

      if (currentPos >= maxPosition) {
        res.status(400).json({ success: false, message: 'Token is already at the bottom of the queue' });
        return;
      }

      // Find token right below it
      const neighbor = await prisma.token.findFirst({
        where: { queueId, status: 'WAITING', position: currentPos + 1 },
      });

      if (!neighbor) {
        await normalizeQueuePositions(queueId);
        res.status(400).json({ success: false, message: 'Queue normalized, please retry' });
        return;
      }

      // Swap positions using a transaction
      await prisma.$transaction([
        prisma.token.update({
          where: { id: targetToken.id },
          data: { position: currentPos + 1 },
        }),
        prisma.token.update({
          where: { id: neighbor.id },
          data: { position: currentPos },
        }),
      ]);
    }

    // Fetch freshly reordered list
    const updatedWaitingList = await prisma.token.findMany({
      where: { queueId, status: 'WAITING' },
      orderBy: { position: 'asc' },
    });

    emitQueueUpdate(queueId, 'tokens_reordered', { queueId, tokens: updatedWaitingList });

    res.json({
      success: true,
      message: `Token moved ${direction} successfully`,
      tokens: updatedWaitingList,
    });
  } catch (error: any) {
    console.error('moveToken error:', error);
    res.status(500).json({ success: false, message: 'Failed to reorder token' });
  }
};

// 6. Assign the token at the top of the queue for service [With a simple button click]
export const serveTopToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const queueId = String(req.params.queueId);
    const { autoFinishServing = true } = req.body;

    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
    });

    if (!queue) {
      res.status(404).json({ success: false, message: 'Queue not found' });
      return;
    }

    // Check if there is a token at the top of the queue
    const topToken = await prisma.token.findFirst({
      where: { queueId, status: 'WAITING' },
      orderBy: { position: 'asc' },
    });

    if (!topToken) {
      res.status(400).json({ success: false, message: 'No waiting tokens in the queue to serve' });
      return;
    }

    const now = new Date();
    const waitTimeSeconds = Math.max(0, Math.round((now.getTime() - topToken.createdAt.getTime()) / 1000));

    // If autoFinishServing is enabled, complete any currently serving token first
    if (autoFinishServing) {
      const activeServing = await prisma.token.findMany({
        where: { queueId, status: 'SERVING' },
      });

      for (const st of activeServing) {
        const serviceTimeSeconds = Math.max(
          0,
          Math.round((now.getTime() - (st.servedAt?.getTime() || st.createdAt.getTime())) / 1000)
        );
        await prisma.token.update({
          where: { id: st.id },
          data: {
            status: 'COMPLETED',
            completedAt: now,
            serviceTimeSeconds,
            position: 0,
          },
        });
      }
    }

    // Assign top token to SERVING
    const servedToken = await prisma.token.update({
      where: { id: topToken.id },
      data: {
        status: 'SERVING',
        servedAt: now,
        waitTimeSeconds,
        position: 0,
        counterName: queue.counterName,
        servedById: req.user?.id || queue.managerId,
      },
    });

    // Shift all remaining waiting tokens up by 1 position
    await prisma.token.updateMany({
      where: {
        queueId,
        status: 'WAITING',
        position: { gt: topToken.position },
      },
      data: {
        position: { decrement: 1 },
      },
    });

    // Normalize positions to guarantee tight sequence 1..N
    await normalizeQueuePositions(queueId);

    const waitingTokens = await prisma.token.findMany({
      where: { queueId, status: 'WAITING' },
      orderBy: { position: 'asc' },
    });

    emitQueueUpdate(queueId, 'token_served', {
      servedToken,
      waitingTokens,
      queueId,
      counterName: queue.counterName,
    });

    res.json({
      success: true,
      message: `Now serving Token ${servedToken.tokenNumber} (${servedToken.customerName})`,
      servedToken,
      waitingTokens,
    });
  } catch (error: any) {
    console.error('serveTopToken error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign top token for service' });
  }
};

// Complete service for a token
export const completeToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    const token = await prisma.token.findUnique({ where: { id } });
    if (!token) {
      res.status(404).json({ success: false, message: 'Token not found' });
      return;
    }

    const now = new Date();
    const serviceTimeSeconds = Math.max(
      0,
      Math.round((now.getTime() - (token.servedAt?.getTime() || token.createdAt.getTime())) / 1000)
    );

    const completed = await prisma.token.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: now,
        serviceTimeSeconds,
        position: 0,
      },
    });

    emitQueueUpdate(token.queueId, 'token_completed', { token: completed, queueId: token.queueId });

    res.json({
      success: true,
      message: `Token ${completed.tokenNumber} service marked as completed`,
      token: completed,
    });
  } catch (error: any) {
    console.error('completeToken error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete token service' });
  }
};

// 7. Cancel a token from the queue
export const cancelToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { reason = 'Cancelled by manager' } = req.body;

    const token = await prisma.token.findUnique({ where: { id } });
    if (!token) {
      res.status(404).json({ success: false, message: 'Token not found' });
      return;
    }

    const wasWaiting = token.status === 'WAITING';
    const oldPosition = token.position;
    const queueId = token.queueId;

    const cancelledToken = await prisma.token.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason?.trim() || 'Cancelled by manager',
        position: 0,
      },
    });

    if (wasWaiting) {
      // Shift tokens behind it forward
      await prisma.token.updateMany({
        where: {
          queueId,
          status: 'WAITING',
          position: { gt: oldPosition },
        },
        data: {
          position: { decrement: 1 },
        },
      });

      await normalizeQueuePositions(queueId);
    }

    const waitingTokens = await prisma.token.findMany({
      where: { queueId, status: 'WAITING' },
      orderBy: { position: 'asc' },
    });

    emitQueueUpdate(queueId, 'token_cancelled', {
      token: cancelledToken,
      waitingTokens,
      queueId,
    });

    res.json({
      success: true,
      message: `Token ${cancelledToken.tokenNumber} has been cancelled`,
      token: cancelledToken,
      waitingTokens,
    });
  } catch (error: any) {
    console.error('cancelToken error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel token' });
  }
};

// Reorder full queue (e.g. from drag & drop)
export const reorderTokens = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const queueId = String(req.params.queueId);
    const { orderedTokenIds } = req.body;

    if (!Array.isArray(orderedTokenIds)) {
      res.status(400).json({ success: false, message: 'orderedTokenIds array is required' });
      return;
    }

    // Update positions sequentially
    await prisma.$transaction(
      orderedTokenIds.map((id: string, index: number) =>
        prisma.token.update({
          where: { id },
          data: { position: index + 1 },
        })
      )
    );

    const updatedTokens = await prisma.token.findMany({
      where: { queueId, status: 'WAITING' },
      orderBy: { position: 'asc' },
    });

    emitQueueUpdate(queueId, 'tokens_reordered', { queueId, tokens: updatedTokens });

    res.json({
      success: true,
      message: 'Tokens reordered successfully',
      tokens: updatedTokens,
    });
  } catch (error: any) {
    console.error('reorderTokens error:', error);
    res.status(500).json({ success: false, message: 'Failed to reorder tokens' });
  }
};

// Helper: guarantees contiguous positions 1, 2, 3...
const normalizeQueuePositions = async (queueId: string) => {
  const waitingTokens = await prisma.token.findMany({
    where: { queueId, status: 'WAITING' },
    orderBy: { position: 'asc' },
  });

  for (let i = 0; i < waitingTokens.length; i++) {
    if (waitingTokens[i].position !== i + 1) {
      await prisma.token.update({
        where: { id: waitingTokens[i].id },
        data: { position: i + 1 },
      });
    }
  }
};
