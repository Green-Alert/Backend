import { Router } from 'express';
import { optionalAuth, verifyToken, requireRoles } from '../middlewares/auth.middleware.js';
import { upload, uploadMultiple } from '../middlewares/upload.middleware.js';
import { validatePositiveIdParam } from '../middlewares/validate-id.middleware.js';
import {
  createReporte,
  getReportes,
  getReporteById,
  getStats,
  getStatsByCategoria,
  getStatsTimeline,
  getHeatmapPoints,
  getStatsIA,
  getTrendingReportes,
  toggleLikeReporte,
  analizarImagen,
  getMisReportes,
  updateReporte,
  deleteReporte,
  exportReportes,
  listEvidenciasReporte,
  addEvidenciaReporte,
  deleteEvidenciaReporte,
} from '../src/controllers/reporte.controller.js';
import {
  getAlertasPredictivas,
  getZonasRiesgo,
} from '../src/controllers/prediccion.controller.js';
 

const reporteRouter = Router();

reporteRouter.get('/stats', getStats);
reporteRouter.get('/stats/categoria', getStatsByCategoria);
reporteRouter.get('/stats/timeline', getStatsTimeline);
reporteRouter.get('/stats/heatmap', getHeatmapPoints);
reporteRouter.get('/stats/ia', verifyToken, requireRoles('admin', 'moderador'), getStatsIA);
reporteRouter.get('/zonas-riesgo', verifyToken, requireRoles('admin', 'moderador'), getZonasRiesgo);
reporteRouter.get('/alertas-predictivas', optionalAuth, getAlertasPredictivas);
reporteRouter.get('/trending', optionalAuth, getTrendingReportes);
reporteRouter.get('/export', verifyToken, requireRoles('admin', 'moderador'), exportReportes);
reporteRouter.get('/mis-reportes', verifyToken, getMisReportes);
reporteRouter.post('/analizar-imagen', verifyToken, upload.single('imagen'), analizarImagen);
reporteRouter.get('/', optionalAuth, getReportes);
reporteRouter.post('/:id/like', validatePositiveIdParam('id'), verifyToken, toggleLikeReporte);
reporteRouter.get('/:id/evidencias', validatePositiveIdParam('id'), verifyToken, listEvidenciasReporte);
reporteRouter.post('/:id/evidencias', validatePositiveIdParam('id'), verifyToken, upload.single('file'), addEvidenciaReporte);
reporteRouter.delete(
  '/:id/evidencias/:evidenciaId',
  validatePositiveIdParam('id'),
  validatePositiveIdParam('evidenciaId'),
  verifyToken,
  deleteEvidenciaReporte
);
reporteRouter.get('/:id', validatePositiveIdParam('id'), optionalAuth, getReporteById);
reporteRouter.post(
  '/',
  verifyToken,
  uploadMultiple,
  createReporte
);
reporteRouter.patch('/:id', validatePositiveIdParam('id'), verifyToken, updateReporte);
reporteRouter.delete('/:id', validatePositiveIdParam('id'), verifyToken, deleteReporte);

export default reporteRouter;
