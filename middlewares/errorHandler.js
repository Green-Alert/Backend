// ruta no encontrada 
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
};

// manejador global de errores 
 
export const errorHandler = (err, req, res, next) => {
  console.error('error:', err.message);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
