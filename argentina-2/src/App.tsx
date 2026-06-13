import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { Suspense, lazy, useEffect } from "react";
import { CacheProvider } from "@/contexts/CacheContext";
import { SimulationNotice } from "@/components/ui/SimulationNotice";
import { WebsiteVisitTracker } from "@/components/analytics/WebsiteVisitTracker";

// Lazy loading de las páginas para mejorar el rendimiento
const AdvancedIndex = lazy(() => import("./pages/AdvancedIndex"));
const AdminPanel = lazy(() => import("./pages/AdminPanel").then(module => ({ default: module.AdminPanel })));
const NotFound = lazy(() => import("./pages/NotFound"));
const UserProfile = lazy(() => import("@/components/user/UserProfile").then(module => ({ default: module.UserProfile })));
const ProductDetailPage = lazy(() => import("./pages/ProductDetail"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Retiros = lazy(() => import("./pages/Retiros"));
const SharedEmployeeManager = lazy(() => import("./pages/SharedEmployeeManager"));
const ImageDownloaderPage = lazy(() => import("./pages/ImageDownloaderPage"));
const ImageUrlUpdaterPage = lazy(() => import("./pages/ImageUrlUpdaterPage"));
const AdminImageOrientation = lazy(() => import("./pages/AdminImageOrientation"));
const Testimonios = lazy(() => import("./pages/Testimonios"));
const Envios = lazy(() => import("./pages/Envios"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const CategoryViewPage = lazy(() => import("./pages/CategoryViewPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const CartPage = lazy(() => import("./pages/CartPage").then(m => ({ default: m.CartPage })));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess").then(m => ({ default: m.OrderSuccess })));
const SuperAdminDashboard = lazy(() => import("./pages/superadmin/Dashboard").then(m => ({ default: m.SuperAdminDashboard })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutos — no refetcha si los datos son recientes
      gcTime: 10 * 60 * 1000,        // 10 minutos en cache después de desmontar
      retry: 1,                       // Solo 1 reintento en errores
      refetchOnWindowFocus: false,    // No refetcha al volver al tab
    },
  },
});

const App = () => {
  useEffect(() => {
    // Prevenir traducción automática - soluciona problemas de pantalla blanca
    const preventTranslation = () => {
      // Meta tag para Google Translate
      const metaTranslate = document.querySelector('meta[name="google"]') as HTMLMetaElement;
      if (!metaTranslate) {
        const meta = document.createElement('meta');
        meta.name = 'google';
        meta.content = 'notranslate';
        document.head.appendChild(meta);
      }

      // Añadir clases notranslate a elementos críticos
      document.documentElement.classList.add('notranslate');
      document.body.classList.add('notranslate');

      // Añadir estilos para prevenir problemas
      const styleEl = document.getElementById('notranslate-styles');
      if (!styleEl) {
        const style = document.createElement('style');
        style.id = 'notranslate-styles';
        style.textContent = `
          .notranslate {
            translate: no !important;
          }
          [translate="no"] {
            translate: no !important;
          }
        `;
        document.head.appendChild(style);
      }
    };

    preventTranslation();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Agregamos CacheProvider para mejorar el rendimiento */}
      <CacheProvider config={{ maxAge: 24 * 60 * 60 * 1000 }}> {/* 24 horas */}
        <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <SimulationNotice />
              <BrowserRouter>
                <WebsiteVisitTracker />
                <Suspense fallback={<div className="min-h-screen bg-white"></div>}>
                  <Routes>
                    <Route path="/" element={<AdvancedIndex />} />
                    <Route path="/categoria/:categorySlug" element={<CategoryViewPage />} />
                    <Route path="/auth" element={<Navigate to="/login" replace />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/order-success" element={<OrderSuccess />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/superadmin" element={<SuperAdminDashboard />} />
                    <Route path="/perfil" element={<UserProfile />} />
                    <Route path="/producto/:slug" element={<ProductDetailPage />} />
                    <Route path="/sobre-nosotros" element={<AboutUs />} />
                    <Route path="/envios" element={<Envios />} />
                    <Route path="/testimonios" element={<Testimonios />} />
                    <Route path="/retiros" element={<Retiros />} />
                    <Route path="/preguntas-frecuentes" element={<FAQPage />} />
                    <Route path="/shared/employees" element={<SharedEmployeeManager />} />
                    <Route path="/admin/image-downloader" element={<ImageDownloaderPage />} />
                    <Route path="/admin/update-image-urls" element={<ImageUrlUpdaterPage />} />
                    <Route path="/admin/rotate-image" element={<AdminImageOrientation />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </CacheProvider>
    </QueryClientProvider>
  );
};

export default App;
