import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  Barcode,
  Check,
  CreditCard,
  Landmark,
  Minus,
  Package,
  Pause,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ShoppingBag,
  Trash2,
  UserRound,
  Wifi,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';

type PosProduct = {
  id: string;
  name?: string;
  description?: string;
  price?: number | string;
  stock?: number | string;
  image?: string;
  category?: string;
  quantity?: number;
};

type PosEmployee = {
  id: string;
  name?: string;
  nombre?: string;
};

interface PhysicalPosWorkspaceProps {
  operatorName: string;
  dailySales: { total: number; count: number };
  isQuoteMode: boolean;
  customerName: string;
  products: PosProduct[];
  loadingProducts: boolean;
  selectedProducts: PosProduct[];
  selectedCartIndex: number | null;
  selectedCategoryFilter: string | null;
  productSearchTerm: string;
  paymentMethod: string;
  amountReceived: string;
  discountType: string;
  discountValue: number;
  notes: string;
  employees: PosEmployee[];
  selectedEmployeeId: string;
  subtotal: number;
  discount: number;
  total: number;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onAddProduct: (id: string) => void;
  onSelectCartItem: (index: number) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveProduct: (id: string) => void;
  onCategoryChange: (category: string | null) => void;
  onOpenCommonProduct: () => void;
  onCashEntry: () => void;
  onCashExit: () => void;
  onNewSale: () => void;
  onAssignCustomer: () => void;
  onReprint: () => void;
  onHold: () => void;
  onPay: () => void;
  onViewSales: () => void;
  onPaymentMethodChange: (method: string) => void;
  onAmountReceivedChange: (value: string) => void;
  onDiscountTypeChange: (type: string) => void;
  onDiscountValueChange: (value: number) => void;
  onNotesChange: (value: string) => void;
  onEmployeeChange: (id: string) => void;
}

const money = formatCurrency;

