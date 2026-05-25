import pool from '../config/database.js';
import { tableExists } from '../config/schema-compat.js';

export const CATEGORIAS_FALLBACK = [
  {
    id_categoria: 1,
    codigo: 'agua',
    nombre: 'Contaminacion de Agua',
    descripcion: 'Contaminacion del recurso hidrico',
    icono: 'droplet',
    color_hex: '#3B82F6',
    nivel_prioridad_default: 3,
    activo: 1,
  },
  {
    id_categoria: 2,
    codigo: 'aire',
    nombre: 'Contaminacion del Aire',
    descripcion: 'Presencia de contaminantes atmosfericos',
    icono: 'wind',
    color_hex: '#6B7280',
    nivel_prioridad_default: 2,
    activo: 1,
  },
  {
    id_categoria: 3,
    codigo: 'suelo',
    nombre: 'Contaminacion del Suelo',
    descripcion: 'Degradacion o contaminacion del suelo',
    icono: 'leaf',
    color_hex: '#84CC16',
    nivel_prioridad_default: 2,
    activo: 1,
  },
  {
    id_categoria: 4,
    codigo: 'ruido',
    nombre: 'Contaminacion por Ruido',
    descripcion: 'Exceso de ruido ambiental',
    icono: 'volume2',
    color_hex: '#A855F7',
    nivel_prioridad_default: 2,
    activo: 1,
  },
  {
    id_categoria: 5,
    codigo: 'residuos',
    nombre: 'Residuos y Desechos',
    descripcion: 'Acumulacion o disposicion incorrecta de basura',
    icono: 'trash2',
    color_hex: '#EF4444',
    nivel_prioridad_default: 2,
    activo: 1,
  },
  {
    id_categoria: 6,
    codigo: 'luminica',
    nombre: 'Contaminacion Luminica',
    descripcion: 'Exceso de iluminacion artificial',
    icono: 'lightbulb',
    color_hex: '#F59E0B',
    nivel_prioridad_default: 1,
    activo: 1,
  },
  {
    id_categoria: 7,
    codigo: 'deforestacion',
    nombre: 'Deforestacion',
    descripcion: 'Tala o perdida de cobertura forestal',
    icono: 'trees',
    color_hex: '#22C55E',
    nivel_prioridad_default: 3,
    activo: 1,
  },
  {
    id_categoria: 8,
    codigo: 'incendios_forestales',
    nombre: 'Incendios Forestales',
    descripcion: 'Fuegos descontrolados en bosques o vegetacion',
    icono: 'flame',
    color_hex: '#DC2626',
    nivel_prioridad_default: 4,
    activo: 1,
  },
  {
    id_categoria: 9,
    codigo: 'deslizamientos',
    nombre: 'Deslizamientos',
    descripcion: 'Movimientos de masa en laderas o taludes',
    icono: 'mountain',
    color_hex: '#92400E',
    nivel_prioridad_default: 4,
    activo: 1,
  },
  {
    id_categoria: 10,
    codigo: 'avalanchas_fluviotorrenciales',
    nombre: 'Avalanchas Fluviotorrenciales',
    descripcion: 'Crecidas subitas de rios, quebradas o arroyos',
    icono: 'waves',
    color_hex: '#0EA5E9',
    nivel_prioridad_default: 4,
    activo: 1,
  },
  {
    id_categoria: 11,
    codigo: 'otro',
    nombre: 'Otro',
    descripcion: 'Otros tipos de riesgo ambiental',
    icono: 'helpCircle',
    color_hex: '#8B5CF6',
    nivel_prioridad_default: 2,
    activo: 1,
  },
];

const hasCategoriasTable = () => tableExists('categorias_riesgo');

const withReportStats = async (categorias) => {
  const [rows] = await pool.execute(
    `SELECT tipo_contaminacion AS codigo,
            COUNT(*) AS total_reportes,
            SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
            SUM(CASE WHEN estado = 'en_revision' THEN 1 ELSE 0 END) AS en_revision,
            SUM(CASE WHEN estado = 'verificado' THEN 1 ELSE 0 END) AS verificados,
            SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) AS en_proceso,
            SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END) AS resueltos,
            SUM(CASE WHEN estado = 'rechazado' THEN 1 ELSE 0 END) AS rechazados,
            SUM(CASE WHEN nivel_severidad = 'bajo' THEN 1 ELSE 0 END) AS bajo,
            SUM(CASE WHEN nivel_severidad = 'medio' THEN 1 ELSE 0 END) AS medio,
            SUM(CASE WHEN nivel_severidad = 'alto' THEN 1 ELSE 0 END) AS alto,
            SUM(CASE WHEN nivel_severidad = 'critico' THEN 1 ELSE 0 END) AS critico
     FROM reportes
     WHERE deleted_at IS NULL
     GROUP BY tipo_contaminacion`
  );

  const statsByCodigo = new Map(rows.map((row) => [row.codigo, row]));

  return categorias.map((categoria) => ({
    ...categoria,
    total_reportes: 0,
    pendientes: 0,
    en_revision: 0,
    verificados: 0,
    en_proceso: 0,
    resueltos: 0,
    rechazados: 0,
    bajo: 0,
    medio: 0,
    alto: 0,
    critico: 0,
    ...(statsByCodigo.get(categoria.codigo) ?? {}),
  }));
};

