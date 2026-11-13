import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    // Client joins a specific queue room for live updates
    socket.on('join_queue', (queueId: string) => {
      socket.join(`queue:${queueId}`);
    });

    socket.on('leave_queue', (queueId: string) => {
      socket.leave(`queue:${queueId}`);
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};

export const emitQueueUpdate = (queueId: string, event: string, payload: any) => {
  if (io) {
    io.to(`queue:${queueId}`).emit(event, payload);
    // Also broadcast to general overview listeners
    io.emit('queue_overview_change', { queueId, event });
  }
};
