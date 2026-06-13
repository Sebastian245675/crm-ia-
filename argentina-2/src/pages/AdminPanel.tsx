import React, { useEffect, useState, useRef, lazy, Suspense, useMemo, useCallback } from 'react';
import {
  auth,
  db,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  Settings,
  BarChart3,
  DollarSign,
  AlertCircle,
  Home,
  Bell,
  Tag,
  BrainCog,
  Sparkles,
  MessagesSquare,
  Check,
  ArrowUp,
  RefreshCw,
  User,
  LogOut,
  Send,
  Lightbulb,
  ShoppingBag,
  PenTool,
  LineChart,
  ChartBar,
  HelpCircle,
  Book,
  ClipboardList,
  Video,
  Download,
  FileQuestion,
  Info,
  Search,
  Star,
  HeartHandshake,
  Mail,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Megaphone,
  Calendar,
  Pencil,
  MoreVertical,
  Zap,
  LayoutGrid,
  X,
  Copy,
  Trash2,
  Edit,
  UserX
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CustomClock } from '@/components/ui/CustomClock';
import { useNavigate } from 'react-router-dom';
const ProductFormWithWizard = lazy(() => import('@/components/admin/ProductFormWizard').then(m => ({ default: m.ProductFormWithWizard })));
const ProductForm = lazy(() => import('@/components/admin/ProductForm').then(m => ({ default: m.ProductForm })));
const OrdersList = lazy(() => import('@/components/admin/OrdersList').then(m => ({ default: m.OrdersList })));
const CategoryManager = lazy(() => import('@/components/admin/CategoryManager').then(m => ({ default: m.CategoryManager })));
const RevisionList = lazy(() => import('@/components/admin/RevisionList').then(m => ({ default: m.RevisionList })));
const ProductAnalyticsView = lazy(() => import('@/components/admin/ProductAnalytics').then(m => ({ default: m.ProductAnalyticsView })));
const InfoManager = lazy(() => import('@/components/admin/InfoManager'));
const EmployeeManager = lazy(() => import('@/components/admin/EmployeeManager').then(m => ({ default: m.default || m })));
const CompanyConfiguration = lazy(() => import('@/components/admin/CompanyConfiguration').then(m => ({ default: m.CompanyConfiguration })));
const ConfigurationPanel = lazy(() => import('@/components/admin/ConfigurationPanel').then(m => ({ default: m.ConfigurationPanel })));
const ContactsManager = lazy(() => import('@/components/admin/ContactsManager').then(m => ({ default: m.ContactsManager })));
const FilterManager = lazy(() => import('@/components/admin/FilterManager').then(m => ({ default: m.FilterManager })));
const CommentsManager = lazy(() => import('@/components/admin/CommentsManager').then(m => ({ default: m.CommentsManager })));
const MessagingManager = lazy(() => import('@/components/admin/MessagingManager').then(m => ({ default: m.MessagingManager })));
const WppConfiguration = lazy(() => import('@/components/admin/WppConfiguration'));
const MailConfiguration = lazy(() => import('@/components/admin/MailConfiguration'));
const AiAgentsDashboard = lazy(() => import('@/components/admin/AiAgentsDashboard').then(m => ({ default: m.AiAgentsDashboard })));
const FunnelsManager = lazy(() => import('@/components/admin/FunnelsManager').then(m => ({ default: m.FunnelsManager })));
const SitiosManager = lazy(() => import('@/components/admin/SitiosManager').then(m => ({ default: m.SitiosManager })));
const SeoManager = lazy(() => import('@/components/admin/SeoManager').then(m => ({ default: m.SeoManager })));
const WebsiteManager = lazy(() => import('@/components/admin/WebsiteManager').then(m => ({ default: m.WebsiteManager })));
const PaymentGatewayManager = lazy(() => import('@/components/admin/PaymentGatewayManager').then(m => ({ default: m.PaymentGatewayManager })));
const CalendarDashboard = lazy(() => import('@/components/admin/CalendarDashboard').then(m => ({ default: m.CalendarDashboard })));
const MarketingManager = lazy(() => import('@/components/admin/MarketingManager').then(m => ({ default: m.MarketingManager })));
const MediaLibrary = lazy(() => import('@/components/admin/MediaLibrary').then(m => ({ default: m.MediaLibrary })));
const OpportunitiesKanban = lazy(() => import('@/components/admin/OpportunitiesKanban').then(m => ({ default: m.OpportunitiesKanban })));
const ModalitiesManager = lazy(() => import('@/components/admin/ModalitiesManager').then(m => ({ default: m.ModalitiesManager })));



// (ya importado arriba)
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Sidebar from '@/components/admin/Sidebar';
import AdminLayout from '@/components/admin/AdminLayout';
import { Briefcase, Share2 } from 'lucide-react';
import { useSubAccountRenderFix } from '@/hooks/use-subaccount-render-fix';
import { useStockNotifications } from '@/hooks/use-stock-notifications';
import { DashboardStats } from '@/components/admin/DashboardStats';

const createUserWithEmailAndPassword = async (...args: any[]) => ({ user: { uid: 'mock-uid' } }) as any;
const Timestamp = {
  now: () => new Date(),
  fromDate: (date: Date) => date
} as any;
const serverTimestamp = () => new Date();

// Componente de carga para lazy components
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></div>
  </div>
);

