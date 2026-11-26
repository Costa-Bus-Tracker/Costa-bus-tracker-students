import { Server, Socket } from 'socket.io';
import {
  SOCKET_EVENTS,
  type BusDataB2B,
  type BusDataB2C,
  type SocketAuthResponse
} from '@costa-bus/shared';

let ioInstance: Server | null = null;

// Lee la variable de entorno en producción o usa 'admin1234' en desarrollo local
const ADMIN_SECRET = process.env.ADMIN_PASSWORD || 'admin1234';

const ROOMS = {
  B2B: 'terminal-room',
  B2C: 'public-room',
} as const;

export const initSockets = (io: Server): void => {
  ioInstance = io;

  io.on(SOCKET_EVENTS.CONNECT, (socket: Socket) => {
    console.log(`[Sockets] Nuevo cliente conectado: ${socket.id}`);

    socket.on(SOCKET_EVENTS.JOIN_ROLE, (role: 'B2B' | 'B2C', token?: string) => {
      // Limpia salas previas en caso de que el cliente cambie de rol sin desconectarse
      socket.leave(ROOMS.B2B);
      socket.leave(ROOMS.B2C);

      if (role === 'B2B') {
        if (token === ADMIN_SECRET) {
          socket.join(ROOMS.B2B);
          console.log(`[Sockets] 🔒 Cliente ${socket.id} AUTENTICADO en B2B`);
          const successPayload: SocketAuthResponse = { message: 'Bienvenido al Dashboard B2B' };
          socket.emit(SOCKET_EVENTS.AUTH_SUCCESS, successPayload);
        } else {
          console.warn(`[Sockets] ⚠️ Intento fallido B2B desde ${socket.id}`);
          const errorPayload: SocketAuthResponse = { error: 'Contraseña maestra inválida' };
          socket.emit(SOCKET_EVENTS.AUTH_ERROR, errorPayload);
        }
        return;
      }

      socket.join(ROOMS.B2C);
      console.log(`[Sockets] 🚌 Cliente ${socket.id} unido a B2C (Público)`);
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.log(`[Sockets] Cliente desconectado: ${socket.id}`);
    });
  });
};

export const broadcastBusLocation = (dataB2B: BusDataB2B, dataB2C: BusDataB2C): void => {
  if (!ioInstance) return;
  ioInstance.to(ROOMS.B2B).emit(SOCKET_EVENTS.BUS_UPDATE_B2B, dataB2B);
  ioInstance.to(ROOMS.B2C).emit(SOCKET_EVENTS.BUS_UPDATE_B2C, dataB2C);
};