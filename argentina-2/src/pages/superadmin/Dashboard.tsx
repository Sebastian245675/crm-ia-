import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Building2,
  Plus,
  Trash2,
  Edit,
  Search,
  Settings,
  Layers,
  Sparkles,
  Megaphone,
  Bell,
  HelpCircle,
  Copy,
  Check,
  Globe,
  Database,
  ArrowRight,
  ShieldAlert,
  User,
  Sliders,
  DollarSign,
  AlertTriangle,
  FolderOpen,
  LogOut,
  ChevronDown,
  ChevronRight,
  Rocket,
  Bot,
  BrainCog,
  HeartHandshake,
  Puzzle,
  BookOpen,
  GraduationCap,
  X,
  SlidersHorizontal,
  Languages
} from 'lucide-react';

interface SaaSStore {
  id: string;
  name: string;
  legalName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  plan: 'mensual' | 'anual' | 'trial' | 'free';
  status: 'activo' | 'suspendido';
  trialDays: number;
  credits: number;
  created_at?: string;
}

interface SaaSPlan {
  id: string;
  name: string;
  price: number;
  period: 'mensual' | 'anual';
  features: string[];
}

const DEFAULT_PLANS: SaaSPlan[] = [
  { id: 'plan-mensual', name: 'Plan Mensual', price: 97, period: 'mensual', features: ['Hasta 300 productos', '1 Agente IA', 'WhatsApp Integrado'] },
  { id: 'plan-anual', name: 'Plan Anual', price: 970, period: 'anual', features: ['Productos ilimitados', 'Agentes IA ilimitados', 'Soporte prioritario'] }
];

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // States
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('configurator');
  const [stores, setStores] = useState<SaaSStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [switcherSearchQuery, setSwitcherSearchQuery] = useState('');
  const [activeStore, setActiveStore] = useState<SaaSStore | null>(null);
  const [recentStores, setRecentStores] = useState<SaaSStore[]>([]);
  const [showPromoBanner, setShowPromoBanner] = useState(true);

  // Switcher and User Menu Refs
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const switcherRef = useRef<HTMLDivElement | null>(null);

  // Pricing settings
  const [monthlyPrice, setMonthlyPrice] = useState(97);
  const [annualPrice, setAnnualPrice] = useState(970);
  const [taxesEnabled, setTaxesEnabled] = useState(true);
  const [cancellationDays, setCancellationDays] = useState(3);
  const [downgradeOption, setDowngradeOption] = useState('free');

  // Modal creation states
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<SaaSStore | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storeLegalName, setStoreLegalName] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storePassword, setStorePassword] = useState(''); // Password state
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeCity, setStoreCity] = useState('');
  const [storeState, setStoreState] = useState('');
  const [storeCountry, setStoreCountry] = useState('Colombia');
  const [storePlan, setStorePlan] = useState<'mensual' | 'anual' | 'trial' | 'free'>('mensual');
  const [storeStatus, setStoreStatus] = useState<'activo' | 'suspendido'>('activo');
  const [storeTrialDays, setStoreTrialDays] = useState(14);
  const [storeCredits, setStoreCredits] = useState(0);

  const isSupabase = typeof (db as any)?.from === 'function';

  // Logout handler
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

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
      if (switcherRef.current && !switcherRef.current.contains(target)) {
        setShowSwitcher(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Fetch real stores/businesses from the db
  const loadStores = async () => {
    setLoading(true);
    try {
      if (isSupabase) {
        // Query saas_stores table
        const { data, error } = await db.from('saas_stores').select('*');
        if (error) throw error;

        let dbStores = data || [];
        
        // Define mock store identifiers to clear them out
        const mockStoreIds = ['store-1', 'store-2', 'store-3', 'store-4'];
        const mockNames = ['AFE Gym', 'Biosa Colombia', 'Boamori', 'Cenvalle'];
        
        // Find stores that are mock stores and delete them
        const storesToDelete = dbStores.filter((st: any) => 
          mockStoreIds.includes(st.id) || mockNames.includes(st.name)
        );

        if (storesToDelete.length > 0) {
          console.log('[SaaS Admin] Purging mock stores from database permanently...', storesToDelete);
          for (const st of storesToDelete) {
            await db.from('saas_stores').delete().eq('id', st.id);
          }
          // Re-fetch clean list
          const reload = await db.from('saas_stores').select('*');
          dbStores = reload.data || [];
        }

        setStores(dbStores);

        if (dbStores.length > 0) {
          // Default to the first store
          setActiveStore(dbStores[0]);
          setRecentStores(dbStores.slice(0, 2));
        } else {
          setActiveStore(null);
          setRecentStores([]);
        }
      }
    } catch (e) {
      console.error('Error loading real stores:', e);
      setStores([]);
      setActiveStore(null);
      setRecentStores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  // Save / Update real store
  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !storeEmail.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Nombre y Correo electrónico son obligatorios.' });
      return;
    }

    // If it's a new store creation, we need a password
    if (!selectedStore && !storePassword.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'La contraseña es obligatoria para nuevos registros.' });
      return;
    }

    try {
      let finalUserId = selectedStore?.id;

      // 1. Sign up the store owner in auth / usuarios table if it's a new registration
      if (!selectedStore) {
        console.log('[SaaS Admin] Registering administrative user for subaccount...', storeEmail);
        const { data: authData, error: authError } = await auth.signUp({
          email: storeEmail.trim(),
          password: storePassword,
          options: {
            data: {
              full_name: storeName.trim(),
              phone: storePhone.trim(),
              address: storeAddress.trim()
            }
          }
        });

        if (authError) throw authError;
        finalUserId = authData.user?.id || `store-${Date.now()}`;

        // Create profile in 'users' table as well
        await db.from('users').upsert({
          id: finalUserId,
          name: storeName.trim(),
          email: storeEmail.trim(),
          sub_cuenta: 'si',
          liberta: 'si',
          is_admin: true,
          phone: storePhone.trim(),
          address: storeAddress.trim(),
          city: storeCity.trim(),
          state: storeState.trim(),
          country: storeCountry
        });
      }

      // 2. Save store configuration to 'saas_stores'
      const storeData = {
        id: finalUserId,
        name: storeName.trim(),
        legalName: storeLegalName.trim(),
        email: storeEmail.trim(),
        phone: storePhone.trim(),
        address: storeAddress.trim(),
        city: storeCity.trim(),
        state: storeState.trim(),
        country: storeCountry,
        plan: storePlan,
        status: storeStatus,
        trialDays: Number(storeTrialDays),
        credits: Number(storeCredits),
        created_at: selectedStore?.created_at || new Date().toISOString()
      };

      if (isSupabase) {
        const { error } = await db.from('saas_stores').upsert(storeData);
        if (error) throw error;

        toast({
          title: selectedStore ? 'Subcuenta modificada' : 'Subcuenta creada',
          description: `El negocio "${storeName}" fue registrado exitosamente con acceso de usuario administrativo.`
        });

        setIsStoreModalOpen(false);
        loadStores();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: err.message });
    }
  };

  // Delete real store
  const handleDeleteStore = async (id: string, name: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la subcuenta "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      if (isSupabase) {
        const { error } = await db.from('saas_stores').delete().eq('id', id);
        if (error) throw error;

        // Also delete from users table
        await db.from('users').delete().eq('id', id);

        toast({ title: 'Subcuenta eliminada', description: `La subcuenta "${name}" fue eliminada de la base de datos.` });
        loadStores();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error al eliminar', description: err.message });
    }
  };

  const openCreateModal = () => {
    setSelectedStore(null);
    setStoreName('');
    setStoreLegalName('');
    setStoreEmail('');
    setStorePassword(''); // Clear password
    setStorePhone('');
    setStoreAddress('');
    setStoreCity('');
    setStoreState('');
    setStoreCountry('Colombia');
    setStorePlan('mensual');
    setStoreStatus('activo');
    setStoreTrialDays(14);
    setStoreCredits(0);
    setIsStoreModalOpen(true);
  };

  const openEditModal = (store: SaaSStore) => {
    setSelectedStore(store);
    setStoreName(store.name);
    setStoreLegalName(store.legalName || '');
    setStoreEmail(store.email);
    setStorePassword(''); // Clear/Not editing password
    setStorePhone(store.phone || '');
    setStoreAddress(store.address || '');
    setStoreCity(store.city || '');
    setStoreState(store.state || '');
    setStoreCountry(store.country || 'Colombia');
    setStorePlan(store.plan);
    setStoreStatus(store.status);
    setStoreTrialDays(store.trialDays);
    setStoreCredits(store.credits);
    setIsStoreModalOpen(true);
  };

  const filteredStores = useMemo(() => {
    return stores.filter(st => {
      const q = searchQuery.toLowerCase().trim();
      return !q ||
        st.name.toLowerCase().includes(q) ||
        (st.legalName && st.legalName.toLowerCase().includes(q)) ||
        st.email.toLowerCase().includes(q) ||
        (st.city && st.city.toLowerCase().includes(q)) ||
        (st.country && st.country.toLowerCase().includes(q));
    });
  }, [stores, searchQuery]);

  const filteredSwitcherStores = useMemo(() => {
    return stores.filter(st => {
      const q = switcherSearchQuery.toLowerCase().trim();
      return !q ||
        st.name.toLowerCase().includes(q) ||
        st.email.toLowerCase().includes(q);
    });
  }, [stores, switcherSearchQuery]);

  // Sidebar Menu Config - Translated entirely to Spanish
  const sidebarItems = [
    { id: 'get-free-ai', icon: <Rocket className="h-5 w-5" />, label: 'Obtenga IA Gratis', isPlaceholder: true },
    { id: 'ask-ai-tab', icon: <Bot className="h-5 w-5" />, label: 'Preguntar a la IA', isPlaceholder: true },
    { id: 'configurator', icon: <Sliders className="h-5 w-5" />, label: 'Configurador SaaS' },
    { id: 'prospecting', icon: <Search className="h-5 w-5" />, label: 'Prospección', isPlaceholder: true },
    { id: 'subaccounts', icon: <Building2 className="h-5 w-5" />, label: 'Subcuentas / Sitios' },
    { id: 'snapshots', icon: <Layers className="h-5 w-5" />, label: 'Instantáneas de Cuenta' },
    { id: 'reselling', icon: <DollarSign className="h-5 w-5" />, label: 'Reventa', isPlaceholder: true },
    { id: 'add-ons', icon: <Puzzle className="h-5 w-5" />, label: 'Complementos', isPlaceholder: true },
    { id: 'affiliate-portal', icon: <HeartHandshake className="h-5 w-5" />, label: 'Portal de Afiliados', isPlaceholder: true },
    { id: 'template-library', icon: <FolderOpen className="h-5 w-5" />, label: 'Biblioteca de Plantillas', isPlaceholder: true },
    { id: 'partners', icon: <User className="h-5 w-5" />, label: 'Socios', isPlaceholder: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans antialiased text-slate-800">
      
      {/* Sidebar - Identical layout & colors of the store admin panel */}
      <aside className="w-[220px] bg-[#1e293b] text-slate-300 flex flex-col shrink-0 h-screen fixed left-0 top-0 z-40 border-r border-slate-700/50">
        
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-center px-6 border-b border-slate-700/50">
          <span className="text-xl font-bold text-orange-500 tracking-wider">XENBUX</span>
        </div>

        {/* Location / Sub-account switcher button */}
        <div className="p-4 relative" ref={switcherRef}>
          <button
            onClick={() => setShowSwitcher(prev => !prev)}
            className="w-full bg-slate-800/50 rounded-lg p-3 flex items-center justify-between border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors text-left"
            type="button"
          >
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {activeStore ? activeStore.name.substring(0, 2).toUpperCase() : 'XS'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate leading-none">
                  {activeStore ? activeStore.name : 'Xenbux SaaS'}
                </span>
                <span className="text-[10px] text-slate-400 truncate mt-0.5">
                  {activeStore ? `${activeStore.city}, ${activeStore.country}` : 'Administrador'}
                </span>
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 ml-1" />
          </button>

          {/* Switcher Dropdown */}
          {showSwitcher && (
            <div className="absolute left-4 top-full mt-1 w-[300px] bg-white rounded-xl shadow-2xl border border-slate-200 py-3 z-[999] text-slate-800 animate-in slide-in-from-top-2 duration-200">
              <div className="px-3 pb-2.5 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar una subcuenta..."
                    value={switcherSearchQuery}
                    onChange={(e) => setSwitcherSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-900"
                  />
                </div>
              </div>
              
              <div className="max-h-[220px] overflow-y-auto custom-scrollbar mt-1.5">
                {stores.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No hay subcuentas registradas
                  </div>
                ) : (
                  <>
                    {/* RECENT Section */}
                    {recentStores.length > 0 && (
                      <>
                        <div className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Recientes
                        </div>
                        <div className="space-y-0.5 px-1.5 mt-0.5">
                          {recentStores.map(st => (
                            <button
                              key={`recent-${st.id}`}
                              onClick={() => {
                                setActiveStore(st);
                                setShowSwitcher(false);
                              }}
                              className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors text-left"
                            >
                              <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-[9px]">
                                {st.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 truncate leading-none">{st.name}</p>
                                <p className="text-[9px] text-slate-400 truncate mt-0.5">{st.city}, {st.state}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-slate-100 my-1.5" />
                      </>
                    )}

                    {/* ALL ACCOUNTS Section */}
                    <div className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Todas las subcuentas
                    </div>
                    <div className="space-y-0.5 px-1.5 mt-0.5">
                      {filteredSwitcherStores.map(st => (
                        <button
                          key={`all-${st.id}`}
                          onClick={() => {
                            setActiveStore(st);
                            setRecentStores(prev => {
                              const filtered = prev.filter(p => p.id !== st.id);
                              return [st, ...filtered].slice(0, 2);
                            });
                            setShowSwitcher(false);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-[9px]">
                            {st.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 truncate leading-none">{st.name}</p>
                            <p className="text-[9px] text-slate-400 truncate mt-0.5">{st.address || `${st.city}, ${st.state}`}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation - Styled identical to the store admin panel */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar space-y-1">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (item.isPlaceholder) {
                  toast({ title: item.label, description: 'Esta característica está activa para administración SaaS.' });
                }
              }}
              className={`w-full flex items-center px-4 py-2.5 rounded-md text-left transition-all duration-200 group relative ${
                activeTab === item.id 
                  ? 'bg-slate-800 text-white font-medium' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              {/* Active Tab Indicator line */}
              {activeTab === item.id && (
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-1 bg-orange-500 rounded-r-md" />
              )}
              
              <span className={`flex-shrink-0 mr-3 ${activeTab === item.id ? 'text-orange-500' : 'text-slate-500 group-hover:text-slate-400'}`}>
                {item.icon}
              </span>
              
              <span className="truncate flex-1 text-sm">{item.label}</span>
              
              {item.hasBadge && (
                <span className="bg-amber-500 text-slate-950 font-extrabold text-[9px] px-1.5 py-0.5 rounded uppercase ml-auto">
                  Nuevo
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Platform Settings at the bottom */}
        <div className="px-4 py-2 border-t border-slate-700/50 mt-auto">
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-all duration-200 group relative ${
              activeTab === 'settings' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            {activeTab === 'settings' && (
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-5 w-1 bg-orange-500 rounded-r-md" />
            )}
            <Settings className={`mr-2.5 h-4 w-4 ${activeTab === 'settings' ? 'text-orange-500' : 'text-slate-500 group-hover:text-slate-400'}`} />
            <span className="truncate flex-1 text-sm">Ajustes</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area - Margen izquierdo para el sidebar de 220px */}
      <div className="flex-1 flex flex-col ml-[220px] overflow-hidden min-h-screen">
        
        {/* Promotion bar GHL style */}
        {showPromoBanner && (
          <div className="bg-blue-600 text-white px-6 py-2.5 flex items-center justify-between text-sm font-medium z-30">
            <div className="flex items-center space-x-2 flex-1 justify-center">
              <span>Verano de IA: Tus herramientas de IA son gratuitas todo el verano.</span>
              <button className="bg-white text-blue-600 px-3 py-0.5 rounded text-xs font-bold hover:bg-slate-100 transition-colors ml-2">
                Activar ahora
              </button>
            </div>
            <button 
              onClick={() => setShowPromoBanner(false)}
              className="text-white hover:text-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Top Header Bar - White layout matching the other panel */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shrink-0">
          
          {/* Active Store Display on Header */}
          <div className="flex items-center space-x-2.5 text-slate-500 text-xs">
            <span className="font-bold text-slate-700">Subcuenta Seleccionada:</span>
            <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full text-slate-800 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {activeStore ? activeStore.name : 'Ninguna'}
            </span>
          </div>

          {/* Right Header Items */}
          <div className="flex items-center gap-4">
            
            {/* Translate Button */}
            <button className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors" title="Traductor">
              <Languages className="h-4 w-4" />
            </button>

            {/* Ask AI purple button */}
            <button className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs py-1.5 px-3.5 rounded-lg shadow-sm transition-all">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Preguntar a la IA</span>
            </button>
            
            {/* Megaphone (anuncios) */}
            <button className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors" title="Anuncios">
              <Megaphone className="h-4 w-4" />
            </button>

            {/* Notifications Bell */}
            <button className="w-8 h-8 rounded-full bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center hover:bg-orange-100 transition-colors relative" title="Notificaciones">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            {/* Support Help Circle */}
            <button className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors" title="Soporte y Ayuda">
              <HelpCircle className="h-4 w-4" />
            </button>

            {/* Link to Store Admin */}
            <button 
              onClick={() => navigate('/admin')} 
              className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5 bg-white font-medium"
            >
              Ir al Admin Tienda <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <div className="h-5 w-[1px] bg-slate-200 mx-1" />

            {/* User Avatar - Styled with Cerrar sesión dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(prev => !prev)}
                className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-xs hover:bg-green-700 transition-all cursor-pointer shadow-sm"
                type="button"
              >
                {user?.name ? user.name.substring(0, 2).toUpperCase() : 'JS'}
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800 animate-in slide-in-from-top-5 duration-200">
                  <div className="px-4 py-2.5 border-b border-slate-100 text-left">
                    <p className="text-sm font-bold text-slate-800">{user?.name || 'Administrador Principal'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{user?.email || 'juansalazat100@gmail.com'}</p>
                  </div>
                  <ul className="py-1">
                    <li>
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2.5 w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 text-red-500" />
                        <span className="font-medium">Cerrar sesión</span>
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Work Area */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* TAB: SUBCUENTAS / SITIOS (List & Management) */}
          {activeTab === 'subaccounts' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
                    <Database className="h-6 w-6 text-blue-600" />
                    Subcuentas y Sitios Web
                  </h1>
                  <p className="text-slate-500 text-sm mt-1">
                    Gestiona, edita y supervisa las subcuentas reales de la plataforma. (Solo información real)
                  </p>
                </div>

                <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all">
                  <Plus className="h-4 w-4 mr-1.5" /> Nueva Tienda / Subcuenta
                </Button>
              </div>

              {/* Search bar */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                  <Input
                    placeholder="Buscar por subcuenta, correo, dpto, ciudad..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-50 border-slate-200 h-10 text-slate-900 placeholder-slate-400 text-sm focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Sub-Accounts Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl h-44 animate-pulse shadow-sm"></div>
                  ))}
                </div>
              ) : filteredStores.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl bg-white shadow-sm">
                  <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-700">No se encontraron subcuentas reales</h3>
                  <p className="text-slate-500 text-xs mt-1">Registra la primera subcuenta haciendo clic en el botón superior.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredStores.map((store) => (
                    <Card key={store.id} className="bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 hover:shadow transition-all flex flex-col justify-between rounded-xl">
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center border border-blue-200 font-bold text-blue-600 text-sm">
                              {store.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">{store.name}</h3>
                              <p className="text-[10px] text-slate-400 leading-none mt-0.5">{store.legalName}</p>
                            </div>
                          </div>

                          <Badge className={`font-semibold uppercase text-[9px] px-2 py-0.5 border ${
                            store.status === 'activo'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-red-50 text-red-600 border-red-200'
                          }`}>
                            {store.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 mt-5 text-[11px] text-slate-600 border-t border-slate-100 pt-4">
                          <p className="flex justify-between">
                            <span className="text-slate-400">Email:</span>
                            <span className="text-slate-700 font-semibold">{store.email}</span>
                          </p>
                          {store.phone && (
                            <p className="flex justify-between">
                              <span className="text-slate-400">Teléfono:</span>
                              <span className="text-slate-700 font-semibold">{store.phone}</span>
                            </p>
                          )}
                          <p className="flex justify-between">
                            <span className="text-slate-400">Ubicación:</span>
                            <span className="text-slate-700 font-semibold truncate max-w-[150px]" title={store.address}>
                              {store.city}, {store.state}
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">Plan actual:</span>
                            <span className="text-blue-600 font-bold capitalize">{store.plan}</span>
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">ID: {store.id.substring(0, 8)}</span>
                        <div className="flex gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(store)}
                            className="h-8 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 px-2.5 text-xs gap-1 font-medium"
                          >
                            <Edit className="h-3.5 w-3.5 text-slate-500" /> Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStore(store.id, store.name)}
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 text-xs gap-1 font-medium"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: SAAS CONFIGURATOR (Identical Layout of the Image) */}
          {activeTab === 'configurator' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center pb-2">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                    <Sliders className="h-6 w-6 text-blue-600" />
                    Configurador SaaS
                  </h1>
                  <p className="text-slate-500 text-sm mt-1">Configura las tarifas globales y los paquetes de tu plataforma SaaS</p>
                </div>
              </div>

              {/* Horizontal Tabs configuration */}
              <div className="border-b border-slate-200 pb-0.5 mb-6">
                <div className="flex space-x-6 text-sm font-semibold text-slate-500">
                  <button className="border-b-2 border-blue-600 text-blue-600 pb-2.5 px-1 font-bold">
                    Configurar
                  </button>
                  <button className="hover:text-slate-800 pb-2.5 px-1 transition-colors">
                    Configuración de cancelación
                  </button>
                  <button className="hover:text-slate-800 pb-2.5 px-1 transition-colors">
                    Configuración de degradación
                  </button>
                  <button className="hover:text-slate-800 pb-2.5 px-1 transition-colors">
                    Impuestos Automáticos
                  </button>
                </div>
              </div>

              {/* Filters and Actions sub-bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm mb-6">
                <p className="text-xs text-slate-500 font-medium">
                  Crea y configura planes personalizados para que tus usuarios elijan sus propios paquetes.
                </p>
                
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-8 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer">
                      <option>Categorías</option>
                      <option>Planes Core</option>
                      <option>Complementos (Add-Ons)</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                  </div>

                  <Input 
                    placeholder="Buscar planes..."
                    className="h-8.5 bg-slate-50 border-slate-200 text-xs w-56 placeholder-slate-400"
                    disabled
                  />

                  <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 h-8.5 rounded-lg flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" /> Añada su plan
                  </Button>
                </div>
              </div>

              {/* Pricing Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* PLAN MENSUAL */}
                <Card className="bg-white border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:border-slate-300 transition-all flex flex-col justify-between min-h-[260px] rounded-xl">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">Mensual</span>
                      <button 
                        onClick={() => toast({ title: 'Enlace Copiado', description: 'Enlace de venta Mensual copiado al portapapeles.' })}
                        className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                        title="Copiar enlace"
                      >
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-baseline">
                        <span className="text-5xl font-black text-slate-900">${monthlyPrice}</span>
                        <span className="text-slate-400 text-xs font-semibold ml-1.5">USD/mes</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 font-medium">Plan de inicio para tiendas individuales</p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <Button 
                      onClick={() => toast({ title: 'Enlace Copiado', description: 'Enlace copiado al portapapeles.' })}
                      variant="outline"
                      className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold py-2 rounded-lg"
                    >
                      Copiar enlace de venta
                    </Button>
                  </div>
                </Card>

                {/* PLAN ANUAL */}
                <Card className="bg-white border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:border-slate-300 transition-all flex flex-col justify-between min-h-[260px] rounded-xl">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">Anual</span>
                      <button 
                        onClick={() => toast({ title: 'Enlace Copiado', description: 'Enlace de venta Anual copiado al portapapeles.' })}
                        className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                        title="Copiar enlace"
                      >
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-baseline">
                        <span className="text-5xl font-black text-slate-900">${annualPrice}</span>
                        <span className="text-slate-400 text-xs font-semibold ml-1.5">USD/año</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 font-medium">Máximo ahorro con facturación anual</p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <Button 
                      onClick={() => toast({ title: 'Enlace Copiado', description: 'Enlace copiado al portapapeles.' })}
                      variant="outline"
                      className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold py-2 rounded-lg"
                    >
                      Copiar enlace de venta
                    </Button>
                  </div>
                </Card>

                {/* EDIT OPTIONS SIDEBAR / PANEL */}
                <Card className="bg-slate-50/50 border-slate-200 shadow-sm p-6 rounded-xl flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <SlidersHorizontal className="h-4 w-4 text-slate-500" /> Parámetros del Plan
                    </h3>
                    
                    <div className="space-y-3 text-xs">
                      <div>
                        <Label className="text-[11px] text-slate-500 font-semibold">Precio Mensual ($ USD)</Label>
                        <Input 
                          type="number" 
                          value={monthlyPrice} 
                          onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                          className="h-8 bg-white border-slate-200 mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-[11px] text-slate-500 font-semibold">Precio Anual ($ USD)</Label>
                        <Input 
                          type="number" 
                          value={annualPrice} 
                          onChange={(e) => setAnnualPrice(Number(e.target.value))}
                          className="h-8 bg-white border-slate-200 mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={() => toast({ title: 'Tarifas guardadas', description: 'Precios actualizados para nuevos registros.' })}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg mt-4"
                  >
                    Guardar Parámetros
                  </Button>
                </Card>

              </div>

              {/* Bottom Config Details Row */}
              <div className="flex flex-wrap items-center justify-between gap-6 border-t border-slate-200 pt-6 mt-8 text-xs text-slate-500 font-medium bg-white p-5 rounded-xl border">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800">{cancellationDays * 4 + 2}</span> Días de periodo de prueba
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800">$0</span> Créditos gratuitos
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Layers className="h-3.5 w-3.5" /> No hay ninguna instantánea adjunta
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button 
                    onClick={() => toast({ title: 'Editar los detalles', description: 'Configuración de facturación abierta.' })}
                    variant="outline" 
                    className="border-slate-200 hover:bg-slate-50 text-xs font-semibold py-1.5 px-4 rounded-lg"
                  >
                    Editar los detalles
                  </Button>
                  <button className="text-slate-400 hover:text-slate-600 p-1" title="Más opciones">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="12" cy="5" r="1"></circle>
                      <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB: SNAPSHOTS (TIENDA TEMPLATES) */}
          {activeTab === 'snapshots' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                  <Layers className="h-6 w-6 text-blue-600" />
                  Instantáneas y Plantillas de Subcuenta
                </h1>
                <p className="text-slate-500 text-sm mt-1">Configura plantillas predefinidas (Snapshots) para clonar configuraciones iniciales al crear nuevos sitios</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Standard Snapshot */}
                <Card className="bg-white border-slate-200 p-6 flex flex-col justify-between min-h-[200px] rounded-xl shadow-sm">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Snapshot Estándar</span>
                      <Badge className="bg-slate-100 text-slate-600 text-[8px] font-bold border border-slate-200">Fijo</Badge>
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-base mt-2">Tienda de Ropa / General</h3>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                      Estructura inicial clásica con categorías de Moda, Tecnología, pasarela de pago configurada y flujo de pedido estándar.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Categorías fijas: 5</span>
                    <Button variant="ghost" className="text-blue-600 hover:text-blue-700 text-xs p-0 font-semibold">Detalles</Button>
                  </div>
                </Card>

                {/* Real Estate Snapshot */}
                <Card className="bg-white border-slate-200 p-6 flex flex-col justify-between min-h-[200px] rounded-xl shadow-sm">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">Inmobiliaria</span>
                      <Badge className="bg-blue-50 text-blue-600 text-[8px] font-bold border border-blue-200">Recomendado</Badge>
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-base mt-2">Inmobiliaria y Arriendos</h3>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                      Pre-configurado con la modalidad de inmuebles, campos para metros cuadrados, sector, baños, y plantilla de correo de contacto.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Campos dinámicos: 8</span>
                    <Button variant="ghost" className="text-blue-600 hover:text-blue-700 text-xs p-0 font-semibold">Detalles</Button>
                  </div>
                </Card>

                {/* Add Custom Snapshot Placeholder */}
                <div className="border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-white min-h-[200px] shadow-sm">
                  <FolderOpen className="h-8 w-8 text-slate-400 mb-2" />
                  <h4 className="text-slate-700 font-bold text-sm">Nueva Instantánea</h4>
                  <p className="text-slate-500 text-[11px] max-w-[180px] mt-1">Crea un template a partir de una tienda activa</p>
                  <Button onClick={() => toast({ title: 'Crear Snapshot', description: 'Función en desarrollo.' })} size="sm" className="mt-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold px-4 rounded-lg">
                    Crear plantilla
                  </Button>
                </div>

              </div>
            </div>
          )}

          {/* TAB: SETTINGS (Plataforma SaaS) */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                  <Settings className="h-6 w-6 text-blue-600" />
                  Ajustes de Plataforma SaaS
                </h1>
                <p className="text-slate-500 text-sm mt-1">Configuración avanzada, seguridad de accesos y logs globales</p>
              </div>

              <Card className="bg-white border-slate-200 p-6 rounded-xl shadow-sm">
                <CardHeader className="px-0 pt-0 border-b border-slate-100 pb-4">
                  <CardTitle className="text-base text-slate-900 font-bold">Mantenimiento de Servidores</CardTitle>
                </CardHeader>
                <CardContent className="px-0 space-y-4 text-sm text-slate-600 pt-4">
                  <p>Asegura el correcto funcionamiento de los cron-jobs de facturación automática y los respaldos diarios.</p>
                  <div className="flex gap-3 pt-2">
                    <Button onClick={() => toast({ title: 'Respaldos realizados', description: 'Se ha realizado un backup de la base de datos de usuarios.' })} className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 rounded-lg">
                      Ejecutar Backup Manual
                    </Button>
                    <Button onClick={() => loadStores()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold px-4 rounded-lg">
                      Sincronizar base de datos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* PLACEHOLDER TABS FOR VISUAL INTEGRATION (Rich SaaS Features) */}
          {!['subaccounts', 'configurator', 'snapshots', 'settings'].includes(activeTab) && (
            <div className="space-y-6">
              <div className="flex items-center gap-2.5 pb-2">
                <Sparkles className="h-6 w-6 text-indigo-600 animate-pulse" />
                <h1 className="text-2xl font-black tracking-tight text-slate-900 capitalize">
                  {activeTab.replace(/-/g, ' ')}
                </h1>
              </div>

              <Card className="bg-white border-slate-200 p-8 rounded-xl shadow-sm text-center">
                <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Sección de Administración SaaS Integrada</h2>
                <p className="text-slate-500 text-sm max-w-lg mx-auto mb-6">
                  Esta pantalla simula el módulo premium de "{activeTab.replace(/-/g, ' ')}" para la red Xenbux SaaS. Todos los datos y flujos se configuran dinámicamente desde el menú central.
                </p>
                <Button 
                  onClick={() => setActiveTab('configurator')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 rounded-lg text-xs"
                >
                  Volver al Configurador SaaS
                </Button>
              </Card>
            </div>
          )}

        </main>
      </div>

      {/* DIALOG: CREATE / EDIT SUBACCOUNT STORE */}
      <Dialog open={isStoreModalOpen} onOpenChange={setIsStoreModalOpen}>
        <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-900 shadow-2xl rounded-xl">
          <form onSubmit={handleSaveStore} className="space-y-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Building2 className="w-5 h-5 text-blue-600" />
                {selectedStore ? 'Editar Tienda / Subcuenta' : 'Nueva Tienda / Subcuenta'}
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                {selectedStore ? 'Modifique la configuración y asignación del sitio SaaS.' : 'Ingrese los datos correspondientes para aprovisionar un nuevo sitio en la plataforma.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="st-name" className="text-xs text-slate-600 font-semibold">Nombre Comercial *</Label>
                  <Input
                    id="st-name"
                    placeholder="Ej: AFE Gym"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 h-9"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="st-legal" className="text-xs text-slate-600 font-semibold">Razón Social</Label>
                  <Input
                    id="st-legal"
                    placeholder="Ej: AFE Gym SAS"
                    value={storeLegalName}
                    onChange={(e) => setStoreLegalName(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="st-email" className="text-xs text-slate-600 font-semibold">Email Administrativo *</Label>
                  <Input
                    id="st-email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={storeEmail}
                    onChange={(e) => setStoreEmail(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 h-9"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="st-password" className="text-xs text-slate-600 font-semibold">Contraseña *</Label>
                  <Input
                    id="st-password"
                    type="password"
                    placeholder="••••••••"
                    value={storePassword}
                    onChange={(e) => setStorePassword(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 h-9"
                    required={!selectedStore}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="st-phone" className="text-xs text-slate-600 font-semibold">Teléfono</Label>
                <Input
                  id="st-phone"
                  placeholder="Ej: 3125487954"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-900 h-9"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="st-addr" className="text-xs text-slate-600 font-semibold">Dirección Física</Label>
                <Input
                  id="st-addr"
                  placeholder="Ej: Carrera 66 # 2C - 46"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-900 h-9"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="st-city" className="text-xs text-slate-600 font-semibold">Ciudad</Label>
                  <Input
                    id="st-city"
                    placeholder="Ej: Cali"
                    value={storeCity}
                    onChange={(e) => setStoreCity(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="st-state" className="text-xs text-slate-600 font-semibold">Estado / Dpto</Label>
                  <Input
                    id="st-state"
                    placeholder="Ej: Valle"
                    value={storeState}
                    onChange={(e) => setStoreState(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="st-country" className="text-xs text-slate-600 font-semibold">País</Label>
                  <Input
                    id="st-country"
                    placeholder="Ej: Colombia"
                    value={storeCountry}
                    onChange={(e) => setStoreCountry(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600 font-semibold">Asignar Plan</Label>
                  <Select value={storePlan} onValueChange={(val: any) => setStorePlan(val)}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 h-9">
                      <SelectValue placeholder="Seleccione plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-950 text-xs">
                      <SelectItem value="mensual">Mensual ($97 USD)</SelectItem>
                      <SelectItem value="anual">Anual ($970 USD)</SelectItem>
                      <SelectItem value="trial">Periodo de Prueba</SelectItem>
                      <SelectItem value="free">Plan Gratuito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-600 font-semibold">Estado de Cuenta</Label>
                  <Select value={storeStatus} onValueChange={(val: any) => setStoreStatus(val)}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-950 text-xs">
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="suspendido">Suspendido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="st-trial" className="text-xs text-slate-600 font-semibold">Días de Prueba Restantes</Label>
                  <Input
                    id="st-trial"
                    type="number"
                    value={storeTrialDays}
                    onChange={(e) => setStoreTrialDays(Number(e.target.value))}
                    className="bg-slate-50 border-slate-200 text-slate-900 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="st-credits" className="text-xs text-slate-600 font-semibold">Créditos IA Iniciales ($ USD)</Label>
                  <Input
                    id="st-credits"
                    type="number"
                    value={storeCredits}
                    onChange={(e) => setStoreCredits(Number(e.target.value))}
                    className="bg-slate-50 border-slate-200 text-slate-900 h-9"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4 mt-2">
              <Button type="button" variant="outline" onClick={() => setIsStoreModalOpen(false)} className="border-slate-200 hover:bg-slate-100 text-slate-600">
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm">
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminDashboard;
