import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, FileCode, Eye, Plus, Trash2, Edit2, Download, Copy, Printer, RefreshCw, Play } from 'lucide-react';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveAgencyId, isItemForAgency } from '@/lib/agency-isolation';
import { formatCurrency } from '@/lib/currency';

export const FacturacionManager: React.FC = () => {
  const { user } = useAuth();
  const activeAgencyId = React.useMemo(() => getActiveAgencyId(user), [user]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'lineas' | 'historial'>('lineas');
  const [loadingLineas, setLoadingLineas] = useState(true);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  
  // States for Lines
  const [lineas, setLineas] = useState<any[]>([]);
  const [showLineDialog, setShowLineDialog] = useState(false);
  const [editingLine, setEditingLine] = useState<any | null>(null);
  const [lineForm, setLineForm] = useState({
    name: '',
    type: 'no_factura', // 'no_factura', 'factura_electronica'
  });

  // States for Invoices
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchInvoiceTerm, setSearchInvoiceTerm] = useState('');
  
  // Detail Dialogs
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [showXmlDialog, setShowXmlDialog] = useState(false);

  const [testingTimbrar, setTestingTimbrar] = useState(false);

  const handleTestTimbrar = async () => {
    setTestingTimbrar(true);
    toast({
      title: 'Prueba de Facturación',
      description: 'Enviando petición de timbrado de prueba a Facturama...',
    });

    try {
      const res = await fetch('/api/facturacion/timbrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: `test-${Date.now()}`,
          total: 1160,
          customer_name: 'PUBLICO EN GENERAL',
          rfc: 'XAXX010101000',
          zip: '26015',
          regimen: '616',
          uso_cfdi: 'S01',
          forma_pago: '01',
          metodo_pago: 'PUE',
          items: [
            {
              name: 'Producto de prueba',
              price: 1160,
              quantity: 1,
            }
          ],
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: '¡Éxito!',
          description: `Factura timbrada de prueba correctamente. UUID: ${data.uuid}`,
          variant: 'default',
        });
        fetchHistorial();
      } else {
        toast({
          title: 'Error en timbrado',
          description: data.message || 'No se pudo generar la factura de prueba.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error de red',
        description: err.message || 'Error al conectar con la API de facturación.',
        variant: 'destructive',
      });
    } finally {
      setTestingTimbrar(false);
    }
  };

  const handleTestLine = async (line: any) => {
    setTestingTimbrar(true);
    toast({
      title: 'Prueba de Facturación',
      description: `Iniciando timbrado de prueba usando la línea: ${line.name}...`,
    });

    try {
      const res = await fetch('/api/facturacion/timbrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: `test-line-${Date.now()}`,
          total: 1160,
          customer_name: 'PUBLICO EN GENERAL',
          rfc: 'XAXX010101000',
          zip: '26015',
          regimen: '616',
          uso_cfdi: 'S01',
          forma_pago: '01',
          metodo_pago: 'PUE',
          billing_line_id: line.id,
          items: [
            {
              name: `Venta de prueba (${line.name})`,
              price: 1160,
              quantity: 1,
            }
          ],
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: '¡Éxito!',
          description: `Factura de prueba timbrada correctamente con ${line.name}. UUID: ${data.uuid}`,
          variant: 'default',
        });
        fetchHistorial();
      } else {
        toast({
          title: 'Error en timbrado',
          description: data.message || 'No se pudo generar la factura de prueba.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error de red',
        description: err.message || 'Error al conectar con la API de facturación.',
        variant: 'destructive',
      });
    } finally {
      setTestingTimbrar(false);
    }
  };

  useEffect(() => {
    fetchLineas();
    fetchHistorial();
  }, [activeAgencyId]);

  // --- LINES CRUD ---
  const fetchLineas = async () => {
    setLoadingLineas(true);
    try {
      const { data, error } = await db.from('lineas_facturacion').select('*');
      if (error) throw error;
      const agencyLines = (data || []).filter((l: any) => isItemForAgency(l, activeAgencyId));
      setLineas(agencyLines);

      // Fetch company profile for this agency
      const targetAgency = activeAgencyId || '2';
      const { data: profile } = await db
        .from('company_profile')
        .select('*')
        .or(`owner_id.eq.${targetAgency},agency_id.eq.${targetAgency}`)
        .maybeSingle();
      if (profile) {
        setCompanyProfile(profile);
      } else {
        const { data: fallback } = await db.from('company_profile').select('*').limit(1).maybeSingle();
        setCompanyProfile(fallback || null);
      }
    } catch (err: any) {
      console.error('Error fetching lines:', err);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las líneas de facturación.',
        variant: 'destructive',
      });
    } finally {
      setLoadingLineas(false);
    }
  };

  const handleSaveLine = async () => {
    if (!lineForm.name.trim()) {
      toast({
        title: 'Error de validación',
        description: 'El nombre de la línea es requerido.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingLine) {
        // Update
        const { error } = await db.from('lineas_facturacion')
          .update({
            name: lineForm.name,
            type: lineForm.type,
          })
          .eq('id', editingLine.id);
        if (error) throw error;
        toast({ title: 'Éxito', description: 'Línea de facturación actualizada.' });
      } else {
        // Create
        const newLine = {
          id: `line-${Date.now()}`,
          name: lineForm.name,
          type: lineForm.type,
          agency_id: activeAgencyId || '2',
          owner_id: activeAgencyId || '2',
          created_at: new Date().toISOString(),
        };
        const { error } = await db.from('lineas_facturacion').insert(newLine);
        if (error) throw error;
        toast({ title: 'Éxito', description: 'Línea de facturación creada.' });
      }
      setShowLineDialog(false);
      setEditingLine(null);
      setLineForm({ name: '', type: 'no_factura' });
      fetchLineas();
    } catch (err: any) {
      console.error('Error saving line:', err);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la línea de facturación.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLine = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta línea?')) return;
    try {
      const { error } = await db.from('lineas_facturacion').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Éxito', description: 'Línea de facturación eliminada.' });
      fetchLineas();
    } catch (err: any) {
      console.error('Error deleting line:', err);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la línea de facturación.',
        variant: 'destructive',
      });
    }
  };

  const openEditLine = (line: any) => {
    setEditingLine(line);
    setLineForm({ name: line.name, type: line.type });
    setShowLineDialog(true);
  };

  // --- INVOICES HISTORY ---
  const fetchHistorial = async () => {
    setLoadingHistorial(true);
    try {
      const res = await fetch('/api/facturacion/historial');
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      const allInvoices = data.facturas || [];

      // Filter invoices matching this agency's billing lines or agency items
      const { data: lineData } = await db.from('lineas_facturacion').select('*');
      const agencyLines = (lineData || []).filter((l: any) => isItemForAgency(l, activeAgencyId));
      const lineIds = new Set(agencyLines.map((l: any) => String(l.id)));

      const filtered = allInvoices.filter((inv: any) => {
        if (inv.billing_line_id) {
          return lineIds.has(String(inv.billing_line_id));
        }
        return isItemForAgency(inv, activeAgencyId);
      });
      setInvoices(filtered);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      toast({
        title: 'Error',
        description: 'No se pudo obtener el historial de facturas.',
        variant: 'destructive',
      });
    } finally {
      setLoadingHistorial(false);
    }
  };

  // Stats calculations
  const totalFacturado = invoices
    .filter((f) => f.estatus === 'TIMBRADA')
    .reduce((sum, f) => sum + (parseFloat(f.total) || 0), 0);
  const facturasTimbradasCount = invoices.filter((f) => f.estatus === 'TIMBRADA').length;
  const facturasCanceladasCount = invoices.filter((f) => f.estatus === 'CANCELADA').length;

  const filteredInvoices = invoices.filter((inv) => {
    const term = searchInvoiceTerm.toLowerCase();
    return (
      inv.uuid.toLowerCase().includes(term) ||
      String(inv.order_id).toLowerCase().includes(term) ||
      inv.estatus.toLowerCase().includes(term)
    );
  });

  const emisorLegalName = companyProfile?.legal_name || companyProfile?.company_name || companyProfile?.friendly_name || (activeAgencyId === 'voltium-sanrey' ? 'VOLTIUM SANREY SA DE CV' : 'WEBSY SA DE CV');
  const emisorRfc = companyProfile?.rfc || (activeAgencyId === 'voltium-sanrey' ? 'VOSA900909AA1' : 'XAXX010101000');
  const emisorRegimen = companyProfile?.tax_system || '601 - General de Ley Personas Morales';
  const emisorAddress = [
    companyProfile?.address,
    companyProfile?.city,
    companyProfile?.state,
    companyProfile?.postal_code ? `CP ${companyProfile.postal_code}` : ''
  ].filter(Boolean).join(', ') || (activeAgencyId === 'voltium-sanrey' ? 'Av. Reforma 1234, Col. Centro, CP 26015, Piedras Negras, Coahuila' : 'Av. Insurgentes Sur 1602, Crédito Constructor, Benito Juárez, CDMX');

  const getXmlMockContent = (inv: any) => {
    const total = parseFloat(inv?.total) || 0;
    const subtotal = total / 1.16;
    const tax = total - subtotal;
    const formattedDate = new Date(inv?.fecha).toISOString().split('.')[0];
    return `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
    Version="4.0" 
    UUID="${inv?.uuid}"
    Fecha="${formattedDate}"
    SubTotal="${subtotal.toFixed(2)}"
    Total="${total.toFixed(2)}"
    Moneda="MXN" 
    TipoDeComprobante="I">
  <cfdi:Emisor Rfc="${emisorRfc}" Nombre="${emisorLegalName}" RegimenFiscal="${emisorRegimen}"/>
  <cfdi:Receptor Rfc="XAXX010101000" Nombre="PUBLICO EN GENERAL" UsoCFDI="S01" RegimenFiscalReceptor="616" DomicilioFiscalReceptor="26015"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="01010101" Cantidad="1" ClaveUnidad="H87" Unidad="Pieza" Descripcion="Venta de ticket #${inv?.order_id || 'N/A'}" ValorUnitario="${subtotal.toFixed(2)}" Importe="${subtotal.toFixed(2)}" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${subtotal.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${tax.toFixed(2)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
</cfdi:Comprobante>`;
  };

  const handleCopyXml = (inv: any) => {
    const xml = getXmlMockContent(inv);
    navigator.clipboard.writeText(xml);
    toast({ title: 'Copiado', description: 'XML del CFDI copiado al portapapeles.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Facturación Electrónica</h1>
          <p className="text-sm text-slate-500">Configure líneas de facturación y administre las facturas CFDI emitidas.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] border bg-slate-50 p-1 rounded-lg">
          <TabsTrigger value="lineas" className="rounded-md font-semibold text-xs py-2">
            Líneas de Facturación
          </TabsTrigger>
          <TabsTrigger value="historial" className="rounded-md font-semibold text-xs py-2">
            Historial de Facturas
          </TabsTrigger>
        </TabsList>

        {/* --- TABS CONTENT: LINEAS --- */}
        <TabsContent value="lineas" className="space-y-6 mt-4">
          <Card className="border border-slate-200">
            <CardHeader className="flex flex-row justify-between items-center py-4 border-b">
              <div>
                <CardTitle className="text-md font-bold text-slate-800">Líneas Configuradas</CardTitle>
                <CardDescription className="text-xs text-slate-500">Determine qué líneas disparan facturación electrónica.</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingLine(null);
                  setLineForm({ name: '', type: 'no_factura' });
                  setShowLineDialog(true);
                }}
                className="bg-[#0B4B32] hover:bg-[#073623] text-white text-xs h-9 px-4 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Nueva Línea
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingLineas ? (
                <div className="flex justify-center items-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : lineas.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No hay líneas de facturación creadas. Cree una para comenzar.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-bold text-slate-600 text-xs w-[40%]">Nombre de la Línea</TableHead>
                      <TableHead className="font-bold text-slate-600 text-xs w-[40%]">Comportamiento</TableHead>
                      <TableHead className="font-bold text-slate-600 text-xs w-[20%] text-right pr-6">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineas.map((line) => (
                      <TableRow key={line.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-800 text-sm">{line.name}</TableCell>
                        <TableCell>
                          {line.type === 'factura_electronica' ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                              Facturación Electrónica CFDI
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs">
                              No Factura (Solo Comprobante)
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6 space-x-2">
                          {line.type === 'factura_electronica' ? (
                            <Button
                              variant="ghost"
                              onClick={() => handleTestLine(line)}
                              disabled={testingTimbrar}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              title="Probar timbrado con esta línea"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              onClick={() => {
                                toast({
                                  title: 'Información',
                                  description: `La línea "${line.name}" está configurada como 'No Facturar'. No requiere timbrado.`,
                                });
                              }}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                              title="Línea sin facturación"
                            >
                              <Play className="w-3.5 h-3.5 opacity-40" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            onClick={() => openEditLine(line)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => handleDeleteLine(line.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TABS CONTENT: HISTORIAL --- */}
        <TabsContent value="historial" className="space-y-6 mt-4">
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-5 flex flex-col justify-between h-[100px]">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Facturado</span>
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-black text-emerald-700">{formatCurrency(totalFacturado)}</span>
                  <span className="text-xs text-slate-400">MXN</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-5 flex flex-col justify-between h-[100px]">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Facturas Timbradas</span>
                <span className="text-2xl font-black text-slate-800">{facturasTimbradasCount}</span>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-5 flex flex-col justify-between h-[100px]">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Canceladas</span>
                <span className="text-2xl font-black text-red-600">{facturasCanceladasCount}</span>
              </CardContent>
            </Card>
          </div>

          {/* History List */}
          <Card className="border border-slate-200">
            <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center py-4 border-b gap-4">
              <div>
                <CardTitle className="text-md font-bold text-slate-800">CFDIs Generados</CardTitle>
                <CardDescription className="text-xs text-slate-500">Historial completo de timbrados en Facturama Sandbox.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Button
                  onClick={handleTestTimbrar}
                  disabled={testingTimbrar}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-4 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingTimbrar ? 'animate-spin' : ''}`} />
                  {testingTimbrar ? 'Probando...' : 'Probar Factura (Test API)'}
                </Button>
                <Input
                  placeholder="Buscar por UUID o ID Pedido..."
                  value={searchInvoiceTerm}
                  onChange={(e) => setSearchInvoiceTerm(e.target.value)}
                  className="h-9 text-xs w-full sm:w-[220px]"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingHistorial ? (
                <div className="flex justify-center items-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No se encontraron facturas electrónicas timbradas.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-bold text-slate-600 text-xs">Folio Fiscal (UUID)</TableHead>
                      <TableHead className="font-bold text-slate-600 text-xs">ID Pedido</TableHead>
                      <TableHead className="font-bold text-slate-600 text-xs">Fecha / Hora</TableHead>
                      <TableHead className="font-bold text-slate-600 text-xs">Estatus</TableHead>
                      <TableHead className="font-bold text-slate-600 text-xs text-right">Total</TableHead>
                      <TableHead className="font-bold text-slate-600 text-xs text-right pr-6">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv, idx) => (
                      <TableRow key={inv.id || idx} className="hover:bg-slate-50/50">
                        <TableCell className="font-mono text-xs text-slate-800">{inv.uuid}</TableCell>
                        <TableCell className="text-slate-800 text-xs">{inv.order_id}</TableCell>
                        <TableCell className="text-slate-500 text-xs">
                          {new Date(inv.fecha).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            {inv.estatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-800 text-xs">
                          {formatCurrency(parseFloat(inv.total) || 0)}
                        </TableCell>
                        <TableCell className="text-right pr-6 space-x-1.5">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setShowDetailDialog(true);
                            }}
                            className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 inline-flex"
                          >
                            <Eye className="w-3.5 h-3.5" /> 👁
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setShowPdfDialog(true);
                            }}
                            className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 inline-flex"
                          >
                            <FileText className="w-3.5 h-3.5" /> PDF
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setShowXmlDialog(true);
                            }}
                            className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 inline-flex"
                          >
                            <FileCode className="w-3.5 h-3.5" /> XML
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- DIALOGS --- */}

      {/* Line Edit/Create Dialog */}
      <Dialog open={showLineDialog} onOpenChange={setShowLineDialog}>
        <DialogContent className="bg-white border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingLine ? 'Editar Línea' : 'Nueva Línea'}</DialogTitle>
            <DialogDescription>Configure el comportamiento de la línea de facturación.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="line-name" className="text-xs font-bold uppercase text-slate-700">
                Nombre de la Línea
              </Label>
              <Input
                id="line-name"
                value={lineForm.name}
                onChange={(e) => setLineForm({ ...lineForm, name: e.target.value })}
                placeholder="Ej. Línea Tarjeta Crédito, Venta General, etc."
                className="h-10 text-sm border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="line-type" className="text-xs font-bold uppercase text-slate-700">
                Tipo de Comportamiento
              </Label>
              <Select
                value={lineForm.type}
                onValueChange={(val) => setLineForm({ ...lineForm, type: val })}
              >
                <SelectTrigger id="line-type" className="h-10 text-sm border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border">
                  <SelectItem value="no_factura">No Factura (Solo comprobante de venta)</SelectItem>
                  <SelectItem value="factura_electronica">Facturación Electrónica (Stamps CFDI via Facturama)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setShowLineDialog(false)} className="h-10 text-xs">
              Cancelar
            </Button>
            <Button onClick={handleSaveLine} className="h-10 text-xs bg-[#0B4B32] hover:bg-[#073623] text-white">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-white border sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Detalle de Factura Electrónica</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-500 uppercase block mb-1">Folio Fiscal (UUID)</span>
                  <span className="font-mono text-slate-800 break-all bg-slate-50 p-2 rounded block border">
                    {selectedInvoice.uuid}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block mb-1">ID Pedido / Venta</span>
                  <span className="text-slate-800 p-2 rounded block bg-slate-50 border font-semibold">
                    {selectedInvoice.order_id}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-500 uppercase block mb-1">Fecha de Emisión</span>
                  <span className="text-slate-800 block p-1">{new Date(selectedInvoice.fecha).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block mb-1">Total Facturado</span>
                  <span className="text-emerald-700 block font-bold text-sm p-1">
                    {formatCurrency(parseFloat(selectedInvoice.total) || 0)}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block mb-1">Estatus</span>
                  <span className="text-slate-800 block p-1 font-semibold text-emerald-600">
                    {selectedInvoice.estatus}
                  </span>
                </div>
              </div>

              <div className="border-t pt-3">
                <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Emisor</span>
                <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded border space-y-1">
                  <p><strong>Razón Social:</strong> {emisorLegalName}</p>
                  <p><strong>RFC:</strong> {emisorRfc}</p>
                  <p><strong>Régimen Fiscal:</strong> {emisorRegimen}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="border-t pt-3 flex justify-end">
            <Button variant="outline" onClick={() => setShowDetailDialog(false)} className="h-10 text-xs">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF representation (Agency print sheet) */}
      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="bg-white border sm:max-w-[700px] overflow-y-auto max-h-[90vh] p-0">
          <div className="bg-slate-800 text-white p-3 flex justify-between items-center sticky top-0 z-50">
            <span className="text-sm font-bold">Representación Impresa Digital - CFDI 4.0</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => toast({ title: 'Impresión', description: 'Enviando copia al spooler...' })}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir
              </Button>
              <Button
                size="sm"
                onClick={() => toast({ title: 'Descarga', description: 'PDF descargado exitosamente.' })}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Guardar PDF
              </Button>
            </div>
          </div>

          {selectedInvoice && (
            <div className="p-6 bg-white space-y-6 text-[10px] text-slate-700 leading-relaxed max-w-[650px] mx-auto">
              {/* Header section */}
              <div className="grid grid-cols-2 gap-6 border-b pb-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-slate-900">{emisorLegalName}</h2>
                  <p><strong>RFC:</strong> {emisorRfc}</p>
                  <p><strong>Régimen Fiscal:</strong> {emisorRegimen}</p>
                  <p><strong>Domicilio:</strong> {emisorAddress}</p>
                </div>
                <div className="text-right space-y-1">
                  <h2 className="text-xs font-bold text-[#2563EB]">COMPROBANTE FISCAL DIGITAL (CFDI)</h2>
                  <p><strong>Folio Fiscal (UUID):</strong></p>
                  <p className="font-mono font-bold text-slate-800">{selectedInvoice.uuid}</p>
                  <p><strong>Fecha y Hora de Certificación:</strong></p>
                  <p className="text-slate-800">{new Date(selectedInvoice.fecha).toLocaleString()}</p>
                  <p><strong>Tipo de Comprobante:</strong> I - Ingreso</p>
                </div>
              </div>

              {/* Receptor section */}
              <div className="bg-slate-50 border p-3 rounded grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-slate-500 uppercase block mb-1">Datos del Receptor</span>
                  <p><strong>Nombre / Razón Social:</strong> PUBLICO EN GENERAL</p>
                  <p><strong>RFC:</strong> XAXX010101000</p>
                </div>
                <div className="space-y-1 mt-4">
                  <p><strong>Régimen Fiscal:</strong> 616 - Sin obligaciones fiscales</p>
                  <p><strong>Uso CFDI:</strong> S01 - Sin efectos fiscales</p>
                  <p><strong>Domicilio Fiscal (C.P.):</strong> 26015</p>
                </div>
              </div>

              {/* Concepts table */}
              <div className="border rounded overflow-hidden">
                <Table className="text-[10px]">
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b">
                      <TableHead className="font-bold text-xs h-8 text-slate-700">Clave SAT</TableHead>
                      <TableHead className="font-bold text-xs h-8 text-slate-700">Descripción</TableHead>
                      <TableHead className="font-bold text-xs h-8 text-slate-700 text-center">Cant.</TableHead>
                      <TableHead className="font-bold text-xs h-8 text-slate-700 text-right">Unitario</TableHead>
                      <TableHead className="font-bold text-xs h-8 text-slate-700 text-right pr-4">Importe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono">01010101</TableCell>
                      <TableCell className="font-medium">Venta de ticket #{selectedInvoice.order_id || 'N/A'}</TableCell>
                      <TableCell className="text-center">1</TableCell>
                      <TableCell className="text-right">{formatCurrency(parseFloat(selectedInvoice.total) / 1.16)}</TableCell>
                      <TableCell className="text-right pr-4">{formatCurrency(parseFloat(selectedInvoice.total) / 1.16)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Totals section */}
              <div className="flex justify-end pt-2">
                <div className="w-48 space-y-1.5 text-right font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal:</span>
                    <span>{formatCurrency(parseFloat(selectedInvoice.total) / 1.16)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">IVA Trasladado (16%):</span>
                    <span>{formatCurrency(parseFloat(selectedInvoice.total) - parseFloat(selectedInvoice.total) / 1.16)}</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-900 border-t pt-1">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(parseFloat(selectedInvoice.total) || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Digital stamps */}
              <div className="space-y-3 border-t pt-4 text-[8px] text-slate-400 font-mono">
                <div className="bg-slate-50 p-2 rounded border break-all leading-normal">
                  <p className="font-bold text-slate-500 uppercase mb-0.5">Sello Digital del Emisor</p>
                  fXF8+Xf7/6d4X9d8dFHD7FjG6H7JjH6H7G6H5GfF5F4d3s2a1S01S01S01S01S01S01S01sDGFD6G5H6JjH7G6F5D4S3S2==
                </div>
                <div className="bg-slate-50 p-2 rounded border break-all leading-normal">
                  <p className="font-bold text-slate-500 uppercase mb-0.5">Cadena Original del Complemento de Certificación Digital del SAT</p>
                  ||4.0|{selectedInvoice.uuid}|{new Date(selectedInvoice.fecha).toISOString()}|{emisorRfc}|fXF8+Xf7/6d4X9d8dFHD7FjG6H7JjH6H7G6H5GfF5F4d3s2a1S01sDGFD6==
                </div>
              </div>
            </div>
          )}
          <div className="border-t p-3 bg-slate-50 flex justify-end">
            <Button variant="outline" onClick={() => setShowPdfDialog(false)} className="h-9 text-xs">
              Cerrar Vista
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* XML Dialog */}
      <Dialog open={showXmlDialog} onOpenChange={setShowXmlDialog}>
        <DialogContent className="bg-white border sm:max-w-[650px] overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>CFDI 4.0 XML Generado</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-2">
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded text-[11px] font-mono overflow-auto border max-h-[400px] whitespace-pre">
                {getXmlMockContent(selectedInvoice)}
              </pre>
            </div>
          )}
          <DialogFooter className="border-t pt-3 flex justify-end gap-2">
            <Button
              onClick={() => handleCopyXml(selectedInvoice)}
              className="bg-[#0B4B32] hover:bg-[#073623] text-white text-xs h-10 px-4 flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" /> Copiar XML
            </Button>
            <Button variant="outline" onClick={() => setShowXmlDialog(false)} className="h-10 text-xs">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
