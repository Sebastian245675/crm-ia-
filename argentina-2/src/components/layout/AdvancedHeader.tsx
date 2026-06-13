import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, User, HelpCircle, Search, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';
import type { Category } from '@/hooks/use-categories';

interface AdvancedHeaderProps {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  promoVisible?: boolean;
  mainCategories?: Category[];
  subcategoriesByParent?: Record<string, Category[]>;
  thirdLevelBySubcategory?: Record<string, Category[]>;
  searchTerm?: string;
  onSearch?: (val: string) => void;
}

export const AdvancedHeader: React.FC<AdvancedHeaderProps> = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  promoVisible,
  mainCategories = [],
  subcategoriesByParent = {},
  thirdLevelBySubcategory = {},
  searchTerm = '',
  onSearch,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { getItemCount } = useCart();
  const itemCount = getItemCount();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [openCategoryDropdown, setOpenCategoryDropdown] = useState<string | null>(null);
  const [openAyudaDropdown, setOpenAyudaDropdown] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm || '');
  const accountMenuTimer = useRef<NodeJS.Timeout | null>(null);
  const categoryDropdownTimer = useRef<NodeJS.Timeout | null>(null);

  // Sincronizar local con prop cuando esta cambie externamente
  React.useEffect(() => {
    setLocalSearchTerm(searchTerm || '');
  }, [searchTerm]);

  // Solo categorías desde la BD (sin "Todos"). Sin fallback estático.
  const mainCategoriesForNav = categories.filter((c) => c !== "Todos");

  const goToCategory = (cat: Category | string) => {
    setIsMenuOpen(false);
    setOpenCategoryDropdown(null);
    setOpenAyudaDropdown(false);
    const identifier = typeof cat === 'string' 
      ? cat 
      : (cat.slug || cat.id || cat.name);
    navigate(`/categoria/${encodeURIComponent(identifier)}`);
  };

  const getSubsForMain = (mainName: string) =>
    subcategoriesByParent[mainName] ?? [];
  const getThirdsForSub = (subId: string) =>
    thirdLevelBySubcategory[subId] ?? [];

  const handleSearchChange = (val: string) => {
    setLocalSearchTerm(val);
    if (onSearch) {
      onSearch(val);
    }

    // Si no estamos en la home y hay texto, ir a la home
    if (window.location.pathname !== '/' && val.length > 0) {
      navigate(`/?search=${encodeURIComponent(val)}`);
    } else if (window.location.pathname === '/') {
      // Si estamos en la home, actualizamos la URL para que sea persistente
      const params = new URLSearchParams(window.location.search);
      if (val) {
        params.set('search', val);
      } else {
        params.delete('search');
      }
      const newUrl = params.toString() ? `?${params.toString()}` : '/';
      window.history.replaceState({}, '', newUrl);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearchTerm) {
      navigate(`/?search=${encodeURIComponent(localSearchTerm)}`);
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="w-full font-sans selection:bg-blue-800 selection:text-white">
      {/* Top Header - Black Theme */}
      <header className="bg-black text-white w-full border-b border-white/10 overflow-visible relative z-[60]">
        <div className="w-full max-w-[1300px] mx-auto px-4 md:px-8 py-3 flex items-center justify-between overflow-visible">

          {/* Mobile Menu Toggle (Left on mobile) */}
          <div className="md:hidden flex items-center justify-start flex-1">
            <button
              className="text-white p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Cerrar menú principal" : "Abrir menú principal"}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Search Bar - Desktop Only (Left) */}
          <div className="hidden md:flex flex-1 items-center justify-start">
            <form
              className="relative w-full max-w-[280px]"
              onSubmit={handleSearchSubmit}
              role="search"
            >
              <input
                id="search-input"
                type="text"
                placeholder="Buscar"
                value={localSearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full py-[6px] px-3 pr-9 text-[13px] text-white bg-transparent border border-white/40 rounded-[2px] focus:outline-none focus:border-white focus:bg-white/5 transition-all placeholder:text-white/60"
                aria-label="Buscador de productos"
              />
              <button
                type="submit"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                aria-label="Ejecutar búsqueda"
              >
                <Search className="w-[15px] h-[15px]" />
              </button>
            </form>
          </div>

          {/* Logo (Center) */}
          <div
            className="flex-shrink-0 cursor-pointer flex items-center justify-center flex-1 md:flex-none"
            onClick={() => navigate('/')}
            role="banner"
            aria-label="Ir a inicio de merco"
          >
            <div className="flex items-center gap-3 select-none">
              <img
                src="/Picsart_26-06-08_19-14-58-865.webp"
                alt="Logo merco"
                className="h-10 w-10 rounded-xl object-contain border border-white/20 bg-white/10"
              />
              <span className="font-bold text-xl md:text-2xl tracking-widest text-white uppercase">
                merco
              </span>
            </div>
          </div>

          {/* Icons (Right) */}
          <div className="flex items-center justify-end space-x-6 flex-1">
            {/* Help */}
            <div className="relative group/help hidden sm:block">
              <button
                className="flex items-center justify-center transition-opacity hover:opacity-80 p-1"
                onMouseEnter={() => setShowHelpMenu(true)}
                onMouseLeave={() => setShowHelpMenu(false)}
                aria-label="Menú de Ayuda y Contacto"
              >
                <HelpCircle className="w-[22px] h-[22px] md:w-6 md:h-6 stroke-[1.5px]" />
              </button>

              {showHelpMenu && (
                <div
                  className="absolute top-full right-0 mt-4 w-56 bg-white text-gray-900 shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 z-[70] overflow-hidden rounded-lg"
                  onMouseEnter={() => setShowHelpMenu(true)}
                  onMouseLeave={() => setShowHelpMenu(false)}
                >
                  <a
                    href="https://wa.me/541126711308"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
                  >
                    <span className="text-green-500 text-xl">📱</span>
                    <div className="text-left">
                      <div className="text-sm font-bold text-gray-900">Asesor comercial 1</div>
                      <div className="text-[11px] text-gray-700 font-medium">+54 9 11 2671-1308</div>
                    </div>
                  </a>
                  <a
                    href="https://wa.me/5493872228571"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
                  >
                    <span className="text-green-500 text-xl">📱</span>
                    <div className="text-left">
                      <div className="text-sm font-bold text-gray-900">Asesor comercial 2</div>
                      <div className="text-[11px] text-gray-700 font-medium">+54 9 387 222-8571</div>
                    </div>
                  </a>
                  <a
                    href="mailto:soporte@omnishop.com"
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-xl">📧</span>
                    <div className="text-left">
                      <div className="text-sm font-bold text-gray-900">Email</div>
                      <div className="text-[11px] text-gray-700 font-medium">soporte@omnishop.com</div>
                    </div>
                  </a>
                </div>
              )}
            </div>

            {/* Account */}
            <div
              className="relative"
              onMouseEnter={() => {
                if (accountMenuTimer.current) clearTimeout(accountMenuTimer.current);
                setShowAccountMenu(true);
              }}
              onMouseLeave={() => {
                if (accountMenuTimer.current) clearTimeout(accountMenuTimer.current);
                accountMenuTimer.current = setTimeout(() => setShowAccountMenu(false), 150);
              }}
            >
              <button
                className="flex items-center justify-center hover:opacity-80 transition-opacity p-1"
                onClick={() => setShowAccountMenu(prev => !prev)}
                aria-label="Menú de Cuenta"
              >
                <User className="w-[22px] h-[22px] md:w-6 md:h-6 stroke-[1.5px]" />
              </button>

              {showAccountMenu && (
                <div
                  className="absolute top-full right-0 mt-4 w-56 bg-white text-gray-900 shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-gray-100 z-[70] overflow-hidden rounded-lg"
                  onMouseEnter={() => {
                    if (accountMenuTimer.current) clearTimeout(accountMenuTimer.current);
                    setShowAccountMenu(true);
                  }}
                  onMouseLeave={() => {
                    if (accountMenuTimer.current) clearTimeout(accountMenuTimer.current);
                    accountMenuTimer.current = setTimeout(() => setShowAccountMenu(false), 150);
                  }}
                >
                  {user ? (
                    <div className="flex flex-col">
                      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                        <p className="text-[10px] font-black text-gray-600 uppercase mb-1 tracking-wider">Bienvenido</p>
                        <p className="text-sm font-black truncate text-gray-900">{user.name || user.email}</p>
                      </div>
                      <button onClick={() => { navigate('/perfil'); setShowAccountMenu(false); }} className="w-full text-left px-5 py-3 text-sm hover:bg-gray-50 transition-colors font-medium">Mi perfil</button>
                      {/* Solo mostrar Panel Admin si el usuario tiene permisos */}
                      {user?.isAdmin && (
                        <button onClick={() => { navigate('/admin'); setShowAccountMenu(false); }} className="w-full text-left px-5 py-3 text-sm hover:bg-gray-50 transition-colors border-t border-gray-100 text-blue-600 font-bold uppercase tracking-wider text-[11px]">Panel Admin</button>
                      )}
                      <button onClick={async () => { await logout(); setShowAccountMenu(false); }} className="w-full text-left px-5 py-3 text-sm hover:bg-gray-100 transition-colors border-t border-gray-100 text-red-500">Cerrar sesión</button>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <button onClick={() => { navigate('/login'); setShowAccountMenu(false); }} className="w-full text-left px-5 py-3 text-sm hover:bg-gray-50 transition-colors font-bold uppercase tracking-wider text-[11px]">Entrar</button>
                      <button onClick={() => { navigate('/register'); setShowAccountMenu(false); }} className="w-full text-left px-5 py-3 text-sm hover:bg-gray-50 transition-colors border-t border-gray-100 text-gray-500">Registrarme</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart */}
            <button
              className="flex items-center justify-center hover:opacity-80 transition-opacity relative p-1"
              onClick={() => navigate('/cart')}
              aria-label={`Ver carrito de compras, ${itemCount} productos`}
            >
              <div className="relative">
                <ShoppingCart className="w-[22px] h-[22px] md:w-6 md:h-6 stroke-[1.5px]" />
                {itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-md border border-white/20">
                    {itemCount}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Bar - Desktop only */}
      <nav
        className="relative hidden md:block bg-black border-b border-white/10 z-50"
        onMouseLeave={() => {
          categoryDropdownTimer.current = setTimeout(() => setOpenCategoryDropdown(null), 100);
        }}
      >
        <div className="w-full max-w-[1300px] mx-auto px-4 md:px-8">
          <ul className="flex flex-col items-center md:flex-row md:items-center md:justify-center md:space-x-10 text-white md:py-3.5">
            {mainCategoriesForNav.map((category) => {
              const isActive = selectedCategory === category;
              const subs = getSubsForMain(category);
              const hasDropdown = subs.length > 0;
              const isDropdownOpen = openCategoryDropdown === category;

              return (
                <li
                  key={category}
                  className="relative group/nav"
                  onMouseEnter={() => {
                    if (categoryDropdownTimer.current) clearTimeout(categoryDropdownTimer.current);
                    if (hasDropdown) setOpenCategoryDropdown(category);
                  }}
                  onMouseLeave={() => {
                    categoryDropdownTimer.current = setTimeout(() => setOpenCategoryDropdown(null), 150);
                  }}
                >
                  <button
                    type="button"
                    className={`flex items-center justify-center gap-1 w-full md:w-auto text-center py-4 md:py-0 text-[13px] font-medium tracking-wide transition-all ${isActive
                      ? "text-white font-bold opacity-100"
                      : "text-white/80 hover:text-white"
                      }`}
                    onClick={() => {
                      if (window.innerWidth < 768) {
                        setOpenCategoryDropdown(isDropdownOpen ? null : category);
                      } else {
                        goToCategory(category);
                      }
                    }}
                  >
                    {category}
                    {hasDropdown && <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />}
                  </button>
                </li>
              );
            })}
            {/* Fin categorías */}
            {/* Ayuda rápida */}
            <li className="relative">
              <button
                type="button"
                className="flex items-center justify-center gap-1 w-full md:w-auto text-center py-4 md:py-0 text-[13px] font-medium text-white/80 hover:text-white transition-colors"
                onClick={() => {
                  navigate('/preguntas-frecuentes');
                  setIsMenuOpen(false);
                }}
              >
                Ayuda rápida
              </button>
            </li>
          </ul>
        </div>

        {/* Dropdown Categorías (Mega-Menu) - Black Theme */}
        {openCategoryDropdown && (() => {
          const subs = getSubsForMain(openCategoryDropdown);
          if (subs.length === 0) return null;

          return (
            <div
              className="absolute left-0 right-0 top-full w-full bg-black text-white shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-50 border-t border-white/10"
              onMouseEnter={() => {
                if (categoryDropdownTimer.current) clearTimeout(categoryDropdownTimer.current);
                setOpenCategoryDropdown(openCategoryDropdown);
              }}
            >
              <div className="w-full max-w-[1300px] mx-auto flex flex-col items-center px-8 py-10">
                <div className="w-full flex flex-wrap justify-center gap-x-20 gap-y-10">
                  {subs.map((sub) => {
                    const thirds = getThirdsForSub(sub.id ?? '');
                    const hasThirds = thirds.length > 0;
                    return (
                      <div key={sub.id ?? sub.name} className="flex flex-col items-center md:items-start min-w-[140px]">
                        <h3 className="text-white text-base font-black uppercase tracking-[0.15em] mb-4 border-b-2 border-white/20 pb-1 w-fit">
                          {sub.name}
                        </h3>
                        {hasThirds ? (
                          <ul className="space-y-2.5">
                            {thirds.map((item) => (
                              <li key={item.id ?? item.name}>
                                <button
                                  type="button"
                                  className="text-center md:text-left text-white/70 text-[13px] font-medium hover:text-white transition-colors w-full"
                                  onClick={() => goToCategory(item)}
                                >
                                  {item.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <button
                            type="button"
                            className="text-center md:text-left text-white/70 text-[13px] font-medium hover:text-white transition-colors"
                            onClick={() => goToCategory(sub)}
                          >
                            Ver todo {sub.name}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-12 pt-6 border-t border-white/10 w-full flex justify-center">
                  <button
                    type="button"
                    className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all underline underline-offset-8"
                    onClick={() => goToCategory(openCategoryDropdown)}
                  >
                    Explorar todo {openCategoryDropdown}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </nav>

      {/* Mobile Sidebar Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] md:hidden transition-opacity duration-300 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-[280px] bg-[#0a0a0a] z-[101] md:hidden transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black">
          <div className="flex items-center gap-2 font-bold text-lg tracking-wider text-white uppercase select-none">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <span>merco</span>
          </div>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Sidebar Search */}
        <div className="p-4 bg-[#111]">
          <form className="relative" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="¿Qué estás buscando?"
              value={localSearchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full py-2.5 px-4 pr-10 text-sm text-white bg-black border border-white/20 rounded-lg focus:outline-none focus:border-white/40 placeholder:text-white/40"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
              <Search className="w-4 h-4 text-white/60" />
            </button>
          </form>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <p className="px-6 py-2 text-[10px] font-black text-white/40 uppercase tracking-widest">Categorías</p>
          <ul className="mt-2">
            {mainCategoriesForNav.map((category) => {
              const subs = getSubsForMain(category);
              const hasSubs = subs.length > 0;
              const isOpen = openCategoryDropdown === category;

              return (
                <li key={category} className="border-b border-white/5 last:border-0">
                  <div className="flex items-center justify-between px-6 py-4">
                    <button
                      onClick={() => goToCategory(category)}
                      className="flex-1 text-left text-white text-sm font-medium hover:text-orange-300 transition-colors uppercase tracking-tight"
                    >
                      {category}
                    </button>
                    {hasSubs && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenCategoryDropdown(isOpen ? null : category);
                        }}
                        className="p-2 hover:bg-white/10 rounded transition-colors"
                      >
                        <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>

                  {/* Subcategories (Accordion) */}
                  {hasSubs && isOpen && (
                    <div className="bg-black/10 py-1 flex flex-col">
                      {subs.map(sub => (
                        <button
                          key={sub.id || sub.name}
                          onClick={() => goToCategory(sub)}
                          className="px-10 py-3 text-white/80 text-[13px] font-medium text-left hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"
                        >
                          <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-4 px-6 pt-4 border-t border-white/10">
            <button
              onClick={() => { navigate('/preguntas-frecuentes'); setIsMenuOpen(false); }}
              className="flex items-center gap-3 text-white/80 hover:text-white text-sm font-medium transition-colors py-3"
            >
              <HelpCircle className="w-5 h-5 opacity-60" />
              Preguntas Frecuentes
            </button>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 bg-black/20 text-center">
          <p className="text-[10px] text-white/20 uppercase font-bold tracking-[0.4em]">MERCO</p>
        </div>
      </div>
    </div>
  );
};
