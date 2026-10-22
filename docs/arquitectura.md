# Arquitectura

## Visión general

```
┌──────────────────────────────── FRONTEND (React) ─────────────────────────────────┐
│  Inicio de sesión     Perros / Adopciones      Historial médico       Dashboard   │
└──────┬──────────────────────────┬──────────────────────┬───────────────────┬──────┘
       │ /api/autenticacion       │ /api/adopcion        │ /api/veterinaria  │ /api/dashboard
┌──────▼─────────────┐ ┌──────────▼─────────┐ ┌──────────▼─────────┐ ┌───────▼────────────┐
│ Autenticación :3004│ │ Adopción :3002     │ │ Veterinaria :3001  │ │ Dashboard :3003    │
│ login, logout,     │◄┤ perros, catálogos, │ │ consultas          │ │ indicadores        │
│ sesiones           │◄┤ adoptantes,        │ │                    │ │ (solo lectura)     │
│                    │◄┤ adopciones         │ │                    │ │                    │
└──────┬─────────────┘ └──────────┬─────────┘ └──────────┬─────────┘ └───────┬────────────┘
       │      cada servicio valida el token con GET /auth/sesion (◄)         │
┌──────▼──────────────────────────▼──────────────────────▼───────────────────▼──────┐
│                    BASE DE DATOS (PostgreSQL en Supabase, esquema public)          │
│  usuarios · perros · razas · tamanos · estados_perro · adoptantes ·                │
│  solicitudes_adopcion · estados_solicitud · consultas · vacunas · v_perros          │
└────────────────────────────────────────────────────────────────────────────────────┘
```

Cada servicio es una aplicación Node.js + Express independiente, con su propio puerto. Comparten la misma
base de datos, pero **cada tabla tiene un único servicio dueño**, que es el único que la modifica.

## Propiedad de las tablas

| Tabla / vista | Servicio dueño (escribe) | Otros servicios (solo lectura) |
|---------------|--------------------------|--------------------------------|
| `usuarios` | Autenticación | Veterinaria (veterinarios responsables) |
| `perros`, `razas`, `tamanos`, `estados_perro` | Adopción | Veterinaria (existencia del perro), Dashboard |
| `adoptantes`, `solicitudes_adopcion`, `estados_solicitud` | Adopción | — |
| `consultas` | Veterinaria | — |
| `vacunas` | Veterinaria | — (sin endpoints: no hay RF de vacunas) |
| `v_perros` (vista) | — | Adopción, Dashboard |

El estado del perro pasa a *En proceso de adopción*, *Adoptado* o vuelve a *Disponible* mediante triggers de
la BD cuando Adopción cambia una adopción (RF-18, RF-19, RF-20), dentro de la misma transacción.

## Responsabilidades de cada servicio

| Servicio | Historias | Responsabilidad |
|----------|-----------|-----------------|
| Autenticación | HU-02, HU-03 | Inicio y cierre de sesión. Emite tokens y los valida para los demás servicios. |
| Adopción | HU-04 a HU-07, HU-10 a HU-12 | Registro, edición, listado y ficha de perros; catálogos; registro, consulta y estados de las adopciones. |
| Veterinaria | HU-08, HU-09 | Historial médico y registro de atenciones. |
| Dashboard | HU-13, HU-14 | Indicadores por estado y perros en tratamiento. No escribe datos. |

## Sesión

1. El frontend llama a `POST /auth/login` y recibe un token.
2. Envía el token en cada petición: `Authorization: Bearer <token>`.
3. Cada servicio pregunta al de Autenticación si el token es válido (`GET /auth/sesion`).
4. `POST /auth/logout` borra la sesión: desde ese momento ningún servicio la acepta (HU-03).

Las sesiones viven en memoria del servicio de Autenticación (duran `SESION_HORAS`); si se reinicia, hay
que volver a iniciar sesión. No requiere tablas nuevas.

## Capas dentro de cada servicio

```
routes/        → Define las URLs
controllers/   → Lee la petición HTTP y devuelve la respuesta
services/      → Lógica de negocio y validaciones
repositories/  → Consultas SQL a la base de datos
```

El flujo siempre es: `route → controller → service → repository → BD`.

## Estados

```
Perro:     disponible ⇄ en_tratamiento        (cambio manual, RF-06)
           disponible → en_adopcion → adoptado (lo asigna la adopción)
                ↑            │
                └─ rechazo ──┘

Adopción:  en_proceso → aprobada → finalizada
                │           │
                └──────────►└──► rechazada
```
