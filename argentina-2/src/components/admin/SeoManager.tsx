import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  TrendingUp, Sparkles, CheckCircle, Search, Settings, HelpCircle,
  FileText, Code, CheckSquare, RefreshCw, Eye, Copy, ArrowUpRight
} from 'lucide-react';

interface SEOConfig {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  googleAnalyticsId: string;
  metaPixelId: string;
}

export const SeoManager: React.FC = () => {
  const [config, setConfig] = useState<SEOConfig>({
    metaTitle: 'OmniShop - Tu Tienda Online Multirrubro Premium',
    metaDescription: 'Encuentra los mejores productos en tecnología, moda, accesorios y más en OmniShop. Envíos a todo el país y las mejores cuotas sin interés.',
    metaKeywords: 'tienda online, ecommerce, tecnologia, accesorios, moda, ofertas, envios gratis',
    ogTitle: 'OmniShop | Tu Tienda Online Multirrubro',
    ogDescription: 'Las mejores ofertas en tecnología, moda y accesorios. ¡Compra online con envío rápido a tu casa!',
    googleAnalyticsId: 'G-XXXXXXXXXX',
    metaPixelId: 'PX-XXXXXXXXXX'
  });

  const [saving, setSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'meta' | 'analytics' | 'checklist'>('meta');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({
        title: 'SEO Guardado',
        description: 'Las configuraciones de SEO e Integraciones de Analítica se han actualizado correctamente.'
      });
    }, 800);
  };

  const handleGenerateSitemap = () => {
    toast({
      title: 'Sitemap Generado',
      description: 'sitemap.xml actualizado con 24 productos y 4 páginas.'
    });
  };

  const checklistItems = [
    { id: 1, text: 'Títulos de productos optimizados para buscadores', checked: true },
    { id: 2, text: 'Descripciones de imágenes (etiquetas ALT) completadas', checked: false },
    { id: 3, text: 'Certificado SSL (HTTPS) activo y validado', checked: true },
    { id: 4, text: 'Configuración de redirecciones canónicas activa', checked: true },
    { id: 5, text: 'Archivo robots.txt configurado y verificado', checked: true },
    { id: 6, text: 'Envío de sitemap.xml a Google Search Console', checked: false }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Search className="h-8 w-8 text-blue-600" />
            Optimización SEO y Meta Tags
          </h1>
          <p className="text-slate-500 mt-1">
            Mejora el posicionamiento de tu tienda en Google, controla el aspecto en redes sociales y conecta herramientas de analítica.
          </p>
        </div>
      </div>

      {/* SEO Health Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-slate-200 bg-gradient-to-br from-blue-500 to-indigo-600 text-white relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-8 -translate-y-8"></div>
          <CardContent className="p-6 flex flex-col justify-between h-full min-h-[200px]">
            <div>
              <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider">SEO Health Score</span>
              <div className="flex items-baseline gap-2 mt-4">
                <h3 className="text-5xl font-black">92%</h3>
                <span className="text-sm text-green-300 font-bold">Excelente</span>
              </div>
            </div>
            <div className="mt-6">
              <p className="text-xs text-blue-100">
                Tu sitio web tiene un gran rendimiento en motores de búsqueda. Corrige las etiquetas ALT de tus productos para llegar al 100%.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sitemap, Robots & Indexing */}
        <Card className="md:col-span-2 border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Indexación y Rastreo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="font-bold text-slate-900 text-sm block">Mapa del Sitio (Sitemap)</span>
                <span className="text-xs text-slate-400">Genera la estructura en XML para indexar páginas automáticamente.</span>
              </div>
              <Button onClick={handleGenerateSitemap} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                <RefreshCw className="h-4 w-4 mr-1.5" /> Generar sitemap.xml
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="font-bold text-slate-900 text-sm block">robots.txt</span>
                <span className="text-xs text-slate-400">Controla el acceso de rastreadores web como Googlebot a las rutas.</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  toast({
                    title: 'Copiado',
                    description: 'Enlace del archivo robots.txt copiado.'
                  });
                }}
                className="shrink-0 h-9"
              >
                Ver robots.txt
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('meta')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeSubTab === 'meta'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Meta Tags y Redes
        </button>
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeSubTab === 'analytics'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Analítica e Integración
        </button>
        <button
          onClick={() => setActiveSubTab('checklist')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeSubTab === 'checklist'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Lista de Chequeo SEO
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SubTab Content (Left 2 columns) */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-6">
              {activeSubTab === 'meta' && (
                <form onSubmit={handleSave} className="space-y-5">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-800">Estructura HTML Básica</h3>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Título de la Tienda (Meta Title)</label>
                      <Input
                        value={config.metaTitle}
                        onChange={e => setConfig({ ...config, metaTitle: e.target.value })}
                        maxLength={70}
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">Largo ideal: 50-60 caracteres. Actual: {config.metaTitle.length}</span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Descripción de la Tienda (Meta Description)</label>
                      <Textarea
                        value={config.metaDescription}
                        onChange={e => setConfig({ ...config, metaDescription: e.target.value })}
                        maxLength={160}
                        rows={3}
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">Largo ideal: 120-160 caracteres. Actual: {config.metaDescription.length}</span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Palabras Clave (Meta Keywords)</label>
                      <Input
                        value={config.metaKeywords}
                        onChange={e => setConfig({ ...config, metaKeywords: e.target.value })}
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">Separadas por comas.</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-5 border-t border-slate-100">
                    <h3 className="text-base font-bold text-slate-800">Compartir en Redes (Open Graph / OG)</h3>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Título OG</label>
                      <Input
                        value={config.ogTitle}
                        onChange={e => setConfig({ ...config, ogTitle: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Descripción OG</label>
                      <Textarea
                        value={config.ogDescription}
                        onChange={e => setConfig({ ...config, ogDescription: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                      {saving ? 'Guardando...' : 'Guardar Meta Tags'}
                    </Button>
                  </div>
                </form>
              )}

              {activeSubTab === 'analytics' && (
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-800">Herramientas de Analítica Web</h3>
                    <p className="text-xs text-slate-400">Conecta tu tienda con los principales proveedores de medición y remarketing para analizar tu tráfico.</p>
                    
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">ID de Medición de Google Analytics 4 (GA4)</label>
                      <Input
                        value={config.googleAnalyticsId}
                        onChange={e => setConfig({ ...config, googleAnalyticsId: e.target.value })}
                        placeholder="G-XXXXXXXXXX"
                        font-mono
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">Permite rastrear visitantes, rebotes y transacciones.</span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">ID de Meta Pixel (Facebook Pixel)</label>
                      <Input
                        value={config.metaPixelId}
                        onChange={e => setConfig({ ...config, metaPixelId: e.target.value })}
                        placeholder="PX-XXXXXXXXXX"
                        font-mono
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">Mide el éxito de tus campañas de anuncios de Facebook e Instagram.</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                      {saving ? 'Guardando...' : 'Guardar Configuración'}
                    </Button>
                  </div>
                </form>
              )}

              {activeSubTab === 'checklist' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-800">Listado de Tareas SEO</h3>
                  <p className="text-xs text-slate-400">Verifica que tu tienda cumple con las mejores directrices de Google para indexación.</p>
                  
                  <div className="space-y-3 mt-4">
                    {checklistItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                        {item.checked ? (
                          <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                        ) : (
                          <HelpCircle className="h-5 w-5 text-slate-300 shrink-0" />
                        )}
                        <span className={`text-xs ${item.checked ? 'text-slate-700 line-through' : 'text-slate-800 font-semibold'}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Preview Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-blue-500" />
                Vista Previa en Google
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-1 max-w-full overflow-hidden">
                <span className="text-xs text-slate-500 block truncate">https://tutienda.online</span>
                <a href="#" className="text-blue-700 hover:underline font-bold text-lg leading-tight block">
                  {config.metaTitle}
                </a>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-3">
                  {config.metaDescription}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-gradient-to-br from-violet-50 to-white">
            <CardContent className="p-5 space-y-3 text-xs leading-relaxed text-violet-950">
              <div className="flex items-center gap-2 text-violet-900 font-bold">
                <Sparkles className="h-4 w-4 text-violet-500" />
                Sugerencia Inteligente de IA:
              </div>
              <p>Optimizamos las descripciones de tus productos automáticamente para mejorar la indexación.</p>
              <Button size="xs" variant="outline" className="text-violet-700 border-violet-200 hover:bg-violet-100/50 mt-1 font-semibold text-[10px]">
                Optimizar Catálogo Completo
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SeoManager;
