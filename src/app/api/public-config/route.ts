import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Datos públicos de Supabase (URL y clave anónima) para la app de /app.html.
// La ruta está protegida por el middleware: solo responde con sesión iniciada.
export function GET() {
  return NextResponse.json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
