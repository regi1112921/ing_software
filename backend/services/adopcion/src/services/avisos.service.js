import { campos, conflicto, noEncontrado, validar, z } from '@huellas/shared'
import { enlaceWhatsapp, generarAviso } from '../utils/avisos.js'

// HU-13 · Aviso al adoptante sobre su solicitud (aprobación o rechazo).

const esquemaAviso = z.object({
  // Opcional: el responsable puede ajustar el texto antes de enviarlo; si no, va el generado.
  mensaje: campos.textoOpcional('El mensaje', 2000),
})

const conEnlace = (aviso) => ({ ...aviso, enlace_whatsapp: enlaceWhatsapp(aviso.telefono, aviso.mensaje) })

export function crearAvisosService({ adopciones, avisos }) {
  async function adopcionExistente(idCrudo) {
    const id = validar(campos.id('La adopción'), idCrudo)
    const adopcion = await adopciones.obtener(id)
    if (!adopcion) throw noEncontrado('La adopción no existe.')
    return adopcion
  }

  function avisoDe(adopcion) {
    const aviso = generarAviso(adopcion)
    if (!aviso) throw conflicto('Solo se avisa al adoptante cuando su solicitud está aprobada o rechazada.')
    return aviso
  }

  return {
    // Mensaje listo para enviar según el estado actual (no registra nada).
    async borrador(adopcionId) {
      return avisoDe(await adopcionExistente(adopcionId))
    },

    async listar(adopcionId) {
      const adopcion = await adopcionExistente(adopcionId)
      return (await avisos.listarDeAdopcion(adopcion.id)).map(conEnlace)
    },

    // Registra quién envía el aviso, cuándo y el texto, y devuelve el enlace de WhatsApp.
    // La BD vuelve a comprobar que el tipo corresponda al estado (fn_validar_notificacion).
    async registrar(adopcionId, datos, usuario) {
      const adopcion = await adopcionExistente(adopcionId)
      const { mensaje } = validar(esquemaAviso, datos)
      const aviso = avisoDe(adopcion)
      const registrado = await avisos.crear(
        { solicitud_id: adopcion.id, tipo: aviso.tipo, telefono: aviso.telefono, mensaje: mensaje ?? aviso.mensaje },
        usuario.id,
      )
      return conEnlace(registrado)
    },
  }
}
