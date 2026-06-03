import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  addEvidenciaReporte,
  deleteEvidenciaReporte,
  listEvidenciasReporte,
} from '../../src/controllers/reporte.controller.js';
import { EvidenciaModel } from '../../src/models/evidencia.model.js';
import { ReporteModel } from '../../src/models/reporte.model.js';
import {
  resetCloudinaryClientForTest,
  setCloudinaryClientForTest,
} from '../../src/services/cloudinary.service.js';

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

const VALID_PNG_BUFFER = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('fake-image'),
]);

const FAKE_IMAGE_SHA256 = createHash('sha256').update(VALID_PNG_BUFFER).digest('hex');

test.afterEach(() => {
  resetCloudinaryClientForTest();
});

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
      buffer: VALID_PNG_BUFFER,
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
  assert.equal(evidencia.hash_sha256, FAKE_IMAGE_SHA256);
  assert.equal(evidencia.storage_provider, 'cloudinary');
  assert.match(evidencia.cloudinary_public_id, /^green-alert\/test\//);
  assert.match(evidencia.cloudinary_asset_id, /^asset-/);
  assert.equal(evidencia.cloudinary_resource_type, 'image');
  assert.equal(evidencia.cloudinary_metadata.bytes, 1024);
  assert.equal(evidencia.orden, 0);
  assert.equal(next.mock.callCount(), 0);
});

test('addEvidenciaReporte rechaza archivo con contenido falso', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => reporte);
  t.mock.method(EvidenciaModel, 'create', async () => {
    throw new Error('No debe guardar evidencia con contenido falso');
  });

  const req = {
    params: { id: '15' },
    user: { sub: 9, rol: 'moderador' },
    file: {
      mimetype: 'image/png',
      filename: 'falso.png',
      originalname: 'falso.png',
      size: 1024,
      buffer: Buffer.from('%PDF-1.7 contenido falso'),
    },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await addEvidenciaReporte(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(
    res.body.message,
    'El contenido del archivo "falso.png" no coincide con el tipo declarado o esta corrupto.'
  );
  assert.equal(EvidenciaModel.create.mock.callCount(), 0);
  assert.equal(next.mock.callCount(), 0);
});

test('deleteEvidenciaReporte elimina evidencia activa del reporte', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => reporte);
  t.mock.method(EvidenciaModel, 'findById', async () => ({
    id_evidencia: 22,
    id_reporte: 15,
    storage_provider: 'local',
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

test('deleteEvidenciaReporte elimina asset de Cloudinary antes de remover evidencia', async (t) => {
  t.mock.method(ReporteModel, 'findById', async () => reporte);
  t.mock.method(EvidenciaModel, 'findById', async () => ({
    id_evidencia: 22,
    id_reporte: 15,
    storage_provider: 'cloudinary',
    cloudinary_public_id: 'green-alert/reportes/demo',
    cloudinary_resource_type: 'image',
  }));
  t.mock.method(EvidenciaModel, 'remove', async () => true);

  let destroyedPublicId = null;
  let destroyOptions = null;
  setCloudinaryClientForTest({
    uploader: {
      destroy(publicId, options) {
        destroyedPublicId = publicId;
        destroyOptions = options;
        return Promise.resolve({ result: 'ok' });
      },
    },
  });

  const req = {
    params: { id: '15', evidenciaId: '22' },
    user: { sub: 7, rol: 'ciudadano' },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await deleteEvidenciaReporte(req, res, next);

  assert.equal(res.statusCode, 200);
  assert.equal(destroyedPublicId, 'green-alert/reportes/demo');
  assert.deepEqual(destroyOptions, { resource_type: 'image', invalidate: true });
  assert.equal(EvidenciaModel.remove.mock.calls[0].arguments[0], 22);
  assert.equal(next.mock.callCount(), 0);
});

test('deleteEvidenciaReporte no remueve evidencia si falla Cloudinary', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(ReporteModel, 'findById', async () => reporte);
  t.mock.method(EvidenciaModel, 'findById', async () => ({
    id_evidencia: 22,
    id_reporte: 15,
    storage_provider: 'cloudinary',
    cloudinary_public_id: 'green-alert/reportes/demo',
    cloudinary_resource_type: 'image',
  }));
  t.mock.method(EvidenciaModel, 'remove', async () => {
    throw new Error('No debe remover evidencia si Cloudinary falla');
  });

  setCloudinaryClientForTest({
    uploader: {
      destroy() {
        return Promise.reject(new Error('cloudinary unavailable'));
      },
    },
  });

  const req = {
    params: { id: '15', evidenciaId: '22' },
    user: { sub: 7, rol: 'ciudadano' },
  };
  const res = createResponse();
  const next = t.mock.fn();

  await deleteEvidenciaReporte(req, res, next);

  assert.equal(res.statusCode, 502);
  assert.equal(
    res.body.message,
    'No se pudo eliminar el archivo asociado en Cloudinary. Intenta nuevamente.'
  );
  assert.equal(EvidenciaModel.remove.mock.callCount(), 0);
  assert.equal(next.mock.callCount(), 0);
});
