// ...existing code...

import React, { useEffect, useState } from "react";
import { db } from "@/firebase";
import { useCategories } from "@/hooks/use-categories";
import { TopPromoBar } from "@/components/layout/TopPromoBar";
import { AdvancedHeader } from "@/components/layout/AdvancedHeader";

const AboutUs = () => {
  const { categories, mainCategories, subcategoriesByParent, thirdLevelBySubcategory } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [promoVisible, setPromoVisible] = useState(true);
  const [customInfo, setCustomInfo] = useState(null);
  const [infoEnabled, setInfoEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      const { data, error } = await db.from('info_sections').select('*').eq('id', 'about').maybeSingle();
      if (data) {
        setCustomInfo(data.content || null);
        setInfoEnabled(data.enabled ?? false);
      }
      setLoading(false);
    };
    fetchInfo();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {promoVisible && <TopPromoBar setPromoVisible={setPromoVisible} />}
      <AdvancedHeader
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        promoVisible={promoVisible}
        mainCategories={mainCategories}
        subcategoriesByParent={subcategoriesByParent}
        thirdLevelBySubcategory={thirdLevelBySubcategory}
      />
      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative w-full pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"></div>
          <div className="absolute inset-0 opacity-5 bg-[url('/placeholder.svg')]"></div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6">
            <nav className="w-full text-sm text-gray-600 mb-8 flex items-center gap-2">
              <a href="/" className="font-medium text-gray-700 hover:text-blue-600 transition-colors">Inicio</a>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">Sobre Nosotros</span>
            </nav>
            <h1 className="text-5xl md:text-7xl font-serif font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent mb-6 tracking-tight">
              Sobre Nosotros
            </h1>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-blue-600 font-medium">Cargando información...</p>
              </div>
            ) : infoEnabled && customInfo ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-gray-100">
                <div className="text-lg md:text-xl text-gray-700 font-normal leading-relaxed w-full max-w-none whitespace-pre-line">
                  {customInfo}
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl md:text-3xl font-serif font-semibold text-gray-900 mb-8 w-full">¿Quiénes Somos?</h2>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 md:p-8 shadow-md border border-blue-100">
                    <p className="text-lg md:text-xl text-gray-700 font-normal leading-relaxed">
                      Somos una tienda digital pensada para que encuentres ese regalo ideal que estabas buscando, al mejor precio del mercado.
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 md:p-8 shadow-md border border-purple-100">
                    <p className="text-lg md:text-xl text-gray-700 font-normal leading-relaxed">
                      Ofrecemos una amplia variedad de productos: desde tecnología de punta, prendas de vestir a la moda, artículos para el hogar, suplementos deportivos, productos de belleza, hasta artículos únicos y originales.
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-6 md:p-8 shadow-md border border-gray-200 mb-8">
                  <p className="text-lg md:text-xl text-gray-700 font-normal leading-relaxed mb-6">
                    Nuestra misión es clara: que puedas comprar de forma rápida, segura y con la confianza de que estás haciendo una buena elección.
                  </p>
                  <p className="text-lg md:text-xl text-gray-700 font-normal leading-relaxed">
                    ✨ Porque sabemos que regalar es una forma de decir mucho sin palabras, trabajamos día a día para que en nuestra tienda siempre encuentres algo especial.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-slate-900 to-gray-800 rounded-2xl p-8 md:p-12 text-white shadow-2xl mb-10">
                  <p className="text-lg md:text-xl font-bold leading-relaxed text-center">
                    "Encontrá tu regalo ideal al mejor precio" no es solo nuestro eslogan, es un compromiso.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 md:p-10 shadow-xl border border-green-200">
                  <h3 className="text-xl font-bold mb-4 text-gray-900">Nuestra Ubicación</h3>
                  <p className="mb-6 text-lg text-gray-700">📍 Olavarría 610 (esquina San Luis), Salta, Argentina</p>
                  <a
                    href="https://maps.app.goo.gl/gonu6cj9cJnDfJBz5?g_st=aw"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold">
                    <span>📍 Cómo llegar</span>
                  </a>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <footer className="bg-muted/50 py-12 mt-16">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 gradient-orange rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">O</span>
                </div>
                <span className="text-lg font-bold gradient-text-orange">OmniShop</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Tu plataforma de e-commerce multirrubro con la mejor selección y experiencia de compra.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Productos</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Electrónicos</li>
                <li>Audio</li>
                <li>Gaming</li>
                <li>Fotografía</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Centro de Ayuda</li>
                <li>Garantías</li>
                <li>Devoluciones</li>
                <li>Contacto</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contacto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>📍 Olavarría 610 (esquina San Luis)</li>
                <li>
                  <a href="https://maps.app.goo.gl/gonu6cj9cJnDfJBz5?g_st=aw"
                    className="text-blue-600 hover:underline">
                    Ver en el mapa
                  </a>
                </li>
                <li>Asesor 1: 11 2671-1308</li>
                <li>Asesor 2: 387 222-8571</li>
                <li>Instagram: <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Instagram</a></li>
                <li>Facebook: <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Facebook</a></li>
                <li>TikTok: <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">TikTok</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>
              &copy; {new Date().getFullYear()} OmniShop. Todos los derechos reservados.
              <br />
              <span className="inline-block mt-1">
                Desarrollado por{' '}
                <a 
                  href="https://websysrl.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-lg font-bold text-green-800 hover:text-green-900 transition-colors"
                >
                  websy
                </a>
              </span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutUs;

