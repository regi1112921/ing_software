-- =============================================================================
-- 02_adopcion.sql — Perros, adoptantes y solicitudes de adopción
-- Dueño: servicio de Adopción.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- perros
-- -----------------------------------------------------------------------------
create table perros (
  id                        bigint generated always as identity primary key,
  nombre                    text        not null,
  sexo                      text        not null,
  raza_id                   bigint      not null references razas (id),
  color                     text,
  tamano                    text        not null references tamanos (codigo),
  fecha_nacimiento          date,
  fecha_nacimiento_estimada boolean     not null default false,
  fecha_ingreso             date        not null default current_date,
  estado                    text        not null default 'disponible' references estados_perro (codigo),
  foto_url                  text,
  registrado_por            bigint      not null references usuarios (id),
  creado_en                 timestamptz not null default now(),
  actualizado_en            timestamptz not null default now(),

  constraint ck_perros_nombre check (btrim(nombre) <> ''),
  -- Sexo se deja como CHECK: son dos valores que no van a cambiar.
  constraint ck_perros_sexo   check (sexo in ('macho', 'hembra')),
  constraint ck_perros_nacimiento_antes_ingreso check (fecha_nacimiento is null or fecha_nacimiento <= fecha_ingreso),
  -- Solo puede ser "estimada" si hay una fecha que estimar.
  constraint ck_perros_nacimiento_estimada check (fecha_nacimiento is not null or not fecha_nacimiento_estimada),
  constraint ck_perros_foto_url check (foto_url is null or foto_url ~ '^https?://')
);

comment on table  perros is 'Perros que ingresan al albergue.';
comment on column perros.fecha_nacimiento_estimada is 'true si la fecha de nacimiento se calculó a partir de una edad aproximada.';
comment on column perros.estado is 'FK a estados_perro. disponible / en_tratamiento: se cambian a mano. en_adopcion / adoptado: los asigna la solicitud de adopción.';
comment on column perros.foto_url is 'URL pública de la foto (Supabase Storage u otra). Se guarda solo la referencia, no la imagen.';

create index ix_perros_estado         on perros (estado);
create index ix_perros_raza           on perros (raza_id);
create index ix_perros_tamano         on perros (tamano);
create index ix_perros_registrado_por on perros (registrado_por);

create trigger trg_perros_actualizado_en
  before update on perros
  for each row execute function fn_actualizar_timestamp();

-- -----------------------------------------------------------------------------
-- adoptantes
-- -----------------------------------------------------------------------------
create table adoptantes (
  id                  bigint generated always as identity primary key,
  nombre_completo     text        not null,
  documento_identidad text,
  telefono            text        not null,
  direccion           text        not null,
  registrado_por      bigint      not null references usuarios (id),
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),

  constraint uq_adoptantes_documento unique (documento_identidad),
  constraint ck_adoptantes_nombre    check (btrim(nombre_completo) <> ''),
  constraint ck_adoptantes_documento check (documento_identidad is null or btrim(documento_identidad) <> ''),
  constraint ck_adoptantes_telefono  check (telefono ~ '^\+?[0-9]{7,15}$'),
  constraint ck_adoptantes_direccion check (btrim(direccion) <> '')
);

comment on table  adoptantes is 'Personas que solicitan adoptar. Un adoptante puede tener varias solicitudes.';
comment on column adoptantes.documento_identidad is 'PROPUESTA (pendiente de confirmar): evita registrar dos veces a la misma persona.';

create index ix_adoptantes_registrado_por on adoptantes (registrado_por);

create trigger trg_adoptantes_actualizado_en
  before update on adoptantes
  for each row execute function fn_actualizar_timestamp();

-- -----------------------------------------------------------------------------
-- solicitudes_adopcion
-- Un mismo registro recorre las etapas del proceso:
--   en_proceso → aprobada → finalizada (perro entregado)
--   en_proceso → rechazada
--   aprobada   → rechazada
-- -----------------------------------------------------------------------------
create table solicitudes_adopcion (
  id               bigint generated always as identity primary key,
  perro_id         bigint      not null references perros (id),
  adoptante_id     bigint      not null references adoptantes (id),
  estado           text        not null default 'en_proceso' references estados_solicitud (codigo),
  fecha_solicitud  date        not null default current_date,
  fecha_aprobacion date,
  fecha_rechazo    date,
  fecha_adopcion   date,
  observaciones    text,
  registrado_por   bigint      not null references usuarios (id),
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),

  -- Cada estado exige exactamente las fechas que le corresponden.
  constraint ck_solicitudes_fechas_por_estado check (
    case estado
      when 'en_proceso' then fecha_aprobacion is null     and fecha_rechazo is null     and fecha_adopcion is null
      when 'aprobada'   then fecha_aprobacion is not null and fecha_rechazo is null     and fecha_adopcion is null
      when 'rechazada'  then                                  fecha_rechazo is not null and fecha_adopcion is null
      when 'finalizada' then fecha_aprobacion is not null and fecha_rechazo is null     and fecha_adopcion is not null
    end
  ),
  constraint ck_solicitudes_orden_fechas check (
        (fecha_aprobacion is null or fecha_aprobacion >= fecha_solicitud)
    and (fecha_rechazo    is null or fecha_rechazo    >= coalesce(fecha_aprobacion, fecha_solicitud))
    and (fecha_adopcion   is null or fecha_adopcion   >= fecha_aprobacion)
  )
);

