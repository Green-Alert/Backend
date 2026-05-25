import { ReporteModel } from '../models/reporte.model.js';
import {
  calcularAlertasPredictivas,
  parseAlertasParams,
} from './prediccion.service.js';

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const construirContextoChatbot = async ({ user, lat, lng } = {}) => {
  const userId = user?.sub;
  const latitude = toNumber(lat);
  const longitude = toNumber(lng);
  const hasLocation = latitude !== null && longitude !== null;

  const [global, usuario, alertasPayload] = await Promise.all([
    ReporteModel.getStats().catch(() => ({})),
    userId
      ? Promise.all([
        ReporteModel.findByUsuario(userId, { limit: 5, offset: 0 }).catch(() => []),
        ReporteModel.countByUsuario(userId).catch(() => 0),
      ]).then(([reportes, total]) => ({ reportes, total_reportes: Number(total) || 0 }))
      : Promise.resolve(null),
    hasLocation
      ? calcularAlertasPredictivas(parseAlertasParams({
        lat: latitude,
        lng: longitude,
        radio_km: 25,
        limite: 3,
        min_score: 0,
        nivel_min: 'medio',
      })).catch(() => ({ alertas: [] }))
      : Promise.resolve({ alertas: [] }),
  ]);

  return {
    global,
    usuario,
    alertasZona: alertasPayload.alertas || [],
  };
};
