// Lecturas de tablas de otros dominios (solo SELECT; este servicio nunca las modifica):
//   usuarios → servicio de Autenticación
//   perros   → servicio de Adopción
export function crearLecturasRepository(pool) {
  return {
    async veterinariosActivos() {
      const { rows } = await pool.query(
        `select id, nombre_completo
           from usuarios
          where rol = 'veterinario' and activo
          order by nombre_completo`,
      )
      return rows
    },

    async esVeterinarioActivo(id) {
      const { rowCount } = await pool.query(
        "select 1 from usuarios where id = $1 and rol = 'veterinario' and activo",
        [id],
      )
      return rowCount === 1
    },

    async existePerro(id) {
      const { rowCount } = await pool.query('select 1 from perros where id = $1', [id])
      return rowCount === 1
    },
  }
}
