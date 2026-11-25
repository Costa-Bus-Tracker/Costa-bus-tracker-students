import { Router, type Request, type Response, type NextFunction } from 'express';
import { receiveAwsStream } from '../controllers/awsController';

const router = Router();

// Middleware opcional: valida x-api-key si AWS_WEBHOOK_SECRET está configurado en producción
const verifyWebhookSecret = (req: Request, res: Response, next: NextFunction): void => {
  const expectedSecret = process.env.AWS_WEBHOOK_SECRET;
  if (!expectedSecret) {
    next();
    return;
  }

  const providedSecret = req.headers['x-api-key'];
  if (providedSecret !== expectedSecret) {
    res.status(401).json({ success: false, error: 'No autorizado' });
    return;
  }

  next();
};

router.post('/webhook/bus-location', verifyWebhookSecret, receiveAwsStream);

export default router;