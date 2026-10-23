# Una sola imagen para los cuatro servicios; docker-compose elige cuál arranca.
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache tzdata

# Primero solo los package.json: la capa de dependencias se reutiliza
# mientras no cambien.
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY services/autenticacion/package.json services/autenticacion/
COPY services/veterinaria/package.json services/veterinaria/
COPY services/adopcion/package.json services/adopcion/
COPY services/dashboard/package.json services/dashboard/
RUN npm ci --omit=dev && npm cache clean --force

COPY shared shared
COPY services services

USER node
CMD ["node", "services/autenticacion/src/index.js"]
