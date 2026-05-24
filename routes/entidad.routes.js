import { Router } from 'express';
import { verifyToken, requireRoles } from '../middlewares/auth.middleware.js';
import { validatePositiveIdParam } from '../middlewares/validate-id.middleware.js';
import {
  actualizarAtencionMiEntidad,
  listarEntidades,
  listarMisReportesEntidad,
  obtenerMiReporteEntidad,
} from '../src/controllers/entidad.controller.js';

const entidadRouter = Router();

entidadRouter.get('/', verifyToken, requireRoles('admin', 'moderador', 'entidad'), listarEntidades);
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
