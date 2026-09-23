import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, BellRing, Bird, Boxes, Building2, CheckCircle2, ChevronRight, ClipboardCheck, Coins,
  Download, Factory, FileSpreadsheet, Landmark, PackageCheck, Pencil,
  Fish, Grape, Plane, PlugZap, Plus, ReceiptText, Scale, Search, Sprout,
  Trash2, Truck, Users, WalletCards, Wheat, Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveAgencyId, isItemForAgency } from '@/lib/agency-isolation';
import { formatCurrency } from '@/lib/currency';

type Field = { key: string; label: string; type?: 'text' | 'number' | 'date'; placeholder?: string };
type ERPRecord = Record<string, string> & { id: string; status: string; createdAt: string };
type ModuleDefinition = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ElementType;
  fields: Field[];
  statuses: string[];
  seed: Array<Record<string, string>>;
};

type WorkflowSection = { id: string; label: string; statuses?: string[] };
type WorkflowConfig = { entity: string; createLabel: string; help: string; sections: WorkflowSection[] };

const modules: ModuleDefinition[] = [
  {
    id: 'compras', title: 'Compras y MRP', shortTitle: 'Compras / MRP', icon: FileSpreadsheet,
    description: 'Requerimientos, órdenes de compra, proveedores y planificación de materiales.',
    fields: [{ key: 'order', label: 'Orden', placeholder: 'OC-2026-001' }, { key: 'supplier', label: 'Proveedor' }, { key: 'material', label: 'Material' }, { key: 'quantity', label: 'Cantidad', type: 'number' }, { key: 'amount', label: 'Importe', type: 'number' }, { key: 'date', label: 'Entrega', type: 'date' }],
    statuses: ['Borrador', 'Solicitada', 'Aprobada', 'Recibida'],
    seed: [{ order: 'OC-2026-104', supplier: 'Distribuidora Central', material: 'Materia prima A', quantity: '240', amount: '18500', date: '2026-09-12', status: 'Aprobada' }],
  },
  {
    id: 'proveedores', title: 'Directorio de proveedores', shortTitle: 'Proveedores', icon: Building2,
    description: 'Datos fiscales, contactos, condiciones de pago, cupos de crédito y estado comercial.',
    fields: [{ key: 'supplierCode', label: 'Código', placeholder: 'PRV-001' }, { key: 'name', label: 'Razón social' }, { key: 'taxId', label: 'NIT / RFC / CUIT' }, { key: 'contact', label: 'Contacto' }, { key: 'phone', label: 'Teléfono' }, { key: 'email', label: 'Correo' }, { key: 'paymentTerms', label: 'Condición de pago', placeholder: '30 días' }, { key: 'creditLimit', label: 'Cupo de crédito', type: 'number' }],
    statuses: ['Activo', 'Bloqueado', 'Inactivo'],
    seed: [{ supplierCode: 'PRV-001', name: 'Distribuidora Central', taxId: '900123456-7', contact: 'María Gómez', phone: '+57 300 555 0101', email: 'compras@distribuidoracentral.co', paymentTerms: '30 días', creditLimit: '50000000', status: 'Activo' }],
  },
  {
    id: 'almacenes', title: 'Gestión de almacenes', shortTitle: 'Almacenes', icon: Boxes,
    description: 'Movimientos, depósitos, existencias, lotes y trazabilidad de inventario.',
    fields: [{ key: 'movement', label: 'Movimiento', placeholder: 'MOV-001' }, { key: 'product', label: 'Producto' }, { key: 'warehouse', label: 'Depósito' }, { key: 'lot', label: 'Lote' }, { key: 'quantity', label: 'Cantidad', type: 'number' }, { key: 'date', label: 'Fecha', type: 'date' }],
    statuses: ['Pendiente', 'Confirmado', 'En tránsito', 'Completado'],
    seed: [{ movement: 'MOV-884', product: 'Producto terminado', warehouse: 'Depósito principal', lot: 'L-0905', quantity: '86', date: '2026-09-05', status: 'Confirmado' }],
  },
  {
    id: 'produccion', title: 'Producción y costos', shortTitle: 'Producción', icon: Factory,
    description: 'Órdenes de fabricación, consumos, rendimiento y costos por lote.',
    fields: [{ key: 'order', label: 'Orden', placeholder: 'OP-001' }, { key: 'product', label: 'Producto' }, { key: 'planned', label: 'Planificado', type: 'number' }, { key: 'produced', label: 'Producido', type: 'number' }, { key: 'cost', label: 'Costo', type: 'number' }, { key: 'date', label: 'Fecha', type: 'date' }],
    statuses: ['Planificada', 'En proceso', 'Pausada', 'Finalizada'],
    seed: [{ order: 'OP-227', product: 'Línea premium', planned: '500', produced: '320', cost: '27600', date: '2026-09-05', status: 'En proceso' }],
  },
  {
    id: 'calidad', title: 'Gestión de calidad', shortTitle: 'Calidad', icon: ClipboardCheck,
    description: 'Inspecciones, parámetros, no conformidades y liberación de lotes.',
    fields: [{ key: 'control', label: 'Control', placeholder: 'CAL-001' }, { key: 'batch', label: 'Lote' }, { key: 'parameter', label: 'Parámetro' }, { key: 'result', label: 'Resultado' }, { key: 'responsible', label: 'Responsable' }, { key: 'date', label: 'Fecha', type: 'date' }],
    statuses: ['Pendiente', 'Aprobado', 'Observado', 'Rechazado'],
    seed: [{ control: 'CAL-048', batch: 'L-0905', parameter: 'Control final', result: 'Conforme', responsible: 'Ana Torres', date: '2026-09-05', status: 'Aprobado' }],
  },
  {
    id: 'mantenimiento', title: 'Mantenimiento', shortTitle: 'Mantenimiento', icon: Wrench,
    description: 'Activos, mantenimiento preventivo, correctivo y órdenes de servicio.',
    fields: [{ key: 'order', label: 'Orden', placeholder: 'MAN-001' }, { key: 'asset', label: 'Activo' }, { key: 'task', label: 'Trabajo' }, { key: 'responsible', label: 'Responsable' }, { key: 'cost', label: 'Costo', type: 'number' }, { key: 'date', label: 'Vencimiento', type: 'date' }],
    statuses: ['Programado', 'En curso', 'Vencido', 'Finalizado'],
    seed: [{ order: 'MAN-031', asset: 'Envasadora 02', task: 'Servicio preventivo', responsible: 'Equipo técnico', cost: '3200', date: '2026-09-10', status: 'Programado' }],
  },
  {
    id: 'logistica', title: 'Comercialización y distribución', shortTitle: 'Distribución', icon: Truck,
    description: 'Preparación, despacho, transporte, remitos y entregas a clientes.',
    fields: [{ key: 'shipment', label: 'Envío', placeholder: 'ENV-001' }, { key: 'customer', label: 'Cliente' }, { key: 'destination', label: 'Destino' }, { key: 'carrier', label: 'Transporte' }, { key: 'amount', label: 'Valor', type: 'number' }, { key: 'date', label: 'Entrega', type: 'date' }],
    statuses: ['Preparación', 'Despachado', 'En ruta', 'Entregado'],
    seed: [{ shipment: 'ENV-193', customer: 'Comercial Norte', destination: 'Bogotá', carrier: 'Ruta Express', amount: '12400', date: '2026-09-06', status: 'En ruta' }],
  },
  {
    id: 'comercio-exterior', title: 'Importaciones y exportaciones', shortTitle: 'Comercio exterior', icon: Plane,
    description: 'Operaciones internacionales, documentación, Incoterms y seguimiento aduanero.',
    fields: [{ key: 'operation', label: 'Operación', placeholder: 'COMEX-001' }, { key: 'partner', label: 'Cliente / proveedor' }, { key: 'country', label: 'País' }, { key: 'incoterm', label: 'Incoterm' }, { key: 'amount', label: 'Importe', type: 'number' }, { key: 'date', label: 'Arribo', type: 'date' }],
    statuses: ['Documentación', 'Aduana', 'En tránsito', 'Liberada'],
    seed: [{ operation: 'COMEX-018', partner: 'Global Supplies', country: 'México', incoterm: 'CIF', amount: '46800', date: '2026-09-22', status: 'En tránsito' }],
  },
  {
    id: 'consignaciones', title: 'Consignaciones', shortTitle: 'Consignaciones', icon: PackageCheck,
    description: 'Mercadería de terceros, stock consignado, liquidaciones y devoluciones.',
    fields: [{ key: 'reference', label: 'Referencia', placeholder: 'CON-001' }, { key: 'owner', label: 'Propietario' }, { key: 'product', label: 'Producto' }, { key: 'location', label: 'Ubicación' }, { key: 'quantity', label: 'Cantidad', type: 'number' }, { key: 'date', label: 'Liquidación', type: 'date' }],
    statuses: ['Recibida', 'Disponible', 'Liquidación', 'Devuelta'],
    seed: [{ reference: 'CON-012', owner: 'Socio Mayorista', product: 'Lote especial', location: 'Sucursal Centro', quantity: '45', date: '2026-09-30', status: 'Disponible' }],
  },
  {
    id: 'tesoreria', title: 'Tesorería y fondos', shortTitle: 'Tesorería', icon: WalletCards,
    description: 'Cobranzas, pagos, vencimientos, cuentas corrientes y flujo de fondos.',
    fields: [{ key: 'reference', label: 'Referencia', placeholder: 'TES-001' }, { key: 'counterparty', label: 'Contraparte' }, { key: 'concept', label: 'Concepto' }, { key: 'account', label: 'Cuenta' }, { key: 'amount', label: 'Importe', type: 'number' }, { key: 'date', label: 'Vencimiento', type: 'date' }],
    statuses: ['Pendiente', 'Programado', 'Cobrado', 'Pagado'],
    seed: [{ reference: 'TES-441', counterparty: 'Cliente corporativo', concept: 'Cobranza factura', account: 'Banco principal', amount: '39200', date: '2026-09-08', status: 'Programado' }],
  },
  {
    id: 'activos', title: 'Activos fijos', shortTitle: 'Activos', icon: Landmark,
    description: 'Altas, ubicación, valuación, vida útil y control patrimonial.',
    fields: [{ key: 'asset', label: 'Activo', placeholder: 'AF-001' }, { key: 'name', label: 'Descripción' }, { key: 'category', label: 'Categoría' }, { key: 'location', label: 'Ubicación' }, { key: 'value', label: 'Valor', type: 'number' }, { key: 'date', label: 'Alta', type: 'date' }],
    statuses: ['Activo', 'Mantenimiento', 'Amortizado', 'Baja'],
    seed: [{ asset: 'AF-092', name: 'Servidor central', category: 'Tecnología', location: 'Casa matriz', value: '15800', date: '2026-03-15', status: 'Activo' }],
  },
  {
    id: 'presupuestos', title: 'Presupuestos y control', shortTitle: 'Presupuestos', icon: Coins,
    description: 'Plan anual, ejecución por área, desvíos y aprobaciones presupuestarias.',
    fields: [{ key: 'budget', label: 'Presupuesto', placeholder: 'PRE-001' }, { key: 'area', label: 'Área' }, { key: 'concept', label: 'Concepto' }, { key: 'planned', label: 'Planificado', type: 'number' }, { key: 'spent', label: 'Ejecutado', type: 'number' }, { key: 'date', label: 'Período', type: 'date' }],
    statuses: ['Borrador', 'Aprobado', 'En ejecución', 'Cerrado'],
    seed: [{ budget: 'PRE-2026-09', area: 'Operaciones', concept: 'Insumos', planned: '80000', spent: '52600', date: '2026-09-01', status: 'En ejecución' }],
  },
  {
    id: 'rrhh', title: 'Recursos humanos', shortTitle: 'RR. HH.', icon: Users,
    description: 'Legajos, cargos, áreas, compensación y estado de colaboradores.',
    fields: [{ key: 'employee', label: 'Legajo', placeholder: 'EMP-001' }, { key: 'name', label: 'Colaborador' }, { key: 'role', label: 'Cargo' }, { key: 'area', label: 'Área' }, { key: 'salary', label: 'Salario', type: 'number' }, { key: 'date', label: 'Ingreso', type: 'date' }],
    statuses: ['Activo', 'Licencia', 'Vacaciones', 'Inactivo'],
    seed: [{ employee: 'EMP-047', name: 'Laura Méndez', role: 'Analista de operaciones', area: 'Operaciones', salary: '4200', date: '2025-11-03', status: 'Activo' }],
  },
  {
    id: 'multiempresa', title: 'Control multiempresa', shortTitle: 'Multiempresa', icon: Building2,
    description: 'Compañías, sucursales, monedas y consolidación de la operación.',
    fields: [{ key: 'company', label: 'Empresa', placeholder: 'EMPRESA-01' }, { key: 'taxId', label: 'Identificación fiscal' }, { key: 'location', label: 'Sede' }, { key: 'currency', label: 'Moneda' }, { key: 'users', label: 'Usuarios', type: 'number' }, { key: 'date', label: 'Alta', type: 'date' }],
    statuses: ['Activa', 'Implementación', 'Suspendida', 'Archivada'],
    seed: [{ company: 'Empresa principal', taxId: 'RFC genérico', location: 'México', currency: 'MXN', users: '12', date: '2026-01-10', status: 'Activa' }],
  },
  {
    id: 'industria', title: 'Solución por industria', shortTitle: 'Solución por industria', icon: Sprout,
    description: 'Configura en un solo lugar la vertical agrícola, vinícola, avícola, pesquera o cerealera.',
    fields: [{ key: 'operation', label: 'Operación', placeholder: 'IND-001' }, { key: 'industry', label: 'Industria' }, { key: 'stage', label: 'Etapa / proceso' }, { key: 'lot', label: 'Lote / unidad' }, { key: 'quantity', label: 'Cantidad', type: 'number' }, { key: 'date', label: 'Fecha de control', type: 'date' }],
    statuses: ['Planificada', 'En proceso', 'Control de calidad', 'Finalizada'],
    seed: [{ operation: 'IND-001', industry: 'Configurable', stage: 'Proceso productivo', lot: 'Lote inicial', quantity: '1', date: '2026-09-05', status: 'Planificada' }],
  },
  {
    id: 'facturacion-electronica', title: 'Facturación electrónica', shortTitle: 'Facturación electrónica', icon: ReceiptText,
    description: 'Comprobantes electrónicos, autorización fiscal, notas de crédito y seguimiento de emisión.',
    fields: [{ key: 'voucher', label: 'Comprobante', placeholder: 'FAC-0001' }, { key: 'customer', label: 'Cliente' }, { key: 'taxId', label: 'Identificación fiscal' }, { key: 'type', label: 'Tipo' }, { key: 'amount', label: 'Total', type: 'number' }, { key: 'date', label: 'Emisión', type: 'date' }],
    statuses: ['Borrador', 'Pendiente fiscal', 'Autorizada', 'Anulada'],
    seed: [{ voucher: 'FAC-2026-0182', customer: 'Comercial Norte', taxId: '900123456', type: 'Factura de venta', amount: '18500', date: '2026-09-05', status: 'Autorizada' }],
  },
  {
    id: 'impuestos', title: 'Control impositivo', shortTitle: 'Impuestos', icon: Scale,
    description: 'Obligaciones fiscales, vencimientos, jurisdicciones, retenciones y presentaciones.',
    fields: [{ key: 'obligation', label: 'Obligación', placeholder: 'IMP-001' }, { key: 'tax', label: 'Impuesto' }, { key: 'jurisdiction', label: 'Jurisdicción' }, { key: 'period', label: 'Período' }, { key: 'amount', label: 'Importe', type: 'number' }, { key: 'date', label: 'Vencimiento', type: 'date' }],
    statuses: ['Pendiente', 'Preparada', 'Presentada', 'Pagada'],
    seed: [{ obligation: 'IMP-2026-09', tax: 'IVA / Ventas', jurisdiction: 'Nacional', period: '2026-08', amount: '12800', date: '2026-09-18', status: 'Preparada' }],
  },
  {
    id: 'agricola', title: 'Gestión agrícola', shortTitle: 'Agrícola', icon: Sprout,
    description: 'Campañas, lotes, cultivos, labores, insumos, cosecha y trazabilidad productiva.',
    fields: [{ key: 'campaign', label: 'Campaña', placeholder: 'AGR-2026' }, { key: 'field', label: 'Campo / lote' }, { key: 'crop', label: 'Cultivo' }, { key: 'hectares', label: 'Hectáreas', type: 'number' }, { key: 'yield', label: 'Rendimiento', type: 'number' }, { key: 'date', label: 'Cosecha', type: 'date' }],
    statuses: ['Planificada', 'Siembra', 'En desarrollo', 'Cosechada'],
    seed: [{ campaign: 'AGR-26-01', field: 'Lote Norte', crop: 'Maíz', hectares: '120', yield: '8.4', date: '2026-10-20', status: 'En desarrollo' }],
  },
  {
    id: 'vinicola', title: 'Gestión vinícola', shortTitle: 'Vinícola', icon: Grape,
    description: 'Vendimia, elaboración, vasijas, cortes, crianza, embotellado y trazabilidad por lote.',
    fields: [{ key: 'batch', label: 'Partida', placeholder: 'VIN-001' }, { key: 'variety', label: 'Variedad' }, { key: 'vessel', label: 'Vasija' }, { key: 'liters', label: 'Litros', type: 'number' }, { key: 'vintage', label: 'Cosecha' }, { key: 'date', label: 'Próximo control', type: 'date' }],
    statuses: ['Recepción', 'Elaboración', 'Crianza', 'Liberada'],
    seed: [{ batch: 'VIN-MAL-026', variety: 'Malbec', vessel: 'Tanque T-14', liters: '18500', vintage: '2026', date: '2026-09-12', status: 'Elaboración' }],
  },
  {
    id: 'avicola', title: 'Gestión avícola', shortTitle: 'Avícola', icon: Bird,
    description: 'Granjas, alimento, incubación, postura, frigorífico y trazabilidad sanitaria.',
    fields: [{ key: 'flock', label: 'Lote / parvada', placeholder: 'AVI-001' }, { key: 'farm', label: 'Granja' }, { key: 'stage', label: 'Etapa' }, { key: 'birds', label: 'Aves', type: 'number' }, { key: 'mortality', label: 'Mortalidad %', type: 'number' }, { key: 'date', label: 'Control', type: 'date' }],
    statuses: ['Incubación', 'Cría', 'Producción', 'Cerrado'],
    seed: [{ flock: 'AVI-0926-A', farm: 'Granja 2', stage: 'Postura', birds: '12500', mortality: '1.2', date: '2026-09-06', status: 'Producción' }],
  },
  {
    id: 'pesquera', title: 'Gestión pesquera', shortTitle: 'Pesquera', icon: Fish,
    description: 'Captura, desembarque, procesamiento, cámaras, calidad y comercialización.',
    fields: [{ key: 'trip', label: 'Marea / viaje', placeholder: 'PES-001' }, { key: 'vessel', label: 'Embarcación' }, { key: 'species', label: 'Especie' }, { key: 'weight', label: 'Peso kg', type: 'number' }, { key: 'destination', label: 'Destino' }, { key: 'date', label: 'Desembarque', type: 'date' }],
    statuses: ['Planificada', 'En captura', 'Desembarcada', 'Procesada'],
    seed: [{ trip: 'PES-044', vessel: 'Mar Azul', species: 'Merluza', weight: '8400', destination: 'Planta 1', date: '2026-09-07', status: 'En captura' }],
  },
  {
    id: 'cereales', title: 'Gestión de cereales', shortTitle: 'Cereales', icon: Wheat,
    description: 'Recepción, análisis, acopio, acondicionamiento, contratos y cartas de porte.',
    fields: [{ key: 'ticket', label: 'Ticket', placeholder: 'CER-001' }, { key: 'grain', label: 'Cereal' }, { key: 'producer', label: 'Productor' }, { key: 'tons', label: 'Toneladas', type: 'number' }, { key: 'silo', label: 'Silo' }, { key: 'date', label: 'Recepción', type: 'date' }],
    statuses: ['En tránsito', 'Recibido', 'Analizado', 'Liquidado'],
    seed: [{ ticket: 'CER-1108', grain: 'Soja', producer: 'Estancia Central', tons: '32', silo: 'S-04', date: '2026-09-05', status: 'Analizado' }],
  },
  {
    id: 'alertas', title: 'Alertas inteligentes', shortTitle: 'Alertas inteligentes', icon: BellRing,
    description: 'Reglas automáticas por evento, destinatario, canal y prioridad operativa.',
    fields: [{ key: 'rule', label: 'Regla', placeholder: 'ALT-001' }, { key: 'event', label: 'Evento' }, { key: 'recipient', label: 'Destinatario' }, { key: 'channel', label: 'Canal' }, { key: 'priority', label: 'Prioridad' }, { key: 'date', label: 'Próxima ejecución', type: 'date' }],
    statuses: ['Activa', 'Pausada', 'En prueba', 'Archivada'],
    seed: [{ rule: 'ALT-STOCK-01', event: 'Stock bajo mínimo', recipient: 'Compras', channel: 'Email', priority: 'Alta', date: '2026-09-05', status: 'Activa' }],
  },
  {
    id: 'integraciones', title: 'Integraciones y webservices', shortTitle: 'Integraciones', icon: PlugZap,
    description: 'Conectores fiscales, e-commerce, CRM, IoT, banca, POS, WMS, ERP y BI.',
    fields: [{ key: 'connector', label: 'Conector', placeholder: 'INT-001' }, { key: 'provider', label: 'Proveedor / sistema' }, { key: 'category', label: 'Categoría' }, { key: 'endpoint', label: 'Entorno / endpoint' }, { key: 'events', label: 'Eventos procesados', type: 'number' }, { key: 'date', label: 'Última sincronización', type: 'date' }],
    statuses: ['Configuración', 'Prueba', 'Conectada', 'Con error'],
    seed: [
      { connector: 'INT-FISC-01', provider: 'ARCA facturación', category: 'Fiscal', endpoint: 'Configurar credenciales', events: '0', date: '2026-09-05', status: 'Configuración' },
      { connector: 'INT-REM-01', provider: 'AGIP / ARBA', category: 'Remito electrónico', endpoint: 'Configurar credenciales', events: '0', date: '2026-09-05', status: 'Configuración' },
      { connector: 'INT-SEN-01', provider: 'SENASA', category: 'Certificados', endpoint: 'Configurar credenciales', events: '0', date: '2026-09-05', status: 'Configuración' },
      { connector: 'INT-VEN-01', provider: 'Ventanilla electrónica ARCA', category: 'Fiscal', endpoint: 'Configurar credenciales', events: '0', date: '2026-09-05', status: 'Configuración' },
      { connector: 'INT-CP-01', provider: 'Carta de porte electrónica', category: 'Transporte', endpoint: 'Configurar credenciales', events: '0', date: '2026-09-05', status: 'Configuración' },
      { connector: 'INT-ECOM-01', provider: 'Tienda online / Marketplace', category: 'E-commerce', endpoint: 'Producción', events: '1284', date: '2026-09-05', status: 'Conectada' },
      { connector: 'INT-CRM-01', provider: 'CRM externo', category: 'CRM', endpoint: 'Configurar API', events: '0', date: '2026-09-05', status: 'Configuración' },
      { connector: 'INT-IOT-01', provider: 'Hardware de producción', category: 'IoT', endpoint: 'Configurar dispositivo', events: '0', date: '2026-09-05', status: 'Configuración' },
      { connector: 'INT-BANK-01', provider: 'Interbanking', category: 'Finanzas', endpoint: 'Configurar banco', events: '0', date: '2026-09-05', status: 'Configuración' },
      { connector: 'INT-POS-01', provider: 'Punto de venta', category: 'POS', endpoint: 'Producción', events: '342', date: '2026-09-05', status: 'Conectada' },
      { connector: 'INT-WMS-01', provider: 'Block WMS', category: 'Almacenes', endpoint: 'Configurar API', events: '0', date: '2026-09-05', status: 'Configuración' },
      { connector: 'INT-BI-01', provider: 'Power BI / Tableau / Qlik', category: 'Business Intelligence', endpoint: 'Configurar dataset', events: '0', date: '2026-09-05', status: 'Configuración' },
      { connector: 'INT-ERP-01', provider: 'SAP / ERP externo', category: 'Interoperabilidad', endpoint: 'Configurar webservice', events: '0', date: '2026-09-05', status: 'Configuración' },
      { connector: 'INT-REST-01', provider: 'Sistema gastronómico', category: 'Restaurantes', endpoint: 'Configurar API', events: '0', date: '2026-09-05', status: 'Configuración' },
    ],
  },
];

