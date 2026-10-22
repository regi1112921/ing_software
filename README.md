# Sistema de Gestión de Refugio de Animales

Sistema dividido en **tres capas independientes** y **tres servicios**:

| Capa | Carpeta | Tecnología |
|------|---------|------------|
| Frontend | [`frontend/`](frontend/) | React + Vite |
| Backend | [`backend/`](backend/) | Node.js + Express (un servidor por servicio) |
| Base de datos | [`database/`](database/) | PostgreSQL (scripts SQL) |

| Servicio | Puerto | Responsabilidad |
|----------|--------|-----------------|
| Veterinaria | 3001 | Consultas médicas, vacunas y tratamientos |
| Adopción | 3002 | Animales del refugio, adoptantes y solicitudes de adopción |
| Dashboard | 3003 | Estadísticas e indicadores (solo lectura) |

## Estructura

```
.
├── docs/                     Documentación de arquitectura
├── database/                 CAPA DE DATOS
│   ├── schema/               Tablas (una carpeta lógica por servicio)
│   ├── views/                Vistas usadas por el dashboard
│   └── seeds/                Datos de prueba
├── backend/                  CAPA DE LÓGICA
│   ├── shared/               Código común (conexión a BD, errores)
│   └── services/
│       ├── veterinaria/      Servicio de veterinaria
│       ├── adopcion/         Servicio de adopción
│       └── dashboard/        Servicio de dashboard
└── frontend/                 CAPA DE PRESENTACIÓN
    └── src/
        ├── api/              Un cliente HTTP por servicio
        ├── shared/           Componentes comunes (layout, tablas)
        └── modules/
            ├── veterinaria/
            ├── adopcion/
            └── dashboard/
```

## Estado del proyecto

El repositorio contiene **solo la estructura de carpetas y la documentación**.
Cada equipo implementa su capa siguiendo la guía de su carpeta:

| Capa | Guía |
|------|------|
| Frontend | [frontend/README.md](frontend/README.md) |
| Backend | [backend/README.md](backend/README.md) |
| Base de datos | [database/README.md](database/README.md) |

Las carpetas vacías tienen un archivo `.gitkeep` para que Git las conserve; se puede borrar
cuando la carpeta ya tenga archivos.

Las variables de entorno compartidas (puertos, conexión a la BD) están en `.env.example`:
cópialo a `.env` y ajusta los valores.

Más detalles en [docs/arquitectura.md](docs/arquitectura.md).
