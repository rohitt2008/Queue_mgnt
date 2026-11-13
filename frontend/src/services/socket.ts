import { io, Socket } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_WS_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? window.location.origin
    : 'http://localhost:5001');

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

export const joinQueueRoom = (queueId: string) => {
  const s = getSocket();
  s.emit('join_queue', queueId);
};

export const leaveQueueRoom = (queueId: string) => {
  const s = getSocket();
  s.emit('leave_queue', queueId);
};

