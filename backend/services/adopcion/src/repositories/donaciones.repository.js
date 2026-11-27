// Tabla propia: donaciones (HU-18).
const SELECT_DONACION = `
  select d.id, d.fecha, d.donante, d.contacto, d.tipo,
         d.monto_bs::float8 as monto_bs, d.cantidad::float8 as cantidad,
         d.descripcion, d.registrado_por, u.nombre_completo as registrado_por_nombre,
         d.creado_en
    from donaciones d
    join usuarios u on u.id = d.registrado_por`

export function crearDonacionesRepository(pool) {
  return {
    async listar() {
      const { rows } = await pool.query(`${SELECT_DONACION} order by d.fecha desc, d.id desc`)
      return rows
    },

    async obtener(id) {
      const { rows } = await pool.query(`${SELECT_DONACION} where d.id = $1`, [id])
      return rows[0] ?? null
    },

    async crear(donacion, registradoPor) {
      const { rows } = await pool.query(
        `insert into donaciones (fecha, donante, contacto, tipo, monto_bs, cantidad, descripcion, registrado_por)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning id`,
        [
          donacion.fecha,
          donacion.donante,
          donacion.contacto,
          donacion.tipo,
          donacion.monto_bs ?? null,
          donacion.cantidad ?? null,
          donacion.descripcion,
          registradoPor,
        ],
      )
      return rows[0].id
    },
  }
}