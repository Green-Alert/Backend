import { CategoriaRiesgoModel } from '../models/categoria-riesgo.model.js';
import { ReporteModel } from '../models/reporte.model.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * Controlador para gestionar categorías de riesgo ambiental
 * 
 * Proporciona endpoints para:
 * - Listar todas las categorías con estadísticas
 * - Obtener detalles de una categoría específica
 * - Filtrar reportes por categoría
 * - Ver estadísticas de reportes por categoría
 */

/**
 * GET /api/categorias
 * Obtiene todas las categorías activas con estadísticas
 */
export const obtenerTodasLasCategorias = async (req, res, next) => {
  try {
    const categorias = await CategoriaRiesgoModel.findAll(true);
    
    if (!categorias || categorias.length === 0) {
      return successResponse(res, { categorias: [] }, 'No hay categorías disponibles.');
    }

    return successResponse(
      res, 
      { 
        categorias,
        total: categorias.length 
      }, 
      'Categorías obtenidas correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/categorias/:codigo
 * Obtiene detalles de una categoría específica
 */
export const obtenerCategoriaPorCodigo = async (req, res, next) => {
  try {
    const { codigo } = req.params;

    if (!codigo || !codigo.trim()) {
      return errorResponse(res, 'El código de categoría es requerido.', 400);
    }

    const categoria = await CategoriaRiesgoModel.findByCodigo(codigo.toLowerCase());

    if (!categoria) {
      return errorResponse(res, 'Categoría no encontrada.', 404);
    }

    return successResponse(
      res, 
      { categoria }, 
      'Categoría obtenida correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/categorias/:codigo/reportes
 * Obtiene todos los reportes de una categoría específica con paginación
 */
export const obtenerReportesPorCategoria = async (req, res, next) => {
  try {
    const { codigo } = req.params;
    const { estado, nivel_severidad, municipio, limit = 20, offset = 0 } = req.query;

    if (!codigo || !codigo.trim()) {
      return errorResponse(res, 'El código de categoría es requerido.', 400);
    }

    // Verificar que la categoría exista
    const categoria = await CategoriaRiesgoModel.findByCodigo(codigo.toLowerCase());
    if (!categoria) {
      return errorResponse(res, 'Categoría no encontrada.', 404);
    }

    // Obtener reportes de esta categoría con filtros opcionales
    const reportes = await ReporteModel.findAll({
      tipo_contaminacion: codigo.toLowerCase(),
      estado: estado ? estado.toLowerCase() : undefined,
      nivel_severidad: nivel_severidad ? nivel_severidad.toLowerCase() : undefined,
      municipio: municipio ? municipio.toLowerCase() : undefined,
      limit: Math.max(1, Math.min(100, parseInt(limit, 10) || 20)),
      offset: Math.max(0, parseInt(offset, 10) || 0),
    });

    return successResponse(
      res, 
      { 
        categoria,
        reportes,
        total: reportes.length,
        paginacion: {
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10)
        }
      }, 
      `${reportes.length} reportes encontrados para la categoría "${categoria.nombre}".`
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/categorias/estadisticas/resumen
 * Obtiene estadísticas agregadas de reportes por categoría
 * Útil para mostrar en dashboards
 */
export const obtenerEstadisticasCategorias = async (req, res, next) => {
  try {
    const estadisticas = await CategoriaRiesgoModel.getEstadisticasPorCategoria();

    if (!estadisticas || estadisticas.length === 0) {
      return successResponse(
        res, 
        { estadisticas: [] }, 
        'No hay reportes disponibles.'
      );
    }

    // Calcular totales
    const totales = {
      total_reportes: 0,
      pendientes: 0,
      en_revision: 0,
      verificados: 0,
      resueltos: 0,
      criticos: 0
    };

    estadisticas.forEach(cat => {
      totales.total_reportes += cat.total_reportes || 0;
      totales.pendientes += cat.pendientes || 0;
      totales.en_revision += cat.en_revision || 0;
      totales.verificados += cat.verificados || 0;
      totales.resueltos += cat.resueltos || 0;
      totales.criticos += cat.criticos || 0;
    });

    return successResponse(
      res, 
      { 
        estadisticas,
        totales,
        cantidad_categorias: estadisticas.length
      }, 
      'Estadísticas de categorías obtenidas correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/categorias/estadisticas/por-severidad
 * Obtiene estadísticas de reportes agrupadas por categoría y severidad
 * Útil para análisis de riesgos
 */
export const obtenerEstadisticasSeveridad = async (req, res, next) => {
  try {
    // Obtener todas las categorías
    const categorias = await CategoriaRiesgoModel.findAll(true);

    const estadisticasPorSeveridad = {};

    // Para cada categoría, contar por severidad
    for (const categoria of categorias) {
      const reportes = await ReporteModel.findAll({
        tipo_contaminacion: categoria.codigo,
        limit: 1000,
        offset: 0
      });

      estadisticasPorSeveridad[categoria.codigo] = {
        nombre_categoria: categoria.nombre,
        icono: categoria.icono,
        color: categoria.color_hex,
        por_severidad: {
          bajo: reportes.filter(r => r.nivel_severidad === 'bajo').length,
          medio: reportes.filter(r => r.nivel_severidad === 'medio').length,
          alto: reportes.filter(r => r.nivel_severidad === 'alto').length,
          critico: reportes.filter(r => r.nivel_severidad === 'critico').length
        }
      };
    }

    return successResponse(
      res, 
      { estadisticasPorSeveridad }, 
      'Estadísticas por severidad obtenidas correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};
