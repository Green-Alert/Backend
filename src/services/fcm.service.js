import { FcmTokenModel } from '../models/fcm-token.model.js';

let messagingInstance = null;
let messagingFactoryForTests = null;

const isTestEnv = () => (
  process.env.NODE_ENV === 'test' ||
  process.execArgv.some((arg) => arg === '--test' || arg.startsWith('--test-'))
);

const normalizePrivateKey = (value) => (
  value ? String(value).replace(/\\n/g, '\n') : value
);

const getFirebaseCredentials = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: normalizePrivateKey(parsed.private_key),
      };
    } catch {
      return null;
    }
  }

  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    return null;
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  };
};

const getMessaging = async () => {
  if (messagingFactoryForTests) {
    return messagingFactoryForTests();
  }

  if (isTestEnv()) {
    return null;
  }

  if (messagingInstance) {
    return messagingInstance;
  }

  const credentials = getFirebaseCredentials();
  if (!credentials) {
    return null;
  }

  let firebaseApp;
  let firebaseMessaging;

  try {
    firebaseApp = await import('firebase-admin/app');
    firebaseMessaging = await import('firebase-admin/messaging');
  } catch {
    return null;
  }

  const { initializeApp, getApps, cert } = firebaseApp;
  const { getMessaging: getAdminMessaging } = firebaseMessaging;

  const app = getApps().length > 0
    ? getApps()[0]
    : initializeApp({
      credential: cert({
        projectId: credentials.projectId,
        clientEmail: credentials.clientEmail,
        privateKey: credentials.privateKey,
      }),
    });

  messagingInstance = getAdminMessaging(app);
  return messagingInstance;
};

const isInvalidTokenError = (error) => {
  const code = error?.code || error?.errorInfo?.code || '';
  return [
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
    'messaging/invalid-argument',
  ].includes(code);
};

export const enviarPush = async ({
  id_usuario,
  titulo,
  mensaje,
  data = {},
}) => {
  try {
    const messaging = await getMessaging();
    if (!messaging || !id_usuario) {
      return { sent: 0, skipped: true };
    }

    const tokens = await FcmTokenModel.findActivosByUsuario(id_usuario);
    if (tokens.length === 0) {
      return { sent: 0, skipped: true };
    }

    let sent = 0;
    let failed = 0;

    for (const row of tokens) {
      try {
        await messaging.send({
          token: row.token,
          notification: {
            title: titulo,
            body: mensaje,
          },
          data: Object.fromEntries(
            Object.entries(data)
              .filter(([, value]) => value !== null && value !== undefined)
              .map(([key, value]) => [key, String(value)])
          ),
        });
        sent += 1;
      } catch (error) {
        failed += 1;
        if (isInvalidTokenError(error)) {
          await FcmTokenModel.desactivar(row.token).catch(() => {});
        }
      }
    }

    return { sent, failed, skipped: false };
  } catch (error) {
    console.error('[fcm] error al enviar push:', error.message);
    return { sent: 0, failed: 1, skipped: false };
  }
};

export const __setMessagingFactoryForTests = (factory) => {
  messagingFactoryForTests = factory;
  messagingInstance = null;
};

export default {
  enviarPush,
};
