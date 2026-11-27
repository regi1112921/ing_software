-- =============================================================================
-- 01_storage_fotos.sql — Bucket de Supabase Storage para las fotos subidas
--
-- SOLO para Supabase (el PostgreSQL de Docker no tiene el esquema storage).
-- Se ejecuta una vez en el SQL Editor del proyecto; volver a ejecutarlo no cambia nada.
--
--   Bucket "fotos": lectura pública (las fotos se muestran en el panel y en el
--   catálogo, y se pueden descargar con ?download), máximo 5 MB, solo JPG, PNG y WebP.
--   No se crean políticas de escritura: solo sube el backend, con la service_role key,
--   que no está sujeta a RLS. Desde el navegador nadie puede subir ni borrar.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
