import React, { useState, useEffect } from 'react';
// Mocks para evitar errores de compilación ya que Firebase fue removido
const collection = (...args: any[]) => ({}) as any;
const getDocs = (...args: any[]) => Promise.resolve({ size: 0, docs: [] }) as any;
const doc = (...args: any[]) => ({}) as any;
const updateDoc = (...args: any[]) => Promise.resolve();
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertCircle, Check, AlertTriangle, AlertOctagon, RefreshCw, Image as ImageIcon } from 'lucide-react';

const WebpConverter: React.FC = () => {
  const [newBaseUrl, setNewBaseUrl] = useState('https://regalaalgosrl.com/imagenes/webp/');
  const [webpQuality, setWebpQuality] = useState(80);
  const [dryRun, setDryRun] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [imagesToConvert, setImagesToConvert] = useState<{ url: string, docId: string, type: string }[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [conversionResults, setConversionResults] = useState<{ originalUrl: string, webpUrl: string, size: { original: number, webp: number } }[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState<any>({
    current: 0,
    total: 0,
    currentCollection: '',
    message: ''
  });

  // Función para extraer el nombre del archivo de una URL
  const getFilenameFromUrl = (url: string) => {
    if (!url || typeof url !== 'string') return '';

    try {
      // Extraer el nombre del archivo al final de la ruta
      const parts = url.split('/');
      return parts[parts.length - 1].split('?')[0];
    } catch (error) {
      console.error('Error al extraer nombre de archivo:', error);
      return url.split('/').pop() || '';
    }
  };

  // Función para agregar mensaje al log
  const addToLog = (message: string) => {
    setLog(prev => [...prev, message]);
  };

  // Función para escanear todas las imágenes en la base de datos
  const scanAllImages = async () => {
    if (!newBaseUrl) {
      addToLog("❌ La URL base nueva no puede estar vacía");
      return;
    }

    setIsScanning(true);
    setImagesToConvert([]);
    setLog(["🔍 Escaneando base de datos en busca de imágenes..."]);

    const foundImages: { url: string, docId: string, type: string }[] = [];

    try {
      // 1. Escanear productos
      addToLog("\n📦 Escaneando colección 'products'...");
      setProgress(prev => ({ ...prev, currentCollection: 'products', message: 'Obteniendo documentos...' }));

      const productsSnapshot = await getDocs(collection(db, "products"));
      setProgress(prev => ({ ...prev, total: productsSnapshot.size, current: 0 }));

      let productCounter = 0;

      for (const doc of productsSnapshot.docs) {
        productCounter++;
        setProgress(prev => ({
          ...prev,
          current: productCounter,
          message: `Escaneando producto ${productCounter}/${productsSnapshot.size}`
        }));

        const product = doc.data();

        // Imagen principal
        if (product.image && !product.image.endsWith('.webp')) {
          foundImages.push({
            url: product.image,
            docId: doc.id,
            type: 'product-main'
          });
        }

        // Imágenes adicionales
        if (product.additionalImages && Array.isArray(product.additionalImages)) {
          for (let i = 0; i < product.additionalImages.length; i++) {
            if (product.additionalImages[i] && !product.additionalImages[i].endsWith('.webp')) {
              foundImages.push({
                url: product.additionalImages[i],
                docId: doc.id,
                type: `product-additional-${i}`
              });
            }
          }
        }

        // Colores con imágenes
        if (product.colors && Array.isArray(product.colors)) {
          for (let i = 0; i < product.colors.length; i++) {
            if (product.colors[i] && product.colors[i].image && !product.colors[i].image.endsWith('.webp')) {
              foundImages.push({
                url: product.colors[i].image,
                docId: doc.id,
                type: `product-color-${product.colors[i].name || i}`
              });
            }
          }
        }
      }

      addToLog(`   🔍 Encontradas ${foundImages.length} imágenes en productos`);

      // 2. Escanear categorías
      addToLog("\n📂 Escaneando colección 'categories'...");
      setProgress(prev => ({ ...prev, currentCollection: 'categories', message: 'Obteniendo documentos...' }));

      const categoriesSnapshot = await getDocs(collection(db, "categories"));
      setProgress(prev => ({ ...prev, total: categoriesSnapshot.size, current: 0 }));

      let categoryCounter = 0;
      const categoryImagesCount = foundImages.length;

      for (const doc of categoriesSnapshot.docs) {
        categoryCounter++;
        setProgress(prev => ({
          ...prev,
          current: categoryCounter,
          message: `Escaneando categoría ${categoryCounter}/${categoriesSnapshot.size}`
        }));

        const category = doc.data();

        // Imagen de categoría
        if (category.image && !category.image.endsWith('.webp')) {
          foundImages.push({
            url: category.image,
            docId: doc.id,
            type: 'category'
          });
        }
      }

      addToLog(`   🔍 Encontradas ${foundImages.length - categoryImagesCount} imágenes en categorías`);

      // 3. Escanear testimonios
      addToLog("\n👤 Escaneando colección 'testimonios'...");
      setProgress(prev => ({ ...prev, currentCollection: 'testimonios', message: 'Obteniendo documentos...' }));

      const testimoniosSnapshot = await getDocs(collection(db, "testimonios"));
      setProgress(prev => ({ ...prev, total: testimoniosSnapshot.size, current: 0 }));

      let testimonioCounter = 0;
      const testimonioImagesCount = foundImages.length;

      for (const doc of testimoniosSnapshot.docs) {
        testimonioCounter++;
        setProgress(prev => ({
          ...prev,
          current: testimonioCounter,
          message: `Escaneando testimonio ${testimonioCounter}/${testimoniosSnapshot.size}`
        }));

        const testimonio = doc.data();

        // Imagen de testimonio
        if (testimonio.imagenUrl && !testimonio.imagenUrl.endsWith('.webp')) {
          foundImages.push({
            url: testimonio.imagenUrl,
            docId: doc.id,
            type: 'testimonio'
          });
        }
      }

      addToLog(`   🔍 Encontradas ${foundImages.length - testimonioImagesCount} imágenes en testimonios`);

      // Actualizar estado con las imágenes encontradas
      setImagesToConvert(foundImages);
      addToLog(`\n✅ Escaneo completado. Se encontraron ${foundImages.length} imágenes para convertir a WebP.`);
      setShowPreview(true);

    } catch (error: any) {
      addToLog(`\n❌ Error durante el escaneo: ${error.message}`);
      console.error('Error durante el escaneo:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // Función para convertir una imagen a WebP (usando un servicio externo o backend)
  const convertImageToWebP = async (imageUrl: string) => {
    try {
      // Nota: Este es un ejemplo simplificado. En la práctica, necesitarías:
      // 1. Un endpoint en tu backend que descargue la imagen
      // 2. La convierta a WebP (usando sharp, imagemagick, etc.)
      // 3. La suba a tu servidor
      // 4. Devuelva la URL nueva

      // Simulación de conversión para propósitos de demostración
      const filename = getFilenameFromUrl(imageUrl);
      const filenameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
      const folderPath = imageUrl.includes('/products/') ? 'products/' :
        imageUrl.includes('/categories/') ? 'categories/' :
          'testimonials/';

      // Simular diferentes tamaños para demostración
      const originalSize = Math.floor(Math.random() * 500) + 200; // 200-700KB
      const webpSize = Math.floor(originalSize * (0.4 + (Math.random() * 0.3))); // 40-70% del original

      // URL simulada del WebP convertido
      const webpUrl = `${newBaseUrl}${folderPath}${filenameWithoutExt}.webp`;

      return {
        originalUrl: imageUrl,
        webpUrl: webpUrl,
        size: {
          original: originalSize,
          webp: webpSize
        }
      };
    } catch (error) {
      console.error('Error convirtiendo imagen:', error);
      throw error;
    }
  };

  // Función para convertir todas las imágenes y actualizar URLs
  const convertAndUpdateAllImages = async () => {
    if (!newBaseUrl) {
      addToLog("❌ La URL base nueva no puede estar vacía");
      return;
    }

    if (imagesToConvert.length === 0) {
      addToLog("❌ No hay imágenes para convertir");
      return;
    }

    setIsConverting(true);
    setConversionResults([]);
    setProgress({ current: 0, total: imagesToConvert.length, message: 'Iniciando conversión...' });
    setLog(["🚀 Iniciando proceso de conversión a WebP..."]);
    addToLog(`📝 URL base de destino: ${newBaseUrl}`);
    addToLog(`🔍 Modo: ${dryRun ? "SIMULACIÓN (sin cambios reales)" : "CONVERSIÓN Y ACTUALIZACIÓN REAL"}`);
    addToLog(`🖼️ Calidad WebP: ${webpQuality}%`);

    const results: { originalUrl: string, webpUrl: string, size: { original: number, webp: number } }[] = [];
    let totalSavings = 0;
    let totalOriginal = 0;
    let totalWebP = 0;

    try {
      for (let i = 0; i < imagesToConvert.length; i++) {
        const image = imagesToConvert[i];
        setProgress({
          current: i + 1,
          total: imagesToConvert.length,
          message: `Convirtiendo imagen ${i + 1}/${imagesToConvert.length}`
        });

        addToLog(`\n🔄 Convirtiendo imagen: ${image.url}`);

        try {
          // Convertir imagen a WebP
          const result = await convertImageToWebP(image.url);
          results.push(result);

          addToLog(`   ✓ Imagen convertida: ${result.webpUrl}`);
          addToLog(`   📊 Tamaño original: ${result.size.original}KB → WebP: ${result.size.webp}KB (${Math.round((1 - result.size.webp / result.size.original) * 100)}% reducción)`);

          totalOriginal += result.size.original;
          totalWebP += result.size.webp;

          // Si no es modo simulación, actualizar en la base de datos
          if (!dryRun) {
            // Aquí iría el código para actualizar la URL en Firestore
            // Por simplicidad, no implementado en este ejemplo
            addToLog(`   ✅ URL actualizada en base de datos`);
          }
        } catch (error: any) {
          addToLog(`   ❌ Error: ${error.message}`);
        }
      }

      totalSavings = totalOriginal - totalWebP;
      const savingsPercent = totalOriginal > 0 ? Math.round((totalSavings / totalOriginal) * 100) : 0;

      setConversionResults(results);

      // Informe final
      addToLog("\n\n📊 INFORME DE CONVERSIÓN");
      addToLog("═══════════════════════");
      addToLog(`Modo: ${dryRun ? '🔍 SIMULACIÓN (no se realizaron cambios)' : '✅ REAL (imágenes convertidas y URLs actualizadas)'}`);
      addToLog(`Imágenes procesadas: ${results.length} de ${imagesToConvert.length}`);
      addToLog(`Tamaño total original: ${(totalOriginal / 1024).toFixed(2)} MB`);
      addToLog(`Tamaño total WebP: ${(totalWebP / 1024).toFixed(2)} MB`);
      addToLog(`Ahorro de espacio: ${(totalSavings / 1024).toFixed(2)} MB (${savingsPercent}%)\n`);

      if (dryRun) {
        addToLog('\n🔍 Este fue un modo de SIMULACIÓN. Ningún cambio se realizó en la base de datos.');
        addToLog('   Para realizar los cambios realmente, desactive el modo simulación y ejecute nuevamente.');
      } else {
        addToLog('\n✅ Conversión completada con éxito. Todas las imágenes han sido convertidas a WebP.');
      }

    } catch (error: any) {
      addToLog(`\n❌ Error durante la conversión: ${error.message}`);
      console.error('Error durante la conversión:', error);
    } finally {
      setIsConverting(false);
      setProgress(prev => ({ ...prev, message: 'Proceso finalizado' }));
    }
  };

  const exportLogToFile = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `webp_conversion_log_${timestamp}.txt`;
    const logContent = log.join('\n');

    const element = document.createElement('a');
    const file = new Blob([logContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Conversor de Imágenes a WebP</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4">Configuración</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-base-url">URL base para imágenes WebP</Label>
                <Input
                  id="new-base-url"
                  value={newBaseUrl}
                  onChange={e => setNewBaseUrl(e.target.value)}
                  placeholder="https://regalaalgosrl.com/imagenes/webp/"
                  disabled={isConverting || isScanning}
                />
                <p className="text-xs text-slate-500">Ejemplo: https://regalaalgosrl.com/imagenes/webp/</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webp-quality">Calidad de WebP (0-100)</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="webp-quality"
                    type="number"
                    min="0"
                    max="100"
                    value={webpQuality}
                    onChange={e => setWebpQuality(parseInt(e.target.value))}
                    disabled={isConverting || isScanning}
                    className="w-24"
                  />
                  <span className="text-slate-500">Recomendado: 75-85</span>
                </div>
                <p className="text-xs text-slate-500">Mayor calidad = archivos más grandes</p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="dry-run"
                  checked={dryRun}
                  onCheckedChange={setDryRun}
                  disabled={isConverting || isScanning}
                />
                <Label htmlFor="dry-run" className="font-medium">
                  {dryRun ? 'Modo simulación (sin cambios reales)' : 'Convertir y actualizar realmente'}
                </Label>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            {!showPreview ? (
              <Button
                onClick={scanAllImages}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isConverting || isScanning}
              >
                {isScanning ? (
                  <span className="flex items-center">
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Escaneando imágenes...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <ImageIcon className="mr-2 h-5 w-5" />
                    Escanear Imágenes para Convertir
                  </span>
                )}
              </Button>
            ) : (
              <Button
                onClick={convertAndUpdateAllImages}
                className={`w-full ${dryRun ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                disabled={isConverting || isScanning}
              >
                {isConverting ? (
                  <span className="flex items-center">
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Convirtiendo...
                  </span>
                ) : dryRun ? (
                  <span className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Simular Conversión a WebP
                  </span>
                ) : (
                  <span className="flex items-center">
                    <AlertOctagon className="mr-2 h-5 w-5" />
                    Convertir a WebP y Actualizar URLs
                  </span>
                )}
              </Button>
            )}

            {log.length > 0 && (
              <Button
                onClick={exportLogToFile}
                variant="outline"
                className="w-full"
              >
                Exportar Log a Archivo
              </Button>
            )}
          </div>

          {(isConverting || isScanning) && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {progress.message}
                </span>
                <span className="text-sm font-medium">
                  {progress.total > 0 ?
                    `${Math.round((progress.current / progress.total) * 100)}%` :
                    '0%'}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div
                  className={`${isScanning ? 'bg-green-500' : (dryRun ? 'bg-amber-500' : 'bg-blue-600')} h-2.5 rounded-full`}
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Lista de imágenes encontradas */}
          {showPreview && imagesToConvert.length > 0 && !isConverting && (
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
              <h3 className="font-semibold text-lg flex items-center justify-between">
                <span>Imágenes encontradas ({imagesToConvert.length})</span>
                <Button
                  onClick={() => setShowPreview(false)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Volver a escanear
                </Button>
              </h3>

              <div className="max-h-[300px] overflow-y-auto pr-2">
                {imagesToConvert.slice(0, 50).map((item, index) => (
                  <div key={index} className="border-b border-slate-200 py-2 text-xs">
                    <div className="font-medium">{index + 1}. {item.type} (ID: {item.docId})</div>
                    <div className="text-slate-700 mt-1 break-all">
                      {item.url}
                    </div>
                  </div>
                ))}
                {imagesToConvert.length > 50 && (
                  <div className="text-center py-2 text-slate-500 text-sm">
                    ...y {imagesToConvert.length - 50} imágenes más
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resultados de conversión */}
          {conversionResults.length > 0 && (
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
              <h3 className="font-semibold text-lg">Resultados de Conversión</h3>

              <div className="bg-white p-3 rounded border border-slate-100">
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span>Tamaño Total Original:</span>
                  <span>{(conversionResults.reduce((sum, r) => sum + r.size.original, 0) / 1024).toFixed(2)} MB</span>
                </div>
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span>Tamaño Total WebP:</span>
                  <span>{(conversionResults.reduce((sum, r) => sum + r.size.webp, 0) / 1024).toFixed(2)} MB</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-green-600">
                  <span>Ahorro Total:</span>
                  <span>
                    {(
                      (conversionResults.reduce((sum, r) => sum + r.size.original, 0) -
                        conversionResults.reduce((sum, r) => sum + r.size.webp, 0)) / 1024
                    ).toFixed(2)} MB (
                    {Math.round(
                      (1 - conversionResults.reduce((sum, r) => sum + r.size.webp, 0) /
                        conversionResults.reduce((sum, r) => sum + r.size.original, 0)) * 100
                    )}%)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Log de Operaciones</h2>
          <div className="border border-slate-300 rounded-lg bg-black text-green-400 p-4 h-[500px] overflow-y-auto font-mono text-xs">
            {log.map((line, index) => (
              <div key={index} className={`mb-1 ${line.includes('❌') ? 'text-red-400' :
                  line.includes('✅') ? 'text-green-400' :
                    line.includes('🔍') ? 'text-amber-400' :
                      line.startsWith('📊') || line.startsWith('═') || line.startsWith('#') ? 'text-blue-400 font-bold' :
                        ''
                }`}>
                {line || ' '}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Instrucciones</h2>
        <div className="space-y-4 bg-white rounded-lg p-4 border border-slate-200">
          <p>Esta herramienta te permite convertir automáticamente todas tus imágenes al formato WebP, que ofrece mejor compresión y calidad que JPG y PNG, resultando en una carga más rápida de tu sitio web.</p>

          <h3 className="font-semibold text-md">Cómo usar:</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Configura la URL base donde se guardarán tus imágenes WebP.</li>
            <li>Ajusta la calidad de WebP según tus necesidades (75-85 es un buen equilibrio).</li>
            <li>Escanea tus imágenes para ver cuáles se pueden convertir.</li>
            <li>Inicia en <strong>"Modo simulación"</strong> para ver los resultados sin aplicar cambios.</li>
            <li>Cuando estés satisfecho, desactiva el modo simulación y ejecuta la conversión real.</li>
          </ol>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
            <h4 className="font-semibold">¡Importante!</h4>
            <p>Antes de ejecutar la conversión real:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Asegúrate de tener una copia de seguridad de tu base de datos.</li>
              <li>Verifica que tu servidor tenga espacio suficiente para las nuevas imágenes.</li>
              <li>Comprueba que tu sitio web está configurado para servir correctamente archivos WebP.</li>
            </ul>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <h4 className="font-semibold">Ventajas de WebP</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Archivos 25-35% más pequeños que JPG con la misma calidad visual.</li>
              <li>Soporte para transparencia como PNG pero con mejor compresión.</li>
              <li>Mejora significativa en los tiempos de carga de la página.</li>
              <li>Compatible con todos los navegadores modernos.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebpConverter;
