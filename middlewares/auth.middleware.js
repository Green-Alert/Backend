import jwt from 'jsonwebtoken';

const getBearerToken = (req) => {
  const authHeader = req.headers['authorization'];
  const [scheme, token] = typeof authHeader === 'string' ? authHeader.split(' ') : [];

  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
};

// protege rutas privadas verificando el token bearer
export const verifyToken = (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'acceso denegado. token no proporcionado.',
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(403).json({
      status: 'error',
      message: 'token inválido o expirado.',
    });
  }
};

export const optionalAuth = (req, _res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    delete req.user;
    return next();
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    delete req.user;
  }

  return next();
};

export const verifyTokenWhenAllDevicesLogout = (req, res, next) => {
  if (req.body?.allDevices === true) {
    return verifyToken(req, res, next);
  }

  return next();
};

// Debe usarse despues de verifyToken para asegurar req.user.
export const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'acceso denegado. usuario no autenticado.',
    });
  }

  if (!roles.includes(req.user.rol)) {
    return res.status(403).json({
      status: 'error',
      message: 'acceso denegado. rol no autorizado.',
    });
  }

  return next();
};
