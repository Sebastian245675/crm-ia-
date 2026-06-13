-- ============================================
-- CREAR TABLA DE COMENTARIOS / RESEÑAS
-- Ejecutar en Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT,
  product_name TEXT,
  user_name TEXT NOT NULL DEFAULT 'Anónimo',
  user_email TEXT,
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Política para usuarios autenticados (admin)
CREATE POLICY IF NOT EXISTS "Authenticated users can manage comments" 
  ON comments FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Política para lectura pública (solo visibles)
CREATE POLICY IF NOT EXISTS "Public can read visible comments" 
  ON comments FOR SELECT 
  TO anon 
  USING (visible = true);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_comments_product_id ON comments(product_id);
CREATE INDEX IF NOT EXISTS idx_comments_visible ON comments(visible);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
