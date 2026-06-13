-- Políticas RLS SIMPLIFICADAS para la tabla products
-- Ejecuta este script en el SQL Editor de Supabase para permitir crear productos

-- Eliminar políticas existentes si existen (solo las de productos)
DROP POLICY IF EXISTS "Productos publicados son públicos" ON public.products;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar productos" ON public.products;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar productos" ON public.products;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar productos" ON public.products;
DROP POLICY IF EXISTS "Admins pueden ver todos los productos" ON public.products;

-- Política 1: Lectura pública de productos publicados
CREATE POLICY "Productos publicados son públicos" ON public.products
  FOR SELECT 
  USING (is_published = TRUE);

-- Política 2: Usuarios autenticados pueden ver todos los productos (para el panel de admin)
CREATE POLICY "Usuarios autenticados pueden ver todos los productos" ON public.products
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Política 3: Usuarios autenticados pueden insertar productos
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
