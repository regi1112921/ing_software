# Requisitos funcionales — HUELLAS

> Fuente original: SRS HUELLAS (UCB - SIS-213, ISO/IEC/IEEE 29148:2018).
> Esta versión **reformula** los RF que no coincidían con la base de datos ya implementada
> (`database/`), priorizando **no cambiar la base de datos**. Cada cambio indica el texto original y el motivo.
> Pendiente de aprobación del equipo y de actualización en el SRS.

| Marca | Significado |
|-------|-------------|
| **Sin cambios** | Se conserva el texto original |
| **Reformulado** | Se ajusta la redacción para que coincida con la BD y los mockups |
| **Nuevo** | Regla que ya existe en el mockup y en la BD, pero faltaba en el SRS |

## Tabla de requisitos

| ID | Descripción | Fuente | Prioridad | Estabilidad | Verificación | Cambio |
|----|-------------|--------|-----------|-------------|--------------|--------|
| RF-01 | El sistema debe autenticar al personal autorizado mediante su **correo electrónico (usuario)** y contraseña antes de permitir el acceso a las funciones internas. | Mockups / Minuta | Must | Firme | Prueba funcional de inicio de sesión | Reformulado |
| RF-02 | El sistema debe permitir al usuario autenticado cerrar su sesión y finalizar el acceso al sistema. | Mockups | Must | Firme | Prueba funcional de cierre de sesión | Sin cambios |
| RF-03 | El sistema debe mostrar en el dashboard los indicadores: total de perros, perros disponibles, perros en tratamiento, perros en proceso de adopción y perros adoptados. | Minuta / Mockups | Must | Firme | Prueba funcional de dashboard | Sin cambios |
| RF-04 | El sistema debe mostrar en el dashboard una lista breve de perros cuyo estado sea "En tratamiento", con acceso a su detalle. | Minuta / Mockups | Should | Estable | Prueba funcional de dashboard | Sin cambios |
| RF-05 | El sistema debe permitir registrar un perro con nombre, raza, sexo, tamaño y fecha de ingreso como datos obligatorios, y fecha de nacimiento (exacta o estimada a partir de la edad), color y foto como datos opcionales. El estado inicial solo puede ser "Disponible" o "En tratamiento". | Minuta / Alcance | Must | Firme | Prueba funcional de registro | Reformulado |
| RF-06 | El sistema debe permitir editar la información general de un perro registrado. El estado solo se puede cambiar manualmente entre "Disponible" y "En tratamiento", y únicamente si el perro no tiene una adopción en curso o finalizada. | Alcance | Must | Firme | Prueba funcional de edición | Reformulado |
| RF-07 | El sistema debe mostrar un listado de perros con foto, nombre, raza, sexo, edad, estado y una acción para abrir el detalle. | Mockups | Must | Firme | Prueba funcional de listado | Sin cambios |
| RF-08 | El sistema debe permitir buscar perros por nombre o raza desde el listado de perros. | Mockups | Must | Firme | Prueba funcional de búsqueda | Sin cambios |
| RF-09 | El sistema debe permitir filtrar el listado de perros por estado: Disponible, En tratamiento, En proceso de adopción o Adoptado. | Minuta / Mockups | Must | Firme | Prueba funcional de filtros | Sin cambios |
| RF-10 | El sistema debe mostrar el detalle de un perro con su foto, información general, estado, fecha de ingreso y las pestañas Información, Historial médico y Adopción. | Mockups | Must | Firme | Prueba funcional de detalle | Sin cambios |
| RF-11 | El sistema debe permitir consultar, desde el detalle de un perro, su historial médico en orden cronológico, **de la atención más reciente a la más antigua**. | Minuta / Alcance | Must | Firme | Prueba funcional de consulta | Reformulado |
| RF-12 | El sistema debe permitir registrar una atención médica asociada a un perro, incluyendo fecha, motivo de consulta, diagnóstico, tratamiento, observaciones y veterinario responsable, **seleccionado entre los usuarios con rol veterinario**. | Minuta / Alcance | Must | Firme | Prueba funcional de registro médico | Reformulado |
| RF-13 | El sistema debe permitir iniciar un proceso de adopción únicamente para un perro cuyo estado actual sea "Disponible". | Minuta / Alcance | Must | Firme | Prueba de regla de negocio | Sin cambios |
| RF-14 | El sistema debe permitir registrar una adopción con el perro, la persona adoptante (nombre completo, teléfono, dirección y, opcionalmente, documento de identidad), la **fecha de solicitud** y observaciones. **Toda adopción se registra en estado "En proceso".** | Minuta / Alcance | Must | Firme | Prueba funcional de registro | Reformulado |
| RF-15 | El sistema debe mostrar una lista de adopciones con perro, adoptante, teléfono, fecha **de solicitud**, estado y una acción para consultar el detalle. | Mockups | Must | Firme | Prueba funcional de listado | Reformulado |
| RF-16 | El sistema debe mostrar el detalle de una adopción con la información del perro, información del adoptante, **fechas de cada etapa (solicitud, aprobación, rechazo o adopción)**, estado y observaciones. | Mockups | Must | Firme | Prueba funcional de detalle | Reformulado |
| RF-17 | El sistema debe permitir actualizar el estado de una adopción utilizando únicamente los valores En proceso, Aprobada, Rechazada o Finalizada, **con estas transiciones: En proceso → Aprobada o Rechazada; Aprobada → Finalizada o Rechazada. Una adopción Rechazada o Finalizada no cambia de estado.** | Minuta / Alcance | Must | Firme | Prueba funcional de estados | Reformulado |
| RF-18 | Cuando una adopción cambie al estado "Finalizada", el sistema debe actualizar el estado del perro asociado a "Adoptado". | Regla de negocio acordada | Must | Firme | Prueba de integración adopción-perro | Sin cambios |
| RF-19 | Cuando se registre una adopción en estado "En proceso", el sistema debe reflejar al perro asociado con el estado "En proceso de adopción", **que se mantiene mientras la adopción esté En proceso o Aprobada**. | Mockups / Regla de negocio | Must | Estable | Prueba de integración adopción-perro | Reformulado |
| RF-20 | Cuando una adopción cambie al estado "Rechazada", el sistema debe devolver al perro asociado al estado "Disponible". | Mockups / Regla de negocio | Must | Estable | Prueba de integración adopción-perro | **Nuevo** |

