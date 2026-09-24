"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NavBar({
  role,
  name,
  storeName,
}: {
  role: "admin" | "vendedor";
  name: string;
  storeName: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const links = [
    { href: "/ventas", label: "Ventas" },
    { href: "/caja", label: "Caja" },
    { href: "/almacen", label: "Almacén" },
    ...(role === "admin" ? [{ href: "/config", label: "Configuración" }] : []),
    ...(role === "admin" ? [{ href: "/usuarios", label: "Usuarios" }] : []),
  ];

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="border-b border-border bg-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold">Sofass</span>
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  pathname?.startsWith(l.href) ? "bg-accent text-white" : "hover:bg-black/5"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          <span>
            {name || "Sin nombre"} · {role === "admin" ? "Administrador" : storeName || "Vendedor"}
          </span>
          <button onClick={logout} className="btn btn-ghost !py-1 !px-2 text-xs">
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}
