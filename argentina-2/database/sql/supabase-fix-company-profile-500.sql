-- Fix 500 en company_profile (Error loading company profile en Sidebar)
-- Ejecuta en Supabase: SQL Editor → New query → Pegar → Run
--
-- Causa: Políticas que hacen EXISTS (SELECT FROM users) pueden fallar o generar
--        recursión. Solución: SELECT público simple; escritura por email (sin users).

-- Eliminar todas las políticas actuales de company_profile
DROP POLICY IF EXISTS "Perfil de empresa es público para lectura" ON public.company_profile;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar perfil empresa" ON public.company_profile;
DROP POLICY IF EXISTS "Administradores pueden insertar perfil empresa" ON public.company_profile;
DROP POLICY IF EXISTS "Administradores pueden actualizar perfil empresa" ON public.company_profile;
DROP POLICY IF EXISTS "Administradores pueden eliminar perfil empresa" ON public.company_profile;
DROP POLICY IF EXISTS "Public can read company profile" ON public.company_profile;
DROP POLICY IF EXISTS "Admin can manage company profile" ON public.company_profile;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver el perfil" ON public.company_profile;
DROP POLICY IF EXISTS "Usuarios autenticados pueden modificar el perfil" ON public.company_profile;

-- SELECT: lectura pública (Sidebar, etc.) – sin subconsultas
CREATE POLICY "company_profile_select_public"
  ON public.company_profile FOR SELECT
  TO public
  USING (true);

-- INSERT/UPDATE/DELETE: solo admins por email (sin tocar users, evita 500)
CREATE POLICY "company_profile_insert_admin"
  ON public.company_profile FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com'));

CREATE POLICY "company_profile_update_admin"
  ON public.company_profile FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com'))
  WITH CHECK ((auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com'));

CREATE POLICY "company_profile_delete_admin"
  ON public.company_profile FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com'));
