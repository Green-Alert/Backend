import { Router } from 'express';
import { verifyToken, requireRoles } from '../middlewares/auth.middleware.js';
import {
  obtenerTodasLasCategorias,
  obtenerCategoriaPorCodigo,
  obtenerReportesPorCategoria,
  obtenerEstadisticasCategorias,
  obtenerEstadisticasSeveridad,
  crearCategoria,
  actualizarCategoria,
  cambiarEstadoCategoria,
} from '../src/controllers/categoria-riesgo.controller.js';

/**
 * Router para gestionar categorías de riesgo ambiental
 * 
 * Rutas disponibles:
 * - GET /api/categorias - Listar todas las categorías
 * - GET /api/categorias/:codigo - Obtener detalle de una categoría
 * - GET /api/categorias/:codigo/reportes - Listar reportes de una categoría
 * - GET /api/categorias/estadisticas/resumen - Estadísticas por categoría
 * - GET /api/categorias/estadisticas/por-severidad - Estadísticas por severidad
 */

const categoriaRouter = Router();

// Estadísticas generales (debe ir antes de :codigo para evitar conflictos)
categoriaRouter.get('/estadisticas/resumen', obtenerEstadisticasCategorias);
categoriaRouter.get('/estadisticas/por-severidad', obtenerEstadisticasSeveridad);

// Obtener todas las categorías
categoriaRouter.get('/', obtenerTodasLasCategorias);
categoriaRouter.post('/', verifyToken, requireRoles('admin'), crearCategoria);
categoriaRouter.patch('/:codigo', verifyToken, requireRoles('admin'), actualizarCategoria);
categoriaRouter.patch('/:codigo/estado', verifyToken, requireRoles('admin'), cambiarEstadoCategoria);

// Obtener reportes de una categoría específica
categoriaRouter.get('/:codigo/reportes', obtenerReportesPorCategoria);

// Obtener detalle de una categoría
categoriaRouter.get('/:codigo', obtenerCategoriaPorCodigo);

export default categoriaRouter;
