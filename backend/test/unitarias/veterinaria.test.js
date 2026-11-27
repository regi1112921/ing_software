// Pruebas unitarias · Servicio de Veterinaria: historial médico (HU-09),
// vacunas y controles (HU-08) y agenda de citas (HU-11).
// "Hoy" queda fijo en 2026-11-15 a las 10:00 para que las reglas de fecha y hora no dependan del reloj.
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { crearHistorialService } from '../../services/veterinaria/src/services/historial.service.js'
import { DIAS_POR_DEFECTO, crearControlesService } from '../../services/veterinaria/src/services/controles.service.js'
import {
  DIAS_AGENDA,
  ESTADOS_CITA,
  TIPOS_CITA,
  crearCitasService,
} from '../../services/veterinaria/src/services/citas.service.js'
import { HOY, argumentos, congelarFecha, devuelve, liberarFecha, poolFalso, rechazaCon } from './utilidades/dobles.js'

before(() => congelarFecha())
after(() => liberarFecha())

const lecturasFalsas = ({ existePerro = true, veterinario = true, estadoPerro = 'disponible' } = {}) => ({
  existePerro: devuelve(existePerro),
  esVeterinarioActivo: devuelve(veterinario),
  estadoPerro: devuelve(estadoPerro),
  veterinariosActivos: devuelve([{ id: 2, nombre_completo: 'Dra. Vargas' }]),
})

describe('Historial médico · servicio (HU-09)', () => {
  function armar(lecturas = lecturasFalsas()) {
    const consultas = { listarPorPerro: devuelve([{ id: 1 }, { id: 2 }]), crear: devuelve(9), obtener: devuelve({ id: 9 }) }
    const controles = { vacunasDePerro: devuelve([{ id: 3 }]), desparasitacionesDePerro: devuelve([]) }
    return { consultas, servicio: crearHistorialService({ consultas, controles, lecturas }) }
  }
  const consulta = (cambios = {}) => ({
    perro_id: 1,
    veterinario_id: 2,
    motivo: 'Cojera',
    diagnostico: 'Esguince',
    tratamiento: 'Reposo',
    ...cambios,
  })

  it('lista los veterinarios activos', async () => {
    assert.equal((await armar().servicio.listarVeterinarios()).length, 1)
  })

  it('arma el historial con consultas, vacunas y desparasitaciones', async () => {
    assert.deepEqual(await armar().servicio.historialDePerro('1'), {
      perro_id: 1,
      total: 2,
      consultas: [{ id: 1 }, { id: 2 }],
      vacunas: [{ id: 3 }],
      desparasitaciones: [],
    })
    await rechazaCon(armar(lecturasFalsas({ existePerro: false })).servicio.historialDePerro(1), 404)
  })

  it('registra la consulta con fecha de hoy por defecto', async () => {
    const { servicio, consultas } = armar()
    assert.deepEqual(await servicio.registrarConsulta(consulta()), { id: 9 })
    assert.equal(argumentos(consultas.crear)[0].fecha, HOY)
    assert.equal(argumentos(consultas.crear)[0].observaciones, null)
  })

  it('reporta juntos el perro inexistente y el veterinario inválido', async () => {
    const { servicio, consultas } = armar(lecturasFalsas({ existePerro: false, veterinario: false }))
    await rechazaCon(servicio.registrarConsulta(consulta()), 400, { campos: ['perro_id', 'veterinario_id'] })
    assert.equal(consultas.crear.mock.callCount(), 0)
  })

  it('valida los campos obligatorios', async () => {
    await rechazaCon(armar().servicio.registrarConsulta({}), 400, {
      campos: ['perro_id', 'veterinario_id', 'motivo', 'diagnostico', 'tratamiento'],
    })
  })
})

