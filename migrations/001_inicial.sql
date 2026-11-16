create table clientes (
  id text primary key,
  nombre text not null,
  email text not null unique,
  clave_hash text not null,
  creado_en timestamptz not null default now()
);

create table sesiones (
  token_hash text primary key,
  cliente_id text not null references clientes(id) on delete cascade,
  expira_en timestamptz not null
);
create index sesiones_cliente on sesiones (cliente_id);

create table productos (
  id serial primary key,
  sku text not null unique,
  nombre text not null,
  categoria text not null,
  unidad text not null,
  precio_centavos integer not null check (precio_centavos >= 0),
  stock integer not null check (stock >= 0),
  activo boolean not null default true
);

create sequence pedidos_numero start 1000;
create table pedidos (
  id text primary key,
  cliente_id text not null references clientes(id),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'preparando', 'enviado', 'entregado', 'cancelado')),
  direccion text not null,
  creado_en timestamptz not null default now()
);
create index pedidos_cliente on pedidos (cliente_id, creado_en desc);

create table pedido_items (
  pedido_id text not null references pedidos(id) on delete cascade,
  producto_id integer not null references productos(id),
  nombre text not null,
  precio_centavos integer not null check (precio_centavos >= 0),
  cantidad integer not null check (cantidad > 0),
  primary key (pedido_id, producto_id)
);

create sequence clientes_numero start 1;
