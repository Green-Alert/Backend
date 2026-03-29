// respuesta exitosa
export const successResponse = (res, data, message = 'ok', statusCode = 200) => {
  res.status(statusCode).json({ status: 'success', message, data });
};

// respuesta de error
export const errorResponse = (res, message = 'error', statusCode = 400) => {
  res.status(statusCode).json({ status: 'error', message });
};
