/**
 * VALIDACIÓN Y ESTRUCTURA DE REPORTES POR CATEGORÍA
 * 
 * Referencias para validar datos en cliente/servidor
 * Utiliza esta información para implementar validaciones específicas
 */

// =====================================================
// ENUMERACIONES Y VALORES VÁLIDOS
// =====================================================

export const TIPOS_CONTAMINACION = {
  AGUA: 'agua',
  AIRE: 'aire',
  SUELO: 'suelo',
  RUIDO: 'ruido',
  RESIDUOS: 'residuos',
  DEFORESTACION: 'deforestacion',
  INCENDIOS_FORESTALES: 'incendios_forestales',
  AVALANCHAS_FLUVIOTORRENCIALES: 'avalanchas_fluviotorrenciales',
  OTRO: 'otro'
};

export const NIVELES_SEVERIDAD = {
  BAJO: 'bajo',
  MEDIO: 'medio',
  ALTO: 'alto',
  CRITICO: 'critico'
};

export const ESTADOS_REPORTE = {
  PENDIENTE: 'pendiente',
  EN_REVISION: 'en_revision',
  VERIFICADO: 'verificado',
  EN_PROCESO: 'en_proceso',
  RESUELTO: 'resuelto',
  RECHAZADO: 'rechazado'
};

// =====================================================
// CONFIGURACIÓN POR CATEGORÍA
// =====================================================

