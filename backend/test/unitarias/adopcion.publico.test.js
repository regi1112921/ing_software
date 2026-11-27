// Pruebas unitarias · Servicio de Adopción · catálogo público (HU-09), seguimientos (HU-10),
// historias de adopción (HU-14) y subida de fotos.
import { after, before, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { RANGOS_EDAD, crearPublicoService } from '../../services/adopcion/src/services/publico.service.js'
import { DIAS_SIN_SEGUIMIENTO, crearSeguimientosService } from '../../services/adopcion/src/services/seguimientos.service.js'
import { crearHistoriasService } from '../../services/adopcion/src/services/historias.service.js'
import { TAMANO_MAXIMO_FOTO, crearFotosService } from '../../services/adopcion/src/services/fotos.service.js'
import { HOY, argumentos, congelarFecha, devuelve, liberarFecha, rechazaCon } from './utilidades/dobles.js'

const usuario = { id: 1 }

describe('Catálogo público · servicio (HU-09)', () => {
  function armar({ perro = { id: 5, nombre: 'Firulais' }, pendiente = false } = {}) {
    const perros = { listarPublicos: devuelve([perro]), obtenerPublico: devuelve(perro) }
    const catalogos = { listar: devuelve({ tamanos: [{ codigo: 'mediano' }], razas: [] }) }
    const solicitudesPublicas = { existePendiente: devuelve(pendiente), crear: devuelve({ id: 40 }) }
    const historias = { listarPublicas: devuelve([{ id: 1 }]) }
    const servicio = crearPublicoService({ perros, catalogos, solicitudesPublicas, historias })
    return { perros, solicitudesPublicas, servicio }
  }

  it('filtros devuelve tamaños, sexos y rangos de edad sin los límites internos', async () => {
    const filtros = await armar().servicio.filtros()
    assert.deepEqual(filtros.tamanos, [{ codigo: 'mediano' }])
    assert.deepEqual(filtros.sexos.map((s) => s.codigo), ['macho', 'hembra'])
    assert.deepEqual(filtros.edades.map((e) => e.codigo), ['cachorro', 'joven', 'adulto', 'senior'])
    assert.equal('min' in filtros.edades[0], false)
  })

  it('los rangos de edad no se superponen y cubren todas las edades', () => {
    for (let i = 1; i < RANGOS_EDAD.length; i++) assert.equal(RANGOS_EDAD[i].min, RANGOS_EDAD[i - 1].max + 1)
    assert.equal(RANGOS_EDAD[0].min, null)
    assert.equal(RANGOS_EDAD.at(-1).max, null)
  })

  it('listar traduce el rango de edad a meses', async () => {
    const { servicio, perros } = armar()
    await servicio.listar({ edad: 'joven', sexo: 'macho', tamano: '' })
    assert.deepEqual(argumentos(perros.listarPublicos), [{ tamano: undefined, sexo: 'macho', edadMin: 12, edadMax: 35 }])
    await servicio.listar({})
    assert.deepEqual(argumentos(perros.listarPublicos, 1), [{ tamano: undefined, sexo: undefined, edadMin: undefined, edadMax: undefined }])
  })

  it('listar rechaza sexo o edad desconocidos', async () => {
    await rechazaCon(armar().servicio.listar({ sexo: 'x', edad: 'anciano' }), 400, { campos: ['sexo', 'edad'] })
  })

  it('obtener un perro no disponible → 404', async () => {
    assert.equal((await armar().servicio.obtener('5')).nombre, 'Firulais')
    await rechazaCon(armar({ perro: null }).servicio.obtener(5), 404, { mensaje: /no está disponible/ })
  })

  it('historias delega en las historias visibles (HU-14)', async () => {
    assert.deepEqual(await armar().servicio.historias(), [{ id: 1 }])
  })

  describe('enviarSolicitud', () => {
    const datos = (cambios = {}) => ({
      perro_id: 5,
      nombre_completo: 'Luis Rojas',
      telefono: '+591 700-12345',
      correo: ' Luis@Correo.com ',
      ...cambios,
    })

    it('guarda la pre-solicitud con los datos normalizados', async () => {
      const { servicio, solicitudesPublicas } = armar()
      const resultado = await servicio.enviarSolicitud(datos())
      assert.deepEqual(resultado, { id: 40, perro_nombre: 'Firulais' })
      assert.deepEqual(argumentos(solicitudesPublicas.crear), [
        { perro_id: 5, nombre_completo: 'Luis Rojas', telefono: '+59170012345', correo: 'luis@correo.com', mensaje: null },
      ])
    })

    it('el correo es opcional pero, si viene, debe ser válido', async () => {
      const { servicio, solicitudesPublicas } = armar()
      await servicio.enviarSolicitud(datos({ correo: '' }))
      assert.equal(argumentos(solicitudesPublicas.crear)[0].correo, null)
      await rechazaCon(servicio.enviarSolicitud(datos({ correo: 'no-es-correo' })), 400, { campos: ['correo'] })
    })

    it('a un bot (campo trampa lleno) le responde bien pero no guarda nada', async () => {
      const { servicio, perros, solicitudesPublicas } = armar()
      assert.deepEqual(await servicio.enviarSolicitud(datos({ sitio_web: 'http://spam' })), { id: null, perro_nombre: null })
      assert.equal(perros.obtenerPublico.mock.callCount(), 0)
      assert.equal(solicitudesPublicas.crear.mock.callCount(), 0)
    })

    it('rechaza si el perro ya no está disponible o si ya hay una solicitud pendiente', async () => {
      await rechazaCon(armar({ perro: null }).servicio.enviarSolicitud(datos()), 409, { mensaje: /ya no está disponible/ })
      await rechazaCon(armar({ pendiente: true }).servicio.enviarSolicitud(datos()), 409, {
        mensaje: /Ya recibimos tu solicitud para Firulais/,
      })
    })

    it('valida nombre y teléfono', async () => {
      await rechazaCon(armar().servicio.enviarSolicitud({ perro_id: 5, telefono: '123' }), 400, {
        campos: ['nombre_completo', 'telefono'],
      })
    })
  })
})

describe('Seguimientos post-adopción · servicio (HU-10)', () => {
  before(() => congelarFecha())
  after(() => liberarFecha())

  const finalizada = { id: 50, estado: 'finalizada', fecha_adopcion: '2026-10-01' }
  function armar(adopcion = finalizada, marcado = { id: 3, con_problemas: true }) {
    const adopciones = { obtener: devuelve(adopcion) }
    const seguimientos = {
      listarDeAdopcion: devuelve([{ id: 3 }]),
      crear: mock.fn(async (datos) => ({ id: 3, ...datos })),
      marcarProblemas: devuelve(marcado),
      sinSeguimiento: devuelve([{ id: 50 }, { id: 51 }]),
      conProblemas: devuelve([{ id: 3 }]),
    }
    return { seguimientos, servicio: crearSeguimientosService({ adopciones, seguimientos }) }
  }

  it('listar los seguimientos de una adopción existente', async () => {
    assert.equal((await armar().servicio.listar(50)).length, 1)
    await rechazaCon(armar(null).servicio.listar(50), 404)
  })

  it('registra con fecha de hoy y sin problemas por defecto', async () => {
    const { servicio, seguimientos } = armar()
    await servicio.registrar(50, { tipo: 'visita', observaciones: 'Se adapta bien' }, usuario)
    assert.deepEqual(argumentos(seguimientos.crear), [
      { fecha: HOY, tipo: 'visita', observaciones: 'Se adapta bien', con_problemas: false, solicitud_id: 50 },
      1,
    ])
  })

  it('solo en adopciones finalizadas', async () => {
    await rechazaCon(armar({ ...finalizada, estado: 'aprobada' }).servicio.registrar(50, { tipo: 'llamada', observaciones: 'x' }, usuario), 409)
  })

  it('la fecha va entre la entrega y hoy', async () => {
    const { servicio } = armar()
    await rechazaCon(servicio.registrar(50, { tipo: 'llamada', observaciones: 'x', fecha: '2026-09-30' }, usuario), 400, {
      mensaje: /Datos inválidos/,
      campos: ['fecha'],
    })
    await rechazaCon(servicio.registrar(50, { tipo: 'llamada', observaciones: 'x', fecha: '2026-11-16' }, usuario), 400, {
      campos: ['fecha'],
    })
  })

  it('valida tipo y observaciones', async () => {
    await rechazaCon(armar().servicio.registrar(50, { tipo: 'correo' }, usuario), 400, { campos: ['tipo', 'observaciones'] })
  })

  it('marca o desmarca un seguimiento con problemas', async () => {
    const { servicio, seguimientos } = armar()
    await servicio.marcarProblemas(50, '3', { con_problemas: true })
    assert.deepEqual(argumentos(seguimientos.marcarProblemas), [50, 3, true])
    await rechazaCon(servicio.marcarProblemas(50, 3, { con_problemas: 'si' }), 400)
    await rechazaCon(armar(finalizada, null).servicio.marcarProblemas(50, 3, { con_problemas: false }), 404)
  })

  it('lista adopciones sin seguimiento: 30 días por defecto, entre 1 y 365', async () => {
    const { servicio, seguimientos } = armar()
    assert.deepEqual(await servicio.sinSeguimiento({}), { dias: DIAS_SIN_SEGUIMIENTO, total: 2, adopciones: [{ id: 50 }, { id: 51 }] })
    await servicio.sinSeguimiento({ dias: '15' })
    assert.deepEqual(argumentos(seguimientos.sinSeguimiento, 1), [{ dias: 15 }])
    await rechazaCon(servicio.sinSeguimiento({ dias: '0' }), 400)
    await rechazaCon(servicio.sinSeguimiento({ dias: '400' }), 400)
    await rechazaCon(servicio.sinSeguimiento({ dias: '2.5' }), 400)
  })

  it('cuenta los seguimientos con problemas', async () => {
    assert.deepEqual(await armar().servicio.conProblemas(), { total: 1, seguimientos: [{ id: 3 }] })
  })
})

describe('Historias de adopción · servicio (HU-14)', () => {
  before(() => congelarFecha())
  after(() => liberarFecha())

  const historiaGuardada = { id: 7, fecha_adopcion: '2026-10-01', titulo: 'Toby' }
  function armar({ adopcion = { id: 50, estado: 'finalizada', fecha_adopcion: '2026-10-01' }, historia = historiaGuardada, actualizada = historiaGuardada } = {}) {
    const adopciones = { obtener: devuelve(adopcion) }
    const historias = {
      listar: devuelve([]),
      obtener: devuelve(historia),
      candidatas: devuelve([{ id: 50 }]),
      crear: devuelve({ id: 7 }),
      actualizar: devuelve(actualizada),
    }
    return { historias, servicio: crearHistoriasService({ adopciones, historias }) }
  }
  const nueva = (cambios = {}) => ({
    solicitud_id: 50,
    titulo: 'Toby encontró hogar',
    relato: 'Llegó asustado y hoy duerme en el sofá.',
    foto_url: 'https://fotos.bo/toby.jpg',
    ...cambios,
  })

  it('listar filtra por visibilidad', async () => {
    const { servicio, historias } = armar()
    await servicio.listar({ visible: 'false' })
    assert.deepEqual(argumentos(historias.listar), [{ visible: false }])
    await rechazaCon(servicio.listar({ visible: 'si' }), 400)
  })

  it('obtener y candidatas', async () => {
    assert.equal((await armar().servicio.obtener(7)).titulo, 'Toby')
    await rechazaCon(armar({ historia: null }).servicio.obtener(7), 404)
    assert.deepEqual(await armar().servicio.candidatas(), [{ id: 50 }])
  })

  it('publica visible y con fecha de hoy por defecto', async () => {
    const { servicio, historias } = armar()
    await servicio.publicar(nueva(), usuario)
    const [historia, usuarioId] = argumentos(historias.crear)
    assert.equal(historia.fecha_publicacion, HOY)
    assert.equal(historia.visible, true)
    assert.equal(usuarioId, 1)
  })

  it('solo de adopciones existentes y finalizadas', async () => {
    await rechazaCon(armar({ adopcion: null }).servicio.publicar(nueva(), usuario), 400, { campos: ['solicitud_id'] })
    await rechazaCon(armar({ adopcion: { estado: 'aprobada' } }).servicio.publicar(nueva(), usuario), 409)
  })

  it('la fecha de publicación va entre la entrega y hoy', async () => {
    const { servicio } = armar()
    await rechazaCon(servicio.publicar(nueva({ fecha_publicacion: '2026-09-01' }), usuario), 400, { campos: ['fecha_publicacion'] })
    await rechazaCon(servicio.publicar(nueva({ fecha_publicacion: '2026-12-01' }), usuario), 400, {
      mensaje: /Datos inválidos/,
      campos: ['fecha_publicacion'],
    })
  })

  it('la foto debe ser una URL http(s)', async () => {
    await rechazaCon(armar().servicio.publicar(nueva({ foto_url: 'foto.jpg' }), usuario), 400, { campos: ['foto_url'] })
  })

  it('actualizar exige al menos un cambio y revisa la fecha', async () => {
    const { servicio, historias } = armar()
    await rechazaCon(servicio.actualizar(7, {}), 400, { mensaje: /Datos inválidos/ })
    await rechazaCon(servicio.actualizar(7, { fecha_publicacion: '2026-01-01' }), 400, { campos: ['fecha_publicacion'] })
    await servicio.actualizar(7, { visible: false })
    assert.deepEqual(argumentos(historias.actualizar), [7, { visible: false }])
    await servicio.actualizar(7, { fecha_publicacion: '2026-11-01' })
  })

  it('actualizar una historia que desaparece → 404', async () => {
    await rechazaCon(armar({ historia: null }).servicio.actualizar(7, { visible: true }), 404)
    await rechazaCon(armar({ actualizada: null }).servicio.actualizar(7, { visible: true }), 404)
  })
})

describe('Subida de fotos · servicio', () => {
  const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)])
  const almacenFalso = () => ({ subir: mock.fn(async ({ ruta }) => `https://cdn/${ruta}`) })

  it('sin almacenamiento configurado responde 503', async () => {
    await rechazaCon(crearFotosService({ almacen: null }).subir(PNG, { carpeta: 'perros' }), 503, { mensaje: /Pega la URL/ })
  })

  it('sube a una ruta única dentro de la carpeta con la extensión real', async () => {
    const almacen = almacenFalso()
    const resultado = await crearFotosService({ almacen }).subir(PNG, { carpeta: 'perros' })
    assert.match(resultado.ruta, /^perros\/[0-9a-f-]{36}\.png$/)
    assert.equal(resultado.url, `https://cdn/${resultado.ruta}`)
    assert.equal(resultado.tipo, 'image/png')
    assert.equal(resultado.tamano, PNG.length)
    assert.equal(argumentos(almacen.subir)[0].tipo, 'image/png')
  })

  it('valida la carpeta, que haya archivo y que sea una imagen', async () => {
    const servicio = crearFotosService({ almacen: almacenFalso() })
    await rechazaCon(servicio.subir(PNG, { carpeta: 'otros' }), 400, { campos: ['carpeta'] })
    await rechazaCon(servicio.subir(Buffer.alloc(0), { carpeta: 'historias' }), 400, { campos: ['foto'] })
    await rechazaCon(servicio.subir('texto', { carpeta: 'historias' }), 400, { campos: ['foto'] })
    await rechazaCon(servicio.subir(Buffer.from('esto es un PDF falso'), { carpeta: 'historias' }), 400, {
      mensaje: /Datos inválidos/,
      campos: ['foto'],
    })
  })

  it('el tamaño máximo es 5 MB', () => {
    assert.equal(TAMANO_MAXIMO_FOTO, 5 * 1024 * 1024)
  })
})
