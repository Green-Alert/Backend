import pool from '../config/database.js';

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

  /**
   * Obtiene estadísticas de reportes por categoría
   * @returns {Promise<Array>} Array con estadísticas por categoría
   */
  getEstadisticasPorCategoria: async () => {
    try {
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

  /**
   * Valida si un código de categoría existe y está activo
   * @param {string} codigo - Código de categoría
   * @returns {Promise<boolean>} true si existe y está activo
   */
  esValido: async (codigo) => {
    try {
      const categoria = await this.findByCodigo(codigo);
      return categoria !== null;
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
