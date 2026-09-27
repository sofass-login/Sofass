import { createClient } from "@/lib/supabase/server";
import VentasClient from "@/components/ventas/VentasClient";

export default async function VentasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role, store_id")
    .eq("id", user!.id)
    .single();

  const { data: stores } = await supabase.from("stores").select("id, name").order("name");
  const { data: items } = await supabase.from("items").select("id, name, sku").order("name");
  const { data: suppliers } = await supabase.from("suppliers").select("id, name").order("name");

  return (
    <VentasClient
      profile={profile as any}
      stores={stores ?? []}
      items={items ?? []}
      suppliers={suppliers ?? []}
    />
  );
}