const legacyVerticalIds = new Set([
  'agricola', 'vinicola', 'avicola', 'pesquera', 'cereales', 'integraciones',
  'facturacion-electronica', 'tesoreria', 'impuestos', 'presupuestos', 'activos',
]);
const hiddenModuleIds = new Set([
  ...legacyVerticalIds,
  'produccion', 'calidad', 'comercio-exterior', 'consignaciones', 'industria',
]);
const availableModules = modules.filter((module) => !hiddenModuleIds.has(module.id));

const moduleGroups = [
  { label: 'Operaciones', ids: ['compras', 'proveedores', 'almacenes', 'logistica', 'mantenimiento'] },
  { label: 'Gestión avanzada', ids: ['rrhh', 'multiempresa'] },
  { label: 'Automatización', ids: ['alertas'] },
];

const workflowByModule: Record<string, WorkflowConfig> = {
  compras: { entity: 'orden de compra', createLabel: 'Nueva orden', help: 'Registra la necesidad, solicita aprobación y confirma la recepción del proveedor.', sections: [{ id: 'all', label: 'Panel de compras' }, { id: 'requests', label: 'Solicitudes', statuses: ['Borrador', 'Solicitada'] }, { id: 'orders', label: 'Órdenes aprobadas', statuses: ['Aprobada'] }, { id: 'receipts', label: 'Recepciones', statuses: ['Recibida'] }] },
  proveedores: { entity: 'proveedor', createLabel: 'Nuevo proveedor', help: 'Mantén una ficha única por proveedor y bloquea temporalmente aquellos que no deban utilizarse en nuevas compras.', sections: [{ id: 'all', label: 'Todos' }, { id: 'active', label: 'Activos', statuses: ['Activo'] }, { id: 'blocked', label: 'Bloqueados', statuses: ['Bloqueado'] }, { id: 'inactive', label: 'Inactivos', statuses: ['Inactivo'] }] },
  almacenes: { entity: 'movimiento de inventario', createLabel: 'Nuevo movimiento', help: 'Controla entradas, salidas, transferencias, lotes y confirmación física.', sections: [{ id: 'all', label: 'Existencias' }, { id: 'pending', label: 'Pendientes', statuses: ['Pendiente'] }, { id: 'transfers', label: 'Transferencias', statuses: ['En tránsito'] }, { id: 'history', label: 'Historial de movimientos', statuses: ['Confirmado', 'Completado'] }] },
  produccion: { entity: 'orden de producción', createLabel: 'Nueva orden de producción', help: 'Planifica cantidades, registra avance y controla el costo real del lote.', sections: [{ id: 'all', label: 'Plan maestro' }, { id: 'planned', label: 'Planificadas', statuses: ['Planificada'] }, { id: 'running', label: 'En planta', statuses: ['En proceso', 'Pausada'] }, { id: 'finished', label: 'Producción terminada', statuses: ['Finalizada'] }] },
  calidad: { entity: 'control de calidad', createLabel: 'Nueva inspección', help: 'Registra controles por lote, evidencia resultados y decide su liberación.', sections: [{ id: 'all', label: 'Tablero de calidad' }, { id: 'pending', label: 'Por inspeccionar', statuses: ['Pendiente'] }, { id: 'observed', label: 'No conformidades', statuses: ['Observado', 'Rechazado'] }, { id: 'released', label: 'Lotes liberados', statuses: ['Aprobado'] }] },
  mantenimiento: { entity: 'orden de mantenimiento', createLabel: 'Nueva orden de trabajo', help: 'Programa tareas preventivas y sigue correctivos, vencimientos y costos.', sections: [{ id: 'all', label: 'Plan de mantenimiento' }, { id: 'scheduled', label: 'Programadas', statuses: ['Programado'] }, { id: 'active', label: 'En ejecución', statuses: ['En curso', 'Vencido'] }, { id: 'history', label: 'Historial técnico', statuses: ['Finalizado'] }] },
  logistica: { entity: 'despacho', createLabel: 'Nuevo despacho', help: 'Prepara pedidos, emite el despacho y controla transporte y entrega.', sections: [{ id: 'all', label: 'Panel logístico' }, { id: 'prepare', label: 'Preparación', statuses: ['Preparación'] }, { id: 'route', label: 'Despachados y en ruta', statuses: ['Despachado', 'En ruta'] }, { id: 'delivered', label: 'Entregas', statuses: ['Entregado'] }] },
  'comercio-exterior': { entity: 'operación de comercio exterior', createLabel: 'Nueva operación COMEX', help: 'Centraliza documentación, aduana, Incoterm, tránsito y liberación.', sections: [{ id: 'all', label: 'Operaciones' }, { id: 'docs', label: 'Documentación', statuses: ['Documentación'] }, { id: 'customs', label: 'Aduana', statuses: ['Aduana'] }, { id: 'transit', label: 'Tránsito y liberación', statuses: ['En tránsito', 'Liberada'] }] },
  consignaciones: { entity: 'consignación', createLabel: 'Nueva consignación', help: 'Controla mercadería de terceros, disponibilidad, liquidación y devolución.', sections: [{ id: 'all', label: 'Stock consignado' }, { id: 'available', label: 'Disponible', statuses: ['Recibida', 'Disponible'] }, { id: 'settlement', label: 'Por liquidar', statuses: ['Liquidación'] }, { id: 'returns', label: 'Devoluciones', statuses: ['Devuelta'] }] },
  rrhh: { entity: 'colaborador', createLabel: 'Nuevo colaborador', help: 'Administra legajos, áreas, cargos, compensación y novedades laborales.', sections: [{ id: 'all', label: 'Directorio' }, { id: 'active', label: 'Dotación activa', statuses: ['Activo'] }, { id: 'absence', label: 'Licencias y vacaciones', statuses: ['Licencia', 'Vacaciones'] }, { id: 'inactive', label: 'Bajas', statuses: ['Inactivo'] }] },
  multiempresa: { entity: 'empresa', createLabel: 'Nueva empresa', help: 'Define sociedades, sedes, moneda y disponibilidad dentro del grupo.', sections: [{ id: 'all', label: 'Consolidado' }, { id: 'active', label: 'Empresas activas', statuses: ['Activa'] }, { id: 'implementation', label: 'Implementación', statuses: ['Implementación'] }, { id: 'inactive', label: 'Suspendidas', statuses: ['Suspendida', 'Archivada'] }] },
  industria: { entity: 'operación industrial', createLabel: 'Nueva operación', help: 'Selecciona la industria dentro de cada registro y conserva un único flujo configurable.', sections: [{ id: 'all', label: 'Operación general' }, { id: 'planned', label: 'Planificación', statuses: ['Planificada'] }, { id: 'process', label: 'Ejecución', statuses: ['En proceso', 'Control de calidad'] }, { id: 'closed', label: 'Trazabilidad final', statuses: ['Finalizada'] }] },
  alertas: { entity: 'regla automática', createLabel: 'Nueva regla de alerta', help: 'Define el evento, responsable, canal y prioridad de cada notificación.', sections: [{ id: 'all', label: 'Reglas' }, { id: 'active', label: 'Activas', statuses: ['Activa'] }, { id: 'testing', label: 'En prueba', statuses: ['En prueba'] }, { id: 'paused', label: 'Pausadas', statuses: ['Pausada', 'Archivada'] }] },
};

