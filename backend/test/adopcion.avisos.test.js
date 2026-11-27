// HU-13 · Aviso al adoptante sobre su solicitud
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { crearEntorno, idPerro } from './utilidades/entorno.js'
import { enlaceWhatsapp, telefonoWhatsapp } from '../services/adopcion/src/utils/avisos.js'

const VETERINARIO = 'andres.ramirez@peluchin.test'

describe('Servicio de Adopción · avisos al adoptante (HU-13)', () => {
  let entorno, api, aprobada, rechazada, luna

  const nuevaAdopcion = async (perro, telefono) => {
    const respuesta = await api.post('/adopciones').send({
      perro_id: await idPerro(entorno.pool, perro),
      adoptante: { nombre_completo: 'Laura Quispe', telefono, direccion: 'Calle 1, La Paz' },
      fecha_solicitud: '2026-10-01',
    })
    assert.equal(respuesta.status, 201, JSON.stringify(respuesta.body))
    return respuesta.body.id
  }

  // Lo que el adoptante leería al abrir el enlace.
  const textoDelEnlace = (enlace) => decodeURIComponent(new URL(enlace).searchParams.get('text'))

  before(async () => {
    entorno = await crearEntorno()
    api = entorno.api('adopcion', await entorno.iniciarSesion())
    aprobada = await nuevaAdopcion('Toby', '700 123 45')
    rechazada = await nuevaAdopcion('Luna', '+54 9 11 2345 6789')
    // Luna: rechazada en los datos de prueba, con un aviso ya enviado.
    luna = (
      await entorno.pool.query(
        "select id from solicitudes_adopcion where perro_id = $1 and estado = 'rechazada'",
        [await idPerro(entorno.pool, 'Luna')],
      )
    ).rows[0].id
  })
  after(() => entorno.cerrar())

  describe('Teléfono y enlace de WhatsApp', () => {
    it('antepone +591 si el teléfono no tiene código de país', () => {
      assert.equal(telefonoWhatsapp('70012345'), '59170012345')
      assert.equal(telefonoWhatsapp('700 123 45'), '59170012345')
      assert.equal(telefonoWhatsapp('2212345'), '5912212345')
    })

    it('respeta el código de país que ya trae', () => {
      assert.equal(telefonoWhatsapp('+59170012345'), '59170012345')
      assert.equal(telefonoWhatsapp('59170012345'), '59170012345')
      assert.equal(telefonoWhatsapp('+5491123456789'), '5491123456789')
      assert.equal(telefonoWhatsapp('0059170012345'), '59170012345')
    })

    it('el enlace es de wa.me con el mensaje codificado', () => {
      const enlace = enlaceWhatsapp('59170012345', 'Hola, ¿cómo está?\n1. Paso & más')
      assert.ok(enlace.startsWith('https://wa.me/59170012345?text='))
      assert.equal(textoDelEnlace(enlace), 'Hola, ¿cómo está?\n1. Paso & más')
    })
  })

  describe('Mensaje al aprobar o rechazar', () => {
    it('al aprobar, la respuesta trae el aviso con los siguientes pasos', async () => {
      const respuesta = await api.patch(`/adopciones/${aprobada}/estado`).send({ estado: 'aprobada', fecha: '2026-10-05' })
      assert.equal(respuesta.status, 200, JSON.stringify(respuesta.body))
      const { aviso } = respuesta.body
      assert.equal(aviso.tipo, 'aprobacion')
      assert.equal(aviso.telefono, '59170012345')
      assert.match(aviso.mensaje, /^Hola, Laura Quispe\./)
      assert.match(aviso.mensaje, /adoptar a Toby fue aprobada/)
      assert.match(aviso.mensaje, /Siguientes pasos:/)
      assert.match(aviso.mensaje, /documento de identidad/)
      assert.ok(aviso.enlace_whatsapp.startsWith('https://wa.me/59170012345?text='))
      assert.equal(textoDelEnlace(aviso.enlace_whatsapp), aviso.mensaje)
    })

    it('rechazar exige el motivo (400) y no cambia el estado', async () => {
      for (const motivo of [undefined, '', '   ']) {
        const respuesta = await api.patch(`/adopciones/${rechazada}/estado`).send({ estado: 'rechazada', motivo_rechazo: motivo })
        assert.equal(respuesta.status, 400, JSON.stringify(motivo))
        assert.equal(respuesta.body.detalles[0].campo, 'motivo_rechazo')
      }
      const largo = await api.patch(`/adopciones/${rechazada}/estado`).send({ estado: 'rechazada', motivo_rechazo: 'x'.repeat(501) })
      assert.equal(largo.status, 400)
      assert.equal((await api.get(`/adopciones/${rechazada}`)).body.estado, 'en_proceso')
    })

    it('al rechazar, guarda el motivo y el aviso lo incluye', async () => {
      const respuesta = await api.patch(`/adopciones/${rechazada}/estado`).send({
        estado: 'rechazada',
        motivo_rechazo: '  El departamento no admite mascotas.  ',
        observaciones: 'Nota interna: el contrato de alquiler lo prohíbe.',
      })
      assert.equal(respuesta.status, 200, JSON.stringify(respuesta.body))
      assert.equal(respuesta.body.motivo_rechazo, 'El departamento no admite mascotas.')
      const { aviso } = respuesta.body
      assert.equal(aviso.tipo, 'rechazo')
      assert.equal(aviso.telefono, '5491123456789')
      assert.match(aviso.mensaje, /adoptar a Luna/)
      assert.match(aviso.mensaje, /Motivo: El departamento no admite mascotas\./)
      // Las observaciones son internas: no van en el mensaje al adoptante.
      assert.doesNotMatch(aviso.mensaje, /Nota interna/)
    })

    it('el motivo solo se guarda al rechazar', async () => {
      const otra = await nuevaAdopcion('Coco', '71234567')
      const respuesta = await api.patch(`/adopciones/${otra}/estado`).send({ estado: 'aprobada', motivo_rechazo: 'No aplica.' })
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.motivo_rechazo, null)
    })

    it('finalizar no genera aviso', async () => {
      const respuesta = await api.patch(`/adopciones/${aprobada}/estado`).send({ estado: 'finalizada', fecha: '2026-10-10' })
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.aviso, null)
      // Se vuelve a aprobar otra para el resto de las pruebas.
      aprobada = await nuevaAdopcion('Canela', '71234568')
      await api.patch(`/adopciones/${aprobada}/estado`).send({ estado: 'aprobada' })
    })
  })

  describe('Borrador del aviso', () => {
    it('devuelve el mensaje del estado actual sin registrarlo', async () => {
      const respuesta = await api.get(`/adopciones/${rechazada}/avisos/borrador`)
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.tipo, 'rechazo')
      assert.match(respuesta.body.mensaje, /Motivo: El departamento no admite mascotas\./)
      assert.equal((await api.get(`/adopciones/${rechazada}/avisos`)).body.total, 0)
    })

    it('una adopción en proceso o finalizada no tiene aviso (409)', async () => {
      // Luna volvió a estar disponible con el rechazo anterior.
    const enProceso = await nuevaAdopcion('Luna', '71234569')
      assert.equal((await api.get(`/adopciones/${enProceso}/avisos/borrador`)).status, 409)
      assert.equal((await api.post(`/adopciones/${enProceso}/avisos`).send({})).status, 409)
    })

    it('adopción inexistente → 404', async () => {
      assert.equal((await api.get('/adopciones/99999/avisos/borrador')).status, 404)
      assert.equal((await api.get('/adopciones/99999/avisos')).status, 404)
      assert.equal((await api.post('/adopciones/99999/avisos').send({})).status, 404)
    })
  })

  describe('Registro de avisos', () => {
    it('registra quién lo envió, cuándo y el texto generado', async () => {
      const respuesta = await api.post(`/adopciones/${aprobada}/avisos`).send({})
      assert.equal(respuesta.status, 201, JSON.stringify(respuesta.body))
      const aviso = respuesta.body
      assert.equal(aviso.solicitud_id, aprobada)
      assert.equal(aviso.tipo, 'aprobacion')
      assert.equal(aviso.canal, 'whatsapp')
      assert.equal(aviso.telefono, '59171234568')
      assert.match(aviso.mensaje, /adoptar a Canela fue aprobada/)
      assert.equal(aviso.enviado_por_nombre, 'María Alvarado')
      assert.ok(aviso.enviado_en)
      assert.equal(textoDelEnlace(aviso.enlace_whatsapp), aviso.mensaje)
    })

    it('guarda el texto ajustado por el responsable', async () => {
      const respuesta = await api.post(`/adopciones/${rechazada}/avisos`).send({
        mensaje: '  Hola, Laura. Lamentamos que no se pudo aprobar su solicitud.  ',
      })
      assert.equal(respuesta.status, 201)
      assert.equal(respuesta.body.mensaje, 'Hola, Laura. Lamentamos que no se pudo aprobar su solicitud.')
      assert.equal(textoDelEnlace(respuesta.body.enlace_whatsapp), respuesta.body.mensaje)
    })

    it('el mensaje no puede superar 2000 caracteres', async () => {
      const respuesta = await api.post(`/adopciones/${rechazada}/avisos`).send({ mensaje: 'x'.repeat(2001) })
      assert.equal(respuesta.status, 400)
      assert.equal(respuesta.body.detalles[0].campo, 'mensaje')
    })

    it('lista los avisos de la adopción, el más reciente primero', async () => {
      await api.post(`/adopciones/${rechazada}/avisos`).send({})
      const respuesta = await api.get(`/adopciones/${rechazada}/avisos`)
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.total, 2)
      const [ultimo, primero] = respuesta.body.avisos
      assert.match(ultimo.mensaje, /Motivo:/)
      assert.match(primero.mensaje, /^Hola, Laura\./)
      assert.ok(ultimo.id > primero.id)
      assert.ok(ultimo.enlace_whatsapp.startsWith('https://wa.me/5491123456789?text='))
    })

    it('los datos de prueba traen el aviso de rechazo enviado a Jorge por Luna', async () => {
      const respuesta = await api.get(`/adopciones/${luna}/avisos`)
      assert.equal(respuesta.body.total, 1)
      assert.equal(respuesta.body.avisos[0].tipo, 'rechazo')
      assert.equal(respuesta.body.avisos[0].telefono, '59168812345')
      assert.equal((await api.get(`/adopciones/${luna}`)).body.motivo_rechazo, 'La vivienda no tiene espacio adecuado para un perro de su tamaño.')
    })
  })

  describe('Permisos', () => {
    it('el veterinario no accede a los avisos (403)', async () => {
      const vet = entorno.api('adopcion', await entorno.iniciarSesion(VETERINARIO))
      assert.equal((await vet.get(`/adopciones/${aprobada}/avisos`)).status, 403)
      assert.equal((await vet.get(`/adopciones/${aprobada}/avisos/borrador`)).status, 403)
      assert.equal((await vet.post(`/adopciones/${aprobada}/avisos`).send({})).status, 403)
    })
  })
})
