-- HU-16 · Registro de voluntarios y turnos (aplicar a bases ya instaladas).
-- Aplicar después de las migraciones previas del esquema de adopción y veterinaria.

create table if not exists voluntarios (
  id              bigint generated always as identity primary key,
  nombre_completo text        not null,
  telefono        text        not null,
  correo          text,
  disponibilidad  text        not null,
  activo          boolean     not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  constraint ck_voluntarios_nombre check (btrim(nombre_completo) <> ''),
  constraint ck_voluntarios_telefono check (telefono ~ '^\+?[0-9]{7,15}$'),
  constraint ck_voluntarios_correo check (
    correo is null or (correo = lower(btrim(correo)) and correo ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
  ),
  constraint ck_voluntarios_disponibilidad check (btrim(disponibilidad) <> '')
);
create index if not exists ix_voluntarios_activos on voluntarios (nombre_completo) where activo;
drop trigger if exists trg_voluntarios_actualizado_en on voluntarios;
create trigger trg_voluntarios_actualizado_en
  before update on voluntarios
  for each row execute function fn_actualizar_timestamp();

create table if not exists turnos_voluntariado (
  id             bigint generated always as identity primary key,
  voluntario_id  bigint      not null references voluntarios (id),
  fecha          date        not null,
  hora_inicio    time        not null,
  hora_fin       time        not null,
  actividad      text        not null,
  creado_en      timestamptz not null default now(),
  constraint ck_turnos_horas check (hora_fin > hora_inicio and hora_fin - hora_inicio <= interval '12 hours'),
  constraint ck_turnos_actividad check (btrim(actividad) <> '')
);
create index if not exists ix_turnos_fecha on turnos_voluntariado (fecha, hora_inicio);
create index if not exists ix_turnos_voluntario_fecha on turnos_voluntariado (voluntario_id, fecha);

alter table voluntarios enable row level security;
alter table turnos_voluntariado enable row level security;

do $$
declare
  v_rol text;
begin
  foreach v_rol in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = v_rol) then
      execute format('revoke all on voluntarios, turnos_voluntariado from %I', v_rol);
      execute format('revoke all on sequence voluntarios_id_seq, turnos_voluntariado_id_seq from %I', v_rol);
    end if;
  end loop;
end;
$$;
