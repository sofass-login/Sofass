import { createClient } from "@/lib/supabase/server";
import CajaClient from "@/components/caja/CajaClient";

export default async function CajaPage() {
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

  return <CajaClient profile={profile as any} stores={stores ?? []} />;
}
