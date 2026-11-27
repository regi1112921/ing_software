// Subida de fotos (perros e historias) a Supabase Storage
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { crearAppAdopcion } from '../services/adopcion/src/app.js'
import { crearAlmacenSupabase } from '../services/adopcion/src/utils/almacenamiento.js'
import { detectarImagen } from '../services/adopcion/src/utils/imagenes.js'

// Cabeceras mínimas de cada formato, rellenadas hasta el tamaño pedido.
const imagen = (cabecera, tamano = 64) => Buffer.concat([cabecera, Buffer.alloc(Math.max(0, tamano - cabecera.length))])
const JPG = imagen(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))
const PNG = imagen(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
const WEBP = imagen(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]))
const GIF = imagen(Buffer.from('GIF89a'))

// Sesión de prueba: el token "valido" es de un veterinario; cualquier otro, sin sesión.
const verificarSesion = async (token) => (token === 'valido' ? { id: 2, rol: 'veterinario', nombre_completo: 'Andrés Ramírez' } : null)

// Storage simulado: guarda lo que se sube y devuelve una URL pública.
function almacenFalso() {
  const subidas = []
  return {
    subidas,
    async subir({ ruta, contenido, tipo }) {
      subidas.push({ ruta, contenido, tipo })
      return `https://proyecto.supabase.co/storage/v1/object/public/fotos/${ruta}`
    },
  }
}

const crearApp = (almacen) => crearAppAdopcion({ pool: null, verificarSesion, almacen })
const subir = (app, contenido, { carpeta = 'perros', tipo = 'image/jpeg', token = 'valido' } = {}) =>
  request(app)
    .post(`/fotos${carpeta ? `?carpeta=${carpeta}` : ''}`)
    .set('authorization', `Bearer ${token}`)
    .set('content-type', tipo)
    .send(contenido)

