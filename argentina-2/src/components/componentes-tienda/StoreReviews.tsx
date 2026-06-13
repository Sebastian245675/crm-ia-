import React from 'react';
import { Star, Quote } from 'lucide-react';

interface StoreReviewsProps {
  title?: string;
  clientName?: string;
  reviewText?: string;
}

export const StoreReviews: React.FC<StoreReviewsProps> = ({
  title = "Opiniones de Clientes",
  clientName = "Juan Carlos Pérez",
  reviewText = "Excelente atención. Compré una soldadora inverter y un taladro percutor Stanley; me llegó todo en menos de 24 horas y con embalaje reforzado. Muy recomendable."
}) => {
  return (
    <section className="w-full py-16 px-6 md:px-12 bg-white">
      <div className="max-w-4xl mx-auto space-y-8 text-center">
        {title && (
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">{title}</h2>
        )}

        <div className="border border-slate-200/80 rounded-3xl p-8 md:p-10 bg-slate-50/30 relative max-w-2xl mx-auto shadow-xs">
          {/* Decorative quote icon */}
          <div className="absolute top-4 right-6 text-slate-200/50">
            <Quote className="h-10 w-10 transform scale-x-[-1]" />
          </div>

          <div className="space-y-4 relative z-10 text-center">
            {/* Stars */}
            <div className="flex justify-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4.5 w-4.5 text-amber-400 fill-amber-400" />
              ))}
            </div>

            <p className="text-sm md:text-base italic text-slate-700 leading-relaxed max-w-lg mx-auto">
              "{reviewText}"
            </p>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <div className="h-9 w-9 bg-blue-100 border border-blue-200 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold uppercase shadow-sm">
                {clientName?.charAt(0)}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-extrabold text-slate-800 leading-none">{clientName}</span>
                <span className="text-[10px] text-slate-400 font-semibold leading-none mt-1">Comprador Verificado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
