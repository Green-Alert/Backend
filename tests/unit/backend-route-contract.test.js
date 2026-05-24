import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const backendDir = path.resolve(path.dirname(__filename), '../..');

const read = (relativePath) => fs.readFile(path.join(backendDir, relativePath), 'utf8');

const routePattern = ({ router, method, route }) => new RegExp(
  `${router}\\.${method}\\(\\s*['"\`]${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`
);

test('app monta todos los routers principales sin prefijo interno obligatorio', async () => {
  const source = await read('src/app.js');

  for (const mount of [
    '${apiPrefix}/health',
    '${apiPrefix}/auth',
    '${apiPrefix}/reportes',
    '${apiPrefix}/categorias',
    '${apiPrefix}/admin',
    '${apiPrefix}/chatbot',
    '${apiPrefix}/notificaciones',
  ]) {
    assert.ok(source.includes(`app.use(\`${mount}\``), mount);
  }
});

test('rutas consumidas por el cliente estan declaradas en backend', async () => {
  const routeFiles = {
    healthRouter: await read('routes/health.routes.js'),
    authRouter: await read('routes/auth.routes.js'),
    categoriaRouter: await read('routes/categoria-riesgo.routes.js'),
    reporteRouter: await read('routes/reporte.routes.js'),
    adminRouter: await read('routes/admin.routes.js'),
    chatbotRouter: await read('routes/chatbot.routes.js'),
    notificacionRouter: await read('routes/notificacion.routes.js'),
  };

  const expectedRoutes = [
    { router: 'healthRouter', method: 'get', route: '/' },
    { router: 'authRouter', method: 'post', route: '/login' },
    { router: 'authRouter', method: 'post', route: '/register' },
    { router: 'authRouter', method: 'post', route: '/google' },
    { router: 'authRouter', method: 'post', route: '/facebook' },
    { router: 'authRouter', method: 'get', route: '/perfil' },
    { router: 'authRouter', method: 'patch', route: '/perfil' },
    { router: 'authRouter', method: 'patch', route: '/avatar' },
    { router: 'authRouter', method: 'patch', route: '/cambiar-contrasena' },
    { router: 'authRouter', method: 'patch', route: '/notificaciones' },
    { router: 'authRouter', method: 'post', route: '/forgot-password' },
    { router: 'authRouter', method: 'post', route: '/reset-password' },
    { router: 'authRouter', method: 'post', route: '/enviar-verificacion' },
    { router: 'authRouter', method: 'post', route: '/verificar-email' },
    { router: 'categoriaRouter', method: 'get', route: '/' },
    { router: 'categoriaRouter', method: 'get', route: '/:codigo' },
    { router: 'reporteRouter', method: 'get', route: '/stats' },
    { router: 'reporteRouter', method: 'get', route: '/stats/categoria' },
    { router: 'reporteRouter', method: 'get', route: '/stats/timeline' },
    { router: 'reporteRouter', method: 'get', route: '/stats/heatmap' },
    { router: 'reporteRouter', method: 'get', route: '/stats/ia' },
    { router: 'reporteRouter', method: 'post', route: '/' },
    { router: 'reporteRouter', method: 'get', route: '/' },
    { router: 'reporteRouter', method: 'get', route: '/:id' },
    { router: 'reporteRouter', method: 'post', route: '/analizar-imagen' },
    { router: 'reporteRouter', method: 'patch', route: '/:id' },
    { router: 'reporteRouter', method: 'delete', route: '/:id' },
    { router: 'reporteRouter', method: 'get', route: '/export' },
    { router: 'reporteRouter', method: 'post', route: '/:id/like' },
    { router: 'reporteRouter', method: 'get', route: '/trending' },
    { router: 'reporteRouter', method: 'get', route: '/zonas-riesgo' },
    { router: 'reporteRouter', method: 'get', route: '/alertas-predictivas' },
    { router: 'reporteRouter', method: 'get', route: '/mis-reportes' },
    { router: 'adminRouter', method: 'get', route: '/usuarios/stats' },
    { router: 'adminRouter', method: 'get', route: '/usuarios' },
    { router: 'adminRouter', method: 'get', route: '/usuarios/:id' },
    { router: 'adminRouter', method: 'patch', route: '/usuarios/:id/rol' },
    { router: 'adminRouter', method: 'patch', route: '/usuarios/:id/estado' },
    { router: 'adminRouter', method: 'delete', route: '/usuarios/:id' },
    { router: 'chatbotRouter', method: 'post', route: '/mensaje' },
    { router: 'chatbotRouter', method: 'get', route: '/faqs' },
    { router: 'notificacionRouter', method: 'get', route: '/' },
    { router: 'notificacionRouter', method: 'get', route: '/contador' },
    { router: 'notificacionRouter', method: 'post', route: '/fcm-token' },
    { router: 'notificacionRouter', method: 'patch', route: '/:uuid/leida' },
    { router: 'notificacionRouter', method: 'patch', route: '/marcar-todas' },
    { router: 'notificacionRouter', method: 'delete', route: '/:uuid' },
  ];

  for (const expected of expectedRoutes) {
    assert.match(
      routeFiles[expected.router],
      routePattern(expected),
      `${expected.router}.${expected.method} ${expected.route}`
    );
  }
});

