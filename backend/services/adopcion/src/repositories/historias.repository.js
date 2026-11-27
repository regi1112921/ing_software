// Tabla propia: historias_adopcion (HU-14 · historias de adopciones exitosas).
// No se borran: se ocultan (visible = false).

const COLUMNAS = `h.id, h.solicitud_id, h.titulo, h.relato, h.foto_url, h.fecha_publicacion, h.visible,
                  s.fecha_adopcion, s.perro_id, p.nombre as perro_nombre,
                  a.nombre_completo as adoptante_nombre,
                  h.publicado_por, u.nombre_completo as publicado_por_nombre, h.creado_en, h.actualizado_en`

const DESDE = `from historias_adopcion h
               join solicitudes_adopcion s on s.id = h.solicitud_id
               join perros p on p.id = s.perro_id
               join adoptantes a on a.id = s.adoptante_id
               join usuarios u on u.id = h.publicado_por`

// De la más reciente a la más antigua.
const ORDEN = 'order by h.fecha_publicacion desc, h.id desc'

// Lo que ve cualquier visitante: sin datos del adoptante ni del personal.
const COLUMNAS_PUBLICAS = `h.id, h.titulo, h.relato, h.foto_url, h.fecha_publicacion,
                           p.nombre as perro_nombre, s.fecha_adopcion`

// Campos que se pueden cambiar después de publicar.
const EDITABLES = ['titulo', 'relato', 'foto_url', 'fecha_publicacion', 'visible']

export function crearHistoriasRepository(pool) {
  async function obtener(id) {
    const { rows } = await pool.query(`select ${COLUMNAS} ${DESDE} where h.id = $1`, [id])
    return rows[0] ?? null
  }

  return {
    obtener,

    // Todas (visibles y ocultas) para el panel interno, o filtradas por visible.
    async listar({ visible } = {}) {
      const { rows } = await pool.query(
        `select ${COLUMNAS} ${DESDE} where ($1::boolean is null or h.visible = $1) ${ORDEN}`,
        [visible ?? null],
      )
      return rows
    },

    // Adopciones finalizadas que todavía no tienen historia.
    async candidatas() {
      const { rows } = await pool.query(
        `select s.id as solicitud_id, s.fecha_adopcion, s.perro_id, p.nombre as perro_nombre,
                p.foto_url as perro_foto_url, a.nombre_completo as adoptante_nombre
           from solicitudes_adopcion s
           join perros p on p.id = s.perro_id
           join adoptantes a on a.id = s.adoptante_id
          where s.estado = 'finalizada'
            and not exists (select 1 from historias_adopcion h where h.solicitud_id = s.id)
          order by s.fecha_adopcion desc, s.id desc`,
      )
      return rows
    },

    async crear({ solicitud_id, titulo, relato, foto_url, fecha_publicacion, visible }, publicadoPor) {
      const { rows } = await pool.query(
        `insert into historias_adopcion (solicitud_id, titulo, relato, foto_url, fecha_publicacion, visible, publicado_por)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id`,
        [solicitud_id, titulo, relato, foto_url, fecha_publicacion, visible, publicadoPor],
      )
      return obtener(rows[0].id)
    },

    // Actualiza solo los campos recibidos. Devuelve null si la historia no existe.
    async actualizar(id, cambios) {
      const editados = EDITABLES.filter((campo) => cambios[campo] !== undefined)
      if (editados.length === 0) return obtener(id)
      const asignaciones = editados.map((campo, i) => `${campo} = $${i + 2}`).join(', ')
      const { rowCount } = await pool.query(`update historias_adopcion set ${asignaciones} where id = $1`, [
        id,
        ...editados.map((campo) => cambios[campo]),
      ])
      return rowCount ? obtener(id) : null
    },

    // Sección pública: solo las visibles.
    async listarPublicas() {
      const { rows } = await pool.query(`select ${COLUMNAS_PUBLICAS} ${DESDE} where h.visible ${ORDEN}`)
      return rows
    },
  }
}
