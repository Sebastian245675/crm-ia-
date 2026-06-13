import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Filter, Check, Star } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import { db } from '@/firebase';

interface ProductGridProps {
  title?: string;
  products?: any[];
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  title = "Nuestros Productos",
  products = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [dbProducts, setDbProducts] = useState<any[]>([]);

  // Safely use cart context (so it doesn't crash in environments without the provider, e.g., early builder previews)
  let cart: any = null;
  try {
    cart = useCart();
  } catch (e) {
    // Silently handle context absence
  }

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
              description: item.description || '',
              image: item.image || item.image_url || item.imageUrl || '',
              category: item.categoryName || item.category || 'Varios',
              stock: item.stock ?? 10,
              isOffer: item.isOffer ?? false
            })));
          }
        })
        .catch(console.error);
    }
  }, [products]);

  const itemsToUse = products && products.length > 0 ? products : dbProducts;

  // Extract unique categories
  const categories = ['Todos', ...Array.from(new Set(itemsToUse.map(p => p.categoryName || p.category || 'Varios')))];

  const filtered = itemsToUse.filter(p => {
    const name = String(p.name || '').toLowerCase();
    const desc = String(p.description || '').toLowerCase();
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = name.includes(term) || desc.includes(term);

    const cat = p.categoryName || p.category || 'Varios';
    const matchesCategory = selectedCategory === 'Todos' || cat === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: any) => {
    const productForCart = {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: Number(product.price),
      image: product.image || product.imageUrl || '',
      category: product.category || product.categoryName || 'Varios',
      stock: product.stock ?? 10
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

  return (
    <section id="catalogo-productos" className="w-full py-16 px-6 md:px-12 bg-slate-50/50">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Title and Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
          <div className="text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
            <p className="text-xs text-slate-500 mt-1">Mostrando {filtered.length} artículos disponibles</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar herramientas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Categories filter selector */}
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-9 pr-6 py-2 border border-slate-200 bg-white rounded-xl text-xs appearance-none focus:outline-none focus:border-blue-500 text-slate-700 font-semibold cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Product Grid Layout */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center bg-white border border-slate-100 rounded-2xl shadow-xs">
            <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 mt-3">No se encontraron productos</h3>
            <p className="text-xs text-slate-400 mt-1">Intenta ajustando el filtro de búsqueda o categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {filtered.map((prod) => (
              <div 
                key={prod.id} 
                className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all flex flex-col shadow-xs group"
              >
                {/* Image and Badges */}
                <div className="h-52 bg-slate-100 relative flex items-center justify-center overflow-hidden border-b">
                  {prod.image || prod.imageUrl ? (
                    <img 
                      src={prod.image || prod.imageUrl} 
                      alt={prod.name} 
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <ShoppingBag className="h-12 w-12 text-slate-300/80" />
                      <span className="text-[10px] text-slate-400 mt-2 font-mono">FOTO_MOCKUP</span>
                    </div>
                  )}

                  {prod.isOffer && (
                    <span className="absolute top-3 left-3 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">
                      Oferta
                    </span>
                  )}
                  
                  {prod.stock <= 5 && prod.stock > 0 && (
                    <span className="absolute top-3 right-3 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">
                      Últimos {prod.stock}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between text-left space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none">
                        {prod.categoryName || prod.category || 'Varios'}
                      </span>
                      <div className="flex items-center space-x-0.5">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        <span className="text-[9px] font-extrabold text-slate-500">4.9</span>
                      </div>
                    </div>
                    
                    <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {prod.name}
                    </h3>
                    
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {prod.description || 'Herramienta fabricada con los más altos estándares de calidad y durabilidad industrial.'}
                    </p>
                  </div>

                  {/* Pricing and Action */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                    <div className="flex flex-col">
                      {prod.isOffer && (
                        <span className="text-[10px] text-slate-400 line-through leading-none mb-0.5">
                          ${(prod.price * 1.25).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </span>
                      )}
                      <span className="text-lg font-black text-slate-900 leading-none">
                        ${Number(prod.price).toLocaleString('es-AR')}
                      </span>
                    </div>
                    
                    <button 
                      onClick={() => handleAddToCart(prod)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:shadow-none cursor-pointer"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>Comprar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
