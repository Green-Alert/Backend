import { Router } from 'express';
import { verifyToken, requireRoles } from '../middlewares/auth.middleware.js';
import { validatePositiveIdParam } from '../middlewares/validate-id.middleware.js';
import {
  actualizarAtencionMiEntidad,
  contarMisAlertasNoLeidasEntidad,
  listarEntidades,
  listarMisAlertasEntidad,
  listarMisAlertasNoLeidasEntidad,
  listarMisReportesEntidad,
  listarReportesPorEntidad,
  marcarMiAlertaEntidadLeida,
  marcarTodasMisAlertasEntidadLeidas,
  obtenerMiReporteEntidad,
} from '../src/controllers/entidad.controller.js';

const entidadRouter = Router();

entidadRouter.get('/', verifyToken, requireRoles('admin', 'moderador', 'entidad'), listarEntidades);
entidadRouter.get(
  '/:id/reportes',
  validatePositiveIdParam('id'),
  verifyToken,
  requireRoles('admin', 'moderador', 'entidad'),
  listarReportesPorEntidad
);
entidadRouter.get('/mis-alertas', verifyToken, requireRoles('entidad'), listarMisAlertasEntidad);
entidadRouter.get(
  '/mis-alertas/no-leidas',
  verifyToken,
  requireRoles('entidad'),
  listarMisAlertasNoLeidasEntidad
);
entidadRouter.get(
  '/mis-alertas/no-leidas/count',
  verifyToken,
  requireRoles('entidad'),
  contarMisAlertasNoLeidasEntidad
);
entidadRouter.patch(
  '/mis-alertas/leer-todas',
  verifyToken,
  requireRoles('entidad'),
  marcarTodasMisAlertasEntidadLeidas
);
entidadRouter.patch(
  '/mis-alertas/:id/leer',
  validatePositiveIdParam('id'),
  verifyToken,
  requireRoles('entidad'),
  marcarMiAlertaEntidadLeida
);
entidadRouter.get('/mis-reportes', verifyToken, requireRoles('entidad'), listarMisReportesEntidad);
entidadRouter.get(
  '/mis-reportes/:id',
  validatePositiveIdParam('id'),
  verifyToken,
  requireRoles('entidad'),
  obtenerMiReporteEntidad
);
entidadRouter.patch(
  '/mis-reportes/:id/atencion',
  validatePositiveIdParam('id'),
  verifyToken,
  requireRoles('entidad'),
  actualizarAtencionMiEntidad
);

export default entidadRouter;
