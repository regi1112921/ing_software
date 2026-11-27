// Pruebas unitarias · Servicio de Adopción · utilidades (avisos HU-13, imágenes,
// almacenamiento de fotos) y permisos por rol (HU-07).
// Unitarias = prueban una función aislada: sin base de datos, sin HTTP, sin red.
import { afterEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import {
  enlaceWhatsapp,
  generarAviso,
  telefonoWhatsapp,
} from '../../services/adopcion/src/utils/avisos.js'
import { detectarImagen } from '../../services/adopcion/src/utils/imagenes.js'
import { crearAlmacenSupabase } from '../../services/adopcion/src/utils/almacenamiento.js'
import { ROLES_ADOPCIONES, ROLES_HISTORIAS, puedeVerAdopciones } from '../../services/adopcion/src/permisos.js'
import { rechazaCon } from './utilidades/dobles.js'

// Primeros bytes ("firma") de cada formato de imagen, rellenados hasta 12 bytes.
const conRelleno = (bytes) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(12)])
const JPG = conRelleno([0xff, 0xd8, 0xff, 0xe0])
const PNG = conRelleno([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(4)])

describe('detectarImagen', () => {
  it('reconoce JPG, PNG y WebP por sus primeros bytes', () => {
    assert.deepEqual(detectarImagen(JPG), { tipo: 'image/jpeg', extension: 'jpg' })
    assert.deepEqual(detectarImagen(PNG), { tipo: 'image/png', extension: 'png' })
    assert.deepEqual(detectarImagen(WEBP), { tipo: 'image/webp', extension: 'webp' })
  })

  it('devuelve null para otros formatos, archivos muy cortos o algo que no es un Buffer', () => {
    assert.equal(detectarImagen(Buffer.from('%PDF-1.4 documento')), null)
    assert.equal(detectarImagen(Buffer.from([0xff, 0xd8, 0xff])), null)
    assert.equal(detectarImagen('no soy un buffer'), null)
  })
})

describe('crearAlmacenSupabase', () => {
  afterEach(() => mock.restoreAll())
  const config = { url: 'https://x.supabase.co', clave: 'clave-servicio', bucket: 'fotos' }

  it('sube el archivo sin reemplazar y devuelve la URL pública', async () => {
    const fetchFalso = mock.fn(async () => ({ ok: true }))
    const almacen = crearAlmacenSupabase(config, { fetch: fetchFalso })
    const url = await almacen.subir({ ruta: 'perros/a.jpg', contenido: JPG, tipo: 'image/jpeg' })
    assert.equal(url, 'https://x.supabase.co/storage/v1/object/public/fotos/perros/a.jpg')
    const [destino, opciones] = fetchFalso.mock.calls[0].arguments
    assert.equal(destino, 'https://x.supabase.co/storage/v1/object/fotos/perros/a.jpg')
    assert.equal(opciones.method, 'POST')
    assert.equal(opciones.headers.Authorization, 'Bearer clave-servicio')
    assert.equal(opciones.headers['Content-Type'], 'image/jpeg')
    assert.equal(opciones.headers['x-upsert'], 'false')
  })

  it('responde 502 si Supabase rechaza la subida', async () => {
    mock.method(console, 'error', () => {})
    const almacen = crearAlmacenSupabase(config, { fetch: async () => ({ ok: false, status: 403, text: async () => 'denegado' }) })
    await rechazaCon(almacen.subir({ ruta: 'a.jpg', contenido: JPG, tipo: 'image/jpeg' }), 502, { mensaje: /No se pudo guardar la foto/ })
  })

  it('responde 502 si no hay conexión con Supabase', async () => {
    mock.method(console, 'error', () => {})
    const almacen = crearAlmacenSupabase(config, {
      fetch: async () => {
        throw new Error('ENOTFOUND')
      },
    })
    await rechazaCon(almacen.subir({ ruta: 'a.jpg', contenido: JPG, tipo: 'image/jpeg' }), 502)
  })

  it('sin opciones usa el fetch global', async () => {
    const fetchGlobal = mock.method(globalThis, 'fetch', async () => ({ ok: true }))
    await crearAlmacenSupabase(config).subir({ ruta: 'b.png', contenido: PNG, tipo: 'image/png' })
    assert.equal(fetchGlobal.mock.callCount(), 1)
  })
})

describe('permisos del módulo de adopciones', () => {
  it('administración y responsables de adopciones ven adopciones; veterinarios no', () => {
    assert.equal(puedeVerAdopciones({ rol: 'administrador' }), true)
    assert.equal(puedeVerAdopciones({ rol: 'responsable_adopciones' }), true)
    assert.equal(puedeVerAdopciones({ rol: 'veterinario' }), false)
    assert.equal(puedeVerAdopciones(undefined), false)
    assert.deepEqual(ROLES_ADOPCIONES, ['administrador', 'responsable_adopciones'])
  })

  it('solo la administración publica historias (HU-14)', () => {
    assert.deepEqual(ROLES_HISTORIAS, ['administrador'])
  })
})

describe('telefonoWhatsapp', () => {
  it('antepone el código de país a un número local', () => {
    assert.equal(telefonoWhatsapp('70012345'), '59170012345')
  })

  it('respeta el número que ya trae "+"', () => {
    assert.equal(telefonoWhatsapp('+591 700-12345'), '59170012345')
  })

  it('quita el prefijo internacional 00', () => {
    assert.equal(telefonoWhatsapp('0059170012345'), '59170012345')
  })

  it('no duplica el código si el número ya empieza con 591', () => {
    assert.equal(telefonoWhatsapp('59170012345'), '59170012345')
  })
})

describe('enlaceWhatsapp', () => {
  it('codifica el mensaje en la URL', () => {
    assert.equal(enlaceWhatsapp('59170012345', 'Hola Ana'), 'https://wa.me/59170012345?text=Hola%20Ana')
  })
})

describe('generarAviso', () => {
  const base = {
    adoptante: { nombre_completo: 'Ana Pérez', telefono: '70012345' },
    perro: { nombre: 'Firulais' },
  }

  it('genera aviso de aprobación con el nombre del perro', () => {
    const aviso = generarAviso({ ...base, estado: 'aprobada' })
    assert.equal(aviso.tipo, 'aprobacion')
    assert.equal(aviso.telefono, '59170012345')
    assert.match(aviso.mensaje, /Firulais fue aprobada/)
    assert.ok(aviso.enlace_whatsapp.startsWith('https://wa.me/59170012345?text='))
  })

  it('incluye el motivo en el aviso de rechazo', () => {
    const aviso = generarAviso({ ...base, estado: 'rechazada', motivo_rechazo: 'Vivienda sin patio' })
    assert.equal(aviso.tipo, 'rechazo')
    assert.match(aviso.mensaje, /Motivo: Vivienda sin patio/)
  })

  it('omite la línea de motivo si no hay motivo registrado', () => {
    const aviso = generarAviso({ ...base, estado: 'rechazada' })
    assert.doesNotMatch(aviso.mensaje, /Motivo:/)
  })

  it('devuelve null para estados sin aviso', () => {
    assert.equal(generarAviso({ ...base, estado: 'en_proceso' }), null)
    assert.equal(generarAviso({ ...base, estado: 'finalizada' }), null)
  })
})
