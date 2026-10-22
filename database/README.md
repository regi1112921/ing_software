# Capa de Base de Datos (PostgreSQL en Supabase)

El diseño completo (procesos, diagrama entidad-relación, diccionario de datos, decisiones
y preguntas abiertas) está en **[MODELO_DATOS.md](MODELO_DATOS.md)**. Es una propuesta y
todavía está pendiente de aprobación del equipo.

```
schema/      Tablas, restricciones y reglas (triggers), agrupadas por servicio dueño
views/       Datos calculados (edad del perro)
seguridad/   Permisos: bloquea la API pública de Supabase
seeds/       Datos ficticios de prueba
tests/       Verificaciones de restricciones y reglas (no dejan datos)
instalar.sql          Crea toda la estructura de una vez (solo con psql)
reset_desarrollo.sql  ⚠ Borra todas las tablas y datos
```

| Archivo | Dueño | Contenido |
|---------|-------|-----------|
| `schema/00_comun.sql` | Todos | Función que actualiza `actualizado_en` |
| `schema/01_catalogos.sql` | Todos | Catálogos `tamanos`, `estados_perro`, `estados_solicitud`, `razas` (con sus valores iniciales) |
| `schema/02_usuarios.sql` | Todos (autenticación) | `usuarios` |
| `schema/03_adopcion.sql` | Servicio de Adopción | `perros`, `adoptantes`, `solicitudes_adopcion` + reglas de estado |
| `schema/04_veterinaria.sql` | Servicio de Veterinaria | `consultas`, `vacunas` |
| `views/01_vistas.sql` | Todos (lectura) | `fn_edad_en_meses`, vista `v_perros` (con raza, tamaño y estado legibles) |
| `seguridad/01_permisos.sql` | — | RLS y revocación de `anon` / `authenticated` |
| `seeds/01_datos_prueba.sql` | — | 4 usuarios, 8 perros, 3 adoptantes, 3 solicitudes, 5 consultas, 6 vacunas |
| `tests/01_verificaciones.sql` | — | 52 verificaciones |

**Catálogos:** para agregar una raza basta con
`insert into razas (nombre) values ('Akita');`. Los estados y tamaños también son filas,
pero las reglas de adopción dependen de los 4 estados actuales: agregar uno exige revisar `03_adopcion.sql`.

**Regla:** cada servicio solo escribe en sus propias tablas. Hay una excepción: Veterinaria puede
cambiar `perros.estado` entre `disponible` y `en_tratamiento`. Los estados `en_adopcion` y `adoptado`
los asigna la base automáticamente según la solicitud de adopción.

---

## Orden de ejecución

1. `schema/00_comun.sql`
2. `schema/01_catalogos.sql`
3. `schema/02_usuarios.sql`
4. `schema/03_adopcion.sql`
5. `schema/04_veterinaria.sql`
6. `views/01_vistas.sql`
7. `seguridad/01_permisos.sql`
8. `seeds/01_datos_prueba.sql` *(opcional, solo en una base vacía)*
9. `tests/01_verificaciones.sql` *(opcional; termina en ROLLBACK, no deja datos)*

> La base de Supabase es **compartida por todo el equipo**. La estructura se crea **una sola vez**.
> Avisen en el grupo antes de crearla, cargar datos o resetearla.

### Opción A — SQL Editor de Supabase (sin instalar nada)

1. Entra al proyecto en [supabase.com](https://supabase.com) → **SQL Editor** → **New query**.
2. Copia el contenido del archivo 1, pégalo y pulsa **Run**.
3. Repite con cada archivo en el orden de arriba.
4. Al ejecutar las verificaciones, si todo está bien Supabase muestra *Success* sin errores
   (el SQL Editor puede no mostrar los mensajes `OK ...`). Si una falla, aparece un error que empieza por `FALLÓ`.

### Opción B — psql

La cadena de conexión está en Supabase → botón **Connect** → **Session pooler**. Contiene la
contraseña de la base: guárdala en tu `.env` y **nunca** la subas a Git.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/instalar.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/01_datos_prueba.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/tests/01_verificaciones.sql
```

### Empezar de cero (solo desarrollo)

`reset_desarrollo.sql` borra todas las tablas y datos del sistema. Después hay que repetir los pasos 1 a 8.

---

## Contraseñas de los usuarios de prueba

Los datos de prueba crean usuarios **sin contraseña** (`password_hash = NULL`), así que no pueden
iniciar sesión. La base solo acepta hashes bcrypt, nunca texto plano.

Cuando el backend tenga el login, la contraseña se asignará desde el backend (con `bcrypt`).
Mientras tanto, para asignar una contraseña de desarrollo desde el SQL Editor de Supabase,
usa la extensión `pgcrypto`, que viene activada en el esquema `extensions`:

```sql
update usuarios
   set password_hash = extensions.crypt('<tu contraseña de desarrollo>', extensions.gen_salt('bf', 10))
 where correo = 'maria.alvarado@peluchin.test';
```

No guardes ese `UPDATE` con la contraseña en ningún archivo del repositorio.

---

## Fotos de los perros

`perros.foto_url` guarda solo la **URL** de la imagen. La imagen se sube a **Supabase Storage**
(por ejemplo, a un bucket público `perros`) desde el backend, y se guarda la URL pública que devuelve
Storage. Los datos de prueba usan URLs de ejemplo de Unsplash.

---

## Permisos

- Solo el **backend** se conecta a la base (cadena de conexión del proyecto). El frontend nunca lo hace.
- `seguridad/01_permisos.sql` activa **RLS sin políticas** en todas las tablas y revoca los privilegios de
  los roles `anon` y `authenticated`. Así, la API pública de Supabase no puede leer ni escribir datos.
- Las claves `service_role` / `sb_secret_...` y la contraseña de la base son secretas: van solo en `.env`.
