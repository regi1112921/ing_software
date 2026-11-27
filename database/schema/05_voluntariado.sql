-- =============================================================================
-- 05_voluntariado.sql — Voluntarios y turnos de apoyo (HU-16)
-- =============================================================================

create table voluntarios (
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

create index ix_voluntarios_activos on voluntarios (nombre_completo) where activo;

create trigger trg_voluntarios_actualizado_en
  before update on voluntarios
  for each row execute function fn_actualizar_timestamp();

create table turnos_voluntariado (
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

create index ix_turnos_fecha on turnos_voluntariado (fecha, hora_inicio);
create index ix_turnos_voluntario_fecha on turnos_voluntariado (voluntario_id, fecha);

comment on table voluntarios is 'Contactos y disponibilidad de las personas voluntarias (HU-16).';
comment on table turnos_voluntariado is 'Turnos asignados a voluntarios para organizar el apoyo diario.';
