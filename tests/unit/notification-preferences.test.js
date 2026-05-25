import test from 'node:test';
import assert from 'node:assert/strict';
import { updateNotifications } from '../../src/controllers/auth.controller.js';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  parseNotificationPreferences,
  UsuarioModel,
} from '../../src/models/usuario.model.js';

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

test('parseNotificationPreferences mezcla defaults con preferencias guardadas', () => {
  assert.deepEqual(parseNotificationPreferences(null), DEFAULT_NOTIFICATION_PREFERENCES);
  assert.deepEqual(
    parseNotificationPreferences('{"email_alerts":false,"weekly_summary":true}'),
    {
      email_alerts: false,
      push_notifications: false,
      report_updates: true,
      weekly_summary: true,
    }
  );
});

test('updateNotifications guarda preferencias y conserva valores existentes', async (t) => {
  const existingPreferences = {
    email_alerts: true,
    push_notifications: false,
    report_updates: true,
    weekly_summary: false,
  };

  t.mock.method(UsuarioModel, 'findByIdWithDetails', async () => ({
    id_usuario: 7,
    uuid: 'user-uuid',
    nombre: 'Test',
    apellido: 'User',
    email: 'test@example.com',
    rol: 'ciudadano',
    activo: 1,
    email_verificado: 1,
    avatar_url: null,
    telefono: null,
    notification_preferences: existingPreferences,
  }));
  t.mock.method(UsuarioModel, 'updateNotificationPreferences', async (idUsuario, preferences) => ({
    id_usuario: idUsuario,
    uuid: 'user-uuid',
    nombre: 'Test',
    apellido: 'User',
    email: 'test@example.com',
    rol: 'ciudadano',
    activo: 1,
    email_verificado: 1,
    avatar_url: null,
    telefono: null,
    notification_preferences: preferences,
  }));

  const req = {
    user: { sub: 7 },
    body: {
      preferences: {
        push_notifications: true,
        weekly_summary: true,
      },
    },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await updateNotifications(req, res, next);

  const savedPreferences = UsuarioModel.updateNotificationPreferences.mock.calls[0].arguments[1];

  assert.equal(res.statusCode, 200);
  assert.deepEqual(savedPreferences, {
    email_alerts: true,
    push_notifications: true,
    report_updates: true,
    weekly_summary: true,
  });
  assert.deepEqual(res.body.data.preferences, savedPreferences);
  assert.equal(next.mock.callCount(), 0);
});

test('updateNotifications rechaza claves no permitidas', async (t) => {
  t.mock.method(UsuarioModel, 'updateNotificationPreferences', async () => {
    throw new Error('No debe guardar preferencias invalidas');
  });

  const req = {
    user: { sub: 7 },
    body: {
      preferences: {
        sms_alerts: true,
      },
    },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await updateNotifications(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Preferencias no permitidas: sms_alerts.');
  assert.equal(UsuarioModel.updateNotificationPreferences.mock.callCount(), 0);
  assert.equal(next.mock.callCount(), 0);
});
