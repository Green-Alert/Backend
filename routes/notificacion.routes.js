import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import {
  contadorNotificaciones,
  eliminarNotificacion,
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
  registrarFcmToken,
} from '../src/controllers/notificacion.controller.js';

const notificacionRouter = Router();

notificacionRouter.use(verifyToken);

notificacionRouter.get('/contador', contadorNotificaciones);
notificacionRouter.post('/fcm-token', registrarFcmToken);
notificacionRouter.patch('/marcar-todas', marcarTodasLeidas);
notificacionRouter.get('/', listarNotificaciones);
notificacionRouter.patch('/:uuid/leida', marcarLeida);
notificacionRouter.delete('/:uuid', eliminarNotificacion);

export default notificacionRouter;
