// HU-13 · Mensajes para avisar al adoptante y enlace de WhatsApp.

export const NOMBRE_ALBERGUE = 'Huellas'

// Código de país que se antepone cuando el teléfono no lo trae (Bolivia).
export const CODIGO_PAIS = '591'

// Estado de la solicitud → tipo de aviso que le corresponde.
export const TIPO_AVISO = { aprobada: 'aprobacion', rechazada: 'rechazo' }

// Teléfono en formato internacional sin "+" (el que pide wa.me).
//   "+591 70012345" → "59170012345"   ·   "70012345" → "59170012345"
//   "0059170012345" → "59170012345"   ·   "59170012345" → "59170012345"
// Un número local boliviano tiene 7 u 8 dígitos: si ya empieza con 591 y es más
// largo que eso, se entiende que ya trae el código de país.
export function telefonoWhatsapp(telefono) {
  const limpio = String(telefono).replace(/[\s()-]/g, '')
  const digitos = limpio.replace(/\D/g, '')
  if (limpio.startsWith('+')) return digitos
  if (digitos.startsWith('00')) return digitos.slice(2)
  if (digitos.startsWith(CODIGO_PAIS) && digitos.length > 8) return digitos
  return CODIGO_PAIS + digitos
}

export const enlaceWhatsapp = (telefono, mensaje) => `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`

function mensajeAprobacion({ adoptante, perro }) {
  return [
    `Hola, ${adoptante.nombre_completo}. Le escribimos del albergue ${NOMBRE_ALBERGUE}: ¡su solicitud para adoptar a ${perro.nombre} fue aprobada!`,
    '',
    'Siguientes pasos:',
    '1. Nos comunicaremos con usted para acordar el día y la hora de la entrega.',
    '2. Ese día traiga su documento de identidad original.',
    `3. Prepare en casa un espacio seguro, agua, comida y una correa para ${perro.nombre}.`,
    '4. Después de la entrega haremos visitas o llamadas de seguimiento para ver cómo se adapta.',
    '',
    'Si tiene alguna pregunta, responda a este mensaje.',
  ].join('\n')
}

function mensajeRechazo({ adoptante, perro, motivo_rechazo }) {
  return [
    `Hola, ${adoptante.nombre_completo}. Le escribimos del albergue ${NOMBRE_ALBERGUE} sobre su solicitud para adoptar a ${perro.nombre}.`,
    '',
    'Lamentamos informarle que esta vez no pudimos aprobarla.',
    // Las solicitudes rechazadas antes de HU-13 no tienen motivo registrado.
    ...(motivo_rechazo ? [`Motivo: ${motivo_rechazo}`] : []),
    '',
    'Gracias por querer darle un hogar a uno de nuestros perros; puede volver a postular cuando quiera.',
  ].join('\n')
}

// Aviso que corresponde al estado actual de la adopción, o null si no hay aviso
// (en proceso o finalizada).
export function generarAviso(adopcion) {
  const tipo = TIPO_AVISO[adopcion.estado]
  if (!tipo) return null
  const mensaje = tipo === 'aprobacion' ? mensajeAprobacion(adopcion) : mensajeRechazo(adopcion)
  const telefono = telefonoWhatsapp(adopcion.adoptante.telefono)
  return { tipo, telefono, mensaje, enlace_whatsapp: enlaceWhatsapp(telefono, mensaje) }
}
