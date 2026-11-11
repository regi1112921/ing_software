// HU-09 · Catálogo público de perros en adopción
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { crearAppAdopcion } from '../services/adopcion/src/app.js'
import { PERSONAL, crearEntorno } from './utilidades/entorno.js'

const VETERINARIO = 'andres.ramirez@peluchin.test'

describe('Servicio de Adopción · catálogo público (HU-09)', () => {
  let entorno, publico, privado

  before(async () => {
    entorno = await crearEntorno()
    publico = request(entorno.apps.adopcion)
    privado = entorno.api('adopcion', await entorno.iniciarSesion(PERSONAL))
  })
  after(() => entorno.cerrar())

  const disponibles = async (condicion = 'true') =>
    (await entorno.pool.query(`select id, nombre from v_perros where estado = 'disponible' and ${condicion} order by id`)).rows
  const noDisponible = async () =>
    (await entorno.pool.query("select id from perros where estado <> 'disponible' limit 1")).rows[0].id
  const solicitud = (perroId, cambios = {}) => ({
    perro_id: perroId,
    nombre_completo: 'Laura Quispe',
    telefono: '700 123 45',
    correo: 'Laura@Correo.test',
    mensaje: 'Tengo patio grande.',
    ...cambios,
  })

  describe('Catálogo (sin sesión)', () => {
    it('solo muestra perros disponibles y sin datos internos', async () => {
      const respuesta = await publico.get('/publico/perros')
      assert.equal(respuesta.status, 200)
      const esperados = await disponibles()
      assert.deepEqual(respuesta.body.perros.map((p) => p.id).sort(), esperados.map((p) => p.id).sort())
      assert.ok(esperados.length > 0)
      const perro = respuesta.body.perros[0]
      for (const interno of ['estado', 'registrado_por', 'creado_en', 'adopcion_vigente']) {
        assert.equal(perro[interno], undefined, interno)
      }
      for (const visible of ['nombre', 'sexo', 'raza', 'tamano_nombre', 'edad_meses', 'foto_url']) {
        assert.ok(visible in perro, visible)
      }
    })

    it('filtra por tamaño, sexo y edad (y combinados)', async () => {
      const porTamano = await publico.get('/publico/perros?tamano=pequeno')
      assert.deepEqual(porTamano.body.perros.map((p) => p.id).sort(), (await disponibles("tamano = 'pequeno'")).map((p) => p.id).sort())

      const porSexo = await publico.get('/publico/perros?sexo=hembra')
      assert.ok(porSexo.body.perros.every((p) => p.sexo === 'hembra'))
      assert.equal(porSexo.body.total, (await disponibles("sexo = 'hembra'")).length)

      const jovenes = await publico.get('/publico/perros?edad=joven')
      assert.ok(jovenes.body.perros.every((p) => p.edad_meses >= 12 && p.edad_meses <= 35))
      assert.equal(jovenes.body.total, (await disponibles('edad_meses between 12 and 35')).length)

      const combinado = await publico.get('/publico/perros?tamano=grande&sexo=macho&edad=adulto')
      assert.equal(
        combinado.body.total,
        (await disponibles("tamano = 'grande' and sexo = 'macho' and edad_meses between 36 and 95")).length,
      )
    })

    it('con filtro de edad no salen los perros de edad desconocida; sin filtro sí', async () => {
      const sinEdad = (await disponibles('edad_meses is null')).map((p) => p.id)
      assert.ok(sinEdad.length > 0, 'los datos de prueba deben tener un perro sin edad')
      const todos = await publico.get('/publico/perros')
      assert.ok(sinEdad.every((id) => todos.body.perros.some((p) => p.id === id)))
      for (const edad of ['cachorro', 'joven', 'adulto', 'senior']) {
        const respuesta = await publico.get(`/publico/perros?edad=${edad}`)
        assert.ok(respuesta.body.perros.every((p) => !sinEdad.includes(p.id)), edad)
      }
    })

    it('filtros inválidos → 400', async () => {
      assert.equal((await publico.get('/publico/perros?sexo=otro')).status, 400)
      assert.equal((await publico.get('/publico/perros?edad=bebe')).status, 400)
    })

    it('entrega las opciones de los filtros', async () => {
      const respuesta = await publico.get('/publico/filtros')
      assert.equal(respuesta.status, 200)
      assert.deepEqual(respuesta.body.tamanos.map((t) => t.codigo), ['pequeno', 'mediano', 'grande'])
      assert.deepEqual(respuesta.body.edades.map((e) => e.codigo), ['cachorro', 'joven', 'adulto', 'senior'])
      assert.deepEqual(respuesta.body.sexos.map((s) => s.codigo), ['macho', 'hembra'])
    })

    it('la ficha solo existe para perros disponibles (404 si no)', async () => {
      const [perro] = await disponibles()
      const ficha = await publico.get(`/publico/perros/${perro.id}`)
      assert.equal(ficha.status, 200)
      assert.equal(ficha.body.nombre, perro.nombre)
      assert.equal((await publico.get(`/publico/perros/${await noDisponible()}`)).status, 404)
      assert.equal((await publico.get('/publico/perros/999999')).status, 404)
    })

    it('las rutas privadas siguen pidiendo sesión', async () => {
      assert.equal((await publico.get('/perros')).status, 401)
      assert.equal((await publico.get('/solicitudes-publicas')).status, 401)
    })
  })

  describe('Solicitud desde la ficha', () => {
    it('guarda la pre-solicitud como pendiente, con teléfono y correo normalizados', async () => {
      const [perro] = await disponibles()
      const respuesta = await publico.post('/publico/solicitudes').send(solicitud(perro.id))
      assert.equal(respuesta.status, 201, JSON.stringify(respuesta.body))
      assert.match(respuesta.body.mensaje, new RegExp(perro.nombre))

      const { rows } = await entorno.pool.query('select * from solicitudes_publicas where perro_id = $1', [perro.id])
      assert.equal(rows.length, 1)
      assert.equal(rows[0].estado, 'pendiente')
      assert.equal(rows[0].telefono, '70012345')
      assert.equal(rows[0].correo, 'laura@correo.test')
      // No toca el perro ni crea una adopción.
      assert.equal((await entorno.pool.query('select estado from perros where id = $1', [perro.id])).rows[0].estado, 'disponible')
    })

    it('la misma persona no puede repetir la solicitud pendiente del mismo perro (409)', async () => {
      const [perro] = await disponibles()
      const respuesta = await publico.post('/publico/solicitudes').send(solicitud(perro.id, { telefono: '70012345' }))
      assert.equal(respuesta.status, 409)
      assert.match(respuesta.body.error, /Ya recibimos/)
    })

    it('varias personas pueden pedir el mismo perro', async () => {
      const [perro] = await disponibles()
      const respuesta = await publico.post('/publico/solicitudes').send(solicitud(perro.id, { nombre_completo: 'Otra Persona', telefono: '+59171111111', correo: '' }))
      assert.equal(respuesta.status, 201)
    })

    it('un perro que no está disponible no recibe solicitudes (409)', async () => {
      const respuesta = await publico.post('/publico/solicitudes').send(solicitud(await noDisponible()))
      assert.equal(respuesta.status, 409)
    })

    it('valida nombre, teléfono y correo', async () => {
      const [perro] = await disponibles()
      const respuesta = await publico
        .post('/publico/solicitudes')
        .send(solicitud(perro.id, { nombre_completo: ' ', telefono: '12', correo: 'no-es-correo' }))
      assert.equal(respuesta.status, 400)
      assert.deepEqual(respuesta.body.detalles.map((d) => d.campo).sort(), ['correo', 'nombre_completo', 'telefono'])
    })

    it('si llega el campo trampa (bot) responde 201 pero no guarda nada', async () => {
      const [, perro] = await disponibles()
      const antes = (await entorno.pool.query('select count(*) from solicitudes_publicas')).rows[0].count
      const respuesta = await publico.post('/publico/solicitudes').send(solicitud(perro.id, { sitio_web: 'http://spam.test' }))
      assert.equal(respuesta.status, 201)
      assert.equal((await entorno.pool.query('select count(*) from solicitudes_publicas')).rows[0].count, antes)
    })

    it('limita las solicitudes por IP (429)', async () => {
      const app = crearAppAdopcion({ pool: entorno.pool, verificarSesion: async () => null, limitePublico: { maximo: 2, ventanaMs: 60_000 } })
      const enviar = () => request(app).post('/publico/solicitudes').send({})
      assert.equal((await enviar()).status, 400)
      assert.equal((await enviar()).status, 400)
      const bloqueada = await enviar()
      assert.equal(bloqueada.status, 429)
      assert.ok(Number(bloqueada.headers['retry-after']) > 0)
    })
  })

  describe('Bandeja de solicitudes web (responsable de adopciones)', () => {
    let pendiente

    before(async () => {
      const lista = await privado.get('/solicitudes-publicas?estado=pendiente')
      pendiente = lista.body.solicitudes[0]
    })

    it('lista las solicitudes con el perro, pendientes primero', async () => {
      const respuesta = await privado.get('/solicitudes-publicas')
      assert.equal(respuesta.status, 200)
      assert.ok(respuesta.body.total >= 2)
      assert.ok(pendiente.perro_nombre)
      assert.equal(pendiente.estado, 'pendiente')
    })

    it('el veterinario no accede (403)', async () => {
      const vet = entorno.api('adopcion', await entorno.iniciarSesion(VETERINARIO))
      assert.equal((await vet.get('/solicitudes-publicas')).status, 403)
    })

    it('registrar la adopción con solicitud_publica_id la marca como convertida', async () => {
      const respuesta = await privado.post('/adopciones').send({
        perro_id: pendiente.perro_id,
        adoptante: { nombre_completo: pendiente.nombre_completo, telefono: pendiente.telefono, direccion: 'Calle 1, La Paz' },
        solicitud_publica_id: pendiente.id,
      })
      assert.equal(respuesta.status, 201, JSON.stringify(respuesta.body))

      const web = (await privado.get(`/solicitudes-publicas/${pendiente.id}`)).body
      assert.equal(web.estado, 'convertida')
      assert.equal(web.solicitud_id, respuesta.body.id)
      assert.equal(web.revisado_por_nombre, 'María Alvarado')
      // El perro ya no aparece en el catálogo.
      assert.equal((await publico.get(`/publico/perros/${pendiente.perro_id}`)).status, 404)
    })

    it('una solicitud ya revisada no se puede volver a convertir ni descartar (409)', async () => {
      assert.equal((await privado.post(`/solicitudes-publicas/${pendiente.id}/descartar`)).status, 409)
    })

    it('la solicitud web debe ser del mismo perro', async () => {
      const [perro] = await disponibles()
      await publico.post('/publico/solicitudes').send(solicitud(perro.id, { telefono: '76543210' }))
      const web = (await entorno.pool.query("select id from solicitudes_publicas where telefono = '76543210'")).rows[0]
      const [, otro] = await disponibles()
      const respuesta = await privado.post('/adopciones').send({
        perro_id: otro.id,
        adoptante: { nombre_completo: 'X', telefono: '76543210', direccion: 'Y' },
        solicitud_publica_id: web.id,
      })
      assert.equal(respuesta.status, 400)
      assert.deepEqual(respuesta.body.detalles.map((d) => d.campo), ['perro_id'])
      // No se creó la adopción a medias.
      assert.equal((await entorno.pool.query('select estado from perros where id = $1', [otro.id])).rows[0].estado, 'disponible')
    })

    it('descartar marca quién la revisó y sale de las pendientes', async () => {
      const web = (await entorno.pool.query("select id from solicitudes_publicas where telefono = '76543210'")).rows[0]
      const respuesta = await privado.post(`/solicitudes-publicas/${web.id}/descartar`)
      assert.equal(respuesta.status, 200)
      assert.equal(respuesta.body.estado, 'descartada')
      assert.ok(respuesta.body.revisado_en)
      const pendientes = await privado.get('/solicitudes-publicas?estado=pendiente')
      assert.ok(pendientes.body.solicitudes.every((s) => s.id !== web.id))
    })
  })
})
