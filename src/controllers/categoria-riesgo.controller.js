import { CategoriaRiesgoModel } from '../models/categoria-riesgo.model.js';
import { ReporteModel } from '../models/reporte.model.js';
import { successResponse, errorResponse } from '../utils/response.js';

const CODIGO_REGEX = /^[a-z0-9_]+$/;
const COLOR_HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

const normalizeCodigo = (codigo) => (
  typeof codigo === 'string' ? codigo.trim().toLowerCase() : ''
);

const normalizeOptionalText = (value) => (
  typeof value === 'string' ? (value.trim() || null) : null
);

const parseActivo = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : null;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return null;
};

const parseNivelPrioridad = (value) => {
  if (value === undefined || value === null || value === '') return null;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
};

const validateCodigo = (codigo) => {
  if (!codigo) return 'El codigo de categoria es requerido.';
  if (!CODIGO_REGEX.test(codigo)) {
    return 'El codigo solo puede contener letras minusculas, numeros y guion bajo.';
  }
  return null;
};

const buildCategoryPayload = ({ requireAll = false, body = {} } = {}) => {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(body, 'nombre') || requireAll) {
    const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
    if (!nombre || nombre.length < 3) {
      return { error: 'El nombre debe tener al menos 3 caracteres.' };
    }
    payload.nombre = nombre;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'descripcion')) {
    payload.descripcion = normalizeOptionalText(body.descripcion);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'icono')) {
    payload.icono = normalizeOptionalText(body.icono);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'color_hex')) {
    const colorHex = normalizeOptionalText(body.color_hex);
    if (colorHex && !COLOR_HEX_REGEX.test(colorHex)) {
      return { error: 'El color_hex debe tener formato hexadecimal, por ejemplo #16a34a.' };
    }
    payload.color_hex = colorHex;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'nivel_prioridad_default')) {
    const nivel = parseNivelPrioridad(body.nivel_prioridad_default);
    if (nivel === undefined) {
      return { error: 'El nivel_prioridad_default debe ser un entero positivo o cero.' };
    }
    payload.nivel_prioridad_default = nivel;
  }

  return { payload };
};

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

export const crearCategoria = async (req, res, next) => {
  try {
    const codigo = normalizeCodigo(req.body?.codigo);
    const codigoError = validateCodigo(codigo);

    if (codigoError) {
      return errorResponse(res, codigoError, 400);
    }

    const { payload, error } = buildCategoryPayload({
      requireAll: true,
      body: req.body,
    });

    if (error) {
      return errorResponse(res, error, 400);
    }

    const existing = await CategoriaRiesgoModel.findByCodigoIncludingInactive(codigo);
    if (existing) {
      return errorResponse(res, 'Ya existe una categoria con ese codigo.', 409);
    }

    const activo = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'activo')
      ? parseActivo(req.body.activo)
      : true;

    if (activo === null) {
      return errorResponse(res, 'El campo activo debe ser booleano.', 400);
    }

    await CategoriaRiesgoModel.create({
      codigo,
      ...payload,
      activo,
    });

    const categoria = await CategoriaRiesgoModel.findByCodigoIncludingInactive(codigo);

    return successResponse(
      res,
      { categoria },
      'Categoria creada correctamente.',
      201
    );
  } catch (error) {
    return next(error);
  }
};

export const actualizarCategoria = async (req, res, next) => {
  try {
    const codigo = normalizeCodigo(req.params.codigo);
    const codigoError = validateCodigo(codigo);

    if (codigoError) {
      return errorResponse(res, codigoError, 400);
    }

    const existing = await CategoriaRiesgoModel.findByCodigoIncludingInactive(codigo);
    if (!existing) {
      return errorResponse(res, 'Categoria no encontrada.', 404);
    }

    const { payload, error } = buildCategoryPayload({ body: req.body });
    if (error) {
      return errorResponse(res, error, 400);
    }

    if (Object.keys(payload).length === 0) {
      return errorResponse(res, 'No se enviaron campos validos para actualizar.', 400);
    }

    await CategoriaRiesgoModel.updateByCodigo(codigo, payload);
    const categoria = await CategoriaRiesgoModel.findByCodigoIncludingInactive(codigo);

    return successResponse(
      res,
      { categoria },
      'Categoria actualizada correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

export const cambiarEstadoCategoria = async (req, res, next) => {
  try {
    const codigo = normalizeCodigo(req.params.codigo);
    const codigoError = validateCodigo(codigo);

    if (codigoError) {
      return errorResponse(res, codigoError, 400);
    }

    const activo = parseActivo(req.body?.activo);
    if (activo === null) {
      return errorResponse(res, 'El campo activo debe ser booleano.', 400);
    }

    const existing = await CategoriaRiesgoModel.findByCodigoIncludingInactive(codigo);
    if (!existing) {
      return errorResponse(res, 'Categoria no encontrada.', 404);
    }

    await CategoriaRiesgoModel.updateActivoByCodigo(codigo, activo);
    const categoria = await CategoriaRiesgoModel.findByCodigoIncludingInactive(codigo);

    return successResponse(
      res,
      { categoria },
      'Estado de categoria actualizado correctamente.'
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
    const estadisticas = await CategoriaRiesgoModel.getEstadisticasPorSeveridad();

    const estadisticasPorSeveridad = {};

    // Para cada categoría, contar por severidad
    for (const categoria of estadisticas) {
      estadisticasPorSeveridad[categoria.codigo] = {
        nombre_categoria: categoria.nombre,
        icono: categoria.icono,
        color: categoria.color_hex,
        por_severidad: {
          bajo: Number(categoria.bajo) || 0,
          medio: Number(categoria.medio) || 0,
          alto: Number(categoria.alto) || 0,
          critico: Number(categoria.critico) || 0
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