## Motivo de cada cambio

| RF | Texto original (resumido) | Motivo |
|----|---------------------------|--------|
| RF-01 | "mediante usuario y contraseña" | El mockup y la BD usan el correo como usuario (`usuarios.correo`). |
| RF-05 | Registrar con "edad o fecha de nacimiento" y "estado", sin indicar obligatorios | La BD guarda la fecha de nacimiento con una marca de estimada (`fecha_nacimiento_estimada`), así que la edad se convierte en fecha estimada. Si se pudiera registrar "Adoptado" o "En proceso de adopción" a mano, habría perros adoptados sin adopción, lo que contradice RF-18 y RF-19; la BD lo impide. Los obligatorios son los del mockup. |
| RF-06 | "editar la información general y el estado" | Misma razón que RF-05: los estados de adopción los asignan RF-18, RF-19 y RF-20. |
| RF-11 | "en orden cronológico" | Se precisa el sentido del orden, como en el mockup. |
| RF-12 | "veterinario responsable" (texto libre en el mockup) | La BD lo guarda como un usuario con rol veterinario (`consultas.veterinario_id`); escribirlo como texto exigiría cambiar la BD. |
| RF-14 | "fecha de adopción ... y estado" | Al registrar, la adopción todavía no ocurrió: se guarda `fecha_solicitud`, y `fecha_adopcion` se completa al finalizar. La BD obliga a que toda adopción empiece En proceso, lo que coincide con RF-19. El adoptante es una entidad propia en la BD (`adoptantes`). |
| RF-15 | "fecha" | Se precisa cuál de las fechas se muestra. |
| RF-16 | "fecha" | La BD guarda una fecha por etapa (`fecha_solicitud`, `fecha_aprobacion`, `fecha_rechazo`, `fecha_adopcion`). |
| RF-17 | Solo los valores permitidos | La BD restringe las transiciones (`fn_validar_solicitud`); permitir cualquier cambio exigiría modificarla. |
| RF-19 | Solo el caso "En proceso" | Se aclara que *Aprobada* mantiene al perro En proceso de adopción, como hacen el mockup y la BD. |
| RF-20 | — | El mockup y la BD ya devuelven el perro a Disponible al rechazar (`fn_sincronizar_estado_perro`), pero ningún RF lo indicaba. |

## Elementos de la BD sin RF (se conservan sin cambios)

- `vacunas`: no hay RF de vacunas; la tabla queda disponible para un RF futuro.
- `usuarios.rol` (administrador, veterinario, personal): RF-12 usa el rol veterinario; los permisos por rol no están en el SRS.
- `adoptantes.documento_identidad`: opcional; RF-14 lo menciona como opcional.
