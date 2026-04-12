import jwt from 'jsonwebtoken';

// protege rutas privadas verificando el token bearer
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

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
