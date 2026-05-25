import { buildOfflineResponse } from './chatbot-offline.js';
import { construirContextoChatbot } from './chatbot-context.js';

const CACHE_TTL_MS = 30 * 1000;
const cache = new Map();

const getCacheKey = ({ mensaje, sessionId, user, lat, lng }) => JSON.stringify({
  mensaje: String(mensaje || '').trim().toLowerCase(),
  sessionId: sessionId || null,
  userId: user?.sub || null,
  lat: lat || null,
  lng: lng || null,
});

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

const setCached = (key, value) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return value;
};

export const clearChatbotCache = () => {
  cache.clear();
};

export const getChatbotCacheSize = () => cache.size;

const fetchJson = async (url, options) => {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(4000),
  });

  if (!response.ok) return null;
  return response.json();
};

const tryGroq = async ({ mensaje, contexto }) => {
  if (!process.env.GROQ_API_KEY) return null;

  const json = await fetchJson('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'Responde como asistente ambiental de Green Alert. Mantén formato breve y accionable.' },
        { role: 'user', content: JSON.stringify({ mensaje, contexto }) },
      ],
      temperature: 0.2,
    }),
  }).catch(() => null);

  const respuesta = json?.choices?.[0]?.message?.content?.trim();
  return respuesta ? { respuesta, fuente: 'groq' } : null;
};

const tryGemini = async ({ mensaje, contexto }) => {
  if (!process.env.GEMINI_API_KEY) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const json = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: JSON.stringify({ mensaje, contexto }) }],
        }],
      }),
    }
  ).catch(() => null);

  const respuesta = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return respuesta ? { respuesta, fuente: 'gemini' } : null;
};

export const generarRespuestaChatbot = async ({ mensaje, sessionId, user, lat, lng }) => {
  const key = getCacheKey({ mensaje, sessionId, user, lat, lng });
  const cached = getCached(key);
  if (cached) {
    return {
      ...cached,
      cache: true,
    };
  }

  const contexto = await construirContextoChatbot({ user, lat, lng });
  const offline = buildOfflineResponse({ mensaje, contexto });
  const external = await tryGroq({ mensaje, contexto })
    || await tryGemini({ mensaje, contexto });

  const result = {
    ...offline,
    ...(external ? { respuesta: external.respuesta, fuente: external.fuente } : {}),
    cache: false,
  };

  return setCached(key, result);
};
