-- Filter Groups Setup - Supabase
-- Crea la tabla para grupos de filtros que permiten organizar productos

-- Tabla para grupos de filtros
CREATE TABLE IF NOT EXISTS public.filter_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  slug TEXT UNIQUE,
  color TEXT, -- Color para identificar visualmente el grupo
  icon TEXT, -- Nombre del icono (opcional)
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de relación muchos a muchos entre productos y grupos de filtros
CREATE TABLE IF NOT EXISTS public.product_filter_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  filter_group_id UUID NOT NULL REFERENCES public.filter_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, filter_group_id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_filter_groups_name ON public.filter_groups(name);
CREATE INDEX IF NOT EXISTS idx_filter_groups_slug ON public.filter_groups(slug);
CREATE INDEX IF NOT EXISTS idx_filter_groups_active ON public.filter_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_product_filter_groups_product_id ON public.product_filter_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_product_filter_groups_filter_group_id ON public.product_filter_groups(filter_group_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_filter_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS set_filter_groups_updated_at ON public.filter_groups;
CREATE TRIGGER set_filter_groups_updated_at
  BEFORE UPDATE ON public.filter_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_filter_groups_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.filter_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_filter_groups ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer filter_groups
DROP POLICY IF EXISTS "filter_groups_read_all" ON public.filter_groups;
CREATE POLICY "filter_groups_read_all"
  ON public.filter_groups
  FOR SELECT
  USING (true);

-- Política: Todos pueden insertar filter_groups (para admins)
DROP POLICY IF EXISTS "filter_groups_insert_all" ON public.filter_groups;
CREATE POLICY "filter_groups_insert_all"
  ON public.filter_groups
  FOR INSERT
  WITH CHECK (true);

-- Política: Todos pueden actualizar filter_groups
DROP POLICY IF EXISTS "filter_groups_update_all" ON public.filter_groups;
CREATE POLICY "filter_groups_update_all"
  ON public.filter_groups
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Política: Todos pueden leer product_filter_groups
DROP POLICY IF EXISTS "product_filter_groups_read_all" ON public.product_filter_groups;
CREATE POLICY "product_filter_groups_read_all"
  ON public.product_filter_groups
  FOR SELECT
  USING (true);

-- Política: Todos pueden insertar product_filter_groups
DROP POLICY IF EXISTS "product_filter_groups_insert_all" ON public.product_filter_groups;
CREATE POLICY "product_filter_groups_insert_all"
  ON public.product_filter_groups
  FOR INSERT
  WITH CHECK (true);

-- Política: Todos pueden eliminar product_filter_groups
DROP POLICY IF EXISTS "product_filter_groups_delete_all" ON public.product_filter_groups;
CREATE POLICY "product_filter_groups_delete_all"
  ON public.product_filter_groups
  FOR DELETE
  USING (true);

-- Comentarios
COMMENT ON TABLE public.filter_groups IS 'Grupos de filtros para organizar productos (ej: Ofertas, Nuevos, Más Vendidos)';
COMMENT ON TABLE public.product_filter_groups IS 'Relación muchos a muchos entre productos y grupos de filtros';
COMMENT ON COLUMN public.filter_groups.slug IS 'URL-friendly identifier para el grupo';
COMMENT ON COLUMN public.filter_groups.display_order IS 'Orden de visualización en la interfaz';
