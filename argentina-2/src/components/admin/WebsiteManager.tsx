import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Sparkles } from 'lucide-react';
import { FunnelsManager } from './FunnelsManager';
import { SitiosManager } from './SitiosManager';
import { SeoManager } from './SeoManager';
import { CommentsManager } from './CommentsManager';
import { ProductAnalyticsView } from './ProductAnalytics';
import { FormBuilder } from './FormBuilder';

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

export const WebsiteManager: React.FC<{ initialTab?: string; isAdmin: boolean }> = ({ initialTab = 'funnels', isAdmin }) => {
  const [activeSubTab, setActiveSubTab] = useState<string>(initialTab);

  // Definir pestañas para la navegación horizontal
  const tabs = [
    { id: 'funnels', label: 'Funnels', type: 'active' },
    { id: 'sitios', label: 'Sitios', type: 'active' },
    { id: 'seo', label: 'SEO', type: 'active', beta: true },
    ...(isAdmin ? [{ id: 'analytics', label: 'Analítica', type: 'active' }] : []),
    { id: 'comments', label: 'Comentarios', type: 'active' },
    { id: 'blogs', label: 'Blogs', type: 'placeholder' },
    { id: 'formularios', label: 'Formularios', type: 'active' }
  ];

  const renderContent = () => {
    switch (activeSubTab) {
      case 'funnels':
        return <FunnelsManager />;
      case 'sitios':
        return <SitiosManager />;
      case 'seo':
        return <SeoManager />;
      case 'analytics':
        return <ProductAnalyticsView />;
      case 'comments':
        return <CommentsManager />;
      case 'blogs':
        return (
          <PlaceholderView
            title="Gestor de Blogs"
            description="Crea artículos y contenido optimizado para atraer tráfico orgánico a tu tienda en línea."
          />
        );
      case 'formularios':
        return <FormBuilder />;
      default:
        return <FunnelsManager />;
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
