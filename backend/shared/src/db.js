// Conexión a PostgreSQL (Supabase) compartida por los servicios.
import pg from 'pg'

// date → 'AAAA-MM-DD' (sin convertir a Date, para no desplazar el día por la zona horaria).
pg.types.setTypeParser(pg.types.builtins.DATE, (valor) => valor)
// bigint → number: los id y los count(*) de este sistema caben de sobra en un number.
pg.types.setTypeParser(pg.types.builtins.INT8, (valor) => Number(valor))

export function crearPool({ connectionString, ssl = true, max = 5 }) {
  return new pg.Pool({
    connectionString,
    max,
    // El pooler de Supabase exige SSL; el certificado no se valida contra una CA local.
    ssl: ssl ? { rejectUnauthorized: false } : false,
  })
}

// Ejecuta fn(cliente) dentro de una transacción: commit si termina bien, rollback si falla.
export async function enTransaccion(pool, fn) {
  const cliente = await pool.connect()
  try {
    await cliente.query('begin')
    const resultado = await fn(cliente)
    await cliente.query('commit')
    return resultado
  } catch (error) {
    await cliente.query('rollback').catch(() => {})
    throw error
  } finally {
    cliente.release()
  }
}