export const AdminPanel: React.FC = () => {
  const isSupabase = typeof (db as any)?.from === 'function';
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubAdmin, setIsSubAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = async () => {
    const confirmed = window.confirm('¿Cerrar sesión?');
    if (!confirmed) return;
    setShowUserMenu(false);
    try {
      await logout();
    } finally {
      window.location.href = '/';
    }
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState<any[]>([]);
  const [subName, setSubName] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subPassword, setSubPassword] = useState('');
  const [subPermissions, setSubPermissions] = useState<Record<string, boolean>>({
    manageProducts: false,
    manageOrders: false,
    manageContacts: false,
    manageUsers: false,
    viewAnalytics: false,
    manageSettings: false,
  });
  const [subLoading, setSubLoading] = useState(false);
  const [subAccounts, setSubAccounts] = useState<any[]>([]);
  const [subAccountsLoading, setSubAccountsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreateSubForm, setShowCreateSubForm] = useState(false);
  const [subAccountSearch, setSubAccountSearch] = useState('');
  const [subAccountRoleFilter, setSubAccountRoleFilter] = useState<string>('all');
  const [products, setProducts] = useState<any[]>([]);
  const [sessionTime, setSessionTime] = useState<string>("00:00:00");
  const [sessionStart, setSessionStart] = useState<Date>(new Date());
  const [todaySales, setTodaySales] = useState<number>(0);
  const [todaySalesLoading, setTodaySalesLoading] = useState<boolean>(true);
  const [monthlySales, setMonthlySales] = useState<number>(0);
  const [monthlySalesLoading, setMonthlySalesLoading] = useState<boolean>(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPlanIADialog, setShowPlanIADialog] = useState(false);
  const [showAnunciosDialog, setShowAnunciosDialog] = useState(false);
  const [activeNotificationTab, setActiveNotificationTab] = useState<'sistema' | 'alertas'>('sistema');
  const [systemNotifications, setSystemNotifications] = useState<any[]>([
    {
      id: 'sys-1',
      title: 'Conexión con base de datos exitosa',
      message: 'Se ha establecido la conexión con Supabase de forma correcta.',
      timestamp: new Date(Date.now() - 5 * 60000),
      read: false,
      type: 'success'
    },
    {
      id: 'sys-2',
      title: 'Respaldo de datos diario',
      message: 'El backup diario de base de datos se ha completado exitosamente.',
      timestamp: new Date(Date.now() - 2 * 3600000),
      read: false,
      type: 'info'
    },
    {
      id: 'sys-3',
      title: 'Actualización del sistema',
      message: 'Se aplicaron parches de seguridad a la API del servidor.',
      timestamp: new Date(Date.now() - 24 * 3600000),
      read: true,
      type: 'info'
    }
  ]);
  const [aiAssistantInput, setAiAssistantInput] = useState('');
  const [aiAssistantMessages, setAiAssistantMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: '¡Hola! Soy tu asistente IA. ¿En qué puedo ayudarte hoy con tu tienda?' }
  ]);
  const [aiTyping, setAiTyping] = useState(false);
  const [aiTypedText, setAiTypedText] = useState('');
  const aiTypingRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [dateRange] = useState("2025-12-28 → 2026-01-27");

  // Caché para evitar recalcular ventas mensuales en la misma sesión
  const monthlySalesCacheRef = useRef<{ month: number; year: number; value: number } | null>(null);

  // Implementar el hook para prevenir problemas de pantalla blanca en subcuentas
  const { hasRenderIssues, manualRefresh } = useSubAccountRenderFix(user?.subCuenta === "si");

  // Hook para notificaciones de stock
  const {
    notifications: stockNotifications,
    unreadCount: stockUnreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification
  } = useStockNotifications();

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (aiTypingRef.current) {
        clearTimeout(aiTypingRef.current);
      }
    };
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    if (!showUserMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleAiAssistantSend = useCallback(() => {
    const msg = aiAssistantInput.trim();
    if (!msg || aiTyping) return;
    const RESPONSE = 'Sube tu plan actual para vivir la máxima experiencia IA.';
    setAiAssistantMessages(prev => [...prev, { role: 'user', content: msg }]);
    setAiAssistantInput('');
    setAiTyping(true);
    setAiTypedText('');
    setTimeout(() => {
      let i = 0;
      const addChar = () => {
        if (i < RESPONSE.length) {
          setAiTypedText(RESPONSE.slice(0, i + 1));
          i++;
          aiTypingRef.current = setTimeout(addChar, 35);
        } else {
          setAiAssistantMessages(prev => [...prev, { role: 'assistant', content: RESPONSE }]);
          setAiTypedText('');
          setAiTyping(false);
        }
      };
      addChar();
    }, 600);
  }, [aiAssistantInput, aiTyping]);

  // Manejar mouse leave con delay para evitar cierres accidentales
  const handleMouseLeave = () => {
    if (mouseLeaveTimeoutRef.current) {
      clearTimeout(mouseLeaveTimeoutRef.current);
    }
    mouseLeaveTimeoutRef.current = setTimeout(() => {
      setShowNotifications(false);
    }, 200); // 200ms de delay
  };

  const handleMouseEnter = () => {
    if (mouseLeaveTimeoutRef.current) {
      clearTimeout(mouseLeaveTimeoutRef.current);
      mouseLeaveTimeoutRef.current = null;
    }
    setShowNotifications(true);
  };

  // Función para formatear el tiempo de notificaciones
  const formatNotificationTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Hace unos momentos';
    if (minutes < 60) return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    if (days < 7) return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  useEffect(() => {
    if (isSupabase) {
      const isUserAdmin = user?.email?.toLowerCase() === "admin@gmail.com" ||
        user?.email?.toLowerCase() === "admin@tienda.com";
      setIsAdmin(isUserAdmin);
      setIsSubAdmin(user?.subCuenta === "si");

      if (user?.subCuenta === "si") {
        document.documentElement.classList.add('notranslate');
        document.body.setAttribute('translate', 'no');
      }

      setSessionStart(new Date());

      // Si no es admin ni subadmin, y ya terminó de cargar, redirigir
      if (!isUserAdmin && user?.subCuenta !== "si") {
        // Solo redirigir si el usuario existe pero no tiene permisos
        if (user) {
          navigate('/');
        }
      }

      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          const userData = userDoc.data();
          const lowEmail = firebaseUser.email?.toLowerCase();
          if (lowEmail === "admin@gmail.com" || lowEmail === "admin@tienda.com") {
            setIsAdmin(true);
            setIsSubAdmin(false);
          } else if (userData?.subCuenta === "si") {
            setIsAdmin(false);
            setIsSubAdmin(true);

            // Prevenir traducción automática que causa pantallas blancas
            document.documentElement.classList.add('notranslate');
            document.body.setAttribute('translate', 'no');

            // Forzar refresh del layout para prevenir problemas de renderizado
            setTimeout(() => {
              const layoutElements = document.querySelectorAll('.admin-layout, .content-container, table');
              layoutElements.forEach(el => {
                if (el instanceof HTMLElement) {
                  const currentDisplay = el.style.display;
                  el.style.display = 'none';
                  setTimeout(() => { el.style.display = currentDisplay; }, 5);
                }
              });
            }, 500);
          } else {
            setIsAdmin(false);
            setIsSubAdmin(false);
          }
          setSessionStart(new Date());
        } catch (error) {
          console.error("Error al verificar permisos de usuario:", error);
          setIsAdmin(false);
          setIsSubAdmin(false);
        } finally {
          setLoading(false);
        }
      } else {
        setIsAdmin(false);
        setIsSubAdmin(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [isSupabase, user]);

  // Efecto para controlar el tiempo de sesión
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - sessionStart.getTime();

      // Calcular horas, minutos y segundos
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      // Formatear el tiempo en formato HH:MM:SS
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const formattedSeconds = seconds.toString().padStart(2, '0');

      setSessionTime(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [sessionStart]);

  const fetchOrdersForPanel = useCallback(async () => {
    try {
      if (isSupabase) {
        const { data, error } = await db
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);
        if (error) throw error;
        setOrders(data || []);
        return;
      }
      const ordersQuery = query(
        collection(db, "orders"),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(ordersQuery);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(docs);
    } catch (error) {
      try {
        const pedidosQuery = query(
          collection(db, "pedidos"),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(pedidosQuery);
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(docs);
      } catch {
        const querySnapshot = await getDocs(collection(db, "pedidos"));
        setOrders(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    }
  }, [isSupabase]);

  useEffect(() => {
    if (activeTab !== 'orders' && activeTab !== 'dashboard') return;
    fetchOrdersForPanel();
  }, [activeTab, fetchOrdersForPanel]);

  // Cargar productos solo cuando se necesita
  useEffect(() => {
    // Solo cargar si estamos en el tab de productos
    if (activeTab !== 'products') {
      return;
    }

    const fetchProducts = async () => {
      try {
        if (isSupabase) {
          const { data, error } = await db
            .from('products')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000); // Aumentar límite para mejorar visibilidad de productos antiguos
          if (error) throw error;
          setProducts((data || []).map(p => ({ ...p, id: p.id })));
          return;
        }
        // Cargar todos los productos ordenados por fecha de creación
        const productsQuery = query(
          collection(db, "products"),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(productsQuery);
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(docs);
      } catch {
        // Fallback Firestore: cargar sin límite en caso de que falle el ordenamiento
        const querySnapshot = await getDocs(collection(db, "products"));
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(docs);
      }
    };
    fetchProducts();
  }, [activeTab]);

  // OPTIMIZACIÓN: Calcular ventas con debouncing y caché de fecha
  const todayDateRef = useRef<string>('');

  useEffect(() => {
    const calculateTodaySales = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayKey = today.toISOString();

      // Si ya calculamos para hoy, no recalcular a menos que cambie el día
      if (todayDateRef.current === todayKey && todaySales > 0) {
        return;
      }

      todayDateRef.current = todayKey;
      setTodaySalesLoading(true);

      try {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let salesTotal = 0;

        try {
          if (isSupabase) {
            const { data, error } = await db
              .from('orders')
              .select('*')
              .gte('created_at', today.toISOString())
              .lt('created_at', tomorrow.toISOString())
              .eq('status', 'confirmed');
            if (error) throw error;
            data?.forEach(o => { salesTotal += Number((o as any).total || 0); });
          } else {
            // Optimización: Consulta con filtros en Firebase y límite
            const todayOrdersQuery = query(
              collection(db, "orders"),
              where("status", "==", "confirmed"),
              where("createdAt", ">=", Timestamp.fromDate(today)),
              where("createdAt", "<", Timestamp.fromDate(tomorrow))
            );
            const ordersSnapshot = await getDocs(todayOrdersQuery);
            ordersSnapshot.docs.forEach(doc => {
              const data = doc.data();
              salesTotal += Number(data.total || 0);
            });
          }
        } catch (queryError: any) {
          console.warn("Falling back to client-side filter for daily sales:", queryError);
          if (isSupabase) {
            const { data } = await db.from('orders').select('*');
            data?.forEach((o: any) => {
              const orderDate = o.created_at ? new Date(o.created_at) : null;
              if (!orderDate) return;
              const orderDay = new Date(orderDate);
              orderDay.setHours(0, 0, 0, 0);
              if (orderDay.getTime() === today.getTime() && o.status === "confirmed") {
                salesTotal += Number(o.total || 0);
              }
            });
          } else {
            const ordersSnapshot = await getDocs(collection(db, "orders"));
            ordersSnapshot.docs.forEach(doc => {
              const data = doc.data();
              const orderDate = data.createdAt?.toDate ?
                data.createdAt.toDate() :
                data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : null;

              if (orderDate) {
                const orderDay = new Date(orderDate);
                orderDay.setHours(0, 0, 0, 0);
                if (orderDay.getTime() === today.getTime() && data.status === "confirmed") {
                  salesTotal += Number(data.total || 0);
                }
              }
            });
          }
        }

        setTodaySales(salesTotal);
      } catch (error) {
        console.error("Error al calcular ventas del día:", error);
      } finally {
        setTodaySalesLoading(false);
      }
    };

    // Solo calcular si estamos en dashboard
    if (activeTab === 'dashboard') {
      // Debouncing: esperar 500ms antes de calcular
      const timeoutId = setTimeout(calculateTodaySales, 500);
      return () => clearTimeout(timeoutId);
    } else {
      // Limpiar datos si no estamos en dashboard para ahorrar memoria
      setTodaySales(0);
      setTodaySalesLoading(false);
    }
  }, [activeTab]); // No incluir todaySales para evitar loops

  // Escuchar eventos de actualización del dashboard (siempre activo para ventas físicas)
  useEffect(() => {
    const handleDashboardUpdate = (event: CustomEvent) => {
      if (event.detail?.type === 'orderConfirmed') {
        const orderTotal = Number(event.detail.orderTotal);

        setTodaySales(prev => {
          const nuevo = prev + orderTotal;
          setTimeout(() => {
            const el = document.querySelector('.dashboard-today-sales');
            if (el) el.textContent = `$${nuevo.toLocaleString()}`;
          }, 50);
          return nuevo;
        });

        setMonthlySales(prev => {
          const nuevo = prev + orderTotal;
          setTimeout(() => {
            const el = document.querySelector('.dashboard-monthly-sales');
            if (el) el.textContent = `$${nuevo.toLocaleString()}`;
          }, 50);
          return nuevo;
        });

        toast({
          title: "Venta registrada",
          description: `Las estadísticas han sido actualizadas. Venta: $${orderTotal.toLocaleString()}`,
        });
      }
    };

    document.addEventListener('dashboardUpdate', handleDashboardUpdate as EventListener);
    return () => document.removeEventListener('dashboardUpdate', handleDashboardUpdate as EventListener);
  }, []);

  // Efecto para calcular los ingresos mensuales (optimizado)
  useEffect(() => {
    // Solo calcular si estamos en dashboard
    if (activeTab !== 'dashboard') {
      return;
    }

    const calculateMonthlySales = async () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Si ya tenemos el cálculo para este mes en caché, usarlo
      if (monthlySalesCacheRef.current &&
        monthlySalesCacheRef.current.month === currentMonth &&
        monthlySalesCacheRef.current.year === currentYear) {
        setMonthlySales(monthlySalesCacheRef.current.value);
        setMonthlySalesLoading(false);
        return;
      }

      setMonthlySalesLoading(true);
      try {
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        firstDayOfMonth.setHours(0, 0, 0, 0);

        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        lastDayOfMonth.setHours(23, 59, 59, 999);

        // Para el mes anterior
        const firstDayOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
        firstDayOfLastMonth.setHours(0, 0, 0, 0);

        const lastDayOfLastMonth = new Date(currentYear, currentMonth, 0);
        lastDayOfLastMonth.setHours(23, 59, 59, 999);

        let monthlySalesTotal = 0;
        let lastMonthSalesTotal = 0;

        try {
          if (isSupabase) {
            const { data: monthData, error: monthErr } = await db
              .from('orders')
              .select('*')
              .gte('created_at', firstDayOfMonth.toISOString())
              .lte('created_at', lastDayOfMonth.toISOString())
              .eq('status', 'confirmed');
            if (monthErr) throw monthErr;
            monthData?.forEach(o => { monthlySalesTotal += Number((o as any).total || 0); });

            const { data: lastMonthData, error: lastMonthErr } = await db
              .from('orders')
              .select('*')
              .gte('created_at', firstDayOfLastMonth.toISOString())
              .lte('created_at', lastDayOfLastMonth.toISOString())
              .eq('status', 'confirmed');
            if (lastMonthErr) throw lastMonthErr;
            lastMonthData?.forEach(o => { lastMonthSalesTotal += Number((o as any).total || 0); });
          } else {
            // Optimización: Consulta con filtros en Firebase para mes actual
            const monthlyOrdersQuery = query(
              collection(db, "orders"),
              where("status", "==", "confirmed"),
              where("createdAt", ">=", Timestamp.fromDate(firstDayOfMonth)),
              where("createdAt", "<=", Timestamp.fromDate(lastDayOfMonth))
            );
            const monthlySnapshot = await getDocs(monthlyOrdersQuery);
            monthlySnapshot.docs.forEach(doc => {
              const data = doc.data();
              monthlySalesTotal += Number(data.total || 0);
            });

            // Consulta para mes anterior
            const lastMonthOrdersQuery = query(
              collection(db, "orders"),
              where("status", "==", "confirmed"),
              where("createdAt", ">=", Timestamp.fromDate(firstDayOfLastMonth)),
              where("createdAt", "<=", Timestamp.fromDate(lastDayOfLastMonth))
            );
            const lastMonthSnapshot = await getDocs(lastMonthOrdersQuery);
            lastMonthSnapshot.docs.forEach(doc => {
              const data = doc.data();
              lastMonthSalesTotal += Number(data.total || 0);
            });
          }
        } catch (queryError: any) {
          console.warn("Falling back to client-side filter for monthly sales:", queryError);
          if (isSupabase) {
            const { data } = await db.from('orders').select('*');
            data?.forEach((o: any) => {
              if (o.status === 'confirmed') {
                const date = new Date(o.created_at);
                if (date >= firstDayOfMonth && date <= lastDayOfMonth) monthlySalesTotal += Number(o.total || 0);
                if (date >= firstDayOfLastMonth && date <= lastDayOfLastMonth) lastMonthSalesTotal += Number(o.total || 0);
              }
            });
          } else {
            const ordersSnapshot = await getDocs(collection(db, "orders"));
            ordersSnapshot.docs.forEach(doc => {
              const data = doc.data();
              const orderDate = data.createdAt?.toDate ?
                data.createdAt.toDate() :
                data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : null;

              if (orderDate) {
                // Si la fecha del pedido está dentro del mes actual
                if (data.status === "confirmed" && orderDate >= firstDayOfMonth && orderDate <= lastDayOfMonth) {
                  monthlySalesTotal += Number(data.total || 0);
                }

                // Si la fecha del pedido está dentro del mes anterior
                if (data.status === "confirmed" && orderDate >= firstDayOfLastMonth && orderDate <= lastDayOfLastMonth) {
                  lastMonthSalesTotal += Number(data.total || 0);
                }
              }
            });
          }
        }

        // Guardar en caché
        monthlySalesCacheRef.current = {
          month: currentMonth,
          year: currentYear,
          value: monthlySalesTotal
        };

        setMonthlySales(monthlySalesTotal);
      } catch (error) {
        console.error("Error al calcular ingresos mensuales:", error);
      } finally {
        setMonthlySalesLoading(false);
      }
    };

    if (activeTab === 'dashboard') {
      calculateMonthlySales();
    } else {
      // Limpiar datos si no estamos en dashboard para ahorrar memoria
      setMonthlySales(0);
      setMonthlySalesLoading(false);
    }
  }, [activeTab]);

  const handleCreateSubAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubLoading(true);
    try {
      if (isSupabase) {
        // Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await (db as any).auth.signUp({
          email: subEmail,
          password: subPassword,
          options: {
            data: {
              name: subName,
              sub_cuenta: 'si',
              permissions: subPermissions
            }
          }
        });

        if (authError) throw authError;

        // Crear registro en tabla users
        const { error: dbError } = await (db as any)
          .from('users')
          .insert({
            id: authData.user?.id,
            name: subName,
            email: subEmail,
            sub_cuenta: 'si',
            is_admin: false,
            department_number: '',
            phone: '',
            address: '',
            permissions: subPermissions
          });

        if (dbError) throw dbError;

        toast({
          title: "Subcuenta creada",
          description: "El sub-administrador fue creado exitosamente.",
        });
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, subEmail, subPassword);
        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          name: subName,
          email: subEmail,
          subCuenta: "si",
          permissions: subPermissions
        });
        toast({
          title: "Subcuenta creada",
          description: "El sub-administrador fue creado exitosamente.",
        });
      }

      setSubName('');
      setSubEmail('');
      setSubPassword('');
      setSubPermissions({
        manageProducts: false,
        manageOrders: false,
        manageContacts: false,
        manageUsers: false,
        viewAnalytics: false,
        manageSettings: false,
      });
      setShowCreateSubForm(false);
      fetchSubAccounts(); // Recargar la lista
    } catch (error: any) {
      const status = error?.status;
      const code = error?.code;
      const msg = error?.message || "No se pudo crear la subcuenta";
      const is429 = status === 429 || code === 'over_email_send_rate_limit' ||
        msg?.toLowerCase?.().includes('429') || msg?.toLowerCase?.().includes('rate limit');
      const description = is429
        ? "Demasiados intentos. Supabase limita a 2 registros por hora. Espera 1 hora e intenta de nuevo."
        : msg;
      toast({
        title: "Error",
        description,
        variant: "destructive"
      });
    } finally {
      setSubLoading(false);
    }
  };

  const fetchSubAccounts = async () => {
    setSubAccountsLoading(true);
    try {
      if (isSupabase) {
        const { data, error } = await (db as any)
          .from('users')
          .select('*')
          .eq('sub_cuenta', 'si');

        if (error) throw error;

        setSubAccounts(data || []);
      } else {
        const querySnapshot = await getDocs(collection(db, "users"));
        const subs = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as { id: string; subCuenta?: string; name?: string; email?: string }))
          .filter(u => u.subCuenta === "si");
        setSubAccounts(subs);
      }
    } catch (e) {
      toast({ title: "Error", description: "No se pudieron cargar las subcuentas", variant: "destructive" });
    }
    setSubAccountsLoading(false);
  };

  const handleDeleteSubAccount = async (uid: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta subcuenta? Esta acción no se puede deshacer.")) return;
    setDeletingId(uid);
    try {
      if (isSupabase) {
        const { error } = await (db as any)
          .from('users')
          .delete()
          .eq('id', uid);

        if (error) throw error;

        setSubAccounts(subAccounts.filter(u => u.id !== uid));
        toast({ title: "Subcuenta eliminada", description: "La subcuenta fue eliminada correctamente." });
      } else {
        await setDoc(doc(db, "users", uid), {}, { merge: false });
        setSubAccounts(subAccounts.filter(u => u.id !== uid));
        toast({ title: "Subcuenta eliminada", description: "La subcuenta fue eliminada correctamente." });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar", variant: "destructive" });
    }
    setDeletingId(null);
  };

  const handleDarLiberta = async (uid: string) => {
    try {
      if (isSupabase) {
        const { error } = await (db as any)
          .from('users')
          .update({ liberta: "si" })
          .eq('id', uid);
        if (error) throw error;
      } else {
        await setDoc(doc(db, "users", uid), { liberta: "si" }, { merge: true });
      }
      toast({
        title: "Liberta otorgada",
        description: "La subcuenta ahora tiene liberta.",
      });
      setSubAccounts(subAccounts.map(u =>
        u.id === uid ? { ...u, liberta: "si" } : u
      ));
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo dar liberta",
        variant: "destructive"
      });
    }
  };

  const handleToggleLiberta = async (uid: string, current: string) => {
    const newValue = current === "si" ? "no" : "si";
    try {
      if (isSupabase) {
        const { error } = await (db as any)
          .from('users')
          .update({ liberta: newValue })
          .eq('id', uid);
        if (error) throw error;
      } else {
        await setDoc(doc(db, "users", uid), { liberta: newValue }, { merge: true });
      }
      toast({
        title: newValue === "si" ? "Liberta otorgada" : "Liberta retirada",
        description: newValue === "si"
          ? "La subcuenta ahora tiene liberta."
          : "La subcuenta ya no tiene liberta.",
      });
      setSubAccounts(subAccounts.map(u =>
        u.id === uid ? { ...u, liberta: newValue } : u
      ));
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo actualizar liberta",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (activeTab === "subaccounts" && isAdmin) fetchSubAccounts();
  }, [activeTab, isAdmin]);

  // Función para generar ID encriptado (similar al de la imagen)
  const generateEncryptedId = (email: string, id: string) => {
    // Generar un ID corto basado en el email y el ID del usuario
    const combined = `${email}-${id}`;
    // Usar un hash simple o el ID truncado
    return id.substring(0, 20) || combined.substring(0, 20);
  };

  // Función para copiar al portapapeles
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copiado",
        description: "ID copiado al portapapeles",
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "No se pudo copiar",
        variant: "destructive"
      });
    });
  };

  // Filtrar subcuentas según búsqueda y filtro
  const filteredSubAccounts = useMemo(() => {
    let filtered = subAccounts;

    // Filtrar por búsqueda
    if (subAccountSearch) {
      const searchLower = subAccountSearch.toLowerCase();
      filtered = filtered.filter(sub =>
        sub.name?.toLowerCase().includes(searchLower) ||
        sub.email?.toLowerCase().includes(searchLower)
      );
    }

    // Filtrar por rol
    if (subAccountRoleFilter !== 'all') {
      if (subAccountRoleFilter === 'admin') {
        filtered = filtered.filter(sub => sub.liberta === "si" || sub.isAdmin);
      } else if (subAccountRoleFilter === 'user') {
        filtered = filtered.filter(sub => sub.liberta !== "si" && !sub.isAdmin);
      }
    }

    return filtered;
  }, [subAccounts, subAccountSearch, subAccountRoleFilter]);

  // Función para renderizar el contenido de subcuentas (reutilizable)
  const renderSubaccountsContent = () => {
    if (!isAdmin) return null;

    return (
      <div className="bg-white min-h-screen p-6">
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex items-center">
            <button className="px-4 py-2 text-sm font-semibold text-gray-900 border-b-2 border-blue-600">
              Mi personal
            </button>
          </div>
        </div>

        {/* Filters and Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
            {/* Role Filter Dropdown */}
            <div className="relative">
              <select
                value={subAccountRoleFilter}
                onChange={(e) => setSubAccountRoleFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              >
                <option value="all">Usuario Rol</option>
                <option value="admin">ACCOUNT-ADMIN</option>
                <option value="user">ACCOUNT-USER</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="🔍 nombre, correo electrónic"
                value={subAccountSearch}
                onChange={(e) => setSubAccountSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Add User Button */}
          <Button
            onClick={() => setShowCreateSubForm(v => !v)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md flex items-center gap-2 shadow-sm"
          >
            <Users className="h-4 w-4" />
            Añadir Usuario
          </Button>
        </div>

        {/* Form for creating subcuenta */}
        {showCreateSubForm && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Crear Nuevo Usuario</h4>
            <form onSubmit={handleCreateSubAccount} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  placeholder="Nombre completo"
                  value={subName}
                  onChange={e => setSubName(e.target.value)}
                  className="bg-white"
                  required
                />
                <Input
                  placeholder="Correo electrónico"
                  type="email"
                  value={subEmail}
                  onChange={e => setSubEmail(e.target.value)}
                  className="bg-white"
                  required
                />
                <Input
                  placeholder="Contraseña"
                  type="password"
                  value={subPassword}
                  onChange={e => setSubPassword(e.target.value)}
                  className="bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div>
                  <h5 className="text-sm font-semibold text-slate-900 mb-2">Permisos del usuario</h5>
                  <p className="text-xs text-slate-500 mb-3">Selecciona los permisos que deseas asignar al nuevo usuario.</p>
                  <div className="space-y-2">
                    {[
                      { key: 'manageProducts', label: 'Gestionar Productos' },
                      { key: 'manageOrders', label: 'Gestionar Pedidos' },
                      { key: 'manageContacts', label: 'Gestionar Contactos' },
                      { key: 'manageUsers', label: 'Gestionar Usuarios' },
                      { key: 'viewAnalytics', label: 'Ver Analytics' },
                      { key: 'manageSettings', label: 'Configuración y Ajustes' },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={subPermissions[item.key]}
                          onChange={() => setSubPermissions(prev => ({
                            ...prev,
                            [item.key]: !prev[item.key],
                          }))}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  <p className="font-semibold text-slate-800 mb-2">¿Qué hace cada permiso?</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong>Gestionar Productos:</strong> crear, editar y eliminar productos en el catálogo.</li>
                    <li><strong>Gestionar Pedidos:</strong> ver y actualizar el estado de pedidos y devoluciones.</li>
                    <li><strong>Gestionar Contactos:</strong> acceder a contactos, comentarios y tareas asociadas.</li>
                    <li><strong>Gestionar Usuarios:</strong> crear o editar subcuentas y permisos.</li>
                    <li><strong>Ver Analytics:</strong> consultar métricas de ventas, tráfico y comportamiento.</li>
                    <li><strong>Configuración y Ajustes:</strong> cambiar ajustes generales del panel o integraciones.</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={subLoading || !subName || !subEmail || !subPassword}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {subLoading ? 'Creando...' : 'Crear Usuario'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowCreateSubForm(false);
                    setSubName('');
                    setSubEmail('');
                    setSubPassword('');
                    setSubPermissions({
                      manageProducts: false,
                      manageOrders: false,
                      manageContacts: false,
                      manageUsers: false,
                      viewAnalytics: false,
                      manageSettings: false,
                    });
                  }}
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        {subAccountsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredSubAccounts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
            <p className="text-lg font-semibold text-gray-700 mb-2">
              {subAccounts.length === 0 ? "No hay usuarios registrados" : "No se encontraron resultados"}
            </p>
            {subAccounts.length === 0 && (
              <Button onClick={() => setShowCreateSubForm(true)} className="mt-4">
                Agregar usuario
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correo electrónico</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de usuario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubAccounts.map(sub => {
                    const encryptedId = generateEncryptedId(sub.email || '', sub.id);
                    const userType = sub.liberta === "si" || sub.isAdmin ? "ACCOUNT-ADMIN" : "ACCOUNT-USER";
                    const initials = sub.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || sub.email?.substring(0, 2).toUpperCase() || 'U';

                    return (
                      <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                        {/* Nombre */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mr-3 flex-shrink-0">
                              {sub.photoURL ? (
                                <img src={sub.photoURL} alt={sub.name} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <span className="text-sm font-semibold text-blue-700">{initials}</span>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{sub.name || 'Sin nombre'}</div>
                            </div>
                          </div>
                        </td>

                        {/* Correo electrónico */}
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{sub.email || 'Sin correo'}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 font-mono">{encryptedId}</span>
                            <button
                              onClick={() => copyToClipboard(encryptedId)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title="Copiar ID"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </td>

                        {/* Teléfono */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{sub.phone || sub.telefono || '-'}</div>
                        </td>

                        {/* Tipo de usuario */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${userType === "ACCOUNT-ADMIN"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800"
                            }`}>
                            {userType}
                          </span>
                        </td>

                        {/* Acción */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleLiberta(sub.id, sub.liberta || "no")}
                              className={cn(
                                "px-2 py-1 text-xs font-medium rounded-md transition-colors",
                                sub.liberta === "si"
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                              )}
                              title={sub.liberta === "si" ? "Quitar Liberta" : "Dar Liberta"}
                            >
                              {sub.liberta === "si" ? "Con Liberta" : "Dar Liberta"}
                            </button>
                            <button
                              onClick={() => {
                                toast({
                                  title: "Editar usuario",
                                  description: `Editar ${sub.name}`,
                                });
                              }}
                              className="text-gray-400 hover:text-blue-600 transition-colors"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubAccount(sub.id)}
                              disabled={deletingId === sub.id}
                              className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                              title="Eliminar"
                            >
                              {deletingId === sub.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600"></div>
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!isAdmin && !isSubAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <Card className="w-96 shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-red-600">Acceso Denegado</h2>
            <p className="text-muted-foreground mb-6">
              No tienes permisos para acceder al panel de administración.
            </p>
            <Button
              onClick={() => navigate('/')}
              className="gradient-orange hover:opacity-90 transition-all"
            >
              <Home className="mr-2 h-4 w-4" />
              Volver al Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ofertas = products.filter((p: any) => p.category?.toLowerCase() === "ofertas");

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Fixed, full height */}
      <div className="fixed left-0 top-0 h-screen z-50">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isAdmin={isAdmin}
          isSubAdmin={isSubAdmin}
          navigateToHome={() => navigate('/')}
        />
      </div>

      {/* Main Content Area - Con margen izquierdo para el sidebar */}
      <div className="flex-1 flex flex-col ml-0 lg:ml-[220px] overflow-x-hidden">
        {/* Top Notification Bar - Solid Blue */}
        <div className="bg-blue-600 text-white px-6 py-2.5 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center space-x-2 flex-1 justify-center">
            <span className="uppercase tracking-widest font-black text-base">FREE MERCO</span>
            <button
              onClick={() => setActiveTab('planes')}
              className="ml-4 bg-blue-700 hover:bg-blue-800 text-white px-4 py-1 rounded-md text-xs font-bold transition-colors"
            >
              Resolve
            </button>
          </div>
        </div>

        {/* Main Header Toolbar - Solo iconos circulares */}
        <header className="bg-white border-b border-slate-100 flex items-center justify-end px-6 py-3 sticky top-0 z-40 flex-shrink-0 min-w-0 w-full">
          {/* Circular Action Icons */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {/* Home Button - Ir a la tienda */}
            <button
              onClick={() => navigate('/')}
              className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
              type="button"
              title="Ir a la tienda (Ecommerce)"
            >
              <Home className="h-4 w-4" />
            </button>

            {/* Plan sin IA - Blue */}
            <button
              onClick={() => setShowPlanIADialog(true)}
              className="w-8 h-8 rounded-full bg-blue-400 text-white flex items-center justify-center hover:bg-blue-500 transition-colors cursor-pointer"
              type="button"
              title="Plan IA"
            >
              <Sparkles className="h-4 w-4" />
            </button>

            {/* Anuncios Websy */}
            <button
              onClick={() => setShowAnunciosDialog(true)}
              className="w-8 h-8 rounded-full bg-slate-400 text-white flex items-center justify-center hover:bg-slate-500 transition-colors cursor-pointer"
              type="button"
              title="Anuncios Websy"
            >
              <Megaphone className="h-4 w-4" />
            </button>

            {/* Bell - Orange */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-8 h-8 rounded-full bg-orange-400 text-white flex items-center justify-center hover:bg-orange-500 transition-colors relative"
                type="button"
                title="Notificaciones"
              >
                <Bell className="h-4 w-4" />
                {(stockUnreadCount > 0 || systemNotifications.filter(n => !n.read).length > 0) && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                )}
              </button>
            </div>

            {/* Help - Blue */}
            <button
              onClick={() => setActiveTab('help-manual')}
              className="w-8 h-8 rounded-full bg-blue-400 text-white flex items-center justify-center hover:bg-blue-500 transition-colors cursor-pointer"
              type="button"
              title="Manual de Ayuda"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            {/* User Avatar - Green */}
            <div className="relative ml-0.5" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(prev => !prev)}
                className="w-8 h-8 rounded-full bg-green-400 text-white flex items-center justify-center font-semibold text-xs hover:bg-green-500 transition-colors cursor-pointer relative z-50"
                type="button"
                title="Usuario"
              >
                {user?.name ? user.name.substring(0, 2).toUpperCase() : "AD"}
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-[9999] animate-in slide-in-from-top-5 duration-200">
                  <div className="px-4 py-2 border-b border-slate-100 text-left">
                    <p className="text-sm font-semibold text-slate-700">{user?.name || "Administrador"}</p>
                    <p className="text-xs text-slate-500">{user?.email || "admin@gmail.com"}</p>
                  </div>
                  <ul>
                    <li>
                      <button 
                        onClick={() => {
                          setActiveTab('configuration');
                          setShowUserMenu(false);
                        }}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Settings className="h-4 w-4 text-slate-400" />
                        <span>Configuración</span>
                      </button>
                    </li>
                    <li className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Cerrar sesión</span>
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dialog: Plan sin IA */}
        <Dialog open={showPlanIADialog} onOpenChange={setShowPlanIADialog}>
          <DialogContent className="max-w-md rounded-xl border-slate-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-800">
                <Sparkles className="h-5 w-5 text-[hsl(214,100%,38%)]" />
                Plan sin IA
              </DialogTitle>
              <DialogDescription className="text-slate-600 text-left pt-2 space-y-2">
                <p className="font-medium">La IA potencia tu negocio.</p>
                <p className="text-sm">
                  Actualmente estás en el plan básico. Potencia tus ventas, automatiza respuestas y mejora la experiencia de tus clientes con nuestro asistente de inteligencia artificial.
                </p>
                <p className="text-sm">
                  Contáctanos para conocer los planes con IA disponibles.
                </p>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* Dialog: Anuncios Websy */}
        <Dialog open={showAnunciosDialog} onOpenChange={setShowAnunciosDialog}>
          <DialogContent className="max-w-md rounded-xl border-slate-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-800">
                <Megaphone className="h-5 w-5 text-slate-500" />
                Anuncios Websy
              </DialogTitle>
              <DialogDescription className="text-slate-600 text-left pt-2">
                <p className="text-sm">
                  Aquí aparecerán anuncios generales de Websy con sus asociados.
                </p>
                <p className="text-sm mt-3 text-slate-500">
                  Próximamente podrás ver novedades, ofertas y comunicaciones relevantes para tu negocio.
                </p>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* Mensaje de recuperación en caso de problemas de renderizado */}
        {hasRenderIssues && isSubAdmin && (
          <div className="fixed bottom-4 right-4 z-50 p-4 bg-red-50 border border-red-300 rounded-lg shadow-lg max-w-sm animate-bounce">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Problemas de visualización detectados</h3>
                <div className="mt-2 text-xs text-red-700">
                  <p>Se detectaron problemas en la visualización del panel. Haz clic en el botón para reparar.</p>
                </div>
                <div className="mt-2">
                  <Button
                    onClick={manualRefresh}
                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reparar visualización
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-auto overflow-x-hidden admin-panel-content critical-ui-container" translate="no">
          <div className="px-4 md:px-6 pt-0 pb-4 md:pb-6 max-w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              {/* Hidden tabs list for state management - visual only */}
              <TabsList className="hidden">
                {!isSubAdmin && <TabsTrigger value="dashboard">Dashboard</TabsTrigger>}
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
                {/* Tabs comunes entre admin y subadmin */}
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="configuration">Configuración</TabsTrigger>
                <TabsTrigger value="filters">Filtros</TabsTrigger>
                <TabsTrigger value="wpp">WhatsApp (WPP)</TabsTrigger>
                <TabsTrigger value="mail-config">Correos (IMAP/SMTP)</TabsTrigger>
                <TabsTrigger value="payment-gateways">Pasarelas de Pago</TabsTrigger>
                <TabsTrigger value="ai-assistant">AI Assistant</TabsTrigger>
                <TabsTrigger value="help-manual">Manual de Ayuda</TabsTrigger>
                <TabsTrigger value="funnels">Funnels</TabsTrigger>
                <TabsTrigger value="sitios">Sitios</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                <TabsTrigger value="website">Website</TabsTrigger>
                <TabsTrigger value="calendars">Calendario</TabsTrigger>
                <TabsTrigger value="contacts">Contactos</TabsTrigger>
                <TabsTrigger value="opportunities">Oportunidades</TabsTrigger>
                <TabsTrigger value="modalities">Modalidades</TabsTrigger>
                <TabsTrigger value="marketing">Marketing</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>


                {!isSubAdmin && (
                  <>
                    <TabsTrigger value="subaccounts">Subaccounts</TabsTrigger>
                    <TabsTrigger value="revisiones">Revisiones</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="employees">Empleados</TabsTrigger>
                  </>
                )}
              </TabsList>

              {/* Tab Contents */}
              {!isSubAdmin && (
                <TabsContent value="dashboard" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                    {/* Estado del Sistema - Teal/Azul */}
                    <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden relative">
                      <CardContent className="p-5 relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-3xl font-bold mb-1">Activo</h3>
                            <p className="text-sm text-teal-50 opacity-90">Estado del Sistema</p>
                          </div>
                          <div className="opacity-20">
                            <BarChart3 className="h-16 w-16" />
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-teal-400/30">
                          <a href="#" className="text-xs text-teal-50 hover:text-white transition-colors flex items-center group">
                            Más información
                            <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                          </a>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Ventas de Hoy - Verde */}
                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden relative">
                      <CardContent className="p-5 relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            {todaySalesLoading ? (
                              <div className="flex items-center space-x-2 mb-1">
                                <div className="h-6 w-6 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                                <span className="text-2xl font-bold">...</span>
                              </div>
                            ) : (
                              <h3 className="text-3xl font-bold mb-1 dashboard-today-sales">${todaySales.toLocaleString()}</h3>
                            )}
                            <p className="text-sm text-green-50 opacity-90">Ventas de Hoy</p>
                          </div>
                          <div className="opacity-20">
                            <ShoppingBag className="h-16 w-16" />
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-green-400/30">
                          <a href="#" className="text-xs text-green-50 hover:text-white transition-colors flex items-center group">
                            Más información
                            <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                          </a>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Ingresos Mensuales - Amarillo/Naranja */}
                    <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden relative">
                      <CardContent className="p-5 relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            {monthlySalesLoading ? (
                              <div className="flex items-center space-x-2 mb-1">
                                <div className="h-6 w-6 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                                <span className="text-2xl font-bold">...</span>
                              </div>
                            ) : (
                              <h3 className="text-3xl font-bold mb-1 dashboard-monthly-sales">${monthlySales.toLocaleString()}</h3>
                            )}
                            <p className="text-sm text-yellow-50 opacity-90">Ingresos Mensuales</p>
                          </div>
                          <div className="opacity-20">
                            <TrendingUp className="h-16 w-16" />
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-yellow-400/30">
                          <p className="text-xs text-yellow-50 opacity-80 mb-1">
                            Actualizado {new Date().toLocaleDateString('es-AR')}
                          </p>
                          <a href="#" className="text-xs text-yellow-50 hover:text-white transition-colors flex items-center group">
                            Más información
                            <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                          </a>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Estadísticas - Rojo */}
                    <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden relative">
                      <CardContent className="p-5 relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-3xl font-bold mb-1">Activo</h3>
                            <p className="text-sm text-red-50 opacity-90">Estadísticas</p>
                          </div>
                          <div className="opacity-20">
                            <ChartBar className="h-16 w-16" />
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-red-400/30">
                          <a href="#" className="text-xs text-red-50 hover:text-white transition-colors flex items-center group">
                            Más información
                            <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                          </a>
                        </div>
                      </CardContent>
                    </Card>

                    <button className="dashboard-refresh-button hidden" onClick={() => console.log("Refresh button clicked")}></button>
                  </div>
                  <DashboardStats orders={orders} />
                </TabsContent>
              )}

              <TabsContent value="products" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <ProductFormWithWizard
                    key={selectedProductId || 'new-product'}
                    selectedProductId={selectedProductId}
                    onProductSelected={() => setSelectedProductId(null)}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="orders" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <div className="mb-6">
                    <OrdersList />
                  </div>

                  {/* Botón flotante para acciones rápidas en móvil */}
                  <button
                    className="fixed z-30 md:hidden bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center shadow-lg text-white"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </Suspense>
              </TabsContent>

              <TabsContent value="categories" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <CategoryManager />
                </Suspense>
              </TabsContent>

              {/* Manual de Ayuda - disponible para todos (admin y subadmin) */}
              <TabsContent value="help-manual" className="space-y-6">
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 md:p-8 overflow-hidden">
                  {/* Encabezado */}
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
                    <div className="w-14 h-14 rounded-xl bg-[hsl(214,100%,38%)] flex items-center justify-center shadow-sm">
                      <HelpCircle className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-2xl md:text-3xl font-bold text-slate-800">
                        Manual de Ayuda
                      </h2>
                      <p className="mt-1 text-slate-600">
                        Todo lo que necesitas saber para gestionar tu tienda de manera efectiva
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Badge variant="outline" className="bg-white text-slate-700 border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-[hsl(214,100%,38%)] transition-colors rounded-lg">Primeros Pasos</Badge>
                        <Badge variant="outline" className="bg-white text-slate-700 border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-[hsl(214,100%,38%)] transition-colors rounded-lg">Gestión de Productos</Badge>
                        <Badge variant="outline" className="bg-white text-slate-700 border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-[hsl(214,100%,38%)] transition-colors rounded-lg">Pedidos</Badge>
                        <Badge variant="outline" className="bg-white text-slate-700 border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-[hsl(214,100%,38%)] transition-colors rounded-lg">Usuarios</Badge>
                        <Badge variant="outline" className="bg-white text-slate-700 border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-[hsl(214,100%,38%)] transition-colors rounded-lg">Analítica</Badge>
                        <Badge variant="outline" className="bg-white text-slate-700 border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-[hsl(214,100%,38%)] transition-colors rounded-lg">Configuración</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Mensaje de bienvenida */}
                  <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 mb-8 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[hsl(214,100%,38%)]/10 flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="h-5 w-5 text-[hsl(214,100%,38%)]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">Bienvenido al Manual de Ayuda</h4>
                        <p className="text-slate-600 text-sm mt-1">
                          Este manual te guía paso a paso por las funcionalidades del panel de administración. Encontrarás configuración inicial, gestión de productos (incluyendo importación desde Excel), pedidos, punto de venta (POS), subcuentas, analítica y solución de problemas frecuentes.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sección de guías principales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    {/* Guía de Primeros Pasos */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[hsl(214,100%,38%)] text-white flex items-center justify-center flex-shrink-0">
                          <HelpCircle className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">
                            Guía de Primeros Pasos
                          </h3>
                          <p className="text-slate-600 text-sm mt-1">Aprende lo básico para configurar y gestionar tu tienda online.</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-semibold text-[hsl(214,100%,38%)] mb-2">1. Configuración Inicial de tu Cuenta</h4>
                        <ul className="list-disc ml-5 space-y-1.5 text-sm text-slate-600">
                          <li><span className="font-medium">Acceso al sistema:</span> Ingresa con tu correo electrónico y contraseña en la pantalla de inicio. El administrador principal tiene permisos completos; las subcuentas tienen acceso según lo asignado.</li>
                          <li><span className="font-medium">Perfil de tienda:</span> Dirígete a la pestaña <span className="font-medium">Info</span> para configurar la información básica de tu tienda: nombre, descripción, logo y datos de contacto.</li>
                          <li><span className="font-medium">Secciones del sitio:</span> Activa o desactiva las secciones principales del sitio como "Sobre Nosotros", "Envíos", "Retiros" y "Métodos de Pago" según las necesidades de tu tienda.</li>
                          <li><span className="font-medium">Seguridad:</span> Crea usuarios administradores adicionales con permisos limitados para gestionar aspectos específicos de tu tienda.</li>
                        </ul>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-semibold text-[hsl(214,100%,38%)] mb-2">2. Estructura de Categorías y Productos</h4>
                        <ul className="list-disc ml-5 space-y-1.5 text-sm text-slate-600">
                          <li><span className="font-medium">Creación de categorías:</span> Accede a la sección <span className="font-medium">Categorías</span> y crea una estructura jerárquica con categorías principales, subcategorías y terceras categorías para organizar tus productos.</li>
                          <li><span className="font-medium">Nombres descriptivos:</span> Utiliza nombres claros y descriptivos para las categorías que ayuden a tus clientes a navegar fácilmente.</li>
                          <li><span className="font-medium">Imágenes de categoría:</span> Sube la imagen directamente en el formulario al crear o editar la categoría (solo categorías principales).</li>
                          <li><span className="font-medium">Organización jerárquica:</span> Selecciona la categoría padre al crear subcategorías para mantener una estructura organizada y coherente.</li>
                        </ul>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-semibold text-[hsl(214,100%,38%)] mb-2">3. Primeros Productos y Configuraciones</h4>
                        <ul className="list-disc ml-5 space-y-1.5 text-sm text-slate-600">
                          <li><span className="font-medium">Crear producto:</span> Ve a la sección <span className="font-medium">Productos</span> y completa el formulario con nombre, descripción, precio, categoría y stock.</li>
                          <li><span className="font-medium">Métodos de envío:</span> Configura las opciones de envío en la sección <span className="font-medium">Info {'->'} Envíos</span>, detallando zonas, costos y tiempos estimados.</li>
                          <li><span className="font-medium">Métodos de pago:</span> Establece los métodos de pago aceptados en <span className="font-medium">Info {'->'} Métodos de Pago</span>, con instrucciones claras para tus clientes.</li>
                          <li><span className="font-medium">Ayuda rápida:</span> Prepara el contenido de ayuda rápida en <span className="font-medium">Info {'->'} Ayuda rápida</span> para facilitar información importante a tus clientes.</li>
                        </ul>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-semibold text-[hsl(214,100%,38%)] mb-2">4. Verificación y Pruebas</h4>
                        <ul className="list-disc ml-5 space-y-1.5 text-sm text-slate-600">
                          <li><span className="font-medium">Vista previa:</span> Usa el botón "Vista previa" en cada producto para verificar cómo se ve desde la perspectiva del cliente.</li>
                          <li><span className="font-medium">Flujo de compra:</span> Realiza una compra de prueba para verificar el proceso completo desde la selección de productos hasta el pago.</li>
                          <li><span className="font-medium">Notificaciones:</span> Verifica que recibas las notificaciones de nuevos pedidos correctamente.</li>
                          <li><span className="font-medium">Optimización móvil:</span> Asegúrate que tu tienda se vea correctamente en dispositivos móviles usando la vista previa responsiva.</li>
                        </ul>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-semibold text-[hsl(214,100%,38%)] mb-2">5. Punto de Venta (POS)</h4>
                        <ul className="list-disc ml-5 space-y-1.5 text-sm text-slate-600">
                          <li><span className="font-medium">Acceso:</span> En la pestaña Pedidos, haz clic en "Punto de Venta" para abrir el POS.</li>
                          <li><span className="font-medium">Ventas:</span> Busca productos, añádelos al carrito, ingresa el nombre del cliente y finaliza la venta. El stock se actualiza automáticamente.</li>
                          <li><span className="font-medium">Estadísticas:</span> Las ventas físicas se suman a las estadísticas del dashboard y aparecen en la lista de pedidos con un badge distintivo.</li>
                        </ul>
                      </div>

                    </div>

                    {/* Manual de Administración */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[hsl(214,100%,38%)] text-white flex items-center justify-center flex-shrink-0">
                          <ClipboardList className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">
                            Manual de Administración
                          </h3>
                          <p className="text-slate-600 text-sm mt-1">Guías avanzadas para optimizar la gestión de tu negocio.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                          <h4 className="font-semibold text-slate-800 flex items-center mb-2">
                            <Package className="h-4 w-4 mr-2 text-[hsl(214,100%,38%)]" />
                            Gestión de Productos e Inventario
                          </h4>
                          <ul className="list-disc ml-5 space-y-1 text-sm text-slate-600">
                            <li><span className="font-medium">Añadir productos:</span> Completa todos los campos del formulario, especialmente los obligatorios (*). Para las imágenes: sube archivos directamente en el formulario; se procesan y guardan automáticamente sin necesidad de servicios externos.</li>
                            <li><span className="font-medium">Ofertas y descuentos:</span> Activa la casilla "Es oferta" y establece el precio original y el descuento para mostrar el ahorro al cliente.</li>
                            <li><span className="font-medium">Especificaciones técnicas:</span> Añade todas las características importantes del producto con pares nombre/valor (ej. "Tamaño"/"Grande").</li>
                            <li><span className="font-medium">Variantes de color:</span> Añade los colores disponibles junto con su código hexadecimal y una imagen específica para cada color.</li>
                            <li><span className="font-medium">Importar Excel:</span> En la lista de productos, usa el botón "Importar Excel". El archivo debe tener: columna A = nombre del producto, columna B = precio. Los productos se crean con stock 1 y publicados. Necesitas tener al menos una categoría creada.</li>
                          </ul>
                        </div>

                        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                          <h4 className="font-semibold text-slate-800 flex items-center mb-2">
                            <ShoppingCart className="h-4 w-4 mr-2 text-[hsl(214,100%,38%)]" />
                            Procesamiento de Pedidos
                          </h4>
                          <ul className="list-disc ml-5 space-y-1 text-sm text-slate-600">
                            <li><span className="font-medium">Nuevos pedidos:</span> Aparecerán automáticamente en la sección "Pedidos" con estado "En espera" y un ícono de reloj.</li>
                            <li><span className="font-medium">Confirmar pedido:</span> Haz clic en el botón "Confirmar" (✓) para actualizar el estado a "Confirmado". Esto enviará una notificación automática al cliente.</li>
                            <li><span className="font-medium">Detalles de envío:</span> Ingresa la información de seguimiento y transportista al confirmar para que el cliente pueda rastrear su pedido.</li>
                            <li><span className="font-medium">Buscar pedidos:</span> Utiliza el campo de búsqueda para filtrar por nombre de cliente, email o dirección de entrega.</li>
                            <li><span className="font-medium">Cancelaciones:</span> Para cancelar un pedido, utiliza el botón "Eliminar" (🗑️). Esto eliminará el pedido del sistema pero mantendrá un registro en la base de datos para auditoría.</li>
                            <li><span className="font-medium">Punto de Venta (POS):</span> En la pestaña Pedidos, activa "Punto de Venta" para vender en tienda física. Busca productos, añádelos al carrito, ingresa nombre del cliente y finaliza la venta. Las ventas físicas aparecen con badge distintivo en la lista.</li>
                          </ul>
                        </div>

                        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                          <h4 className="font-semibold text-slate-800 flex items-center mb-2">
                            <Users className="h-4 w-4 mr-2 text-[hsl(214,100%,38%)]" />
                            Gestión de Usuarios y Permisos
                          </h4>
                          <ul className="list-disc ml-5 space-y-1 text-sm text-slate-600">
                            <li><span className="font-medium">Tipos de usuarios:</span> Hay dos tipos principales: administradores y clientes. Los administradores pueden tener permisos completos o limitados.</li>
                            <li><span className="font-medium">Crear subcuentas:</span> En la sección "Subcuentas", haz clic en "Añadir usuario" y completa el formulario con email y contraseña.</li>
                            <li><span className="font-medium">Permisos "Liberta":</span> Las subcuentas sin permiso "Liberta" enviarán sus cambios a revisión en vez de aplicarlos directamente:</li>
                            <li className="ml-4 list-none">
                              <ul className="list-disc ml-4 text-xs space-y-0.5">
                                <li>Con liberta="yes": Cambios aplicados inmediatamente</li>
                                <li>Con liberta="no": Cambios enviados a revisión del administrador</li>
                              </ul>
                            </li>
                            <li><span className="font-medium">Gestión de revisiones:</span> Aprueba o rechaza los cambios enviados por subcuentas desde la sección "Revisiones" en el panel de administración.</li>
                            <li><span className="font-medium">Clientes:</span> Administra las cuentas de clientes desde la sección "Usuarios", donde podrás ver sus datos de contacto e historial de compras.</li>
                          </ul>
                        </div>

                        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                          <h4 className="font-semibold text-slate-800 flex items-center mb-2">
                            <BarChart3 className="h-4 w-4 mr-2 text-[hsl(214,100%,38%)]" />
                            Analítica y Reportes
                          </h4>
                          <ul className="list-disc ml-5 space-y-1 text-sm text-slate-600">
                            <li><span className="font-medium">Panel de análisis:</span> Accede a través de la pestaña "Analítica" para ver estadísticas de ventas, productos y clientes.</li>
                            <li><span className="font-medium">Análisis de productos:</span> Visualiza qué productos tienen más vistas y conversiones. Datos clave:</li>
                            <li className="ml-4 list-none">
                              <ul className="list-disc ml-4 text-xs space-y-0.5">
                                <li>Vistas totales por producto</li>
                                <li>Tiempo promedio en página</li>
                                <li>Tasa de conversión (vistas vs. compras)</li>
                                <li>Visitantes únicos vs. recurrentes</li>
                              </ul>
                            </li>
                            <li><span className="font-medium">Dashboard:</span> En la pestaña Inicio verás métricas en tiempo real: estado de oportunidades, valor y tasa de conversión. Usa el filtro de fechas para analizar períodos.</li>
                            <li><span className="font-medium">Filtros temporales:</span> Selecciona el período que deseas analizar: últimos 7 días, 30 días, 3 meses o personalizado.</li>
                          </ul>
                        </div>
                      </div>

                    </div>

                    {/* Solución de Problemas */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:col-span-2">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-600 text-white flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">
                            Solución de Problemas
                          </h3>
                          <p className="text-slate-600 text-sm mt-1">Guía de resolución para los problemas más comunes del sistema.</p>
                        </div>
                      </div>

                      <div className="mb-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                          <div className="border border-slate-200 bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors cursor-pointer">
                            <h4 className="font-semibold text-slate-800 flex items-center mb-2">
                              <DollarSign className="h-4 w-4 mr-2 text-[hsl(214,100%,38%)]" />
                              Errores de Pago
                            </h4>
                            <p className="text-sm text-slate-600 mb-2">
                              Soluciones para problemas con transacciones, rechazos de tarjetas y fallos en el procesamiento de pagos.
                            </p>
                            <div className="text-xs text-slate-600 space-y-1">
                              <p><span className="font-medium">Problema:</span> Pago rechazado por tarjeta</p>
                              <p><span className="font-medium">Solución:</span> Verificar que los datos ingresados sean correctos y que la tarjeta tenga fondos suficientes. Si persiste, solicitar al cliente que contacte a su banco.</p>

                              <p className="mt-2"><span className="font-medium">Problema:</span> Error en la pasarela de pagos</p>
                              <p><span className="font-medium">Solución:</span> Verificar la configuración de la pasarela en "Info {'->'} Métodos de Pago", asegurando que las credenciales de API estén correctamente configuradas.</p>
                            </div>
                          </div>

                          <div className="border border-slate-200 bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors cursor-pointer">
                            <h4 className="font-semibold text-slate-800 flex items-center mb-2">
                              <ShoppingCart className="h-4 w-4 mr-2 text-[hsl(214,100%,38%)]" />
                              Problemas de Envío
                            </h4>
                            <p className="text-sm text-slate-600 mb-2">
                              Resolución de inconvenientes con rastreo, retrasos y gestión de transportistas.
                            </p>
                            <div className="text-xs text-slate-600 space-y-1">
                              <p><span className="font-medium">Problema:</span> Número de rastreo no funciona</p>
                              <p><span className="font-medium">Solución:</span> Verificar que se haya ingresado correctamente y sin espacios adicionales. El número suele tardar 24-48 horas en activarse en el sistema del transportista.</p>

                              <p className="mt-2"><span className="font-medium">Problema:</span> Dirección de envío incorrecta</p>
                              <p><span className="font-medium">Solución:</span> Contactar inmediatamente al cliente para confirmar la dirección correcta. Si el paquete ya fue enviado, contactar al transportista para intentar corregir la dirección.</p>
                            </div>
                          </div>

                          <div className="border border-slate-200 bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors cursor-pointer">
                            <h4 className="font-semibold text-slate-800 flex items-center mb-2">
                              <RefreshCw className="h-4 w-4 mr-2 text-[hsl(214,100%,38%)]" />
                              Gestión de Devoluciones
                            </h4>
                            <p className="text-sm text-slate-600 mb-2">
                              Guía para procesar reembolsos, cambios y resolver disputas con clientes.
                            </p>
                            <div className="text-xs text-slate-600 space-y-1">
                              <p><span className="font-medium">Proceso de devolución:</span></p>
                              <ol className="list-decimal ml-4 space-y-0.5">
                                <li>Registrar la solicitud de devolución en el sistema</li>
                                <li>Generar código de devolución para el cliente</li>
                                <li>Esperar recepción del producto (verificar condición)</li>
                                <li>Procesar reembolso o cambio según política</li>
                                <li>Actualizar inventario si el producto vuelve al stock</li>
                              </ol>
                              <p className="mt-2"><span className="font-medium">Para iniciar una devolución:</span> En la sección Pedidos, selecciona el pedido y haz clic en "Procesar devolución".</p>
                            </div>
                          </div>

                          <div className="border border-slate-200 bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors cursor-pointer">
                            <h4 className="font-semibold text-slate-800 flex items-center mb-2">
                              <Settings className="h-4 w-4 mr-2 text-[hsl(214,100%,38%)]" />
                              Problemas Técnicos
                            </h4>
                            <p className="text-sm text-slate-600 mb-2">
                              Soluciones para fallos del sistema, errores de carga y problemas de rendimiento.
                            </p>
                            <div className="text-xs text-slate-600 space-y-1">
                              <p><span className="font-medium">Problema:</span> Las imágenes de productos no se muestran</p>
                              <p><span className="font-medium">Solución:</span> Verifica que la imagen se haya subido correctamente (formatos: JPG, PNG, WebP). Si falla la subida, revisa la conexión a internet y el tamaño del archivo. Intenta con una imagen más pequeña si persiste.</p>

                              <p className="mt-2"><span className="font-medium">Problema:</span> Error al guardar cambios</p>
                              <p><span className="font-medium">Solución:</span> Comprobar la conexión a internet, refrescar la página y verificar que todos los campos obligatorios estén completados. Si persiste, toma una captura de la consola de errores (F12) y envíala a soporte.</p>
                              <p className="mt-2"><span className="font-medium">Problema:</span> Error 403 o 500 al cargar perfil o subcuentas</p>
                              <p><span className="font-medium">Solución:</span> Verifica que las políticas de seguridad (RLS) de Supabase estén configuradas. Contacta a Websy para revisar la base de datos.</p>
                              <p className="mt-2"><span className="font-medium">Problema:</span> Error 429 (demasiadas solicitudes)</p>
                              <p><span className="font-medium">Solución:</span> Espera unos minutos antes de reintentar. Si creas muchas subcuentas o productos en poco tiempo, haz pausas entre operaciones.</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <h4 className="font-semibold text-slate-800 flex items-center">
                            <Info className="h-4 w-4 mr-2 text-[hsl(214,100%,38%)]" />
                            ¿No encuentras solución?
                          </h4>
                          <p className="text-sm text-slate-600 mt-1">
                            Contacta a Websy o tu agencia para soporte técnico. Incluye capturas de pantalla y descripción del problema para una respuesta más rápida.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Información adicional y consejos */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 mt-8 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <Lightbulb className="h-5 w-5 mr-2 text-[hsl(214,100%,38%)]" />
                    Consejos y Buenas Prácticas
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="font-semibold text-slate-800 mb-2 flex items-center">
                        <Package className="h-4 w-4 mr-2 text-[hsl(214,100%,38%)]" />
                        Productos
                      </h4>
                      <ul className="text-sm text-slate-600 list-disc ml-4 space-y-1">
                        <li>Usa imágenes de buena calidad y proporción uniforme (ej. 1:1 o 4:3).</li>
                        <li>Descripciones claras mejoran las conversiones y el SEO.</li>
                        <li>Mantén el stock actualizado para evitar ventas de productos agotados.</li>
                        <li>Importa desde Excel para cargar muchos productos rápido: nombre en columna A, precio en B.</li>
                      </ul>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="font-semibold text-slate-800 mb-2 flex items-center">
                        <ShoppingCart className="h-4 w-4 mr-2 text-[hsl(214,100%,38%)]" />
                        Pedidos y POS
                      </h4>
                      <ul className="text-sm text-slate-600 list-disc ml-4 space-y-1">
                        <li>Confirma los pedidos online cuanto antes para notificar al cliente.</li>
                        <li>El POS registra ventas en tienda y las suma a las estadísticas del dashboard.</li>
                        <li>Filtra por "Ventas Físicas" para ver solo transacciones del punto de venta.</li>
                        <li>Usa la búsqueda por nombre o email para localizar pedidos rápido.</li>
                      </ul>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="font-semibold text-slate-800 mb-2 flex items-center">
                        <Users className="h-4 w-4 mr-2 text-[hsl(214,100%,38%)]" />
                        Subcuentas
                      </h4>
                      <ul className="text-sm text-slate-600 list-disc ml-4 space-y-1">
                        <li>Solo el administrador principal puede crear subcuentas.</li>
                        <li>Asigna "Liberta" para que los cambios se apliquen sin revisión.</li>
                        <li>Sin Liberta, los cambios pasan por la sección Revisiones.</li>
                        <li>Las subcuentas no ven la opción de crear otras subcuentas.</li>
                      </ul>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="font-semibold text-slate-800 mb-2 flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2 text-[hsl(214,100%,38%)]" />
                        Analítica y Dashboard
                      </h4>
                      <ul className="text-sm text-slate-600 list-disc ml-4 space-y-1">
                        <li>Revisa el Dashboard para métricas de ventas y conversión en tiempo real.</li>
                        <li>Usa el filtro de fechas para comparar períodos.</li>
                        <li>En Analítica verás vistas por producto, dispositivos y visitantes.</li>
                        <li>Las visitas al sitio se registran automáticamente.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center bg-slate-50 rounded-xl border border-slate-200 p-4 md:p-6">
                    <div className="mb-4 md:mb-0 md:mr-6">
                      <div className="w-14 h-14 bg-[hsl(214,100%,38%)] text-white rounded-xl flex items-center justify-center">
                        <HelpCircle className="h-7 w-7" />
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h4 className="text-lg font-semibold text-slate-800">¿Necesitas ayuda?</h4>
                      <p className="text-slate-600 mt-1">
                        Para soporte técnico, contacta a Websy o tu agencia. Incluye capturas de pantalla y una descripción clara del problema para una respuesta más rápida.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Solo para admin principal */}
              {!isSubAdmin && (
                <>

                  {/* TabsContent de subcuentas - usa la función reutilizable */}
                  <TabsContent value="subaccounts" className="space-y-6">
                    {renderSubaccountsContent()}
                  </TabsContent>

                  {/* Código original de subcuentas (comentado para referencia) */}
                  {false && (
                    <div className="bg-gradient-to-b from-sky-50 via-white to-sky-50 rounded-xl shadow-xl p-6 border border-sky-100">
                      {/* Header with animated badge - Mobile Optimized */}
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 md:mb-8 gap-4">
                        <div className="flex items-center w-full">
                          <div className="relative mr-3">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse-slow">
                              <Users className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                            </div>
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold text-blue-600 shadow-md border border-blue-100">
                              {subAccounts.length}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-sky-700 to-blue-700 bg-clip-text text-transparent">
                              Centro de Colaboradores
                            </h3>
                            <p className="text-sky-600 text-xs sm:text-sm">
                              Administra subcuentas con accesos privilegiados
                            </p>
                          </div>
                        </div>

                        {/* Search & Add - Mobile optimized */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                          <div className="relative group flex-1 lg:flex-none order-2 sm:order-1">
                            <input
                              type="text"
                              placeholder="Buscar colaborador..."
                              className="w-full lg:w-64 px-4 py-2.5 pr-9 border border-sky-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 bg-white"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sky-400">
                              <circle cx="11" cy="11" r="8"></circle>
                              <path d="m21 21-4.3-4.3"></path>
                            </svg>
                          </div>
                          <Button
                            onClick={() => setShowCreateSubForm(v => !v)}
                            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold w-full sm:w-auto px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 order-1 sm:order-2 shrink-0"
                          >
                            {showCreateSubForm ? (
                              <span className="flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 6 6 18"></path>
                                  <path d="m6 6 12 12"></path>
                                </svg>
                                <span className="font-medium">Cerrar</span>
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                  <circle cx="9" cy="7" r="4"></circle>
                                  <path d="M19 8v6"></path>
                                  <path d="M22 11h-6"></path>
                                </svg>
                                <span className="font-medium">Nuevo Colaborador</span>
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Animated Stats Cards - Mobile Optimized */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
                        {/* Scrollable container for mobile only */}
                        <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-3 sm:p-4 border border-sky-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                          <div>
                            <p className="text-[10px] sm:text-xs font-medium text-blue-500 mb-0.5 sm:mb-1">TOTAL COLABORADORES</p>
                            <p className="text-xl sm:text-2xl font-bold text-blue-700">{subAccounts.length}</p>
                            <p className="text-[10px] sm:text-xs text-blue-400 mt-0.5 sm:mt-1 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                <path d="M12 5v14"></path>
                                <path d="m19 12-7-7-7 7"></path>
                              </svg>
                              Activos en el sistema
                            </p>
                          </div>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 sm:p-4 border border-green-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                          <div>
                            <p className="text-[10px] sm:text-xs font-medium text-green-500 mb-0.5 sm:mb-1">CON LIBERTA</p>
                            <p className="text-xl sm:text-2xl font-bold text-green-700">{subAccounts.filter(a => a.liberta === "si").length}</p>
                            <p className="text-[10px] sm:text-xs text-green-400 mt-0.5 sm:mt-1 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                <path d="m9 11-6 6v3h9l3-3"></path>
                                <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"></path>
                              </svg>
                              Permisos completos
                            </p>
                          </div>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                              <path d="m9 12 2 2 4-4"></path>
                            </svg>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 sm:p-4 border border-amber-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 col-span-1 sm:col-span-2 md:col-span-1">
                          <div>
                            <p className="text-[10px] sm:text-xs font-medium text-amber-500 mb-0.5 sm:mb-1">SIN LIBERTA</p>
                            <p className="text-xl sm:text-2xl font-bold text-amber-700">{subAccounts.filter(a => a.liberta !== "si").length}</p>
                            <p className="text-[10px] sm:text-xs text-amber-400 mt-0.5 sm:mt-1 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                                <path d="M8 12h8"></path>
                              </svg>
                              Requieren aprobación
                            </p>
                          </div>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Modal form for creating subcuenta - Mobile optimized */}
                      {showCreateSubForm && (
                        <div className="mb-6 md:mb-8 animate-in fade-in zoom-in-95 duration-300">
                          <div className="bg-gradient-to-r from-sky-100 to-blue-100 p-4 sm:p-6 rounded-xl border border-sky-200 shadow-inner relative">
                            {/* Design elements - optimized for mobile */}
                            <div className="absolute top-0 right-0 w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-200 to-sky-200 rounded-full blur-2xl opacity-50 -z-10 transform translate-x-8 -translate-y-8"></div>
                            <div className="absolute bottom-0 left-0 w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-tr from-sky-200 to-blue-200 rounded-full blur-xl opacity-50 -z-10 transform -translate-x-5 translate-y-5"></div>

                            <h4 className="text-lg sm:text-xl font-bold text-sky-800 mb-3 sm:mb-4 flex items-center gap-2">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-sky-500 rounded-lg flex items-center justify-center shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                  <circle cx="9" cy="7" r="4"></circle>
                                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                              </div>
                              Crear Nuevo Colaborador
                            </h4>

                            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 sm:p-5 shadow-sm border border-sky-100">
                              {/* Mobile-first form layout */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4">
                                <div>
                                  <label className="text-xs font-medium text-sky-700 block mb-1">Nombre del Colaborador</label>
                                  <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-sky-400">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-3.5 sm:h-3.5">
                                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                      </svg>
                                    </span>
                                    <Input
                                      placeholder="Nombre completo"
                                      value={subName}
                                      onChange={e => setSubName(e.target.value)}
                                      required
                                      className="pl-8 h-9 sm:h-10 text-xs sm:text-sm bg-white border-sky-200 focus:border-sky-400 focus:ring-sky-300"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs font-medium text-sky-700 block mb-1">Correo Electrónico</label>
                                  <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-sky-400">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-3.5 sm:h-3.5">
                                        <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                                      </svg>
                                    </span>
                                    <Input
                                      placeholder="nombre@empresa.com"
                                      type="email"
                                      value={subEmail}
                                      onChange={e => setSubEmail(e.target.value)}
                                      required
                                      className="pl-8 h-9 sm:h-10 text-xs sm:text-sm bg-white border-sky-200 focus:border-sky-400 focus:ring-sky-300"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs font-medium text-sky-700 block mb-1">Contraseña Segura</label>
                                  <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-sky-400">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-3.5 sm:h-3.5">
                                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                      </svg>
                                    </span>
                                    <Input
                                      placeholder="Contraseña"
                                      type="password"
                                      value={subPassword}
                                      onChange={e => setSubPassword(e.target.value)}
                                      required
                                      className="pl-8 h-9 sm:h-10 text-xs sm:text-sm bg-white border-sky-200 focus:border-sky-400 focus:ring-sky-300"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-3 mt-3 sm:gap-4 sm:mt-6">
                                <div className="flex-1 text-xs text-sky-700 bg-sky-50 p-2.5 rounded-lg border border-sky-100">
                                  <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500 shrink-0">
                                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                                      <path d="m9 12 2 2 4-4"></path>
                                    </svg>
                                    <span className="font-medium">Información de Seguridad</span>
                                  </div>
                                  <p className="text-[10px] text-sky-600">
                                    Los colaboradores tendrán acceso a funciones administrativas limitadas. Comparte estas credenciales únicamente con personas de confianza.
                                  </p>
                                </div>

                                <div className="flex justify-center sm:mt-1">
                                  <Button
                                    type="submit"
                                    onClick={handleCreateSubAccount}
                                    disabled={subLoading || !subName || !subEmail || !subPassword}
                                    className="bg-gradient-to-r from-sky-600 to-blue-700 text-white font-medium w-full sm:w-auto py-2 sm:py-2.5 px-3 sm:px-6 rounded-lg shadow hover:shadow-lg transform hover:translate-y-[-2px] transition-all duration-300 sm:min-w-[200px]"
                                  >
                                    {subLoading ? (
                                      <span className="flex items-center justify-center gap-1.5">
                                        <svg className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                        <span className="text-xs sm:text-sm">Creando...</span>
                                      </span>
                                    ) : (
                                      <span className="flex items-center justify-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                          <circle cx="9" cy="7" r="4"></circle>
                                          <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                        </svg>
                                        <span className="text-xs sm:text-sm">Crear Colaborador</span>
                                      </span>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Modern cards layout for subcuentas */}
                      {subAccountsLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 bg-white/50 backdrop-blur-sm rounded-xl border border-sky-100">
                          <div className="w-16 h-16 border-t-4 border-b-4 border-sky-500 rounded-full animate-spin mb-4"></div>
                          <p className="text-lg font-medium text-sky-700">Cargando colaboradores...</p>
                        </div>
                      ) : subAccounts.length === 0 ? (
                        <div className="bg-white rounded-xl border border-sky-100 p-10 text-center">
                          <div className="w-24 h-24 bg-sky-50 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                          </div>
                          <h3 className="text-xl font-bold text-sky-700 mb-2">No hay colaboradores registrados</h3>
                          <p className="text-sky-500 mb-6">Agrega colaboradores para asignarles permisos en el sistema</p>
                          <Button
                            onClick={() => setShowCreateSubForm(true)}
                            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-300"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            Agregar colaborador
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                          {/* Responsive grid with horizontal scroll on mobile */}
                          {subAccounts.map(sub => (
                            <div key={sub.id} className="bg-white rounded-xl border border-sky-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                              <div className="p-3 sm:p-5 border-b border-sky-100 relative">
                                {/* Status indicator - optimized for very small screens */}
                                <div className={`absolute -right-1 -top-1 ${sub.liberta === "si" ? "bg-green-500" : "bg-amber-500"} text-white text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-bl-xl rounded-tr-xl font-medium shadow-md flex items-center gap-0.5 sm:gap-1`}>
                                  {sub.liberta === "si" ? (
                                    <>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="sm:w-10 sm:h-10">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                                        <path d="m9 12 2 2 4-4"></path>
                                      </svg>
                                      <span className="whitespace-nowrap">Con Liberta</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="sm:w-10 sm:h-10">
                                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                      </svg>
                                      <span className="whitespace-nowrap">Sin Liberta</span>
                                    </>
                                  )}
                                </div>

                                {/* User info - optimized for very small screens */}
                                <div className="flex items-center mb-2 sm:mb-4">
                                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center mr-2.5 sm:mr-4 border-2 border-white shadow">
                                    <span className="text-sm sm:text-xl font-bold text-sky-600">{sub.name?.charAt(0) || 'U'}</span>
                                  </div>
                                  <div className="overflow-hidden max-w-[calc(100%-3rem)] sm:max-w-[calc(100%-4.5rem)]">
                                    <h5 className="font-bold text-sm sm:text-lg text-gray-800 truncate">{sub.name}</h5>
                                    <div className="flex items-center text-[10px] sm:text-sm text-sky-500 truncate">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 shrink-0 sm:w-3 sm:h-3">
                                        <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                                      </svg>
                                      <span className="truncate">{sub.email}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* ID and role info - more compact */}
                                <div className="bg-sky-50 p-2 sm:p-3 rounded-lg border border-sky-100">
                                  <div className="grid grid-cols-2 gap-1 sm:gap-2 text-[10px] sm:text-xs">
                                    <div>
                                      <span className="text-sky-500 block">ID del Colaborador</span>
                                      <span className="font-mono text-gray-700 truncate block">{sub.id.substring(0, 8)}...</span>
                                    </div>
                                    <div>
                                      <span className="text-sky-500 block">Rol</span>
                                      <span className="text-gray-700">Sub-Admin</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Bottom action bar - optimized for very small screens */}
                              <div className="p-2 sm:p-4 bg-gradient-to-r from-sky-50 to-blue-50 flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 sm:justify-between">
                                <Button
                                  onClick={() => handleToggleLiberta(sub.id, sub.liberta)}
                                  className={`text-[9px] sm:text-xs font-medium px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg flex-1 sm:flex-auto ${sub.liberta === "si"
                                    ? "bg-gradient-to-r from-red-500 to-rose-600 text-white hover:shadow-md"
                                    : "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-md"}`}
                                >
                                  {sub.liberta === "si" ? (
                                    <span className="flex items-center justify-center gap-0.5 sm:gap-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 sm:w-3 sm:h-3">
                                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                      </svg>
                                      <span className="truncate">Quitar Liberta</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center justify-center gap-0.5 sm:gap-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 sm:w-3 sm:h-3">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                                      </svg>
                                      <span className="truncate">Dar Liberta</span>
                                    </span>
                                  )}
                                </Button>

                                <div className="flex gap-1.5 sm:gap-2">
                                  <Button
                                    className="bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 rounded-md sm:rounded-lg p-1 sm:p-2 h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-3.5 sm:h-3.5">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"></path>
                                    </svg>
                                  </Button>

                                  <Button
                                    onClick={() => handleDeleteSubAccount(sub.id)}
                                    disabled={deletingId === sub.id}
                                    className="bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-md sm:rounded-lg p-1 sm:p-2 h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center"
                                  >
                                    {deletingId === sub.id ? (
                                      <div className="h-2.5 w-2.5 sm:h-4 sm:w-4 border-2 border-t-2 border-red-600 rounded-full animate-spin" />
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-3.5 sm:h-3.5">
                                        <path d="M3 6h18"></path>
                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                        <line x1="10" x2="10" y1="11" y2="17"></line>
                                        <line x1="14" x2="14" y1="11" y2="17"></line>
                                      </svg>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Activity Timeline - Mobile optimized */}
                      {subAccounts.length > 0 && (
                        <div className="mt-6 sm:mt-10">
                          <h3 className="text-base sm:text-lg font-bold text-sky-800 mb-3 sm:mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-600">
                              <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"></path>
                              <path d="M12 6v6l4 2"></path>
                            </svg>
                            Actividad Reciente
                          </h3>
                          <div className="bg-white rounded-xl border border-sky-100 p-3 sm:p-4 shadow-sm">
                            <div className="space-y-3 sm:space-y-4">
                              <div className="flex gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm sm:text-base text-gray-700">
                                    <span className="font-medium text-blue-700">Sistema</span> ha actualizado la lista de colaboradores
                                  </p>
                                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Hace unos momentos</p>
                                </div>
                              </div>

                              <div className="flex gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                                    <path d="m9 12 2 2 4-4"></path>
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm sm:text-base text-gray-700">
                                    <span className="font-medium text-green-700">{subAccounts.find(a => a.liberta === "si")?.name || "Un colaborador"}</span> ha recibido permisos de liberta
                                  </p>
                                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Hoy</p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 sm:mt-4 text-center">
                              <button className="text-xs sm:text-sm text-sky-600 hover:text-sky-800 font-medium">
                                Ver historial completo
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Revisiones ahora tienen su propia pestaña */}

                  <TabsContent value="analytics" className="space-y-6">
                    <Suspense fallback={<LoadingFallback />}>
                      <WebsiteManager initialTab="analytics" isAdmin={isAdmin} />
                    </Suspense>
                  </TabsContent>


                  <TabsContent value="revisiones" className="space-y-6">
                    <Card className="shadow-lg border-0">
                      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                        <CardTitle className="text-xl flex items-center gap-2 text-amber-800">
                          <Bell className="h-6 w-6 text-amber-600" />
                          Revisiones Pendientes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <Suspense fallback={<LoadingFallback />}>
                          <RevisionList />
                        </Suspense>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Manual de Ayuda - duplicado eliminado; ver primer TabsContent help-manual más arriba */}
                </>
              )}

              {/* Info tab - disponible para admin y subadmin */}
              <TabsContent value="info" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <InfoManager />
                </Suspense>
              </TabsContent>

              {/* Configuration tab - disponible para admin y subadmin */}
              <TabsContent value="configuration" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <CompanyConfiguration />
                </Suspense>
              </TabsContent>

              {/* Calendars tab - disponible para todos */}
              <TabsContent value="calendars" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <CalendarDashboard />
                </Suspense>
              </TabsContent>

              {/* Opportunities tab */}
              <TabsContent value="opportunities" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <OpportunitiesKanban />
                </Suspense>
              </TabsContent>

              {/* Modalities tab - disponible para todos */}
              <TabsContent value="modalities" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <ModalitiesManager />
                </Suspense>
              </TabsContent>

              {/* Marketing tab - disponible para todos */}
              <TabsContent value="marketing" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <MarketingManager />
                </Suspense>
              </TabsContent>

              {/* Media tab - disponible para todos */}
              <TabsContent value="media" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <MediaLibrary />
                </Suspense>
              </TabsContent>

              {/* Filters tab - disponible para admin y subadmin */}
              <TabsContent value="filters" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <FilterManager />
                </Suspense>
              </TabsContent>

              {/* WPP tab - disponible para admin y subadmin */}
              <TabsContent value="wpp" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <WppConfiguration />
                </Suspense>
              </TabsContent>

              {/* Mail Config tab */}
              <TabsContent value="mail-config" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <MailConfiguration />
                </Suspense>
              </TabsContent>

              {/* Pasarelas de Pago tab */}
              <TabsContent value="payment-gateways" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <PaymentGatewayManager />
                </Suspense>
              </TabsContent>

              <TabsContent value="contacts" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <ContactsManager />
                </Suspense>
              </TabsContent>

              {/* Sitio Web principal */}
              <TabsContent value="website" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <WebsiteManager initialTab="funnels" isAdmin={isAdmin} />
                </Suspense>
              </TabsContent>

              {/* Comments tab */}
              <TabsContent value="comments" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <WebsiteManager initialTab="comments" isAdmin={isAdmin} />
                </Suspense>
              </TabsContent>

              {/* Funnels tab */}
              <TabsContent value="funnels" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <WebsiteManager initialTab="funnels" isAdmin={isAdmin} />
                </Suspense>
              </TabsContent>

              {/* Sitios tab */}
              <TabsContent value="sitios" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <WebsiteManager initialTab="sitios" isAdmin={isAdmin} />
                </Suspense>
              </TabsContent>

              {/* SEO tab */}
              <TabsContent value="seo" className="space-y-6">
                <Suspense fallback={<LoadingFallback />}>
                  <WebsiteManager initialTab="seo" isAdmin={isAdmin} />
                </Suspense>
              </TabsContent>


              {/* Empleados - Nueva sección */}
              <TabsContent value="employees" className="space-y-6">
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                    <CardTitle className="text-xl flex items-center gap-2 text-blue-800">
                      <Briefcase className="h-6 w-6 text-blue-600" />
                      Gestión de Empleados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <Suspense fallback={<LoadingFallback />}>
                      <EmployeeManager />
                    </Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AI Assistant - disponible para todos (admin y subadmin) */}
              <TabsContent value="ai-assistant" className="m-0 p-0 border-none outline-none mt-0">
                <Suspense fallback={<LoadingFallback />}>
                  <AiAgentsDashboard />
                </Suspense>
              </TabsContent>

              {/* Mensajería (WhatsApp simulation and config) */}
              <TabsContent value="mensajeria" className="m-0 p-0 border-none outline-none mt-0">
                <Suspense fallback={<LoadingFallback />}>
                  <MessagingManager onNavigateToConfig={() => setActiveTab('wpp')} />
                </Suspense>
              </TabsContent>

              {/* Planes Avanzados (full-size view) */}
              <TabsContent value="planes" className="space-y-6 m-0 p-0 border-none outline-none mt-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-6 w-6 text-blue-600 animate-pulse" />
                      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Planes Avanzados Merco</h1>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      Escala tu negocio seleccionando uno de nuestros planes avanzados. Diseñados para potenciar tus ventas y automatizar la atención a tus clientes.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  {/* PLAN BASE */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Plan Base</span>
                      </div>
                      <div className="mt-4 flex items-baseline">
                        <span className="text-4xl font-extrabold text-slate-900">$50</span>
                        <span className="ml-1 text-xs text-slate-500">USD/mes</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                        Ideal para tiendas en crecimiento que quieren empezar a automatizar su atención.
                      </p>

                      <div className="h-[1px] w-full bg-slate-100 my-4" />

                      <ul className="space-y-3 text-xs text-slate-600 font-medium">
                        <li className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">✓</span>
                          Hasta 300 productos
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">✓</span>
                          1 Agente de IA básico
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">✓</span>
                          Conexión WhatsApp (Twilio)
                        </li>
                        <li className="flex items-center gap-2 text-slate-400 line-through">
                          <span className="w-4 h-4 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center font-bold text-[10px]">✕</span>
                          Entrenamiento de archivos (.pdf/.txt)
                        </li>
                      </ul>
                    </div>

                    <div className="mt-8">
                      <Button
                        onClick={() => {
                          toast({ title: "Plan Seleccionado", description: "Iniciando proceso de suscripción al Plan Base de $50 USD." });
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-lg"
                      >
                        Adquirir Plan Base
                      </Button>
                    </div>
                  </div>

                  {/* PLAN INTERMEDIO (Destacado) */}
                  <div className="bg-gradient-to-b from-blue-50/50 to-white rounded-xl border-2 border-blue-500 p-6 shadow-md hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
                    {/* Popular Badge */}
                    <div className="absolute top-0 right-0 bg-blue-505 text-white text-[10px] font-bold uppercase tracking-wider py-1.5 px-4 rounded-bl-lg" style={{ backgroundColor: '#2563eb' }}>
                      Recomendado
                    </div>

                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Plan Intermedio</span>
                      </div>
                      <div className="mt-4 flex items-baseline">
                        <span className="text-4xl font-extrabold text-slate-900">$120</span>
                        <span className="ml-1 text-xs text-slate-500">USD/mes</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                        Para negocios establecidos que requieren mayor capacidad y entrenamiento personalizado.
                      </p>

                      <div className="h-[1px] w-full bg-blue-100/50 my-4" />

                      <ul className="space-y-3 text-xs text-slate-600 font-medium">
                        <li className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-[10px]">✓</span>
                          Hasta 1,000 productos
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-[10px]">✓</span>
                          Agente de IA avanzado (Prompt Studio)
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-[10px]">✓</span>
                          Carga de manuales en Knowledge Base
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-[10px]">✓</span>
                          Soporte técnico prioritario
                        </li>
                      </ul>
                    </div>

                    <div className="mt-8">
                      <Button
                        onClick={() => {
                          toast({ title: "Plan Seleccionado", description: "Iniciando proceso de suscripción al Plan Intermedio de $120 USD." });
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-lg shadow-sm"
                      >
                        Adquirir Plan Intermedio
                      </Button>
                    </div>
                  </div>

                  {/* PLAN AVANZADO */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Plan Avanzado</span>
                      </div>
                      <div className="mt-4 flex items-baseline">
                        <span className="text-4xl font-extrabold text-slate-900">$500</span>
                        <span className="ml-1 text-xs text-slate-500">USD/mes</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                        Solución de alta escala para operaciones complejas con volumen de productos ilimitados.
                      </p>

                      <div className="h-[1px] w-full bg-slate-100 my-4" />

                      <ul className="space-y-3 text-xs text-slate-600 font-medium">
                        <li className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">✓</span>
                          Productos ilimitados
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">✓</span>
                          Agentes IA ilimitados + Canales ilimitados
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">✓</span>
                          Acceso completo a Voice AI (Beta)
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">✓</span>
                          Soporte dedicado 24/7 + SLA
                        </li>
                      </ul>
                    </div>

                    <div className="mt-8">
                      <Button
                        onClick={() => {
                          toast({ title: "Plan Seleccionado", description: "Iniciando proceso de suscripción al Plan Avanzado de $500 USD." });
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-lg"
                      >
                        Adquirir Plan Avanzado
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Ofertas Especiales - Si hay */}
            {ofertas.length > 0 && (
              <div className="mt-16 px-2 sm:px-0">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-lg">🔥</span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-orange-600">
                      Ofertas Especiales
                    </h2>
                  </div>
                  <Button
                    className="text-sm bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200"
                    variant="outline"
                  >
                    Ver todas
                  </Button>
                </div>

                {/* Scrollable horizontal en móvil, grid en escritorio */}
                <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div className="flex sm:grid overflow-x-auto pb-6 sm:pb-0 sm:overflow-x-visible sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 snap-x">
                    {ofertas.map((oferta) => (
                      <div
                        key={oferta.id}
                        className="bg-white rounded-xl shadow-lg p-4 sm:p-6 flex flex-col min-w-[280px] sm:min-w-0 border border-orange-100 snap-start hover:shadow-xl transition-shadow duration-300 relative overflow-hidden"
                      >
                        {/* Badge de oferta */}
                        <div className="absolute -right-10 top-5 bg-gradient-to-r from-orange-500 to-red-500 text-white px-12 py-1 transform rotate-45 text-xs font-medium">
                          Oferta
                        </div>

                        <div className="flex items-center mb-4">
                          <img src={oferta.image} alt={oferta.name} className="w-16 h-16 object-cover rounded-lg mr-4" />
                          <div>
                            <h3 className="text-base font-bold text-orange-700">{oferta.name}</h3>
                            <div className="flex items-center mt-1">
                              <span className="text-orange-600 font-medium mr-2">${oferta.price?.toLocaleString()}</span>
                              <span className="text-xs text-gray-400 line-through">${Math.round(oferta.price * 1.2).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{oferta.description}</p>

                        <div className="flex items-center mt-auto">
                          <Button size="sm" variant="outline" className="text-xs border-orange-200 text-orange-700 hover:bg-orange-50 flex-1">
                            Editar
                          </Button>
                          <Button size="sm" className="text-xs bg-gradient-to-r from-orange-500 to-red-500 ml-2 flex-1">
                            Ver detalles
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Indicador de scroll en móvil */}
                  <div className="mt-4 flex justify-center gap-1 sm:hidden">
                    {[...Array(Math.min(ofertas.length, 4))].map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-orange-200" />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Drawer Backdrop */}
      {showNotifications && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9998] transition-opacity duration-300 animate-in fade-in"
          onClick={() => setShowNotifications(false)}
        />
      )}

      {/* Notifications Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 h-screen w-full max-w-sm sm:max-w-md bg-white shadow-2xl z-[9999] flex flex-col transition-all duration-300 ease-in-out border-l border-slate-100",
          showNotifications ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-500" />
            Notificaciones
          </h2>
          <button
            onClick={() => setShowNotifications(false)}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-4 bg-slate-50/50">
          <button
            onClick={() => setActiveNotificationTab('sistema')}
            className={cn(
              "py-3 px-4 text-sm font-semibold relative transition-colors focus:outline-none flex items-center gap-1.5",
              activeNotificationTab === 'sistema' ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"
            )}
            type="button"
          >
            Sistema
            {systemNotifications.filter(n => !n.read).length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {systemNotifications.filter(n => !n.read).length}
              </span>
            )}
            {activeNotificationTab === 'sistema' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveNotificationTab('alertas')}
            className={cn(
              "py-3 px-4 text-sm font-semibold relative transition-colors focus:outline-none flex items-center gap-1.5",
              activeNotificationTab === 'alertas' ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"
            )}
            type="button"
          >
            Alertas
            {stockUnreadCount > 0 && (
              <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {stockUnreadCount}
              </span>
            )}
            {activeNotificationTab === 'alertas' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>

        {/* Sub-Header Actions */}
        <div className="p-3 border-b border-slate-50 flex items-center justify-between text-xs text-slate-500 px-4">
          <button
            onClick={() => {
              if (activeNotificationTab === 'sistema') {
                setSystemNotifications(prev => prev.map(n => ({ ...n, read: true })));
                toast({ title: "Notificaciones leídas", description: "Se marcaron todas las notificaciones del sistema como leídas." });
              } else {
                markAllAsRead();
                toast({ title: "Notificaciones leídas", description: "Se marcaron todas las alertas como leídas." });
              }
            }}
            className="hover:text-blue-600 underline font-medium"
            type="button"
          >
            Marcar todo como leído
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeNotificationTab === 'sistema' ? (
            systemNotifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-400">
                <Bell className="h-8 w-8 mb-2 opacity-30 animate-pulse" />
                <p className="text-sm">No se encontraron notificaciones</p>
              </div>
            ) : (
              systemNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    setSystemNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                  }}
                  className={cn(
                    "p-3 rounded-lg border transition-colors cursor-pointer relative group flex items-start gap-3",
                    n.read
                      ? "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                      : "bg-blue-50/40 border-blue-100 text-slate-800 hover:bg-blue-50/60"
                  )}
                >
                  <div className="text-lg mt-0.5 flex-shrink-0">
                    {n.type === 'success' ? '⚙️' : 'ℹ️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-2 flex items-center">
                      <CustomClock className="h-3 w-3 mr-1" />
                      {formatNotificationTime(n.timestamp)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSystemNotifications(prev => prev.filter(item => item.id !== n.id));
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded transition-all flex-shrink-0"
                    title="Eliminar"
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )
          ) : (
            stockNotifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-400">
                <Bell className="h-8 w-8 mb-2 opacity-30 animate-pulse" />
                <p className="text-sm">No se encontraron alertas</p>
              </div>
            ) : (
              stockNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 rounded-lg border transition-colors cursor-pointer relative group flex items-start gap-3",
                    notification.read
                      ? "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                      : "bg-blue-50/40 border-blue-100 text-slate-800 hover:bg-blue-50/60"
                  )}
                  onClick={() => {
                    markAsRead(notification.id);
                    setSelectedProductId(notification.productId);
                    setActiveTab('products');
                    setShowNotifications(false);
                  }}
                >
                  <div className="text-lg mt-0.5 flex-shrink-0">
                    {notification.type === 'out_of_stock' ? '🔴' : '⚠️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug">
                      {notification.type === 'out_of_stock'
                        ? `Agotado: ${notification.productName}`
                        : `Stock bajo: ${notification.productName}`
                      }
                    </p>
                    {notification.type !== 'out_of_stock' && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Quedan solo {notification.stock} unidades en inventario.
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-2 flex items-center">
                      <CustomClock className="h-3 w-3 mr-1" />
                      {formatNotificationTime(notification.timestamp)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded transition-all flex-shrink-0"
                    title="Eliminar"
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};
