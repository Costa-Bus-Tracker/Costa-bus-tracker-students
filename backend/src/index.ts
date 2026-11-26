import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import awsRoutes from './routes/awsRoutes';
import { initSockets } from './sockets/socketManager';
import { busService } from './services/busService';

const app = express();
const httpServer = createServer(app);

// Origen dinámico: toma FRONTEND_URL en producción o permite cualquier origen en local
const allowedOrigin = process.env.FRONTEND_URL || '*';

app.use(cors({ origin: allowedOrigin, methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '100kb' }));

// Endpoint de monitoreo (Health Check)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST']
  }
});
initSockets(io);

// Registrar Rutas REST
app.use('/api/aws', awsRoutes);

// Vigilante periódico: revisa cada 60s si alguna unidad lleva >5 min sin reportar
const STALE_CHECK_INTERVAL_MS = 60_000;
const staleMonitor = setInterval(() => {
  const staleBuses = busService.getStaleBuses(300_000);
  if (staleBuses.length > 0) {
    console.warn(`[Monitor] ⚠️ Unidades sin reporte (>5 min): ${staleBuses.join(', ')}`);
  }
}, STALE_CHECK_INTERVAL_MS);

const PORT = Number(process.env.PORT) || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Hub WebSocket y API corriendo en el puerto ${PORT}`);
});

process.on('SIGTERM', () => {
  clearInterval(staleMonitor);
  httpServer.close(() => {
    console.log('Servidor cerrado correctamente');
    process.exit(0);
  });
});