import crypto from 'crypto';

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const oauthStates = new Map();

const getTtlMs = () => {
  const value = Number(process.env.OAUTH_STATE_TTL_SECONDS);
  return Number.isFinite(value) && value > 0 ? value * 1000 : DEFAULT_TTL_MS;
};

const deleteExpiredStates = () => {
  const now = Date.now();

  for (const [state, entry] of oauthStates.entries()) {
    if (entry.expiresAt <= now) {
      oauthStates.delete(state);
    }
  }
};

export const createOAuthState = (provider) => {
  deleteExpiredStates();

  const state = crypto.randomBytes(32).toString('base64url');
  oauthStates.set(state, {
    provider,
    expiresAt: Date.now() + getTtlMs(),
  });

  return state;
};

export const consumeOAuthState = (state, provider) => {
  if (typeof state !== 'string' || !state) {
    return { valid: false, reason: 'missing' };
  }

  const entry = oauthStates.get(state);
  oauthStates.delete(state);

  if (!entry) {
    return { valid: false, reason: 'invalid' };
  }

  if (entry.expiresAt <= Date.now()) {
    return { valid: false, reason: 'expired' };
  }

  if (entry.provider !== provider) {
    return { valid: false, reason: 'invalid' };
  }

  return { valid: true };
};

export const clearOAuthStates = () => {
  oauthStates.clear();
};
