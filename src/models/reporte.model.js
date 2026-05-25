import pool from '../config/database.js';
import { randomUUID } from 'crypto';

export const ReporteModel = {
  
    // Lista reportes con filtros opcionales y paginación
   
  findAll: async ({
    estado,
    tipo_contaminacion,
    subcategoria,
    nivel_severidad,
    municipio,
    limit = 20,
    offset = 0,
  } = {}) => {
    const conditions = ['r.deleted_at IS NULL'];
    const params = [];

    if (estado) {
      conditions.push('r.estado = ?');
      params.push(estado);
    }
    if (tipo_contaminacion) {
      conditions.push('r.tipo_contaminacion = ?');
      params.push(tipo_contaminacion);
    }
    if (subcategoria) {
      conditions.push('r.subcategoria = ?');
      params.push(subcategoria);
    }
    if (nivel_severidad) {
      conditions.push('r.nivel_severidad = ?');
      params.push(nivel_severidad);
    }
    if (municipio) {
      conditions.push('r.municipio = ?');
      params.push(municipio);
    }

    const where = conditions.join(' AND ');
    const safeLimit  = Math.max(1, Math.min(100, parseInt(limit,  10) || 20));
    const safeOffset = Math.max(0,               parseInt(offset, 10) || 0);

    const [rows] = await pool.execute(
      `SELECT r.id_reporte, r.uuid, r.id_usuario,
              r.tipo_contaminacion, r.subcategoria, r.estado, r.nivel_severidad,
              r.titulo, r.descripcion,
              r.latitud, r.longitud, r.direccion, r.municipio, r.departamento,
              r.votos_relevancia, r.vistas,
              r.created_at, r.updated_at,
              u.nombre AS autor_nombre, u.apellido AS autor_apellido, u.rol AS autor_rol
       FROM reportes r
       LEFT JOIN usuarios u ON u.id_usuario = r.id_usuario
       WHERE ${where}
       ORDER BY r.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );
    return rows;
  },

  // Exporta reportes con filtros opcionales (para CSV/JSON)
  findForExport: async ({
    estado,
    tipo_contaminacion,
    subcategoria,
    nivel_severidad,
    municipio,
    desde,
    hasta,
  } = {}) => {
    const conditions = ['r.deleted_at IS NULL'];
    const params = [];

    if (estado) {
      conditions.push('r.estado = ?');
      params.push(estado);
    }
    if (tipo_contaminacion) {
      conditions.push('r.tipo_contaminacion = ?');
      params.push(tipo_contaminacion);
    }
    if (subcategoria) {
      conditions.push('r.subcategoria = ?');
      params.push(subcategoria);
    }
    if (nivel_severidad) {
      conditions.push('r.nivel_severidad = ?');
      params.push(nivel_severidad);
    }
    if (municipio) {
      conditions.push('r.municipio = ?');
      params.push(municipio);
    }
    if (desde) {
      conditions.push('r.created_at >= ?');
      params.push(desde);
    }
    if (hasta) {
      conditions.push('r.created_at <= ?');
      params.push(hasta);
    }

    const where = conditions.join(' AND ');

    const [rows] = await pool.execute(
      `SELECT r.titulo,
              r.tipo_contaminacion,
              r.subcategoria,
              r.nivel_severidad,
              r.estado,
              r.municipio,
              r.created_at,
              u.nombre AS autor_nombre,
              u.apellido AS autor_apellido
       FROM reportes r
       LEFT JOIN usuarios u ON u.id_usuario = r.id_usuario
       WHERE ${where}
       ORDER BY r.created_at DESC`,
      params
    );

    return rows;
  },

  
    // Busca un reporte por id_reporte 
   
  findById: async (id_reporte) => {
    const [rows] = await pool.execute(
      `SELECT r.id_reporte, r.uuid, r.id_usuario,
              r.tipo_contaminacion, r.subcategoria, r.estado, r.nivel_severidad,
              r.titulo, r.descripcion,
              r.latitud, r.longitud, r.direccion, r.municipio, r.departamento,
              r.ia_etiquetas, r.ia_confianza, r.ia_procesado,
              r.votos_relevancia, r.vistas,
              r.comentario_moderacion,
              r.created_at, r.updated_at
       FROM reportes r
       WHERE r.id_reporte = ? AND r.deleted_at IS NULL
       LIMIT 1`,
      [id_reporte]
    );
    return rows[0] ?? null;
  },

  
    //Busca los reportes creados por un usuario específico
   
  findByUsuario: async (id_usuario, { limit = 20, offset = 0 } = {}) => {
    const safeLimit  = Math.max(1, Math.min(100, parseInt(limit,  10) || 20));
    const safeOffset = Math.max(0,               parseInt(offset, 10) || 0);
    const [rows] = await pool.execute(
      `SELECT id_reporte, uuid, tipo_contaminacion, subcategoria, estado, nivel_severidad,
              titulo, municipio, departamento, votos_relevancia, vistas,
              created_at, updated_at
       FROM reportes
       WHERE id_usuario = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [id_usuario]
    );
    return rows;
  },

  
    // Crea un nuevo reporte, genera punto_geo automáticamente a partir de lat/lon
    
  create: async ({
    id_usuario,
    tipo_contaminacion,
    subcategoria = null,
    nivel_severidad = 'medio',
    titulo,
    descripcion = null,
    latitud,
    longitud,
    direccion = null,
    municipio = null,
    departamento = null,
  }) => {
    const uuid = randomUUID();
    const hasCoords = latitud !== null && latitud !== undefined &&
                      longitud !== null && longitud !== undefined;

    if (hasCoords) {
      const [result] = await pool.execute(
        `INSERT INTO reportes
           (uuid, id_usuario, tipo_contaminacion, subcategoria, nivel_severidad, titulo, descripcion,
            latitud, longitud, direccion, municipio, departamento, punto_geo)
         VALUES
           (?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ST_GeomFromText(CONCAT('POINT(', ?, ' ', ?, ')'), 4326))`,
        [
          uuid,
          id_usuario, tipo_contaminacion, subcategoria, nivel_severidad, titulo, descripcion,
          latitud, longitud, direccion, municipio, departamento,
          longitud, latitud,
        ]
      );
      return result.insertId;
    } else {
      const [result] = await pool.execute(
        `INSERT INTO reportes
           (uuid, id_usuario, tipo_contaminacion, subcategoria, nivel_severidad, titulo, descripcion,
            latitud, longitud, direccion, municipio, departamento)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid,
         id_usuario, tipo_contaminacion, subcategoria, nivel_severidad, titulo, descripcion,
         null, null, direccion, municipio, departamento]
      );
      return result.insertId;
    }
  },

  
    //Actualiza campos permitidos de un reporte
  
  update: async (id_reporte, campos) => {
    const permitidos = [
      'estado', 'nivel_severidad', 'titulo', 'descripcion',
      'direccion', 'municipio', 'departamento', 'subcategoria', 'comentario_moderacion',
    ];

    const sets = [];
    const params = [];

    for (const key of permitidos) {
      if (Object.prototype.hasOwnProperty.call(campos, key)) {
        sets.push(`${key} = ?`);
        params.push(campos[key]);
      }
    }

    if (sets.length === 0) return false;

    params.push(id_reporte);

    const [result] = await pool.execute(
      `UPDATE reportes SET ${sets.join(', ')} WHERE id_reporte = ? AND deleted_at IS NULL`,
      params
    );
    return result.affectedRows > 0;
  },

  
    // Incrementa el contador de vistas en 1
   
  incrementarVistas: async (id_reporte) => {
    await pool.execute(
      `UPDATE reportes SET vistas = vistas + 1 WHERE id_reporte = ? AND deleted_at IS NULL`,
      [id_reporte]
    );
  },

  
    // Soft-delete de un reporte
  
  remove: async (id_reporte) => {
    const [result] = await pool.execute(
      `UPDATE reportes SET deleted_at = NOW() WHERE id_reporte = ? AND deleted_at IS NULL`,
      [id_reporte]
    );
    return result.affectedRows > 0;
  },

  // Cuenta total de reportes de un usuario específico
  countByUsuario: async (id_usuario) => {
    const [[row]] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM reportes
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [id_usuario]
    );
    return row?.total ?? 0;
  },

  // Estadísticas globales para Dashboard y Home
  getStats: async () => {
    const [[r]] = await pool.execute(
      `SELECT
         COUNT(*)                                                                          AS total_reportes,
         SUM(CASE WHEN MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW()) THEN 1 ELSE 0 END) AS reportes_este_mes,
         SUM(CASE WHEN estado='en_revision'  THEN 1 ELSE 0 END)                          AS en_revision,
         SUM(CASE WHEN estado='resuelto'     THEN 1 ELSE 0 END)                          AS resueltos,
         COUNT(DISTINCT CASE WHEN municipio IS NOT NULL AND municipio!='' THEN municipio END) AS municipios_activos,
         SUM(CASE WHEN estado IN ('en_revision','verificado','en_proceso') THEN 1 ELSE 0 END) AS con_seguimiento
       FROM reportes WHERE deleted_at IS NULL`
    );
    const [[u]] = await pool.execute(
      `SELECT COUNT(*) AS total_usuarios FROM usuarios WHERE activo=1 AND deleted_at IS NULL`
    );
    return { ...r, ...u };
  },

  // Conteos de reportes agrupados por categoria para analitica publica
  getStatsByCategoria: async () => {
    const [rows] = await pool.execute(
      `SELECT
         cr.codigo,
         cr.nombre,
         cr.icono,
         cr.color_hex,
         COUNT(r.id_reporte) AS total_reportes,
         SUM(CASE WHEN r.estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
         SUM(CASE WHEN r.estado = 'en_revision' THEN 1 ELSE 0 END) AS en_revision,
         SUM(CASE WHEN r.estado = 'verificado' THEN 1 ELSE 0 END) AS verificados,
         SUM(CASE WHEN r.estado = 'en_proceso' THEN 1 ELSE 0 END) AS en_proceso,
         SUM(CASE WHEN r.estado = 'resuelto' THEN 1 ELSE 0 END) AS resueltos,
         SUM(CASE WHEN r.estado = 'rechazado' THEN 1 ELSE 0 END) AS rechazados,
         SUM(CASE WHEN r.nivel_severidad = 'bajo' THEN 1 ELSE 0 END) AS bajo,
         SUM(CASE WHEN r.nivel_severidad = 'medio' THEN 1 ELSE 0 END) AS medio,
         SUM(CASE WHEN r.nivel_severidad = 'alto' THEN 1 ELSE 0 END) AS alto,
         SUM(CASE WHEN r.nivel_severidad = 'critico' THEN 1 ELSE 0 END) AS critico
       FROM categorias_riesgo cr
       LEFT JOIN reportes r ON r.tipo_contaminacion = cr.codigo
        AND r.deleted_at IS NULL
       WHERE cr.activo = 1
       GROUP BY cr.id_categoria, cr.codigo, cr.nombre, cr.icono, cr.color_hex
       ORDER BY total_reportes DESC, cr.nombre ASC`
    );

    return rows;
  },

  // Timeline de reportes agrupado por semana o mes
  getStatsTimeline: async ({ bucket = 'week', limit = 12 } = {}) => {
    const safeLimit = Math.max(1, Math.min(60, parseInt(limit, 10) || 12));
    const isMonth = bucket === 'month';

    const periodKey = isMonth
      ? "DATE_FORMAT(r.created_at, '%Y-%m')"
      : "CONCAT(YEARWEEK(r.created_at, 3), '')";
    const periodLabel = isMonth
      ? "DATE_FORMAT(r.created_at, '%Y-%m')"
      : "CONCAT(YEAR(DATE_SUB(DATE(r.created_at), INTERVAL WEEKDAY(r.created_at) DAY)), '-W', LPAD(WEEK(r.created_at, 3), 2, '0'))";
    const periodStart = isMonth
      ? "DATE_FORMAT(r.created_at, '%Y-%m-01')"
      : "DATE_FORMAT(DATE_SUB(DATE(r.created_at), INTERVAL WEEKDAY(r.created_at) DAY), '%Y-%m-%d')";

    const [rows] = await pool.execute(
      `SELECT *
       FROM (
         SELECT
           ${periodKey} AS periodo_key,
           ${periodLabel} AS periodo,
           ${periodStart} AS periodo_inicio,
           COUNT(*) AS total_reportes,
           SUM(CASE WHEN r.nivel_severidad = 'bajo' THEN 1 ELSE 0 END) AS bajo,
           SUM(CASE WHEN r.nivel_severidad = 'medio' THEN 1 ELSE 0 END) AS medio,
           SUM(CASE WHEN r.nivel_severidad = 'alto' THEN 1 ELSE 0 END) AS alto,
           SUM(CASE WHEN r.nivel_severidad = 'critico' THEN 1 ELSE 0 END) AS critico,
           SUM(CASE WHEN r.estado = 'resuelto' THEN 1 ELSE 0 END) AS resueltos
         FROM reportes r
         WHERE r.deleted_at IS NULL
         GROUP BY periodo_key, periodo, periodo_inicio
         ORDER BY periodo_key DESC
         LIMIT ${safeLimit}
       ) timeline
       ORDER BY periodo_key ASC`
    );

    return rows;
  },

  // Puntos georreferenciados para heatmap con intensidad derivada de severidad
  getHeatmapPoints: async () => {
    const [rows] = await pool.execute(
      `SELECT
         r.id_reporte,
         r.tipo_contaminacion,
         r.nivel_severidad,
         r.estado,
         r.municipio,
         r.latitud,
         r.longitud,
         CASE r.nivel_severidad
           WHEN 'critico' THEN 1.0
           WHEN 'alto' THEN 0.75
           WHEN 'medio' THEN 0.5
           WHEN 'bajo' THEN 0.25
           ELSE 0.25
         END AS intensidad,
         r.created_at
       FROM reportes r
       WHERE r.deleted_at IS NULL
        AND r.latitud IS NOT NULL
        AND r.longitud IS NOT NULL
       ORDER BY r.created_at DESC`
    );

    return rows;
  },

};
