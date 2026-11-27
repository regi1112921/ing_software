// HU-16 · Registro de voluntarios, turnos y horas.
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PERSONAL, crearEntorno } from './utilidades/entorno.js'

const ADMINISTRADOR = 'admin@peluchin.test'
const VETERINARIO = 'andres.ramirez@peluchin.test'

describe('Servicio de Voluntariado · HU-16', () => {
  let entorno
  let admin

  before(async () => {
    entorno = await crearEntorno()
    await entorno.pool.query(
      'update usuarios set password_hash = (select password_hash from usuarios where correo = $2) where correo = $1',
      [ADMINISTRADOR, PERSONAL],
    )
    admin = entorno.api('voluntariado', await entorno.iniciarSesion(ADMINISTRADOR))
  })
  after(() => entorno.cerrar())

  it('solo permite gestionar voluntarios y turnos al administrador', async () => {
    const responsable = entorno.api('voluntariado', await entorno.iniciarSesion(PERSONAL))
    const veterinario = entorno.api('voluntariado', await entorno.iniciarSesion(VETERINARIO))
    for (const api of [responsable, veterinario]) {
      assert.equal((await api.get('/voluntarios')).status, 403)
      assert.equal((await api.get('/turnos?desde=2026-11-23&hasta=2026-11-29')).status, 403)
      assert.equal((await api.get('/horas?mes=2026-11')).status, 403)
    }
    assert.equal((await entorno.api('voluntariado', 'token-invalido').get('/voluntarios')).status, 401)
  })

  it('registra contacto y disponibilidad con datos normalizados y valida campos', async () => {
    const respuesta = await admin.post('/voluntarios').send({
      nombre_completo: '  Ana Flores  ',
      telefono: '+591 712-34567',
      correo: 'ANA@CORREO.TEST',
      disponibilidad: 'Lunes y miércoles por la mañana',
    })
    assert.equal(respuesta.status, 201, JSON.stringify(respuesta.body))
    assert.equal(respuesta.body.nombre_completo, 'Ana Flores')
    assert.equal(respuesta.body.telefono, '+59171234567')
    assert.equal(respuesta.body.correo, 'ana@correo.test')

    const lista = await admin.get('/voluntarios')
    assert.equal(lista.status, 200)
    assert.equal(lista.body.total, 1)
    assert.equal(lista.body.voluntarios[0].disponibilidad, 'Lunes y miércoles por la mañana')

    assert.equal((await admin.post('/voluntarios').send({ nombre_completo: 'X', telefono: '123', disponibilidad: 'viernes' })).status, 400)
    assert.equal((await admin.post('/voluntarios').send({
      nombre_completo: 'Persona',
      telefono: '71234567',
      correo: 'correo-invalido',
      disponibilidad: 'Viernes',
    })).status, 400)
  })

  it('asigna turnos, presenta el calendario semanal y totaliza las horas del mes', async () => {
    const voluntario = (await admin.get('/voluntarios')).body.voluntarios[0]
    const primero = await admin.post('/turnos').send({
      voluntario_id: voluntario.id,
      fecha: '2026-11-23',
      hora_inicio: '09:00',
      hora_fin: '12:00',
      actividad: 'Apoyo en alimentación',
    })
    assert.equal(primero.status, 201, JSON.stringify(primero.body))

    const segundo = await admin.post('/turnos').send({
      voluntario_id: voluntario.id,
      fecha: '2026-11-23',
      hora_inicio: '12:00',
      hora_fin: '14:00',
      actividad: 'Paseo de perros',
    })
    assert.equal(segundo.status, 201)

    const calendario = await admin.get('/turnos?desde=2026-11-23&hasta=2026-11-29')
    assert.equal(calendario.status, 200)
    assert.equal(calendario.body.total, 2)
    assert.equal(calendario.body.turnos[0].voluntario_nombre, 'Ana Flores')
    assert.equal(calendario.body.turnos[0].hora_inicio, '09:00')

    const horas = await admin.get('/horas?mes=2026-11')
    assert.equal(horas.status, 200)
    assert.equal(horas.body.mes, '2026-11')
    assert.equal(horas.body.voluntarios[0].horas, '5.00')

    const diciembre = await admin.get('/horas?mes=2026-12')
    assert.equal(diciembre.body.voluntarios[0].horas, '0.00')
  })

  it('rechaza turnos que se traslapan, rangos semanales largos y datos inválidos', async () => {
    const voluntario = (await admin.get('/voluntarios')).body.voluntarios[0]
    const solapado = await admin.post('/turnos').send({
      voluntario_id: voluntario.id,
      fecha: '2026-11-23',
      hora_inicio: '11:00',
      hora_fin: '13:00',
      actividad: 'Paseo',
    })
    assert.equal(solapado.status, 409)

    const finInvalido = await admin.post('/turnos').send({
      voluntario_id: voluntario.id,
      fecha: '2026-11-24',
      hora_inicio: '14:00',
      hora_fin: '13:00',
      actividad: 'Paseo',
    })
    assert.equal(finInvalido.status, 400)

    assert.equal((await admin.get('/turnos?desde=2026-11-23&hasta=2026-12-01')).status, 400)
    assert.equal((await admin.get('/horas?mes=2026-13')).status, 400)
  })
})
