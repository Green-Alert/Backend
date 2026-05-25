import { getEmailConfig } from '../config/email.config.js';

let cachedTransporter = null;

const getTransporter = async () => {
  if (!cachedTransporter) {
    const { default: nodemailer } = await import('nodemailer');
    const { host, port, user, pass } = getEmailConfig();

    if (process.env.EMAIL_TRANSPORT === 'json') {
      cachedTransporter = nodemailer.createTransport({ jsonTransport: true });
    } else {
      cachedTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
    }
  }

  return cachedTransporter;
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const generarTemplateBaseCorreo = ({
  title,
  subtitle = '',
  previewText = '',
  content,
  actionUrl,
  actionText,
}) => {
  const appName = process.env.APP_NAME || 'GreenAlert';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const year = new Date().getFullYear();

  const actionHtml = actionUrl && actionText
    ? `
      <p style="text-align:center; margin: 28px 0;">
        <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#059669;color:#ffffff;padding:12px 20px;border-radius:8px;font-weight:600;text-decoration:none;">
          ${escapeHtml(actionText)}
        </a>
      </p>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(title || appName)}</title>
      <style>
        body {
          margin: 0;
          padding: 24px 12px;
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.6;
          color: #333333;
          background-color: #f5f7f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }
        .header {
          background: #059669;
          color: #ffffff;
          padding: 28px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .content {
          padding: 30px 22px;
        }
        .content h2 {
          margin: 0 0 18px;
          color: #111827;
          font-size: 22px;
        }
        .message {
          color: #4b5563;
          margin-bottom: 18px;
        }
        .panel {
          background-color: #f0fdf4;
          border-left: 4px solid #10b981;
          padding: 15px 18px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .panel h3 {
          margin: 0 0 10px;
          color: #047857;
          font-size: 16px;
        }
        .panel ul {
          padding-left: 20px;
          margin: 0;
        }
        .footer {
          background-color: #f9fafb;
          padding: 18px 20px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
          font-size: 13px;
          color: #6b7280;
        }
        .footer p {
          margin: 5px 0;
        }
        a {
          color: #059669;
        }
      </style>
    </head>
    <body>
      <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
        ${escapeHtml(previewText)}
      </span>
      <div class="container">
        <div class="header">
          <h1>${escapeHtml(appName)}</h1>
          ${subtitle ? `<p style="margin: 10px 0 0 0; opacity: 0.92;">${escapeHtml(subtitle)}</p>` : ''}
        </div>
        <div class="content">
          <h2>${escapeHtml(title || appName)}</h2>
          ${content}
          ${actionHtml}
        </div>
        <div class="footer">
          <p>&copy; ${year} ${escapeHtml(appName)}. Todos los derechos reservados.</p>
          <p>Este correo fue enviado automaticamente por ${escapeHtml(appName)}.</p>
          <p><a href="${escapeHtml(frontendUrl)}">Ir a ${escapeHtml(appName)}</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generarTemplateBienvenida = (nombre, apellido) => {
  const appName = process.env.APP_NAME || 'GreenAlert';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return generarTemplateBaseCorreo({
    title: `Hola ${nombre} ${apellido}`,
    subtitle: 'Bienvenido a nuestra comunidad',
    previewText: `Tu cuenta en ${appName} fue creada correctamente.`,
    actionUrl: frontendUrl,
    actionText: `Ir a ${appName}`,
    content: `
      <div class="message">
        Tu cuenta ha sido creada correctamente. Ahora eres parte de ${escapeHtml(appName)}, una plataforma dedicada a reportar y monitorear riesgos ambientales en tu comunidad.
      </div>
      <div class="panel">
        <h3>Que puedes hacer ahora</h3>
        <ul>
          <li>Reportar riesgos ambientales en tu zona</li>
          <li>Visualizar reportes en el mapa interactivo</li>
          <li>Consultar el estado de tus reportes</li>
          <li>Acceder a tu panel de usuario</li>
        </ul>
      </div>
      <div class="message">
        Si tienes algun problema o pregunta, contacta al equipo de soporte.
      </div>
    `,
  });
};

export const enviarCorreo = async (to, subject, html) => {
  try {
    const transporter = await getTransporter();
    const { from } = getEmailConfig();

    return transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error enviando correo:', error);
    throw error;
  }
};

export const verificarConexionSmtp = async () => {
  const transporter = await getTransporter();
  return transporter.verify();
};

export const enviarCorreoBienvenida = async (email, nombre, apellido) => {
  try {
    const html = generarTemplateBienvenida(nombre, apellido);
    await enviarCorreo(email, 'Bienvenido a GreenAlert', html);
    return true;
  } catch (error) {
    console.error('Error enviando correo de bienvenida:', error);
    return false;
  }
};


