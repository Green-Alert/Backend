export const normalizeApiPrefix = (prefix) => {
  if (typeof prefix !== 'string') return '';

  const trimmedPrefix = prefix.trim();
  if (!trimmedPrefix || trimmedPrefix === '/') return '';

  const withLeadingSlash = trimmedPrefix.startsWith('/') ? trimmedPrefix : `/${trimmedPrefix}`;
  return withLeadingSlash.replace(/\/+$/, '');
};

export const getApiPrefix = () => normalizeApiPrefix(process.env.API_PREFIX);
