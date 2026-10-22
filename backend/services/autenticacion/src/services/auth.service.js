import bcrypt from 'bcryptjs'
import { noAutenticado, validar, z } from '@huellas/shared'

const esquemaLogin = z.object({
  correo: z.string({ error: 'El correo es obligatorio.' }).trim().toLowerCase().min(1, 'El correo es obligatorio.'),
  contrasena: z.string({ error: 'La contraseña es obligatoria.' }).min(1, 'La contraseña es obligatoria.'),
})

const CREDENCIALES_INVALIDAS = 'Usuario o contraseña incorrectos.'

// Hash ficticio: si el correo no existe se compara igual, para que el tiempo
// de respuesta no revele qué correos están registrados.
const HASH_FICTICIO = bcrypt.hashSync('contrasena-inexistente', 10)

function publico(usuario) {
  return { id: usuario.id, nombre_completo: usuario.nombre_completo, correo: usuario.correo, rol: usuario.rol }
}

export function crearAuthService({ usuarios, sesiones }) {
  return {
    async iniciarSesion(datos) {
      const { correo, contrasena } = validar(esquemaLogin, datos)
      const usuario = await usuarios.buscarPorCorreo(correo)

      const coincide = await bcrypt.compare(contrasena, usuario?.password_hash || HASH_FICTICIO)
      if (!usuario || !usuario.password_hash || !usuario.activo || !coincide) {
        throw noAutenticado(CREDENCIALES_INVALIDAS)
      }

      const { token, expira } = sesiones.crear(publico(usuario))
      return { token, expira, usuario: publico(usuario) }
    },

    cerrarSesion(token) {
      sesiones.eliminar(token)
    },
  }
}
