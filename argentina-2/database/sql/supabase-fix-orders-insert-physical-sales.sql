-- Fix 409 al registrar ventas físicas: asegurar que el usuario pueda existir en public.users
-- y que las órdenes se puedan insertar correctamente.
-- Ejecuta en Supabase: SQL Editor → New query → Pegar → Run
--
-- Problema: orders.user_id referencia public.users(id). Si el admin no está en users, el INSERT falla con 409/23503.
-- Solución: Permitir que usuarios autenticados inserten su propia fila en users (para ventas físicas).

-- Política: usuario autenticado puede insertar su propio perfil (para ventas físicas cuando aún no existe en users)
DROP POLICY IF EXISTS "Usuario puede crear su propio perfil" ON public.users;
CREATE POLICY "Usuario puede crear su propio perfil"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
