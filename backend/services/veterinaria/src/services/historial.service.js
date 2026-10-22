import { campos, hoy, noEncontrado, solicitudInvalida, validar, z } from '@huellas/shared'

const esquemaConsulta = z.object({
  perro_id: campos.id('El perro'),
  veterinario_id: campos.id('El veterinario responsable'),
  fecha: campos.fecha('La fecha de atención').default(() => hoy()),
  motivo: campos.texto('El motivo de consulta', 200),
  diagnostico: campos.texto('El diagnóstico', 2000),
  tratamiento: campos.texto('El tratamiento', 2000),
  observaciones: campos.textoOpcional('Las observaciones', 2000),
})

export function crearHistorialService({ consultas, lecturas }) {
  return {
    // Lista para elegir el veterinario responsable (HU-09 · RF-12).
    listarVeterinarios() {
      return lecturas.veterinariosActivos()
    },

    // HU-08 · RF-11: de la atención más reciente a la más antigua.
    async historialDePerro(idCrudo) {
      const perroId = validar(campos.id('El perro'), idCrudo)
      if (!(await lecturas.existePerro(perroId))) throw noEncontrado('El perro no existe.')
      const atenciones = await consultas.listarPorPerro(perroId)
      return { perro_id: perroId, total: atenciones.length, consultas: atenciones }
    },

    // HU-09 · RF-12
    async registrarConsulta(datos) {
      const consulta = validar(esquemaConsulta, datos)
      const errores = []
      if (!(await lecturas.existePerro(consulta.perro_id))) {
        errores.push({ campo: 'perro_id', mensaje: 'El perro indicado no existe.' })
      }
      if (!(await lecturas.esVeterinarioActivo(consulta.veterinario_id))) {
        errores.push({ campo: 'veterinario_id', mensaje: 'El responsable debe ser un usuario activo con rol veterinario.' })
      }
      if (errores.length) throw solicitudInvalida('Datos inválidos.', errores)

      const id = await consultas.crear(consulta)
      return consultas.obtener(id)
    },
  }
}
