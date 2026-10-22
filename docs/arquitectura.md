# Arquitectura

## Visión general

```
┌────────────────────────── FRONTEND (React) ──────────────────────────┐
│   Módulo Veterinaria     Módulo Adopción      Módulo Dashboard       │
└──────────┬───────────────────────┬───────────────────────┬───────────┘
           │ /api/veterinaria      │ /api/adopcion         │ /api/dashboard
┌──────────▼─────────┐  ┌──────────▼─────────┐  ┌──────────▼─────────┐
│ Servicio           │  │ Servicio           │  │ Servicio           │
│ Veterinaria :3001  │  │ Adopción :3002     │  │ Dashboard :3003    │
└──────────┬─────────┘  └──────────┬─────────┘  └──────────┬─────────┘
           │                       │                       │ (solo lectura)
┌──────────▼───────────────────────▼───────────────────────▼───────────┐
│                     BASE DE DATOS (PostgreSQL)                       │
│  animales · adoptantes · solicitudes_adopcion · consultas · vacunas  │
│  tratamientos · vistas del dashboard                                 │
└──────────────────────────────────────────────────────────────────────┘
```

## Responsabilidades de cada servicio

### Servicio de Veterinaria
- Registrar consultas médicas de un animal.
- Registrar vacunas aplicadas y próximas dosis.
- Registrar tratamientos en curso.
- Marcar si un animal está **apto para adopción** (salud).

### Servicio de Adopción
- Dueño de la tabla `animales` (ingreso al refugio, ficha, estado).
- Registrar adoptantes.
- Crear, aprobar o rechazar solicitudes de adopción.
- Regla: solo se puede aprobar una adopción si el animal está `apto_adopcion = true`.

### Servicio de Dashboard
- **No escribe** datos. Solo consulta vistas (`database/views`).
- Totales de animales por estado, adopciones por mes, vacunas próximas, etc.

## Capas dentro de cada servicio del backend

```
routes/        → Define las URLs (GET /consultas, POST /consultas...)
controllers/   → Lee la petición HTTP y devuelve la respuesta
services/      → Lógica de negocio y validaciones
repositories/  → Consultas SQL a la base de datos
```

El flujo siempre es: `route → controller → service → repository → BD`.
Así cada archivo tiene una sola responsabilidad y es fácil saber dónde cambiar algo.

## Estados de un animal

```
en_evaluacion → disponible → en_proceso_adopcion → adoptado
                    ↑                │
                    └── (rechazo) ───┘
```
