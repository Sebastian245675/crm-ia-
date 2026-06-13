import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SLIDES = [
  {
    img: '/chanel_hero.png',
    alt: 'Fragancias Árabes Premium',
  },
  {
    img: '/nicho_carousel.png',
    alt: 'Fragancias de Nicho',
  },
  {
    img: '/decants_banner.png',
    alt: 'Decants de Lujo',
  },
];

export const HeroBanner: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Auto-avance
  useEffect(() => {
    const t = setInterval(() => setCurrent((p) => (p + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const goPrev = useCallback(() => setCurrent((p) => (p === 0 ? SLIDES.length - 1 : p - 1)), []);
  const goNext = useCallback(() => setCurrent((p) => (p + 1) % SLIDES.length), []);

  // Soporte touch/swipe para móvil
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const delta = touchStartX.current - touchEndX.current;
      if (Math.abs(delta) > 40) {
        delta > 0 ? goNext() : goPrev();
      }
    }
  };

  return (
    <section
      className="relative w-full overflow-hidden bg-[#f0ece6]"
      style={{ minHeight: '220px', height: 'clamp(220px, 30vw, 380px)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── LCP ── */}
      {SLIDES.map((slide, idx) => (
        <div
          key={slide.img}
          className="absolute inset-0 w-full h-full transition-opacity duration-700"
          style={{ opacity: current === idx ? 1 : 0, zIndex: current === idx ? 1 : 0 }}
        >
          <img
            src={slide.img}
            alt={slide.alt}
            width="1600"
            height="900"
            className="w-full h-full object-cover"
            draggable={false}
            loading={idx === 0 ? "eager" : "lazy"}
          />
        </div>
      ))}

      {/* ── Texto superpuesto ── */}
      <div
        className="absolute inset-0 flex flex-col justify-center z-20 pointer-events-none"
        style={{ padding: 'clamp(0.75rem,3vw,3rem) 0 clamp(3rem,5vw,3.5rem) clamp(0.75rem,3vw,3rem)' }}
      >
        {/* Tagline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{ height: '1px', width: '18px', backgroundColor: 'hsl(214,100%,15%)', flexShrink: 0 }} />
          <span style={{
            color: 'hsl(214,100%,15%)',
            fontSize: 'clamp(7px, 1.8vw, 10px)',
            letterSpacing: '0.22em',
            fontWeight: 700,
            textTransform: 'uppercase',
            fontFamily: "'Outfit', sans-serif",
          }}>
            EN FRAGANCIAS PREMIUM
          </span>
        </div>

        {/* Título */}
        <p style={{
          color: '#1a1a2e',
          fontSize: 'clamp(1.1rem, 4vw, 3rem)',
          fontWeight: 700,
          fontStyle: 'italic',
          fontFamily: "'Cormorant Garamond', serif",
          lineHeight: 1.1,
          margin: 0,
          letterSpacing: '-0.01em',
          textShadow: '0 1px 6px rgba(255,255,255,0.5)',
        }}>
          ENVÍO GRATIS
        </p>

        {/* Subtítulo */}
        <p className="hidden sm:block" style={{
          color: '#3d3d3d',
          fontSize: 'clamp(0.65rem, 1vw, 0.8rem)',
          fontFamily: "'Outfit', sans-serif",
          marginTop: '6px',
          maxWidth: '220px',
          lineHeight: 1.5,
        }}>
          A partir de $150.000 — Bs. As. y Salta con entrega incluida.
        </p>
      </div>

      {/* ── Flechas ── */}
      <button
        type="button"
        onClick={goPrev}
        className="absolute left-2 md:left-5 top-1/2 -translate-y-1/2 w-8 h-8 md:w-11 md:h-11 rounded-full bg-white/25 hover:bg-white/45 backdrop-blur-sm flex items-center justify-center text-gray-800 transition-all z-30"
        aria-label="Anterior"
      >
        <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
      </button>
      <button
        type="button"
        onClick={goNext}
        className="absolute right-2 md:right-5 top-1/2 -translate-y-1/2 w-8 h-8 md:w-11 md:h-11 rounded-full bg-white/25 hover:bg-white/45 backdrop-blur-sm flex items-center justify-center text-gray-800 transition-all z-30"
        aria-label="Siguiente"
      >
        <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      {/* ── Dots ── */}
      <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrent(idx)}
            className={`rounded-full border-2 transition-all ${current === idx
                ? 'w-5 h-2.5 bg-amber-600 border-amber-600'
                : 'w-2.5 h-2.5 bg-white/50 border-white/50 hover:bg-white/80'
              }`}
            aria-label={`Ir a imagen ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
};
