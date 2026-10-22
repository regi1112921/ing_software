import { campos, conflicto, hoy, noEncontrado, solicitudInvalida, validar, z } from '@huellas/shared'

// RF-05 / RF-06: a mano solo se elige entre estos dos estados.
const ESTADOS_MANUALES = ['disponible', 'en_tratamiento']
// RF-18 / RF-19 / RF-20: estos los asigna el proceso de adopción.
const ESTADOS_DE_ADOPCION = ['en_adopcion', 'adoptado']

const mensajeEstado = 'El estado solo puede ser disponible o en_tratamiento.'

const edadAproximada = z
  .object({
    anios: z.coerce.number().int().min(0, 'Los años no pueden ser negativos.').max(30, 'Los años no pueden superar 30.').default(0),
    meses: z.coerce.number().int().min(0, 'Los meses no pueden ser negativos.').max(11, 'Los meses deben estar entre 0 y 11.').default(0),
  })
  .refine((edad) => edad.anios + edad.meses > 0, 'La edad aproximada debe ser mayor que cero.')

const datosPerro = {
  nombre: campos.texto('El nombre', 80),
  raza_id: campos.id('La raza'),
  sexo: z.enum(['macho', 'hembra'], { error: 'El sexo debe ser macho o hembra.' }),
  tamano: campos.texto('El tamaño', 30),
  fecha_ingreso: campos.fecha('La fecha de ingreso'),
  fecha_nacimiento: campos.fecha('La fecha de nacimiento').nullish(),
  edad_aproximada: edadAproximada.nullish(),
  color: campos.textoOpcional('El color', 50),
  foto_url: campos
    .textoOpcional('La foto', 500)
    .refine((url) => url === null || /^https?:\/\//i.test(url), 'La foto debe ser una URL que empiece por http:// o https://.'),
}

function unaSolaFecha(datos, ctx) {
  if (datos.fecha_nacimiento && datos.edad_aproximada) {
    ctx.addIssue({
      code: 'custom',
      path: ['edad_aproximada'],
      message: 'Indica la fecha de nacimiento o la edad aproximada, no ambas.',
    })
  }
}

const esquemaCrear = z
  .object({ ...datosPerro, estado: z.enum(ESTADOS_MANUALES, { error: mensajeEstado }).default('disponible') })
  .superRefine(unaSolaFecha)

const esquemaActualizar = z
  .object({ ...datosPerro, estado: z.enum(ESTADOS_MANUALES, { error: mensajeEstado }).optional() })
  .superRefine(unaSolaFecha)

const esquemaFiltros = z.object({
  buscar: campos.textoOpcional('La búsqueda', 100),
  estado: campos.textoOpcional('El estado', 30),
})

// Fecha de nacimiento estimada a partir de una edad (al día de hoy).
function restarEdad(fechaBase, anios, meses) {
  const [anio, mes, dia] = fechaBase.split('-').map(Number)
  const totalMeses = anio * 12 + (mes - 1) - (anios * 12 + meses)
  const anioDestino = Math.floor(totalMeses / 12)
  const mesDestino = totalMeses % 12 // 0-11
  const ultimoDia = new Date(Date.UTC(anioDestino, mesDestino + 1, 0)).getUTCDate()
  const diaDestino = Math.min(dia, ultimoDia)
  return `${anioDestino}-${String(mesDestino + 1).padStart(2, '0')}-${String(diaDestino).padStart(2, '0')}`
}

// Convierte la entrada del formulario en las columnas de la tabla perros.
function aColumnas(datos) {
  let fechaNacimiento = datos.fecha_nacimiento ?? null
  let estimada = false
  if (datos.edad_aproximada) {
    fechaNacimiento = restarEdad(hoy(), datos.edad_aproximada.anios, datos.edad_aproximada.meses)
    estimada = true
  }
  if (fechaNacimiento && fechaNacimiento > datos.fecha_ingreso) {
    throw solicitudInvalida('Datos inválidos.', [{
      campo: estimada ? 'edad_aproximada' : 'fecha_nacimiento',
      mensaje: 'La fecha de nacimiento no puede ser posterior a la fecha de ingreso.',
    }])
  }
  return {
    nombre: datos.nombre,
    raza_id: datos.raza_id,
    sexo: datos.sexo,
    tamano: datos.tamano,
    color: datos.color,
    foto_url: datos.foto_url,
    fecha_ingreso: datos.fecha_ingreso,
    fecha_nacimiento: fechaNacimiento,
    fecha_nacimiento_estimada: estimada,
  }
}

export function crearPerrosService({ perros, adopciones, catalogos }) {
  async function exigirRazaActiva(razaId) {
    if (!(await catalogos.razaActiva(razaId))) {
      throw solicitudInvalida('Datos inválidos.', [{ campo: 'raza_id', mensaje: 'La raza seleccionada no existe o no está activa.' }])
    }
  }

  async function obtener(idCrudo) {
    const id = validar(campos.id('El perro'), idCrudo)
    const perro = await perros.obtener(id)
    if (!perro) throw noEncontrado('El perro no existe.')
    return { ...perro, adopcion_vigente: await adopciones.vigenteDePerro(id) }
  }

  return {
    // HU-06 · RF-07, RF-08, RF-09
    async listar(consulta) {
      const filtros = validar(esquemaFiltros, consulta)
      return perros.listar(filtros)
    },

    // HU-07 · RF-10
    obtener,

    // HU-04 · RF-05
    async crear(datos, usuario) {
      const perro = validar(esquemaCrear, datos)
      await exigirRazaActiva(perro.raza_id)
      const id = await perros.crear({ ...aColumnas(perro), estado: perro.estado }, usuario.id)
      return obtener(id)
    },

    // HU-05 · RF-06
    async actualizar(idCrudo, datos) {
      const id = validar(campos.id('El perro'), idCrudo)
      const cambios = validar(esquemaActualizar, datos)
      const actual = await perros.obtener(id)
      if (!actual) throw noEncontrado('El perro no existe.')

      if (cambios.raza_id !== actual.raza_id) await exigirRazaActiva(cambios.raza_id)

      let estado = null
      if (cambios.estado && cambios.estado !== actual.estado) {
        if (ESTADOS_DE_ADOPCION.includes(actual.estado)) {
          throw conflicto('El estado de este perro lo controla su proceso de adopción; no se puede cambiar manualmente.')
        }
        estado = cambios.estado
      }

      await perros.actualizar(id, { ...aColumnas(cambios), estado })
      return obtener(id)
    },
  }
}

export { restarEdad }