/**
 * Modelo para gestionar categorías de riesgo ambiental
 * 
 * Esta tabla almacena la metadata de cada categoría de reporte,
 * permitiendo gestionar información adicional como iconos, colores,
 * niveles de prioridad por defecto, etc.
 */

export const CategoriaRiesgoModel = {
  /**
   * Obtiene todas las categorías activas
   * @param {boolean} activas - Si es true, solo retorna categorías activas
   * @returns {Promise<Array>} Array de categorías
   */
  findAll: async (activas = true) => {
    try {
      if (!await hasCategoriasTable()) {
        const categorias = activas
          ? CATEGORIAS_FALLBACK.filter((categoria) => categoria.activo)
          : CATEGORIAS_FALLBACK;

        return withReportStats(categorias);
      }

      const whereClause = activas ? ' WHERE cr.activo = 1' : '';
      
      const [rows] = await pool.execute(
        `SELECT 
          cr.id_categoria,
          cr.codigo,
          cr.nombre,
          cr.descripcion,
          cr.icono,
          cr.color_hex,
          cr.nivel_prioridad_default,
          cr.activo,
          COUNT(r.id_reporte) as total_reportes
         FROM categorias_riesgo cr
         LEFT JOIN reportes r ON r.tipo_contaminacion = cr.codigo 
           AND r.deleted_at IS NULL
         ${whereClause}
         GROUP BY cr.id_categoria, cr.codigo
         ORDER BY cr.nombre ASC`,
        []
      );

      return rows;
    } catch (error) {
      console.error('Error en CategoriaRiesgoModel.findAll:', error);
      throw error;
    }
  },

  /**
   * Obtiene una categoría por su código
   * @param {string} codigo - Código de la categoría (ej: 'deforestacion')
   * @returns {Promise<Object|null>} Objeto categoría o null
   */
  findByCodigo: async (codigo) => {
    try {
      if (!await hasCategoriasTable()) {
        const [categoria] = await withReportStats(
          CATEGORIAS_FALLBACK.filter((item) => item.codigo === codigo && item.activo)
        );

        return categoria ?? null;
      }

      const [rows] = await pool.execute(
        `SELECT 
          cr.id_categoria,
          cr.codigo,
          cr.nombre,
          cr.descripcion,
          cr.icono,
          cr.color_hex,
          cr.nivel_prioridad_default,
          cr.activo,
          COUNT(r.id_reporte) as total_reportes
         FROM categorias_riesgo cr
         LEFT JOIN reportes r ON r.tipo_contaminacion = cr.codigo 
           AND r.deleted_at IS NULL
         WHERE cr.codigo = ? AND cr.activo = 1
         GROUP BY cr.id_categoria`,
        [codigo]
      );

      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error en CategoriaRiesgoModel.findByCodigo:', error);
      throw error;
    }
  },

  findByCodigoIncludingInactive: async (codigo) => {
    try {
      if (!await hasCategoriasTable()) {
        return CATEGORIAS_FALLBACK.find((item) => item.codigo === codigo) ?? null;
      }

      const [rows] = await pool.execute(
        `SELECT 
          cr.id_categoria,
          cr.codigo,
          cr.nombre,
          cr.descripcion,
          cr.icono,
          cr.color_hex,
          cr.nivel_prioridad_default,
          cr.activo,
          cr.created_at,
          cr.updated_at
         FROM categorias_riesgo cr
         WHERE cr.codigo = ? AND cr.deleted_at IS NULL
         LIMIT 1`,
        [codigo]
      );

      return rows[0] ?? null;
    } catch (error) {
      console.error('Error en CategoriaRiesgoModel.findByCodigoIncludingInactive:', error);
      throw error;
    }
  },

  create: async ({
    codigo,
    nombre,
    descripcion = null,
    icono = null,
    color_hex = null,
    nivel_prioridad_default = null,
    activo = true,
  }) => {
    try {
      if (!await hasCategoriasTable()) {
        const error = new Error('La tabla categorias_riesgo no existe en la base de datos actual.');
        error.code = 'ER_NO_SUCH_TABLE';
        throw error;
      }

      const [result] = await pool.execute(
        `INSERT INTO categorias_riesgo
           (codigo, nombre, descripcion, icono, color_hex, nivel_prioridad_default, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          codigo,
          nombre,
          descripcion,
          icono,
          color_hex,
          nivel_prioridad_default,
          activo ? 1 : 0,
        ]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error en CategoriaRiesgoModel.create:', error);
      throw error;
    }
  },

  updateByCodigo: async (codigo, fields) => {
    try {
      if (!await hasCategoriasTable()) {
        return false;
      }

      const allowed = [
        'nombre',
        'descripcion',
        'icono',
        'color_hex',
        'nivel_prioridad_default',
      ];
      const sets = [];
      const params = [];

      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(fields, key)) {
          sets.push(`${key} = ?`);
          params.push(fields[key]);
        }
      }

      if (sets.length === 0) {
        return false;
      }

      params.push(codigo);

      const [result] = await pool.execute(
        `UPDATE categorias_riesgo
         SET ${sets.join(', ')}, updated_at = NOW()
         WHERE codigo = ? AND deleted_at IS NULL`,
        params
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error en CategoriaRiesgoModel.updateByCodigo:', error);
      throw error;
    }
  },

  updateActivoByCodigo: async (codigo, activo) => {
    try {
      if (!await hasCategoriasTable()) {
        return false;
      }

      const [result] = await pool.execute(
        `UPDATE categorias_riesgo
         SET activo = ?, updated_at = NOW()
         WHERE codigo = ? AND deleted_at IS NULL`,
        [activo ? 1 : 0, codigo]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error en CategoriaRiesgoModel.updateActivoByCodigo:', error);
      throw error;
    }
  },

  /**
   * Obtiene estadísticas de reportes por categoría
   * @returns {Promise<Array>} Array con estadísticas por categoría
   */
  getEstadisticasPorCategoria: async () => {
    try {
      if (!await hasCategoriasTable()) {
        return withReportStats(CATEGORIAS_FALLBACK.filter((categoria) => categoria.activo));
      }

      const [rows] = await pool.execute(
        `SELECT 
          cr.codigo,
          cr.nombre,
          cr.icono,
          cr.color_hex,
          COUNT(r.id_reporte) as total_reportes,
          SUM(CASE WHEN r.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
          SUM(CASE WHEN r.estado = 'en_revision' THEN 1 ELSE 0 END) as en_revision,
          SUM(CASE WHEN r.estado = 'verificado' THEN 1 ELSE 0 END) as verificados,
          SUM(CASE WHEN r.estado = 'resuelto' THEN 1 ELSE 0 END) as resueltos,
          SUM(CASE WHEN r.nivel_severidad = 'critico' THEN 1 ELSE 0 END) as criticos
         FROM categorias_riesgo cr
         LEFT JOIN reportes r ON r.tipo_contaminacion = cr.codigo 
           AND r.deleted_at IS NULL
         WHERE cr.activo = 1
         GROUP BY cr.id_categoria, cr.codigo
         ORDER BY total_reportes DESC, cr.nombre ASC`,
        []
      );

      return rows;
    } catch (error) {
      console.error('Error en CategoriaRiesgoModel.getEstadisticasPorCategoria:', error);
      throw error;
    }
  },

  getEstadisticasPorSeveridad: async () => {
    try {
      if (!await hasCategoriasTable()) {
        return withReportStats(CATEGORIAS_FALLBACK.filter((categoria) => categoria.activo));
      }

      const [rows] = await pool.execute(
        `SELECT
          cr.codigo,
          cr.nombre,
          cr.icono,
          cr.color_hex,
          SUM(CASE WHEN r.nivel_severidad = 'bajo' THEN 1 ELSE 0 END) AS bajo,
          SUM(CASE WHEN r.nivel_severidad = 'medio' THEN 1 ELSE 0 END) AS medio,
          SUM(CASE WHEN r.nivel_severidad = 'alto' THEN 1 ELSE 0 END) AS alto,
          SUM(CASE WHEN r.nivel_severidad = 'critico' THEN 1 ELSE 0 END) AS critico
         FROM categorias_riesgo cr
         LEFT JOIN reportes r ON r.tipo_contaminacion = cr.codigo
           AND r.deleted_at IS NULL
         WHERE cr.activo = 1
         GROUP BY cr.id_categoria, cr.codigo, cr.nombre, cr.icono, cr.color_hex
         ORDER BY cr.nombre ASC`,
        []
      );

      return rows;
    } catch (error) {
      console.error('Error en CategoriaRiesgoModel.getEstadisticasPorSeveridad:', error);
      throw error;
    }
  },

  /**
   * Valida si un código de categoría existe y está activo
   * @param {string} codigo - Código de categoría
   * @returns {Promise<boolean>} true si existe y está activo
   */
  esValido: async function (codigo) {
    try {
      const categoria = await this.findByCodigo(codigo);
      return Boolean(categoria?.activo);
    } catch (error) {
      console.error('Error en CategoriaRiesgoModel.esValido:', error);
      throw error;
    }
  },

  /**
   * Obtiene todos los códigos válidos de categorías para validación
   * @returns {Promise<Array>} Array de códigos de categorías
   */
  obtenerCodigosValidos: async () => {
    try {
      if (!await hasCategoriasTable()) {
        return CATEGORIAS_FALLBACK
          .filter((categoria) => categoria.activo)
          .map((categoria) => categoria.codigo);
      }

      const [rows] = await pool.execute(
        `SELECT codigo FROM categorias_riesgo WHERE activo = 1 ORDER BY nombre ASC`,
        []
      );

      return rows.map(row => row.codigo);
    } catch (error) {
      console.error('Error en CategoriaRiesgoModel.obtenerCodigosValidos:', error);
      throw error;
    }
  }
};
