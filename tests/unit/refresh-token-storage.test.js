import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/database.js';
import { clearSchemaCompatCache } from '../../src/config/schema-compat.js';
import { UsuarioModel } from '../../src/models/usuario.model.js';
import {
  clearRefreshTokenMemoryStore,
  RefreshTokenModel,
} from '../../src/models/refresh-token.model.js';

const originalNodeEnv = process.env.NODE_ENV;
const storageErrorPattern = /refresh_tokens.*persistencia.*revocacion.*logout global/;

const futureDate = () => new Date(Date.now() + 60_000);

const resetRefreshTokenTestState = () => {
  process.env.NODE_ENV = originalNodeEnv;
  clearSchemaCompatCache();
  clearRefreshTokenMemoryStore();
};

const mockTableExists = (t, exists, onQuery = async () => [[]]) => {
  t.mock.method(pool, 'execute', async (sql, params) => {
    if (String(sql).includes('INFORMATION_SCHEMA.TABLES')) {
      return [[{ total: exists ? 1 : 0 }]];
    }
    return onQuery(sql, params);
  });
};

test.afterEach(() => {
  resetRefreshTokenTestState();
});

test('permite fallback en memoria solo cuando NODE_ENV es test', async (t) => {
  process.env.NODE_ENV = 'test';
  clearSchemaCompatCache();
  mockTableExists(t, false);
  t.mock.method(UsuarioModel, 'findById', async () => ({
    id_usuario: 7,
    uuid: 'user-7',
    email: 'test@example.com',
    rol: 'usuario',
    activo: 1,
  }));

  const idRefreshToken = await RefreshTokenModel.create({
    id_usuario: 7,
    token_hash: 'test-hash',
    expires_at: futureDate(),
  });
  const activeToken = await RefreshTokenModel.findActiveByHash('test-hash');
  const revoked = await RefreshTokenModel.revokeByHash('test-hash');
  const afterRevoke = await RefreshTokenModel.findActiveByHash('test-hash');

  assert.equal(idRefreshToken, 1);
  assert.equal(activeToken.id_usuario, 7);
  assert.equal(activeToken.email, 'test@example.com');
  assert.equal(revoked, true);
  assert.equal(afterRevoke, null);
});

test('rechaza fallback en memoria fuera de test cuando falta refresh_tokens', async (t) => {
  process.env.NODE_ENV = 'development';
  clearSchemaCompatCache();
  mockTableExists(t, false);

  await assert.rejects(
    () => RefreshTokenModel.create({
      id_usuario: 7,
      token_hash: 'missing-table-hash',
      expires_at: futureDate(),
    }),
    (error) => {
      assert.equal(error.statusCode, 500);
      assert.match(error.message, storageErrorPattern);
      return true;
    }
  );
});

test('devuelve error claro al consultar tokens si falta refresh_tokens fuera de test', async (t) => {
  process.env.NODE_ENV = 'production';
  clearSchemaCompatCache();
  mockTableExists(t, false);

  await assert.rejects(
    () => RefreshTokenModel.findActiveByHash('missing-table-hash'),
    storageErrorPattern
  );
});

test('crea refresh token usando persistencia normal cuando la tabla existe', async (t) => {
  process.env.NODE_ENV = 'production';
  clearSchemaCompatCache();
  const calls = [];
  mockTableExists(t, true, async (sql, params) => {
    calls.push({ sql: String(sql), params });
    return [{ insertId: 99 }];
  });

  const idRefreshToken = await RefreshTokenModel.create({
    id_usuario: 7,
    token_hash: 'persisted-hash',
    expires_at: futureDate(),
    user_agent: 'agent',
    ip_address: '127.0.0.1',
  });

  assert.equal(idRefreshToken, 99);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].sql.includes('INSERT INTO refresh_tokens'));
  assert.deepEqual(calls[0].params.slice(0, 2), [7, 'persisted-hash']);
});