test('rutas privadas y administrativas declaran middleware de autenticacion y roles', async () => {
  const adminRoutes = await read('routes/admin.routes.js');
  const categoriaRoutes = await read('routes/categoria-riesgo.routes.js');
  const notificacionRoutes = await read('routes/notificacion.routes.js');
  const reporteRoutes = await read('routes/reporte.routes.js');
  const authRoutes = await read('routes/auth.routes.js');

  assert.match(adminRoutes, /adminRouter\.use\(verifyToken,\s*requireRoles\('admin'\)\)/);
  assert.match(notificacionRoutes, /notificacionRouter\.use\(verifyToken\)/);

  assert.match(categoriaRoutes, /categoriaRouter\.post\('\/',\s*verifyToken,\s*requireRoles\('admin'\)/);
  assert.match(categoriaRoutes, /categoriaRouter\.patch\('\/:codigo',\s*verifyToken,\s*requireRoles\('admin'\)/);
  assert.match(categoriaRoutes, /categoriaRouter\.patch\('\/:codigo\/estado',\s*verifyToken,\s*requireRoles\('admin'\)/);

  assert.match(reporteRoutes, /reporteRouter\.get\('\/stats\/ia',\s*verifyToken,\s*requireRoles\('admin', 'moderador'\)/);
  assert.match(reporteRoutes, /reporteRouter\.get\('\/zonas-riesgo',\s*verifyToken,\s*requireRoles\('admin', 'moderador'\)/);
  assert.match(reporteRoutes, /reporteRouter\.get\('\/export',\s*verifyToken,\s*requireRoles\('admin', 'moderador'\)/);
  assert.match(reporteRoutes, /reporteRouter\.get\('\/mis-reportes',\s*verifyToken/);
  assert.match(reporteRoutes, /reporteRouter\.post\('\/analizar-imagen',\s*verifyToken/);
  assert.match(reporteRoutes, /reporteRouter\.post\('\/:id\/like',[\s\S]*verifyToken/);
  assert.match(reporteRoutes, /reporteRouter\.patch\('\/:id',[\s\S]*verifyToken/);
  assert.match(reporteRoutes, /reporteRouter\.delete\('\/:id',[\s\S]*verifyToken/);

  assert.match(authRoutes, /authRouter\.get\('\/perfil',\s*verifyToken/);
  assert.match(authRoutes, /authRouter\.patch\('\/perfil',\s*verifyToken/);
  assert.match(authRoutes, /authRouter\.patch\('\/avatar',\s*verifyToken/);
  assert.match(authRoutes, /authRouter\.patch\('\/notificaciones',\s*verifyToken/);
  assert.match(authRoutes, /authRouter\.post\('\/enviar-verificacion',\s*authRateLimit,\s*verifyToken/);
  assert.match(authRoutes, /authRouter\.post\('\/verificar-email',\s*authRateLimit,\s*verifyToken/);
});
