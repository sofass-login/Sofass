-- =========================================================
-- Sofass · Políticas de seguridad (RLS)
-- =========================================================
-- Ejecutar DESPUÉS de schema.sql, en el mismo SQL Editor de Supabase.
--
-- Modelo de acceso:
--  - "admin"    -> lee y escribe todo.
--  - "vendedor" -> lee catálogo/almacenes/stock (compartido entre tiendas),
--                  pero solo lee y escribe ventas y caja de SU PROPIA tienda
--                  (la que tiene asignada en su perfil).
--  - Sin sesión -> no ve nada.

alter table stores enable row level security;
alter table warehouses enable row level security;
alter table suppliers enable row level security;
alter table family_groups enable row level security;
alter table families enable row level security;
alter table sellers enable row level security;
alter table items enable row level security;
alter table item_stock enable row level security;
alter table movements enable row level security;
alter table sales enable row level security;
alter table cash enable row level security;
alter table profiles enable row level security;

-- ---------- profiles ----------
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using ( id = auth.uid() or current_role_is_admin() );

drop policy if exists profiles_insert_admin on profiles;
create policy profiles_insert_admin on profiles for insert
  with check ( current_role_is_admin() );

drop policy if exists profiles_update_admin on profiles;
create policy profiles_update_admin on profiles for update
  using ( current_role_is_admin() );

drop policy if exists profiles_delete_admin on profiles;
create policy profiles_delete_admin on profiles for delete
  using ( current_role_is_admin() );

-- ---------- catálogo compartido: cualquier persona con sesión lee; solo admin escribe ----------
drop policy if exists stores_select on stores;
create policy stores_select on stores for select using ( auth.uid() is not null );
drop policy if exists stores_write on stores;
create policy stores_write on stores for all
  using ( current_role_is_admin() ) with check ( current_role_is_admin() );

drop policy if exists warehouses_select on warehouses;
create policy warehouses_select on warehouses for select using ( auth.uid() is not null );
drop policy if exists warehouses_write on warehouses;
create policy warehouses_write on warehouses for all
  using ( current_role_is_admin() ) with check ( current_role_is_admin() );

drop policy if exists suppliers_select on suppliers;
create policy suppliers_select on suppliers for select using ( auth.uid() is not null );
drop policy if exists suppliers_write on suppliers;
create policy suppliers_write on suppliers for all
  using ( current_role_is_admin() ) with check ( current_role_is_admin() );

drop policy if exists family_groups_select on family_groups;
create policy family_groups_select on family_groups for select using ( auth.uid() is not null );
drop policy if exists family_groups_write on family_groups;
create policy family_groups_write on family_groups for all
  using ( current_role_is_admin() ) with check ( current_role_is_admin() );

drop policy if exists families_select on families;
create policy families_select on families for select using ( auth.uid() is not null );
drop policy if exists families_write on families;
create policy families_write on families for all
  using ( current_role_is_admin() ) with check ( current_role_is_admin() );

drop policy if exists sellers_select on sellers;
create policy sellers_select on sellers for select using ( auth.uid() is not null );
drop policy if exists sellers_write on sellers;
create policy sellers_write on sellers for all
  using ( current_role_is_admin() ) with check ( current_role_is_admin() );

-- ---------- artículos y stock: lectura para cualquiera con sesión; escritura para cualquiera con sesión ----------
-- (igual que en el artefacto original: cualquier persona que pueda entrar puede mover stock;
--  las tiendas/almacenes/catálogo los gestiona el admin desde Configuración)
drop policy if exists items_select on items;
create policy items_select on items for select using ( auth.uid() is not null );
drop policy if exists items_write on items;
create policy items_write on items for all
  using ( auth.uid() is not null ) with check ( auth.uid() is not null );

drop policy if exists item_stock_select on item_stock;
create policy item_stock_select on item_stock for select using ( auth.uid() is not null );
drop policy if exists item_stock_write on item_stock;
create policy item_stock_write on item_stock for all
  using ( auth.uid() is not null ) with check ( auth.uid() is not null );

-- ---------- movimientos: cada tienda ve y crea los suyos; admin ve y gestiona todos ----------
drop policy if exists movements_select on movements;
create policy movements_select on movements for select
  using ( current_role_is_admin() or store_id = current_store_id() );
drop policy if exists movements_insert on movements;
create policy movements_insert on movements for insert
  with check ( current_role_is_admin() or store_id = current_store_id() );
drop policy if exists movements_update on movements;
create policy movements_update on movements for update
  using ( current_role_is_admin() or store_id = current_store_id() );
drop policy if exists movements_delete_admin on movements;
create policy movements_delete_admin on movements for delete
  using ( current_role_is_admin() );

-- ---------- ventas: cada tienda ve y crea las suyas; admin ve y gestiona todas ----------
drop policy if exists sales_select on sales;
create policy sales_select on sales for select
  using ( current_role_is_admin() or store_id = current_store_id() );
drop policy if exists sales_insert on sales;
create policy sales_insert on sales for insert
  with check ( current_role_is_admin() or store_id = current_store_id() );
drop policy if exists sales_update on sales;
create policy sales_update on sales for update
  using ( current_role_is_admin() or store_id = current_store_id() );
drop policy if exists sales_delete_admin on sales;
create policy sales_delete_admin on sales for delete
  using ( current_role_is_admin() );

-- ---------- caja: cada tienda ve y crea la suya (nunca edita ni borra, es un histórico); admin todo ----------
drop policy if exists cash_select on cash;
create policy cash_select on cash for select
  using ( current_role_is_admin() or store_id = current_store_id() );
drop policy if exists cash_insert on cash;
create policy cash_insert on cash for insert
  with check ( current_role_is_admin() or store_id = current_store_id() );
drop policy if exists cash_update_admin on cash;
create policy cash_update_admin on cash for update
  using ( current_role_is_admin() );
drop policy if exists cash_delete_admin on cash;
create policy cash_delete_admin on cash for delete
  using ( current_role_is_admin() );
