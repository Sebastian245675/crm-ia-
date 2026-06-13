-- Tabla de reseñas de productos
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint único: un usuario solo puede dejar una reseña por producto
  UNIQUE(product_id, user_id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON product_reviews(created_at DESC);

-- Políticas RLS (Row Level Security)
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede leer las reseñas
CREATE POLICY "Las reseñas son públicas para lectura"
  ON product_reviews
  FOR SELECT
  TO public
  USING (true);

-- Política: Usuarios autenticados pueden insertar reseñas
CREATE POLICY "Usuarios autenticados pueden crear reseñas"
  ON product_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Los usuarios solo pueden actualizar sus propias reseñas
CREATE POLICY "Usuarios pueden actualizar sus propias reseñas"
  ON product_reviews
  FOR UPDATE
  TO authenticated
  USING (user_id = CAST(auth.uid() AS TEXT))
  WITH CHECK (user_id = CAST(auth.uid() AS TEXT));

-- Política: Los usuarios solo pueden eliminar sus propias reseñas
CREATE POLICY "Usuarios pueden eliminar sus propias reseñas"
  ON product_reviews
  FOR DELETE
  TO authenticated
  USING (user_id = CAST(auth.uid() AS TEXT));

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_product_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS set_product_reviews_updated_at ON product_reviews;
CREATE TRIGGER set_product_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_reviews_updated_at();

-- Vista para estadísticas de reseñas por producto
CREATE OR REPLACE VIEW product_reviews_stats AS
SELECT 
  product_id,
  COUNT(*) as total_reviews,
  AVG(rating) as average_rating,
  COUNT(CASE WHEN rating = 5 THEN 1 END) as five_stars,
  COUNT(CASE WHEN rating = 4 THEN 1 END) as four_stars,
  COUNT(CASE WHEN rating = 3 THEN 1 END) as three_stars,
  COUNT(CASE WHEN rating = 2 THEN 1 END) as two_stars,
  COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
FROM product_reviews
GROUP BY product_id;

-- Comentarios para documentación
COMMENT ON TABLE product_reviews IS 'Reseñas de productos dejadas por usuarios';
COMMENT ON COLUMN product_reviews.product_id IS 'ID del producto reseñado';
COMMENT ON COLUMN product_reviews.user_id IS 'ID del usuario que dejó la reseña';
COMMENT ON COLUMN product_reviews.rating IS 'Calificación de 1 a 5 estrellas';
COMMENT ON COLUMN product_reviews.comment IS 'Comentario del usuario sobre el producto';
