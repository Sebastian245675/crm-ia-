import React from 'react';

/* ─── Configuración por categoría ───────────────────────────────────── */
interface CategoryConfig {
  image: string;
  tagline: string;
  title: string;
  subtitle: string;
  description: string;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  'tecnologia': {
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80',
    tagline: 'TECNOLOGÍA E INNOVACIÓN',
    title: 'Dispositivos de Última',
    subtitle: 'Generación',
    description: 'Encontrá los mejores smartphones, laptops y accesorios con garantía oficial.',
  },
  'moda': {
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=80',
    tagline: 'TENDENCIAS DE TEMPORADA',
    title: 'Vestí con Estilo y',
    subtitle: 'Personalidad',
    description: 'Renová tu outfit con calzado, indumentaria y accesorios de moda.',
  },
  'hogar': {
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1600&q=80',
    tagline: 'ESPACIOS CON ESTILO',
    title: 'Todo para tu',
    subtitle: 'Hogar y Cocina',
    description: 'Artículos de decoración, utensilios y equipamiento para reinventar tus ambientes.',
  },
  'beauty': {
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1600&q=80',
    tagline: 'CUIDADO Y BIENESTAR',
    title: 'Salud y',
    subtitle: 'Belleza Premium',
    description: 'Fragancias, cosméticos y productos de cuidado personal seleccionados.',
  },
  'deportes': {
    image: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1600&q=80',
    tagline: 'RENDIMIENTO MÁXIMO',
    title: 'Deportes y',
    subtitle: 'Fitness Total',
    description: 'Indumentaria técnica, equipamiento y accesorios para superarte cada día.',
  },
};

const DEFAULT_CONFIG: CategoryConfig = {
  image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=80',
  tagline: 'COLECCIÓN PREMIUM',
  title: 'Descubrí lo Nuevo en',
  subtitle: 'OmniShop',
  description: 'Una selección curada con los mejores productos de todas nuestras categorías.',
};

const PROMO_ITEMS = [
  'ENVÍO GRATIS A TODO EL PAÍS',
  '3 CUOTAS SIN INTERÉS EN TODA LA TIENDA',
];

interface CategoryBannerProps {
  name: string;
  image?: string | null;
}

export const CategoryBanner: React.FC<CategoryBannerProps> = ({ name }) => {
  const key = name.toLowerCase();
  const config = CATEGORY_CONFIG[key] ?? DEFAULT_CONFIG;

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ minHeight: '200px', height: 'clamp(200px, 28vw, 360px)', backgroundColor: '#f8f5f0' }}
    >
      {/* Imagen de fondo — LCP: fetchPriority high, eager */}
      <img
        src={config.image}
        srcSet={`${config.image}?w=640 640w, ${config.image} 1600w`}
        sizes="100vw"
        alt={name}
        width="1600"
        height="900"
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
      />



      {/* ─── Texto superpuesto — totalmente responsive ─────── */}
      <div
        className="absolute inset-0 flex flex-col justify-center z-20"
        style={{
          padding: 'clamp(0.5rem,2vw,1.5rem) 0 clamp(3rem,5vw,4rem) clamp(0.75rem,3vw,3rem)',
        }}
      >
        {/* Tagline con línea dorada */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <div style={{ height: '1px', width: '16px', backgroundColor: 'hsl(214,100%,15%)', flexShrink: 0 }} />
          <span
            style={{
              color: 'hsl(214,100%,15%)',
              fontSize: 'clamp(7px, 1.6vw, 9px)',
              letterSpacing: '0.2em',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {config.tagline}
          </span>
        </div>

        {/* Título principal */}
        <h1
          style={{
            color: '#1a1a2e',
            fontSize: 'clamp(1rem, 2.8vw, 1.9rem)',
            fontWeight: 300,
            lineHeight: 1.15,
            fontFamily: "'Outfit', sans-serif",
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {config.title}
        </h1>

        {/* Subtítulo dorado itálico */}
        <span
          style={{
            color: 'hsl(214,100%,15%)',
            fontSize: 'clamp(1rem, 2.8vw, 1.9rem)',
            fontWeight: 600,
            fontStyle: 'italic',
            fontFamily: "'Cormorant Garamond', serif",
            lineHeight: 1.2,
            display: 'block',
            marginBottom: '6px',
          }}
        >
          {config.subtitle}
        </span>

        {/* Línea separadora dorada */}
        <div style={{ width: '20px', height: '2px', backgroundColor: 'hsl(214,100%,15%)', marginBottom: '6px' }} />

        {/* Descripción — visible solo en pantallas ≥sm */}
        <p
          className="hidden sm:block"
          style={{
            color: '#3d3d3d',
            fontSize: 'clamp(0.58rem, 0.9vw, 0.72rem)',
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 400,
            maxWidth: '240px',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {config.description}
        </p>
      </div>

      {/* ─── Barra de promos inferior ───────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20"
        style={{ backgroundColor: 'rgba(8,8,8,0.88)', backdropFilter: 'blur(4px)' }}
      >
        <div className="grid grid-cols-2 divide-x divide-white/10">
          {PROMO_ITEMS.map((text, i) => (
            <div
              key={i}
              className="py-1.5 md:py-2 px-2 md:px-4 text-center font-medium tracking-wide"
              style={{ color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(8px, 2vw, 10px)' }}
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
