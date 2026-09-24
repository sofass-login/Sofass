import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role, store_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Cuenta creada pero sin perfil todavía (raro, pero por seguridad).
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4 text-center">
        <div className="card max-w-md">
          <h1 className="text-lg font-semibold mb-2">Cuenta pendiente de configurar</h1>
          <p className="text-sm text-ink-soft">
            Tu usuario existe pero todavía no tiene un perfil asignado (rol / tienda).
            Pide al administrador que te dé de alta desde Configuración → Usuarios.
          </p>
        </div>
      </div>
    );
  }

  let storeName: string | null = null;
  if (profile.store_id) {
    const { data: store } = await supabase.from("stores").select("name").eq("id", profile.store_id).single();
    storeName = store?.name ?? null;
  }

  return (
    <div className="min-h-screen bg-bg">
      <NavBar role={profile.role} name={profile.name} storeName={storeName} />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
