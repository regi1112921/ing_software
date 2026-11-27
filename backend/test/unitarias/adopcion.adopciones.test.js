// Pruebas unitarias · Servicio de Adopción · proceso de adopción (HU-10, HU-11, HU-12),
// avisos al adoptante (HU-13) y bandeja de solicitudes web (HU-09).
// La transacción usa un pool falso: se comprueba commit / rollback sin base de datos.
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { crearAdopcionesService } from '../../services/adopcion/src/services/adopciones.service.js'
import { crearAvisosService } from '../../services/adopcion/src/services/avisos.service.js'
import { crearSolicitudesPublicasService } from '../../services/adopcion/src/services/solicitudesPublicas.service.js'
import { HOY, argumentos, congelarFecha, devuelve, liberarFecha, poolFalso, rechazaCon } from './utilidades/dobles.js'

const usuario = { id: 1 }
const adopcionDe = (estado, cambios = {}) => ({
  id: 50,
  estado,
  adoptante: { nombre_completo: 'Ana Pérez', telefono: '70012345' },
  perro: { nombre: 'Firulais' },
  motivo_rechazo: null,
  ...cambios,
})

describe('Adopciones · servicio', () => {
  before(() => congelarFecha())
  after(() => liberarFecha())

  function armar({
    perro = { id: 5, estado: 'disponible', estado_nombre: 'Disponible' },
    existente = null,
    web = null,
    actual = { id: 50, estado: 'en_proceso' },
    adopcion = adopcionDe('en_proceso'),
  } = {}) {
    const pool = poolFalso()
    const adopciones = {
      listar: devuelve([adopcion]),
      obtener: devuelve(adopcion),
      crear: devuelve(50),
      obtenerParaActualizar: devuelve(actual),
      cambiarEstado: devuelve(undefined),
    }
    const adoptantes = { buscarPorDocumento: devuelve(existente), crear: devuelve(30) }
    const perros = { obtenerParaAdopcion: devuelve(perro) }
    const solicitudesPublicas = { obtenerParaActualizar: devuelve(web), convertir: devuelve(undefined) }
    const servicio = crearAdopcionesService({ pool, adopciones, adoptantes, perros, solicitudesPublicas })
    return { pool, adopciones, adoptantes, perros, solicitudesPublicas, servicio }
  }

  const solicitud = (cambios = {}) => ({
    perro_id: 5,
    adoptante: { nombre_completo: 'Ana Pérez', documento_identidad: '1234567', telefono: '700 123-45', direccion: 'Calle 1' },
    ...cambios,
  })

  describe('listar y obtener (HU-11)', () => {
    it('listar delega en el repositorio', async () => {
      const { servicio } = armar()
      assert.equal((await servicio.listar()).length, 1)
    })

    it('obtener agrega las transiciones permitidas según el estado', async () => {
      assert.deepEqual((await armar().servicio.obtener(50)).transiciones_permitidas, ['aprobada', 'rechazada'])
      const aprobada = armar({ adopcion: adopcionDe('aprobada') })
      assert.deepEqual((await aprobada.servicio.obtener(50)).transiciones_permitidas, ['finalizada', 'rechazada'])
      const finalizada = armar({ adopcion: adopcionDe('finalizada') })
      assert.deepEqual((await finalizada.servicio.obtener(50)).transiciones_permitidas, [])
    })

    it('id inválido → 400; adopción inexistente → 404', async () => {
      await rechazaCon(armar().servicio.obtener('x'), 400)
      await rechazaCon(armar({ adopcion: null }).servicio.obtener(1), 404, { mensaje: /La adopción no existe/ })
    })
  })

  describe('crear (HU-10)', () => {
    it('registra la adopción en una transacción con fecha de hoy por defecto', async () => {
      const { servicio, adopciones, adoptantes, pool } = armar()
      await servicio.crear(solicitud(), usuario)
      const [, datos, usuarioId] = argumentos(adopciones.crear)
      assert.deepEqual(datos, { perro_id: 5, adoptante_id: 30, fecha_solicitud: HOY, observaciones: null })
      assert.equal(usuarioId, 1)
      assert.equal(argumentos(adoptantes.crear)[1].telefono, '70012345') // sin espacios ni guiones
      assert.deepEqual(pool.sentencias, ['begin', 'commit', 'release'])
    })

    it('reutiliza al adoptante si ya existe uno con ese documento', async () => {
      const { servicio, adopciones, adoptantes } = armar({ existente: { id: 8 } })
      await servicio.crear(solicitud(), usuario)
      assert.equal(adoptantes.crear.mock.callCount(), 0)
      assert.equal(argumentos(adopciones.crear)[1].adoptante_id, 8)
    })

    it('sin documento no busca adoptante existente', async () => {
      const { servicio, adoptantes } = armar()
      const datos = solicitud()
      delete datos.adoptante.documento_identidad
      await servicio.crear(datos, usuario)
      assert.equal(adoptantes.buscarPorDocumento.mock.callCount(), 0)
      assert.equal(adoptantes.crear.mock.callCount(), 1)
    })

    it('perro inexistente → 400 y la transacción se revierte', async () => {
      const { servicio, pool } = armar({ perro: null })
      await rechazaCon(servicio.crear(solicitud(), usuario), 400, { mensaje: /El perro indicado no existe/ })
      assert.deepEqual(pool.sentencias, ['begin', 'rollback', 'release'])
    })

    it('perro no disponible → 409 con su estado actual', async () => {
      const { servicio } = armar({ perro: { estado: 'en_tratamiento', estado_nombre: 'En tratamiento' } })
      await rechazaCon(servicio.crear(solicitud(), usuario), 409, { mensaje: /estado actual: En tratamiento/ })
    })

    it('valida los datos del adoptante', async () => {
      const { servicio } = armar()
      await rechazaCon(servicio.crear({ perro_id: 5 }, usuario), 400, { campos: ['adoptante'] })
      await rechazaCon(
        servicio.crear(solicitud({ adoptante: { nombre_completo: 'Ana', telefono: '12', direccion: '' } }), usuario),
        400,
        { campos: ['adoptante.telefono', 'adoptante.direccion'] },
      )
    })

    describe('desde una solicitud del catálogo público (HU-09)', () => {
      it('la convierte y la enlaza con la adopción', async () => {
        const { servicio, solicitudesPublicas, pool } = armar({ web: { estado: 'pendiente', perro_id: 5 } })
        await servicio.crear(solicitud({ solicitud_publica_id: 12 }), usuario)
        assert.deepEqual(argumentos(solicitudesPublicas.convertir), [pool.cliente, 12, 50, 1])
      })

      it('rechaza una solicitud web inexistente, ya revisada o de otro perro', async () => {
        await rechazaCon(armar().servicio.crear(solicitud({ solicitud_publica_id: 12 }), usuario), 400, {
          campos: ['solicitud_publica_id'],
        })
        await rechazaCon(
          armar({ web: { estado: 'convertida', perro_id: 5 } }).servicio.crear(solicitud({ solicitud_publica_id: 12 }), usuario),
          409,
          { mensaje: /ya fue revisada/ },
        )
        await rechazaCon(
          armar({ web: { estado: 'pendiente', perro_id: 6 } }).servicio.crear(solicitud({ solicitud_publica_id: 12 }), usuario),
          400,
          { campos: ['perro_id'] },
        )
      })
    })
  })

  describe('cambiarEstado (HU-12)', () => {
    it('aprobar registra la fecha de aprobación y devuelve el aviso listo (HU-13)', async () => {
      const { servicio, adopciones } = armar({ adopcion: adopcionDe('aprobada') })
      const resultado = await servicio.cambiarEstado(50, { estado: 'aprobada' })
      const [, id, cambio] = argumentos(adopciones.cambiarEstado)
      assert.equal(id, 50)
      assert.deepEqual(cambio, {
        estado: 'aprobada',
        columnaFecha: 'fecha_aprobacion',
        fecha: HOY,
        observaciones: null,
        motivoRechazo: null,
      })
      assert.equal(resultado.aviso.tipo, 'aprobacion')
    })

    it('rechazar exige el motivo y lo guarda', async () => {
      const { servicio, adopciones } = armar({ adopcion: adopcionDe('rechazada', { motivo_rechazo: 'Sin patio' }) })
      await rechazaCon(servicio.cambiarEstado(50, { estado: 'rechazada' }), 400, { campos: ['motivo_rechazo'] })
      const resultado = await servicio.cambiarEstado(50, { estado: 'rechazada', motivo_rechazo: 'Sin patio' })
      const [, , cambio] = argumentos(adopciones.cambiarEstado)
      assert.equal(cambio.columnaFecha, 'fecha_rechazo')
      assert.equal(cambio.motivoRechazo, 'Sin patio')
      assert.match(resultado.aviso.mensaje, /Motivo: Sin patio/)
    })

    it('finalizar registra la fecha de adopción y no genera aviso', async () => {
      const { servicio, adopciones } = armar({ actual: { estado: 'aprobada' }, adopcion: adopcionDe('finalizada') })
      const resultado = await servicio.cambiarEstado(50, { estado: 'finalizada', motivo_rechazo: 'se ignora' })
      assert.equal(argumentos(adopciones.cambiarEstado)[2].columnaFecha, 'fecha_adopcion')
      assert.equal(argumentos(adopciones.cambiarEstado)[2].motivoRechazo, null)
      assert.equal(resultado.aviso, null)
    })

    it('impide transiciones no permitidas (RF-17)', async () => {
      const { servicio, pool } = armar({ actual: { estado: 'rechazada' } })
      await rechazaCon(servicio.cambiarEstado(50, { estado: 'aprobada' }), 409, {
        mensaje: /No se puede pasar una adopción de "Rechazada" a "Aprobada"/,
      })
      assert.deepEqual(pool.sentencias, ['begin', 'rollback', 'release'])
      await rechazaCon(armar({ actual: { estado: 'en_proceso' } }).servicio.cambiarEstado(50, { estado: 'finalizada' }), 409)
    })

    it('estado desconocido → 400; adopción inexistente → 404', async () => {
      await rechazaCon(armar().servicio.cambiarEstado(50, { estado: 'en_proceso' }), 400, { campos: ['estado'] })
      await rechazaCon(armar({ actual: null }).servicio.cambiarEstado(50, { estado: 'aprobada' }), 404)
    })
  })
})

