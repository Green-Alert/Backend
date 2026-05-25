import pool from '../config/database.js';
import { columnExists } from '../config/schema-compat.js';
import { randomUUID } from 'crypto';

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  email_alerts: true,
  push_notifications: false,
  report_updates: true,
  weekly_summary: false,
};

export const parseNotificationPreferences = (preferences) => {
  if (!preferences) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  const parsed = typeof preferences === 'string'
    ? JSON.parse(preferences)
    : preferences;

  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...parsed,
  };
};

export const UsuarioModel = {

  // Columnas públicas del usuario (sin password_hash)
  _publicUserFields: `id_usuario, uuid, nombre, apellido, email,
              rol, activo, email_verificado, avatar_url, telefono,
              created_at, updated_at`,

  _optionalColumnSelect: async (column, fallback = 'NULL') => (
    await columnExists('usuarios', column)
      ? column
      : `${fallback} AS ${column}`
  ),

  _publicUserSelect: async () => {
    const notificationPreferences = await UsuarioModel._optionalColumnSelect(
      'notification_preferences'
    );
    const googleId = await UsuarioModel._optionalColumnSelect('google_id');
    const facebookId = await UsuarioModel._optionalColumnSelect('facebook_id');
    const idEntidad = await UsuarioModel._optionalColumnSelect('id_entidad');

    return `${UsuarioModel._publicUserFields}, ${idEntidad}, ${notificationPreferences}, ${googleId}, ${facebookId}`;
  },
  
    // Busca un usuario por su email 
  findByEmail: async (email) => {
    const publicFields = await UsuarioModel._publicUserSelect();

    const [rows] = await pool.execute(
      `SELECT ${publicFields}, password_hash, ultimo_acceso
       FROM usuarios
       WHERE email = ? AND deleted_at IS NULL
       LIMIT 1`,
      [email]
    );
    return rows[0] ?? null;
  },

  
    // Busca un usuario por su id_usuario 
   
  findById: async (id_usuario) => {
    const publicFields = await UsuarioModel._publicUserSelect();

    const [rows] = await pool.execute(
      `SELECT ${publicFields}, ultimo_acceso
       FROM usuarios
       WHERE id_usuario = ? AND deleted_at IS NULL
       LIMIT 1`,
      [id_usuario]
    );
    return rows[0] ?? null;
  },

  // Busca usuario por id con los campos públicos para perfil
  findByIdWithDetails: async (id_usuario) => {
    const publicFields = await UsuarioModel._publicUserSelect();

    const [rows] = await pool.execute(
      `SELECT ${publicFields}
       FROM usuarios
       WHERE id_usuario = ? AND deleted_at IS NULL
       LIMIT 1`,
      [id_usuario]
    );

    const user = rows[0] ?? null;
    if (!user) {
      return null;
    }

    return {
      ...user,
      notification_preferences: parseNotificationPreferences(user.notification_preferences),
    };
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

    const publicFields = await UsuarioModel._publicUserSelect();

    let query = `SELECT ${publicFields}
       FROM usuarios
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC`;

    if (limit !== undefined && limit !== null) {
      const validLimit = parseInt(limit, 10);
      if (!Number.isInteger(validLimit) || validLimit < 0) {
        throw new Error('limit must be a non-negative integer');
      }
      query += ` LIMIT ${validLimit}`;

      if (offset !== undefined && offset !== null) {
        const validOffset = parseInt(offset, 10);
        if (!Number.isInteger(validOffset) || validOffset < 0) {
          throw new Error('offset must be a non-negative integer');
        }
        query += ` OFFSET ${validOffset}`;
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
   
  create: async ({ nombre, apellido, email, password_hash, rol = 'ciudadano', telefono = null, id_entidad = null }) => {
    const uuid = randomUUID();
    const hasEntidad = await columnExists('usuarios', 'id_entidad');

    const [result] = hasEntidad
      ? await pool.execute(
        `INSERT INTO usuarios (uuid, nombre, apellido, email, password_hash, rol, id_entidad, telefono)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid, nombre, apellido, email, password_hash, rol, id_entidad, telefono]
      )
      : await pool.execute(
        `INSERT INTO usuarios (uuid, nombre, apellido, email, password_hash, rol, telefono)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid, nombre, apellido, email, password_hash, rol, telefono]
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

  updateAvatar: async (id_usuario, avatar_url) => {
    const [result] = await pool.execute(
      `UPDATE usuarios
       SET avatar_url = ?, updated_at = NOW()
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [avatar_url, id_usuario]
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

  updateNotificationPreferences: async (id_usuario, preferences) => {
    if (!await columnExists('usuarios', 'notification_preferences')) {
      return UsuarioModel.findByIdWithDetails(id_usuario);
    }

    const [result] = await pool.execute(
      `UPDATE usuarios
       SET notification_preferences = ?, updated_at = NOW()
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [JSON.stringify(preferences), id_usuario]
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return UsuarioModel.findByIdWithDetails(id_usuario);
  },

  // Guarda token de recuperacion y expiracion
  setResetToken: async (id_usuario, tokenReset, tokenResetExp) => {
    const [result] = await pool.execute(
      `UPDATE usuarios
       SET token_reset = ?, token_reset_exp = ?, updated_at = NOW()
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [tokenReset, tokenResetExp, id_usuario]
    );

    return result.affectedRows > 0;
  },

  // Busca usuario por token de recuperacion
  findByResetToken: async (tokenReset) => {
    const [rows] = await pool.execute(
      `SELECT id_usuario, email, token_reset_exp
       FROM usuarios
       WHERE token_reset = ? AND deleted_at IS NULL
       LIMIT 1`,
      [tokenReset]
    );

    return rows[0] ?? null;
  },

  // Limpia token de recuperacion
  clearResetToken: async (id_usuario) => {
    const [result] = await pool.execute(
      `UPDATE usuarios
       SET token_reset = NULL, token_reset_exp = NULL, updated_at = NOW()
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [id_usuario]
    );

    return result.affectedRows > 0;
  },

  // Guarda token de verificacion de correo y expiracion
  setEmailVerificationToken: async (id_usuario, tokenHash, tokenExp) => {
    const hasEmailToken = await columnExists('usuarios', 'email_verification_token');
    const hasEmailExp = await columnExists('usuarios', 'email_verification_exp');

    if (!hasEmailToken || !hasEmailExp) {
      return UsuarioModel.setOtp(id_usuario, tokenHash, tokenExp);
    }

    const [result] = await pool.execute(
      `UPDATE usuarios
       SET email_verification_token = ?, email_verification_exp = ?, updated_at = NOW()
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [tokenHash, tokenExp, id_usuario]
    );

    return result.affectedRows > 0;
  },

  // Busca usuario por token de verificacion de correo
  findByEmailVerificationToken: async (tokenHash) => {
    const hasEmailToken = await columnExists('usuarios', 'email_verification_token');
    const hasEmailExp = await columnExists('usuarios', 'email_verification_exp');

    if (!hasEmailToken || !hasEmailExp) {
      const [rows] = await pool.execute(
        `SELECT id_usuario, email, email_verificado, otp_exp AS email_verification_exp
         FROM usuarios
         WHERE otp_code_hash = ? AND deleted_at IS NULL
         LIMIT 1`,
        [tokenHash]
      );

      return rows[0] ?? null;
    }

    const [rows] = await pool.execute(
      `SELECT id_usuario, email, email_verificado, email_verification_exp
       FROM usuarios
       WHERE email_verification_token = ? AND deleted_at IS NULL
       LIMIT 1`,
      [tokenHash]
    );

    return rows[0] ?? null;
  },

  // Limpia token de verificacion de correo
  clearEmailVerificationToken: async (id_usuario) => {
    const hasEmailToken = await columnExists('usuarios', 'email_verification_token');
    const hasEmailExp = await columnExists('usuarios', 'email_verification_exp');

    if (!hasEmailToken || !hasEmailExp) {
      return UsuarioModel.clearOtp(id_usuario);
    }

    const [result] = await pool.execute(
      `UPDATE usuarios
       SET email_verification_token = NULL, email_verification_exp = NULL, updated_at = NOW()
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [id_usuario]
    );

    return result.affectedRows > 0;
  },

  // Actualiza rol del usuario
  updateRol: async (id_usuario, rol, id_entidad = null) => {
    const hasEntidad = await columnExists('usuarios', 'id_entidad');

    const [result] = hasEntidad
      ? await pool.execute(
        `UPDATE usuarios
         SET rol = ?, id_entidad = ?, updated_at = NOW()
         WHERE id_usuario = ? AND deleted_at IS NULL`,
        [rol, rol === 'entidad' ? id_entidad : null, id_usuario]
      )
      : await pool.execute(
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

  findActiveByEntidad: async (id_entidad) => {
    if (!await columnExists('usuarios', 'id_entidad')) {
      return [];
    }

    const publicFields = await UsuarioModel._publicUserSelect();
    const [rows] = await pool.execute(
      `SELECT ${publicFields}
       FROM usuarios
       WHERE rol = 'entidad'
         AND id_entidad = ?
         AND activo = 1
         AND deleted_at IS NULL`,
      [id_entidad]
    );

    return rows;
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
         SUM(CASE WHEN rol = 'entidad' THEN 1 ELSE 0 END) AS entidades,
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

  // ============ MÉTODOS PARA OTP DE VERIFICACIÓN DE EMAIL ============

  // Guarda código OTP hasheado y fecha de expiración
  setOtp: async (id_usuario, otpCodeHash, otpExp) => {
    const hasAttempts = await columnExists('usuarios', 'otp_attempts');
    const attemptsSet = hasAttempts ? ', otp_attempts = 0' : '';

    const [result] = await pool.execute(
      `UPDATE usuarios
       SET otp_code_hash = ?, otp_exp = ?${attemptsSet}, updated_at = NOW()
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [otpCodeHash, otpExp, id_usuario]
    );
    return result.affectedRows > 0;
  },

  // Limpia OTP del usuario
  clearOtp: async (id_usuario) => {
    const hasAttempts = await columnExists('usuarios', 'otp_attempts');
    const attemptsSet = hasAttempts ? ', otp_attempts = 0' : '';

    const [result] = await pool.execute(
      `UPDATE usuarios
       SET otp_code_hash = NULL, otp_exp = NULL${attemptsSet}, updated_at = NOW()
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [id_usuario]
    );
    return result.affectedRows > 0;
  },

  // Busca usuario por OTP hasheado
  findByOtpHash: async (otpCodeHash) => {
    const otpAttempts = await UsuarioModel._optionalColumnSelect('otp_attempts', '0');

    const [rows] = await pool.execute(
      `SELECT id_usuario, email, otp_exp, ${otpAttempts}, email_verificado
       FROM usuarios
       WHERE otp_code_hash = ? AND deleted_at IS NULL
       LIMIT 1`,
      [otpCodeHash]
    );
    return rows[0] ?? null;
  },

  // Incrementa contador de intentos fallidos de OTP
  incrementOtpAttempts: async (id_usuario) => {
    if (!await columnExists('usuarios', 'otp_attempts')) {
      return true;
    }

    const [result] = await pool.execute(
      `UPDATE usuarios
       SET otp_attempts = otp_attempts + 1
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [id_usuario]
    );
    return result.affectedRows > 0;
  },

  // Marca email como verificado
  verifyEmail: async (id_usuario) => {
    const hasEmailToken = await columnExists('usuarios', 'email_verification_token');
    const hasEmailExp = await columnExists('usuarios', 'email_verification_exp');
    const clearEmailTokenSet = hasEmailToken && hasEmailExp
      ? `email_verification_token = NULL,
           email_verification_exp = NULL,`
      : '';

    const [result] = await pool.execute(
      `UPDATE usuarios
       SET email_verificado = 1,
           ${clearEmailTokenSet}
           updated_at = NOW()
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [id_usuario]
    );
    return result.affectedRows > 0;
  },

  // Obtiene timestamp del último reenvío de OTP
  getOtpLastRequest: async (id_usuario) => {
    if (!await columnExists('usuarios', 'otp_last_request')) {
      return null;
    }

    const [rows] = await pool.execute(
      `SELECT otp_last_request
       FROM usuarios
       WHERE id_usuario = ? AND deleted_at IS NULL
       LIMIT 1`,
      [id_usuario]
    );
    return rows[0]?.otp_last_request ?? null;
  },

  // Actualiza timestamp del último reenvío de OTP
  updateOtpLastRequest: async (id_usuario) => {
    if (!await columnExists('usuarios', 'otp_last_request')) {
      return true;
    }

    const [result] = await pool.execute(
      `UPDATE usuarios
       SET otp_last_request = NOW()
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [id_usuario]
    );
    return result.affectedRows > 0;
  },

  // ============ MÉTODOS PARA GOOGLE OAUTH ============

  // Busca usuario por google_id
  findByGoogleId: async (google_id) => {
    if (!await columnExists('usuarios', 'google_id')) {
      return null;
    }

    const publicFields = await UsuarioModel._publicUserSelect();

    const [rows] = await pool.execute(
      `SELECT ${publicFields}, google_id
       FROM usuarios
       WHERE google_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [google_id]
    );
    return rows[0] ?? null;
  },

  // Crea usuario desde Google OAuth
  createFromGoogle: async ({ google_id, email, nombre, apellido, avatar_url }) => {
    const uuid = randomUUID();
    const hasGoogleId = await columnExists('usuarios', 'google_id');
    
    try {
      if (!hasGoogleId) {
        const [result] = await pool.execute(
          `INSERT INTO usuarios (uuid, email, nombre, apellido, password_hash, avatar_url, rol, email_verificado)
           VALUES (?, ?, ?, ?, ?, ?, 'ciudadano', 1)`,
          [uuid, email, nombre, apellido, `oauth:${randomUUID()}`, avatar_url]
        );
        return result.insertId;
      }

      const [result] = await pool.execute(
        `INSERT INTO usuarios (uuid, google_id, email, nombre, apellido, password_hash, avatar_url, rol, email_verificado)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'ciudadano', 1)`,
        [uuid, google_id, email, nombre, apellido, `oauth:${randomUUID()}`, avatar_url]
      );
      return result.insertId;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        // Email ya existe, retornar null
        return null;
      }
      throw error;
    }
  },

  // Actualiza google_id de usuario existente
  updateGoogleId: async (id_usuario, google_id) => {
    if (!await columnExists('usuarios', 'google_id')) {
      return true;
    }

    const [result] = await pool.execute(
      `UPDATE usuarios
       SET google_id = ?, updated_at = NOW()
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [google_id, id_usuario]
    );
    return result.affectedRows > 0;
  },

  // Crea usuario desde Facebook OAuth usando email verificado por Facebook
  findByFacebookId: async (facebook_id) => {
    if (!await columnExists('usuarios', 'facebook_id')) {
      return null;
    }

    const publicFields = await UsuarioModel._publicUserSelect();

    const [rows] = await pool.execute(
      `SELECT ${publicFields}, facebook_id
       FROM usuarios
       WHERE facebook_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [facebook_id]
    );
    return rows[0] ?? null;
  },

  updateFacebookId: async (id_usuario, facebook_id) => {
    if (!await columnExists('usuarios', 'facebook_id')) {
      return true;
    }

    const [result] = await pool.execute(
      `UPDATE usuarios
       SET facebook_id = ?, updated_at = NOW()
       WHERE id_usuario = ? AND deleted_at IS NULL`,
      [facebook_id, id_usuario]
    );
    return result.affectedRows > 0;
  },

  createFromFacebook: async ({ facebook_id, email, nombre, apellido, avatar_url }) => {
    const uuid = randomUUID();
    const hasFacebookId = await columnExists('usuarios', 'facebook_id');

    try {
      if (!hasFacebookId) {
        const [result] = await pool.execute(
          `INSERT INTO usuarios (uuid, email, nombre, apellido, password_hash, avatar_url, rol, email_verificado)
           VALUES (?, ?, ?, ?, ?, ?, 'ciudadano', 1)`,
          [uuid, email, nombre, apellido, `oauth:${randomUUID()}`, avatar_url]
        );
        return result.insertId;
      }

      const [result] = await pool.execute(
        `INSERT INTO usuarios (uuid, facebook_id, email, nombre, apellido, password_hash, avatar_url, rol, email_verificado)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'ciudadano', 1)`,
        [uuid, facebook_id, email, nombre, apellido, `oauth:${randomUUID()}`, avatar_url]
      );
      return result.insertId;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return null;
      }
      throw error;
    }
  },
};
