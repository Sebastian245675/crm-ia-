-- Fix 403 y 500 en /rest/v1/users (subcuentas, listar usuarios)
-- Ejecuta en Supabase: SQL Editor → New query → Pegar → Run
--
-- 403: RLS exige admin en users; el panel usa admin@gmail.com / admin@tienda.com por email.
-- 500: Políticas con EXISTS (SELECT FROM users) provocan recursión infinita.
-- Solución: Solo políticas por JWT email; eliminar las que leen users.

-- Eliminar políticas recursivas (causan 500)
DROP POLICY IF EXISTS "Administradores pueden ver todos los usuarios" ON public.users;

-- Crear/refrescar políticas por email (sin recursión)
DROP POLICY IF EXISTS "Admins por email pueden ver usuarios" ON public.users;
DROP POLICY IF EXISTS "Admins por email pueden crear usuarios" ON public.users;
DROP POLICY IF EXISTS "Admins por email pueden actualizar usuarios" ON public.users;
DROP POLICY IF EXISTS "Admins por email pueden eliminar usuarios" ON public.users;

CREATE POLICY "Admins por email pueden ver usuarios"
  ON public.users FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com'));

CREATE POLICY "Admins por email pueden crear usuarios"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com'));

CREATE POLICY "Admins por email pueden actualizar usuarios"
  ON public.users FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com'))
  WITH CHECK ((auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com'));

CREATE POLICY "Admins por email pueden eliminar usuarios"
  ON public.users FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com'));
