import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, MoreHorizontal, Package, SlidersHorizontal, Sparkles, Tags } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FunnelsManager } from './FunnelsManager';
import { SitiosManager } from './SitiosManager';
import { SeoManager } from './SeoManager';
import { CommentsManager } from './CommentsManager';
import { ProductAnalyticsView } from './ProductAnalytics';
import { FormBuilder } from './FormBuilder';
import { ReportsManager } from './ReportsManager';
import { useAuth } from '@/contexts/AuthContext';

// Componente placeholder para pestañas adicionales
const PlaceholderView: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <Card className="border-slate-200 bg-white">
    <CardContent className="p-12 text-center text-slate-500 space-y-4">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-500 animate-pulse">
        <Sparkles className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-bold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto">{description}</p>
      <p className="text-xs text-blue-600 bg-blue-50/50 inline-block px-3 py-1 rounded-full font-medium">
        Próximamente • Módulo en desarrollo
      </p>
    </CardContent>
  </Card>
);

interface WebsiteManagerProps {
  initialTab?: string;
  isAdmin: boolean;
  onNavigate?: (tab: string) => void;
}

export const WebsiteManager: React.FC<WebsiteManagerProps> = ({ initialTab = 'funnels', isAdmin, onNavigate }) => {
  const { user } = useAuth();
  const agencyKey = user?.agencyId || 'default';
  const [activeSubTab, setActiveSubTab] = useState<string>(initialTab);

  // Definir pestañas para la navegación horizontal
  const tabs = [
    { id: 'funnels', label: 'Funnels', type: 'active' },
    { id: 'sitios', label: 'Sitios', type: 'active' },
    { id: 'seo', label: 'SEO', type: 'active', beta: true },
    ...(isAdmin ? [{ id: 'analytics', label: 'Analítica', type: 'active' }] : []),
    { id: 'reportes', label: 'Reportes', type: 'active' },
    { id: 'comments', label: 'Comentarios', type: 'active' },
    { id: 'blogs', label: 'Blogs', type: 'placeholder' },
    { id: 'formularios', label: 'Formularios', type: 'active' }
  ];

  const renderContent = () => {
    switch (activeSubTab) {
      case 'funnels':
        return <FunnelsManager key={agencyKey} />;
      case 'sitios':
        return <SitiosManager key={agencyKey} />;
      case 'seo':
        return <SeoManager key={agencyKey} />;
      case 'analytics':
        return <ProductAnalyticsView key={agencyKey} />;
      case 'reportes':
        return <ReportsManager key={agencyKey} />;
      case 'comments':
        return <CommentsManager key={agencyKey} />;
      case 'blogs':
        return (
          <PlaceholderView
            title="Gestor de Blogs"
            description="Crea artículos y contenido optimizado para atraer tráfico orgánico a tu tienda en línea."
          />
        );
      case 'formularios':
        return <FormBuilder key={agencyKey} />;
      default:
        return <FunnelsManager key={agencyKey} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Top Bar - matching screenshot design */}
      <div className="bg-white border-b border-slate-200 -mx-4 md:-mx-6 -mt-8 px-4 md:px-6 py-1 sticky top-0 z-30 overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-1 min-w-max">
          {tabs.map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`relative px-4 py-3 text-sm font-semibold transition-all flex items-center gap-1.5 focus:outline-none whitespace-nowrap ${isActive
                    ? 'text-blue-600'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {/* Text Label */}
                <span>{tab.label}</span>

                {/* Dropdown Indicator */}
                {tab.hasDropdown && (
                  <ChevronDown className="h-3 w-3 opacity-60" />
                )}

                {/* Beta Badge */}
                {tab.beta && (
                  <span className="absolute -top-1 right-1 bg-amber-500 text-[8px] text-white px-1.5 py-0.5 rounded-full font-bold uppercase scale-75 origin-top-right">
                    Beta
                  </span>
                )}

                {/* Active Underline */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-t-full" />
                )}
              </button>
            );
          })}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-1 grid h-9 w-9 place-items-center border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                aria-label="Más herramientas del sitio web"
                title="Más herramientas"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-none border-slate-200 bg-white p-1 shadow-lg">
              <DropdownMenuItem onSelect={() => onNavigate?.('products')} className="flex cursor-pointer items-center gap-2 rounded-none px-3 py-2 text-xs font-semibold text-slate-700">
                <Package className="h-4 w-4 text-blue-600" />
                Productos
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onNavigate?.('filters')} className="flex cursor-pointer items-center gap-2 rounded-none px-3 py-2 text-xs font-semibold text-slate-700">
                <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                Filtros
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onNavigate?.('categories')} className="flex cursor-pointer items-center gap-2 rounded-none px-3 py-2 text-xs font-semibold text-slate-700">
                <Tags className="h-4 w-4 text-blue-600" />
                Categorías
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Renders the subpage manager */}
      <div className="pt-2 animate-in fade-in duration-300">
        {renderContent()}
      </div>
    </div>
  );
};

export default WebsiteManager;
