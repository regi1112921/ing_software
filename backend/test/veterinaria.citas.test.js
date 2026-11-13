// HU-11 · Agenda de citas veterinarias
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { hoy } from '@huellas/shared'
import { PERSONAL, crearEntorno, idPerro } from './utilidades/entorno.js'

const VETERINARIO = 'andres.ramirez@peluchin.test'

describe('Servicio de Veterinaria · agenda de citas (HU-11)', () => {
  let entorno, api, andres, lucia, maria, perros

  before(async () => {
    entorno = await crearEntorno()
    api = entorno.api('veterinaria', await entorno.iniciarSesion(VETERINARIO))
    const usuario = async (correo) =>
      (await entorno.pool.query('select id from usuarios where correo = $1', [correo])).rows[0].id
    andres = await usuario(VETERINARIO)
    lucia = await usuario('lucia.torres@peluchin.test')
    maria = await usuario(PERSONAL)
    perros = {}
    for (const nombre of ['Toby', 'Luna', 'Max', 'Coco', 'Rocky']) perros[nombre] = await idPerro(entorno.pool, nombre)
  })
  after(() => entorno.cerrar())

  // Hoy (hora local del servicio) desplazado n días. Los datos de prueba ocupan los próximos 6 días.
  const fecha = async (dias = 0) => {
    const d = new Date(`${hoy()}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + dias)
    return d.toISOString().slice(0, 10)
  }

  const cita = async (cambios = {}) => ({
    perro_id: perros.Max,
    veterinario_id: andres,
    fecha: await fecha(20),
    hora: '09:00',
    tipo: 'consulta',
    motivo: 'Revisión general',
    ...cambios,
  })

  const crear = async (cambios) => {
    const respuesta = await api.post('/citas').send(await cita(cambios))
    assert.equal(respuesta.status, 201, JSON.stringify(respuesta.body))
    return respuesta.body
  }

  // Cita de hoy insertada directamente (por la API no se agenda en el pasado).
  const citaDeHoy = async (hora) => {
    const { rows } = await entorno.pool.query(
      `insert into citas (perro_id, veterinario_id, fecha, hora, tipo, motivo, registrado_por)
       values ($1, $2, $3, $4, 'consulta', 'Control de la herida', $2) returning id`,
      [perros.Coco, andres, await fecha(0), hora],
    )
    return rows[0].id
  }

  describe('Agenda', () => {
    it('por defecto muestra la semana desde hoy, en orden de calendario', async () => {
      const respuesta = await api.get('/citas')
      assert.equal(respuesta.status, 200, JSON.stringify(respuesta.body))
      const { desde, hasta, total, citas } = respuesta.body
      assert.equal(desde, await fecha(0))
      assert.equal(hasta, await fecha(6))
      assert.equal(total, citas.length)
      assert.ok(total >= 3, 'los datos de prueba tienen citas en los próximos días')

      const max = citas.find((c) => c.perro_nombre === 'Max')
      assert.equal(max.hora, '09:00')
      assert.equal(max.veterinario_nombre, 'Andrés Ramírez')
      assert.equal(max.estado, 'programada')

      const orden = citas.map((c) => `${c.fecha} ${c.hora}`)
      assert.deepEqual(orden, [...orden].sort())
    })

    it('filtra por veterinario y por estado', async () => {
      const deLucia = (await api.get(`/citas?veterinario_id=${lucia}`)).body
      assert.ok(deLucia.total > 0)
      assert.ok(deLucia.citas.every((c) => c.veterinario_id === lucia))

      const canceladas = (await api.get('/citas?estado=cancelada')).body
      assert.ok(canceladas.citas.length > 0)
      assert.ok(canceladas.citas.every((c) => c.estado === 'cancelada'))
    })

    it('rechaza un rango invertido o demasiado largo', async () => {
      const invertido = await api.get(`/citas?desde=${await fecha(5)}&hasta=${await fecha(1)}`)
      assert.equal(invertido.status, 400)
      assert.equal(invertido.body.detalles[0].campo, 'hasta')

      const largo = await api.get(`/citas?desde=${await fecha(0)}&hasta=${await fecha(90)}`)
      assert.equal(largo.status, 400)
    })
  })

  describe('Crear', () => {
    it('agenda una cita con perro, veterinario, fecha, hora, tipo y motivo', async () => {
      const nueva = await crear({ hora: '10:00', tipo: 'vacuna', motivo: 'Refuerzo de la séxtuple' })
      assert.equal(nueva.perro_nombre, 'Max')
      assert.equal(nueva.veterinario_nombre, 'Andrés Ramírez')
      assert.equal(nueva.hora, '10:00')
      assert.equal(nueva.tipo, 'vacuna')
      assert.equal(nueva.estado, 'programada')
      assert.equal(nueva.consulta_id, null)

      const { rows } = await entorno.pool.query('select registrado_por from citas where id = $1', [nueva.id])
      assert.equal(rows[0].registrado_por, andres)
    })

    it('no permite dos citas a la misma fecha y hora, aunque sean de otro perro o veterinario', async () => {
      await crear({ hora: '11:00' })
      const repetida = await api.post('/citas').send(await cita({ hora: '11:00', perro_id: perros.Luna, veterinario_id: lucia }))
      assert.equal(repetida.status, 409)
      assert.match(repetida.body.error, /Ya hay una cita a las 11:00/)
      assert.match(repetida.body.error, /Max/)
    })

    it('la hora va en bloques de 30 minutos', async () => {
      const respuesta = await api.post('/citas').send(await cita({ hora: '09:15' }))
      assert.equal(respuesta.status, 400)
      assert.equal(respuesta.body.detalles[0].campo, 'hora')
    })

    it('no se agenda en una fecha que ya pasó', async () => {
      const respuesta = await api.post('/citas').send(await cita({ fecha: await fecha(-1) }))
      assert.equal(respuesta.status, 400)
      assert.ok(respuesta.body.detalles.some((d) => d.campo === 'hora'))
    })

    it('el responsable debe ser veterinario y el perro no puede estar adoptado', async () => {
      const respuesta = await api.post('/citas').send(await cita({ veterinario_id: maria, perro_id: perros.Rocky }))
      assert.equal(respuesta.status, 400)
      const campos = respuesta.body.detalles.map((d) => d.campo).sort()
      assert.deepEqual(campos, ['perro_id', 'veterinario_id'])
    })

    it('valida tipo y motivo', async () => {
      const respuesta = await api.post('/citas').send(await cita({ tipo: 'baño', motivo: '  ' }))
      assert.equal(respuesta.status, 400)
      const campos = respuesta.body.detalles.map((d) => d.campo).sort()
      assert.deepEqual(campos, ['motivo', 'tipo'])
    })
  })

  describe('Editar y cancelar', () => {
    it('edita una cita programada y respeta los horarios ocupados', async () => {
      const original = await crear({ fecha: await fecha(21), hora: '14:00' })
      await crear({ fecha: await fecha(21), hora: '15:00', perro_id: perros.Toby })

      // Guardar sin cambiar el horario no choca consigo misma.
      const mismoHorario = await api.put(`/citas/${original.id}`).send(await cita({ fecha: await fecha(21), hora: '14:00', motivo: 'Control de peso' }))
      assert.equal(mismoHorario.status, 200, JSON.stringify(mismoHorario.body))
      assert.equal(mismoHorario.body.motivo, 'Control de peso')

      const ocupado = await api.put(`/citas/${original.id}`).send(await cita({ fecha: await fecha(21), hora: '15:00' }))
      assert.equal(ocupado.status, 409)

      const movida = await api.put(`/citas/${original.id}`).send(await cita({ fecha: await fecha(21), hora: '16:30', veterinario_id: lucia }))
      assert.equal(movida.status, 200)
      assert.equal(movida.body.hora, '16:30')
      assert.equal(movida.body.veterinario_nombre, 'Lucía Torres')
    })

    it('cancela con motivo, libera el horario y ya no se puede editar ni volver a cancelar', async () => {
      const original = await crear({ fecha: await fecha(22), hora: '09:30' })
      const cancelada = await api.post(`/citas/${original.id}/cancelar`).send({ motivo_cancelacion: 'El perro está en cuarentena.' })
      assert.equal(cancelada.status, 200)
      assert.equal(cancelada.body.estado, 'cancelada')
      assert.equal(cancelada.body.motivo_cancelacion, 'El perro está en cuarentena.')

      await crear({ fecha: await fecha(22), hora: '09:30', perro_id: perros.Luna })

      const editar = await api.put(`/citas/${original.id}`).send(await cita({ fecha: await fecha(22), hora: '10:00' }))
      assert.equal(editar.status, 409)
      const otraVez = await api.post(`/citas/${original.id}/cancelar`).send({})
      assert.equal(otraVez.status, 409)
    })

    it('una cita que no existe da 404', async () => {
      assert.equal((await api.get('/citas/999999')).status, 404)
      assert.equal((await api.post('/citas/999999/cancelar').send({})).status, 404)
    })
  })

  describe('Atender', () => {
    it('crea la atención en el historial médico y deja la cita atendida', async () => {
      const id = await citaDeHoy('00:00')
      const respuesta = await api.post(`/citas/${id}/atender`).send({
        diagnostico: 'Herida cicatrizando bien',
        tratamiento: 'Limpieza diaria por 5 días',
      })
      assert.equal(respuesta.status, 201, JSON.stringify(respuesta.body))
      const { cita: atendida, consulta } = respuesta.body
      assert.equal(atendida.estado, 'atendida')
      assert.equal(atendida.consulta_id, consulta.id)
      assert.equal(consulta.perro_id, perros.Coco)
      assert.equal(consulta.veterinario_id, andres)
      assert.equal(consulta.motivo, 'Control de la herida')
      assert.equal(consulta.fecha, await fecha(0))

      const historial = (await api.get(`/perros/${perros.Coco}/historial`)).body
      assert.ok(historial.consultas.some((c) => c.id === consulta.id))

      const otraVez = await api.post(`/citas/${id}/atender`).send({ diagnostico: 'x', tratamiento: 'y' })
      assert.equal(otraVez.status, 409)
    })

    it('no atiende citas futuras y exige diagnóstico y tratamiento', async () => {
      const futura = await crear({ fecha: await fecha(23), hora: '08:00' })
      const respuesta = await api.post(`/citas/${futura.id}/atender`).send({ diagnostico: 'Sano', tratamiento: 'Ninguno' })
      assert.equal(respuesta.status, 409)

      const id = await citaDeHoy('00:30')
      const incompleta = await api.post(`/citas/${id}/atender`).send({ diagnostico: 'Sano' })
      assert.equal(incompleta.status, 400)
      assert.equal(incompleta.body.detalles[0].campo, 'tratamiento')
      const { rows } = await entorno.pool.query('select estado from citas where id = $1', [id])
      assert.equal(rows[0].estado, 'programada')
    })
  })

  describe('Permisos (HU-07)', () => {
    it('la agenda es solo de administración y veterinaria', async () => {
      const responsable = entorno.api('veterinaria', await entorno.iniciarSesion(PERSONAL))
      assert.equal((await responsable.get('/citas')).status, 403)
      assert.equal((await responsable.post('/citas').send(await cita({ hora: '12:00' }))).status, 403)
    })
  })
})
