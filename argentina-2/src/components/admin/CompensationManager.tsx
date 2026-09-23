import React, { useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, Banknote, CheckCircle2, Download, RefreshCw, Settings2, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveAgencyId, isItemForAgency, isOrderForAgency } from '@/lib/agency-isolation';
import { formatCurrency } from '@/lib/currency';

type Employee = { id: string; name: string; email?: string };
type Sale = { id: string; employeeId?: string; employeeName?: string; total: number; date: string; status: string };
type CompensationProfile = { baseSalary: number; commissionRate: number };
type PayrollAdjustment = { bonus: number; deductions: number };
type PayrollStatus = 'Borrador' | 'Aprobada' | 'Pagada';
type PayrollRun = {
  id: string;
  period: string;
  employeeId: string;
  employeeName: string;
  sales: number;
  commission: number;
  baseSalary: number;
  bonus: number;
  deductions: number;
  net: number;
  status: PayrollStatus;
  approvedAt?: string;
  paidAt?: string;
  paymentAccount?: string;
};

const eligibleStatuses = new Set(['confirmed', 'completed', 'paid', 'entregado', 'completado', 'confirmado']);
const money = formatCurrency;
const currentPeriod = new Date().toISOString().slice(0, 7);

const readStorage = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; }
};

export const CompensationManager: React.FC = () => {
  const { user } = useAuth();
  const activeAgencyId = useMemo(() => getActiveAgencyId(user), [user]);
  const profileKey = `merco-compensation-profiles-v1-${activeAgencyId || '2'}`;
  const adjustmentKey = `merco-payroll-adjustments-v1-${activeAgencyId || '2'}`;
  const payrollKey = `merco-payroll-runs-v1-${activeAgencyId || '2'}`;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [profiles, setProfiles] = useState<Record<string, CompensationProfile>>(() => readStorage(profileKey, {}));
  const [adjustments, setAdjustments] = useState<Record<string, PayrollAdjustment>>(() => readStorage(adjustmentKey, {}));
  const [runs, setRuns] = useState<PayrollRun[]>(() => readStorage(payrollKey, []));
  const [period, setPeriod] = useState(currentPeriod);
  const [paymentAccount, setPaymentAccount] = useState('1110');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [employeeResult, orderResult] = await Promise.all([
        db.from('empleados').select('*'),
        db.from('orders').select('*'),
      ]);
      if (employeeResult.error) throw employeeResult.error;
      if (orderResult.error) throw orderResult.error;

      const rawEmployees = (employeeResult.data || []).filter((item: any) => isItemForAgency(item, activeAgencyId));
      const rawOrders = (orderResult.data || []).filter((item: any) => isOrderForAgency(item, activeAgencyId));

      const normalizedEmployees: Employee[] = rawEmployees.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        name: String(item.nombre || item.name || item.email || 'Sin nombre'),
        email: item.email ? String(item.email) : undefined,
      }));
      const normalizedSales: Sale[] = rawOrders.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        employeeId: item.employee_id || item.employeeId ? String(item.employee_id || item.employeeId) : undefined,
        employeeName: item.employee_name || item.employeeName ? String(item.employee_name || item.employeeName) : undefined,
        total: Number(item.total || 0),
        date: String(item.created_at || item.createdAt || ''),
        status: String(item.status || '').toLowerCase(),
      }));

      const knownIds = new Set(normalizedEmployees.map((employee) => employee.id));
      normalizedSales.forEach((sale) => {
        if (sale.employeeId && !knownIds.has(sale.employeeId)) {
          knownIds.add(sale.employeeId);
          normalizedEmployees.push({ id: sale.employeeId, name: sale.employeeName || 'Vendedor sin ficha' });
        }
      });
      normalizedEmployees.sort((a, b) => a.name.localeCompare(b.name, 'es'));
      setEmployees(normalizedEmployees);
      setSales(normalizedSales);
    } catch (error) {
      console.error('Error loading compensation data:', error);
      toast({ title: 'No se pudo cargar compensación', description: 'Revisa la conexión con empleados y ventas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [activeAgencyId]);
  useEffect(() => { localStorage.setItem(profileKey, JSON.stringify(profiles)); }, [profiles, profileKey]);
  useEffect(() => { localStorage.setItem(adjustmentKey, JSON.stringify(adjustments)); }, [adjustments, adjustmentKey]);
  useEffect(() => { localStorage.setItem(payrollKey, JSON.stringify(runs)); }, [runs, payrollKey]);

  const periodSales = useMemo(() => sales.filter((sale) => sale.date.slice(0, 7) === period && eligibleStatuses.has(sale.status)), [period, sales]);
  const unassignedSales = periodSales.filter((sale) => !sale.employeeId).reduce((sum, sale) => sum + sale.total, 0);

  const rows = useMemo(() => employees.map((employee) => {
    const profile = profiles[employee.id] || { baseSalary: 0, commissionRate: 0 };
    const adjustment = adjustments[`${period}:${employee.id}`] || { bonus: 0, deductions: 0 };
    const employeeSales = periodSales.filter((sale) => sale.employeeId === employee.id).reduce((sum, sale) => sum + sale.total, 0);
    const commission = Math.round(employeeSales * profile.commissionRate / 100);
    const net = Math.max(0, profile.baseSalary + commission + adjustment.bonus - adjustment.deductions);
    const saved = runs.find((run) => run.period === period && run.employeeId === employee.id);
    return saved || { id: `${period}-${employee.id}`, period, employeeId: employee.id, employeeName: employee.name, sales: employeeSales, commission, ...profile, ...adjustment, net, status: 'Borrador' as PayrollStatus };
  }), [adjustments, employees, period, periodSales, profiles, runs]);

  const updateProfile = (employeeId: string, key: keyof CompensationProfile, rawValue: string) => {
    const value = Math.max(0, Number(rawValue) || 0);
    setProfiles((current) => ({ ...current, [employeeId]: { baseSalary: 0, commissionRate: 0, ...current[employeeId], [key]: key === 'commissionRate' ? Math.min(100, value) : value } }));
  };

  const updateAdjustment = (employeeId: string, key: keyof PayrollAdjustment, rawValue: string) => {
    const value = Math.max(0, Number(rawValue) || 0);
    const adjKey = `${period}:${employeeId}`;
    setAdjustments((current) => ({ ...current, [adjKey]: { bonus: 0, deductions: 0, ...current[adjKey], [key]: value } }));
  };

  const approve = (row: PayrollRun) => {
    if (row.net <= 0) { toast({ title: 'Liquidación vacía', description: 'Configura salario, comisión o bonificación antes de aprobar.', variant: 'destructive' }); return; }
    setRuns((current) => [{ ...row, status: 'Aprobada', approvedAt: new Date().toISOString() }, ...current.filter((run) => run.id !== row.id)]);
    toast({ title: 'Nómina aprobada', description: `${row.employeeName} · ${money(row.net)}` });
  };

  const postPayrollToAccounting = (row: PayrollRun) => {
    const reference = `NOM-${row.id}`;
    type StoredAccounting = { entries?: Array<Record<string, unknown>>; banks?: Array<Record<string, unknown>>; audit?: Array<Record<string, unknown>> };
    const accountingKey = `merco-accounting-v1-${activeAgencyId || '2'}`;
    const accounting = readStorage<StoredAccounting>(accountingKey, {});
    const entries = accounting.entries || [];
    if (entries.some((entry) => entry.reference === reference)) return;
    const nextNumber = String(Math.max(0, ...entries.map((entry) => Number(entry.number) || 0)) + 1).padStart(6, '0');
    const timestamp = new Date();
    const nextAccounting = {
      ...accounting,
      entries: [{ id: `AST-NOM-${row.id}`, number: nextNumber, date: timestamp.toISOString().slice(0, 10), reference, description: `Pago de nómina · ${row.employeeName} · ${row.period}`, status: 'Contabilizado', lines: [{ account: '5105', debit: row.net, credit: 0 }, { account: paymentAccount, debit: 0, credit: row.net }] }, ...entries],
      banks: [{ id: `BAN-NOM-${row.id}`, date: timestamp.toISOString().slice(0, 10), detail: `${reference} · ${row.employeeName}`, amount: -row.net, reconciled: false, account: paymentAccount }, ...(accounting.banks || [])],
      audit: [{ id: `AUD-NOM-${row.id}`, date: timestamp.toLocaleString('es-CO'), action: 'Nómina pagada', detail: `${row.employeeName} · ${row.period} · ${money(row.net)}` }, ...(accounting.audit || [])],
    };
    localStorage.setItem(accountingKey, JSON.stringify(nextAccounting));
    void db.from('erp_accounting').upsert({ id: `main_${activeAgencyId || '2'}`, ...nextAccounting, updatedAt: timestamp.toISOString() });
  };

  const markPaid = (row: PayrollRun) => {
    if (row.status !== 'Aprobada') return;
    if (!window.confirm(`¿Confirmas el pago de ${money(row.net)} a ${row.employeeName}?`)) return;
    postPayrollToAccounting(row);
    setRuns((current) => current.map((run) => run.id === row.id ? { ...run, status: 'Pagada', paidAt: new Date().toISOString(), paymentAccount } : run));
    toast({ title: 'Pago registrado y contabilizado', description: 'Se generó el gasto de personal y el egreso pendiente de conciliación.' });
  };

  const exportCsv = () => {
    const data = [['Periodo', 'Empleado', 'Ventas', 'Comisión', 'Salario', 'Bonos', 'Deducciones', 'Neto', 'Estado'], ...rows.map((row) => [row.period, row.employeeName, row.sales, row.commission, row.baseSalary, row.bonus, row.deductions, row.net, row.status])];
    const csv = data.map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    link.download = `nomina-${period}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };

  const totalSales = rows.reduce((sum, row) => sum + row.sales, 0);
  const totalCommission = rows.reduce((sum, row) => sum + row.commission, 0);
  const totalPayroll = rows.reduce((sum, row) => sum + row.net, 0);
  const paidPayroll = rows.filter((row) => row.status === 'Pagada').reduce((sum, row) => sum + row.net, 0);

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-5">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Compensación</p><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Comisiones y nómina</h2><p className="mt-1 text-xs text-slate-500">Las comisiones se calculan sobre ventas confirmadas asignadas a cada vendedor.</p></div>
      <div className="flex flex-wrap items-end gap-2"><div><Label htmlFor="payroll-period" className="text-[10px] font-bold uppercase text-slate-500">Período</Label><Input id="payroll-period" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-1 h-9 w-40" /></div><div><Label htmlFor="payroll-account" className="text-[10px] font-bold uppercase text-slate-500">Cuenta de pago</Label><select id="payroll-account" value={paymentAccount} onChange={(event) => setPaymentAccount(event.target.value)} className="mt-1 h-9 rounded-md border border-slate-200 bg-white px-2 text-xs"><option value="1105">1105 · Caja general</option><option value="1110">1110 · Banco principal</option><option value="1111">1111 · Banco secundario</option><option value="1120">1120 · Billetera / pasarela</option></select></div><Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading} className="h-9"><RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />Actualizar</Button><Button variant="outline" size="sm" onClick={exportCsv} className="h-9"><Download className="mr-1.5 h-3.5 w-3.5" />Exportar</Button></div>
    </div>

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[['Ventas comisionables', money(totalSales), BadgeDollarSign, 'text-blue-700'], ['Comisiones', money(totalCommission), Banknote, 'text-violet-700'], ['Nómina neta', money(totalPayroll), Users, 'text-slate-800'], ['Pagado', money(paidPayroll), CheckCircle2, 'text-emerald-700']].map(([label, value, Icon, tone]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{String(label)}</p>{React.createElement(Icon as React.ElementType, { className: `h-4 w-4 ${tone}` })}</div><p className={cn('mt-2 truncate text-xl font-black tracking-tight', String(tone))}>{String(value)}</p></div>)}
    </div>

    {unassignedSales > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"><strong>Ventas sin vendedor:</strong> {money(unassignedSales)} no generan comisión hasta asignar un empleado.</div>}

    <Tabs defaultValue="commissions">
      <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-slate-100 p-1 sm:w-auto">
        <TabsTrigger value="commissions" className="rounded-lg text-xs">Comisiones</TabsTrigger><TabsTrigger value="payroll" className="rounded-lg text-xs">Nómina</TabsTrigger><TabsTrigger value="settings" className="rounded-lg text-xs">Configuración</TabsTrigger>
      </TabsList>

      <TabsContent value="commissions" className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-xs"><thead><tr className="bg-slate-100 text-left text-[9px] uppercase tracking-wider text-slate-500"><th className="p-3">Vendedor</th><th className="p-3 text-right">Ventas</th><th className="p-3 text-right">Tasa</th><th className="p-3 text-right">Comisión</th><th className="p-3">Estado</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-slate-100 hover:bg-blue-50/40"><td className="p-3 font-semibold text-slate-800">{row.employeeName}</td><td className="p-3 text-right">{money(row.sales)}</td><td className="p-3 text-right">{row.commissionRate.toFixed(2)}%</td><td className="p-3 text-right font-bold text-violet-700">{money(row.commission)}</td><td className="p-3"><Status status={row.status} /></td></tr>)}</tbody></table>
      </TabsContent>

      <TabsContent value="payroll" className="mt-3 space-y-3">
        {rows.map((row) => <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><h3 className="font-bold text-slate-900">{row.employeeName}</h3><Status status={row.status} /></div><p className="mt-1 text-[10px] text-slate-500">{row.status === 'Pagada' ? `Pagada ${new Date(row.paidAt || '').toLocaleString('es-CO')}` : `Período ${row.period}`}</p></div><div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs sm:grid-cols-5"><Amount label="Salario" value={row.baseSalary} /><Amount label="Comisión" value={row.commission} /><Amount label="Bonos" value={row.bonus} /><Amount label="Deducciones" value={-row.deductions} negative /><Amount label="Neto a pagar" value={row.net} strong /></div><div className="flex gap-2">{row.status === 'Borrador' && <Button size="sm" onClick={() => approve(row)} className="bg-blue-600 hover:bg-blue-700"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" />Aprobar</Button>}{row.status === 'Aprobada' && <Button size="sm" onClick={() => markPaid(row)} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Registrar pago</Button>}{row.status === 'Pagada' && <span className="text-xs font-semibold text-emerald-700">Liquidación cerrada</span>}</div></div></article>)}
      </TabsContent>

      <TabsContent value="settings" className="mt-3 grid gap-3 lg:grid-cols-2">
        {employees.map((employee) => { const profile = profiles[employee.id] || { baseSalary: 0, commissionRate: 0 }; const adjustment = adjustments[`${period}:${employee.id}`] || { bonus: 0, deductions: 0 }; const locked = runs.some((run) => run.period === period && run.employeeId === employee.id && run.status !== 'Borrador'); return <div key={employee.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-900">{employee.name}</h3><p className="text-[10px] text-slate-400">Salario y tasa recurrentes · novedades de {period}</p></div><Settings2 className="h-4 w-4 text-slate-400" /></div><div className="grid grid-cols-2 gap-3"><MoneyInput label="Salario base" value={profile.baseSalary} disabled={locked} onChange={(value) => updateProfile(employee.id, 'baseSalary', value)} /><MoneyInput label="Comisión %" value={profile.commissionRate} disabled={locked} onChange={(value) => updateProfile(employee.id, 'commissionRate', value)} /><MoneyInput label="Bonificaciones del período" value={adjustment.bonus} disabled={locked} onChange={(value) => updateAdjustment(employee.id, 'bonus', value)} /><MoneyInput label="Deducciones del período" value={adjustment.deductions} disabled={locked} onChange={(value) => updateAdjustment(employee.id, 'deductions', value)} /></div>{locked && <p className="mt-3 text-[10px] font-semibold text-amber-700">La liquidación aprobada conserva su cálculo original.</p>}</div>; })}
      </TabsContent>
    </Tabs>
  </div>;
};

const Status = ({ status }: { status: PayrollStatus }) => <span className={cn('inline-flex rounded-full border px-2 py-1 text-[9px] font-bold', status === 'Pagada' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'Aprobada' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-600')}>{status}</span>;
const Amount = ({ label, value, negative, strong }: { label: string; value: number; negative?: boolean; strong?: boolean }) => <div><p className="text-[9px] uppercase text-slate-400">{label}</p><p className={cn('mt-0.5 whitespace-nowrap font-semibold', negative && 'text-red-700', strong && 'text-base font-black text-slate-900')}>{money(value)}</p></div>;
const MoneyInput = ({ label, value, disabled, onChange }: { label: string; value: number; disabled: boolean; onChange: (value: string) => void }) => <div><Label className="text-[10px] font-semibold text-slate-500">{label}</Label><Input type="number" min="0" step="0.01" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9" /></div>;

export default CompensationManager;
