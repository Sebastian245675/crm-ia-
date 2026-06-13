import React, { useState, useEffect } from 'react';
import { ShoppingBag, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import { db } from '@/firebase';

interface ProductCarouselProps {
  title?: string;
  products?: any[];
}

export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  title = "Ofertas y Lanzamientos",
  products = []
}) => {
  const [startIndex, setStartIndex] = useState(0);
  const [dbProducts, setDbProducts] = useState<any[]>([]);

  let cart: any = null;
  try {
    cart = useCart();
  } catch (e) {}

  useEffect(() => {
    if (!products || products.length === 0) {
      db.from('products').select('*')
        .then(({ data, error }) => {
          if (!error && data) {
            setDbProducts(data.map((item: any) => ({
              ...item,
              id: String(item.id || item._id),
              price: Number(item.price || 0),
              name: item.name || 'Producto sin nombre',
              image: item.image || item.image_url || item.imageUrl || '',
              category: item.categoryName || item.category || 'Varios'
            })));
          }
        })
        .catch(console.error);
    }
  }, [products]);

  const itemsToUse = products && products.length > 0 ? products : dbProducts;
  const visibleCount = 3;

  const handleNext = () => {
    if (startIndex + visibleCount < itemsToUse.length) {
      setStartIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (startIndex > 0) {
      setStartIndex(prev => prev - 1);
    }
  };

  const handleAddToCart = (product: any) => {
    const productForCart = {
      id: product.id,
      name: product.name,
      description: 'Producto del carrusel de destacados.',
      price: Number(product.price),
      image: product.image || product.imageUrl || '',
      category: product.category || 'Destacados',
      stock: 10
    };

    if (cart) {
      cart.addToCart(productForCart, 1);
      toast({
        title: "Producto añadido",
        description: `Se agregó ${product.name} al carrito.`
      });
    } else {
      toast({
        title: "Modo Editor",
        description: `Simulación: Añadiendo "${product.name}" al carrito.`
      });
    }
  };

  const visibleItems = itemsToUse.slice(startIndex, startIndex + visibleCount);

  return (
    <section className="w-full py-16 px-6 md:px-12 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header containing title and navigation arrows */}
        <div className="flex justify-between items-center border-b pb-4">
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wider">{title}</h3>
          
          <div className="flex space-x-2">
            <button 
              onClick={handlePrev}
              disabled={startIndex === 0}
              className={`h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center bg-slate-50 transition-all font-bold select-none ${
                startIndex === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 hover:text-blue-600 active:scale-90'
              }`}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
              onClick={handleNext}
              disabled={startIndex + visibleCount >= itemsToUse.length}
              className={`h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center bg-slate-50 transition-all font-bold select-none ${
                startIndex + visibleCount >= itemsToUse.length ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 hover:text-blue-600 active:scale-90'
              }`}
              aria-label="Siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Carousel Grid Items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 transition-all duration-300">
          {visibleItems.map((prod) => (
            <div 
              key={prod.id} 
              className="border border-slate-200/80 rounded-2xl p-4 flex flex-col items-center bg-white hover:shadow-md hover:border-blue-100 transition-all text-center relative group"
            >
              {/* Product Thumbnail */}
              <div className="h-40 w-full bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border">
                {prod.image || prod.imageUrl ? (
                  <img src={prod.image || prod.imageUrl} alt={prod.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-slate-300" />
                )}
              </div>

              {/* Title & Metadata */}
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-4">
                {prod.category}
              </span>
              <h4 className="text-sm font-bold text-slate-800 mt-1.5 truncate w-full px-2">
                {prod.name}
              </h4>
              
              {/* Price and buy button */}
              <div className="w-full flex items-center justify-between mt-5 pt-3 border-t border-slate-50">
                <span className="text-sm font-black text-slate-900">
                  ${Number(prod.price).toLocaleString('es-AR')}
                </span>
                
                <button 
                  onClick={() => handleAddToCart(prod)}
                  className="p-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Añadir al carrito"
                >
                  <ShoppingBag className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
