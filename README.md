# Sofass · Web

Aplicación de tiendas/almacén/ventas/caja, hecha con Next.js + Supabase.

A diferencia del artefacto de Claude anterior, aquí **cualquier persona con cualquier
correo** puede tener una cuenta propia con contraseña y permiso real de escritura,
limitado por rol (administrador / vendedor) y por tienda.

## Puesta en marcha — guía paso a paso

Sigue **DEPLOY.md** para los pasos completos (crear Supabase, cargar la base de datos,
desplegar en Vercel). Resumen rápido:

1. Crea un proyecto gratis en https://supabase.com
2. En el SQL Editor de Supabase, ejecuta en este orden: `supabase/schema.sql`,
   `supabase/policies.sql`, `supabase/functions.sql`.
3. En Supabase → Authentication → Providers, deja activado "Email".
4. Copia `.env.local.example` a `.env.local` y rellena con las claves de tu proyecto
   (Project Settings → API).
5. `npm install && npm run dev` para probarlo en local.
6. Sube el proyecto a GitHub y despliega en https://vercel.com (gratis), añadiendo
   las mismas variables de entorno en Vercel.
7. Crea tu primer usuario administrador (ver DEPLOY.md, paso final).

## Estructura

- `supabase/schema.sql` — tablas.
- `supabase/policies.sql` — seguridad (quién puede leer/escribir qué).
- `supabase/functions.sql` — lógica de negocio (registrar venta, entregar, entradas de almacén).
- `src/app` — páginas (Next.js App Router).
- `src/components` — interfaz de cada pantalla.

## Estado actual

Incluido: login, roles admin/vendedor, Ventas (stock/pedido/producto nuevo, flujo
almacén "Vendido" + botón Entregado), Caja (apertura/retirada + saldo), Almacén
(stock por artículo + entradas), Configuración básica (tiendas/almacenes/proveedores),
Usuarios (invitar por correo).

Pendiente / a pedir cuando lo necesites: pantalla de artículos y familias completa,
importador de albaranes, hoja de pedido descargable, valoración de inventario,
cancelar movimientos. Dímelo y lo añado.
