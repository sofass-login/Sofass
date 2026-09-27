import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ConfigClient from "@/components/config/ConfigClient";

export default async function ConfigPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (profile?.role !== "admin") redirect("/ventas");

  const { data: stores } = await supabase.from("stores").select("id, name, address").order("name");
  const { data: warehouses } = await supabase.from("warehouses").select("id, name, location").order("name");
  const { data: suppliers } = await supabase.from("suppliers").select("id, name").order("name");

  return (
    <ConfigClient
      stores={stores ?? []}
      warehouses={warehouses ?? []}
      suppliers={suppliers ?? []}
    />
  );
}
