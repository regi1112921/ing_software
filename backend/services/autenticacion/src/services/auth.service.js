import bcrypt from 'bcryptjs'
import { ErrorHttp, ROLES, campos, noAutenticado, validar, z } from '@huellas/shared'

const esquemaLogin = z.object({
  correo: z.string({ error: 'El correo es obligatorio.' }).trim().toLowerCase().min(1, 'El correo es obligatorio.'),
  contrasena: z.string({ error: 'La contraseña es obligatoria.' }).min(1, 'La contraseña es obligatoria.'),
})

const esquemaRegistro = z.object({
  nombre_completo: campos.texto('El nombre completo', 150),
  correo: z
    .string({ error: 'El correo es obligatorio.' })
    .trim()
    .toLowerCase()
    .min(1, 'El correo es obligatorio.')
    .pipe(z.email('El correo no es válido.')),
  // bcrypt solo usa los primeros 72 bytes.
  contrasena: z
    .string({ error: 'La contraseña es obligatoria.' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(72, 'La contraseña no puede superar 72 caracteres.'),
})

// Quien se registra solo entra como responsable de adopciones: los roles
// administrador y veterinario no se pueden obtener desde el registro.
const ROL_REGISTRO = ROLES.responsableAdopciones

const CREDENCIALES_INVALIDAS = 'Usuario o contraseña incorrectos.'

const minutos = (n) => `${n} ${n === 1 ? 'minuto' : 'minutos'}`

// 429: la cuenta está bloqueada por intentos fallidos (HU-07).
function cuentaBloqueada(minutosRestantes) {
  return new ErrorHttp(
    429,
    `Demasiados intentos fallidos. La cuenta está bloqueada; vuelve a intentarlo en ${minutos(minutosRestantes)}.`,
  )
}

// Hash ficticio: si el correo no existe se compara igual, para que el tiempo
// de respuesta no revele qué correos están registrados.
const HASH_FICTICIO = bcrypt.hashSync('contrasena-inexistente', 10)

function publico(usuario) {
  return { id: usuario.id, nombre_completo: usuario.nombre_completo, correo: usuario.correo, rol: usuario.rol }
}

// bloqueo: { maxIntentos, minutosBloqueo } (ver bloqueoLogin() en @huellas/shared).
export function crearAuthService({ usuarios, sesiones, bloqueo }) {
  return {
    async iniciarSesion(datos) {
      const { correo, contrasena } = validar(esquemaLogin, datos)
      const usuario = await usuarios.buscarPorCorreo(correo)
      if (usuario?.bloqueado) throw cuentaBloqueada(usuario.minutos_bloqueo)

      const coincide = await bcrypt.compare(contrasena, usuario?.password_hash || HASH_FICTICIO)
      const puedeEntrar = usuario && usuario.password_hash && usuario.activo
      if (!puedeEntrar || !coincide) {
        // Solo cuentan los intentos sobre cuentas que podrían iniciar sesión.
        if (puedeEntrar) {
          const resultado = await usuarios.registrarIntentoFallido(usuario.id, bloqueo)
          if (resultado.bloqueado) throw cuentaBloqueada(bloqueo.minutosBloqueo)
          const restantes = bloqueo.maxIntentos - resultado.intentos_fallidos
          if (restantes === 1) {
            throw noAutenticado(
              `${CREDENCIALES_INVALIDAS} Te queda 1 intento: si vuelves a fallar, la cuenta se bloqueará por ${minutos(bloqueo.minutosBloqueo)}.`,
            )
          }
        }
        throw noAutenticado(CREDENCIALES_INVALIDAS)
      }

      if (usuario.intentos_fallidos > 0 || usuario.bloqueado_hasta) await usuarios.reiniciarIntentos(usuario.id)

      const { token, expira } = sesiones.crear(publico(usuario))
      return { token, expira, usuario: publico(usuario) }
    },

    // Crea la cuenta y deja la sesión iniciada (misma respuesta que el login).
    async registrar(datos) {
      const nuevo = validar(esquemaRegistro, datos)
      if (await usuarios.buscarPorCorreo(nuevo.correo)) {
        throw new ErrorHttp(409, 'Ya existe una cuenta con ese correo.', [
          { campo: 'correo', mensaje: 'Ya existe una cuenta con ese correo.' },
        ])
      }
      const usuario = await usuarios.crear({ ...nuevo, rol: ROL_REGISTRO }, await bcrypt.hash(nuevo.contrasena, 10))
      const { token, expira } = sesiones.crear(publico(usuario))
      return { token, expira, usuario: publico(usuario) }
    },

    cerrarSesion(token) {
      sesiones.eliminar(token)
    },
  }
}
