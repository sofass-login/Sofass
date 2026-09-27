-- =========================================================
-- Sofass · Funciones de negocio (RPC)
-- =========================================================
-- Ejecutar DESPUÉS de schema.sql y policies.sql.
-- Estas funciones agrupan operaciones que tocan varias tablas a la vez
-- (por ejemplo registrar una venta descuenta stock Y mueve al almacén "Vendido"
-- Y crea el registro de venta, todo junto o nada).

-- ---------- Almacén "Vendido" (por nombre, igual que en la app original) ----------
create or replace function vendido_warehouse_id() returns uuid as $$
  select id from warehouses where lower(trim(name)) = 'vendido' limit 1;
$$ language sql stable;

-- ---------- Registrar una venta completa ----------
-- payload esperado (jsonb):
-- {
--   "storeId": "...", "storeName": "...", "clientName": "...", "pedidoNumber": "...",
--   "itemsText": "...", "total": 0, "deposit": 0, "method": "Efectivo", "status": "cobrada",
--   "sellerName": "...",
--   "lines": [
--     {"itemId": "...", "itemName": "...", "sku": "...", "qty": 1, "orderType": "stock"},
--     {"itemId": null, "itemName": "Sofá a medida", "qty": 1, "orderType": "pedido",
--      "note": "...", "supplierId": "...", "supplierName": "..."}
--   ]
-- }
create or replace function register_sale(payload jsonb) returns jsonb as $$
declare
  v_store_id uuid := (payload->>'storeId')::uuid;
  v_sale_id uuid := gen_random_uuid();
  v_line jsonb;
  v_final_items jsonb := '[]'::jsonb;
  v_item record;
  v_vendido uuid := vendido_warehouse_id();
  v_qty numeric;
  v_remaining numeric;
  v_available numeric;
  v_sources jsonb;
  v_stock_row record;
  v_take numeric;
  v_moved numeric;
  v_delivered boolean;
  v_handed_over boolean;
  v_line_out jsonb;
  v_line_id int := 1;
begin
  if not (current_role_is_admin() or v_store_id = current_store_id()) then
    raise exception 'No tienes permiso para registrar ventas en esta tienda';
  end if;

  for v_line in select * from jsonb_array_elements(payload->'lines')
  loop
    v_qty := coalesce((v_line->>'qty')::numeric, 1);

    -- Línea de "producto nuevo" (no está en el catálogo): siempre queda como pedido al fabricante
    if (v_line->>'itemId') is null then
      v_line_out := jsonb_build_object(
        'id', 'L'||v_line_id, 'itemId', null,
        'itemName', v_line->>'itemName', 'sku', '',
        'qty', v_qty, 'orderType', 'pedido', 'note', coalesce(v_line->>'note',''),
        'delivered', false,
        'supplierId', v_line->>'supplierId', 'supplierName', v_line->>'supplierName'
      );
      v_final_items := v_final_items || jsonb_build_array(v_line_out);
      v_line_id := v_line_id + 1;
      continue;
    end if;

    select id, name, sku into v_item from items where id = (v_line->>'itemId')::uuid;
    if v_item.id is null then
      continue;
    end if;

    if coalesce(v_line->>'orderType','stock') = 'pedido' then
      v_line_out := jsonb_build_object(
        'id', 'L'||v_line_id, 'itemId', v_item.id, 'itemName', v_item.name, 'sku', coalesce(v_item.sku,''),
        'qty', v_qty, 'orderType', 'pedido', 'note', coalesce(v_line->>'note',''),
        'delivered', false
      );
      v_final_items := v_final_items || jsonb_build_array(v_line_out);
      v_line_id := v_line_id + 1;
      continue;
    end if;

    -- Línea "de stock": comprobar disponible total
    select coalesce(sum(qty),0) into v_available from item_stock where item_id = v_item.id;
    v_delivered := v_available >= v_qty;
    v_sources := '[]'::jsonb;
    v_handed_over := true;

    if v_delivered then
      v_remaining := v_qty;
      for v_stock_row in
        select item_id, warehouse_id, qty from item_stock
        where item_id = v_item.id and qty > 0
          and (v_vendido is null or warehouse_id <> v_vendido)
        order by qty desc
      loop
        exit when v_remaining <= 0;
        v_take := least(v_stock_row.qty, v_remaining);
        if v_take > 0 then
          update item_stock set qty = qty - v_take
            where item_id = v_item.id and warehouse_id = v_stock_row.warehouse_id;
          v_remaining := v_remaining - v_take;
          v_sources := v_sources || jsonb_build_array(jsonb_build_object(
            'warehouseId', v_stock_row.warehouse_id,
            'warehouseName', (select name from warehouses where id = v_stock_row.warehouse_id),
            'qty', v_take
          ));
        end if;
      end loop;

      v_moved := v_qty - v_remaining;
      if v_vendido is not null and v_moved > 0 then
        insert into item_stock (item_id, warehouse_id, qty) values (v_item.id, v_vendido, v_moved)
          on conflict (item_id, warehouse_id) do update set qty = item_stock.qty + excluded.qty;
        v_handed_over := false; -- queda en "Vendido" pendiente del botón Entregado
      end if;

      insert into movements (type, item_id, item_name, sku, qty, client_name, pedido_id, store_id, store_name, actor_name, status)
        values ('reserva', v_item.id, v_item.name, coalesce(v_item.sku,''), v_qty,
                payload->>'clientName', coalesce(nullif(payload->>'pedidoNumber',''), 'PED-'||substr(v_sale_id::text,1,8)),
                v_store_id, payload->>'storeName', coalesce(payload->>'sellerName','Administrador'), 'activo');
    end if;

    v_line_out := jsonb_build_object(
      'id', 'L'||v_line_id, 'itemId', v_item.id, 'itemName', v_item.name, 'sku', coalesce(v_item.sku,''),
      'qty', v_qty, 'orderType', 'stock', 'note', coalesce(v_line->>'note',''),
      'delivered', v_delivered, 'sourceWarehouses', v_sources, 'handedOver', v_handed_over
    );
    v_final_items := v_final_items || jsonb_build_array(v_line_out);
    v_line_id := v_line_id + 1;
  end loop;

  insert into sales (id, client_name, pedido_number, store_id, store_name, seller_name, total, deposit, method, status, items_text, items)
  values (
    v_sale_id, payload->>'clientName', coalesce(payload->>'pedidoNumber',''), v_store_id, payload->>'storeName',
    coalesce(payload->>'sellerName','Administrador'), coalesce((payload->>'total')::numeric,0),
    coalesce((payload->>'deposit')::numeric,0), coalesce(payload->>'method','Efectivo'),
    coalesce(payload->>'status','cobrada'), coalesce(payload->>'itemsText',''), v_final_items
  );

  return jsonb_build_object('id', v_sale_id, 'items', v_final_items);
