import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepComponentProps } from '../types';

// Opciones de Decant por defecto: 2.5ml desactivada, 5ml y 10ml activas
const DEFAULT_DECANT_OPTIONS = {
  '2.5': { enabled: false, price: '', stock: '' },
  '5':   { enabled: true,  price: '', stock: '' },
  '10':  { enabled: true,  price: '', stock: '' },
};

export const PricingStep: React.FC<StepComponentProps> = ({
  formData,
  setFormData,
  categories,
  onValidationChange,
}) => {
  // Detectar automáticamente si es Decant por categoría o por nombre
  const selectedCatName = (categories.find(c => c.id === formData.category)?.name || '').toLowerCase();
  const productName = (formData.name || '').toLowerCase();
  
  const isDecantAutoDetected = selectedCatName.includes('decant') || productName.includes('decant');

  // Sincronizar el estado automático con el formData
  React.useEffect(() => {
    // Solo actuar si ya cargaron las categorías (para evitar falsos negativos al inicio)
    if (categories.length === 0) return;

    if (isDecantAutoDetected && !formData.isDecant) {
      setFormData({
        ...formData,
        isDecant: true,
        decantOptions: formData.decantOptions || DEFAULT_DECANT_OPTIONS,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDecantAutoDetected, categories.length]);

  // Permitir que el usuario lo active/desactive manualmente si lo desea
  const toggleDecantMode = (enabled: boolean) => {
    setFormData({
      ...formData,
      isDecant: enabled,
      decantOptions: enabled ? (formData.decantOptions || DEFAULT_DECANT_OPTIONS) : formData.decantOptions
    });
  };

  // Validación: si es Decant, al menos una presentación debe tener precio y stock; si no, price y stock globales
  React.useEffect(() => {
    let isValid = false;
    if (formData.isDecant) {
      const opts = formData.decantOptions || DEFAULT_DECANT_OPTIONS;
      isValid = (['2.5', '5', '10'] as const).some(
        ml => opts[ml].enabled && opts[ml].price !== '' && opts[ml].stock !== ''
      );
    } else {
      isValid = !!(formData.price && formData.stock);
    }
    onValidationChange?.(isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.price, formData.stock, formData.decantOptions, formData.isDecant]);

  const margin =
    formData.price && formData.cost && parseFloat(formData.price) > 0 && parseFloat(formData.cost) > 0
      ? Math.round(((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price)) * 100)
      : null;

  // Helper para actualizar un campo de una presentación Decant
  const updateDecantOption = (ml: '2.5' | '5' | '10', field: 'enabled' | 'price' | 'stock', value: boolean | string) => {
    const current = formData.decantOptions || DEFAULT_DECANT_OPTIONS;
    setFormData({
      ...formData,
      decantOptions: {
        ...current,
        [ml]: { ...current[ml], [field]: value },
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Selector de Modo Manual (por si falla la detección automática) */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">📏</div>
          <div>
            <p className="text-sm font-bold text-gray-800">Modo de Venta</p>
            <p className="text-xs text-gray-500">¿Es un producto con múltiples tamaños/medidas?</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-400">{formData.isDecant ? 'Multi-tamaño' : 'Estándar'}</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isDecant}
              onChange={(e) => toggleDecantMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
      </div>

      {/* ===================================================== */}
      {/* MODO MULTI-TAMAÑO: Formulario para productos con variantes */}
      {/* ===================================================== */}
      {formData.isDecant ? (
        <div className="space-y-5">
          {/* Banner informativo */}
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl">
            <span className="text-3xl">📏</span>
            <div>
              <p className="text-sm font-bold text-emerald-800">Modo Multi-tamaño activado</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Configura el precio y el stock de forma independiente para cada tamaño/medida.
                La opción de presentación <strong>Chico está desactivada por defecto</strong> — podés habilitarla con el toggle.
              </p>
            </div>
          </div>

          {/* Grid de presentaciones */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['2.5', '5', '10'] as const).map((ml) => {
              const opt = (formData.decantOptions || DEFAULT_DECANT_OPTIONS)[ml];
              return (
                <div
                  key={ml}
                  className={cn(
                    'rounded-xl border-2 p-4 transition-all duration-200',
                    opt.enabled
                      ? 'border-emerald-400 bg-white shadow-md'
                      : 'border-gray-200 bg-gray-50'
                  )}
                >
                  {/* Header de la presentación con toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className={cn('text-sm font-black uppercase tracking-wider', opt.enabled ? 'text-gray-900' : 'text-gray-400')}>
                        {ml === '2.5' ? 'Chico' : ml === '5' ? 'Mediano' : 'Grande'}
                      </span>
                      {ml === '2.5' && !opt.enabled && (
                        <p className="text-[10px] text-gray-400 mt-0.5">Desactivada por defecto</p>
                      )}
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={opt.enabled}
                        onChange={(e) => updateDecantOption(ml, 'enabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Campo Precio */}
                  <div className="mb-3">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Precio ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">$</span>
                      <input
                        type="number"
                        value={opt.price}
                        disabled={!opt.enabled}
                        onChange={(e) => updateDecantOption(ml, 'price', e.target.value)}
                        placeholder="Ej: 8000"
                        min="0"
                        className={cn(
                          'w-full h-10 pl-7 pr-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors',
                          opt.enabled
                            ? 'border-gray-300 bg-white text-gray-900'
                            : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                        )}
                      />
                    </div>
                  </div>

                  {/* Campo Stock */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Stock (unidades)
                    </label>
                    <input
                      type="number"
                      value={opt.stock}
                      disabled={!opt.enabled}
                      onChange={(e) => updateDecantOption(ml, 'stock', e.target.value)}
                      placeholder="Ej: 20"
                      min="0"
                      className={cn(
                        'w-full h-10 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors',
                        opt.enabled
                          ? 'border-gray-300 bg-white text-gray-900'
                          : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      )}
                    />
                  </div>

                  {/* Badge de estado */}
                  <div className="mt-3 flex justify-end">
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider',
                      opt.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                    )}>
                      {opt.enabled ? '✓ Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Costo de adquisición + publicación (siempre visibles en modo Decant) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <Label htmlFor="cost-decant" className="text-sm font-semibold flex items-center">
                Costo de Adquisición
                <span className="ml-2 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-xs font-medium">Uso interno</span>
              </Label>
              <Input
                id="cost-decant"
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="Ej: 5000"
                className="h-11"
              />
              <p className="text-xs text-gray-400">Costo general del producto (referencia interna)</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Estado de Publicación
              </Label>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg h-11">
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', formData.isPublished ? 'bg-green-500' : 'bg-gray-400')}></div>
                  <span className="text-xs text-gray-600">{formData.isPublished ? 'Publicado' : 'No publicado'}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              <p className="text-xs text-gray-500">{formData.isPublished ? '✅ Visible para el público' : '🔒 Solo visible internamente'}</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 italic">
            💡 Solo las presentaciones activas se mostrarán al cliente en la página del producto.
          </p>
        </div>

      ) : (

        /* ======================================================= */
        /* MODO NORMAL: Formulario estándar para todas las demás categorías */
        /* ======================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Precio de Venta */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm font-semibold">
              Precio de Venta <span className="text-red-500">*</span>
            </Label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="Ej: 12500"
              required
              className={cn('h-11', formData.isOffer ? 'bg-green-50 border-green-200' : '')}
              readOnly={formData.isOffer}
            />
            {formData.isOffer && (
              <p className="text-xs text-green-600 font-medium">
                ✨ Precio calculado desde Ofertas ({formData.discount}% de descuento sobre ${parseFloat(formData.originalPrice || '0').toLocaleString('es-AR')})
              </p>
            )}
          </div>

          {/* Costo de Adquisición */}
          <div className="space-y-2">
            <Label htmlFor="cost" className="text-sm font-semibold flex items-center">
              Costo de Adquisición
              <span className="ml-2 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-xs font-medium">Uso interno</span>
            </Label>
            <Input
              id="cost"
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              placeholder="Ej: 8000"
              className="h-11"
            />
            {margin !== null && (
              <div className="mt-2 text-xs">
                <span className="font-medium">Margen: </span>
                <span className="text-green-600 font-medium">{margin}%</span>
              </div>
            )}
          </div>

          {/* Stock */}
          <div className="space-y-2">
            <Label htmlFor="stock" className="text-sm font-semibold">
              Stock <span className="text-red-500">*</span>
            </Label>
            <Input
              id="stock"
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              placeholder="Ej: 100"
              required
              className="h-11"
            />
          </div>

          {/* Estado de Publicación */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Estado de Publicación
            </Label>
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', formData.isPublished ? 'bg-green-500' : 'bg-gray-400')}></div>
                <span className="text-xs text-gray-600">{formData.isPublished ? 'Publicado' : 'No publicado'}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500">
              {formData.isPublished ? '✅ Visible para el público' : '🔒 Solo visible internamente'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
