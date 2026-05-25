import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addEvidenciaReporte,
  deleteEvidenciaReporte,
  listEvidenciasReporte,
} from '../../src/controllers/reporte.controller.js';
import { EvidenciaModel } from '../../src/models/evidencia.model.js';
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

const reporte = {
  id_reporte: 15,
  id_usuario: 7,
  estado: 'pendiente',
};

test('listEvidenciasReporte permite listar al propietario del reporte', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => reporte);
  t.mock.method(EvidenciaModel, 'findByReporte', async () => ([
    { id_evidencia: 1, id_reporte: 15, url_archivo: '/uploads/a.jpg' },
  ]));

  const req = {
    params: { id: '15' },
    user: { sub: 7, rol: 'ciudadano' },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await listEvidenciasReporte(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.total, 1);
  assert.equal(EvidenciaModel.findByReporte.mock.calls[0].arguments[0], 15);
  assert.equal(next.mock.callCount(), 0);
});

test('listEvidenciasReporte rechaza usuario que no es propietario ni moderador', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => reporte);
  t.mock.method(EvidenciaModel, 'findByReporte', async () => {
    throw new Error('No debe consultar evidencias sin permiso');
  });

  const req = {
    params: { id: '15' },
    user: { sub: 99, rol: 'ciudadano' },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await listEvidenciasReporte(req, res, next);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'No tienes permiso para gestionar evidencias de este reporte.');
  assert.equal(EvidenciaModel.findByReporte.mock.callCount(), 0);
  assert.equal(next.mock.callCount(), 0);
});

test('addEvidenciaReporte agrega evidencia al reporte como moderador', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => reporte);
  t.mock.method(EvidenciaModel, 'create', async () => 22);
  t.mock.method(EvidenciaModel, 'findById', async () => ({
    id_evidencia: 22,
    id_reporte: 15,
    tipo_archivo: 'imagen',
  }));

  const req = {
    params: { id: '15' },
    user: { sub: 9, rol: 'moderador' },
    file: {
      mimetype: 'image/png',
      filename: 'evidencia.png',
      originalname: 'foto.png',
      size: 1024,
      buffer: Buffer.from('fake-image'),
    },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await addEvidenciaReporte(req, res, next);

  assert.equal(res.statusCode, 201);
  const evidencia = EvidenciaModel.create.mock.calls[0].arguments[0];
  assert.equal(evidencia.id_reporte, 15);
  assert.equal(evidencia.id_usuario, 9);
  assert.equal(evidencia.tipo_archivo, 'imagen');
  assert.match(evidencia.url_archivo, /^https:\/\/res\.cloudinary\.com\/test\/image\/upload\//);
  assert.equal(evidencia.nombre_original, 'foto.png');
  assert.equal(evidencia.mime_type, 'image/png');
  assert.equal(evidencia.tamano_bytes, 1024);
  assert.equal(evidencia.storage_provider, 'cloudinary');
  assert.match(evidencia.cloudinary_public_id, /^green-alert\/test\//);
  assert.match(evidencia.cloudinary_asset_id, /^asset-/);
  assert.equal(evidencia.cloudinary_resource_type, 'image');
  assert.equal(evidencia.cloudinary_metadata.bytes, 1024);
  assert.equal(evidencia.orden, 0);
  assert.equal(next.mock.callCount(), 0);
});

test('deleteEvidenciaReporte elimina evidencia activa del reporte', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => reporte);
  t.mock.method(EvidenciaModel, 'findById', async () => ({
    id_evidencia: 22,
    id_reporte: 15,
  }));
  t.mock.method(EvidenciaModel, 'remove', async () => true);

  const req = {
    params: { id: '15', evidenciaId: '22' },
    user: { sub: 7, rol: 'ciudadano' },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await deleteEvidenciaReporte(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.equal(EvidenciaModel.remove.mock.calls[0].arguments[0], 22);
  assert.equal(next.mock.callCount(), 0);
});
