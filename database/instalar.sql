-- =============================================================================
-- instalar.sql — Crea toda la estructura en una base vacía (solo con psql)
--
--   psql "<cadena de conexión>" -v ON_ERROR_STOP=1 -f database/instalar.sql
--
-- En el SQL Editor de Supabase no funciona \ir: ahí se ejecuta cada archivo
-- en este mismo orden (ver database/README.md).
-- =============================================================================

\set ON_ERROR_STOP on

begin;
\ir schema/00_comun.sql
\ir schema/01_catalogos.sql
\ir schema/02_usuarios.sql
\ir schema/03_adopcion.sql
\ir schema/04_veterinaria.sql
\ir views/01_vistas.sql
\ir seguridad/01_permisos.sql
commit;
