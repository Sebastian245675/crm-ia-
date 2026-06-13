import React from 'react';

interface StoreFooterProps {
  company?: string;
}

export const StoreFooter: React.FC<StoreFooterProps> = ({
  company = "OmniShop"
}) => {
  return (
    <footer className="w-full bg-slate-950 text-slate-400 text-xs border-t border-slate-900">
      
      {/* Primary Sitemap Directory Grid */}
      <div className="max-w-6xl mx-auto py-12 px-6 md:px-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left border-b border-slate-900">
        <div className="space-y-3">
          <span className="font-extrabold text-slate-200 text-sm uppercase tracking-wider block">
            {company}
          </span>
          <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
            Tu distribuidor de confianza para herramientas, maquinarias y soluciones industriales de ferretería.
          </p>
        </div>

        <div className="space-y-2">
          <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block">Soporte y Contacto</span>
          <span className="block hover:text-slate-200 cursor-pointer">Preguntas Frecuentes</span>
          <span className="block hover:text-slate-200 cursor-pointer">Servicio Técnico Oficial</span>
          <span className="block hover:text-slate-200 cursor-pointer">Políticas de Envío</span>
        </div>

        <div className="space-y-2">
          <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block">Legal</span>
          <span className="block hover:text-slate-200 cursor-pointer">Políticas de Privacidad</span>
          <span className="block hover:text-slate-200 cursor-pointer">Términos y Condiciones</span>
          <span className="block hover:text-slate-200 cursor-pointer">Defensa del Consumidor</span>
        </div>
      </div>

      {/* Copyright Footer strip */}
      <div className="max-w-6xl mx-auto py-6 px-6 md:px-12 flex flex-col sm:flex-row justify-between items-center gap-4 text-left">
        <span className="text-[11px] text-slate-500">
          © {new Date().getFullYear()} {company}. Todos los derechos reservados.
        </span>
        <div className="flex items-center space-x-1 text-[11px] text-slate-500">
          <span>Desarrollado por</span>
          <span className="font-black text-slate-300 tracking-tight">merco • agency</span>
        </div>
      </div>
    </footer>
  );
};
