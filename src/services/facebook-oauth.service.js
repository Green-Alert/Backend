import { getFacebookConfig } from '../config/facebook.config.js';
import { createOAuthState } from './oauth-state.service.js';

const isDevelopment = () => process.env.NODE_ENV === 'development';

const getGraphApiBaseUrl = () => {
  const { graphApiVersion } = getFacebookConfig();
  return `https://graph.facebook.com/${graphApiVersion}`;
};

const maskValue = (value = '') => {
  if (!value) return '';
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const safeJson = async (response) => {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
};

const formatFacebookError = (data, fallbackMessage) => {
  const fbError = data?.error;

  if (!fbError) {
    return {
      message: fallbackMessage,
      raw: data?.raw,
    };
  }

  return {
    message: fbError.message || fallbackMessage,
    type: fbError.type,
    code: fbError.code,
    subcode: fbError.error_subcode,
    fbtraceId: fbError.fbtrace_id,
  };
};

const normalizeFacebookProfile = (profile) => {
  const fullName = profile.name || '';
  const [firstName = '', ...lastNameParts] = fullName.trim().split(' ').filter(Boolean);

  return {
    facebookId: profile.id,
    email: profile.email,
    nombre: profile.first_name || firstName || '',
    apellido: profile.last_name || lastNameParts.join(' ') || '',
    avatar_url: profile.picture?.data?.url || null,
  };
};

export const generateFacebookAuthUrl = () => {
  try {
    const config = getFacebookConfig();
    const params = new URLSearchParams({
      client_id: config.appId,
      redirect_uri: config.callbackUrl,
      scope: 'email,public_profile',
      response_type: 'code',
      state: createOAuthState('facebook'),
    });

    return {
      success: true,
      authUrl: `https://www.facebook.com/${config.graphApiVersion}/dialog/oauth?${params.toString()}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export const exchangeFacebookCodeForToken = async (code) => {
  try {
    const config = getFacebookConfig();
    const endpoint = `${getGraphApiBaseUrl()}/oauth/access_token`;
    const params = new URLSearchParams({
      client_id: config.appId,
      client_secret: config.appSecret,
      redirect_uri: config.callbackUrl,
      code,
    });

    if (isDevelopment()) {
      console.info('[Facebook OAuth] Intercambiando code por access_token', {
        endpoint,
        params: {
          client_id: config.appId,
          client_secret: maskValue(config.appSecret),
          redirect_uri: config.callbackUrl,
          code: maskValue(code),
        },
      });
    }

    const response = await fetch(`${endpoint}?${params.toString()}`);
    const data = await safeJson(response);

    if (!response.ok || !data.access_token) {
      const facebookError = formatFacebookError(
        data,
        'No fue posible obtener el access_token de Facebook.'
      );

      if (isDevelopment()) {
        console.error('[Facebook OAuth] Error al intercambiar code', {
          status: response.status,
          facebookError,
        });
      }

      return {
        success: false,
        error: facebookError.message,
        status: response.status,
        facebookError,
      };
    }

    return {
      success: true,
      accessToken: data.access_token,
    };
  } catch (error) {
    if (isDevelopment()) {
      console.error('[Facebook OAuth] Error inesperado al intercambiar code', {
        message: error.message,
      });
    }

    return {
      success: false,
      error: error.message,
    };
  }
};

export const getFacebookUserInfo = async (accessToken) => {
  try {
    const endpoint = `${getGraphApiBaseUrl()}/me`;
    const params = new URLSearchParams({
      fields: 'id,name,first_name,last_name,email,picture',
      access_token: accessToken,
    });

    if (isDevelopment()) {
      console.info('[Facebook OAuth] Consultando perfil de Facebook', {
        endpoint,
        params: {
          fields: 'id,name,first_name,last_name,email,picture',
          access_token: maskValue(accessToken),
        },
      });
    }

    const response = await fetch(`${endpoint}?${params.toString()}`);
    const data = await safeJson(response);

    if (!response.ok) {
      const facebookError = formatFacebookError(
        data,
        'No fue posible obtener informacion de Facebook.'
      );

      if (isDevelopment()) {
        console.error('[Facebook OAuth] Error al obtener perfil', {
          status: response.status,
          facebookError,
        });
      }

      return {
        success: false,
        error: facebookError.message,
        status: response.status,
        facebookError,
      };
    }

    const userInfo = normalizeFacebookProfile(data);
    if (!userInfo.email) {
      return {
        success: false,
        error: 'Facebook no retorno un email para el usuario.',
      };
    }

    return {
      success: true,
      ...userInfo,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};
