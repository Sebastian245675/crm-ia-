import React, { useState, useEffect } from "react";
import { StoreStructuredData } from "@/components/seo/StructuredData";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { CheckCircle, ShoppingBag, Play, Image as ImageIcon, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { db } from "@/firebase";

// Import custom storefront modular components
import { HeroTienda } from "@/components/componentes-tienda/HeroTienda";
import { ProductGrid } from "@/components/componentes-tienda/ProductGrid";
import { ProductDetails } from "@/components/componentes-tienda/ProductDetails";
import { PurchaseButton } from "@/components/componentes-tienda/PurchaseButton";
import { ProductCarousel } from "@/components/componentes-tienda/ProductCarousel";
import { FeatureBanner } from "@/components/componentes-tienda/FeatureBanner";
import { StoreReviews } from "@/components/componentes-tienda/StoreReviews";
import { ContactForm } from "@/components/componentes-tienda/ContactForm";
import { StoreFooter } from "@/components/componentes-tienda/StoreFooter";
import { CustomCodeTienda } from "@/components/componentes-tienda/CustomCodeTienda";

const FloatingActionButtons = React.lazy(() => import("@/components/layout/FloatingActionButtons").then(m => ({ default: m.FloatingActionButtons })));

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
    bgType?: 'color' | 'gradient' | 'image';
    bgColor?: string;
    htmlCode?: string;
    cssCode?: string;
    jsCode?: string;
    caption?: string;
    buttonLink?: string;
    formTitle?: string;
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
}

