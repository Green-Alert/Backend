import test from 'node:test';
import assert from 'node:assert/strict';
import { enviarPush, __setMessagingFactoryForTests } from '../../src/services/fcm.service.js';
import { FcmTokenModel } from '../../src/models/fcm-token.model.js';

test.afterEach(() => {
  __setMessagingFactoryForTests(null);
});

test('enviarPush no requiere Firebase en ambiente test si no hay mock', async (t) => {
  t.mock.method(FcmTokenModel, 'findActivosByUsuario', async () => {
    throw new Error('No debe consultar tokens si no hay messaging');
  });

  const result = await enviarPush({
    id_usuario: 7,
    titulo: 'Titulo',
    mensaje: 'Mensaje',
  });

  assert.deepEqual(result, { sent: 0, skipped: true });
  assert.equal(FcmTokenModel.findActivosByUsuario.mock.callCount(), 0);
});

test('enviarPush envia a tokens activos usando messaging mockeado', async (t) => {
  const sentMessages = [];
  __setMessagingFactoryForTests(() => ({
    send: async (message) => {
      sentMessages.push(message);
      return 'message-id';
    },
  }));
  t.mock.method(FcmTokenModel, 'findActivosByUsuario', async () => ([
    { token: 'token-1' },
    { token: 'token-2' },
  ]));

  const result = await enviarPush({
    id_usuario: 7,
    titulo: 'Cambio de estado',
    mensaje: 'Tu reporte fue verificado',
    data: { tipo: 'reporte_estado', referencia_uuid: 'abc' },
  });

  assert.deepEqual(result, { sent: 2, failed: 0, skipped: false });
  assert.equal(sentMessages.length, 2);
  assert.equal(sentMessages[0].notification.title, 'Cambio de estado');
  assert.equal(sentMessages[0].data.referencia_uuid, 'abc');
});

test('enviarPush desactiva tokens invalidos sin fallar toda la notificacion', async (t) => {
  __setMessagingFactoryForTests(() => ({
    send: async () => {
      const error = new Error('token invalido');
      error.code = 'messaging/registration-token-not-registered';
      throw error;
    },
  }));
  t.mock.method(FcmTokenModel, 'findActivosByUsuario', async () => ([
    { token: 'token-invalido' },
  ]));
  t.mock.method(FcmTokenModel, 'desactivar', async () => true);

  const result = await enviarPush({
    id_usuario: 7,
    titulo: 'Titulo',
    mensaje: 'Mensaje',
  });

  assert.deepEqual(result, { sent: 0, failed: 1, skipped: false });
  assert.equal(FcmTokenModel.desactivar.mock.callCount(), 1);
  assert.equal(FcmTokenModel.desactivar.mock.calls[0].arguments[0], 'token-invalido');
});
