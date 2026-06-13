import React, { useEffect, useState } from "react";
import { TopPromoBar } from "@/components/layout/TopPromoBar";
import { AdvancedHeader } from "@/components/layout/AdvancedHeader";
import { useCategories } from "@/hooks/use-categories";
import { db } from '@/firebase';

const Retiros = () => {
  const { categories, mainCategories, subcategoriesByParent, thirdLevelBySubcategory } = useCategories();
  const [selectedCategory, setSelectedCategory] = React.useState("Todos");
  const [promoVisible, setPromoVisible] = React.useState(true);
  const [info, setInfo] = useState<{ content: string; enabled: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      const { data, error } = await db.from('info_sections').select('*').eq('id', 'retiros').maybeSingle();
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
    <div className="min-h-screen flex flex-col bg-white">
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
        <section className="flex-1 min-h-[calc(100vh-8rem)] w-full flex flex-col justify-center items-center bg-white">
          <div className="flex flex-col w-full items-center pt-40 pb-24 md:pt-56 md:pb-32">
            <div className="w-full max-w-4xl mx-auto">
              <nav className="w-full text-sm text-gray-500 mb-6">
                <a href="/" className="font-semibold text-black hover:underline">Inicio</a>
                <span className="mx-2">&gt;</span>
                <span className="text-black">Retiros</span>
              </nav>
              <h1 className="text-5xl md:text-7xl font-serif font-bold text-black mb-4 tracking-tight w-full">
                Retiros
              </h1>
              {loading ? (
                <div className="text-lg text-gray-500">Cargando información...</div>
              ) : info && info.enabled ? (
                <div className="prose prose-lg max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: info.content.replace(/\n/g, '<br />') }} />
              ) : (
                <div className="prose prose-lg max-w-none text-gray-800">
                  <h2 className="text-2xl md:text-3xl font-serif font-semibold text-black mb-10 w-full flex items-center gap-2">Retiros en el Local</h2>
                  <p className="text-lg md:text-xl text-gray-700 mb-8 font-normal leading-relaxed w-full max-w-none">
                    🛍️ Si compraste online y preferís retirar en persona, ¡también podés hacerlo!
                  </p>
                  <p className="text-base md:text-lg text-gray-700 mb-6 w-full max-w-none">
                    📍 Estamos en Olavarría 610 (esquina San Luis) y te ofrecemos la opción de retiro en local sin costo adicional.
                  </p>
                  <div className="my-6">
                    <a href="https://maps.app.goo.gl/gonu6cj9cJnDfJBz5?g_st=aw"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors">
                      <span>📍 Ver ubicación en el mapa</span>
                    </a>
                  </div>
                  <h3 className="text-2xl font-bold font-serif text-black mb-4 mt-8 w-full">¿Cómo funciona?</h3>
                  <ul className="list-disc pl-6 text-base md:text-lg text-gray-700 mb-6 w-full max-w-none">
                    <li>Solo necesitás presentar tu DNI al momento del retiro.</li>
                    <li>Podés venir a buscar tu pedido en nuestro horario de atención habitual.</li>
                    <li>Tenés un plazo de 30 días corridos desde la compra para retirarlo.</li>
                  </ul>
                  <p className="text-base md:text-lg text-gray-700 mb-6 w-full max-w-none">
                    💡 Si necesitás que otra persona lo retire por vos, no te preocupes. Podés autorizarla enviándonos sus datos por WhatsApp o email junto con tu número de pedido.
                  </p>
                </div>
              )}
            </div>
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

export default Retiros;
