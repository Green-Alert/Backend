import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { changePassword, resetPassword } from '../../src/controllers/auth.controller.js';
import { RefreshTokenModel } from '../../src/models/refresh-token.model.js';
import { UsuarioModel } from '../../src/models/usuario.model.js';

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createResponse = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test('changePassword revoca refresh tokens del usuario', async (t) => {
  const user = {
    id_usuario: 7,
    email: 'user@example.com',
    password_hash: hashPassword('Current123'),
  };

  t.mock.method(UsuarioModel, 'findByEmail', async () => user);
  t.mock.method(UsuarioModel, 'updatePassword', async (idUsuario) => ({
    id_usuario: idUsuario,
  }));
  t.mock.method(RefreshTokenModel, 'revokeAllForUser', async () => 2);

  const req = {
    user: { sub: 7, email: 'user@example.com' },
    body: {
      currentPassword: 'Current123',
      newPassword: 'NewPassword123',
      confirmPassword: 'NewPassword123',
    },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await changePassword(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.equal(RefreshTokenModel.revokeAllForUser.mock.callCount(), 1);
  assert.equal(RefreshTokenModel.revokeAllForUser.mock.calls[0].arguments[0], 7);
  assert.equal(next.mock.callCount(), 0);
});

test('resetPassword revoca refresh tokens del usuario', async (t) => {
  const resetToken = 'reset-token-valid-1234567890';
  const user = {
    id_usuario: 11,
    email: 'reset@example.com',
    token_reset_exp: new Date(Date.now() + 60_000).toISOString(),
  };

  t.mock.method(UsuarioModel, 'findByResetToken', async (tokenHash) => {
    assert.equal(tokenHash, hashToken(resetToken));
    return user;
  });
  t.mock.method(UsuarioModel, 'updatePassword', async (idUsuario) => ({
    id_usuario: idUsuario,
  }));
  t.mock.method(UsuarioModel, 'clearResetToken', async () => true);
  t.mock.method(RefreshTokenModel, 'revokeAllForUser', async () => 3);

  const req = {
    body: {
      token: resetToken,
      newPassword: 'ResetPassword123',
      confirmPassword: 'ResetPassword123',
    },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await resetPassword(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.equal(UsuarioModel.clearResetToken.mock.callCount(), 1);
  assert.equal(RefreshTokenModel.revokeAllForUser.mock.callCount(), 1);
  assert.equal(RefreshTokenModel.revokeAllForUser.mock.calls[0].arguments[0], 11);
  assert.equal(next.mock.callCount(), 0);
});
