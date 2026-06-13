-- Product Analytics Setup - Supabase
-- Crea las tablas necesarias para el tracking de vistas de productos

-- Tabla para registrar cada vista individual de producto
CREATE TABLE IF NOT EXISTS public.product_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  product_name TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  session_id TEXT NOT NULL,
  date TEXT,
  time TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para analytics agregados por producto
CREATE TABLE IF NOT EXISTS public.product_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  total_views INTEGER NOT NULL DEFAULT 0,
  last_viewed TIMESTAMPTZ,
  views_by_day JSONB DEFAULT '{}'::jsonb,
  first_viewed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON public.product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_timestamp ON public.product_views(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_product_views_user_id ON public.product_views(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_session_id ON public.product_views(session_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_product_id ON public.product_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_total_views ON public.product_analytics(total_views DESC);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_product_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS set_product_analytics_updated_at ON public.product_analytics;
CREATE TRIGGER set_product_analytics_updated_at
  BEFORE UPDATE ON public.product_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_product_analytics_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer product_views (para analytics públicos)
DROP POLICY IF EXISTS "product_views_read_all" ON public.product_views;
CREATE POLICY "product_views_read_all"
  ON public.product_views
  FOR SELECT
  USING (true);

-- Política: Todos pueden insertar product_views (para tracking)
DROP POLICY IF EXISTS "product_views_insert_all" ON public.product_views;
CREATE POLICY "product_views_insert_all"
  ON public.product_views
  FOR INSERT
  WITH CHECK (true);

-- Política: Todos pueden leer product_analytics
DROP POLICY IF EXISTS "product_analytics_read_all" ON public.product_analytics;
CREATE POLICY "product_analytics_read_all"
  ON public.product_analytics
  FOR SELECT
  USING (true);

-- Política: Todos pueden insertar y actualizar product_analytics (para tracking automático)
DROP POLICY IF EXISTS "product_analytics_insert_all" ON public.product_analytics;
CREATE POLICY "product_analytics_insert_all"
  ON public.product_analytics
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "product_analytics_update_all" ON public.product_analytics;
CREATE POLICY "product_analytics_update_all"
  ON public.product_analytics
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE public.product_views IS 'Registro individual de cada vista de producto';
COMMENT ON TABLE public.product_analytics IS 'Analytics agregados por producto';
COMMENT ON COLUMN public.product_views.product_id IS 'ID del producto visto';
COMMENT ON COLUMN public.product_views.user_id IS 'ID del usuario (null si es anónimo)';
COMMENT ON COLUMN public.product_views.session_id IS 'ID de sesión único para tracking';
COMMENT ON COLUMN public.product_analytics.views_by_day IS 'JSON con vistas por día: {"2026-01-28": 5, ...}';
