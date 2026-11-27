// Pruebas unitarias · Servicio de Voluntariado: registro de voluntarios, calendario
// semanal, asignación de turnos y horas mensuales.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { crearVoluntariadoService } from '../../services/voluntariado/src/services/voluntariado.service.js'
import { argumentos, devuelve, poolFalso, rechazaCon } from './utilidades/dobles.js'

function armar({ activo = { id: 3 }, solapa = false } = {}) {
  const pool = poolFalso()
  const voluntarios = {
    listar: devuelve([{ id: 3 }]),
    crear: devuelve({ id: 3 }),
    calendario: devuelve([{ id: 1 }, { id: 2 }]),
    obtenerActivoParaActualizar: devuelve(activo),
    existeSolapamiento: devuelve(solapa),
    crearTurno: devuelve({ id: 10 }),
    horasMensuales: devuelve([{ id: 3, horas: 12 }]),
  }
  return { pool, voluntarios, servicio: crearVoluntariadoService({ pool, voluntarios }) }
}

const voluntario = (cambios = {}) => ({
  nombre_completo: 'María Flores',
  telefono: '700-12 345',
  disponibilidad: 'Sábados por la mañana',
  ...cambios,
})
const turno = (cambios = {}) => ({
  voluntario_id: 3,
  fecha: '2026-11-21',
  hora_inicio: '08:00',
  hora_fin: '12:00',
  actividad: 'Paseo de perros',
  ...cambios,
})

describe('Voluntarios', () => {
  it('lista los voluntarios', async () => {
    assert.deepEqual(await armar().servicio.listarVoluntarios(), [{ id: 3 }])
  })

  it('registra normalizando teléfono y correo', async () => {
    const { servicio, voluntarios } = armar()
    await servicio.registrarVoluntario(voluntario({ correo: 'Maria@Correo.com' }))
    assert.deepEqual(argumentos(voluntarios.crear), [
      { nombre_completo: 'María Flores', telefono: '70012345', correo: 'maria@correo.com', disponibilidad: 'Sábados por la mañana' },
    ])
  })

  it('el correo es opcional: vacío o ausente se guarda como null', async () => {
    const { servicio, voluntarios } = armar()
    await servicio.registrarVoluntario(voluntario({ correo: '' }))
    await servicio.registrarVoluntario(voluntario())
    assert.equal(argumentos(voluntarios.crear, 0)[0].correo, null)
    assert.equal(argumentos(voluntarios.crear, 1)[0].correo, null)
  })

  it('valida nombre, teléfono, correo y disponibilidad', async () => {
    await rechazaCon(() => armar().servicio.registrarVoluntario({ telefono: '12', correo: 'malo' }), 400, {
      campos: ['nombre_completo', 'telefono', 'correo', 'disponibilidad'],
    })
  })
})

describe('Calendario semanal', () => {
  it('devuelve los turnos de un rango de hasta 7 días', async () => {
    const { servicio, voluntarios } = armar()
    assert.deepEqual(await servicio.calendario({ desde: '2026-11-16', hasta: '2026-11-22' }), {
      desde: '2026-11-16',
      hasta: '2026-11-22',
      total: 2,
      turnos: [{ id: 1 }, { id: 2 }],
    })
    assert.deepEqual(argumentos(voluntarios.calendario), ['2026-11-16', '2026-11-22'])
  })

  it('rechaza rangos de más de 7 días o invertidos', async () => {
    const { servicio } = armar()
    await rechazaCon(servicio.calendario({ desde: '2026-11-16', hasta: '2026-11-23' }), 400, { campos: ['hasta'] })
    await rechazaCon(servicio.calendario({ desde: '2026-11-16', hasta: '2026-11-15' }), 400, { campos: ['hasta'] })
  })
})

describe('Asignación de turnos', () => {
  it('crea el turno dentro de una transacción', async () => {
    const { servicio, voluntarios, pool } = armar()
    assert.deepEqual(await servicio.asignarTurno(turno()), { id: 10 })
    assert.deepEqual(argumentos(voluntarios.crearTurno), [pool.cliente, turno()])
    assert.deepEqual(pool.sentencias, ['begin', 'commit', 'release'])
  })

  it('la hora de fin debe ser posterior a la de inicio', async () => {
    await rechazaCon(armar().servicio.asignarTurno(turno({ hora_fin: '08:00' })), 400, { campos: ['hora_fin'] })
  })

  it('un turno no puede superar 12 horas', async () => {
    await rechazaCon(armar().servicio.asignarTurno(turno({ hora_inicio: '06:00', hora_fin: '18:30' })), 400, {
      mensaje: /Datos inválidos/,
      campos: ['hora_fin'],
    })
    await armar().servicio.asignarTurno(turno({ hora_inicio: '06:00', hora_fin: '18:00' })) // justo 12 h: válido
  })

  it('valida el formato de las horas', async () => {
    await rechazaCon(armar().servicio.asignarTurno(turno({ hora_inicio: '8:00', hora_fin: '25:00' })), 400)
  })

  it('el voluntario debe existir y estar activo', async () => {
    const { servicio, pool } = armar({ activo: null })
    await rechazaCon(servicio.asignarTurno(turno()), 400, { campos: ['voluntario_id'] })
    assert.deepEqual(pool.sentencias, ['begin', 'rollback', 'release'])
  })

  it('no permite turnos que se crucen con otro del mismo voluntario', async () => {
    await rechazaCon(armar({ solapa: true }).servicio.asignarTurno(turno()), 409, { mensaje: /se cruza con ese horario/ })
  })
})

describe('Horas mensuales', () => {
  it('consulta desde el primer día del mes hasta el primero del siguiente', async () => {
    const { servicio, voluntarios } = armar()
    assert.deepEqual(await servicio.horasMensuales({ mes: '2026-03' }), { mes: '2026-03', total: 1, voluntarios: [{ id: 3, horas: 12 }] })
    assert.deepEqual(argumentos(voluntarios.horasMensuales), ['2026-03-01', '2026-04-01'])
  })

  it('diciembre pasa al año siguiente', async () => {
    const { servicio, voluntarios } = armar()
    await servicio.horasMensuales({ mes: '2026-12' })
    assert.deepEqual(argumentos(voluntarios.horasMensuales), ['2026-12-01', '2027-01-01'])
  })

  it('el mes debe tener formato AAAA-MM', async () => {
    await rechazaCon(armar().servicio.horasMensuales({ mes: '2026-13' }), 400, { campos: ['mes'] })
  })
})
