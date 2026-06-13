import React, { useEffect, useState } from "react";
import { TopPromoBar } from "@/components/layout/TopPromoBar";
import { AdvancedHeader } from "@/components/layout/AdvancedHeader";
import { useCategories } from "@/hooks/use-categories";
import { db } from '@/firebase';
import { MapPin, Package, Truck, Clock, ArrowRight } from "lucide-react";

const Envios = () => {
  const { categories, mainCategories, subcategoriesByParent, thirdLevelBySubcategory } = useCategories();
  const [selectedCategory, setSelectedCategory] = React.useState("Todos");
  const [promoVisible, setPromoVisible] = React.useState(true);
  const [info, setInfo] = useState<{ content: string; enabled: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      const { data, error } = await db.from('info_sections').select('*').eq('id', 'envios').maybeSingle();
      if (data) {
        setInfo({
          content: data.content || '',
          enabled: data.enabled ?? false,
        });
      } else {
        setInfo(null);
      }
      setLoading(false);
    };
    fetchInfo();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 via-white to-slate-50">
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
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50"></div>
          <div className="absolute inset-0 opacity-5 bg-[url('/placeholder.svg')]"></div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6">
            <nav className="w-full text-sm text-gray-600 mb-8 flex items-center gap-2">
              <a href="/" className="font-medium text-gray-700 hover:text-blue-600 transition-colors">Inicio</a>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">Envíos</span>
            </nav>
            <h1 className="text-5xl md:text-7xl font-serif font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-cyan-900 bg-clip-text text-transparent mb-6 tracking-tight">
              Envíos
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
            ) : info && info.enabled ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-gray-100">
                <div className="prose prose-lg max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: info.content.replace(/\n/g, '<br />') }} />
              </div>
            ) : (
              <div className="space-y-8">
                <h2 className="text-2xl md:text-3xl font-serif font-semibold text-gray-900 mb-8 w-full flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <MapPin className="w-6 h-6" />
                  </div>
                  Envíos
                </h2>

                {/* Ubicación Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 md:p-8 shadow-md border border-blue-100">
                  <p className="text-lg md:text-xl text-gray-700 mb-6 font-normal leading-relaxed">
                    Estamos ubicados en Olavarría 610 (esquina San Luis), Salta, Argentina, y realizamos envíos a todo el país.
                  </p>
                  <a
                    href="https://maps.app.goo.gl/gonu6cj9cJnDfJBz5?g_st=aw"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold">
                    <MapPin className="w-5 h-5" />
                    <span>Ver nuestra ubicación</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>

                {/* Entrega Card */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 md:p-8 shadow-md border border-purple-100">
                  <p className="text-lg md:text-xl text-gray-700 font-normal leading-relaxed">
                    📦 Nos encargamos de que tu pedido llegue de forma rápida, segura y sin complicaciones, estés donde estés.
                  </p>
                </div>

                {/* Envíos Bonificados */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 md:p-10 shadow-xl border border-green-200">
                  <h3 className="text-2xl font-bold font-serif text-gray-900 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white shadow-md">
                      <Truck className="w-5 h-5" />
                    </div>
                    Envíos bonificados:
                  </h3>
                  <div className="space-y-4 mb-6">
                    <div className="bg-white/70 rounded-lg p-5 shadow-sm border border-green-200">
                      <p className="text-base md:text-lg text-gray-700 font-medium">
                        Salta Capital y alrededores → Envío GRATIS en compras superiores a $30.000
                      </p>
                    </div>
                    <div className="bg-white/70 rounded-lg p-5 shadow-sm border border-green-200">
                      <p className="text-base md:text-lg text-gray-700 font-medium">
                        Jujuy y Tucumán → Envío GRATIS en compras superiores a $70.000
                      </p>
                    </div>
                  </div>
                  <p className="text-base md:text-lg text-gray-700 bg-white/50 rounded-lg p-4 border border-green-200">
                    🔸 Para compras menores a esos montos, el costo de envío corre por cuenta del cliente, y se calcula automáticamente al momento de realizar la compra.
                  </p>
                </div>

                {/* Tiempo de Despacho */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 md:p-8 shadow-md border border-amber-100">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                    <p className="text-base md:text-lg text-gray-700 leading-relaxed pt-2">
                      🕒 Los pedidos se despachan dentro de las 24 a 48 horas hábiles luego de confirmado el pago.
                    </p>
                  </div>
                </div>

                {/* Retiro */}
                <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-6 md:p-8 shadow-md border border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
                      <Package className="w-6 h-6" />
                    </div>
                    <p className="text-base md:text-lg text-gray-700 leading-relaxed pt-2">
                      📍 También podés coordinar retiro sin cargo en nuestro punto de entrega en Salta.
                    </p>
                  </div>
                </div>
              </div>
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
                <li>Tecnología</li>
                <li>Moda y Calzado</li>
                <li>Hogar y Cocina</li>
                <li>Salud y Belleza</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Centro de Ayuda</li>
                <li>Política de Devoluciones</li>
                <li>Compra Segura</li>
                <li>Garantías</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/sobre-nosotros" className="hover:underline">Sobre Nosotros</a></li>
                <li><a href="/envios" className="hover:underline">Envíos</a></li>
                <li><a href="/testimonios" className="hover:underline">Testimonios</a></li>
                <li><a href="/retiros" className="hover:underline">Retiros</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Envios;
