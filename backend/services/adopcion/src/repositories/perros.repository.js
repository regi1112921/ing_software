// Tabla propia: perros (se lee a través de la vista v_perros, que agrega nombres y edad).

// Escapa % y _ para que la búsqueda los trate como texto.
const comoPatron = (texto) => `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

// Lo que el catálogo público puede mostrar (sin estado interno ni quién lo registró).
const COLUMNAS_PUBLICAS = `id, nombre, sexo, raza, tamano, tamano_nombre, color, foto_url,
                           edad_meses, fecha_nacimiento_estimada, fecha_ingreso`

export function crearPerrosRepository(pool) {
  return {
    async listar({ buscar, estado }) {
      const { rows } = await pool.query(
        `select * from v_perros
          where ($1::text is null or nombre ilike $1 or raza ilike $1)
            and ($2::text is null or estado = $2)
          order by nombre, id`,
        [buscar ? comoPatron(buscar) : null, estado ?? null],
      )
      return rows
    },

    async obtener(id) {
      const { rows } = await pool.query('select * from v_perros where id = $1', [id])
      return rows[0] ?? null
    },

    // HU-09 · Catálogo público: solo perros disponibles y solo datos que se pueden mostrar a cualquiera.
    // edadMin/edadMax en meses (null = sin límite); si hay filtro de edad, los de edad desconocida no salen.
    async listarPublicos({ tamano, sexo, edadMin, edadMax }) {
      const { rows } = await pool.query(
        `select ${COLUMNAS_PUBLICAS} from v_perros
          where estado = 'disponible'
            and ($1::text is null or tamano = $1)
            and ($2::text is null or sexo = $2)
            and ($3::int is null or edad_meses >= $3)
            and ($4::int is null or edad_meses <= $4)
          order by fecha_ingreso, id`,
        [tamano ?? null, sexo ?? null, edadMin ?? null, edadMax ?? null],
      )
      return rows
    },

    async obtenerPublico(id) {
      const { rows } = await pool.query(
        `select ${COLUMNAS_PUBLICAS} from v_perros where id = $1 and estado = 'disponible'`,
        [id],
      )
      return rows[0] ?? null
    },

    async crear(perro, registradoPor) {
      const { rows } = await pool.query(
        `insert into perros (nombre, sexo, raza_id, color, tamano, fecha_nacimiento, fecha_nacimiento_estimada,
                             fecha_ingreso, estado, foto_url, registrado_por)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         returning id`,
        [
          perro.nombre, perro.sexo, perro.raza_id, perro.color, perro.tamano, perro.fecha_nacimiento,
          perro.fecha_nacimiento_estimada, perro.fecha_ingreso, perro.estado, perro.foto_url, registradoPor,
        ],
      )
      return rows[0].id
    },

    // estado = null deja el estado como está.
    async actualizar(id, perro) {
      await pool.query(
        `update perros
            set nombre = $2, sexo = $3, raza_id = $4, color = $5, tamano = $6, fecha_nacimiento = $7,
                fecha_nacimiento_estimada = $8, fecha_ingreso = $9, foto_url = $10,
                estado = coalesce($11, estado)
          where id = $1`,
        [
          id, perro.nombre, perro.sexo, perro.raza_id, perro.color, perro.tamano, perro.fecha_nacimiento,
          perro.fecha_nacimiento_estimada, perro.fecha_ingreso, perro.foto_url, perro.estado,
        ],
      )
    },

    // Bloquea la fila del perro dentro de una transacción (registrar adopción).
    async obtenerParaAdopcion(cliente, id) {
      const { rows } = await cliente.query(
        `select p.id, p.estado, e.nombre as estado_nombre
           from perros p join estados_perro e on e.codigo = p.estado
          where p.id = $1
            for update of p`,
        [id],
      )
      return rows[0] ?? null
    },
  }
}
