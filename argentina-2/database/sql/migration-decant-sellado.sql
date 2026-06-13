-- ==========================================
-- MIGRACIÓN: Agregar campos is_decant y decant_options a products
-- Ejecutar en la consola SQL de Supabase
-- ==========================================

-- 1. Agregar columna is_decant (booleano) si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'is_decant'
  ) THEN
    ALTER TABLE public.products ADD COLUMN is_decant BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Columna is_decant agregada';
  ELSE
    RAISE NOTICE '⚠️ Columna is_decant ya existe';
  END IF;
END $$;

-- 2. Agregar columna decant_options (JSONB) si no existe
-- Formato esperado: {"2.5": {"enabled": true, "price": 5000}, "5": {"enabled": true, "price": 8000}, "10": {"enabled": true, "price": 12000}}
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'decant_options'
  ) THEN
    ALTER TABLE public.products ADD COLUMN decant_options JSONB DEFAULT NULL;
    RAISE NOTICE '✅ Columna decant_options agregada';
  ELSE
    RAISE NOTICE '⚠️ Columna decant_options ya existe';
  END IF;
END $$;

-- 3. Marcar productos existentes de categoría "decant" como is_decant = true
UPDATE public.products
SET is_decant = TRUE
WHERE (
  LOWER(category_name) LIKE '%decant%'
  OR LOWER(category) LIKE '%decant%'
  OR LOWER(name) LIKE '%decant%'
)
AND is_decant IS NOT TRUE;

-- 4. Marcar productos "Sellado" explícitamente como is_decant = false
UPDATE public.products
SET is_decant = FALSE
WHERE is_decant IS NULL;

-- 5. Crear índice para filtrar rápidamente decants vs sellados
CREATE INDEX IF NOT EXISTS idx_products_is_decant ON public.products(is_decant);

-- 6. Verificación
SELECT 
  is_decant,
  COUNT(*) as total
FROM public.products
WHERE is_published = TRUE
GROUP BY is_decant
ORDER BY is_decant;

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ Migración decant/sellado completada';
  RAISE NOTICE '==========================================';
END $$;
