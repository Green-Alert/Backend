export const FAQ_GROUPS = [
  {
    titulo: 'Reportes',
    items: [
      { pregunta: 'Como crear un reporte ambiental?', prompt: 'Como creo un reporte ambiental?' },
      { pregunta: 'Que evidencia puedo adjuntar?', prompt: 'Que evidencia puedo adjuntar a un reporte?' },
      { pregunta: 'Como reviso el estado de mi reporte?', prompt: 'Como reviso el estado de mi reporte?' },
    ],
  },
  {
    titulo: 'Alertas',
    items: [
      { pregunta: 'Que son las zonas de riesgo?', prompt: 'Que son las zonas de riesgo predictivas?' },
      { pregunta: 'Como activar alertas en mi zona?', prompt: 'Como activo alertas en mi zona?' },
    ],
  },
  {
    titulo: 'Cuenta',
    items: [
      { pregunta: 'Como verifico mi correo?', prompt: 'Como verifico mi correo electronico?' },
      { pregunta: 'Como recupero mi contrasena?', prompt: 'Como recupero mi contrasena?' },
    ],
  },
];

const normalizeText = (value) => (
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
);

export const detectIntent = (mensaje) => {
  const text = normalizeText(mensaje);

  if (/mis reportes|mis denuncias|cuantos reportes|estado de mi|seguimiento/.test(text)) {
    return 'mis_reportes';
  }
  if (/reporte|denuncia|evidencia|foto|crear|enviar|adjuntar/.test(text)) return 'reportes';
  if (/alerta|riesgo|zona|mapa|predic|cerca|ubicacion/.test(text)) return 'alertas';
  if (/correo|verific|otp|codigo/.test(text)) return 'verificacion';
  if (/contrase|password|recuper/.test(text)) return 'recuperacion';
  if (/estado|moderacion|revision/.test(text)) return 'seguimiento';
  return 'fallback';
};

export const buildSuggestions = (intent) => {
  if (intent === 'reportes') {
    return ['Que evidencia puedo adjuntar?', 'Como edito un reporte?', 'Como veo mis reportes?'];
  }

  if (intent === 'alertas') {
    return ['Como activar alertas en mi zona?', 'Que significa riesgo critico?', 'Como se calcula el mapa?'];
  }

  if (intent === 'mis_reportes') {
    return ['Como reviso el estado?', 'Puedo editar un reporte?', 'Como agrego evidencias?'];
  }

  return [
    'Como crear un reporte ambiental?',
    'Como verifico mi correo?',
    'Que son las zonas de riesgo?',
  ];
};

export const buildCards = (contexto = {}) => (
  (contexto.alertasZona || []).slice(0, 3).map((alerta) => ({
    titulo: `${alerta.tipo_dominante || 'Zona'} - riesgo ${alerta.nivel}`,
    descripcion: `${alerta.n_reportes || 0} reporte(s), score ${alerta.score || 0}`,
    tipo: 'alerta',
    data: alerta,
  }))
);

export const buildOfflineResponse = ({ mensaje, contexto = {} }) => {
  const intent = detectIntent(mensaje);
  const stats = contexto.global || {};
  const usuario = contexto.usuario || null;
  const totalReportes = Number(stats.total_reportes) || 0;
  const municipios = Number(stats.municipios_activos) || 0;
  const reportesUsuario = usuario?.total_reportes ?? usuario?.reportes?.length ?? 0;

  const responses = {
    reportes: 'Para crear un reporte entra a Nuevo reporte, selecciona categoria y severidad, describe el problema, agrega ubicacion y adjunta evidencias si las tienes.',
    alertas: `Las zonas de riesgo se calculan con reportes recientes, severidad y concentracion geografica. Hay ${totalReportes} reportes registrados en ${municipios} municipio(s) activo(s).`,
    verificacion: 'Despues del registro enviamos un codigo de 6 digitos al correo. Puedes ingresarlo en la pantalla de verificacion o solicitar uno nuevo cuando termine el contador.',
    recuperacion: 'Para recuperar tu contrasena usa Olvidaste tu contrasena, escribe tu correo y abre el enlace recibido. El enlace expira por seguridad.',
    seguimiento: 'Puedes revisar el estado en Mis reportes. Los moderadores pueden cambiar un reporte entre pendiente, en revision, verificado, en proceso, resuelto o rechazado.',
    mis_reportes: usuario
      ? `Tienes ${reportesUsuario} reporte(s) registrados. Revisa Mis reportes para ver estado, evidencias y comentarios de moderacion.`
      : 'Para consultar tus reportes necesito que inicies sesion. Sin sesion puedo ayudarte con reportes, alertas y verificacion.',
    fallback: 'Puedo ayudarte con reportes ambientales, verificacion de correo, recuperacion de contrasena, alertas de riesgo y seguimiento de reportes.',
  };

  const cards = buildCards(contexto);

  return {
    respuesta: responses[intent] || responses.fallback,
    intent,
    fuente: 'offline',
    sugerencias: buildSuggestions(intent),
    cards,
    estadoAmbiental: cards.some((card) => ['critico', 'alto'].includes(card.data?.nivel))
      ? 'alerta'
      : 'optimo',
  };
};
