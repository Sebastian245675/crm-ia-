import React, { useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StepComponentProps } from '../types';

export const OffersStep: React.FC<StepComponentProps> = ({ 
  formData, 
  setFormData 
}) => {
  const originalPrice = parseFloat(formData.originalPrice) || 0;
  const discountPercent = parseFloat(formData.discount) || 0;

  // Calcular precio final y ahorro
  const discountAmount = originalPrice > 0 && discountPercent > 0
    ? Math.round(originalPrice * (discountPercent / 100))
    : 0;
  const finalPrice = originalPrice > 0 && discountPercent > 0
    ? originalPrice - discountAmount
    : originalPrice;

  // Actualizar automáticamente el precio de venta cuando cambia el descuento o el precio original
  const updatePriceFromDiscount = useCallback(() => {
    if (formData.isOffer && originalPrice > 0 && discountPercent > 0) {
      const calculatedPrice = originalPrice - Math.round(originalPrice * (discountPercent / 100));
      if (calculatedPrice > 0 && String(calculatedPrice) !== formData.price) {
        setFormData(prev => ({ ...prev, price: String(calculatedPrice) }));
      }
    }
  }, [formData.isOffer, originalPrice, discountPercent]);

  useEffect(() => {
    updatePriceFromDiscount();
  }, [updatePriceFromDiscount]);

  const handleOriginalPriceChange = (value: string) => {
    setFormData(prev => ({ ...prev, originalPrice: value }));
  };

  const handleDiscountChange = (value: string) => {
    // Limitar a 0-100
    const num = parseFloat(value);
    if (value === '' || (num >= 0 && num <= 100)) {
      setFormData(prev => ({ ...prev, discount: value }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-900">
          <strong>Ofertas y Promociones</strong>
        </p>
        <p className="text-sm text-green-700 mt-1">
          Configura descuentos y ofertas especiales para este producto
        </p>
      </div>

      {/* Activar Oferta */}
      <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
        <input
          type="checkbox"
          id="isOffer"
          checked={formData.isOffer}
          onChange={(e) => {
            const isChecked = e.target.checked;
            setFormData(prev => ({
              ...prev,
              isOffer: isChecked,
              // Si se desactiva la oferta, restaurar precio original como precio de venta
              ...(!isChecked && originalPrice > 0 ? { price: String(originalPrice) } : {})
            }));
          }}
          className="w-5 h-5 rounded text-green-600 focus:ring-2 focus:ring-green-500"
        />
        <Label htmlFor="isOffer" className="text-base font-semibold cursor-pointer flex items-center gap-2">
          Activar oferta especial
          <Badge variant="outline" className={formData.isOffer ? 'bg-green-50 text-green-700 border-green-200' : ''}>
            {formData.isOffer ? 'Activo' : 'Inactivo'}
          </Badge>
        </Label>
      </div>

      {/* Campos de Oferta */}
      {formData.isOffer && (
        <div className="space-y-6 p-5 border border-gray-200 rounded-lg bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="originalPrice" className="text-sm font-semibold text-gray-700">
                Precio Original ($)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                <Input
                  id="originalPrice"
                  type="number"
                  value={formData.originalPrice}
                  onChange={(e) => handleOriginalPriceChange(e.target.value)}
                  placeholder="Ej: 70"
                  className="h-11 pl-7"
                  min="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount" className="text-sm font-semibold text-gray-700">
                Descuento (%)
              </Label>
              <div className="relative">
                <Input
                  id="discount"
                  type="number"
                  value={formData.discount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  placeholder="Ej: 10"
                  className="h-11 pr-8"
                  min="0"
                  max="100"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
              </div>
            </div>
          </div>

          {/* Resumen del Descuento en Pesos */}
          {originalPrice > 0 && discountPercent > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                📊 Resumen de la Oferta
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Precio Original */}
                <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-1">Precio Original</p>
                  <p className="text-lg font-bold text-gray-900">
                    ${originalPrice.toLocaleString('es-AR')}
                  </p>
                </div>

                {/* Descuento */}
                <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
                  <p className="text-[11px] uppercase tracking-wider text-red-600 font-medium mb-1">Descuento</p>
                  <p className="text-lg font-bold text-red-600">
                    -{discountPercent}% = -${discountAmount.toLocaleString('es-AR')}
                  </p>
                </div>

                {/* Precio Final */}
                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                  <p className="text-[11px] uppercase tracking-wider text-green-700 font-medium mb-1">Precio Final</p>
                  <p className="text-lg font-bold text-green-700">
                    ${finalPrice.toLocaleString('es-AR')}
                  </p>
                </div>
              </div>

              {/* Vista Previa como se vería en la tienda */}
              <div className="border-t border-gray-200 pt-4 mt-2">
                <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Vista previa en la tienda:</p>
                <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-dashed border-gray-300">
                  <span className="text-sm text-gray-400 line-through">
                    ${originalPrice.toLocaleString('es-AR')}
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    ${finalPrice.toLocaleString('es-AR')}
                  </span>
                  <Badge className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm">
                    -{discountPercent}% OFF
                  </Badge>
                  <span className="text-xs text-green-600 font-medium ml-auto">
                    Ahorrás ${discountAmount.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje de ayuda cuando falta info */}
          {originalPrice <= 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-700">
                💡 Ingresá el <strong>precio original</strong> del producto para configurar el descuento.
              </p>
            </div>
          )}
          {originalPrice > 0 && discountPercent <= 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                💡 Ingresá el <strong>porcentaje de descuento</strong> para ver el cálculo automático.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
