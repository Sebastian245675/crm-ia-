-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  address TEXT,
  department_number TEXT,
  conjunto TEXT,
  sub_cuenta TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de categorías
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  slug TEXT UNIQUE,
  icon TEXT,
  image TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  parent_name TEXT,
  display_order INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de productos
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2),
  original_price DECIMAL(10, 2),
  image TEXT,
  additional_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  category TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  category_name TEXT,
  subcategory TEXT,
  subcategory_name TEXT,
  tercera_categoria TEXT,
  tercera_categoria_name TEXT,
  stock INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  is_offer BOOLEAN DEFAULT FALSE,
  discount INTEGER,
  specifications JSONB,
  colors JSONB,
  benefits TEXT[] DEFAULT ARRAY[]::TEXT[],
  warranties TEXT[] DEFAULT ARRAY[]::TEXT[],
  payment_methods TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_by TEXT,
  last_modified_by TEXT,
  cost_updated_at TIMESTAMP WITH TIME ZONE,
  profit_margin DECIMAL(10, 2),
  is_decant BOOLEAN DEFAULT FALSE,
  decant_options JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de órdenes
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  order_notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de configuración de empresa
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
  updated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de filtros personalizados
CREATE TABLE IF NOT EXISTS public.filters (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de opciones de filtros
CREATE TABLE IF NOT EXISTS public.filter_options (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  parent_id TEXT NOT NULL REFERENCES public.filters(id) ON DELETE CASCADE,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_published ON public.products(is_published);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_filter_options_parent_id ON public.filter_options(parent_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filter_options ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes antes de crearlas
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.users;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.users;
DROP POLICY IF EXISTS "Productos publicados son públicos" ON public.products;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias órdenes" ON public.orders;
DROP POLICY IF EXISTS "Usuarios pueden crear órdenes" ON public.orders;
DROP POLICY IF EXISTS "Perfil de empresa es público para lectura" ON public.company_profile;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar perfil empresa" ON public.company_profile;
DROP POLICY IF EXISTS "Administradores pueden insertar perfil empresa" ON public.company_profile;
DROP POLICY IF EXISTS "Administradores pueden actualizar perfil empresa" ON public.company_profile;
DROP POLICY IF EXISTS "Administradores pueden eliminar perfil empresa" ON public.company_profile;

-- Políticas de RLS para usuarios
CREATE POLICY "Usuarios pueden ver su propio perfil" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Políticas de RLS para productos (lectura pública)
CREATE POLICY "Productos publicados son públicos" ON public.products
  FOR SELECT USING (is_published = TRUE);

-- Políticas de RLS para órdenes
CREATE POLICY "Usuarios pueden ver sus propias órdenes" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden crear órdenes" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas de RLS para company_profile (público para leer, solo admin para escribir)
CREATE POLICY "Perfil de empresa es público para lectura" ON public.company_profile
  FOR SELECT USING (true);

CREATE POLICY "Administradores pueden insertar perfil empresa" ON public.company_profile
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (users.is_admin = true OR users.email = 'admin@gmail.com')
    )
  );

CREATE POLICY "Administradores pueden actualizar perfil empresa" ON public.company_profile
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (users.is_admin = true OR users.email = 'admin@gmail.com')
    )
  );

CREATE POLICY "Administradores pueden eliminar perfil empresa" ON public.company_profile
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (users.is_admin = true OR users.email = 'admin@gmail.com')
    )
  );

-- Políticas de RLS para filters (público para leer, solo admin para escribir)
CREATE POLICY "Filtros son públicos para lectura" ON public.filters
  FOR SELECT USING (true);

CREATE POLICY "Administradores pueden insertar filtros" ON public.filters
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (users.is_admin = true OR users.email = 'admin@gmail.com')
    )
  );

CREATE POLICY "Administradores pueden actualizar filtros" ON public.filters
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (users.is_admin = true OR users.email = 'admin@gmail.com')
    )
  );

CREATE POLICY "Administradores pueden eliminar filtros" ON public.filters
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (users.is_admin = true OR users.email = 'admin@gmail.com')
    )
  );

-- Políticas de RLS para filter_options (público para leer, solo admin para escribir)
CREATE POLICY "Opciones de filtros son públicas para lectura" ON public.filter_options
  FOR SELECT USING (true);

CREATE POLICY "Administradores pueden insertar opciones de filtros" ON public.filter_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (users.is_admin = true OR users.email = 'admin@gmail.com')
    )
  );

CREATE POLICY "Administradores pueden actualizar opciones de filtros" ON public.filter_options
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (users.is_admin = true OR users.email = 'admin@gmail.com')
    )
  );

CREATE POLICY "Administradores pueden eliminar opciones de filtros" ON public.filter_options
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (users.is_admin = true OR users.email = 'admin@gmail.com')
    )
  );

-- Insertar categorías por defecto
INSERT INTO public.categories (name, slug, display_order) VALUES
  ('Fragancias', 'fragancias', 1),
  ('Decants', 'decants', 2),
  ('Combos Decants', 'combos-decants', 3),
  ('Sprays (2x1)', 'sprays-2x1', 4),
  ('Marcas', 'marcas', 5),
  ('Beauty', 'beauty', 6)
ON CONFLICT (name) DO NOTHING;