export const CONFIGURACION_CATEGORIAS = {
  // Nuevas categorías de riesgo
  [TIPOS_CONTAMINACION.DEFORESTACION]: {
    nombre: 'Deforestación',
    descripcion: 'Tala o pérdida de cobertura forestal',
    icono: 'trees',
    color: '#22C55E',
    severidadPorDefecto: NIVELES_SEVERIDAD.ALTO,
    severidadesPermitidas: [
      NIVELES_SEVERIDAD.BAJO,
      NIVELES_SEVERIDAD.MEDIO,
      NIVELES_SEVERIDAD.ALTO
    ],
    camposRequeridos: [
      'titulo',
      'descripcion',
      'direccion',
      'municipio',
      'latitud',
      'longitud'
    ],
    sugerencias: [
      'Indicar extensión aproximada del área afectada',
      'Describir el tipo de tala (selectiva, masiva, etc)',
      'Mencionar si hay actividad de extracción',
      'Especificar tipo de vegetación perdida'
    ],
    ejemploTitulo: 'Tala masiva de árboles en sector...',
    ejemploDescripcion: 'Se observa pérdida de cobertura forestal de aproximadamente X hectáreas. Se evidencia actividad de extracción de madera...'
  },

  [TIPOS_CONTAMINACION.INCENDIOS_FORESTALES]: {
    nombre: 'Incendios Forestales',
    descripcion: 'Fuegos descontrolados en bosques o vegetación',
    icono: 'flame',
    color: '#DC2626',
    severidadPorDefecto: NIVELES_SEVERIDAD.CRITICO,
    severidadesPermitidas: [
      NIVELES_SEVERIDAD.ALTO,
      NIVELES_SEVERIDAD.CRITICO
    ],
    camposRequeridos: [
      'titulo',
      'descripcion',
      'direccion',
      'municipio',
      'latitud',
      'longitud'
    ],
    sugerencias: [
      'Indicar URGENCIA: activo, controlado, extinguido',
      'Describir dirección de propagación del fuego',
      'Mencionar riesgo a poblaciones o infraestructura',
      'Incluir si se observa humo desde lejos'
    ],
    ejemploTitulo: 'Incendio forestal activo en zona de amortiguación',
    ejemploDescripcion: 'Columna de humo visible desde varios puntos. Fuego se propaga hacia el norte. Riesgo para viviendas a 500 metros...'
  },

  [TIPOS_CONTAMINACION.AVALANCHAS_FLUVIOTORRENCIALES]: {
    nombre: 'Avalanchas Fluviotorrenciales',
    descripcion: 'Crecidas súbitas de ríos, quebradas o arroyos',
    icono: 'waves',
    color: '#0EA5E9',
    severidadPorDefecto: NIVELES_SEVERIDAD.CRITICO,
    severidadesPermitidas: [
      NIVELES_SEVERIDAD.ALTO,
      NIVELES_SEVERIDAD.CRITICO
    ],
    camposRequeridos: [
      'titulo',
      'descripcion',
      'direccion',
      'municipio',
      'latitud',
      'longitud'
    ],
    sugerencias: [
      'Indicar nivel de aumento del agua',
      'Describir velocidad de la corriente',
      'Mencionar si hay arrastre de escombros/árboles',
      'Indicar zonas en inundación o en riesgo'
    ],
    ejemploTitulo: 'Crecida súbita del río Mocoa',
    ejemploDescripcion: 'Río con crecida de 3 metros en menos de 1 hora. Arrastra troncos y material pesado. Alerta roja en zonas ribereñas...'
  },

  // Categorías existentes (para referencia)
  [TIPOS_CONTAMINACION.AGUA]: {
    nombre: 'Contaminación de Agua',
    descripcion: 'Contaminación del recurso hídrico',
    icono: 'droplet',
    color: '#3B82F6',
    severidadPorDefecto: NIVELES_SEVERIDAD.ALTO,
    severidadesPermitidas: Object.values(NIVELES_SEVERIDAD)
  },

  [TIPOS_CONTAMINACION.AIRE]: {
    nombre: 'Contaminación del Aire',
    descripcion: 'Presencia de contaminantes atmosféricos',
    icono: 'wind',
    color: '#6B7280',
    severidadPorDefecto: NIVELES_SEVERIDAD.MEDIO,
    severidadesPermitidas: Object.values(NIVELES_SEVERIDAD)
  },

  [TIPOS_CONTAMINACION.SUELO]: {
    nombre: 'Contaminación del Suelo',
    descripcion: 'Degradación o contaminación del suelo',
    icono: 'leaf',
    color: '#84CC16',
    severidadPorDefecto: NIVELES_SEVERIDAD.MEDIO,
    severidadesPermitidas: Object.values(NIVELES_SEVERIDAD)
  },

  [TIPOS_CONTAMINACION.RUIDO]: {
    nombre: 'Contaminación Sonora',
    descripcion: 'Exceso de ruido ambiental',
    icono: 'volume2',
    color: '#F59E0B',
    severidadPorDefecto: NIVELES_SEVERIDAD.BAJO,
    severidadesPermitidas: Object.values(NIVELES_SEVERIDAD)
  },

  [TIPOS_CONTAMINACION.RESIDUOS]: {
    nombre: 'Mala Disposición de Residuos',
    descripcion: 'Acumulación o disposición incorrecta de basura',
    icono: 'trash2',
    color: '#EF4444',
    severidadPorDefecto: NIVELES_SEVERIDAD.MEDIO,
    severidadesPermitidas: Object.values(NIVELES_SEVERIDAD)
  },

  [TIPOS_CONTAMINACION.OTRO]: {
    nombre: 'Otros Riesgos Ambientales',
    descripcion: 'Otros tipos de riesgo ambiental',
    icono: 'helpCircle',
    color: '#8B5CF6',
    severidadPorDefecto: NIVELES_SEVERIDAD.MEDIO,
    severidadesPermitidas: Object.values(NIVELES_SEVERIDAD)
  }
};

// =====================================================
// VALIDADORES JavaScript
// =====================================================

/**
 * Valida el nombre de usuario para operaciones de perfil.
 * Reglas:
 * - Debe ser string no vacio (null, undefined y solo espacios -> false)
 * - Debe tener entre 2 y 50 caracteres (sin contar espacios al inicio/fin)
 * - Rechaza caracteres peligrosos como < > ; ` " \ / { } [ ]
 *
 * @param {string} nombre
 * @returns {boolean}
 */
