import pool from '../config/database.js';
import { clearSchemaCompatCache, tableExists } from '../config/schema-compat.js';
import { UsuarioModel } from './usuario.model.js';

const memoryTokens = new Map();

const REFRESH_TOKEN_TABLE_REQUIRED_MESSAGE =
  'La tabla refresh_tokens es requerida para persistencia, revocacion y logout global de refresh tokens.';

const isTestEnvironment = () => process.env.NODE_ENV === 'test';

const buildRefreshTokenStorageError = (cause = null) => {
  const error = new Error(REFRESH_TOKEN_TABLE_REQUIRED_MESSAGE);
  error.statusCode = 500;
  if (cause) {
    error.cause = cause;
  }
  return error;
};

const refreshTokensTableExists = async () => tableExists('refresh_tokens');

const getRefreshTokenStorageMode = async () => {
  let hasTable = false;

  try {
    hasTable = await refreshTokensTableExists();
  } catch (error) {
    if (isTestEnvironment()) {
      return 'memory';
    }
    throw buildRefreshTokenStorageError(error);
  }

  if (hasTable) {
    return 'database';
  }

  if (isTestEnvironment()) {
    return 'memory';
  }

  clearSchemaCompatCache();
  hasTable = await refreshTokensTableExists();
  if (hasTable) {
    return 'database';
  }

  throw buildRefreshTokenStorageError();
};

const runRefreshTokenPersistence = async (operation) => {
  try {
    return await operation();
  } catch (error) {
    throw buildRefreshTokenStorageError(error);
  }
};

export const clearRefreshTokenMemoryStore = () => {
  memoryTokens.clear();
};

export const RefreshTokenModel = {
  create: async ({
    id_usuario,
    token_hash,
    expires_at,
    user_agent = null,
    ip_address = null,
  }) => {
    if (await getRefreshTokenStorageMode() === 'memory') {
      const id_refresh_token = memoryTokens.size + 1;
      memoryTokens.set(token_hash, {
        id_refresh_token,
        id_usuario,
        token_hash,
        expires_at,
        revoked_at: null,
        user_agent,
        ip_address,
      });
      return id_refresh_token;
    }

    const [result] = await runRefreshTokenPersistence(() =>
      pool.execute(
        `INSERT INTO refresh_tokens
           (id_usuario, token_hash, expires_at, user_agent, ip_address)
         VALUES (?, ?, ?, ?, ?)`,
        [id_usuario, token_hash, expires_at, user_agent, ip_address]
      )
    );

    return result.insertId;
  },

  findActiveByHash: async (token_hash) => {
    if (await getRefreshTokenStorageMode() === 'memory') {
      const token = memoryTokens.get(token_hash);
      if (!token || token.revoked_at || new Date(token.expires_at).getTime() <= Date.now()) {
        return null;
      }

      const user = await UsuarioModel.findById(token.id_usuario);
      if (!user) {
        return null;
      }

      return {
        ...token,
        ...user,
      };
    }

    const [rows] = await runRefreshTokenPersistence(() =>
      pool.execute(
        `SELECT rt.id_refresh_token, rt.id_usuario, rt.token_hash, rt.expires_at,
                u.uuid, u.nombre, u.apellido, u.email, u.rol, u.activo,
                u.email_verificado, u.avatar_url, u.telefono, u.created_at
         FROM refresh_tokens rt
         INNER JOIN usuarios u ON u.id_usuario = rt.id_usuario
         WHERE rt.token_hash = ?
           AND rt.revoked_at IS NULL
           AND rt.expires_at > NOW()
           AND u.deleted_at IS NULL
         LIMIT 1`,
        [token_hash]
      )
    );

    return rows[0] ?? null;
  },

  revokeByHash: async (token_hash) => {
    if (await getRefreshTokenStorageMode() === 'memory') {
      const token = memoryTokens.get(token_hash);
      if (!token || token.revoked_at) {
        return false;
      }
      token.revoked_at = new Date();
      return true;
    }

    const [result] = await runRefreshTokenPersistence(() =>
      pool.execute(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE token_hash = ? AND revoked_at IS NULL`,
        [token_hash]
      )
    );

    return result.affectedRows > 0;
  },

  rotate: async ({
    current_hash,
    next_hash,
    expires_at,
    user_agent = null,
    ip_address = null,
  }) => {
    if (await getRefreshTokenStorageMode() === 'memory') {
      const current = memoryTokens.get(current_hash);
      if (!current || current.revoked_at || new Date(current.expires_at).getTime() <= Date.now()) {
        return null;
      }

      current.revoked_at = new Date();
      const id_refresh_token = memoryTokens.size + 1;
      memoryTokens.set(next_hash, {
        id_refresh_token,
        id_usuario: current.id_usuario,
        token_hash: next_hash,
        expires_at,
        revoked_at: null,
        user_agent,
        ip_address,
      });

      return {
        id_usuario: current.id_usuario,
        id_refresh_token,
      };
    }

    let connection = null;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const [rows] = await connection.execute(
        `SELECT id_refresh_token, id_usuario
         FROM refresh_tokens
         WHERE token_hash = ?
           AND revoked_at IS NULL
           AND expires_at > NOW()
         LIMIT 1
         FOR UPDATE`,
        [current_hash]
      );

      const current = rows[0] ?? null;
      if (!current) {
        await connection.rollback();
        return null;
      }

      await connection.execute(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE id_refresh_token = ?`,
        [current.id_refresh_token]
      );

      const [insertResult] = await connection.execute(
        `INSERT INTO refresh_tokens
           (id_usuario, token_hash, expires_at, user_agent, ip_address)
         VALUES (?, ?, ?, ?, ?)`,
        [current.id_usuario, next_hash, expires_at, user_agent, ip_address]
      );

      await connection.commit();
      return {
        id_usuario: current.id_usuario,
        id_refresh_token: insertResult.insertId,
      };
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      throw buildRefreshTokenStorageError(error);
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  revokeAllForUser: async (id_usuario) => {
    if (await getRefreshTokenStorageMode() === 'memory') {
      let revoked = 0;
      for (const token of memoryTokens.values()) {
        if (Number(token.id_usuario) === Number(id_usuario) && !token.revoked_at) {
          token.revoked_at = new Date();
          revoked += 1;
        }
      }
      return revoked;
    }

    const [result] = await runRefreshTokenPersistence(() =>
      pool.execute(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE id_usuario = ? AND revoked_at IS NULL`,
        [id_usuario]
      )
    );

    return result.affectedRows;
  },
};

