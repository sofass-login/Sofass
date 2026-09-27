import { createClient } from "@/lib/supabase/server";
import AlmacenClient from "@/components/almacen/AlmacenClient";

export default async function AlmacenPage() {
  const supabase = createClient();
  const { data: items } = await supabase.from("items").select("id, name, sku, price").order("name");
  const { data: warehouses } = await supabase.from("warehouses").select("id, name").order("name");
  const { data: stock } = await supabase.from("item_stock").select("item_id, warehouse_id, qty");

  return <AlmacenClient items={items ?? []} warehouses={warehouses ?? []} stock={stock ?? []} />;
}
