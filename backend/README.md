# Capa de Backend (Node.js + Express)

Cada servicio es un **servidor independiente** con su propio puerto y su propio `package.json`.
El código común va en `shared/`. Esta es la estructura que debe tener cada parte:

```
shared/
  db.js          Conexión a PostgreSQL
  errors.js      Errores HTTP y manejador de errores
  createApp.js   Configuración base de Express (JSON, CORS, /health)

services/<servicio>/src/
  index.js       Arranca el servidor
  app.js         Registra las rutas del servicio
  routes/        URLs del servicio
  controllers/   Reciben la petición y responden
  services/      Lógica de negocio y validaciones
  repositories/  Consultas SQL
```

## Endpoints

### Veterinaria — http://localhost:3001
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET  | `/consultas?animalId=` | Lista consultas |
| POST | `/consultas` | Registra una consulta |
| GET  | `/vacunas?animalId=` | Lista vacunas |
| POST | `/vacunas` | Registra una vacuna |
| GET  | `/tratamientos?animalId=` | Lista tratamientos |
| POST | `/tratamientos` | Registra un tratamiento |
| GET  | `/animales/:id/historial` | Historial médico completo |
| PATCH | `/animales/:id/aptitud` | Marca si el animal es apto para adopción |

### Adopción — http://localhost:3002
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET  | `/animales?estado=` | Lista animales |
| GET  | `/animales/:id` | Detalle de un animal |
| POST | `/animales` | Registra el ingreso de un animal |
| PUT  | `/animales/:id` | Actualiza la ficha |
| GET  | `/adoptantes` | Lista adoptantes |
| POST | `/adoptantes` | Registra un adoptante |
| GET  | `/solicitudes?estado=` | Lista solicitudes |
| POST | `/solicitudes` | Crea una solicitud |
| PATCH | `/solicitudes/:id/aprobar` | Aprueba (animal pasa a `adoptado`) |
| PATCH | `/solicitudes/:id/rechazar` | Rechaza (animal vuelve a `disponible`) |

### Dashboard — http://localhost:3003
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/resumen` | Totales generales |
| GET | `/animales-por-estado` | Conteo por estado |
| GET | `/adopciones-por-mes` | Adopciones aprobadas por mes |
| GET | `/vacunas-proximas` | Vacunas que vencen en 30 días |