const STORAGE_KEY = 'merco-erp-records-v1';
const moneyFields = new Set(['amount', 'cost', 'value', 'planned', 'spent', 'salary', 'creditLimit']);
const tableName = (moduleId: string) => `erp_${moduleId.replace(/-/g, '_')}`;

const makeInitialData = () => Object.fromEntries(availableModules.map((module) => [
  module.id,
  module.seed.map((record, index) => {
    const businessKey = record[module.fields[0].key] || String(index + 1);
    return {
      ...record,
      id: `${module.id}-${businessKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      createdAt: new Date().toISOString(),
    };
  }),
]));

const loadData = (storageKey: string): Record<string, ERPRecord[]> => {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? { ...makeInitialData(), ...JSON.parse(saved) } : makeInitialData();
  } catch {
    return makeInitialData();
  }
};

const formatValue = (key: string, value: string) => {
  if (moneyFields.has(key) && value) {
    return formatCurrency(Number(value));
  }
  return value || '—';
};

const statusClass = (status: string) => {
  const positive = ['Aprobada', 'Recibida', 'Confirmado', 'Completado', 'Finalizada', 'Aprobado', 'Finalizado', 'Entregado', 'Liberada', 'Disponible', 'Cobrado', 'Pagado', 'Activo', 'Activa', 'Cerrado'];
  const negative = ['Rechazado', 'Vencido', 'Suspendida', 'Baja', 'Archivada', 'Bloqueado', 'Inactivo'];
  if (positive.includes(status)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (negative.includes(status)) return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const terminalStatuses: Record<string, string[]> = {
  compras: ['Recibida'], proveedores: ['Activo', 'Bloqueado', 'Inactivo'], almacenes: ['Completado'], produccion: ['Finalizada'], calidad: ['Aprobado', 'Rechazado'],
  mantenimiento: ['Finalizado'], logistica: ['Entregado'], 'comercio-exterior': ['Liberada'], consignaciones: ['Devuelta'],
  rrhh: ['Inactivo'], multiempresa: ['Archivada'], industria: ['Finalizada'], alertas: ['Archivada'],
};

const erpModuleThemes: Record<string, { gradient: string; category: string }> = {
  compras: { gradient: 'from-blue-600 to-indigo-700', category: 'Abastecimiento' },
  proveedores: { gradient: 'from-teal-500 to-emerald-700', category: 'Abastecimiento' },
  almacenes: { gradient: 'from-cyan-600 to-blue-700', category: 'Inventario' },
  produccion: { gradient: 'from-slate-600 to-slate-800', category: 'Operaciones' },
  calidad: { gradient: 'from-emerald-500 to-teal-700', category: 'Operaciones' },
  mantenimiento: { gradient: 'from-amber-500 to-orange-700', category: 'Operaciones' },
  logistica: { gradient: 'from-violet-500 to-indigo-700', category: 'Distribución' },
  'comercio-exterior': { gradient: 'from-sky-500 to-cyan-700', category: 'Comercio' },
  consignaciones: { gradient: 'from-fuchsia-500 to-purple-700', category: 'Comercio' },
  rrhh: { gradient: 'from-rose-500 to-red-700', category: 'Organización' },
  multiempresa: { gradient: 'from-teal-500 to-emerald-700', category: 'Organización' },
  industria: { gradient: 'from-lime-500 to-green-700', category: 'Industria' },
  alertas: { gradient: 'from-orange-500 to-rose-600', category: 'Automatización' },
};

interface ERPManagerProps {
  onExit?: () => void;
}

export const ERPManager: React.FC<ERPManagerProps> = ({ onExit }) => {
  const { user } = useAuth();
  const activeAgencyId = useMemo(() => getActiveAgencyId(user), [user]);
  const storageKey = `merco-erp-records-v1-${activeAgencyId || '2'}`;

  const [activeModuleId, setActiveModuleId] = useState('compras');
  const [showApps, setShowApps] = useState(true);
  const [appSearch, setAppSearch] = useState('');
  const [recordsByModule, setRecordsByModule] = useState<Record<string, ERPRecord[]>>(() => loadData(storageKey));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ERPRecord | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState(true);
  const [workflowSection, setWorkflowSection] = useState('all');
  const [headerNavigationTarget, setHeaderNavigationTarget] = useState<HTMLElement | null>(null);

  const activeModule = availableModules.find((module) => module.id === activeModuleId) || availableModules[0];
  const ActiveModuleIcon = activeModule.icon;
  const activeTheme = erpModuleThemes[activeModule.id] || { gradient: 'from-slate-500 to-slate-700', category: 'ERP' };
  const workflow = workflowByModule[activeModule.id];
  const activeWorkflowSection = workflow?.sections.find((section) => section.id === workflowSection);
  const records = useMemo(() => recordsByModule[activeModule.id] || [], [recordsByModule, activeModule.id]);
  const filteredModules = useMemo(() => {
    const query = appSearch.trim().toLowerCase();
    return availableModules.filter((module) => !query ||
      module.title.toLowerCase().includes(query) ||
      module.description.toLowerCase().includes(query)
    );
  }, [appSearch]);
  const filteredRecords = useMemo(() => records.filter((record) => {
    const matchesSearch = !search || Object.values(record).some((value) => String(value).toLowerCase().includes(search.toLowerCase()));
    const matchesSection = !activeWorkflowSection?.statuses || activeWorkflowSection.statuses.includes(record.status);
    return matchesSearch && matchesSection && (statusFilter === 'all' || record.status === statusFilter);
  }), [records, search, statusFilter, activeWorkflowSection]);

  const totalValue = records.reduce((total, record) => total + activeModule.fields
    .filter((field) => moneyFields.has(field.key))
    .reduce((sum, field) => sum + (Number(record[field.key]) || 0), 0), 0);

  useEffect(() => {
    setHeaderNavigationTarget(document.getElementById('erp-header-navigation'));
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(recordsByModule));
  }, [recordsByModule, storageKey]);

  useEffect(() => {
    let active = true;
    const hydrateFromBackend = async () => {
      setSyncing(true);
      const synchronized: Record<string, ERPRecord[]> = {};
      const defaults = makeInitialData();
      for (const module of availableModules) {
        const { data, error } = await db.from(tableName(module.id)).select();
        const agencyFiltered = (!error && Array.isArray(data)) ? data.filter((r: any) => isItemForAgency(r, activeAgencyId)) : [];
        if (agencyFiltered.length) {
          const key = module.fields[0].key;
          const missingDefaults = defaults[module.id].filter((seed) => !agencyFiltered.some((record: ERPRecord) => record[key] === seed[key]));
          for (const record of missingDefaults) await db.from(tableName(module.id)).upsert({ ...record, agency_id: activeAgencyId || '2', owner_id: activeAgencyId || '2' });
          synchronized[module.id] = [...agencyFiltered, ...missingDefaults] as ERPRecord[];
          continue;
        }
        const localRecords = recordsByModule[module.id] || [];
        synchronized[module.id] = localRecords;
        if (!error) {
          for (const record of localRecords) await db.from(tableName(module.id)).upsert({ ...record, agency_id: activeAgencyId || '2', owner_id: activeAgencyId || '2' });
        }
      }
      if (active) {
        setRecordsByModule((current) => ({ ...current, ...synchronized }));
        setSyncing(false);
      }
    };
    hydrateFromBackend().catch(() => active && setSyncing(false));
    return () => { active = false; };
    // La carga inicial se ejecuta una vez; luego cada mutación se sincroniza individualmente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgencyId]);

  const changeModule = (id: string) => {
    setActiveModuleId(id);
    setShowApps(false);
    setSearch('');
    setStatusFilter('all');
    setWorkflowSection('all');
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ status: activeModule.statuses[0] });
    setDialogOpen(true);
  };

  const openEdit = (record: ERPRecord) => {
    setEditing(record);
    setForm({ ...record });
    setDialogOpen(true);
  };

  const saveRecord = async () => {
    const firstRequired = activeModule.fields[0];
    if (!form[firstRequired.key]?.trim()) {
      toast({ title: 'Dato requerido', description: `Completa el campo ${firstRequired.label}.`, variant: 'destructive' });
      return;
    }
    if (activeModule.id === 'proveedores') {
      const required = ['name', 'taxId', 'email'];
      const missing = required.find((key) => !form[key]?.trim());
      if (missing) {
        const label = activeModule.fields.find((field) => field.key === missing)?.label || missing;
        toast({ title: 'Ficha incompleta', description: `Completa el campo ${label}.`, variant: 'destructive' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        toast({ title: 'Correo inválido', description: 'Escribe un correo válido para el proveedor.', variant: 'destructive' });
        return;
      }
      const duplicated = (recordsByModule.proveedores || []).find((supplier) => supplier.id !== editing?.id
        && ((supplier.supplierCode || '').toLowerCase() === form.supplierCode.trim().toLowerCase()
          || (supplier.taxId || '').toLowerCase() === form.taxId.trim().toLowerCase()));
      if (duplicated) {
        toast({ title: 'Proveedor duplicado', description: 'Ya existe un proveedor con ese código o identificación fiscal.', variant: 'destructive' });
        return;
      }
      if (Number(form.creditLimit || 0) < 0) {
        toast({ title: 'Cupo inválido', description: 'El cupo de crédito no puede ser negativo.', variant: 'destructive' });
        return;
      }
    }
    if (activeModule.id === 'compras') {
      const supplier = (recordsByModule.proveedores || []).find((item) => item.name === form.supplier);
      if (!supplier || supplier.status !== 'Activo') {
        toast({ title: 'Proveedor no disponible', description: 'Selecciona un proveedor activo del directorio.', variant: 'destructive' });
        return;
      }
    }
    const nextRecord = {
      ...form,
      id: editing?.id || `${activeModule.id}-${Date.now()}`,
      status: form.status || activeModule.statuses[0],
      createdAt: editing?.createdAt || new Date().toISOString(),
      agency_id: activeAgencyId || '2',
      owner_id: activeAgencyId || '2'
    } as ERPRecord;
    setRecordsByModule((current) => {
      const currentRecords = current[activeModule.id] || [];
      return {
        ...current,
        [activeModule.id]: editing
          ? currentRecords.map((record) => record.id === editing.id ? nextRecord : record)
          : [nextRecord, ...currentRecords],
      };
    });
    setDialogOpen(false);
    const { error } = await db.from(tableName(activeModule.id)).upsert(nextRecord);
    toast({
      title: editing ? 'Registro actualizado' : 'Registro creado',
      description: error ? 'Guardado localmente; el servidor no respondió.' : `${activeModule.shortTitle} se sincronizó correctamente.`,
    });
  };

  const deleteRecord = async (record: ERPRecord) => {
    if (activeModule.id === 'proveedores' && (recordsByModule.compras || []).some((purchase) => purchase.supplier === record.name)) {
      toast({ title: 'Proveedor en uso', description: 'No se puede eliminar porque tiene órdenes de compra. Cámbialo a Inactivo.', variant: 'destructive' });
      return;
    }
    if (!window.confirm('¿Eliminar este registro de forma permanente?')) return;
    setRecordsByModule((current) => ({
      ...current,
      [activeModule.id]: (current[activeModule.id] || []).filter((item) => item.id !== record.id),
    }));
    const { error } = await db.from(tableName(activeModule.id)).delete().eq('id', record.id);
    toast({ title: 'Registro eliminado', description: error ? 'El servidor no respondió; se eliminó de este dispositivo.' : 'Cambio sincronizado con el servidor.' });
  };

  const advanceRecord = async (record: ERPRecord) => {
    const currentIndex = activeModule.statuses.indexOf(record.status);
    if (currentIndex < 0 || currentIndex === activeModule.statuses.length - 1) return;
    const updated = { ...record, status: activeModule.statuses[currentIndex + 1] };
    let generatedInventory: ERPRecord | null = null;
    if (activeModule.id === 'compras' && updated.status === 'Recibida') {
      generatedInventory = {
        id: `almacenes-compra-${record.id}`, movement: `ENT-${record.order || record.id}`, product: record.material,
        warehouse: 'Depósito principal', lot: `OC-${record.order || record.id}`, quantity: record.quantity,
        date: new Date().toISOString().slice(0, 10), status: 'Confirmado', createdAt: new Date().toISOString(),
      };
    }
    if (activeModule.id === 'produccion' && updated.status === 'Finalizada') {
      generatedInventory = {
        id: `almacenes-produccion-${record.id}`, movement: `PROD-${record.order || record.id}`, product: record.product,
        warehouse: 'Depósito principal', lot: record.order || record.id, quantity: record.produced || record.planned,
        date: new Date().toISOString().slice(0, 10), status: 'Confirmado', createdAt: new Date().toISOString(),
      };
    }
    setRecordsByModule((current) => {
      const next = {
        ...current,
        [activeModule.id]: (current[activeModule.id] || []).map((item) => item.id === record.id ? updated : item),
      };
      if (generatedInventory && !(current.almacenes || []).some((item) => item.id === generatedInventory!.id)) {
        next.almacenes = [generatedInventory, ...(current.almacenes || [])];
      }
      return next;
    });
    const { error } = await db.from(tableName(activeModule.id)).upsert(updated);
    if (generatedInventory) await db.from(tableName('almacenes')).upsert(generatedInventory);
    toast({ title: `Estado: ${updated.status}`, description: generatedInventory ? 'Flujo actualizado y entrada de almacén generada.' : error ? 'Actualizado localmente.' : 'Flujo actualizado y sincronizado.' });
  };

  const exportCsv = () => {
    const keys = [...activeModule.fields.map((field) => field.key), 'status'];
    const header = [...activeModule.fields.map((field) => field.label), 'Estado'];
    const csv = [header, ...filteredRecords.map((record) => keys.map((key) => record[key] || ''))]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    link.download = `${activeModule.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="min-h-full max-w-full overflow-x-hidden bg-slate-50 text-slate-800">
      {headerNavigationTarget && createPortal(
        <div className="mx-auto flex h-10 w-full max-w-xl items-center justify-center border border-slate-200 bg-white px-2">
          {showApps ? (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Factory className="h-4 w-4 text-blue-600" />
              Aplicaciones ERP
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <button type="button" onClick={() => setShowApps(true)} className="flex h-7 shrink-0 items-center gap-1.5 border-r border-slate-200 pr-3 text-[11px] font-semibold text-blue-700 hover:text-blue-900">
                <Boxes className="h-3.5 w-3.5" /> Aplicaciones
              </button>
              <ActiveModuleIcon className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="truncate text-xs font-bold text-slate-800">{activeModule.shortTitle}</span>
            </div>
          )}
        </div>,
        headerNavigationTarget,
      )}
      <div className="hidden">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onExit} className="h-8 w-8 sm:w-auto sm:px-2 shrink-0 flex items-center justify-center gap-1 border border-[#9fb9ca] bg-white hover:bg-[#edf6fb] text-[11px] font-semibold text-[#245878]" title="Volver al panel principal">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Volver al panel</span>
          </button>
          <Factory className="h-4 w-4 text-[#23618b]" />
          <span className="truncate text-xs sm:text-sm font-bold text-[#183f5d]"><span className="sm:hidden">MERCO ERP</span><span className="hidden sm:inline">MERCO Business Software</span></span>
          <span className="hidden sm:inline text-xs text-slate-500">| Gestión empresarial integrada</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3 text-[11px] text-slate-500">
          <span className="hidden sm:inline">Empresa principal</span>
          <span className={cn('h-2 w-2 rounded-full', syncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500')} />
          <span className="hidden lg:inline">{syncing ? 'Sincronizando' : 'Conectado'}</span>
        </div>
      </div>

      <div className="min-h-[calc(100vh-8rem)]">
        <aside className="hidden">
          <div className="px-3 py-2 bg-gradient-to-b from-[#d9ebf6] to-[#c5ddea] border-b border-[#a8c0d1] text-[11px] font-bold uppercase tracking-wide text-[#244d68]">
            Navegación de módulos
          </div>
          <div className="px-2 py-2">
            {moduleGroups.map((group) => (
              <div key={group.label} className="mb-1.5">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold text-slate-600">
                  <ChevronRight className="h-3 w-3 rotate-90 text-[#397da8]" /> {group.label}
                </div>
                <div className="ml-3 border-l border-[#bed0dd] pl-1">
                  {group.ids.map((id) => modules.find((module) => module.id === id)).filter(Boolean).map((module) => {
                    const Icon = module!.icon;
                    const isActive = module!.id === activeModule.id;
                    return (
                      <button key={module!.id} onClick={() => changeModule(module!.id)} className={cn(
                        'w-full flex items-center gap-2 px-2 py-1 text-left text-[11px] border border-transparent transition-colors',
                        isActive ? 'bg-[#d5eaf7] border-[#9bc3dc] text-[#174e73] font-bold' : 'text-slate-600 hover:bg-[#e5f1f8] hover:text-[#174e73]',
                      )}>
                        <Icon className={cn('h-3 w-3 shrink-0', isActive ? 'text-[#2575a8]' : 'text-[#7393a8]')} />
                        <span className="truncate">{module!.shortTitle}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mx-3 mt-2 mb-3 border border-[#bfd0dc] bg-white text-[11px]">
            <div className="px-2 py-1.5 font-bold text-[#244d68] bg-[#e7f1f7] border-b border-[#bfd0dc]">Sesión activa</div>
            <div className="p-2 space-y-1 text-slate-500"><p>Base de datos: Operativa</p><p>Ejercicio: 2026</p><p>Moneda: MXN</p></div>
          </div>
        </aside>

        <main className="min-w-0 max-w-full p-0 pt-4">
          {showApps && (
            <div className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-7">
              <div className="mb-6 border-b border-slate-200 pb-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Suite operativa</p>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Gestión empresarial ERP</h1>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                      Selecciona un módulo para administrar los procesos de tu empresa.
                    </p>
                  </div>
                  <div className="relative w-full lg:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={appSearch} onChange={(event) => setAppSearch(event.target.value)} placeholder="Buscar un módulo ERP" className="h-10 rounded-md border-slate-300 bg-white pl-9 text-sm shadow-none" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
                  <span className={cn('h-2 w-2 rounded-full', syncing ? 'animate-pulse bg-amber-400' : 'bg-emerald-500')} />
                  {syncing ? 'Sincronizando información operativa' : 'Información operativa sincronizada'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-x-3 gap-y-7 sm:grid-cols-4 sm:gap-x-6 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                {filteredModules.map((module) => {
                  const ModuleIcon = module.icon;
                  const theme = erpModuleThemes[module.id] || { gradient: 'from-slate-500 to-slate-700', category: 'ERP' };
                  const count = recordsByModule[module.id]?.length || 0;
                  return (
                    <button key={module.id} type="button" onClick={() => changeModule(module.id)} title={`${module.title}: ${module.description}`} className="group flex min-w-0 flex-col items-center text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4">
                      <div className="relative flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-slate-300 group-hover:shadow-[0_8px_18px_rgba(15,23,42,0.12)] sm:h-[76px] sm:w-[76px]">
                        <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', theme.gradient)} />
                        <div className={cn('relative flex h-11 w-11 items-center justify-center rounded-md bg-gradient-to-br text-white shadow-sm', theme.gradient)}>
                          <ModuleIcon className="h-6 w-6" strokeWidth={1.8} />
                        </div>
                        {count > 0 && <span className="absolute bottom-1 right-1 min-w-4 rounded-full bg-slate-900 px-1 text-[8px] font-bold leading-4 text-white">{count}</span>}
                      </div>
                      <span className="mt-2.5 line-clamp-2 max-w-[108px] text-[11px] font-semibold leading-4 text-slate-700 transition-colors group-hover:text-blue-700 sm:text-xs">{module.shortTitle}</span>
                      <span className="mt-0.5 max-w-[108px] truncate text-[9px] text-slate-400">{theme.category}</span>
                    </button>
                  );
                })}
              </div>
              {!filteredModules.length && (
                <div className="border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                  <Search className="mx-auto mb-3 h-7 w-7 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">No encontramos ese módulo</p>
                  <button type="button" onClick={() => setAppSearch('')} className="mt-2 text-xs font-semibold text-blue-700 hover:underline">Ver todos los módulos</button>
                </div>
              )}
            </div>
          )}

          <div className={cn("md:hidden mb-4 flex h-12 items-center gap-3 border-y border-slate-200 bg-white px-3", showApps && 'hidden')}>
            <button type="button" onClick={() => setShowApps(true)} className="flex h-8 shrink-0 items-center gap-1.5 border-r border-slate-200 pr-3 text-xs font-semibold text-blue-700">
              <Boxes className="h-4 w-4" /> Aplicaciones
            </button>
            <ActiveModuleIcon className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="min-w-0 truncate text-sm font-bold text-slate-800">{activeModule.shortTitle}</span>
            <span className={cn('ml-auto h-2 w-2 shrink-0 rounded-full', syncing ? 'animate-pulse bg-amber-400' : 'bg-emerald-500')} title={syncing ? 'Sincronizando' : 'Conectado'} />
          </div>

          <div className={cn("mx-auto mb-8 w-[calc(100%-1.5rem)] max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.07)] sm:w-[calc(100%-3.5rem)]", showApps && 'hidden')}>
            <div className="truncate border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[10px] text-slate-500 sm:px-6 sm:text-xs">
              <span className="hidden sm:inline">Gestión empresarial <span className="mx-1">›</span> Operaciones <span className="mx-1">›</span></span> <strong className="text-[#245878]">{activeModule.title}</strong>
            </div>
            <div className="relative flex flex-col justify-between gap-4 overflow-hidden border-b border-slate-200 bg-white px-4 py-5 sm:px-6 md:flex-row md:items-center">
              <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', activeTheme.gradient)} />
              <div className="flex min-w-0 items-start gap-3.5">
                <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm', activeTheme.gradient)}>
                  <ActiveModuleIcon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{activeModule.title}</h1>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">{activeTheme.category}</span>
                  </div>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">{activeModule.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {activeModule.id === 'compras' && <button type="button" onClick={() => changeModule('proveedores')} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">Ver proveedores</button>}
                <button type="button" onClick={exportCsv} className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Download className="h-3.5 w-3.5" /> Exportar</button>
                <button type="button" onClick={openCreate} className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"><Plus className="h-3.5 w-3.5" /> {workflow?.createLabel || 'Nuevo registro'}</button>
              </div>
            </div>

            {workflow && <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 pt-3 sm:px-6" role="tablist" aria-label="Etapas del flujo">
              {workflow.sections.map((section) => {
                const count = section.statuses ? records.filter((record) => section.statuses!.includes(record.status)).length : records.length;
                const isSelected = workflowSection === section.id;
                return <button key={section.id} type="button" role="tab" aria-selected={isSelected} onClick={() => { setWorkflowSection(section.id); setStatusFilter('all'); }} className={cn(
                  'relative flex items-center gap-2 whitespace-nowrap rounded-t-lg border border-b-0 px-3 py-2.5 text-[11px] transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  isSelected ? 'top-px border-slate-200 bg-white font-bold text-blue-700 shadow-[0_-2px_8px_rgba(15,23,42,0.03)]' : 'border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800',
                )}>{section.label}<span className={cn('flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-bold', isSelected ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/70 text-slate-500')}>{count}</span></button>;
              })}
            </div>}
            {workflow && <div className="border-b border-slate-100 bg-white px-4 py-2.5 text-[11px] leading-5 text-slate-500 sm:px-6"><strong className="text-slate-700">Siguiente paso recomendado:</strong> {workflow.help}</div>}
            <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:px-6">
              <div className="relative max-w-xl flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input aria-label={`Buscar en ${activeModule.title}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar en ${activeModule.shortTitle.toLowerCase()}...`} className="h-9 rounded-lg border-slate-300 bg-white pl-9 pr-16 text-xs shadow-sm" />
                {search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Limpiar</button>}
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger aria-label="Filtrar por estado" className="h-9 rounded-lg border-slate-300 bg-white text-xs shadow-sm sm:w-[200px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {activeModule.statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 xl:grid-cols-4">
              {(activeModule.id === 'proveedores' ? [
                ['Proveedores', records.length, 'text-[#245878]'],
                ['Activos', records.filter((record) => record.status === 'Activo').length, 'text-emerald-700'],
                ['Bloqueados / inactivos', records.filter((record) => record.status !== 'Activo').length, 'text-amber-700'],
                ['Cupo de crédito', formatValue('creditLimit', String(totalValue)), 'text-[#245878]'],
              ] : [
                ['Registros', records.length, 'text-[#245878]'],
                ['En seguimiento', records.filter((record) => !statusClass(record.status).includes('emerald')).length, 'text-amber-700'],
                ['Completados', records.filter((record) => statusClass(record.status).includes('emerald')).length, 'text-emerald-700'],
                ['Valor gestionado', formatValue('amount', String(totalValue)), 'text-[#245878]'],
              ]).map(([title, value, color]) => (
                <div key={String(title)} className="bg-white px-4 py-3.5 sm:px-6">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 sm:text-[10px]">{title}</p>
                  <p className={cn('mt-1 truncate text-xl font-bold tracking-tight sm:text-2xl', String(color))}>{value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3 bg-slate-50/70 p-3 sm:hidden">
              {filteredRecords.map((record) => (
                <article key={record.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className={cn('h-1 bg-gradient-to-r', activeTheme.gradient)} />
                  <div className="p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">{record[activeModule.fields[0].key]}</p><h3 className="mt-0.5 truncate text-sm font-bold text-slate-900">{record[activeModule.fields[1].key] || activeModule.shortTitle}</h3></div>
                    <span className={cn('shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold', statusClass(record.status))}>{record.status}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">{activeModule.fields.slice(2).map((field) => <div key={field.key} className="min-w-0"><dt className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{field.label}</dt><dd className="mt-0.5 truncate text-xs font-medium text-slate-700">{formatValue(field.key, record[field.key])}</dd></div>)}</dl>
                  <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => openEdit(record)} className="flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Pencil className="h-3.5 w-3.5" /> Editar</button><button type="button" onClick={() => deleteRecord(record)} className="flex min-h-8 items-center gap-1 rounded-lg border border-red-100 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"><Trash2 className="h-3.5 w-3.5" /> Eliminar</button></div>
                  </div>
                </article>
              ))}
              {!filteredRecords.length && <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center"><Search className="mx-auto mb-2 h-6 w-6 text-slate-300" /><p className="text-sm font-semibold text-slate-600">No hay resultados</p><p className="mt-1 text-xs text-slate-400">Prueba otro estado o cambia el texto de búsqueda.</p>{(search || statusFilter !== 'all') && <button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); }} className="mt-3 text-xs font-semibold text-blue-700 hover:underline">Limpiar filtros</button>}</div>}
            </div>

            <div className="hidden min-h-[360px] overflow-x-auto sm:block">
              <table className="w-full min-w-[900px] text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 bg-slate-100/95 backdrop-blur">
                    {activeModule.fields.map((field) => <th key={field.key} scope="col" className="border-r border-slate-200 px-3 py-3 text-left text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">{field.label}</th>)}
                    <th scope="col" className="border-r border-slate-200 px-3 py-3 text-left text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">Estado</th>
                  <th scope="col" className="sticky right-0 w-28 border-l border-slate-200 bg-slate-100/95 px-2 py-3 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, rowIndex) => (
                    <tr key={record.id} className={cn('group border-b border-slate-100 transition-colors hover:bg-blue-50/60', rowIndex % 2 ? 'bg-slate-50/50' : 'bg-white')}>
                      {activeModule.fields.map((field, index) => (
                        <td key={field.key} className={cn('whitespace-nowrap border-r border-slate-100 px-3 py-3', index === 0 ? 'font-bold text-blue-700' : 'text-slate-600')}>
                          {formatValue(field.key, record[field.key])}
                        </td>
                      ))}
                      <td className="border-r border-slate-100 px-3 py-3"><span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold', statusClass(record.status))}>{record.status}</span></td>
                      <td className={cn('sticky right-0 border-l border-slate-100 px-2 py-1 transition-colors group-hover:bg-blue-50', rowIndex % 2 ? 'bg-slate-50' : 'bg-white')}><div className="flex justify-center gap-0.5">
                        {!terminalStatuses[activeModule.id]?.includes(record.status) && activeModule.statuses.indexOf(record.status) < activeModule.statuses.length - 1 && <button onClick={() => advanceRecord(record)} className="p-1.5 border border-transparent text-emerald-700 hover:border-emerald-200 hover:bg-white" title={`Avanzar a ${activeModule.statuses[activeModule.statuses.indexOf(record.status) + 1]}`}><ChevronRight className="h-3.5 w-3.5" /></button>}
                        <button onClick={() => openEdit(record)} className="p-1.5 border border-transparent text-[#477995] hover:border-[#aac6d7] hover:bg-white" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => deleteRecord(record)} className="p-1.5 border border-transparent text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-white" title="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div></td>
                    </tr>
                  ))}
                  {!filteredRecords.length && <tr><td colSpan={activeModule.fields.length + 2} className="text-center py-16 text-slate-400 bg-white">No hay registros que coincidan con la consulta.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex h-9 items-center justify-between border-t border-slate-200 bg-slate-50 px-4 text-[10px] text-slate-500 sm:px-6">
              <span>{filteredRecords.length} de {records.length} registros</span><span>Última actualización: ahora</span>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg">
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white', activeTheme.gradient)}><ActiveModuleIcon className="h-4 w-4" /></span>
              <span>{editing ? 'Editar' : 'Nuevo registro'} · {activeModule.shortTitle}</span>
            </DialogTitle>
            <DialogDescription>{workflow?.help || 'Completa la información operativa. Los cambios se reflejan inmediatamente en el tablero.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3 sm:grid-cols-2">
            {activeModule.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`erp-${field.key}`} className="text-xs font-semibold text-slate-700">{field.label}</Label>
                {activeModule.id === 'compras' && field.key === 'supplier' ? (
                  <Select value={form.supplier || ''} onValueChange={(supplier) => setForm((current) => ({ ...current, supplier }))}>
                    <SelectTrigger id="erp-supplier"><SelectValue placeholder="Selecciona un proveedor activo" /></SelectTrigger>
                    <SelectContent>{(recordsByModule.proveedores || []).filter((supplier) => supplier.status === 'Activo').map((supplier) => <SelectItem key={supplier.id} value={supplier.name}>{supplier.supplierCode} · {supplier.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <Input id={`erp-${field.key}`} type={field.type || 'text'} min={field.type === 'number' ? 0 : undefined} value={form[field.key] || ''} placeholder={field.placeholder} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} className="h-10 rounded-lg border-slate-300" />}
              </div>
            ))}
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.status || activeModule.statuses[0]} onValueChange={(status) => setForm((current) => ({ ...current, status }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{activeModule.statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg">Cancelar</Button>
            <Button type="button" onClick={saveRecord} className="rounded-lg bg-blue-600 hover:bg-blue-700"><CheckCircle2 className="mr-2 h-4 w-4" />Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ERPManager;
