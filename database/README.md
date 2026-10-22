# Capa de Base de Datos (PostgreSQL)

```
schema/   Definición de tablas, agrupadas por el servicio que es "dueño" de ellas
views/    Vistas de solo lectura que consume el servicio de dashboard
seeds/    Datos de prueba para desarrollo
```

Archivos a crear:

| Archivo | Dueño | Tablas |
|---------|-------|--------|
| `schema/01_adopcion.sql` | Servicio de Adopción | `animales`, `adoptantes`, `solicitudes_adopcion` |
| `schema/02_veterinaria.sql` | Servicio de Veterinaria | `consultas`, `vacunas`, `tratamientos` |
| `views/01_dashboard.sql` | Servicio de Dashboard | vistas `v_*` |

**Regla:** cada servicio solo escribe en sus propias tablas. El dashboard solo lee vistas.

Orden de ejecución:

```bash
psql -U refugio -d refugio -f schema/01_adopcion.sql
psql -U refugio -d refugio -f schema/02_veterinaria.sql
psql -U refugio -d refugio -f views/01_dashboard.sql
psql -U refugio -d refugio -f seeds/01_datos_prueba.sql
```
