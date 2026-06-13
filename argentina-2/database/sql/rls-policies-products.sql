-- Políticas RLS para la tabla products
-- Este archivo debe ejecutarse en el SQL Editor de Supabase
-- IMPORTANTE: Ejecuta este script completo en el SQL Editor de Supabase

-- Función helper para verificar si un usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = user_id 
    AND (
      users.is_admin = TRUE 
      OR users.email IN ('admin@gmail.com', 'admin@tienda.com')
      OR auth.jwt() ->> 'email' IN ('admin@gmail.com', 'admin@tienda.com')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Productos publicados son públicos" ON public.products;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar productos" ON public.products;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar productos" ON public.products;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar productos" ON public.products;
DROP POLICY IF EXISTS "Admins pueden ver todos los productos" ON public.products;

-- Política 1: Lectura pública de productos publicados
CREATE POLICY "Productos publicados son públicos" ON public.products
  FOR SELECT 
  USING (is_published = TRUE);

-- Política 2: Admins pueden ver todos los productos (incluyendo no publicados)
CREATE POLICY "Admins pueden ver todos los productos" ON public.products
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND (users.is_admin = TRUE OR users.email IN ('admin@gmail.com', 'admin@tienda.com'))
      )
      OR (auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com')
    )
  );

-- Política 3: Usuarios autenticados pueden insertar productos
-- Nota: Si quieres restringir solo a admins, cambia la condición a usar is_admin()
CREATE POLICY "Usuarios autenticados pueden insertar productos" ON public.products
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política 4: Usuarios autenticados pueden actualizar productos
CREATE POLICY "Usuarios autenticados pueden actualizar productos" ON public.products
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política 5: Usuarios autenticados pueden eliminar productos
CREATE POLICY "Usuarios autenticados pueden eliminar productos" ON public.products
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);
