import pool from '../config/database.js';

export const UsuarioModel = {

  // Columnas públicas del usuario (sin password_hash)
  _publicUserFields: `id_usuario, uuid, nombre, apellido, email,
              rol, activo, email_verificado, avatar_url, telefono,
              created_at, updated_at`,
  
    // Busca un usuario por su email 
  findByEmail: async (email) => {
    const [rows] = await pool.execute(
      `SELECT id_usuario, uuid, nombre, apellido, email, password_hash,
              rol, activo, email_verificado, avatar_url, telefono, ultimo_acceso,
              created_at, updated_at
       FROM usuarios
       WHERE email = ? AND deleted_at IS NULL
       LIMIT 1`,
      [email]
    );
    return rows[0] ?? null;
  },

  
    // Busca un usuario por su id_usuario 
   
  findById: async (id_usuario) => {
    const [rows] = await pool.execute(
      `SELECT id_usuario, uuid, nombre, apellido, email,
              rol, activo, email_verificado, avatar_url, telefono, ultimo_acceso,
              created_at, updated_at
       FROM usuarios
       WHERE id_usuario = ? AND deleted_at IS NULL
       LIMIT 1`,
      [id_usuario]
    );
    return rows[0] ?? null;
  },

  
    // Busca un usuario por su uuid  
   
  findByUuid: async (uuid) => {
    const [rows] = await pool.execute(
      `SELECT id_usuario, uuid, nombre, apellido, email,
              rol, activo, email_verificado, avatar_url, telefono, ultimo_acceso,
              created_at, updated_at
       FROM usuarios
       WHERE uuid = ? AND deleted_at IS NULL
       LIMIT 1`,
      [uuid]
    );
    return rows[0] ?? null;
  },

  // Busca usuario por id con los campos públicos para perfil
  findByIdWithDetails: async (id_usuario) => {
    const [rows] = await pool.execute(
      `SELECT ${UsuarioModel._publicUserFields}
       FROM usuarios
       WHERE id_usuario = ? AND deleted_at IS NULL
       LIMIT 1`,
      [id_usuario]
    );

    return rows[0] ?? null;
  },

  // Lista usuarios con filtros opcionales
  findAll: async ({ rol, activo, search, limit, offset } = {}) => {
    const conditions = ['deleted_at IS NULL'];
    const params = [];

    if (rol) {
      conditions.push('rol = ?');
      params.push(rol);
    }

    if (activo !== undefined && activo !== null) {
      conditions.push('activo = ?');
      params.push(activo);
    }

    if (search) {
      const like = `%${search}%`;
      conditions.push('(nombre LIKE ? OR apellido LIKE ? OR email LIKE ?)');
      params.push(like, like, like);
    }

    let query = `SELECT ${UsuarioModel._publicUserFields}
       FROM usuarios
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC`;

    if (limit !== undefined && limit !== null) {
      query += ' LIMIT ?';
      params.push(Number(limit));

      if (offset !== undefined && offset !== null) {
        query += ' OFFSET ?';
        params.push(Number(offset));
      }
    }

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  // Cuenta usuarios con filtros opcionales
  countAll: async ({ rol, activo, search } = {}) => {
    const conditions = ['deleted_at IS NULL'];
    const params = [];

    if (rol) {
      conditions.push('rol = ?');
      params.push(rol);
    }

    if (activo !== undefined && activo !== null) {
      conditions.push('activo = ?');
      params.push(activo);
    }

    if (search) {
      const like = `%${search}%`;
      conditions.push('(nombre LIKE ? OR apellido LIKE ? OR email LIKE ?)');
      params.push(like, like, like);
    }

    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM usuarios
       WHERE ${conditions.join(' AND ')}`,
      params
    );

    return rows[0]?.total ?? 0;
  },

  
   //Crea un nuevo usuario.
   
  create: async ({ nombre, apellido, email, password_hash, rol = 'ciudadano', telefono = null }) => {
    const [result] = await pool.execute(
      `INSERT INTO usuarios (nombre, apellido, email, password_hash, rol, telefono)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, email, password_hash, rol, telefono]
    );
    return result.insertId;
  },

    //actualizar ultimo acceso del usuario

  updateUltimoAcceso: async (id_usuario) => {
    await pool.execute(
      `UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = ?`,
      [id_usuario]
    );
  },

  // Actualiza solo campos permitidos del perfil y retorna usuario actualizado
  updatePerfil: async (id_usuario, { nombre, apellido, telefono, avatar_url }) => {
    const [result] = await pool.execute(
      `UPDATE usuarios
       SET nombre = ?, apellido = ?, telefono = ?, avatar_url = ?, updated_at = NOW()
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [nombre, apellido, telefono, avatar_url, id_usuario]
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return UsuarioModel.findByIdWithDetails(id_usuario);
  },

  // Actualiza password_hash y updated_at
  updatePassword: async (id_usuario, newPasswordHash) => {
    const [result] = await pool.execute(
      `UPDATE usuarios
       SET password_hash = ?, updated_at = NOW()
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [newPasswordHash, id_usuario]
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return UsuarioModel.findByIdWithDetails(id_usuario);
  },

  // Actualiza rol del usuario
  updateRol: async (id_usuario, rol) => {
    const [result] = await pool.execute(
      `UPDATE usuarios
       SET rol = ?, updated_at = NOW()
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [rol, id_usuario]
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return UsuarioModel.findByIdWithDetails(id_usuario);
  },

  // Activa o desactiva usuario
  updateActivo: async (id_usuario, activo) => {
    const [result] = await pool.execute(
      `UPDATE usuarios
       SET activo = ?, updated_at = NOW()
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [activo, id_usuario]
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return UsuarioModel.findByIdWithDetails(id_usuario);
  },

  // Estadisticas generales de usuarios
  getStats: async () => {
    const [rows] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN rol = 'ciudadano' THEN 1 ELSE 0 END) AS ciudadanos,
         SUM(CASE WHEN rol = 'moderador' THEN 1 ELSE 0 END) AS moderadores,
         SUM(CASE WHEN rol = 'admin' THEN 1 ELSE 0 END) AS admins,
         SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) AS activos,
         SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) AS inactivos,
         SUM(CASE WHEN created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') THEN 1 ELSE 0 END) AS nuevos_este_mes
       FROM usuarios
       WHERE deleted_at IS NULL`
    );

    return rows[0] ?? {
      total: 0,
      ciudadanos: 0,
      moderadores: 0,
      admins: 0,
      activos: 0,
      inactivos: 0,
      nuevos_este_mes: 0,
    };
  },

    // Elimina un usuario con (Soft Delete)
  remove: async (id_usuario) => {
    const [result] = await pool.execute(
      `UPDATE usuarios SET deleted_at = NOW() WHERE id_usuario = ? AND deleted_at IS NULL`,
      [id_usuario]
    );
    return result.affectedRows > 0;
  },
};