comment on table  solicitudes_adopcion is 'Proceso de adopción de un perro por un adoptante, desde la solicitud hasta la entrega.';
comment on column solicitudes_adopcion.fecha_adopcion is 'Fecha de entrega del perro. Solo existe cuando la solicitud está finalizada.';

-- Regla confirmada: un perro solo puede tener una solicitud activa a la vez.
create unique index uq_solicitudes_activa_por_perro
  on solicitudes_adopcion (perro_id)
  where estado in ('en_proceso', 'aprobada');

-- Un perro solo puede ser adoptado una vez (no hay devoluciones definidas).
create unique index uq_solicitudes_finalizada_por_perro
  on solicitudes_adopcion (perro_id)
  where estado = 'finalizada';

-- Historial completo de solicitudes de un perro (incluye rechazadas).
create index ix_solicitudes_perro          on solicitudes_adopcion (perro_id, fecha_solicitud desc);
create index ix_solicitudes_adoptante      on solicitudes_adopcion (adoptante_id);
create index ix_solicitudes_estado         on solicitudes_adopcion (estado);
create index ix_solicitudes_registrado_por on solicitudes_adopcion (registrado_por);

create trigger trg_solicitudes_actualizado_en
  before update on solicitudes_adopcion
  for each row execute function fn_actualizar_timestamp();

-- -----------------------------------------------------------------------------
-- Reglas de coherencia entre el perro y su proceso de adopción
-- -----------------------------------------------------------------------------

-- Valida que una solicitud nueva o un cambio de estado siga el flujo permitido.
create or replace function fn_validar_solicitud()
returns trigger
language plpgsql
as $$
declare
  v_estado_perro text;
begin
  if tg_op = 'INSERT' then
    if new.estado <> 'en_proceso' then
      raise exception 'Una solicitud nueva debe empezar en estado en_proceso (recibido: %).', new.estado
        using errcode = 'check_violation';
    end if;

    select estado into v_estado_perro from perros where id = new.perro_id for update;
    if v_estado_perro is distinct from 'disponible' then
      raise exception 'El perro % no está disponible para adopción (estado actual: %).', new.perro_id, v_estado_perro
        using errcode = 'check_violation';
    end if;

  elsif tg_op = 'UPDATE' then
    if new.perro_id <> old.perro_id or new.adoptante_id <> old.adoptante_id then
      raise exception 'No se puede cambiar el perro ni el adoptante de una solicitud existente.'
        using errcode = 'check_violation';
    end if;

    if new.estado <> old.estado and not (
         (old.estado = 'en_proceso' and new.estado in ('aprobada', 'rechazada'))
      or (old.estado = 'aprobada'   and new.estado in ('finalizada', 'rechazada'))
    ) then
      raise exception 'Transición no permitida: % → %.', old.estado, new.estado
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_solicitudes_validar
  before insert or update on solicitudes_adopcion
  for each row execute function fn_validar_solicitud();

-- Actualiza el estado del perro según el estado de su solicitud.
create or replace function fn_sincronizar_estado_perro()
returns trigger
language plpgsql
as $$
declare
  v_nuevo_estado text;
begin
  v_nuevo_estado := case new.estado
    when 'en_proceso' then 'en_adopcion'
    when 'aprobada'   then 'en_adopcion'
    when 'finalizada' then 'adoptado'
    when 'rechazada'  then 'disponible'
  end;

  update perros
     set estado = v_nuevo_estado
   where id = new.perro_id
     and estado is distinct from v_nuevo_estado;

  return null;
end;
$$;

create trigger trg_solicitudes_sincronizar_perro
  after insert or update of estado on solicitudes_adopcion
  for each row execute function fn_sincronizar_estado_perro();

-- Impide poner a mano un estado que contradiga las solicitudes del perro.
create or replace function fn_validar_estado_perro()
returns trigger
language plpgsql
as $$
declare
  v_tiene_activa     boolean;
  v_tiene_finalizada boolean;
begin
  select
    coalesce(bool_or(estado in ('en_proceso', 'aprobada')), false),
    coalesce(bool_or(estado = 'finalizada'), false)
  into v_tiene_activa, v_tiene_finalizada
  from solicitudes_adopcion
  where perro_id = new.id;

  if new.estado = 'adoptado' and not v_tiene_finalizada then
    raise exception 'El perro % solo puede quedar adoptado mediante una solicitud finalizada.', new.id
      using errcode = 'check_violation';
  elsif new.estado = 'en_adopcion' and not v_tiene_activa then
    raise exception 'El perro % solo puede estar en adopción si tiene una solicitud activa.', new.id
      using errcode = 'check_violation';
  elsif new.estado in ('disponible', 'en_tratamiento') and (v_tiene_activa or v_tiene_finalizada) then
    raise exception 'El perro % tiene una solicitud activa o ya fue adoptado; no puede pasar a %.', new.id, new.estado
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger trg_perros_validar_estado
  before insert or update of estado on perros
  for each row execute function fn_validar_estado_perro();
