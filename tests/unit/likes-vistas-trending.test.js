import test from 'node:test';
import assert from 'node:assert/strict';
import { LikeModel } from '../../src/models/like.model.js';
import { ReporteModel } from '../../src/models/reporte.model.js';
import { EvidenciaModel } from '../../src/models/evidencia.model.js';
import { UsuarioModel } from '../../src/models/usuario.model.js';
import pool from '../../src/config/database.js';
import { clearSchemaCompatCache } from '../../src/config/schema-compat.js';
import {
  getReporteById,
  getReportes,
  getTrendingReportes,
  toggleLikeReporte,
} from '../../src/controllers/reporte.controller.js';

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

const createConnection = ({ likedInitially = false } = {}) => {
  let liked = likedInitially;
  let votos = liked ? 1 : 0;

  return {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    execute: async (sql) => {
      if (String(sql).includes('SELECT id_like')) {
        return [liked ? [{ id_like: 1 }] : []];
      }

      if (String(sql).includes('INSERT INTO reporte_likes')) {
        liked = true;
        votos += 1;
        return [{ affectedRows: 1 }];
      }

      if (String(sql).includes('DELETE FROM reporte_likes')) {
        liked = false;
        votos = Math.max(0, votos - 1);
        return [{ affectedRows: 1 }];
      }

      if (String(sql).includes('UPDATE reportes')) {
        return [{ affectedRows: 1 }];
      }

      if (String(sql).includes('SELECT votos_relevancia')) {
        return [[{ votos_relevancia: votos }]];
      }

      return [[]];
    },
  };
};

test('LikeModel.toggle alterna like y unlike para el mismo usuario', async (t) => {
  clearSchemaCompatCache();
  t.mock.method(pool, 'execute', async () => [[{ total: 1 }]]);
  const connection = createConnection();
  t.mock.method(pool, 'getConnection', async () => connection);

  const liked = await LikeModel.toggle(10, 21);
  const unliked = await LikeModel.toggle(10, 21);

  assert.deepEqual(liked, { liked: true, votos_relevancia: 1 });
  assert.deepEqual(unliked, { liked: false, votos_relevancia: 0 });
});

test('toggleLikeReporte prohibe like al propio reporte', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => ({
    id_reporte: 10,
    id_usuario: 21,
  }));
  t.mock.method(LikeModel, 'toggle', async () => {
    throw new Error('No debe crear like propio');
  });

  const req = {
    params: { id: '10' },
    user: { sub: 21 },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await toggleLikeReporte(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'No puedes reaccionar a tu propio reporte.');
  assert.equal(LikeModel.toggle.mock.callCount(), 0);
  assert.equal(next.mock.callCount(), 0);
});

test('getReportes y getTrendingReportes agregan liked_by_me con sesion opcional', async (t) => {
  const reportes = [
    { id_reporte: 10, titulo: 'Reporte 10' },
    { id_reporte: 11, titulo: 'Reporte 11', trending_score: 8 },
  ];
  t.mock.method(ReporteModel, 'findAll', async () => reportes);
  t.mock.method(ReporteModel, 'countAll', async () => 2);
  t.mock.method(ReporteModel, 'findTrending', async () => reportes);
  t.mock.method(LikeModel, 'likedSet', async () => new Set([11]));

  const listRes = createResponse();
  await getReportes({ query: {}, user: { sub: 21 } }, listRes, t.mock.fn());

  assert.equal(listRes.body.data.reportes[0].liked_by_me, false);
  assert.equal(listRes.body.data.reportes[1].liked_by_me, true);

  const trendingRes = createResponse();
  await getTrendingReportes({ query: {}, user: { sub: 21 } }, trendingRes, t.mock.fn());

  assert.equal(trendingRes.body.data.reportes[0].liked_by_me, false);
  assert.equal(trendingRes.body.data.reportes[1].liked_by_me, true);
});

test('registrarVistaUsuario solo incrementa con primera vista persistida', async (t) => {
  clearSchemaCompatCache();
  const calls = [];
  let firstInsert = true;

  t.mock.method(pool, 'execute', async (sql) => {
    calls.push(String(sql));
    if (String(sql).includes('INFORMATION_SCHEMA.TABLES')) {
      return [[{ total: 1 }]];
    }

    if (String(sql).includes('INSERT IGNORE INTO reporte_vistas')) {
      const affectedRows = firstInsert ? 1 : 0;
      firstInsert = false;
      return [{ affectedRows }];
    }

    return [{ affectedRows: 1 }];
  });
  t.mock.method(ReporteModel, 'incrementarVistas', async () => {});

  const first = await ReporteModel.registrarVistaUsuario(10, 21);
  const second = await ReporteModel.registrarVistaUsuario(10, 21);

  assert.equal(first, true);
  assert.equal(second, false);
  assert.equal(ReporteModel.incrementarVistas.mock.callCount(), 1);
  assert.ok(calls.some((sql) => sql.includes('INSERT IGNORE INTO reporte_vistas')));
});

test('getReporteById aplica throttle de vistas anonimas por refresh inmediato', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => ({
    id_reporte: 10,
    id_usuario: 99,
    titulo: 'Reporte',
  }));
  t.mock.method(ReporteModel, 'incrementarVistas', async () => {});
  t.mock.method(EvidenciaModel, 'findByReporte', async () => []);
  t.mock.method(UsuarioModel, 'findById', async () => null);

  const createReq = () => ({
    params: { id: '10' },
    query: {},
    headers: { 'user-agent': 'test-agent' },
    ip: '127.0.0.1',
    get(header) {
      return this.headers[String(header).toLowerCase()];
    },
  });

  await getReporteById(createReq(), createResponse(), t.mock.fn());
  await getReporteById(createReq(), createResponse(), t.mock.fn());

  assert.equal(ReporteModel.incrementarVistas.mock.callCount(), 1);
});

test('findTrending devuelve trending_score numerico', async (t) => {
  t.mock.method(pool, 'execute', async () => [[{
    id_reporte: 10,
    titulo: 'Reporte',
    trending_score: '42',
  }]]);

  const [reporte] = await ReporteModel.findTrending();

  assert.equal(reporte.trending_score, 42);
});
