import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, Building2, Check, ChevronLeft, ChevronRight, CircleDollarSign, Gauge, Landmark, LockKeyhole, Plus, ReceiptText, Scale, TrendingDown, TrendingUp, WalletCards, LayoutGrid, ArrowLeft, Search, AppWindow, Sparkles, Filter, X, BarChart3, FileSpreadsheet, ScrollText, HandCoins, Banknote, FileCheck2, Calculator, PieChart, Target, Boxes, Network, PackageCheck, ShieldCheck } from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { db } from '@/firebase';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

type Account = { code: string; name: string; type: 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingreso' | 'Gasto' };
type EntryLine = { account: string; debit: number; credit: number };
type Entry = { id: string; number: string; date: string; reference: string; description: string; lines: EntryLine[]; status: 'Borrador' | 'Contabilizado' };
type DueItem = { id: string; party: string; document: string; due: string; amount: number; status: 'Pendiente' | 'Pagado' | 'Anulado' };
type BankItem = { id: string; date: string; detail: string; amount: number; reconciled: boolean };
type CostCenter = { id: string; code: string; name: string; budget: number; actual: number };
type Period = { id: string; name: string; status: 'Abierto' | 'Cerrado'; closedAt?: string };
type Invoice = { id: string; number: string; customer: string; date: string; due: string; net: number; tax: number; total: number; status: 'Borrador' | 'Emitida' | 'Anulada' };
type TaxObligation = { id: string; name: string; period: string; due: string; amount: number; status: 'Pendiente' | 'Presentada' | 'Pagada' | 'Anulada'; source?: string };
type FixedAsset = { id: string; code: string; name: string; acquired: string; value: number; years: number; status: 'Activo' | 'Baja' };
type BudgetLine = { id: string; area: string; concept: string; planned: number; actual: number };
type AuditEvent = { id: string; date: string; action: string; detail: string };
type AccountingState = { accounts: Account[]; entries: Entry[]; receivables: DueItem[]; payables: DueItem[]; banks: BankItem[]; costCenters: CostCenter[]; periods: Period[]; invoices: Invoice[]; taxes: TaxObligation[]; assets: FixedAsset[]; budgets: BudgetLine[]; audit: AuditEvent[] };

const today = new Date().toISOString().slice(0, 10);
const initialState: AccountingState = {
  accounts: [
    { code: '1105', name: 'Caja general', type: 'Activo' }, { code: '1110', name: 'Bancos', type: 'Activo' },
    { code: '1305', name: 'Clientes', type: 'Activo' }, { code: '1435', name: 'Inventarios', type: 'Activo' },
    { code: '2205', name: 'Proveedores', type: 'Pasivo' }, { code: '2408', name: 'Impuestos por pagar', type: 'Pasivo' },
    { code: '3105', name: 'Capital social', type: 'Patrimonio' }, { code: '4135', name: 'Ingresos por ventas', type: 'Ingreso' },
    { code: '5105', name: 'Gastos de personal', type: 'Gasto' }, { code: '5195', name: 'Gastos operativos', type: 'Gasto' },
  ],
  entries: [
    { id: 'AST-1', number: '000001', date: today, reference: 'FV-000182', description: 'Venta a crédito', status: 'Contabilizado', lines: [{ account: '1305', debit: 18500, credit: 0 }, { account: '4135', debit: 0, credit: 15546 }, { account: '2408', debit: 0, credit: 2954 }] },
    { id: 'AST-2', number: '000002', date: today, reference: 'RC-0041', description: 'Cobro de cliente', status: 'Contabilizado', lines: [{ account: '1110', debit: 9200, credit: 0 }, { account: '1305', debit: 0, credit: 9200 }] },
  ],
  receivables: [{ id: 'CXC-1', party: 'Comercial Norte', document: 'FV-000182', due: '2026-09-15', amount: 9300, status: 'Pendiente' }],
  payables: [{ id: 'CXP-1', party: 'Distribuidora Central', document: 'FC-8841', due: '2026-09-12', amount: 7600, status: 'Pendiente' }],
  banks: [{ id: 'BAN-1', date: today, detail: 'Transferencia recibida RC-0041', amount: 9200, reconciled: true }, { id: 'BAN-2', date: today, detail: 'Comisión bancaria', amount: -125, reconciled: false }],
  costCenters: [{ id: 'CC-1', code: 'ADM', name: 'Administración', budget: 15000, actual: 9400 }, { id: 'CC-2', code: 'OPE', name: 'Operaciones', budget: 32000, actual: 24750 }],
  periods: [{ id: 'PER-1', name: 'Agosto 2026', status: 'Cerrado', closedAt: '2026-09-03' }, { id: 'PER-2', name: 'Septiembre 2026', status: 'Abierto' }],
  invoices: [{ id: 'FAC-1', number: 'FV-000182', customer: 'Comercial Norte', date: today, due: '2026-09-15', net: 15546, tax: 2954, total: 18500, status: 'Emitida' }],
  taxes: [{ id: 'IMP-1', name: 'IVA / Impuesto a las ventas', period: 'Agosto 2026', due: '2026-09-18', amount: 2954, status: 'Pendiente', source: 'FV-000182' }],
  assets: [{ id: 'AF-1', code: 'AF-00092', name: 'Servidor central', acquired: '2026-03-15', value: 15800000, years: 5, status: 'Activo' }],
  budgets: [{ id: 'PRE-1', area: 'Operaciones', concept: 'Insumos y materiales', planned: 80000000, actual: 52600000 }, { id: 'PRE-2', area: 'Administración', concept: 'Gastos generales', planned: 25000000, actual: 17400000 }],
  audit: [{ id: 'AUD-1', date: '2026-09-03 17:20', action: 'Cierre de período', detail: 'Agosto 2026 cerrado por Administrador' }],
};

const views = [
  ['resumen', 'Resumen', Landmark], ['plan', 'Plan de cuentas', BookOpen], ['asientos', 'Asientos y diario', ReceiptText], ['mayor', 'Libro mayor', BookOpen],
  ['cartera', 'Cuentas por cobrar/pagar', WalletCards], ['bancos', 'Conciliación bancaria', Landmark], ['facturacion', 'Facturación', ReceiptText],
  ['impuestos', 'Impuestos', Scale], ['estados', 'Estados financieros', Scale], ['presupuesto', 'Presupuesto', Building2], ['activos', 'Activos fijos', Landmark],
  ['costos', 'Centros de costo', Building2], ['cierres', 'Cierres y auditoría', LockKeyhole], ['operacion', 'Caja y comprobantes', CircleDollarSign],
] as const;
const formatMoney = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
const compactMoney = (value: number) => new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const cloneInitial = () => JSON.parse(JSON.stringify(initialState)) as AccountingState;
const auditEvent = (action: string, detail: string): AuditEvent => ({ id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, date: new Date().toLocaleString('es-CO'), action, detail });
const nextEntryNumber = (entries: Entry[]) => String(Math.max(0, ...entries.map((entry) => Number(entry.number) || 0)) + 1).padStart(6, '0');

interface AccountingManagerProps {
  operationalRecords?: Record<string, Array<Record<string, string>>>;
  onOpenModule?: (moduleId: string) => void;
  standalone?: boolean;
}

const OperationalAccounting = React.lazy(() => import('@/components/admin/ContabilidadManager').then((module) => ({ default: module.ContabilidadManager })));

export interface AccountingAppItem {
  id: (typeof views)[number][0];
  name: string;
  subtitle: string;
  icon: any;
  gradient: string;
  category: 'operativa' | 'libros' | 'fiscal' | 'gestion';
  categoryLabel: string;
  badge?: string;
  badgeColor?: string;
}

export const accountingApps: AccountingAppItem[] = [
  {
    id: 'resumen',
    name: 'Tablero Financiero',
    subtitle: 'KPIs, margen y salud de negocio',
    icon: BarChart3,
    gradient: 'from-blue-600 to-indigo-700',
    category: 'gestion',
    categoryLabel: 'Dirección',
    badge: 'KPIs',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  {
    id: 'facturacion',
    name: 'Facturación',
    subtitle: 'Comprobantes y ventas a clientes',
    icon: FileCheck2,
    gradient: 'from-emerald-500 to-teal-700',
    category: 'operativa',
    categoryLabel: 'Operativa',
    badge: 'Ventas',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    id: 'operacion',
    name: 'Caja y Recibos',
    subtitle: 'Arqueo diario y egresos de caja',
    icon: Banknote,
    gradient: 'from-amber-500 to-orange-600',
    category: 'operativa',
    categoryLabel: 'Tesorería',
    badge: 'Caja',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    id: 'bancos',
    name: 'Conciliación Bancaria',
    subtitle: 'Cuentas bancarias y movimientos',
    icon: Landmark,
    gradient: 'from-cyan-500 to-blue-600',
    category: 'operativa',
    categoryLabel: 'Tesorería',
  },
  {
    id: 'cartera',
    name: 'Cobranzas y Pagos',
    subtitle: 'Cuentas por cobrar y por pagar',
    icon: HandCoins,
    gradient: 'from-purple-500 to-indigo-600',
    category: 'operativa',
    categoryLabel: 'Cartera',
  },
  {
    id: 'plan',
    name: 'Plan de Cuentas',
    subtitle: 'Catálogo contable institucional (PUC)',
    icon: Network,
    gradient: 'from-teal-500 to-emerald-600',
    category: 'libros',
    categoryLabel: 'Libros',
  },
  {
    id: 'asientos',
    name: 'Libro Diario',
    subtitle: 'Asientos y partida doble',
    icon: ScrollText,
    gradient: 'from-rose-500 to-pink-600',
    category: 'libros',
    categoryLabel: 'Libros',
  },
  {
    id: 'mayor',
    name: 'Libro Mayor',
    subtitle: 'Movimientos por cuenta contable',
    icon: BookOpen,
    gradient: 'from-violet-600 to-purple-800',
    category: 'libros',
    categoryLabel: 'Libros',
  },
  {
    id: 'estados',
    name: 'Estados Financieros',
    subtitle: 'Balance general y resultados',
    icon: FileSpreadsheet,
    gradient: 'from-emerald-600 to-green-800',
    category: 'fiscal',
    categoryLabel: 'Informes',
  },
  {
    id: 'impuestos',
    name: 'Agenda Fiscal',
    subtitle: 'IVA, retenciones y calendario',
    icon: Calculator,
    gradient: 'from-orange-500 to-red-600',
    category: 'fiscal',
    categoryLabel: 'Fiscal',
  },
  {
    id: 'presupuesto',
    name: 'Presupuestos',
    subtitle: 'Control y metas por área',
    icon: Target,
    gradient: 'from-cyan-600 to-teal-700',
    category: 'gestion',
    categoryLabel: 'Gestión',
  },
  {
    id: 'costos',
    name: 'Centros de Costo',
    subtitle: 'Contabilidad analítica y sedes',
    icon: PieChart,
    gradient: 'from-indigo-500 to-blue-700',
    category: 'gestion',
    categoryLabel: 'Costos',
  },
  {
    id: 'activos',
    name: 'Activos Fijos',
    subtitle: 'Depreciación y bienes de uso',
    icon: Boxes,
    gradient: 'from-slate-600 to-slate-800',
    category: 'gestion',
    categoryLabel: 'Patrimonio',
  },
  {
    id: 'cierres',
    name: 'Cierres y Auditoría',
    subtitle: 'Cierres de período y trazabilidad',
    icon: ShieldCheck,
    gradient: 'from-red-500 to-rose-700',
    category: 'gestion',
    categoryLabel: 'Control',
  },
];

export const AccountingManager: React.FC<AccountingManagerProps> = ({ operationalRecords = {}, onOpenModule, standalone = false }) => {
  const [view, setView] = useState<(typeof views)[number][0] | 'apps'>('apps');
  const [appSearchTerm, setAppSearchTerm] = useState('');
  const [appCategoryFilter, setAppCategoryFilter] = useState<'todas' | 'operativa' | 'libros' | 'fiscal' | 'gestion'>('todas');
  const tabsRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<AccountingState>(() => {
    try { const saved = JSON.parse(localStorage.getItem('merco-accounting-v1') || 'null') as Partial<AccountingState> | null; return saved ? { ...cloneInitial(), ...saved, audit: saved.audit || cloneInitial().audit } : cloneInitial(); } catch { return cloneInitial(); }
  });
  const [entryOpen, setEntryOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [ledgerAccount, setLedgerAccount] = useState('1305');
  const [entryForm, setEntryForm] = useState({ date: today, reference: '', description: '', debitAccount: '1105', creditAccount: '4135', amount: '' });
  const [accountForm, setAccountForm] = useState({ code: '', name: '', type: 'Activo' as Account['type'] });
  const [invoiceForm, setInvoiceForm] = useState({ customer: '', date: today, due: today, net: '', tax: '' });

  useEffect(() => { localStorage.setItem('merco-accounting-v1', JSON.stringify(state)); db.from('erp_accounting').upsert({ id: 'main', ...state, updatedAt: new Date().toISOString() }); }, [state]);
  useEffect(() => { db.from('erp_accounting').select().then(({ data, error }: { data?: Array<Partial<AccountingState> & { id: string }>; error?: unknown }) => { const saved = data?.find((item) => item.id === 'main'); if (!error && saved?.accounts && saved?.entries) setState({ ...cloneInitial(), ...saved, audit: saved.audit || [] } as AccountingState); }); }, []);

  const trialBalance = useMemo(() => state.accounts.map((account) => {
    const lines = state.entries.filter((entry) => entry.status === 'Contabilizado').flatMap((entry) => entry.lines).filter((line) => line.account === account.code);
    const debit = lines.reduce((sum, line) => sum + Number(line.debit), 0); const credit = lines.reduce((sum, line) => sum + Number(line.credit), 0);
    return { ...account, debit, credit, balance: debit - credit };
  }), [state.accounts, state.entries]);
  const totals = useMemo(() => ({
    debit: trialBalance.reduce((sum, account) => sum + account.debit, 0), credit: trialBalance.reduce((sum, account) => sum + account.credit, 0),
    receivable: state.receivables.filter((item) => item.status === 'Pendiente').reduce((sum, item) => sum + item.amount, 0),
    payable: state.payables.filter((item) => item.status === 'Pendiente').reduce((sum, item) => sum + item.amount, 0),
  }), [trialBalance, state.receivables, state.payables]);
  const statementTotals = useMemo(() => state.accounts.reduce<Record<Account['type'], number>>((summary, account) => {
    const balance = trialBalance.find((row) => row.code === account.code)?.balance || 0;
    summary[account.type] += ['Pasivo', 'Patrimonio', 'Ingreso'].includes(account.type) ? -balance : balance; return summary;
  }, { Activo: 0, Pasivo: 0, Patrimonio: 0, Ingreso: 0, Gasto: 0 }), [state.accounts, trialBalance]);

  const filteredApps = useMemo(() => {
    return accountingApps.filter((app) => {
      const query = appSearchTerm.trim().toLowerCase();
      const matchesSearch = !query ||
        app.name.toLowerCase().includes(query) ||
        app.subtitle.toLowerCase().includes(query) ||
        app.categoryLabel.toLowerCase().includes(query);
      const matchesCategory = appCategoryFilter === 'todas' || app.category === appCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [appSearchTerm, appCategoryFilter]);

  const saveEntry = () => {
    const amount = Number(entryForm.amount);
    if (!entryForm.description || !entryForm.reference || amount <= 0 || entryForm.debitAccount === entryForm.creditAccount) { toast({ title: 'Asiento incompleto', description: 'Verifica referencia, descripción, importe y cuentas diferentes.', variant: 'destructive' }); return; }
    const entry: Entry = { id: `AST-${Date.now()}`, number: nextEntryNumber(state.entries), date: entryForm.date, reference: entryForm.reference, description: entryForm.description, status: 'Contabilizado', lines: [{ account: entryForm.debitAccount, debit: amount, credit: 0 }, { account: entryForm.creditAccount, debit: 0, credit: amount }] };
    setState((current) => ({ ...current, entries: [entry, ...current.entries], audit: [auditEvent('Asiento contabilizado', `${entry.number} · ${entry.reference} · ${formatMoney(amount)}`), ...current.audit] }));
    setEntryOpen(false); setEntryForm({ date: today, reference: '', description: '', debitAccount: '1105', creditAccount: '4135', amount: '' }); toast({ title: 'Asiento contabilizado', description: `Comprobante ${entry.number} balanceado correctamente.` });
  };
  const saveAccount = () => {
    if (!accountForm.code || !accountForm.name || state.accounts.some((account) => account.code === accountForm.code)) { toast({ title: 'Cuenta inválida', description: 'Completa los datos y utiliza un código único.', variant: 'destructive' }); return; }
    setState((current) => ({ ...current, accounts: [...current.accounts, accountForm].sort((a, b) => a.code.localeCompare(b.code)), audit: [auditEvent('Cuenta creada', `${accountForm.code} · ${accountForm.name}`), ...current.audit] })); setAccountOpen(false); setAccountForm({ code: '', name: '', type: 'Activo' });
  };
  const saveInvoice = () => {
    const net = Number(invoiceForm.net); const tax = Number(invoiceForm.tax);
    if (!invoiceForm.customer.trim() || net <= 0 || tax < 0 || invoiceForm.due < invoiceForm.date) { toast({ title: 'Factura incompleta', description: 'Revisa cliente, fechas, neto e impuesto.', variant: 'destructive' }); return; }
    const sequence = Math.max(182, ...state.invoices.map((invoice) => Number(invoice.number.replace(/\D/g, '')) || 0)) + 1;
    const invoice: Invoice = { id: `FAC-${Date.now()}`, number: `FV-${String(sequence).padStart(6, '0')}`, customer: invoiceForm.customer.trim(), date: invoiceForm.date, due: invoiceForm.due, net, tax, total: net + tax, status: 'Borrador' };
    setState((current) => ({ ...current, invoices: [invoice, ...current.invoices], audit: [auditEvent('Factura creada', `${invoice.number} · ${invoice.customer}`), ...current.audit] })); setInvoiceOpen(false); setInvoiceForm({ customer: '', date: today, due: today, net: '', tax: '' }); toast({ title: 'Borrador creado', description: 'Revísalo y emítelo para generar cartera y contabilidad.' });
  };
  const issueInvoice = (id: string) => setState((current) => {
    const invoice = current.invoices.find((item) => item.id === id); if (!invoice || invoice.status !== 'Borrador') return current;
    const entry: Entry = { id: `AST-${Date.now()}`, number: nextEntryNumber(current.entries), date: invoice.date, reference: invoice.number, description: `Venta a crédito · ${invoice.customer}`, status: 'Contabilizado', lines: [{ account: '1305', debit: invoice.total, credit: 0 }, { account: '4135', debit: 0, credit: invoice.net }, { account: '2408', debit: 0, credit: invoice.tax }] };
    return { ...current, invoices: current.invoices.map((item) => item.id === id ? { ...item, status: 'Emitida' } : item), receivables: [{ id: `CXC-${Date.now()}`, party: invoice.customer, document: invoice.number, due: invoice.due, amount: invoice.total, status: 'Pendiente' }, ...current.receivables], taxes: invoice.tax > 0 ? [{ id: `IMP-${Date.now()}`, name: 'IVA / Impuesto a las ventas', period: invoice.date.slice(0, 7), due: invoice.due, amount: invoice.tax, status: 'Pendiente', source: invoice.number }, ...current.taxes] : current.taxes, entries: [entry, ...current.entries], audit: [auditEvent('Factura emitida', `${invoice.number}; asiento ${entry.number}, cartera e impuesto generados`), ...current.audit] };
  });
  const voidInvoice = (id: string) => setState((current) => {
    const invoice = current.invoices.find((item) => item.id === id); if (!invoice || invoice.status !== 'Emitida') return current;
    if (current.receivables.find((item) => item.document === invoice.number)?.status === 'Pagado') { toast({ title: 'No se puede anular', description: 'La factura ya tiene un cobro aplicado. Registra primero la devolución.', variant: 'destructive' }); return current; }
    const reversal: Entry = { id: `AST-${Date.now()}`, number: nextEntryNumber(current.entries), date: today, reference: `NC-${invoice.number}`, description: `Anulación de ${invoice.number}`, status: 'Contabilizado', lines: [{ account: '4135', debit: invoice.net, credit: 0 }, { account: '2408', debit: invoice.tax, credit: 0 }, { account: '1305', debit: 0, credit: invoice.total }] };
    return { ...current, invoices: current.invoices.map((item) => item.id === id ? { ...item, status: 'Anulada' } : item), receivables: current.receivables.map((item) => item.document === invoice.number ? { ...item, status: 'Anulado' } : item), taxes: current.taxes.map((item) => item.source === invoice.number ? { ...item, status: 'Anulada' } : item), entries: [reversal, ...current.entries], audit: [auditEvent('Factura anulada', `${invoice.number}; contra-asiento ${reversal.number}`), ...current.audit] };
  });
  const settle = (kind: 'receivables' | 'payables', id: string) => setState((current) => {
    const item = current[kind].find((candidate) => candidate.id === id); if (!item || item.status !== 'Pendiente') return current;
    const collection = kind === 'receivables';
    const entry: Entry = { id: `AST-${Date.now()}`, number: nextEntryNumber(current.entries), date: today, reference: `${collection ? 'RC' : 'OP'}-${item.document}`, description: `${collection ? 'Cobro de cliente' : 'Pago a proveedor'} · ${item.party}`, status: 'Contabilizado', lines: collection ? [{ account: '1110', debit: item.amount, credit: 0 }, { account: '1305', debit: 0, credit: item.amount }] : [{ account: '2205', debit: item.amount, credit: 0 }, { account: '1110', debit: 0, credit: item.amount }] };
    return { ...current, [kind]: current[kind].map((candidate) => candidate.id === id ? { ...candidate, status: 'Pagado' as const } : candidate), entries: [entry, ...current.entries], banks: [{ id: `BAN-${Date.now()}`, date: today, detail: `${entry.reference} · ${item.party}`, amount: collection ? item.amount : -item.amount, reconciled: false }, ...current.banks], audit: [auditEvent(collection ? 'Cobro aplicado' : 'Pago aplicado', `${item.document} · ${formatMoney(item.amount)} · asiento ${entry.number}`), ...current.audit] };
  });
  const reconcile = (id: string) => setState((current) => { const bank = current.banks.find((item) => item.id === id); return bank ? { ...current, banks: current.banks.map((item) => item.id === id ? { ...item, reconciled: !item.reconciled } : item), audit: [auditEvent(bank.reconciled ? 'Conciliación revertida' : 'Movimiento conciliado', bank.detail), ...current.audit] } : current; });
  const togglePeriod = (id: string) => setState((current) => {
    const period = current.periods.find((item) => item.id === id); if (!period) return current;
    if (period.status === 'Abierto' && (current.entries.some((entry) => entry.status === 'Borrador') || current.entries.some((entry) => Math.abs(entry.lines.reduce((sum, line) => sum + line.debit - line.credit, 0)) > 0.001))) { toast({ title: 'Cierre bloqueado', description: 'Existen asientos en borrador o desbalanceados.', variant: 'destructive' }); return current; }
    const closing = period.status === 'Abierto'; return { ...current, periods: current.periods.map((item) => item.id === id ? { ...item, status: closing ? 'Cerrado' : 'Abierto', closedAt: closing ? today : undefined } : item), audit: [auditEvent(closing ? 'Cierre de período' : 'Reapertura de período', period.name), ...current.audit] };
  });
  const advanceTax = (id: string) => setState((current) => {
    const tax = current.taxes.find((item) => item.id === id); if (!tax || tax.status === 'Pagada' || tax.status === 'Anulada') return current;
    if (tax.status === 'Pendiente') return { ...current, taxes: current.taxes.map((item) => item.id === id ? { ...item, status: 'Presentada' } : item), audit: [auditEvent('Obligación presentada', `${tax.name} · ${tax.period}`), ...current.audit] };
    const entry: Entry = { id: `AST-${Date.now()}`, number: nextEntryNumber(current.entries), date: today, reference: tax.id, description: `Pago de ${tax.name} · ${tax.period}`, status: 'Contabilizado', lines: [{ account: '2408', debit: tax.amount, credit: 0 }, { account: '1110', debit: 0, credit: tax.amount }] };
    return { ...current, taxes: current.taxes.map((item) => item.id === id ? { ...item, status: 'Pagada' } : item), entries: [entry, ...current.entries], banks: [{ id: `BAN-${Date.now()}`, date: today, detail: `Pago fiscal ${tax.id}`, amount: -tax.amount, reconciled: false }, ...current.banks], audit: [auditEvent('Obligación pagada', `${tax.name} · ${formatMoney(tax.amount)} · asiento ${entry.number}`), ...current.audit] };
  });
  const registerBudgetExpense = (id: string) => { const raw = window.prompt('Importe ejecutado que deseas agregar:'); const amount = Number(raw); if (!raw || !Number.isFinite(amount) || amount <= 0) return; setState((current) => { const line = current.budgets.find((item) => item.id === id); return line ? { ...current, budgets: current.budgets.map((item) => item.id === id ? { ...item, actual: item.actual + amount } : item), audit: [auditEvent('Ejecución presupuestaria', `${line.area} · ${line.concept} · ${formatMoney(amount)}`), ...current.audit] } : current; }); };
  const toggleAsset = (id: string) => setState((current) => { const asset = current.assets.find((item) => item.id === id); if (!asset) return current; const status = asset.status === 'Activo' ? 'Baja' : 'Activo'; return { ...current, assets: current.assets.map((item) => item.id === id ? { ...item, status } : item), audit: [auditEvent(status === 'Baja' ? 'Baja de activo' : 'Reactivación de activo', `${asset.code} · ${asset.name}`), ...current.audit] }; });
  const ledgerLines = state.entries.flatMap((entry) => entry.lines.filter((line) => line.account === ledgerAccount).map((line) => ({ ...line, entry })));

  const management = useMemo(() => {
    const income = statementTotals.Ingreso;
    const expenses = statementTotals.Gasto;
    const profit = income - expenses;
    const margin = income > 0 ? (profit / income) * 100 : 0;
    const bankBalance = trialBalance.find((account) => account.code === '1110')?.balance || 0;
    const pendingTaxes = state.taxes.filter((tax) => tax.status === 'Pendiente' || tax.status === 'Presentada').reduce((sum, tax) => sum + tax.amount, 0);
    const projectedCash = bankBalance + totals.receivable - totals.payable - pendingTaxes;
    const plannedBudget = state.budgets.reduce((sum, line) => sum + line.planned, 0);
    const executedBudget = state.budgets.reduce((sum, line) => sum + line.actual, 0);
    const budgetUsage = plannedBudget > 0 ? (executedBudget / plannedBudget) * 100 : 0;
    const pendingReceivables = state.receivables.filter((item) => item.status === 'Pendiente');
    const dayMs = 86_400_000;
    const daysOverdue = (due: string) => Math.floor((new Date(`${today}T00:00:00`).getTime() - new Date(`${due}T00:00:00`).getTime()) / dayMs);
    const aging = [
      { name: 'Al día', value: pendingReceivables.filter((item) => daysOverdue(item.due) <= 0).reduce((sum, item) => sum + item.amount, 0) },
      { name: '1-30 días', value: pendingReceivables.filter((item) => daysOverdue(item.due) > 0 && daysOverdue(item.due) <= 30).reduce((sum, item) => sum + item.amount, 0) },
      { name: '31-60 días', value: pendingReceivables.filter((item) => daysOverdue(item.due) > 30 && daysOverdue(item.due) <= 60).reduce((sum, item) => sum + item.amount, 0) },
      { name: '+60 días', value: pendingReceivables.filter((item) => daysOverdue(item.due) > 60).reduce((sum, item) => sum + item.amount, 0) },
    ];
    const overdue = aging.slice(1).reduce((sum, bucket) => sum + bucket.value, 0);
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index));
      const key = date.toISOString().slice(0, 7);
      return { key, name: new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(date).replace('.', '') };
    });
    const trend = months.map((month) => {
      let monthIncome = 0; let monthExpense = 0;
      state.entries.filter((entry) => entry.status === 'Contabilizado' && entry.date.startsWith(month.key)).forEach((entry) => entry.lines.forEach((line) => {
        const type = state.accounts.find((account) => account.code === line.account)?.type;
        if (type === 'Ingreso') monthIncome += line.credit - line.debit;
        if (type === 'Gasto') monthExpense += line.debit - line.credit;
      }));
      return { name: month.name, Ingresos: monthIncome, Gastos: monthExpense, Resultado: monthIncome - monthExpense };
    });
    const unreconciled = state.banks.filter((item) => !item.reconciled).length;
    const alerts: Array<{ title: string; detail: string; level: 'critical' | 'warning' | 'info'; target: (typeof views)[number][0] }> = [];
    if (projectedCash < 0) alerts.push({ title: 'Caja proyectada negativa', detail: `Faltarían ${formatMoney(Math.abs(projectedCash))} después de compromisos.`, level: 'critical', target: 'bancos' });
    if (overdue > 0) alerts.push({ title: 'Cartera vencida', detail: `${formatMoney(overdue)} requiere gestión de cobro.`, level: 'critical', target: 'cartera' });
    if (unreconciled > 0) alerts.push({ title: 'Conciliación pendiente', detail: `${unreconciled} movimiento${unreconciled === 1 ? '' : 's'} sin validar.`, level: 'warning', target: 'bancos' });
    if (budgetUsage >= 85) alerts.push({ title: 'Presupuesto cerca del límite', detail: `La ejecución global llegó al ${budgetUsage.toFixed(1)}%.`, level: budgetUsage > 100 ? 'critical' : 'warning', target: 'presupuesto' });
    if (pendingTaxes > 0) alerts.push({ title: 'Obligaciones fiscales abiertas', detail: `${formatMoney(pendingTaxes)} pendientes de presentar o pagar.`, level: 'warning', target: 'impuestos' });
    if (!alerts.length) alerts.push({ title: 'Operación bajo control', detail: 'No hay excepciones financieras relevantes.', level: 'info', target: 'resumen' });
    let health = 100;
    if (projectedCash < 0) health -= 25;
    if (profit < 0) health -= 25;
    health -= Math.min(20, unreconciled * 4);
    health -= totals.receivable > 0 ? Math.min(20, (overdue / totals.receivable) * 20) : 0;
    if (budgetUsage > 100) health -= 15;
    const commitments = totals.payable + pendingTaxes;
    const coverage = commitments > 0 ? (Math.max(0, bankBalance) + totals.receivable) / commitments : 0;
    if (commitments > 0 && coverage < 1) health -= 15;
    return { income, expenses, profit, margin, bankBalance, pendingTaxes, projectedCash, plannedBudget, executedBudget, budgetUsage, overdue, aging, trend, alerts, coverage, health: Math.max(0, Math.round(health)) };
  }, [state, statementTotals, totals, trialBalance]);

  const operations = useMemo(() => {
    const purchases = operationalRecords.compras || [];
    const production = operationalRecords.produccion || [];
    const quality = operationalRecords.calidad || [];
    const logistics = operationalRecords.logistica || [];
    const warehouses = operationalRecords.almacenes || [];
    const maintenance = operationalRecords.mantenimiento || [];
    const planned = production.reduce((sum, item) => sum + (Number(item.planned) || 0), 0);
    const produced = production.reduce((sum, item) => sum + (Number(item.produced) || 0), 0);
    const released = quality.filter((item) => item.status === 'Aprobado').length;
    const purchaseCommitment = purchases.filter((item) => item.status !== 'Recibida').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    return [
      { module: 'compras', label: 'Compras comprometidas', value: formatMoney(purchaseCommitment), detail: `${purchases.filter((item) => item.status !== 'Recibida').length} órdenes abiertas`, risk: purchaseCommitment > management.projectedCash && purchaseCommitment > 0 },
      { module: 'produccion', label: 'Cumplimiento producción', value: `${planned > 0 ? Math.round(produced / planned * 100) : 0}%`, detail: `${compactMoney(produced)} de ${compactMoney(planned)} unidades`, risk: planned > 0 && produced / planned < 0.7 },
      { module: 'calidad', label: 'Liberación de calidad', value: `${quality.length ? Math.round(released / quality.length * 100) : 0}%`, detail: `${released} de ${quality.length} controles aprobados`, risk: quality.some((item) => item.status === 'Rechazado') },
      { module: 'logistica', label: 'Entregas completadas', value: `${logistics.length ? Math.round(logistics.filter((item) => item.status === 'Entregado').length / logistics.length * 100) : 0}%`, detail: `${logistics.filter((item) => item.status === 'En ruta').length} envíos en ruta`, risk: logistics.some((item) => item.status === 'Preparación') },
      { module: 'almacenes', label: 'Actividad de almacén', value: String(warehouses.length), detail: `${warehouses.filter((item) => item.status !== 'Completado').length} movimientos en proceso`, risk: warehouses.some((item) => item.status === 'Pendiente') },
      { module: 'mantenimiento', label: 'Mantenimiento abierto', value: String(maintenance.filter((item) => item.status !== 'Finalizado').length), detail: `${maintenance.filter((item) => item.status === 'Vencido').length} órdenes vencidas`, risk: maintenance.some((item) => item.status === 'Vencido') },
    ];
  }, [management.projectedCash, operationalRecords]);

  const tableShell = 'border border-[#a8c0d1] bg-white overflow-x-auto'; const th = 'px-2.5 py-2 text-left text-[10px] uppercase text-[#315a73] border-r border-[#bdd0dc] bg-[#dcecf5]'; const td = 'px-2.5 py-2 text-xs text-slate-600 border-r border-b border-[#dbe4e9]'; const action = 'text-[#24658d] underline underline-offset-2 hover:text-[#123f5e]';
  const Header = ({ title, note, button }: { title: string; note?: string; button?: React.ReactNode }) => <div className="flex items-center justify-between gap-3 mb-2"><div><h2 className="text-sm font-bold text-[#244d68]">{title}</h2>{note && <p className="text-[10px] text-slate-500">{note}</p>}</div>{button}</div>;

  const currentApp = accountingApps.find((app) => app.id === view);

  return <div className="max-w-full overflow-x-hidden bg-[#eef2f6] min-h-screen">
    {view !== 'apps' && (
      <div className="border-b border-slate-200 bg-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('apps')}
            className="h-8 gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold border-slate-200 rounded-lg text-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
            <span>Aplicaciones</span>
          </Button>
          <div className="h-5 w-px bg-slate-200" />
          {currentApp && (
            <div className="flex items-center gap-2">
              <div className={cn("w-6 h-6 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-xs shadow-sm", currentApp.gradient)}>
                {React.createElement(currentApp.icon, { className: "w-3.5 h-3.5" })}
              </div>
              <span className="text-sm font-bold text-slate-800">{currentApp.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={view}
            onChange={(event) => setView(event.target.value as any)}
            className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 font-medium text-slate-700 focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {accountingApps.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    )}

    {view === 'apps' && (
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-7 sm:py-7">
        <div className="mb-6 border-b border-slate-200 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Suite financiera</p>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Contabilidad y gestión</h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                Accede a cada proceso contable desde un único centro de trabajo.
              </p>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={appSearchTerm}
                onChange={(event) => setAppSearchTerm(event.target.value)}
                placeholder="Buscar una aplicación"
                className="h-10 rounded-md border-slate-300 bg-white pl-9 text-sm shadow-none"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
            {([
              ['todas', 'Todas'],
              ['operativa', 'Operación'],
              ['libros', 'Libros contables'],
              ['fiscal', 'Fiscal e informes'],
              ['gestion', 'Planeación y control'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setAppCategoryFilter(id)}
                className={cn(
                  'shrink-0 border px-3 py-1.5 text-[11px] font-semibold transition-colors',
                  appCategoryFilter === id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-x-3 gap-y-7 sm:grid-cols-4 sm:gap-x-6 md:grid-cols-5 lg:grid-cols-7">
          {filteredApps.map((app) => {
            const AppIcon = app.icon;
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => setView(app.id)}
                title={`${app.name}: ${app.subtitle}`}
                className="group flex min-w-0 flex-col items-center text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4"
              >
                <div className="relative flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-slate-300 group-hover:shadow-[0_8px_18px_rgba(15,23,42,0.12)] sm:h-[76px] sm:w-[76px]">
                  <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', app.gradient)} />
                  <div className={cn('relative flex h-11 w-11 items-center justify-center rounded-md bg-gradient-to-br text-white shadow-sm', app.gradient)}>
                    <AppIcon className="h-6 w-6" strokeWidth={1.8} />
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-slate-900">
                      <span className="h-1 w-1 rounded-full bg-white" />
                    </span>
                  </div>
                </div>
                <span className="mt-2.5 line-clamp-2 max-w-[100px] text-[11px] font-semibold leading-4 text-slate-700 transition-colors group-hover:text-blue-700 sm:text-xs">
                  {app.name}
                </span>
              </button>
            );
          })}
        </div>
        {filteredApps.length === 0 && (
          <div className="border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <Search className="mx-auto mb-3 h-7 w-7 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No encontramos esa aplicación</p>
            <button type="button" onClick={() => { setAppSearchTerm(''); setAppCategoryFilter('todas'); }} className="mt-2 text-xs font-semibold text-blue-700 hover:underline">
              Ver todas las aplicaciones
            </button>
          </div>
        )}
      </div>
    )}

    {view !== 'apps' && (
      <div className="p-2 sm:p-3 min-h-[520px]">
      {view === 'resumen' && <>
        <div className="flex flex-col gap-2 border border-[#9fb9ca] bg-gradient-to-r from-[#d9edf8] to-white p-3 sm:px-4 sm:py-3 mb-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#39708f]">Tablero de dirección financiera</p><h2 className="text-base sm:text-lg font-bold leading-tight text-[#173f5b]">Qué está pasando y dónde actuar</h2><p className="mt-1 text-[10px] sm:text-[11px] text-slate-500">Información calculada desde contabilidad, cartera, bancos, impuestos y presupuesto.</p></div>
          <div className="flex items-center gap-3 border border-[#abc4d4] bg-white px-3 sm:px-4 py-2">
            <Gauge className={cn('h-7 w-7 sm:h-8 sm:w-8', management.health >= 80 ? 'text-emerald-600' : management.health >= 60 ? 'text-amber-600' : 'text-red-600')} />
            <div><p className="text-[10px] uppercase text-slate-500">Salud financiera</p><p className="text-2xl font-black text-[#214f6d]">{management.health}<span className="text-xs font-medium text-slate-400">/100</span></p></div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Ingresos', value: management.income, detail: 'Ventas contabilizadas', icon: TrendingUp, tone: 'text-emerald-700' },
            { label: 'Gastos', value: management.expenses, detail: 'Gasto reconocido', icon: TrendingDown, tone: 'text-red-700' },
            { label: 'Resultado', value: management.profit, detail: `Margen ${management.margin.toFixed(1)}%`, icon: CircleDollarSign, tone: management.profit >= 0 ? 'text-emerald-700' : 'text-red-700' },
            { label: 'Caja proyectada', value: management.projectedCash, detail: 'Banco + cobros − pagos − impuestos', icon: Landmark, tone: management.projectedCash >= 0 ? 'text-[#245878]' : 'text-red-700' },
          ].map((metric) => <div key={metric.label} className="border border-[#a8c0d1] bg-white">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#c8d7e0] bg-[#e8f2f7]"><span className="text-[10px] font-bold uppercase text-[#315a73]">{metric.label}</span><metric.icon className={cn('h-4 w-4', metric.tone)} /></div>
            <div className="p-3"><p className={cn('text-xl font-black', metric.tone)}>{formatMoney(metric.value)}</p><p className="mt-1 text-[10px] text-slate-500">{metric.detail}</p></div>
          </div>)}
        </div>

        <div className="grid xl:grid-cols-[1.55fr_1fr] gap-3 mb-3">
          <section className="border border-[#a8c0d1] bg-white">
            <div className="flex items-center justify-between px-3 py-2 bg-[#dcecf5] border-b border-[#a8c0d1]"><h3 className="text-xs font-bold text-[#244d68]">Ingresos, gastos y resultado · últimos 6 meses</h3><span className="text-[10px] text-slate-500">Base: libro diario</span></div>
            <div className="h-52 sm:h-64 p-2 sm:p-3">
              <ResponsiveContainer width="100%" height="100%"><ComposedChart data={management.trend} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}><CartesianGrid stroke="#dbe5eb" strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={compactMoney} /><ChartTooltip formatter={(value: number) => formatMoney(value)} /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="Ingresos" fill="#2f8b68" /><Bar dataKey="Gastos" fill="#d66b5e" /><Line type="monotone" dataKey="Resultado" stroke="#245878" strokeWidth={2} dot={{ r: 3 }} /></ComposedChart></ResponsiveContainer>
            </div>
          </section>
          <section className="border border-[#a8c0d1] bg-white">
            <div className="px-3 py-2 bg-[#dcecf5] border-b border-[#a8c0d1]"><h3 className="text-xs font-bold text-[#244d68]">Caja y compromisos</h3></div>
            <div className="p-3 space-y-3 text-xs">
              {[
                ['Saldo bancario contable', management.bankBalance, 'text-[#214f6d]'],
                ['Cobros pendientes', totals.receivable, 'text-emerald-700'],
                ['Pagos a proveedores', -totals.payable, 'text-red-700'],
                ['Impuestos pendientes', -management.pendingTaxes, 'text-red-700'],
              ].map(([label, value, color]) => <div key={String(label)} className="flex justify-between border-b border-dashed border-slate-200 pb-2"><span className="text-slate-600">{label}</span><strong className={String(color)}>{formatMoney(Number(value))}</strong></div>)}
              <div className="flex justify-between bg-[#eaf3f8] border border-[#bdd0dc] p-2"><strong>Caja proyectada</strong><strong className={management.projectedCash >= 0 ? 'text-emerald-700' : 'text-red-700'}>{formatMoney(management.projectedCash)}</strong></div>
            </div>
          </section>
        </div>

        <div className="grid xl:grid-cols-3 gap-3 mb-3">
          <section className="border border-[#a8c0d1] bg-white">
            <div className="px-3 py-2 bg-[#dcecf5] border-b border-[#a8c0d1]"><h3 className="text-xs font-bold text-[#244d68]">Antigüedad de cartera</h3></div>
            <div className="p-3 space-y-2">{management.aging.map((bucket, index) => { const width = totals.receivable > 0 ? bucket.value / totals.receivable * 100 : 0; return <div key={bucket.name}><div className="flex justify-between text-[10px]"><span>{bucket.name}</span><strong>{formatMoney(bucket.value)}</strong></div><div className="mt-1 h-2 bg-slate-100"><div className={cn('h-full', index === 0 ? 'bg-emerald-500' : index < 3 ? 'bg-amber-500' : 'bg-red-600')} style={{ width: `${Math.min(100, width)}%` }} /></div></div>; })}<button onClick={() => setView('cartera')} className={`${action} text-[11px] mt-2`}>Gestionar cartera →</button></div>
          </section>
          <section className="border border-[#a8c0d1] bg-white">
            <div className="px-3 py-2 bg-[#dcecf5] border-b border-[#a8c0d1]"><h3 className="text-xs font-bold text-[#244d68]">Ejecución presupuestaria</h3></div>
            <div className="p-3"><div className="flex items-end justify-between"><div><p className="text-[10px] text-slate-500">Ejecutado</p><p className="text-lg font-black text-[#214f6d]">{formatMoney(management.executedBudget)}</p></div><strong className={management.budgetUsage > 100 ? 'text-red-700' : 'text-[#245878]'}>{management.budgetUsage.toFixed(1)}%</strong></div><div className="h-3 bg-slate-100 mt-3"><div className={cn('h-full', management.budgetUsage > 100 ? 'bg-red-600' : management.budgetUsage >= 85 ? 'bg-amber-500' : 'bg-[#397da8]')} style={{ width: `${Math.min(100, management.budgetUsage)}%` }} /></div><div className="flex justify-between mt-2 text-[10px] text-slate-500"><span>Plan: {formatMoney(management.plannedBudget)}</span><span>Disponible: {formatMoney(management.plannedBudget - management.executedBudget)}</span></div><button onClick={() => setView('presupuesto')} className={`${action} text-[11px] mt-3`}>Ver presupuesto →</button></div>
          </section>
          <section className="border border-[#a8c0d1] bg-white">
            <div className="px-3 py-2 bg-[#dcecf5] border-b border-[#a8c0d1]"><h3 className="text-xs font-bold text-[#244d68]">Control contable</h3></div>
            <div className="p-3 space-y-2 text-xs"><p className="flex justify-between border-b pb-2"><span>Partida doble</span><strong className={totals.debit === totals.credit ? 'text-emerald-700' : 'text-red-700'}>{totals.debit === totals.credit ? 'Balanceada' : 'Descuadrada'}</strong></p><p className="flex justify-between border-b pb-2"><span>Cobertura de compromisos</span><strong className={management.coverage >= 1 ? 'text-emerald-700' : 'text-red-700'}>{management.coverage.toFixed(2)}×</strong></p><p className="flex justify-between border-b pb-2"><span>Movimientos sin conciliar</span><strong>{state.banks.filter((item) => !item.reconciled).length}</strong></p><p className="flex justify-between border-b pb-2"><span>Período vigente</span><strong>{state.periods.find((period) => period.status === 'Abierto')?.name || 'Sin período abierto'}</strong></p><p className="flex justify-between"><span>Eventos auditados</span><strong>{state.audit.length}</strong></p></div>
          </section>
        </div>

        {onOpenModule && <section className="border border-[#a8c0d1] bg-white mb-3">
          <div className="flex items-center justify-between px-3 py-2 bg-[#dcecf5] border-b border-[#a8c0d1]"><h3 className="text-xs font-bold text-[#244d68]">Pulso operativo de la empresa</h3><span className="text-[10px] text-slate-500">Datos en vivo de cada área</span></div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3">{operations.map((item, index) => <button key={item.module} onClick={() => onOpenModule?.(item.module)} className={cn('p-3 text-left hover:bg-[#edf6fb]', index % 3 !== 0 && 'xl:border-l border-[#dbe4e9]', index >= 3 && 'border-t border-[#dbe4e9]', index % 2 !== 0 && 'sm:border-l xl:border-l-0', item.risk && 'bg-amber-50/50')}><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-[#315a73]">{item.label}</span><span className={cn('h-2 w-2 rounded-full', item.risk ? 'bg-amber-500' : 'bg-emerald-500')} /></div><p className={cn('mt-1 text-xl font-black', item.risk ? 'text-amber-700' : 'text-[#214f6d]')}>{item.value}</p><p className="text-[10px] text-slate-500">{item.detail}</p><span className="mt-2 inline-block text-[10px] font-semibold text-[#24658d]">Abrir módulo →</span></button>)}</div>
        </section>}

        <section className="border border-[#a8c0d1] bg-white">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#dcecf5] border-b border-[#a8c0d1]"><AlertTriangle className="h-4 w-4 text-amber-600" /><h3 className="text-xs font-bold text-[#244d68]">Excepciones que requieren decisión</h3></div>
          <div className="divide-y divide-[#dbe4e9]">{management.alerts.map((alert, index) => <button key={`${alert.title}-${index}`} onClick={() => setView(alert.target)} className="w-full grid sm:grid-cols-[12px_1fr_auto] items-center gap-3 px-3 py-2 text-left hover:bg-[#edf6fb]"><span className={cn('h-2.5 w-2.5 rounded-full', alert.level === 'critical' ? 'bg-red-500' : alert.level === 'warning' ? 'bg-amber-500' : 'bg-emerald-500')} /><span><strong className="block text-xs text-slate-700">{alert.title}</strong><span className="text-[10px] text-slate-500">{alert.detail}</span></span><span className="text-[10px] font-semibold text-[#24658d]">Resolver →</span></button>)}</div>
        </section>
      </>}
      {view === 'plan' && <><Header title="Plan de cuentas" button={<Button size="sm" onClick={() => setAccountOpen(true)} className="h-7 rounded-none bg-[#397da8]"><Plus className="h-3.5 w-3.5 mr-1" />Nueva cuenta</Button>} /><div className={tableShell}><table className="w-full"><thead><tr>{['Código', 'Cuenta', 'Naturaleza', 'Débito', 'Crédito', 'Saldo'].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{trialBalance.map((account) => <tr key={account.code}><td className={`${td} font-bold text-[#245878]`}>{account.code}</td><td className={td}>{account.name}</td><td className={td}>{account.type}</td><td className={`${td} text-right`}>{formatMoney(account.debit)}</td><td className={`${td} text-right`}>{formatMoney(account.credit)}</td><td className={`${td} text-right font-bold`}>{formatMoney(account.balance)}</td></tr>)}</tbody></table></div></>}
      {view === 'asientos' && <><Header title="Libro diario" button={<Button size="sm" onClick={() => setEntryOpen(true)} className="h-7 rounded-none bg-[#397da8]"><Plus className="h-3.5 w-3.5 mr-1" />Nuevo asiento</Button>} /><div className={tableShell}><table className="w-full"><thead><tr>{['Número', 'Fecha', 'Referencia', 'Detalle', 'Débito', 'Crédito', 'Estado'].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{state.entries.map((entry) => <tr key={entry.id}><td className={`${td} font-bold`}>{entry.number}</td><td className={td}>{entry.date}</td><td className={td}>{entry.reference}</td><td className={td}>{entry.description}</td><td className={`${td} text-right`}>{formatMoney(entry.lines.reduce((sum, line) => sum + line.debit, 0))}</td><td className={`${td} text-right`}>{formatMoney(entry.lines.reduce((sum, line) => sum + line.credit, 0))}</td><td className={td}><span className="border border-emerald-300 bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px]">{entry.status}</span></td></tr>)}</tbody></table></div></>}
      {view === 'mayor' && <><Header title="Libro mayor" button={<select value={ledgerAccount} onChange={(event) => setLedgerAccount(event.target.value)} className="h-8 border border-[#a8c0d1] bg-white px-2 text-xs">{state.accounts.map((account) => <option key={account.code} value={account.code}>{account.code} · {account.name}</option>)}</select>} /><div className={tableShell}><table className="w-full"><thead><tr>{['Fecha', 'Comprobante', 'Descripción', 'Débito', 'Crédito'].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{ledgerLines.map(({ entry, debit, credit }, index) => <tr key={`${entry.id}-${index}`}><td className={td}>{entry.date}</td><td className={td}>{entry.number}</td><td className={td}>{entry.description}</td><td className={`${td} text-right`}>{formatMoney(debit)}</td><td className={`${td} text-right`}>{formatMoney(credit)}</td></tr>)}</tbody></table></div></>}
      {view === 'cartera' && <div className="grid xl:grid-cols-2 gap-3">{([['Cuentas por cobrar', 'receivables'], ['Cuentas por pagar', 'payables']] as const).map(([title, kind]) => <div key={kind} className={tableShell}><div className="px-3 py-2 text-xs font-bold text-[#244d68] bg-[#dcecf5] border-b border-[#a8c0d1]">{title}</div><table className="w-full"><thead><tr>{['Tercero', 'Documento', 'Vence', 'Saldo', 'Acción'].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{state[kind].map((item) => <tr key={item.id}><td className={td}>{item.party}</td><td className={td}>{item.document}</td><td className={td}>{item.due}</td><td className={`${td} text-right font-bold`}>{formatMoney(item.amount)}</td><td className={td}>{item.status === 'Pendiente' ? <button onClick={() => settle(kind, item.id)} className={action}>Aplicar pago</button> : <span className={item.status === 'Pagado' ? 'text-emerald-700' : 'text-slate-400'}>{item.status}</span>}</td></tr>)}</tbody></table></div>)}</div>}
      {view === 'bancos' && <><Header title="Conciliación bancaria" note="Los cobros y pagos generan movimientos pendientes de conciliación" /><div className={tableShell}><table className="w-full"><thead><tr>{['Fecha', 'Detalle bancario', 'Importe', 'Estado', 'Acción'].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{state.banks.map((item) => <tr key={item.id}><td className={td}>{item.date}</td><td className={td}>{item.detail}</td><td className={`${td} text-right font-bold ${item.amount < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatMoney(item.amount)}</td><td className={td}>{item.reconciled ? 'Conciliado' : 'Pendiente'}</td><td className={td}><button onClick={() => reconcile(item.id)} className={action}>{item.reconciled ? 'Deshacer' : 'Conciliar'}</button></td></tr>)}</tbody></table></div></>}
      {view === 'facturacion' && <><Header title="Facturación y comprobantes" note="Emitir alimenta cartera, impuestos y libro diario automáticamente" button={<Button size="sm" onClick={() => setInvoiceOpen(true)} className="h-7 rounded-none bg-[#397da8]"><Plus className="h-3.5 w-3.5 mr-1" />Nueva factura</Button>} /><div className={tableShell}><table className="w-full"><thead><tr>{['Número', 'Cliente', 'Fecha', 'Vence', 'Neto', 'Impuesto', 'Total', 'Estado', 'Control'].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{state.invoices.map((invoice) => <tr key={invoice.id}><td className={`${td} font-bold text-[#245878]`}>{invoice.number}</td><td className={td}>{invoice.customer}</td><td className={td}>{invoice.date}</td><td className={td}>{invoice.due}</td><td className={`${td} text-right`}>{formatMoney(invoice.net)}</td><td className={`${td} text-right`}>{formatMoney(invoice.tax)}</td><td className={`${td} text-right font-bold`}>{formatMoney(invoice.total)}</td><td className={td}>{invoice.status}</td><td className={td}>{invoice.status === 'Borrador' ? <button onClick={() => issueInvoice(invoice.id)} className={action}>Emitir</button> : invoice.status === 'Emitida' ? <button onClick={() => voidInvoice(invoice.id)} className="text-red-700 underline underline-offset-2">Anular</button> : <span className="text-slate-400">Sin acciones</span>}</td></tr>)}</tbody></table></div></>}
      {view === 'impuestos' && <><Header title="Agenda impositiva" note="El pago genera asiento y egreso bancario" /><div className={tableShell}><table className="w-full"><thead><tr>{['Obligación', 'Origen', 'Período', 'Vencimiento', 'Importe', 'Estado', 'Acción'].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{state.taxes.map((tax) => <tr key={tax.id}><td className={`${td} font-bold`}>{tax.name}</td><td className={td}>{tax.source || 'Carga manual'}</td><td className={td}>{tax.period}</td><td className={td}>{tax.due}</td><td className={`${td} text-right font-bold`}>{formatMoney(tax.amount)}</td><td className={td}>{tax.status}</td><td className={td}>{tax.status === 'Pendiente' || tax.status === 'Presentada' ? <button onClick={() => advanceTax(tax.id)} className={action}>{tax.status === 'Pendiente' ? 'Marcar presentada' : 'Registrar pago'}</button> : <span className={tax.status === 'Pagada' ? 'text-emerald-700' : 'text-slate-400'}>{tax.status === 'Pagada' ? 'Cumplida' : 'Sin acciones'}</span>}</td></tr>)}</tbody></table></div></>}
      {view === 'estados' && <><div className="grid md:grid-cols-2 xl:grid-cols-5 gap-2 mb-3">{(['Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Gasto'] as const).map((type) => <div key={type} className="border border-[#a8c0d1] bg-white p-3"><p className="text-[10px] uppercase text-slate-500">{type}</p><strong className="text-[#214f6d]">{formatMoney(statementTotals[type])}</strong></div>)}</div><Header title="Balance de sumas y saldos" /><div className={tableShell}><table className="w-full"><thead><tr>{['Cuenta', 'Nombre', 'Débitos', 'Créditos', 'Saldo'].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{trialBalance.filter((account) => account.debit || account.credit).map((account) => <tr key={account.code}><td className={td}>{account.code}</td><td className={td}>{account.name}</td><td className={`${td} text-right`}>{formatMoney(account.debit)}</td><td className={`${td} text-right`}>{formatMoney(account.credit)}</td><td className={`${td} text-right font-bold`}>{formatMoney(account.balance)}</td></tr>)}</tbody><tfoot><tr className="bg-[#e0edf5] font-bold"><td className={td} colSpan={2}>TOTAL</td><td className={`${td} text-right`}>{formatMoney(totals.debit)}</td><td className={`${td} text-right`}>{formatMoney(totals.credit)}</td><td className={`${td} text-right`}>{formatMoney(totals.debit - totals.credit)}</td></tr></tfoot></table></div></>}
      {view === 'presupuesto' && <><Header title="Control presupuestario" note="Registra ejecución y controla desviaciones por área" /><div className={tableShell}><table className="w-full"><thead><tr>{['Área', 'Concepto', 'Planificado', 'Ejecutado', 'Disponible', 'Ejecución', 'Control'].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{state.budgets.map((line) => { const percentage = Math.round(line.actual / line.planned * 100); return <tr key={line.id}><td className={`${td} font-bold`}>{line.area}</td><td className={td}>{line.concept}</td><td className={`${td} text-right`}>{formatMoney(line.planned)}</td><td className={`${td} text-right`}>{formatMoney(line.actual)}</td><td className={`${td} text-right font-bold ${line.actual > line.planned ? 'text-red-700' : ''}`}>{formatMoney(line.planned - line.actual)}</td><td className={td}><div className="flex items-center gap-2"><div className="w-24 h-1.5 bg-slate-200"><div className={cn('h-full', percentage > 100 ? 'bg-red-500' : 'bg-[#397da8]')} style={{ width: `${Math.min(percentage, 100)}%` }} /></div>{percentage}%</div></td><td className={td}><button onClick={() => registerBudgetExpense(line.id)} className={action}>Registrar gasto</button></td></tr>; })}</tbody></table></div></>}
      {view === 'activos' && <><Header title="Registro y depreciación de activos fijos" /><div className={tableShell}><table className="w-full"><thead><tr>{['Código', 'Activo', 'Fecha de alta', 'Valor original', 'Vida útil', 'Depreciación anual', 'Estado', 'Control'].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{state.assets.map((asset) => <tr key={asset.id}><td className={`${td} font-bold text-[#245878]`}>{asset.code}</td><td className={td}>{asset.name}</td><td className={td}>{asset.acquired}</td><td className={`${td} text-right`}>{formatMoney(asset.value)}</td><td className={td}>{asset.years} años</td><td className={`${td} text-right font-bold`}>{formatMoney(asset.value / asset.years)}</td><td className={td}>{asset.status}</td><td className={td}><button onClick={() => toggleAsset(asset.id)} className={asset.status === 'Activo' ? 'text-red-700 underline' : action}>{asset.status === 'Activo' ? 'Dar de baja' : 'Reactivar'}</button></td></tr>)}</tbody></table></div></>}
      {view === 'costos' && <><Header title="Contabilidad analítica por centro de costo" /><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">{state.costCenters.map((center) => { const usage = Math.round(center.actual / center.budget * 100); return <div key={center.id} className="border border-[#a8c0d1] bg-white"><div className="px-3 py-2 bg-[#dcecf5] border-b border-[#a8c0d1] text-xs font-bold text-[#244d68]">{center.code} · {center.name}</div><div className="p-3 text-xs space-y-2"><div className="flex justify-between"><span>Presupuesto</span><strong>{formatMoney(center.budget)}</strong></div><div className="flex justify-between"><span>Ejecutado</span><strong>{formatMoney(center.actual)}</strong></div><div className="h-2 bg-slate-200"><div className={cn('h-full', usage > 100 ? 'bg-red-500' : 'bg-[#397da8]')} style={{ width: `${Math.min(usage, 100)}%` }} /></div><p className="text-right text-[10px] text-slate-500">{usage}% ejecutado</p></div></div>; })}</div></>}
      {view === 'cierres' && <><Header title="Períodos contables y auditoría" /><div className={tableShell}><table className="w-full"><thead><tr>{['Período', 'Estado', 'Fecha de cierre', 'Control'].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{state.periods.map((period) => <tr key={period.id}><td className={`${td} font-bold`}>{period.name}</td><td className={td}>{period.status}</td><td className={td}>{period.closedAt || '—'}</td><td className={td}><button onClick={() => togglePeriod(period.id)} className={action}>{period.status === 'Abierto' ? 'Cerrar período' : 'Reabrir con auditoría'}</button></td></tr>)}</tbody></table></div><h3 className="text-xs font-bold text-[#244d68] mt-4 mb-2">Registro de auditoría</h3><div className={tableShell}><table className="w-full"><thead><tr>{['Fecha', 'Acción', 'Detalle'].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{state.audit.map((event) => <tr key={event.id}><td className={td}>{event.date}</td><td className={`${td} font-bold`}>{event.action}</td><td className={td}>{event.detail}</td></tr>)}</tbody></table></div></>}
      {view === 'operacion' && <React.Suspense fallback={<div className="flex min-h-64 items-center justify-center border border-[#a8c0d1] bg-white text-xs font-semibold text-slate-500">Cargando caja y comprobantes...</div>}><OperationalAccounting embedded /></React.Suspense>}
    </div>)}
    <Dialog open={entryOpen} onOpenChange={setEntryOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Nuevo asiento contable</DialogTitle></DialogHeader><div className="grid sm:grid-cols-2 gap-3">{[['date', 'Fecha', 'date'], ['reference', 'Referencia', 'text'], ['description', 'Descripción', 'text'], ['amount', 'Importe', 'number']].map(([key, label, type]) => <div key={key} className="space-y-1"><Label>{label}</Label><Input type={type} value={entryForm[key as keyof typeof entryForm]} onChange={(event) => setEntryForm((current) => ({ ...current, [key]: event.target.value }))} /></div>)}<div className="space-y-1"><Label>Cuenta débito</Label><select value={entryForm.debitAccount} onChange={(event) => setEntryForm((current) => ({ ...current, debitAccount: event.target.value }))} className="w-full h-10 border rounded px-2 text-sm">{state.accounts.map((account) => <option key={account.code} value={account.code}>{account.code} · {account.name}</option>)}</select></div><div className="space-y-1"><Label>Cuenta crédito</Label><select value={entryForm.creditAccount} onChange={(event) => setEntryForm((current) => ({ ...current, creditAccount: event.target.value }))} className="w-full h-10 border rounded px-2 text-sm">{state.accounts.map((account) => <option key={account.code} value={account.code}>{account.code} · {account.name}</option>)}</select></div></div><DialogFooter><Button variant="outline" onClick={() => setEntryOpen(false)}>Cancelar</Button><Button onClick={saveEntry}><Check className="h-4 w-4 mr-1" />Contabilizar</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={accountOpen} onOpenChange={setAccountOpen}><DialogContent><DialogHeader><DialogTitle>Nueva cuenta contable</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>Código</Label><Input value={accountForm.code} onChange={(event) => setAccountForm((current) => ({ ...current, code: event.target.value }))} /></div><div><Label>Nombre</Label><Input value={accountForm.name} onChange={(event) => setAccountForm((current) => ({ ...current, name: event.target.value }))} /></div><div><Label>Naturaleza</Label><select value={accountForm.type} onChange={(event) => setAccountForm((current) => ({ ...current, type: event.target.value as Account['type'] }))} className="w-full h-10 border rounded px-2 text-sm">{['Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Gasto'].map((type) => <option key={type}>{type}</option>)}</select></div></div><DialogFooter><Button variant="outline" onClick={() => setAccountOpen(false)}>Cancelar</Button><Button onClick={saveAccount}>Guardar cuenta</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}><DialogContent><DialogHeader><DialogTitle>Nueva factura de venta</DialogTitle></DialogHeader><div className="grid sm:grid-cols-2 gap-3"><div className="sm:col-span-2"><Label>Cliente</Label><Input value={invoiceForm.customer} onChange={(event) => setInvoiceForm((current) => ({ ...current, customer: event.target.value }))} placeholder="Razón social" /></div><div><Label>Fecha de emisión</Label><Input type="date" value={invoiceForm.date} onChange={(event) => setInvoiceForm((current) => ({ ...current, date: event.target.value }))} /></div><div><Label>Fecha de vencimiento</Label><Input type="date" value={invoiceForm.due} onChange={(event) => setInvoiceForm((current) => ({ ...current, due: event.target.value }))} /></div><div><Label>Importe neto</Label><Input type="number" min="0" value={invoiceForm.net} onChange={(event) => setInvoiceForm((current) => ({ ...current, net: event.target.value }))} /></div><div><Label>Impuesto</Label><Input type="number" min="0" value={invoiceForm.tax} onChange={(event) => setInvoiceForm((current) => ({ ...current, tax: event.target.value }))} /></div><div className="sm:col-span-2 border border-[#c9d8e2] bg-[#edf5f9] p-3 text-right text-sm"><span className="text-slate-500 mr-3">Total</span><strong>{formatMoney((Number(invoiceForm.net) || 0) + (Number(invoiceForm.tax) || 0))}</strong></div></div><DialogFooter><Button variant="outline" onClick={() => setInvoiceOpen(false)}>Cancelar</Button><Button onClick={saveInvoice}>Guardar borrador</Button></DialogFooter></DialogContent></Dialog>
  </div>;
};
export default AccountingManager;
