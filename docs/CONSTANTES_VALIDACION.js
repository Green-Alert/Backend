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
  LUMINICA: 'luminica',
  DEFORESTACION: 'deforestacion',
  INCENDIOS_FORESTALES: 'incendios_forestales',
  DESLIZAMIENTOS: 'deslizamientos',
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

  [TIPOS_CONTAMINACION.DESLIZAMIENTOS]: {
    nombre: 'Deslizamientos',
    descripcion: 'Movimientos en masa del terreno',
    icono: 'alertTriangle',
    color: '#F97316',
    severidadPorDefecto: NIVELES_SEVERIDAD.ALTO,
    severidadesPermitidas: [
      NIVELES_SEVERIDAD.MEDIO,
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
      'Indicar si la vía está bloqueada',
      'Estimar volumen de material desplazado',
      'Mencionar si continúa o está estabilizado',
      'Incluir riesgo para viviendas/infraestructura'
    ],
    ejemploTitulo: 'Deslizamiento en vía principal',
    ejemploDescripcion: 'Deslizamiento que obstruye completamente la vía. Aproximadamente 200 m³ de tierra. Continúa en movimiento lentamente...'
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

  [TIPOS_CONTAMINACION.LUMINICA]: {
    nombre: 'Contaminación Luminosa',
    descripcion: 'Exceso de iluminación artificial',
    icono: 'lightbulb',
    color: '#FBBF24',
    severidadPorDefecto: NIVELES_SEVERIDAD.BAJO,
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

export const helpers = {
  /**
   * Obtiene la configuración de una categoría
   */
  obtenerConfig: (tipoCont) => CONFIGURACION_CATEGORIAS[tipoCont],

  /**
   * Retorna todas las categorías nuevas
   */
  obtenerCategoriasNuevas: () => [
    TIPOS_CONTAMINACION.DEFORESTACION,
    TIPOS_CONTAMINACION.INCENDIOS_FORESTALES,
    TIPOS_CONTAMINACION.DESLIZAMIENTOS,
    TIPOS_CONTAMINACION.AVALANCHAS_FLUVIOTORRENCIALES
  ],

  /**
   * Retorna severidades permitidas para una categoría
   */
  obtenerSeveridadesPermitidas: (tipoContaminacion) => {
    const config = CONFIGURACION_CATEGORIAS[tipoContaminacion];
    return config?.severidadesPermitidas || [];
  },

  /**
   * Retorna color HTML para una categoría
   */
  obtenerColor: (tipoContaminacion) => {
    return CONFIGURACION_CATEGORIAS[tipoContaminacion]?.color || '#808080';
  },

  /**
   * Retorna icono para una categoría
   */
  obtenerIcono: (tipoContaminacion) => {
    return CONFIGURACION_CATEGORIAS[tipoContaminacion]?.icono || 'helpCircle';
  },

  /**
   * Retorna nombre amigable de una categoría
   */
  obtenerNombre: (tipoContaminacion) => {
    return CONFIGURACION_CATEGORIAS[tipoContaminacion]?.nombre || 'Desconocido';
  },

  /**
   * Retorna sugerencias para una categoría
   */
  obtenerSugerencias: (tipoContaminacion) => {
    return CONFIGURACION_CATEGORIAS[tipoContaminacion]?.sugerencias || [];
  }
};

// =====================================================
// EJEMPLO DE USO EN REACT
// =====================================================
//
// Ver archivo: frontend/src/components/FormularioReporte.example.jsx
//
// Este archivo contiene un componente React funcional y listo para usar
// que demuestra cómo integrar las constantes, validadores y helpers.
//
// Características:
// - Selección dinámica de categorías
// - Validación en tiempo real
// - Sugerencias contextuales
// - Colores e iconos por categoría
// - Integración con API de reportes
// - Manejo de errores y mensajes de éxito