test('revalida refresh_tokens antes de fallar por cache de esquema desactualizada', async (t) => {
  process.env.NODE_ENV = 'development';
  clearSchemaCompatCache();
  let schemaChecks = 0;
  const calls = [];

  t.mock.method(pool, 'execute', async (sql, params) => {
    if (String(sql).includes('INFORMATION_SCHEMA.TABLES')) {
      schemaChecks += 1;
      return [[{ total: schemaChecks === 1 ? 0 : 1 }]];
    }

    calls.push({ sql: String(sql), params });
    return [{ insertId: 101 }];
  });

  const idRefreshToken = await RefreshTokenModel.create({
    id_usuario: 7,
    token_hash: 'recached-hash',
    expires_at: futureDate(),
  });

  assert.equal(idRefreshToken, 101);
  assert.equal(schemaChecks, 2);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].sql.includes('INSERT INTO refresh_tokens'));
});

test('devuelve error claro si falla una operacion critica de persistencia', async (t) => {
  process.env.NODE_ENV = 'production';
  clearSchemaCompatCache();
  const databaseError = new Error('database unavailable');
  mockTableExists(t, true, async () => {
    throw databaseError;
  });

  await assert.rejects(
    () => RefreshTokenModel.create({
      id_usuario: 7,
      token_hash: 'failed-persist-hash',
      expires_at: futureDate(),
    }),
    (error) => {
      assert.equal(error.statusCode, 500);
      assert.equal(error.cause, databaseError);
      assert.match(error.message, storageErrorPattern);
      return true;
    }
  );
});

test('rota refresh token usando transaccion y persistencia normal', async (t) => {
  process.env.NODE_ENV = 'production';
  clearSchemaCompatCache();
  mockTableExists(t, true);

  const connection = {
    beginTransaction: t.mock.fn(async () => {}),
    commit: t.mock.fn(async () => {}),
    rollback: t.mock.fn(async () => {}),
    release: t.mock.fn(() => {}),
    execute: t.mock.fn(async (sql) => {
      const query = String(sql);
      if (query.includes('SELECT id_refresh_token, id_usuario')) {
        return [[{ id_refresh_token: 11, id_usuario: 7 }]];
      }
      if (query.includes('UPDATE refresh_tokens')) {
        return [{ affectedRows: 1 }];
      }
      if (query.includes('INSERT INTO refresh_tokens')) {
        return [{ insertId: 12 }];
      }
      return [[]];
    }),
  };
  t.mock.method(pool, 'getConnection', async () => connection);

  const result = await RefreshTokenModel.rotate({
    current_hash: 'current-hash',
    next_hash: 'next-hash',
    expires_at: futureDate(),
  });

  assert.deepEqual(result, {
    id_usuario: 7,
    id_refresh_token: 12,
  });
  assert.equal(connection.beginTransaction.mock.callCount(), 1);
  assert.equal(connection.commit.mock.callCount(), 1);
  assert.equal(connection.rollback.mock.callCount(), 0);
  assert.equal(connection.release.mock.callCount(), 1);
});

test('revoca un refresh token individual usando persistencia normal', async (t) => {
  process.env.NODE_ENV = 'production';
  clearSchemaCompatCache();
  let updateParams = null;
  mockTableExists(t, true, async (sql, params) => {
    assert.ok(String(sql).includes('UPDATE refresh_tokens'));
    updateParams = params;
    return [{ affectedRows: 1 }];
  });

  const revoked = await RefreshTokenModel.revokeByHash('logout-hash');

  assert.equal(revoked, true);
  assert.deepEqual(updateParams, ['logout-hash']);
});

test('revoca todos los refresh tokens de un usuario usando persistencia normal', async (t) => {
  process.env.NODE_ENV = 'production';
  clearSchemaCompatCache();
  let updateParams = null;
  mockTableExists(t, true, async (sql, params) => {
    assert.ok(String(sql).includes('UPDATE refresh_tokens'));
    updateParams = params;
    return [{ affectedRows: 3 }];
  });

  const revoked = await RefreshTokenModel.revokeAllForUser(7);

  assert.equal(revoked, 3);
  assert.deepEqual(updateParams, [7]);
});
