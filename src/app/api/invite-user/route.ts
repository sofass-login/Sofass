import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Solo un administrador puede invitar usuarios" }, { status: 403 });
  }

  const body = await req.json();
  const { email, name, role, storeId } = body as {
    email: string;
    name: string;
    role: "admin" | "vendedor";
    storeId: string | null;
  };
  if (!email) return NextResponse.json({ error: "Falta el correo" }, { status: 400 });

  const admin = createAdminClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: site ? `${site}/auth/callback` : undefined,
  });
  if (inviteError || !invited.user) {
    return NextResponse.json({ error: inviteError?.message || "No se pudo invitar" }, { status: 400 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: invited.user.id,
    name: name || "",
    role: role || "vendedor",
    store_id: storeId || null,
  });
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
