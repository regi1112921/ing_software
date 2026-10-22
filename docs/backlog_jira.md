# Backlog en Jira — HUELLAS

Proyecto Jira: **KAN – Ingenieria de Software** (https://ingdesoftware12.atlassian.net).

## Jerarquía

```
Épica (módulo)
├── RF-xx  Requisito funcional   (tipo Tarea, etiqueta requisito-funcional)  ─┐ enlace
└── HU-xx  Historia de usuario   (tipo Tarea, etiqueta historia-de-usuario)  ◄┘ "relates to"
    ├── Subtarea Backend
    ├── Subtarea Frontend
    └── Subtarea Pruebas
```

- Los RF y las HU están **al mismo nivel**, dentro de la épica de su módulo.
- Cada RF está **enlazado** ("relates to") con la o las HU que lo implementan.
- La clave `KAN-NN` la asigna Jira; el identificador del documento (`RF-01`, `HU-02`, `EP-01`) va al inicio del título.

Filtros útiles en Jira:
- Todos los RF: `project = KAN AND labels = requisito-funcional ORDER BY key`
- Todas las HU: `project = KAN AND labels = historia-de-usuario ORDER BY key`

## Matriz de trazabilidad

| Épica | RF | Historia de usuario | Subtareas (backend · frontend · pruebas) |
|-------|----|---------------------|-------------------------------------------|
| KAN-22 EP-01 Acceso al sistema | KAN-79 RF-01 | KAN-27 HU-02 Iniciar sesión | KAN-40 · KAN-41 · KAN-42 |
| | KAN-80 RF-02 | KAN-28 HU-03 Cerrar sesión | KAN-43 · KAN-44 · KAN-45 |
| KAN-23 EP-02 Gestión de perros | KAN-83 RF-05 | KAN-29 HU-04 Registrar perro | KAN-46 · KAN-47 · KAN-48 |
| | KAN-84 RF-06 | KAN-30 HU-05 Editar perro | KAN-49 · KAN-50 · KAN-51 |
| | KAN-85 RF-07, KAN-86 RF-08, KAN-87 RF-09 | KAN-31 HU-06 Listar, buscar y filtrar perros | KAN-52 · KAN-53 · KAN-54 |
| | KAN-88 RF-10 | KAN-32 HU-07 Ver detalle de un perro | KAN-55 · KAN-56 · KAN-57 |
| KAN-24 EP-03 Historial médico | KAN-89 RF-11 | KAN-33 HU-08 Consultar historial médico | KAN-58 · KAN-59 · KAN-60 |
| | KAN-90 RF-12 | KAN-34 HU-09 Registrar atención médica | KAN-61 · KAN-62 · KAN-63 |
| KAN-25 EP-04 Proceso de adopción | KAN-91 RF-13, KAN-92 RF-14, KAN-97 RF-19 | KAN-35 HU-10 Registrar adopción | KAN-64 · KAN-65 · KAN-66 |
| | KAN-93 RF-15, KAN-94 RF-16 | KAN-36 HU-11 Consultar adopciones | KAN-67 · KAN-68 · KAN-69 |
| | KAN-95 RF-17, KAN-96 RF-18, KAN-97 RF-19, KAN-98 RF-20 | KAN-37 HU-12 Actualizar estado de una adopción | KAN-70 · KAN-71 · KAN-72 |
| KAN-26 EP-05 Dashboard | KAN-81 RF-03 | KAN-38 HU-13 Ver indicadores del albergue | KAN-73 · KAN-74 · KAN-75 |
| | KAN-82 RF-04 | KAN-39 HU-14 Ver perros en tratamiento | KAN-76 · KAN-77 · KAN-78 |

**KAN-4 (HU-01: Base de datos del sistema)** se conservó sin cambios. Es el trabajo técnico del que dependen todas las historias.

El texto completo de los RF y el motivo de cada reformulación están en [requisitos_funcionales.md](requisitos_funcionales.md).
RF-19 se enlaza con dos historias porque se cumple al registrar la adopción (HU-10) y se mantiene al aprobarla (HU-12).
