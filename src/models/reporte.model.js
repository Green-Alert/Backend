import pool from '../config/database.js';

export const ReporteModel = {
  
    // Lista reportes con filtros opcionales y paginación
   
  findAll: async ({
    estado,
    tipo_contaminacion,
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
              r.tipo_contaminacion, r.estado, r.nivel_severidad,
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

  
    // Busca un reporte por id_reporte 
   
  findById: async (id_reporte) => {
    const [rows] = await pool.execute(
      `SELECT r.id_reporte, r.uuid, r.id_usuario,
              r.tipo_contaminacion, r.estado, r.nivel_severidad,
              r.titulo, r.descripcion,
              r.latitud, r.longitud, r.direccion, r.municipio, r.departamento,
              r.ia_etiquetas, r.ia_confianza, r.ia_procesado,
              r.votos_relevancia, r.vistas,
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
      `SELECT id_reporte, uuid, tipo_contaminacion, estado, nivel_severidad,
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
    nivel_severidad = 'medio',
    titulo,
    descripcion = null,
    latitud,
    longitud,
    direccion = null,
    municipio = null,
    departamento = null,
  }) => {
    const hasCoords = latitud !== null && latitud !== undefined &&
                      longitud !== null && longitud !== undefined;

    if (hasCoords) {
      const [result] = await pool.execute(
        `INSERT INTO reportes
           (id_usuario, tipo_contaminacion, nivel_severidad, titulo, descripcion,
            latitud, longitud, direccion, municipio, departamento, punto_geo)
         VALUES
           (?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ST_GeomFromText(CONCAT('POINT(', ?, ' ', ?, ')'), 4326))`,
        [
          id_usuario, tipo_contaminacion, nivel_severidad, titulo, descripcion,
          latitud, longitud, direccion, municipio, departamento,
          longitud, latitud,
        ]
      );
      return result.insertId;
    } else {
      const [result] = await pool.execute(
        `INSERT INTO reportes
           (id_usuario, tipo_contaminacion, nivel_severidad, titulo, descripcion,
            latitud, longitud, direccion, municipio, departamento)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id_usuario, tipo_contaminacion, nivel_severidad, titulo, descripcion,
         null, null, direccion, municipio, departamento]
      );
      return result.insertId;
    }
  },

  
    //Actualiza campos permitidos de un reporte
  
  update: async (id_reporte, campos) => {
    const permitidos = [
      'estado', 'nivel_severidad', 'titulo', 'descripcion',
      'direccion', 'municipio', 'departamento',
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
};
