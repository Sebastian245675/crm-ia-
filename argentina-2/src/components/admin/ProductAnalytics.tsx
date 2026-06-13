import React, { useEffect, useState } from 'react';
import './product-analytics.css'; // Importamos estilos personalizados
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, TrendingUp, TrendingDown, Download, BarChart3, LineChart, DollarSign, ShoppingBag, Calendar, Users } from 'lucide-react';
import {
  getMostViewedProducts,
  getLeastViewedProducts,
  getProductViewsTrend,
  getProductsViewsForExport,
  getProductVisitors,
  getDetailedViewEvents
} from '@/lib/product-analytics';
import { db, collection, getDocs, query, where, limit, orderBy } from '@/firebase';
const Timestamp = {
  fromDate: (date: Date) => ({ toDate: () => date }),
  now: () => ({ toDate: () => new Date() })
} as any;

// Interfaz para información del dispositivo
interface DeviceInfo {
  browser?: string;
  os?: string;
  device?: string;
  isMobile?: boolean;
}

// Interfaz para detalles de visitantes
interface Visitor {
  userId: string;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  isAnonymous?: boolean;
  lastSeen?: Date | string;
  totalVisits: number;
  firstVisit: Date | string;
  visits?: Array<{
    timestamp: Date;
    date: string;
    time: string;
    deviceInfo?: DeviceInfo;
  }>;
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
    isMobile?: boolean;
  };
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
}

// Interfaz para vistas de productos con detalle de visitantes
interface ViewEvent {
  id: string;
  timestamp: Date | string;
  userId: string;
  displayName?: string;
  email?: string;
  duration?: number; // en segundos
  source?: string; // de dónde vino (referrer)
  deviceType?: string;
  location?: string;
}

// Extendemos la interfaz de ProductAnalytics con todos los campos que necesitamos
interface ProductAnalytics {
  id: string;
  productName: string;
  totalViews: number;
  category?: string;
  firstViewed?: string | Date;
  lastViewed?: string | Date;
  averageViewsPerDay?: number;
  peakDay?: string;
  peakViews?: number;
  viewsByDay?: Record<string, number>;
  // Nuevos campos para análisis avanzado
  uniqueVisitors?: number;
  returningVisitors?: number;
  averageDuration?: number; // tiempo promedio en el producto
  conversionRate?: number; // porcentaje de vistas que resultaron en compra
  visitors?: Visitor[]; // detalles de los visitantes
  viewEvents?: ViewEvent[]; // historial detallado de vistas
}
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
// Paleta de colores premium para todo el componente
const themeColors = {
  primary: '#4f46e5',       // Indigo principal
  primaryLight: '#818cf8',  // Indigo claro
  secondary: '#0ea5e9',     // Sky
  accent: '#8b5cf6',        // Violeta
  success: '#10b981',       // Emerald
  warning: '#f59e0b',       // Amber
  danger: '#ef4444',        // Red
  info: '#3b82f6',          // Blue
  neutral: '#64748b',       // Slate
  neutralLight: '#f1f5f9',  // Slate light
};

// Colores para el pastel de productos con esquema de color coordinado
const pieColors = [
  themeColors.primary,
  themeColors.secondary,
  themeColors.accent,
  themeColors.success,
  themeColors.info,
  '#f472b6', // Pink
  '#a78bfa', // Violet lighter
  '#2dd4bf', // Teal
  '#fb923c', // Orange
  '#4ade80', // Green
  '#38bdf8', // Sky light
  '#94a3b8', // Slate
  '#c084fc', // Purple light
  '#fcd34d', // Amber light
  '#6366f1', // Indigo
  '#fb7185', // Rose
];

// Componente para gráfico de barras simple (usando divs) con animaciones y mejor diseño
const SimpleBarChart = ({ data }: { data: { name: string; value: number }[] }) => {
  const maxValue = Math.max(...data.map(item => item.value));

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1.5 group hover:bg-slate-50 p-1 -mx-1 rounded-lg transition-colors">
          <div className="flex justify-between text-xs">
            <div className="font-medium truncate w-36 md:w-48 flex items-center gap-2">
              <div
                className="h-2 w-2 md:h-3 md:w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: index % 2 === 0 ? themeColors.primary : themeColors.secondary }}
              ></div>
              <span className="truncate group-hover:text-slate-800">{item.name}</span>
            </div>
            <span className="text-muted-foreground group-hover:text-black/70 font-mono md:font-medium">{item.value}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 md:h-2.5 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out animate-slide-right"
              style={{
                width: `${maxValue ? (item.value / maxValue) * 100 : 0}%`,
                background: index % 2 === 0
                  ? `linear-gradient(90deg, ${themeColors.primary}, ${themeColors.primaryLight})`
                  : `linear-gradient(90deg, ${themeColors.secondary}, ${themeColors.info})`
              }}
            />
          </div>
          <div className="text-2xs text-slate-400 font-medium hidden group-hover:block transition-opacity">
            {((item.value / maxValue) * 100).toFixed(1)}% del máximo
          </div>
        </div>
      ))}
    </div>
  );
};

// Gráfico de tendencia tipo montaña (área) usando recharts
const SimpleTrendChart = ({ data }: { data: { date: string; views: number }[] }) => {
  // Formatear fechas para eje X
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  };
  return (
    <div className="h-52 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            fontSize={12}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            fontSize={12}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value}
          />
          <Tooltip
            formatter={(value: any) => [value, 'Vistas']}
            labelFormatter={formatShortDate}
            contentStyle={{
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              border: 'none',
              padding: '10px'
            }}
            itemStyle={{ color: '#4f46e5' }}
            cursor={{ stroke: '#4f46e5', strokeWidth: 1, strokeDasharray: '5 5' }}
          />
          <Area
            type="monotone"
            dataKey="views"
            stroke="#4f46e5"
            fill="url(#colorViews)"
            strokeWidth={3}
            dot={{ r: 0 }}
            activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2, fill: '#4f46e5' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};



interface ProductAnalyticsViewProps {
  products?: any[];
}

// No usamos datos simulados sino reales de Firebase

const getVisitorAnalytics = async (productId?: string, startDate?: string, endDate?: string) => {
  if (!productId) {
    console.error("Error: No se proporcionó ID de producto para obtener analíticas");
    return [];
  }

  try {
    console.log(`[getVisitorAnalytics] Obteniendo datos para producto: ${productId}`);
    console.log(`[getVisitorAnalytics] Rango de fechas: ${startDate || 'No definido'} hasta ${endDate || 'No definido'}`);

    // Verificar formato de producto ID
    if (productId.length < 5) {
      console.error(`[getVisitorAnalytics] ERROR: ID de producto inválido: ${productId}`);
      return [];
    }

    // Mejorar la conversión de fechas
    let startDateObj, endDateObj;

    if (startDate) {
      startDateObj = new Date(startDate);
      // Asegurar que la fecha de inicio sea el inicio del día
      startDateObj.setHours(0, 0, 0, 0);
      console.log(`[getVisitorAnalytics] Fecha de inicio ajustada: ${startDateObj.toISOString()}`);
    }

    if (endDate) {
      endDateObj = new Date(endDate);
      // Asegurar que la fecha final sea el final del día
      endDateObj.setHours(23, 59, 59, 999);
      console.log(`[getVisitorAnalytics] Fecha de fin ajustada: ${endDateObj.toISOString()}`);
    }

    // Comprobar si las fechas son válidas
    if (startDateObj && isNaN(startDateObj.getTime())) {
      console.error(`[getVisitorAnalytics] ERROR: Fecha de inicio inválida: ${startDate}`);
      startDateObj = undefined;
    }

    if (endDateObj && isNaN(endDateObj.getTime())) {
      console.error(`[getVisitorAnalytics] ERROR: Fecha de fin inválida: ${endDate}`);
      endDateObj = undefined;
    }

    // Usar la función real de la biblioteca para obtener visitantes
    console.log(`[getVisitorAnalytics] Llamando a getProductVisitors con fechas procesadas`);
    const visitors = await getProductVisitors(productId, startDateObj, endDateObj);
    console.log(`[getVisitorAnalytics] Visitantes encontrados: ${visitors.length}`);

    if (visitors.length === 0) {
      console.log(`[getVisitorAnalytics] No se encontraron visitantes para el producto ${productId} en el rango seleccionado`);
    } else {
      console.log(`[getVisitorAnalytics] Primer visitante: ${JSON.stringify(visitors[0])}`);
    }

    return visitors;
  } catch (error) {
    console.error("[getVisitorAnalytics] Error al obtener analíticas de visitantes:", error);
    return [];
  }
};

