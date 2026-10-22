#!/bin/sh
# Inicializa la base local de Docker (solo la primera vez, con el volumen vacío):
# estructura de database/, datos de prueba y una contraseña de desarrollo
# para los usuarios de prueba (que vienen sin contraseña).
set -eu

psql_bd() {
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" "$@"
}

echo "[huellas] Creando estructura (database/instalar.sql)…"
cd /database
psql_bd -f instalar.sql

echo "[huellas] Cargando datos de prueba…"
psql_bd -f seeds/01_datos_prueba.sql

echo "[huellas] Asignando la contraseña de desarrollo a los usuarios de prueba…"
psql_bd -v contrasena="$CONTRASENA_DESARROLLO" <<'SQL'
create extension if not exists pgcrypto;
update usuarios set password_hash = crypt(:'contrasena', gen_salt('bf', 10));
SQL

echo "[huellas] Base lista."
