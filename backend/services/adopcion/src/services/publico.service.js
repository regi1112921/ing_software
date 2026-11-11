import { campos, conflicto, noEncontrado, validar, z } from '@huellas/shared'

// HU-09 · Catálogo público de perros en adopción (sin sesión).

// Rangos de edad del filtro, en meses (máximo incluido; null = sin límite).
export const RANGOS_EDAD = [
  { codigo: 'cachorro', nombre: 'Cachorro (menos de 1 año)', min: null, max: 11 },
  { codigo: 'joven', nombre: 'Joven (1 a 2 años)', min: 12, max: 35 },
  { codigo: 'adulto', nombre: 'Adulto (3 a 7 años)', min: 36, max: 95 },
  { codigo: 'senior', nombre: 'Senior (8 años o más)', min: 96, max: null },
]

const SEXOS = [
  { codigo: 'macho', nombre: 'Macho' },
  { codigo: 'hembra', nombre: 'Hembra' },
]

const vacioANull = (valor) => (valor === '' ? undefined : valor)

const esquemaFiltros = z.object({
  tamano: z.preprocess(vacioANull, z.string().trim().max(30).optional()),
  sexo: z.preprocess(vacioANull, z.enum(['macho', 'hembra'], { error: 'El sexo debe ser macho o hembra.' }).optional()),
  edad: z.preprocess(
    vacioANull,
    z.enum(RANGOS_EDAD.map((r) => r.codigo), { error: 'La edad debe ser cachorro, joven, adulto o senior.' }).optional(),
  ),
})

const telefono = z
  .string({ error: 'El teléfono es obligatorio.' })
  .transform((valor) => valor.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^\+?[0-9]{7,15}$/, 'El teléfono debe tener entre 7 y 15 dígitos (puede empezar con +).'))

const esquemaSolicitud = z.object({
  perro_id: campos.id('El perro'),
  nombre_completo: campos.texto('El nombre completo', 150),
  telefono,
  correo: z
    .string()
    .trim()
    .toLowerCase()
    .nullish()
    .transform((valor) => valor || null)
    .pipe(z.email('El correo no es válido.').nullable()),
  mensaje: campos.textoOpcional('El mensaje', 1000),
  // Campo trampa: invisible para las personas. Si llega con texto, lo envió un bot.
  sitio_web: z.string().optional(),
})

export function crearPublicoService({ perros, catalogos, solicitudesPublicas }) {
  return {
    // Opciones de los filtros del catálogo.
    async filtros() {
      const { tamanos } = await catalogos.listar()
      return {
        tamanos,
        sexos: SEXOS,
        edades: RANGOS_EDAD.map(({ codigo, nombre }) => ({ codigo, nombre })),
      }
    },

    // Solo perros disponibles, filtrados por tamaño, edad y sexo.
    async listar(consulta) {
      const { tamano, sexo, edad } = validar(esquemaFiltros, consulta)
      const rango = RANGOS_EDAD.find((r) => r.codigo === edad)
      return perros.listarPublicos({ tamano, sexo, edadMin: rango?.min, edadMax: rango?.max })
    },

    async obtener(idCrudo) {
      const id = validar(campos.id('El perro'), idCrudo)
      const perro = await perros.obtenerPublico(id)
      if (!perro) throw noEncontrado('Este perro no está disponible para adopción.')
      return perro
    },

    // Pre-solicitud: el responsable de adopciones la revisa y la convierte en una adopción.
    async enviarSolicitud(datos) {
      const { sitio_web: trampa, ...solicitud } = validar(esquemaSolicitud, datos)
      // A un bot se le responde como si todo fuera bien, pero no se guarda nada.
      if (trampa) return { id: null, perro_nombre: null }

      const perro = await perros.obtenerPublico(solicitud.perro_id)
      if (!perro) throw conflicto('Este perro ya no está disponible para adopción.')
      if (await solicitudesPublicas.existePendiente(solicitud.perro_id, solicitud.telefono)) {
        throw conflicto(`Ya recibimos tu solicitud para ${perro.nombre}. Te contactaremos pronto.`)
      }

      const { id } = await solicitudesPublicas.crear(solicitud)
      return { id, perro_nombre: perro.nombre }
    },
  }
}
