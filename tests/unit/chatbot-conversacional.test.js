import test from 'node:test';
import assert from 'node:assert/strict';
import { enviarMensajeChatbot, clearChatbotRateLimit } from '../../src/controllers/chatbot.controller.js';
import { detectIntent, buildOfflineResponse } from '../../src/services/chatbot-offline.js';
import {
  clearChatbotCache,
  generarRespuestaChatbot,
  getChatbotCacheSize,
} from '../../src/services/chatbot.service.js';
import { ReporteModel } from '../../src/models/reporte.model.js';

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

const mockContextQueries = (t) => {
  t.mock.method(ReporteModel, 'getStats', async () => ({
    total_reportes: 12,
    municipios_activos: 3,
  }));
  t.mock.method(ReporteModel, 'findByUsuario', async () => ([
    { id_reporte: 1, estado: 'pendiente', titulo: 'Reporte propio' },
  ]));
  t.mock.method(ReporteModel, 'countByUsuario', async () => 1);
  t.mock.method(ReporteModel, 'findParaPrediccion', async () => []);
};

test('detectIntent reconoce intents principales', () => {
  assert.equal(detectIntent('Quiero crear un reporte con foto'), 'reportes');
  assert.equal(detectIntent('Hay alertas cerca de mi ubicacion?'), 'alertas');
  assert.equal(detectIntent('Cuantos reportes tengo?'), 'mis_reportes');
  assert.equal(detectIntent('Como verifico mi correo?'), 'verificacion');
  assert.equal(detectIntent('Recuperar password'), 'recuperacion');
});

test('motor offline responde con contexto de usuario cuando hay JWT', () => {
  const result = buildOfflineResponse({
    mensaje: 'cuantos reportes tengo?',
    contexto: {
      global: { total_reportes: 12, municipios_activos: 3 },
      usuario: { total_reportes: 2, reportes: [] },
      alertasZona: [],
    },
  });

  assert.equal(result.intent, 'mis_reportes');
  assert.match(result.respuesta, /Tienes 2 reporte/);
  assert.equal(result.fuente, 'offline');
  assert.deepEqual(result.cards, []);
});

test('generarRespuestaChatbot funciona offline y usa cache', async (t) => {
  clearChatbotCache();
  mockContextQueries(t);

  const first = await generarRespuestaChatbot({
    mensaje: 'Que son las zonas de riesgo?',
    sessionId: 's1',
    user: { sub: 7 },
  });
  const second = await generarRespuestaChatbot({
    mensaje: 'Que son las zonas de riesgo?',
    sessionId: 's1',
    user: { sub: 7 },
  });

  assert.equal(first.fuente, 'offline');
  assert.equal(first.cache, false);
  assert.equal(second.cache, true);
  assert.equal(getChatbotCacheSize(), 1);
  assert.equal(ReporteModel.getStats.mock.callCount(), 1);
});

test('enviarMensajeChatbot valida mensaje requerido y maximo 500 caracteres', async (t) => {
  clearChatbotRateLimit();

  const missingRes = createResponse();
  await enviarMensajeChatbot({ body: {}, ip: '1.1.1.1' }, missingRes, t.mock.fn());

  assert.equal(missingRes.statusCode, 400);
  assert.equal(missingRes.body.message, 'El mensaje es requerido.');

  const longRes = createResponse();
  await enviarMensajeChatbot({
    body: { mensaje: 'a'.repeat(501) },
    ip: '1.1.1.2',
  }, longRes, t.mock.fn());

  assert.equal(longRes.statusCode, 400);
  assert.equal(longRes.body.message, 'El mensaje no puede superar 500 caracteres.');
});

test('enviarMensajeChatbot aplica rate limit por sessionId', async (t) => {
  clearChatbotCache();
  clearChatbotRateLimit();
  mockContextQueries(t);

  for (let index = 0; index < 20; index += 1) {
    const res = createResponse();
    await enviarMensajeChatbot({
      body: { mensaje: `Hola ${index}`, sessionId: 'limit-session' },
      ip: '2.2.2.2',
    }, res, t.mock.fn());
    assert.notEqual(res.statusCode, 429);
  }

  const limited = createResponse();
  await enviarMensajeChatbot({
    body: { mensaje: 'mensaje final', sessionId: 'limit-session' },
    ip: '2.2.2.2',
  }, limited, t.mock.fn());

  assert.equal(limited.statusCode, 429);
  assert.equal(limited.body.message, 'Demasiados mensajes. Intenta nuevamente en un minuto.');
});

test('enviarMensajeChatbot conserva formato esperado por frontend', async (t) => {
  clearChatbotCache();
  clearChatbotRateLimit();
  mockContextQueries(t);

  const res = createResponse();
  await enviarMensajeChatbot({
    body: { mensaje: 'Como crear un reporte?', sessionId: 'fmt' },
    user: { sub: 7 },
    ip: '3.3.3.3',
  }, res, t.mock.fn());

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.sessionId, 'fmt');
  assert.equal(typeof res.body.data.respuesta, 'string');
  assert.equal(res.body.data.intent, 'reportes');
  assert.equal(res.body.data.fuente, 'offline');
  assert.ok(Array.isArray(res.body.data.sugerencias));
  assert.ok(Array.isArray(res.body.data.cards));
  assert.ok(['optimo', 'alerta'].includes(res.body.data.estadoAmbiental));
  assert.equal(typeof res.body.data.latencia_ms, 'number');
});