export const validarNombreUsuario = (nombre) => {
  if (typeof nombre !== 'string') return false;

  const valor = nombre.trim();
  if (!valor) return false;
  if (valor.length < 2 || valor.length > 50) return false;

  const caracteresPeligrosos = /[<>;`"\\/{}\[\]]/;
  if (caracteresPeligrosos.test(valor)) return false;

  return true;
};

/**
 * Valida telefono para perfil (campo opcional).
 * Reglas:
 * - null, undefined, cadena vacia o solo espacios -> true
 * - Si trae valor, debe ser telefono valido (7 a 15 digitos, permite prefijo +)
 * - Se aceptan separadores comunes: espacio, guion y parentesis
 *
 * @param {string|null|undefined} telefono
 * @returns {boolean}
 */
export const validarTelefono = (telefono) => {
  if (telefono === null || telefono === undefined) return true;
  if (typeof telefono !== 'string') return false;

  const valor = telefono.trim();
  if (!valor) return true;

  const normalizado = valor.replace(/[\s()-]/g, '');
  return /^\+?[0-9]{7,15}$/.test(normalizado);
};

/**
 * Valida password para cambio de clave.
 * Reglas:
 * - Debe ser string no vacio (null, undefined y solo espacios -> false)
 * - Minimo 8 caracteres
 * - Al menos una letra y un numero
 *
 * @param {string} password
 * @returns {boolean}
 */
export const validarPassword = (password) => {
  if (typeof password !== 'string') return false;

  const valor = password.trim();
  if (!valor) return false;
  if (valor.length < 8) return false;

  const tieneLetra = /[A-Za-z]/.test(valor);
  const tieneNumero = /[0-9]/.test(valor);

  return tieneLetra && tieneNumero;
};

export const validadores = {
  /**
   * Valida que el tipo de contaminación sea válido
   */
  estiposContaminacionValido: (valor) => {
    return Object.values(TIPOS_CONTAMINACION).includes(valor);
  },

  /**
   * Valida que el nivel de severidad sea válido
   */
  esNivelSeveridadValido: (valor) => {
    return Object.values(NIVELES_SEVERIDAD).includes(valor);
  },

  /**
   * Valida que el nivel de severidad sea permitido para la categoría
   */
  esSeveridadPermitidaParaCategoria: (categoria, severidad) => {
    const config = CONFIGURACION_CATEGORIAS[categoria];
    if (!config) return false;
    return config.severidadesPermitidas.includes(severidad);
  },

  /**
   * Valida coordenadas geográficas
   */
  sonCoordenadasValidas: (latitud, longitud) => {
    const lat = parseFloat(latitud);
    const lng = parseFloat(longitud);
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  },

  /**
   * Valida que todos los campos requeridos estén presentes
   */
  estanCamposRequeridos: (categoria, datos) => {
    const config = CONFIGURACION_CATEGORIAS[categoria];
    if (!config) return false;
    return config.camposRequeridos.every(campo => datos[campo]?.trim?.());
  },

  /**
   * Valida un reporte completo
   */
  esReporteValido: (reporte) => {
    const errores = [];

    // Validar tipo
    if (!validadores.estiposContaminacionValido(reporte.tipo_contaminacion)) {
      errores.push('Tipo de contaminación no válido');
    }

    // Validar severidad
    if (!validadores.esNivelSeveridadValido(reporte.nivel_severidad)) {
      errores.push('Nivel de severidad no válido');
    }

    // Validar severidad permitida para la categoría
    if (!validadores.esSeveridadPermitidaParaCategoria(
      reporte.tipo_contaminacion,
      reporte.nivel_severidad
    )) {
      const config = CONFIGURACION_CATEGORIAS[reporte.tipo_contaminacion];
      errores.push(
        `Severidad no permitida. Permitidas para "${config.nombre}": ${config.severidadesPermitidas.join(', ')}`
      );
    }

    // Validar coordenadas
    if (!validadores.sonCoordenadasValidas(reporte.latitud, reporte.longitud)) {
      errores.push('Coordenadas inválidas');
    }

    // Validar campos requeridos
    if (!validadores.estanCamposRequeridos(reporte.tipo_contaminacion, reporte)) {
      const config = CONFIGURACION_CATEGORIAS[reporte.tipo_contaminacion];
      errores.push(
        `Campos requeridos faltantes: ${config.camposRequeridos.join(', ')}`
      );
    }

    // Validar longitud de título
    if (!reporte.titulo || reporte.titulo.length < 5) {
      errores.push('El título debe tener al menos 5 caracteres');
    }

    // Otros validadores
    if (reporte.titulo.length > 255) {
      errores.push('El título no puede exceder 255 caracteres');
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }
};

// =====================================================
// MÉTODOS HELPER PARA FRONTEND
// =====================================================
