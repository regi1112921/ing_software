-- =============================================================================
-- 2026-11-27_06_hu14_historias.sql — HU-14: Historias de adopciones exitosas
--
-- Se ejecuta UNA sola vez sobre una base que ya tiene 2026-11-27_05_hu13_avisos.sql.
-- Las instalaciones nuevas no la necesitan: schema/ ya incluye estos cambios.
--
--   Tabla historias_adopcion: foto y relato de una adopción finalizada (una por
--   adopción) para la sección pública. No se publica antes de la entrega del perro,
--   no se mueve a otra adopción y no se borra: se oculta con visible = false.
-- =============================================================================

begin;

create table historias_adopcion (
  id                bigint generated always as identity primary key,
  solicitud_id      bigint      not null references solicitudes_adopcion (id),
  titulo            text        not null,
  relato            text        not null,
  foto_url          text        not null,
  fecha_publicacion date        not null default current_date,
  visible           boolean     not null default true,
  publicado_por     bigint      not null references usuarios (id),
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),

  -- Una sola historia por adopción.
  constraint uq_historias_solicitud unique (solicitud_id),
  constraint ck_historias_titulo    check (btrim(titulo) <> '' and length(titulo) <= 120),
  constraint ck_historias_relato    check (btrim(relato) <> '' and length(relato) <= 2000),
  constraint ck_historias_foto_url  check (foto_url ~ '^https?://')
);

comment on table  historias_adopcion is 'HU-14: historias de adopciones exitosas (foto y relato) que se muestran en el catálogo público. No se borran: se ocultan.';
comment on column historias_adopcion.foto_url is 'URL pública de la foto del perro en su nuevo hogar. Se guarda solo la referencia, no la imagen.';
comment on column historias_adopcion.fecha_publicacion is 'Fecha con la que se ordena la sección pública (la más reciente primero).';
comment on column historias_adopcion.visible is 'false = oculta: no aparece en el catálogo público, pero se conserva.';

-- Sección pública: solo las visibles, de la más reciente a la más antigua.
create index ix_historias_publicas      on historias_adopcion (fecha_publicacion desc, id desc) where visible;
create index ix_historias_publicado_por on historias_adopcion (publicado_por);

create trigger trg_historias_actualizado_en
  before update on historias_adopcion
  for each row execute function fn_actualizar_timestamp();

-- La historia es de una adopción finalizada (perro entregado), no se publica antes
-- de la entrega, no se mueve a otra adopción y no se borra (se oculta).
create or replace function fn_validar_historia()
returns trigger
language plpgsql
as $$
declare
  v_estado         text;
  v_fecha_adopcion date;
begin
  if tg_op = 'DELETE' then
    raise exception 'Una historia no se borra: se oculta.'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE' and new.solicitud_id <> old.solicitud_id then
    raise exception 'No se puede mover una historia a otra adopción.'
      using errcode = 'check_violation';
  end if;

  select estado, fecha_adopcion into v_estado, v_fecha_adopcion
    from solicitudes_adopcion where id = new.solicitud_id;

  if v_estado is distinct from 'finalizada' then
    raise exception 'Solo se publican historias de adopciones finalizadas (estado actual: %).', coalesce(v_estado, 'inexistente')
      using errcode = 'check_violation';
  end if;
  if new.fecha_publicacion < v_fecha_adopcion then
    raise exception 'La historia no puede publicarse antes de la entrega del perro (%).', v_fecha_adopcion
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger trg_historias_validar
  before insert or update of solicitud_id, fecha_publicacion or delete on historias_adopcion
  for each row execute function fn_validar_historia();

-- Igual que el resto: sin acceso desde la Data API de Supabase.
alter table historias_adopcion enable row level security;
revoke execute on function fn_validar_historia() from public;

do $$
declare
  v_rol text;
begin
  foreach v_rol in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = v_rol) then
      execute format('revoke all on historias_adopcion from %I', v_rol);
      execute format('revoke all on all sequences in schema public from %I', v_rol);
      execute format('revoke execute on function fn_validar_historia() from %I', v_rol);
    end if;
  end loop;
end;
$$;

commit;
