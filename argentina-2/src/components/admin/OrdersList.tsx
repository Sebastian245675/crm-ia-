import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Search, Bell, MessageCircle, Clock, CheckCircle, XCircle, Trash2, Check, RefreshCw, Filter, Mail, Phone, Calendar, Download, BarChart3, FileText, ShoppingBag, Plus, Minus, DollarSign, CreditCard, Tags, MoreHorizontal, MoreVertical, Home, Sparkles, Megaphone, HelpCircle, ArrowLeft, UserRound, Wifi } from 'lucide-react';
import {
  db,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  updateDoc,
  doc,
  deleteDoc,
  getDocs,
  getDoc,
  runTransaction
} from "@/firebase";
import { getAuthHeaders } from "@/firebase";

const serverTimestamp = () => new Date().toISOString();
const Timestamp = { fromDate: (d: Date) => d, now: () => new Date() } as any;
import { useAuth } from "@/contexts/AuthContext";
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getActiveAgencyId, isOrderForAgency, isProductForAgency, isContactForAgency } from '@/lib/agency-isolation';
import { formatCurrency } from '@/lib/currency';
import { isRealSaleOrder, sumRealSales } from '@/lib/sales';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { QuoteBuilder } from './QuoteBuilder';
import { ProformaBuilder } from './ProformaBuilder';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhysicalPosWorkspace } from './PhysicalPosWorkspace';
import { useLocation, useNavigate } from 'react-router-dom';

// Extendemos la definiciÃ³n de jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface OrdersListProps {
  orders?: any[];
}

// CSS personalizado para ayudar con la responsividad
const responsiveStyles = `
  @media (max-width: 500px) {
    .responsive-table {
      font-size: 0.7rem;
    }
  }
`;

const getOrderBranch = (order: any) => String(order?.branch_name || order?.branchName || order?.sucursal || order?.sucursal_nombre || 'Sin sucursal').trim() || 'Sin sucursal';
const normalizePhone = (phone: string) => String(phone || '').replace(/\D/g, '');

