# Guía de pruebas unitarias — HUELLAS

Esta guía explica qué pruebas unitarias tiene el backend, cómo se corren y cómo
presentarlas paso a paso.

**Resumen:** **228 pruebas unitarias** en 13 archivos. Cubren el **99.9 % de las líneas**
de la lógica del backend (los 5 microservicios y el módulo compartido). Corren en menos de
1 segundo, sin base de datos ni Docker. Se suman a las **199 pruebas de aceptación** que ya
existían.

---

## 1. Qué es una prueba unitaria (y en qué se diferencia de las otras)

| Tipo | Qué prueba | Qué necesita | Dónde está |
|------|------------|--------------|------------|
| **Unitaria** | **Una función sola**, aislada: reglas de negocio y validaciones | Nada: ni BD, ni red, ni servidor | `backend/test/unitarias/` |
| Aceptación (HU) | Un endpoint completo: HTTP → servicio → base de datos | PostgreSQL en memoria (PGlite) | `backend/test/*.test.js` |
| End-to-end | La API levantada con Docker, llamada desde Postman | Docker + Newman | `docs/api/` (job `api-e2e` del CI) |

Cada prueba unitaria sigue el patrón **Preparar → Ejecutar → Verificar** (*Arrange, Act, Assert*):

```js
it('antepone el código de país a un número local', () => {
  const resultado = telefonoWhatsapp('70012345')   // Ejecutar
  assert.equal(resultado, '59170012345')           // Verificar
})
```

### ¿Cómo se prueba sin base de datos? Con *dobles de prueba*

Los servicios reciben sus repositorios como parámetro (**inyección de dependencias**):

```js
export function crearAuthService({ usuarios, sesiones, bloqueo }) { ... }
```

En la prueba se les pasa un **repositorio falso** (un *mock*) que devuelve lo que la prueba
necesita y registra con qué datos lo llamaron:

```js
const usuarios = { buscarPorCorreo: mock.fn(async () => usuarioDePrueba), ... }
const servicio = crearAuthService({ usuarios, sesiones, bloqueo })

await servicio.iniciarSesion({ correo: 'ana@huellas.bo', contrasena: 'mala' })
// Verifica que se registró el intento fallido con el id correcto:
assert.deepEqual(usuarios.registrarIntentoFallido.mock.calls[0].arguments, [1, bloqueo])
```

Las herramientas son **las que trae Node.js**: `node:test` para las pruebas y los mocks, y
`node:assert` para las verificaciones. No hubo que instalar ninguna librería nueva.

Los dobles compartidos están en [`backend/test/unitarias/utilidades/dobles.js`](backend/test/unitarias/utilidades/dobles.js):

- `poolFalso()`: simula PostgreSQL y permite comprobar si hubo `commit` o `rollback`.
- `congelarFecha()`: fija "hoy" en 15/11/2026 10:00, para que las reglas de fechas den
  siempre el mismo resultado.
- `rechazaCon(accion, 400, { campos })`: comprueba que falle con el error HTTP y los campos esperados.

---

## 2. Qué está cubierto

| Archivo de prueba | Pruebas | Qué cubre | HU |
|---|---:|---|---|
| `autenticacion.test.js` | 18 | Login, bloqueo tras 3 intentos, registro, hash bcrypt, sesiones que expiran | HU-07 |
| `adopcion.perros.test.js` | 20 | Registrar / editar perros, edad estimada, estados manuales | HU-04, 05, 06, 07 |
| `adopcion.adopciones.test.js` | 25 | Solicitud de adopción, transiciones de estado, rollback, avisos, bandeja web | HU-09 a HU-13 |
| `adopcion.publico.test.js` | 31 | Catálogo público, campo trampa anti-bots, seguimientos, historias, fotos | HU-09, 10, 14 |
| `adopcion.utils.test.js` | 17 | WhatsApp, detección real de imágenes, subida a Supabase, permisos por rol | HU-07, 13 |
| `veterinaria.test.js` | 28 | Historial médico, vacunas, citas (horarios, choques, atender en transacción) | HU-08, 09, 11 |
| `dashboard.test.js` | 13 | Indicadores, filtro por periodo, reportes PDF y Excel | HU-12 a HU-15 |
| `voluntariado.test.js` | 15 | Voluntarios, calendario semanal, turnos (máx. 12 h, sin cruces), horas del mes | — |
| `shared.*.test.js` (5 archivos) | 61 | Validación, manejo de errores, config `.env`, sesión y roles, límite por IP, transacciones, app Express | Todas |
| **Total** | **228** | | |

**Cobertura** (de `npm run test:unit:cobertura`):

| | Líneas | Ramas | Funciones |
|---|---:|---:|---:|
| Todos los archivos medidos | **99.90 %** | **99.49 %** | **99.54 %** |
| Mínimo exigido (si baja, el CI falla) | 95 % | 90 % | 90 % |

Se mide la **lógica** (`services/*/src/services`, `utils`, `permisos.js` y `shared/src`).
Las rutas, los controladores y los repositorios SQL no se miden aquí: son "pegamento" con
Express y PostgreSQL, y los prueban las 199 pruebas de aceptación contra una base real.

---

## 3. Cómo correrlas

Requisito: Node.js 20 o superior. **No hace falta Docker.**

```powershell
cd backend
npm install
```

