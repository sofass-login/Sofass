import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// A donde vuelve la persona invitada tras pinchar el enlace del correo,
// para intercambiar el código por una sesión y poder poner su contraseña.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/actualizar-contrasena`);
}
