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

    // Elimina un usuario con (Soft Delete)
  remove: async (id_usuario) => {
    const [result] = await pool.execute(
      `UPDATE usuarios SET deleted_at = NOW() WHERE id_usuario = ? AND deleted_at IS NULL`,
      [id_usuario]
    );
    return result.affectedRows > 0;
  },
};
