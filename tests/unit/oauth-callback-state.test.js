import test from 'node:test';
import assert from 'node:assert/strict';
import {
  facebookCallback,
  googleCallback,
  validateOAuthCallbackState,
} from '../../src/controllers/auth.controller.js';
import {
  clearOAuthStates,
  createOAuthState,
} from '../../src/services/oauth-state.service.js';

const createResponse = () => ({
  statusCode: null,
  body: null,
  headers: {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  set(headers) {
    this.headers = { ...this.headers, ...headers };
    return this;
  },
  redirect(statusCode, url) {
    this.statusCode = statusCode;
    this.redirectUrl = url;
    return this;
  },
});

test.afterEach(() => {
  clearOAuthStates();
  delete process.env.OAUTH_STATE_TTL_SECONDS;
});

test('callback Google con state valido supera la validacion CSRF', async (t) => {
  const state = createOAuthState('google');
  const res = createResponse();
  const next = t.mock.fn();

  await googleCallback({ query: { state } }, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Código de autorización de Google requerido.');
  assert.equal(next.mock.callCount(), 0);
});

test('callback Google sin state se rechaza', async (t) => {
  const res = createResponse();
  const next = t.mock.fn();

  await googleCallback({ query: { code: 'google-code' } }, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'State OAuth requerido.');
  assert.equal(next.mock.callCount(), 0);
});

test('callback Google con state invalido se rechaza', async (t) => {
  const res = createResponse();
  const next = t.mock.fn();

  await googleCallback({ query: { code: 'google-code', state: 'invalid-state' } }, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'State OAuth invalido.');
  assert.equal(next.mock.callCount(), 0);
});

test('callback Google con state expirado se rechaza', async (t) => {
  process.env.OAUTH_STATE_TTL_SECONDS = '0.001';
  const state = createOAuthState('google');
  await new Promise((resolve) => setTimeout(resolve, 10));
  const res = createResponse();
  const next = t.mock.fn();

  await googleCallback({ query: { code: 'google-code', state } }, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'State OAuth expirado.');
  assert.equal(next.mock.callCount(), 0);
});

test('callback Facebook con state valido supera la validacion CSRF', async (t) => {
  const state = createOAuthState('facebook');
  const res = createResponse();
  const next = t.mock.fn();

  await facebookCallback({ query: { state } }, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Codigo de autorizacion de Facebook requerido.');
  assert.equal(next.mock.callCount(), 0);
});

test('callback Facebook sin state se rechaza', async (t) => {
  const res = createResponse();
  const next = t.mock.fn();

  await facebookCallback({ query: { code: 'facebook-code' } }, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'State OAuth requerido.');
  assert.equal(next.mock.callCount(), 0);
});

test('callback Facebook con state invalido se rechaza', async (t) => {
  const res = createResponse();
  const next = t.mock.fn();

  await facebookCallback({ query: { code: 'facebook-code', state: 'invalid-state' } }, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'State OAuth invalido.');
  assert.equal(next.mock.callCount(), 0);
});

test('callback Facebook con state expirado se rechaza', async (t) => {
  process.env.OAUTH_STATE_TTL_SECONDS = '0.001';
  const state = createOAuthState('facebook');
  await new Promise((resolve) => setTimeout(resolve, 10));
  const res = createResponse();
  const next = t.mock.fn();

  await facebookCallback({ query: { code: 'facebook-code', state } }, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'State OAuth expirado.');
  assert.equal(next.mock.callCount(), 0);
});

test('state ya consumido no puede reutilizarse en callbacks', () => {
  const state = createOAuthState('google');

  assert.deepEqual(validateOAuthCallbackState(state, 'google'), { valid: true });
  assert.deepEqual(validateOAuthCallbackState(state, 'google'), {
    valid: false,
    message: 'State OAuth invalido.',
  });
});
