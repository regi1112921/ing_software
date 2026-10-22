-- =============================================================================
-- 01_catalogos.sql — Tablas de valores de referencia
--
-- tamanos, estados_perro y estados_solicitud usan un código de texto como
-- clave (ej. 'disponible'): es estable, legible en el SQL y en la API, y
-- el nombre que se muestra en pantalla se puede cambiar sin tocar los datos.
-- razas usa un id numérico porque el equipo agregará y corregirá razas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- tamanos
-- -----------------------------------------------------------------------------
create table tamanos (
  codigo text     primary key,
  nombre text     not null,
  orden  smallint not null,

  constraint uq_tamanos_nombre unique (nombre),
  constraint uq_tamanos_orden  unique (orden),
  constraint ck_tamanos_codigo check (codigo ~ '^[a-z_]+$')
);

comment on table tamanos is 'Catálogo de tamaños de perro. orden define cómo se listan en pantalla.';

insert into tamanos (codigo, nombre, orden) values
  ('pequeno', 'Pequeño', 1),
  ('mediano', 'Mediano', 2),
  ('grande',  'Grande',  3);

-- -----------------------------------------------------------------------------
-- estados_perro
-- Las reglas de 03_adopcion.sql dependen de estos 4 códigos. Para agregar un
-- estado nuevo hay que revisar también esas reglas.
-- -----------------------------------------------------------------------------
create table estados_perro (
  codigo      text     primary key,
  nombre      text     not null,
  descripcion text     not null,
  orden       smallint not null,

  constraint uq_estados_perro_nombre unique (nombre),
  constraint uq_estados_perro_orden  unique (orden),
  constraint ck_estados_perro_codigo check (codigo ~ '^[a-z_]+$')
);

comment on table estados_perro is 'Catálogo de estados de un perro en el albergue.';

insert into estados_perro (codigo, nombre, descripcion, orden) values
  ('disponible',     'Disponible',             'Puede iniciar un proceso de adopción. Se asigna a mano o al rechazar una solicitud.', 1),
  ('en_tratamiento', 'En tratamiento',         'Recibe atención médica y no se puede adoptar. Se asigna a mano.',                     2),
  ('en_adopcion',    'En proceso de adopción', 'Tiene una solicitud en proceso o aprobada. Lo asigna la solicitud.',                  3),
  ('adoptado',       'Adoptado',               'Su solicitud fue finalizada. Lo asigna la solicitud.',                                4);

-- -----------------------------------------------------------------------------
-- estados_solicitud
-- -----------------------------------------------------------------------------
create table estados_solicitud (
  codigo      text     primary key,
  nombre      text     not null,
  descripcion text     not null,
  orden       smallint not null,

  constraint uq_estados_solicitud_nombre unique (nombre),
  constraint uq_estados_solicitud_orden  unique (orden),
  constraint ck_estados_solicitud_codigo check (codigo ~ '^[a-z_]+$')
);

comment on table estados_solicitud is 'Catálogo de estados de una solicitud de adopción.';

insert into estados_solicitud (codigo, nombre, descripcion, orden) values
  ('en_proceso', 'En proceso', 'Solicitud registrada, en evaluación.',       1),
  ('aprobada',   'Aprobada',   'El adoptante fue aceptado; falta la entrega.', 2),
  ('rechazada',  'Rechazada',  'La solicitud no continuó.',                    3),
  ('finalizada', 'Finalizada', 'El perro fue entregado al adoptante.',        4);

-- -----------------------------------------------------------------------------
-- razas
-- -----------------------------------------------------------------------------
create table razas (
  id        bigint generated always as identity primary key,
  nombre    text        not null,
  activa    boolean     not null default true,
  creado_en timestamptz not null default now(),

  constraint ck_razas_nombre check (btrim(nombre) <> '' and nombre = btrim(nombre))
);

comment on table  razas is 'Catálogo de razas. Para cruces se usa "Mestizo".';
comment on column razas.activa is 'false = ya no se ofrece al registrar perros, pero se conserva en los perros existentes.';

-- Evita "Beagle" y "beagle" como razas distintas.
create unique index uq_razas_nombre on razas (lower(nombre));

insert into razas (nombre) values
  ('Mestizo'),
  ('Beagle'),
  ('Border Collie'),
  ('Boxer'),
  ('Bulldog Francés'),
  ('Bulldog Inglés'),
  ('Chihuahua'),
  ('Cocker Spaniel'),
  ('Dachshund'),
  ('Golden Retriever'),
  ('Husky Siberiano'),
  ('Labrador Retriever'),
  ('Pastor Alemán'),
  ('Pitbull'),
  ('Poodle'),
  ('Pug'),
  ('Rottweiler'),
  ('Schnauzer'),
  ('Shih Tzu'),
  ('Yorkshire Terrier');
