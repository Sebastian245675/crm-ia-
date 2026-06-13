-- Fix: Permitir editar categorías (403 / "no pasa nada" al guardar)
-- Ejecuta en Supabase: SQL Editor → New query → Pegar → Run
--
-- La política actual solo permite users.is_admin = true.
-- Esta actualización permite también admin por email y subcuentas en users.

DROP POLICY IF EXISTS "Admin can manage categories" ON public.categories;

CREATE POLICY "Admin can manage categories"
  ON public.categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND (
        u.is_admin = true
        OR u.email IN ('admin@gmail.com', 'admin@tienda.com')
        OR u.sub_cuenta = 'si'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND (
        u.is_admin = true
        OR u.email IN ('admin@gmail.com', 'admin@tienda.com')
        OR u.sub_cuenta = 'si'
      )
    )
  );