describe('Vacunas y controles · servicio (HU-08)', () => {
  function armar(lecturas = lecturasFalsas()) {
    const controles = {
      pendientes: devuelve([{ vencido: true }, { vencido: false }, { vencido: true }]),
      crearVacuna: devuelve({ id: 1 }),
      crearDesparasitacion: devuelve({ id: 2 }),
    }
    return { controles, servicio: crearControlesService({ controles, lecturas }) }
  }

  it('pendientes: 30 días por defecto y cuenta los vencidos', async () => {
    const { servicio, controles } = armar()
    const resultado = await servicio.pendientes({})
    assert.equal(resultado.dias, DIAS_POR_DEFECTO)
    assert.equal(resultado.total, 3)
    assert.equal(resultado.vencidos, 2)
    await servicio.pendientes({ dias: '0' })
    assert.deepEqual(argumentos(controles.pendientes, 1), [{ dias: 0 }])
    await rechazaCon(servicio.pendientes({ dias: '-1' }), 400)
    await rechazaCon(servicio.pendientes({ dias: '366' }), 400)
  })

  it('registra una vacuna con fecha de aplicación de hoy y sin próxima dosis', async () => {
    const { servicio, controles } = armar()
    await servicio.registrarVacuna({ perro_id: 1, veterinario_id: 2, nombre: 'Rabia' })
    const [vacuna] = argumentos(controles.crearVacuna)
    assert.equal(vacuna.fecha_aplicacion, HOY)
    assert.equal(vacuna.fecha_proxima_dosis, null)
  })

  it('la próxima dosis debe ser posterior a la aplicación', async () => {
    const { servicio } = armar()
    await rechazaCon(
      servicio.registrarVacuna({ perro_id: 1, veterinario_id: 2, nombre: 'Rabia', fecha_aplicacion: '2026-11-10', fecha_proxima_dosis: '2026-11-10' }),
      400,
      { campos: ['fecha_proxima_dosis'] },
    )
    await servicio.registrarVacuna({ perro_id: 1, veterinario_id: 2, nombre: 'Rabia', fecha_aplicacion: '2026-11-10', fecha_proxima_dosis: '2027-11-10' })
  })

  it('exige perro existente y veterinario activo', async () => {
    const { servicio, controles } = armar(lecturasFalsas({ existePerro: false, veterinario: false }))
    await rechazaCon(servicio.registrarVacuna({ perro_id: 1, veterinario_id: 2, nombre: 'Rabia' }), 400, {
      campos: ['perro_id', 'veterinario_id'],
    })
    assert.equal(controles.crearVacuna.mock.callCount(), 0)
  })

  it('registra una desparasitación interna o externa', async () => {
    const { servicio, controles } = armar()
    assert.deepEqual(await servicio.registrarDesparasitacion({ perro_id: 1, veterinario_id: 2, tipo: 'interna', producto: 'Drontal' }), { id: 2 })
    assert.equal(argumentos(controles.crearDesparasitacion)[0].fecha_proxima, null)
    await rechazaCon(servicio.registrarDesparasitacion({ perro_id: 1, veterinario_id: 2, tipo: 'oral', producto: 'X' }), 400, { campos: ['tipo'] })
    await rechazaCon(
      servicio.registrarDesparasitacion({ perro_id: 1, veterinario_id: 2, tipo: 'externa', producto: 'X', fecha_aplicacion: '2026-11-10', fecha_proxima: '2026-11-01' }),
      400,
      { campos: ['fecha_proxima'] },
    )
  })
})