describe('Servicio de Adopción · subida de fotos', () => {
  describe('Tipo de imagen por su contenido', () => {
    it('reconoce JPG, PNG y WebP', () => {
      assert.deepEqual(detectarImagen(JPG), { tipo: 'image/jpeg', extension: 'jpg' })
      assert.deepEqual(detectarImagen(PNG), { tipo: 'image/png', extension: 'png' })
      assert.deepEqual(detectarImagen(WEBP), { tipo: 'image/webp', extension: 'webp' })
    })

    it('rechaza otros formatos y contenidos vacíos', () => {
      assert.equal(detectarImagen(GIF), null)
      assert.equal(detectarImagen(Buffer.from('<svg></svg>')), null)
      assert.equal(detectarImagen(Buffer.alloc(0)), null)
      assert.equal(detectarImagen('texto'), null)
    })
  })

  describe('POST /fotos', () => {
    it('sube la foto y devuelve su URL pública, con nombre único por carpeta', async () => {
      const almacen = almacenFalso()
      const app = crearApp(almacen)
      const respuesta = await subir(app, PNG, { carpeta: 'historias', tipo: 'image/png' })
      assert.equal(respuesta.status, 201, JSON.stringify(respuesta.body))
      assert.match(respuesta.body.ruta, /^historias\/[0-9a-f-]{36}\.png$/)
      assert.equal(respuesta.body.url, `https://proyecto.supabase.co/storage/v1/object/public/fotos/${respuesta.body.ruta}`)
      assert.equal(respuesta.body.tipo, 'image/png')
      assert.equal(respuesta.body.tamano, PNG.length)
      assert.equal(almacen.subidas.length, 1)
      assert.ok(almacen.subidas[0].contenido.equals(PNG))

      const otra = await subir(app, PNG, { carpeta: 'historias', tipo: 'image/png' })
      assert.notEqual(otra.body.ruta, respuesta.body.ruta)
    })

    it('el tipo sale del contenido, no del Content-Type que manda el navegador', async () => {
      const almacen = almacenFalso()
      const respuesta = await subir(crearApp(almacen), JPG, { tipo: 'application/octet-stream' })
      assert.equal(respuesta.status, 201)
      assert.equal(almacen.subidas[0].tipo, 'image/jpeg')
      assert.match(respuesta.body.ruta, /^perros\/.+\.jpg$/)
    })

    it('rechaza lo que no es JPG, PNG o WebP (400) sin subir nada', async () => {
      const almacen = almacenFalso()
      const app = crearApp(almacen)
      for (const contenido of [GIF, Buffer.from('<svg onload="alert(1)"></svg>'.padEnd(64))]) {
        const respuesta = await subir(app, contenido, { tipo: 'image/png' })
        assert.equal(respuesta.status, 400)
        assert.equal(respuesta.body.detalles[0].campo, 'foto')
      }
      assert.equal(almacen.subidas.length, 0)
    })

    it('exige una carpeta válida y una foto (400)', async () => {
      const app = crearApp(almacenFalso())
      assert.equal((await subir(app, JPG, { carpeta: '' })).status, 400)
      assert.equal((await subir(app, JPG, { carpeta: '../usuarios' })).status, 400)
      const vacia = await request(app).post('/fotos?carpeta=perros').set('authorization', 'Bearer valido')
      assert.equal(vacia.status, 400)
      assert.equal(vacia.body.detalles[0].campo, 'foto')
    })

    it('rechaza fotos de más de 5 MB (413)', async () => {
      const almacen = almacenFalso()
      const respuesta = await subir(crearApp(almacen), imagen(JPG.subarray(0, 4), 5 * 1024 * 1024 + 1))
      assert.equal(respuesta.status, 413)
      assert.match(respuesta.body.error, /5 MB/)
      assert.equal(almacen.subidas.length, 0)
    })

    it('exige sesión (401)', async () => {
      const almacen = almacenFalso()
      assert.equal((await subir(crearApp(almacen), JPG, { token: 'otro' })).status, 401)
      assert.equal(almacen.subidas.length, 0)
    })

    it('sin Storage configurado responde 503 y se sigue pudiendo pegar la URL', async () => {
      const respuesta = await subir(crearApp(null), JPG)
      assert.equal(respuesta.status, 503)
      assert.match(respuesta.body.error, /URL/)
    })
  })

  describe('Cliente de Supabase Storage', () => {
    const config = { url: 'https://proyecto.supabase.co', clave: 'clave-de-prueba', bucket: 'fotos' }

    it('sube con la service_role key sin reemplazar archivos y arma la URL pública', async () => {
      const llamadas = []
      const almacen = crearAlmacenSupabase(config, {
        fetch: async (url, opciones) => {
          llamadas.push({ url, opciones })
          return new Response('{}', { status: 200 })
        },
      })
      const url = await almacen.subir({ ruta: 'perros/abc.jpg', contenido: JPG, tipo: 'image/jpeg' })
      assert.equal(url, 'https://proyecto.supabase.co/storage/v1/object/public/fotos/perros/abc.jpg')
      const [{ url: destino, opciones }] = llamadas
      assert.equal(destino, 'https://proyecto.supabase.co/storage/v1/object/fotos/perros/abc.jpg')
      assert.equal(opciones.method, 'POST')
      assert.equal(opciones.headers.Authorization, 'Bearer clave-de-prueba')
      assert.equal(opciones.headers['Content-Type'], 'image/jpeg')
      assert.equal(opciones.headers['x-upsert'], 'false')
    })

    it('si Supabase falla o no responde, devuelve 502 sin exponer el detalle', async () => {
      const silenciar = console.error
      console.error = () => {}
      try {
        const conError = crearAlmacenSupabase(config, { fetch: async () => new Response('{"error":"Bucket not found"}', { status: 404 }) })
        await assert.rejects(conError.subir({ ruta: 'perros/a.jpg', contenido: JPG, tipo: 'image/jpeg' }), (error) => {
          assert.equal(error.estado, 502)
          assert.doesNotMatch(error.message, /Bucket/)
          return true
        })
        const sinRed = crearAlmacenSupabase(config, {
          fetch: async () => {
            throw new TypeError('fetch failed')
          },
        })
        await assert.rejects(sinRed.subir({ ruta: 'perros/a.jpg', contenido: JPG, tipo: 'image/jpeg' }), { estado: 502 })
      } finally {
        console.error = silenciar
      }
    })
  })
})
