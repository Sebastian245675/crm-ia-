import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChevronDown,
  MoreVertical,
  Layout,
  Calendar as CalendarIcon,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const WON_STATUSES = ['confirmed', 'delivered', 'shipped', 'processing'];
const DAYS_OPTIONS = [
  { label: 'Últimos 7 días', days: 7 },
  { label: 'Últimos 31 días', days: 31 },
  { label: 'Últimos 90 días', days: 90 },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value).replace('ARS', '$');
}

function formatShortCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return formatCurrency(value);
}

function getOrderDate(o: any): number {
  const raw = o?.created_at ?? o?.createdAt;
  if (!raw) return 0;
  return new Date(raw).getTime();
}

interface DashboardStatsProps {
  orders?: any[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ orders = [], onRefresh }) => {
  const [daysRange, setDaysRange] = useState(31);
  const [dateRangeLabel, setDateRangeLabel] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { metrics, dateLabel } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - daysRange);
    start.setHours(0, 0, 0, 0);
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - daysRange);

    const startMs = start.getTime();
    const endMs = end.getTime();
    const prevStartMs = prevStart.getTime();
    const prevEndMs = prevEnd.getTime();

    const filterByDate = (list: any[], s: number, e: number) =>
      list.filter((o) => {
        const t = getOrderDate(o);
        return t >= s && t <= e;
      });

    const currOrders = filterByDate(orders, startMs, endMs);
    const prevOrders = filterByDate(orders, prevStartMs, prevEndMs);

    const process = (list: any[]) => {
      let wonCount = 0;
      let abandonedCount = 0;
      let wonRevenue = 0;
      let abandonedRevenue = 0;
      list.forEach((o: any) => {
        const total = Number(o.total || 0);
        const status = String(o.status || 'pending').toLowerCase();
        const isWon = WON_STATUSES.some((s) => status === s);
        if (isWon) {
          wonCount++;
          wonRevenue += total;
        } else {
          abandonedCount++;
          abandonedRevenue += total;
        }
      });
      return {
        wonCount,
        abandonedCount,
        totalCount: wonCount + abandonedCount,
        wonRevenue,
        abandonedRevenue,
        totalRevenue: wonRevenue + abandonedRevenue,
      };
    };

    const curr = process(currOrders);
    const prev = process(prevOrders);
    const conversionRate =
      curr.totalRevenue > 0 ? (curr.wonRevenue / curr.totalRevenue) * 100 : 0;

    return {
      dateLabel: `${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`,
      metrics: {
        ...curr,
        conversionRate,
        prevWonCount: prev.wonCount,
        prevAbandonedCount: prev.abandonedCount,
        prevTotalCount: prev.totalCount,
        prevWonRevenue: prev.wonRevenue,
        prevTotalRevenue: prev.totalRevenue,
      },
    };
  }, [orders, daysRange]);

  useEffect(() => {
    setDateRangeLabel(dateLabel);
  }, [dateLabel]);

  const opportunityStatusData = [
    { name: 'Ganados', value: metrics.wonCount || 0, color: '#3b82f6' },
    { name: 'Abandonados', value: metrics.abandonedCount || 0, color: '#06b6d4' },
  ].filter((d) => d.value > 0);

  const opportunityValueData = [
    { name: 'Abandonados', value: metrics.abandonedRevenue || 0, fill: '#93c5fd' },
    { name: 'Ganados', value: metrics.wonRevenue || 0, fill: '#3b82f6' },
  ].filter((d) => d.value > 0);

  const conversionData = [
    { name: 'Ganados', value: metrics.conversionRate || 0, fill: '#3b82f6' },
    { name: 'Perdidos', value: 100 - (metrics.conversionRate || 0), fill: '#f1f5f9' },
  ];

  const countChange =
    metrics.prevTotalCount > 0
      ? ((metrics.totalCount - metrics.prevTotalCount) / metrics.prevTotalCount) * 100
      : metrics.totalCount > 0 ? 100 : 0;
  const revenueChange =
    metrics.prevTotalRevenue > 0
      ? ((metrics.totalRevenue - metrics.prevTotalRevenue) / metrics.prevTotalRevenue) * 100
      : metrics.totalRevenue > 0 ? 100 : 0;
  const wonRevenueChange =
    metrics.prevWonRevenue > 0
      ? ((metrics.wonRevenue - metrics.prevWonRevenue) / metrics.prevWonRevenue) * 100
      : metrics.wonRevenue > 0 ? 100 : 0;

  const maxBarValue = Math.max(
    metrics.wonRevenue || 0,
    metrics.abandonedRevenue || 0,
    1000
  );
  const tick1 = Math.max(1000, Math.round((maxBarValue * 0.25) / 1000) * 1000);
  const tick2 = Math.max(tick1, Math.round((maxBarValue * 0.5) / 1000) * 1000);
  const tick3 = Math.max(tick2, Math.round((maxBarValue * 0.75) / 1000) * 1000);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 min-h-[400px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white border border-slate-200 rounded-md shadow-sm">
            <Layout className="h-5 w-5 text-slate-500" />
          </div>
          <h1 className="text-3xl font-normal text-slate-800">Panel de Control</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center space-x-2 bg-white border border-slate-200 px-3 py-2 rounded-md text-sm text-slate-600 shadow-sm hover:bg-slate-50">
                <span>{dateRangeLabel || dateLabel}</span>
                <CalendarIcon className="h-4 w-4 text-slate-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-2 space-y-1">
                {DAYS_OPTIONS.map((opt) => (
                  <button
                    key={opt.days}
                    onClick={() => setDaysRange(opt.days)}
                    className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-slate-100 ${
                      daysRange === opt.days ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <button className="p-2 bg-white border border-slate-200 rounded-md text-slate-500 hover:text-slate-700 shadow-sm">
            <Sparkles className="h-4 w-4" />
          </button>

          <button className="p-2 text-slate-400 hover:text-slate-600">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex items-center text-blue-500 text-sm font-medium cursor-pointer hover:text-blue-600">
        <span className="mr-1">+</span> Filtros Rápidos
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Opportunity Status */}
        <Card className="shadow-sm border border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-normal text-slate-700 flex items-center gap-2">
              Estado de Oportunidades
              <button className="flex items-center space-x-1 px-2 py-0.5 border border-slate-200 rounded text-xs text-slate-500 font-normal">
                <span>Todos</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </CardTitle>
            <SlidersHorizontal className="h-4 w-4 text-slate-400 cursor-pointer" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold text-slate-800 mt-2">
              {metrics.totalCount}
            </div>
            <div className="flex items-center mt-1 space-x-2">
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  countChange >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}
              >
                {countChange >= 0 ? '↑' : '↓'} {Math.abs(Math.round(countChange))}%
              </span>
              <span className="text-xs text-slate-400">vs Últimos {daysRange} días</span>
            </div>

            <div className="flex items-center justify-center h-64 relative">
              {opportunityStatusData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={opportunityStatusData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                      >
                        {opportunityStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-slate-700">
                      {metrics.totalCount}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-slate-400 text-sm">Sin datos en este período</div>
              )}
            </div>

            <div className="flex flex-col space-y-2 mt-2 pl-4 border-l-2 border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                <span className="text-sm text-slate-600">Ganados - {metrics.wonCount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-cyan-500 rounded-sm"></div>
                <span className="text-sm text-slate-600">Abandonados - {metrics.abandonedCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Opportunity Value */}
        <Card className="shadow-sm border border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-normal text-slate-700 flex items-center gap-2">
              Valor de Oportunidades
              <button className="flex items-center space-x-1 px-2 py-0.5 border border-slate-200 rounded text-xs text-slate-500 font-normal">
                <span>Todos</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </CardTitle>
            <SlidersHorizontal className="h-4 w-4 text-slate-400 cursor-pointer" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold text-slate-800 mt-2">
              {formatShortCurrency(metrics.totalRevenue)}
            </div>
            <div className="flex items-center mt-1 space-x-2">
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  revenueChange >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}
              >
                {revenueChange >= 0 ? '↑' : '↓'} {Math.abs(Math.round(revenueChange))}%
              </span>
              <span className="text-xs text-slate-400">vs Últimos {daysRange} días</span>
            </div>

            <div className="h-64 mt-4 w-full">
              {opportunityValueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={opportunityValueData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    barSize={20}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      interval={0}
                    />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      formatter={(v: number) => formatCurrency(v)}
                      labelFormatter={(l) => (l === 'Ganados' ? 'Ganados' : 'Abandonados')}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {opportunityValueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  Sin datos en este período
                </div>
              )}
            </div>

            <div className="flex justify-between text-xs text-slate-400 px-10 mt-2">
              <span>{formatShortCurrency(tick1)}</span>
              <span>{formatShortCurrency(tick2)}</span>
              <span>{formatShortCurrency(tick3)}</span>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-slate-500">Ingresos totales</p>
              <p className="text-lg font-semibold text-slate-700">
                {formatCurrency(metrics.totalRevenue)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Conversion Rate */}
        <Card className="shadow-sm border border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-normal text-slate-700 flex items-center gap-2">
              Tasa de Conversión
              <button className="flex items-center space-x-1 px-2 py-0.5 border border-slate-200 rounded text-xs text-slate-500 font-normal">
                <span>Todos</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </CardTitle>
            <SlidersHorizontal className="h-4 w-4 text-slate-400 cursor-pointer" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold text-slate-800 mt-2">
              {formatShortCurrency(metrics.wonRevenue)}
            </div>
            <div className="flex items-center mt-1 space-x-2">
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  wonRevenueChange >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}
              >
                {wonRevenueChange >= 0 ? '↑' : '↓'} {Math.abs(Math.round(wonRevenueChange))}%
              </span>
              <span className="text-xs text-slate-400">vs Últimos {daysRange} días</span>
            </div>

            <div className="flex items-center justify-center h-64 relative mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conversionData}
                    innerRadius={70}
                    outerRadius={85}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={10}
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#f1f5f9" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-slate-700">
                  {metrics.conversionRate.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-slate-500">Ingresos ganados</p>
              <p className="text-lg font-semibold text-slate-700">
                {formatCurrency(metrics.wonRevenue)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
