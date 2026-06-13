import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';

interface PurchaseButtonProps {
  title?: string;
  price?: string;
  align?: 'left' | 'center' | 'right';
}

export const PurchaseButton: React.FC<PurchaseButtonProps> = ({
  title = "Añadir al Carrito",
  price = "$12,490",
  align = 'center'
}) => {
  let cart: any = null;
  try {
    cart = useCart();
  } catch (e) {}

  const handlePurchase = () => {
    const numPrice = Number(price.replace(/[^0-9]/g, '')) || 12490;
    const mockProduct = {
      id: 'prod-cta-button',
      name: title,
      description: 'Compra rápida mediante botón de llamado a la acción.',
      price: numPrice,
      image: '',
      category: 'Botón Rápido',
      stock: 99
    };

    if (cart) {
      cart.addToCart(mockProduct, 1);
      toast({
        title: "Producto añadido",
        description: `Se añadió "${title}" al carrito.`
      });
    } else {
      toast({
        title: "Modo Editor",
        description: `Simulación: Añadiendo "${title}" al carrito.`
      });
    }
  };

  const alignmentClass = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';

  return (
    <div className={`w-full py-6 px-6 bg-white flex ${alignmentClass}`}>
      <button 
        onClick={handlePurchase}
        className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black rounded-2xl text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center space-x-2.5 cursor-pointer"
      >
        <ShoppingBag className="h-4.5 w-4.5" />
        <span>{title}</span>
        {price && (
          <>
            <span className="opacity-40">|</span>
            <span className="tracking-tight">{price}</span>
          </>
        )}
      </button>
    </div>
  );
};
