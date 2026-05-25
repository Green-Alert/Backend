import { generarRespuestaChatbot } from '../services/chatbot.service.js';
import { FAQ_GROUPS } from '../services/chatbot-offline.js';
import { successResponse, errorResponse } from '../utils/response.js';

const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;
const rateLimitStore = new Map();

export const clearChatbotRateLimit = () => {
  rateLimitStore.clear();
};

const getRateLimitKey = (req, sessionId) => (
  sessionId || req.ip || req.socket?.remoteAddress || 'anonymous'
);

const isRateLimited = (key) => {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
};

export const enviarMensajeChatbot = async (req, res, next) => {
  const startedAt = Date.now();

  try {
    const { mensaje, sessionId, lat, lng } = req.body ?? {};
    const cleanMessage = typeof mensaje === 'string' ? mensaje.trim() : '';

    if (!cleanMessage) {
      return errorResponse(res, 'El mensaje es requerido.', 400);
    }

    if (cleanMessage.length > MAX_MESSAGE_LENGTH) {
      return errorResponse(res, 'El mensaje no puede superar 500 caracteres.', 400);
    }

    if (isRateLimited(getRateLimitKey(req, sessionId))) {
      return errorResponse(res, 'Demasiados mensajes. Intenta nuevamente en un minuto.', 429);
    }

    const result = await generarRespuestaChatbot({
      mensaje: cleanMessage,
      sessionId,
      user: req.user,
      lat,
      lng,
    });

    return successResponse(
      res,
      {
        sessionId,
        respuesta: result.respuesta,
        intent: result.intent,
        fuente: result.fuente,
        sugerencias: result.sugerencias,
        cards: result.cards,
        estadoAmbiental: result.estadoAmbiental,
        latencia_ms: Date.now() - startedAt,
      },
      'Respuesta generada correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};

export const obtenerFaqsChatbot = async (_req, res, next) => {
  try {
    return successResponse(
      res,
      { grupos: FAQ_GROUPS },
      'FAQs obtenidas correctamente.'
    );
  } catch (error) {
    return next(error);
  }
};
