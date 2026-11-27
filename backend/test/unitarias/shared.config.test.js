// Pruebas unitarias · configuración por variables de entorno (shared/config.js).
// Cada prueba fija las variables que necesita y las restaura al terminar,
// así no importa si quien corre las pruebas tiene un .env propio.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  bloqueoLogin,
  configAlmacenamiento,
  configBaseDatos,
  horasSesion,
  limiteSolicitudesPublicas,
  origenesCors,
  puertos,
  saltosProxy,
  urlAutenticacion,
} from '@huellas/shared'

// Ejecuta fn con las variables indicadas (undefined = borrada) y luego las deja como estaban.
function conEntorno(variables, fn) {
  const antes = {}
  for (const [nombre, valor] of Object.entries(variables)) {
    antes[nombre] = process.env[nombre]
    if (valor === undefined) delete process.env[nombre]
    else process.env[nombre] = valor
  }
  try {
    return fn()
  } finally {
    for (const [nombre, valor] of Object.entries(antes)) {
      if (valor === undefined) delete process.env[nombre]
      else process.env[nombre] = valor
    }
  }
}

describe('puertos', () => {
  const sinPuertos = {
    VETERINARIA_PORT: undefined,
    ADOPCION_PORT: undefined,
    DASHBOARD_PORT: undefined,
    AUTENTICACION_PORT: undefined,
    VOLUNTARIADO_PORT: undefined,
  }

  it('usa los puertos por defecto 3001 a 3005', () => {
    conEntorno(sinPuertos, () => {
      assert.equal(puertos.veterinaria(), 3001)
      assert.equal(puertos.adopcion(), 3002)
      assert.equal(puertos.dashboard(), 3003)
      assert.equal(puertos.autenticacion(), 3004)
      assert.equal(puertos.voluntariado(), 3005)
    })
  })

  it('lee el puerto de la variable de entorno', () => {
    conEntorno({ ADOPCION_PORT: '4000' }, () => assert.equal(puertos.adopcion(), 4000))
  })

  it('una variable vacía cuenta como no definida', () => {
    conEntorno({ ADOPCION_PORT: '' }, () => assert.equal(puertos.adopcion(), 3002))
  })

  it('falla con un mensaje claro si el valor no es un número', () => {
    conEntorno({ ADOPCION_PORT: 'abc' }, () => {
      assert.throws(() => puertos.adopcion(), /ADOPCION_PORT debe ser un número/)
    })
  })
})

describe('configBaseDatos', () => {
  it('exige DATABASE_URL', () => {
    conEntorno({ DATABASE_URL: undefined }, () => {
      assert.throws(() => configBaseDatos(), /Falta la variable de entorno DATABASE_URL/)
    })
  })

  it('usa SSL y 5 conexiones por defecto', () => {
    conEntorno({ DATABASE_URL: 'postgres://bd', DB_SSL: undefined, DB_POOL_MAX: undefined }, () => {
      assert.deepEqual(configBaseDatos(), { connectionString: 'postgres://bd', ssl: true, max: 5 })
    })
  })

  it('permite desactivar SSL y cambiar el tamaño del pool', () => {
    conEntorno({ DATABASE_URL: 'postgres://bd', DB_SSL: 'false', DB_POOL_MAX: '10' }, () => {
      assert.deepEqual(configBaseDatos(), { connectionString: 'postgres://bd', ssl: false, max: 10 })
    })
  })
})

describe('urlAutenticacion', () => {
  it('usa AUTENTICACION_URL si existe', () => {
    conEntorno({ AUTENTICACION_URL: 'https://auth.huellas.bo' }, () => {
      assert.equal(urlAutenticacion(), 'https://auth.huellas.bo')
    })
  })

  it('si no, apunta al servicio local en su puerto', () => {
    conEntorno({ AUTENTICACION_URL: undefined, AUTENTICACION_PORT: undefined }, () => {
      assert.equal(urlAutenticacion(), 'http://localhost:3004')
    })
  })
})

describe('origenesCors', () => {
  it('permite cualquier origen si no se configura o vale *', () => {
    conEntorno({ CORS_ORIGENES: undefined }, () => assert.equal(origenesCors(), '*'))
    conEntorno({ CORS_ORIGENES: '*' }, () => assert.equal(origenesCors(), '*'))
  })

  it('separa la lista por comas y descarta vacíos', () => {
    conEntorno({ CORS_ORIGENES: 'https://a.com, https://b.com,' }, () => {
      assert.deepEqual(origenesCors(), ['https://a.com', 'https://b.com'])
    })
  })
})

describe('valores de sesión, login y límites', () => {
  const sinVariables = {
    SESION_HORAS: undefined,
    LOGIN_MAX_INTENTOS: undefined,
    LOGIN_MINUTOS_BLOQUEO: undefined,
    TRUST_PROXY: undefined,
    SOLICITUDES_PUBLICAS_MAXIMO: undefined,
    SOLICITUDES_PUBLICAS_VENTANA_MINUTOS: undefined,
  }

  it('usa los valores por defecto', () => {
    conEntorno(sinVariables, () => {
      assert.equal(horasSesion(), 8)
      assert.deepEqual(bloqueoLogin(), { maxIntentos: 3, minutosBloqueo: 5 })
      assert.equal(saltosProxy(), 0)
      assert.deepEqual(limiteSolicitudesPublicas(), { maximo: 5, ventanaMs: 60 * 60 * 1000 })
    })
  })

  it('convierte la ventana de minutos a milisegundos', () => {
    conEntorno({ SOLICITUDES_PUBLICAS_VENTANA_MINUTOS: '2', SOLICITUDES_PUBLICAS_MAXIMO: '9' }, () => {
      assert.deepEqual(limiteSolicitudesPublicas(), { maximo: 9, ventanaMs: 120_000 })
    })
  })
})

describe('configAlmacenamiento', () => {
  it('devuelve null si falta la URL o la clave de Supabase', () => {
    conEntorno({ SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: 'k' }, () => assert.equal(configAlmacenamiento(), null))
    conEntorno({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: undefined }, () =>
      assert.equal(configAlmacenamiento(), null),
    )
  })

  it('quita las barras finales de la URL y usa el bucket "fotos" por defecto', () => {
    conEntorno(
      { SUPABASE_URL: 'https://x.supabase.co//', SUPABASE_SERVICE_ROLE_KEY: 'k', SUPABASE_BUCKET_FOTOS: undefined },
      () => assert.deepEqual(configAlmacenamiento(), { url: 'https://x.supabase.co', clave: 'k', bucket: 'fotos' }),
    )
  })

  it('respeta un bucket configurado', () => {
    conEntorno(
      { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', SUPABASE_BUCKET_FOTOS: 'imagenes' },
      () => assert.equal(configAlmacenamiento().bucket, 'imagenes'),
    )
  })
})
