// Tabla propia: seguimientos_adopcion (HU-10). Lee la vista v_seguimiento_adopciones.

const COLUMNAS = `g.id, g.solicitud_id, g.fecha, g.tipo, g.observaciones, g.con_problemas,
                  g.registrado_por, u.nombre_completo as registrado_por_nombre, g.creado_en, g.actualizado_en`

const DESDE = `from seguimientos_adopcion g
               join usuarios u on u.id = g.registrado_por`

export function crearSeguimientosRepository(pool) {
  async function obtener(id) {
    const { rows } = await pool.query(`select ${COLUMNAS} ${DESDE} where g.id = $1`, [id])
    return rows[0] ?? null
  }

  return {
    obtener,

    // Del más reciente al más antiguo.
    async listarDeAdopcion(solicitudId) {
      const { rows } = await pool.query(
        `select ${COLUMNAS} ${DESDE} where g.solicitud_id = $1 order by g.fecha desc, g.id desc`,
        [solicitudId],
      )
      return rows
    },

    async crear({ solicitud_id, fecha, tipo, observaciones, con_problemas }, registradoPor) {
      const { rows } = await pool.query(
        `insert into seguimientos_adopcion (solicitud_id, fecha, tipo, observaciones, con_problemas, registrado_por)
         values ($1, $2, $3, $4, $5, $6)
         returning id`,
        [solicitud_id, fecha, tipo, observaciones, con_problemas, registradoPor],
      )
      return obtener(rows[0].id)
    },

    // Devuelve null si el seguimiento no existe o es de otra adopción.
    async marcarProblemas(solicitudId, id, conProblemas) {
      const { rowCount } = await pool.query(
        'update seguimientos_adopcion set con_problemas = $3 where id = $2 and solicitud_id = $1',
        [solicitudId, id, conProblemas],
      )
      return rowCount ? obtener(id) : null
    },

    // Adopciones finalizadas cuyo último seguimiento (o la entrega, si no hay) tiene más de `dias` días.
    async sinSeguimiento({ dias }) {
      const { rows } = await pool.query(
        `select * from v_seguimiento_adopciones
          where ultimo_seguimiento is null or ultimo_seguimiento < current_date - $1::int
          order by dias_sin_seguimiento desc, solicitud_id`,
        [dias],
      )
      return rows
    },

    // Seguimientos marcados con problemas (pendientes de revisión), el más reciente primero.
    async conProblemas() {
      const { rows } = await pool.query(
        `select ${COLUMNAS}, s.perro_id, p.nombre as perro_nombre, p.foto_url as perro_foto_url,
                a.nombre_completo as adoptante_nombre, a.telefono as adoptante_telefono
           ${DESDE}
           join solicitudes_adopcion s on s.id = g.solicitud_id
           join perros p on p.id = s.perro_id
           join adoptantes a on a.id = s.adoptante_id
          where g.con_problemas
          order by g.fecha desc, g.id desc`,
      )
      return rows
    },
  }
}
