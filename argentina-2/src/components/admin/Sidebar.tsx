import React, { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  MessageSquare,
  MessageCircle,
  Calendar,
  Contact,
  Lightbulb,
  CreditCard,
  Bot,
  Megaphone,
  Workflow,
  Globe,
  Settings,
  Home,
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  DollarSign,
  AlertCircle,
  Tag,
  BrainCog,
  HelpCircle,
  PlusCircle,
  Share2,
  Building2,
  ChevronLeft,
  Send,
  Image,
  Star,
  Kanban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  isSubAdmin: boolean;
  navigateToHome: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isAdmin,
  isSubAdmin,
  navigateToHome
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [showConfigurationMenu, setShowConfigurationMenu] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [companyCity, setCompanyCity] = useState<string>('');
  const [companyState, setCompanyState] = useState<string>('');
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);

  // Determinar qué mostrar en el sidebar
  const showMainMenu = !showConfigurationMenu;

  // Función para cargar el perfil de empresa
  const loadCompanyProfile = async () => {
    const isSupabase = typeof (db as any)?.from === 'function';
    try {
      if (isSupabase) {
        const { data, error } = await db
          .from('company_profile')
          .select()
          .maybeSingle();

        if (error) {
          if (error.code !== 'PGRST116') {
            console.warn('[Sidebar] company_profile:', error.code || 'error', (error as any)?.message || error);
          }
          return;
        }
        if (data) {
          if (data.logo) setCompanyLogo(data.logo);
          if (data.friendly_name) setCompanyName(data.friendly_name);
          if (data.city) setCompanyCity(data.city);
          if (data.state) setCompanyState(data.state);
        }
      }
    } catch (e: any) {
      console.warn('[Sidebar] company_profile load failed:', e?.message || e);
    }
  };

  // Cargar logo de empresa al montar el componente
  useEffect(() => {
    loadCompanyProfile();
  }, []);

  // Escuchar cambios en el perfil de empresa (cuando se actualiza el logo)
  useEffect(() => {
    const handleProfileUpdate = () => {
      // Recargar el perfil después de un pequeño delay para asegurar que la BD se actualizó
      setTimeout(() => {
        loadCompanyProfile();
      }, 500);
    };

    window.addEventListener('companyProfileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('companyProfileUpdated', handleProfileUpdate);
    };
  }, []);

  // Recargar logo cuando cambia la pestaña activa (por si se actualizó en otra vista)
  useEffect(() => {
    loadCompanyProfile();
  }, [activeTab]);

  // Abrir el menú de configuración automáticamente si estamos en configuration, subaccounts, info, filters, wpp, mail-config, revisiones, payment-gateways o modalities
  useEffect(() => {
    if (activeTab === 'configuration' || activeTab === 'subaccounts' || activeTab === 'info' || activeTab === 'filters' || activeTab === 'wpp' || activeTab === 'mail-config' || activeTab === 'revisiones' || activeTab === 'payment-gateways' || activeTab === 'modalities') {
      setShowConfigurationMenu(true);
    } else {
      setShowConfigurationMenu(false);
    }
  }, [activeTab]);

  // Cerrar sidebar automáticamente al cambiar de pestaña en móvil
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [activeTab, isMobile]);

  // Escuchar cambios de tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(!isMobile);
    };

    // Inicializar estado
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  const sidebarItems = [
    ...(isSubAdmin ? [] : [
      { id: 'dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', description: 'Vista general' }
    ]),
    { id: 'mensajeria', icon: <MessageSquare className="h-5 w-5" />, label: 'Mensajes', description: 'Chats y WhatsApp' },
    { id: 'contacts', icon: <Contact className="h-5 w-5" />, label: 'Contactos', description: 'Gestión de clientes' },
    { id: 'calendars', icon: <Calendar className="h-5 w-5" />, label: 'Calendario', description: 'Citas y reservas' },
    { id: 'opportunities', icon: <Kanban className="h-5 w-5" />, label: 'Oportunidades', description: 'Embudo de ventas' },
    { id: 'products', icon: <Package className="h-5 w-5" />, label: 'Productos', description: 'Gestión de inventario' },
    { id: 'marketing', icon: <Send className="h-5 w-5" />, label: 'Marketing', description: 'Correos masivos y campañas' },
    { id: 'orders', icon: <ShoppingCart className="h-5 w-5" />, label: 'Pedidos', description: 'Control de ventas' },
    { id: 'website', icon: <Globe className="h-5 w-5" />, label: 'Sitio Web', description: 'Páginas, funnels, SEO...' },
    { id: 'categories', icon: <Tag className="h-5 w-5" />, label: 'Categorías', description: 'Organizar productos' },
    { id: 'ai-assistant', icon: <Bot className="h-5 w-5" />, label: 'Asistente IA', description: 'Inteligencia artificial' },
  ];

  const handleNavigation = (id: string) => {
    setActiveTab(id);
    if (isMobile) setIsSidebarOpen(false);
  };

  const isTabActive = (itemId: string) => {
    if (activeTab === itemId) return true;

    // Si es sitio web y estamos en alguna de sus sub-páginas
    if (itemId === 'website' && ['website', 'funnels', 'sitios', 'seo', 'analytics', 'comments'].includes(activeTab)) {
      return true;
    }

    return false;
  };

  // Animación para iconos
  const iconAnimation = (isActive: boolean) => {
    return isActive ? "scale-110 transform transition-all duration-300" : "transform transition-all duration-300";
  };

  // Toggle button para móvil con diseño mejorado
  const MobileToggleButton = () => (
    <button
      onClick={toggleSidebar}
      className="fixed z-50 bottom-6 right-6 w-16 h-16 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 flex items-center justify-center shadow-lg text-white lg:hidden transform hover:scale-105 transition-all duration-300"
      aria-label={isSidebarOpen ? "Cerrar menú" : "Abrir menú"}
      style={{
        boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5), 0 8px 10px -6px rgba(59, 130, 246, 0.3)'
      }}
    >
      <div className="relative">
        {isSidebarOpen ?
          <X className="h-7 w-7 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-in zoom-in-95 duration-300" /> :
          <Menu className="h-7 w-7 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-in zoom-in-95 duration-300" />
        }
      </div>
    </button>
  );

  return (
    <>
      {/* Overlay para móvil cuando el sidebar está abierto con blur mejorado */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-40 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar con diseño mejorado */}
      <div
        className={cn(
          "h-screen bg-[#1e293b] text-slate-300 flex flex-col z-40 admin-sidebar notranslate critical-ui-container w-[220px]",
          isMobile ? "fixed left-0 top-0 transition-all duration-500 ease-in-out transform" : "",
          isMobile && !isSidebarOpen ? "-translate-x-full" : "translate-x-0"
        )}
        translate="no"
      >
        {/* Brand Logo Area */}
        <div className="h-16 flex items-center justify-center px-6 border-b border-slate-700/50">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName}
              className="h-12 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                setCompanyLogo(null);
              }}
            />
          ) : (
            <h1 className="text-xl font-bold text-orange-500 tracking-wider">{companyName}</h1>
          )}
        </div>

        {/* User / Location Selector */}
        <div className="p-4">
          <div
            className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors"
            onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {companyName.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-white truncate">{companyName}</span>
                <span className="text-xs text-slate-400 truncate">
                  {companyCity && companyState ? `${companyCity}, ${companyState}` : companyCity || companyState || 'Sin ubicación'}
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isBranchMenuOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {/* Dropdown de sucursales */}
          {isBranchMenuOpen && (
            <div className="mt-2 bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
              <p className="text-xs text-slate-400 text-center italic">
                No hay sucursales asociadas
              </p>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="px-4 mb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-md py-2 pl-9 pr-12 text-sm text-slate-300 focus:outline-none focus:border-slate-600 placeholder-slate-500"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <span className="text-[10px] text-slate-500 bg-slate-800 px-1 rounded border border-slate-700">ctrlK</span>
              <button className="text-emerald-500 hover:text-emerald-400">
                <div className="w-4 h-4 bg-emerald-500/20 rounded flex items-center justify-center">
                  <span className="text-xs font-bold">+</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar">
          {showMainMenu ? (
            <ul className="space-y-1">
              {sidebarItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <li>
                    <button
                      onClick={() => {
                        if (item.hasDropdown && item.toggleDropdown) {
                          item.toggleDropdown();
                        } else {
                          handleNavigation(item.id);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center px-4 py-2.5 rounded-md text-left transition-all duration-200 group relative",
                        isTabActive(item.id)
                          ? "bg-slate-800 text-white font-medium"
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                      )}
                    >
                      {/* Active Indicator Line for main items */}
                      {isTabActive(item.id) && !item.hasDropdown && (
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-1 bg-orange-500 rounded-r-md" />
                      )}

                      <span className={cn(
                        "flex-shrink-0 mr-3",
                        isTabActive(item.id) ? "text-orange-500" : "text-slate-500 group-hover:text-slate-400"
                      )}>
                        {item.icon}
                      </span>

                      <span className="truncate flex-1">
                        {item.label}
                      </span>

                      {/* Dropdown chevron */}
                      {item.hasDropdown && (
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          item.isDropdownOpen ? "transform rotate-180" : ""
                        )} />
                      )}
                    </button>

                    {/* Dropdown Items */}
                    {item.hasDropdown && item.isDropdownOpen && item.dropdownItems && (
                      <div className="mt-1 ml-4 space-y-1 border-l border-slate-700/50 pl-2 animate-in slide-in-from-top-2 duration-200">
                        {item.dropdownItems.map(subItem => (
                          <button
                            key={subItem.id}
                            onClick={() => handleNavigation(subItem.id)}
                            className={cn(
                              "w-full flex items-center px-4 py-2 rounded-md text-left transition-all duration-200 text-sm group",
                              isTabActive(subItem.id)
                                ? "text-white bg-slate-800/50"
                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                            )}
                          >
                            <span className={cn(
                              "mr-3",
                              isTabActive(subItem.id) ? "text-orange-500" : "text-slate-600 group-hover:text-slate-400"
                            )}>
                              {React.cloneElement(subItem.icon as React.ReactElement, { className: "h-4 w-4" })}
                            </span>
                            <span className="truncate">{subItem.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                </React.Fragment>
              ))}
            </ul>
          ) : (
            /* Menú de Configuración */
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setShowConfigurationMenu(false)}
                  className="w-full flex items-center px-4 py-2.5 rounded-md text-left transition-all duration-200 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 group"
                >
                  <ChevronLeft className="h-5 w-5 mr-3 text-slate-500 group-hover:text-slate-400" />
                  <span className="truncate flex-1">Volver atrás</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    handleNavigation('configuration');
                  }}
                  className={cn(
                    "w-full flex items-center px-4 py-2.5 rounded-md text-left transition-all duration-200 group relative",
                    isTabActive('configuration')
                      ? "bg-slate-800 text-white font-medium"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  )}
                >
                  {isTabActive('configuration') && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-1 bg-orange-500 rounded-r-md" />
                  )}
                  <span className="truncate flex-1">Perfil de empresa</span>
                </button>
              </li>
              {isAdmin && (
                <li>
                  <button
                    onClick={() => {
                      handleNavigation('subaccounts');
                    }}
                    className={cn(
                      "w-full flex items-center px-4 py-2.5 rounded-md text-left transition-all duration-200 group relative",
                      isTabActive('subaccounts')
                        ? "bg-slate-800 text-white font-medium"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    )}
                  >
                    {isTabActive('subaccounts') && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-1 bg-orange-500 rounded-r-md" />
                    )}
                    <span className="truncate flex-1">Subcuentas</span>
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => {
                    handleNavigation('info');
                  }}
                  className={cn(
                    "w-full flex items-center px-4 py-2.5 rounded-md text-left transition-all duration-200 group relative",
                    isTabActive('info')
                      ? "bg-slate-800 text-white font-medium"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  )}
                >
                  {isTabActive('info') && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-1 bg-orange-500 rounded-r-md" />
                  )}
                  <span className="truncate flex-1">Info Secciones</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    handleNavigation('filters');
                  }}
                  className={cn(
                    "w-full flex items-center px-4 py-2.5 rounded-md text-left transition-all duration-200 group relative",
                    isTabActive('filters')
                      ? "bg-slate-800 text-white font-medium"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  )}
                >
                  {isTabActive('filters') && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-1 bg-orange-500 rounded-r-md" />
                  )}
                  <span className="truncate flex-1">Filtros</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    handleNavigation('modalities');
                  }}
                  className={cn(
                    "w-full flex items-center px-4 py-2.5 rounded-md text-left transition-all duration-200 group relative",
                    isTabActive('modalities')
                      ? "bg-slate-800 text-white font-medium"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  )}
                >
                  {isTabActive('modalities') && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-1 bg-orange-500 rounded-r-md" />
                  )}
                  <span className="truncate flex-1">Modalidades de Producto</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    handleNavigation('wpp');
                  }}
                  className={cn(
                    "w-full flex items-center px-4 py-2.5 rounded-md text-left transition-all duration-200 group relative",
                    isTabActive('wpp')
                      ? "bg-slate-800 text-white font-medium"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  )}
                >
                  {isTabActive('wpp') && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-1 bg-orange-500 rounded-r-md" />
                  )}
                  <span className="truncate flex-1">WhatsApp (WPP)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    handleNavigation('mail-config');
                  }}
                  className={cn(
                    "w-full flex items-center px-4 py-2.5 rounded-md text-left transition-all duration-200 group relative",
                    isTabActive('mail-config')
                      ? "bg-slate-800 text-white font-medium"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  )}
                >
                  {isTabActive('mail-config') && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-1 bg-orange-500 rounded-r-md" />
                  )}
                  <span className="truncate flex-1">Correos (IMAP/SMTP)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    handleNavigation('payment-gateways');
                  }}
                  className={cn(
                    "w-full flex items-center px-4 py-2.5 rounded-md text-left transition-all duration-200 group relative",
                    isTabActive('payment-gateways')
                      ? "bg-slate-800 text-white font-medium"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  )}
                >
                  {isTabActive('payment-gateways') && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-1 bg-orange-500 rounded-r-md" />
                  )}
                  <span className="truncate flex-1">Pasarelas de Pago</span>
                </button>
              </li>
              {!isSubAdmin && (
                <li>
                  <button
                    onClick={() => {
                      handleNavigation('revisiones');
                    }}
                    className={cn(
                      "w-full flex items-center px-4 py-2.5 rounded-md text-left transition-all duration-200 group relative",
                      isTabActive('revisiones')
                        ? "bg-slate-800 text-white font-medium"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    )}
                  >
                    {isTabActive('revisiones') && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-1 bg-orange-500 rounded-r-md" />
                    )}
                    <span className="truncate flex-1">Revisiones</span>
                  </button>
                </li>
              )}
            </ul>
          )}
        </nav>

        {/* Footer Actions - Configuración separada */}
        {showMainMenu && (
          <div className="px-4 py-2 border-t border-slate-700/50 mt-auto">
            <button
              onClick={() => {
                setShowConfigurationMenu(true);
                handleNavigation('configuration');
              }}
              className={cn(
                "w-full flex items-center px-3 py-2 rounded-md text-left transition-all duration-200 group relative",
                isTabActive('configuration') || isTabActive('subaccounts') || isTabActive('info') || isTabActive('filters') || isTabActive('wpp') || isTabActive('mail-config') || isTabActive('revisiones') || isTabActive('payment-gateways') || isTabActive('modalities')
                  ? "bg-slate-800 text-white font-medium"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              )}
            >
              {/* Active Indicator Line */}
              {(isTabActive('configuration') || isTabActive('subaccounts') || isTabActive('info') || isTabActive('filters') || isTabActive('wpp') || isTabActive('mail-config') || isTabActive('revisiones') || isTabActive('payment-gateways') || isTabActive('modalities')) && (
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-5 w-1 bg-orange-500 rounded-r-md" />
              )}

              <span className={cn(
                "flex-shrink-0 mr-2.5",
                (isTabActive('configuration') || isTabActive('subaccounts') || isTabActive('info') || isTabActive('filters') || isTabActive('wpp') || isTabActive('mail-config') || isTabActive('revisiones') || isTabActive('payment-gateways') || isTabActive('modalities')) ? "text-orange-500" : "text-slate-500 group-hover:text-slate-400"
              )}>
                <Settings className="h-4 w-4" />
              </span>

              <span className="truncate flex-1 text-sm">
                Configuración
              </span>
            </button>

            {/* Collapse Sidebar Button (Visual only for now matching design) */}
            <div className="absolute -right-3 bottom-6">
              <button className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-emerald-600 transition-colors">
                <ChevronRight className="h-3 w-3 transform rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Botón toggle para móvil */}
      {isMobile && <MobileToggleButton />}
    </>
  );
};

export default Sidebar;
