-- Tabla para el perfil de la empresa
-- Ejecuta este script en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS public.company_profile (
  id TEXT PRIMARY KEY,
  friendly_name TEXT,
  legal_name TEXT,
  logo TEXT,
  postal_address TEXT,
  city TEXT,
  postal_code TEXT,
  state TEXT,
  country TEXT DEFAULT 'Colombia',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT
);

-- Habilitar Row Level Security
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios autenticados pueden leer el perfil
CREATE POLICY "Usuarios autenticados pueden ver el perfil" ON public.company_profile
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Política: Usuarios autenticados pueden insertar/actualizar el perfil
CREATE POLICY "Usuarios autenticados pueden modificar el perfil" ON public.company_profile
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
