import React from 'react';
import { Truck, ShieldCheck, HeartHandshake, CreditCard } from 'lucide-react';

interface FeatureBannerProps {
  title?: string;
  f1?: string;
  f2?: string;
  f3?: string;
  f4?: string;
}

export const FeatureBanner: React.FC<FeatureBannerProps> = ({
  title = "Nuestros Compromisos con Vos",
  f1 = "Envíos en el día gratis",
  f2 = "Pagos Seguros y en Cuotas",
  f3 = "Garantía de Fábrica Directa",
  f4 = "Atención Técnica 24/7"
}) => {
  return (
    <section className="w-full py-16 px-6 md:px-12 bg-slate-50">
      <div className="max-w-5xl mx-auto space-y-12">
        {title && (
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight text-center uppercase tracking-widest leading-none">
            {title}
          </h2>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {/* Feature 1 */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col items-center text-center space-y-3 shadow-xs hover:shadow-md transition-all">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
              <Truck className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">{f1}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Recibí tu compra en menos de 24 horas en las principales localidades.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col items-center text-center space-y-3 shadow-xs hover:shadow-md transition-all">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
              <CreditCard className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">{f2}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Aceptamos todas las tarjetas de crédito, débito y transferencia bancaria.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col items-center text-center space-y-3 shadow-xs hover:shadow-md transition-all">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">{f3}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Todos nuestros productos cuentan con cobertura de fábrica certificada.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col items-center text-center space-y-3 shadow-xs hover:shadow-md transition-all">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">{f4}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Soporte post-venta capacitado para resolver cualquier duda técnica.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
