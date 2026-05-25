import crypto from 'crypto';
import pool from '../config/database.js';

const hashToken = (token) => crypto
  .createHash('sha256')
  .update(token)
  .digest('hex');

export const FcmTokenModel = {
  registrar: async ({ id_usuario, token, user_agent = null }) => {
    const tokenHash = hashToken(token);
    const safeUserAgent = user_agent ? String(user_agent).slice(0, 255) : null;

    const [result] = await pool.execute(
      `INSERT INTO fcm_tokens
         (id_usuario, token, token_hash, activo, user_agent, last_seen_at)
       VALUES (?, ?, ?, TRUE, ?, NOW())
       ON DUPLICATE KEY UPDATE
         id_usuario = VALUES(id_usuario),
         token = VALUES(token),
         activo = TRUE,
         user_agent = VALUES(user_agent),
         last_seen_at = NOW(),
         updated_at = CURRENT_TIMESTAMP`,
      [id_usuario, token, tokenHash, safeUserAgent]
    );

    return {
      id_fcm_token: result.insertId || null,
      token_hash: tokenHash,
      registrado: true,
    };
  },

  desactivar: async (token) => {
    const tokenHash = hashToken(token);
    const [result] = await pool.execute(
      `UPDATE fcm_tokens
       SET activo = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE token_hash = ?`,
      [tokenHash]
    );

    return result.affectedRows > 0;
  },

  findActivosByUsuario: async (id_usuario) => {
    const [rows] = await pool.execute(
      `SELECT id_fcm_token, token, token_hash, user_agent, last_seen_at
       FROM fcm_tokens
       WHERE id_usuario = ? AND activo = TRUE
       ORDER BY last_seen_at DESC`,
      [id_usuario]
    );

    return rows;
  },
};

export default FcmTokenModel;
