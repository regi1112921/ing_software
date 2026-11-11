// Tabla propia: solicitudes_publicas (pre-solicitudes del catálogo público, HU-09).

const COLUMNAS = `s.id, s.perro_id, p.nombre as perro_nombre, p.foto_url as perro_foto_url, p.estado as perro_estado,
                  s.nombre_completo, s.telefono, s.correo, s.mensaje, s.estado, s.solicitud_id,
                  s.revisado_por, u.nombre_completo as revisado_por_nombre, s.revisado_en, s.creado_en`

const DESDE = `from solicitudes_publicas s
               join perros p on p.id = s.perro_id
               left join usuarios u on u.id = s.revisado_por`

export function crearSolicitudesPublicasRepository(pool) {
  return {
    async crear({ perro_id, nombre_completo, telefono, correo, mensaje }) {
      const { rows } = await pool.query(
        `insert into solicitudes_publicas (perro_id, nombre_completo, telefono, correo, mensaje)
         values ($1, $2, $3, $4, $5)
         returning id, creado_en`,
        [perro_id, nombre_completo, telefono, correo, mensaje],
      )
      return rows[0]
    },

    // Evita que la misma persona envíe dos veces la misma solicitud.
    async existePendiente(perroId, telefono) {
      const { rowCount } = await pool.query(
        "select 1 from solicitudes_publicas where perro_id = $1 and telefono = $2 and estado = 'pendiente'",
        [perroId, telefono],
      )
      return rowCount > 0
    },

    // Pendientes primero; dentro de cada estado, la más reciente primero.
    async listar({ estado }) {
      const { rows } = await pool.query(
        `select ${COLUMNAS} ${DESDE}
          where ($1::text is null or s.estado = $1)
          order by (s.estado = 'pendiente') desc, s.creado_en desc, s.id desc`,
        [estado ?? null],
      )
      return rows
    },

    async obtener(id) {
      const { rows } = await pool.query(`select ${COLUMNAS} ${DESDE} where s.id = $1`, [id])
      return rows[0] ?? null
    },

    // Bloquea la fila dentro de una transacción (para convertirla o descartarla).
    async obtenerParaActualizar(cliente, id) {
      const { rows } = await cliente.query('select id, perro_id, estado from solicitudes_publicas where id = $1 for update', [id])
      return rows[0] ?? null
    },

    async descartar(cliente, id, revisadoPor) {
      await cliente.query(
        "update solicitudes_publicas set estado = 'descartada', revisado_por = $2, revisado_en = now() where id = $1",
        [id, revisadoPor],
      )
    },

    async convertir(cliente, id, solicitudId, revisadoPor) {
      await cliente.query(
        `update solicitudes_publicas
            set estado = 'convertida', solicitud_id = $2, revisado_por = $3, revisado_en = now()
          where id = $1`,
        [id, solicitudId, revisadoPor],
      )
    },
  }
}