end;
$$ language plpgsql security definer;

-- ---------- Marcar una línea de venta como entregada (sale de "Vendido") ----------
create or replace function hand_over_sale_line(p_sale_id uuid, p_line_id text) returns void as $$
declare
  v_sale record;
  v_items jsonb;
  v_line jsonb;
  v_vendido uuid := vendido_warehouse_id();
  v_new_items jsonb := '[]'::jsonb;
  v_item_id uuid;
  v_qty numeric;
begin
  select * into v_sale from sales where id = p_sale_id;
  if v_sale.id is null then
    raise exception 'Venta no encontrada';
  end if;
  if not (current_role_is_admin() or v_sale.store_id = current_store_id()) then
    raise exception 'No tienes permiso sobre esta venta';
  end if;
  if v_vendido is null then
    raise exception 'Crea un almacén llamado "Vendido" en Configuración';
  end if;

  for v_line in select * from jsonb_array_elements(v_sale.items)
  loop
    if v_line->>'id' = p_line_id then
      v_item_id := (v_line->>'itemId')::uuid;
      v_qty := coalesce((v_line->>'qty')::numeric, 0);
      if v_item_id is not null then
        update item_stock set qty = greatest(0, qty - v_qty)
          where item_id = v_item_id and warehouse_id = v_vendido;
      end if;
      v_line := v_line || jsonb_build_object('handedOver', true, 'handedOverAt', extract(epoch from now())*1000);
    end if;
    v_new_items := v_new_items || jsonb_build_array(v_line);
  end loop;

  update sales set items = v_new_items where id = p_sale_id;
end;
$$ language plpgsql security definer;

-- ---------- Registrar movimiento simple (entrada / exposición) ----------
create or replace function register_stock_movement(
  p_type text, p_item_id uuid, p_warehouse_id uuid, p_qty numeric,
  p_unit_price numeric, p_store_id uuid, p_store_name text, p_actor_name text
) returns void as $$
declare
  v_item record;
begin
  select id, name, sku into v_item from items where id = p_item_id;
  if v_item.id is null then
    raise exception 'Artículo no encontrado';
  end if;

  if p_type = 'entrada' then
    insert into item_stock (item_id, warehouse_id, qty) values (p_item_id, p_warehouse_id, p_qty)
      on conflict (item_id, warehouse_id) do update set qty = item_stock.qty + excluded.qty;
  elsif p_type = 'exposicion' then
    if not (current_role_is_admin() or p_store_id = current_store_id()) then
      raise exception 'No tienes permiso para esa tienda';
    end if;
    update item_stock set qty = greatest(0, qty - p_qty) where item_id = p_item_id and warehouse_id = p_warehouse_id;
  else
    raise exception 'Tipo de movimiento no soportado aquí';
  end if;

  insert into movements (type, item_id, item_name, sku, qty, warehouse_id, warehouse_name, unit_price, total, store_id, store_name, actor_name, status)
  values (p_type, p_item_id, v_item.name, coalesce(v_item.sku,''), p_qty, p_warehouse_id,
          (select name from warehouses where id = p_warehouse_id), coalesce(p_unit_price,0), coalesce(p_unit_price,0)*p_qty,
          p_store_id, p_store_name, p_actor_name, 'activo');
end;
$$ language plpgsql security definer;
