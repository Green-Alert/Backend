import { OAuth2Client } from 'google-auth-library';
import { getGoogleConfig } from '../config/google.config.js';

let oauthClient = null;

export const getOAuthClient = () => {
  if (oauthClient) {
    return oauthClient;
  }

  const config = getGoogleConfig();
  
  oauthClient = new OAuth2Client({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.callbackUrl,
  });

  return oauthClient;
};

export const verifyGoogleToken = async (idToken) => {
  try {
    const client = getOAuthClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: getGoogleConfig().clientId,
    });

    const payload = ticket.getPayload();
    
    return {
      success: true,
      googleId: payload.sub,
      email: payload.email,
      nombre: payload.given_name || '',
      apellido: payload.family_name || '',
      avatar_url: payload.picture || null,
      email_verified: payload.email_verified || false,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export const exchangeCodeForTokens = async (code) => {
  try {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    
    return {
      success: true,
      tokens,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export const getGoogleUserInfo = async (accessToken) => {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const userInfo = await response.json();

    return {
      success: true,
      googleId: userInfo.id,
      email: userInfo.email,
      nombre: userInfo.given_name || userInfo.name || '',
      apellido: userInfo.family_name || '',
      avatar_url: userInfo.picture || null,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export const generateAuthUrl = () => {
  try {
    const client = getOAuthClient();
    const scopes = [
      'openid',
      'email',
      'profile',
    ];

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    return {
      success: true,
      authUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};
