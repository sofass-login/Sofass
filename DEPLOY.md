# Cómo publicar Sofass Web (paso a paso, sin experiencia técnica)

## 1. Crear la base de datos (Supabase)

1. Ve a https://supabase.com → "Start your project" → crea una cuenta gratis.
2. "New project": ponle un nombre (p.ej. "sofass"), elige una contraseña de base de
   datos (guárdala) y la región más cercana (Europe).
3. Espera 1-2 minutos a que se cree.
4. Ve al icono de SQL Editor (barra izquierda) → "New query".
5. Abre el archivo `supabase/schema.sql` de este proyecto, copia todo su contenido,
   pégalo en el editor y pulsa "Run".
6. Repite el mismo paso con `supabase/policies.sql`.
7. Repite el mismo paso con `supabase/functions.sql`.
8. Ve a Authentication → Providers y confirma que "Email" está activado (lo está
   por defecto).
9. Ve a Authentication → URL Configuration y, cuando tengas ya el dominio de Vercel
   (paso 3), ponlo ahí como "Site URL" (por ejemplo `https://sofass-gestion.vercel.app`).

## 2. Conseguir las claves del proyecto

En Supabase → Project Settings (engranaje) → API, copia:
- "Project URL"
- "anon public" key
- "service_role" key (¡secreta! nunca la compartas ni la subas a un repo público)

## 3. Publicar la web (Vercel)

1. Sube esta carpeta a un repositorio de GitHub (puedo ayudarte a hacerlo, o puedes
   arrastrar la carpeta en https://github.com/new si prefieres subirla a mano).
2. Ve a https://vercel.com → crea cuenta gratis (puedes entrar con tu cuenta de
   GitHub) → "Add New" → "Project" → elige el repositorio.
3. En "Environment Variables" añade:
   - `NEXT_PUBLIC_SUPABASE_URL` = tu Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` = tu service_role key
   - `NEXT_PUBLIC_SITE_URL` = (lo rellenas tras el primer despliegue, con la URL que
     te da Vercel, p.ej. `https://sofass-gestion.vercel.app`) — luego "Redeploy".
4. Pulsa "Deploy". En 1-2 minutos tendrás tu web funcionando en una URL tipo
   `https://sofass-gestion.vercel.app`.

## 4. Crear tu primer usuario administrador

Como todavía no hay ningún usuario, el primero se crea a mano una vez:

1. En Supabase → Authentication → Users → "Add user" → "Create new user". Pon tu
   correo y una contraseña (marca "Auto Confirm User").
2. Copia el "User UID" que se genera.
3. Ve a SQL Editor y ejecuta (sustituyendo TU-UID y TU-NOMBRE):
   ```sql
   insert into profiles (id, name, role, store_id)
   values ('TU-UID', 'TU-NOMBRE', 'admin', null);
   ```
4. Entra en tu web con ese correo y contraseña.

A partir de aquí, ya puedes invitar a todas las vendedoras que quieras desde
"Usuarios" dentro de la propia web, con cualquier correo — no hace falta repetir
este paso manual nunca más.

## Cambios futuros

Cuando quieras que cambie algo, dímelo aquí (en esta conversación) y yo actualizo el
código. Si el proyecto está conectado a GitHub, los cambios se publican solos en
Vercel en 1-2 minutos tras subirlos.
