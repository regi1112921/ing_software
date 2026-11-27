import { campos, hoy, validar, z } from '@huellas/shared'

export const TIPOS_DONACION = ['dinero', 'alimento', 'insumos', 'otro']

const numeroPositivoOpcional = (nombre) =>
  z.preprocess(
    (valor) => (valor === '' || valor === null || valor === undefined ? undefined : valor),
    z.coerce.number({ error: `${nombre} es obligatorio.` }).positive(`${nombre} debe ser mayor que cero.`).optional(),
  )

const esquemaCrear = z
  .object({
    fecha: campos.fecha('La fecha').default(() => hoy()),
    donante: campos.texto('El donante', 150),
    contacto: campos.textoOpcional('El contacto', 150),
    tipo: z.enum(TIPOS_DONACION, { error: 'El tipo debe ser dinero, alimento, insumos u otro.' }),
    monto_bs: numeroPositivoOpcional('El monto en Bs'),
    cantidad: numeroPositivoOpcional('La cantidad'),
    descripcion: campos.textoOpcional('La descripción', 500),
  })
  .superRefine((datos, ctx) => {
    if (datos.tipo === 'dinero') {
      if (datos.monto_bs === undefined) {
        ctx.addIssue({ code: 'custom', path: ['monto_bs'], message: 'El monto en Bs es obligatorio para una donación de dinero.' })
      }
      if (datos.cantidad !== undefined) {
        ctx.addIssue({ code: 'custom', path: ['cantidad'], message: 'No registres cantidad para una donación de dinero.' })
      }
    } else {
      if (datos.cantidad === undefined) {
        ctx.addIssue({ code: 'custom', path: ['cantidad'], message: 'La cantidad es obligatoria para este tipo de donación.' })
      }
      if (!datos.descripcion) {
        ctx.addIssue({ code: 'custom', path: ['descripcion'], message: 'La descripción es obligatoria para alimentos, insumos u otros.' })
      }
      if (datos.monto_bs !== undefined) {
        ctx.addIssue({ code: 'custom', path: ['monto_bs'], message: 'El monto en Bs solo se registra para donaciones de dinero.' })
      }
    }
  })

export function crearDonacionesService({ donaciones }) {
  return {
    listar() {
      return donaciones.listar()
    },

    async crear(datos, usuario) {
      const donacion = validar(esquemaCrear, datos)
      const id = await donaciones.crear(donacion, usuario.id)
      return donaciones.obtener(id)
    },
  }
}