# huellas-frontend

React 19 + TypeScript + Vite + React Router + Tailwind CSS v4. Ya no corre dentro de Figma Make;
el mockup original está en `mockup/` solo como referencia.

## Desarrollo

- `npm run dev` levanta Vite en http://localhost:5173 con proxy `/api/<servicio>` al backend (puertos 3001–3004).
- `npm run build` revisa tipos y compila. En Docker, `Dockerfile` + `nginx.conf` sirven `dist/`.

## Estructura

Ver `README.md` (secciones 3 y 4). Resumen:

- `src/api/` — un cliente por servicio sobre `http.ts`; tipos en `tipos.ts`.
- `src/shared/` — componentes, hooks, sesión y utilidades comunes.
- `src/modules/<servicio>/pages|components` — un módulo no importa archivos de otro; `App.tsx` compone.

## Estilo de código

- Nombres y textos en español; componentes con export default, un componente por archivo.
- Comillas simples, sin punto y coma, 2 espacios. Alias `@/` para `src/`.
- Estilos con clases de Tailwind; colores `forest-*` y `warm-*` definidos en `src/index.css`.
