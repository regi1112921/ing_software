// Tabla propia: notificaciones (HU-13 · avisos al adoptante). Es un registro: solo se inserta.

const COLUMNAS = `n.id, n.solicitud_id, n.tipo, n.canal, n.telefono, n.mensaje,
                  n.enviado_por, u.nombre_completo as enviado_por_nombre, n.enviado_en`

const DESDE = `from notificaciones n
               join usuarios u on u.id = n.enviado_por`

export function crearAvisosRepository(pool) {
  async function obtener(id) {
    const { rows } = await pool.query(`select ${COLUMNAS} ${DESDE} where n.id = $1`, [id])
    return rows[0] ?? null
  }

  return {
    // Del más reciente al más antiguo.
    async listarDeAdopcion(solicitudId) {
      const { rows } = await pool.query(
        `select ${COLUMNAS} ${DESDE} where n.solicitud_id = $1 order by n.enviado_en desc, n.id desc`,
        [solicitudId],
      )
      return rows
    },

    async crear({ solicitud_id, tipo, telefono, mensaje }, enviadoPor) {
      const { rows } = await pool.query(
        `insert into notificaciones (solicitud_id, tipo, telefono, mensaje, enviado_por)
         values ($1, $2, $3, $4, $5)
         returning id`,
        [solicitud_id, tipo, telefono, mensaje, enviadoPor],
      )
      return obtener(rows[0].id)
    },
  }
}
