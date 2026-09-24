import React, { useState, useEffect, useRef } from 'react';
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
  Kanban,
  Factory,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessAdminTab } from '@/lib/agency-permissions';
import { getActiveAgencyId, normalizeAgencyId } from '@/lib/agency-isolation';

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
  const { user, switchAgency } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [showConfigurationMenu, setShowConfigurationMenu] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [companyCity, setCompanyCity] = useState<string>('');
  const [companyState, setCompanyState] = useState<string>('');
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);
  const [isSwitchingAgency, setIsSwitchingAgency] = useState(false);
  const branchMenuRef = useRef<HTMLDivElement | null>(null);

  // Close branch/agency menu when clicking outside
  useEffect(() => {
    if (!isBranchMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (branchMenuRef.current && !branchMenuRef.current.contains(target)) {
        setIsBranchMenuOpen(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isBranchMenuOpen]);

  const handleAgencySwitch = async (agencyId: string) => {
    if (agencyId === user?.agencyId) return;
    setIsSwitchingAgency(true);
    try {
      toast({
        title: "Cambiando de agencia...",
        description: "Cargando espacio de trabajo.",
      });
      const res = await switchAgency(agencyId);
      if (!res.success) {
        throw res.error;
      }
      setIsBranchMenuOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast({
        title: "Error al cambiar de agencia",
        description: err?.message || "No se pudo cambiar de agencia.",
        variant: "destructive"
      });
      setIsSwitchingAgency(false);
    }
  };

  // Determinar qué mostrar en el sidebar
  const showMainMenu = !showConfigurationMenu;

  // Función para cargar el perfil de empresa de la agencia activa
  const loadCompanyProfile = async () => {
    const isSupabase = typeof (db as any)?.from === 'function';
    const activeAgency = getActiveAgencyId(user);
    const isVoltiumAgency = normalizeAgencyId(activeAgency) === 'voltium-sanrey';
    if (isVoltiumAgency) {
      setCompanyCity('México · ubicación pendiente de confirmar');
      setCompanyState('');
    }
    try {
      if (isSupabase) {
        let query = db.from('company_profile').select();
        if (activeAgency) {
          query = query.or(`owner_id.eq.${activeAgency},agency_id.eq.${activeAgency}`);
        }
        const { data, error } = await query.maybeSingle();

        if (error) {
          if (error.code !== 'PGRST116') {
            console.warn('[Sidebar] company_profile:', error.code || 'error', (error as any)?.message || error);
          }
        }
        if (data) {
          setCompanyLogo(data.logo || null);
          setCompanyName(data.friendly_name || data.legal_name || (activeAgency === 'voltium-sanrey' ? 'Voltium Sanrey' : 'Websy'));
          setCompanyCity(isVoltiumAgency ? 'México · ubicación pendiente de confirmar' : (data.city || ''));
          setCompanyState(isVoltiumAgency ? '' : (data.state || ''));
        } else {
          setCompanyLogo(null);
          if (activeAgency === 'voltium-sanrey') {
            setCompanyName('Voltium Sanrey');
            setCompanyCity('México · ubicación pendiente de confirmar');
            setCompanyState('');
          } else {
            setCompanyName('Websy');
            setCompanyCity('');
            setCompanyState('');
          }
        }
      }
    } catch (e: any) {
      console.warn('[Sidebar] company_profile load failed:', e?.message || e);
    }
  };

  // Cargar logo de empresa al montar el componente o cambiar de agencia
  useEffect(() => {
    loadCompanyProfile();
  }, [user?.agencyId]);

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
  }, [user?.agencyId]);

  // Recargar logo cuando cambia la pestaña activa (por si se actualizó en otra vista)
  useEffect(() => {
    loadCompanyProfile();
  }, [activeTab, user?.agencyId]);

  // Abrir el menú de configuración automáticamente si estamos en configuration, subaccounts, info, filters, wpp, mail-config, revisiones, payment-gateways o modalities
  useEffect(() => {
    if (activeTab === 'configuration' || activeTab === 'subaccounts' || activeTab === 'wpp' || activeTab === 'mail-config' || activeTab === 'revisiones' || activeTab === 'payment-gateways' || activeTab === 'modalities' || activeTab === 'facturacion' || activeTab === 'seguridad') {
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

  // Escuchar evento de toggle desde componentes externos (ej. header en AdminPanel)
  useEffect(() => {
    const handleToggle = () => {
      setIsSidebarOpen(prev => !prev);
    };
    window.addEventListener('toggleSidebar', handleToggle);
    return () => window.removeEventListener('toggleSidebar', handleToggle);
  }, []);

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const sidebarItems = [
    { id: 'dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', description: 'Vista general' },
    { id: 'mensajeria', icon: <MessageSquare className="h-5 w-5" />, label: 'Mensajes', description: 'Chats y WhatsApp' },
    { id: 'contacts', icon: <Contact className="h-5 w-5" />, label: 'Contactos', description: 'Gestión de clientes' },
    { id: 'calendars', icon: <Calendar className="h-5 w-5" />, label: 'Calendario', description: 'Citas y reservas' },
    { id: 'opportunities', icon: <Kanban className="h-5 w-5" />, label: 'Oportunidades', description: 'Embudo de ventas' },
    ...(isSubAdmin && canAccessAdminTab(user, 'products') ? [
      { id: 'products', icon: <Tag className="h-5 w-5" />, label: 'Productos', description: 'Catálogo e inventario' }
    ] : []),
    { id: 'marketing', icon: <Send className="h-5 w-5" />, label: 'Marketing', description: 'Correos masivos y campañas' },
    { id: 'orders', icon: <ShoppingCart className="h-5 w-5" />, label: 'Pedidos', description: 'Control de ventas' },
    { id: 'erp', icon: <Factory className="h-5 w-5" />, label: 'ERP Integral', description: 'Operaciones y recursos' },
    { id: 'website', icon: <Globe className="h-5 w-5" />, label: 'Sitio Web', description: 'Páginas, funnels, SEO...' },
    { id: 'ai-assistant', icon: <Bot className="h-5 w-5" />, label: 'Asistente IA', description: 'Disponible próximamente' },
    { id: 'contabilidad', icon: <DollarSign className="h-5 w-5" />, label: 'Contabilidad', description: 'Ingresos y egresos' },
  ];
  const visibleSidebarItems = sidebarItems.filter((item) => item.id === 'ai-assistant' || canAccessAdminTab(user, item.id));
  const canManageSettings = canAccessAdminTab(user, 'configuration');
  const canViewAccounting = canAccessAdminTab(user, 'facturacion');
  const canOpenConfigurationMenu = canManageSettings || canViewAccounting || isAdmin;

  const handleNavigation = (id: string) => {
    setActiveTab(id);
    if (isMobile) setIsSidebarOpen(false);
  };

  const isTabActive = (itemId: string) => {
    if (activeTab === itemId) return true;

    // Si es sitio web y estamos en alguna de sus sub-páginas
    if (itemId === 'website' && ['website', 'funnels', 'sitios', 'seo', 'analytics', 'reportes', 'comments', 'products', 'filters', 'categories'].includes(activeTab)) {
      return true;
    }

    return false;
  };

  // Animación para iconos
  const iconAnimation = (isActive: boolean) => {
    return isActive ? "scale-110 transform transition-all duration-300" : "transform transition-all duration-300";
  };

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
          "h-screen bg-[#eef3f6] text-slate-700 border-r border-[#9fb8c8] flex flex-col z-40 admin-sidebar notranslate critical-ui-container w-[220px] shadow-sm",
          isMobile ? "fixed left-0 top-0 transition-all duration-500 ease-in-out transform" : "",
          isMobile && !isSidebarOpen ? "-translate-x-full" : "translate-x-0"
        )}
        translate="no"
      >
        {/* Brand Logo Area */}
        <div className="h-16 flex items-center justify-center px-6 bg-white border-b border-[#b6cbd8]">
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
            <h1 className="text-xl font-bold text-[#245878] tracking-wide">{companyName || 'MERCO'}</h1>
          )}
        </div>

        {/* User / Location Selector & Agency Switcher */}
        {(() => {
          const currentAgency = user?.agencies?.find(a => a.id === user?.agencyId);
          const currentAgencyDisplayName = currentAgency?.name || companyName || 'Empresa principal';
          const agencyInitials = currentAgencyDisplayName
            .split(' ')
            .filter(Boolean)
            .map(word => word[0])
            .join('')
            .substring(0, 2)
            .toUpperCase() || 'EM';

          const activeAgencyId = user?.agencyId || currentAgency?.id || user?.agencies?.[0]?.id;
          const otherAgencies = (user?.agencies || []).filter(agency => agency.id !== activeAgencyId);

          return (
            <div className="p-4 relative" ref={branchMenuRef}>
              <div
                className="bg-white rounded-sm p-2.5 flex items-center justify-between border border-[#b6cbd8] cursor-pointer hover:bg-[#e4f1f8] transition-colors"
                onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
                title="Seleccionar agencia o sucursal"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-sm bg-[#397da8] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {agencyInitials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-[#244d68] truncate">{currentAgencyDisplayName}</span>
                    <span className="text-xs text-slate-500 truncate">
                      {companyCity && companyState ? `${companyCity}, ${companyState}` : companyCity || companyState || 'Espacio activo'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <ChevronDown className={`h-4 w-4 text-[#668aa1] transition-transform duration-200 ${isBranchMenuOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Dropdown de sucursales y agencias */}
              {isBranchMenuOpen && (
                <div className="mt-2 bg-white rounded-md shadow-lg border border-[#b6cbd8] overflow-hidden animate-in fade-in duration-150 z-50">
                  <div className="px-3 py-1.5 bg-[#f5f9fc] border-b border-[#e2edf3] flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#245878] uppercase tracking-wider">
                      {otherAgencies.length > 0 ? `Otras agencias (${otherAgencies.length})` : 'Otras agencias'}
                    </span>
                    {isSwitchingAgency && (
                      <div className="w-3 h-3 border-2 border-[#9fb8c8] border-t-[#245878] rounded-full animate-spin" />
                    )}
                  </div>

                  {otherAgencies.length > 0 ? (
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {otherAgencies.map((agency) => {
                        const itemInitials = (agency.name || 'AG')
                          .split(' ')
                          .filter(Boolean)
                          .map((w: string) => w[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase() || 'AG';
                        return (
                          <button
                            key={agency.id}
                            type="button"
                            disabled={isSwitchingAgency}
                            onClick={() => handleAgencySwitch(agency.id)}
                            className="w-full flex items-center justify-between p-2.5 text-left transition-colors text-xs hover:bg-[#f0f6fa] text-slate-700 cursor-pointer group"
                            title={`Cambiar a ${agency.name}`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-sm flex items-center justify-center text-xs font-bold shrink-0 bg-[#dde7ee] text-[#397da8] group-hover:bg-[#245878] group-hover:text-white transition-colors">
                                {itemInitials}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate leading-snug text-slate-700 group-hover:text-[#244d68]">
                                  {agency.name || 'Agencia'}
                                </p>
                                <span className="text-[10px] text-slate-400 block">
                                  {agency.role === 'owner' ? '👑 Propietario' : '👤 Colaborador'}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 text-center">
                      <p className="text-xs text-slate-400 italic">
                        No hay otras agencias disponibles
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Search Bar */}
        <div className="px-4 mb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar"
              className="w-full bg-white border border-[#b6cbd8] rounded-sm py-2 pl-9 pr-12 text-sm text-slate-700 focus:outline-none focus:border-[#6fa4c5] placeholder-slate-400"
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
              {visibleSidebarItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <li>
                    <button
                      disabled={item.id === 'ai-assistant'}
                      aria-disabled={item.id === 'ai-assistant'}
                      title={item.id === 'ai-assistant' ? 'Disponible próximamente' : item.description}
                      onClick={() => {
                        if (item.id === 'ai-assistant') return;
                        if (item.hasDropdown && item.toggleDropdown) {
                          item.toggleDropdown();
                        } else {
                          handleNavigation(item.id);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center px-4 py-2.5 rounded-md text-left transition-all duration-200 group relative",
                        item.id === 'ai-assistant'
                          ? 'cursor-not-allowed opacity-70'
                          : isTabActive(item.id)
                          ? "bg-[#d5eaf7] text-[#174e73] border border-[#9bc3dc] font-semibold"
                          : "text-slate-600 border border-transparent hover:bg-[#e2eff6] hover:text-[#174e73]"
                      )}
                    >
                      {/* Active Indicator Line for main items */}
                      {item.id !== 'ai-assistant' && isTabActive(item.id) && !item.hasDropdown && (
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-1 bg-[#2575a8]" />
                      )}

                      <span className={cn(
                        "flex-shrink-0 mr-3",
                        isTabActive(item.id) ? "text-[#2575a8]" : "text-[#668aa1] group-hover:text-[#397da8]"
                      )}>
                        {item.icon}
                      </span>

                      <span className="truncate flex-1">
                        <span className="block truncate">{item.label}</span>
                        {item.id === 'ai-assistant' && (
                          <span className="block truncate text-[9px] font-medium text-slate-500">Disponible próximamente</span>
                        )}
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
              {canManageSettings && <li>
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
              </li>}
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
              {canManageSettings && <li>
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
              </li>}
              {canManageSettings && <li>
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
              </li>}
              {canManageSettings && <li>
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
              </li>}
              {canManageSettings && <li>
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
              </li>}
              {isAdmin && (
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
              {canViewAccounting && <li>
                <button
                  onClick={() => {
                    handleNavigation('facturacion');
                  }}
                  className={cn(
                    "w-full flex items-center px-4 py-2.5 rounded-md text-left transition-all duration-200 group relative",
                    isTabActive('facturacion')
                      ? "bg-slate-800 text-white font-medium"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  )}
                >
                  {isTabActive('facturacion') && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-1 bg-orange-500 rounded-r-md" />
                  )}
                  <span className="truncate flex-1">Facturación</span>
                </button>
              </li>}
              {isAdmin && <li>
                <button
                  onClick={() => {
                    handleNavigation('seguridad');
                  }}
                  className={cn(
                    "w-full flex items-center px-4 py-2.5 rounded-md text-left transition-all duration-200 group relative",
                    isTabActive('seguridad')
                      ? "bg-slate-800 text-white font-medium"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  )}
                >
                  {isTabActive('seguridad') && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-1 bg-orange-500 rounded-r-md" />
                  )}
                  <span className="truncate flex-1">Seguridad</span>
                </button>
              </li>}
            </ul>
          )}
        </nav>

        {/* Footer Actions - Configuración separada */}
        {showMainMenu && canOpenConfigurationMenu && (
          <div className="px-4 py-2 border-t border-slate-700/50 mt-auto">
            <button
              onClick={() => {
                setShowConfigurationMenu(true);
                handleNavigation(canManageSettings ? 'configuration' : 'facturacion');
              }}
              className={cn(
                "w-full flex items-center px-3 py-2 rounded-md text-left transition-all duration-200 group relative",
                isTabActive('configuration') || isTabActive('subaccounts') || isTabActive('wpp') || isTabActive('mail-config') || isTabActive('revisiones') || isTabActive('payment-gateways') || isTabActive('modalities') || isTabActive('facturacion') || isTabActive('seguridad')
                  ? "bg-slate-800 text-white font-medium"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              )}
            >
              {/* Active Indicator Line */}
              {(isTabActive('configuration') || isTabActive('subaccounts') || isTabActive('wpp') || isTabActive('mail-config') || isTabActive('revisiones') || isTabActive('payment-gateways') || isTabActive('modalities') || isTabActive('facturacion') || isTabActive('seguridad')) && (
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-5 w-1 bg-orange-500 rounded-r-md" />
              )}

              <span className={cn(
                "flex-shrink-0 mr-2.5",
                (isTabActive('configuration') || isTabActive('subaccounts') || isTabActive('wpp') || isTabActive('mail-config') || isTabActive('revisiones') || isTabActive('payment-gateways') || isTabActive('modalities') || isTabActive('facturacion') || isTabActive('seguridad')) ? "text-orange-500" : "text-slate-500 group-hover:text-slate-400"
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

    </>
  );
};

export default Sidebar;