describe('Avisos al adoptante · servicio (HU-13)', () => {
  function armar(adopcion = adopcionDe('aprobada')) {
    const adopciones = { obtener: devuelve(adopcion) }
    const avisos = {
      listarDeAdopcion: devuelve([{ id: 1, telefono: '59170012345', mensaje: 'Hola Ana' }]),
      crear: devuelve({ id: 2, telefono: '59170012345', mensaje: 'Texto final' }),
    }
    return { avisos, servicio: crearAvisosService({ adopciones, avisos }) }
  }

  it('borrador devuelve el mensaje según el estado, sin registrar nada', async () => {
    const { servicio, avisos } = armar()
    const aviso = await servicio.borrador(50)
    assert.equal(aviso.tipo, 'aprobacion')
    assert.equal(avisos.crear.mock.callCount(), 0)
  })

  it('solo hay aviso para solicitudes aprobadas o rechazadas', async () => {
    await rechazaCon(armar(adopcionDe('en_proceso')).servicio.borrador(50), 409)
    await rechazaCon(armar(adopcionDe('finalizada')).servicio.registrar(50, {}, usuario), 409)
  })

  it('adopción inexistente → 404', async () => {
    await rechazaCon(armar(null).servicio.listar(50), 404)
  })

  it('listar agrega el enlace de WhatsApp a cada aviso', async () => {
    const [aviso] = await armar().servicio.listar(50)
    assert.equal(aviso.enlace_whatsapp, 'https://wa.me/59170012345?text=Hola%20Ana')
  })

  it('registrar guarda el mensaje generado o el que editó el responsable', async () => {
    const generado = armar()
    await generado.servicio.registrar(50, {}, usuario)
    const [datos, usuarioId] = argumentos(generado.avisos.crear)
    assert.equal(datos.solicitud_id, 50)
    assert.equal(datos.tipo, 'aprobacion')
    assert.equal(datos.telefono, '59170012345')
    assert.match(datos.mensaje, /fue aprobada/)
    assert.equal(usuarioId, 1)

    const editado = armar()
    const registrado = await editado.servicio.registrar(50, { mensaje: '  Texto final ' }, usuario)
    assert.equal(argumentos(editado.avisos.crear)[0].mensaje, 'Texto final')
    assert.equal(registrado.enlace_whatsapp, 'https://wa.me/59170012345?text=Texto%20final')
  })
})

