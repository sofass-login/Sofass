-- =========================================================
-- Sofass · Esquema de base de datos (Supabase / Postgres)
-- =========================================================
-- Ejecutar este script completo en: Supabase > SQL Editor > New query > Run

create extension if not exists "pgcrypto";

-- ---------- Catálogo / estructura ----------
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- Perfiles de usuario (vinculados a auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'vendedor' check (role in ('admin','vendedor')),
  store_id uuid references stores(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists family_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_id uuid references family_groups(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  store_id uuid references stores(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Artículos y stock ----------
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null default '',
  price numeric not null default 0,
  supplier_id uuid references suppliers(id) on delete set null,
  family_id uuid references families(id) on delete set null,
  measure text not null default '',
  material text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists item_stock (
  item_id uuid not null references items(id) on delete cascade,
  warehouse_id uuid not null references warehouses(id) on delete cascade,
  qty numeric not null default 0,
  primary key (item_id, warehouse_id)
);

-- ---------- Movimientos ----------
create table if not exists movements (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('entrada','reserva','exposicion')),
  subtype text,
  item_id uuid references items(id) on delete set null,
  item_name text not null default '',
  sku text not null default '',
  qty numeric not null default 0,
  warehouse_id uuid references warehouses(id) on delete set null,
  warehouse_name text not null default '',
  unit_price numeric not null default 0,
  total numeric not null default 0,
  client_name text not null default '',
  pedido_id text not null default '',
  seller_id uuid references sellers(id) on delete set null,
  store_id uuid references stores(id) on delete set null,
  store_name text not null default '',
  actor_name text not null default '',
  status text not null default 'activo' check (status in ('activo','cancelado')),
  created_at timestamptz not null default now()
);

-- ---------- Ventas ----------
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  client_name text not null default '',
  pedido_number text not null default '',
  store_id uuid references stores(id) on delete set null,
  store_name text not null default '',
  seller_name text not null default '',
  total numeric not null default 0,
  deposit numeric not null default 0,
  method text not null default 'Efectivo',
  status text not null default 'cobrada' check (status in ('cobrada','pendiente')),
  items_text text not null default '',
  items jsonb not null default '[]'::jsonb, -- líneas: [{id, itemId, itemName, sku, qty, orderType, note, delivered, sourceWarehouses, handedOver, supplierId, supplierName}]
  created_at timestamptz not null default now()
);

-- ---------- Caja ----------
create table if not exists cash (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete set null,
  store_name text not null default '',
  type text not null check (type in ('apertura','retirada')),
  amount numeric not null default 0,
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Índices útiles ----------
create index if not exists idx_item_stock_item on item_stock(item_id);
create index if not exists idx_movements_store on movements(store_id);
create index if not exists idx_sales_store on sales(store_id);
create index if not exists idx_cash_store on cash(store_id);
create index if not exists idx_profiles_store on profiles(store_id);

-- ---------- Función auxiliar: rol del usuario actual ----------
create or replace function current_role_is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

create or replace function current_store_id() returns uuid as $$
  select store_id from profiles where id = auth.uid();
$$ language sql stable security definer;
