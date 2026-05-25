import crypto from 'crypto';

const DEFAULT_TTL_MS = 2 * 60 * 1000;
const callbackCodes = new Map();

const getTtlMs = () => {
  const value = Number(process.env.OAUTH_CALLBACK_CODE_TTL_SECONDS);
  return Number.isFinite(value) && value > 0 ? value * 1000 : DEFAULT_TTL_MS;
};

const deleteExpiredCodes = () => {
  const now = Date.now();

  for (const [code, entry] of callbackCodes.entries()) {
    if (entry.expiresAt <= now) {
      callbackCodes.delete(code);
    }
  }
};

export const createOAuthCallbackCode = (payload) => {
  deleteExpiredCodes();

  const code = crypto.randomBytes(32).toString('base64url');
  callbackCodes.set(code, {
    payload,
    expiresAt: Date.now() + getTtlMs(),
  });

  return code;
};

export const consumeOAuthCallbackCode = (code) => {
  if (typeof code !== 'string' || !code) {
    return null;
  }

  const entry = callbackCodes.get(code);
  callbackCodes.delete(code);

  if (!entry || entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry.payload;
};

export const clearOAuthCallbackCodes = () => {
  callbackCodes.clear();
};
