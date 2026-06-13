-- Añadir columna liberta a la tabla users (permisos para subcuentas)
-- Ejecuta en Supabase: SQL Editor → New query → Pegar → Run
-- Soluciona error 400 al dar/quitar Liberta
-- liberta='si' = subcuenta puede publicar directo; 'no' = enviar a revisión

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS liberta TEXT DEFAULT 'no';

-- Si ya existía la columna sin default, asignar valor a nulls
UPDATE public.users SET liberta = 'no' WHERE liberta IS NULL;