describe('Solicitudes del catálogo público · bandeja (HU-09)', () => {
  function armar({ solicitud = { id: 12, estado: 'pendiente' } } = {}) {
    const pool = poolFalso()
    const solicitudesPublicas = {
      listar: devuelve([]),
      obtener: devuelve(solicitud),
      obtenerParaActualizar: devuelve(solicitud),
      descartar: devuelve(undefined),
    }
    return { pool, solicitudesPublicas, servicio: crearSolicitudesPublicasService({ pool, solicitudesPublicas }) }
  }

  it('filtra por estado; vacío o "todas" no filtra', async () => {
    const { servicio, solicitudesPublicas } = armar()
    await servicio.listar({ estado: 'pendiente' })
    await servicio.listar({ estado: 'todas' })
    await servicio.listar({ estado: '' })
    assert.deepEqual(argumentos(solicitudesPublicas.listar, 0), [{ estado: 'pendiente' }])
    assert.deepEqual(argumentos(solicitudesPublicas.listar, 1), [{ estado: undefined }])
    assert.deepEqual(argumentos(solicitudesPublicas.listar, 2), [{ estado: undefined }])
    await rechazaCon(servicio.listar({ estado: 'aprobada' }), 400, { campos: ['estado'] })
  })

  it('obtener una solicitud inexistente → 404', async () => {
    await rechazaCon(armar({ solicitud: null }).servicio.obtener(12), 404)
  })

  it('descartar una pendiente registra quién la descartó', async () => {
    const { servicio, solicitudesPublicas, pool } = armar()
    await servicio.descartar('12', usuario)
    assert.deepEqual(argumentos(solicitudesPublicas.descartar), [pool.cliente, 12, 1])
    assert.deepEqual(pool.sentencias, ['begin', 'commit', 'release'])
  })

  it('no se descarta una solicitud ya revisada ni una inexistente', async () => {
    await rechazaCon(armar({ solicitud: { estado: 'convertida' } }).servicio.descartar(12, usuario), 409)
    await rechazaCon(armar({ solicitud: null }).servicio.descartar(12, usuario), 404)
  })
})
