export const validatePositiveIdParam = (paramName = 'id') => (req, res, next) => {
  const rawId = req.params?.[paramName];

  if (typeof rawId !== 'string' || !/^[1-9]\d*$/.test(rawId)) {
    return res.status(400).json({
      status: 'error',
      message: `${paramName} invalido. Debe ser un entero positivo.`,
    });
  }

  req.params[paramName] = String(Number(rawId));
  return next();
};
