import {
  calcularAlertasPredictivas,
  calcularZonasRiesgo,
  parseAlertasParams,
  parseZonasParams,
} from '../services/prediccion.service.js';
import { successResponse } from '../utils/response.js';

export const getZonasRiesgo = async (req, res, next) => {
  try {
    const payload = await calcularZonasRiesgo(parseZonasParams(req.query));
    return successResponse(res, payload, 'Zonas de riesgo obtenidas correctamente.');
  } catch (error) {
    return next(error);
  }
};

// Publico para que el frontend pueda mostrar alertas preventivas sin sesion.
// No expone autores, usuarios ni IDs personales; solo agregados por zona.
export const getAlertasPredictivas = async (req, res, next) => {
  try {
    const payload = await calcularAlertasPredictivas(parseAlertasParams(req.query));
    return successResponse(res, payload, 'Alertas predictivas obtenidas correctamente.');
  } catch (error) {
    return next(error);
  }
};
