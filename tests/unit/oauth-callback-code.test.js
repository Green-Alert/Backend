import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearOAuthCallbackCodes,
  consumeOAuthCallbackCode,
  createOAuthCallbackCode,
} from '../../src/services/oauth-callback-code.service.js';

test.afterEach(() => {
  clearOAuthCallbackCodes();
  delete process.env.OAUTH_CALLBACK_CODE_TTL_SECONDS;
});

test('codigo OAuth temporal se consume una sola vez', () => {
  const payload = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: { id_usuario: 1 },
  };

  const code = createOAuthCallbackCode(payload);

  assert.equal(typeof code, 'string');
  assert.ok(code.length >= 32);
  assert.deepEqual(consumeOAuthCallbackCode(code), payload);
  assert.equal(consumeOAuthCallbackCode(code), null);
});

test('codigo OAuth expirado no entrega payload', async () => {
  process.env.OAUTH_CALLBACK_CODE_TTL_SECONDS = '0.001';

  const code = createOAuthCallbackCode({ accessToken: 'access-token' });
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(consumeOAuthCallbackCode(code), null);
});
