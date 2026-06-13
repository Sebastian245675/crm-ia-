-- Políticas RLS para la tabla users
-- Permite a administradores crear subcuentas
-- Soporta admins por users.is_admin Y por email (admin@gmail.com / admin@tienda.com)

-- Primero, habilitar RLS si no está habilitado
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.users;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.users;
DROP POLICY IF EXISTS "Permitir inserción pública durante registro" ON public.users;
DROP POLICY IF EXISTS "Administradores pueden ver todos los usuarios" ON public.users;
DROP POLICY IF EXISTS "Administradores pueden crear usuarios" ON public.users;
DROP POLICY IF EXISTS "Administradores pueden actualizar usuarios" ON public.users;
DROP POLICY IF EXISTS "Administradores pueden eliminar usuarios" ON public.users;
DROP POLICY IF EXISTS "Admins por email pueden ver usuarios" ON public.users;
DROP POLICY IF EXISTS "Admins por email pueden crear usuarios" ON public.users;
DROP POLICY IF EXISTS "Admins por email pueden actualizar usuarios" ON public.users;
DROP POLICY IF EXISTS "Admins por email pueden eliminar usuarios" ON public.users;

-- POLÍTICA 1: Permitir que cualquiera pueda insertar (para registro)
CREATE POLICY "Permitir inserción pública durante registro"
  ON public.users
  FOR INSERT
  TO public
  WITH CHECK (true);

-- POLÍTICA 2: Los usuarios pueden ver su propio perfil
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- POLÍTICA 3: Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- POLÍTICA 4: Los administradores (en users) pueden ver todos los usuarios
CREATE POLICY "Administradores pueden ver todos los usuarios"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u2
      WHERE u2.id = auth.uid()
      AND u2.is_admin = true
    )
  );

-- POLÍTICA 4b: Admins por email (JWT) pueden ver todos los usuarios — evita 403 si no hay fila en users
CREATE POLICY "Admins por email pueden ver usuarios"
  ON public.users
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com'));

-- POLÍTICA 5: Los administradores (en users) pueden crear usuarios (subcuentas)
CREATE POLICY "Administradores pueden crear usuarios"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u2
      WHERE u2.id = auth.uid()
      AND u2.is_admin = true
    )
  );

-- POLÍTICA 5b: Admins por email pueden crear usuarios (subcuentas)
CREATE POLICY "Admins por email pueden crear usuarios"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com'));

-- POLÍTICA 6: Los administradores (en users) pueden actualizar cualquier usuario
CREATE POLICY "Administradores pueden actualizar usuarios"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u2
      WHERE u2.id = auth.uid()
      AND u2.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u2
      WHERE u2.id = auth.uid()
      AND u2.is_admin = true
    )
  );

-- POLÍTICA 6b: Admins por email pueden actualizar usuarios
CREATE POLICY "Admins por email pueden actualizar usuarios"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com'))
  WITH CHECK ((auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com'));

-- POLÍTICA 7: Los administradores (en users) pueden eliminar usuarios
CREATE POLICY "Administradores pueden eliminar usuarios"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u2
      WHERE u2.id = auth.uid()
      AND u2.is_admin = true
    )
  );

-- POLÍTICA 7b: Admins por email pueden eliminar usuarios
CREATE POLICY "Admins por email pueden eliminar usuarios"
  ON public.users
  FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'email') IN ('admin@gmail.com', 'admin@tienda.com'));

-- Verificar que el esquema de la tabla users sea correcto
-- Si la tabla no existe, crearla
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  department_number TEXT,
  phone TEXT,
  address TEXT,
  is_admin BOOLEAN DEFAULT false,
  sub_cuenta TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_sub_cuenta ON public.users(sub_cuenta);

-- Comentarios para documentación
COMMENT ON TABLE public.users IS 'Tabla de usuarios del sistema';
COMMENT ON COLUMN public.users.id IS 'ID del usuario (UUID de Supabase Auth)';
COMMENT ON COLUMN public.users.is_admin IS 'Indica si el usuario es administrador';
COMMENT ON COLUMN public.users.sub_cuenta IS 'Indica si es una subcuenta: "si" o null';
