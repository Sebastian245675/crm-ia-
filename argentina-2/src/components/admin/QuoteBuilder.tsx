import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Search, Plus, Minus, Trash2, FileText, Download, RefreshCw, Mail, Phone, Building2, Calendar, ShoppingBag } from 'lucide-react';
import { db, collection, getDocs } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

interface QuoteBuilderProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuoteBuilder: React.FC<QuoteBuilderProps> = ({ isOpen, onClose }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [quoteData, setQuoteData] = useState({
    companyName: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    notes: 'Cotización válida por 15 días hábiles a partir de la fecha de emisión.',
    discountType: 'none' as 'none' | 'percentage' | 'fixed',
    discountValue: 0,
    validityDays: 15,
  });

  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchCompanyLogo();
      setQuoteData({
        companyName: '', contactName: '', contactPhone: '', contactEmail: '',
        notes: 'Cotización válida por 15 días hábiles a partir de la fecha de emisión.',
        discountType: 'none', discountValue: 0, validityDays: 15,
      });
      setSelectedProducts([]);
      setProductSearch('');
    }
  }, [isOpen]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCompanyLogo = async () => {
    try {
      const isSupabase = typeof (db as any)?.from === 'function';
      if (isSupabase) {
        const { data } = await (db as any).from('company_profile').select('logo').maybeSingle();
        if (data?.logo) setCompanyLogo(data.logo);
      } else {
        const snap = await getDocs(collection(db, 'company_profile'));
        if (!snap.empty) {
          const profileData = snap.docs[0].data();
          if (profileData.logo) setCompanyLogo(profileData.logo);
        }
      }
    } catch (err) {
      console.warn('Error fetching company logo:', err);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const isSupabase = typeof (db as any)?.from === 'function';
      if (isSupabase) {
        const { data, error } = await (db as any).from('products').select('*');
        if (error) throw error;
        setProducts(data || []);
      } else {
        const snap = await getDocs(collection(db, 'products'));
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    return products.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase()));
  }, [products, productSearch]);

  const addProduct = (product: any) => {
    const existing = selectedProducts.find(p => p.id === product.id);
    const stock = product.stock || 0;
    if (existing) {
      if (existing.quantity + 1 > stock) {
        toast({ title: 'Stock insuficiente', description: `Solo hay ${stock} unidades disponibles`, variant: 'destructive' });
        return;
      }
      setSelectedProducts(prev => prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p));
    } else {
      if (stock <= 0) {
        toast({ title: 'Sin stock', description: `${product.name} no tiene stock`, variant: 'destructive' });
        return;
      }
      setSelectedProducts(prev => [...prev, { ...product, quantity: 1 }]);
    }
    setProductSearch('');
    setShowDropdown(false);
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      setSelectedProducts(prev => prev.filter(p => p.id !== id));
    } else {
      const orig = products.find(p => p.id === id);
      if (orig && qty > (orig.stock || 0)) {
        toast({ title: 'Stock insuficiente', variant: 'destructive' });
        return;
      }
      setSelectedProducts(prev => prev.map(p => p.id === id ? { ...p, quantity: qty } : p));
    }
  };

  const removeProduct = (id: string) => setSelectedProducts(prev => prev.filter(p => p.id !== id));

  const subtotal = useMemo(() =>
    selectedProducts.reduce((s, p) => s + (parseFloat(p.price) || 0) * p.quantity, 0),
    [selectedProducts]
  );

  const discount = useMemo(() => {
    if (quoteData.discountType === 'none' || subtotal === 0) return 0;
    if (quoteData.discountType === 'percentage') return (subtotal * Math.min(Math.max(quoteData.discountValue, 0), 100)) / 100;
    return Math.min(Math.max(quoteData.discountValue, 0), subtotal);
  }, [subtotal, quoteData.discountType, quoteData.discountValue]);

  const total = subtotal - discount;

  const formatDate = (d: Date) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

  const getBase64 = (url: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = url.includes('?') ? `${url}&cb=${Date.now()}` : `${url}?cb=${Date.now()}`;
    });

  const generatePDF = async () => {
    if (!selectedProducts.length || !quoteData.companyName) {
      toast({ title: 'Faltan datos', description: 'Agrega productos y el nombre de la empresa.', variant: 'destructive' });
      return;
    }

    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();

      let logoImg64: string | null = null;
      if (companyLogo) {
        try { logoImg64 = await getBase64(companyLogo); } catch {}
      }

      // Cargar imágenes en paralelo
      const prods = await Promise.all(selectedProducts.map(async p => {
        if (p.image) {
          try { return { ...p, img64: await getBase64(p.image) }; }
          catch { return { ...p, img64: null }; }
        }
        return { ...p, img64: null };
      }));

      // Encabezado
      if (logoImg64) {
        try {
          doc.addImage(logoImg64, 'JPEG', 16, 12, 40, 15);
        } catch {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(18);
          doc.setTextColor(30, 41, 59);
          doc.text('COTIZACIÓN', 16, 25);
        }
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59);
        doc.text('COTIZACIÓN', 16, 25);
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(formatDate(new Date()), 16, 32);
      doc.text(`Válida por ${quoteData.validityDays} días`, 16, 38);

      // Datos del cliente
      let y = 50;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('COTIZADO PARA:', 16, y);

      y += 7;
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(quoteData.companyName, 16, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      if (quoteData.contactName) { y += 6; doc.text(quoteData.contactName, 16, y); }
      if (quoteData.contactEmail) { y += 5; doc.text(quoteData.contactEmail, 16, y); }
      if (quoteData.contactPhone) { y += 5; doc.text(quoteData.contactPhone, 16, y); }

      // Tabla de productos
      const head = [['', 'Descripción', 'Cant.', 'P. Unitario', 'Total']];
      const body = prods.map(p => {
        const pr = parseFloat(p.price) || 0;
        return ['', p.name, String(p.quantity), `$${pr.toLocaleString()}`, `$${(pr * p.quantity).toLocaleString()}`];
      });

      doc.autoTable({
        head, body,
        startY: y + 10,
        theme: 'striped',
        headStyles: { fillColor: [30, 64, 120], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9, cellPadding: 4, minCellHeight: 16, valign: 'middle', lineColor: [241, 245, 249], lineWidth: 0.5 },
        columnStyles: { 0: { cellWidth: 16 }, 1: { cellWidth: 84 }, 2: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 30, halign: 'right' }, 4: { cellWidth: 30, halign: 'right' } },
        margin: { left: 16, right: 16 },
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 0) {
            const p = prods[data.row.index];
            if (p?.img64) {
              try { doc.addImage(p.img64, 'JPEG', data.cell.x + 1, data.cell.y + 1, 12, 12); } catch {}
            }
          }
        }
      });

      const tblY = doc.lastAutoTable.finalY || y + 30;

      // Totales
      let tY = tblY + 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text('SUBTOTAL:', 130, tY);
      doc.text(`$${subtotal.toLocaleString()}`, 194, tY, { align: 'right' });

      if (discount > 0) {
        tY += 6;
        doc.text(`DESCUENTO${quoteData.discountType === 'percentage' ? ` ${quoteData.discountValue}%` : ''}:`, 130, tY);
        doc.text(`-$${discount.toLocaleString()}`, 194, tY, { align: 'right' });
      }

      tY += 4;
      doc.setFillColor(30, 64, 120);
      doc.rect(128, tY, 66, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255);
      doc.text('TOTAL:', 133, tY + 7);
      doc.text(`$${total.toLocaleString()}`, 189, tY + 7, { align: 'right' });

      // Notas
      let nY = tY + 22;
      if (nY > 260) { doc.addPage(); nY = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('Condiciones:', 16, nY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(doc.splitTextToSize(quoteData.notes, 100), 16, nY + 5);

      // Firma
      const sX = 140, sY = nY + 8;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(sX, sY + 12, sX + 50, sY + 12);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Firma Autorizada', sX + 25, sY + 17, { align: 'center' });

      doc.save(`cotizacion_${quoteData.companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: 'Cotización generada', description: 'El PDF se ha descargado exitosamente.' });
      onClose();
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast({ title: 'Error', description: 'No se pudo generar el PDF.', variant: 'destructive' });
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white flex flex-col w-full h-full rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
      {/* ─── Barra superior ─── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[hsl(214,100%,38%)] flex items-center justify-center">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Nueva Cotización</h2>
            <p className="text-[11px] text-slate-400">Completa los datos y revisa la vista previa</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-2 hidden sm:block">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Total</span>
            <span className="text-lg font-bold text-slate-800 leading-none">${total.toLocaleString()}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-lg h-9 w-9">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* ─── Contenido dividido ─── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ══ IZQUIERDA: Formulario ══ */}
        <div className="w-1/2 border-r border-slate-200 overflow-y-auto p-6 space-y-5 bg-slate-50/40">

          {/* Sección: Cliente */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Building2 className="h-4 w-4 text-slate-400" />
              Datos del Cliente
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Empresa / Cliente *</Label>
                <Input
                  placeholder="Nombre de la empresa o cliente"
                  value={quoteData.companyName}
                  onChange={e => setQuoteData(prev => ({ ...prev, companyName: e.target.value }))}
                  className="h-9 text-sm border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Contacto</Label>
                  <Input
                    placeholder="Nombre del contacto"
                    value={quoteData.contactName}
                    onChange={e => setQuoteData(prev => ({ ...prev, contactName: e.target.value }))}
                    className="h-9 text-sm border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Teléfono</Label>
                  <Input
                    placeholder="+52 000 000 0000"
                    value={quoteData.contactPhone}
                    onChange={e => setQuoteData(prev => ({ ...prev, contactPhone: e.target.value }))}
                    className="h-9 text-sm border-slate-200"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Email</Label>
                <Input
                  placeholder="correo@empresa.com"
                  value={quoteData.contactEmail}
                  onChange={e => setQuoteData(prev => ({ ...prev, contactEmail: e.target.value }))}
                  className="h-9 text-sm border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Sección: Productos */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ShoppingBag className="h-4 w-4 text-slate-400" />
              Productos
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              {/* Buscador de productos */}
              <div className="relative" ref={dropdownRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder={loadingProducts ? 'Cargando productos...' : 'Buscar y agregar producto...'}
                  className="pl-9 h-9 text-sm border-slate-200"
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  disabled={loadingProducts}
                />
                {showDropdown && productSearch.trim() && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-400">No se encontraron productos</div>
                    ) : (
                      filteredProducts.map(p => {
                        const stock = p.stock || 0;
                        const inCart = selectedProducts.find(s => s.id === p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => addProduct(p)}
                            disabled={stock <= 0}
                            className={cn(
                              'w-full text-left px-4 py-2.5 flex items-center justify-between text-sm border-b border-slate-50 last:border-0 transition-colors',
                              stock > 0 ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {p.image ? (
                                <img src={p.image} className="w-8 h-8 rounded object-cover border border-slate-100 flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                                  <ShoppingBag className="h-3.5 w-3.5 text-slate-300" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-medium text-slate-700 block truncate">{p.name}</span>
                                <span className="text-xs text-slate-400">
                                  Stock: {stock}{inCart ? ` · ${inCart.quantity} en carrito` : ''}
                                </span>
                              </div>
                            </div>
                            <span className="font-semibold text-slate-600 text-sm flex-shrink-0 ml-3">${parseFloat(p.price || 0).toLocaleString()}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Tabla de productos seleccionados */}
              {selectedProducts.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                        <th className="text-left py-2 px-3">Producto</th>
                        <th className="text-center py-2 px-2 w-[100px]">Cantidad</th>
                        <th className="text-right py-2 px-3 w-[80px]">Precio</th>
                        <th className="text-right py-2 px-3 w-[90px]">Total</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts.map(p => {
                        const price = parseFloat(p.price) || 0;
                        return (
                          <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                {p.image ? (
                                  <img src={p.image} className="w-7 h-7 rounded object-cover border border-slate-100 flex-shrink-0" />
                                ) : (
                                  <div className="w-7 h-7 rounded bg-slate-50 flex items-center justify-center flex-shrink-0 border border-slate-100">
                                    <ShoppingBag className="h-3 w-3 text-slate-300" />
                                  </div>
                                )}
                                <span className="font-medium text-slate-700 text-xs truncate">{p.name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => updateQuantity(p.id, p.quantity - 1)}
                                  className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-8 text-center text-xs font-semibold text-slate-700">{p.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(p.id, p.quantity + 1)}
                                  className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right text-xs text-slate-500">${price.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right text-xs font-semibold text-slate-700">${(price * p.quantity).toLocaleString()}</td>
                            <td className="py-2 pr-2">
                              <button onClick={() => removeProduct(p.id)} className="text-slate-300 hover:text-red-500 transition-colors p-0.5">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  <ShoppingBag className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                  Busca y agrega productos usando el campo de arriba
                </div>
              )}
            </div>
          </div>

          {/* Sección: Condiciones */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Calendar className="h-4 w-4 text-slate-400" />
              Condiciones
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Validez (días)</Label>
                  <Input
                    type="number" min="1"
                    value={quoteData.validityDays}
                    onChange={e => setQuoteData(prev => ({ ...prev, validityDays: parseInt(e.target.value) || 15 }))}
                    className="h-9 text-sm border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Descuento</Label>
                  <Select value={quoteData.discountType} onValueChange={v => setQuoteData(prev => ({ ...prev, discountType: v as any, discountValue: 0 }))}>
                    <SelectTrigger className="h-9 text-sm border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin descuento</SelectItem>
                      <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                      <SelectItem value="fixed">Monto fijo ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {quoteData.discountType !== 'none' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">
                      {quoteData.discountType === 'percentage' ? 'Porcentaje' : 'Monto'}
                    </Label>
                    <Input
                      type="number" min="0"
                      max={quoteData.discountType === 'percentage' ? '100' : undefined}
                      value={quoteData.discountValue}
                      onChange={e => {
                        const v = parseFloat(e.target.value) || 0;
                        setQuoteData(prev => ({ ...prev, discountValue: prev.discountType === 'percentage' ? Math.min(Math.max(v, 0), 100) : Math.max(v, 0) }));
                      }}
                      className="h-9 text-sm border-slate-200"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Notas / Condiciones</Label>
                <textarea
                  value={quoteData.notes}
                  onChange={e => setQuoteData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(214,100%,38%)]/20 focus:border-[hsl(214,100%,38%)]/40"
                  placeholder="Condiciones especiales de la cotización..."
                />
              </div>
            </div>
          </div>

          {/* Totales y acciones */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-medium text-slate-700">${subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-red-500 text-xs">
                  <span>Descuento {quoteData.discountType === 'percentage' ? `(${quoteData.discountValue}%)` : ''}</span>
                  <span className="font-medium">-${discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-800 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>${total.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={onClose} className="flex-1 h-10 text-sm border-slate-200">
                Cancelar
              </Button>
              <Button
                onClick={generatePDF}
                disabled={generatingPDF || !selectedProducts.length || !quoteData.companyName}
                className="flex-1 h-10 text-sm bg-[hsl(214,100%,38%)] hover:bg-[hsl(214,100%,33%)] text-white font-semibold flex items-center justify-center gap-2"
              >
                {generatingPDF ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {generatingPDF ? 'Generando...' : 'Descargar PDF'}
              </Button>
            </div>
          </div>
        </div>

        {/* ══ DERECHA: Vista previa en vivo ══ */}
        <div className="w-1/2 overflow-y-auto bg-slate-100 p-8 flex justify-center">
          <div
            className="w-full max-w-[560px] bg-white shadow-lg rounded-sm p-10 flex flex-col select-none"
            style={{ minHeight: '780px', boxShadow: '0 4px 24px -6px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)' }}
          >
            {/* Encabezado del documento */}
            <div className="flex justify-between items-start border-b-2 border-slate-200 pb-5">
              <div>
                {companyLogo ? (
                  <img src={companyLogo} alt="Logo" className="h-12 object-contain" />
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">COTIZACIÓN</h3>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Documento comercial</p>
                  </>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-700">{formatDate(new Date())}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Válida por {quoteData.validityDays} días</p>
              </div>
            </div>

            {/* Bloque del cliente */}
            <div className="mt-5 bg-slate-50 rounded-lg p-4 border border-slate-100">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Cotizado para:</p>
              <p className="text-sm font-bold text-slate-800">
                {quoteData.companyName || <span className="text-slate-300 italic font-normal">Empresa o cliente</span>}
              </p>
              {quoteData.contactName && (
                <p className="text-xs text-slate-500 mt-0.5">{quoteData.contactName}</p>
              )}
              <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                {quoteData.contactEmail && (
                  <p className="flex items-center gap-1.5"><Mail className="h-2.5 w-2.5" /> {quoteData.contactEmail}</p>
                )}
                {quoteData.contactPhone && (
                  <p className="flex items-center gap-1.5"><Phone className="h-2.5 w-2.5" /> {quoteData.contactPhone}</p>
                )}
              </div>
            </div>

            {/* Tabla de productos */}
            <div className="mt-6 flex-1">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[hsl(214,100%,38%)] text-white text-[9px] uppercase tracking-wider font-bold">
                    <th className="py-2 px-2 text-left w-10">Foto</th>
                    <th className="py-2 px-2 text-left">Descripción</th>
                    <th className="py-2 px-2 text-center w-12">Cant.</th>
                    <th className="py-2 px-2 text-right w-16">P. Unit.</th>
                    <th className="py-2 px-3 text-right w-16">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-300 text-xs italic">
                        Agrega productos para ver la vista previa
                      </td>
                    </tr>
                  ) : (
                    selectedProducts.map((p, i) => {
                      const price = parseFloat(p.price) || 0;
                      return (
                        <tr key={p.id} className={cn('border-b border-slate-100', i % 2 === 1 && 'bg-slate-50/50')}>
                          <td className="py-1.5 px-2">
                            {p.image ? (
                              <img src={p.image} className="w-7 h-7 rounded object-cover border border-slate-100" />
                            ) : (
                              <div className="w-7 h-7 rounded bg-slate-50 border border-slate-100" />
                            )}
                          </td>
                          <td className="py-1.5 px-2 font-medium text-slate-700">{p.name}</td>
                          <td className="py-1.5 px-2 text-center text-slate-600 font-semibold">{p.quantity}</td>
                          <td className="py-1.5 px-2 text-right text-slate-500">${price.toLocaleString()}</td>
                          <td className="py-1.5 px-3 text-right font-semibold text-slate-800">${(price * p.quantity).toLocaleString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            {selectedProducts.length > 0 && (
              <div className="mt-4 flex flex-col items-end gap-1">
                <div className="w-[200px] flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>SUBTOTAL:</span>
                  <span className="text-slate-600">${subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="w-[200px] flex justify-between text-[11px] text-red-400 font-medium">
                    <span>DESCUENTO:</span>
                    <span>-${discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="w-[210px] flex justify-between bg-[hsl(214,100%,38%)] text-white text-xs font-bold px-3 py-2 rounded mt-1">
                  <span>TOTAL:</span>
                  <span>${total.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Pie del documento */}
            <div className="mt-auto pt-6 flex justify-between items-end border-t border-slate-100" style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
              <div className="max-w-[250px]">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Condiciones:</p>
                <p className="text-[8px] text-slate-400 leading-relaxed">{quoteData.notes}</p>
              </div>
              <div className="text-center">
                <div className="w-32 border-b border-slate-200 mb-1" />
                <span className="text-[8px] text-slate-400 font-medium uppercase tracking-wider">Firma Autorizada</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
