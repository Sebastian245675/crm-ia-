import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveAgencyId, isOpportunityForAgency } from '@/lib/agency-isolation';
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

const DAYS_OPTIONS = [
  { label: 'Últimos 7 días', days: 7 },
  { label: 'Últimos 31 días', days: 31 },
  { label: 'Últimos 90 días', days: 90 },
];

function formatShortCurrency(value: number): string {
  return formatCurrency(value);
}

function getOpportunityDate(o: any): number {
  const raw = o?.created_at ?? o?.createdAt;
  if (!raw) return 0;
  return new Date(raw).getTime();
}

const getOpportunityOutcome = (opportunity: any): 'won' | 'lost' | 'open' => {
  const stage = String(opportunity.stage || opportunity.status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/^(ganado|ganada|won|closed_won)$/.test(stage) || stage.includes('negocio ganado')) return 'won';
  if (/^(perdido|perdida|lost|closed_lost)$/.test(stage) || stage.includes('negocio perdido')) return 'lost';
  return 'open';
};

export const DashboardStats: React.FC = () => {
  const { user } = useAuth();
  const activeAgencyId = useMemo(() => getActiveAgencyId(user), [user]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [daysRange, setDaysRange] = useState(31);
  const [dateRangeLabel, setDateRangeLabel] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadOpportunities = async () => {
      try {
        const { data, error } = await (db as any)
          .from('sales_opportunities')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setOpportunities((data || []).filter((item: any) => isOpportunityForAgency(item, activeAgencyId)));
      } catch (error) {
        console.error('[DashboardStats] No se pudieron cargar las oportunidades de PostgreSQL:', error);
        if (!cancelled) setOpportunities([]);
      }
    };
    void loadOpportunities();
    return () => { cancelled = true; };
  }, [activeAgencyId]);

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
        const t = getOpportunityDate(o);
        return t >= s && t <= e;
      });

    const currOpportunities = filterByDate(opportunities, startMs, endMs);
    const prevOpportunities = filterByDate(opportunities, prevStartMs, prevEndMs);

    const process = (list: any[]) => {
      let wonCount = 0;
      let lostCount = 0;
      let openCount = 0;
      let wonValue = 0;
      let lostValue = 0;
      let openValue = 0;
      list.forEach((opportunity: any) => {
        const value = Number(opportunity.value || 0);
        const outcome = getOpportunityOutcome(opportunity);
        if (outcome === 'won') {
          wonCount++;
          wonValue += value;
        } else if (outcome === 'lost') {
          lostCount++;
          lostValue += value;
        } else {
          openCount++;
          openValue += value;
        }
      });
      return {
        wonCount,
        lostCount,
        openCount,
        totalCount: list.length,
        wonValue,
        lostValue,
        openValue,
        totalValue: wonValue + lostValue + openValue,
      };
    };

    const curr = process(currOpportunities);
    const prev = process(prevOpportunities);
    const closedCount = curr.wonCount + curr.lostCount;
    const conversionRate = closedCount > 0 ? (curr.wonCount / closedCount) * 100 : 0;

    return {
      dateLabel: `${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`,
      metrics: {
        ...curr,
        conversionRate,
        prevWonCount: prev.wonCount,
        prevTotalCount: prev.totalCount,
        prevTotalValue: prev.totalValue,
      },
    };
  }, [opportunities, daysRange]);

  useEffect(() => {
    setDateRangeLabel(dateLabel);
  }, [dateLabel]);

  const opportunityStatusData = [
    { name: 'Ganados', value: metrics.wonCount || 0, color: '#3b82f6' },
    { name: 'En proceso', value: metrics.openCount || 0, color: '#06b6d4' },
    { name: 'Perdidos', value: metrics.lostCount || 0, color: '#f97316' },
  ].filter((d) => d.value > 0);

  const opportunityValueData = [
    { name: 'Ganadas', value: metrics.wonValue || 0, fill: '#3b82f6' },
    { name: 'En proceso', value: metrics.openValue || 0, fill: '#06b6d4' },
    { name: 'Perdidas', value: metrics.lostValue || 0, fill: '#f97316' },
  ].filter((d) => d.value > 0);

  const conversionData = [
    { name: 'Ganados', value: metrics.conversionRate || 0, fill: '#3b82f6' },
    { name: 'Perdidos', value: 100 - (metrics.conversionRate || 0), fill: '#f1f5f9' },
  ];

  const countChange =
      metrics.prevTotalCount > 0
      ? ((metrics.totalCount - metrics.prevTotalCount) / metrics.prevTotalCount) * 100
      : metrics.totalCount > 0 ? 100 : 0;
  const valueChange =
    metrics.prevTotalValue > 0
      ? ((metrics.totalValue - metrics.prevTotalValue) / metrics.prevTotalValue) * 100
      : metrics.totalValue > 0 ? 100 : 0;
  const maxBarValue = Math.max(
    metrics.totalValue || 0,
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
                <span className="text-sm text-slate-600">En proceso - {metrics.openCount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                <span className="text-sm text-slate-600">Perdidos - {metrics.lostCount}</span>
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
              {formatShortCurrency(metrics.totalValue)}
            </div>
            <div className="flex items-center mt-1 space-x-2">
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  valueChange >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}
              >
                {valueChange >= 0 ? '↑' : '↓'} {Math.abs(Math.round(valueChange))}%
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
                      labelFormatter={(l) => String(l)}
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
              <p className="text-xs text-slate-500">Valor total de oportunidades</p>
              <p className="text-lg font-semibold text-slate-700">
                {formatCurrency(metrics.totalValue)}
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
              {metrics.conversionRate.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {metrics.wonCount} ganadas de {metrics.wonCount + metrics.lostCount} oportunidades cerradas
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
              <p className="text-xs text-slate-500">Valor de oportunidades ganadas</p>
              <p className="text-lg font-semibold text-slate-700">
                {formatCurrency(metrics.wonValue)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
