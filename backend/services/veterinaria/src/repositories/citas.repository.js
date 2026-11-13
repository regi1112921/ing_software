// Tabla propia: citas (HU-11 · agenda de citas veterinarias).
// Lee perros y usuarios solo para mostrar nombres.

const COLUMNAS = `c.id, c.perro_id, p.nombre as perro_nombre, p.foto_url as perro_foto_url,
                  c.veterinario_id, u.nombre_completo as veterinario_nombre,
                  c.fecha, to_char(c.hora, 'HH24:MI') as hora, c.tipo, c.motivo, c.estado,
                  c.motivo_cancelacion, c.consulta_id, c.creado_en, c.actualizado_en`

const DESDE = `from citas c
               join perros   p on p.id = c.perro_id
               join usuarios u on u.id = c.veterinario_id`

export function crearCitasRepository(pool) {
  return {
    // Citas entre dos fechas (incluidas), en orden de calendario.
    async listar({ desde, hasta, veterinarioId, perroId, estado }) {
      const { rows } = await pool.query(
        `select ${COLUMNAS} ${DESDE}
          where c.fecha between $1 and $2
            and ($3::bigint is null or c.veterinario_id = $3)
            and ($4::bigint is null or c.perro_id = $4)
            and ($5::text is null or c.estado = $5)
          order by c.fecha, c.hora, c.id`,
        [desde, hasta, veterinarioId ?? null, perroId ?? null, estado ?? null],
      )
      return rows
    },

    async obtener(id, cliente = pool) {
      const { rows } = await cliente.query(`select ${COLUMNAS} ${DESDE} where c.id = $1`, [id])
      return rows[0] ?? null
    },

    // Cita vigente (no cancelada) que ya ocupa esa fecha y hora, sin contar excluirId.
    async ocupante(fecha, hora, excluirId = null) {
      const { rows } = await pool.query(
        `select ${COLUMNAS} ${DESDE}
          where c.fecha = $1 and c.hora = $2::time and c.estado <> 'cancelada'
            and ($3::bigint is null or c.id <> $3)`,
        [fecha, hora, excluirId],
      )
      return rows[0] ?? null
    },

    async crear(cita, registradoPor) {
      const { rows } = await pool.query(
        `insert into citas (perro_id, veterinario_id, fecha, hora, tipo, motivo, registrado_por)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id`,
        [cita.perro_id, cita.veterinario_id, cita.fecha, cita.hora, cita.tipo, cita.motivo, registradoPor],
      )
      return rows[0].id
    },

    // Solo cambia citas programadas: devuelve false si ya no lo estaba.
    async actualizar(id, cita) {
      const { rowCount } = await pool.query(
        `update citas
            set perro_id = $2, veterinario_id = $3, fecha = $4, hora = $5, tipo = $6, motivo = $7
          where id = $1 and estado = 'programada'`,
        [id, cita.perro_id, cita.veterinario_id, cita.fecha, cita.hora, cita.tipo, cita.motivo],
      )
      return rowCount === 1
    },

    async cancelar(id, motivoCancelacion) {
      const { rowCount } = await pool.query(
        `update citas set estado = 'cancelada', motivo_cancelacion = $2
          where id = $1 and estado = 'programada'`,
        [id, motivoCancelacion],
      )
      return rowCount === 1
    },

    // Dentro de la transacción de "atender": enlaza la consulta creada en el historial.
    async marcarAtendida(cliente, id, consultaId) {
      const { rowCount } = await cliente.query(
        `update citas set estado = 'atendida', consulta_id = $2
          where id = $1 and estado = 'programada'`,
        [id, consultaId],
      )
      return rowCount === 1
    },
  }
}
