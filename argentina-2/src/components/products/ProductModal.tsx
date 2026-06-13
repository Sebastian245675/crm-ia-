
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Product } from '@/contexts/CartContext';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import { ShoppingCart, Plus, Minus, Star, Shield, Truck } from 'lucide-react';
import { recordProductView } from '@/lib/product-analytics';
import { useAuth } from '@/contexts/AuthContext';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, isOpen, onClose }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [viewRecorded, setViewRecorded] = useState(false);
  const [selectedMililitros, setSelectedMililitros] = useState<'2.5' | '5' | '10'>('2.5');

  // Detectar si el producto es un Decant
  const isDecant = React.useMemo(() => {
    if (!product) return false;
    if (product.isDecant === true) return true;
    const name = (product.name || '').trim();
    if (name.startsWith('D ')) return true;
    if (/decant/i.test(name)) return true;
    const cat = (product.categoryName || product.category || '').toLowerCase();
    if (cat.includes('decant')) return true;
    return false;
  }, [product]);

  // Obtener las variantes de ml habilitadas para decants
  const enabledMlOptions = React.useMemo((): ('2.5' | '5' | '10')[] => {
    if (!isDecant) return [];
    // Si hay decantOptions configuradas en la BD, usar solo las habilitadas
    if (product?.decantOptions) {
      const opts = (['2.5', '5', '10'] as const).filter(ml => product.decantOptions?.[ml]?.enabled);
      if (opts.length > 0) return opts;
    }
    // Fallback: si es decant pero no tiene opciones configuradas explícitamente, mostrar solo 5ml por defecto
    return ['5'];
  }, [isDecant, product]);

  // Calcular precio actual según si es decant y el ml seleccionado
  const currentPrice = React.useMemo(() => {
    if (!product) return 0;
    if (isDecant && product.decantOptions) {
      const opt = product.decantOptions[selectedMililitros];
      if (opt?.enabled && opt.price > 0) return opt.price;
    }
    return product.price;
  }, [product, selectedMililitros, isDecant]);

  // Auto-seleccionar el primer ml habilitado al cargar un decant
  useEffect(() => {
    if (isDecant && enabledMlOptions.length > 0 && !enabledMlOptions.includes(selectedMililitros)) {
      setSelectedMililitros(enabledMlOptions[0]);
    }
  }, [product?.id, enabledMlOptions, isDecant, selectedMililitros]);

  useEffect(() => {
    // Registrar vista solo cuando el modal se abre y tenemos un producto
    if (isOpen && product && !viewRecorded) {
      recordProductView(product.id, product.name, user?.id);
      setViewRecorded(true);
    }
    
    // Resetear el estado cuando el modal se cierra
    if (!isOpen) {
      setViewRecorded(false);
    }
  }, [isOpen, product, user?.id, viewRecorded]);

  if (!product) return null;

  const handleAddToCart = () => {
    // Para decants, crear un producto con el precio correcto del ml seleccionado
    const productToAdd = isDecant
      ? { ...product, price: currentPrice }
      : product;

    // Para decants, pasar el ml seleccionado para identificación única en el carrito
    const mlForCart = isDecant ? selectedMililitros : undefined;
    
    addToCart(productToAdd, quantity, undefined, mlForCart);
    
    const mlInfo = isDecant ? ` (${selectedMililitros === '2.5' ? 'Chico' : selectedMililitros === '5' ? 'Mediano' : 'Grande'})` : '';
    toast({
      title: "¡Producto agregado!",
      description: `${quantity}x ${product.name}${mlInfo} agregado a tu carrito`,
    });
    onClose();
  };

  const incrementQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 bg-slate-50 dark:bg-slate-900 rounded-xl">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Imagen del producto con galería */}
          <div className="relative bg-white dark:bg-slate-800 h-full">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black/20 z-10 opacity-50"></div>
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-[26rem] md:h-full object-cover transition-transform duration-300 hover:scale-105"
            />
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
              <Badge 
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium py-1.5 px-3"
              >
                {product.categoryName || product.category}
              </Badge>
            </div>
            {product.stock < 5 && (
              <Badge 
                variant="destructive"
                className="absolute top-4 left-4 z-20 animate-pulse py-1.5 px-3 bg-red-500/90 backdrop-blur-sm"
              >
                ¡Últimas {product.stock} unidades!
              </Badge>
            )}
          </div>

          {/* Detalles del producto */}
          <div className="p-8 flex flex-col bg-white dark:bg-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100 dark:bg-blue-900/20 rounded-full filter blur-3xl opacity-20 -mr-20 -mt-20"></div>
            
            <DialogHeader className="mb-6 relative">
              <DialogTitle className="text-2xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300">
                {product.name}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 space-y-6 relative">
              {/* Precio y disponibilidad */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Precio</div>
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">
                    ${currentPrice.toLocaleString()}
                  </span>
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400 py-1.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse"></span>
                    Disponible
                  </div>
                </Badge>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-700/30 rounded-lg">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i < 4 ? 'fill-blue-500 text-blue-500' : 'text-slate-300 dark:text-slate-600'}`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">(128 reseñas)</span>
              </div>

              <Separator className="bg-slate-200 dark:bg-slate-700" />

              {/* Descripción con diseño avanzado */}
              <div className="relative">
                <div className="absolute -left-3 top-0 h-full w-1 bg-gradient-to-b from-blue-500 to-blue-300 dark:from-blue-600 dark:to-blue-400 rounded-full"></div>
                <h4 className="font-semibold mb-3 text-slate-800 dark:text-slate-200 flex items-center">
                  <span className="bg-slate-100 dark:bg-slate-700 p-1 rounded-lg mr-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-500">
                      <path d="M8 10.5H16M8 14.5H13.5M10 3.5H14C14.8284 3.5 15.5 4.17157 15.5 5V6.5H8.5V5C8.5 4.17157 9.17157 3.5 10 3.5ZM5.5 6.5H18.5C19.3284 6.5 20 7.17157 20 8V16C20 16.8284 19.3284 17.5 18.5 17.5H5.5C4.67157 17.5 4 16.8284 4 16V8C4 7.17157 4.67157 6.5 5.5 6.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  Descripción
                </h4>
                <div className="bg-slate-50 dark:bg-slate-700/20 rounded-lg p-4 backdrop-blur-sm border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              </div>

              {/* Selección de Medida / Presentación */}
              {isDecant && enabledMlOptions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Selecciona el tamaño / medida
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {enabledMlOptions.map((ml) => (
                      <button
                        key={ml}
                        onClick={() => setSelectedMililitros(ml)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                          selectedMililitros === ml
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {ml === '2.5' ? 'Chico' : ml === '5' ? 'Mediano' : 'Grande'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    * El precio varía según el tamaño seleccionado
                  </p>
                </div>
              )}

              {/* Características con cards */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                  <span className="bg-slate-100 dark:bg-slate-700 p-1 rounded-lg mr-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-500">
                      <path d="M9 12L11 14L15.5 9.5M12 3L13.6667 6.82643C13.9082 7.39678 14.0289 7.68196 14.2 7.90787C14.3539 8.10786 14.5446 8.27142 14.7637 8.38658C15.0131 8.52 15.3053 8.56 15.8896 8.64L20 9.5L17.25 13C16.8333 13.5 16.625 13.75 16.5425 14.0559C16.4696 14.3216 16.4696 14.6045 16.5425 14.8702C16.625 15.176 16.8333 15.426 17.25 15.926L20 19.5L15.8896 20.36C15.3053 20.44 15.0131 20.48 14.7637 20.6134C14.5446 20.7286 14.3539 20.8921 14.2 21.0921C14.0289 21.318 13.9082 21.6032 13.6667 22.1736L12 26L10.3333 22.1736C10.0918 21.6032 9.97111 21.318 9.8 21.0921C9.64612 20.8921 9.4554 20.7286 9.23633 20.6134C8.98688 20.48 8.69467 20.44 8.11024 20.36L4 19.5L6.75 15.926C7.16667 15.426 7.375 15.176 7.4575 14.8702C7.53042 14.6045 7.53042 14.3216 7.4575 14.0559C7.375 13.75 7.16667 13.5 6.75 13L4 9.5L8.11024 8.64C8.69467 8.56 8.98688 8.52 9.23633 8.38658C9.4554 8.27142 9.64612 8.10786 9.8 7.90787C9.97111 7.68196 10.0918 7.39678 10.3333 6.82643L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  Beneficios
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-slate-700/30 rounded-lg p-3 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Garantía</div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">1 año de cobertura</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-700/30 rounded-lg p-3 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Envío</div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">Gratis a domicilio</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-700/30 rounded-lg p-3 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Star className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Calidad</div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">Premium</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-200 dark:bg-slate-700" />

              {/* Cantidad y Botones con diseño avanzado */}
              <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-700/20 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium mb-2 block text-slate-700 dark:text-slate-300">Cantidad</label>
                      <div className="flex items-center">
                        <button
                          className={`h-10 w-10 rounded-l-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center transition-colors ${
                            quantity <= 1 
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed' 
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                          onClick={decrementQuantity}
                          disabled={quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        
                        <div className="h-10 w-14 border-t border-b border-slate-300 dark:border-slate-600 flex items-center justify-center">
                          <span className="text-center font-semibold text-lg text-slate-800 dark:text-slate-200">
                            {quantity}
                          </span>
                        </div>
                        
                        <button
                          className={`h-10 w-10 rounded-r-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center transition-colors ${
                            quantity >= product.stock 
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed' 
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                          onClick={incrementQuantity}
                          disabled={quantity >= product.stock}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Stock</div>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${product.stock > 10 ? 'bg-green-500' : product.stock > 5 ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {product.stock} disponibles
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Total price calculation */}
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Total:</span>
                      <span className="text-xl font-bold text-slate-800 dark:text-white">
                        ${(product.price * quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    onClick={handleAddToCart}
                    className={`relative overflow-hidden h-14 text-white font-medium shadow-lg ${
                      product.stock === 0 
                        ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
                    }`}
                    disabled={product.stock === 0}
                  >
                    {product.stock === 0 ? (
                      <>Producto Agotado</>
                    ) : (
                      <>
                        <span className="absolute inset-0 overflow-hidden">
                          <span className="absolute -inset-[10px] opacity-30 bg-gradient-to-r from-transparent via-white to-transparent skew-x-12 group-hover:animate-shimmer"></span>
                        </span>
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Agregar al Carrito
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="h-14 bg-white dark:bg-transparent border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                  >
                    Seguir Viendo Productos
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
