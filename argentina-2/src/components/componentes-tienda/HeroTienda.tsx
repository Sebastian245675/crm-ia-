import React from 'react';
import { ShoppingBag, ArrowRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeroTiendaProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  bgGradient?: string;
  bgImageUrl?: string;
  bgType?: 'color' | 'gradient' | 'image';
  bgColor?: string;
  onButtonClick?: () => void;
}

export const HeroTienda: React.FC<HeroTiendaProps> = ({
  title = "Bienvenido a Nuestra Tienda Virtual",
  subtitle = "Encuentra la mejor calidad, garantía de fábrica y envíos rápidos en todos nuestros productos.",
  buttonText = "Ver Catálogo",
  bgGradient = "from-blue-600 to-indigo-800 text-white",
  bgImageUrl,
  bgType = 'gradient',
  bgColor = '#1e293b',
  onButtonClick
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onButtonClick) {
      onButtonClick();
    } else {
      // Scroll to catalog section if exists or navigate
      const element = document.getElementById('catalogo-productos');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/admin');
      }
    }
  };

  let sectionClass = "w-full py-24 px-6 md:px-16 text-center relative overflow-hidden";
  let sectionStyle: React.CSSProperties = {};

  if (bgType === 'image') {
    sectionClass += " text-white";
    if (bgImageUrl) {
      sectionStyle = {
        backgroundImage: `url(${bgImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    } else {
      sectionClass += " bg-slate-800";
    }
  } else if (bgType === 'color') {
    sectionClass += " text-white";
    sectionStyle = {
      backgroundColor: bgColor
    };
  } else {
    // gradient
    sectionClass += ` bg-gradient-to-br ${bgGradient}`;
  }

  const hasBackgroundMedia = bgType === 'image' && bgImageUrl;

  return (
    <section 
      className={sectionClass}
      style={sectionStyle}
    >
      {/* Dark overlay for readability */}
      {hasBackgroundMedia && <div className="absolute inset-0 bg-slate-950/65 z-0"></div>}

      {/* Decorative background shapes */}
      {bgType !== 'image' && bgType !== 'color' && (
        <>
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </>
      )}

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-sm">
          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-200">
            Envío gratis en compras seleccionadas
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight md:leading-none">
          {title}
        </h1>
        
        <p className="text-sm md:text-xl opacity-90 max-w-2xl mx-auto leading-relaxed font-light">
          {subtitle}
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
          <button 
            onClick={handleClick}
            className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 font-extrabold rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 text-sm md:text-base cursor-pointer"
          >
            <span>{buttonText}</span>
            <ArrowRight className="h-4 w-4 text-slate-800" />
          </button>
          
          <button 
            onClick={() => navigate('/admin')}
            className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl border border-white/20 transition-all text-sm md:text-base cursor-pointer"
          >
            Soporte Técnico
          </button>
        </div>
      </div>
    </section>
  );
};