export const ProductAnalyticsView: React.FC<ProductAnalyticsViewProps> = ({ products }) => {
  const [mostViewed, setMostViewed] = useState<ProductAnalytics[]>([]);
  const [leastViewed, setLeastViewed] = useState<ProductAnalytics[]>([]);
  const [trend, setTrend] = useState<{ date: string; views: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [categoryData, setCategoryData] = useState<{ label: string; value: number }[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [chartDisplayMode, setChartDisplayMode] = useState<'count' | 'percent'>('count');

  // Estados para información avanzada de visitantes
  const [selectedProduct, setSelectedProduct] = useState<ProductAnalytics | null>(null);
  const [visitorData, setVisitorData] = useState<Visitor[]>([]);
  const [viewEvents, setViewEvents] = useState<ViewEvent[]>([]);
  const [showVisitorPanel, setShowVisitorPanel] = useState(false);
  const [isLoadingVisitors, setIsLoadingVisitors] = useState(false);
  const [visitorSearchQuery, setVisitorSearchQuery] = useState('');
  const [visitorAnalyticsTab, setVisitorAnalyticsTab] = useState<'overview' | 'visitors' | 'events'>('overview');

  // Estados para tabs principales y métricas de ventas
  const [mainTab, setMainTab] = useState<'general' | 'bought-together' | 'ranking' | 'audience'>('general');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { start, end };
  });
  const [salesData, setSalesData] = useState({ online: 0, others: 0, total: 0 });
  const [visitsData, setVisitsData] = useState(0);
  const [purchasedData, setPurchasedData] = useState({ online: 0, others: 0 });
  const [conversionRate, setConversionRate] = useState(0);
  const [salesTrend, setSalesTrend] = useState<{ date: string; sales: number }[]>([]);
  const [topCustomersByPrice, setTopCustomersByPrice] = useState<{ name: string; value: number }[]>([]);
  const [topCustomersByOrders, setTopCustomersByOrders] = useState<{ name: string; value: number }[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [additionalMetrics, setAdditionalMetrics] = useState({
    cartAbandonments: 0,
    productPacks: 0,
    inShoppingLists: 0,
    rankingByOrders: 0
  });

  // Función helper para obtener la fecha de inicio según el rango de tiempo seleccionado
  const getDateForTimeRange = (range: string): string => {
    const now = new Date();
    // Establece la hora a las 00:00:00 para incluir todo el día
    now.setHours(0, 0, 0, 0);

    switch (range) {
      case '7d':
        now.setDate(now.getDate() - 7);
        break;
      case '30d':
        now.setDate(now.getDate() - 30);
        break;
      case '90d':
        now.setDate(now.getDate() - 90);
        break;
      case '365d':
        now.setDate(now.getDate() - 365);
        break;
      default:
        now.setDate(now.getDate() - 30);
    }

    const isoString = now.toISOString();
    console.log(`Fecha de inicio para rango ${range}: ${isoString}`);
    return isoString;
  };

  // Función para obtener métricas de ventas
  const fetchSalesMetrics = async () => {
    console.log('[fetchSalesMetrics] Iniciando cálculo de métricas...', { dateRange });
    setLoadingMetrics(true);
    try {
      const isSupabase = typeof (db as any)?.from === 'function';
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);

      console.log('[fetchSalesMetrics] Rango de fechas:', { start: start.toISOString(), end: end.toISOString() });

      let orders: any[] = [];

      if (isSupabase) {
        const { data, error } = await db
          .from('orders')
          .select('*')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .eq('status', 'confirmed');
        if (error) throw error;
        orders = data || [];
      } else {
        const ordersQuery = query(
          collection(db, "orders"),
          where("status", "==", "confirmed"),
          where("createdAt", ">=", Timestamp.fromDate(start)),
          where("createdAt", "<=", Timestamp.fromDate(end))
        );
        const snapshot = await getDocs(ordersQuery);
        orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      // Calcular ventas
      let onlineSales = 0;
      let otherSales = 0;
      let totalPurchased = 0;
      const customerSales: Record<string, { price: number; orders: number; name: string }> = {};
      const dailySales: Record<string, number> = {};

      orders.forEach((order: any) => {
        const total = Number(order.total || 0);
        const orderType = order.orderType || 'physical';

        if (orderType === 'online' || orderType === 'physical') {
          onlineSales += total;
          totalPurchased++;
        } else {
          otherSales += total;
        }

        // Agregar a ventas diarias
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.created_at || order.createdAt);
        const dateKey = orderDate.toISOString().split('T')[0];
        dailySales[dateKey] = (dailySales[dateKey] || 0) + total;

        // Agregar a clientes
        const customerName = order.customerName || order.userName || 'Cliente Anónimo';
        if (!customerSales[customerName]) {
          customerSales[customerName] = { price: 0, orders: 0, name: customerName };
        }
        customerSales[customerName].price += total;
        customerSales[customerName].orders += 1;
      });

      console.log('[fetchSalesMetrics] Ventas calculadas:', { onlineSales, otherSales, totalPurchased, ordersCount: orders.length });

      setSalesData({ online: onlineSales, others: otherSales, total: onlineSales + otherSales });
      setPurchasedData({ online: totalPurchased, others: 0 });

      // Obtener todas las vistas de productos en el rango de fechas
      let totalViews = 0;
      try {
        const isSupabase = typeof (db as any)?.from === 'function';
        if (isSupabase) {
          try {
            const { data: viewsData, error: viewsError } = await db
              .from('product_views')
              .select('id')
              .gte('timestamp', start.toISOString())
              .lte('timestamp', end.toISOString());
            if (!viewsError && viewsData) {
              totalViews = viewsData.length;
            }
          } catch (viewsError) {
            console.warn("Error al obtener visitas desde product_views, intentando product_analytics:", viewsError);
            // Fallback: sumar total_views de product_analytics en el rango
            try {
              const { data: analyticsData } = await db
                .from('product_analytics')
                .select('total_views, views_by_day');
              if (analyticsData) {
                // Sumar vistas del rango de fechas desde views_by_day
                analyticsData.forEach((item: any) => {
                  const viewsByDay = item.views_by_day || {};
                  Object.keys(viewsByDay).forEach(day => {
                    const dayDate = new Date(day);
                    if (dayDate >= start && dayDate <= end) {
                      totalViews += viewsByDay[day] || 0;
                    }
                  });
                });
              }
            } catch (analyticsError) {
              console.warn("Error al obtener visitas desde product_analytics:", analyticsError);
            }
          }
        } else {
          const viewsQuery = query(
            collection(db, "productViews"),
            where("timestamp", ">=", Timestamp.fromDate(start)),
            where("timestamp", "<=", Timestamp.fromDate(end))
          );
          const viewsSnapshot = await getDocs(viewsQuery);
          totalViews = viewsSnapshot.size;
        }
      } catch (error) {
        console.error("Error al obtener visitas:", error);
        // Fallback: usar suma de vistas de productos más vistos
        totalViews = mostViewed.reduce((sum, p) => sum + (p.totalViews || 0), 0);
      }

      console.log('[fetchSalesMetrics] Visitas totales:', totalViews);
      setVisitsData(totalViews);

      // Calcular ratio de conversión
      const conversion = totalViews > 0 ? (totalPurchased / totalViews) * 100 : 0;
      console.log('[fetchSalesMetrics] Ratio de conversión:', conversion);
      setConversionRate(conversion);

      // Calcular abandonos de cesta (carts que no se convirtieron en pedidos)
      let cartAbandonments = 0;
      try {
        const isSupabase = typeof (db as any)?.from === 'function';
        if (isSupabase) {
          // Intentar obtener carritos abandonados
          const { data: cartsData } = await db
            .from('carts')
            .select('*')
            .gte('updated_at', start.toISOString())
            .lte('updated_at', end.toISOString());

          if (cartsData) {
            // Contar carritos que no tienen pedido asociado
            const cartIds = new Set(cartsData.map((c: any) => c.id));
            const orderCartIds = new Set(orders.map((o: any) => o.cartId || o.cart_id));
            cartAbandonments = Array.from(cartIds).filter(id => !orderCartIds.has(id)).length;
          }
        } else {
          try {
            const cartsQuery = query(
              collection(db, "carts"),
              where("updatedAt", ">=", Timestamp.fromDate(start)),
              where("updatedAt", "<=", Timestamp.fromDate(end))
            );
            const cartsSnapshot = await getDocs(cartsQuery);
            const cartIds = new Set(cartsSnapshot.docs.map(doc => doc.id));
            const orderCartIds = new Set(orders.map((o: any) => o.cartId));
            cartAbandonments = Array.from(cartIds).filter(id => !orderCartIds.has(id)).length;
          } catch {
            // Si no existe la colección carts, usar 0
            cartAbandonments = 0;
          }
        }
      } catch (error) {
        console.error("Error al calcular abandonos de cesta:", error);
        cartAbandonments = 0;
      }

      // Calcular packs de productos (pedidos con múltiples productos)
      const productPacks = orders.filter((order: any) => {
        const items = order.items || order.products || [];
        return items.length > 1;
      }).length;

      // Calcular productos en listas de compra/deseos
      let inShoppingLists = 0;
      try {
        const isSupabase = typeof (db as any)?.from === 'function';
        if (isSupabase) {
          const { data: wishlistsData } = await db
            .from('wishlists')
            .select('*')
            .gte('updated_at', start.toISOString())
            .lte('updated_at', end.toISOString());
          if (wishlistsData) {
            inShoppingLists = wishlistsData.reduce((sum: number, w: any) => {
              return sum + (w.items?.length || w.products?.length || 0);
            }, 0);
          }
        } else {
          try {
            const wishlistsQuery = query(
              collection(db, "wishlists"),
              where("updatedAt", ">=", Timestamp.fromDate(start)),
              where("updatedAt", "<=", Timestamp.fromDate(end))
            );
            const wishlistsSnapshot = await getDocs(wishlistsQuery);
            inShoppingLists = wishlistsSnapshot.docs.reduce((sum, doc) => {
              const data = doc.data();
              return sum + (data.items?.length || data.products?.length || 0);
            }, 0);
          } catch {
            inShoppingLists = 0;
          }
        }
      } catch (error) {
        console.error("Error al calcular listas de compra:", error);
        inShoppingLists = 0;
      }

      // Calcular ranking por pedidos (porcentaje de pedidos que incluyen productos vs total de pedidos)
      let rankingByOrders = 0;
      if (orders.length > 0) {
        // Contar cuántos pedidos tienen productos (no están vacíos)
        const ordersWithProducts = orders.filter((order: any) => {
          const items = order.items || order.products || [];
          return items && items.length > 0;
        }).length;

        // Calcular el porcentaje de pedidos con productos
        rankingByOrders = orders.length > 0 ? (ordersWithProducts / orders.length) * 100 : 0;
      }

      setAdditionalMetrics({
        cartAbandonments,
        productPacks,
        inShoppingLists,
        rankingByOrders
      });

      // Preparar datos de tendencia de ventas
      const trendData = Object.entries(dailySales)
        .map(([date, sales]) => ({ date, sales }))
        .sort((a, b) => a.date.localeCompare(b.date));
      setSalesTrend(trendData);

      // Top 6 clientes por precio
      const topByPrice = Object.values(customerSales)
        .sort((a, b) => b.price - a.price)
        .slice(0, 6)
        .map(c => ({ name: c.name, value: c.price }));
      setTopCustomersByPrice(topByPrice);

      // Top 6 clientes por número de pedidos
      const topByOrders = Object.values(customerSales)
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 6)
        .map(c => ({ name: c.name, value: c.orders }));
      setTopCustomersByOrders(topByOrders);
    } catch (error) {
      console.error("Error al cargar métricas de ventas:", error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [mostData, leastData, trendData] = await Promise.all([
          getMostViewedProducts(100),
          getLeastViewedProducts(100),
          getProductViewsTrend()
        ]);

        setMostViewed(mostData);
        setLeastViewed(leastData);
        setTrend(trendData);

        // Calcular distribución por categoría
        const catMap: Record<string, number> = {};
        mostData.forEach((p: any) => {
          const cat = (p.category || 'Sin categoría').toString();
          catMap[cat] = (catMap[cat] || 0) + (p.totalViews || 0);
        });
        setCategoryData(Object.entries(catMap).map(([label, value]) => ({ label, value })));
      } catch (error) {
        console.error("Error al cargar datos de análisis:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Cargar métricas de ventas cuando cambia el rango de fechas o cuando se cargan los productos
  useEffect(() => {
    console.log('[ProductAnalytics] Efecto trigger:', { mostViewedLength: mostViewed.length, dateRange });
    if (!isLoading && mostViewed.length >= 0) {
      console.log('[ProductAnalytics] Llamando fetchSalesMetrics...');
      fetchSalesMetrics();
    }
  }, [dateRange, isLoading, mostViewed.length]);

  // Cargar datos de visitantes cuando se selecciona un producto
  useEffect(() => {
    const loadVisitorData = async () => {
      if (!selectedProduct) {
        setVisitorData([]);
        setViewEvents([]);
        return;
      }

      console.log(`[loadVisitorData] Iniciando carga para producto: ID=${selectedProduct.id}, Nombre=${selectedProduct.productName}`);
      setIsLoadingVisitors(true);

      try {
        // Verificar que tenemos un ID de producto válido
        if (!selectedProduct.id) {
          console.error("[loadVisitorData] ERROR: ID de producto no válido");
          setIsLoadingVisitors(false);
          return;
        }

        // Obtener datos de visitantes y eventos para el producto seleccionado
        const startDate = getDateForTimeRange(timeRange);
        const endDate = new Date().toISOString();

        console.log(`[loadVisitorData] Período: ${timeRange}, fechas: ${startDate} hasta ${endDate}`);

        // DIAGNÓSTICO: Consultar primero si hay registros para este producto sin filtrar por fecha
        console.log(`[loadVisitorData] DIAGNÓSTICO: Verificando existencia de registros para producto ${selectedProduct.id}`);

        try {
          // Intentar obtener datos reales secuencialmente para mejor diagnóstico
          console.log(`[loadVisitorData] Obteniendo datos de visitantes...`);
          const visitors = await getVisitorAnalytics(selectedProduct.id, startDate, endDate);
          console.log(`[loadVisitorData] Obteniendo datos de eventos...`);
          const events = await getDetailedViewEvents(selectedProduct.id, startDate, endDate);

          console.log(`[loadVisitorData] Resultados: ${visitors.length} visitantes, ${events.length} eventos`);

          // Actualizar estado de la UI
          setVisitorData(visitors);
          setViewEvents(events);

          if (visitors.length === 0 && events.length === 0) {
            console.log(`[loadVisitorData] No se encontraron datos para este producto y período`);

            // DIAGNÓSTICO: Intentar con una consulta más amplia para verificar si hay datos en general
            try {
              const testQuery = query(
                collection(db, "productViews"),
                where("productId", "==", selectedProduct.id),
                limit(1)
              );
              const testSnapshot = await getDocs(testQuery);
              console.log(`[loadVisitorData] DIAGNÓSTICO: Existen ${testSnapshot.size} registros en total para este producto`);

              if (testSnapshot.size > 0) {
                const sampleDoc = testSnapshot.docs[0].data();
                console.log(`[loadVisitorData] Ejemplo de registro: ${JSON.stringify(sampleDoc)}`);
              }
            } catch (testError) {
              console.error("[loadVisitorData] Error en diagnóstico:", testError);
            }
          }
        } catch (fetchError) {
          console.error("[loadVisitorData] Error al cargar datos:", fetchError);
          setVisitorData([]);
          setViewEvents([]);
        }
      } catch (error) {
        console.error("[loadVisitorData] Error general:", error);
      } finally {
        setIsLoadingVisitors(false);
      }
    };

    loadVisitorData();
  }, [selectedProduct, timeRange]);

  // Filtrar visitantes por consulta de búsqueda
  const filteredVisitors = visitorData.filter(visitor => {
    if (!visitorSearchQuery) return true;
    const query = visitorSearchQuery.toLowerCase();
    return (
      visitor.displayName?.toLowerCase().includes(query) ||
      visitor.email?.toLowerCase().includes(query) ||
      visitor.userId.toLowerCase().includes(query) ||
      visitor.location?.country?.toLowerCase().includes(query) ||
      visitor.location?.city?.toLowerCase().includes(query) ||
      visitor.deviceInfo?.browser?.toLowerCase().includes(query) ||
      visitor.deviceInfo?.os?.toLowerCase().includes(query)
    );
  });

  // Filtrar eventos por consulta de búsqueda
  const filteredEvents = viewEvents.filter(event => {
    if (!visitorSearchQuery) return true;
    const query = visitorSearchQuery.toLowerCase();
    return (
      event.displayName?.toLowerCase().includes(query) ||
      event.email?.toLowerCase().includes(query) ||
      event.userId.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query) ||
      event.source?.toLowerCase().includes(query) ||
      event.deviceType?.toLowerCase().includes(query)
    );
  });

  // Calcular métricas para el panel de visitantes
  const visitorMetrics = React.useMemo(() => {
    if (!visitorData.length) return null;

    // Dispositivos
    const devices: Record<string, number> = {};
    visitorData.forEach(v => {
      const deviceType = v.deviceInfo?.device || 'Desconocido';
      devices[deviceType] = (devices[deviceType] || 0) + 1;
    });

    // Navegadores
    const browsers: Record<string, number> = {};
    visitorData.forEach(v => {
      const browser = v.deviceInfo?.browser || 'Desconocido';
      browsers[browser] = (browsers[browser] || 0) + 1;
    });

    // Sistemas operativos
    const operatingSystems: Record<string, number> = {};
    visitorData.forEach(v => {
      const os = v.deviceInfo?.os || 'Desconocido';
      operatingSystems[os] = (operatingSystems[os] || 0) + 1;
    });

    // Países
    const countries: Record<string, number> = {};
    visitorData.forEach(v => {
      const country = v.location?.country || 'Desconocido';
      countries[country] = (countries[country] || 0) + 1;
    });

    // Calcular promedio de visitas por usuario
    const totalVisits = visitorData.reduce((sum, v) => sum + v.totalVisits, 0);
    const avgVisitsPerUser = totalVisits / visitorData.length;

    // Calcular promedio de tiempo en el producto (en segundos)
    let totalDuration = 0;
    let eventCount = 0;
    viewEvents.forEach(e => {
      if (e.duration) {
        totalDuration += e.duration;
        eventCount++;
      }
    });
    const avgDuration = eventCount ? totalDuration / eventCount : 0;

    return {
      totalUniqueVisitors: visitorData.length,
      avgVisitsPerUser,
      avgDuration,
      devices: Object.entries(devices).map(([label, value]) => ({ label, value })),
      browsers: Object.entries(browsers).map(([label, value]) => ({ label, value })),
      operatingSystems: Object.entries(operatingSystems).map(([label, value]) => ({ label, value })),
      countries: Object.entries(countries).map(([label, value]) => ({ label, value })),
    };
  }, [visitorData, viewEvents]);

  // Función para formatear fechas en formato legible
  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Función para formatear duración en formato legible
  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds} seg`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Manejar la selección de un producto para ver su detalle
  const handleSelectProduct = (product: ProductAnalytics) => {
    console.log(`Seleccionando producto para análisis: ${product.id} - ${product.productName}`);
    setSelectedProduct(product);
    setShowVisitorPanel(true);
    // No cargar datos simulados, el efecto useEffect se encargará de cargar los datos reales
  };

  // Manejar cierre del panel de detalles de visitantes
  const handleCloseVisitorPanel = () => {
    setShowVisitorPanel(false);
    setTimeout(() => {
      setSelectedProduct(null);
    }, 300); // Dar tiempo para la animación de cierre
  };

  // Exportar a Excel
  const handleExport = async () => {
    try {
      const productsData = await getProductsViewsForExport();

      // Crear libro y hoja
      const wb = XLSX.utils.book_new();

      // Exportar datos generales
      const wsData = productsData.map(p => ({
        'ID Producto': p.id,
        'Nombre': p.productName,
        'Total Vistas': p.totalViews,
        'Promedio Vistas/Día': p.averageViewsPerDay,
        'Primera Vista': p.firstViewed,
        'Última Vista': p.lastViewed,
        'Día con más vistas': p.peakDay,
        'Vistas en pico': p.peakViews
      }));

      const ws = XLSX.utils.json_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "Resumen Productos");

      // Exportar tendencia diaria (otra hoja)
      const allDates = new Set<string>();
      productsData.forEach(p => {
        if (p.viewsByDay) {
          Object.keys(p.viewsByDay).forEach(date => allDates.add(date));
        }
      });

      const sortedDates = Array.from(allDates).sort();
      const trendData: any[] = [];

      // Cabecera
      const trendHeader: any = { Fecha: 'Fecha' };
      productsData.forEach(p => {
        trendHeader[p.id] = p.productName;
      });
      trendData.push(trendHeader);

      // Datos por día
      sortedDates.forEach(date => {
        const row: any = { Fecha: date };
        productsData.forEach(p => {
          row[p.id] = p.viewsByDay?.[date] || 0;
        });
        trendData.push(row);
      });

      const wsTrend = XLSX.utils.json_to_sheet(trendData);
      XLSX.utils.book_append_sheet(wb, wsTrend, "Tendencia Diaria");

      // Si hay datos de visitantes para el producto seleccionado, también los exportamos
      if (selectedProduct && visitorData.length > 0) {
        const visitorSheetData = visitorData.map(v => ({
          'ID Usuario': v.userId,
          'Nombre': v.displayName || 'N/A',
          'Email': v.email || 'N/A',
          'Total Visitas': v.totalVisits,
          'Primera Visita': formatDate(v.firstVisit),
          'Última Visita': formatDate(v.lastSeen || ''),
          'Navegador': v.deviceInfo?.browser || 'N/A',
          'Sistema Operativo': v.deviceInfo?.os || 'N/A',
          'Dispositivo': v.deviceInfo?.device || 'N/A',
          'Móvil': v.deviceInfo?.isMobile ? 'Sí' : 'No',
          'País': v.location?.country || 'N/A',
          'Ciudad': v.location?.city || 'N/A',
          'Región': v.location?.region || 'N/A'
        }));

        const visitorSheet = XLSX.utils.json_to_sheet(visitorSheetData);
        XLSX.utils.book_append_sheet(wb, visitorSheet, "Visitantes");

        // También exportar eventos detallados
        const eventsSheetData = viewEvents.map(e => ({
          'ID Evento': e.id,
          'Fecha y Hora': formatDate(e.timestamp),
          'ID Usuario': e.userId,
          'Usuario': e.displayName || 'N/A',
          'Email': e.email || 'N/A',
          'Duración (seg)': e.duration || 'N/A',
          'Origen': e.source || 'N/A',
          'Dispositivo': e.deviceType || 'N/A',
          'Ubicación': e.location || 'N/A'
        }));

        const eventsSheet = XLSX.utils.json_to_sheet(eventsSheetData);
        XLSX.utils.book_append_sheet(wb, eventsSheet, "Eventos Detallados");
      }

      // Descargar
      XLSX.writeFile(wb, `Análisis_Productos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error("Error al exportar datos:", error);
    }
  };

  // Componente para el panel detallado de visitantes
  const VisitorDetailsPanel = () => {
    if (!selectedProduct) return null;

    return (
      <div className={`fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex justify-end transition-opacity duration-300 ${showVisitorPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div
          className={`bg-white dark:bg-slate-900 shadow-2xl w-full md:max-w-[800px] overflow-auto transform transition-transform duration-300 ${showVisitorPanel ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 shadow-md border-b p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-800/30">
                    <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Análisis de Visitantes
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedProduct.productName}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCloseVisitorPanel}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span className="sr-only">Cerrar</span>
              </Button>
            </div>

            <Tabs
              value={visitorAnalyticsTab}
              onValueChange={(value) => setVisitorAnalyticsTab(value as any)}
              className="mt-4"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Resumen</TabsTrigger>
                <TabsTrigger value="visitors">Visitantes</TabsTrigger>
                <TabsTrigger value="events">Eventos</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Select
                  value={timeRange}
                  onValueChange={(value) => {
                    console.log(`Cambiando rango de tiempo a: ${value}`);
                    setTimeRange(value);
                    // El useEffect se encargará de recargar los datos reales
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Periodo de tiempo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Últimos 7 días</SelectItem>
                    <SelectItem value="30d">Últimos 30 días</SelectItem>
                    <SelectItem value="90d">Últimos 90 días</SelectItem>
                    <SelectItem value="365d">Último año</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={handleExport} className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  <span className="hidden md:inline">Exportar</span>
                </Button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar visitantes..."
                  className="border rounded-lg px-3 py-1 text-sm w-32 md:w-48"
                  value={visitorSearchQuery}
                  onChange={(e) => setVisitorSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {isLoadingVisitors ? (
              <div className="flex justify-center items-center h-60">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <Tabs value={visitorAnalyticsTab}>
                <TabsContent value="overview" className="mt-4 space-y-6">
                  {visitorMetrics ? (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl md:text-3xl font-bold">{visitorMetrics.totalUniqueVisitors}</div>
                            <p className="text-sm text-muted-foreground">Visitantes Únicos</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl md:text-3xl font-bold">{visitorMetrics.avgVisitsPerUser.toFixed(1)}</div>
                            <p className="text-sm text-muted-foreground">Visitas Promedio</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl md:text-3xl font-bold">{formatDuration(Math.round(visitorMetrics.avgDuration))}</div>
                            <p className="text-sm text-muted-foreground">Tiempo Promedio</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl md:text-3xl font-bold">{viewEvents.length}</div>
                            <p className="text-sm text-muted-foreground">Total Eventos</p>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Distribución por Dispositivo</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <SimpleBarChart data={visitorMetrics.devices.map(item => ({
                              name: item.label,
                              value: item.value
                            }))} />
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Distribución por Navegador</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <SimpleBarChart data={visitorMetrics.browsers.map(item => ({
                              name: item.label,
                              value: item.value
                            }))} />
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Distribución por Sistema</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <SimpleBarChart data={visitorMetrics.operatingSystems.map(item => ({
                              name: item.label,
                              value: item.value
                            }))} />
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Distribución por País</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <SimpleBarChart data={visitorMetrics.countries.map(item => ({
                              name: item.label,
                              value: item.value
                            }))} />
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-8 flex flex-col items-center">
                      <Eye className="h-10 w-10 text-slate-300 mb-3" />
                      <p className="text-muted-foreground font-medium">
                        No se encontraron datos de visitantes.
                      </p>
                      <p className="text-sm text-slate-500 mt-2 max-w-md">
                        No hay registros de visitantes para este producto en el período seleccionado ({timeRange === '7d' ? 'últimos 7 días' :
                          timeRange === '30d' ? 'últimos 30 días' :
                            timeRange === '90d' ? 'últimos 90 días' : 'último año'}).
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        Posibles razones:
                        <ul className="text-left mt-1 list-disc pl-5">
                          <li>No se ha registrado ninguna visita en este período</li>
                          <li>Las visitas no se están registrando correctamente</li>
                          <li>El producto es nuevo o tiene poca visibilidad</li>
                        </ul>
                      </p>
                      <div className="flex gap-3 mt-4">
                        <Button
                          variant="outline"
                          className="text-sm text-indigo-600"
                          onClick={() => {
                            // Recargar datos reales con otro rango de tiempo
                            const timeRanges = ['7d', '30d', '90d', '365d'];
                            const currentIndex = timeRanges.indexOf(timeRange);
                            const nextRange = timeRanges[(currentIndex + 1) % timeRanges.length];
                            console.log(`Cambiando rango de tiempo a: ${nextRange}`);
                            setTimeRange(nextRange);
                          }}
                        >
                          Probar con otro período
                        </Button>
                        <Button
                          variant="default"
                          className="text-sm bg-indigo-600"
                          onClick={() => {
                            // Recargar datos reales
                            const startDate = getDateForTimeRange(timeRange);
                            const endDate = new Date().toISOString();
                            setIsLoadingVisitors(true);

                            Promise.all([
                              getVisitorAnalytics(selectedProduct?.id, startDate, endDate),
                              getDetailedViewEvents(selectedProduct?.id, startDate, endDate)
                            ]).then(([visitors, events]) => {
                              setVisitorData(visitors);
                              setViewEvents(events);
                              setIsLoadingVisitors(false);
                            }).catch(error => {
                              console.error("Error al recargar datos:", error);
                              setIsLoadingVisitors(false);
                            });
                          }}
                        >
                          Reintentar carga
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="visitors" className="mt-4">
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Usuario</TableHead>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Visitas</TableHead>
                              <TableHead>Última Visita</TableHead>
                              <TableHead>Dispositivo</TableHead>
                              <TableHead>Ubicación</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredVisitors.length ? (
                              filteredVisitors.map((visitor) => (
                                <TableRow key={visitor.userId}>
                                  <TableCell>
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                                      {visitor.avatarUrl ? (
                                        <img src={visitor.avatarUrl} alt={visitor.displayName || 'Usuario'} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-xs font-medium">{(visitor.displayName || 'U').charAt(0)}</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {visitor.isAnonymous ? (
                                      <span className="flex items-center">
                                        <span className="mr-1.5">Anónimo</span>
                                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600">No identificado</span>
                                      </span>
                                    ) : (
                                      <span className="flex items-center">
                                        <span className="mr-1.5">{visitor.displayName || 'Usuario'}</span>
                                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">Registrado</span>
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {visitor.email ? (
                                      <span className="text-blue-600 font-medium">{visitor.email}</span>
                                    ) : (
                                      <span className="text-gray-400 italic">No disponible</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <span className="font-medium">{visitor.totalVisits}</span>
                                    {visitor.visits && visitor.visits.length > 0 && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Última: {visitor.visits[0].date} {visitor.visits[0].time}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>{formatDate(visitor.lastSeen || visitor.firstVisit)}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">
                                        {visitor.deviceInfo?.browser || 'N/A'}
                                      </span>
                                      <span className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">
                                        {visitor.deviceInfo?.device || 'N/A'}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{visitor.location?.country || 'N/A'}{visitor.location?.city ? `, ${visitor.location.city}` : ''}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={7}>
                                  <div className="text-center py-10 flex flex-col items-center">
                                    <Eye className="h-8 w-8 text-slate-300 mb-2" />
                                    <p className="text-muted-foreground font-medium">
                                      {visitorSearchQuery
                                        ? 'No se encontraron visitantes que coincidan con la búsqueda.'
                                        : 'No hay datos de visitantes disponibles.'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-2 max-w-md">
                                      {visitorSearchQuery
                                        ? 'Prueba con otra búsqueda o elimina los filtros aplicados.'
                                        : `No hay registros de visitantes para este producto en el período seleccionado (${timeRange === '7d' ? 'últimos 7 días' :
                                          timeRange === '30d' ? 'últimos 30 días' :
                                            timeRange === '90d' ? 'últimos 90 días' : 'último año'
                                        }).`}
                                    </p>
                                    <Button
                                      variant="outline"
                                      className="mt-4 text-xs text-indigo-600"
                                      onClick={() => {
                                        if (visitorSearchQuery) {
                                          setVisitorSearchQuery('');
                                        } else {
                                          // Recargar datos reales con otro rango de tiempo
                                          const timeRanges = ['7d', '30d', '90d', '365d'];
                                          const currentIndex = timeRanges.indexOf(timeRange);
                                          const nextRange = timeRanges[(currentIndex + 1) % timeRanges.length];
                                          console.log(`Cambiando rango de tiempo a: ${nextRange}`);
                                          setTimeRange(nextRange);
                                        }
                                      }}
                                    >
                                      {visitorSearchQuery ? 'Limpiar búsqueda' : 'Probar con otro período'}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="events" className="mt-4">
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha/Hora</TableHead>
                              <TableHead>Usuario</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Dispositivo</TableHead>
                              <TableHead>Sistema</TableHead>
                              <TableHead>Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {visitorData.flatMap(visitor =>
                              (visitor.visits || []).map((visit, index) => (
                                <TableRow key={`${visitor.userId}-${index}`}>
                                  <TableCell>
                                    <div className="font-medium">{visit.date}</div>
                                    <div className="text-xs text-gray-500">{visit.time}</div>
                                  </TableCell>
                                  <TableCell>
                                    {visitor.isAnonymous ? (
                                      <span className="text-gray-500 flex items-center gap-1">
                                        Anónimo
                                        <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                                      </span>
                                    ) : (
                                      <span className="font-medium">{visitor.displayName || 'Usuario'}</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {visitor.email ? (
                                      <span className="text-blue-600">{visitor.email}</span>
                                    ) : (
                                      <span className="text-gray-400 italic">No disponible</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">
                                        {visit.deviceInfo?.device || 'Desconocido'}
                                      </span>
                                      {visit.deviceInfo?.isMobile && (
                                        <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">Móvil</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">
                                        {visit.deviceInfo?.browser || 'Desconocido'}
                                      </span>
                                      <span className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">
                                        {visit.deviceInfo?.os || 'Desconocido'}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                                        Completada
                                      </span>
                                      {visitor.isAnonymous ? (
                                        <span className="text-xs text-gray-500 mt-1">Visitante anónimo</span>
                                      ) : (
                                        <span className="text-xs text-indigo-600 mt-1">Usuario registrado</span>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                            {!visitorData.some(v => v.visits && v.visits.length > 0) && (
                              <TableRow>
                                <TableCell colSpan={6}>
                                  <div className="text-center py-10 flex flex-col items-center">
                                    <LineChart className="h-8 w-8 text-slate-300 mb-2" />
                                    <p className="text-muted-foreground font-medium">
                                      {visitorSearchQuery
                                        ? 'No se encontraron eventos que coincidan con la búsqueda.'
                                        : 'No hay datos de eventos disponibles.'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-2 max-w-md">
                                      {visitorSearchQuery
                                        ? 'Prueba con otra búsqueda o elimina los filtros aplicados.'
                                        : `No hay registros de eventos para este producto en el período seleccionado (${timeRange === '7d' ? 'últimos 7 días' :
                                          timeRange === '30d' ? 'últimos 30 días' :
                                            timeRange === '90d' ? 'últimos 90 días' : 'último año'
                                        }).`}
                                    </p>
                                    <Button
                                      variant="outline"
                                      className="mt-4 text-xs text-indigo-600"
                                      onClick={() => {
                                        if (visitorSearchQuery) {
                                          setVisitorSearchQuery('');
                                        } else {
                                          // Recargar datos reales con otro rango de tiempo
                                          const timeRanges = ['7d', '30d', '90d', '365d'];
                                          const currentIndex = timeRanges.indexOf(timeRange);
                                          const nextRange = timeRanges[(currentIndex + 1) % timeRanges.length];
                                          console.log(`Cambiando rango de tiempo a: ${nextRange}`);
                                          setTimeRange(nextRange);
                                        }
                                      }}
                                    >
                                      {visitorSearchQuery ? 'Limpiar búsqueda' : 'Probar con otro período'}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Formatear fecha para el selector
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    const newDate = new Date(value);
    if (type === 'start') {
      setDateRange({ ...dateRange, start: newDate });
    } else {
      setDateRange({ ...dateRange, end: newDate });
    }
  };

  return (
    <div className="space-y-6 pb-12 bg-white rounded-lg shadow-sm">
      {/* Header con título y selector de fechas - Estilo AdminLTE */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800">
              ESTADÍSTICAS DE PRODUCTO
            </h2>
          </div>

          {/* Selector de rango de fechas - Estilo AdminLTE */}
          <div className="flex items-center gap-2">
            <Select
              defaultValue="7d"
              onValueChange={(value) => {
                const end = new Date();
                const start = new Date();
                const days = value === '7d' ? 7 : value === '30d' ? 30 : value === '90d' ? 90 : 365;
                start.setDate(start.getDate() - days);
                setDateRange({ start, end });
              }}
            >
              <SelectTrigger className="w-[140px] h-9 border-gray-300">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 días</SelectItem>
                <SelectItem value="30d">Últimos 30 días</SelectItem>
                <SelectItem value="90d">Últimos 90 días</SelectItem>
                <SelectItem value="365d">Último año</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm text-gray-700 bg-white border border-gray-300 rounded px-2 py-1">
              <Calendar className="h-4 w-4 text-gray-500" />
              <input
                type="date"
                value={formatDateForInput(dateRange.start)}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="border-0 outline-none text-sm w-28"
              />
              <span className="text-gray-500">al</span>
              <input
                type="date"
                value={formatDateForInput(dateRange.end)}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="border-0 outline-none text-sm w-28"
              />
            </div>
            <Button
              size="sm"
              onClick={() => fetchSalesMetrics()}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
            >
              OK
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs principales - Estilo AdminLTE */}
      <div className="bg-white border-b border-gray-200 px-6">
        <Tabs value={mainTab} onValueChange={(value) => setMainTab(value as any)}>
          <TabsList className="bg-transparent border-b border-gray-200 h-auto p-0">
            <TabsTrigger
              value="general"
              className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent rounded-none"
            >
              GENERAL
            </TabsTrigger>
            <TabsTrigger
              value="bought-together"
              className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent rounded-none"
            >
              COMPRADOS CONJUNTAMENTE
            </TabsTrigger>
            <TabsTrigger
              value="ranking"
              className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent rounded-none"
            >
              RANKING EN LA CATEGORIA
            </TabsTrigger>
            <TabsTrigger
              value="audience"
              className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent rounded-none"
            >
              AUDIENCIA
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPIs en paneles de colores - Estilo AdminLTE más fiel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-4 bg-gray-50">
        {/* VENTAS - Verde */}
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-5 relative overflow-hidden">
            <div className="flex items-start justify-between relative z-10">
              <div className="flex-1">
                <p className="text-green-50 text-sm mb-2 opacity-90">VENTAS</p>
                <div className="space-y-1">
                  <p className="text-3xl font-bold leading-tight">Online:</p>
                  <p className="text-2xl font-semibold">{loadingMetrics ? '...' : `${salesData.online.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}</p>
                  <p className="text-sm text-green-50 opacity-80 mt-2">Otros: {salesData.others.toLocaleString('es-AR', { minimumFractionDigits: 2 })} €</p>
                </div>
              </div>
              <div className="opacity-25 absolute right-0 top-0 -mr-4 -mt-4">
                <DollarSign className="h-24 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VISITAS - Azul */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-5 relative overflow-hidden">
            <div className="flex items-start justify-between relative z-10">
              <div className="flex-1">
                <p className="text-blue-50 text-sm mb-2 opacity-90">VISITAS</p>
                <p className="text-3xl font-bold leading-tight">{loadingMetrics ? '...' : visitsData.toLocaleString()}</p>
              </div>
              <div className="opacity-25 absolute right-0 top-0 -mr-4 -mt-4">
                <BarChart3 className="h-24 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* COMPRADO - Naranja */}
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-5 relative overflow-hidden">
            <div className="flex items-start justify-between relative z-10">
              <div className="flex-1">
                <p className="text-orange-50 text-sm mb-2 opacity-90">COMPRADO</p>
                <div className="space-y-1">
                  <p className="text-sm text-orange-50 opacity-80">Online:</p>
                  <p className="text-3xl font-bold leading-tight">{loadingMetrics ? '...' : purchasedData.online}</p>
                  <p className="text-sm text-orange-50 opacity-80 mt-2">Otros: {purchasedData.others}</p>
                </div>
              </div>
              <div className="opacity-25 absolute right-0 top-0 -mr-4 -mt-4">
                <ShoppingBag className="h-24 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RATIO DE CONVERSIÓN - Púrpura/Magenta */}
        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-5 relative overflow-hidden">
            <div className="flex items-start justify-between relative z-10">
              <div className="flex-1">
                <p className="text-purple-50 text-sm mb-2 opacity-90">RATIO DE CONVERSIÓN</p>
                <p className="text-3xl font-bold leading-tight">{loadingMetrics ? '...' : `${conversionRate.toFixed(1)}%`}</p>
              </div>
              <div className="opacity-25 absolute right-0 top-0 -mr-4 -mt-4">
                <TrendingUp className="h-24 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido de los tabs */}
      <div className="px-6 pb-6">
        <Tabs value={mainTab} onValueChange={(value) => setMainTab(value as any)}>
          {/* Tab GENERAL */}
          <TabsContent value="general" className="space-y-6 mt-6">
            {/* Métricas adicionales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1 font-medium">ABANDONOS DE CESTA:</p>
                <p className="text-2xl font-bold text-gray-900">{loadingMetrics ? '...' : additionalMetrics.cartAbandonments}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1 font-medium">PACKS DE PRODUCTO:</p>
                <p className="text-2xl font-bold text-gray-900">{loadingMetrics ? '...' : additionalMetrics.productPacks}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1 font-medium">EN LISTAS DE LA COMPRA:</p>
                <p className="text-2xl font-bold text-gray-900">{loadingMetrics ? '...' : additionalMetrics.inShoppingLists}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1 font-medium">RANKING POR PEDIDOS:</p>
                <p className="text-2xl font-bold text-gray-900">{loadingMetrics ? '...' : `${additionalMetrics.rankingByOrders.toFixed(2)}%`}</p>
              </div>
            </div>

            {/* Gráfico de línea de ventas - Estilo AdminLTE */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-white border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-800">VENTAS</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {salesTrend.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          tickFormatter={(date) => {
                            const d = new Date(date);
                            return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
                          }}
                          stroke="#d1d5db"
                        />
                        <YAxis
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          tickFormatter={(value) => {
                            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                            return value.toString();
                          }}
                          stroke="#d1d5db"
                        />
                        <Tooltip
                          formatter={(value: any) => [`${Number(value).toFixed(2)} €`, 'Ventas']}
                          labelFormatter={(date) => {
                            const d = new Date(date);
                            return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                          }}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="sales"
                          stroke="#3b82f6"
                          fill="url(#colorSales)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: '#3b82f6' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No hay datos de ventas para el período seleccionado</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráficos de dona para top clientes - Estilo AdminLTE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top clientes por precio */}
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="bg-white border-b border-gray-200">
                  <CardTitle className="text-base font-semibold text-gray-800">TOP #6 PRINCIPALES CLIENTES POR PRECIO</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {topCustomersByPrice.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={topCustomersByPrice}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            innerRadius={60}
                            label={({ name, value }) => `${value.toFixed(2)}€`}
                            labelLine={false}
                          >
                            {topCustomersByPrice.map((_, index) => (
                              <Cell key={`cell-price-${index}`} fill={pieColors[index % pieColors.length]} stroke="#fff" strokeWidth={2} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: any) => `${Number(value).toFixed(2)} €`}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px'
                            }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value, entry: any) => {
                              const data = topCustomersByPrice.find(c => c.name === value);
                              return data ? `${value} (${data.value.toFixed(2)}€)` : value;
                            }}
                            wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-500 bg-gray-50 rounded">
                      <div className="text-center">
                        <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>No hay datos de clientes disponibles</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top clientes por número de pedidos */}
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="bg-white border-b border-gray-200">
                  <CardTitle className="text-base font-semibold text-gray-800">TOP #6 PRINCIPALES CLIENTES POR NÚMERO DE PEDIDOS</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {topCustomersByOrders.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={topCustomersByOrders}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            innerRadius={60}
                            label={({ value }) => `${value}`}
                            labelLine={false}
                          >
                            {topCustomersByOrders.map((_, index) => (
                              <Cell key={`cell-orders-${index}`} fill={pieColors[(index + 6) % pieColors.length]} stroke="#fff" strokeWidth={2} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: any) => `${value} pedidos`}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px'
                            }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value, entry: any) => {
                              const data = topCustomersByOrders.find(c => c.name === value);
                              return data ? `${value} (${data.value} pedidos)` : value;
                            }}
                            wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-500 bg-gray-50 rounded">
                      <div className="text-center">
                        <ShoppingBag className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>No hay datos de pedidos disponibles</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Otros tabs - por ahora con contenido básico */}
          <TabsContent value="bought-together" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Productos Comprados Conjuntamente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Funcionalidad en desarrollo...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ranking" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Ranking en la Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Funcionalidad en desarrollo...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audience" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Audiencia</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Funcionalidad en desarrollo...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 pb-6">
        {/* Tarjeta de tendencia general - Versión mejorada */}
        <Card className="md:col-span-3 overflow-hidden border-0 shadow-lg">
          <CardHeader className="pb-2 bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-indigo-950/30 dark:to-slate-900">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/30">
                    <LineChart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Tendencia de Visualizaciones
                </CardTitle>
                <CardDescription className="mt-1 text-sm md:text-base">
                  Evolución de vistas a productos a lo largo del tiempo
                </CardDescription>
              </div>
              <div className="flex flex-col xs:flex-row gap-2 items-start xs:items-center">
                <div className="hidden md:flex items-center gap-1.5 text-xs bg-white/70 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-md shadow-sm">
                  <div className="flex h-2 w-2 rounded-full bg-indigo-500"></div>
                  <span>{trend.reduce((sum, day) => sum + day.views, 0).toLocaleString()} vistas totales</span>
                </div>
                <Select
                  defaultValue={timeRange}
                  onValueChange={setTimeRange}
                >
                  <SelectTrigger className="w-full xs:w-32 h-9 text-xs md:text-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">7 días</SelectItem>
                    <SelectItem value="30d">30 días</SelectItem>
                    <SelectItem value="90d">3 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            {isLoading ? (
              <div className="h-60 md:h-72 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-t-indigo-600 animate-spin mb-4"></div>
                <div className="text-slate-500">Cargando datos históricos...</div>
              </div>
            ) : trend.length > 0 ? (
              <div className="px-2 md:px-6">
                <SimpleTrendChart data={trend} />
                <div className="flex justify-between text-2xs text-slate-500 mt-2 px-2">
                  <div>Fecha inicial: {new Date(trend[0]?.date).toLocaleDateString()}</div>
                  <div>Fecha final: {new Date(trend[trend.length - 1]?.date).toLocaleDateString()}</div>
                </div>
              </div>
            ) : (
              <div className="h-60 md:h-72 flex flex-col items-center justify-center">
                <LineChart className="h-16 w-16 text-slate-200 mb-4" />
                <div className="text-slate-500">No hay datos de tendencias disponibles</div>
                <div className="text-2xs text-slate-400 mt-1">Prueba a seleccionar otro período o verifica la configuración</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tarjetas de métricas principales - Versión mejorada */}
        <Tabs defaultValue="most-viewed" className="col-span-2">
          <TabsList className="grid grid-cols-2 p-1 bg-indigo-50/70 dark:bg-slate-800/50">
            <TabsTrigger value="most-viewed" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-md">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden xs:inline">Productos</span> Más Vistos
            </TabsTrigger>
            <TabsTrigger value="least-viewed" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-md">
              <TrendingDown className="h-4 w-4" />
              <span className="hidden xs:inline">Productos</span> Menos Vistos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="most-viewed" className="space-y-4 pt-3">
            <Card className="border-0 shadow-md overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-indigo-50/70 dark:bg-slate-800/30">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-indigo-700 dark:text-indigo-300">Producto</TableHead>
                        <TableHead className="text-right font-semibold text-indigo-700 dark:text-indigo-300">Vistas</TableHead>
                        <TableHead className="w-28 md:w-36 font-semibold text-indigo-700 dark:text-indigo-300">Rendimiento</TableHead>
                        <TableHead className="font-semibold text-indigo-700 dark:text-indigo-300 w-24">Visitantes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-60">
                            <div className="flex flex-col items-center justify-center h-full">
                              <div className="w-10 h-10 rounded-full border-4 border-t-indigo-600 animate-spin mb-3"></div>
                              <div className="text-slate-500">Cargando estadísticas de productos...</div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : mostViewed.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-60">
                            <div className="flex flex-col items-center justify-center h-full">
                              <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-4 mb-3">
                                <Eye className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                              </div>
                              <div className="text-slate-500 font-medium">No hay datos de vistas disponibles</div>
                              <div className="text-slate-400 text-sm mt-1">Intente más tarde cuando haya actividad</div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        mostViewed.slice(0, 10).map((product, idx) => {
                          const maxViews = mostViewed[0]?.totalViews || 1;
                          const percentage = product.totalViews / maxViews * 100;

                          return (
                            <TableRow key={product.id} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/20 group">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="hidden xs:flex h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center text-xs font-bold text-indigo-800 dark:text-indigo-200 shrink-0">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm md:text-base truncate max-w-[150px] md:max-w-[200px] lg:max-w-full">
                                      {product.productName}
                                    </div>
                                    <div className="text-2xs text-slate-500">{product.category || "Sin categoría"}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <div className="flex h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/40 items-center justify-center">
                                    <Eye className="h-3 w-3 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div className="font-mono text-sm md:text-base font-semibold text-slate-700 dark:text-slate-300">
                                    {product.totalViews.toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-right text-2xs text-green-600 dark:text-green-400 font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {percentage.toFixed(1)}% del mejor
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 shadow-inner overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full shadow-sm transition-all duration-500 ease-out"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <div className="mt-1 flex justify-between items-center text-2xs text-slate-500">
                                  <div>{product.firstViewed ? new Date(product.firstViewed).toLocaleDateString() : "–"}</div>
                                  <div>{product.lastViewed ? new Date(product.lastViewed).toLocaleDateString() : "–"}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col space-y-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs py-1 h-7 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600"
                                    onClick={() => handleSelectProduct(product)}
                                  >
                                    <Eye className="h-3 w-3 mr-1" /> Analizar
                                  </Button>
                                  <div className="text-2xs text-slate-500 mt-1">
                                    {product.uniqueVisitors || 0} visitantes
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {mostViewed.length > 10 && (
                  <div className="flex justify-center p-2 border-t">
                    <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700">
                      Ver todos ({mostViewed.length} productos)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="least-viewed" className="space-y-4 pt-3">
            <Card className="border-0 shadow-md overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-red-50/70 dark:bg-slate-800/30">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-red-700 dark:text-red-300">Producto</TableHead>
                        <TableHead className="text-right font-semibold text-red-700 dark:text-red-300">Vistas</TableHead>
                        <TableHead className="w-28 md:w-36 font-semibold text-red-700 dark:text-red-300">Rendimiento</TableHead>
                        <TableHead className="font-semibold text-red-700 dark:text-red-300 w-28">Últimos Visitantes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-60">
                            <div className="flex flex-col items-center justify-center h-full">
                              <div className="w-10 h-10 rounded-full border-4 border-t-red-500 animate-spin mb-3"></div>
                              <div className="text-slate-500">Cargando estadísticas de productos...</div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : leastViewed.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-60">
                            <div className="flex flex-col items-center justify-center h-full">
                              <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-4 mb-3">
                                <Eye className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                              </div>
                              <div className="text-slate-500 font-medium">No hay datos de vistas disponibles</div>
                              <div className="text-slate-400 text-sm mt-1">Intente más tarde cuando haya actividad</div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        leastViewed.slice(0, 10).map((product, idx) => {
                          const maxViews = Math.max(...leastViewed.map(p => p.totalViews)) || 1;
                          const percentage = product.totalViews / maxViews * 100;

                          return (
                            <TableRow key={product.id} className="hover:bg-red-50/30 dark:hover:bg-slate-800/20 group">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="hidden xs:flex h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/50 items-center justify-center text-xs font-bold text-red-800 dark:text-red-200 shrink-0">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm md:text-base truncate max-w-[150px] md:max-w-[200px] lg:max-w-full">
                                      {product.productName}
                                    </div>
                                    <div className="text-2xs text-slate-500">{product.category || "Sin categoría"}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <div className="flex h-5 w-5 rounded-full bg-red-100 dark:bg-red-900/40 items-center justify-center">
                                    <Eye className="h-3 w-3 text-red-600 dark:text-red-400" />
                                  </div>
                                  <div className="font-mono text-sm md:text-base font-semibold text-slate-700 dark:text-slate-300">
                                    {product.totalViews.toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-right text-2xs text-red-600 dark:text-red-400 font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {(100 - percentage).toFixed(1)}% menos vistas
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 shadow-inner overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-amber-500 to-red-500 h-full rounded-full shadow-sm transition-all duration-500 ease-out"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <div className="mt-1 flex justify-between items-center text-2xs text-slate-500">
                                  <div>{product.firstViewed ? new Date(product.firstViewed).toLocaleDateString() : "–"}</div>
                                  <div>{product.lastViewed ? new Date(product.lastViewed).toLocaleDateString() : "–"}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <div className="flex items-center space-x-1">
                                    {product.uniqueVisitors ? (
                                      <div className="flex -space-x-2 overflow-hidden">
                                        {(product.visitors || []).slice(0, 3).map((visitor, vidx) => (
                                          <div
                                            key={vidx}
                                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-800"
                                            title={visitor.displayName || 'Anónimo'}
                                          >
                                            {visitor.avatarUrl ? (
                                              <img
                                                src={visitor.avatarUrl}
                                                alt={visitor.displayName || 'Anónimo'}
                                                className="h-full w-full object-cover rounded-full"
                                              />
                                            ) : (
                                              <div className="h-full w-full flex items-center justify-center bg-slate-200 text-slate-600 text-xs font-medium rounded-full">
                                                {(visitor.displayName || 'A').charAt(0)}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-500">Sin visitas</span>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs py-0.5 h-5 mt-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleSelectProduct(product)}
                                  >
                                    Ver detalles
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {leastViewed.length > 10 && (
                  <div className="flex justify-center p-2 border-t">
                    <Button variant="ghost" size="sm" className="text-xs text-red-600 hover:text-red-700">
                      Ver todos ({leastViewed.length} productos)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Gráfico de pastel de productos más vistos - Versión mejorada */}
        <Card className="row-span-2 overflow-hidden hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              Distribución de Vistas por Producto
            </CardTitle>
            <CardDescription className="text-sm md:text-base">
              Porcentaje de vistas de los productos más populares
            </CardDescription>
            <div className="w-full md:w-36 mt-2">
              <Select
                defaultValue={chartDisplayMode}
                onValueChange={(value) => setChartDisplayMode(value as 'count' | 'percent')}
              >
                <SelectTrigger className="text-xs md:text-sm h-8">
                  <SelectValue placeholder="Visualización" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Por cantidad</SelectItem>
                  <SelectItem value="percent">Por porcentaje</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0 md:p-4">
            {isLoading ? (
              <div className="h-60 md:h-80 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-t-purple-600 animate-spin mb-4"></div>
                <div className="text-muted-foreground">Cargando datos de productos...</div>
              </div>
            ) : mostViewed.length > 0 ? (
              <div className="relative">
                {/* Tooltip personalizado para móviles */}
                <div className="absolute top-2 right-2 md:hidden bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-lg shadow-sm border p-1 text-xs">
                  <p>Pulsa para detalles</p>
                </div>

                <div className="h-60 md:h-80 w-full p-2 md:p-6 flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie
                        data={mostViewed.slice(0, 8).map(product => ({
                          name: product.productName,
                          value: product.totalViews,
                          fullName: product.productName.length > 15 ? product.productName : undefined
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        innerRadius="40%"
                        // Label móvil vs desktop con modo de visualización
                        label={({ name, percent, value }) => {
                          if (window.innerWidth < 768) {
                            return chartDisplayMode === 'percent'
                              ? `${(percent * 100).toFixed(0)}%`
                              : `${value}`;
                          } else {
                            const shortName = name.length > 12 ? name.substring(0, 10) + '...' : name;
                            return chartDisplayMode === 'percent'
                              ? `${shortName}: ${(percent * 100).toFixed(0)}%`
                              : `${shortName}: ${value}`;
                          }
                        }}
                        labelLine={true}
                        paddingAngle={2}
                      >
                        {mostViewed.slice(0, 8).map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={pieColors[index % pieColors.length]}
                            strokeWidth={1}
                            stroke="#ffffff"
                            className="hover:opacity-80 transition-opacity drop-shadow-md"
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: any, name: any, props: any) => {
                          const item = props.payload;
                          const percent = (props.percent * 100).toFixed(1);

                          return chartDisplayMode === 'percent'
                            ? [`${percent}% (${value} vistas)`, item.fullName || item.name]
                            : [`${value} vistas (${percent}%)`, item.fullName || item.name];
                        }}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          borderRadius: '0.5rem',
                          padding: '0.75rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                          border: '1px solid rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        iconSize={10}
                        iconType="circle"
                        formatter={(value) => {
                          // En móvil acortar los nombres más
                          return window.innerWidth < 768 && value.length > 8
                            ? `${value.substring(0, 7)}...`
                            : value.length > 20
                              ? `${value.substring(0, 18)}...`
                              : value;
                        }}
                        wrapperStyle={{
                          fontSize: '0.75rem',
                          paddingTop: '1rem'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Leyenda mejorada para dispositivos pequeños */}
                <div className="mt-2 px-2 md:hidden">
                  <div className="text-xs font-medium mb-2 text-center">Productos destacados:</div>
                  <div className="grid grid-cols-2 gap-1">
                    {mostViewed.slice(0, 4).map((product, index) => {
                      // Calcular el porcentaje para cada producto
                      const totalViews = mostViewed.slice(0, 8).reduce((sum, p) => sum + p.totalViews, 0);
                      const percent = totalViews > 0 ? (product.totalViews / totalViews * 100).toFixed(1) : '0';

                      return (
                        <div key={index} className="flex items-center gap-1.5 bg-white/60 dark:bg-slate-800/60 p-1.5 rounded-md shadow-sm">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: pieColors[index % pieColors.length] }}
                          ></div>
                          <div className="flex flex-col">
                            <div className="truncate text-2xs font-medium">{product.productName}</div>
                            <div className="text-2xs text-gray-500">
                              {chartDisplayMode === 'percent'
                                ? `${percent}%`
                                : `${product.totalViews}`
                              }
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-60 md:h-80 flex flex-col items-center justify-center">
                <div className="text-center text-muted-foreground p-6">
                  <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p>No hay datos de productos disponibles</p>
                  <p className="text-xs mt-2">Intente más tarde o revise la configuración</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Panel de detalles de visitantes */}
      <VisitorDetailsPanel />
    </div>
  );
};
