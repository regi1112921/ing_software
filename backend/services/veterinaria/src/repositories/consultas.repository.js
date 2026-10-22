// Tabla propia: consultas (atenciones médicas).
export function crearConsultasRepository(pool) {
  return {
    async listarPorPerro(perroId) {
      const { rows } = await pool.query(
        `select c.id, c.perro_id, c.fecha, c.motivo, c.diagnostico, c.tratamiento, c.observaciones,
                c.veterinario_id, u.nombre_completo as veterinario_nombre, c.creado_en
           from consultas c
           join usuarios u on u.id = c.veterinario_id
          where c.perro_id = $1
          order by c.fecha desc, c.id desc`,
        [perroId],
      )
      return rows
    },

    async obtener(id) {
      const { rows } = await pool.query(
        `select c.id, c.perro_id, c.fecha, c.motivo, c.diagnostico, c.tratamiento, c.observaciones,
                c.veterinario_id, u.nombre_completo as veterinario_nombre, c.creado_en
           from consultas c
           join usuarios u on u.id = c.veterinario_id
          where c.id = $1`,
        [id],
      )
      return rows[0] ?? null
    },

    async crear(consulta) {
      const { rows } = await pool.query(
        `insert into consultas (perro_id, veterinario_id, fecha, motivo, diagnostico, tratamiento, observaciones)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id`,
        [
          consulta.perro_id, consulta.veterinario_id, consulta.fecha, consulta.motivo,
          consulta.diagnostico, consulta.tratamiento, consulta.observaciones,
        ],
      )
      return rows[0].id
    },
  }
}
