import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { db, getDocs, collection } from '@/firebase';
import { cn } from '@/lib/utils';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Activity,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Plus,
  Trash2,
  Edit,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  FileText,
  FileCode,
  Eye,
  Download,
  Building2,
  Coins,
  Upload,
  ExternalLink
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ec4899', '#14b8a6'];

const categoryStyleMap: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  'Mercadería': { icon: '📦', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-150' },
  'Marketing': { icon: '📢', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-150' },
  'Servicios': { icon: '🔧', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-150' },
  'Alquiler': { icon: '🏠', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-150' },
  'Salarios': { icon: '👥', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-150' },
  'Impuestos': { icon: '🏛', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-150' },
  'Venta Manual': { icon: '💰', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-150' },
  'Socio / Inversión': { icon: '📈', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-150' },
  'Reembolso': { icon: '💵', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-150' },
  'Otros': { icon: '⚙️', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-150' },
};

interface ContabilidadManagerProps {
  embedded?: boolean;
}

export const ContabilidadManager: React.FC<ContabilidadManagerProps> = ({ embedded = false }) => {
  const { user } = useAuth();
  const isSupabase = typeof (db as any)?.from === 'function';
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);


  // Billing lines and Invoices states
  const [billingLines, setBillingLines] = useState<any[]>([]);
  const [selectedBillingLineId, setSelectedBillingLineId] = useState<string>('all');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [searchInvoiceTerm, setSearchInvoiceTerm] = useState('');

  // Invoice view dialogs
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [showXmlDialog, setShowXmlDialog] = useState(false);

  // Preview receipt states
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewExpense, setPreviewExpense] = useState<any>(null);

  // Filter states for Egresos
  const [timeFilter, setTimeFilter] = useState<'7days' | '30days' | 'year' | 'all' | 'custom'>('30days');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');

  // KPI states for Egresos
  const [kpiTotalSales, setKpiTotalSales] = useState(0);
  const [kpiTotalExpenses, setKpiTotalExpenses] = useState(0);
  const [kpiNetProfit, setKpiNetProfit] = useState(0);
  const [maxExpenseValue, setMaxExpenseValue] = useState<number>(0);

  // Chart datasets
  const [expensesCategoryData, setExpensesCategoryData] = useState<any[]>([]);
  const [salesVsExpensesData, setSalesVsExpensesData] = useState<any[]>([]);
  const [filteredOrdersState, setFilteredOrdersState] = useState<any[]>([]);
  const [filteredExpensesState, setFilteredExpensesState] = useState<any[]>([]);

  // Expense form state
  const [formMode, setFormMode] = useState<'ingreso' | 'egreso'>('egreso');

  // Expense categories list
  const expenseCategoriesList = useMemo(() => {
    const defaults = formMode === 'ingreso'
      ? ['Venta Manual', 'Servicios', 'Socio / Inversión', 'Reembolso', 'Otros']
      : ['Mercadería', 'Marketing', 'Servicios', 'Alquiler', 'Salarios', 'Impuestos', 'Otros'];
    const customCategories = expenses
      .filter(exp => (formMode === 'ingreso' ? exp.tipo === 'ingreso' : exp.tipo !== 'ingreso'))
      .map(exp => exp.categoria)
      .filter((cat): cat is string => typeof cat === 'string' && cat.trim() !== '');

    return Array.from(new Set([...defaults, ...customCategories]));
  }, [expenses, formMode]);

  // Redirect to Sales Report
  const handleRedirectToReportes = () => {
    const reportesBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.trim() === 'Reportes');
    if (reportesBtn) {
      reportesBtn.click();
    } else {
      const reportesTabTrigger = document.querySelector('[value="reportes"]');
      if (reportesTabTrigger instanceof HTMLElement) {
        reportesTabTrigger.click();
      }
    }
  };

  // Unified list of manual movements + virtual POS sales entry
  const unifiedMovements = useMemo(() => {
    const list = [...filteredExpensesState];
    const posSalesSum = filteredOrdersState.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    if (posSalesSum > 0) {
      const lineName = selectedBillingLineId === 'all'
        ? 'Todas las Líneas'
        : (billingLines.find(l => String(l.id) === String(selectedBillingLineId))?.name || 'Línea Seleccionada');

      list.unshift({
        id: 'virtual-pos-sales',
        concepto: `Ventas Totales - ${lineName}`,
        categoria: 'Ventas',
        fecha: new Date().toISOString().split('T')[0],
        monto: posSalesSum,
        tipo: 'ingreso',
        billingLineId: selectedBillingLineId,
        isVirtual: true
      });
    }

    return list;
  }, [expenses, filteredOrdersState, selectedBillingLineId, billingLines]);

  // Expense form state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [expenseForm, setExpenseForm] = useState({
    concepto: '',
    monto: '',
    categoria: 'Mercadería',
    fecha: new Date().toISOString().split('T')[0],
    notas: '',
    soporteUrl: '',
    soporteNombre: ''
  });
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchData();
    fetchInvoicesAndLines();
  }, []);

  useEffect(() => {
    if (!loading) {
      processData();
    }
  }, [orders, expenses, invoices, timeFilter, customStartDate, customEndDate, selectedEmployeeFilter, selectedBillingLineId, loading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isSupabase) {
        // Fetch Orders
        const { data: ordersData } = await db.from("orders").select("*").order("created_at", { ascending: true });
        if (ordersData) setOrders(ordersData);

        // Fetch Products
        const { data: productsData } = await db.from("products").select("*");
        if (productsData) setProducts(productsData);

        // Fetch Expenses (gastos)
        const { data: expensesData } = await db.from("gastos").select("*").order("fecha", { ascending: false });
        if (expensesData && Array.isArray(expensesData)) {
          setExpenses(expensesData);
        }

        // Fetch Company Profile
        const { data: compData } = await db.from("company_profile").select("*");
        if (compData && compData.length > 0) {
          setCompanyProfile(compData[0]);
        }

        // Fetch Employees
        const { data: employeesData } = await db.from("users").select("*").eq("sub_cuenta", "si");
        if (employeesData) {
          setEmployees(employeesData.map((u: any) => ({
            id: u.id,
            nombre: u.name || u.nombre || u.email || 'Sin nombre',
            name: u.name,
            email: u.email
          })));
        }
      } else {
        // Firestore fallback
        const ordersQuerySnapshot = await getDocs(collection(db, "orders"));
        setOrders(ordersQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const productsQuerySnapshot = await getDocs(collection(db, "products"));
        setProducts(productsQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const expensesSnapshot = await getDocs(collection(db, "gastos"));
        setExpenses(expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const companySnapshot = await getDocs(collection(db, "company_profile"));
        if (companySnapshot.docs.length > 0) {
          setCompanyProfile({ id: companySnapshot.docs[0].id, ...companySnapshot.docs[0].data() });
        }

        const empsSnapshot = await getDocs(collection(db, "users"));
        const subs = empsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(u => u.subCuenta === "si" || u.sub_cuenta === "si")
          .map(u => ({
            id: u.id,
            nombre: u.name || u.nombre || u.email || 'Sin nombre',
            name: u.name,
            email: u.email
          }));
        setEmployees(subs);
      }
    } catch (error) {
      console.error("Error fetching contabilidad data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoicesAndLines = async () => {
    setLoadingInvoices(true);
    try {
      // 1. Fetch Billing Lines
      let linesData: any[] = [];
      if (isSupabase) {
        const { data } = await db.from('lineas_facturacion').select('*');
        linesData = data || [];
      } else {
        const snap = await getDocs(collection(db, "lineas_facturacion"));
        linesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      setBillingLines(linesData);

      // 2. Fetch Invoices History
      const res = await fetch('/api/facturacion/historial');
      if (res.ok) {
        const json = await res.json();
        setInvoices(json.facturas || []);
      }
    } catch (e) {
      console.error("Error fetching invoices or billing lines:", e);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const processData = () => {
    const now = new Date();
    let startCutoff = new Date(0);
    let endCutoff = new Date();

    if (timeFilter === '7days') {
      const d = new Date();
      d.setDate(now.getDate() - 7);
      startCutoff = d;
    } else if (timeFilter === '30days') {
      const d = new Date();
      d.setDate(now.getDate() - 30);
      startCutoff = d;
    } else if (timeFilter === 'year') {
      const d = new Date();
      d.setFullYear(now.getFullYear() - 1);
      startCutoff = d;
    } else if (timeFilter === 'custom') {
      startCutoff = customStartDate ? new Date(customStartDate + 'T00:00:00') : new Date(0);
      endCutoff = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date();
    }

    // Filter sales/orders
    const filteredOrders = orders.filter(o => {
      const date = new Date(o.created_at || o.createdAt);
      const matchesTime = date >= startCutoff && date <= endCutoff;
      if (!matchesTime) return false;

      // Filter by Employee
      if (selectedEmployeeFilter !== 'all') {
        const matchesEmployee = selectedEmployeeFilter === 'none'
          ? (!o.employee_id && !o.employeeId)
          : (o.employee_id === selectedEmployeeFilter || o.employeeId === selectedEmployeeFilter);
        if (!matchesEmployee) return false;
      }

      // Filter by Billing Line
      if (selectedBillingLineId !== 'all') {
        const orderLineId = String(o.billingLineId || o.billing_line_id || '');
        const matchesLine = orderLineId === selectedBillingLineId || invoices.some(inv => String(inv.order_id || inv.orderId) === String(o.id) && String(inv.billing_line_id || inv.billingLineId) === selectedBillingLineId);
        if (!matchesLine) return false;
      }

      return true;
    });

    // Filter Manual Entries (both incomes and expenses)
    const filteredManual = expenses.filter(e => {
      const date = new Date(e.fecha || e.created_at);
      const matchesTime = date >= startCutoff && date <= endCutoff;
      if (!matchesTime) return false;

      // Filter by Billing Line
      if (selectedBillingLineId !== 'all') {
        const matchesLine = String(e.billingLineId || e.billing_line_id || '') === selectedBillingLineId;
        if (!matchesLine) return false;
      }

      return true;
    });

    const filteredExpenses = filteredManual.filter(e => e.tipo !== 'ingreso');
    const filteredManualIncomes = filteredManual.filter(e => e.tipo === 'ingreso');

    // Calculations
    const totalSales = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0) +
                       filteredManualIncomes.reduce((sum, i) => sum + (Number(i.monto) || 0), 0);
    setKpiTotalSales(totalSales);

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.monto) || 0), 0);
    setKpiTotalExpenses(totalExpenses);

    setKpiNetProfit(totalSales - totalExpenses);

    const maxExpVal = filteredExpenses.reduce((max, exp) => Math.max(max, Number(exp.monto) || 0), 0);
    setMaxExpenseValue(maxExpVal);

    // Expenses Category Data
    const expenseCategoryMap = new Map();
    filteredExpenses.forEach(exp => {
      const cat = exp.categoria || 'Otros';
      expenseCategoryMap.set(cat, (expenseCategoryMap.get(cat) || 0) + (Number(exp.monto) || 0));
    });

    setExpensesCategoryData(Array.from(expenseCategoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    );

    // Combined Daily Sales vs Expenses Chart
    const combinedDays = new Set<string>();
    const salesByDayMap = new Map();
    filteredOrders.forEach(order => {
      const dateStr = order.created_at || order.createdAt;
      if (dateStr) {
        const date = new Date(dateStr);
        const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        salesByDayMap.set(day, (salesByDayMap.get(day) || 0) + (Number(order.total) || 0));
        combinedDays.add(day);
      }
    });

    filteredManualIncomes.forEach(income => {
      const dateStr = income.fecha || income.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        salesByDayMap.set(day, (salesByDayMap.get(day) || 0) + (Number(income.monto) || 0));
        combinedDays.add(day);
      }
    });

    const expensesByDayMap = new Map();
    filteredExpenses.forEach(exp => {
      const dateStr = exp.fecha || exp.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        expensesByDayMap.set(day, (expensesByDayMap.get(day) || 0) + (Number(exp.monto) || 0));
        combinedDays.add(day);
      }
    });

    setSalesVsExpensesData(Array.from(combinedDays)
      .map(day => ({
        date: day,
        Ventas: salesByDayMap.get(day) || 0,
        Gastos: expensesByDayMap.get(day) || 0
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    );

    setFilteredOrdersState(filteredOrders);
    setFilteredExpensesState(filteredManual);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadProgress(10);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 10 : prev));
    }, 150);

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
      const uploadUrl = token
        ? `${window.location.origin}/api/upload?access_token=${encodeURIComponent(token)}`
        : `${window.location.origin}/api/upload`;

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.url) {
        setUploadProgress(100);
        setExpenseForm((prev) => ({
          ...prev,
          soporteUrl: data.url,
          soporteNombre: file.name,
        }));
        toast({
          title: 'Archivo cargado',
          description: `El archivo ${file.name} se subió correctamente.`,
        });
      } else {
        throw new Error(data.message || 'Error al subir el archivo');
      }
    } catch (error: any) {
      console.error('Error uploading file support:', error);
      toast({
        title: 'Error de carga',
        description: error.message || 'No se pudo subir el archivo de soporte.',
        variant: 'destructive',
      });
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.concepto || !expenseForm.monto) return;

    setSubmittingExpense(true);
    try {
      const cat = isCreatingNewCategory ? newCategoryName.trim() : expenseForm.categoria;
      const expenseId = editingExpense?.id || `gasto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const expenseData = {
        concepto: expenseForm.concepto,
        monto: Number(expenseForm.monto),
        categoria: cat || 'Otros',
        fecha: expenseForm.fecha,
        notas: expenseForm.notas,
        soporteUrl: expenseForm.soporteUrl,
        soporteNombre: expenseForm.soporteNombre,
        soporte_url: expenseForm.soporteUrl,
        soporte_nombre: expenseForm.soporteNombre,
        id: expenseId,
        tipo: editingExpense?.tipo || formMode,
        created_at: editingExpense?.created_at || new Date().toISOString(),
        registrado_por: editingExpense?.registrado_por || user?.nombre || user?.email || 'Administrador Principal'
      };

      if (isSupabase) {
        if (editingExpense) {
          const { error } = await db.from("gastos").update(expenseData).eq("id", editingExpense.id);
          if (error) throw error;
          setExpenses(prev => prev.map(exp => exp.id === editingExpense.id ? expenseData : exp));
        } else {
          const { error } = await db.from("gastos").insert(expenseData);
          if (error) throw error;
          setExpenses(prev => [expenseData, ...prev]);
        }
      } else {
        // Firestore fallback
        if (editingExpense) {
          await db.from("gastos").update(expenseData).eq("id", editingExpense.id);
          setExpenses(prev => prev.map(exp => exp.id === editingExpense.id ? expenseData : exp));
        } else {
          await db.from("gastos").insert(expenseData);
          setExpenses(prev => [expenseData, ...prev]);
        }
      }

      toast({
        title: editingExpense ? "Gasto actualizado" : "Gasto registrado",
        description: "El registro financiero ha sido guardado exitosamente."
      });

      setIsExpenseModalOpen(false);
      setEditingExpense(null);
      setIsCreatingNewCategory(false);
      setNewCategoryName('');
      setExpenseForm({
        concepto: '',
        monto: '',
        categoria: 'Mercadería',
        fecha: new Date().toISOString().split('T')[0],
        notas: '',
        soporteUrl: '',
        soporteNombre: ''
      });
    } catch (error) {
      console.error("Error saving expense:", error);
      toast({
        title: "Error al registrar gasto",
        description: "No se pudo guardar la información. Reintente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este gasto?")) return;
    try {
      if (isSupabase) {
        const { error } = await db.from("gastos").delete().eq("id", id);
        if (error) throw error;
      } else {
        await db.from("gastos").delete().eq("id", id);
      }
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      toast({
        title: "Gasto eliminado",
        description: "El registro financiero ha sido eliminado de la base de datos."
      });
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el gasto. Reintente nuevamente.",
        variant: "destructive"
      });
    }
  };

  const handlePrintTicket = (exp: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Por favor, permite las ventanas emergentes para imprimir el ticket.");
      return;
    }

    const businessName = companyProfile?.friendly_name || companyProfile?.legal_name || 'Merco';
    const address = companyProfile?.postal_address || '';
    const location = `${companyProfile?.city || ''}, ${companyProfile?.state || ''}`;
    const country = companyProfile?.country || '';
    const creator = exp.registrado_por || user?.nombre || user?.email || 'Administrador Principal';
    const formattedDate = new Date(exp.fecha || exp.created_at).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const formattedTime = exp.created_at ? new Date(exp.created_at).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    }) : '';

    const htmlContent = `
      <html>
        <head>
          <title>Ticket de Gasto - ${exp.id}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              color: #000;
              background-color: #fff;
              max-width: 380px;
              margin: 20px auto;
              padding: 15px;
              border: 1px solid #ddd;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .header { margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .logo { font-size: 20px; font-weight: bold; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .dashed { border-top: 1px dashed #000; margin: 15px 0; }
            .total { font-weight: bold; font-size: 16px; }
            .footer { margin-top: 25px; font-size: 10px; line-height: 1.4; border-top: 1px dashed #000; padding-top: 10px; }
            .sign { margin-top: 40px; display: flex; justify-content: space-between; }
            .sign-line { border-top: 1px solid #000; width: 140px; margin-top: 30px; padding-top: 5px; font-size: 9px; }
          </style>
        </head>
        <body>
          <div class="header center">
            <div class="logo">${businessName}</div>
            <div>${address}</div>
            <div>${location} - ${country}</div>
          </div>
          
          <div class="center" style="font-weight: bold; margin-bottom: 15px;">
            COMPROBANTE DE EGRESO
          </div>
          
          <div class="row">
            <span>Comprobante:</span>
            <span>ID-${exp.id.substring(0, 8).toUpperCase()}</span>
          </div>
          <div class="row">
            <span>Fecha:</span>
            <span>${formattedDate}</span>
          </div>
          <div class="row">
            <span>Hora:</span>
            <span>${formattedTime}</span>
          </div>
          <div class="row">
            <span>Registró:</span>
            <span>${creator}</span>
          </div>
          
          <div class="dashed"></div>
          
          <div class="row" style="font-weight: bold;">
            <span>CONCEPTO / DETALLE</span>
            <span>IMPORTE</span>
          </div>
          
          <div class="row" style="margin-top: 8px;">
            <span style="max-width: 250px; word-wrap: break-word;">${exp.concepto}</span>
            <span>$${Number(exp.monto).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
          </div>
          
          ${exp.notas ? `
            <div style="font-size: 10px; margin-top: 5px; color: #555;">
              Observaciones: ${exp.notas}
            </div>
          ` : ''}
          
          <div class="row" style="margin-top: 8px; font-size: 10px; color: #666;">
            <span>Categoría:</span>
            <span>${exp.categoria || 'Otros'}</span>
          </div>
          
          <div class="dashed"></div>
          
          <div class="row total">
            <span>TOTAL EGRESO:</span>
            <span>$${Number(exp.monto).toLocaleString('es-ES', { minimumFractionDigits: 2 })} ARS</span>
          </div>
          
          <div class="sign">
            <div class="sign-line center">Firma Autorizada<br/>Administración</div>
            <div class="sign-line center">Firma Recibido<br/>Receptor del Egreso</div>
          </div>
          
          <div class="footer center">
            <div>¡Gracias por tu registro comercial!</div>
            <div>Merco POS Engine v1.5</div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const getXmlMockContent = (inv: any) => {
    const total = parseFloat(inv?.total) || 0;
    const subtotal = total / 1.16;
    const tax = total - subtotal;
    const formattedDate = new Date(inv?.fecha).toISOString().split('.')[0];
    return `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
  Version="4.0" Fecha="${formattedDate}" FormaPago="28" MetodoPago="PUE"
  SubTotal="${subtotal.toFixed(2)}" Total="${total.toFixed(2)}" TipoDeComprobante="I" Exportacion="01"
  LugarExpedicion="26015" Moneda="MXN">
  <cfdi:Emisor Rfc="VOSA900909AA1" Nombre="VOLTIUM SANREY SA DE CV" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="XAXX010101000" Nombre="PUBLICO EN GENERAL" UsoCFDI="S01" RegimenFiscalReceptor="616" DomicilioFiscalReceptor="26015"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="01010101" Cantidad="1.0" ClaveUnidad="H87" Unidad="Pieza" Descripcion="Venta de prueba en sucursal" ValorUnitario="${subtotal.toFixed(2)}" Importe="${subtotal.toFixed(2)}" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${subtotal.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${tax.toFixed(2)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${tax.toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${subtotal.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${tax.toFixed(2)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital UUID="${inv?.uuid}" FechaTimbrado="${formattedDate}" RfcProvCertif="SAT970701NN3"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
  };

  // Process filtered invoices for Facturacion section
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (selectedBillingLineId !== 'all') {
        if (selectedBillingLineId === 'none') {
          return !inv.billing_line_id || inv.billing_line_id === 'none' || inv.billing_line_id === 'null';
        }
        return String(inv.billing_line_id) === String(selectedBillingLineId);
      }
      return true;
    }).filter(inv => {
      const term = searchInvoiceTerm.toLowerCase();
      return (
        inv.uuid.toLowerCase().includes(term) ||
        String(inv.order_id).toLowerCase().includes(term) ||
        inv.estatus.toLowerCase().includes(term)
      );
    });
  }, [invoices, selectedBillingLineId, searchInvoiceTerm]);

  // Billing Line Statistics
  const billingStats = useMemo(() => {
    const activeInvoices = filteredInvoices.filter(f => f.estatus === 'TIMBRADA');
    const canceledInvoices = filteredInvoices.filter(f => f.estatus === 'CANCELADA');
    const totalFacturado = activeInvoices.reduce((sum, f) => sum + (parseFloat(f.total) || 0), 0);

    return {
      totalFacturado,
      emitidasCount: activeInvoices.length,
      canceladasCount: canceledInvoices.length
    };
  }, [filteredInvoices]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <Activity className="animate-spin h-10 w-10 text-blue-600" />
        <p className="text-slate-500 font-medium animate-pulse text-sm">Cargando contabilidad y analíticas...</p>
      </div>
    );
  }

  return (
    <div className={cn(embedded ? 'space-y-3' : 'space-y-6')}>
      {/* HEADER & FILTERS */}
      <div className={cn('flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white border', embedded ? 'p-3 rounded-none border-[#a8c0d1] shadow-none' : 'p-6 rounded-2xl border-slate-100 shadow-sm')}>
        <div>
          <h2 className={cn('font-black text-slate-800 tracking-tight flex items-center', embedded ? 'text-sm' : 'text-3xl')}>
            <BarChart3 className={cn('mr-3 text-blue-600', embedded ? 'h-4 w-4' : 'h-7 w-7')} />
            {embedded ? 'Operación real de caja y comprobantes' : 'Contabilidad y Finanzas'}
          </h2>
          <p className={cn('text-slate-500 mt-1 font-semibold', embedded ? 'text-[10px]' : 'text-sm')}>Ventas del POS, ingresos, egresos y facturación fiscal por línea.</p>
        </div>

        {/* Unified Filter Dropdowns Group */}
        <div className="shrink-0 flex flex-wrap items-center gap-3">
          {/* Employee Filter */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0">
            <Users className="h-4 w-4 text-slate-500 ml-2" />
            <Select value={selectedEmployeeFilter} onValueChange={(val: any) => setSelectedEmployeeFilter(val)}>
              <SelectTrigger className="w-[175px] bg-transparent border-none shadow-none focus:ring-0 text-slate-700 font-semibold h-8 text-xs">
                <SelectValue placeholder="Todos los Empleados" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-150 bg-white z-50">
                <SelectItem value="all" className="text-xs">Todos los Empleados</SelectItem>
                <SelectItem value="none" className="text-xs">Venta Web / General</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id} className="cursor-pointer text-xs">
                    {emp.nombre || emp.name || 'Sin nombre'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Filter */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0">
            <Filter className="h-4 w-4 text-slate-500 ml-2" />
            <Select value={timeFilter} onValueChange={(val: any) => setTimeFilter(val)}>
              <SelectTrigger className="w-[150px] bg-transparent border-none shadow-none focus:ring-0 text-slate-700 font-semibold h-8 text-xs">
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-150 bg-white z-50">
                <SelectItem value="7days" className="text-xs">Últimos 7 días</SelectItem>
                <SelectItem value="30days" className="text-xs">Últimos 30 días</SelectItem>
                <SelectItem value="year" className="text-xs">Último año</SelectItem>
                <SelectItem value="all" className="text-xs">Histórico completo</SelectItem>
                <SelectItem value="custom" className="text-blue-600 font-bold border-t border-slate-100 mt-1 cursor-pointer text-xs">Rango Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {timeFilter === 'custom' && (
            <div className="flex flex-row items-center gap-2 p-1 bg-slate-50 border border-slate-100 rounded-xl px-3 animate-in fade-in slide-in-from-left-2 duration-200 h-[38px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Desde</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-lg border-slate-200 h-7 bg-white text-[11px] w-[115px] font-medium"
              />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Hasta</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-lg border-slate-200 h-7 bg-white text-[11px] w-[115px] font-medium"
              />
            </div>
          )}

          {/* Línea Contable Filter */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0">
            <Coins className="h-4 w-4 text-blue-600 ml-2" />
            <Select
              value={selectedBillingLineId}
              onValueChange={(val: string) => setSelectedBillingLineId(val)}
            >
              <SelectTrigger className="w-[200px] bg-transparent border-none shadow-none focus:ring-0 text-slate-700 font-semibold h-8 text-xs">
                <SelectValue placeholder="Seleccionar Línea" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-150 bg-white z-50">
                <SelectItem value="all" className="cursor-pointer font-semibold text-xs py-2 hover:bg-slate-50">
                  <span className="flex items-center gap-2">
                    <Coins className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Todas las Líneas</span>
                  </span>
                </SelectItem>
                {billingLines.map(line => (
                  <SelectItem key={line.id} value={line.id} className="cursor-pointer font-semibold text-xs py-2 hover:bg-slate-50">
                    <span className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{line.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ================================= UNIFIED ANALYTICS DASHBOARD ================================= */}
      <div className="space-y-6 animate-in fade-in duration-350">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white border border-slate-100 shadow-sm relative overflow-hidden">
              <CardContent className="p-6 flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Caja total de Ventas</p>
                  <h3 className="text-2xl font-black text-slate-800">${kpiTotalSales.toLocaleString('es-ES')}</h3>
                  <p className="text-[10px] text-blue-600 mt-1 font-medium flex items-center">
                    <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> Flujo neto de ingresos
                  </p>
                </div>
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                  <ShoppingCart className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-100 shadow-sm relative overflow-hidden">
              <CardContent className="p-6 flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Gastos Operacionales</p>
                  <h3 className="text-2xl font-black text-rose-600">${kpiTotalExpenses.toLocaleString('es-ES')}</h3>
                  <p className="text-[10px] text-rose-500 mt-1 font-medium flex items-center">
                    <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" /> Egresos del periodo
                  </p>
                </div>
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
                  <DollarSign className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border shadow-sm relative overflow-hidden",
              kpiNetProfit >= 0 ? "bg-emerald-50/20 border-emerald-100" : "bg-red-50/20 border-red-100"
            )}>
              <CardContent className="p-6 flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Balance de Caja</p>
                  <h3 className={cn(
                    "text-2xl font-black",
                    kpiNetProfit >= 0 ? "text-emerald-700" : "text-red-700"
                  )}>
                    {kpiNetProfit < 0 ? '-' : ''}${Math.abs(kpiNetProfit).toLocaleString('es-ES')}
                  </h3>
                  <p className={cn(
                    "text-[10px] mt-1 font-bold flex items-center",
                    kpiNetProfit >= 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    {kpiNetProfit >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />}
                    {kpiNetProfit >= 0 ? "Balance Comercial Sano" : "Caja en Negativo"}
                  </p>
                </div>
                <div className={cn(
                  "p-2.5 rounded-lg",
                  kpiNetProfit >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                )}>
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-100 shadow-sm relative overflow-hidden">
              <CardContent className="p-6 flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Eficiencia Operativa</p>
                  <h3 className="text-2xl font-black text-slate-800">
                    {kpiTotalSales > 0 ? ((kpiTotalExpenses / kpiTotalSales) * 100).toFixed(0) : '0'}%
                  </h3>
                  <p className="text-[10px] text-slate-550 mt-1 font-medium">
                    Ratio Gastos / Ventas (Burn Rate)
                  </p>
                </div>
                <div className="p-2.5 bg-slate-100 text-slate-650 rounded-lg">
                  <Activity className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ACTIONS & ADD EXPENSE */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm gap-4">
            <div>
              <h3 className="font-bold text-slate-800">Historial Financiero</h3>
              <p className="text-xs text-slate-500 mt-0.5">Controla y edita todos los egresos e ingresos registrados de tu comercio</p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                onClick={() => {
                  setFormMode('ingreso');
                  setExpenseForm({
                    concepto: '',
                    monto: '',
                    categoria: 'Venta Manual',
                    fecha: new Date().toISOString().split('T')[0],
                    notas: '',
                    soporteUrl: '',
                    soporteNombre: '',
                    billingLineId: 'none'
                  });
                  setIsExpenseModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1 font-semibold text-xs h-9 px-3.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Registrar Ingreso
              </Button>
              <Button
                onClick={() => {
                  setFormMode('egreso');
                  setExpenseForm({
                    concepto: '',
                    monto: '',
                    categoria: 'Mercadería',
                    fecha: new Date().toISOString().split('T')[0],
                    notas: '',
                    soporteUrl: '',
                    soporteNombre: '',
                    billingLineId: 'none'
                  });
                  setIsExpenseModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1 font-semibold text-xs h-9 px-3.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Registrar Gasto
              </Button>
            </div>

            <Dialog open={isExpenseModalOpen} onOpenChange={(open) => {
              setIsExpenseModalOpen(open);
              if (!open) {
                setEditingExpense(null);
                setIsCreatingNewCategory(false);
                setNewCategoryName('');
                setExpenseForm({
                  concepto: '',
                  monto: '',
                  categoria: formMode === 'ingreso' ? 'Venta Manual' : 'Mercadería',
                  fecha: new Date().toISOString().split('T')[0],
                  notas: '',
                  soporteUrl: '',
                  soporteNombre: '',
                  billingLineId: 'none'
                });
              }
            }}>
              <DialogContent className="rounded-2xl border-slate-100 shadow-xl sm:max-w-[760px] bg-white p-0 overflow-hidden">
                <div className={formMode === 'ingreso' ? "bg-gradient-to-r from-emerald-600 to-teal-700 h-1.5 w-full" : "bg-gradient-to-r from-blue-600 to-indigo-700 h-1.5 w-full"} />
                <form onSubmit={handleSaveExpense} className="flex flex-col h-full">
                  <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <div className={formMode === 'ingreso' ? "p-2 bg-emerald-50 text-emerald-600 rounded-xl" : "p-2 bg-blue-50 text-blue-600 rounded-xl"}>
                        {formMode === 'ingreso' ? <TrendingUp className="h-5 w-5" /> : <Coins className="h-5 w-5" />}
                      </div>
                      {editingExpense
                        ? (editingExpense.tipo === 'ingreso' ? 'Modificar Registro de Ingreso' : 'Modificar Registro de Egreso')
                        : (formMode === 'ingreso' ? 'Registrar Nuevo Ingreso Manual' : 'Registrar Nuevo Gasto / Egreso')}
                    </DialogTitle>
                    <DialogDescription className="text-slate-450 text-xs pl-11">
                      {formMode === 'ingreso'
                        ? 'Completa los detalles del ingreso manual. Toda la información es sincronizada con tus estados financieros.'
                        : 'Completa los detalles del egreso. Toda la información es sincronizada con tus estados financieros.'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="p-6 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
                      {/* COLUMNA IZQUIERDA: INFORMACIÓN FINANCIERA */}
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label htmlFor="concepto" className="text-xs font-bold text-slate-650 uppercase tracking-wide">Concepto / Descripción</label>
                          <Input
                            id="concepto"
                            placeholder="Ej. Compra de empaques, Hosting web"
                            value={expenseForm.concepto}
                            onChange={(e) => setExpenseForm(prev => ({ ...prev, concepto: e.target.value }))}
                            className="rounded-xl border-slate-200 h-10 bg-slate-50/30 focus:bg-white transition-all text-sm"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label htmlFor="monto" className="text-xs font-bold text-slate-655 uppercase tracking-wide">Monto ($)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-semibold">$</span>
                              <Input
                                id="monto"
                                type="number"
                                placeholder="0.00"
                                value={expenseForm.monto}
                                onChange={(e) => setExpenseForm(prev => ({ ...prev, monto: e.target.value }))}
                                className="rounded-xl border-slate-200 h-10 pl-7 bg-slate-50/30 focus:bg-white transition-all text-sm font-semibold text-slate-800"
                                min="0"
                                step="any"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="fecha" className="text-xs font-bold text-slate-650 uppercase tracking-wide">Fecha</label>
                            <Input
                              id="fecha"
                              type="date"
                              value={expenseForm.fecha}
                              onChange={(e) => setExpenseForm(prev => ({ ...prev, fecha: e.target.value }))}
                              className="rounded-xl border-slate-200 h-10 bg-slate-50/30 focus:bg-white transition-all text-sm text-slate-700"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="notas" className="text-xs font-bold text-slate-650 uppercase tracking-wide">Notas / Observaciones</label>
                          <textarea
                            id="notas"
                            placeholder="Especifica detalles de pago, números de factura o información relevante..."
                            value={expenseForm.notas}
                            onChange={(e) => setExpenseForm(prev => ({ ...prev, notas: e.target.value }))}
                            className="w-full min-h-[96px] rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/30 focus:bg-white transition-all resize-none text-slate-700"
                          />
                        </div>
                      </div>

                      {/* COLUMNA DERECHA: CLASIFICACIÓN Y DOCUMENTACIÓN */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1.5">
                            <label htmlFor="categoria" className="text-xs font-bold text-slate-650 uppercase tracking-wide">Categoría</label>
                            <Select
                              value={isCreatingNewCategory ? '__NEW__' : expenseForm.categoria}
                              onValueChange={(val) => {
                                if (val === '__NEW__') {
                                  setIsCreatingNewCategory(true);
                                } else {
                                  setIsCreatingNewCategory(false);
                                  setExpenseForm(prev => ({ ...prev, categoria: val }));
                                }
                              }}
                            >
                              <SelectTrigger className="rounded-xl border-slate-200 h-10 bg-slate-50/30 text-sm">
                                <SelectValue placeholder="Seleccionar categoría" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl bg-white border">
                                {expenseCategoriesList.map((cat) => {
                                  const style = categoryStyleMap[cat] || categoryStyleMap['Otros'];
                                  return (
                                    <SelectItem key={cat} value={cat} className="cursor-pointer hover:bg-slate-50">
                                      <span className="flex items-center gap-2">
                                        <span className="text-base">{style.icon}</span>
                                        <span>{cat}</span>
                                      </span>
                                    </SelectItem>
                                  );
                                })}
                                <SelectItem value="__NEW__" className="text-blue-600 font-bold border-t border-slate-100 mt-1 hover:bg-blue-50 cursor-pointer">
                                  ➕ Crear nueva categoría...
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <label htmlFor="billingLineId" className="text-xs font-bold text-slate-650 uppercase tracking-wide">Línea Contable / Facturación</label>
                            <Select
                              value={expenseForm.billingLineId}
                              onValueChange={(val) => setExpenseForm(prev => ({ ...prev, billingLineId: val }))}
                            >
                              <SelectTrigger className="rounded-xl border-slate-200 h-10 bg-slate-50/30 text-sm">
                                <SelectValue placeholder="Seleccionar línea" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl bg-white border">
                                <SelectItem value="none" className="cursor-pointer hover:bg-slate-50">
                                  <span className="flex items-center gap-2">
                                    <span>💼</span>
                                    <span>Sin línea asociada (General)</span>
                                  </span>
                                </SelectItem>
                                {billingLines.map((line) => (
                                  <SelectItem key={line.id} value={line.id} className="cursor-pointer hover:bg-slate-50">
                                    <span className="flex items-center gap-2">
                                      <span>🔗</span>
                                      <span>{line.name}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {isCreatingNewCategory && (
                          <div className="space-y-1.5 p-3 bg-blue-50/50 border border-blue-100/50 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                            <label htmlFor="nueva-categoria" className="text-[11px] font-bold text-blue-600 uppercase">Nombre de la Nueva Categoría</label>
                            <div className="flex gap-2">
                              <Input
                                id="nueva-categoria"
                                placeholder="Ej. Logística, Licencias"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="rounded-xl border-slate-200 bg-white h-9 text-xs"
                                required
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                  setIsCreatingNewCategory(false);
                                  setNewCategoryName('');
                                }}
                                className="text-slate-400 hover:text-slate-650 hover:bg-transparent px-2 h-9 text-xs"
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-655 uppercase tracking-wide">Comprobante de Soporte</label>
                          <div className="flex flex-col gap-2">
                            {expenseForm.soporteUrl ? (
                              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-150 rounded-xl shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center gap-2.5 truncate">
                                  <div className="p-2 bg-blue-100 rounded-lg text-blue-650 shrink-0">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div className="flex flex-col truncate">
                                    <span className="text-xs text-slate-700 font-bold truncate max-w-[160px]" title={expenseForm.soporteNombre}>
                                      {expenseForm.soporteNombre || 'Archivo Soporte'}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-semibold uppercase">Cargado</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(expenseForm.soporteUrl, '_blank')}
                                    className="h-7 px-2.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-none bg-transparent"
                                  >
                                    Ver
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpenseForm(prev => ({ ...prev, soporteUrl: '', soporteNombre: '' }))}
                                    className="h-7 px-2.5 text-[11px] font-bold text-red-500 hover:text-red-650 hover:bg-red-50 border-none bg-transparent"
                                  >
                                    Quitar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center w-full">
                                <label
                                  htmlFor="file-upload"
                                  className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 cursor-pointer transition-all duration-200"
                                >
                                  <div className="flex flex-col items-center justify-center pt-3 pb-3 text-center px-4">
                                    <Upload className="h-6 w-6 text-slate-400 mb-1" />
                                    <p className="text-xs text-slate-650 font-bold">Subir archivo soporte</p>
                                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium">PNG, JPG, PDF o Excel (Máx 10MB)</p>
                                  </div>
                                  <input
                                    id="file-upload"
                                    type="file"
                                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                                    onChange={handleFileUpload}
                                    disabled={uploadingFile}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            )}
                            {uploadingFile && (
                              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                                <div className="flex justify-between items-center text-[11px] text-slate-550">
                                  <span className="font-bold flex items-center gap-1.5">
                                    <div className="h-3 w-3 rounded-full border border-slate-200 border-t-blue-600 animate-spin" />
                                    Subiendo soporte...
                                  </span>
                                  <span className="font-extrabold">{uploadProgress}%</span>
                                </div>
                                <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                  <div className="bg-blue-600 h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsExpenseModalOpen(false)}
                      className="rounded-xl h-10 px-4 text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-5 text-xs font-bold shadow-md hover:shadow-lg transition-all"
                      disabled={submittingExpense || uploadingFile}
                    >
                      {submittingExpense ? 'Guardando...' : (editingExpense ? 'Guardar Cambios' : 'Registrar Gasto')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* VIRTUAL RECEIPT TICKET PRINT PREVIEW DIALOG */}
            <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
              <DialogContent className="max-w-xl rounded-2xl border-slate-100 shadow-xl p-0 overflow-hidden bg-slate-900/5 bg-white">
                <DialogHeader className="p-6 pb-4 bg-white border-b border-slate-100">
                  <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Printer className="h-5 w-5 text-blue-600" />
                    Comprobante de Egreso de Caja
                  </DialogTitle>
                  <DialogDescription>
                    Vista previa oficial del comprobante de egreso.
                  </DialogDescription>
                </DialogHeader>

                <div className="p-8 flex justify-center items-center max-h-[60vh] overflow-y-auto bg-slate-100/60">
                  {previewExpense && (() => {
                    const businessName = companyProfile?.friendly_name || companyProfile?.friendlyName || 'Merco';
                    const legalName = companyProfile?.legal_name || companyProfile?.legalName || 'TEST SA';
                    const address = companyProfile?.postal_address || companyProfile?.address || 'Av Test 123';
                    const location = `${companyProfile?.city || 'BsAs'}, ${companyProfile?.state || 'CABA'}`;
                    const country = companyProfile?.country || 'Argentina';

                    const formattedDate = new Date(previewExpense.fecha || previewExpense.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    });
                    const formattedTime = previewExpense.created_at ? new Date(previewExpense.created_at).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '';

                    return (
                      <div className="bg-white w-full max-w-[500px] shadow-xl rounded-2xl border border-slate-150 p-8 text-slate-800 relative font-sans text-xs leading-relaxed">
                        {/* Header */}
                        <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4 mb-5">
                          <div className="text-xl font-black text-blue-600 tracking-tight">{businessName}</div>
                          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Comprobante de Egreso</div>
                        </div>

                        {/* Metadata blocks */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                            <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Datos del Emisor</div>
                            <div className="font-bold text-slate-800">{legalName}</div>
                            <div className="text-[10px] text-slate-500 mt-1">{address}</div>
                            <div className="text-[10px] text-slate-500">{location} - {country}</div>
                          </div>

                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                            <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Detalles del Comprobante</div>
                            <div className="font-bold text-slate-800">ID: {previewExpense.id.substring(0, 8).toUpperCase()}</div>
                            <div className="text-[10px] text-slate-500 mt-1">Fecha: {formattedDate} {formattedTime}</div>
                            <div className="text-[10px] text-slate-500">Registrado: {previewExpense.registrado_por || user?.nombre || user?.email || 'Administrador Principal'}</div>
                          </div>
                        </div>

                        {/* Concept and description table style */}
                        <div className="border border-slate-100 rounded-xl overflow-hidden mb-6">
                          <div className="bg-blue-600 text-white font-bold px-4 py-2 text-[10px] uppercase flex justify-between">
                            <span>Concepto y Descripción</span>
                            <span>Importe</span>
                          </div>
                          <div className="p-4 flex justify-between items-start gap-4">
                            <div>
                              <div className="font-bold text-slate-800 text-sm">{previewExpense.concepto}</div>
                              {previewExpense.notas && (
                                <div className="mt-1 text-slate-550 italic text-[11px] bg-slate-50 p-2 rounded border border-slate-100 leading-normal">
                                  Observaciones: {previewExpense.notas}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400 font-semibold mt-2">Categoría: {previewExpense.categoria || 'Otros'}</div>
                            </div>
                            <div className="font-bold text-slate-800 text-right shrink-0">
                              ${Number(previewExpense.monto || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>

                        {/* Total Highlight block */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex justify-between items-center text-slate-900 mb-6">
                          <span className="font-bold text-slate-500 uppercase text-[10px]">Total Egreso</span>
                          <span className="text-base font-black text-blue-600">
                            ${Number(previewExpense.monto || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} ARS
                          </span>
                        </div>

                        {/* Dotted Signatures */}
                        <div className="grid grid-cols-2 gap-8 text-[9px] text-center text-slate-400 pt-6 mt-6 border-t border-dashed border-slate-200">
                          <div className="space-y-1">
                            <div className="border-t border-slate-200 pt-1.5 font-semibold text-slate-600">Firma Autorizada</div>
                            <div>Finanzas / Administración</div>
                          </div>
                          <div className="space-y-1">
                            <div className="border-t border-slate-200 pt-1.5 font-semibold text-slate-600">Firma de Conformidad</div>
                            <div>Receptor del Egreso</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <DialogFooter className="p-4 bg-white border-t border-slate-100 gap-2 flex items-center justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="rounded-xl"
                  >
                    Cerrar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (previewExpense) handlePrintTicket(previewExpense);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 font-semibold"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir / Guardar PDF
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* CHARTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* COMPARATIVE SALES VS EXPENSES */}
            <Card className="shadow-sm border-slate-100 bg-white">
              <CardContent className="pt-6">
                <CardTitle className="text-base flex items-center font-black text-slate-800 uppercase tracking-wider mb-1">
                  <TrendingUp className="mr-2 h-5 w-5 text-blue-500" />
                  Comparativa de Flujo: Ingresos vs Egresos
                </CardTitle>
                <CardDescription className="mb-4">Contraste diario de ventas brutas vs gastos registrados</CardDescription>
                <div className="h-72 w-full">
                  {salesVsExpensesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={salesVsExpensesData} margin={{ top: 10, right: 35, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
                        <YAxis tickFormatter={(val) => `$${val}`} tick={{ fontSize: 11 }} stroke="#64748b" />
                        <RechartsTooltip
                          formatter={(value: number) => [`$${value.toLocaleString('es-ES')}`]}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        />
                        <Legend />
                        <Bar dataKey="Ventas" name="Ventas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={25} />
                        <Bar dataKey="Gastos" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={25} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 font-medium">No hay transacciones registradas en este periodo</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* EXPENSES BY CATEGORY */}
            <Card className="shadow-sm border-slate-100 bg-white">
              <CardContent className="pt-6">
                <CardTitle className="text-base flex items-center font-black text-slate-800 uppercase tracking-wider mb-1">
                  <PieChartIcon className="mr-2 h-5 w-5 text-rose-500" />
                  Distribución de Egresos
                </CardTitle>
                <CardDescription className="mb-4">Agrupación de egresos por tipo de categoría</CardDescription>
                <div className="h-72 w-full">
                  {expensesCategoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensesCategoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {expensesCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number) => [`$${value.toLocaleString('es-ES')}`, 'Gastado']}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 font-medium">Registra un gasto para ver el gráfico</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TABLE OF EXPENSES WITH TABULAR DATA BARS */}
          <Card className="shadow-sm border-slate-100 bg-white">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Historial de Movimientos de Caja</CardTitle>
                <CardDescription>Detalle completo de ingresos y egresos registrados manualmente</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-100 text-slate-550 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-3.5">Concepto</th>
                      <th className="px-6 py-3.5">Categoría</th>
                      <th className="px-6 py-3.5">Fecha</th>
                      <th className="px-6 py-3.5 text-right w-[240px]">Monto y Peso Visual</th>
                      <th className="px-6 py-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                    {unifiedMovements.length > 0 ? (
                      unifiedMovements.map((exp) => {
                        const percent = maxExpenseValue > 0 ? ((exp.monto / maxExpenseValue) * 100) : 0;
                        const isIncome = exp.tipo === 'ingreso';
                        return (
                          <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-800">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                                  exp.isVirtual 
                                    ? "bg-blue-50 text-blue-700 border-blue-100" 
                                    : isIncome
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                      : "bg-rose-50 text-rose-700 border-rose-100"
                                )}>
                                  {exp.isVirtual ? 'Ventas' : isIncome ? 'Ingreso' : 'Egreso'}
                                </span>
                                <span>{exp.concepto}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1 font-normal pl-[52px]">
                                {!exp.isVirtual && (exp.billingLineId || exp.billing_line_id) && (exp.billingLineId !== 'none' && exp.billing_line_id !== 'none') && (() => {
                                  const lineName = billingLines.find(l => String(l.id) === String(exp.billingLineId || exp.billing_line_id))?.name;
                                  if (!lineName) return null;
                                  return (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                                      {lineName}
                                    </span>
                                  );
                                })()}
                                {exp.notes && <span className="text-[11px] text-slate-400 truncate max-w-[180px]" title={exp.notes}>{exp.notes}</span>}
                                {exp.notas && <span className="text-[11px] text-slate-400 truncate max-w-[180px]" title={exp.notas}>{exp.notas}</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                                {exp.categoria || 'Otros'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-550">
                              {new Date(exp.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 text-right relative">
                              <div
                                className="absolute right-6 top-1.5 bottom-1.5 rounded-lg pointer-events-none transition-all duration-500"
                                style={{
                                  width: `${percent * 0.7}%`,
                                  backgroundColor: exp.isVirtual ? 'rgba(59, 130, 246, 0.08)' : isIncome ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)'
                                }}
                              ></div>
                              <span className={cn(
                                "relative z-10 font-bold pr-2",
                                exp.isVirtual ? "text-blue-700" : isIncome ? "text-emerald-700" : "text-rose-700"
                              )}>
                                {isIncome ? '+' : '-'}${Number(exp.monto || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center items-center gap-2">
                                {exp.isVirtual ? (
                                  <button
                                    onClick={handleRedirectToReportes}
                                    className="p-1 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 transition-colors bg-transparent border border-blue-200 cursor-pointer flex items-center gap-1 font-bold text-xs px-2.5 py-1"
                                    title="Ir a Reporte de Ventas"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span>Ver Ventas</span>
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handlePrintTicket(exp)}
                                      className="p-1.5 text-slate-450 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors bg-transparent border-0 cursor-pointer"
                                      title="Imprimir Comprobante"
                                    >
                                      <Printer className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingExpense(exp);
                                        setExpenseForm({
                                          concepto: exp.concepto,
                                          monto: String(exp.monto),
                                          categoria: exp.categoria || 'Mercadería',
                                          fecha: exp.fecha ? exp.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
                                          notas: exp.notas || exp.notes || '',
                                          soporteUrl: exp.soporteUrl || exp.soporte_url || '',
                                          soporteNombre: exp.soporteNombre || exp.soporte_nombre || ''
                                        });
                                        setIsExpenseModalOpen(true);
                                      }}
                                      className="p-1.5 text-slate-450 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors bg-transparent border-0 cursor-pointer"
                                      title="Editar Gasto"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    {(exp.soporteUrl || exp.soporte_url) && (
                                      <button
                                        onClick={() => window.open(exp.soporteUrl || exp.soporte_url, '_blank')}
                                        className="p-1.5 text-slate-450 hover:text-[#C59B4E] rounded-lg hover:bg-amber-50 transition-colors bg-transparent border-0 cursor-pointer"
                                        title={`Ver Soporte: ${exp.soporteNombre || exp.soporte_nombre || 'Archivo'}`}
                                      >
                                        <FileText className="h-4 w-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteExpense(exp.id)}
                                      className="p-1.5 text-slate-450 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors bg-transparent border-0 cursor-pointer"
                                      title="Eliminar Gasto"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-medium">
                          No hay movimientos registrados para este periodo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ================================= FACTURAS Y CFDIs EMITIDOS CARD ================================= */}
          <Card className="border border-slate-100 shadow-sm bg-white mt-6">
            <CardHeader className="pb-3 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Facturas Electrónicas & Comprobantes CFDI
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  CFDIs timbrados en Facturama Sandbox filtrados por la línea elegida arriba.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                <Input
                  placeholder="Buscar por UUID o ID Pedido..."
                  value={searchInvoiceTerm}
                  onChange={(e) => setSearchInvoiceTerm(e.target.value)}
                  className="h-10 text-xs w-full md:w-[260px] rounded-xl border-slate-200"
                />
                <Button
                  variant="outline"
                  onClick={fetchInvoicesAndLines}
                  disabled={loadingInvoices}
                  className="h-10 rounded-xl px-4 flex items-center gap-1.5 text-xs font-semibold text-slate-650"
                >
                  <Activity className={cn("w-3.5 h-3.5", loadingInvoices && "animate-spin")} />
                  Sincronizar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Billing Line KPI Row directly inside card top */}
              <div className="grid grid-cols-1 md:grid-cols-3 border-b divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-slate-50/50">
                <div className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Facturado ({selectedBillingLineId === 'all' ? 'Consolidado' : 'Esta Línea'})</span>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-xl font-black text-emerald-700">
                      ${billingStats.totalFacturado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">MXN</span>
                  </div>
                </div>

                <div className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Facturas Timbradas</span>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-xl font-black text-slate-800">{billingStats.emitidasCount}</span>
                    <span className="text-[10px] font-bold text-slate-450">XML Emitidos</span>
                  </div>
                </div>

                <div className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Canceladas</span>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-xl font-black text-rose-600">{billingStats.canceladasCount}</span>
                    <span className="text-[10px] font-bold text-slate-450">Folios Revocados</span>
                  </div>
                </div>
              </div>

              {loadingInvoices ? (
                <div className="flex justify-center items-center py-12">
                  <Activity className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm font-medium">
                  No se encontraron facturas para la línea de facturación seleccionada.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-550 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-3.5">Folio Fiscal (UUID)</th>
                        <th className="px-6 py-3.5">Línea de Facturación</th>
                        <th className="px-6 py-3.5">ID Pedido</th>
                        <th className="px-6 py-3.5">Fecha</th>
                        <th className="px-6 py-3.5">Estatus</th>
                        <th className="px-6 py-3.5 text-right">Total</th>
                        <th className="px-6 py-3.5 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-755 text-sm">
                      {filteredInvoices.map((inv) => {
                        const lineName = billingLines.find(l => String(l.id) === String(inv.billing_line_id))?.name || 'Sin línea asociada';
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4 font-mono text-[11px] text-slate-500 max-w-[150px] truncate" title={inv.uuid || inv.uuid_fiscal}>
                              {inv.uuid || inv.uuid_fiscal || 'Sin UUID'}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-800">
                              {lineName}
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                              {inv.order_id || inv.orderId || 'Manual'}
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-xs">
                              {new Date(inv.fecha || inv.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                String(inv.estatus || inv.status).toLowerCase() === 'cancelada'
                                  ? "bg-rose-50 text-rose-700 border border-rose-100"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              )}>
                                {inv.estatus || inv.status || 'Válido'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-800">
                              ${Number(inv.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center items-center gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setShowDetailDialog(true);
                                  }}
                                  className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 border-none bg-transparent"
                                  title="Detalles"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setShowPdfDialog(true);
                                  }}
                                  className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 border-none bg-transparent"
                                  title="Imprimir PDF"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setShowXmlDialog(true);
                                  }}
                                  className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 border-none bg-transparent"
                                  title="Ver XML"
                                >
                                  <FileCode className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      {/* Invoice Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-white border sm:max-w-[550px] p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800">Detalle de Factura Electrónica</DialogTitle>
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
                  <span className="text-slate-800 block p-1 font-medium">{new Date(selectedInvoice.fecha).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block mb-1">Total Facturado</span>
                  <span className="text-emerald-700 block font-bold text-sm p-1">
                    ${(parseFloat(selectedInvoice.total) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} MXN
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block mb-1">Estatus</span>
                  <span className="text-emerald-600 block p-1 font-bold">
                    {selectedInvoice.estatus}
                  </span>
                </div>
              </div>

              <div className="border-t pt-3">
                <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Emisor</span>
                <div className="text-xs text-slate-750 bg-slate-50 p-3 rounded border space-y-1">
                  <p><strong>Razón Social:</strong> VOLTIUM SANREY SA DE CV</p>
                  <p><strong>RFC:</strong> VOSA900909AA1</p>
                  <p><strong>Régimen Fiscal:</strong> 601 - General de Ley Personas Morales</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="border-t pt-3 flex justify-end">
            <Button variant="outline" onClick={() => setShowDetailDialog(false)} className="h-10 text-xs rounded-xl font-semibold">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF representation (Voltium Sanrey print sheet) */}
      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="bg-white border sm:max-w-[700px] overflow-y-auto max-h-[90vh] p-0 rounded-2xl shadow-xl">
          <div className="bg-slate-800 text-white p-3.5 flex justify-between items-center sticky top-0 z-50">
            <span className="text-sm font-bold">Representación Impresa Digital - CFDI 4.0</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => toast({ title: 'Impresión', description: 'Enviando copia al spooler...' })}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white flex items-center gap-1 font-semibold"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir
              </Button>
              <Button
                size="sm"
                onClick={() => toast({ title: 'Descarga', description: 'PDF descargado exitosamente.' })}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white flex items-center gap-1 font-semibold"
              >
                <Download className="w-3.5 h-3.5" /> Guardar PDF
              </Button>
            </div>
          </div>

          {selectedInvoice && (
            <div className="p-6 bg-white space-y-6 text-[10px] text-slate-700 leading-relaxed max-w-[650px] mx-auto">
              <div className="grid grid-cols-2 gap-6 border-b pb-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-slate-900">VOLTIUM SANREY SA DE CV</h2>
                  <p><strong>RFC:</strong> VOSA900909AA1</p>
                  <p><strong>Régimen Fiscal:</strong> 601 - General de Ley Personas Morales</p>
                  <p><strong>Domicilio:</strong> Av. Reforma 1234, Col. Centro, CP 26015</p>
                  <p>Piedras Negras, Coahuila, México</p>
                </div>
                <div className="text-right space-y-1">
                  <h2 className="text-xs font-bold text-[#2563EB]">COMPROBANTE FISCAL DIGITAL (CFDI)</h2>
                  <p><strong>Folio Fiscal (UUID):</strong></p>
                  <p className="font-mono font-bold text-slate-800">{selectedInvoice.uuid}</p>
                  <p><strong>No. Serie Certificado SAT:</strong> 00001000000505464943</p>
                  <p><strong>Fecha y Hora de Certificación:</strong> {new Date(selectedInvoice.fecha).toLocaleString()}</p>
                </div>
              </div>

              <div className="border-b pb-4 space-y-1">
                <h3 className="font-bold text-slate-900 uppercase">Datos del Receptor</h3>
                <p><strong>Nombre:</strong> PUBLICO EN GENERAL</p>
                <p><strong>RFC:</strong> XAXX010101000</p>
                <p><strong>Domicilio Fiscal:</strong> CP 26015, México</p>
                <p><strong>Régimen Fiscal Receptor:</strong> 616 - Sin obligaciones fiscales</p>
                <p><strong>Uso CFDI:</strong> S01 - Sin efectos fiscales</p>
              </div>

              <table className="w-full text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 font-bold">
                    <th className="p-2 border-r">Clave SAT</th>
                    <th className="p-2 border-r">Cantidad</th>
                    <th className="p-2 border-r">Descripción</th>
                    <th className="p-2 border-r text-right">Unitario</th>
                    <th className="p-2 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2 border-r font-mono">01010101</td>
                    <td className="p-2 border-r">1.00</td>
                    <td className="p-2 border-r">Venta de productos en tienda (Ref: {selectedInvoice.order_id})</td>
                    <td className="p-2 border-r text-right">${((parseFloat(selectedInvoice.total) || 0) / 1.16).toFixed(2)}</td>
                    <td className="p-2 text-right">${((parseFloat(selectedInvoice.total) || 0) / 1.16).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-4">
                <div className="border p-3 rounded-xl bg-slate-50 space-y-1">
                  <p><strong>Método de Pago:</strong> PUE - Pago en una sola exhibición</p>
                  <p><strong>Forma de Pago:</strong> 01 - Efectivo / 28 - Tarjeta</p>
                  <p><strong>Moneda:</strong> MXN - Peso Mexicano</p>
                </div>
                <div className="space-y-1 text-right">
                  <p>Subtotal: <strong>${((parseFloat(selectedInvoice.total) || 0) / 1.16).toLocaleString('es-ES', { minimumFractionDigits: 2 })} MXN</strong></p>
                  <p>IVA (16%): <strong>${((parseFloat(selectedInvoice.total) || 0) - ((parseFloat(selectedInvoice.total) || 0) / 1.16)).toLocaleString('es-ES', { minimumFractionDigits: 2 })} MXN</strong></p>
                  <p className="text-sm font-bold text-slate-900">Total: ${ (parseFloat(selectedInvoice.total) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 }) } MXN</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900">Sello Digital del Emisor:</h4>
                  <p className="font-mono text-[8px] break-all text-slate-500 bg-slate-50 p-2 border rounded">
                    g8jD29u23hD910uFHuq921HuFw9hD102uFHuq981uFw9hD102uFHuq981uFw9hD102uFHuq981uFw9hD102uFHuq981uFw9hD102uFHuq981uFw9hD102uFHuq981uFw9hD102uFHuq981uFw9hD102uFHuq981uFw9hD102uFHuq981
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Sello Digital del SAT:</h4>
                  <p className="font-mono text-[8px] break-all text-slate-500 bg-slate-50 p-2 border rounded">
                    m109uFw9hD102uFHuq981uFw9hD102uFHuq981uFw9hD102uFHuq981uFw9hD102uFHuq981uFw9hD102uFHuq981uFw9hD102uFHuq981uFw9hD102uFHuq981uFw9hD102uFHuq981uFw9hD102uFHuq981uFw9hD102uFHuq981uF
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="p-4 bg-slate-50 border-t flex justify-end">
            <Button variant="outline" onClick={() => setShowPdfDialog(false)} className="h-10 text-xs font-semibold rounded-xl">
              Cerrar Vista Previa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* XML Code view Dialog */}
      <Dialog open={showXmlDialog} onOpenChange={setShowXmlDialog}>
        <DialogContent className="bg-white border sm:max-w-[650px] p-6 rounded-2xl shadow-xl">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-base font-black text-slate-800">XML de Factura Electrónica (Mock SAT)</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="py-4">
              <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto max-h-[50vh] leading-normal border shadow-inner">
                <code>{getXmlMockContent(selectedInvoice)}</code>
              </pre>
            </div>
          )}
          <DialogFooter className="border-t pt-3 flex justify-end gap-2">
            <Button
              onClick={() => {
                if (selectedInvoice) {
                  navigator.clipboard.writeText(getXmlMockContent(selectedInvoice));
                  toast({ title: 'Copiado', description: 'XML copiado al portapapeles.' });
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-xs text-white h-10 px-4 rounded-xl font-semibold"
            >
              Copiar XML
            </Button>
            <Button variant="outline" onClick={() => setShowXmlDialog(false)} className="h-10 text-xs rounded-xl font-semibold">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