describe('Agenda de citas · servicio (HU-11)', () => {
  const citaProgramada = {
    id: 20,
    estado: 'programada',
    fecha: '2026-11-15',
    hora: '09:00',
    perro_id: 1,
    veterinario_id: 2,
    motivo: 'Control',
    tipo: 'consulta',
    perro_nombre: 'Toby',
  }

  function armar({ cita = citaProgramada, ocupante = null, actualizada = true, lecturas = lecturasFalsas(), atendida = true } = {}) {
    const pool = poolFalso()
    const citas = {
      listar: devuelve([cita]),
      obtener: devuelve(cita),
      crear: devuelve(21),
      ocupante: devuelve(ocupante),
      actualizar: devuelve(actualizada),
      cancelar: devuelve(actualizada),
      marcarAtendida: devuelve(atendida),
    }
    const consultas = { crear: devuelve(90), obtener: devuelve({ id: 90 }) }
    return { pool, citas, consultas, servicio: crearCitasService({ citas, consultas, lecturas, pool }) }
  }
  const nueva = (cambios = {}) => ({
    perro_id: 1,
    veterinario_id: 2,
    fecha: '2026-11-16',
    hora: '09:30',
    tipo: 'vacuna',
    motivo: 'Refuerzo',
    ...cambios,
  })

  it('constantes de la agenda', () => {
    assert.deepEqual(TIPOS_CITA, ['consulta', 'vacuna', 'cirugia'])
    assert.deepEqual(ESTADOS_CITA, ['programada', 'atendida', 'cancelada'])
    assert.equal(DIAS_AGENDA, 7)
  })

  describe('listar', () => {
    it('por defecto muestra la semana desde hoy', async () => {
      const { servicio, citas } = armar()
      const resultado = await servicio.listar({})
      assert.equal(resultado.desde, HOY)
      assert.equal(resultado.hasta, '2026-11-21')
      assert.equal(resultado.total, 1)
      assert.deepEqual(argumentos(citas.listar), [
        { desde: HOY, hasta: '2026-11-21', veterinarioId: undefined, perroId: undefined, estado: undefined },
      ])
    })

    it('calcula el fin de semana cruzando de año y aplica filtros', async () => {
      const { servicio, citas } = armar()
      const resultado = await servicio.listar({ desde: '2026-12-28', veterinario_id: '2', perro_id: '', estado: 'atendida' })
      assert.equal(resultado.hasta, '2027-01-03')
      assert.equal(argumentos(citas.listar)[0].veterinarioId, 2)
      assert.equal(argumentos(citas.listar)[0].perroId, undefined)
    })

    it('valida el rango y el estado', async () => {
      const { servicio } = armar()
      await rechazaCon(servicio.listar({ desde: '2026-11-20', hasta: '2026-11-19' }), 400, { campos: ['hasta'] })
      await rechazaCon(servicio.listar({ desde: '2026-01-01', hasta: '2026-03-04' }), 400, { mensaje: /Datos inválidos/, campos: ['hasta'] })
      await rechazaCon(servicio.listar({ estado: 'perdida' }), 400, { campos: ['estado'] })
    })
  })

  it('obtener una cita inexistente → 404', async () => {
    await rechazaCon(armar({ cita: null }).servicio.obtener(20), 404)
  })

  describe('crear', () => {
    it('agenda una cita futura en un horario libre', async () => {
      const { servicio, citas } = armar()
      await servicio.crear(nueva(), { id: 1 })
      assert.deepEqual(argumentos(citas.crear), [nueva(), 1])
      assert.deepEqual(argumentos(citas.ocupante), ['2026-11-16', '09:30', null])
    })

    it('la hora debe ser en punto o y media', async () => {
      await rechazaCon(armar().servicio.crear(nueva({ hora: '09:15' }), { id: 1 }), 400, { campos: ['hora'] })
      await rechazaCon(armar().servicio.crear(nueva({ hora: '24:00' }), { id: 1 }), 400, { campos: ['hora'] })
    })

    it('no se agenda en una fecha u hora que ya pasó', async () => {
      await rechazaCon(armar().servicio.crear(nueva({ fecha: HOY, hora: '09:30' }), { id: 1 }), 400, {
        mensaje: /Datos inválidos/,
        campos: ['hora'],
      })
      await armar().servicio.crear(nueva({ fecha: HOY, hora: '10:30' }), { id: 1 }) // más tarde hoy: válido
    })

    it('valida perro (existente y no adoptado) y veterinario activo', async () => {
      await rechazaCon(armar({ lecturas: lecturasFalsas({ estadoPerro: null, veterinario: false }) }).servicio.crear(nueva(), { id: 1 }), 400, {
        campos: ['perro_id', 'veterinario_id'],
      })
      await rechazaCon(armar({ lecturas: lecturasFalsas({ estadoPerro: 'adoptado' }) }).servicio.crear(nueva(), { id: 1 }), 400, {
        campos: ['perro_id'],
      })
    })

    it('avisa con qué cita choca el horario', async () => {
      await rechazaCon(armar({ ocupante: { tipo: 'cirugia', perro_nombre: 'Luna' } }).servicio.crear(nueva(), { id: 1 }), 409, {
        mensaje: /Ya hay una cita a las 09:30 de ese día \(Cirugía de Luna\)/,
      })
      await rechazaCon(armar({ ocupante: { tipo: 'otro', perro_nombre: 'Rex' } }).servicio.crear(nueva(), { id: 1 }), 409, {
        mensaje: /\(otro de Rex\)/,
      })
    })
  })

  describe('editar y cancelar', () => {
    it('editar excluye la propia cita al buscar choques de horario', async () => {
      const { servicio, citas } = armar()
      await servicio.editar(20, nueva())
      assert.deepEqual(argumentos(citas.ocupante), ['2026-11-16', '09:30', 20])
      assert.deepEqual(argumentos(citas.actualizar), [20, nueva()])
    })

    it('solo se editan o cancelan citas programadas', async () => {
      const atendida = armar({ cita: { ...citaProgramada, estado: 'atendida' } })
      await rechazaCon(atendida.servicio.editar(20, nueva()), 409, { mensaje: /No se puede editar una cita atendida/ })
      await rechazaCon(atendida.servicio.cancelar(20, {}), 409, { mensaje: /No se puede cancelar una cita atendida/ })
    })

    it('detecta si la cita cambió mientras se editaba o cancelaba', async () => {
      const cambiada = armar({ actualizada: false })
      await rechazaCon(cambiada.servicio.editar(20, nueva()), 409, { mensaje: /cambió mientras la editabas/ })
      await rechazaCon(cambiada.servicio.cancelar(20, {}), 409, { mensaje: /cambió mientras la cancelabas/ })
    })

    it('cancelar guarda el motivo (opcional)', async () => {
      const { servicio, citas } = armar()
      await servicio.cancelar(20, {})
      await servicio.cancelar(20, { motivo_cancelacion: 'El perro fue trasladado' })
      assert.deepEqual(argumentos(citas.cancelar, 0), [20, null])
      assert.deepEqual(argumentos(citas.cancelar, 1), [20, 'El perro fue trasladado'])
    })
  })

  describe('atender', () => {
    const atencion = { diagnostico: 'Sano', tratamiento: 'Ninguno' }

    it('crea la consulta y marca la cita como atendida en una sola transacción', async () => {
      const { servicio, consultas, citas, pool } = armar()
      const resultado = await servicio.atender(20, atencion)
      assert.deepEqual(argumentos(consultas.crear), [
        { perro_id: 1, veterinario_id: 2, fecha: HOY, motivo: 'Control', diagnostico: 'Sano', tratamiento: 'Ninguno', observaciones: null },
        pool.cliente,
      ])
      assert.deepEqual(argumentos(citas.marcarAtendida), [pool.cliente, 20, 90])
      assert.deepEqual(resultado.consulta, { id: 90 })
      assert.deepEqual(pool.sentencias, ['begin', 'commit', 'release'])
    })

    it('no se atiende una cita futura ni una ya atendida', async () => {
      await rechazaCon(armar({ cita: { ...citaProgramada, fecha: '2026-11-16' } }).servicio.atender(20, atencion), 409, {
        mensaje: /de hoy o de días anteriores/,
      })
      await rechazaCon(armar({ cita: { ...citaProgramada, estado: 'cancelada' } }).servicio.atender(20, atencion), 409)
    })

    it('exige diagnóstico y tratamiento', async () => {
      await rechazaCon(armar().servicio.atender(20, {}), 400, { campos: ['diagnostico', 'tratamiento'] })
    })

    it('si la cita cambió a mitad de camino, revierte la consulta (rollback)', async () => {
      const { servicio, pool } = armar({ atendida: false })
      await rechazaCon(servicio.atender(20, atencion), 409, { mensaje: /cambió mientras la atendías/ })
      assert.deepEqual(pool.sentencias, ['begin', 'rollback', 'release'])
    })
  })
})