| Comando | Qué muestra |
|---|---|
| `npm run test:unit` | Cada prueba con ✔ o ✖, agrupada por servicio y por HU |
| `npm run test:unit:cobertura` | Lo mismo más la **tabla de cobertura** por archivo |
| `npm run test:unit:reporte` | Además genera `reporte-unitarias.xml` (formato JUnit, el estándar de la industria) |
| `npm test` | Las 199 pruebas de aceptación (con PostgreSQL en memoria) |
| `npm run test:todas` | Unitarias y después aceptación |

Para correr **un solo archivo** (útil en la demo):

```powershell
node --test test/unitarias/autenticacion.test.js
```

---

## 4. Guion para presentar al maestro (≈ 10 minutos)

### Paso 1 · Explicar la estrategia (1 min)
Muestra la tabla de la **sección 1**. Idea clave: *"Tenemos tres niveles de pruebas. Las
unitarias prueban la lógica sola, sin base de datos, y por eso corren en menos de un segundo."*

### Paso 2 · Mostrar una prueba por dentro (2 min)
Abre `backend/test/unitarias/autenticacion.test.js` y lee la prueba
**"avisa cuando queda un solo intento antes del bloqueo"**. Señala:
1. El **repositorio falso** (`armar(...)`): no hay base de datos.
2. La **acción**: `servicio.iniciarSesion(...)` con una contraseña incorrecta.
3. La **verificación**: espera un 401 con el texto *"Te queda 1 intento"*.

Relaciónala con su criterio de aceptación: **HU-07, la cuenta se bloquea tras 3 intentos fallidos**.

### Paso 3 · Correrlas en vivo (1 min)

```powershell
npm run test:unit
```

Al final se ve `tests 228 · pass 228 · fail 0` y una duración menor a 1 segundo.

### Paso 4 · Mostrar la cobertura (1 min)

```powershell
npm run test:unit:cobertura
```

Muestra la tabla: casi todo al 100 %. Explica que **el CI exige un mínimo de 95 %**: si
alguien agrega código sin pruebas, GitHub marca la entrega en rojo.

### Paso 5 · Demostrar que las pruebas detectan errores (2 min) ⭐
Es lo que más convence. **Rompe una regla a propósito**, en vivo:

1. Abre `backend/services/autenticacion/src/services/auth.service.js`.
2. En la línea `if (restantes === 1) {` cambia el `1` por un `2` y guarda.
3. Corre `node --test test/unitarias/autenticacion.test.js`.
4. Aparecen **2 pruebas en ✖** (`pass 16 · fail 2`), entre ellas *"avisa cuando queda un solo
   intento antes del bloqueo"*, con lo que esperaba y lo que recibió.
5. **Deshaz el cambio** (Ctrl+Z, guardar) y vuelve a correr: todo en ✔.

Otros errores que sirven para la demo:

| Archivo | Cambio | Prueba que falla |
|---|---|---|
| `adopcion/src/utils/avisos.js` | `CODIGO_PAIS = '591'` → `'592'` | 3 pruebas del teléfono y aviso de WhatsApp |
| `adopcion/src/services/adopciones.service.js` | En `TRANSICIONES`, agregar `'aprobada'` a `rechazada: []` | "impide transiciones no permitidas (RF-17)" |
| `veterinaria/src/services/citas.service.js` | En la regex de `hora`, cambiar `(00\|30)` por `\d\d` | "la hora debe ser en punto o y media" |

### Paso 6 · Mostrarlo en GitHub Actions (2 min)
1. Abre **github.com/regi1112921/ing_software → Actions → CI**, ejecución de la rama `feature/pruebas-unitarias`.
2. En la página de la ejecución (**Summary**) aparece la sección **"Pruebas unitarias del backend"**
   con el total de pruebas y la tabla de cobertura.
3. Abre el job **Backend · pruebas**: se ven los pasos *Pruebas unitarias* → *Cobertura* →
   *Pruebas de aceptación de las HU*, todos en verde.
4. Abajo, en **Artifacts**, se puede descargar `reporte-unitarias` (el XML JUnit).

Mensaje final: *"Cada push corre automáticamente las 228 unitarias, las 199 de aceptación y la
colección de Postman. Si algo se rompe, nos enteramos antes de que llegue a `main`."*

---

## 5. Preguntas que puede hacer el maestro

**¿Por qué `node:test` y no Jest?**
Viene incluido en Node.js 20+, así que no hay dependencias extra. Además, el proyecto ya lo
usaba en las pruebas de aceptación. Tiene lo mismo que hace falta aquí: `describe` / `it`,
mocks, reloj falso y cobertura.

**¿Cómo prueban algo que depende de la fecha de hoy?**
Con `mock.timers` se congela el reloj en el 15/11/2026 a las 10:00 (`congelarFecha()`). Así,
"no se puede agendar en el pasado" o "la fecha no puede ser futura" dan siempre el mismo resultado.

**¿Cómo prueban las transacciones sin base de datos?**
`poolFalso()` registra las sentencias. Una prueba comprueba que, si la regla falla a mitad de
camino, se ejecutó `begin → rollback` en vez de `begin → commit`. Por ejemplo: *"si la cita
cambió a mitad de camino, revierte la consulta"*.

**¿Qué no cubren las unitarias?**
Las consultas SQL y el cableado de Express. Eso lo verifican las pruebas de aceptación con
PostgreSQL en memoria y, de punta a punta, la colección de Postman con Docker.

**¿Cómo se agrega una prueba nueva?**
Se crea o abre un archivo `*.test.js` en `backend/test/unitarias/`, se importa la función, se
escribe un `it('qué debería pasar', () => { ... })` y se corre `npm run test:unit`.
