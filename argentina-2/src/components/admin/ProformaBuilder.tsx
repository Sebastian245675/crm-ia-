import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Plus, Minus, Trash2, FileText, Download, RefreshCw, Mail, Phone, Building2, Calendar, ShoppingBag } from 'lucide-react';
import { db, collection, getDocs } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ProformaBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderData?: any | null;
}

export const ProformaBuilder: React.FC<ProformaBuilderProps> = ({ isOpen, onClose, initialOrderData }) => {
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Datos específicos del diseño en español
  const [senderData, setSenderData] = useState({
    name: 'Juan Pérez',
    address: 'Avenida Cabildo 1500\nBuenos Aires, C1426',
  });

  const [clientData, setClientData] = useState({
    sentToName: 'Distribuidora Martínez S.A.',
    sentToAddress: 'Calle Florida 450\nBuenos Aires, C1005',
    shipToName: 'Distribuidora Martínez S.A. (Depósito)',
    shipToAddress: 'Av. Juan B. Justo 3200\nBuenos Aires, C1416',
    sameAsBilling: false,
  });

  const [documentDetails, setDocumentDetails] = useState({
    invoiceNumber: 'PRO-0001',
    invoiceDate: new Date().toISOString().split('T')[0],
    poNumber: 'OC-9876',
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [financialData, setFinancialData] = useState({
    taxPercentage: 21.0, // Porcentaje de IVA por defecto en Argentina/Latinoamérica
    termsAndConditions: 'El pago debe realizarse dentro de los 15 días.',
    bankName: 'Banco de la Nación Argentina',
    accountNumber: '12345678/90',
    routingNumber: 'CBU: 0110001230000123456789 / Alias: mi.empresa',
    signatureName: 'Juan Pérez',
  });

  // Items de la proforma (se inician con 2 de prueba tal como en la imagen de muestra)
  const [selectedProducts, setSelectedProducts] = useState<any[]>([
    { id: '1', name: 'Servicio de consultoría y diagnóstico', price: 100.00, quantity: 1 },
    { id: '2', name: 'Licencia de software empresarial (Anual)', price: 25.00, quantity: 2 },
  ]);

  // Cargar datos por defecto del perfil de la empresa
  useEffect(() => {
    if (isOpen) {
      fetchCompanyProfile();
      
      const today = new Date();
      const due = new Date();
      due.setDate(today.getDate() + 15);
      
      setDocumentDetails(prev => ({
        ...prev,
        invoiceDate: today.toISOString().split('T')[0],
        dueDate: due.toISOString().split('T')[0],
        invoiceNumber: initialOrderData?.id 
          ? `PRO-${initialOrderData.id.substring(0, 6).toUpperCase()}` 
          : prev.invoiceNumber,
        poNumber: initialOrderData?.id
          ? `OC-${initialOrderData.id.substring(0, 6).toUpperCase()}`
          : prev.poNumber,
      }));

      if (initialOrderData) {
        setClientData({
          sentToName: initialOrderData.userName || initialOrderData.user_name || '',
          sentToAddress: initialOrderData.shippingAddress || initialOrderData.userAddress || initialOrderData.address || initialOrderData.userEmail || '',
          shipToName: initialOrderData.userName || initialOrderData.user_name || '',
          shipToAddress: initialOrderData.shippingAddress || initialOrderData.userAddress || initialOrderData.address || initialOrderData.userEmail || '',
          sameAsBilling: true,
        });

        if (initialOrderData.items && Array.isArray(initialOrderData.items)) {
          setSelectedProducts(initialOrderData.items.map((item: any) => ({
            id: item.id || ('custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)),
            name: item.name || '',
            price: typeof item.price === 'number' ? item.price : 0,
            quantity: typeof item.quantity === 'number' ? item.quantity : 1,
          })));
        } else {
          setSelectedProducts([]);
        }
      } else {
        setClientData({
          sentToName: 'Distribuidora Martínez S.A.',
          sentToAddress: 'Calle Florida 450\nBuenos Aires, C1005',
          shipToName: 'Distribuidora Martínez S.A. (Depósito)',
          shipToAddress: 'Av. Juan B. Justo 3200\nBuenos Aires, C1416',
          sameAsBilling: false,
        });
        setSelectedProducts([
          { id: '1', name: 'Servicio de consultoría y diagnóstico', price: 100.00, quantity: 1 },
          { id: '2', name: 'Licencia de software empresarial (Anual)', price: 25.00, quantity: 2 },
        ]);
      }
    }
  }, [isOpen, initialOrderData]);

  const fetchCompanyProfile = async () => {
    try {
      const isSupabase = typeof (db as any)?.from === 'function';
      let companyName = '';
      let companyAddress = '';

      if (isSupabase) {
        const { data } = await (db as any).from('company_profile').select('name, address').maybeSingle();
        if (data) {
          companyName = data.name || '';
          companyAddress = data.address || '';
        }
      } else {
        const snap = await getDocs(collection(db, 'company_profile'));
        if (!snap.empty) {
          const profileData = snap.docs[0].data();
          companyName = profileData.name || '';
          companyAddress = profileData.address || '';
        }
      }

      if (companyName) {
        setSenderData({
          name: companyName,
          address: companyAddress || 'Dirección de la empresa',
        });
        setFinancialData(prev => ({
          ...prev,
          signatureName: companyName,
        }));
      }
    } catch (err) {
      console.warn('Error al cargar perfil de empresa:', err);
    }
  };

  // Añadir un nuevo item conceptual vacío
  const addNewCustomItem = () => {
    const newItem = {
      id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: 'Concepto / Servicio nuevo',
      price: 0.0,
      quantity: 1
    };
    setSelectedProducts(prev => [...prev, newItem]);
  };

  const updateProductRow = (id: string, field: 'quantity' | 'price' | 'name', value: any) => {
    setSelectedProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      if (field === 'quantity') {
        return { ...p, quantity: Math.max(1, parseInt(value) || 1) };
      } else if (field === 'price') {
        return { ...p, price: Math.max(0, parseFloat(value) || 0) };
      } else {
        return { ...p, name: value };
      }
    }));
  };

  const removeProduct = (id: string) => setSelectedProducts(prev => prev.filter(p => p.id !== id));

  // Cálculos financieros
  const subtotal = useMemo(() =>
    selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0),
    [selectedProducts]
  );

  const salesTax = useMemo(() => {
    return (subtotal * Math.max(financialData.taxPercentage, 0)) / 100;
  }, [subtotal, financialData.taxPercentage]);

  const total = subtotal + salesTax;

  const formatDateLabel = (dateString: string) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dateString;
  };

  // Copiar facturación a envío
  const handleToggleSameAddress = (checked: boolean) => {
    setClientData(prev => ({
      ...prev,
      sameAsBilling: checked,
      shipToName: checked ? prev.sentToName : prev.shipToName,
      shipToAddress: checked ? prev.sentToAddress : prev.shipToAddress,
    }));
  };

  const generatePDF = async () => {
    if (!selectedProducts.length || !clientData.sentToName) {
      toast({ title: 'Faltan datos', description: 'Por favor, agregue conceptos y complete el nombre del cliente.', variant: 'destructive' });
      return;
    }

    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();

      // Fuentes y Estilos
      doc.setFont('helvetica', 'normal');
      
      // 1. Cabecera Emisor
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(senderData.name, 16, 20);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      
      // Dibujar dirección del emisor con salto de línea
      const senderLines = senderData.address.split('\n');
      let currentY = 26;
      senderLines.forEach(line => {
        doc.text(line, 16, currentY);
        currentY += 4.5;
      });

      // 2. Título de Proforma (Alineado a la derecha)
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('FACTURA', 194, 20, { align: 'right' });
      doc.text('PROFORMA', 194, 26, { align: 'right' });

      // 3. Bloque de Datos (Facturado a / Enviar a / Detalles)
      let blockY = 48;
      
      // Columnas del bloque
      // Facturado a
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Facturado a', 16, blockY);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(clientData.sentToName, 16, blockY + 5);
      const sentToLines = clientData.sentToAddress.split('\n');
      let sentToY = blockY + 9.5;
      sentToLines.forEach(line => {
        doc.text(line, 16, sentToY);
        sentToY += 4.5;
      });

      // Enviar a
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Enviar a', 76, blockY);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(clientData.shipToName, 76, blockY + 5);
      const shipToLines = clientData.shipToAddress.split('\n');
      let shipToY = blockY + 9.5;
      shipToLines.forEach(line => {
        doc.text(line, 76, shipToY);
        shipToY += 4.5;
      });

      // Detalles de la Proforma
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      const labelsX = 135;
      const valuesX = 194;
      
      doc.text('Proforma Nro.', labelsX, blockY);
      doc.text('Fecha Emisión', labelsX, blockY + 5.5);
      doc.text('Orden Compra', labelsX, blockY + 11);
      doc.text('Vencimiento', labelsX, blockY + 16.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(documentDetails.invoiceNumber, valuesX, blockY, { align: 'right' });
      doc.text(formatDateLabel(documentDetails.invoiceDate), valuesX, blockY + 5.5, { align: 'right' });
      doc.text(documentDetails.poNumber, valuesX, blockY + 11, { align: 'right' });
      doc.text(formatDateLabel(documentDetails.dueDate), valuesX, blockY + 16.5, { align: 'right' });

      // 4. Tabla de Productos
      const head = [['CANT.', 'DESCRIPCIÓN', 'PRECIO UNIT.', 'IMPORTE']];
      const body = selectedProducts.map(p => [
        String(p.quantity),
        p.name,
        formatCurrency(p.price),
        formatCurrency(p.price * p.quantity)
      ]);

      const tableStartY = Math.max(sentToY, shipToY, blockY + 22) + 6;

      doc.autoTable({
        head,
        body,
        startY: tableStartY,
        theme: 'plain',
        headStyles: {
          fillColor: [248, 250, 252],
          textColor: 0,
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'left',
          valign: 'middle',
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 4,
          valign: 'middle',
          textColor: 40,
        },
        columnStyles: {
          0: { cellWidth: 16, halign: 'center' },
          1: { cellWidth: 104, halign: 'left' },
          2: { cellWidth: 32, halign: 'right' },
          3: { cellWidth: 32, halign: 'right' }
        },
        margin: { left: 16, right: 16 },
        didDrawCell: (data: any) => {
          const xStart = data.cell.x;
          const xEnd = data.cell.x + data.cell.width;
          const y = data.cell.y + data.cell.height;
          
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.5);
          
          // Dibuja borde inferior para cada celda
          doc.line(xStart, y, xEnd, y);
          
          // Dibuja borde superior en la cabecera
          if (data.row.section === 'head') {
            doc.line(xStart, data.cell.y, xEnd, data.cell.y);
          }

          // Dibuja borde vertical para separar QTY
          if (data.column.index === 0) {
            const x = data.cell.x + data.cell.width;
            doc.line(x, data.cell.y, x, data.cell.y + data.cell.height);
          }
        }
      });

      const tblY = doc.lastAutoTable.finalY || tableStartY + 20;

      // 5. Totales
      let tY = tblY + 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      
      const totalLabelsX = 140;
      const totalValuesX = 194;

      doc.text('Subtotal', totalLabelsX, tY);
      doc.text(formatCurrency(subtotal), totalValuesX, tY, { align: 'right' });

      tY += 5;
      doc.text(`IVA / Impuesto ${financialData.taxPercentage.toFixed(1)}%`, totalLabelsX, tY);
      doc.text(formatCurrency(salesTax), totalValuesX, tY, { align: 'right' });

      // TOTAL (Fondo Gris y bordes como la imagen)
      tY += 3;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.rect(125, tY, 71, 10, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('TOTAL', 130, tY + 6.5);
      doc.text(formatCurrency(total), 190, tY + 6.5, { align: 'right' });

      // 6. Firma (Debajo de totales a la derecha)
      let sigY = tY + 18;
      if (sigY > 260) { doc.addPage(); sigY = 20; }
      
      // Dibujar texto manuscrito simulado con tipografía cursiva
      doc.setFont('times', 'italic');
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text(financialData.signatureName, 185, sigY, { align: 'right' });

      // 7. Condiciones y Datos Bancarios (Abajo a la izquierda)
      let footY = sigY + 12;
      if (footY > 240) { doc.addPage(); footY = 20; }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text('Términos y Condiciones', 16, footY);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text(financialData.termsAndConditions, 16, footY + 5);

      doc.text(financialData.bankName, 16, footY + 12);
      doc.text(`Número de cuenta: ${financialData.accountNumber}`, 16, footY + 16.5);
      doc.text(`${financialData.routingNumber}`, 16, footY + 21);

      // Guardar PDF
      doc.save(`proforma_${documentDetails.invoiceNumber}_${quoteDataToFilename(clientData.sentToName)}.pdf`);
      toast({ title: 'Proforma generada', description: 'El archivo PDF se ha descargado correctamente.' });
      onClose();
    } catch (err) {
      console.error('Error al generar PDF:', err);
      toast({ title: 'Error', description: 'No se pudo generar el PDF.', variant: 'destructive' });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const quoteDataToFilename = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
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
            <h2 className="text-base font-bold text-slate-800">Nueva Factura Proforma</h2>
            <p className="text-[11px] text-slate-400">Diseño comercial e información de facturación</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-2 hidden sm:block">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Importe Total</span>
            <span className="text-lg font-bold text-slate-800 leading-none">{formatCurrency(total)}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-lg h-9 w-9">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* ─── Contenido dividido ─── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ══ IZQUIERDA: Formulario de Datos ══ */}
        <div className="w-1/2 border-r border-slate-200 overflow-y-auto p-6 space-y-6 bg-slate-50/40">

          {/* Sección 1: Emisor */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Building2 className="h-4 w-4 text-slate-400" />
              Datos del Emisor (Tus Datos)
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Nombre / Razón Social</Label>
                <Input
                  value={senderData.name}
                  onChange={e => setSenderData(prev => ({ ...prev, name: e.target.value }))}
                  className="h-9 text-sm border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Dirección</Label>
                <textarea
                  value={senderData.address}
                  onChange={e => setSenderData(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(214,100%,38%)]/20 focus:border-[hsl(214,100%,38%)]/40"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Clientes (Facturación y Envío) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Building2 className="h-4 w-4 text-slate-400" />
              Datos de Facturación y Envío
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-sm">
              {/* Sent To */}
              <div className="space-y-3 pb-3 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Facturado a</h4>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Nombre / Cliente *</Label>
                  <Input
                    value={clientData.sentToName}
                    onChange={e => setClientData(prev => {
                      const name = e.target.value;
                      return {
                        ...prev,
                        sentToName: name,
                        shipToName: prev.sameAsBilling ? name : prev.shipToName
                      };
                    })}
                    placeholder="Nombre del destinatario"
                    className="h-9 text-sm border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Dirección de Facturación</Label>
                  <textarea
                    value={clientData.sentToAddress}
                    onChange={e => setClientData(prev => {
                      const addr = e.target.value;
                      return {
                        ...prev,
                        sentToAddress: addr,
                        shipToAddress: prev.sameAsBilling ? addr : prev.shipToAddress
                      };
                    })}
                    rows={2}
                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 resize-none focus:outline-none"
                  />
                </div>
              </div>

              {/* Ship To */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Enviar a</h4>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
                    <Checkbox
                      checked={clientData.sameAsBilling}
                      onCheckedChange={handleToggleSameAddress}
                    />
                    Mismo que facturación
                  </label>
                </div>
                {!clientData.sameAsBilling && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Nombre Destinatario de Envío</Label>
                      <Input
                        value={clientData.shipToName}
                        onChange={e => setClientData(prev => ({ ...prev, shipToName: e.target.value }))}
                        className="h-9 text-sm border-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Dirección de Envío</Label>
                      <textarea
                        value={clientData.shipToAddress}
                        onChange={e => setClientData(prev => ({ ...prev, shipToAddress: e.target.value }))}
                        rows={2}
                        className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 resize-none focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sección 3: Detalles del Documento */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Calendar className="h-4 w-4 text-slate-400" />
              Detalles del Documento
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Proforma Nro.</Label>
                  <Input
                    value={documentDetails.invoiceNumber}
                    onChange={e => setDocumentDetails(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="h-9 text-sm border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Fecha de Emisión</Label>
                  <Input
                    type="date"
                    value={documentDetails.invoiceDate}
                    onChange={e => setDocumentDetails(prev => ({ ...prev, invoiceDate: e.target.value }))}
                    className="h-9 text-sm border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Orden de Compra (P.O.#)</Label>
                  <Input
                    value={documentDetails.poNumber}
                    onChange={e => setDocumentDetails(prev => ({ ...prev, poNumber: e.target.value }))}
                    className="h-9 text-sm border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Vencimiento</Label>
                  <Input
                    type="date"
                    value={documentDetails.dueDate}
                    onChange={e => setDocumentDetails(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="h-9 text-sm border-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sección 4: Conceptos / Servicios (MANUALES) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ShoppingBag className="h-4 w-4 text-slate-400" />
                Conceptos / Servicios de la Proforma
              </div>
              <Button
                type="button"
                onClick={addNewCustomItem}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] h-7 rounded-lg flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Añadir Concepto
              </Button>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
              {selectedProducts.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                        <th className="text-left py-2 px-3">Descripción del Concepto / Servicio</th>
                        <th className="text-center py-2 px-1 w-[80px]">Cant.</th>
                        <th className="text-right py-2 px-3 w-[100px]">Precio Unit. ($)</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts.map(p => (
                        <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/20">
                          {/* Descripción Editable */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={p.name}
                              onChange={e => updateProductRow(p.id, 'name', e.target.value)}
                              placeholder="Ej: Servicio de desarrollo web"
                              className="w-full h-8 text-xs border border-slate-200 rounded px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                            />
                          </td>
                          {/* Cantidad Editable */}
                          <td className="py-2 px-1 text-center">
                            <input
                              type="number"
                              min="1"
                              value={p.quantity}
                              onChange={e => updateProductRow(p.id, 'quantity', e.target.value)}
                              className="w-12 h-8 text-center text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                            />
                          </td>
                          {/* Precio Editable */}
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={p.price === 0 ? '' : p.price}
                              placeholder="0.00"
                              onChange={e => updateProductRow(p.id, 'price', e.target.value)}
                              className="w-20 h-8 text-right text-xs border border-slate-200 rounded px-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-2 pr-2 text-center">
                            <button onClick={() => removeProduct(p.id)} className="text-slate-300 hover:text-red-500 p-1">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  <ShoppingBag className="h-5 w-5 text-slate-300 mx-auto mb-1.5" />
                  Haz clic en "Añadir Concepto" para armar los conceptos de tu proforma.
                </div>
              )}
            </div>
          </div>

          {/* Sección 5: Impuesto, Firmas y Cuenta Bancaria */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CreditCardIcon className="h-4 w-4 text-slate-400" />
              Impuestos e Información Financiera
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">IVA / Impuesto (%)</Label>
                  <Input
                    type="number" step="0.1" min="0"
                    value={financialData.taxPercentage}
                    onChange={e => setFinancialData(prev => ({ ...prev, taxPercentage: parseFloat(e.target.value) || 0 }))}
                    className="h-9 text-sm border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Firma (Nombre a mostrar)</Label>
                  <Input
                    value={financialData.signatureName}
                    onChange={e => setFinancialData(prev => ({ ...prev, signatureName: e.target.value }))}
                    className="h-9 text-sm border-slate-200"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Nombre de Banco</Label>
                <Input
                  value={financialData.bankName}
                  onChange={e => setFinancialData(prev => ({ ...prev, bankName: e.target.value }))}
                  className="h-9 text-sm border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Número de Cuenta</Label>
                  <Input
                    value={financialData.accountNumber}
                    onChange={e => setFinancialData(prev => ({ ...prev, accountNumber: e.target.value }))}
                    className="h-9 text-sm border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">CBU / Alias / Ruta</Label>
                  <Input
                    value={financialData.routingNumber}
                    onChange={e => setFinancialData(prev => ({ ...prev, routingNumber: e.target.value }))}
                    className="h-9 text-sm border-slate-200"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Términos y condiciones</Label>
                <Input
                  value={financialData.termsAndConditions}
                  onChange={e => setFinancialData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                  className="h-9 text-sm border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Botones de acción formulario */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 h-10 text-sm border-slate-200">
              Cancelar
            </Button>
            <Button
              onClick={generatePDF}
              disabled={generatingPDF || !selectedProducts.length || !clientData.sentToName}
              className="flex-1 h-10 text-sm bg-[hsl(214,100%,38%)] hover:bg-[hsl(214,100%,33%)] text-white font-semibold flex items-center justify-center gap-2"
            >
              {generatingPDF ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {generatingPDF ? 'Generando PDF...' : 'Descargar Proforma'}
            </Button>
          </div>

        </div>

        {/* ══ DERECHA: Vista Previa en Vivo en Español ══ */}
        <div className="w-1/2 overflow-y-auto bg-slate-100 p-8 flex justify-center">
          
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap');
            .signature-font {
              font-family: 'Caveat', 'Brush Script MT', cursive;
              font-size: 2.2rem;
              font-weight: 600;
              color: #1e293b;
              transform: rotate(-3deg);
              display: inline-block;
            }
            .proforma-preview {
              min-height: 840px;
              box-shadow: 0 4px 30px -10px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            }
            .border-preview-table th, .border-preview-table td {
              border: 1px solid #e2e8f0;
              padding: 6px 10px;
            }
            .border-preview-table th {
              border-bottom: 2px solid #cbd5e1;
              background-color: #f8fafc;
            }
          `}</style>

          <div className="w-full max-w-[600px] bg-white rounded-sm p-10 flex flex-col proforma-preview text-black select-none">
            
            {/* Cabecera Principal */}
            <div className="flex justify-between items-start">
              {/* Emisor */}
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">{senderData.name}</h1>
                <div className="text-[11px] text-slate-500 mt-2.5 leading-relaxed whitespace-pre-line">
                  {senderData.address}
                </div>
              </div>
              {/* Título de Documento */}
              <div className="text-right">
                <h2 className="text-xl font-bold text-slate-800 tracking-wider leading-none">FACTURA</h2>
                <h2 className="text-xl font-bold text-slate-800 tracking-wider mt-1 leading-none">PROFORMA</h2>
              </div>
            </div>

            {/* Fila de Datos del Cliente e Invoice */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-4 border-t border-slate-100">
              {/* Sent To */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Facturado a</h4>
                <div className="text-xs font-bold text-slate-800 leading-tight">{clientData.sentToName}</div>
                <div className="text-[10px] text-slate-500 mt-1 whitespace-pre-line leading-relaxed">
                  {clientData.sentToAddress}
                </div>
              </div>

              {/* Ship To */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Enviar a</h4>
                <div className="text-xs font-bold text-slate-800 leading-tight">{clientData.shipToName}</div>
                <div className="text-[10px] text-slate-500 mt-1 whitespace-pre-line leading-relaxed">
                  {clientData.shipToAddress}
                </div>
              </div>

              {/* Info de Proforma */}
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400 text-[10px] uppercase">Proforma Nro.</span>
                  <span className="font-bold text-slate-800">{documentDetails.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400 text-[10px] uppercase">Fecha Emisión</span>
                  <span className="font-semibold text-slate-700">{formatDateLabel(documentDetails.invoiceDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400 text-[10px] uppercase">Orden Compra</span>
                  <span className="font-semibold text-slate-700">{documentDetails.poNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400 text-[10px] uppercase">Vencimiento</span>
                  <span className="font-semibold text-slate-700">{formatDateLabel(documentDetails.dueDate)}</span>
                </div>
              </div>
            </div>

            {/* Tabla Principal */}
            <div className="mt-8 flex-1">
              <table className="w-full text-xs border-collapse border-preview-table">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider font-bold text-slate-600">
                    <th className="text-center w-12 bg-slate-50">CANT.</th>
                    <th className="text-left">DESCRIPCIÓN</th>
                    <th className="text-right w-24">PRECIO UNIT.</th>
                    <th className="text-right w-24">IMPORTE</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 italic">
                        Agrega conceptos en el formulario izquierdo para verlos aquí
                      </td>
                    </tr>
                  ) : (
                    selectedProducts.map((p) => (
                      <tr key={p.id} className="text-slate-700">
                        <td className="text-center font-semibold border-r border-slate-200">{p.quantity}</td>
                        <td>{p.name}</td>
                        <td className="text-right">{formatCurrency(p.price)}</td>
                        <td className="text-right font-semibold text-slate-900">{formatCurrency(p.price * p.quantity)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Bloque de Subtotales y Totales */}
              {selectedProducts.length > 0 && (
                <div className="mt-4 flex flex-col items-end">
                  <div className="w-[220px] space-y-1.5 text-xs text-slate-500 font-medium pr-1">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IVA / Impuesto {financialData.taxPercentage.toFixed(1)}%</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(salesTax)}</span>
                    </div>
                  </div>
                  
                  {/* TOTAL destacado */}
                  <div className="w-[230px] flex justify-between items-center border border-slate-200 bg-slate-50/75 px-4 py-2.5 rounded-md mt-2 shadow-sm">
                    <span className="text-xs font-bold text-slate-800">TOTAL</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrency(total)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Firma Manuscrita Simulada */}
            {selectedProducts.length > 0 && (
              <div className="mt-6 flex justify-end">
                <div className="text-center pr-2">
                  <div className="signature-font mb-1">{financialData.signatureName}</div>
                </div>
              </div>
            )}

            {/* Pie de Página: Términos y Datos de Banco */}
            <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-4">
              <div>
                <h5 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Términos y Condiciones</h5>
                <p className="text-[10px] text-slate-500 mt-1">{financialData.termsAndConditions}</p>
              </div>
              <div className="text-[10px] text-slate-500 leading-normal">
                <div className="font-bold text-slate-700">{financialData.bankName}</div>
                <div>Número de cuenta: {financialData.accountNumber}</div>
                <div>{financialData.routingNumber}</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

// Icono de tarjeta helper
const CreditCardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);
