import { Request, Response } from 'express';
import type { BusDataAWS } from '@costa-bus/shared';
import { busService } from '../services/busService';
import { broadcastBusLocation } from '../sockets/socketManager';

export const receiveAwsStream = (req: Request, res: Response): void => {
  try {
    const raw = req.body as Record<string, unknown>;

    // Acepta numCamion (desde DynamoDB/Lambda) o device_id (si viene directo del ESP32)
    const rawId = raw?.numCamion ?? raw?.device_id;
    const numCamion = typeof rawId === 'string' ? rawId.trim() : '';

    if (!numCamion) {
      res.status(400).json({ success: false, error: 'Payload inválido: numCamion es obligatorio' });
      return;
    }

    // Cuando el ESP32 recién enciende (ej. 4 satélites), DynamoDB guarda el registro sin latitude/longitude
    if (
      raw?.latitude === undefined ||
      raw?.longitude === undefined ||
      raw?.latitude === null ||
      raw?.longitude === null ||
      raw?.latitude === '' ||
      raw?.longitude === ''
    ) {
      res.status(200).json({ success: true, message: 'Paquete inicial sin fijación GPS ignorado' });
      return;
    }

    const latitude = Number(raw.latitude);
    const longitude = Number(raw.longitude);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      res.status(400).json({ success: false, error: 'Payload inválido: latitude y longitude deben ser numéricos' });
      return;
    }

    const payload: BusDataAWS = {
      numCamion,
      measurement_id: typeof raw.measurement_id === 'string' ? raw.measurement_id : undefined,
      latitude,
      longitude,
      altitude_m: raw.altitude_m !== undefined && raw.altitude_m !== null && raw.altitude_m !== '' ? Number(raw.altitude_m) : undefined,
      satellites: raw.satellites !== undefined && raw.satellites !== null && raw.satellites !== '' ? Number(raw.satellites) : undefined,
      captured_at: typeof raw.captured_at === 'string' && raw.captured_at ? raw.captured_at : new Date().toISOString(),
    };

    const processedData = busService.processTelemetry(payload);

    if (!processedData) {
      res.status(200).json({ success: true, message: 'Coordenadas nulas ignoradas (buscando satélites)' });
      return;
    }

    broadcastBusLocation(processedData.b2b, processedData.b2c);
    res.status(200).json({ success: true, message: 'Datos procesados y emitidos' });
  } catch (error) {
    console.error('[AWS Webhook Error]:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};