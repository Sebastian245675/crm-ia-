-- ============================================
-- MIGRACIÓN: Agregar columnas faltantes
-- Ejecuta este SQL en Supabase SQL Editor
-- ============================================

-- Agregar columnas a la tabla categories si no existen
DO $$ 
BEGIN
    -- parent_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='categories' AND column_name='parent_id') THEN
        ALTER TABLE public.categories ADD COLUMN parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
    END IF;
    
    -- parent_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='categories' AND column_name='parent_name') THEN
        ALTER TABLE public.categories ADD COLUMN parent_name TEXT;
    END IF;
    
    -- image
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='categories' AND column_name='image') THEN
        ALTER TABLE public.categories ADD COLUMN image TEXT;
    END IF;
END $$;

-- Agregar columnas a la tabla products si no existen
DO $$ 
BEGIN
    -- cost
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='cost') THEN
        ALTER TABLE public.products ADD COLUMN cost DECIMAL(10, 2);
    END IF;
    
    -- category_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='category_name') THEN
        ALTER TABLE public.products ADD COLUMN category_name TEXT;
    END IF;
    
    -- subcategory_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='subcategory_name') THEN
        ALTER TABLE public.products ADD COLUMN subcategory_name TEXT;
    END IF;
    
    -- tercera_categoria_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='tercera_categoria_name') THEN
        ALTER TABLE public.products ADD COLUMN tercera_categoria_name TEXT;
    END IF;
    
    -- created_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='created_by') THEN
        ALTER TABLE public.products ADD COLUMN created_by TEXT;
    END IF;
    
    -- last_modified_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='last_modified_by') THEN
        ALTER TABLE public.products ADD COLUMN last_modified_by TEXT;
    END IF;
    
    -- cost_updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='cost_updated_at') THEN
        ALTER TABLE public.products ADD COLUMN cost_updated_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- profit_margin
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='profit_margin') THEN
        ALTER TABLE public.products ADD COLUMN profit_margin DECIMAL(10, 2);
    END IF;
END $$;

-- Agregar columnas a la tabla orders si faltan
DO $$ 
BEGIN
    -- delivery_fee
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='delivery_fee') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_fee DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- order_notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='order_notes') THEN
        ALTER TABLE public.orders ADD COLUMN order_notes TEXT;
    END IF;
END $$;

-- Crear tabla revision si no existe (para sistema de aprobación)
CREATE TABLE IF NOT EXISTS public.revision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  status TEXT DEFAULT 'pendiente',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  editor_email TEXT,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mensaje de confirmación
DO $$ 
BEGIN
    RAISE NOTICE '✅ Migración completada exitosamente';
END $$;
