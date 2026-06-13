import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

// Import custom storefront modular components
import { HeroTienda } from '@/components/componentes-tienda/HeroTienda';
import { ProductGrid } from '@/components/componentes-tienda/ProductGrid';
import { ProductDetails } from '@/components/componentes-tienda/ProductDetails';
import { PurchaseButton } from '@/components/componentes-tienda/PurchaseButton';
import { ProductCarousel } from '@/components/componentes-tienda/ProductCarousel';
import { FeatureBanner } from '@/components/componentes-tienda/FeatureBanner';
import { StoreReviews } from '@/components/componentes-tienda/StoreReviews';
import { ContactForm } from '@/components/componentes-tienda/ContactForm';
import { StoreFooter } from '@/components/componentes-tienda/StoreFooter';
import { CustomCodeTienda } from '@/components/componentes-tienda/CustomCodeTienda';
import {
  Folder, Sparkles, Plus, Home, Clock, List, Search, MoreVertical,
  ChevronDown, ChevronLeft, ChevronRight, Edit2, Trash2,
  ArrowLeft, Share2, ExternalLink, Info, FileText, CheckCircle,
  Copy, Settings, Shield, BarChart3, ShoppingBag, Globe2, AlertCircle,
  Play, RefreshCw, Layers, Check, Laptop, Smartphone, Save, X, Trash,
  ChevronUp, User, Layout, AlignCenter, Type, AlignLeft, Image as ImageIcon,
  Compass, Mail, Sliders, Heading, CreditCard, ChevronRight as ChevronRightIcon,
  Lock, Eye, Columns, Upload, Loader2, Code
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PageElement {
  id: string;
  type: 
    | 'hero' | 'products' | 'features' | 'testimonials' | 'cta' | 'footer'
    | 'tarjetas_productos' | 'detalle_producto' | 'boton_compra' | 'carrusel_productos'
    | 'titulo' | 'parrafo' | 'imagen' | 'boton' | 'contacto_form' | 'sitemap'
    | 'custom_code';
  content: {
    title?: string;
    subtitle?: string;
    buttonText?: string;
    bgGradient?: string;
    bgType?: 'color' | 'gradient' | 'image';
    bgColor?: string;
    cols?: string;
    f1?: string;
    f2?: string;
    f3?: string;
    company?: string;
    clientName?: string;
    reviewText?: string;
    price?: string;
    align?: 'left' | 'center' | 'right';
    size?: 'sm' | 'md' | 'lg';
    imageUrl?: string;
    bgImageUrl?: string;
    htmlCode?: string;
    cssCode?: string;
    jsCode?: string;
    caption?: string;
    buttonLink?: string;
    formTitle?: string;
    formId?: string;
  };
}

interface WebsitePage {
  id: string;
  name: string;
  path: string;
  elements?: PageElement[];
}

interface WebsiteRow {
  id: string;
  name: string;
  lastUpdated: string;
  path: string;
  setupType?: 'blank' | 'template';
  pages?: WebsitePage[];
  customDomain?: string;
  apiEnabled?: boolean;
  apiKey?: string;
  permissions?: {
    products?: boolean;
    contacts?: boolean;
    sales?: boolean;
    payments?: boolean;
  };
}

export const SitiosManager: React.FC = () => {
  // State for website list
  const [websites, setWebsites] = useState<WebsiteRow[]>(() => {
    const saved = localStorage.getItem('admin_websites');
    return saved ? JSON.parse(saved) : [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newWebsiteName, setNewWebsiteName] = useState('');
  const [editingWebsite, setEditingWebsite] = useState<WebsiteRow | null>(null);

  // Detail View State
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pages' | 'stats' | 'sales' | 'security' | 'settings'>('pages');
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [activePageSubTab, setActivePageSubTab] = useState<'overview' | 'products' | 'publishing'>('overview');

  // Setup Screen State
  const [tempSetupType, setTempSetupType] = useState<'blank' | 'template'>('blank');

  // Add Page State
  const [isAddPageOpen, setIsAddPageOpen] = useState(false);
  const [newPageName, setNewPageName] = useState('');

  // Interactive Builder Editor State
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editorElements, setEditorElements] = useState<PageElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isUploadingHeroBg, setIsUploadingHeroBg] = useState(false);

  // Left sidebar element category accordion state (open/close)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    productos: true,
    basicos: true,
    estructura: false,
    contenido: false
  });

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const saveWebsites = (newWebsites: WebsiteRow[]) => {
    setWebsites(newWebsites);
    localStorage.setItem('admin_websites', JSON.stringify(newWebsites));
  };

  const generatePath = (name: string) => {
    return '/' + name.trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebsiteName.trim()) return;

    const formattedPath = generatePath(newWebsiteName);
    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const newWeb: WebsiteRow = {
      id: `w-${Date.now()}`,
      name: newWebsiteName.trim(),
      lastUpdated: formattedDate,
      path: formattedPath,
      pages: []
    };

    saveWebsites([newWeb, ...websites]);
    setNewWebsiteName('');
    setIsCreateOpen(false);
    
    setSelectedWebsiteId(newWeb.id);
    setTempSetupType('blank');

    toast({
      title: 'Sitio Web Creado',
      description: `El sitio web "${newWeb.name}" ha sido creado. Configure el tipo de inicio ahora.`
    });
  };

  const handleEdit = (web: WebsiteRow) => {
    setEditingWebsite(web);
    setNewWebsiteName(web.name);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWebsite || !newWebsiteName.trim()) return;

    const formattedPath = generatePath(newWebsiteName);

    const updated = websites.map(w => {
      if (w.id === editingWebsite.id) {
        return { ...w, name: newWebsiteName.trim(), path: formattedPath };
      }
      return w;
    });

    saveWebsites(updated);
    setEditingWebsite(null);
    setNewWebsiteName('');
    toast({
      title: 'Sitio Web Actualizado',
      description: 'El nombre del sitio web ha sido actualizado.'
    });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este sitio web?')) return;
    const updated = websites.filter(w => w.id !== id);
    saveWebsites(updated);
    if (selectedWebsiteId === id) {
      setSelectedWebsiteId(null);
    }
    toast({
      title: 'Sitio Web Eliminar',
      description: 'El sitio web ha sido eliminado permanentemente.'
    });
  };

  // Setup completion with seeded builder element blocks
  const handleSetupComplete = () => {
    if (!selectedWebsiteId) return;

    const selectedWebName = websites.find(w => w.id === selectedWebsiteId)?.name || 'Mi Marca';

    const defaultElements: PageElement[] = [
      {
        id: 'el-1',
        type: 'hero',
        content: {
          title: 'Bienvenido a nuestra tienda virtual',
          subtitle: 'Descubre nuestra selección de herramientas de ferretería con calidad industrial y garantía directa.',
          buttonText: 'Ver Productos',
          bgGradient: 'from-blue-600 to-indigo-800 text-white'
        }
      },
      {
        id: 'el-2',
        type: 'tarjetas_productos',
        content: {
          title: 'Productos Destacados'
        }
      },
      {
        id: 'el-3',
        type: 'features',
        content: {
          title: '¿Por qué elegirnos?',
          f1: 'Envío Express 24h gratis',
          f2: '100% Garantía de Fábrica',
          f3: 'Soporte Técnico Especializado'
        }
      },
      {
        id: 'el-4',
        type: 'footer',
        content: {
          company: selectedWebName
        }
      }
    ];

    const updated = websites.map(w => {
      if (w.id === selectedWebsiteId) {
        let initialPages: WebsitePage[] = [];
        if (tempSetupType === 'blank') {
          initialPages = [
            { 
              id: `p-${Date.now()}-1`, 
              name: 'Inicio', 
              path: '/',
              elements: [
                {
                  id: 'el-1',
                  type: 'hero',
                  content: {
                    title: 'Nuevo Sitio en Construcción',
                    subtitle: 'Usa el constructor visual haciendo clic en Editar para diseñar este sitio web.',
                    buttonText: 'Empezar',
                    bgGradient: 'from-slate-700 to-slate-900 text-white'
                  }
                },
                {
                  id: 'el-2',
                  type: 'footer',
                  content: {
                    company: w.name
                  }
                }
              ]
            }
          ];
        } else {
          initialPages = [
            { 
              id: `p-${Date.now()}-1`, 
              name: 'Página de Inicio', 
              path: '/',
              elements: defaultElements
            }
          ];
        }
        return {
          ...w,
          setupType: tempSetupType,
          pages: initialPages,
          apiEnabled: true,
          apiKey: `os_pk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 9)}`,
          permissions: {
            products: true,
            contacts: true,
            sales: false,
            payments: false
          }
        };
      }
      return w;
    });

    saveWebsites(updated);
    setActivePageIndex(0);
    setActiveTab('pages');

    toast({
      title: 'Sitio Inicializado',
      description: `El sitio web ha sido inicializado ${tempSetupType === 'blank' ? 'desde cero' : 'con plantilla'}.`
    });
  };

  // Add new page to website
  const handleAddPage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWebsiteId || !newPageName.trim()) return;

    const pagePath = '/' + newPageName.trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    const selectedWebName = websites.find(w => w.id === selectedWebsiteId)?.name || 'Mi Marca';

    const updated = websites.map(w => {
      if (w.id === selectedWebsiteId) {
        const pages = w.pages || [];
        const newPage: WebsitePage = {
          id: `p-${Date.now()}`,
          name: newPageName.trim(),
          path: pagePath,
          elements: [
            {
              id: 'el-1',
              type: 'hero',
              content: {
                title: newPageName.trim(),
                subtitle: 'Edita los textos y añade secciones desde el panel izquierdo.',
                buttonText: 'Saber Más',
                bgGradient: 'from-blue-600 to-cyan-500 text-white'
              }
            },
            {
              id: 'el-2',
              type: 'footer',
              content: {
                company: selectedWebName
              }
            }
          ]
        };
        return {
          ...w,
          pages: [...pages, newPage]
        };
      }
      return w;
    });

    saveWebsites(updated);
    setNewPageName('');
    setIsAddPageOpen(false);

    const found = updated.find(w => w.id === selectedWebsiteId);
    if (found && found.pages) {
      setActivePageIndex(found.pages.length - 1);
    }

    toast({
      title: 'Página Agregada',
      description: `La página "${newPageName}" ha sido agregada con éxito.`
    });
  };

  // Clone active page
  const handleClonePage = (pageIndex: number) => {
    if (!selectedWebsiteId) return;
    const targetWeb = websites.find(w => w.id === selectedWebsiteId);
    if (!targetWeb || !targetWeb.pages || !targetWeb.pages[pageIndex]) return;

    const sourcePage = targetWeb.pages[pageIndex];
    const clonedPage: WebsitePage = {
      id: `p-${Date.now()}`,
      name: `${sourcePage.name} (Copia)`,
      path: `${sourcePage.path}-copia`,
      elements: sourcePage.elements ? JSON.parse(JSON.stringify(sourcePage.elements)) : []
    };

    const updated = websites.map(w => {
      if (w.id === selectedWebsiteId) {
        const pages = w.pages || [];
        const newPages = [...pages];
        newPages.splice(pageIndex + 1, 0, clonedPage);
        return {
          ...w,
          pages: newPages
        };
      }
      return w;
    });

    saveWebsites(updated);
    setActivePageIndex(pageIndex + 1);

    toast({
      title: 'Página Clonada',
      description: `Se ha creado una copia de "${sourcePage.name}".`
    });
  };

  // Delete page
  const handleDeletePage = (pageIndex: number) => {
    if (!selectedWebsiteId) return;
    const targetWeb = websites.find(w => w.id === selectedWebsiteId);
    if (!targetWeb || !targetWeb.pages || targetWeb.pages.length <= 1) {
      toast({
        title: 'Acción inválida',
        description: 'Un sitio web debe contener al menos una página.',
        variant: 'destructive'
      });
      return;
    }

    if (!window.confirm(`¿Seguro que deseas eliminar la página "${targetWeb.pages[pageIndex].name}"?`)) return;

    const updated = websites.map(w => {
      if (w.id === selectedWebsiteId) {
        const pages = w.pages || [];
        return {
          ...w,
          pages: pages.filter((_, idx) => idx !== pageIndex)
        };
      }
      return w;
    });

    saveWebsites(updated);
    setActivePageIndex(0);

    toast({
      title: 'Página Eliminada',
      description: 'La página ha sido eliminada del sitio.'
    });
  };

  // Save Custom Domain settings
  const handleSaveDomain = (id: string, domain: string) => {
    const updated = websites.map(w => {
      if (w.id === id) {
        return { ...w, customDomain: domain.trim() };
      }
      return w;
    });
    saveWebsites(updated);
    toast({
      title: 'Dominio Guardado',
      description: `El dominio personalizado se configuró como ${domain}.`
    });
  };

  // --- SECTION BUILDER METHODS ---
  const addSection = (type: PageElement['type']) => {
    const newEl: PageElement = {
      id: `el-${Date.now()}`,
      type,
      content: {
        title: type === 'hero' ? 'Sección Titular' 
              : type === 'tarjetas_productos' ? 'Nuestros Productos'
              : type === 'detalle_producto' ? 'Detalle de Producto'
              : type === 'carrusel_productos' ? 'Carrusel de Artículos'
              : type === 'features' ? 'Características Destacadas'
              : type === 'testimonials' ? 'Comentarios de Clientes'
              : type === 'cta' ? '¿Listo para empezar?'
              : type === 'titulo' ? 'Título Principal'
              : type === 'parrafo' ? 'Escribe aquí tu texto descriptivo o de bienvenida para tus clientes de ferretería.'
              : type === 'imagen' ? 'Banner Promocional'
              : type === 'boton' ? 'Comprar Ahora'
              : type === 'contacto_form' ? 'Contáctanos'
              : type === 'sitemap' ? (selectedWeb?.name || 'OmniShop')
              : type === 'custom_code' ? 'Código Custom'
              : 'Pie de Página',
        subtitle: type === 'hero' ? 'Edita este subtítulo en el panel inspector.'
                : type === 'cta' ? 'Consigue asesoramiento instantáneo de nuestros expertos.'
                : '',
        buttonText: type === 'hero' || type === 'cta' || type === 'boton' ? 'Saber Más' : '',
        bgGradient: type === 'hero' ? 'from-blue-600 to-indigo-800 text-white' 
                   : type === 'cta' ? 'from-slate-900 to-slate-800 text-white' 
                   : '',
        cols: '3',
        price: '$12,490',
        f1: type === 'features' ? 'Garantía extendida 1 año' : '',
        f2: type === 'features' ? 'Envíos en el día gratis' : '',
        f3: type === 'features' ? 'Soporte 24/7 post-venta' : '',
        company: type === 'footer' || type === 'sitemap' ? (selectedWeb?.name || 'Mi Marca') : '',
        clientName: type === 'testimonials' ? 'Juan Pérez' : '',
        reviewText: type === 'testimonials' ? 'Excelente servicio de envío y soporte técnico.' : '',
        align: 'center',
        size: 'md',
        buttonLink: '#',
        caption: 'Mockup de producto',
        imageUrl: '',
        htmlCode: type === 'custom_code' ? `<div class="p-8 text-center bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700/50 max-w-2xl mx-auto my-6 relative overflow-hidden">
  <div class="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl"></div>
  <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-500/10 rounded-full blur-xl"></div>
  <h2 class="text-3xl font-black mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">🔥 Bloque Personalizado</h2>
  <p class="text-sm opacity-80 max-w-md mx-auto mb-6">Puedes insertar tu propio HTML, darle estilo con CSS y agregar interacción interactiva mediante JS.</p>
  <button id="custom-action-btn-${Date.now()}" class="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-lg shadow-indigo-500/20 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer">Ejecutar Javascript</button>
</div>` : '',
        cssCode: type === 'custom_code' ? `/* Escribe tus reglas de CSS aquí */
#custom-action-btn-${Date.now()} {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}` : '',
        jsCode: type === 'custom_code' ? `// Interactúa con tus elementos HTML aquí
const button = document.getElementById("custom-action-btn-${Date.now()}");
if (button) {
  button.addEventListener("click", () => {
    alert("¡Hola! Tu código HTML, CSS y JS se está ejecutando perfectamente.");
  });
}` : ''
      }
    };

    setEditorElements([...editorElements, newEl]);
    setSelectedElementId(newEl.id);
    toast({
      title: 'Bloque Añadido',
      description: `Se añadió el bloque "${type.replace('_', ' ').toUpperCase()}" al lienzo.`
    });
  };

  const deleteSection = (id: string) => {
    if (editorElements.length <= 1) {
      toast({
        title: 'Error',
        description: 'La página debe tener al menos una sección.',
        variant: 'destructive'
      });
      return;
    }
    setEditorElements(editorElements.filter(el => el.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newElements = [...editorElements];
    if (direction === 'up' && index > 0) {
      const temp = newElements[index];
      newElements[index] = newElements[index - 1];
      newElements[index - 1] = temp;
    } else if (direction === 'down' && index < newElements.length - 1) {
      const temp = newElements[index];
      newElements[index] = newElements[index + 1];
      newElements[index + 1] = temp;
    }
    setEditorElements(newElements);
  };

  const updateElementContent = (key: string, value: string) => {
    setEditorElements(prev => prev.map(el => {
      if (el.id === selectedElementId) {
        return {
          ...el,
          content: { ...el.content, [key]: value }
        };
      }
      return el;
    }));
  };

  const handleHeroBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'La imagen no debe superar los 5 MB.'
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor selecciona un archivo de imagen válido.'
      });
      return;
    }

    setIsUploadingHeroBg(true);

    try {
      const authToken = localStorage.getItem('auth_access_token');
      const uploadUrl = authToken
        ? `${window.location.origin}/api/upload?access_token=${encodeURIComponent(authToken)}`
        : `${window.location.origin}/api/upload`;

      const uploadData = new FormData();
      uploadData.append('file', file);

      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        body: uploadData
      });

      if (!uploadRes.ok) {
        throw new Error(`Error en el servidor: ${uploadRes.status}`);
      }

      const data = await uploadRes.json();
      if (data.success && data.url) {
        updateElementContent('bgImageUrl', data.url);
        toast({
          title: 'Imagen subida',
          description: 'La imagen de fondo se ha subido correctamente.'
        });
      } else {
        throw new Error(data.message || 'No se pudo subir el archivo');
      }
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error al subir',
        description: err.message || 'No se pudo conectar con el servidor.'
      });
    } finally {
      setIsUploadingHeroBg(false);
    }
  };

  const handleSavePageElements = () => {
    if (!selectedWebsiteId || !editingPageId) return;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const updated = websites.map(w => {
      if (w.id === selectedWebsiteId) {
        const updatedPages = (w.pages || []).map(p => {
          if (p.id === editingPageId) {
            return { ...p, elements: editorElements };
          }
          return p;
        });
        return {
          ...w,
          lastUpdated: formattedDate,
          pages: updatedPages
        };
      }
      return w;
    });

    saveWebsites(updated);
    setEditingPageId(null);
    setSelectedElementId(null);

    toast({
      title: 'Diseño Guardado',
      description: 'Los cambios en la página han sido guardados con éxito.'
    });
  };

  const filteredWebsites = websites.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedWeb = websites.find(w => w.id === selectedWebsiteId);

  // --- RENDER VIEW 4: FULLSCREEN INTERACTIVE DRAG-N-DROP BUILDER ---
  if (editingPageId && selectedWeb) {
    const activeEditingPage = selectedWeb.pages?.find(p => p.id === editingPageId);
    const selectedEl = editorElements.find(el => el.id === selectedElementId);

    return (
      <div className="fixed inset-0 bg-slate-100 flex flex-col z-50 animate-in fade-in duration-200">
        {/* Top Navigation Bar */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5 shadow-xs shrink-0">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                if (window.confirm('¿Deseas salir sin guardar los cambios?')) {
                  setEditingPageId(null);
                }
              }}
              className="h-8 text-slate-500 hover:text-slate-800 text-xs px-2.5 flex items-center gap-1 bg-slate-50 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
              <span>Cerrar</span>
            </Button>
            <div className="h-4 w-[1px] bg-slate-200"></div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800">{selectedWeb.name}</span>
              <span className="text-[10px] text-slate-400 font-semibold font-mono leading-none">
                Editando: {activeEditingPage?.name} ({activeEditingPage?.path})
              </span>
            </div>
          </div>

          {/* Desktop / Mobile view toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 border border-slate-200 rounded-lg">
            <button
              onClick={() => setIsMobileView(false)}
              className={`p-1.5 rounded-md focus:outline-none transition-all ${
                !isMobileView ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Vista de Escritorio"
            >
              <Laptop className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsMobileView(true)}
              className={`p-1.5 rounded-md focus:outline-none transition-all ${
                isMobileView ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Vista Móvil"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={handleSavePageElements}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 px-4 shadow-sm"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Guardar diseño</span>
            </Button>
          </div>
        </div>

        {/* Builder Editor Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Elements Palette - WordPress style (Accordion of categories with 2-col grid cards) */}
          <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full shadow-xs shrink-0 select-none overflow-y-auto">
            <div className="p-3.5 border-b border-slate-200 bg-white text-left">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layout className="h-3.5 w-3.5 text-blue-600" />
                Bloques de Construcción
              </h3>
              <p className="text-[9px] text-slate-400 leading-none mt-1">Añade componentes modulares.</p>
            </div>

            {/* Accordion Categories */}
            <div className="divide-y divide-slate-200/80">
              
              {/* CATEGORY 1: PRODUCTOS */}
              <div>
                <button 
                  onClick={() => toggleCategory('productos')}
                  className="w-full px-4 py-3 bg-white hover:bg-slate-50/50 flex items-center justify-between text-left text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-blue-600" />
                    PRODUCTOS
                  </span>
                  <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${openCategories.productos ? '' : '-rotate-90'}`} />
                </button>
                
                {openCategories.productos && (
                  <div className="p-3 bg-slate-50/50 grid grid-cols-2 gap-2 border-t border-slate-100">
                    <div 
                      onClick={() => addSection('tarjetas_productos')}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <ShoppingBag className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[9px] font-bold text-slate-600 leading-none">Tarjetas Prod</span>
                    </div>

                    <div 
                      onClick={() => addSection('detalle_producto')}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <Layers className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[9px] font-bold text-slate-600 leading-none">Detalle Prod</span>
                    </div>

                    <div 
                      onClick={() => addSection('boton_compra')}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <CreditCard className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[9px] font-bold text-slate-600 leading-none">Botón Compra</span>
                    </div>

                    <div 
                      onClick={() => addSection('carrusel_productos')}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <Sliders className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[9px] font-bold text-slate-600 leading-none">Carrusel</span>
                    </div>
                  </div>
                )}
              </div>

              {/* CATEGORY 2: BÁSICOS */}
              <div>
                <button 
                  onClick={() => toggleCategory('basicos')}
                  className="w-full px-4 py-3 bg-white hover:bg-slate-50/50 flex items-center justify-between text-left text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <span className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-blue-600" />
                    BÁSICOS
                  </span>
                  <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${openCategories.basicos ? '' : '-rotate-90'}`} />
                </button>
                
                {openCategories.basicos && (
                  <div className="p-3 bg-slate-50/50 grid grid-cols-2 gap-2 border-t border-slate-100">
                    <div 
                      onClick={() => addSection('titulo')}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <Heading className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[9px] font-bold text-slate-600 leading-none">Título</span>
                    </div>

                    <div 
                      onClick={() => addSection('parrafo')}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <FileText className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[9px] font-bold text-slate-600 leading-none">Párrafo</span>
                    </div>

                    <div 
                      onClick={() => addSection('imagen')}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <ImageIcon className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[9px] font-bold text-slate-600 leading-none">Imagen</span>
                    </div>

                    <div 
                      onClick={() => addSection('boton')}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <Play className="h-4 w-4 text-slate-400 group-hover:text-blue-600 rotate-90" />
                      <span className="text-[9px] font-bold text-slate-600 leading-none">Botón Enlace</span>
                    </div>

                    <div 
                      onClick={() => addSection('custom_code')}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <Code className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[9px] font-bold text-slate-600 leading-none">Código Custom</span>
                    </div>
                  </div>
                )}
              </div>

              {/* CATEGORY 3: ESTRUCTURA */}
              <div>
                <button 
                  onClick={() => toggleCategory('estructura')}
                  className="w-full px-4 py-3 bg-white hover:bg-slate-50/50 flex items-center justify-between text-left text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <span className="flex items-center gap-2">
                    <Columns className="h-4 w-4 text-blue-600" />
                    ESTRUCTURA
                  </span>
                  <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${openCategories.estructura ? '' : '-rotate-90'}`} />
                </button>
                
                {openCategories.estructura && (
                  <div className="p-3 bg-slate-50/50 grid grid-cols-2 gap-2 border-t border-slate-100">
                    <div 
                      onClick={() => addSection('hero')}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <Sparkles className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[9px] font-bold text-slate-600 leading-none">Sección Hero</span>
                    </div>

                    <div 
                      onClick={() => addSection('features')}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <List className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[9px] font-bold text-slate-600 leading-none">Beneficios</span>
                    </div>

                    <div 
                      onClick={() => addSection('cta')}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <Play className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[9px] font-bold text-slate-600 leading-none">Llamado Acción</span>
                    </div>

                    <div 
                      onClick={() => addSection('footer')}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <Folder className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[9px] font-bold text-slate-600 leading-none">Pie de Página</span>
                    </div>
                  </div>
                )}
              </div>

              {/* CATEGORY 4: CONTENIDO */}
              <div>
                <button 
                  onClick={() => toggleCategory('contenido')}
                  className="w-full px-4 py-3 bg-white hover:bg-slate-50/50 flex items-center justify-between text-left text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <span className="flex items-center gap-2">
                    <Compass className="h-4 w-4 text-blue-600" />
                    CONTENIDO DINÁMICO
                  </span>
                  <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${openCategories.contenido ? '' : '-rotate-90'}`} />
                </button>
                
                {openCategories.contenido && (
                  <div className="p-3 bg-slate-50/50 grid grid-cols-2 gap-2 border-t border-slate-100">
                    <div 
                      onClick={() => addSection('testimonials')}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <User className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[9px] font-bold text-slate-600 leading-none">Testimonios</span>
                    </div>

                    <div 
                      onClick={() => addSection('contacto_form')}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <Mail className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[9px] font-bold text-slate-600 leading-none">Formulario</span>
                    </div>

                    <div 
                      onClick={() => addSection('sitemap')}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center justify-center text-center space-y-1 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <Globe2 className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                      <span className="text-[9px] font-bold text-slate-600 leading-none">Mapa Sitio</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Central Workspace Canvas */}
          <div className="flex-1 overflow-y-auto bg-slate-100 p-8 flex justify-center text-center">
            <div className={`w-full transition-all duration-300 ${
              isMobileView 
                ? 'max-w-xs bg-white shadow-xl border-x border-slate-300 rounded-[32px] p-4 min-h-[640px] border-4 border-slate-800 relative ring-8 ring-slate-100 overflow-y-auto scrollbar-none' 
                : 'max-w-3xl space-y-4'
            }`}>
              {editorElements.length === 0 ? (
                <div className="p-16 border-2 border-dashed border-slate-300 rounded-2xl bg-white flex flex-col items-center justify-center space-y-3">
                  <Layers className="h-8 w-8 text-slate-300" />
                  <h4 className="text-xs font-bold text-slate-700">Lienzo Vacío</h4>
                  <p className="text-[10px] text-slate-400 max-w-[180px]">Haz clic en los bloques de la izquierda para diseñar tu página.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {editorElements.map((el, index) => {
                    const isSelected = el.id === selectedElementId;
                    return (
                      <div
                        key={el.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }}
                        className={`relative rounded-xl overflow-hidden bg-white border transition-all ${
                          isSelected 
                            ? 'border-blue-500 ring-2 ring-blue-100/50 shadow-md scale-[1.01]' 
                            : 'border-slate-200 hover:border-slate-300 shadow-xs'
                        } group cursor-pointer text-left`}
                      >
                        {/* Action controls toolbar on hover */}
                        <div className="absolute right-3 top-3 bg-white/95 border border-slate-200 rounded-lg p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 flex space-x-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); moveSection(index, 'up'); }}
                            disabled={index === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-50 rounded"
                            title="Subir bloque"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); moveSection(index, 'down'); }}
                            disabled={index === editorElements.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-50 rounded"
                            title="Bajar bloque"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteSection(el.id); }}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Eliminar bloque"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Rendering dynamic components visual blocks */}

                        {/* 1. HERO */}
                        {el.type === 'hero' && (
                          <HeroTienda 
                            title={el.content.title}
                            subtitle={el.content.subtitle}
                            buttonText={el.content.buttonText}
                            bgGradient={el.content.bgGradient}
                            bgImageUrl={el.content.bgImageUrl}
                            bgType={el.content.bgType}
                            bgColor={el.content.bgColor}
                          />
                        )}

                        {/* CUSTOM CODE BLOCK */}
                        {el.type === 'custom_code' && (
                          <CustomCodeTienda 
                            htmlCode={el.content.htmlCode}
                            cssCode={el.content.cssCode}
                            jsCode={el.content.jsCode}
                            elementId={el.id}
                          />
                        )}

                        {/* 2. PRODUCT CARDS */}
                        {el.type === 'tarjetas_productos' && (
                          <ProductGrid 
                            title={el.content.title}
                          />
                        )}

                        {/* 3. PRODUCT DETAIL (Split page visual) */}
                        {el.type === 'detalle_producto' && (
                          <ProductDetails 
                            title={el.content.title}
                            subtitle={el.content.subtitle}
                            price={el.content.price}
                            imageUrl={el.content.imageUrl}
                            buttonText={el.content.buttonText}
                          />
                        )}

                        {/* 4. PURCHASE BUTTON */}
                        {el.type === 'boton_compra' && (
                          <PurchaseButton 
                            title={el.content.title}
                            price={el.content.price}
                            align={el.content.align}
                          />
                        )}

                        {/* 5. PRODUCT CAROUSEL */}
                        {el.type === 'carrusel_productos' && (
                          <ProductCarousel 
                            title={el.content.title}
                          />
                        )}

                        {/* 6. TITLE */}
                        {el.type === 'titulo' && (
                          <div className={`p-4 bg-white text-${el.content.align || 'center'}`}>
                            <h2 className={`font-black text-slate-900 tracking-tight ${
                              el.content.size === 'lg' ? 'text-lg' : el.content.size === 'sm' ? 'text-xs' : 'text-sm font-extrabold'
                            }`}>{el.content.title}</h2>
                          </div>
                        )}

                        {/* 7. PARAGRAPH */}
                        {el.type === 'parrafo' && (
                          <div className={`p-4 bg-white text-${el.content.align || 'left'} leading-relaxed`}>
                            <p className={`text-slate-600 ${
                              el.content.size === 'lg' ? 'text-xs leading-relaxed' : el.content.size === 'sm' ? 'text-[10px]' : 'text-[11px]'
                            }`}>{el.content.title}</p>
                          </div>
                        )}

                        {/* 8. IMAGE */}
                        {el.type === 'imagen' && (
                          <div className="p-5 bg-white text-center space-y-2">
                            <div className="bg-slate-100 border rounded-xl h-40 flex items-center justify-center text-slate-400 max-w-lg mx-auto">
                              <ImageIcon className="h-8 w-8 text-slate-300" />
                            </div>
                            {el.content.caption && (
                              <p className="text-[10px] text-slate-400 italic">{el.content.caption}</p>
                            )}
                          </div>
                        )}

                        {/* 9. LINK BUTTON */}
                        {el.type === 'boton' && (
                          <div className={`p-3 bg-white text-${el.content.align || 'center'}`}>
                            <button className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm">
                              {el.content.title}
                            </button>
                          </div>
                        )}

                        {/* 10. ACCORDION FEATURES */}
                        {el.type === 'features' && (
                          <FeatureBanner 
                            title={el.content.title}
                            f1={el.content.f1}
                            f2={el.content.f2}
                            f3={el.content.f3}
                          />
                        )}

                        {/* 11. TESTIMONIALS */}
                        {el.type === 'testimonials' && (
                          <StoreReviews 
                            title={el.content.title}
                            clientName={el.content.clientName}
                            reviewText={el.content.reviewText}
                          />
                        )}

                        {/* 12. CALL TO ACTION */}
                        {el.type === 'cta' && (
                          <div className={`p-6 text-center bg-gradient-to-r ${el.content.bgGradient || 'from-slate-900 to-slate-800 text-white'} flex flex-col items-center justify-center`}>
                            <h3 className="text-sm font-extrabold tracking-tight">{el.content.title}</h3>
                            <p className="text-[10px] opacity-80 mt-1 max-w-sm">{el.content.subtitle}</p>
                            <div className="mt-3 flex gap-1.5 w-full max-w-xs justify-center">
                              <Input placeholder="Tu correo electrónico" className="h-7 text-[10px] bg-white text-slate-800 max-w-[140px]" />
                              <button className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[10px] shadow-sm shrink-0">
                                {el.content.buttonText || 'Enviar'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 13. CONTACT FORM */}
                        {el.type === 'contacto_form' && (
                          <ContactForm 
                            title={el.content.title}
                            buttonText={el.content.buttonText}
                            formId={el.content.formId}
                          />
                        )}

                        {/* 14. SITEMAP */}
                        {el.type === 'sitemap' && (
                          <div className="p-5 bg-slate-100 grid grid-cols-3 gap-3 text-[9px] text-slate-500 border-t border-b text-left">
                            <div className="space-y-1">
                              <span className="font-bold text-slate-700 block">{el.content.title || 'OmniShop'}</span>
                              <span className="block">Catálogo completo</span>
                              <span className="block">Nuevos Ingresos</span>
                            </div>
                            <div className="space-y-1">
                              <span className="font-bold text-slate-700 block">Soporte</span>
                              <span className="block">Preguntas Frecuentes</span>
                              <span className="block">Contacto Técnico</span>
                            </div>
                            <div className="space-y-1">
                              <span className="font-bold text-slate-700 block">Legal</span>
                              <span className="block">Privacidad</span>
                              <span className="block">Condiciones de Uso</span>
                            </div>
                          </div>
                        )}

                        {/* 15. FOOTER */}
                        {el.type === 'footer' && (
                          <StoreFooter 
                            company={el.content.company}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Inspector Sidebar (Selected Section Options) */}
          <div className="w-72 bg-white border-l border-slate-200 flex flex-col h-full shadow-xs shrink-0 select-none text-left">
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5 text-blue-600" />
                Inspector de Contenido
              </h3>
              <p className="text-[9px] text-slate-400 leading-none mt-1">Modifica las propiedades del bloque seleccionado.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedEl ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tipo de Sección</span>
                    <span className="text-xs font-bold text-slate-850 uppercase bg-slate-100 border px-2 py-1 rounded block">
                      {selectedEl.type.replace('_', ' ')}
                    </span>
                  </div>

                  {/* INSPECTOR FORM FIELDS BY SECTION TYPE */}
                  {(selectedEl.type === 'hero' || selectedEl.type === 'detalle_producto' || selectedEl.type === 'titulo' || selectedEl.type === 'parrafo' || selectedEl.type === 'contacto_form') && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Título / Texto Principal</label>
                      <Input 
                        value={selectedEl.content.title || ''}
                        onChange={(e) => updateElementContent('title', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}

                  {selectedEl.type === 'detalle_producto' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Precio</label>
                      <Input 
                        value={selectedEl.content.price || ''}
                        onChange={(e) => updateElementContent('price', e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  )}

                  {(selectedEl.type === 'hero' || selectedEl.type === 'detalle_producto' || selectedEl.type === 'cta') && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Subtítulo / Descripción</label>
                      <textarea 
                        value={selectedEl.content.subtitle || ''}
                        onChange={(e) => updateElementContent('subtitle', e.target.value)}
                        rows={3}
                        className="w-full border border-slate-200 rounded-md p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                      />
                    </div>
                  )}

                  {(selectedEl.type === 'hero' || selectedEl.type === 'detalle_producto' || selectedEl.type === 'cta' || selectedEl.type === 'boton' || selectedEl.type === 'contacto_form') && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Texto del Botón</label>
                      <Input 
                        value={selectedEl.content.buttonText || ''}
                        onChange={(e) => updateElementContent('buttonText', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}

                  {selectedEl.type === 'contacto_form' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Vincular Formulario</label>
                      <select
                        value={selectedEl.content.formId || ''}
                        onChange={(e) => updateElementContent('formId', e.target.value)}
                        className="w-full border border-slate-200 rounded-md p-1.5 text-xs bg-white font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Formulario de Contacto Estándar</option>
                        {(() => {
                          const formsKey = `admin_custom_forms_${selectedWebsiteId}`;
                          const formsList = JSON.parse(localStorage.getItem(formsKey) || '[]');
                          return formsList.map((form: any) => (
                            <option key={form.id} value={form.id}>
                              {form.name} ({form.fields.length} campos)
                            </option>
                          ));
                        })()}
                      </select>
                      <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                        Crea y edita tus formularios personalizados en la pestaña principal de <strong>Formularios</strong>.
                      </p>
                    </div>
                  )}

                  {(selectedEl.type === 'titulo' || selectedEl.type === 'parrafo' || selectedEl.type === 'boton') && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Alineación</label>
                      <select
                        value={selectedEl.content.align || 'center'}
                        onChange={(e) => updateElementContent('align', e.target.value)}
                        className="w-full border border-slate-200 rounded-md p-1.5 text-xs bg-white"
                      >
                        <option value="left">Izquierda</option>
                        <option value="center">Centrado</option>
                        <option value="right">Derecha</option>
                      </select>
                    </div>
                  )}

                  {(selectedEl.type === 'titulo' || selectedEl.type === 'parrafo') && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tamaño</label>
                      <select
                        value={selectedEl.content.size || 'md'}
                        onChange={(e) => updateElementContent('size', e.target.value)}
                        className="w-full border border-slate-200 rounded-md p-1.5 text-xs bg-white"
                      >
                        <option value="sm">Pequeño</option>
                        <option value="md">Mediano</option>
                        <option value="lg">Grande</option>
                      </select>
                    </div>
                  )}

                  {selectedEl.type === 'hero' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tipo de Fondo</label>
                        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-md">
                          <button
                            type="button"
                            onClick={() => updateElementContent('bgType', 'gradient')}
                            className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                              (!selectedEl.content.bgType || selectedEl.content.bgType === 'gradient')
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Gradiente
                          </button>
                          <button
                            type="button"
                            onClick={() => updateElementContent('bgType', 'color')}
                            className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                              selectedEl.content.bgType === 'color'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Color Sólido
                          </button>
                          <button
                            type="button"
                            onClick={() => updateElementContent('bgType', 'image')}
                            className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                              selectedEl.content.bgType === 'image'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Imagen
                          </button>
                        </div>
                      </div>

                      {(!selectedEl.content.bgType || selectedEl.content.bgType === 'gradient') && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Seleccionar Gradiente</label>
                          <select
                            value={selectedEl.content.bgGradient || 'from-blue-600 to-indigo-800 text-white'}
                            onChange={(e) => updateElementContent('bgGradient', e.target.value)}
                            className="w-full border border-slate-200 rounded-md p-1.5 text-xs bg-white"
                          >
                            <option value="from-blue-600 to-indigo-800 text-white">Azul Industrial (Predeterminado)</option>
                            <option value="from-slate-800 to-slate-950 text-white">Oscuro Premium</option>
                            <option value="from-emerald-600 to-teal-800 text-white">Verde Esmeralda</option>
                            <option value="from-orange-500 to-amber-600 text-white">Naranja Cálido</option>
                            <option value="transparent">Sin Gradiente (Transparente)</option>
                          </select>
                        </div>
                      )}

                      {selectedEl.content.bgType === 'color' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Color de Fondo</label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="color"
                              value={selectedEl.content.bgColor || '#1e293b'}
                              onChange={(e) => updateElementContent('bgColor', e.target.value)}
                              className="w-10 h-8 p-0.5 border border-slate-200 rounded cursor-pointer bg-white"
                            />
                            <Input 
                              value={selectedEl.content.bgColor || '#1e293b'}
                              onChange={(e) => updateElementContent('bgColor', e.target.value)}
                              className="h-8 text-xs font-mono uppercase bg-white flex-1"
                              placeholder="#1E293B"
                            />
                          </div>
                        </div>
                      )}

                      {selectedEl.content.bgType === 'image' && (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Subir Imagen</label>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById('hero-bg-upload')?.click()}
                                className="w-full text-xs flex items-center justify-center gap-2 h-8"
                                disabled={isUploadingHeroBg}
                              >
                                {isUploadingHeroBg ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Subiendo...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-3.5 w-3.5" />
                                    <span>Seleccionar archivo</span>
                                  </>
                                )}
                              </Button>
                              <input
                                id="hero-bg-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleHeroBgUpload}
                                className="hidden"
                                disabled={isUploadingHeroBg}
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">URL de Imagen</label>
                            <Input 
                              placeholder="https://ejemplo.com/fondo.jpg"
                              value={selectedEl.content.bgImageUrl || ''}
                              onChange={(e) => updateElementContent('bgImageUrl', e.target.value)}
                              className="h-8 text-xs bg-white"
                            />
                          </div>

                          {selectedEl.content.bgImageUrl && (
                            <div className="relative border border-slate-200 rounded p-1 bg-slate-50 flex items-center gap-2">
                              <img 
                                src={selectedEl.content.bgImageUrl} 
                                alt="Preview" 
                                className="w-12 h-10 object-cover rounded" 
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[9px] text-slate-400 truncate">{selectedEl.content.bgImageUrl}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => updateElementContent('bgImageUrl', '')}
                                className="p-1 hover:text-red-500 text-slate-400"
                                title="Eliminar imagen"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                          <p className="text-[9px] text-slate-400">Se aplicará automáticamente un filtro de legibilidad oscuro sobre la imagen.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedEl.type === 'custom_code' && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Código HTML</label>
                        <textarea
                          value={selectedEl.content.htmlCode || ''}
                          onChange={(e) => updateElementContent('htmlCode', e.target.value)}
                          className="w-full bg-slate-900 text-slate-100 font-mono text-[10px] p-2 rounded-md h-36 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="<div>\n  <h1>Hola Mundo</h1>\n</div>"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Estilos CSS</label>
                        <textarea
                          value={selectedEl.content.cssCode || ''}
                          onChange={(e) => updateElementContent('cssCode', e.target.value)}
                          className="w-full bg-slate-900 text-slate-100 font-mono text-[10px] p-2 rounded-md h-28 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="h1 {\n  color: red;\n}"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Script JS</label>
                        <textarea
                          value={selectedEl.content.jsCode || ''}
                          onChange={(e) => updateElementContent('jsCode', e.target.value)}
                          className="w-full bg-slate-900 text-slate-100 font-mono text-[10px] p-2 rounded-md h-28 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="console.log('Script ejecutado');"
                        />
                        <p className="text-[8px] text-slate-400">El JS se ejecutará automáticamente en el contexto de la página.</p>
                      </div>
                    </div>
                  )}

                  {selectedEl.type === 'tarjetas_productos' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Título de la Malla</label>
                      <Input 
                        value={selectedEl.content.title || ''}
                        onChange={(e) => updateElementContent('title', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}

                  {selectedEl.type === 'features' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Título de Sección</label>
                        <Input 
                          value={selectedEl.content.title || ''}
                          onChange={(e) => updateElementContent('title', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Característica 1</label>
                        <Input 
                          value={selectedEl.content.f1 || ''}
                          onChange={(e) => updateElementContent('f1', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Característica 2</label>
                        <Input 
                          value={selectedEl.content.f2 || ''}
                          onChange={(e) => updateElementContent('f2', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Característica 3</label>
                        <Input 
                          value={selectedEl.content.f3 || ''}
                          onChange={(e) => updateElementContent('f3', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </>
                  )}

                  {selectedEl.type === 'testimonials' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Título</label>
                        <Input 
                          value={selectedEl.content.title || ''}
                          onChange={(e) => updateElementContent('title', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Nombre de Cliente</label>
                        <Input 
                          value={selectedEl.content.clientName || ''}
                          onChange={(e) => updateElementContent('clientName', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Reseña</label>
                        <textarea 
                          value={selectedEl.content.reviewText || ''}
                          onChange={(e) => updateElementContent('reviewText', e.target.value)}
                          rows={4}
                          className="w-full border border-slate-200 rounded-md p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                        />
                      </div>
                    </>
                  )}

                  {selectedEl.type === 'footer' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Nombre de Empresa</label>
                        <Input 
                          value={selectedEl.content.company || ''}
                          onChange={(e) => updateElementContent('company', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center p-8 text-center text-slate-400 font-medium">
                  <div className="space-y-2">
                    <AlignLeft className="h-8 w-8 mx-auto text-slate-300" />
                    <p className="text-[10px]">Haz clic en cualquier sección del lienzo central para editar sus contenidos.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER VIEW 1: LIST OF WEBSITES ---
  if (!selectedWebsiteId || !selectedWeb) {
    return (
      <div className="space-y-4 pt-1">
        {/* Header Area */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sitios Web</h1>
            <p className="text-xs text-slate-500">
              Diseña y administra las páginas de tu tienda para mostrar tus productos y construir una marca de confianza.
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 border-slate-200 text-slate-600 hover:bg-slate-50"
              title="Plantillas"
            >
              <Folder className="h-4 w-4" />
            </Button>

            <Button 
              variant="outline" 
              className="h-9 px-3 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs flex items-center gap-1.5"
              onClick={() => {
                toast({
                  title: 'Crear con IA',
                  description: 'La inteligencia artificial está preparando tu nueva página...'
                });
              }}
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-500 fill-violet-50" />
              <span>Crear con IA</span>
            </Button>

            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nuevo sitio web</span>
            </Button>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* Table Action Bar */}
          <div className="flex items-center justify-between p-3 border-b border-slate-200 gap-4">
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" title="Inicio">
                <Home className="h-4 w-4" />
              </Button>
              <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" title="Historial">
                <Clock className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 bg-blue-50/50 hover:bg-blue-50" title="Lista">
                <List className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar sitios web"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
              />
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3 font-semibold">Nombre</th>
                  <th className="px-5 py-3 font-semibold">Última actualización</th>
                  <th className="px-5 py-3 font-semibold">Ruta (Path)</th>
                  <th className="px-5 py-3 font-semibold">Páginas</th>
                  <th className="px-5 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredWebsites.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                      No se encontraron sitios web. Haz clic en "Nuevo sitio web" para crear uno.
                    </td>
                  </tr>
                ) : (
                  filteredWebsites.map((web) => (
                    <tr key={web.id} className="hover:bg-slate-50/30 transition-colors">
                      <td 
                        className="px-5 py-4 font-bold text-blue-600 hover:text-blue-700 cursor-pointer hover:underline"
                        onClick={() => {
                          setSelectedWebsiteId(web.id);
                          setTempSetupType(web.setupType || 'blank');
                          setActivePageIndex(0);
                        }}
                      >
                        {web.name}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {web.lastUpdated}
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-mono">
                        {web.path}
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-medium">
                        {web.pages ? `${web.pages.length} Páginas` : 'Sin configurar'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => handleEdit(web)}>
                              <Edit2 className="h-3.5 w-3.5 mr-2" /> Editar Nombre
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(web.id)} className="text-red-600 focus:text-red-700">
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between p-3 border-t border-slate-200 text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <span>Filas por página</span>
              <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded cursor-pointer hover:bg-slate-100">
                <span>15</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span>1 - {filteredWebsites.length} de {filteredWebsites.length}</span>
              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 pointer-events-none">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="h-6 w-6 border border-blue-600 bg-blue-50/35 text-blue-600 flex items-center justify-center font-semibold rounded text-[11px]">
                  1
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 pointer-events-none">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Create Dialog */}
        <Dialog 
          open={isCreateOpen} 
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false);
              setNewWebsiteName('');
            }
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-800">Crear Nuevo Sitio Web</DialogTitle>
              <DialogDescription className="text-xs">
                Ingresa el nombre para tu nuevo sitio web.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 block uppercase">Nombre del Sitio Web</label>
                  <Input
                    placeholder="Ej. Mi Tienda Virtual"
                    value={newWebsiteName}
                    onChange={e => setNewWebsiteName(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </form>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateOpen(false);
                  setNewWebsiteName('');
                }}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newWebsiteName.trim()}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog 
          open={editingWebsite !== null} 
          onOpenChange={(open) => {
            if (!open) setEditingWebsite(null);
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-800">Editar Nombre del Sitio Web</DialogTitle>
              <DialogDescription className="text-xs">
                Ingresa el nuevo nombre para este sitio web.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 block uppercase">Nombre del Sitio Web</label>
                  <Input
                    placeholder="Ej. Mi Tienda Virtual"
                    value={newWebsiteName}
                    onChange={e => setNewWebsiteName(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </form>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setEditingWebsite(null)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!newWebsiteName.trim()}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- RENDER VIEW 2: SETUP SELECTION SCREEN (matching the first image) ---
  if (!selectedWeb.setupType) {
    return (
      <div className="min-h-[500px] flex items-center justify-center py-6 px-4 bg-slate-50/50 rounded-2xl border border-slate-200/60 shadow-sm animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 md:p-8 max-w-5xl w-full shadow-lg space-y-6 relative overflow-hidden">
          <button 
            onClick={() => setSelectedWebsiteId(null)}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Plus className="h-5 w-5 rotate-45" />
          </button>

          <div className="space-y-1 text-center md:text-left pb-2">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Configurar Nuevo Sitio Web</h2>
            <p className="text-xs text-slate-500">Selecciona cómo deseas comenzar a construir tu sitio web "{selectedWeb.name}".</p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blank Option Card */}
            <div 
              onClick={() => setTempSetupType('blank')}
              className={`cursor-pointer rounded-xl border-2 p-5 flex flex-col justify-between hover:shadow-md transition-all ${
                tempSetupType === 'blank' 
                  ? 'border-indigo-600 bg-indigo-50/5 shadow-sm' 
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {/* API Mockup Box inside Blank card */}
              <div className="border border-dashed border-slate-200 rounded-lg p-3 bg-slate-50/30 flex flex-col justify-center h-28 space-y-1.5 relative overflow-hidden text-left font-mono">
                <div className="flex gap-1 items-center bg-indigo-50/80 border border-indigo-100 rounded px-2 py-0.5 w-max text-[8px] font-bold text-indigo-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  MODO API BACKEND
                </div>
                <div className="border border-slate-100 bg-white rounded p-2 text-[8px] text-slate-500 shadow-sm leading-tight space-y-0.5">
                  <span className="text-[7px] text-slate-400 font-sans font-semibold">ENDPOINT EXPUERTO:</span>
                  GET /api/v1/expose/products
                </div>
              </div>

              <div className="mt-4 space-y-1 text-left">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className={`h-3 w-3 rounded-full flex items-center justify-center text-[7px] text-white ${
                    tempSetupType === 'blank' ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}>
                    {tempSetupType === 'blank' && <Check className="h-2 w-2 stroke-[3]" />}
                  </span>
                  Usar como API Backend (Desde Cero)
                </h3>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Conecta tu propia landing page o frontend. Utiliza este panel como base de datos de productos y receptor de contactos.
                </p>
              </div>
            </div>

            {/* Template Option Card */}
            <div 
              onClick={() => setTempSetupType('template')}
              className={`cursor-pointer rounded-xl border-2 p-5 flex flex-col justify-between hover:shadow-md transition-all ${
                tempSetupType === 'template' 
                  ? 'border-blue-600 bg-blue-50/10 shadow-sm' 
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {/* Template Mockup Grid */}
              <div className="bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg h-28 flex flex-col items-center justify-center text-white relative overflow-hidden shadow-sm">
                <div className="absolute inset-0 opacity-15" style={{ 
                  backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', 
                  backgroundSize: '12px 12px' 
                }}></div>
                <span className="text-xs font-black tracking-wider uppercase drop-shadow-sm">Más de 1000+</span>
                <span className="text-[10px] font-medium opacity-90 tracking-wide uppercase">Plantillas Pro</span>
              </div>

              <div className="mt-4 space-y-1 text-left">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className={`h-3 w-3 rounded-full flex items-center justify-center text-[7px] text-white ${
                    tempSetupType === 'template' ? 'bg-blue-600' : 'bg-slate-300'
                  }`}>
                    {tempSetupType === 'template' && <Check className="h-2 w-2 stroke-[3]" />}
                  </span>
                  Crear con Plantilla
                </h3>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Importa una estructura prediseñada con páginas de inicio, agradecimiento y contacto listas para usar.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button 
              variant="outline" 
              onClick={() => setSelectedWebsiteId(null)}
              className="h-8 text-xs font-semibold px-4"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSetupComplete}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 flex items-center gap-1.5"
            >
              <span>Crear</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER VIEW 3: DETAIL BUILDER SCREEN (matching the second image) ---
  const pages = selectedWeb.pages || [];
  const activePage = pages[activePageIndex] || null;

  if (selectedWeb.setupType === 'blank') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200 pb-12 text-left">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedWebsiteId(null)}
              className="h-8 text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1 px-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Volver a Sitios</span>
            </Button>
            <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Globe2 className="h-4 w-4 text-indigo-600 animate-pulse" />
              {selectedWeb.name}
            </h2>
            <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-full text-indigo-600 uppercase tracking-wide">
              API Backend Mode
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-slate-500">Servicio API Activo</span>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex gap-3 items-start">
          <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-indigo-900">Panel de Backend y API Exclusivo</h4>
            <p className="text-[11px] text-indigo-700 leading-relaxed">
              Has configurado este sitio en modo Backend. No necesitas diseñar vistas aquí. En su lugar, usa OmniShop para gestionar tus productos e inventarios, y consume la API desde tu propio desarrollo frontend (Next.js, Astro, React, WordPress o HTML puro).
            </p>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          
          {/* Column 1 & 2: Credentials and Permissions */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card 1: Credentials */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" />
                Credenciales de Integración
              </h3>
              
              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">URL Base del Endpoint</label>
                    <span className="text-[9px] text-slate-400 font-mono">GET/POST</span>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      value={`${window.location.origin}/api/v1/expose/${selectedWeb.id}`}
                      readOnly
                      className="bg-slate-50 font-mono text-[10px] h-9 text-slate-600 select-all"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/v1/expose/${selectedWeb.id}`);
                        toast({ title: 'Copiado', description: 'URL de API copiada.' });
                      }}
                      className="h-9 w-9 bg-white"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Clave Pública (Public Access Token)</label>
                    <span className="text-[9px] text-amber-500 font-semibold uppercase">Exposición Frontend</span>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      value={selectedWeb.apiKey || `os_pk_live_${selectedWeb.id.substring(2)}`}
                      readOnly
                      className="bg-slate-50 font-mono text-[10px] h-9 text-slate-600 select-all"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedWeb.apiKey || `os_pk_live_${selectedWeb.id.substring(2)}`);
                        toast({ title: 'Copiado', description: 'Clave de API copiada.' });
                      }}
                      className="h-9 w-9 bg-white"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Permissions */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-600" />
                Permisos del Endpoint
              </h3>
              
              <div className="divide-y divide-slate-100">
                {/* Products Expose */}
                <div className="flex items-center justify-between py-3.5">
                  <div className="space-y-0.5 text-left max-w-[80%]">
                    <span className="text-xs font-bold text-slate-800 block">Exponer Catálogo de Productos</span>
                    <span className="text-[10px] text-slate-500 leading-normal block">Permite consultar y listar tus productos, variantes e imágenes mediante peticiones GET desde tu código frontend.</span>
                  </div>
                  <button
                    onClick={() => {
                      const updated = websites.map(w => {
                        if (w.id === selectedWeb.id) {
                          const perms = w.permissions || { products: true, contacts: true };
                          return {
                            ...w,
                            permissions: { ...perms, products: !perms.products }
                          };
                        }
                        return w;
                      });
                      saveWebsites(updated);
                      toast({ title: 'Permiso Modificado', description: 'Catálogo de productos modificado.' });
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      (selectedWeb.permissions?.products !== false) ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        (selectedWeb.permissions?.products !== false) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Contacts Form Expose */}
                <div className="flex items-center justify-between py-3.5">
                  <div className="space-y-0.5 text-left max-w-[80%]">
                    <span className="text-xs font-bold text-slate-800 block">Recibir Contactos / Formularios</span>
                    <span className="text-[10px] text-slate-500 leading-normal block">Permite que tu frontend envíe datos de contacto (leads) directamente a tu base de datos mediante peticiones POST.</span>
                  </div>
                  <button
                    onClick={() => {
                      const updated = websites.map(w => {
                        if (w.id === selectedWeb.id) {
                          const perms = w.permissions || { products: true, contacts: true };
                          return {
                            ...w,
                            permissions: { ...perms, contacts: !perms.contacts }
                          };
                        }
                        return w;
                      });
                      saveWebsites(updated);
                      toast({ title: 'Permiso Modificado', description: 'Recepción de contactos modificada.' });
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      (selectedWeb.permissions?.contacts !== false) ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        (selectedWeb.permissions?.contacts !== false) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Sales Expose */}
                <div className="flex items-center justify-between py-3.5">
                  <div className="space-y-0.5 text-left max-w-[80%]">
                    <span className="text-xs font-bold text-slate-800 block">Procesar Ventas y Pedidos</span>
                    <span className="text-[10px] text-slate-500 leading-normal block">Permite que tu carrito de compras externo cree órdenes de compra directamente en tu panel de ventas de OmniShop.</span>
                  </div>
                  <button
                    onClick={() => {
                      const updated = websites.map(w => {
                        if (w.id === selectedWeb.id) {
                          const perms = w.permissions || { products: true, contacts: true };
                          return {
                            ...w,
                            permissions: { ...perms, sales: !perms.sales }
                          };
                        }
                        return w;
                      });
                      saveWebsites(updated);
                      toast({ title: 'Permiso Modificado', description: 'Procesamiento de ventas modificado.' });
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      selectedWeb.permissions?.sales ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        selectedWeb.permissions?.sales ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Payments Expose */}
                <div className="flex items-center justify-between py-3.5">
                  <div className="space-y-0.5 text-left max-w-[80%]">
                    <span className="text-xs font-bold text-slate-800 block">Integrar Pasarela de Pagos (Stripe/Wompi)</span>
                    <span className="text-[10px] text-slate-500 leading-normal block">Permite exponer las claves y la inicialización de pasarelas de pago configuradas en el panel administrativo.</span>
                  </div>
                  <button
                    onClick={() => {
                      const updated = websites.map(w => {
                        if (w.id === selectedWeb.id) {
                          const perms = w.permissions || { products: true, contacts: true };
                          return {
                            ...w,
                            permissions: { ...perms, payments: !perms.payments }
                          };
                        }
                        return w;
                      });
                      saveWebsites(updated);
                      toast({ title: 'Permiso Modificado', description: 'Integración de pasarela modificada.' });
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      selectedWeb.permissions?.payments ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        selectedWeb.permissions?.payments ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Company Profile Expose */}
                <div className="flex items-center justify-between py-3.5">
                  <div className="space-y-0.5 text-left max-w-[80%]">
                    <span className="text-xs font-bold text-slate-800 block">Exponer Perfil de la Empresa</span>
                    <span className="text-[10px] text-slate-500 leading-normal block">Permite consultar el logotipo, dirección, teléfono y nombre legal del negocio para mostrar en el frontend.</span>
                  </div>
                  <button
                    onClick={() => {
                      const updated = websites.map(w => {
                        if (w.id === selectedWeb.id) {
                          const perms = w.permissions || { products: true, contacts: true };
                          return {
                            ...w,
                            permissions: { ...perms, companyInfo: !perms.companyInfo }
                          };
                        }
                        return w;
                      });
                      saveWebsites(updated);
                      toast({ title: 'Permiso Modificado', description: 'Información de la empresa modificada.' });
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      (selectedWeb.permissions?.companyInfo !== false) ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        (selectedWeb.permissions?.companyInfo !== false) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Categories Expose */}
                <div className="flex items-center justify-between py-3.5">
                  <div className="space-y-0.5 text-left max-w-[80%]">
                    <span className="text-xs font-bold text-slate-800 block">Exponer Categorías del Catálogo</span>
                    <span className="text-[10px] text-slate-500 leading-normal block">Permite obtener la estructura de categorías y rubros para construir menús de navegación en tu sitio frontend.</span>
                  </div>
                  <button
                    onClick={() => {
                      const updated = websites.map(w => {
                        if (w.id === selectedWeb.id) {
                          const perms = w.permissions || { products: true, contacts: true };
                          return {
                            ...w,
                            permissions: { ...perms, categories: !perms.categories }
                          };
                        }
                        return w;
                      });
                      saveWebsites(updated);
                      toast({ title: 'Permiso Modificado', description: 'Exposición de categorías modificada.' });
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      (selectedWeb.permissions?.categories !== false) ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        (selectedWeb.permissions?.categories !== false) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Reviews Expose */}
                <div className="flex items-center justify-between py-3.5">
                  <div className="space-y-0.5 text-left max-w-[80%]">
                    <span className="text-xs font-bold text-slate-800 block">Exponer Reseñas y Comentarios</span>
                    <span className="text-[10px] text-slate-500 leading-normal block">Permite leer las opiniones y calificaciones dejadas por los clientes en tu tienda para mostrarlas en la landing.</span>
                  </div>
                  <button
                    onClick={() => {
                      const updated = websites.map(w => {
                        if (w.id === selectedWeb.id) {
                          const perms = w.permissions || { products: true, contacts: true };
                          return {
                            ...w,
                            permissions: { ...perms, reviews: !perms.reviews }
                          };
                        }
                        return w;
                      });
                      saveWebsites(updated);
                      toast({ title: 'Permiso Modificado', description: 'Exposición de reseñas modificada.' });
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      (selectedWeb.permissions?.reviews !== false) ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        (selectedWeb.permissions?.reviews !== false) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Discounts Expose */}
                <div className="flex items-center justify-between py-3.5">
                  <div className="space-y-0.5 text-left max-w-[80%]">
                    <span className="text-xs font-bold text-slate-800 block">Validar Descuentos y Cupones</span>
                    <span className="text-[10px] text-slate-500 leading-normal block">Permite consultar y validar cupones de descuento activos para aplicar rebajas de precio en el frontend.</span>
                  </div>
                  <button
                    onClick={() => {
                      const updated = websites.map(w => {
                        if (w.id === selectedWeb.id) {
                          const perms = w.permissions || { products: true, contacts: true };
                          return {
                            ...w,
                            permissions: { ...perms, discounts: !perms.discounts }
                          };
                        }
                        return w;
                      });
                      saveWebsites(updated);
                      toast({ title: 'Permiso Modificado', description: 'Permiso de cupones modificado.' });
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      selectedWeb.permissions?.discounts ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        selectedWeb.permissions?.discounts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Shipping Expose */}
                <div className="flex items-center justify-between py-3.5">
                  <div className="space-y-0.5 text-left max-w-[80%]">
                    <span className="text-xs font-bold text-slate-800 block">Exponer Métodos de Envío</span>
                    <span className="text-[10px] text-slate-500 leading-normal block">Permite consultar las tarifas de envío, transportadoras y zonas activas para calcular el envío al pagar.</span>
                  </div>
                  <button
                    onClick={() => {
                      const updated = websites.map(w => {
                        if (w.id === selectedWeb.id) {
                          const perms = w.permissions || { products: true, contacts: true };
                          return {
                            ...w,
                            permissions: { ...perms, shipping: !perms.shipping }
                          };
                        }
                        return w;
                      });
                      saveWebsites(updated);
                      toast({ title: 'Permiso Modificado', description: 'Permiso de métodos de envío modificado.' });
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      selectedWeb.permissions?.shipping ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        selectedWeb.permissions?.shipping ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Quick Integration Snippets */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Guía de Desarrollo</span>
                <span className="text-[9px] font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100/50">JavaScript</span>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">1. Obtener Productos</span>
                  <div className="relative font-mono text-[9.5px] bg-slate-50 p-3 rounded-lg overflow-x-auto text-left leading-relaxed text-slate-700 border border-slate-200/60">
                    <pre className="whitespace-pre-wrap break-all">
                      <span className="text-blue-600 font-bold">fetch</span>(<span className="text-emerald-600">"{window.location.origin}/api/v1/expose/${selectedWeb.id}/products"</span>, &#123;
                      <br />&nbsp;&nbsp;headers: &#123;
                      <br />&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-emerald-600">"Authorization"</span>: <span className="text-emerald-600">"Bearer ${selectedWeb.apiKey || 'os_pk_live_...'}"</span>
                      <br />&nbsp;&nbsp;&#125;
                      <br />&#125;)
                      <br />.<span className="text-blue-600 font-semibold">then</span>(res =&gt; res.json())
                      <br />.<span className="text-blue-600 font-semibold">then</span>(data =&gt; console.log(data));
                    </pre>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">2. Registrar Formulario</span>
                  <div className="relative font-mono text-[9.5px] bg-slate-50 p-3 rounded-lg overflow-x-auto text-left leading-relaxed text-slate-700 border border-slate-200/60">
                    <pre className="whitespace-pre-wrap break-all">
                      <span className="text-blue-600 font-bold">fetch</span>(<span className="text-emerald-600">"{window.location.origin}/api/v1/expose/${selectedWeb.id}/contacts"</span>, &#123;
                      <br />&nbsp;&nbsp;method: <span className="text-emerald-600">"POST"</span>,
                      <br />&nbsp;&nbsp;headers: &#123;
                      <br />&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-emerald-600">"Content-Type"</span>: <span className="text-emerald-600">"application/json"</span>,
                      <br />&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-emerald-600">"Authorization"</span>: <span className="text-emerald-600">"Bearer ${selectedWeb.apiKey || 'os_pk_live_...'}"</span>
                      <br />&nbsp;&nbsp;&#125;,
                      <br />&nbsp;&nbsp;body: JSON.stringify(&#123; name: <span className="text-emerald-600">"Cliente"</span>, email: <span className="text-emerald-600">"client@mail.com"</span> &#125;)
                      <br />&#125;)
                    </pre>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-700 block">3. Crear Venta / Pedido</span>
                  <div className="relative font-mono text-[9.5px] bg-slate-50 p-3 rounded-lg overflow-x-auto text-left leading-relaxed text-slate-700 border border-slate-200/60">
                    <pre className="whitespace-pre-wrap break-all">
                      <span className="text-blue-600 font-bold">fetch</span>(<span className="text-emerald-600">"{window.location.origin}/api/v1/expose/${selectedWeb.id}/orders"</span>, &#123;
                      <br />&nbsp;&nbsp;method: <span className="text-emerald-600">"POST"</span>,
                      <br />&nbsp;&nbsp;headers: &#123;
                      <br />&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-emerald-600">"Content-Type"</span>: <span className="text-emerald-600">"application/json"</span>,
                      <br />&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-emerald-600">"Authorization"</span>: <span className="text-emerald-600">"Bearer ${selectedWeb.apiKey || 'os_pk_live_...'}"</span>
                      <br />&nbsp;&nbsp;&#125;,
                      <br />&nbsp;&nbsp;body: JSON.stringify(&#123; items: [&#123; id: <span className="text-emerald-600">"prod-1"</span>, qty: 1 &#125;] &#125;)
                      <br />&#125;)
                    </pre>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 leading-relaxed">
                💡 Agrega productos en la pestaña de inventarios principal y se expondrán inmediatamente con tu clave.
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-12">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedWebsiteId(null)}
            className="h-8 text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1 px-2 -ml-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver</span>
          </Button>
          <div className="h-4 w-[1px] bg-slate-200"></div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <Globe2 className="h-4 w-4 text-blue-600" />
            {selectedWeb.name}
          </h2>
          <span className="text-[10px] font-medium bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full text-slate-600 uppercase">
            {selectedWeb.setupType === 'blank' ? 'Lienzo en Blanco' : 'Plantilla Importada'}
          </span>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5 self-stretch sm:self-auto justify-end">
          <Button 
            size="icon" 
            className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            onClick={() => {
              navigator.clipboard.writeText(`https://${selectedWeb.customDomain || 'merco.agency'}${activePage?.path || ''}`);
              toast({ title: 'Enlace Copiado', description: 'Enlace del sitio web copiado al portapapeles.' });
            }}
            title="Compartir"
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 border-slate-200 text-slate-600 hover:bg-slate-50 bg-white"
            onClick={() => window.open(`https://${selectedWeb.customDomain || 'merco.agency'}${activePage?.path || ''}`, '_blank')}
            title="Vista Previa"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 border-slate-200 text-slate-600 hover:bg-slate-50 bg-white"
            onClick={() => toast({ title: 'Información', description: `Sitio web configurado el ${selectedWeb.lastUpdated}` })}
            title="Información"
          >
            <Info className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Primary Builder Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 -mb-px">
          <button
            onClick={() => setActiveTab('pages')}
            className={`py-2 px-1 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 focus:outline-none ${
              activeTab === 'pages'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Páginas / Pasos
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-2 px-1 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 focus:outline-none ${
              activeTab === 'stats'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Estadísticas
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`py-2 px-1 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 focus:outline-none ${
              activeTab === 'sales'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Ventas
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 focus:outline-none ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Seguridad
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 focus:outline-none ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            Ajustes
          </button>
        </nav>
      </div>

      {/* Active Tab Panel Content */}
      <div className="pt-2">
        {/* --- TAB 1: PAGES / STEPS --- */}
        {activeTab === 'pages' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Pages Sidebar */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[400px]">
              <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="h-3 w-3 text-slate-400" />
                  Páginas del Sitio
                </span>
                <span className="text-[10px] font-semibold bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-600">
                  {pages.length}
                </span>
              </div>

              {/* Pages List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
                {pages.map((p, idx) => {
                  const isActive = idx === activePageIndex;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setActivePageIndex(idx)}
                      className={`group w-full text-left p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                        isActive 
                          ? 'bg-blue-50/60 border border-blue-100 text-blue-600 font-bold' 
                          : 'bg-white hover:bg-slate-50 border border-transparent text-slate-600 font-semibold'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 overflow-hidden">
                        <span className={`p-1.5 rounded-md ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200/60'}`}>
                          <FileText className="h-3.5 w-3.5" />
                        </span>
                        <div className="flex flex-col text-left truncate">
                          <span className="text-xs truncate">{p.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono font-medium truncate">{p.path}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClonePage(idx);
                          }}
                          title="Clonar página"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Page Button */}
              <div className="p-3 bg-slate-50/50 border-t border-slate-100">
                <Button
                  onClick={() => {
                    setNewPageName('');
                    setIsAddPageOpen(true);
                  }}
                  className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Agregar página</span>
                </Button>
              </div>
            </div>

            {/* Right Main Editor Details */}
            <div className="lg:col-span-3 space-y-4">
              {activePage ? (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5 text-left">
                  {/* Page Meta info */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-800">{activePage.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <span>URL del paso:</span>
                        <span className="text-blue-600 hover:underline cursor-pointer font-mono select-all flex items-center gap-1">
                          https://{selectedWeb.customDomain || `${selectedWeb.path.replace('/', '')}.merco.agency`}{activePage.path}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-slate-400 hover:text-slate-600 rounded"
                          onClick={() => {
                            navigator.clipboard.writeText(`https://${selectedWeb.customDomain || `${selectedWeb.path.replace('/', '')}.merco.agency`}${activePage.path}`);
                            toast({ title: 'Enlace Copiado', description: 'URL de página copiado.' });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Inner page tabs */}
                    <div className="bg-slate-100 border border-slate-200/60 p-0.5 rounded-lg flex space-x-1">
                      <button
                        onClick={() => setActivePageSubTab('overview')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors focus:outline-none ${
                          activePageSubTab === 'overview'
                            ? 'bg-white text-slate-800 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Vista General
                      </button>
                      <button
                        onClick={() => setActivePageSubTab('products')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors focus:outline-none ${
                          activePageSubTab === 'products'
                            ? 'bg-white text-slate-800 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Productos
                      </button>
                      <button
                        onClick={() => setActivePageSubTab('publishing')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors focus:outline-none ${
                          activePageSubTab === 'publishing'
                            ? 'bg-white text-slate-800 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Publicación
                      </button>
                    </div>
                  </div>

                  {/* Sub-tab: OVERVIEW */}
                  {activePageSubTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* CONTROL CARD */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col space-y-3 relative shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">Control</span>
                            <span className="text-xs text-slate-500 font-semibold">Tráfico: 100%</span>
                          </div>
                          
                          {/* Miniature Preview Render Map based on layout elements */}
                          <div className="bg-slate-50 border border-slate-100 rounded-lg h-36 flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-white flex flex-col p-2 space-y-1 opacity-90 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                              {(activePage.elements || []).map((el, i) => {
                                if (el.type === 'hero') {
                                  return (
                                    <div key={el.id || i} className="h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded flex flex-col justify-center px-1 text-[3.5px] text-white font-bold text-center leading-none shrink-0">
                                      <span>HERO BANNER</span>
                                    </div>
                                  );
                                }
                                if (el.type === 'tarjetas_productos') {
                                  return (
                                    <div key={el.id || i} className="grid grid-cols-3 gap-0.5 shrink-0">
                                      <div className="h-4 bg-slate-100 rounded flex items-center justify-center text-[2.5px] text-slate-400">Card</div>
                                      <div className="h-4 bg-slate-100 rounded flex items-center justify-center text-[2.5px] text-slate-400">Card</div>
                                      <div className="h-4 bg-slate-100 rounded flex items-center justify-center text-[2.5px] text-slate-400">Card</div>
                                    </div>
                                  );
                                }
                                if (el.type === 'detalle_producto') {
                                  return (
                                    <div key={el.id || i} className="h-7 border border-slate-100 rounded grid grid-cols-2 gap-0.5 bg-slate-50 p-0.5 shrink-0">
                                      <div className="bg-slate-200 rounded-xs h-full"></div>
                                      <div className="flex flex-col justify-center text-[2px] text-slate-400 pl-0.5 leading-none space-y-0.5">
                                        <div className="font-bold text-slate-700">Detalle Prod</div>
                                        <div>$12,490</div>
                                      </div>
                                    </div>
                                  );
                                }
                                if (el.type === 'boton_compra') {
                                  return <div key={el.id || i} className="h-4 bg-blue-600 text-white text-[3px] font-bold rounded flex items-center justify-center shrink-0">Compra Directa</div>;
                                }
                                if (el.type === 'carrusel_productos') {
                                  return <div key={el.id || i} className="h-4 border border-slate-100 rounded flex items-center justify-center text-[3px] text-slate-400 font-bold bg-slate-50 shrink-0">CARRUSEL</div>;
                                }
                                if (el.type === 'titulo') {
                                  return <div key={el.id || i} className="h-3 bg-slate-50 rounded flex items-center justify-center text-[3px] text-slate-700 font-extrabold shrink-0">{el.content.title}</div>;
                                }
                                if (el.type === 'parrafo') {
                                  return <div key={el.id || i} className="h-3 bg-slate-50 rounded flex items-center justify-center text-[2.5px] text-slate-400 shrink-0">Texto párrafo...</div>;
                                }
                                if (el.type === 'imagen') {
                                  return <div key={el.id || i} className="h-5 bg-slate-100 border rounded flex items-center justify-center text-[3px] text-slate-400 shrink-0">Banner Imagen</div>;
                                }
                                if (el.type === 'boton') {
                                  return <div key={el.id || i} className="h-3.5 bg-blue-500 text-white rounded flex items-center justify-center text-[3px] font-bold shrink-0">{el.content.title}</div>;
                                }
                                if (el.type === 'features') {
                                  return <div key={el.id || i} className="h-4 bg-slate-50 border border-slate-100 rounded flex items-center justify-center text-[3px] text-slate-400 font-bold uppercase tracking-wider shrink-0">BENEFICIOS</div>;
                                }
                                if (el.type === 'testimonials') {
                                  return <div key={el.id || i} className="h-4 bg-slate-50 border border-slate-100 rounded p-0.5 flex flex-col justify-center text-[2.5px] text-slate-400 italic shrink-0">"Opinión..."</div>;
                                }
                                if (el.type === 'cta') {
                                  return <div key={el.id || i} className="h-5 bg-slate-950 rounded flex flex-col items-center justify-center text-white text-[3px] leading-none shrink-0">CTA BANNER</div>;
                                }
                                if (el.type === 'contacto_form') {
                                  return <div key={el.id || i} className="h-6 bg-slate-50 border rounded p-0.5 flex flex-col justify-center text-[2.5px] text-slate-400 shrink-0">Contacto Form</div>;
                                }
                                if (el.type === 'sitemap') {
                                  return <div key={el.id || i} className="h-4 bg-slate-100 rounded flex items-center justify-center text-[2.5px] text-slate-400 shrink-0">SITEMAP MAP</div>;
                                }
                                if (el.type === 'footer') {
                                  return <div key={el.id || i} className="h-4 bg-slate-900 rounded flex items-center justify-center text-[2.5px] text-white shrink-0">© {el.content.company}</div>;
                                }
                                return null;
                              })}
                            </div>
                            
                            <div className="z-10 bg-white/85 backdrop-blur-sm rounded-full p-2 text-blue-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                                 onClick={() => window.open(`https://${selectedWeb.customDomain || 'merco.agency'}${activePage.path}`, '_blank')}>
                              <ExternalLink className="h-4 w-4" />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex gap-1.5 w-full">
                              <Button 
                                onClick={() => {
                                  setEditingPageId(activePage.id);
                                  setEditorElements(activePage.elements || []);
                                  setSelectedElementId(activePage.elements?.[0]?.id || null);
                                }}
                                className="h-8 flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-1"
                              >
                                <span>Editar Página</span>
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                              <Button 
                                onClick={() => {
                                  setEditingPageId(activePage.id);
                                  setEditorElements(activePage.elements || []);
                                  setSelectedElementId(activePage.elements?.[0]?.id || null);
                                }}
                                variant="outline" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-50 bg-white"
                              >
                                <Settings className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* VARIATION CARD */}
                        <div 
                          onClick={() => toast({ title: 'Prueba de Variación', description: 'Nueva variante creada para prueba de diseño.' })}
                          className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center min-h-[240px] text-center hover:border-blue-400 hover:bg-blue-50/10 cursor-pointer transition-all group"
                        >
                          <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <Plus className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-bold text-slate-700 mt-3 group-hover:text-blue-600 transition-colors">Crear variante</span>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-[170px]">
                            Prueba diferentes títulos, llamados a la acción o colores para optimizar las visitas y ventas.
                          </p>
                        </div>
                      </div>

                      {/* Split Test Settings Info banner */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-left">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Play className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Iniciar Test Split A/B</h4>
                            <p className="text-[10px] text-slate-500">Distribuye automáticamente tus visitas para medir cuál diseño rinde mejor.</p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => toast({ title: 'Test A/B Activado', description: 'Distribuyendo el tráfico 50/50 entre variantes.' })}
                          className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800 font-semibold shrink-0"
                        >
                          Iniciar Test
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Sub-tab: PRODUCTS */}
                  {activePageSubTab === 'products' && (
                    <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center space-y-3 bg-slate-50/30">
                      <div className="h-10 w-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">Productos Vinculados</h4>
                      <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
                        Asocia productos específicos a este paso para que los visitantes realicen pagos instantáneos con un solo clic.
                      </p>
                      <Button 
                        onClick={() => toast({ title: 'Lista de Productos', description: 'Abriendo selector de productos de ferretería...' })}
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      >
                        Vincular Producto
                      </Button>
                    </div>
                  )}

                  {/* Sub-tab: PUBLISHING */}
                  {activePageSubTab === 'publishing' && (
                    <div className="space-y-4">
                      <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-slate-800">Estado de Publicación</h4>
                        <p className="text-[10px] text-slate-500">Configura la visibilidad de esta página en internet.</p>
                        <div className="flex gap-2">
                          <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                            Publicado • Online
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer Actions (Delete / Clone) */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-4">
                    <Button
                      variant="ghost"
                      onClick={() => handleDeletePage(activePageIndex)}
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold flex items-center gap-1.5 px-3"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Eliminar página</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleClonePage(activePageIndex)}
                      className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-1.5 px-3"
                    >
                      <Copy className="h-4 w-4 text-slate-400" />
                      <span>Clonar página</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white">
                  No hay páginas creadas. Crea una en la barra izquierda.
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2: STATISTICS --- */}
        {activeTab === 'stats' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Métricas de Conversión</h3>
                <p className="text-[10px] text-slate-500">Reporte en tiempo real de visitas y porcentajes de conversión del sitio web.</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => toast({ title: 'Actualizando', description: 'Consultando métricas en tiempo real...' })}
                className="h-7 text-[10px] font-semibold flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3 animate-spin" />
                Actualizar
              </Button>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Visitas Únicas</span>
                <span className="text-2xl font-black text-slate-800">1,420</span>
                <span className="text-[9px] text-emerald-600 font-bold block">+12% vs. la semana anterior</span>
              </div>
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tasa de Conversión</span>
                <span className="text-2xl font-black text-slate-800">3.85%</span>
                <span className="text-[9px] text-slate-500 font-bold block">Promedio de la industria: 2.1%</span>
              </div>
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ventas Concretadas</span>
                <span className="text-2xl font-black text-slate-800">$1,890.00</span>
                <span className="text-[9px] text-blue-600 font-bold block">Vía Mercado Pago y Stripe</span>
              </div>
            </div>

            {/* Mock Chart Area */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/20">
              <span className="text-xs font-bold text-slate-700 block mb-4">Tendencia de Tráfico Diario</span>
              <div className="h-44 w-full flex items-end justify-between relative px-2 pt-4 border-b border-l border-slate-200">
                <div className="h-28 bg-blue-100 hover:bg-blue-200 transition-colors w-7 rounded-t flex items-center justify-center relative group">
                  <span className="absolute -top-6 text-[8px] bg-slate-900 text-white font-bold px-1 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity">120</span>
                </div>
                <div className="h-32 bg-blue-100 hover:bg-blue-200 transition-colors w-7 rounded-t flex items-center justify-center relative group">
                  <span className="absolute -top-6 text-[8px] bg-slate-900 text-white font-bold px-1 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity">150</span>
                </div>
                <div className="h-20 bg-blue-100 hover:bg-blue-200 transition-colors w-7 rounded-t flex items-center justify-center relative group">
                  <span className="absolute -top-6 text-[8px] bg-slate-900 text-white font-bold px-1 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity">90</span>
                </div>
                <div className="h-36 bg-blue-600 hover:bg-blue-700 transition-colors w-7 rounded-t flex items-center justify-center relative group">
                  <span className="absolute -top-6 text-[8px] bg-slate-900 text-white font-bold px-1 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity">210</span>
                </div>
                <div className="h-28 bg-blue-100 hover:bg-blue-200 transition-colors w-7 rounded-t flex items-center justify-center relative group">
                  <span className="absolute -top-6 text-[8px] bg-slate-900 text-white font-bold px-1 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity">130</span>
                </div>
                <div className="h-40 bg-blue-600 hover:bg-blue-700 transition-colors w-7 rounded-t flex items-center justify-center relative group">
                  <span className="absolute -top-6 text-[8px] bg-slate-900 text-white font-bold px-1 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity">260</span>
                </div>
                <div className="h-32 bg-blue-600 hover:bg-blue-700 transition-colors w-7 rounded-t flex items-center justify-center relative group">
                  <span className="absolute -top-6 text-[8px] bg-slate-900 text-white font-bold px-1 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity">180</span>
                </div>
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 mt-2 font-mono">
                <span>Lun</span>
                <span>Mar</span>
                <span>Mié</span>
                <span>Jue</span>
                <span>Vie</span>
                <span>Sáb</span>
                <span>Dom</span>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 3: SALES --- */}
        {activeTab === 'sales' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Transacciones del Sitio</h3>
              <p className="text-[10px] text-slate-500 font-medium">Lista de órdenes cobradas en este sitio web.</p>
            </div>
            
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="px-4 py-2.5">Cliente</th>
                    <th className="px-4 py-2.5">Correo</th>
                    <th className="px-4 py-2.5">Monto</th>
                    <th className="px-4 py-2.5">Plataforma</th>
                    <th className="px-4 py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                  <tr>
                    <td className="px-4 py-3 font-bold">Mateo Rodríguez</td>
                    <td className="px-4 py-3">mateo@gmail.com</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">$450.00</td>
                    <td className="px-4 py-3">Mercado Pago</td>
                    <td className="px-4 py-3 text-emerald-600 font-bold">Aprobado</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">Sofia Beltrán</td>
                    <td className="px-4 py-3">sofia.b@outlook.com</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">$1,240.00</td>
                    <td className="px-4 py-3">Stripe</td>
                    <td className="px-4 py-3 text-emerald-600 font-bold">Aprobado</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">Lucas Gómez</td>
                    <td className="px-4 py-3">lucas.gomez@hotmail.com</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">$200.00</td>
                    <td className="px-4 py-3">Transferencia</td>
                    <td className="px-4 py-3 text-amber-600 font-bold">Pendiente</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 4: SECURITY --- */}
        {activeTab === 'security' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Seguridad de Enlace</h3>
              <p className="text-[10px] text-slate-500">Configuración de encriptación SSL y protección web.</p>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              <div className="p-4 flex items-center justify-between gap-4 bg-slate-50/30">
                <div className="space-y-0.5 text-left">
                  <h4 className="text-xs font-bold text-slate-800">Certificado SSL Seguro</h4>
                  <p className="text-[10px] text-slate-400">Protege con HTTPS todas las conexiones entre tus usuarios y tu tienda.</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase">
                  Activo • Certificado SSL
                </span>
              </div>

              <div className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5 text-left">
                  <h4 className="text-xs font-bold text-slate-800">Mitigación DDoS Activa</h4>
                  <p className="text-[10px] text-slate-400">Protección perimetral inteligente para neutralizar ataques DDoS en tiempo real.</p>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded uppercase">
                  Protegido
                </span>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 5: SETTINGS --- */}
        {activeTab === 'settings' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Ajustes del Sitio</h3>
              <p className="text-[10px] text-slate-500">Administra las configuraciones de nombres, carpetas y dominio del sitio web.</p>
            </div>

            <div className="space-y-4 max-w-md">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Nombre del Sitio Web</label>
                <Input
                  value={selectedWeb.name}
                  onChange={(e) => {
                    const updatedName = e.target.value;
                    const updated = websites.map(w => {
                      if (w.id === selectedWeb.id) {
                        return { ...w, name: updatedName, path: generatePath(updatedName) };
                      }
                      return w;
                    });
                    saveWebsites(updated);
                  }}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ruta Base de Servidor</label>
                <Input
                  disabled
                  value={selectedWeb.path}
                  className="h-9 text-xs font-mono bg-slate-50/80 text-slate-500"
                />
                <span className="text-[9px] text-slate-400">La ruta base se genera automáticamente del nombre del sitio web.</span>
              </div>

              <div className="space-y-1 text-left pt-2 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Dominio Personalizado</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ej. mitiendadeferreteria.com"
                    defaultValue={selectedWeb.customDomain || ''}
                    id={`domain-input-${selectedWeb.id}`}
                    className="h-9 text-xs font-mono"
                  />
                  <Button 
                    onClick={() => {
                      const input = document.getElementById(`domain-input-${selectedWeb.id}`) as HTMLInputElement;
                      if (input) handleSaveDomain(selectedWeb.id, input.value);
                    }}
                    className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                  >
                    Vincular
                  </Button>
                </div>
                <span className="text-[9px] text-slate-400">Apunta los registros CNAME o A de tu dominio a nuestro host `dns.merco.agency`.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Page Modal Dialog */}
      <Dialog 
        open={isAddPageOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddPageOpen(false);
            setNewPageName('');
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-800">Agregar Nueva Página</DialogTitle>
            <DialogDescription className="text-xs">
              Ingresa el nombre de la página para agregarla a tu sitio web.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPage} className="space-y-4 py-2">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 block uppercase">Nombre de la Página</label>
                <Input
                  placeholder="Ej. Quienes Somos"
                  value={newPageName}
                  onChange={e => setNewPageName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddPageOpen(false);
                setNewPageName('');
              }}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddPage}
              disabled={!newPageName.trim()}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SitiosManager;
