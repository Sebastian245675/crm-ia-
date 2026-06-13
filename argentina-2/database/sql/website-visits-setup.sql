-- Website Visits Setup - Supabase
-- Crea la tabla para registrar visitas generales al sitio web

-- Tabla para registrar visitas generales al sitio web
CREATE TABLE IF NOT EXISTS public.website_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  page_url TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_info JSONB,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_website_visits_session_id ON public.website_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_website_visits_timestamp ON public.website_visits(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_website_visits_user_id ON public.website_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_website_visits_date ON public.website_visits(date DESC);
CREATE INDEX IF NOT EXISTS idx_website_visits_page_url ON public.website_visits(page_url);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.website_visits ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer website_visits (para analytics públicos)
DROP POLICY IF EXISTS "website_visits_read_all" ON public.website_visits;
CREATE POLICY "website_visits_read_all"
  ON public.website_visits
  FOR SELECT
  USING (true);

-- Política: Todos pueden insertar website_visits (para tracking)
DROP POLICY IF EXISTS "website_visits_insert_all" ON public.website_visits;
CREATE POLICY "website_visits_insert_all"
  ON public.website_visits
  FOR INSERT
  WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE public.website_visits IS 'Registro de visitas generales al sitio web';
COMMENT ON COLUMN public.website_visits.session_id IS 'ID de sesión único para tracking';
COMMENT ON COLUMN public.website_visits.user_id IS 'ID del usuario (null si es anónimo)';
COMMENT ON COLUMN public.website_visits.page_url IS 'URL de la página visitada';
COMMENT ON COLUMN public.website_visits.device_info IS 'Información del dispositivo en formato JSON';
