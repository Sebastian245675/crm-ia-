import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Search, Plus, Minus, Trash2, FileText, Download, RefreshCw, Mail, Phone, Building2, Calendar, ShoppingBag, MapPin, ShieldCheck } from 'lucide-react';
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
  initialType?: 'quote' | 'proforma';
  initialOrderData?: any | null;
}

export const QuoteBuilder: React.FC<QuoteBuilderProps> = ({ isOpen, onClose, initialType, initialOrderData }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [docType, setDocType] = useState<'quote' | 'proforma'>('quote');

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
  const [companyProfile, setCompanyProfile] = useState({
    friendlyName: 'MERCO Business Software',
    legalName: '',
    address: '',
    location: '',
  });
  const [documentSequence, setDocumentSequence] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const dateCode = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      setDocumentSequence(`${dateCode}-${String(Date.now()).slice(-4)}`);
      fetchProducts();
      fetchCompanyLogo();
      const initialDocType = initialType || 'quote';
      setDocType(initialDocType);
      if (initialOrderData) {
        setQuoteData({
          companyName: initialOrderData.userName || initialOrderData.user_name || '',
          contactName: initialOrderData.userName || initialOrderData.user_name || '',
          contactPhone: initialOrderData.userPhone || initialOrderData.user_phone || '',
          contactEmail: initialOrderData.userEmail || initialOrderData.user_email || '',
          notes: initialDocType === 'proforma'
            ? 'Esta es una factura proforma con carácter informativo y no comercial.'
            : 'Cotización válida por 15 días hábiles a partir de la fecha de emisión.',
          discountType: 'none',
          discountValue: 0,
          validityDays: 15,
        });

        if (initialOrderData.items && Array.isArray(initialOrderData.items)) {
          setSelectedProducts(initialOrderData.items.map((item: any) => ({
            id: item.id || ('item-' + Math.random().toString(36).substring(2, 7)),
            name: item.name || '',
            price: typeof item.price === 'number' ? item.price : 0,
            quantity: typeof item.quantity === 'number' ? item.quantity : 1,
          })));
        } else {
          setSelectedProducts([]);
        }
      } else {
        setQuoteData({
          companyName: '', contactName: '', contactPhone: '', contactEmail: '',
          notes: initialDocType === 'proforma'
            ? 'Esta es una factura proforma con carácter informativo y no comercial.'
            : 'Cotización válida por 15 días hábiles a partir de la fecha de emisión.',
          discountType: 'none', discountValue: 0, validityDays: 15,
        });
        setSelectedProducts([]);
      }
      setProductSearch('');
    }
  }, [isOpen, initialType, initialOrderData]);

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
        const { data } = await (db as any).from('company_profile').select('*').maybeSingle();
        if (data?.logo) setCompanyLogo(data.logo);
        if (data) {
          setCompanyProfile({
            friendlyName: data.friendly_name || data.legal_name || 'MERCO Business Software',
            legalName: data.legal_name || '',
            address: data.postal_address || '',
            location: [data.city, data.state, data.country].filter(Boolean).join(', '),
          });
        }
      } else {
        const snap = await getDocs(collection(db, 'company_profile'));
        if (!snap.empty) {
          const profileData = snap.docs[0].data();
          if (profileData.logo) setCompanyLogo(profileData.logo);
          setCompanyProfile({
            friendlyName: profileData.friendly_name || profileData.friendlyName || profileData.legal_name || 'MERCO Business Software',
            legalName: profileData.legal_name || profileData.legalName || '',
            address: profileData.postal_address || profileData.postalAddress || '',
            location: [profileData.city, profileData.state, profileData.country].filter(Boolean).join(', '),
          });
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
  const formatMoney = (value: number) => `$ ${Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`;
  const documentNumber = `${docType === 'proforma' ? 'PRO' : 'COT'}-${documentSequence}`;
  const expiryDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + quoteData.validityDays);
    return date;
  }, [quoteData.validityDays]);

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
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setProperties({
        title: `${docType === 'proforma' ? 'Factura proforma' : 'Cotización'} ${documentNumber}`,
        subject: `Propuesta comercial para ${quoteData.companyName}`,
        author: companyProfile.friendlyName,
        creator: 'MERCO Business Software',
      });

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

      // Identidad visual y encabezado ejecutivo
      const titleText = docType === 'proforma' ? 'FACTURA PROFORMA' : 'COTIZACIÓN';
      doc.setFillColor(15, 39, 66);
      doc.rect(0, 0, 210, 5, 'F');
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 5, 48, 1.5, 'F');

      if (logoImg64) {
        try {
          doc.addImage(logoImg64, 'JPEG', 16, 13, 34, 13);
        } catch {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(15);
          doc.setTextColor(15, 39, 66);
          doc.text(companyProfile.friendlyName, 16, 21);
        }
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(15, 39, 66);
        doc.text(companyProfile.friendlyName, 16, 20);
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const companyLine = companyProfile.legalName && companyProfile.legalName !== companyProfile.friendlyName
        ? companyProfile.legalName
        : [companyProfile.address, companyProfile.location].filter(Boolean).join(' · ');
      if (companyLine) doc.text(doc.splitTextToSize(companyLine, 92), 16, 31);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(15, 39, 66);
      doc.text(titleText, 194, 19, { align: 'right' });
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text(documentNumber, 194, 26, { align: 'right' });

      // Metadatos del documento
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.35);
      doc.line(16, 40, 194, 40);
      const meta = [
        ['FECHA DE EMISIÓN', formatDate(new Date())],
        ['VÁLIDA HASTA', formatDate(expiryDate)],
        ['MONEDA', 'COP · Pesos colombianos'],
      ];
      meta.forEach(([label, value], index) => {
        const x = 16 + index * 59.35;
        if (index > 0) doc.line(x - 5, 45, x - 5, 58);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(148, 163, 184);
        doc.text(label, x, 47);
        doc.setFontSize(8.4);
        doc.setTextColor(51, 65, 85);
        doc.text(value, x, 54);
      });

      // Datos del cliente
      const clientY = 64;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(16, clientY, 178, 29, 'FD');
      doc.setFillColor(37, 99, 235);
      doc.rect(16, clientY, 2.5, 29, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(docType === 'proforma' ? 'FACTURADO A' : 'PROPUESTA PREPARADA PARA', 24, clientY + 7);
      doc.setFontSize(13);
      doc.setTextColor(15, 39, 66);
      doc.text(quoteData.companyName, 24, clientY + 15);
      const contactParts = [quoteData.contactName, quoteData.contactEmail, quoteData.contactPhone].filter(Boolean);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      if (contactParts.length) doc.text(doc.splitTextToSize(contactParts.join('  ·  '), 155), 24, clientY + 22);

      // Tabla de productos
      const head = [['', 'PRODUCTO / DESCRIPCIÓN', 'CANT.', 'PRECIO UNITARIO', 'IMPORTE']];
      const body = prods.map(p => {
        const pr = parseFloat(p.price) || 0;
        return ['', p.name, String(p.quantity), formatMoney(pr), formatMoney(pr * p.quantity)];
      });

      doc.autoTable({
        head, body,
        startY: 101,
        theme: 'plain',
        showHead: 'everyPage',
        headStyles: { fillColor: [15, 39, 66], textColor: 255, fontStyle: 'bold', fontSize: 7.2, cellPadding: 3.4 },
        bodyStyles: { textColor: [51, 65, 85] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 8.2, cellPadding: 3.5, minCellHeight: 17, valign: 'middle', lineColor: [226, 232, 240], lineWidth: 0.2, overflow: 'linebreak' },
        columnStyles: { 0: { cellWidth: 14 }, 1: { cellWidth: 75, fontStyle: 'bold' }, 2: { cellWidth: 18, halign: 'center' }, 3: { cellWidth: 32, halign: 'right' }, 4: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: [15, 39, 66] } },
        margin: { left: 16, right: 16 },
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 0) {
            const p = prods[data.row.index];
            if (p?.img64) {
              try { doc.addImage(p.img64, 'JPEG', data.cell.x + 1.5, data.cell.y + 2, 11, 11); } catch {}
            }
          }
        }
      });

      const tblY = doc.lastAutoTable.finalY || 120;

      // Resumen económico
      let tY = tblY + 9;
      const totalsHeight = discount > 0 ? 33 : 27;
      if (tY + totalsHeight > 244) {
        doc.addPage();
        tY = 22;
      }
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(122, tY, 72, totalsHeight, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Subtotal', 128, tY + 7);
      doc.setTextColor(51, 65, 85);
      doc.text(formatMoney(subtotal), 188, tY + 7, { align: 'right' });

      if (discount > 0) {
        doc.setTextColor(100, 116, 139);
        doc.text(`Descuento${quoteData.discountType === 'percentage' ? ` (${quoteData.discountValue}%)` : ''}`, 128, tY + 14);
        doc.setTextColor(220, 38, 38);
        doc.text(`- ${formatMoney(discount)}`, 188, tY + 14, { align: 'right' });
      }

      const totalBandY = tY + (discount > 0 ? 20 : 14);
      doc.setFillColor(15, 39, 66);
      doc.rect(122, totalBandY, 72, 13, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255);
      doc.text('TOTAL', 128, totalBandY + 8.5);
      doc.setFontSize(11);
      doc.text(formatMoney(total), 188, totalBandY + 8.5, { align: 'right' });

      // Condiciones, cierre comercial y firma
      let nY = tY + totalsHeight + 13;
      if (nY > 247) { doc.addPage(); nY = 24; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(37, 99, 235);
      doc.text('CONDICIONES COMERCIALES', 16, nY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(doc.splitTextToSize(quoteData.notes, 96), 16, nY + 6);

      const sX = 135, sY = nY + 4;
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.35);
      doc.line(sX, sY + 13, 194, sY + 13);
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('FIRMA AUTORIZADA', 164.5, sY + 18, { align: 'center' });

      // Pie consistente en todas las páginas
      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(226, 232, 240);
        doc.line(16, 280, 194, 280);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(148, 163, 184);
        const footerIdentity = [companyProfile.friendlyName, companyProfile.location].filter(Boolean).join(' · ');
        doc.text(footerIdentity || 'Documento comercial', 16, 286);
        doc.text(`Página ${page} de ${pageCount}`, 194, 286, { align: 'right' });
      }

      const prefix = docType === 'proforma' ? 'proforma' : 'cotizacion';
      doc.save(`${prefix}_${quoteData.companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ 
        title: docType === 'proforma' ? 'Proforma generada' : 'Cotización generada', 
        description: 'El PDF se ha descargado exitosamente.' 
      });
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
            <h2 className="text-base font-bold text-slate-800">
              {docType === 'proforma' ? 'Nueva Factura Proforma' : 'Nueva Cotización'}
            </h2>
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

          {/* Tipo de Documento */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText className="h-4 w-4 text-slate-400" />
              Tipo de Documento
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Selecciona el tipo</Label>
                <Select
                  value={docType}
                  onValueChange={(v: 'quote' | 'proforma') => {
                    setDocType(v);
                    // Adjust default notes if they haven't been customized
                    if (v === 'proforma' && quoteData.notes.includes('Cotización válida por')) {
                      setQuoteData(prev => ({
                        ...prev,
                        notes: 'Esta es una factura proforma con carácter informativo y no comercial.'
                      }));
                    } else if (v === 'quote' && quoteData.notes.includes('Esta es una factura proforma')) {
                      setQuoteData(prev => ({
                        ...prev,
                        notes: 'Cotización válida por 15 días hábiles a partir de la fecha de emisión.'
                      }));
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-sm border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quote">Cotización</SelectItem>
                    <SelectItem value="proforma">Factura Proforma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

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
        <div className="w-1/2 overflow-y-auto bg-slate-200/60 p-6 xl:p-8 flex justify-center">
          <div
            className="w-full max-w-[590px] bg-white flex flex-col select-none relative overflow-hidden"
            style={{ minHeight: '820px', boxShadow: '0 18px 45px -18px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(15, 23, 42, 0.06)' }}
          >
            <div className="h-1.5 bg-[#0f2742]" />
            <div className="h-0.5 w-[28%] bg-blue-600" />

            <div className="p-8 xl:p-10 flex flex-1 flex-col">
              {/* Identidad y título */}
              <div className="flex justify-between items-start gap-5">
                <div className="min-w-0 max-w-[58%]">
                  {companyLogo ? (
                    <img src={companyLogo} alt="Logo" className="h-11 max-w-[180px] object-contain object-left" />
                  ) : (
                    <h3 className="text-base font-extrabold text-[#0f2742] tracking-tight">{companyProfile.friendlyName}</h3>
                  )}
                  {companyLogo && <p className="text-[10px] font-bold text-slate-700 mt-2">{companyProfile.friendlyName}</p>}
                  {(companyProfile.address || companyProfile.location) && (
                    <p className="text-[8px] text-slate-400 mt-1 leading-relaxed flex items-start gap-1">
                      <MapPin className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                      {[companyProfile.address, companyProfile.location].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-black text-[#0f2742] tracking-[-0.03em]">
                    {docType === 'proforma' ? 'FACTURA PROFORMA' : 'COTIZACIÓN'}
                  </p>
                  <p className="text-[9px] text-blue-600 font-bold tracking-wider mt-1">{documentNumber}</p>
                </div>
              </div>

              {/* Información clave */}
              <div className="grid grid-cols-3 border-y border-slate-200 mt-6 py-3">
                <div className="pr-3">
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.12em]">Fecha de emisión</p>
                  <p className="text-[9px] font-semibold text-slate-700 mt-1">{formatDate(new Date())}</p>
                </div>
                <div className="px-3 border-l border-slate-200">
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.12em]">Válida hasta</p>
                  <p className="text-[9px] font-semibold text-slate-700 mt-1">{formatDate(expiryDate)}</p>
                </div>
                <div className="pl-3 border-l border-slate-200">
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.12em]">Moneda</p>
                  <p className="text-[9px] font-semibold text-slate-700 mt-1">COP · Pesos colombianos</p>
                </div>
              </div>

              {/* Cliente */}
              <div className="mt-5 border border-slate-200 bg-slate-50 relative px-5 py-4">
                <div className="absolute inset-y-0 left-0 w-0.5 bg-blue-600" />
                <p className="text-[7px] text-slate-400 font-bold uppercase tracking-[0.14em] mb-1.5">
                  {docType === 'proforma' ? 'Facturado a' : 'Propuesta preparada para'}
                </p>
                <p className="text-sm font-extrabold text-[#0f2742]">
                  {quoteData.companyName || <span className="text-slate-300 font-normal">Empresa o cliente</span>}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-slate-500 mt-1.5">
                  {quoteData.contactName && <span className="font-semibold text-slate-600">{quoteData.contactName}</span>}
                  {quoteData.contactEmail && <span className="flex items-center gap-1"><Mail className="h-2.5 w-2.5" />{quoteData.contactEmail}</span>}
                  {quoteData.contactPhone && <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{quoteData.contactPhone}</span>}
                </div>
              </div>

              {/* Tabla de productos */}
              <div className="mt-5 flex-1">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0f2742] text-white text-[7px] uppercase tracking-[0.1em] font-bold">
                      <th className="py-2.5 px-2 text-left w-10"></th>
                      <th className="py-2.5 px-2 text-left">Producto / descripción</th>
                      <th className="py-2.5 px-2 text-center w-12">Cant.</th>
                      <th className="py-2.5 px-2 text-right w-20">P. unitario</th>
                      <th className="py-2.5 px-3 text-right w-20">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center border-b border-slate-100">
                          <ShoppingBag className="h-5 w-5 text-slate-200 mx-auto mb-2" />
                          <span className="text-slate-300 text-[10px]">Agrega productos para completar la propuesta</span>
                        </td>
                      </tr>
                    ) : selectedProducts.map((p, i) => {
                      const price = parseFloat(p.price) || 0;
                      return (
                        <tr key={p.id} className={cn('border-b border-slate-200', i % 2 === 1 && 'bg-slate-50')}>
                          <td className="py-2 px-2">
                            {p.image ? <img src={p.image} alt="" className="w-8 h-8 object-cover border border-slate-200" /> : <div className="w-8 h-8 bg-slate-50 border border-slate-200" />}
                          </td>
                          <td className="py-2 px-2 font-bold text-slate-700 leading-snug">{p.name}</td>
                          <td className="py-2 px-2 text-center text-slate-600 font-semibold">{p.quantity}</td>
                          <td className="py-2 px-2 text-right text-slate-500">{formatMoney(price)}</td>
                          <td className="py-2 px-3 text-right font-bold text-[#0f2742]">{formatMoney(price * p.quantity)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumen financiero */}
              {selectedProducts.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <div className="w-[230px] border border-slate-200 bg-slate-50">
                    <div className="flex justify-between text-[9px] text-slate-500 px-4 py-2">
                      <span>Subtotal</span><span className="font-semibold text-slate-700">{formatMoney(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-[9px] text-slate-500 px-4 pb-2">
                        <span>Descuento {quoteData.discountType === 'percentage' ? `(${quoteData.discountValue}%)` : ''}</span>
                        <span className="font-semibold text-red-600">- {formatMoney(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center bg-[#0f2742] text-white px-4 py-3">
                      <span className="text-[9px] font-bold tracking-wider">TOTAL</span>
                      <span className="text-sm font-black">{formatMoney(total)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Condiciones y firma */}
              <div className="mt-auto pt-7 flex justify-between items-end gap-8">
                <div className="max-w-[58%]">
                  <p className="text-[7px] text-blue-600 font-bold uppercase tracking-[0.14em] mb-1.5">Condiciones comerciales</p>
                  <p className="text-[8px] text-slate-500 leading-relaxed">{quoteData.notes}</p>
                </div>
                <div className="w-36 text-center">
                  <div className="border-b border-slate-300 mb-1.5 h-7" />
                  <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Firma autorizada</span>
                </div>
              </div>

              {/* Pie */}
              <div className="mt-8 pt-3 border-t border-slate-200 flex items-center justify-between text-[7px] text-slate-400">
                <span>{companyProfile.friendlyName}{companyProfile.location ? ` · ${companyProfile.location}` : ''}</span>
                <span className="flex items-center gap-1"><ShieldCheck className="h-2.5 w-2.5 text-blue-600" /> Documento comercial</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
