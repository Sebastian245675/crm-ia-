import React, { useState } from 'react';
import { ShoppingBag, Star, Shield, Truck, RefreshCw, Plus, Minus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';

interface ProductDetailsProps {
  title?: string;
  subtitle?: string;
  price?: string;
  imageUrl?: string;
  buttonText?: string;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({
  title = "Taladro Percutor Bosch 650W Profesional",
  subtitle = "Excelente potencia y durabilidad para trabajos exigentes de perforación en mampostería, madera y metal.",
  price = "$12,490",
  imageUrl = "",
  buttonText = "Añadir al Carrito"
}) => {
  const [quantity, setQuantity] = useState(1);

  let cart: any = null;
  try {
    cart = useCart();
  } catch (e) {}

  const handleAddToCart = () => {
    const numPrice = Number(price.replace(/[^0-9]/g, '')) || 12490;
    const mockProduct = {
      id: 'prod-detail-selected',
      name: title,
      description: subtitle,
      price: numPrice,
      image: imageUrl,
      category: 'Destacados',
      stock: 50
    };

    if (cart) {
      cart.addToCart(mockProduct, quantity);
      toast({
        title: "Agregado al carrito",
        description: `Se agregaron ${quantity} unidades de "${title}".`
      });
    } else {
      toast({
        title: "Modo Editor",
        description: `Simulación: Agregando ${quantity}x "${title}" al carrito.`
      });
    }
  };

  return (
    <section className="w-full py-16 px-6 md:px-12 bg-white flex justify-center">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-start bg-white border border-slate-200/80 p-6 md:p-10 rounded-3xl shadow-sm">
        
        {/* Left Column: Image and Badges */}
        <div className="space-y-6">
          <div className="bg-slate-100/50 rounded-2xl aspect-square flex items-center justify-center text-slate-400 p-8 border border-slate-200/60 overflow-hidden relative shadow-inner">
            {imageUrl ? (
              <img src={imageUrl} alt={title} className="h-full w-full object-cover rounded-xl" />
            ) : (
              <div className="flex flex-col items-center">
                <ShoppingBag className="h-20 w-20 text-slate-300/80" />
                <span className="text-xs text-slate-400 mt-3 font-mono uppercase tracking-widest">Vista Previa Imagen</span>
              </div>
            )}
            
            <span className="absolute top-4 left-4 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg shadow-sm">
              Original Garantizado
            </span>
          </div>

          {/* Quick Specifications Info Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col items-center text-center space-y-1">
              <Shield className="h-4.5 w-4.5 text-blue-600" />
              <span className="text-[10px] font-extrabold text-slate-800">Garantía</span>
              <span className="text-[9px] text-slate-400">1 Año Oficial</span>
            </div>
            <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col items-center text-center space-y-1">
              <Truck className="h-4.5 w-4.5 text-blue-600" />
              <span className="text-[10px] font-extrabold text-slate-800">Envío</span>
              <span className="text-[9px] text-slate-400">Rápido 24h</span>
            </div>
            <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col items-center text-center space-y-1">
              <RefreshCw className="h-4.5 w-4.5 text-blue-600" />
              <span className="text-[10px] font-extrabold text-slate-800">Devolución</span>
              <span className="text-[9px] text-slate-400">30 Días Gratis</span>
            </div>
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="space-y-6 text-left">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">
              Ferretería Profesional
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {title}
            </h2>
            <div className="flex items-center space-x-1.5 pt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
              ))}
              <span className="text-xs text-slate-500 font-medium">(4.9 Estrellas — 87 Comentarios)</span>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            {subtitle}
          </p>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">Precio Final</span>
            <div className="text-3xl font-black text-slate-900">{price}</div>
            <span className="text-[10px] text-emerald-600 font-bold block">
              ✓ Pagando en cuotas sin interés o 10% de descuento vía transferencia.
            </span>
          </div>

          {/* Quantity Selector and Action */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-150">
            <div className="flex items-center bg-slate-100 border rounded-xl px-3 py-2 justify-between w-full sm:w-32 shrink-0">
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="text-slate-500 hover:text-slate-900 p-1"
                aria-label="Disminuir cantidad"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="font-extrabold text-slate-800 text-sm">{quantity}</span>
              <button 
                onClick={() => setQuantity(q => q + 1)}
                className="text-slate-500 hover:text-slate-900 p-1"
                aria-label="Aumentar cantidad"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button 
              onClick={handleAddToCart}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>{buttonText}</span>
            </button>
          </div>

          {/* Secure Purchase Info */}
          <div className="pt-2 flex items-center gap-2 text-[10px] text-slate-400">
            <Shield className="h-3.5 w-3.5 text-slate-400" />
            <span>Transacción segura de extremo a extremo. Encriptación SSL certificada.</span>
          </div>
        </div>

      </div>
    </section>
  );
};
