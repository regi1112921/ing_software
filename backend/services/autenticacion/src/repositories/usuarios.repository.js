// Tabla propia del servicio: usuarios.
export function crearUsuariosRepository(pool) {
  return {
    async buscarPorCorreo(correo) {
      const { rows } = await pool.query(
        `select id, nombre_completo, correo, rol, activo, password_hash
           from usuarios
          where correo = $1`,
        [correo],
      )
      return rows[0] ?? null
    },

    async asignarContrasena(correo, passwordHash) {
      const { rowCount } = await pool.query(
        'update usuarios set password_hash = $2 where correo = $1',
        [correo, passwordHash],
      )
      return rowCount === 1
    },
  }
}
