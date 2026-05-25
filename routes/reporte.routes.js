import { Router } from 'express';
import { verifyToken, requireRoles } from '../middlewares/auth.middleware.js';
import { uploadReportFiles } from '../middlewares/upload.middleware.js';
import {
  createReporte,
  getReportes,
  getReporteById,
  getStats,
  getStatsByCategoria,
  getStatsTimeline,
  getHeatmapPoints,
  getMisReportes,
  updateReporte,
  deleteReporte,
  exportReportes,
} from '../src/controllers/reporte.controller.js';
 

const reporteRouter = Router();

reporteRouter.get('/stats', getStats);
reporteRouter.get('/stats/categoria', getStatsByCategoria);
reporteRouter.get('/stats/timeline', getStatsTimeline);
reporteRouter.get('/stats/heatmap', getHeatmapPoints);
reporteRouter.get('/export', verifyToken, requireRoles('admin', 'moderador'), exportReportes);
reporteRouter.get('/mis-reportes', verifyToken, getMisReportes);
reporteRouter.get('/',      getReportes);
reporteRouter.get('/:id',   getReporteById);
reporteRouter.post('/',     verifyToken, uploadReportFiles, createReporte);
reporteRouter.patch('/:id', verifyToken, updateReporte);
reporteRouter.delete('/:id', verifyToken, deleteReporte);

export default reporteRouter;
