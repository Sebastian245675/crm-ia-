import React from 'react';
import { CreditCard, Package, Sparkles } from 'lucide-react';

export const PromoBanner: React.FC = () => {
  const items = [
    {
      icon: <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><Sparkles className="w-5 h-5 text-gray-700" /></div>,
      title: 'PROMOS',
      description: 'Aprovechá nuestras ofertas'
    },
    {
      icon: <Package className="w-5 h-5 text-gray-700" />,
      title: 'ENVÍOS GRATIS',
      description: 'En compras superiores a $50.000'
    },
    {
      icon: <CreditCard className="w-5 h-5 text-gray-700" />,
      title: '3 CUOTAS',
      description: 'Pagá con todas las tarjetas'
    }
  ];

  return (
    <div className="w-full bg-white border-y border-gray-100 py-6 md:py-8 px-4">
      <div className="max-w-[1300px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-4 justify-center md:justify-start px-2">
            <div className="flex-shrink-0">
              {item.icon}
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] md:text-[13px] font-bold tracking-widest text-black leading-tight uppercase">
                {item.title}
              </span>
              <span className="text-[10px] md:text-[11px] text-gray-500 font-medium leading-tight mt-0.5 uppercase tracking-wider">
                {item.description}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
