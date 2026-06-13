-- Agregar columnas de cliente y tipo a orders para ventas físicas (POS)
-- Ejecuta en Supabase: SQL Editor → New query → Pegar → Run

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='orders' AND column_name='order_type') THEN
        ALTER TABLE public.orders ADD COLUMN order_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='orders' AND column_name='user_name') THEN
        ALTER TABLE public.orders ADD COLUMN user_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='orders' AND column_name='user_email') THEN
        ALTER TABLE public.orders ADD COLUMN user_email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='orders' AND column_name='user_phone') THEN
        ALTER TABLE public.orders ADD COLUMN user_phone TEXT;
    END IF;
END $$;
