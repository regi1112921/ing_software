// Tabla propia del servicio: usuarios.
export function crearUsuariosRepository(pool) {
  return {
    async buscarPorCorreo(correo) {
      const { rows } = await pool.query(
        `select id, nombre_completo, correo, rol, activo, password_hash, intentos_fallidos, bloqueado_hasta,
                coalesce(bloqueado_hasta > now(), false) as bloqueado,
                ceil(extract(epoch from bloqueado_hasta - now()) / 60)::int as minutos_bloqueo
           from usuarios
          where correo = $1`,
        [correo],
      )
      return rows[0] ?? null
    },

    async crear({ nombre_completo, correo, rol }, passwordHash) {
      const { rows } = await pool.query(
        `insert into usuarios (nombre_completo, correo, rol, password_hash)
         values ($1, $2, $3, $4)
         returning id, nombre_completo, correo, rol, activo`,
        [nombre_completo, correo, rol, passwordHash],
      )
      return rows[0]
    },

    // Suma un intento fallido. Al llegar al máximo bloquea la cuenta y reinicia el contador.
    // Es una sola sentencia para que dos intentos simultáneos no se pisen.
    async registrarIntentoFallido(id, { maxIntentos, minutosBloqueo }) {
      const { rows } = await pool.query(
        `update usuarios
            set intentos_fallidos = case when intentos_fallidos + 1 >= $2 then 0 else intentos_fallidos + 1 end,
                bloqueado_hasta   = case when intentos_fallidos + 1 >= $2 then now() + make_interval(mins => $3)
                                         else bloqueado_hasta end
          where id = $1
          returning intentos_fallidos, coalesce(bloqueado_hasta > now(), false) as bloqueado`,
        [id, maxIntentos, minutosBloqueo],
      )
      return rows[0]
    },

    async reiniciarIntentos(id) {
      await pool.query('update usuarios set intentos_fallidos = 0, bloqueado_hasta = null where id = $1', [id])
    },

    // También desbloquea la cuenta: es la forma de reactivarla antes de que pase el bloqueo.
    async asignarContrasena(correo, passwordHash) {
      const { rowCount } = await pool.query(
        'update usuarios set password_hash = $2, intentos_fallidos = 0, bloqueado_hasta = null where correo = $1',
        [correo, passwordHash],
      )
      return rowCount === 1
    },
  }
}
