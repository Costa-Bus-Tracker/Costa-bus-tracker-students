// ==========================================
// NUEVOS TIPOS: INGESTA AWS Y WEBSOCKETS (RBAC)
// ==========================================

export interface BusDataAWS {
  numCamion: string;
  measurement_id?: string;
  latitude: number;
  longitude: number;
  altitude_m?: number;
  satellites?: number;
  captured_at: string;
}

export interface BusDataB2C {
  busId: string;
  routeId: string;
  routeName: string;
  lat: number;
  lng: number;
  speedKmh: number;
  nextStopIndex: number;
  nextStopName: string;
  etaMinutes: number;
  operator: string;
  progress: number;
  estadoConexion: 'Conectado' | 'Sin conexion';
}

export interface BusDataB2B extends BusDataB2C {
  altitude_m?: number;
  satellites?: number;
  chofer: string;
  placa: string;
  origen: string;
  destino: string;
  alerta: 'OK' | 'DETENIDO' | 'OFFLINE';
  lastPing: string;
}

export interface SocketAuthResponse {
  message?: string;
  error?: string;
}

export interface Alert {
  id: string;
  busId?: string;
  stopName?: string;
  message: string;
  timestamp: number;
}

// ==========================================
// TIPOS ORIGINALES DEL FRONTEND (INTACTOS)
// ==========================================

export interface City {
  id?: string;
  name: string;
  lat: number;
  lng: number;
  coordinates?: [number, number];
}

export interface Operator {
  id?: string;
  name: string;
  color?: string;
  purchaseUrl?: string;
  fallbackUrl?: string;
}

export interface Route {
  id: string;
  name?: string;
  operatorId?: string;
  operators?: Operator[];
  originId?: string;
  destinationId?: string;
  cities: City[];
  path?: [number, number][];
  color?: string;
}

// ==========================================
// CONSTANTES DEL SISTEMA
// ==========================================

export const DEFAULT_BACKEND_URL = 'http://localhost:3001';

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  JOIN_ROLE: 'join-role',
  BUS_UPDATE_B2B: 'bus-update-b2b',
  BUS_UPDATE_B2C: 'bus-update-b2c',
  AUTH_SUCCESS: 'auth-success',
  AUTH_ERROR: 'auth-error',
} as const;