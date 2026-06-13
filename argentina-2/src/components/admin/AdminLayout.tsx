import React, { ReactNode, useState, useEffect, useRef } from 'react';
import {
  Bell,
  Search,
  User,
  ChevronDown,
  Moon,
  Sun,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Megaphone,
  HelpCircle,
  X,
  LayoutGrid,
  Home,
  Calendar,
  Pencil,
  MoreVertical,
  Zap
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

interface AdminLayoutProps {
  children: ReactNode;
  isAdmin: boolean;
  isSubAdmin?: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  navigateToHome: () => void;
  userName?: string;
  userAvatar?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  isAdmin,
  isSubAdmin = false,
  activeTab,
  setActiveTab,
  navigateToHome,
  userName = "Administrador",
  userAvatar
}) => {
  const isMobile = useIsMobile();
  const { user, logout } = useAuth();
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(3);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showPlanIADialog, setShowPlanIADialog] = useState(false);
  const [showResolvePlansDialog, setShowResolvePlansDialog] = useState(false);
  const [showAnunciosDialog, setShowAnunciosDialog] = useState(false);

  const displayName = user?.name || userName || "Usuario";
  const displayRole = user?.isAdmin ? "Administrador" : "Usuario";

  console.log('[AdminLayout] Render - showUserMenu:', showUserMenu, 'user:', user?.name);

  const handleLogout = async () => {
    console.log('[AdminLayout] handleLogout called');
    const confirmed = window.confirm('¿Cerrar sesión?');
    if (!confirmed) return;
    setShowUserMenu(false);
    try {
      await logout();
    } finally {
      window.location.href = '/';
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Close user menu when clicking outside (robust ref-based check)
  useEffect(() => {
    console.log('[AdminLayout] useEffect - showUserMenu:', showUserMenu);
    if (!showUserMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      console.log('[AdminLayout] Click outside detected, contains:', userMenuRef.current?.contains(target));
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        console.log('[AdminLayout] Closing menu');
        setShowUserMenu(false);
      }
    };

    // Add slight delay to avoid immediate closing
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showUserMenu]);

  // Header customized to match the design style
  const Header = () => {
    const [dateRange] = useState("2025-12-28 → 2026-01-27");

    const handleHelpClick = () => {
      console.log('[AdminLayout] Help icon clicked, navigating to help-manual');
      setActiveTab('help-manual');
    };

    const handleSparklesClick = () => {
      setShowPlanIADialog(true);
    };

    const handleMegaphoneClick = () => {
      setShowAnunciosDialog(true);
    };

    const handleBellClick = () => {
      console.log('[AdminLayout] Bell button clicked');
      // Mostrar notificaciones
      alert('Tienes ' + notificationsCount + ' notificaciones');
    };

    const handleSettingsClick = () => {
      console.log('[AdminLayout] Settings clicked');
      setActiveTab('configuration');
      setShowUserMenu(false);
    };

    const handleAvatarClick = () => {
      console.log('[AdminLayout] Avatar clicked, current showUserMenu:', showUserMenu);
      setShowUserMenu(prev => {
        console.log('[AdminLayout] Setting showUserMenu from', prev, 'to', !prev);
        return !prev;
      });
    };

    return (
      <div className="flex flex-col w-full z-30">
        {/* Top Notification Bar - Solid Blue */}
        <div className="bg-blue-500 text-white px-5 py-2 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center space-x-2 flex-1 justify-center">
            <span className="uppercase tracking-widest font-black text-sm">FREE MERCO</span>
            <button
              onClick={() => setActiveTab('planes')}
              className="ml-3 bg-blue-600 hover:bg-blue-700 text-white px-3 py-0.5 rounded text-xs font-semibold transition-colors"
            >
              Resolver
            </button>
          </div>
        </div>

        {/* Main Header Toolbar */}
        <header className="bg-white border-b border-slate-100 flex items-center justify-between px-6 py-3 z-20">
          {/* Left Section */}
          <div className="flex items-center space-x-3">
            {/* Navigation Chevrons */}
            <div className="flex items-center space-x-1 text-slate-400">
              <button className="p-1 hover:bg-slate-50 rounded transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-medium">1 / 1</span>
              <button className="p-1 hover:bg-slate-50 rounded transition-colors">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Dropdown Icons */}
            <div className="flex items-center space-x-1.5">
              <button className="flex items-center p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors">
                <LayoutGrid className="h-3.5 w-3.5 text-slate-500" />
                <ChevronDown className="h-2.5 w-2.5 text-slate-400 ml-0.5" />
              </button>
              <button className="flex items-center p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors">
                <Home className="h-3.5 w-3.5 text-slate-500" />
                <ChevronDown className="h-2.5 w-2.5 text-slate-400 ml-0.5" />
              </button>
            </div>

            {/* Dashboard Title */}
            <div className="flex flex-col ml-1.5">
              <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
                Panel de Control
              </h1>
              <a href="#" className="text-xs text-blue-500 hover:text-blue-600 font-medium mt-0.5">
                + Filtros Rápidos
              </a>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2">
            {/* Date Range Selector */}
            <button className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-100 transition-colors">
              <span>{dateRange}</span>
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* Starburst Icon */}
            <button className="p-1.5 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 transition-colors">
              <Zap className="h-3.5 w-3.5 text-slate-500" />
            </button>

            {/* Edit Dashboard Button */}
            <button
              onClick={() => console.log('[AdminLayout] Edit Dashboard clicked')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Editar Panel</span>
            </button>

            {/* More Options */}
            <button className="p-1.5 text-slate-400 hover:text-slate-500 transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>

            {/* Circular Action Icons */}
            <div className="flex items-center space-x-1.5 ml-1">
              {/* Home Button - Ir a la tienda */}
              <button
                onClick={navigateToHome}
                className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
                type="button"
                title="Ir a la tienda (Ecommerce)"
              >
                <Home className="h-4 w-4" />
              </button>

              {/* Plan sin IA - Blue */}
              <button
                onClick={handleSparklesClick}
                className="w-8 h-8 rounded-full bg-blue-400 text-white flex items-center justify-center hover:bg-blue-500 transition-colors cursor-pointer"
                type="button"
                title="Plan IA"
              >
                <Sparkles className="h-4 w-4" />
              </button>

              {/* Anuncios Websy */}
              <button
                onClick={handleMegaphoneClick}
                className="w-8 h-8 rounded-full bg-slate-400 text-white flex items-center justify-center hover:bg-slate-500 transition-colors cursor-pointer"
                type="button"
                title="Anuncios Websy"
              >
                <Megaphone className="h-4 w-4" />
              </button>

              {/* Bell - Orange */}
              <button
                onClick={handleBellClick}
                className="w-8 h-8 rounded-full bg-orange-400 text-white flex items-center justify-center hover:bg-orange-500 transition-colors cursor-pointer"
                type="button"
                title="Notificaciones"
              >
                <Bell className="h-4 w-4" />
              </button>

              {/* Help - Blue */}
              <button
                onClick={handleHelpClick}
                className="w-8 h-8 rounded-full bg-blue-400 text-white flex items-center justify-center hover:bg-blue-500 transition-colors cursor-pointer"
                type="button"
                title="Manual de Ayuda"
              >
                <HelpCircle className="h-4 w-4" />
              </button>

              {/* User Avatar - Green */}
              <div className="relative ml-0.5" ref={userMenuRef}>
                <button
                  onClick={handleAvatarClick}
                  onMouseEnter={() => console.log('[AdminLayout] Mouse entered avatar')}
                  onMouseDown={() => console.log('[AdminLayout] Mouse down on avatar')}
                  className="w-8 h-8 rounded-full bg-green-400 text-white flex items-center justify-center font-semibold text-xs hover:bg-green-500 transition-colors cursor-pointer relative z-50"
                  type="button"
                  style={{ pointerEvents: 'auto' }}
                >
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    displayName.substring(0, 2).toUpperCase()
                  )}
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-[9999] animate-in slide-in-from-top-5 duration-200">
                    {console.log('[AdminLayout] Dropdown rendered!')}
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-700">{displayName}</p>
                      <p className="text-xs text-slate-500">{displayRole}</p>
                    </div>
                    <ul>
                      <li>
                        <button className="flex items-center space-x-3 w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">
                          <User className="h-4 w-4 text-slate-400" />
                          <span>Mi perfil</span>
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={handleSettingsClick}
                          className="flex items-center space-x-3 w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                        >
                          <Settings className="h-4 w-4 text-slate-400" />
                          <span>Configuración</span>
                        </button>
                      </li>
                      <li className="border-t border-slate-100 mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-3 w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50"
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

        {/* Dialog: Planes Avanzados (Resolve) */}
        <Dialog open={showResolvePlansDialog} onOpenChange={setShowResolvePlansDialog}>
          <DialogContent className="max-w-4xl rounded-2xl border-slate-200 bg-slate-50/95 backdrop-blur-md p-6">
            <DialogHeader className="text-center pb-4">
              <DialogTitle className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-600 animate-pulse" />
                Planes Avanzados Merco
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 max-w-lg mx-auto">
                Escala tu negocio seleccionando uno de nuestros planes avanzados. Diseñados para potenciar tus ventas y automatizar la atención a tus clientes.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* PLAN BASE */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
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

                  <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
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

                <div className="mt-6">
                  <Button
                    onClick={() => {
                      toast({ title: "Plan Seleccionado", description: "Iniciando proceso de suscripción al Plan Base de $50 USD." });
                      setShowResolvePlansDialog(false);
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2"
                  >
                    Adquirir Plan Base
                  </Button>
                </div>
              </div>

              {/* PLAN INTERMEDIO (Destacado) */}
              <div className="bg-gradient-to-b from-blue-50 to-white rounded-xl border-2 border-blue-500 p-5 shadow-md hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
                {/* Popular Badge */}
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-bold uppercase tracking-wider py-1 px-3 rounded-bl-lg" style={{ backgroundColor: '#2563eb' }}>
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

                  <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
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

                <div className="mt-6">
                  <Button
                    onClick={() => {
                      toast({ title: "Plan Seleccionado", description: "Iniciando proceso de suscripción al Plan Intermedio de $120 USD." });
                      setShowResolvePlansDialog(false);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 shadow-sm"
                  >
                    Adquirir Plan Intermedio
                  </Button>
                </div>
              </div>

              {/* PLAN AVANZADO */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
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

                  <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
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

                <div className="mt-6">
                  <Button
                    onClick={() => {
                      toast({ title: "Plan Seleccionado", description: "Iniciando proceso de suscripción al Plan Avanzado de $500 USD." });
                      setShowResolvePlansDialog(false);
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2"
                  >
                    Adquirir Plan Avanzado
                  </Button>
                </div>
              </div>
            </div>
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
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className={cn("flex-shrink-0", isMobile ? "hidden" : "block")}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isAdmin={isAdmin}
          isSubAdmin={isSubAdmin}
          navigateToHome={navigateToHome}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />

        {/* Tab Title — hidden for tabs that manage their own header */}
        {activeTab !== 'dashboard' && activeTab !== 'opportunities' && (
          <div className="bg-white px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">
              {sidebarItems.find(item => item.id === activeTab)?.label}
            </h2>
            <div className="flex items-center text-sm text-slate-500 mt-1">
              <span>Aplicación</span>
              <span className="mx-2">/</span>
              <span className="text-blue-500 font-medium">{sidebarItems.find(item => item.id === activeTab)?.label}</span>
            </div>
          </div>
        )}

        {/* Content Container — no padding for opportunities (manages own layout) */}
        <div className={`flex-1 overflow-auto ${activeTab === 'opportunities' ? '' : 'p-6'}`}>
          <div className="max-w-full mx-auto h-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Import sidebarItems here so they're accessible to both components
const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', description: 'Vista general del sistema' },
  { id: 'mensajeria', label: 'Mensajes', description: 'Chats y WhatsApp' },
  { id: 'contacts', label: 'Contactos', description: 'Gestión de contactos' },
  { id: 'calendars', label: 'Calendario', description: 'Citas y reservas' },
  { id: 'opportunities', label: 'Oportunidades', description: 'Embudo de ventas' },
  { id: 'products', label: 'Productos', description: 'Gestión de inventario' },
  { id: 'marketing', label: 'Marketing', description: 'Correos masivos y campañas' },
  { id: 'media', label: 'Contenido multimedia', description: 'Biblioteca de archivos' },
  { id: 'orders', label: 'Pedidos', description: 'Control de ventas' },
  { id: 'website', label: 'Sitio Web', description: 'Páginas, funnels, SEO...' },
  { id: 'categories', label: 'Categorías', description: 'Organizar productos' },
  { id: 'ai-assistant', label: 'Asistente IA', description: 'Inteligencia artificial' },
  { id: 'payment-gateways', label: 'Pasarelas de Pago', description: 'Configurar pasarelas de pago' },
  { id: 'subaccounts', label: 'Subcuentas', description: 'Gestión de accesos' },
  { id: 'analytics', label: 'Analítica', description: 'Estadísticas avanzadas' },
  { id: 'info', label: 'Info Secciones', description: 'Configuración general' },
  { id: 'help-manual', label: 'Manual de Ayuda', description: 'Guías y tutoriales' },
  { id: 'revisiones', label: 'Revisiones', description: 'Aprobar cambios' },
  { id: 'employees', label: 'Empleados', description: 'Gestión de personal' }
];

export default AdminLayout;
