// Tabla propia: solicitudes_adopcion (en la API se llaman "adopciones").

const SELECT_ADOPCION = `
  select s.id, s.estado, es.nombre as estado_nombre,
         s.fecha_solicitud, s.fecha_aprobacion, s.fecha_rechazo, s.fecha_adopcion,
         s.observaciones, s.creado_en, s.actualizado_en,
         json_build_object(
           'id', p.id, 'nombre', p.nombre, 'raza', p.raza, 'sexo', p.sexo,
           'tamano', p.tamano, 'tamano_nombre', p.tamano_nombre,
           'edad_meses', p.edad_meses, 'fecha_nacimiento_estimada', p.fecha_nacimiento_estimada,
           'estado', p.estado, 'estado_nombre', p.estado_nombre, 'foto_url', p.foto_url
         ) as perro,
         json_build_object(
           'id', a.id, 'nombre_completo', a.nombre_completo, 'documento_identidad', a.documento_identidad,
           'telefono', a.telefono, 'direccion', a.direccion
         ) as adoptante
    from solicitudes_adopcion s
    join estados_solicitud es on es.codigo = s.estado
    join v_perros p on p.id = s.perro_id
    join adoptantes a on a.id = s.adoptante_id`

const ORDEN = 'order by s.fecha_solicitud desc, s.id desc'

export function crearAdopcionesRepository(pool) {
  return {
    async listar() {
      const { rows } = await pool.query(`${SELECT_ADOPCION} ${ORDEN}`)
      return rows
    },

    async obtener(id) {
      const { rows } = await pool.query(`${SELECT_ADOPCION} where s.id = $1`, [id])
      return rows[0] ?? null
    },

    // Adopción en curso o finalizada del perro (la que se muestra en su ficha).
    async vigenteDePerro(perroId) {
      const { rows } = await pool.query(
        `${SELECT_ADOPCION}
          where s.perro_id = $1 and s.estado in ('en_proceso', 'aprobada', 'finalizada')
          ${ORDEN} limit 1`,
        [perroId],
      )
      return rows[0] ?? null
    },

    async crear(cliente, { perro_id, adoptante_id, fecha_solicitud, observaciones }, registradoPor) {
      const { rows } = await cliente.query(
        `insert into solicitudes_adopcion (perro_id, adoptante_id, fecha_solicitud, observaciones, registrado_por)
         values ($1, $2, $3, $4, $5)
         returning id`,
        [perro_id, adoptante_id, fecha_solicitud, observaciones, registradoPor],
      )
      return rows[0].id
    },

    async obtenerParaActualizar(cliente, id) {
      const { rows } = await cliente.query(
        'select id, estado from solicitudes_adopcion where id = $1 for update',
        [id],
      )
      return rows[0] ?? null
    },

    // columnaFecha viene de una lista fija del servicio, nunca del usuario.
    async cambiarEstado(cliente, id, { estado, columnaFecha, fecha, observaciones }) {
      await cliente.query(
        `update solicitudes_adopcion
            set estado = $2,
                ${columnaFecha} = $3,
                observaciones = case
                  when $4::text is null then observaciones
                  when observaciones is null then $4
                  else observaciones || E'\\n\\n' || $4
                end
          where id = $1`,
        [id, estado, fecha, observaciones],
      )
    },
  }
}