export const PhysicalPosWorkspace: React.FC<PhysicalPosWorkspaceProps> = ({
  operatorName,
  dailySales,
  isQuoteMode,
  customerName,
  products,
  loadingProducts,
  selectedProducts,
  selectedCartIndex,
  selectedCategoryFilter,
  productSearchTerm,
  paymentMethod,
  amountReceived,
  discountType,
  discountValue,
  notes,
  employees,
  selectedEmployeeId,
  subtotal,
  discount,
  total,
  onClose,
  onSearchChange,
  onSearchSubmit,
  onAddProduct,
  onSelectCartItem,
  onUpdateQuantity,
  onRemoveProduct,
  onCategoryChange,
  onOpenCommonProduct,
  onCashEntry,
  onCashExit,
  onNewSale,
  onAssignCustomer,
  onReprint,
  onHold,
  onPay,
  onViewSales,
  onPaymentMethodChange,
  onAmountReceivedChange,
  onDiscountTypeChange,
  onDiscountValueChange,
  onNotesChange,
  onEmployeeChange,
}) => {
  const [showSaleSettings, setShowSaleSettings] = useState(false);
  const categories = useMemo(
    () => Array.from(new Set(products.map(product => product.category).filter(Boolean))) as string[],
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = productSearchTerm.trim().toLocaleLowerCase('es');
    return products.filter(product => {
      const categoryMatches = !selectedCategoryFilter || product.category === selectedCategoryFilter;
      const queryMatches = !query || [product.name, product.description, product.id]
        .some(value => String(value || '').toLocaleLowerCase('es').includes(query));
      return categoryMatches && queryMatches;
    });
  }, [productSearchTerm, products, selectedCategoryFilter]);

  const units = selectedProducts.reduce((sum, product) => sum + Number(product.quantity || 0), 0);
  const received = Number(amountReceived || 0);
  const cashMissing = paymentMethod === 'efectivo' ? Math.max(0, total - received) : 0;
  const change = paymentMethod === 'efectivo' ? Math.max(0, received - total) : 0;

  return (
    <section className="fixed inset-0 z-[20000] h-[100dvh] w-screen overflow-hidden bg-[#edf2f6] text-slate-800">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#aebfca] bg-white px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center border border-slate-300 bg-white text-[#245878] hover:bg-slate-50"
              aria-label="Volver a pedidos"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#245878] text-white">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[15px] font-bold text-slate-950">Punto de venta</h1>
                <span className="hidden border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600 sm:inline-flex">
                  Modo caja
                </span>
              </div>
              <p className="truncate text-[11px] text-slate-500">
                {isQuoteMode ? 'Cotización y proforma' : 'Venta presencial'} · Caja principal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 border-r border-slate-200 pr-4 md:flex">
              {loadingProducts ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#397da8]" /> : <Wifi className="h-3.5 w-3.5 text-emerald-600" />}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Estado</p>
                <p className="text-[11px] font-semibold text-slate-700">{loadingProducts ? 'Actualizando' : 'Inventario listo'}</p>
              </div>
            </div>
            <div className="hidden border-r border-slate-200 pr-4 text-right sm:block">
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Ventas de hoy</p>
              <p className="text-sm font-black text-[#245878]">{money(dailySales.total)} <span className="text-[10px] font-medium text-slate-400">({dailySales.count})</span></p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden text-right lg:block">
                <p className="max-w-32 truncate text-[11px] font-semibold text-slate-700">{operatorName}</p>
                <p className="text-[9px] uppercase text-slate-400">Operador</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center bg-[#2c86b7] text-xs font-bold text-white">
                {operatorName.substring(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="flex shrink-0 flex-col gap-2 border-b border-[#b8c8d2] bg-white px-4 py-3 lg:flex-row lg:items-center lg:px-6">
          <div className="relative min-w-0 flex-1">
            <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#397da8]" />
            <input
              id="pos-product-search"
              value={productSearchTerm}
              onChange={event => onSearchChange(event.target.value)}
              placeholder="Escanear código o buscar producto por nombre y referencia"
              autoFocus
              className="h-11 w-full border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[#2c86b7] focus:bg-white"
            />
          </div>
          <button
            type="button"
            onClick={onSearchSubmit}
            className="flex h-11 shrink-0 items-center justify-center gap-2 bg-[#245878] px-6 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-[#1b4661]"
          >
            <Check className="h-4 w-4" /> Agregar <kbd className="border-l border-white/30 pl-2 text-[9px] text-white/70">Enter</kbd>
          </button>
          <div className="flex shrink-0 gap-1 overflow-x-auto">
            <button type="button" onClick={onNewSale} className="h-11 border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase text-[#245878] hover:bg-blue-50">Nueva <span className="text-slate-400">F4</span></button>
            <button type="button" onClick={onAssignCustomer} className="h-11 border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-50">Cliente <span className="text-slate-400">F5</span></button>
          </div>
        </div>

        <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 xl:grid-cols-[minmax(410px,0.82fr)_minmax(0,1.58fr)] xl:overflow-hidden lg:p-4">
          <section className="flex min-h-[520px] min-w-0 flex-col border border-[#aebfca] bg-white xl:min-h-0">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-300 bg-[#f4f7f9] px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#397da8]">Venta actual</p>
                <h2 className="mt-0.5 text-sm font-bold text-slate-900">Ticket en preparación</h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium text-slate-400">{units} unidades</p>
                <p className="text-[11px] font-bold text-slate-700">{selectedProducts.length} productos</p>
              </div>
            </div>

            <div className="flex shrink-0 border-b border-slate-200">
              <button
                type="button"
                onClick={onAssignCustomer}
                className="flex min-w-0 flex-1 items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <UserRound className="h-4 w-4 shrink-0 text-[#397da8]" />
                  <span className="truncate text-xs font-semibold text-slate-700">{customerName || 'Cliente General'}</span>
                </span>
                <span className="ml-2 text-[9px] font-bold uppercase tracking-wide text-[#397da8]">Cambiar</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSaleSettings(current => !current)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 border-l border-slate-200 px-3 text-[9px] font-bold uppercase tracking-wide hover:bg-slate-50',
                  showSaleSettings || discount > 0 || notes ? 'bg-blue-50 text-[#245878]' : 'text-slate-500'
                )}
                aria-expanded={showSaleSettings}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" /> Ajustes
              </button>
            </div>

            {showSaleSettings && (
              <div className="shrink-0 border-b border-slate-300 bg-[#f8fafb] p-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="min-w-0">
                    <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Vendedor</span>
                    <select
                      value={selectedEmployeeId}
                      onChange={event => onEmployeeChange(event.target.value)}
                      className="h-9 w-full border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700 outline-none focus:border-[#2c86b7]"
                    >
                      <option value="none">Operador actual</option>
                      {employees.map(employee => (
                        <option key={employee.id} value={employee.id}>{employee.nombre || employee.name || 'Sin nombre'}</option>
                      ))}
                    </select>
                  </label>
                  <label className="min-w-0">
                    <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Descuento</span>
                    <select
                      value={discountType}
                      onChange={event => onDiscountTypeChange(event.target.value)}
                      className="h-9 w-full border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700 outline-none focus:border-[#2c86b7]"
                    >
                      <option value="none">Sin descuento</option>
                      <option value="percentage">Porcentaje (%)</option>
                      <option value="fixed">Monto fijo ($)</option>
                    </select>
                  </label>
                  {discountType !== 'none' && (
                    <label className="min-w-0">
                      <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Valor</span>
                      <input
                        type="number"
                        min="0"
                        max={discountType === 'percentage' ? 100 : undefined}
                        value={discountValue}
                        onChange={event => onDiscountValueChange(Number(event.target.value) || 0)}
                        className="h-9 w-full border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700 outline-none focus:border-[#2c86b7]"
                      />
                    </label>
                  )}
                  <label className={cn('min-w-0', discountType === 'none' ? 'col-span-2' : '')}>
                    <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Nota interna</span>
                    <input
                      value={notes}
                      onChange={event => onNotesChange(event.target.value)}
                      placeholder="Entrega, referencia o indicación de caja"
                      className="h-9 w-full border border-slate-300 bg-white px-2 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#2c86b7]"
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_70px_88px_30px] gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[9px] font-bold uppercase tracking-wide text-slate-500">
              <span>Producto</span><span className="text-center">Cantidad</span><span className="text-right">Importe</span><span />
            </div>

            <div className="pos-scrollbar min-h-0 flex-1 overflow-y-auto">
              {selectedProducts.length === 0 ? (
                <div className="flex h-full min-h-44 flex-col items-center justify-center px-6 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center border border-slate-200 bg-slate-50 text-slate-300">
                    <ReceiptText className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">El ticket está vacío</p>
                  <p className="mt-1 max-w-64 text-[11px] leading-relaxed text-slate-400">Selecciona productos del catálogo o utiliza el lector de código de barras.</p>
                </div>
              ) : selectedProducts.map((item, index) => {
                const price = Number(item.price || 0);
                const quantity = Number(item.quantity || 0);
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectCartItem(index)}
                    className={cn(
                      'grid cursor-pointer grid-cols-[minmax(0,1fr)_70px_88px_30px] items-center gap-2 border-b border-slate-100 px-4 py-3 transition-colors',
                      selectedCartIndex === index ? 'bg-blue-50 border-l-2 border-l-[#2c86b7]' : 'hover:bg-slate-50'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-800">{item.name}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{money(price)} por unidad</p>
                    </div>
                    <div className="flex items-center justify-center">
                      <button type="button" onClick={event => { event.stopPropagation(); onUpdateQuantity(item.id, quantity - 1); }} className="flex h-6 w-6 items-center justify-center border border-slate-300 bg-white hover:bg-slate-100"><Minus className="h-3 w-3" /></button>
                      <span className="w-7 text-center text-xs font-bold text-slate-800">{quantity}</span>
                      <button type="button" onClick={event => { event.stopPropagation(); onUpdateQuantity(item.id, quantity + 1); }} className="flex h-6 w-6 items-center justify-center border border-slate-300 bg-white hover:bg-slate-100"><Plus className="h-3 w-3" /></button>
                    </div>
                    <p className="text-right text-xs font-black text-slate-800">{money(price * quantity)}</p>
                    <button type="button" onClick={event => { event.stopPropagation(); onRemoveProduct(item.id); }} className="flex h-7 w-7 items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-600" aria-label={`Eliminar ${item.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                );
              })}
            </div>

            <div className="shrink-0 border-t border-slate-300 bg-white p-4">
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="font-semibold text-slate-700">{money(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-red-600"><span>Descuento</span><span className="font-semibold">-{money(discount)}</span></div>}
                <div className="flex items-end justify-between border-t border-slate-200 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-700">Total</span>
                  <span className="text-3xl font-black tracking-tight text-[#245878]">{money(total)}</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 border border-slate-300">
                {[
                  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
                  { id: 'transferencia', label: 'Transferencia', icon: Landmark },
                ].map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => onPaymentMethodChange(method.id)}
                    className={cn('flex h-10 items-center justify-center gap-1.5 border-r border-slate-300 text-[10px] font-bold uppercase last:border-r-0', paymentMethod === method.id ? 'bg-[#245878] text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}
                  >
                    <method.icon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{method.label}</span>
                  </button>
                ))}
              </div>

              {paymentMethod === 'efectivo' && (
                <div className="mt-2 grid grid-cols-[1fr_auto] items-center border border-slate-300 bg-slate-50">
                  <label className="px-3 text-[10px] font-bold uppercase text-slate-500" htmlFor="pos-amount-received">Recibido</label>
                  <input id="pos-amount-received" value={amountReceived} onChange={event => onAmountReceivedChange(event.target.value.replace(/[^0-9.]/g, ''))} onFocus={event => event.target.select()} inputMode="decimal" className="h-10 w-32 border-l border-slate-300 bg-white px-3 text-right text-sm font-black text-slate-800 outline-none focus:border-[#2c86b7]" />
                  <div className={cn('col-span-2 flex justify-between border-t px-3 py-1.5 text-[10px] font-bold', cashMissing > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
                    <span>{cashMissing > 0 ? 'Falta por recibir' : 'Cambio'}</span><span>{money(cashMissing > 0 ? cashMissing : change)}</span>
                  </div>
                </div>
              )}

              <button type="button" onClick={onPay} disabled={!selectedProducts.length} className="mt-3 flex h-12 w-full items-center justify-between bg-[#0f6b50] px-4 text-white hover:bg-[#0b5741] disabled:cursor-not-allowed disabled:bg-slate-300">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide"><Check className="h-4 w-4" /> Cobrar venta</span>
                <span className="text-sm font-black">F12 · {money(total)}</span>
              </button>
            </div>
          </section>

          <section className="flex min-h-[520px] min-w-0 flex-col border border-[#aebfca] bg-white xl:min-h-0">
            <div className="flex shrink-0 flex-col gap-3 border-b border-slate-300 bg-[#f4f7f9] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#397da8]">Inventario disponible</p>
                  <h2 className="mt-0.5 text-sm font-bold text-slate-900">Catálogo de productos</h2>
                </div>
                <p className="text-[10px] font-semibold text-slate-500">{filteredProducts.length} resultados</p>
              </div>
              <div className="pos-scrollbar-horizontal flex gap-1 overflow-x-auto pb-0.5">
                <button type="button" onClick={() => onCategoryChange(null)} className={cn('h-8 shrink-0 border px-3 text-[10px] font-bold uppercase', !selectedCategoryFilter ? 'border-[#245878] bg-[#245878] text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')}>Todos</button>
                {categories.map(category => (
                  <button key={category} type="button" onClick={() => onCategoryChange(category)} className={cn('h-8 shrink-0 border px-3 text-[10px] font-bold uppercase', selectedCategoryFilter === category ? 'border-[#245878] bg-[#245878] text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')}>{category}</button>
                ))}
              </div>
            </div>

            <div className="pos-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#f8fafb] p-3">
              {loadingProducts ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500"><RefreshCw className="h-5 w-5 animate-spin text-[#397da8]" /> Cargando inventario...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex h-full min-h-52 flex-col items-center justify-center text-center">
                  <Search className="mb-3 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">No encontramos productos</p>
                  <p className="mt-1 text-[11px] text-slate-400">Cambia el término de búsqueda o la categoría.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                  {filteredProducts.map(product => {
                    const stock = Number(product.stock || 0);
                    const hasStock = stock > 0;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => hasStock && onAddProduct(product.id)}
                        disabled={!hasStock}
                        className={cn('group flex min-h-40 flex-col border bg-white p-2.5 text-left transition-colors', hasStock ? 'border-slate-200 hover:border-[#2c86b7] hover:bg-blue-50/30' : 'cursor-not-allowed border-slate-200 opacity-50')}
                      >
                        <div className="flex h-20 w-full items-center justify-center border border-slate-100 bg-slate-50">
                          {product.image ? <img src={product.image} alt="" className="h-full w-full object-contain p-1.5" loading="lazy" /> : <Package className="h-7 w-7 text-slate-300" />}
                        </div>
                        <p className="mt-2 line-clamp-2 min-h-8 text-[11px] font-bold leading-4 text-slate-800">{product.name || 'Producto sin nombre'}</p>
                        <div className="mt-auto flex w-full items-end justify-between gap-2 pt-2">
                          <span className="text-sm font-black text-[#0a7b58]">{money(Number(product.price || 0))}</span>
                          <span className={cn('text-[9px] font-bold', stock <= 3 ? 'text-red-600' : 'text-slate-400')}>{hasStock ? `${stock} und.` : 'Agotado'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-300 bg-white px-3 py-2">
              <div className="flex gap-1 overflow-x-auto">
                <button type="button" onClick={onOpenCommonProduct} className="h-8 border border-slate-300 px-3 text-[9px] font-bold uppercase text-slate-600 hover:bg-slate-50">Artículo libre <span className="text-slate-400">Ctrl+P</span></button>
                <button type="button" onClick={onCashEntry} className="h-8 border border-slate-300 px-3 text-[9px] font-bold uppercase text-slate-600 hover:bg-slate-50">Entrada <span className="text-slate-400">F7</span></button>
                <button type="button" onClick={onCashExit} className="h-8 border border-slate-300 px-3 text-[9px] font-bold uppercase text-slate-600 hover:bg-slate-50">Salida <span className="text-slate-400">F8</span></button>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={onReprint} className="flex h-8 items-center gap-1.5 border border-slate-300 px-3 text-[9px] font-bold uppercase text-slate-600 hover:bg-slate-50"><ReceiptText className="h-3 w-3" /> Reimprimir</button>
                <button type="button" onClick={onHold} className="flex h-8 items-center gap-1.5 border border-blue-200 px-3 text-[9px] font-bold uppercase text-[#245878] hover:bg-blue-50"><Pause className="h-3 w-3" /> Apartar <span className="text-slate-400">F10</span></button>
                <button type="button" onClick={onViewSales} className="h-8 bg-slate-700 px-3 text-[9px] font-bold uppercase text-white hover:bg-slate-800">Historial</button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </section>
  );
};
