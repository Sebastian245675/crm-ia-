import React, { useState, useEffect } from 'react';
// Mocks para evitar errores de compilación ya que Firebase fue removido
const collection = (...args: any[]) => ({}) as any;
const getDocs = (...args: any[]) => Promise.resolve({ docs: [] }) as any;
import { db } from "@/firebase";
import { Product } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";

const ImageDownloader: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [testimonios, setTestimonios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<Record<string, string>>({});
  const [downloadProgress, setDownloadProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 });

  // Función para cargar todos los datos
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Productos
        const productsSnapshot = await getDocs(collection(db, "products"));
        const productsData = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        setProducts(productsData);

        // Categorías
        const categoriesSnapshot = await getDocs(collection(db, "categories"));
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCategories(categoriesData);

        // Testimonios
        const testimoniosSnapshot = await getDocs(collection(db, "testimonios"));
        const testimoniosData = testimoniosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTestimonios(testimoniosData);

        setLoading(false);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Función para generar un nombre de archivo válido desde una URL
  const getFilenameFromUrl = (url: string) => {
    if (!url) return null;

    try {
      // Intentar extraer el nombre del archivo de la URL
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // Diferentes estrategias basadas en patrones comunes de almacenamiento en la nube

      // 1. Para URLs de Firebase Storage
      if (url.includes('firebasestorage.googleapis.com')) {
        const parts = pathname.split('/');
        const filename = parts[parts.length - 1].split('?')[0];
        return filename || `image-${Date.now()}.jpg`;
      }

      // 2. Para URLs de Cloudinary
      if (url.includes('cloudinary.com')) {
        const match = url.match(/\/([^/]+)\.[^.]+$/);
        if (match) {
          return `${match[1]}.jpg`;
        }
      }

      // 3. Extraer el nombre del final de la URL
      const filenameWithQuery = pathname.split('/').pop() || '';
      const filename = filenameWithQuery.split('?')[0];

      // Si el nombre está vacío o no contiene una extensión, generar uno
      if (!filename || !filename.includes('.')) {
        return `image-${Date.now()}.jpg`;
      }

      return filename;
    } catch (error) {
      // Si hay algún error, generar un nombre con timestamp
      return `image-${Date.now()}.jpg`;
    }
  };

  // Función para descargar una sola imagen
  const downloadImage = async (url: string, customFilename?: string) => {
    if (!url) return null;

    try {
      // Obtener el nombre del archivo
      const filename = customFilename || getFilenameFromUrl(url);
      if (!filename) return null;

      // Crear un enlace temporal para descargar la imagen
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      // Crear un enlace y simular un clic para descargar
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Liberar el objeto URL
      window.URL.revokeObjectURL(objectUrl);

      return filename;
    } catch (error) {
      console.error(`Error descargando imagen desde ${url}:`, error);
      return null;
    }
  };

  // Función para descargar todas las imágenes
  const downloadAllImages = async () => {
    setDownloadStatus({});

    // Recopilar todas las URLs de imágenes
    let allImages: Array<{ url: string, source: string, id: string }> = [];

    // Imágenes de productos
    products.forEach(product => {
      if (product.image) {
        allImages.push({
          url: product.image,
          source: `producto_${product.id}`,
          id: product.id
        });
      }

      // Imágenes adicionales
      if (product.additionalImages && Array.isArray(product.additionalImages)) {
        product.additionalImages.forEach((url, index) => {
          if (url) {
            allImages.push({
              url,
              source: `producto_${product.id}_adicional_${index}`,
              id: `${product.id}_add_${index}`
            });
          }
        });
      }

      // Imágenes de colores
      if (product.colors && Array.isArray(product.colors)) {
        product.colors.forEach((color, index) => {
          if (color.image) {
            allImages.push({
              url: color.image,
              source: `producto_${product.id}_color_${color.name}`,
              id: `${product.id}_color_${index}`
            });
          }
        });
      }
    });

    // Imágenes de categorías
    categories.forEach(category => {
      if (category.image) {
        allImages.push({
          url: category.image,
          source: `categoria_${category.name}`,
          id: `cat_${category.id}`
        });
      }
    });

    // Imágenes de testimonios
    testimonios.forEach(testimonio => {
      if (testimonio.imagenUrl) {
        allImages.push({
          url: testimonio.imagenUrl,
          source: `testimonio_${testimonio.id}`,
          id: `test_${testimonio.id}`
        });
      }
    });

    // Eliminar duplicados basados en URL
    const uniqueImages = Array.from(new Map(allImages.map(item => [item.url, item])).values());

    setDownloadProgress({ current: 0, total: uniqueImages.length });

    // Descargar cada imagen
    for (const [index, image] of uniqueImages.entries()) {
      setDownloadStatus(prev => ({
        ...prev,
        [image.id]: "descargando"
      }));

      try {
        const filename = await downloadImage(image.url);

        if (filename) {
          setDownloadStatus(prev => ({
            ...prev,
            [image.id]: "completado"
          }));
        } else {
          setDownloadStatus(prev => ({
            ...prev,
            [image.id]: "error"
          }));
        }
      } catch (error) {
        setDownloadStatus(prev => ({
          ...prev,
          [image.id]: "error"
        }));
      }

      // Actualizar progreso
      setDownloadProgress({ current: index + 1, total: uniqueImages.length });

      // Pequeño retraso para no sobrecargar
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  // Función para exportar los mapeos de URL a nombre de archivo
  const exportUrlMappings = () => {
    const mappings: Record<string, string> = {};

    // Mapear todas las URLs de productos
    products.forEach(product => {
      if (product.image) {
        mappings[product.image] = getFilenameFromUrl(product.image) || `unknown_${Date.now()}.jpg`;
      }

      if (product.additionalImages) {
        product.additionalImages.forEach((url) => {
          if (url) {
            mappings[url] = getFilenameFromUrl(url) || `unknown_${Date.now()}.jpg`;
          }
        });
      }

      if (product.colors) {
        product.colors.forEach((color) => {
          if (color.image) {
            mappings[color.image] = getFilenameFromUrl(color.image) || `unknown_${Date.now()}.jpg`;
          }
        });
      }
    });

    // Mapear URLs de categorías
    categories.forEach(category => {
      if (category.image) {
        mappings[category.image] = getFilenameFromUrl(category.image) || `unknown_${Date.now()}.jpg`;
      }
    });

    // Mapear URLs de testimonios
    testimonios.forEach(testimonio => {
      if (testimonio.imagenUrl) {
        mappings[testimonio.imagenUrl] = getFilenameFromUrl(testimonio.imagenUrl) || `unknown_${Date.now()}.jpg`;
      }
    });

    // Crear y descargar el archivo JSON de mapeos
    const dataStr = JSON.stringify(mappings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'image_url_mappings.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Herramienta de Descarga de Imágenes</h1>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <span className="ml-3">Cargando datos...</span>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-2">Estadísticas de Imágenes</h2>
            <ul className="space-y-1">
              <li className="flex justify-between">
                <span>Productos:</span>
                <span className="font-medium">{products.length}</span>
              </li>
              <li className="flex justify-between">
                <span>Imágenes principales de productos:</span>
                <span className="font-medium">{products.filter(p => p.image).length}</span>
              </li>
              <li className="flex justify-between">
                <span>Imágenes adicionales:</span>
                <span className="font-medium">
                  {products.reduce((acc, product) =>
                    acc + (product.additionalImages?.filter(url => url?.trim())?.length || 0), 0)}
                </span>
              </li>
              <li className="flex justify-between">
                <span>Imágenes de colores:</span>
                <span className="font-medium">
                  {products.reduce((acc, product) =>
                    acc + (product.colors?.filter(color => color.image?.trim())?.length || 0), 0)}
                </span>
              </li>
              <li className="flex justify-between">
                <span>Imágenes de categorías:</span>
                <span className="font-medium">{categories.filter(c => c.image).length}</span>
              </li>
              <li className="flex justify-between">
                <span>Imágenes de testimonios:</span>
                <span className="font-medium">{testimonios.filter(t => t.imagenUrl).length}</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={downloadAllImages}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={loading || downloadProgress.current > 0}
            >
              Descargar Todas las Imágenes
            </Button>

            <Button
              onClick={exportUrlMappings}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              Exportar Mapeo de URLs
            </Button>
          </div>

          {downloadProgress.current > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Progreso: {downloadProgress.current}/{downloadProgress.total}
                </span>
                <span className="text-sm font-medium">
                  {Math.round((downloadProgress.current / downloadProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">Instrucciones</h2>
            <div className="space-y-4 bg-white rounded-lg p-4 border border-slate-200">
              <p>Esta herramienta te permite descargar todas las imágenes utilizadas en tu tienda para migrar a otro servicio de almacenamiento.</p>

              <h3 className="font-semibold text-md">Cómo usar:</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>Haz clic en <strong>"Descargar Todas las Imágenes"</strong> para iniciar la descarga.</li>
                <li>El navegador descargará cada imagen con su nombre original extraído de la URL.</li>
                <li>Si quieres un archivo JSON con el mapeo entre URLs y nombres de archivos, usa <strong>"Exportar Mapeo de URLs"</strong>.</li>
              </ol>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
                <h4 className="font-semibold">Consejo para la migración:</h4>
                <p>Una vez que hayas descargado todas las imágenes, podrás subirlas a tu nuevo servicio de almacenamiento. Luego, deberás actualizar las URLs en la base de datos con las nuevas ubicaciones.</p>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
                <h4 className="font-semibold">Notas importantes:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Esta operación puede tardar varios minutos dependiendo de la cantidad de imágenes.</li>
                  <li>Asegúrate de tener una conexión estable a internet.</li>
                  <li>Es posible que algunas imágenes no se puedan descargar si las URLs no son accesibles.</li>
                  <li>El navegador puede bloquear descargas múltiples, permítelas si se te solicita.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageDownloader;
