import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  DEFAULT_BACKEND_URL,
  SOCKET_EVENTS,
  ROUTES,
  type BusDataB2C,
  type BusDataB2B,
  type Route,
  type Alert,
  type SocketAuthResponse
} from '@costa-bus/shared';

export const ALERT_ETA_THRESHOLD_MINUTES = 5;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;

export function useSocket<T extends BusDataB2C | BusDataB2B = BusDataB2C>(
  role: 'B2B' | 'B2C' = 'B2C',
  token?: string
) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [buses, setBuses] = useState<Record<string, T>>({});
  const [routes] = useState<Route[]>(ROUTES);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [connected, setConnected] = useState(false);
  const [offline, setOffline] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAlerts = useCallback(() => setAlerts([]), []);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (role === 'B2B' && !token) {
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socketInstance = io(BACKEND_URL, {
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socketInstance;

    socketInstance.on(SOCKET_EVENTS.CONNECT, () => {
      setConnected(true);
      setOffline(false);
      setAuthError(null);
      socketInstance.emit(SOCKET_EVENTS.JOIN_ROLE, role, token);
    });

    socketInstance.on(SOCKET_EVENTS.AUTH_ERROR, (res: SocketAuthResponse) => {
      setAuthError(res.error ?? 'Contraseña maestra inválida');
      setConnected(false);
    });

    socketInstance.on(SOCKET_EVENTS.AUTH_SUCCESS, () => {
      setAuthError(null);
    });

    const eventToListen =
      role === 'B2B' ? SOCKET_EVENTS.BUS_UPDATE_B2B : SOCKET_EVENTS.BUS_UPDATE_B2C;

    socketInstance.on(eventToListen, (data: T) => {
      if (!data?.busId) return;

      setBuses((prev) => ({
        ...prev,
        [data.busId]: data,
      }));
    });

    socketInstance.on(SOCKET_EVENTS.DISCONNECT, () => {
      setConnected(false);
      setOffline(true);
    });

    setSocket(socketInstance);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [role, token]);

  return { socket, buses, routes, alerts, connected, offline, authError, clearAlerts };
}