export const OrdersList: React.FC<OrdersListProps> = ({ orders: initialOrders }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const showLegacyPos = import.meta.env.VITE_SHOW_LEGACY_POS === 'true';
  const { user } = useAuth();
  const activeAgencyId = React.useMemo(() => getActiveAgencyId(user), [user]);
  const isSupabase = typeof (db as any)?.from === 'function';
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<any[]>(initialOrders || []);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'confirmed'
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [currentTab, setCurrentTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Estados para el modal de venta fÃ­sica
  const [showPhysicalSaleModal, setShowPhysicalSaleModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [posCompanyProfile, setPosCompanyProfile] = useState({
    name: 'MERCO Business Software',
    legalName: '',
    address: '',
    location: ''
  });
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [savingPhysicalSale, setSavingPhysicalSale] = useState(false);
  const [isQuoteMode, setIsQuoteMode] = useState(false);

  // Estado del formulario de venta fÃ­sica
  const [physicalSaleData, setPhysicalSaleData] = useState({
    customerName: 'Cliente General',
    customerPhone: '',
    customerEmail: '',
    paymentMethod: 'efectivo', // 'efectivo', 'tarjeta', 'transferencia'
    notes: '',
    discountType: 'none', // 'none', 'percentage', 'fixed'
    discountValue: 0, // valor del descuento (porcentaje o monto fijo)
  });

  // Estado para bÃºsqueda de productos
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // NUEVOS ESTADOS para el POS rediseñado estilo retail
  const [pagoCon, setPagoCon] = useState<string>('0');
  const [showAssignClientModal, setShowAssignClientModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCartIndex, setSelectedCartIndex] = useState<number | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [activePosTab, setActivePosTab] = useState<'venta' | 'categorias'>('venta');

  // Estados para Selección y Creación de Contactos/Clientes en POS
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('general');
  const [assignClientMode, setAssignClientMode] = useState<'select' | 'new'>('select');
  const [saveAsNewContact, setSaveAsNewContact] = useState<boolean>(false);

  // Estados para Artículo Común (CTRL+P / F1)
  const [showCommonProductModal, setShowCommonProductModal] = useState(false);
  const [commonProductData, setCommonProductData] = useState({ name: 'Artículo Común', price: '', quantity: '1' });

  // Estados para Entradas/Salidas de Caja (F7 / F8)
  const [showCashRegisterModal, setShowCashRegisterModal] = useState(false);
  const [cashRegisterType, setCashRegisterType] = useState<'entrada' | 'salida'>('entrada');
  const [cashRegisterData, setCashRegisterData] = useState({ amount: '', concept: '' });

  // Estado para Tickets Apartados (F10)
  const [showHeldTicketsModal, setShowHeldTicketsModal] = useState(false);

  // Estados para Filtrar por Empleado (Subcuentas)
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [selectedEmployeeForSale, setSelectedEmployeeForSale] = useState<string>('none');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [selectedBranchForSale, setSelectedBranchForSale] = useState('');

  // Estados para Facturación Electrónica
  const [billingLines, setBillingLines] = useState<any[]>([]);
  const [selectedBillingLineId, setSelectedBillingLineId] = useState<string>('none');
  const [billingData, setBillingData] = useState({
    rfc: 'XAXX010101000',
    nombre: 'PUBLICO EN GENERAL',
    cp: '26015',
    regimen: '616',
    usoCfdi: 'S01'
  });

  // Estados para estadÃ­sticas del dÃ­a
  const [dailySales, setDailySales] = useState({
    total: 0,
    count: 0,
    lastUpdated: new Date()
  });
  const [loadingDailySales, setLoadingDailySales] = useState(false);

  // Estados para el Cotizador Especial
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteModalType, setQuoteModalType] = useState<'quote' | 'proforma'>('quote');
  const [selectedOrderForQuote, setSelectedOrderForQuote] = useState<any | null>(null);
  const [selectedQuoteProducts, setSelectedQuoteProducts] = useState<any[]>([]);
  const [quoteSearchTerm, setQuoteSearchTerm] = useState('');
  const [generatingQuote, setGeneratingQuote] = useState(false);
  const [quoteStep, setQuoteStep] = useState(1); // 1: Products, 2: Details, 3: Preview
  const [quoteData, setQuoteData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    notes: 'La cotizaciÃ³n es vÃ¡lida por 7 dÃ­as. La fecha de ejecuciÃ³n del servicio se coordinarÃ¡ segÃºn disponibilidad.',
    discountType: 'none', // 'none', 'percentage', 'fixed'
    discountValue: 0, // valor del descuento (porcentaje o monto fijo)
    validityDays: 7,
  });

  // Cargar pedidos reales de Firestore / Supabase por agencia
  useEffect(() => {
    fetchOrders();
    fetchEmployees();
    fetchBillingLines();
    fetchContacts();
    fetchPosCompanyProfile();
  }, [activeAgencyId]);

  const fetchPosCompanyProfile = async () => {
    try {
      if (isSupabase) {
        let query = (db as any).from('company_profile').select('*');
        if (activeAgencyId) {
          query = query.or(`owner_id.eq.${activeAgencyId},agency_id.eq.${activeAgencyId}`);
        }
        const { data } = await query.maybeSingle();
        if (data) {
          setPosCompanyProfile({
            name: data.friendly_name || data.legal_name || (activeAgencyId === 'voltium-sanrey' ? 'Voltium Sanrey' : 'Websy'),
            legalName: data.legal_name || '',
            address: data.postal_address || '',
            location: [data.city, data.state, data.country].filter(Boolean).join(', ')
          });
          return;
        }
      }

      setPosCompanyProfile({
        name: activeAgencyId === 'voltium-sanrey' ? 'Voltium Sanrey' : 'Websy',
        legalName: '',
        address: '',
        location: ''
      });
    } catch (error) {
      console.warn('No se pudo cargar el perfil de empresa para el comprobante:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      let list: any[] = [];
      if (isSupabase) {
        const { data, error } = await (db as any).from('contacts').select('*');
        if (!error && data) {
          list = data;
        }
      } else {
        const querySnapshot = await getDocs(collection(db, "contacts"));
        list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      list = (list || []).filter((c: any) => isContactForAgency(c, activeAgencyId));
      // Sort contacts alphabetically
      list.sort((a, b) => (a.name || a.nombre || '').localeCompare(b.name || b.nombre || ''));
      setContacts(list);
    } catch (e) {
      console.error("Error fetching contacts:", e);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      if (isSupabase) {
        const { data, error } = await db
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        const filtered = (data || []).filter((order: any) => isOrderForAgency(order, activeAgencyId));
        setOrders(filtered.map((order: any) => ({
          ...order,
          id: order.id,
          createdAt: order.created_at,
          deliveryFee: order.delivery_fee,
          orderNotes: order.order_notes,
          userName: order.user_name ?? order.userName,
          userEmail: order.user_email ?? order.userEmail,
          userPhone: order.user_phone ?? order.userPhone,
          physicalSale: order.order_type === 'physical' || order.orderType === 'physical'
        })));
      } else {
        // Usamos query para ordenar por fecha de creaciÃ³n descendente (mÃ¡s reciente primero)
        const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(ordersQuery);
        const ordersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter((order: any) => isOrderForAgency(order, activeAgencyId));
        setOrders(ordersData);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error al cargar pedidos",
        description: "No se pudieron cargar los pedidos. Por favor, intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      let empsList: any[] = [];
      try {
        const querySnapshot = await getDocs(collection(db, "empleados"));
        empsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (_) {}

      let subsList: any[] = [];
      try {
        if (isSupabase) {
          const { data, error } = await (db as any)
            .from('users')
            .select('*')
            .eq('sub_cuenta', 'si');
          if (!error && data) {
            subsList = data.map((u: any) => ({
              id: u.id,
              nombre: u.name || u.nombre || u.email || 'Sin nombre',
              name: u.name,
              email: u.email
            }));
          }
        } else {
          const querySnapshot = await getDocs(collection(db, "users"));
          subsList = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as any))
            .filter(u => u.subCuenta === "si" || u.sub_cuenta === "si")
            .map(u => ({
              id: u.id,
              nombre: u.name || u.nombre || u.email || 'Sin nombre',
              name: u.name,
              email: u.email
            }));
        }
      } catch (_) {}

      const combined = [...empsList, ...subsList];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      unique.sort((a, b) => (a.nombre || a.name || '').localeCompare(b.nombre || b.name || ''));
      setEmployees(unique);
    } catch (e) {
      console.error("Error fetching employees:", e);
    }
  };

  const fetchBillingLines = async () => {
    try {
      const { data } = await db.from('lineas_facturacion').select('*');
      setBillingLines(data || []);
    } catch (e) {
      console.error("Error fetching billing lines:", e);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Obtener productos para la venta fÃ­sica
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      if (isSupabase) {
        const { data, error } = await db.from("products").select("*");
        if (error) throw error;
        const filtered = (data || []).filter((p: any) => isProductForAgency(p, activeAgencyId));
        setProducts(filtered);
      } else {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const filtered = (productsData || []).filter((p: any) => isProductForAgency(p, activeAgencyId));
        setProducts(filtered);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error al cargar productos",
        description: "No se pudieron cargar los productos disponibles.",
        variant: "destructive"
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  // Obtener ventas del dÃ­a
  const fetchDailySales = async () => {
    setLoadingDailySales(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayStart = today.getTime();
      const tomorrowStart = tomorrow.getTime();

      if (isSupabase) {
        const { data, error } = await (db as any).from('orders').select('*');
        if (error) throw error;
        let total = 0;
        let count = 0;
        (data || []).forEach((o: any) => {
          if (o.order_type !== 'physical' && o.orderType !== 'physical') return;
          const raw = o.created_at ?? o.createdAt;
          if (!raw) return;
          const orderDate = new Date(raw).getTime();
          if (orderDate >= todayStart && orderDate < tomorrowStart) {
            total += Number(o.total || 0);
            count++;
          }
        });
        setDailySales({ total, count, lastUpdated: new Date() });
        return;
      }

      // Firestore
      try {
        const salesQuery = query(
          collection(db, "orders"),
          where("orderType", "==", "physical"),
          where("createdAt", ">=", Timestamp.fromDate(today)),
          where("createdAt", "<", Timestamp.fromDate(tomorrow))
        );
        const querySnapshot = await getDocs(salesQuery);
        let total = 0;
        let count = 0;
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.total) total += data.total;
          count++;
        });
        setDailySales({ total, count, lastUpdated: new Date() });
      } catch (queryError: any) {
        const allOrdersQuery = query(
          collection(db, "orders"),
          where("orderType", "==", "physical"),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(allOrdersQuery);
        let total = 0;
        let count = 0;
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const createdAt = data.createdAt;
          let orderDate: number;
          if (createdAt?.toDate) orderDate = createdAt.toDate().getTime();
          else if (createdAt?.seconds) orderDate = createdAt.seconds * 1000;
          else if (createdAt instanceof Date) orderDate = createdAt.getTime();
          else return;
          if (orderDate >= todayStart && orderDate < tomorrowStart) {
            if (data.total) total += data.total;
            count++;
          }
        });
        setDailySales({ total, count, lastUpdated: new Date() });
      }
    } catch (error) {
      console.error("Error fetching daily sales:", error);
    } finally {
      setLoadingDailySales(false);
    }
  };

  // Listener en tiempo real para actualizar estadÃ­sticas (Supabase: polling; Firestore: onSnapshot)
  useEffect(() => {
    if (!showPhysicalSaleModal) return;

    if (isSupabase) {
      const interval = setInterval(fetchDailySales, 15000);
      return () => clearInterval(interval);
    }

    let updateTimeout: NodeJS.Timeout | null = null;
    const unsubscribe = onSnapshot(
      query(collection(db, "orders"), where("orderType", "==", "physical")),
      (snapshot) => {
        if (updateTimeout) clearTimeout(updateTimeout);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const todayStart = today.getTime();
        const tomorrowStart = tomorrow.getTime();
        updateTimeout = setTimeout(() => {
          let total = 0;
          let count = 0;
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const createdAt = data.createdAt;
            let orderDate: number;
            if (createdAt?.toDate) orderDate = createdAt.toDate().getTime();
            else if (createdAt?.seconds) orderDate = createdAt.seconds * 1000;
            else if (createdAt instanceof Date) orderDate = createdAt.getTime();
            else return;
            if (orderDate >= todayStart && orderDate < tomorrowStart) {
              if (data.total) total += data.total;
              count++;
            }
          });
          setDailySales({ total, count, lastUpdated: new Date() });
        }, 300);
      },
      (error) => {
        console.error("Error en listener de ventas:", error);
        fetchDailySales();
      }
    );
    return () => {
      unsubscribe();
      if (updateTimeout) clearTimeout(updateTimeout);
    };
  }, [showPhysicalSaleModal, isSupabase]);

  useEffect(() => {
    if (!showPhysicalSaleModal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showPhysicalSaleModal]);

  // --- FUNCIONALIDAD REAL DE IMPRESIÓN DE TICKETS ---
  const handlePrintReceipt = (order: any) => {
    if (!order) return;
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      toast({
        title: "Bloqueador de ventanas activo",
        description: "Permite las ventanas emergentes para poder imprimir el ticket automáticamente.",
        variant: "destructive"
      });
      return;
    }

    const escapeReceiptText = (value: unknown) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const itemsHtml = (order.items || []).map((item: any) => `
      <tr>
        <td style="padding: 4px 0; font-size: 11px;">${escapeReceiptText(item.name)}</td>
        <td style="text-align: center; padding: 4px 0; font-size: 11px;">x${item.quantity}</td>
        <td style="text-align: right; padding: 4px 0; font-size: 11px;">${formatCurrency(parseFloat(item.price || 0) * item.quantity)}</td>
      </tr>
    `).join('');

    const subtotal = order.subtotal || order.total || 0;
    const discountAmount = order.discountAmount || 0;
    const total = order.total || 0;

    const receiptHtml = `
      <html>
        <head>
          <title>Ticket de Venta - ${posCompanyProfile.name || 'Empresa'}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.3;
              margin: 10px;
              color: #000;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .header-title { font-size: 14px; margin-bottom: 3px; font-family: serif; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; }
            .flex-row { display: flex; justify-content: space-between; }
            .footer-msg { font-size: 9px; margin-top: 15px; }
          </style>
        </head>
        <body onload="window.print(); setTimeout(() => window.close(), 500);">
          <div class="center bold header-title">${escapeReceiptText(posCompanyProfile.name)}</div>
          ${posCompanyProfile.legalName && posCompanyProfile.legalName !== posCompanyProfile.name ? `<div class="center">${escapeReceiptText(posCompanyProfile.legalName)}</div>` : ''}
          <div class="center bold">COMPROBANTE DE PUNTO DE VENTA</div>
          ${posCompanyProfile.address ? `<div class="center">${escapeReceiptText(posCompanyProfile.address)}</div>` : ''}
          ${posCompanyProfile.location ? `<div class="center">${escapeReceiptText(posCompanyProfile.location)}</div>` : ''}
          <div class="divider"></div>
          <div class="flex-row">
            <span>Ticket: ${escapeReceiptText(String(order.id || '').substring(0, 8).toUpperCase() || 'PROVISIONAL')}</span>
            <span>Fecha: ${new Date(order.createdAt || Date.now()).toLocaleDateString()}</span>
          </div>
          <div class="flex-row">
            <span>Hora: ${new Date(order.createdAt || Date.now()).toLocaleTimeString()}</span>
            <span>Cajero: ${escapeReceiptText(order.employeeName || order.employee_name || user?.name || user?.nombre || user?.email || 'Operador')}</span>
          </div>
          <div class="divider"></div>
          <div>Cliente: ${escapeReceiptText(order.userName || order.user_name || 'Cliente General')}</div>
          ${order.userPhone ? `<div>Teléfono: ${escapeReceiptText(order.userPhone)}</div>` : ''}
          <div class="divider"></div>
          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="text-align: left; font-size: 10px; padding-bottom: 4px;">Detalle</th>
                <th style="text-align: center; font-size: 10px; padding-bottom: 4px;">Cant</th>
                <th style="text-align: right; font-size: 10px; padding-bottom: 4px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="divider"></div>

          <div class="flex-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          ${discountAmount > 0 ? `
          <div class="flex-row" style="color: red;">
            <span>Descuento:</span>
            <span>-${formatCurrency(discountAmount)}</span>
          </div>
          ` : ''}
          <div class="flex-row bold" style="font-size: 12px; margin-top: 4px;">
            <span>TOTAL:</span>
            <span>${formatCurrency(total)}</span>
          </div>

          <div class="divider"></div>
          <div class="center bold">¡GRACIAS POR SU VISITA!</div>
          <div class="center footer-msg">Este comprobante no es válido como factura de curso legal fiscal.</div>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const handleReprint = () => {
    // Buscar la última venta física realizada
    const physicalSales = orders.filter(o => o.physicalSale || o.order_type === 'physical' || o.orderType === 'physical');
    if (physicalSales.length > 0) {
      handlePrintReceipt(physicalSales[0]);
      toast({
        title: "Reimprimiendo ticket",
        description: `Se envió a la cola de impresión el ticket de ${physicalSales[0].userName || 'Cliente General'}.`,
        variant: "default"
      });
    } else {
      toast({
        title: "No hay tickets anteriores",
        description: "No se encontraron ventas físicas registradas para reimprimir.",
        variant: "destructive"
      });
    }
  };

  // --- FUNCIONALIDAD REAL DE ARTÍCULO COMÚN (CTRL+P) ---
  const handleAddGenericProduct = () => {
    const price = parseFloat(commonProductData.price) || 0;
    const qty = parseInt(commonProductData.quantity) || 1;
    if (price <= 0) {
      toast({ title: "Precio inválido", description: "El precio del artículo común debe ser mayor a 0.", variant: "destructive" });
      return;
    }

    const newGenericProduct = {
      id: `generic-${Date.now()}`,
      name: commonProductData.name || 'Artículo Común',
      price: price,
      quantity: qty,
      stock: 9999, // stock virtualmente ilimitado para artículos libres
      image: '',
      category: 'General'
    };

    setSelectedProducts([...selectedProducts, newGenericProduct]);
    setShowCommonProductModal(false);
    setCommonProductData({ name: 'Artículo Común', price: '', quantity: '1' });
    toast({ title: "Artículo agregado", description: `${newGenericProduct.name} - ${formatCurrency(price)}` });
  };

  // --- FUNCIONALIDAD REAL DE ENTRADAS/SALIDAS DE CAJA (F7/F8) ---
  const handleSaveCashTransaction = async () => {
    const amt = parseFloat(cashRegisterData.amount) || 0;
    if (amt <= 0) {
      toast({ title: "Monto inválido", description: "El monto debe ser mayor a 0.", variant: "destructive" });
      return;
    }

    const newTransaction = {
      id: `cash-tx-${Date.now()}`,
      type: cashRegisterType,
      amount: amt,
      concept: cashRegisterData.concept || (cashRegisterType === 'entrada' ? 'Ingreso de Caja' : 'Egreso de Caja'),
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/contabilidad/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          tipo: cashRegisterType === 'entrada' ? 'ingreso' : 'egreso',
          concepto: newTransaction.concept,
          monto: amt,
          metodo_pago: 'efectivo',
          referencia_id: newTransaction.id,
        })
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || 'El backend rechazó el movimiento.');
      }

      const existing = JSON.parse(localStorage.getItem('pos_cash_transactions') || '[]');
      localStorage.setItem('pos_cash_transactions', JSON.stringify([newTransaction, ...existing]));
      setShowCashRegisterModal(false);
      setCashRegisterData({ amount: '', concept: '' });
      toast({
        title: cashRegisterType === 'entrada' ? "Entrada de caja registrada" : "Salida de caja registrada",
        description: `${formatCurrency(amt)} · ${newTransaction.concept}`
      });
    } catch (error: any) {
      toast({
        title: "No se pudo registrar el movimiento",
        description: error?.message || 'Verifica la conexión con el backend.',
        variant: "destructive"
      });
    }
  };

  // --- FUNCIONALIDAD REAL DE APARTAR TICKETS (F10) ---
  const handleApartarTicket = () => {
    if (selectedProducts.length === 0) {
      // Si el carrito está vacío, F10 abre la lista de tickets apartados para recuperarlos
      setShowHeldTicketsModal(true);
      return;
    }

    const newHeldTicket = {
      id: `held-ticket-${Date.now()}`,
      customerName: physicalSaleData.customerName || 'Cliente General',
      customerPhone: physicalSaleData.customerPhone,
      customerEmail: physicalSaleData.customerEmail,
      items: [...selectedProducts],
      paymentMethod: physicalSaleData.paymentMethod,
      notes: physicalSaleData.notes,
      discountType: physicalSaleData.discountType,
      discountValue: physicalSaleData.discountValue,
      total: calculateTotal(),
      createdAt: new Date().toISOString()
    };

    const existing = JSON.parse(localStorage.getItem('pos_held_tickets') || '[]');
    localStorage.setItem('pos_held_tickets', JSON.stringify([newHeldTicket, ...existing]));

    // Limpiar carrito para atender al siguiente cliente
    setSelectedProducts([]);
    setPagoCon('0');
    setPhysicalSaleData({
      customerName: 'Cliente General',
      customerPhone: '',
      customerEmail: '',
      paymentMethod: 'efectivo',
      notes: '',
      discountType: 'none',
      discountValue: 0,
    });
    setProductSearchTerm('');
    setSelectedCartIndex(null);

    toast({
      title: "Ticket Apartado con éxito",
      description: `El ticket de ${newHeldTicket.customerName} se guardó para cobrar después.`,
      variant: "default"
    });
  };

  const handleRetrieveHeldTicket = (held: any) => {
    setSelectedProducts(held.items || []);
    setPhysicalSaleData({
      customerName: held.customerName || 'Cliente General',
      customerPhone: held.customerPhone || '',
      customerEmail: held.customerEmail || '',
      paymentMethod: held.paymentMethod || 'efectivo',
      notes: held.notes || '',
      discountType: held.discountType || 'none',
      discountValue: held.discountValue || 0,
    });
    setPagoCon('0');
    setSelectedCartIndex(null);

    // Remover de tickets apartados en localStorage
    const existing = JSON.parse(localStorage.getItem('pos_held_tickets') || '[]');
    const filtered = existing.filter((t: any) => t.id !== held.id);
    localStorage.setItem('pos_held_tickets', JSON.stringify(filtered));

    setShowHeldTicketsModal(false);
    toast({
      title: "Ticket Recuperado",
      description: `Se cargó el ticket de ${held.customerName}.`
    });
  };

  const handleDeleteHeldTicket = (heldId: string) => {
    const existing = JSON.parse(localStorage.getItem('pos_held_tickets') || '[]');
    const filtered = existing.filter((t: any) => t.id !== heldId);
    localStorage.setItem('pos_held_tickets', JSON.stringify(filtered));
    // Forzar actualización del render
    toast({
      title: "Ticket Eliminado",
      description: "Se descartó el ticket apartado.",
      variant: "destructive"
    });
  };

  // Helper para buscar y agregar primer producto que coincida
  const handleAddSearchedProduct = () => {
    if (!productSearchTerm) return;
    const filtered = products.filter(product =>
      product.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      String(product.id || '').toLowerCase().includes(productSearchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      handleAddProduct(filtered[0].id);
      setProductSearchTerm('');
    } else {
      toast({
        title: "Producto no encontrado",
        description: "No se encontraron productos que coincidan con la bÃºsqueda.",
        variant: "destructive"
      });
    }
  };

  const handleNewSale = () => {
    setSelectedProducts([]);
    setPagoCon('0');
    setPhysicalSaleData({
      customerName: 'Cliente General',
      customerPhone: '',
      customerEmail: '',
      paymentMethod: 'efectivo',
      notes: '',
      discountType: 'none',
      discountValue: 0,
    });
    setProductSearchTerm('');
    setSelectedCartIndex(null);
    setSelectedCategoryFilter(null);
    setSelectedEmployeeForSale('none');
    toast({ title: "Nueva venta", description: "Se ha iniciado un nuevo ticket de venta vacÃ­o." });
  };

  const handleDeleteSelectedCartItem = () => {
    if (selectedProducts.length === 0) return;
    const indexToDelete = selectedCartIndex !== null && selectedCartIndex >= 0 && selectedCartIndex < selectedProducts.length
      ? selectedCartIndex
      : selectedProducts.length - 1;

    const itemToRemove = selectedProducts[indexToDelete];
    handleRemoveProduct(itemToRemove.id);
    setSelectedCartIndex(null);
    toast({ title: "Producto eliminado", description: `Se eliminÃ³ "${itemToRemove.name}" del ticket.` });
  };

  const handlePayTicket = () => {
    if (selectedProducts.length === 0) {
      toast({ title: "Ticket vacÃ­o", description: "Agrega productos antes de pagar.", variant: "destructive" });
      return;
    }
    setShowPaymentModal(true);
  };

  useEffect(() => {
    if (!showPhysicalSaleModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // CTRL+P o F1 para Artículo Común
      if ((e.ctrlKey && e.key === 'p') || (e.ctrlKey && e.key === 'P')) {
        e.preventDefault();
        setCommonProductData({ name: 'Artículo Común', price: '', quantity: '1' });
        setShowCommonProductModal(true);
        return;
      }

      // ENTER en el input de bÃºsqueda
      if (e.key === 'Enter' && target.id === 'pos-product-search') {
        e.preventDefault();
        handleAddSearchedProduct();
        return;
      }

      if (e.key === 'F4') {
        e.preventDefault();
        handleNewSale();
      } else if (e.key === 'F5') {
        e.preventDefault();
        setShowAssignClientModal(true);
      } else if (e.key === 'F6') {
        e.preventDefault();
        handleDeleteSelectedCartItem();
      } else if (e.key === 'F7') {
        e.preventDefault();
        setCashRegisterType('entrada');
        setCashRegisterData({ amount: '', concept: '' });
        setShowCashRegisterModal(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        setCashRegisterType('salida');
        setCashRegisterData({ amount: '', concept: '' });
        setShowCashRegisterModal(true);
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleApartarTicket();
      } else if (e.key === 'F12') {
        e.preventDefault();
        handlePayTicket();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPhysicalSaleModal, selectedProducts, productSearchTerm, physicalSaleData, selectedCartIndex, products]);

  // Abrir modal de venta fÃ­sica y cargar productos
  const handleOpenPhysicalSaleModal = (asQuote: boolean = false) => {
    setIsQuoteMode(asQuote);
    setSelectedProducts([]);
    setPagoCon('0');
    setSelectedCartIndex(null);
    setSelectedCategoryFilter(null);
    setActivePosTab('venta');
    setPhysicalSaleData({
      customerName: 'Cliente General',
      customerPhone: '',
      customerEmail: '',
      paymentMethod: 'efectivo',
      notes: '',
      discountType: 'none',
      discountValue: 0,
    });
    setProductSearchTerm('');
    fetchProducts();
    fetchDailySales();
    setShowPhysicalSaleModal(true);
    if (location.pathname !== '/admin/pedidos/venta-fisica') navigate('/admin/pedidos/venta-fisica');
  };

  const handleClosePhysicalSale = () => {
    setShowPhysicalSaleModal(false);
    if (location.pathname === '/admin/pedidos/venta-fisica') navigate('/admin/pedidos');
  };

  useEffect(() => {
    const shouldShowPos = location.pathname === '/admin/pedidos/venta-fisica';
    if (shouldShowPos && !showPhysicalSaleModal) handleOpenPhysicalSaleModal(false);
    if (!shouldShowPos && showPhysicalSaleModal) setShowPhysicalSaleModal(false);
  }, [location.pathname]);

  // Utilidades para convertir imÃ¡genes a Base64 y formatear fechas en espaÃ±ol
  const getBase64ImageFromUrl = async (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!imageUrl) {
        reject(new Error("Empty image URL"));
        return;
      }
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/jpeg', 0.8);
            resolve(dataURL);
          } else {
            reject(new Error('Canvas context null'));
          }
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (err) => {
        reject(err);
      };
      // Cache-busting para evitar bloqueos CORS por cachÃ©
      img.src = imageUrl.includes('?') ? `${imageUrl}&cb=${Date.now()}` : `${imageUrl}?cb=${Date.now()}`;
    });
  };

  const formatSpanishDate = (date: Date) => {
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `${date.getDate()} de ${months[date.getMonth()]}`;
  };

  // Manejadores y cÃ¡lculos para el Cotizador Especial
  const handleOpenQuoteModal = () => {
    setSelectedQuoteProducts([]);
    setQuoteData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      notes: 'La cotizaciÃ³n es vÃ¡lida por 7 dÃ­as. La fecha de ejecuciÃ³n del servicio se coordinarÃ¡ segÃºn disponibilidad.',
      discountType: 'none',
      discountValue: 0,
      validityDays: 7,
    });
    setQuoteSearchTerm('');
    setQuoteStep(1);
    fetchProducts();
    setShowQuoteModal(true);
  };

  const handleQuoteAddProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const stock = product.stock || 0;
      const existingProduct = selectedQuoteProducts.find(p => p.id === productId);
      if (existingProduct) {
        if (existingProduct.quantity + 1 > stock) {
          toast({
            title: "Stock insuficiente",
            description: `Solo hay ${stock} unidades disponibles de ${product.name}`,
            variant: "destructive"
          });
          return;
        }
        setSelectedQuoteProducts(selectedQuoteProducts.map(p =>
          p.id === productId ? { ...p, quantity: p.quantity + 1 } : p
        ));
      } else {
        if (stock <= 0) {
          toast({
            title: "Sin stock",
            description: `${product.name} no tiene stock disponible`,
            variant: "destructive"
          });
          return;
        }
        setSelectedQuoteProducts([...selectedQuoteProducts, { ...product, quantity: 1 }]);
      }
    }
  };

  const handleQuoteUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedQuoteProducts(selectedQuoteProducts.filter(p => p.id !== productId));
    } else {
      const product = products.find(p => p.id === productId);
      if (product) {
        const stock = product.stock || 0;
        if (quantity > stock) {
          toast({
            title: "Stock insuficiente",
            description: `Solo hay ${stock} unidades disponibles`,
            variant: "destructive"
          });
          return;
        }
      }
      setSelectedQuoteProducts(selectedQuoteProducts.map(p =>
        p.id === productId ? { ...p, quantity } : p
      ));
    }
  };

  const handleQuoteRemoveProduct = (productId: string) => {
    setSelectedQuoteProducts(selectedQuoteProducts.filter(p => p.id !== productId));
  };

  const calculateQuoteSubtotal = () => {
    return selectedQuoteProducts.reduce((total, product) => {
      const price = parseFloat(product.price) || 0;
      return total + (price * product.quantity);
    }, 0);
  };

  const calculateQuoteDiscount = () => {
    const subtotal = calculateQuoteSubtotal();
    if (quoteData.discountType === 'none' || subtotal === 0) {
      return 0;
    } else if (quoteData.discountType === 'percentage') {
      const percentage = Math.min(Math.max(parseFloat(quoteData.discountValue.toString()) || 0, 0), 100);
      return (subtotal * percentage) / 100;
    } else if (quoteData.discountType === 'fixed') {
      return Math.min(parseFloat(quoteData.discountValue.toString()) || 0, subtotal);
    }
    return 0;
  };

  const calculateQuoteTotal = () => {
    const subtotal = calculateQuoteSubtotal();
    const discount = calculateQuoteDiscount();
    return subtotal - discount;
  };

  const handleGenerateQuotePDF = async () => {
    if (selectedQuoteProducts.length === 0) {
      toast({
        title: "No hay productos seleccionados",
        description: "Debe seleccionar al menos un producto para generar la cotizaciÃ³n.",
        variant: "destructive"
      });
      return;
    }

    if (!quoteData.customerName) {
      toast({
        title: "Nombre del cliente requerido",
        description: "Por favor, ingrese el nombre del cliente para la cotizaciÃ³n.",
        variant: "destructive"
      });
      return;
    }

    setGeneratingQuote(true);

    try {
      const doc = new jsPDF();

      // Cargar imÃ¡genes de productos en paralelo y convertirlas a Base64
      const productsWithBase64 = await Promise.all(selectedQuoteProducts.map(async (p) => {
        if (p.image) {
          try {
            const base64 = await getBase64ImageFromUrl(p.image);
            return { ...p, imageBase64: base64 };
          } catch (e) {
            console.warn(`Could not load image for ${p.name}, using fallback:`, e);
            // Fallback light gray square
            return {
              ...p,
              imageBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACO9bA1AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBgwIEwAHXfUBAAAASUlEQVRo3u3OMQ0AIBADwMC/Z2ADh+GSpK902zPfOQICAwMHBgYODAwcGBg4MDBwYGDgwMDAwIGBgQMDAwcGBg4MDBwYGDgwMDDxwAc97gExfB7KlwAAAABJRU5ErkJggg=="
            };
          }
        }
        return { ...p, imageBase64: null };
      }));

      // Dibujar icono estilizado (flor de loto) en la parte superior izquierda
      doc.setDrawColor(71, 85, 105);
      doc.setLineWidth(0.6);
      doc.ellipse(32, 22, 6, 6);
      doc.ellipse(26, 22, 6, 4);
      doc.ellipse(38, 22, 6, 4);
      doc.ellipse(32, 16, 4, 6);
      doc.ellipse(32, 28, 4, 6);
      doc.stroke();

      // Nombre del negocio
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text("Nombre de tu empresa", 16, 40);

      // Cabecera - Fecha en espaÃ±ol formateada (a la derecha)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      const dateText = formatSpanishDate(new Date());
      doc.text(dateText, 194, 22, { align: 'right' });

      // Bloque de InformaciÃ³n del Cliente
      let customerY = 56;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(quoteData.customerName, 16, customerY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);

      if (quoteData.customerEmail) {
        customerY += 6;
        doc.text(quoteData.customerEmail, 16, customerY);
      }
      if (quoteData.customerPhone) {
        customerY += 6;
        doc.text(quoteData.customerPhone, 16, customerY);
      }

      // Tabla con franjas grises alternadas e imÃ¡genes incrustadas
      const tableColumn = ["", "DescripciÃ³n", "Cantidad", "Und", "Total"];
      const tableRows = productsWithBase64.map(p => {
        const price = parseFloat(p.price) || 0;
        const totalLine = price * p.quantity;
        return [
          "",
          p.name,
          String(p.quantity),
          formatCurrency(price),
          formatCurrency(totalLine)
        ];
      });

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: customerY + 10,
        theme: 'striped',
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          valign: 'middle'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
          minCellHeight: 18,
          valign: 'middle',
          lineColor: [241, 245, 249],
          lineWidth: 0.5
        },
        columnStyles: {
          0: { cellWidth: 16 },
          1: { cellWidth: 84 },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: 16, right: 16 },
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 0) {
            const product = productsWithBase64[data.row.index];
            if (product && product.imageBase64) {
              try {
                const x = data.cell.x + 2;
                const y = data.cell.y + 2;
                const size = 14;
                doc.addImage(product.imageBase64, 'JPEG', x, y, size, size);
              } catch (err) {
                console.error("Error al incrustar imagen en PDF:", err);
              }
            }
          }
        }
      });

      const finalTableY = doc.lastAutoTable.finalY || customerY + 30;

      // Bloque de Totales
      const subtotal = calculateQuoteSubtotal();
      const discount = calculateQuoteDiscount();
      const total = calculateQuoteTotal();

      let totalsY = finalTableY + 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);

      doc.text("SUBTOTAL:", 130, totalsY);
      doc.text(formatCurrency(subtotal), 194, totalsY, { align: 'right' });

      if (discount > 0) {
        totalsY += 6;
        const discountLabel = quoteData.discountType === 'percentage'
          ? `DESCUENTO ${quoteData.discountValue}%`
          : 'DESCUENTO';
        doc.text(`${discountLabel}:`, 130, totalsY);
        doc.text(`-${formatCurrency(discount)}`, 194, totalsY, { align: 'right' });
      }

      // Banner del Total
      totalsY += 4;
      doc.setFillColor(71, 85, 105);
      doc.rect(130, totalsY, 64, 10, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text("TOTAL:", 135, totalsY + 6.5);
      doc.text(formatCurrency(total), 189, totalsY + 6.5, { align: 'right' });

      // Notas y Condiciones de Validez
      let notesY = totalsY + 22;
      if (notesY > 260) {
        doc.addPage();
        notesY = 30;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text("Notas:", 16, notesY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const validityText = `La cotizaciÃ³n es vÃ¡lida por ${quoteData.validityDays} dÃ­as. La fecha de ejecuciÃ³n del servicio se coordinarÃ¡ segÃºn disponibilidad.`;
      const wrappedNotes = doc.splitTextToSize(quoteData.notes || validityText, 100);
      doc.text(wrappedNotes, 16, notesY + 5);

      // LÃ­nea de Firma Autorizada
      const sigX = 140;
      const sigY = notesY + 10;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(sigX, sigY + 12, sigX + 54, sigY + 12);

      // Firma manuscrita simulada
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(1);
      doc.moveTo(sigX + 6, sigY + 6);
      doc.lineTo(sigX + 18, sigY + 2);
      doc.lineTo(sigX + 26, sigY + 8);
      doc.lineTo(sigX + 34, sigY + 3);
      doc.lineTo(sigX + 46, sigY + 7);
      doc.stroke();

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("C.C. 0000000000", sigX + 27, sigY + 17, { align: 'center' });

      const sanitizedClientName = quoteData.customerName.replace(/\s+/g, '_');
      doc.save(`cotizacion_${sanitizedClientName}_${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "CotizaciÃ³n Generada",
        description: "El documento PDF se ha descargado exitosamente.",
        variant: "default"
      });

      setShowQuoteModal(false);
    } catch (error) {
      console.error("Error al generar cotizaciÃ³n avanzada:", error);
      toast({
        title: "Error al generar cotizaciÃ³n",
        description: "No se pudo crear el PDF de la cotizaciÃ³n.",
        variant: "destructive"
      });
    } finally {
      setGeneratingQuote(false);
    }
  };

  // Gestionar la selecciÃ³n de productos
  const handleAddProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const stock = product.stock || 0;

      // Verificar si ya estÃ¡ en la lista
      const existingProduct = selectedProducts.find(p => p.id === productId);
      if (existingProduct) {
        // Si ya existe, verificar stock antes de aumentar la cantidad
        if (existingProduct.quantity + 1 > stock) {
          toast({
            title: "Stock insuficiente",
            description: `Solo hay ${stock} unidades disponibles de ${product.name}`,
            variant: "destructive"
          });
          return;
        }
        // Si ya existe, aumentar la cantidad
        setSelectedProducts(selectedProducts.map(p =>
          p.id === productId ? { ...p, quantity: p.quantity + 1 } : p
        ));
      } else {
        // Si no existe y hay stock, aÃ±adir con cantidad 1
        if (stock <= 0) {
          toast({
            title: "Sin stock",
            description: `${product.name} no tiene stock disponible`,
            variant: "destructive"
          });
          return;
        }
        setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
      }
    }
  };

  // Actualizar cantidad de un producto
  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      // Eliminar el producto si la cantidad es 0 o menos
      setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
    } else {
      // Verificar stock antes de actualizar
      const product = products.find(p => p.id === productId);
      if (product) {
        const stock = product.stock || 0;
        if (quantity > stock) {
          toast({
            title: "Stock insuficiente",
            description: `Solo hay ${stock} unidades disponibles`,
            variant: "destructive"
          });
          return;
        }
      }
      // Actualizar la cantidad
      setSelectedProducts(selectedProducts.map(p =>
        p.id === productId ? { ...p, quantity } : p
      ));
    }
  };

  // Eliminar un producto de la selecciÃ³n
  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };

  // Calcular el subtotal (suma de productos sin descuento)
  const calculateSubtotal = () => {
    return selectedProducts.reduce((total, product) => {
      const price = parseFloat(product.price) || 0;
      return total + (price * product.quantity);
    }, 0);
  };

  // Calcular el descuento aplicado
  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (physicalSaleData.discountType === 'none' || subtotal === 0) {
      return 0;
    } else if (physicalSaleData.discountType === 'percentage') {
      // Asegurar que el porcentaje estÃ© entre 0 y 100
      const percentage = Math.min(Math.max(parseFloat(physicalSaleData.discountValue.toString()) || 0, 0), 100);
      return (subtotal * percentage) / 100;
    } else if (physicalSaleData.discountType === 'fixed') {
      // El descuento fijo no puede ser mayor que el subtotal
      return Math.min(parseFloat(physicalSaleData.discountValue.toString()) || 0, subtotal);
    }
    return 0;
  };

  // Calcular el total de la venta (subtotal - descuento)
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    return subtotal - discount;
  };

  // Guardar la venta fÃ­sica y descontar stock
  const handleSavePhysicalSale = async (): Promise<boolean> => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No hay productos seleccionados",
        description: "Debe seleccionar al menos un producto para registrar la venta.",
        variant: "destructive"
      });
      return false;
    }

    if (!physicalSaleData.customerName) {
      toast({
        title: "Nombre del cliente requerido",
        description: "Por favor, ingrese el nombre del cliente.",
        variant: "destructive"
      });
      return false;
    }

    if (physicalSaleData.paymentMethod === 'efectivo' && (parseFloat(pagoCon) || 0) < calculateTotal()) {
      toast({
        title: "Efectivo insuficiente",
        description: `Faltan ${formatCurrency(calculateTotal() - (parseFloat(pagoCon) || 0))} para completar el pago.`,
        variant: "destructive"
      });
      return false;
    }

    setSavingPhysicalSale(true);

    // Preparar los datos de la venta
    const items = selectedProducts.map(product => ({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price) || 0,
      quantity: product.quantity,
      image: product.image || ""
    }));

    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const total = calculateTotal();
    const discountValue = parseFloat(physicalSaleData.discountValue.toString()) || 0;
    const orderId = `sale-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const selectedEmployee = employees.find(employee => String(employee.id) === selectedEmployeeForSale);
    const empId = selectedEmployee?.id || user?.id || null;
    const empName = selectedEmployee?.nombre || selectedEmployee?.name || user?.name || user?.nombre || user?.email || 'Vendedor';
    const empEmail = selectedEmployee?.email || user?.email || null;

    let updatedStocks: Array<{ id: string; name: string; newStock: number }> = [];
    let committedItems = items;
    let committedSubtotal = subtotal;
    let committedDiscount = discount;
    let committedTotal = total;

    try {
      if (isSupabase) {
        const response = await fetch('/api/ventas/pos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            id: orderId,
            userId: user?.id || null,
            customerName: physicalSaleData.customerName,
            customerEmail: physicalSaleData.customerEmail,
            customerPhone: physicalSaleData.customerPhone,
            items,
            paymentMethod: physicalSaleData.paymentMethod,
            amountReceived: physicalSaleData.paymentMethod === 'efectivo' ? Number(pagoCon) : total,
            discountType: physicalSaleData.discountType,
            discountValue,
            notes: physicalSaleData.notes,
            contactId: selectedContactId === 'general' ? null : selectedContactId,
            branchName: selectedBranchForSale.trim() || 'Sin sucursal',
            employeeId: empId,
            employeeName: empName,
            employeeEmail: empEmail,
            billingLineId: selectedBillingLineId,
            agencyId: activeAgencyId || '2',
          })
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) throw new Error(result?.message || 'El backend no pudo registrar la venta.');
        updatedStocks = result.updatedStocks || [];
        committedItems = result.order?.items || items;
        committedSubtotal = Number(result.order?.subtotal ?? subtotal);
        committedDiscount = Number(result.order?.discountAmount ?? discount);
        committedTotal = Number(result.order?.total ?? total);
      } else {
        const orderRef = doc(collection(db, "orders"), orderId);
        updatedStocks = await runTransaction(db, async (transaction) => {
          const stockUpdates: Array<{ id: string; name: string; newStock: number }> = [];

          for (const selectedProduct of selectedProducts) {
            const productRef = doc(db, "products", selectedProduct.id);
            const productSnapshot = await transaction.get(productRef);

            if (!productSnapshot.exists()) {
              throw new Error(JSON.stringify({
                type: "stock",
                message: `El producto "${selectedProduct.name}" ya no estÃ¡ disponible en el inventario.`
              }));
            }

            const data = productSnapshot.data();
            const currentStock = Number(data.stock ?? 0);
            const quantityRequested = Number(selectedProduct.quantity ?? 0);

            if (!Number.isFinite(quantityRequested) || quantityRequested <= 0) {
              throw new Error(JSON.stringify({
                type: "stock",
                message: `Cantidad invÃ¡lida para "${selectedProduct.name}".`
              }));
            }

            if (!Number.isFinite(currentStock) || currentStock < quantityRequested) {
              throw new Error(JSON.stringify({
                type: "stock",
                message: `${selectedProduct.name}: Stock disponible ${Math.max(0, currentStock)}, solicitado ${quantityRequested}`
              }));
            }

            const newStock = currentStock - quantityRequested;

            transaction.update(productRef, {
              stock: newStock,
              lastModified: serverTimestamp()
            });

            stockUpdates.push({
              id: selectedProduct.id,
              name: selectedProduct.name,
              newStock
            });
          }

          transaction.set(orderRef, {
            userName: physicalSaleData.customerName,
            userPhone: physicalSaleData.customerPhone,
            userEmail: physicalSaleData.customerEmail,
            items,
            subtotal,
            discountType: physicalSaleData.discountType,
            discountValue,
            discountAmount: discount,
            total,
            status: "confirmed",
            createdAt: serverTimestamp(),
            confirmedAt: serverTimestamp(),
            orderType: "physical",
            paymentMethod: physicalSaleData.paymentMethod,
            orderNotes: physicalSaleData.notes,
            physicalSale: true,
            employee_id: empId,
            employee_name: empName,
            employeeId: empId,
            employeeName: empName,
            billingLineId: selectedBillingLineId,
            billing_line_id: selectedBillingLineId,
            contact_id: selectedContactId === 'general' ? null : selectedContactId,
            branch_name: selectedBranchForSale.trim() || 'Sin sucursal',
            agency_id: activeAgencyId || '2',
            agencyId: activeAgencyId || '2'
          });

          return stockUpdates;
        });
      }

      toast({
        title: "Venta registrada exitosamente",
        description: `Se ha registrado la venta por ${formatCurrency(committedTotal)}.`,
        variant: "default"
      });

      // Imprimir comprobante de venta inmediatamente
      handlePrintReceipt({
        id: orderId,
        items: committedItems,
        total: committedTotal,
        subtotal: committedSubtotal,
        discountAmount: committedDiscount,
        createdAt: new Date().toISOString(),
        userName: physicalSaleData.customerName || 'Cliente General',
        userPhone: physicalSaleData.customerPhone,
        employeeName: empName
      });

      // Facturación Electrónica Check
      const selectedLine = billingLines.find(l => l.id === selectedBillingLineId);
      if (selectedLine?.type === 'factura_electronica') {
        toast({
          title: "Timbrando Factura...",
          description: "Enviando datos a Facturama Sandbox.",
          variant: "default"
        });

        try {
          const timbrarRes = await fetch('/api/facturacion/timbrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: orderId,
              total: committedTotal,
              customer_name: billingData.nombre,
              rfc: billingData.rfc,
              zip: billingData.cp,
              regimen: billingData.regimen,
              uso_cfdi: billingData.usoCfdi,
              forma_pago: physicalSaleData.paymentMethod === 'tarjeta' ? '28' : '01',
              metodo_pago: 'PUE',
              billing_line_id: selectedBillingLineId,
              items: committedItems.map(i => ({
                name: i.name,
                price: i.price,
                quantity: i.quantity
              }))
            })
          });

          const timbrarJson = await timbrarRes.json();
          if (timbrarJson.success) {
            toast({
              title: "Factura Timbrada con Éxito",
              description: `Folio Fiscal (UUID): ${timbrarJson.uuid}`,
              variant: "default"
            });
          } else {
            toast({
              title: "Error al timbrar factura",
              description: timbrarJson.message || "Verifique los datos fiscales e intente nuevamente.",
              variant: "destructive"
            });
          }
        } catch (invoiceError: any) {
          console.error("Invoicing failed:", invoiceError);
          toast({
            title: "Error de red al facturar",
            description: invoiceError.message || "No se pudo conectar con el servidor de facturación.",
            variant: "destructive"
          });
        }
      }

      // El backend principal registra contabilidad dentro de la misma transacción.
      if (!isSupabase) try {
        await fetch('/api/contabilidad/movimientos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'ingreso',
            concepto: `Venta POS - Cliente: ${physicalSaleData.customerName || 'Cliente General'}`,
            monto: committedTotal,
            metodo_pago: physicalSaleData.paymentMethod,
            referencia_id: orderId
          })
        });
        console.log('[Contabilidad] Venta registrada en contabilidad con éxito.');
      } catch (accountingError) {
        console.error('[Contabilidad] Error al registrar venta en contabilidad:', accountingError);
      }

      // Forzar actualización del dashboard
      console.log("Disparando evento de actualización del dashboard con total:", committedTotal);
      const dashboardUpdateEvent = new CustomEvent('dashboardUpdate', {
        detail: {
          type: 'orderConfirmed',
          orderTotal: committedTotal
        }
      });
      document.dispatchEvent(dashboardUpdateEvent);

      // Forzar recarga de las estadísticas - busca el botón de actualizar del dashboard y haz clic en él
      setTimeout(() => {
        const refreshButton = document.querySelector('.dashboard-refresh-button');
        if (refreshButton && refreshButton instanceof HTMLButtonElement) {
          console.log("Forzando recarga de estadísticas");
          refreshButton.click();
        }
      }, 500);

      // Actualizar estadísticas del día inmediatamente (suma local)
      setDailySales(prev => ({
        total: prev.total + committedTotal,
        count: prev.count + 1,
        lastUpdated: new Date()
      }));

      // También actualizar desde Firestore después de un pequeño delay
      setTimeout(() => {
        fetchDailySales();
      }, 1000);

      // Resetear formulario para nueva venta
      setSelectedProducts([]);
      setPagoCon('0');
      setSelectedBillingLineId('none');
      setBillingData({
        rfc: 'XAXX010101000',
        nombre: 'PUBLICO EN GENERAL',
        cp: '26015',
        regimen: '616',
        usoCfdi: 'S01'
      });
      setPhysicalSaleData({
        customerName: 'Cliente General',
        customerPhone: '',
        customerEmail: '',
        paymentMethod: 'efectivo',
        notes: '',
        discountType: 'none',
        discountValue: 0,
      });
      setSelectedContactId('general');
      setProductSearchTerm('');

      // Recargar pedidos y productos
      await fetchOrders();
      await fetchProducts();

      // Opcional: mostrar alerta de stock agotado
      const zeroStockProducts = updatedStocks.filter(p => p.newStock === 0);
      if (zeroStockProducts.length > 0) {
        toast({
          title: "Productos sin stock",
          description: `${zeroStockProducts.map(p => p.name).join(", ")} quedÃ³ ${zeroStockProducts.length > 1 ? "sin stock" : "sin unidades disponibles"}.`,
        });
      }

      return true;

    } catch (error) {
      console.error("Error registrando la venta fÃ­sica:", error);
      let errorMessage = "No se pudo registrar la venta. Por favor, intente nuevamente.";
      let title = "Error al registrar la venta";

      if (error instanceof Error && error.message) {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed?.type === "stock") {
            errorMessage = parsed.message;
            title = "Stock insuficiente";
          } else if (parsed?.type === "auth") {
            errorMessage = parsed.message;
            title = "SesiÃ³n requerida";
          } else if (parsed?.message) {
            errorMessage = parsed.message;
          }
        } catch {
          if (error.message.toLowerCase().includes("stock")) {
            title = "Stock insuficiente";
            errorMessage = error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
        }
      }

      toast({
        title,
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setSavingPhysicalSale(false);
    }
  };

  // Confirmar pedido
  const handleConfirm = async (orderId: string) => {
    try {
      let orderData: any;
      if (isSupabase) {
        const { data, error: fetchErr } = await (db as any).from('orders').select('*').eq('id', orderId).single();
        if (fetchErr || !data) throw new Error("No se encontrÃ³ el pedido");
        orderData = data;
        const { error: updateErr } = await (db as any).from('orders').update({
          status: "confirmed",
          confirmed_at: new Date().toISOString()
        }).eq('id', orderId);
        if (updateErr) throw updateErr;
      } else {
        const orderRef = doc(db, "orders", orderId);
        const orderSnapshot = await getDoc(orderRef);
        if (!orderSnapshot.exists()) throw new Error("No se encontrÃ³ el pedido");
        orderData = orderSnapshot.data();
        await updateDoc(orderRef, { status: "confirmed", confirmedAt: new Date().toISOString() });
      }

      // Actualizar la UI
      setOrders(orders =>
        orders.map(order =>
          order.id === orderId ? {
            ...order,
            status: "confirmed",
            confirmedAt: new Date().toISOString()
          } : order
        )
      );

      toast({
        title: "Pedido confirmado",
        description: "El pedido ha sido confirmado exitosamente.",
        variant: "default"
      });

      // Registrar de forma automática en Contabilidad
      try {
        await fetch('/api/contabilidad/movimientos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'ingreso',
            concepto: `Pedido Web Confirmado - Cliente: ${orderData.userName || 'Cliente'}`,
            monto: parseFloat(orderData.total || 0),
            metodo_pago: orderData.paymentMethod || orderData.payment_method || 'transferencia',
            referencia_id: orderId
          })
        });
        console.log('[Contabilidad] Pedido web registrado en contabilidad con éxito.');
      } catch (accountingError) {
        console.error('[Contabilidad] Error al registrar pedido web en contabilidad:', accountingError);
      }

      // Forzar actualizaciÃ³n del dashboard
      const dashboardUpdateEvent = new CustomEvent('dashboardUpdate', {
        detail: {
          type: 'orderConfirmed',
          orderTotal: orderData.total || 0
        }
      });
      document.dispatchEvent(dashboardUpdateEvent);

      // Forzar recarga de las estadÃ­sticas - busca el botÃ³n de actualizar del dashboard y haz clic en Ã©l
      setTimeout(() => {
        const refreshButton = document.querySelector('.dashboard-refresh-button');
        if (refreshButton && refreshButton instanceof HTMLButtonElement) {
          console.log("Forzando recarga de estadÃ­sticas");
          refreshButton.click();
        }
      }, 500);
    } catch (error) {
      console.error("Error confirming order:", error);
      toast({
        title: "Error al confirmar",
        description: "No se pudo confirmar el pedido. Por favor, intente nuevamente.",
        variant: "destructive"
      });
    }
  };

  // Eliminar pedido
  const handleDelete = async (orderId: string) => {
    if (!confirm("Â¿EstÃ¡ seguro que desea eliminar este pedido? Esta acciÃ³n no se puede deshacer.")) {
      return;
    }

    try {
      if (isSupabase) {
        const { error } = await (db as any).from('orders').delete().eq('id', orderId);
        if (error) throw error;
      } else {
        await deleteDoc(doc(db, "orders", orderId));
      }
      setOrders(orders => orders.filter(order => order.id !== orderId));
      toast({
        title: "Pedido eliminado",
        description: "El pedido ha sido eliminado exitosamente.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el pedido. Por favor, intente nuevamente.",
        variant: "destructive"
      });
    }
  };

  // Manejar cambio en el notificador
  const handleToggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    toast({
      title: "FunciÃ³n no disponible",
      description: "El notificador de pedidos por correos aÃºn no estÃ¡ disponible en esta tienda.",
      variant: "destructive"
    });
  };

  // Exportar pedidos como CSV
  const exportToCSV = () => {
    setExporting(true);

    try {
      // Crear el contenido CSV
      const headers = ["ID", "Cliente", "Email", "TelÃ©fono", "Productos", "Total", "Estado", "Fecha CreaciÃ³n", "Fecha ConfirmaciÃ³n", "Notas"];

      const csvRows = [headers];

      // Agregar datos de pedidos
      filteredOrders.forEach(order => {
        const productsList = order.items && order.items.length > 0
          ? order.items.map((item: any) => `${item.name} x${item.quantity}`).join(", ")
          : "Sin productos";

        const row = [
          order.id || "",
          order.userName || "",
          order.userEmail || "",
          order.userPhone || "",
          productsList,
          typeof order.total === 'number' ? formatCurrency(order.total) : formatCurrency(0),
          order.status === 'confirmed' ? 'Confirmado' : 'En espera',
          order.createdAt ? formatDate(order.createdAt) : 'N/A',
          order.confirmedAt ? formatDate(order.confirmedAt) : 'N/A',
          order.orderNotes || ""
        ];

        csvRows.push(row);
      });

      // Convertir array a string CSV
      const csvContent = csvRows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      ).join('\n');

      // Crear el blob y descargarlo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `pedidos_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "ExportaciÃ³n exitosa",
        description: `Se han exportado ${filteredOrders.length} pedidos en formato CSV.`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast({
        title: "Error en la exportaciÃ³n",
        description: "No se pudieron exportar los pedidos. IntÃ©ntelo nuevamente.",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  // Exportar pedidos como PDF
  const exportToPDF = () => {
    setExporting(true);

    try {
      // Crear el documento PDF
      const doc = new jsPDF();

      // AÃ±adir tÃ­tulo
      doc.setFontSize(16);
      doc.text("Reporte de Pedidos", 14, 15);

      // AÃ±adir fecha
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, 14, 22);

      // AÃ±adir filtros utilizados
      if (searchTerm || currentTab !== 'all') {
        let filtersText = "Filtros: ";
        if (searchTerm) filtersText += `BÃºsqueda: "${searchTerm}" `;
        if (currentTab !== 'all') filtersText += `Estado: ${currentTab === 'pending' ? 'Pendientes' : 'Confirmados'}`;
        doc.text(filtersText, 14, 27);
      }

      // Preparar datos para la tabla
      const tableColumn = ["Cliente", "Contacto", "Productos", "Total", "Estado", "Fecha"];
      const tableRows = filteredOrders.map(order => {
        const productsList = order.items && order.items.length > 0
          ? order.items.map((item: any) => `${item.name} x${item.quantity}`).join(", ")
          : "Sin productos";

        return [
          order.userName || "Cliente",
          `${order.userPhone || "No especificado"}\n${order.userEmail || ""}`,
          productsList.length > 40 ? `${productsList.substring(0, 40)}...` : productsList,
          typeof order.total === 'number' ? formatCurrency(order.total) : formatCurrency(0),
          order.status === 'confirmed' ? 'Confirmado' : 'En espera',
          formatDate(order.createdAt)
        ];
      });

      // Crear tabla en el PDF
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 32,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        theme: 'grid',
        columnStyles: {
          0: { cellWidth: 30 },  // Cliente
          1: { cellWidth: 40 },  // Contacto
          2: { cellWidth: 60 },  // Productos
          3: { cellWidth: 15 },  // Total
          4: { cellWidth: 20 },  // Estado
          5: { cellWidth: 25 },  // Fecha
        }
      });

      // AÃ±adir informaciÃ³n al pie de pÃ¡gina
      const finalY = doc.lastAutoTable.finalY || 32;
      doc.setFontSize(10);
      doc.text(`Total de pedidos: ${filteredOrders.length}`, 14, finalY + 10);

      // AÃ±adir contador de estados
      const confirmedCount = filteredOrders.filter(order => order.status === 'confirmed').length;
      const pendingCount = filteredOrders.filter(order => order.status !== 'confirmed').length;
      doc.text(`Confirmados: ${confirmedCount} | Pendientes: ${pendingCount}`, 14, finalY + 16);

      // Guardar el PDF
      doc.save(`reporte_pedidos_${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "ExportaciÃ³n exitosa",
        description: `Se han exportado ${filteredOrders.length} pedidos en formato PDF.`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast({
        title: "Error en la exportación",
        description: "No se pudieron exportar los pedidos a PDF. Inténtelo nuevamente.",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: string, isPhysical: boolean, paymentMethod?: string) => {
    if (isPhysical) {
      return <Badge className="bg-[hsl(214,100%,38%)]/10 text-[hsl(214,100%,38%)] border-[hsl(214,100%,38%)]/20 font-medium rounded-lg">Venta Física</Badge>;
    }

    if (paymentMethod === 'pasarela') {
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-medium rounded-lg flex items-center gap-1">
        <CreditCard className="h-3 w-3" />
        Pagado con pasarela
      </Badge>;
    }

    switch (status) {
      case 'confirmed':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium rounded-lg">Confirmado</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-medium rounded-lg">En espera</Badge>;
    }
  };

  const getStatusIcon = (status: string, isPhysical: boolean) => {
    if (isPhysical) {
      return <ShoppingBag className="h-4 w-4 text-[hsl(214,100%,38%)]" />;
    }

    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  const formatDate = (dateString?: any) => {
    if (!dateString) return 'N/A';

    try {
      // Si es un timestamp de Firestore
      if (typeof dateString === 'object' && dateString.seconds) {
        return new Intl.DateTimeFormat('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(new Date(dateString.seconds * 1000));
      }

      // Si es una cadena ISO
      const date = new Date(dateString);

      // Validar si la fecha es válida
      if (isNaN(date.getTime())) {
        // Intentar convertir de timestamp numérico si es un número
        if (!isNaN(Number(dateString))) {
          return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).format(new Date(Number(dateString)));
        }

        // Si llegamos aquí, no pudimos formatear la fecha
        console.error("Fecha inválida:", dateString);
        return new Date().toLocaleDateString('es-ES');
      }

      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error, dateString);
      return new Date().toLocaleDateString('es-ES');
    }
  };

  const filteredOrders = orders
    .filter(order =>
      (order.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.userPhone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.id || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(order => {
      if (currentTab === 'all') return true;
      if (currentTab === 'pending') return order.status !== 'confirmed' && !order.physicalSale;
      if (currentTab === 'confirmed') return order.status === 'confirmed' && !order.physicalSale;
      if (currentTab === 'physical') return !!order.physicalSale || order.order_type === 'physical' || order.orderType === 'physical';
      return true;
    })
    .filter(order => {
      if (selectedEmployeeFilter === 'all') return true;
      if (selectedEmployeeFilter === 'none') {
        return !order.employee_id && !order.employeeId;
      }
      return order.employee_id === selectedEmployeeFilter || order.employeeId === selectedEmployeeFilter;
    })
    .filter(order => selectedBranchFilter === 'all' || getOrderBranch(order) === selectedBranchFilter);

  const branchOptions = Array.from(new Set(orders.map(getOrderBranch).filter((branch) => branch !== 'Sin sucursal'))).sort((a, b) => a.localeCompare(b, 'es'));
  const getOrderContact = (order: any) => {
    const contactId = order.contact_id ?? order.contactId ?? order.customer_id ?? order.customerId;
    const email = String(order.userEmail || order.user_email || order.customer_email || order.customerEmail || '').trim().toLowerCase();
    const phone = normalizePhone(order.userPhone || order.user_phone || order.customer_phone || order.customerPhone || '');
    const name = String(order.userName || order.user_name || order.customer_name || order.customerName || '').trim().toLowerCase();
    const exactNameMatches = name ? contacts.filter((contact) => String(contact.name || contact.nombre || '').trim().toLowerCase() === name) : [];
    return contacts.find((contact) => contactId && String(contact.id) === String(contactId))
      || contacts.find((contact) => email && String(contact.email || contact.correo || '').trim().toLowerCase() === email)
      || contacts.find((contact) => phone && normalizePhone(contact.phone || contact.telefono || contact.mobile || '') === phone)
      || (exactNameMatches.length === 1 ? exactNameMatches[0] : null)
      || null;
  };

  if (showQuoteModal) {
    return (
      <div className="h-[calc(100vh-120px)] min-h-[600px] w-full animate-in fade-in zoom-in-95 duration-200">
        {quoteModalType === 'proforma' ? (
          <ProformaBuilder isOpen={showQuoteModal} onClose={() => { setShowQuoteModal(false); setSelectedOrderForQuote(null); }} initialOrderData={selectedOrderForQuote} />
        ) : (
          <QuoteBuilder isOpen={showQuoteModal} onClose={() => { setShowQuoteModal(false); setSelectedOrderForQuote(null); }} initialOrderData={selectedOrderForQuote} />
        )}
      </div>
    );
  }

  return (
    <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
      <style>{responsiveStyles}</style>
      <CardHeader className="pb-0 bg-slate-50/50 border-b border-slate-200">
        {/* Encabezado responsivo */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3 whitespace-nowrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-800 text-xl md:text-2xl font-bold">
                Gestión de Pedidos
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs md:text-sm mt-0.5">
                {refreshing ? 'Actualizando...' : `Total ${filteredOrders.length} ${filteredOrders.length === 1 ? 'pedido' : 'pedidos'}`}
              </CardDescription>
            </div>
          </div>

          <div className="flex-1 w-full md:w-auto flex flex-col sm:flex-row flex-wrap gap-2.5 items-center justify-end">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Buscar pedido por cliente, contacto o ID..."
                className="pl-10 text-xs h-9.5 border-slate-200 focus:border-[hsl(214,100%,38%)] focus:ring-[hsl(214,100%,38%)]/20 rounded-xl bg-slate-50/50 hover:bg-white transition-colors w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[180px] shrink-0">
              <Select
                value={selectedEmployeeFilter}
                onValueChange={(val) => setSelectedEmployeeFilter(val)}
              >
                <SelectTrigger className="h-9.5 text-[11px] border-slate-200 focus:border-[hsl(214,100%,38%)] focus:ring-[hsl(214,100%,38%)]/20 rounded-xl bg-slate-50/50 hover:bg-white transition-colors">
                  <SelectValue placeholder="Filtrar por Empleado" />
                </SelectTrigger>
                <SelectContent className="bg-white border z-50">
                  <SelectItem value="all">Todos los Empleados</SelectItem>
                  <SelectItem value="none">Sin Empleado (Ventas Web/Gral)</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nombre || emp.name || 'Sin nombre'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-[180px] shrink-0">
              <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
                <SelectTrigger className="h-9.5 text-[11px] border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white transition-colors">
                  <SelectValue placeholder="Filtrar por sucursal" />
                </SelectTrigger>
                <SelectContent className="bg-white border z-50">
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  <SelectItem value="Sin sucursal">Sin sucursal</SelectItem>
                  {branchOptions.map((branch) => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3 shrink-0">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleOpenPhysicalSaleModal(false)}
              className="flex items-center gap-1.5 text-xs h-9 gradient-orange hover:opacity-90"
            >
              <ShoppingBag className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden xs:inline">Venta Física</span>
              <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 xs:hidden" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex items-center gap-1.5 px-2 h-9 hover:bg-slate-100 text-slate-500 border-0"
                >
                  <MoreVertical className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border border-slate-200 bg-white shadow-md rounded-lg p-1 min-w-[180px] z-50">
                <DropdownMenuItem
                  onClick={() => {
                    setQuoteModalType('quote');
                    setSelectedOrderForQuote(null);
                    setShowQuoteModal(true);
                  }}
                  className="gap-2 cursor-pointer flex items-center px-3 py-2 text-xs font-medium rounded-md text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Generar Cotización</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setQuoteModalType('proforma');
                    setSelectedOrderForQuote(null);
                    setShowQuoteModal(true);
                  }}
                  className="gap-2 cursor-pointer flex items-center px-3 py-2 text-xs font-medium rounded-md text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <span>Generar Proforma</span>
                </DropdownMenuItem>

                <div className="h-px bg-slate-100 my-1" />

                <DropdownMenuItem onClick={handleRefresh} disabled={refreshing} className="gap-2 cursor-pointer flex items-center px-3 py-2 text-xs font-medium rounded-md text-slate-700 hover:bg-slate-50">
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToCSV} disabled={exporting || filteredOrders.length === 0} className="gap-2 cursor-pointer flex items-center px-3 py-2 text-xs font-medium rounded-md text-slate-700 hover:bg-slate-50">
                  <Download className="h-4 w-4" />
                  <span>Exportar como CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF} disabled={exporting || filteredOrders.length === 0} className="gap-2 cursor-pointer flex items-center px-3 py-2 text-xs font-medium rounded-md text-slate-700 hover:bg-slate-50">
                  <FileText className="h-4 w-4" />
                  <span>Exportar como PDF</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="mt-4 md:mt-5">
          <TabsList className="mb-3 bg-slate-100 p-1 w-full h-10 md:h-11 rounded-xl border border-slate-200">
            <TabsTrigger value="all" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[hsl(214,100%,38%)] rounded-lg">
              Todos
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[hsl(214,100%,38%)] rounded-lg">
              Pendientes
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[hsl(214,100%,38%)] rounded-lg">
              Confirmados
            </TabsTrigger>
            <TabsTrigger value="physical" className="text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[hsl(214,100%,38%)] rounded-lg">
              Ventas Físicas
            </TabsTrigger>
          </TabsList>

        </Tabs>
      </CardHeader>
      <CardContent className="pt-4 px-4 md:px-6 bg-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <RefreshCw className="h-7 w-7 animate-spin text-[hsl(214,100%,38%)]" />
            </div>
            <span className="text-slate-500 text-sm">Cargando pedidos...</span>
          </div>
        ) : (
          <>
            {/* Dashboard Resumen Estadístico */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-white to-blue-50/10 rounded-xl overflow-hidden hover:shadow-md transition-all duration-300">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider block">Volumen Ventas</span>
                    <span className="text-base sm:text-lg font-black text-slate-800">
                      {formatCurrency(sumRealSales(orders))}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-white to-amber-50/10 rounded-xl overflow-hidden hover:shadow-md transition-all duration-300">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider block">Pedidos en Espera</span>
                    <span className="text-base sm:text-lg font-black text-slate-800">
                      {orders.filter(o => o.status !== 'confirmed' && !o.physicalSale).length}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/10 rounded-xl overflow-hidden hover:shadow-md transition-all duration-300">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider block">Pedidos Confirmados</span>
                    <span className="text-base sm:text-lg font-black text-slate-800">
                      {orders.filter(o => isRealSaleOrder(o) && !o.physicalSale).length}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-white to-indigo-50/10 rounded-xl overflow-hidden hover:shadow-md transition-all duration-300">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider block">Ventas Físicas (POS)</span>
                    <span className="text-base sm:text-lg font-black text-slate-800">
                      {orders.filter(o => !!o.physicalSale || o.order_type === 'physical' || o.orderType === 'physical').length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden overflow-x-auto responsive-table shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
                    <TableHead className="font-semibold text-slate-700 text-xs md:text-sm whitespace-nowrap">Cliente</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-xs md:text-sm whitespace-nowrap hidden sm:table-cell">Contacto</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-xs md:text-sm whitespace-nowrap hidden lg:table-cell">Sucursal</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-xs md:text-sm whitespace-nowrap hidden md:table-cell">Productos</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-xs md:text-sm whitespace-nowrap">Total</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-xs md:text-sm whitespace-nowrap hidden sm:table-cell">Fecha</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-xs md:text-sm whitespace-nowrap">Estado</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700 text-xs md:text-sm whitespace-nowrap">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const linkedContact = getOrderContact(order);
                    return (
                    <TableRow key={order.id} className="hover:bg-slate-50/80 text-xs md:text-sm border-b border-slate-100">
                      {/* Cliente - Siempre visible */}
                      <TableCell className="py-2 md:py-4">
                        <div>
                          <div className="font-semibold text-xs md:text-sm line-clamp-1">
                            {linkedContact?.name || linkedContact?.nombre || order.userName || order.user_name || 'Cliente'}
                          </div>
                          <div className="text-[10px] md:text-xs text-muted-foreground mt-1 hidden xs:block">
                            ID: {order.id.substring(0, 6)}...
                          </div>
                        </div>
                      </TableCell>

                      {/* Contacto - Oculto en móvil */}
                      <TableCell className="hidden sm:table-cell py-2 md:py-4">
                        <div>
                          <div className="font-medium text-xs md:text-sm flex items-center gap-1 line-clamp-1">
                            {[order.userPhone, order.user_phone, order.customer_phone, linkedContact?.phone, linkedContact?.telefono, linkedContact?.mobile, linkedContact?.email, linkedContact?.correo, linkedContact?.name, linkedContact?.nombre].find((value) => {
                              const text = String(value || '').trim();
                              return text && !/^no especificado$/i.test(text);
                            }) || 'No especificado'}
                          </div>
                          <div className="text-[10px] md:text-xs text-[hsl(214,100%,38%)] font-semibold mt-1 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="line-clamp-1">{order.userEmail || order.user_email || order.customer_email || linkedContact?.email || linkedContact?.correo || ''}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell py-2 md:py-4">{getOrderBranch(order)}</TableCell>

                      {/* Productos - Oculto en móvil */}
                      <TableCell className="hidden md:table-cell py-2 md:py-4">
                        <div className="max-w-[140px] md:max-w-[200px] overflow-hidden">
                          {order.items && order.items.length > 0 ? (
                            <>
                              {order.items.slice(0, 2).map((item: any, idx: number) => (
                                <div key={idx} className="text-xs md:text-sm flex items-center gap-1 mb-1">
                                  <Badge variant="outline" className="px-1.5 py-0 h-4 md:h-5 text-[10px] md:text-xs rounded-lg border-slate-200 bg-slate-50">
                                    {item.quantity}
                                  </Badge>
                                  <span className="truncate max-w-[90px] md:max-w-[140px]" title={item.name}>
                                    {item.name}
                                  </span>
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <div className="text-[10px] md:text-xs text-slate-500">
                                  +{order.items.length - 2} más
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] md:text-xs text-muted-foreground">Sin productos</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Total - Siempre visible */}
                      <TableCell className="py-2 md:py-4">
                        <div className="font-semibold text-[hsl(214,100%,38%)] text-xs md:text-sm whitespace-nowrap">
                          {formatCurrency(typeof order.total === 'number' ? order.total : 0)}
                        </div>
                        {order.discountType && order.discountType !== 'none' && (
                          <div className="text-[10px] md:text-xs text-red-500 mt-1 flex items-center gap-1">
                            <Tags className="h-3 w-3" />
                            {order.discountType === 'percentage' ?
                              `${order.discountValue}% desc.` :
                              `${formatCurrency(order.discountAmount || 0)} desc.`}
                          </div>
                        )}
                      </TableCell>

                      {/* Fecha - Oculto en móvil */}
                      <TableCell className="hidden sm:table-cell py-2 md:py-4">
                        <div>
                          <div className="text-[10px] md:text-xs font-medium">
                            {formatDate(order.createdAt)}
                          </div>
                          {order.status === 'confirmed' && order.confirmedAt && (
                            <div className="text-[10px] md:text-xs text-slate-500 mt-1">
                              Conf: {formatDate(order.confirmedAt)}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Estado - Siempre visible */}
                      <TableCell className="py-2 md:py-4">
                        <div className="flex items-center gap-1 md:gap-2">
                          {getStatusIcon(order.status || 'pending', !!order.physicalSale)}
                          {getStatusBadge(order.status || 'pending', !!order.physicalSale, order.paymentMethod || order.payment_method)}
                        </div>
                        {order.orderNotes && (
                          <div className="text-[10px] md:text-xs text-slate-500 mt-1 italic truncate max-w-[80px] md:max-w-[120px] hidden sm:block" title={order.orderNotes}>
                            "{order.orderNotes}"
                          </div>
                        )}
                        {(order.paymentMethod || order.payment_method) && (
                          <div className="text-[10px] md:text-xs text-slate-500 mt-1 truncate max-w-[80px] md:max-w-[120px]">
                            Pago: {
                              (order.paymentMethod === 'pasarela' || order.payment_method === 'pasarela') ? 'Pasarela (MP)' :
                                order.paymentMethod === 'efectivo' ? 'Efectivo' :
                                  order.paymentMethod === 'tarjeta' ? 'Tarjeta' :
                                    'Transferencia'
                            }
                          </div>
                        )}
                      </TableCell>

                      {/* Acciones - Siempre visible */}
                      <TableCell className="text-right py-2 md:py-4">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg animate-in"
                              >
                                <MoreVertical className="h-4 w-4 text-slate-500" />
                                <span className="sr-only">Abrir menú</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="border border-slate-200 bg-white shadow-md rounded-lg p-1 min-w-[160px] z-50">
                              {order.status !== "confirmed" && !order.physicalSale && (
                                <DropdownMenuItem
                                  onClick={() => handleConfirm(order.id)}
                                  className="text-green-600 hover:bg-green-50 flex items-center gap-2 px-3 py-2 text-xs cursor-pointer font-medium rounded-md"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Confirmar Pedido
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setQuoteModalType('quote');
                                  setSelectedOrderForQuote(order);
                                  setShowQuoteModal(true);
                                }}
                                className="hover:bg-slate-50 flex items-center gap-2 px-3 py-2 text-xs cursor-pointer font-medium rounded-md text-slate-700"
                              >
                                <FileText className="h-3.5 w-3.5 text-blue-600" />
                                Generar Cotización
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setQuoteModalType('proforma');
                                  setSelectedOrderForQuote(order);
                                  setShowQuoteModal(true);
                                }}
                                className="hover:bg-slate-50 flex items-center gap-2 px-3 py-2 text-xs cursor-pointer font-medium rounded-md text-slate-700"
                              >
                                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                Generar Proforma
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(order.id)}
                                className="text-red-600 hover:bg-red-50 flex items-center gap-2 px-3 py-2 text-xs cursor-pointer font-medium rounded-md"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Eliminar Pedido
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>)}

        {filteredOrders.length === 0 && !loading && (
          <div className="text-center py-12 md:py-16 border border-slate-200 rounded-xl bg-slate-50/50">
            <div className="flex flex-col items-center max-w-[280px] md:max-w-md mx-auto px-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-700 text-base md:text-lg mb-2">No hay pedidos</h3>
              <span className="text-slate-500 text-sm mb-4 block">
                No se encontraron pedidos con los criterios de búsqueda actuales.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentTab('all');
                }}
                className="text-sm h-9 border-slate-200 hover:bg-slate-100"
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Punto de Venta (POS) - Pantalla Completa */}
      {showPhysicalSaleModal && createPortal((
        <>
          {/* Estilos personalizados para scrollbar sutil y estilo POS */}
          <style>{`
            .pos-scrollbar::-webkit-scrollbar, .pos-scrollbar-horizontal::-webkit-scrollbar { width: 5px; height: 5px; }
            .pos-scrollbar::-webkit-scrollbar-track, .pos-scrollbar-horizontal::-webkit-scrollbar-track { background: #e8eef2; }
            .pos-scrollbar::-webkit-scrollbar-thumb, .pos-scrollbar-horizontal::-webkit-scrollbar-thumb {
              background: #9aadb9;
            }
            .pos-scrollbar::-webkit-scrollbar-thumb:hover, .pos-scrollbar-horizontal::-webkit-scrollbar-thumb:hover {
              background: #397da8;
            }
          `}</style>

          <PhysicalPosWorkspace
            operatorName={employees.find(employee => String(employee.id) === selectedEmployeeForSale)?.nombre || user?.name || user?.nombre || user?.email || 'Operador'}
            dailySales={dailySales}
            isQuoteMode={isQuoteMode}
            customerName={physicalSaleData.customerName}
            products={products}
            loadingProducts={loadingProducts}
            selectedProducts={selectedProducts}
            selectedCartIndex={selectedCartIndex}
            selectedCategoryFilter={selectedCategoryFilter}
            productSearchTerm={productSearchTerm}
            paymentMethod={physicalSaleData.paymentMethod}
            amountReceived={pagoCon}
            discountType={physicalSaleData.discountType}
            discountValue={physicalSaleData.discountValue}
            notes={physicalSaleData.notes}
            employees={employees}
            selectedEmployeeId={selectedEmployeeForSale}
            branchName={selectedBranchForSale}
            subtotal={calculateSubtotal()}
            discount={calculateDiscount()}
            total={calculateTotal()}
            onClose={handleClosePhysicalSale}
            onSearchChange={setProductSearchTerm}
            onSearchSubmit={handleAddSearchedProduct}
            onAddProduct={handleAddProduct}
            onSelectCartItem={setSelectedCartIndex}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveProduct={handleRemoveProduct}
            onCategoryChange={setSelectedCategoryFilter}
            onOpenCommonProduct={() => {
              setCommonProductData({ name: 'Artículo Común', price: '', quantity: '1' });
              setShowCommonProductModal(true);
            }}
            onCashEntry={() => {
              setCashRegisterType('entrada');
              setCashRegisterData({ amount: '', concept: '' });
              setShowCashRegisterModal(true);
            }}
            onCashExit={() => {
              setCashRegisterType('salida');
              setCashRegisterData({ amount: '', concept: '' });
              setShowCashRegisterModal(true);
            }}
            onNewSale={handleNewSale}
            onAssignCustomer={() => setShowAssignClientModal(true)}
            onReprint={handleReprint}
            onHold={handleApartarTicket}
            onPay={handlePayTicket}
            onViewSales={() => {
              handleClosePhysicalSale();
              setCurrentTab('physical');
            }}
            onPaymentMethodChange={paymentMethod => setPhysicalSaleData(current => ({ ...current, paymentMethod }))}
            onAmountReceivedChange={setPagoCon}
            onDiscountTypeChange={discountType => setPhysicalSaleData(current => ({ ...current, discountType, discountValue: 0 }))}
            onDiscountValueChange={discountValue => setPhysicalSaleData(current => ({ ...current, discountValue }))}
            onNotesChange={notes => setPhysicalSaleData(current => ({ ...current, notes }))}
            onEmployeeChange={setSelectedEmployeeForSale}
            onBranchNameChange={setSelectedBranchForSale}
          />

          {showLegacyPos && (
          <div className="hidden">
            {/* Top Notification Bar - Solid Blue */}
            <div className="hidden">
              <div className="flex items-center space-x-2 flex-1 justify-center">
                <span className="uppercase tracking-widest font-black text-sm">FREE MERCO</span>
                <button
                  onClick={() => {
                    setShowPhysicalSaleModal(false);
                    window.location.hash = '#planes';
                  }}
                  className="ml-3 bg-blue-600 hover:bg-blue-700 text-white px-3 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  Resolve
                </button>
              </div>
            </div>

            {/* Top Toolbar Header (La misma de el inicio) */}
            <header className="bg-white border-b border-slate-300 flex items-center justify-between px-4 sm:px-6 py-3 z-20 min-h-[62px]">
              {/* Left Section: Breadcrumbs Title */}
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setShowPhysicalSaleModal(false)} className="h-9 w-9 shrink-0 border border-slate-300 text-[#245878] flex items-center justify-center hover:bg-slate-50" title="Volver a pedidos">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="h-9 w-9 shrink-0 bg-[#245878] text-white flex items-center justify-center"><ShoppingBag className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <span className="block text-[15px] font-bold text-slate-900 tracking-tight">Punto de venta</span>
                  <span className="block text-[11px] text-slate-500 truncate">Caja principal · Operación comercial</span>
                </div>
              </div>

              {/* Right Section: Circular Action Icons */}
              <div className="flex items-center gap-3">
                {/* Home Button - Ir a la tienda */}
                <button
                  onClick={() => {
                    setShowPhysicalSaleModal(false);
                  }}
                  className="hidden"
                  type="button"
                  title="Volver"
                >
                  <Home className="h-4 w-4" />
                </button>

                {/* Plan sin IA */}
                <button
                  className="hidden"
                  type="button"
                  title="Plan IA"
                >
                  <Sparkles className="h-4 w-4" />
                </button>

                {/* Anuncios Websy */}
                <button
                  className="hidden"
                  type="button"
                  title="Anuncios Websy"
                >
                  <Megaphone className="h-4 w-4" />
                </button>

                {/* Bell - Orange */}
                <button
                  className="hidden"
                  type="button"
                  title="Notificaciones"
                >
                  <Bell className="h-4 w-4" />
                </button>

                {/* Help - Blue */}
                <button
                  className="hidden"
                  type="button"
                  title="Manual de Ayuda"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>

                {/* User Avatar - Green */}
                <div className="flex items-center gap-3">
                  <div className="hidden md:block text-right border-r border-slate-200 pr-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Ventas de hoy</p>
                    <p className="text-sm font-bold text-[#245878]">{formatCurrency(dailySales.total)} <span className="text-[10px] font-medium text-slate-400">({dailySales.count})</span></p>
                  </div>
                  <div className="w-9 h-9 bg-[#2c86b7] text-white flex items-center justify-center font-semibold text-xs">
                    {(user?.name || user?.email || 'AD').substring(0, 2).toUpperCase()}
                  </div>
                </div>
              </div>
            </header>

            {/* 2. Breadcrumbs / Dark sub-header bar */}
            <div className="bg-[#245878] px-4 sm:px-6 py-2 flex items-center justify-between text-[11px] text-blue-100 border-b border-[#1b4661]">
              <div>
                <span>Inicio</span>
                <span className="mx-1.5 text-blue-300">›</span>
                <span className="text-white font-semibold">Ventas</span>
              </div>
              <div className="flex items-center gap-1.5 text-white">
                <Wifi className="h-3 w-3 text-emerald-300" /> <span className="font-semibold">Sincronizado</span>
              </div>
            </div>

            {/* 3. Ticket status bar */}
            <div className="bg-white px-4 sm:px-6 py-2.5 border-b border-slate-300 flex justify-between items-center">
              <span className="text-[#245878] font-bold text-xs tracking-wide uppercase">
                {isQuoteMode ? 'VENTA - Cotizador / Proforma' : 'VENTA - Ticket 1'}
              </span>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5" /> Cliente: <span className="font-bold text-slate-800">{physicalSaleData.customerName || 'Cliente General'}</span>
              </div>
            </div>

            {/* 4. Search input bar */}
            <div className="bg-white p-3 px-4 sm:px-6 border-b border-slate-300 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-grow">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="pos-product-search"
                    placeholder="Buscar por nombre, referencia o código de barras"
                    className="pl-9 pr-8 h-10 w-full bg-slate-50 border border-slate-300 rounded-none text-sm text-slate-800 focus-visible:ring-1 focus-visible:ring-[#2c86b7]"
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                  />
                  {productSearchTerm && (
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => setProductSearchTerm('')}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* ENTER - Agregar Producto Button */}
              <button
                onClick={handleAddSearchedProduct}
                className="bg-[#245878] hover:bg-[#1b4661] text-white text-xs font-bold px-5 h-10 rounded-none uppercase flex items-center justify-center gap-2 transition-colors"
              >
                <Check className="w-4 h-4" />
                Agregar <span className="hidden md:inline text-white/70">Enter</span>
              </button>
            </div>

            {/* 5. Shortcut buttons toolbar */}
            <div className="pos-commandbar bg-slate-50 px-4 sm:px-6 py-2 border-b border-slate-300 flex gap-1.5 overflow-x-auto pos-scrollbar-horizontal">
              <button
                onClick={() => {
                  setCommonProductData({ name: 'Artículo Común', price: '', quantity: '1' });
                  setShowCommonProductModal(true);
                }}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold py-2 px-3 uppercase transition-colors whitespace-nowrap"
              >
                CTRL+P Art. C...
              </button>
              <button
                onClick={() => {
                  setCashRegisterType('entrada');
                  setCashRegisterData({ amount: '', concept: '' });
                  setShowCashRegisterModal(true);
                }}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold py-2 px-3 uppercase transition-colors whitespace-nowrap"
              >
                F7 Entradas
              </button>
              <button
                onClick={() => {
                  setCashRegisterType('salida');
                  setCashRegisterData({ amount: '', concept: '' });
                  setShowCashRegisterModal(true);
                }}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold py-2 px-3 uppercase transition-colors whitespace-nowrap"
              >
                F8 Salidas
              </button>
              <button
                onClick={handleDeleteSelectedCartItem}
                className="bg-white hover:bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold py-2 px-3 uppercase transition-colors whitespace-nowrap"
              >
                F6 Eliminar
              </button>
              <button
                onClick={handleNewSale}
                className="bg-white hover:bg-blue-50 text-[#245878] border border-blue-200 text-[10px] font-bold py-2 px-3 uppercase transition-colors whitespace-nowrap"
              >
                F4 Nueva
              </button>
            </div>

            {/* 6. Main Double Column Layout */}
            <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row p-3 sm:p-4 gap-3">

              {/* Left Column - VENTA Cart details */}
              <div className="w-full lg:w-[42%] bg-white border border-slate-300 flex flex-col min-h-[320px] lg:min-h-0">
                {/* Tabs header */}
                <div className="bg-slate-50 border-b border-slate-300 flex">
                  <button
                    onClick={() => setActivePosTab('venta')}
                    className={cn(
                      "px-5 py-2.5 text-xs font-bold tracking-wider transition-all uppercase border-r border-[#D8D5CD]",
                      activePosTab === 'venta'
                        ? "bg-[#245878] text-white"
                        : "text-neutral-500 hover:bg-neutral-100"
                    )}
                  >
                    VENTA
                  </button>
                  <button
                    onClick={() => setActivePosTab('categorias')}
                    className={cn(
                      "px-5 py-2.5 text-xs font-bold tracking-wider transition-all uppercase border-r border-[#D8D5CD]",
                      activePosTab === 'categorias'
                        ? "bg-[#245878] text-white"
                        : "text-neutral-500 hover:bg-neutral-100"
                    )}
                  >
                    CATEGOR...
                  </button>
                </div>

                {/* Tab content */}
                {activePosTab === 'venta' ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Cart Table Headers */}
                    <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-[#F6F5F3] border-b border-[#D8D5CD] text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      <div className="col-span-6">Artículo</div>
                      <div className="col-span-3 text-right">P...</div>
                      <div className="col-span-3 text-right">*</div>
                    </div>

                    {/* Cart items list */}
                    <div className="flex-1 overflow-y-auto pos-scrollbar p-1.5 space-y-1">
                      {selectedProducts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-10">
                          <ShoppingBag className="w-10 h-10 mb-2 text-slate-300" />
                          <p className="text-xs font-semibold">Ticket vacío</p>
                          <p className="text-[10px]">Agrega productos haciendo clic en el catálogo</p>
                        </div>
                      ) : (
                        selectedProducts.map((item, idx) => (
                          <div
                            key={item.id}
                            onClick={() => setSelectedCartIndex(idx)}
                            className={cn(
                              "grid grid-cols-12 gap-1 items-center px-3 py-2.5 border cursor-pointer transition-colors text-xs",
                              selectedCartIndex === idx
                                ? "bg-blue-50 border-[#2c86b7]"
                                : "bg-white border-neutral-200 hover:bg-slate-50"
                            )}
                          >
                            <div className="col-span-6 font-medium truncate pr-1">
                              {item.name}
                            </div>
                            <div className="col-span-3 text-right font-semibold text-neutral-600">
                              {formatCurrency(parseFloat(item.price || 0))}
                            </div>
                            <div className="col-span-3 text-right flex items-center justify-end gap-1">
                              {/* Quantity adjustments */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateQuantity(item.id, item.quantity - 1);
                                }}
                                className="w-6 h-6 border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-bold min-w-[14px] text-center">{item.quantity}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateQuantity(item.id, item.quantity + 1);
                                }}
                                className="w-6 h-6 border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  // Categories Tab Content
                  <div className="flex-1 overflow-y-auto pos-scrollbar p-2 space-y-1 bg-[#F9F8F6]">
                    <div
                      onClick={() => {
                        setSelectedCategoryFilter(null);
                        setActivePosTab('venta');
                        toast({ title: "Filtro limpiado", description: "Mostrando todos los productos" });
                      }}
                      className={cn(
                        "p-2.5 text-xs font-semibold uppercase tracking-wider rounded border cursor-pointer transition-all",
                        selectedCategoryFilter === null
                          ? "bg-[#245878] text-white border-[#245878]"
                          : "bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                      )}
                    >
                      Todas las Categorías
                    </div>
                    {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map((cat: any) => (
                      <div
                        key={cat}
                        onClick={() => {
                          setSelectedCategoryFilter(cat);
                          setActivePosTab('venta');
                          toast({ title: `Filtro aplicado: ${cat}`, description: `Mostrando artículos de ${cat}` });
                        }}
                        className={cn(
                          "p-2.5 text-xs font-semibold uppercase tracking-wider rounded border cursor-pointer transition-all",
                          selectedCategoryFilter === cat
                            ? "bg-[#245878] text-white border-[#245878]"
                            : "bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                        )}
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column - Product catalog Grid */}
                <div className="flex-1 bg-white border border-slate-300 flex flex-col p-3 overflow-hidden min-h-[380px] lg:min-h-0">
                {/* Catalog Title / Active filter */}
                <div className="mb-2.5 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Catálogo de Productos {selectedCategoryFilter && `› ${selectedCategoryFilter}`}
                  </h3>
                  {selectedCategoryFilter && (
                    <button
                      onClick={() => setSelectedCategoryFilter(null)}
                      className="text-[10px] font-bold text-red-600 hover:text-red-700 uppercase"
                    >
                      Quitar Filtro x
                    </button>
                  )}
                </div>

                {/* Product Grid container */}
                <div className="flex-1 overflow-y-auto pos-scrollbar pr-1">
                  {loadingProducts ? (
                    <div className="h-full flex items-center justify-center py-20 text-slate-400">
                      <RefreshCw className="w-8 h-8 animate-spin text-[#C59B4E] mr-2" />
                      <span>Cargando catálogo...</span>
                    </div>
                  ) : (
                    (() => {
                      const filteredProducts = products.filter(product => {
                        const matchesCategory = selectedCategoryFilter ? product.category === selectedCategoryFilter : true;
                        const matchesSearch = productSearchTerm
                          ? product.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                          product.description?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                          product.id?.toLowerCase().includes(productSearchTerm.toLowerCase())
                          : true;
                        return matchesCategory && matchesSearch;
                      });

                      if (filteredProducts.length === 0) {
                        return (
                          <div className="text-center py-20 text-neutral-400">
                            <ShoppingBag className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
                            <p className="text-sm font-semibold">No se encontraron productos</p>
                            <p className="text-xs">Prueba cambiando los filtros o la búsqueda</p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                          {filteredProducts.map((product) => {
                            const stock = product.stock || 0;
                            const hasStock = stock > 0;

                            return (
                              <div
                                key={product.id}
                                onClick={() => hasStock && handleAddProduct(product.id)}
                                className={cn(
                                  "bg-white border border-slate-200 p-3 flex flex-col justify-between cursor-pointer transition-colors duration-150",
                                  !hasStock && "opacity-45 cursor-not-allowed",
                                  hasStock && "hover:border-[#2c86b7] hover:bg-blue-50/30"
                                )}
                              >
                                <div>
                                  {/* Icon / Image container */}
                                  <div className="w-full h-20 bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                                    {product.image ? (
                                      <img
                                        src={product.image}
                                        alt={product.name}
                                        className="h-full w-full object-contain p-2"
                                      />
                                    ) : (
                                      <svg className="w-8 h-8 text-[#5390BE]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                        <line x1="12" y1="22.08" x2="12" y2="12" />
                                      </svg>
                                    )}
                                  </div>

                                  {/* Product Name */}
                                  <p className="text-xs font-semibold text-center text-neutral-800 line-clamp-2 mb-2 leading-snug">
                                    {product.name}
                                  </p>
                                </div>

                                {/* Product Price Badge */}
                                <div className="text-center">
                                  <span className="inline-block text-[#0a7b58] text-sm font-black">
                                    {formatCurrency(parseFloat(product.price || 0))}
                                  </span>
                                  <div className="text-[9px] text-slate-400 mt-1">
                                    Stock: {stock}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>

            {/* 7. Footer / Payment bar */}
            <div className="bg-white border-t border-slate-300 p-3 sm:px-6 grid grid-cols-12 gap-3 items-center shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">

              {/* Left footer: Total, Pago Con, Cambio, and buttons */}
              <div className="col-span-12 lg:col-span-5 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-bold text-neutral-600">
                  <div>
                    Total: <span className="text-neutral-900">{formatCurrency(calculateTotal())}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>Pago Con:</span>
                    <Input
                      type="text"
                      className="w-24 h-8 bg-slate-50 border border-slate-300 rounded-none text-right px-2 text-xs text-slate-800 font-bold focus-visible:ring-1 focus-visible:ring-[#2c86b7]"
                      value={pagoCon}
                      onChange={(e) => {
                        const cleanVal = e.target.value.replace(/[^0-9.]/g, '');
                        setPagoCon(cleanVal);
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <div>
                    Cambio: <span className="text-neutral-900">{formatCurrency(Math.max(0, (parseFloat(pagoCon) || 0) - calculateTotal()))}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // Toggle payment method
                      const nextMethod = physicalSaleData.paymentMethod === 'efectivo' ? 'tarjeta' :
                        physicalSaleData.paymentMethod === 'tarjeta' ? 'transferencia' : 'efectivo';
                      setPhysicalSaleData({ ...physicalSaleData, paymentMethod: nextMethod });
                      toast({ title: "MÃ©todo de pago", description: `Cambiado a: ${nextMethod.toUpperCase()}` });
                    }}
                    className="bg-white hover:bg-slate-50 text-[#245878] border border-slate-300 text-[10px] font-bold py-2 px-3 uppercase transition-colors"
                  >
                    Cambiar ({physicalSaleData.paymentMethod.toUpperCase()})
                  </button>
                  <button
                    onClick={() => setShowAssignClientModal(true)}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[10px] font-bold py-2 px-3 uppercase transition-colors"
                  >
                    F5 - Asignar ...
                  </button>
                </div>
              </div>

              {/* Center footer: Reimprimir, Apartar buttons */}
              <div className="col-span-12 sm:col-span-5 lg:col-span-3 flex sm:justify-center gap-2">
                <button
                  onClick={handleReprint}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[10px] font-bold py-2 px-4 uppercase transition-colors"
                >
                  Reimprimir
                </button>
                <button
                  onClick={handleApartarTicket}
                  className="bg-white hover:bg-blue-50 text-[#245878] border border-blue-200 text-[10px] font-bold py-2 px-4 uppercase transition-colors"
                >
                  F10 - Apartar
                </button>
              </div>

              {/* Right footer: big blue total & F12/Ventas buttons */}
              <div className="col-span-12 sm:col-span-7 lg:col-span-4 flex items-center justify-end gap-4">
                <div className="text-right">
                  <span className="text-[#245878] text-3xl sm:text-4xl font-black tracking-tight">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={handlePayTicket}
                    className="bg-[#245878] hover:bg-[#1b4661] text-white text-xs font-bold py-2.5 px-6 uppercase transition-colors"
                  >
                    F12 - Pagar
                  </button>
                  <button
                    onClick={() => {
                      setShowPhysicalSaleModal(false);
                      setCurrentTab('physical');
                      toast({ title: "Ventas registradas", description: "Se ha abierto el listado de ventas fÃ­sicas." });
                    }}
                    className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 text-[10px] font-bold py-1.5 px-3 uppercase transition-colors"
                  >
                    Ventas / Devol...
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Modal para Asignar Detalles de Cliente (F5) */}
          <Dialog open={showAssignClientModal} onOpenChange={setShowAssignClientModal}>
            <DialogContent className="sm:max-w-[450px] bg-white border border-slate-300 shadow-xl rounded-none p-5 z-50">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
                  Asignar Datos del Cliente
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 pt-1">
                  Seleccione un cliente registrado o cree uno nuevo.
                </DialogDescription>
              </DialogHeader>

              {/* Tab Selector for Client Mode */}
              <div className="flex border-b border-slate-100 mb-4 mt-2">
                <button
                  type="button"
                  onClick={() => setAssignClientMode('select')}
                  className={cn(
                    "flex-1 pb-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 text-center",
                    assignClientMode === 'select'
                      ? "border-[#C59B4E] text-[#C59B4E]"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  Seleccionar Existente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAssignClientMode('new');
                    setSelectedContactId('general');
                    setPhysicalSaleData(prev => ({
                      ...prev,
                      customerName: '',
                      customerPhone: '',
                      customerEmail: ''
                    }));
                  }}
                  className={cn(
                    "flex-1 pb-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 text-center",
                    assignClientMode === 'new'
                      ? "border-[#C59B4E] text-[#C59B4E]"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  Crear Nuevo Cliente
                </button>
              </div>

              <div className="space-y-4 py-2">
                {assignClientMode === 'select' ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase">Seleccionar Cliente de Contactos</Label>
                    <Select
                      value={selectedContactId}
                      onValueChange={(val) => {
                        setSelectedContactId(val);
                        const contact = contacts.find(c => String(c.id) === val);
                        if (contact) {
                          setPhysicalSaleData(prev => ({
                            ...prev,
                            customerName: contact.name || contact.nombre || 'Cliente General',
                            customerPhone: contact.phone || '',
                            customerEmail: contact.email || ''
                          }));
                        } else if (val === 'general') {
                          setPhysicalSaleData(prev => ({
                            ...prev,
                            customerName: 'Cliente General',
                            customerPhone: '',
                            customerEmail: ''
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 text-sm border-slate-200 focus:border-[#C59B4E] bg-white">
                        <SelectValue placeholder="Seleccionar de contactos..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border max-h-[200px] overflow-y-auto z-[9999]">
                        <SelectItem value="general">Cliente General (Sin Datos)</SelectItem>
                        {contacts.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name || c.nombre || 'Sin nombre'} {c.phone ? `(${c.phone})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="customerName" className="text-xs font-bold text-slate-700 uppercase">Nombre del Cliente *</Label>
                      <Input
                        id="customerName"
                        value={physicalSaleData.customerName}
                        onChange={(e) => setPhysicalSaleData({ ...physicalSaleData, customerName: e.target.value })}
                        className="h-10 text-sm border-slate-200 focus:border-[#C59B4E]"
                        placeholder="Ej. Juan Pérez"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="customerPhone" className="text-xs font-bold text-slate-700 uppercase">Teléfono</Label>
                        <Input
                          id="customerPhone"
                          placeholder="Ej. +54 9 11..."
                          value={physicalSaleData.customerPhone}
                          onChange={(e) => setPhysicalSaleData({ ...physicalSaleData, customerPhone: e.target.value })}
                          className="h-10 text-sm border-slate-200 focus:border-[#C59B4E]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="customerEmail" className="text-xs font-bold text-slate-700 uppercase">Email</Label>
                        <Input
                          id="customerEmail"
                          placeholder="correo@ejemplo.com"
                          value={physicalSaleData.customerEmail}
                          onChange={(e) => setPhysicalSaleData({ ...physicalSaleData, customerEmail: e.target.value })}
                          className="h-10 text-sm border-slate-200 focus:border-[#C59B4E]"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={saveAsNewContact}
                        onChange={(e) => setSaveAsNewContact(e.target.checked)}
                        className="rounded border-slate-300 text-[#C59B4E] focus:ring-[#C59B4E]"
                      />
                      Guardar en la base de datos de Contactos
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 border-t pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="discountType" className="text-xs font-bold text-slate-700 uppercase">Tipo Descuento</Label>
                    <Select
                      value={physicalSaleData.discountType}
                      onValueChange={(value) => setPhysicalSaleData({ ...physicalSaleData, discountType: value, discountValue: 0 })}
                    >
                      <SelectTrigger className="h-10 text-sm border-slate-200 focus:border-[#C59B4E]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border">
                        <SelectItem value="none">Sin descuento</SelectItem>
                        <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                        <SelectItem value="fixed">Monto fijo ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {physicalSaleData.discountType !== 'none' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="discountValue" className="text-xs font-bold text-slate-700 uppercase">
                        Valor Descuento {physicalSaleData.discountType === 'percentage' ? '(%)' : '($)'}
                      </Label>
                      <Input
                        id="discountValue"
                        type="number"
                        min="0"
                        value={physicalSaleData.discountValue}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setPhysicalSaleData({ ...physicalSaleData, discountValue: val });
                        }}
                        className="h-10 text-sm border-slate-200 focus:border-[#C59B4E]"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-bold text-slate-700 uppercase">Notas internas / Comentarios</Label>
                  <Input
                    id="notes"
                    placeholder="Notas para el despacho o entrega..."
                    value={physicalSaleData.notes}
                    onChange={(e) => setPhysicalSaleData({ ...physicalSaleData, notes: e.target.value })}
                    className="h-10 text-sm border-slate-200 focus:border-[#C59B4E]"
                  />
                </div>
              </div>

              <DialogFooter className="border-t pt-3 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowAssignClientModal(false)}
                  className="h-10 text-xs font-semibold rounded-none hover:bg-slate-50"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    if (assignClientMode === 'new' && saveAsNewContact && physicalSaleData.customerName && physicalSaleData.customerName !== 'Cliente General') {
                      try {
                        const contactData = {
                          name: physicalSaleData.customerName,
                          phone: physicalSaleData.customerPhone || '',
                          email: physicalSaleData.customerEmail || '',
                          agency_id: activeAgencyId || '2',
                          owner_id: activeAgencyId || '2',
                          created_at: new Date().toISOString()
                        };
                        if (isSupabase) {
                          const { data, error } = await (db as any).from('contacts').insert(contactData).select('id').single();
                          if (error) throw error;
                          const savedContact = Array.isArray(data) ? data[0] : data;
                          if (savedContact?.id) setSelectedContactId(String(savedContact.id));
                        } else {
                          const savedContact = await addDoc(collection(db, 'contacts'), contactData);
                          setSelectedContactId(String(savedContact.id));
                        }
                        toast({ title: "Contacto Guardado", description: `${physicalSaleData.customerName} fue agregado a tus contactos.` });
                        fetchContacts();
                      } catch (e) {
                        console.error("Error saving new contact:", e);
                      }
                    }
                    setShowAssignClientModal(false);
                    toast({ title: "Cliente asignado", description: `Se asignó a ${physicalSaleData.customerName || 'Cliente General'} al ticket.` });
                  }}
                  className="h-10 text-xs font-semibold rounded-none bg-[#245878] hover:bg-[#1b4661] text-white"
                >
                  Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal de Pago / Confirmar Venta (F12) */}
          <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
            <DialogContent className="sm:max-w-[700px] bg-white border border-slate-300 shadow-xl rounded-none p-5 z-50">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
                  Confirmación de Pago y Registro
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 pt-1">
                  Resumen de la venta y cálculo de cambio.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                {/* Columna Izquierda: Detalles de Pago */}
                <div className="space-y-4">
                  {/* Sale Totals Box */}
                  <div className="bg-[#F6F5F3] border border-[#D8D5CD] p-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 uppercase font-semibold">Subtotal:</span>
                    <span className="font-bold">{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    {physicalSaleData.discountType !== 'none' && (
                      <div className="flex justify-between text-red-600">
                        <span className="uppercase font-semibold">Descuento ({physicalSaleData.discountType === 'percentage' ? `${physicalSaleData.discountValue}%` : 'Monto Fijo'}):</span>
                        <span className="font-bold">-{formatCurrency(calculateDiscount())}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold border-t pt-2 border-slate-300">
                      <span className="text-slate-800 uppercase">Total a Pagar:</span>
                      <span className="text-[#245878]">{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>

                  {/* Cash payment inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase">Método de Pago</Label>
                      <Select
                        value={physicalSaleData.paymentMethod}
                        onValueChange={(val) => setPhysicalSaleData({ ...physicalSaleData, paymentMethod: val })}
                      >
                        <SelectTrigger className="h-10 text-sm border-slate-200 focus:border-[#C59B4E]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border">
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="tarjeta">Tarjeta</SelectItem>
                          <SelectItem value="transferencia">Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {physicalSaleData.paymentMethod === 'efectivo' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700 uppercase">Efectivo Recibido</Label>
                        <Input
                          type="text"
                          value={pagoCon}
                          onChange={(e) => {
                            const cleanVal = e.target.value.replace(/[^0-9.]/g, '');
                            setPagoCon(cleanVal);
                          }}
                          className="h-10 rounded-none text-sm border-slate-300 text-right font-bold text-[#245878] focus:border-[#2c86b7]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Change calculation */}
                  {physicalSaleData.paymentMethod === 'efectivo' && (
                    <div className={cn("border p-3 flex justify-between items-center text-xs", (parseFloat(pagoCon) || 0) >= calculateTotal() ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200")}>
                      <span className="font-bold text-green-800 uppercase">Cambio a entregar:</span>
                      <span className={cn("text-lg font-black", (parseFloat(pagoCon) || 0) >= calculateTotal() ? "text-emerald-700" : "text-red-700")}>
                        {(parseFloat(pagoCon) || 0) >= calculateTotal()
                          ? formatCurrency((parseFloat(pagoCon) || 0) - calculateTotal())
                          : `Faltan ${formatCurrency(calculateTotal() - (parseFloat(pagoCon) || 0))}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Columna Derecha: Configuración de Facturación */}
                <div className="space-y-4">
                  {/* Línea de Facturación */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase">Línea de Facturación</Label>
                    <Select
                      value={selectedBillingLineId}
                      onValueChange={(val) => {
                        setSelectedBillingLineId(val);
                        const selectedLine = billingLines.find(l => l.id === val);
                        if (selectedLine?.type === 'factura_electronica') {
                          setBillingData(prev => ({
                            ...prev,
                            rfc: 'XAXX010101000',
                            nombre: 'PUBLICO EN GENERAL',
                            cp: '26015',
                            regimen: '616',
                            usoCfdi: 'S01'
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 text-sm border-slate-200 focus:border-[#C59B4E] bg-white">
                        <SelectValue placeholder="Seleccionar línea..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border z-50">
                        <SelectItem value="none">Ninguno (No Facturar)</SelectItem>
                        {billingLines.map(line => (
                          <SelectItem key={line.id} value={line.id}>
                            {line.name} ({line.type === 'factura_electronica' ? 'Factura Electrónica' : 'No Facturar'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Datos Fiscales del Cliente */}
                  {billingLines.find(l => l.id === selectedBillingLineId)?.type === 'factura_electronica' && (
                    <div className="border p-4 rounded bg-slate-50 space-y-3 text-left">
                      <h4 className="text-xs font-bold text-slate-800 uppercase border-b pb-1">Datos Fiscales del Cliente</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-600 uppercase">RFC Receptor</Label>
                          <Input
                            value={billingData.rfc}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setBillingData(prev => {
                                const updated = { ...prev, rfc: val };
                                if (val === 'XAXX010101000') {
                                  updated.usoCfdi = 'S01';
                                  updated.regimen = '616';
                                } else {
                                  updated.usoCfdi = 'G03';
                                  updated.regimen = val.length === 12 ? '601' : '612';
                                }
                                return updated;
                              });
                            }}
                            placeholder="XAXX010101000"
                            className="h-9 text-xs bg-white border-slate-200"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-600 uppercase">Razón Social</Label>
                          <Input
                            value={billingData.nombre}
                            onChange={(e) => setBillingData({ ...billingData, nombre: e.target.value.toUpperCase() })}
                            placeholder="PUBLICO EN GENERAL"
                            className="h-9 text-xs bg-white border-slate-200"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-600 uppercase">Código Postal</Label>
                          <Input
                            value={billingData.cp}
                            onChange={(e) => setBillingData({ ...billingData, cp: e.target.value })}
                            placeholder="26015"
                            className="h-9 text-xs bg-white border-slate-200"
                          />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-[10px] font-bold text-slate-600 uppercase">Régimen Fiscal</Label>
                          <Select
                            value={billingData.regimen}
                            onValueChange={(val) => setBillingData({ ...billingData, regimen: val })}
                          >
                            <SelectTrigger className="h-9 text-xs border-slate-200 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border text-xs z-50">
                              <SelectItem value="616">616 - Sin obligaciones</SelectItem>
                              <SelectItem value="601">601 - General Personas Morales</SelectItem>
                              <SelectItem value="612">612 - Personas Físicas Actividades Emp.</SelectItem>
                              <SelectItem value="626">626 - RESICO</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-600 uppercase">Uso de CFDI</Label>
                        <Select
                          value={billingData.usoCfdi}
                          onValueChange={(val) => setBillingData({ ...billingData, usoCfdi: val })}
                        >
                          <SelectTrigger className="h-9 text-xs border-slate-200 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border text-xs z-50">
                            <SelectItem value="S01">S01 - Sin efectos fiscales</SelectItem>
                            <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                            <SelectItem value="G01">G01 - Adquisición de mercancías</SelectItem>
                            <SelectItem value="CP01">CP01 - Pagos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="border-t pt-3 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={savingPhysicalSale}
                  className="h-10 text-xs font-semibold rounded-none hover:bg-slate-50"
                >
                  AtrÃ¡s
                </Button>
                <Button
                  onClick={async () => {
                    const saved = await handleSavePhysicalSale();
                    if (saved) setShowPaymentModal(false);
                  }}
                  disabled={savingPhysicalSale || selectedProducts.length === 0 || (physicalSaleData.paymentMethod === 'efectivo' && (parseFloat(pagoCon) || 0) < calculateTotal())}
                  className="h-10 text-xs font-semibold rounded-none bg-[#245878] hover:bg-[#1b4661] text-white flex items-center gap-1.5 px-5"
                >
                  {savingPhysicalSale ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Registrar Venta
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal de ArtÃ­culo ComÃºn (CTRL+P) */}
          <Dialog open={showCommonProductModal} onOpenChange={setShowCommonProductModal}>
            <DialogContent className="sm:max-w-[400px] bg-white border border-slate-300 shadow-xl rounded-none p-5 z-50">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
                  Agregar ArtÃ­culo ComÃºn
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 pt-1">
                  Agrega un producto rÃ¡pido no registrado en el inventario.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="commonName" className="text-xs font-bold text-slate-700 uppercase">Nombre / DescripciÃ³n</Label>
                  <Input
                    id="commonName"
                    value={commonProductData.name}
                    onChange={(e) => setCommonProductData({ ...commonProductData, name: e.target.value })}
                    className="h-10 text-sm border-slate-200 focus:border-[#C59B4E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="commonPrice" className="text-xs font-bold text-slate-700 uppercase">Precio Unitario ($)</Label>
                    <Input
                      id="commonPrice"
                      type="text"
                      placeholder="0.00"
                      value={commonProductData.price}
                      onChange={(e) => {
                        const cleanVal = e.target.value.replace(/[^0-9.]/g, '');
                        setCommonProductData({ ...commonProductData, price: cleanVal });
                      }}
                      className="h-10 text-sm border-slate-200 focus:border-[#C59B4E]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="commonQty" className="text-xs font-bold text-slate-700 uppercase">Cantidad</Label>
                    <Input
                      id="commonQty"
                      type="number"
                      min="1"
                      value={commonProductData.quantity}
                      onChange={(e) => setCommonProductData({ ...commonProductData, quantity: e.target.value })}
                      className="h-10 text-sm border-slate-200 focus:border-[#C59B4E]"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t pt-3 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowCommonProductModal(false)}
                  className="h-10 text-xs font-semibold rounded-none hover:bg-slate-50"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddGenericProduct}
                  className="h-10 text-xs font-semibold rounded-none bg-[#245878] hover:bg-[#1b4661] text-white"
                >
                  Agregar al Ticket
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal de Entradas / Salidas de Caja (F7 / F8) */}
          <Dialog open={showCashRegisterModal} onOpenChange={setShowCashRegisterModal}>
            <DialogContent className="sm:max-w-[450px] bg-white border border-slate-300 shadow-xl rounded-none p-5 z-50">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
                  {cashRegisterType === 'entrada' ? 'Registrar Entrada de Efectivo' : 'Registrar Salida de Efectivo'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 pt-1">
                  Registra movimientos de efectivo en la caja registradora.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div className="col-span-1 space-y-1.5">
                    <Label htmlFor="cashAmount" className="text-xs font-bold text-slate-700 uppercase">Monto ($) *</Label>
                    <Input
                      id="cashAmount"
                      placeholder="0.00"
                      value={cashRegisterData.amount}
                      onChange={(e) => {
                        const cleanVal = e.target.value.replace(/[^0-9.]/g, '');
                        setCashRegisterData({ ...cashRegisterData, amount: cleanVal });
                      }}
                      className="h-10 text-sm border-slate-200 focus:border-[#C59B4E]"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="cashConcept" className="text-xs font-bold text-slate-700 uppercase">Motivo / Concepto *</Label>
                    <Input
                      id="cashConcept"
                      placeholder="Ej. Cambio inicial, pago de envÃ­o, etc."
                      value={cashRegisterData.concept}
                      onChange={(e) => setCashRegisterData({ ...cashRegisterData, concept: e.target.value })}
                      className="h-10 text-sm border-slate-200 focus:border-[#C59B4E]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    onClick={handleSaveCashTransaction}
                    className="h-9 text-xs font-bold rounded-none bg-[#245878] hover:bg-[#1b4661] text-white"
                  >
                    Guardar Registro
                  </Button>
                </div>

                {/* Ledger History List */}
                <div className="border-t pt-3 mt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Historial de Caja Reciente</h4>
                  <div className="max-h-[160px] overflow-y-auto pos-scrollbar space-y-1.5 pr-1">
                    {(() => {
                      const txs = JSON.parse(localStorage.getItem('pos_cash_transactions') || '[]');
                      if (txs.length === 0) {
                        return <div className="text-center py-6 text-neutral-400 text-xs italic">No hay transacciones registradas hoy.</div>;
                      }

                      let totalIn = 0;
                      let totalOut = 0;
                      txs.forEach((t: any) => {
                        if (t.type === 'entrada') totalIn += t.amount;
                        else totalOut += t.amount;
                      });

                      return (
                        <>
                          <div className="space-y-1">
                            {txs.map((tx: any) => (
                              <div key={tx.id} className="flex justify-between items-center text-xs p-2 bg-[#F6F5F3] border rounded">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    tx.type === 'entrada' ? "bg-green-500" : "bg-red-500"
                                  )} />
                                  <span className="font-semibold text-neutral-700 truncate max-w-[200px]">{tx.concept}</span>
                                </div>
                                <span className={cn(
                                  "font-bold",
                                  tx.type === 'entrada' ? "text-green-600" : "text-red-600"
                                )}>
                                  {tx.type === 'entrada' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="bg-[#EAE8E2] p-2 mt-2 border text-xs font-bold flex justify-between">
                            <span>Balance Neto en Caja:</span>
                            <span className="text-slate-900">{formatCurrency(totalIn - totalOut)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t pt-3 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowCashRegisterModal(false)}
                  className="h-10 text-xs font-semibold rounded-none hover:bg-slate-50"
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal de Tickets Apartados (F10) */}
          <Dialog open={showHeldTicketsModal} onOpenChange={setShowHeldTicketsModal}>
            <DialogContent className="sm:max-w-[500px] bg-white border border-slate-300 shadow-xl rounded-none p-5 z-50">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
                  Tickets de Venta Apartados
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 pt-1">
                  Listado de tickets guardados pendientes por procesar o facturar.
                </DialogDescription>
              </DialogHeader>

              <div className="py-3 max-h-[300px] overflow-y-auto pos-scrollbar space-y-2 pr-1">
                {(() => {
                  const heldTickets = JSON.parse(localStorage.getItem('pos_held_tickets') || '[]');
                  if (heldTickets.length === 0) {
                    return (
                      <div className="text-center py-12 text-neutral-400 text-xs italic">
                        No hay ningÃºn ticket de venta apartado en la lista.
                      </div>
                    );
                  }

                  return heldTickets.map((held: any) => (
                    <div key={held.id} className="border border-slate-200 bg-slate-50 p-3 shadow-sm hover:border-[#397da8] transition-colors">
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <span className="font-bold text-sm text-neutral-800">{held.customerName || 'Cliente General'}</span>
                          <div className="text-[10px] text-slate-400">
                            Guardado: {new Date(held.createdAt).toLocaleDateString()} {new Date(held.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                        <span className="text-[#0066FF] font-black text-sm">
                          {formatCurrency(held.total)}
                        </span>
                      </div>

                      <div className="text-[10px] text-neutral-600 mb-3 border-t pt-1.5 line-clamp-2">
                        {held.items?.map((item: any) => `${item.name} (x${item.quantity})`).join(', ')}
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDeleteHeldTicket(held.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold py-1 px-3 rounded uppercase border border-red-200"
                        >
                          Eliminar
                        </button>
                        <button
                          onClick={() => handleRetrieveHeldTicket(held)}
                          className="bg-[#0B4B32] hover:bg-[#073623] text-white text-[10px] font-bold py-1 px-3 rounded uppercase"
                        >
                          Recuperar al Ticket
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <DialogFooter className="border-t pt-3 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowHeldTicketsModal(false)}
                  className="h-10 text-xs font-semibold rounded-none hover:bg-slate-50"
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ), document.body)}

    </Card>
  );
}; // End of OrdersList component

