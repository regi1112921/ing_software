// Asigna (o cambia) la contraseña de un usuario existente. Herramienta de desarrollo:
//   npm run asignar-contrasena -w @huellas/autenticacion -- maria.alvarado@peluchin.test
// La contraseña se pide por consola y se guarda solo como hash bcrypt.
import { createInterface } from 'node:readline/promises'
import bcrypt from 'bcryptjs'
import { configBaseDatos, crearPool } from '@huellas/shared'
import { crearUsuariosRepository } from '../src/repositories/usuarios.repository.js'

const correo = process.argv[2]?.trim().toLowerCase()
if (!correo) {
  console.error('Uso: npm run asignar-contrasena -w @huellas/autenticacion -- <correo>')
  process.exit(1)
}

const consola = createInterface({ input: process.stdin, output: process.stdout })
const contrasena = await consola.question(`Nueva contraseña para ${correo} (mínimo 8 caracteres): `)
consola.close()

if (contrasena.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.')
  process.exit(1)
}

const pool = crearPool(configBaseDatos())
try {
  const actualizado = await crearUsuariosRepository(pool).asignarContrasena(correo, await bcrypt.hash(contrasena, 10))
  console.log(actualizado ? 'Contraseña asignada.' : `No existe un usuario con el correo ${correo}.`)
  process.exitCode = actualizado ? 0 : 1
} finally {
  await pool.end()
}
