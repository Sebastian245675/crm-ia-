import React, { useEffect, useState } from "react";
import { TopPromoBar } from "@/components/layout/TopPromoBar";
import { AdvancedHeader } from "@/components/layout/AdvancedHeader";
import { useCategories } from "@/hooks/use-categories";
import { getInfoSection } from "@/lib/info-sections";
import { HelpCircle, ChevronDown, PhoneCall } from "lucide-react";

const FAQPage = () => {
  const { categories, mainCategories, subcategoriesByParent, thirdLevelBySubcategory } = useCategories();
  const [selectedCategory, setSelectedCategory] = React.useState("Todos");
  const [promoVisible, setPromoVisible] = React.useState(true);
  const [faqContent, setFaqContent] = useState<string>('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);

  useEffect(() => {
    // ... logic remains same as original fetch
    const fetchFAQ = async () => {
      setLoading(true);
      try {
        const row = await getInfoSection("faqs");
        if (row) {
          setFaqContent(row.content || "");
          setEnabled(row.enabled ?? false);
        } else {
          setFaqContent("");
          setEnabled(false);
        }
      } catch (error) {
        console.error('Error fetching FAQ:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFAQ();
  }, []);

  const parseFAQContent = (content: string) => {
    if (!content) return [];
    const faqs: { question: string; answer: string }[] = [];

    // Normalizar saltos de línea y limpiar espacios extras
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');

    let currentQuestion = '';
    let currentAnswerLines: string[] = [];

    const flushCurrent = () => {
      if (currentQuestion && currentAnswerLines.some(l => l.trim())) {
        faqs.push({
          question: currentQuestion
            .replace(/^[¿\s]+/, '')
            .replace(/[?\s]+$/, '')
            .trim(),
          answer: currentAnswerLines
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim(),
        });
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();
      // Detectar inicio de pregunta: línea que empieza con ¿ (con o sin número previo)
      const isQuestion =
        /^[¿]/.test(trimmed) ||
        /^\d+[\.\)]\s*¿/.test(trimmed) ||
        /^[-*•]\s*¿/.test(trimmed);

      if (isQuestion && trimmed.length > 3) {
        flushCurrent();
        currentQuestion = trimmed.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*•]\s*/, '');
        currentAnswerLines = [];
      } else if (currentQuestion) {
        currentAnswerLines.push(line);
      }
    }

    flushCurrent();
    return faqs;
  };

  const faqs = parseFAQContent(faqContent);

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

      <main className="flex-1 flex flex-col bg-white overflow-hidden">
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-[1200px] mx-auto px-4 md:px-6">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
              {/* Left Column: FAQ Accordion */}
              <div className="lg:col-span-2">
                <h1 className="text-4xl md:text-5xl font-extrabold text-[hsl(214,100%,38%)] tracking-tight mb-2 uppercase">
                  FAQ
                </h1>
                <p className="text-lg md:text-xl text-[hsl(214,100%,38%)] font-semibold mb-8 md:mb-12">
                  Preguntas y respuestas
                </p>

                {loading ? (
                  <div className="text-center py-20 flex flex-col items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-400 mb-4"></div>
                    <p className="text-gray-500 font-medium">Cargando...</p>
                  </div>
                ) : enabled && faqs.length > 0 ? (
                  <>
                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden shadow-sm mb-16">
                      {faqs.map((faq, index) => {
                        const isOpen = openQuestion === index;
                        return (
                          <div key={index}>
                            <button
                              onClick={() => setOpenQuestion(isOpen ? null : index)}
                              className={`w-full text-left px-5 md:px-6 py-4 md:py-5 font-bold flex justify-between items-start gap-4 transition-colors ${isOpen ? 'bg-[hsl(214,100%,38%)] text-white' : 'bg-white text-gray-900 hover:bg-gray-50'}`}
                            >
                              <span className="text-[13px] md:text-sm leading-snug pr-2">
                                ¿{faq.question}?
                              </span>
                              <ChevronDown className={`w-5 h-5 flex-shrink-0 mt-0.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`transition-all duration-400 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000px]' : 'max-h-0'}`}>
                              <div className="px-5 md:px-6 py-5 bg-gray-50 border-t border-gray-100">
                                {faq.answer.split('\n\n').map((paragraph, pIdx) => (
                                  paragraph.trim() ? (
                                    <p key={pIdx} className="text-sm md:text-[15px] text-gray-600 leading-relaxed mb-3 last:mb-0">
                                      {paragraph.trim()}
                                    </p>
                                  ) : null
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 3 Step Process */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 pt-8 border-t border-gray-100">
                      <div className="text-left flex flex-col">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="w-4 h-4 rounded-full bg-[hsl(214,100%,38%)] flex-shrink-0"></span>
                          <h4 className="text-lg font-bold text-gray-900 tracking-tight">Paso 1</h4>
                        </div>
                        <p className="text-gray-500 text-[13px] font-medium pl-7 leading-relaxed">
                          Empieza tu búsqueda explorando nuestro catálogo.
                        </p>
                      </div>

                      <div className="text-left flex flex-col">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="w-4 h-4 rounded-full bg-[hsl(214,100%,38%)] flex-shrink-0"></span>
                          <h4 className="text-lg font-bold text-gray-900 tracking-tight">Paso 2</h4>
                        </div>
                        <p className="text-gray-500 text-[13px] font-medium pl-7 leading-relaxed">
                          Encuentra la fragancia ideal o realiza una cotización.
                        </p>
                      </div>

                      <div className="text-left flex flex-col">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="w-4 h-4 rounded-full bg-[hsl(214,100%,38%)] flex-shrink-0"></span>
                          <h4 className="text-lg font-bold text-gray-900 tracking-tight">Paso 3</h4>
                        </div>
                        <p className="text-gray-500 text-[13px] font-medium pl-7 leading-relaxed">
                          En caso de dudas, solicita asesoría por WhatsApp.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 bg-gray-50 rounded-lg">
                    <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg font-medium">La ayuda rápida estará disponible pronto.</p>
                  </div>
                )}
              </div>

              {/* Right Column: Contact CTA */}
              <div className="lg:col-span-1 pt-0">
                <div className="bg-white rounded-3xl p-8 w-full flex flex-col items-center text-center border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] sticky top-24">
                  {/* Icon or Agent Illustration Base */}
                  <div className="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
                    <PhoneCall className="w-14 h-14 text-[hsl(214,100%,38%)]" />
                    <div className="absolute inset-0 bg-blue-600/5 mix-blend-overlay"></div>
                  </div>

                  <h3 className="text-2xl font-black text-[hsl(214,100%,38%)] mb-3 uppercase tracking-tighter">
                    ¿PREGUNTAS?
                  </h3>
                  <p className="text-gray-800 font-bold mb-8 leading-tight">
                    Nuestros expertos están listos para ayudar.
                  </p>

                  <div className="flex flex-col gap-4 w-full">
                    <a
                      href="https://wa.me/541126711308"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-green-50 rounded-2xl transition-all duration-300 group border border-gray-100 hover:border-green-200"
                    >
                      <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center shadow-sm group-hover:shadow-green-200">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-6 h-6 text-white" fill="currentColor">
                          <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-117zm-157 338.7c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.7-30.6-38.1-3.2-5.4-.3-8.3 2.4-11.1 2.4-2.5 5.5-6.4 8.3-9.6 2.8-3.2 3.7-5.5 5.5-9.3 1.9-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3s19.9 53.7 22.6 57.4c2.8 3.7 39.1 59.7 94.8 83.8 13.3 5.7 23.7 9.1 31.7 11.7 13.3 4.2 25.5 3.6 35.2 2.2 10.8-1.6 32.7-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <span className="block text-sm font-black text-gray-900 uppercase">Asesor 1</span>
                        <span className="text-[11px] font-bold text-gray-500">+54 11 2671-1308</span>
                      </div>
                    </a>

                    <a
                      href="https://wa.me/5493872228571"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-green-50 rounded-2xl transition-all duration-300 group border border-gray-100 hover:border-green-200"
                    >
                      <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center shadow-sm group-hover:shadow-green-200">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-6 h-6 text-white" fill="currentColor">
                          <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-117zm-157 338.7c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.7-30.6-38.1-3.2-5.4-.3-8.3 2.4-11.1 2.4-2.5 5.5-6.4 8.3-9.6 2.8-3.2 3.7-5.5 5.5-9.3 1.9-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3s19.9 53.7 22.6 57.4c2.8 3.7 39.1 59.7 94.8 83.8 13.3 5.7 23.7 9.1 31.7 11.7 13.3 4.2 25.5 3.6 35.2 2.2 10.8-1.6 32.7-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <span className="block text-sm font-black text-gray-900 uppercase">Asesor 2</span>
                        <span className="text-[11px] font-bold text-gray-500">+54 9 387 222-8571</span>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default FAQPage;
