import {
  distanceKm,
  etaMinutes as computeEtaMinutes,
  getRouteById,
  projectUserOnRoute,
  totalDistanceKm,
  type BusDataAWS,
  type BusDataB2B,
  type BusDataB2C
} from '@costa-bus/shared';

interface BusState {
  lastSeen: number;
  lastLat: number;
  lastLng: number;
  stationarySince: number | null;
}

interface LogisticsRecord {
  chofer: string;
  placa: string;
  origen: string;
  destino: string;
  routeId: string;
  operator: string;
}

class BusService {
  private activeBuses = new Map<string, BusState>();
  private logisticsCache = new Map<string, LogisticsRecord>();

  constructor() {
    this.logisticsCache.set('ESP32_001', {
      chofer: 'Juan Pérez',
      placa: 'JAL-5678-Y',
      origen: 'Guadalajara',
      destino: 'Barra de Navidad',
      routeId: 'gdl-barra-navidad',
      operator: 'Primera Plus'
    });
  }

  public processTelemetry(awsData: BusDataAWS): { b2b: BusDataB2B; b2c: BusDataB2C } | null {
    const busId = awsData.numCamion;
    const lat = awsData.latitude;
    const lng = awsData.longitude;
    const capturedAtMs = new Date(awsData.captured_at).getTime();

    if (lat == null || lng == null || lat === 0 || lng === 0 || Number.isNaN(capturedAtMs)) {
      return null;
    }

    const logistics = this.logisticsCache.get(busId) ?? {
      chofer: 'Operador en Turno',
      placa: `UNIT-${busId}`,
      origen: 'Guadalajara',
      destino: 'Barra de Navidad',
      routeId: 'gdl-barra-navidad',
      operator: 'Primera Plus'
    };

    // 1. Cálculo de velocidad real y estado estacionario
    let speedKmh = 0;
    let stationarySince: number | null = null;
    const prevState = this.activeBuses.get(busId);

    if (prevState) {
      const distance = distanceKm(prevState.lastLat, prevState.lastLng, lat, lng);
      const timeDiffHours = (capturedAtMs - prevState.lastSeen) / 3_600_000;

      if (timeDiffHours > 0) {
        speedKmh = distance / timeDiffHours;
      }

      stationarySince = speedKmh < 2 ? (prevState.stationarySince ?? capturedAtMs) : null;
    } else {
      stationarySince = capturedAtMs;
    }

    this.activeBuses.set(busId, {
      lastSeen: capturedAtMs,
      lastLat: lat,
      lastLng: lng,
      stationarySince
    });

    // 2. Reglas de alerta B2B
    const isOffline = Date.now() - capturedAtMs > 300_000;
    let alertStatus: 'OK' | 'DETENIDO' | 'OFFLINE' = 'OK';

    if (isOffline) {
      alertStatus = 'OFFLINE';
    } else if (stationarySince && capturedAtMs - stationarySince > 300_000) {
      alertStatus = 'DETENIDO';
    }

    // 3. Motor geoespacial (proyección real sobre el segmento)
    let progress = 0;
    let nextStopIndex = 1;
    let nextStopName = 'En ruta';
    let etaMinutes = 10;
    let routeName = logistics.routeId;

    const route = getRouteById(logistics.routeId);
    if (route?.cities && route.cities.length > 1) {
      routeName = route.name ?? 'Ruta Costa Jalisco';
      const projection = projectUserOnRoute(route, lat, lng);
      nextStopIndex = projection.nextStopIndex;
      nextStopName = projection.nextStopName;

      const totalKm = totalDistanceKm(route);
      let travelledKm = 0;

      for (let i = 0; i < projection.legIndex; i++) {
        travelledKm += distanceKm(
          route.cities[i].lat, route.cities[i].lng,
          route.cities[i + 1].lat, route.cities[i + 1].lng
        );
      }

      const startCity = route.cities[projection.legIndex];
      const endCity = route.cities[projection.legIndex + 1];
      const legLengthKm = distanceKm(startCity.lat, startCity.lng, endCity.lat, endCity.lng);
      const distToEndStopKm = distanceKm(lat, lng, endCity.lat, endCity.lng);

      const advanceInLegKm = Math.max(0, Math.min(legLengthKm, legLengthKm - distToEndStopKm));
      travelledKm += advanceInLegKm;

      progress = totalKm > 0 ? Math.min(1, Math.max(0, travelledKm / totalKm)) : 0;

      const safeSpeed = speedKmh > 5 ? speedKmh : 40;
      etaMinutes = computeEtaMinutes(distToEndStopKm, safeSpeed);
    }

    const estadoConexion = isOffline ? 'Sin conexion' : 'Conectado';

    // 4. Contrato B2C estrictamente tipado
    const b2c: BusDataB2C = {
      busId,
      routeId: logistics.routeId,
      routeName,
      lat,
      lng,
      speedKmh: Math.round(speedKmh * 10) / 10,
      nextStopIndex,
      nextStopName,
      etaMinutes,
      operator: logistics.operator,
      progress,
      estadoConexion
    };

    // 5. Contrato B2B estrictamente tipado (con altitude_m y satellites)
    const b2b: BusDataB2B = {
      ...b2c,
      altitude_m: awsData.altitude_m,
      satellites: awsData.satellites,
      chofer: logistics.chofer,
      placa: logistics.placa,
      origen: logistics.origen,
      destino: logistics.destino,
      alerta: alertStatus,
      lastPing: awsData.captured_at
    };

    return { b2b, b2c };
  }

  public getStaleBuses(timeoutMs: number = 300_000): string[] {
    const now = Date.now();
    const stale: string[] = [];
    for (const [busId, state] of this.activeBuses.entries()) {
      if (now - state.lastSeen > timeoutMs) {
        stale.push(busId);
      }
    }
    return stale;
  }
}

export const busService = new BusService();