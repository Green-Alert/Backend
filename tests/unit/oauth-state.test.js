import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearOAuthStates,
  consumeOAuthState,
  createOAuthState,
} from '../../src/services/oauth-state.service.js';
import { generateAuthUrl } from '../../src/services/google-oauth.service.js';
import { generateFacebookAuthUrl } from '../../src/services/facebook-oauth.service.js';

test.beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = 'google-client-id.apps.googleusercontent.com';
  process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback';
  process.env.FACEBOOK_APP_ID = 'facebook-app-id';
  process.env.FACEBOOK_APP_SECRET = 'facebook-app-secret';
  process.env.FACEBOOK_CALLBACK_URL = 'http://localhost:3000/auth/facebook/callback';
  process.env.FACEBOOK_GRAPH_API_VERSION = 'v20.0';
});

test.afterEach(() => {
  clearOAuthStates();
  delete process.env.OAUTH_STATE_TTL_SECONDS;
});

test('state OAuth temporal se consume una sola vez', () => {
  const state = createOAuthState('google');

  assert.equal(typeof state, 'string');
  assert.ok(state.length >= 32);
  assert.deepEqual(consumeOAuthState(state, 'google'), { valid: true });
  assert.deepEqual(consumeOAuthState(state, 'google'), { valid: false, reason: 'invalid' });
});

test('state OAuth expirado se rechaza con razon explicita', async () => {
  process.env.OAUTH_STATE_TTL_SECONDS = '0.001';

  const state = createOAuthState('google');
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.deepEqual(consumeOAuthState(state, 'google'), { valid: false, reason: 'expired' });
});

test('state OAuth no se puede consumir con otro proveedor', () => {
  const state = createOAuthState('google');

  assert.deepEqual(consumeOAuthState(state, 'facebook'), { valid: false, reason: 'invalid' });
  assert.deepEqual(consumeOAuthState(state, 'google'), { valid: false, reason: 'invalid' });
});

test('URL OAuth de Google incluye state consumible', () => {
  const result = generateAuthUrl();

  assert.equal(result.success, true);
  const url = new URL(result.authUrl);
  const state = url.searchParams.get('state');

  assert.equal(url.searchParams.get('client_id'), process.env.GOOGLE_CLIENT_ID);
  assert.equal(url.searchParams.get('redirect_uri'), process.env.GOOGLE_CALLBACK_URL);
  assert.equal(typeof state, 'string');
  assert.ok(state.length >= 32);
  assert.deepEqual(consumeOAuthState(state, 'google'), { valid: true });
});

test('URL OAuth de Facebook incluye state consumible', () => {
  const result = generateFacebookAuthUrl();

  assert.equal(result.success, true);
  const url = new URL(result.authUrl);
  const state = url.searchParams.get('state');

  assert.equal(url.searchParams.get('client_id'), process.env.FACEBOOK_APP_ID);
  assert.equal(url.searchParams.get('redirect_uri'), process.env.FACEBOOK_CALLBACK_URL);
  assert.equal(typeof state, 'string');
  assert.ok(state.length >= 32);
  assert.deepEqual(consumeOAuthState(state, 'facebook'), { valid: true });
});
