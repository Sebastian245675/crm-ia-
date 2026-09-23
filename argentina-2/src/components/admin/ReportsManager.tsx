import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { db, getDocs, collection } from '@/firebase';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { getActiveAgencyId, isProductForAgency, isOrderForAgency, isItemForAgency, isContactForAgency } from '@/lib/agency-isolation';
import { formatCurrency } from '@/lib/currency';
import { isRealSaleOrder, sumRealSales } from '@/lib/sales';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import {
  TrendingUp, CreditCard, DollarSign, Package, ShoppingCart, Activity, Filter, BarChart3,
  PieChart as PieChartIcon, Plus, Trash2, Edit, Users, Monitor, Smartphone, Globe, Calendar, CalendarDays, ArrowUpRight, ArrowDownRight, RefreshCw, Printer
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ec4899', '#14b8a6'];

export const ReportsManager: React.FC = () => {
  const { user } = useAuth();
  const activeAgencyId = useMemo(() => getActiveAgencyId(user), [user]);
  const isSupabase = typeof (db as any)?.from === 'function';
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);

  // New raw datasets
  const [expenses, setExpenses] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  // States for charts
  const [salesData, setSalesData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [topProductsData, setTopProductsData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [priceHistoryData, setPriceHistoryData] = useState<any[]>([]);

  // Filter states
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'7days' | '30days' | 'year' | 'all' | 'custom'>('30days');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');

  // KPI states - Sales
  const [kpiTotalSales, setKpiTotalSales] = useState(0);
  const [kpiAvgTicket, setKpiAvgTicket] = useState(0);
  const [kpiTotalOrders, setKpiTotalOrders] = useState(0);

  // KPI states - Expenses
  const [kpiTotalExpenses, setKpiTotalExpenses] = useState(0);
  const [kpiNetProfit, setKpiNetProfit] = useState(0);
  const [expensesCategoryData, setExpensesCategoryData] = useState<any[]>([]);
  const [salesVsExpensesData, setSalesVsExpensesData] = useState<any[]>([]);

  // KPI states - Visits & Clients
  const [kpiTotalVisits, setKpiTotalVisits] = useState(0);
  const [kpiUniqueVisitors, setKpiUniqueVisitors] = useState(0);
  const [kpiConversionRate, setKpiConversionRate] = useState(0);
  const [kpiNewClients, setKpiNewClients] = useState(0);
  const [visitsTrendData, setVisitsTrendData] = useState<any[]>([]);
  const [devicesData, setDevicesData] = useState<any[]>([]);
  const [popularPagesData, setPopularPagesData] = useState<any[]>([]);
  const [recentTraffic, setRecentTraffic] = useState<any[]>([]);

  // BI and Looker Studio States
  const [salesTrendAcumData, setSalesTrendAcumData] = useState<any[]>([]);
  const [salesDayOfWeekData, setSalesDayOfWeekData] = useState<any[]>([]);
  const [maxExpenseValue, setMaxExpenseValue] = useState<number>(0);
  const [conversionFunnelData, setConversionFunnelData] = useState<any[]>([]);
  const [browsersData, setBrowsersData] = useState<any[]>([]);

  // Expense category creation states
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [companyProfile, setCompanyProfile] = useState<any>(null);

  // Preview receipt states
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewExpense, setPreviewExpense] = useState<any>(null);
  const [showSaleDetails, setShowSaleDetails] = useState<boolean>(false);
  const [filteredOrdersList, setFilteredOrdersList] = useState<any[]>([]);
  const [billingLines, setBillingLines] = useState<any[]>([]);

  const expenseCategoriesList = useMemo(() => {
    const defaults = ['Mercadería', 'Marketing', 'Servicios', 'Alquiler', 'Salarios', 'Impuestos', 'Otros'];
    const customCategories = expenses
      .map(exp => exp.categoria)
      .filter((cat): cat is string => typeof cat === 'string' && cat.trim() !== '');

    return Array.from(new Set([...defaults, ...customCategories]));
  }, [expenses]);

  // Expense form state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    concepto: '',
    monto: '',
    categoria: 'Mercadería',
    fecha: new Date().toISOString().split('T')[0],
    notas: ''
  });
  const [submittingExpense, setSubmittingExpense] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeAgencyId]);

  useEffect(() => {
    processData();
  }, [orders, products, expenses, visits, contacts, timeFilter, customStartDate, customEndDate, selectedEmployeeFilter]);

  useEffect(() => {
    if (priceHistory.length > 0 || products.length > 0) {
      processPriceHistory();
    }
  }, [priceHistory, products, selectedProduct]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isSupabase) {
        // Fetch Orders
        const { data: ordersData } = await db.from("orders").select("*").order("created_at", { ascending: true });
        if (ordersData) {
          setOrders(ordersData.filter((o: any) => isOrderForAgency(o, activeAgencyId)));
        }

        // Fetch Products
        const { data: productsData } = await db.from("products").select("*");
        if (productsData) {
          setProducts(productsData.filter((p: any) => isProductForAgency(p, activeAgencyId)));
        }

        // Fetch Price History
        const { data: phData } = await db.from("price_history").select("*").order("fecha", { ascending: true });
        if (phData) setPriceHistory(phData);

        // Fetch Expenses
        const { data: expensesData } = await db.from("gastos").select("*");
        if (expensesData && Array.isArray(expensesData)) {
          setExpenses(expensesData.filter((g: any) => isItemForAgency(g, activeAgencyId)));
        }

        // Fetch Website Visits
        const { data: visitsData } = await db.from("website_visits").select("*");
        if (visitsData && Array.isArray(visitsData)) {
          setVisits(visitsData);
        }

        // Fetch Contacts
        const { data: contactsData } = await db.from("contacts").select("*");
        if (contactsData && Array.isArray(contactsData)) {
          setContacts(contactsData.filter((c: any) => isContactForAgency(c, activeAgencyId)));
        }

        // Fetch Company Profile
        const agencyOwnerId = activeAgencyId || '2';
        const { data: compData } = await db.from("company_profile").select("*").or(`owner_id.eq.${agencyOwnerId},agency_id.eq.${agencyOwnerId}`);
        if (compData && compData.length > 0) {
          setCompanyProfile(compData[0]);
        } else {
          setCompanyProfile(null);
        }

        // Fetch Billing Lines
        const { data: linesData } = await db.from("lineas_facturacion").select("*");
        if (linesData) {
          setBillingLines(linesData.filter((l: any) => isItemForAgency(l, activeAgencyId)));
        }

        // Fetch Employees (Sub-accounts)
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
        setOrders(ordersQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((o: any) => isOrderForAgency(o, activeAgencyId)));

        const productsQuerySnapshot = await getDocs(collection(db, "products"));
        setProducts(productsQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

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
      console.error("Error fetching data for reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const processData = () => {
    // 1. Time filtering (avoiding mutation)
    const now = new Date();
    let startCutoff = new Date(0); // all time
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

    // Filter Sales
    const filteredOrders = orders.filter(o => {
      const date = new Date(o.created_at || o.createdAt);
      const matchesTime = isRealSaleOrder(o) && date >= startCutoff && date <= endCutoff;
      if (!matchesTime) return false;

      if (selectedEmployeeFilter === 'all') return true;
      if (selectedEmployeeFilter === 'none') {
        return !o.employee_id && !o.employeeId;
      }
      return o.employee_id === selectedEmployeeFilter || o.employeeId === selectedEmployeeFilter;
    });

    // Filter Expenses
    const filteredExpenses = expenses.filter(e => {
      const date = new Date(e.fecha || e.created_at);
      return date >= startCutoff && date <= endCutoff;
    });

    // Filter Visits
    const filteredVisits = visits.filter(v => {
      const date = new Date(v.timestamp || v.created_at);
      return date >= startCutoff && date <= endCutoff;
    });

    // Filter Contacts
    const filteredContacts = contacts.filter(c => {
      const date = new Date(c.created_at);
      return date >= startCutoff && date <= endCutoff;
    });

    // --- SALES KPI & CHARTS ---
    const totalSales = sumRealSales(filteredOrders);
    setKpiTotalSales(totalSales);
    setKpiTotalOrders(filteredOrders.length);
    setKpiAvgTicket(filteredOrders.length > 0 ? totalSales / filteredOrders.length : 0);

    const salesMap = new Map();
    const paymentMap = new Map();
    const productSalesMap = new Map();
    const categorySalesMap = new Map();
    const dayOfWeekMap = new Map([
      ['Domingo', 0],
      ['Lunes', 0],
      ['Martes', 0],
      ['Miércoles', 0],
      ['Jueves', 0],
      ['Viernes', 0],
      ['Sábado', 0]
    ]);
    const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    filteredOrders.forEach(order => {
      const dateStr = order.created_at || order.createdAt;
      if (dateStr) {
        const date = new Date(dateStr);
        // Sales over time
        const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        salesMap.set(day, (salesMap.get(day) || 0) + (Number(order.total) || 0));

        // Day of week
        const dayName = DAYS_OF_WEEK[date.getDay()];
        dayOfWeekMap.set(dayName, (dayOfWeekMap.get(dayName) || 0) + (Number(order.total) || 0));
      }

      // Payment Methods
      const method = order.payment_method || order.paymentMethod || 'desconocido';
      paymentMap.set(method, (paymentMap.get(method) || 0) + 1);

      // Top Products & Categories (parsing items JSON)
      let items = [];
      if (typeof order.items === 'string') {
        try { items = JSON.parse(order.items); } catch (e) { }
      } else if (Array.isArray(order.items)) {
        items = order.items;
      }

      items.forEach((item: any) => {
        const pId = item.id;
        const currentQty = productSalesMap.get(pId) || { name: item.name || item.title || 'Desconocido', qty: 0 };
        productSalesMap.set(pId, { name: currentQty.name, qty: currentQty.qty + (Number(item.quantity) || 1) });

        const productData = products.find(p => String(p.id) === String(pId));
        const categoryName = productData?.category_name || productData?.categoryName || productData?.category || 'Sin Categoría';
        categorySalesMap.set(categoryName, (categorySalesMap.get(categoryName) || 0) + (Number(item.price) * Number(item.quantity) || 0));
      });
    });

    // 1. Basic Sales Evolution
    const salesEvolution = Array.from(salesMap.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setSalesData(salesEvolution);

    // 2. Cumulative Sales evolution
    let currentCumulative = 0;
    const salesEvolutionAcum = salesEvolution.map(item => {
      currentCumulative += item.total;
      return {
        date: item.date,
        Ventas: item.total,
        Acumulado: currentCumulative
      };
    });
    setSalesTrendAcumData(salesEvolutionAcum);

    // 3. Day of week distribution
    setSalesDayOfWeekData(Array.from(dayOfWeekMap.entries()).map(([name, total]) => ({ name, Ventas: total })));

    setPaymentData(Array.from(paymentMap.entries())
      .map(([name, value]) => ({ name, value }))
    );

    setTopProductsData(Array.from(productSalesMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
    );

    setCategoryData(Array.from(categorySalesMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    );

    // --- EXPENSES KPI & CHARTS ---
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.monto) || 0), 0);
    setKpiTotalExpenses(totalExpenses);
    setKpiNetProfit(totalSales - totalExpenses);

    // Max Expense calculation for data bars
    const maxExpVal = filteredExpenses.reduce((max, exp) => Math.max(max, Number(exp.monto) || 0), 0);
    setMaxExpenseValue(maxExpVal);

    const expenseCategoryMap = new Map();
    filteredExpenses.forEach(exp => {
      const cat = exp.categoria || 'Otros';
      expenseCategoryMap.set(cat, (expenseCategoryMap.get(cat) || 0) + (Number(exp.monto) || 0));
    });

    setExpensesCategoryData(Array.from(expenseCategoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    );

    // Sales vs Expenses Chart
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

    // --- VISITS & CLIENTS KPI & CHARTS ---
    const totalVisitsCount = filteredVisits.length;
    setKpiTotalVisits(totalVisitsCount);

    const uniqueVisitsSet = new Set(filteredVisits.map(v => v.session_id));
    const uniqueVisitorsCount = uniqueVisitsSet.size;
    setKpiUniqueVisitors(uniqueVisitorsCount);

    setKpiNewClients(filteredContacts.length);
    setKpiConversionRate(totalVisitsCount > 0 ? (filteredOrders.length / totalVisitsCount) * 100 : 0);

    // Funnel Steps data
    setConversionFunnelData([
      { name: '1. Visitas Totales', Cantidad: totalVisitsCount, fill: '#3b82f6' },
      { name: '2. Visitantes Únicos', Cantidad: uniqueVisitorsCount, fill: '#8b5cf6' },
      { name: '3. Ventas Registradas', Cantidad: filteredOrders.length, fill: '#10b981' }
    ]);

    const visitsByDayMap = new Map();
    filteredVisits.forEach(visit => {
      const dateStr = visit.timestamp || visit.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        visitsByDayMap.set(day, (visitsByDayMap.get(day) || 0) + 1);
      }
    });

    setVisitsTrendData(Array.from(visitsByDayMap.entries())
      .map(([date, visits]) => ({ date, visits }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    );

    const deviceMap = new Map();
    const browserMap = new Map();
    filteredVisits.forEach(v => {
      let dev = 'Desktop';
      if (v.device_info?.device) {
        dev = v.device_info.device;
      } else if (v.device_info?.isMobile) {
        dev = 'Mobile';
      }
      deviceMap.set(dev, (deviceMap.get(dev) || 0) + 1);

      // Browser breakdown
      const br = v.device_info?.browser || 'Chrome';
      browserMap.set(br, (browserMap.get(br) || 0) + 1);
    });

    setDevicesData(Array.from(deviceMap.entries())
      .map(([name, value]) => ({ name, value }))
    );

    setBrowsersData(Array.from(browserMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    );

    const pageMap = new Map();
    filteredVisits.forEach(v => {
      const title = v.page_title || v.page_url || 'Sin título';
      pageMap.set(title, (pageMap.get(title) || 0) + 1);
    });

    setPopularPagesData(Array.from(pageMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    );

    const recentTrafficData = [...filteredVisits]
      .sort((a, b) => new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime())
      .slice(0, 5);
    setRecentTraffic(recentTrafficData);

    setFilteredOrdersList(filteredOrders);
  };

  const processPriceHistory = () => {
    if (selectedProduct === 'all') {
      setPriceHistoryData([]);
      return;
    }

    const product = products.find(p => String(p.id) === String(selectedProduct));
    if (!product) return;

    // Filter history for this product
    const history = priceHistory
      .filter(ph => String(ph.product_id) === String(selectedProduct))
      .map(ph => {
        const d = new Date(ph.fecha || ph.created_at);
        return {
          fecha: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
          precio: Number(ph.price),
          timestamp: d.getTime()
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    // If no history exists, we just show the current price as a single data point
    if (history.length === 0) {
      setPriceHistoryData([{
        fecha: 'Precio Actual',
        precio: Number(product.price || 0)
      }]);
    } else {
      // Append current price to the end if the last history entry is different
      const lastEntry = history[history.length - 1];
      const currentPrice = Number(product.price || 0);
      if (lastEntry.precio !== currentPrice) {
        history.push({
          fecha: 'Hoy',
          precio: currentPrice,
          timestamp: Date.now()
        });
      }
      setPriceHistoryData(history);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.concepto || !expenseForm.monto) return;

    setSubmittingExpense(true);
    try {
      const cat = isCreatingNewCategory ? newCategoryName.trim() : expenseForm.categoria;
      const expenseData = {
        concepto: expenseForm.concepto,
        monto: Number(expenseForm.monto),
        categoria: cat || 'Otros',
        fecha: expenseForm.fecha,
        notas: expenseForm.notas,
        id: editingExpense?.id || `gasto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: editingExpense?.created_at || new Date().toISOString(),
        registrado_por: editingExpense?.registrado_por || user?.nombre || user?.email || 'Administrador Principal',
        agency_id: activeAgencyId || '2',
        owner_id: activeAgencyId || '2'
      };

      if (editingExpense) {
        const { error } = await db.from("gastos").update(expenseData).eq("id", editingExpense.id);
        if (!error) {
          setExpenses(prev => prev.map(exp => exp.id === editingExpense.id ? expenseData : exp));
        }
      } else {
        const { error } = await db.from("gastos").insert(expenseData);
        if (!error) {
          setExpenses(prev => [expenseData, ...prev]);
        }
      }
      setIsExpenseModalOpen(false);
      setEditingExpense(null);
      setIsCreatingNewCategory(false);
      setNewCategoryName('');
      setExpenseForm({
        concepto: '',
        monto: '',
        categoria: 'Mercadería',
        fecha: new Date().toISOString().split('T')[0],
        notas: ''
      });
    } catch (error) {
      console.error("Error saving expense:", error);
    } finally {
      setSubmittingExpense(false);
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
              margin: 0 auto;
              padding: 15px;
              border: 1px dashed #ccc;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .title {
              font-size: 16px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin: 5px 0;
            }
            .subtitle {
              font-size: 12px;
              margin-bottom: 5px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            .details {
              font-size: 12px;
              line-height: 1.5;
            }
            .flex-row {
              display: flex;
              justify-content: space-between;
            }
            .total-row {
              font-size: 14px;
              font-weight: bold;
              margin-top: 15px;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 8px 0;
            }
            .footer {
              text-align: center;
              font-size: 10px;
              margin-top: 25px;
              color: #555;
            }
            .barcode {
              text-align: center;
              margin-top: 15px;
              font-size: 11px;
              letter-spacing: 3px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${businessName}</div>
            ${address ? `<div class="subtitle">${address}</div>` : ''}
            ${location ? `<div class="subtitle">${location} - ${country}</div>` : ''}
            <div class="divider"></div>
            <div class="title" style="font-size: 14px;">Comprobante de Gasto</div>
            <div style="font-size: 10px; color: #555; margin-top: 4px;">ID: ${exp.id}</div>
          </div>
          
          <div class="details">
            <div class="flex-row">
              <span>Fecha:</span>
              <span>${formattedDate} ${formattedTime}</span>
            </div>
            <div class="flex-row">
              <span>Registrado por:</span>
              <span>${creator}</span>
            </div>
            <div class="flex-row">
              <span>Categoría:</span>
              <span>${exp.categoria || 'Otros'}</span>
            </div>
            
            <div class="divider"></div>
            
            <div style="margin: 10px 0;">
              <span style="font-weight: bold; text-transform: uppercase;">Concepto:</span>
              <div style="margin-top: 4px; padding-left: 10px;">${exp.concepto}</div>
              ${exp.notas ? `<div style="margin-top: 6px; padding-left: 10px; font-size: 11px; color: #555; font-style: italic;">Nota: ${exp.notas}</div>` : ''}
            </div>
            
            <div class="flex-row total-row">
              <span>IMPORTE TOTAL:</span>
              <span>{formatCurrency(Number(exp.monto || 0))}</span>
            </div>
          </div>
          
          <div class="barcode">
            ||||| | | || ||| || |||| | |||
            <div style="font-size: 9px; letter-spacing: normal; margin-top: 4px;">SISTEMA CRM DE GESTIÓN</div>
          </div>

          <div class="footer">
            <p>Este documento sirve como comprobante físico oficial del registro de este egreso.</p>
            <p>¡Gracias por mantener las finanzas organizadas!</p>
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

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este gasto?")) return;
    try {
      const { error } = await db.from("gastos").delete().eq("id", id);
      if (!error) {
        setExpenses(prev => prev.filter(exp => exp.id !== id));
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <Activity className="animate-spin h-10 w-10 text-blue-600" />
        <p className="text-slate-500 font-medium animate-pulse text-sm">Cargando analíticas comerciales avanzadas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER & FILTERS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center">
            <BarChart3 className="mr-3 h-7 w-7 text-blue-600" />
            Analítica e inteligencia de negocio
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-semibold">Reporte ejecutivo con métricas y gráficos en tiempo real</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
          {/* Employee Filter */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0">
            <Users className="h-4 w-4 text-slate-500 ml-2" />
            <Select value={selectedEmployeeFilter} onValueChange={(val: any) => setSelectedEmployeeFilter(val)}>
              <SelectTrigger className="w-[180px] bg-transparent border-none shadow-none focus:ring-0 text-slate-700 font-semibold">
                <SelectValue placeholder="Todos los Empleados" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-150 bg-white z-50">
                <SelectItem value="all">Todos los Empleados</SelectItem>
                <SelectItem value="none">Venta Web / General</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id} className="cursor-pointer">
                    {emp.nombre || emp.name || 'Sin nombre'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0">
            <Filter className="h-4 w-4 text-slate-500 ml-2" />
            <Select value={timeFilter} onValueChange={(val: any) => setTimeFilter(val)}>
              <SelectTrigger className="w-[180px] bg-transparent border-none shadow-none focus:ring-0 text-slate-700 font-semibold">
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-150 bg-white z-50">
                <SelectItem value="7days">Últimos 7 días</SelectItem>
                <SelectItem value="30days">Últimos 30 días</SelectItem>
                <SelectItem value="year">Último año</SelectItem>
                <SelectItem value="all">Histórico completo</SelectItem>
                <SelectItem value="custom" className="text-blue-600 font-bold border-t border-slate-100 mt-1 cursor-pointer">Rango Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {timeFilter === 'custom' && (
            <div className="flex flex-row items-center gap-2 p-1 bg-slate-50 border border-slate-100 rounded-xl px-3 animate-in fade-in slide-in-from-left-2 duration-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Desde</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-lg border-slate-200 h-8 bg-white text-xs w-[130px] font-medium"
              />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Hasta</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-lg border-slate-200 h-8 bg-white text-xs w-[130px] font-medium"
              />
            </div>
          )}
          {/* Toggle Sale Details */}
          <button
            onClick={() => setShowSaleDetails(prev => !prev)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer h-[44px] select-none",
              showSaleDetails
                ? "bg-blue-600 border-blue-600 text-white shadow-sm hover:bg-blue-700"
                : "bg-slate-50 border-slate-150 text-slate-650 hover:bg-slate-100"
            )}
          >
            <ShoppingCart className="h-4 w-4" />
            <span>{showSaleDetails ? 'Ocultar Detalle' : 'Mostrar Detalle'}</span>
          </button>
        </div>
      </div>

      <Tabs defaultValue="ventas" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-xl p-1 bg-slate-100 rounded-xl border border-slate-200">
          <TabsTrigger value="ventas" className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all">
            <ShoppingCart className="h-4 w-4" /> Ventas y Precios
          </TabsTrigger>
          <TabsTrigger value="gastos" className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all">
            <DollarSign className="h-4 w-4" /> Gastos Comerciales
          </TabsTrigger>
          <TabsTrigger value="visitas" className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all">
            <Users className="h-4 w-4" /> Visitas y Clientes
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB: VENTAS & PRECIOS ================= */}
        <TabsContent value="ventas" className="space-y-6 focus-visible:outline-none">
          <Tabs defaultValue="analisis_ventas" className="w-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <TabsList className="bg-slate-50 border border-slate-150 p-0.5 rounded-lg flex space-x-1">
                <TabsTrigger value="analisis_ventas" className="text-xs font-semibold py-1.5 px-3 rounded-md">Análisis de Ventas</TabsTrigger>
                <TabsTrigger value="variacion_precios" className="text-xs font-semibold py-1.5 px-3 rounded-md">Historial de Precios</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="analisis_ventas" className="space-y-6">
              {/* KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border border-slate-100 shadow-sm relative overflow-hidden">
                  <CardContent className="p-6 flex justify-between items-start">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Ingresos Totales</p>
                      <h3 className="text-3xl font-black text-slate-800">{formatCurrency(kpiTotalSales)}</h3>
                      <p className="text-[11px] text-emerald-600 mt-1 flex items-center font-bold">
                        <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> Total facturado bruto
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <DollarSign className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-slate-100 shadow-sm relative overflow-hidden">
                  <CardContent className="p-6 flex justify-between items-start">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Ticket Promedio</p>
                      <h3 className="text-3xl font-black text-slate-800">{formatCurrency(Math.round(kpiAvgTicket))}</h3>
                      <p className="text-[11px] text-blue-600 mt-1 flex items-center font-bold">
                        <TrendingUp className="h-3.5 w-3.5 mr-0.5" /> Promedio por transacción
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-slate-100 shadow-sm relative overflow-hidden">
                  <CardContent className="p-6 flex justify-between items-start">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Pedidos</p>
                      <h3 className="text-3xl font-black text-slate-800">{kpiTotalOrders}</h3>
                      <p className="text-[11px] text-purple-600 mt-1 flex items-center font-bold">
                        <ShoppingCart className="h-3.5 w-3.5 mr-0.5" /> Órdenes completadas
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                      <ShoppingCart className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* CHARTS GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* DUAL AXIS SALES TREND & CUMULATIVE */}
                <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-100">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center font-black text-slate-800 uppercase tracking-wider">
                      <TrendingUp className="mr-2 h-5 w-5 text-blue-500" />
                      Ingresos Diarios y Acumulados
                    </CardTitle>
                    <CardDescription>Visualización BI de ventas del día vs crecimiento acumulado del periodo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 w-full">
                      {salesTrendAcumData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={salesTrendAcumData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
                            <YAxis yAxisId="left" tickFormatter={(val) => `$${val}`} tick={{ fontSize: 11 }} stroke="#3b82f6" />
                            <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `$${val}`} tick={{ fontSize: 11 }} stroke="#8b5cf6" />
                            <RechartsTooltip
                              formatter={(value: number, name: string) => [formatCurrency(value), name]}
                              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            />
                            <Legend />
                            <Bar yAxisId="left" dataKey="Ventas" name="Ingreso Diario" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                            <Area yAxisId="right" type="monotone" dataKey="Acumulado" name="Total Acumulado" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.06} strokeWidth={3} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 font-medium">No hay datos de ventas en este periodo</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* SALES BY DAY OF WEEK */}
                <Card className="shadow-sm border-slate-100">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center font-black text-slate-800 uppercase tracking-wider">
                      <CalendarDays className="mr-2 h-5 w-5 text-emerald-500" />
                      Ventas por Día de la Semana
                    </CardTitle>
                    <CardDescription>Caja acumulada agrupada por día laboral</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 w-full">
                      {salesDayOfWeekData.some(d => d.Ventas > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={salesDayOfWeekData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                            <YAxis tickFormatter={(val) => `$${val}`} tick={{ fontSize: 11 }} stroke="#64748b" />
                            <RechartsTooltip
                              formatter={(value: number) => [formatCurrency(value), 'Total Ventas']}
                              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            />
                            <Bar dataKey="Ventas" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 font-medium">Sin datos de compras esta semana</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* HIGH DENSITY CHART ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* TOP PRODUCTS CHART */}
                <Card className="shadow-sm border-slate-100">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center font-black text-slate-800 uppercase tracking-wider">
                      <Package className="mr-2 h-5 w-5 text-orange-500" />
                      Top 5 Productos Más Vendidos
                    </CardTitle>
                    <CardDescription>Unidades vendidas por producto</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 w-full">
                      {topProductsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topProductsData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" stroke="#64748b" />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} stroke="#64748b" />
                            <RechartsTooltip
                              formatter={(value: number) => [value, 'Unidades']}
                              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            />
                            <Bar dataKey="qty" fill="#f97316" radius={[0, 4, 4, 0]}>
                              {topProductsData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 font-medium">No hay datos de productos vendidos</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* SALES BY CATEGORY */}
                <Card className="shadow-sm border-slate-100">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center font-black text-slate-800 uppercase tracking-wider">
                      <PieChartIcon className="mr-2 h-5 w-5 text-purple-500" />
                      Ingresos por Categoría
                    </CardTitle>
                    <CardDescription>Distribución de ventas según el tipo de producto</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 w-full">
                      {categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={85}
                              paddingAngle={4}
                              dataKey="value"
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              labelLine={false}
                            >
                              {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              formatter={(value: number) => [formatCurrency(value), 'Ingresos']}
                              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 font-medium">No hay datos de categorías</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* TRANSACTION DETAILS TABLE */}
              {showSaleDetails && (
                <Card className="shadow-sm border-slate-100 bg-white mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-800">Desglose Renglón a Renglón de Ventas</CardTitle>
                      <CardDescription>Detalle de todas las ventas que componen los gráficos e indicadores analíticos</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-y border-slate-100 text-slate-550 text-xs font-bold uppercase tracking-wider">
                            <th className="px-6 py-3.5">Pedido / Cliente</th>
                            <th className="px-6 py-3.5">Vendedor / Registro</th>
                            <th className="px-6 py-3.5">Línea de Facturación</th>
                            <th className="px-6 py-3.5">Fecha</th>
                            <th className="px-6 py-3.5">Método de Pago</th>
                            <th className="px-6 py-3.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                          {filteredOrdersList.length > 0 ? (
                            filteredOrdersList.map((order) => {
                              const empName = order.employeeName || order.employee_name ||
                                              employees.find(e => String(e.id) === String(order.employee_id || order.employeeId))?.nombre ||
                                              'Venta Web / General';

                              const paymentMethod = order.payment_method || order.paymentMethod || 'Efectivo';
                              const clientName = order.cliente?.nombre || order.client_name || order.clientName || 'Cliente General';
                              const lineName = billingLines.find(l => String(l.id) === String(order.billingLineId || order.billing_line_id))?.name || 'General';

                              return (
                                <tr key={order.id || order.created_at} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4 font-semibold text-slate-800">
                                    <div>Order #{String(order.id || '').slice(-6).toUpperCase()}</div>
                                    <div className="text-xs text-slate-400 font-normal mt-0.5">{clientName}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                                      {empName}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={cn(
                                      "inline-flex px-2.5 py-0.5 rounded text-[10px] font-bold border",
                                      lineName === 'General'
                                        ? "bg-slate-50 text-slate-600 border-slate-200"
                                        : "bg-blue-50 text-blue-700 border-blue-100"
                                    )}>
                                      {lineName}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-slate-550">
                                    {new Date(order.created_at || order.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{paymentMethod}</span>
                                  </td>
                                  <td className="px-6 py-4 text-right font-black text-slate-800">
                                    {formatCurrency(Number(order.total || 0))}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">
                                No hay ventas filtradas que coincidan en este periodo.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="variacion_precios" className="space-y-6">
              {/* PRICE HISTORY CHART (REAL DATA) */}
              <Card className="shadow-sm border-slate-100">
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-50 mb-4 gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center font-bold text-slate-800">
                      <DollarSign className="mr-2 h-5 w-5 text-teal-500" />
                      Historial Real de Precios
                    </CardTitle>
                    <CardDescription>Variación real del precio del producto basada en tus actualizaciones</CardDescription>
                  </div>
                  <div className="w-full md:w-64">
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger className="w-full bg-slate-50 border border-slate-200 rounded-xl">
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">Selecciona un producto...</SelectItem>
                        {products.map(p => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedProduct === 'all' ? (
                    <div className="h-60 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-450 space-y-2">
                      <DollarSign className="h-8 w-8 text-slate-400 stroke-[1.5]" />
                      <p className="text-sm font-medium">Selecciona un producto en el menú superior para ver su historial de precios.</p>
                    </div>
                  ) : (
                    <div className="h-80 w-full">
                      {priceHistoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={priceHistoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="fecha" tick={{ fontSize: 12 }} stroke="#64748b" />
                            <YAxis domain={['auto', 'auto']} tickFormatter={(val) => `$${val}`} tick={{ fontSize: 12 }} stroke="#64748b" />
                            <RechartsTooltip
                              formatter={(value: number) => [formatCurrency(value), 'Precio Histórico']}
                              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            />
                            <Line
                              type="stepAfter"
                              dataKey="precio"
                              name="Precio ($)"
                              stroke="#14b8a6"
                              strokeWidth={3}
                              activeDot={{ r: 8, fill: "#14b8a6" }}
                              dot={{ r: 6, fill: "#14b8a6" }}
                              animationDuration={1500}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 font-medium">Este producto no tiene historial de precios registrado.</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ================= TAB: GASTOS COMERCIALES ================= */}
        <TabsContent value="gastos" className="space-y-6 focus-visible:outline-none">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white border border-slate-100 shadow-sm relative overflow-hidden">
              <CardContent className="p-6 flex justify-between items-start">
                <div>
                  <p className="text-slate-505 text-[11px] font-bold uppercase tracking-wider mb-1">Caja total de Ventas</p>
                  <h3 className="text-2xl font-black text-slate-800">{formatCurrency(kpiTotalSales)}</h3>
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
                  <p className="text-slate-505 text-[11px] font-bold uppercase tracking-wider mb-1">Gastos Operacionales</p>
                  <h3 className="text-2xl font-black text-rose-600">{formatCurrency(kpiTotalExpenses)}</h3>
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
                  <p className="text-slate-505 text-[11px] font-bold uppercase tracking-wider mb-1">Balance de Caja</p>
                  <h3 className={cn(
                    "text-2xl font-black",
                    kpiNetProfit >= 0 ? "text-emerald-700" : "text-red-700"
                  )}>
                    {formatCurrency(kpiNetProfit)}
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
                  <p className="text-slate-505 text-[11px] font-bold uppercase tracking-wider mb-1">Eficiencia Operativa</p>
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
              <p className="text-xs text-slate-550 mt-0.5">Controla y edita todos los egresos registrados de tu comercio</p>
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
                  categoria: 'Mercadería',
                  fecha: new Date().toISOString().split('T')[0],
                  notas: ''
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1 font-semibold">
                  <Plus className="h-4 w-4" /> Registrar Gasto
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl border-slate-100 shadow-lg max-w-md">
                <form onSubmit={handleSaveExpense}>
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black text-slate-800">
                      {editingExpense ? 'Modificar Gasto' : 'Registrar Nuevo Gasto'}
                    </DialogTitle>
                    <DialogDescription>
                      Ingresa el detalle y monto del egreso correspondiente.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                      <label htmlFor="concepto" className="text-xs font-bold text-slate-600 uppercase">Concepto / Descripción</label>
                      <Input
                        id="concepto"
                        placeholder="Ej. Compra de empaques, Hosting web"
                        value={expenseForm.concepto}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, concepto: e.target.value }))}
                        className="rounded-xl border-slate-200"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="monto" className="text-xs font-bold text-slate-600 uppercase">Monto ($)</label>
                        <Input
                          id="monto"
                          type="number"
                          placeholder="0.00"
                          value={expenseForm.monto}
                          onChange={(e) => setExpenseForm(prev => ({ ...prev, monto: e.target.value }))}
                          className="rounded-xl border-slate-200"
                          min="0"
                          step="any"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="fecha" className="text-xs font-bold text-slate-600 uppercase">Fecha</label>
                        <Input
                          id="fecha"
                          type="date"
                          value={expenseForm.fecha}
                          onChange={(e) => setExpenseForm(prev => ({ ...prev, fecha: e.target.value }))}
                          className="rounded-xl border-slate-200"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="categoria" className="text-xs font-bold text-slate-600 uppercase">Categoría</label>
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
                          <SelectTrigger className="rounded-xl border-slate-200">
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {expenseCategoriesList.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                            <SelectItem value="__NEW__" className="text-blue-600 font-bold border-t border-slate-100 mt-1 hover:bg-blue-50 cursor-pointer">
                              + Crear nueva categoría...
                            </SelectItem>
                          </SelectContent>
                        </Select>
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
                              className="rounded-xl border-slate-200 bg-white"
                              required
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setIsCreatingNewCategory(false);
                                setNewCategoryName('');
                              }}
                              className="text-slate-400 hover:text-slate-600 hover:bg-transparent px-2"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="notas" className="text-xs font-bold text-slate-600 uppercase">Notas / Observaciones</label>
                      <textarea
                        id="notas"
                        placeholder="Ej. Factura Nro 001-23, Pagado con transferencia..."
                        value={expenseForm.notas}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, notas: e.target.value }))}
                        className="w-full min-h-[65px] rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsExpenseModalOpen(false)}
                      className="rounded-xl"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                      disabled={submittingExpense}
                    >
                      {submittingExpense ? 'Guardando...' : (editingExpense ? 'Guardar Cambios' : 'Registrar Gasto')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* VIRTUAL RECEIPT TICKET PRINT PREVIEW DIALOG */}
            <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
              <DialogContent className="max-w-xl rounded-2xl border-slate-100 shadow-xl p-0 overflow-hidden bg-slate-900/5">
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
                            <div className="font-bold text-slate-800">ID: {previewExpense.id}</div>
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
                              {formatCurrency(Number(previewExpense.monto || 0))}
                            </div>
                          </div>
                        </div>
                        
                        {/* Total Highlight block */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex justify-between items-center text-slate-900 mb-6">
                          <span className="font-bold text-slate-500 uppercase text-[10px]">Total Egreso</span>
                          <span className="text-base font-black text-blue-600">
                            {formatCurrency(Number(previewExpense.monto || 0))}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* COMPARATIVE SALES VS EXPENSES */}
            <Card className="shadow-sm border-slate-100">
              <CardHeader>
                <CardTitle className="text-base flex items-center font-black text-slate-800 uppercase tracking-wider">
                  <TrendingUp className="mr-2 h-5 w-5 text-blue-500" />
                  Comparativa de Flujo: Ingresos vs Egresos
                </CardTitle>
                <CardDescription>Contraste diario de ventas brutas vs gastos registrados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  {salesVsExpensesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={salesVsExpensesData} margin={{ top: 10, right: 35, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
                        <YAxis tickFormatter={(val) => `$${val}`} tick={{ fontSize: 11 }} stroke="#64748b" />
                        <RechartsTooltip
                          formatter={(value: number) => [formatCurrency(value)]}
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
            <Card className="shadow-sm border-slate-100">
              <CardHeader>
                <CardTitle className="text-base flex items-center font-black text-slate-800 uppercase tracking-wider">
                  <PieChartIcon className="mr-2 h-5 w-5 text-rose-500" />
                  Distribución de Egresos
                </CardTitle>
                <CardDescription>Agrupación de egresos por tipo de categoría</CardDescription>
              </CardHeader>
              <CardContent>
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
                          formatter={(value: number) => [formatCurrency(value), 'Gastado']}
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
          <Card className="shadow-sm border-slate-100">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Detalle Completo de Egresos</CardTitle>
                <CardDescription>Muestra la proporción visual del peso de cada gasto en tu caja</CardDescription>
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
                    {expenses.length > 0 ? (
                      expenses.map((exp) => {
                        const percent = maxExpenseValue > 0 ? ((exp.monto / maxExpenseValue) * 100) : 0;
                        return (
                          <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-800">
                              <div>{exp.concepto}</div>
                              {exp.notas && <div className="text-xs text-slate-400 font-normal mt-0.5 max-w-[280px] truncate" title={exp.notas}>{exp.notas}</div>}
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
                              <div className="absolute right-6 top-1.5 bottom-1.5 bg-rose-100/40 rounded-lg pointer-events-none transition-all duration-500" style={{ width: `${percent * 0.7}%` }}></div>
                              <span className="relative z-10 font-bold text-slate-800 pr-2">
                                {formatCurrency(Number(exp.monto || 0))}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center items-center gap-2">
                                <button
                                  onClick={() => handlePrintTicket(exp)}
                                  className="p-1.5 text-slate-450 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
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
                                      categoria: exp.categoria || 'Otros',
                                      fecha: exp.fecha ? exp.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
                                      notas: exp.notas || ''
                                    });
                                    setIsExpenseModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-450 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                  title="Editar"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  className="p-1.5 text-slate-450 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                          No hay gastos comerciales registrados. Haz clic en "Registrar Gasto" para comenzar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB: VISITAS Y CLIENTES ================= */}
        <TabsContent value="visitas" className="space-y-6 focus-visible:outline-none">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white border border-slate-100 shadow-sm relative overflow-hidden">
              <CardContent className="p-5 flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Visitas Totales</p>
                  <h3 className="text-3xl font-black text-slate-800">{kpiTotalVisits.toLocaleString('es-ES')}</h3>
                  <p className="text-[11px] text-blue-600 mt-1 flex items-center font-medium">
                    <Globe className="h-3 w-3 mr-0.5" /> Tráfico acumulado
                  </p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Activity className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-100 shadow-sm relative overflow-hidden">
              <CardContent className="p-5 flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Visitantes Únicos</p>
                  <h3 className="text-3xl font-black text-slate-800">{kpiUniqueVisitors.toLocaleString('es-ES')}</h3>
                  <p className="text-[11px] text-purple-600 mt-1 flex items-center font-medium">
                    <Users className="h-3 w-3 mr-0.5" /> Usuarios por sesión
                  </p>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Users className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-100 shadow-sm relative overflow-hidden">
              <CardContent className="p-5 flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Nuevos Clientes</p>
                  <h3 className="text-3xl font-black text-slate-800">{kpiNewClients.toLocaleString('es-ES')}</h3>
                  <p className="text-[11px] text-emerald-600 mt-1 flex items-center font-medium">
                    <Plus className="h-3 w-3 mr-0.5" /> Registros agregados
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Plus className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-100 shadow-sm relative overflow-hidden">
              <CardContent className="p-5 flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Conversión Web</p>
                  <h3 className="text-3xl font-black text-slate-800">{kpiConversionRate.toFixed(2)}%</h3>
                  <p className="text-[11px] text-amber-600 mt-1 flex items-center font-medium">
                    <ShoppingCart className="h-3 w-3 mr-0.5" /> Tasa Pedido / Visita
                  </p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BI QUADRANT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CONVERSION FUNNEL BAR CHART */}
            <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-100">
              <CardHeader>
                <CardTitle className="text-base flex items-center font-black text-slate-800 uppercase tracking-wider">
                  <TrendingUp className="mr-2 h-5 w-5 text-indigo-500" />
                  Embudo de Conversión Web
                </CardTitle>
                <CardDescription>Pérdida de usuarios desde la visita al checkout de venta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={conversionFunnelData} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#64748b" />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} stroke="#64748b" />
                      <RechartsTooltip
                        formatter={(value: number) => [value.toLocaleString('es-ES'), 'Cantidad']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      />
                      <Bar dataKey="Cantidad" radius={[0, 4, 4, 0]} maxBarSize={45}>
                        {conversionFunnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* BROWSERS BREAKDOWN */}
            <Card className="shadow-sm border-slate-100">
              <CardHeader>
                <CardTitle className="text-base flex items-center font-black text-slate-800 uppercase tracking-wider">
                  <Monitor className="mr-2 h-5 w-5 text-purple-500" />
                  Origen por Navegador
                </CardTitle>
                <CardDescription>Uso relativo de navegadores web</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  {browsersData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={browsersData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {browsersData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number) => [value, 'Sesiones']}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 font-medium">Sin datos de navegadores</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* DENSITY GRID WITH DATA BARS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* POPULAR PAGES TABLE WITH DATA BARS */}
            <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-100">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800">Páginas Más Populares</CardTitle>
                <CardDescription>Tráfico acumulado con Looker-Studio styled data bars</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-3">Página</th>
                        <th className="px-6 py-3 text-right w-[200px]">Visualizaciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                      {popularPagesData.length > 0 ? (
                        popularPagesData.map((page, idx) => {
                          const maxPageViews = popularPagesData.reduce((max, p) => Math.max(max, p.value), 0);
                          const percent = maxPageViews > 0 ? (page.value / maxPageViews) * 100 : 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-6 py-3.5 font-medium text-slate-800 truncate max-w-[280px]">{page.name}</td>
                              <td className="px-6 py-3.5 text-right relative pr-6">
                                <div className="absolute right-6 top-1.5 bottom-1.5 bg-blue-100/40 rounded-lg pointer-events-none transition-all duration-500" style={{ width: `${percent * 0.7}%` }}></div>
                                <span className="relative z-10 font-bold text-blue-600">{page.value.toLocaleString('es-ES')}</span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={2} className="px-6 py-8 text-center text-slate-450">No hay registros de páginas visitadas.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* RECENT TRAFFIC FEED */}
            <Card className="shadow-sm border-slate-100">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800">Actividad Reciente</CardTitle>
                <CardDescription>Eventos de navegación del e-commerce</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {recentTraffic.length > 0 ? (
                    recentTraffic.map((t, idx) => {
                      const isMobile = t.device_info?.isMobile || t.device_info?.device === 'Mobile';
                      return (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50/50 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100">
                          <div className={cn(
                            "p-2 rounded-lg",
                            isMobile ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                          )}>
                            {isMobile ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <p className="text-sm font-semibold text-slate-850 truncate">
                                {t.user_name || (t.is_anonymous ? 'Usuario Anónimo' : 'Cliente registrado')}
                              </p>
                              <span className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center bg-slate-100 py-0.5 px-2 rounded-md">
                                <Calendar className="h-3 w-3 mr-1" /> {t.time}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-550 truncate mt-1">
                              Visitó: <span className="font-semibold text-slate-650">{t.page_title || t.page_url}</span>
                            </p>
                            {t.user_email && <p className="text-[10px] text-slate-450 italic mt-0.5">{t.user_email}</p>}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 text-slate-450 font-medium">Esperando conexiones...</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

