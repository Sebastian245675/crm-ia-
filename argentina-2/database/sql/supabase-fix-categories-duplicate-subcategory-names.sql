-- Permitir el mismo nombre de subcategoría en diferentes categorías principales
-- Ejemplo: "Arabe" bajo Sellados y "Arabe" bajo Decants
-- Ejecuta en Supabase: SQL Editor → New query → Pegar → Run

-- 1. Eliminar la restricción UNIQUE global en name (impide duplicados en toda la tabla)
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_key;

-- 2. Categorías principales: el nombre debe ser único (solo una "Sellados", una "Decants", etc.)
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_unique_main 
  ON public.categories (name) 
  WHERE parent_id IS NULL;

-- 3. Subcategorías: el nombre puede repetirse si el padre es distinto
--    ("Arabe" en Sellados) y ("Arabe" en Decants) son válidos
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_parent_unique 
  ON public.categories (name, parent_id) 
  WHERE parent_id IS NOT NULL;
