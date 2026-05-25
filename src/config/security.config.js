const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';

export const getAllowedCorsOrigins = () => {
  const rawOrigins = process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGIN;

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const getCorsOptions = () => {
  const allowedOrigins = getAllowedCorsOrigins();

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  };
};

export const getHelmetOptions = () => ({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});
