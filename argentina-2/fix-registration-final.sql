-- SCRIPT PARA GARANTIZAR REGISTRO Y PERFIL DE USUARIO
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Asegurar que la tabla public.users tenga la estructura correcta
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  address TEXT,
  is_admin BOOLEAN DEFAULT false,
  sub_cuenta TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Limpiar políticas antiguas que causan conflictos o son demasiado restrictivas
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.users;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.users;
DROP POLICY IF EXISTS "Admins por email pueden ver usuarios" ON public.users;
DROP POLICY IF EXISTS "Admins por email pueden crear usuarios" ON public.users;
DROP POLICY IF EXISTS "Admins por email pueden actualizar usuarios" ON public.users;
DROP POLICY IF EXISTS "Admins por email pueden eliminar usuarios" ON public.users;

-- 4. Crear nuevas políticas robustas
-- Usuarios pueden ver su propio perfil
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Usuarios pueden actualizar su propio perfil
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Administradores por email (Hardcoded para seguridad extra)
CREATE POLICY "Admins por email pueden todo"
  ON public.users FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com'))
  WITH CHECK ((auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com'));

-- 5. Función y Trigger para creación automática de perfil (LA GARANTÍA)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phone, address)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'address', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = CASE WHEN public.users.name IS NULL OR public.users.name = '' THEN EXCLUDED.name ELSE public.users.name END,
    phone = CASE WHEN public.users.phone IS NULL OR public.users.phone = '' THEN EXCLUDED.phone ELSE public.users.phone END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Comentario de éxito
COMMENT ON TABLE public.users IS 'Tabla de usuarios con creación automática via trigger';
