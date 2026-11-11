# 1) Compila el catálogo con Vite.
FROM node:22-alpine AS compilacion
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2) Sirve los archivos estáticos con nginx, que además redirige /api/adopcion/* al servicio.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/dist /usr/share/nginx/html
EXPOSE 80
