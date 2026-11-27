export function crearVoluntariosRepository(pool) {
  return {
    async listar() {
      const { rows } = await pool.query(
        `select id, nombre_completo, telefono, correo, disponibilidad, activo
           from voluntarios
          where activo
          order by nombre_completo, id`,
      )
      return rows
    },

    async crear(datos) {
      const { rows } = await pool.query(
        `insert into voluntarios (nombre_completo, telefono, correo, disponibilidad)
         values ($1, $2, $3, $4)
         returning id, nombre_completo, telefono, correo, disponibilidad, activo`,
        [datos.nombre_completo, datos.telefono, datos.correo, datos.disponibilidad],
      )
      return rows[0]
    },

    async obtenerActivoParaActualizar(cliente, id) {
      const { rows } = await cliente.query('select id from voluntarios where id = $1 and activo for update', [id])
      return rows[0] ?? null
    },

    async existeSolapamiento(cliente, { voluntario_id, fecha, hora_inicio, hora_fin }) {
      const { rowCount } = await cliente.query(
        `select 1
           from turnos_voluntariado
          where voluntario_id = $1
            and fecha = $2
            and hora_inicio < $4
            and hora_fin > $3
          limit 1`,
        [voluntario_id, fecha, hora_inicio, hora_fin],
      )
      return rowCount > 0
    },

    async crearTurno(cliente, datos) {
      const { rows } = await cliente.query(
        `insert into turnos_voluntariado (voluntario_id, fecha, hora_inicio, hora_fin, actividad)
         values ($1, $2, $3, $4, $5)
         returning id, voluntario_id, fecha, hora_inicio, hora_fin, actividad`,
        [datos.voluntario_id, datos.fecha, datos.hora_inicio, datos.hora_fin, datos.actividad],
      )
      return rows[0]
    },

    async calendario(desde, hasta) {
      const { rows } = await pool.query(
        `select t.id, t.voluntario_id, v.nombre_completo as voluntario_nombre, v.telefono,
                t.fecha, to_char(t.hora_inicio, 'HH24:MI') as hora_inicio,
                to_char(t.hora_fin, 'HH24:MI') as hora_fin, t.actividad
           from turnos_voluntariado t
           join voluntarios v on v.id = t.voluntario_id
          where t.fecha between $1 and $2
          order by t.fecha, t.hora_inicio, v.nombre_completo`,
        [desde, hasta],
      )
      return rows
    },

    async horasMensuales(desde, hasta) {
      const { rows } = await pool.query(
        `select v.id as voluntario_id, v.nombre_completo,
                coalesce(sum(extract(epoch from (t.hora_fin - t.hora_inicio)) / 3600), 0)::numeric(8, 2) as horas
           from voluntarios v
           left join turnos_voluntariado t
             on t.voluntario_id = v.id and t.fecha >= $1 and t.fecha < $2
          where v.activo
          group by v.id, v.nombre_completo
          order by v.nombre_completo, v.id`,
        [desde, hasta],
      )
      return rows
    },
  }
}
