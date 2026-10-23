// Errores HTTP y manejador de errores común.
// Formato de respuesta de error (lo espera el frontend): { error: string, detalles?: [{ campo, mensaje }] }

export class ErrorHttp extends Error {
  constructor(estado, mensaje, detalles) {
    super(mensaje)
    this.estado = estado
    this.detalles = detalles
  }
}

export const solicitudInvalida = (mensaje, detalles) => new ErrorHttp(400, mensaje, detalles)
export const noAutenticado = (mensaje = 'Debes iniciar sesión.') => new ErrorHttp(401, mensaje)
export const prohibido = (mensaje = 'No tienes permiso para acceder a esta sección.') => new ErrorHttp(403, mensaje)
export const noEncontrado = (mensaje) => new ErrorHttp(404, mensaje)
export const conflicto = (mensaje) => new ErrorHttp(409, mensaje)

// Mensajes para restricciones de la base de datos (database/schema).
const MENSAJES_RESTRICCION = {
  ck_perros_nacimiento_antes_ingreso: [400, 'La fecha de nacimiento no puede ser posterior a la fecha de ingreso.'],
  ck_perros_nacimiento_estimada: [400, 'Una fecha de nacimiento estimada necesita una fecha.'],
  ck_perros_foto_url: [400, 'La foto debe ser una URL que empiece por http:// o https://.'],
  ck_adoptantes_telefono: [400, 'El teléfono debe tener entre 7 y 15 dígitos.'],
  ck_solicitudes_orden_fechas: [400, 'La fecha no puede ser anterior a la de la etapa previa del proceso.'],
  ck_solicitudes_fechas_por_estado: [400, 'Las fechas no corresponden al estado de la adopción.'],
  perros_raza_id_fkey: [400, 'La raza seleccionada no existe.'],
  perros_tamano_fkey: [400, 'El tamaño seleccionado no existe.'],
  perros_estado_fkey: [400, 'El estado seleccionado no existe.'],
  consultas_perro_id_fkey: [400, 'El perro indicado no existe.'],
  consultas_veterinario_id_fkey: [400, 'El veterinario indicado no existe.'],
  solicitudes_adopcion_perro_id_fkey: [400, 'El perro indicado no existe.'],
  uq_solicitudes_activa_por_perro: [409, 'El perro ya tiene una adopción en curso.'],
  uq_solicitudes_finalizada_por_perro: [409, 'El perro ya fue adoptado.'],
  uq_adoptantes_documento: [409, 'Ya existe un adoptante con ese documento de identidad.'],
  uq_usuarios_correo: [409, 'Ya existe una cuenta con ese correo.'],
  ck_usuarios_correo: [400, 'El correo no es válido.'],
}

// Traduce errores de PostgreSQL (código SQLSTATE) a respuestas HTTP.
function desdePostgres(error) {
  const conocido = error.constraint && MENSAJES_RESTRICCION[error.constraint]
  if (conocido) return new ErrorHttp(conocido[0], conocido[1])

  switch (error.code) {
    case '23514': // check_violation: CHECK sin mensaje propio o regla de negocio de un trigger
      return error.constraint
        ? new ErrorHttp(400, 'Los datos no cumplen las reglas del sistema.')
        : new ErrorHttp(409, error.message) // los triggers ya escriben el mensaje en español
    case '23503':
      return new ErrorHttp(409, 'El registro está relacionado con otros datos o hace referencia a uno inexistente.')
    case '23505':
      return new ErrorHttp(409, 'Ya existe un registro con esos datos.')
    case '22P02':
    case '22007':
    case '22008':
    case '22003':
      return new ErrorHttp(400, 'Algún dato tiene un formato inválido.')
    default:
      return null
  }
}

// eslint-disable-next-line no-unused-vars
export function manejadorErrores(error, req, res, next) {
  let http = error instanceof ErrorHttp ? error : null

  if (!http && error.type === 'entity.parse.failed') {
    http = new ErrorHttp(400, 'El cuerpo de la petición no es un JSON válido.')
  }
  if (!http && typeof error.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code)) {
    http = desdePostgres(error)
  }
  if (!http) {
    console.error(`[${req.method} ${req.originalUrl}]`, error)
    http = new ErrorHttp(500, 'Error interno del servidor.')
  }

  const cuerpo = { error: http.message }
  if (http.detalles) cuerpo.detalles = http.detalles
  res.status(http.estado).json(cuerpo)
}
