import nodemailer from 'nodemailer';

let cachedTransporter = null;

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error('SMTP config incompleta.');
  }

  if (!cachedTransporter) {
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

  return cachedTransporter;
};

const generarTemplateBienvenida = (nombre, apellido) => {
  const appName = process.env.APP_NAME || 'GreenAlert';
  const year = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 30px 20px;
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 20px;
          color: #333;
        }
        .message {
          color: #555;
          margin-bottom: 20px;
          line-height: 1.8;
        }
        .features {
          background-color: #f0fdf4;
          border-left: 4px solid #10b981;
          padding: 15px 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .features h3 {
          margin: 0 0 10px 0;
          color: #059669;
          font-size: 16px;
        }
        .features ul {
          padding-left: 20px;
          margin: 0;
        }
        .features li {
          margin: 8px 0;
          color: #555;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
          font-size: 13px;
          color: #999;
        }
        .footer p {
          margin: 5px 0;
        }
        a {
          color: #10b981;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌱 ${appName}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Bienvenido a nuestra comunidad</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            ¡Hola <strong>${nombre} ${apellido}</strong>!
          </div>
          
          <div class="message">
            Tu cuenta ha sido creada correctamente. Ahora eres parte de ${appName}, una plataforma dedicada a reportar y monitorear riesgos ambientales en tu comunidad.
          </div>
          
          <div class="features">
            <h3>¿Qué puedo hacer ahora?</h3>
            <ul>
              <li>📍 Reportar riesgos ambientales en tu zona</li>
              <li>🗺️ Visualizar reportes en el mapa interactivo</li>
              <li>💬 Contribuir a la moderación comunitaria</li>
              <li>📊 Acceder a tu panel de usuario</li>
            </ul>
          </div>
          
          <div class="message">
            Si tienes algún problema o pregunta, no dudes en contactarnos. Estamos aquí para ayudarte.
          </div>
        </div>
        
        <div class="footer">
          <p>&copy; ${year} ${appName}. Todos los derechos reservados.</p>
          <p>Este correo fue enviado porque te registraste en ${appName}</p>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">Ir a ${appName}</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const enviarCorreo = async (to, subject, html) => {
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html,
    });

    return info;
  } catch (error) {
    console.error('Error enviando correo:', error);
    throw error;
  }
};

export const enviarCorreoBienvenida = async (email, nombre, apellido) => {
  try {
    const html = generarTemplateBienvenida(nombre, apellido);
    const subject = '¡Bienvenido a GreenAlert!';
    
    await enviarCorreo(email, subject, html);
    return true;
  } catch (error) {
    console.error('Error enviando correo de bienvenida:', error);
    // No lanzamos error para no romper el flujo de registro
    return false;
  }
};

const generarTemplateVerificacionEmail = (nombre, enlaceVerificacion) => {
  const appName = process.env.APP_NAME || 'GreenAlert';
  const year = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 30px 20px;
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 20px;
          color: #333;
        }
        .message {
          color: #555;
          margin-bottom: 20px;
          line-height: 1.8;
        }
        .cta-button {
          display: inline-block;
          background-color: #10b981;
          color: white;
          padding: 12px 30px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          margin: 20px 0;
          transition: background-color 0.3s;
        }
        .cta-button:hover {
          background-color: #059669;
        }
        .warning {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px 20px;
          margin: 20px 0;
          border-radius: 4px;
          color: #92400e;
          font-size: 14px;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
          font-size: 13px;
          color: #999;
        }
        .footer p {
          margin: 5px 0;
        }
        a {
          color: #10b981;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Verifica tu correo electronico</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hola <strong>${nombre}</strong>,
          </div>
          
          <div class="message">
            Casi hemos terminado. Para completar la verificacion de tu cuenta en ${appName}, por favor verifica tu correo electronico haciendo click en el boton de abajo.
          </div>
          
          <div style="text-align: center;">
            <a href="${enlaceVerificacion}" class="cta-button">Verificar mi correo</a>
          </div>
          
          <div class="message">
            O copia y pega este enlace en tu navegador:
            <br>
            <small style="word-break: break-all; color: #666;">${enlaceVerificacion}</small>
          </div>
          
          <div class="warning">
            Este enlace expirara en 24 horas. Si no verificas tu cuenta en ese tiempo, podras solicitar un nuevo enlace iniciando sesion.
          </div>
          
          <div class="message">
            Si no solicitaste esta verificacion, puedes ignorar este correo. Tu cuenta no se activara sin tu confirmacion.
          </div>
        </div>
        
        <div class="footer">
          <p>&copy; ${year} ${appName}. Todos los derechos reservados.</p>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">Volver a ${appName}</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const enviarCorreoVerificacion = async (email, nombre, tokenVerificacion) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const enlaceVerificacion = `${baseUrl}/auth/verify-email?token=${tokenVerificacion}`;
    const html = generarTemplateVerificacionEmail(nombre, enlaceVerificacion);
    const subject = 'Verifica tu correo electronico en GreenAlert';
    
    await enviarCorreo(email, subject, html);
    return true;
  } catch (error) {
    console.error('Error enviando correo de verificacion:', error);
    return false;
  }
};