const AdvancedIndex = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const categoryParam = params.get("category");

  // Dynamic builder elements state
  const [elements, setElements] = useState<PageElement[]>([]);
  const [siteName, setSiteName] = useState<string>("OmniShop");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('admin_websites');
    if (saved) {
      const websites: WebsiteRow[] = JSON.parse(saved);
      if (websites.length > 0) {
        // Find the first website that has setupType configured
        const activeSite = websites.find(w => w.setupType !== undefined);
        if (activeSite) {
          setSiteName(activeSite.name);
          const homePage = activeSite.pages?.find(p => p.path === '/' || p.name.toLowerCase().includes('inicio'));
          if (homePage && homePage.elements && homePage.elements.length > 0) {
            setElements(homePage.elements);
          }
        }
      }
    }

    const fetchProducts = async () => {
      try {
        const { data, error } = await db.from('products').select('*');
        if (!error && data) {
          const mapped = data.map((item: any) => ({
            ...item,
            id: String(item.id || item._id),
            price: Number(item.price || 0),
            name: item.name || 'Producto sin nombre',
            description: item.description || '',
            imageUrl: item.image || item.image_url || item.imageUrl || ''
          }));
          setProducts(mapped);
        }
      } catch (err) {
        console.error("Error fetching products for frontend:", err);
      }
    };
    fetchProducts();

    setIsLoading(false);
  }, []);

  if (categoryParam) {
    return <Navigate to={`/categoria/${encodeURIComponent(categoryParam)}`} replace />;
  }

  // Show a blank screen while loading to prevent flashes of unstyled content
  if (isLoading) {
    return <div className="min-h-screen bg-slate-900"></div>;
  }


  // Renders the section based on type
  const renderDynamicElement = (el: PageElement) => {
    switch (el.type) {
      case 'hero':
        return (
          <HeroTienda 
            key={el.id}
            title={el.content.title}
            subtitle={el.content.subtitle}
            buttonText={el.content.buttonText}
            bgGradient={el.content.bgGradient}
            bgImageUrl={el.content.bgImageUrl}
            bgType={el.content.bgType}
            bgColor={el.content.bgColor}
          />
        );

      case 'custom_code':
        return (
          <CustomCodeTienda 
            key={el.id}
            htmlCode={el.content.htmlCode}
            cssCode={el.content.cssCode}
            jsCode={el.content.jsCode}
            elementId={el.id}
          />
        );

      case 'products':
      case 'tarjetas_productos':
        return (
          <ProductGrid 
            key={el.id}
            title={el.content.title}
            products={products}
          />
        );

      case 'detalle_producto':
        return (
          <ProductDetails 
            key={el.id}
            title={el.content.title}
            subtitle={el.content.subtitle}
            price={el.content.price}
            imageUrl={el.content.imageUrl}
            buttonText={el.content.buttonText}
          />
        );

      case 'boton_compra':
        return (
          <PurchaseButton 
            key={el.id}
            title={el.content.title}
            price={el.content.price}
            align={el.content.align}
          />
        );

      case 'carrusel_productos':
        return (
          <ProductCarousel 
            key={el.id}
            title={el.content.title}
            products={products}
          />
        );

      case 'titulo': {
        const alignClass = el.content.align === 'left' ? 'text-left' : el.content.align === 'right' ? 'text-right' : 'text-center';
        const sizeClass = el.content.size === 'lg' ? 'text-4xl md:text-5xl font-black' : el.content.size === 'sm' ? 'text-lg md:text-xl font-bold' : 'text-2xl md:text-3xl font-extrabold';
        return (
          <section key={el.id} className={`w-full py-8 px-6 bg-white ${alignClass}`}>
            <div className="max-w-4xl mx-auto">
              <h2 className={`text-slate-900 tracking-tight leading-tight ${sizeClass}`}>{el.content.title || 'Título Principal'}</h2>
            </div>
          </section>
        );
      }

      case 'parrafo': {
        const alignClass = el.content.align === 'left' ? 'text-left' : el.content.align === 'right' ? 'text-right' : 'text-center';
        const sizeClass = el.content.size === 'lg' ? 'text-base md:text-lg' : el.content.size === 'sm' ? 'text-[11px] md:text-xs' : 'text-xs md:text-sm';
        return (
          <section key={el.id} className={`w-full py-6 px-6 bg-white ${alignClass} leading-relaxed`}>
            <div className="max-w-4xl mx-auto">
              <p className={`text-slate-600 ${sizeClass}`}>{el.content.title || 'Escribe aquí tu texto descriptivo.'}</p>
            </div>
          </section>
        );
      }

      case 'imagen':
        return (
          <section key={el.id} className="w-full py-8 px-6 bg-white text-center">
            <div className="max-w-4xl mx-auto space-y-3">
              <div className="bg-slate-100 border border-slate-200 rounded-2xl min-h-[200px] flex items-center justify-center text-slate-400 overflow-hidden">
                {el.content.imageUrl ? (
                  <img src={el.content.imageUrl} alt={el.content.title} className="w-full max-h-[400px] object-cover" />
                ) : (
                  <div className="p-8 flex flex-col items-center">
                    <ImageIcon className="h-12 w-12 text-slate-300" />
                    <span className="text-xs text-slate-400 mt-2">{el.content.title || 'Banner Promocional'}</span>
                  </div>
                )}
              </div>
              {el.content.caption && (
                <p className="text-xs text-slate-500 italic">{el.content.caption}</p>
              )}
            </div>
          </section>
        );

      case 'boton': {
        const alignClass = el.content.align === 'left' ? 'justify-start' : el.content.align === 'right' ? 'justify-end' : 'justify-center';
        return (
          <section key={el.id} className={`w-full py-4 px-6 bg-white flex ${alignClass}`}>
            <a 
              href={el.content.buttonLink || '#'} 
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow-sm transition-all"
            >
              {el.content.title || 'Comprar Ahora'}
            </a>
          </section>
        );
      }

      case 'features':
        return (
          <FeatureBanner 
            key={el.id}
            title={el.content.title}
            f1={el.content.f1}
            f2={el.content.f2}
            f3={el.content.f3}
          />
        );

      case 'testimonials':
        return (
          <StoreReviews 
            key={el.id}
            title={el.content.title}
            clientName={el.content.clientName}
            reviewText={el.content.reviewText}
          />
        );

      case 'cta':
        return (
          <section key={el.id} className={`w-full py-16 px-6 md:px-12 text-center bg-gradient-to-r ${el.content.bgGradient || 'from-slate-900 to-slate-800 text-white'} flex flex-col items-center justify-center`}>
            <h2 className="text-2xl font-black tracking-tight">{el.content.title}</h2>
            <p className="text-xs opacity-80 mt-2 max-w-md leading-relaxed">{el.content.subtitle}</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2 w-full max-w-md justify-center">
              <Input placeholder="Tu correo electrónico" className="h-9 text-xs bg-white text-slate-800" />
              <button className="h-9 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md shrink-0 transition-all cursor-pointer">
                {el.content.buttonText || 'Enviar'}
              </button>
            </div>
          </section>
        );

      case 'contacto_form':
        return (
          <ContactForm 
            key={el.id}
            title={el.content.title}
            buttonText={el.content.buttonText}
            formId={el.content.formId}
          />
        );

      case 'sitemap':
        return (
          <section key={el.id} className="w-full py-12 px-6 md:px-12 bg-slate-100 border-t border-b border-slate-200/50 text-left">
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-xs text-slate-500">
              <div className="space-y-2">
                <span className="font-bold text-slate-700 text-sm uppercase tracking-wider block">{el.content.title || 'OmniShop'}</span>
                <span className="block hover:text-slate-800 cursor-pointer">Catálogo completo</span>
                <span className="block hover:text-slate-800 cursor-pointer">Nuevos Ingresos</span>
              </div>
              <div className="space-y-2">
                <span className="font-bold text-slate-700 text-sm uppercase tracking-wider block">Soporte</span>
                <span className="block hover:text-slate-800 cursor-pointer">Preguntas Frecuentes</span>
                <span className="block hover:text-slate-800 cursor-pointer">Contacto Técnico</span>
              </div>
              <div className="space-y-2">
                <span className="font-bold text-slate-700 text-sm uppercase tracking-wider block">Legal</span>
                <span className="block hover:text-slate-800 cursor-pointer">Políticas de Privacidad</span>
                <span className="block hover:text-slate-800 cursor-pointer">Condiciones de Uso</span>
              </div>
            </div>
          </section>
        );

      case 'footer':
        return (
          <StoreFooter 
            key={el.id}
            company={el.content.company}
          />
        );

      default:
        return null;
    }
  };

  // 404 SCREEN IF NOT CONFIGURED (matches the request: white bg, minimal, professional)
  if (elements.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-6 text-slate-800 text-center font-sans">
        <div className="bg-white border border-slate-200 p-8 md:p-10 rounded-2xl max-w-md w-full shadow-sm space-y-6">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-slate-100 border border-slate-200/85 rounded-xl flex items-center justify-center mx-auto text-slate-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Error 404</span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Tienda sin configurar</h1>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                El administrador aún no ha diseñado las páginas principales para este sitio web.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate("/admin")}
              className="w-full h-9 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Ir al Administrador</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 overflow-x-hidden font-sans">
      <StoreStructuredData
        name={siteName}
        description={`Bienvenido a ${siteName}. Tu tienda online personalizada.`}
      />
      <h1 className="sr-only">{siteName} - Tu Tienda Online</h1>

      <React.Suspense fallback={null}>
        <FloatingActionButtons />
      </React.Suspense>

      <main className="relative z-10 w-full flex flex-col">
        {elements.map((el) => renderDynamicElement(el))}
      </main>
    </div>
  );
};

export default AdvancedIndex;
