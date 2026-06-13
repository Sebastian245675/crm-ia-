import React, { useState, useEffect } from 'react';
// Mocks para evitar errores de compilación ya que Firebase fue removido
const collection = (...args: any[]) => ({}) as any;
const getDocs = (...args: any[]) => Promise.resolve({ size: 0, docs: [] }) as any;
const doc = (...args: any[]) => ({}) as any;
const updateDoc = (...args: any[]) => Promise.resolve();
const getDoc = (...args: any[]) => Promise.resolve({ exists: () => false, data: () => ({}) }) as any;
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Check, X, AlertTriangle, AlertOctagon, RefreshCw, FileCheck2 } from 'lucide-react';

const ImageUrlUpdater: React.FC = () => {
  const [newBaseUrl, setNewBaseUrl] = useState('https://regalaalgosrl.com/imagenesconvertidas/');
  const [targetExtension, setTargetExtension] = useState('.webp');
  const [dryRun, setDryRun] = useState(true);
  const [verifyUrls, setVerifyUrls] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [urlsToUpdate, setUrlsToUpdate] = useState<{ url: string, newUrl: string, docId: string, type: string, exists?: boolean }[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [stats, setStats] = useState<{
    totalDocuments: number,
    totalUrlsUpdated: number,
    totalUrlsVerified: number,
    totalUrlsNotFound: number,
    collectionStats: Record<string, any>,
    errors: string[]
  }>({
    totalDocuments: 0,
    totalUrlsUpdated: 0,
    totalUrlsVerified: 0,
    totalUrlsNotFound: 0,
    collectionStats: {},
    errors: []
  });
  const [progress, setProgress] = useState<any>({
    current: 0,
    total: 0,
    currentCollection: '',
    message: ''
  });
  const [log, setLog] = useState<string[]>([]);
  const [updateComplete, setUpdateComplete] = useState(false);

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

  // Función para actualizar una URL
  const updateUrl = (url: string) => {
    if (!url || typeof url !== 'string') return url;

    // Extraer el nombre del archivo original, independientemente de la URL base
    let filename = getFilenameFromUrl(url);

    // Conservar el nombre original sin modificación (para verificar luego la existencia)
    const originalFilename = filename;

    // Si se ha especificado cambiar la extensión
    if (targetExtension && targetExtension !== '') {
      // Eliminar la extensión actual y agregar la nueva
      const nameParts = filename.split('.');
      if (nameParts.length > 1) {
        // Quita la extensión y agrega la nueva
        nameParts.pop();
        filename = nameParts.join('.') + targetExtension;
      } else {
        // Si no tiene extensión, simplemente agrega la nueva
        filename = filename + targetExtension;
      }
    }

    // Crear la nueva URL con la base nueva y el nombre de archivo posiblemente modificado
    return `${newBaseUrl}${filename}`;
  };

  // Función para verificar si una URL existe
  const checkUrlExists = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error(`Error al verificar URL ${url}:`, error);
      return false;
    }
  };

  // Función para verificar las URLs en lote
  const verifyUrlsExistence = async () => {
    if (!verifyUrls || urlsToUpdate.length === 0) return;

    setIsVerifying(true);
    addToLog("\n🔍 Verificando la existencia de las imágenes WebP...");

    const updatedUrls = [...urlsToUpdate];
    let totalFound = 0;
    let totalNotFound = 0;

    setProgress(prev => ({
      ...prev,
      total: updatedUrls.length,
      current: 0,
      message: `Verificando URLs (0/${updatedUrls.length})`
    }));

    for (let i = 0; i < updatedUrls.length; i++) {
      setProgress(prev => ({
        ...prev,
        current: i + 1,
        message: `Verificando URLs (${i + 1}/${updatedUrls.length})`
      }));

      const exists = await checkUrlExists(updatedUrls[i].newUrl);
      updatedUrls[i].exists = exists;

      if (exists) {
        totalFound++;
        if (i < 10 || i % 50 === 0) { // Solo loguea algunos para no saturar
          addToLog(`   ✓ Imagen encontrada: ${updatedUrls[i].newUrl}`);
        }
      } else {
        totalNotFound++;
        addToLog(`   ✗ Imagen NO encontrada: ${updatedUrls[i].newUrl}`);
      }

      // Actualizar las estadísticas en tiempo real
      setStats(prev => ({
        ...prev,
        totalUrlsVerified: i + 1,
        totalUrlsNotFound: totalNotFound
      }));
    }

    setUrlsToUpdate(updatedUrls);

    const percentFound = Math.round((totalFound / updatedUrls.length) * 100);
    addToLog(`\n📊 Verificación completada: ${totalFound} imágenes encontradas (${percentFound}%), ${totalNotFound} no encontradas (${100 - percentFound}%)`);

    setIsVerifying(false);
  };

  // Función para agregar mensaje al log
  const addToLog = (message: string) => {
    setLog(prev => [...prev, message]);
  };

  // Función para escanear todas las URLs de imágenes en la base de datos
  const scanAllImageUrls = async () => {
    if (!newBaseUrl) {
      addToLog("❌ La URL de base nueva no puede estar vacía");
      return;
    }

    setIsScanning(true);
    setUrlsToUpdate([]);
    setLog(["🔍 Escaneando base de datos en busca de URLs de regalaalgosrl.com/imagenes/..."]);

    const foundUrls: { url: string, newUrl: string, docId: string, type: string }[] = [];

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
        if (product.image && product.image.includes('regalaalgosrl.com/imagenes')) {
          const newUrl = updateUrl(product.image);
          foundUrls.push({
            url: product.image,
            newUrl: newUrl,
            docId: doc.id,
            type: 'product-main'
          });
        }

        // Imágenes adicionales
        if (product.additionalImages && Array.isArray(product.additionalImages)) {
          for (let i = 0; i < product.additionalImages.length; i++) {
            if (product.additionalImages[i] && product.additionalImages[i].includes('regalaalgosrl.com/imagenes')) {
              const newUrl = updateUrl(product.additionalImages[i]);
              foundUrls.push({
                url: product.additionalImages[i],
                newUrl: newUrl,
                docId: doc.id,
                type: `product-additional-${i}`
              });
            }
          }
        }

        // Colores con imágenes
        if (product.colors && Array.isArray(product.colors)) {
          for (let i = 0; i < product.colors.length; i++) {
            if (product.colors[i] && product.colors[i].image && product.colors[i].image.includes('regalaalgosrl.com/imagenes')) {
              const newUrl = updateUrl(product.colors[i].image);
              foundUrls.push({
                url: product.colors[i].image,
                newUrl: newUrl,
                docId: doc.id,
                type: `product-color-${product.colors[i].name || i}`
              });
            }
          }
        }
      }

      addToLog(`   🔍 Encontradas ${foundUrls.length} URLs en productos`);

      // 2. Escanear categorías
      addToLog("\n📂 Escaneando colección 'categories'...");
      setProgress(prev => ({ ...prev, currentCollection: 'categories', message: 'Obteniendo documentos...' }));

      const categoriesSnapshot = await getDocs(collection(db, "categories"));
      setProgress(prev => ({ ...prev, total: categoriesSnapshot.size, current: 0 }));

      let categoryCounter = 0;
      const categoryUrlsCount = foundUrls.length;

      for (const doc of categoriesSnapshot.docs) {
        categoryCounter++;
        setProgress(prev => ({
          ...prev,
          current: categoryCounter,
          message: `Escaneando categoría ${categoryCounter}/${categoriesSnapshot.size}`
        }));

        const category = doc.data();

        // Imagen de categoría
        if (category.image && category.image.includes('regalaalgosrl.com/imagenes')) {
          const newUrl = updateUrl(category.image);
          foundUrls.push({
            url: category.image,
            newUrl: newUrl,
            docId: doc.id,
            type: 'category'
          });
        }
      }

      addToLog(`   🔍 Encontradas ${foundUrls.length - categoryUrlsCount} URLs en categorías`);

      // 3. Escanear testimonios
      addToLog("\n👤 Escaneando colección 'testimonios'...");
      setProgress(prev => ({ ...prev, currentCollection: 'testimonios', message: 'Obteniendo documentos...' }));

      const testimoniosSnapshot = await getDocs(collection(db, "testimonios"));
      setProgress(prev => ({ ...prev, total: testimoniosSnapshot.size, current: 0 }));

      let testimonioCounter = 0;
      const testimonioUrlsCount = foundUrls.length;

      for (const doc of testimoniosSnapshot.docs) {
        testimonioCounter++;
        setProgress(prev => ({
          ...prev,
          current: testimonioCounter,
          message: `Escaneando testimonio ${testimonioCounter}/${testimoniosSnapshot.size}`
        }));

        const testimonio = doc.data();

        // Imagen de testimonio
        if (testimonio.imagenUrl && testimonio.imagenUrl.includes('regalaalgosrl.com/imagenes')) {
          const newUrl = updateUrl(testimonio.imagenUrl);
          foundUrls.push({
            url: testimonio.imagenUrl,
            newUrl: newUrl,
            docId: doc.id,
            type: 'testimonio'
          });
        }
      }

      addToLog(`   🔍 Encontradas ${foundUrls.length - testimonioUrlsCount} URLs en testimonios`);

      // Actualizar estado con las URLs encontradas
      setUrlsToUpdate(foundUrls);
      addToLog(`\n✅ Escaneo completado. Se encontraron ${foundUrls.length} URLs para actualizar.`);

      // Verificar existencia de URLs si está activada la opción
      if (verifyUrls && foundUrls.length > 0) {
        await verifyUrlsExistence();
      }

      setShowPreview(true);

    } catch (error: any) {
      addToLog(`\n❌ Error durante el escaneo: ${error.message}`);
      console.error('Error durante el escaneo:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // Función principal para actualizar todas las imágenes
  const updateAllImageUrls = async () => {
    if (!newBaseUrl) {
      addToLog("❌ La URL de base nueva no puede estar vacía");
      return;
    }

    setIsUpdating(true);
    setUpdateComplete(false);
    setLog(["🚀 Iniciando proceso de actualización de URLs..."]);
    addToLog(`📝 A: ${newBaseUrl}`);
    addToLog(`🔍 Modo: ${dryRun ? "SIMULACIÓN (sin cambios reales)" : "ACTUALIZACIÓN REAL"}`);

    const newStats = {
      totalDocuments: 0,
      totalUrlsUpdated: 0,
      totalUrlsVerified: 0,
      totalUrlsNotFound: 0,
      collectionStats: {} as Record<string, any>,
      errors: [] as string[]
    };

    try {
      // 1. Actualizar productos
      addToLog("\n📦 Procesando colección 'products'...");
      setProgress(prev => ({ ...prev, currentCollection: 'products', message: 'Obteniendo documentos...' }));

      const productsSnapshot = await getDocs(collection(db, "products"));
      newStats.totalDocuments += productsSnapshot.size;
      newStats.collectionStats['products'] = { documents: productsSnapshot.size, urlsUpdated: 0, unchangedUrls: 0 };

      setProgress(prev => ({ ...prev, total: productsSnapshot.size, current: 0 }));

      let productCounter = 0;

      for (const doc of productsSnapshot.docs) {
        productCounter++;
        setProgress(prev => ({
          ...prev,
          current: productCounter,
          message: `Procesando producto ${productCounter}/${productsSnapshot.size}`
        }));

        const product = doc.data();
        let urlsUpdated = 0;
        let needsUpdate = false;

        // Imagen principal
        if (product.image) {
          if (product.image.includes('regalaalgosrl.com/imagenes')) {
            const newUrl = updateUrl(product.image);

            // Verificar si debemos comprobar la existencia de la URL
            const urlInfo = verifyUrls ? urlsToUpdate.find(u => u.url === product.image) : null;
            const imageExists = urlInfo ? urlInfo.exists !== false : true;

            if (imageExists || !verifyUrls) {
              addToLog(`   📄 Actualizando imagen principal de producto ${doc.id}`);
              addToLog(`      - De: ${product.image}`);
              addToLog(`      - A:  ${newUrl}`);
              product.image = newUrl;
              needsUpdate = true;
              urlsUpdated++;
            } else {
              addToLog(`   ⚠️ Manteniendo URL original para producto ${doc.id} (imagen no encontrada en nueva ruta)`);
              addToLog(`      - URL original conservada: ${product.image}`);
              newStats.collectionStats['products'].unchangedUrls++;
            }
          } else if (product.image) {
            // Contar URLs que no coinciden con el patrón
            newStats.collectionStats['products'].unchangedUrls++;
          }
        }

        // Imágenes adicionales
        if (product.additionalImages && Array.isArray(product.additionalImages)) {
          for (let i = 0; i < product.additionalImages.length; i++) {
            if (product.additionalImages[i]) {
              if (product.additionalImages[i].includes('regalaalgosrl.com/imagenes')) {
                const newUrl = updateUrl(product.additionalImages[i]);

                // Verificar si debemos comprobar la existencia de la URL
                const urlInfo = verifyUrls ? urlsToUpdate.find(u => u.url === product.additionalImages[i]) : null;
                const imageExists = urlInfo ? urlInfo.exists !== false : true;

                if (imageExists || !verifyUrls) {
                  addToLog(`   📄 Actualizando imagen adicional ${i + 1} de producto ${doc.id}`);
                  addToLog(`      - De: ${product.additionalImages[i]}`);
                  addToLog(`      - A:  ${newUrl}`);
                  product.additionalImages[i] = newUrl;
                  needsUpdate = true;
                  urlsUpdated++;
                } else {
                  addToLog(`   ⚠️ Manteniendo URL original para imagen adicional ${i + 1} de producto ${doc.id} (imagen no encontrada en nueva ruta)`);
                  addToLog(`      - URL original conservada: ${product.additionalImages[i]}`);
                  newStats.collectionStats['products'].unchangedUrls++;
                }
              } else {
                // Contar URLs que no coinciden con el patrón
                newStats.collectionStats['products'].unchangedUrls++;
              }
            }
          }
        }

        // Colores con imágenes
        if (product.colors && Array.isArray(product.colors)) {
          for (let i = 0; i < product.colors.length; i++) {
            if (product.colors[i] && product.colors[i].image) {
              if (product.colors[i].image.includes('regalaalgosrl.com/imagenes')) {
                const newUrl = updateUrl(product.colors[i].image);

                // Verificar si debemos comprobar la existencia de la URL
                const urlInfo = verifyUrls ? urlsToUpdate.find(u => u.url === product.colors[i].image) : null;
                const imageExists = urlInfo ? urlInfo.exists !== false : true;

                if (imageExists || !verifyUrls) {
                  addToLog(`   📄 Actualizando imagen de color ${product.colors[i].name || i + 1} de producto ${doc.id}`);
                  addToLog(`      - De: ${product.colors[i].image}`);
                  addToLog(`      - A:  ${newUrl}`);
                  product.colors[i].image = newUrl;
                  needsUpdate = true;
                  urlsUpdated++;
                } else {
                  addToLog(`   ⚠️ Manteniendo URL original para imagen de color ${product.colors[i].name || i + 1} de producto ${doc.id} (imagen no encontrada en nueva ruta)`);
                  addToLog(`      - URL original conservada: ${product.colors[i].image}`);
                  newStats.collectionStats['products'].unchangedUrls++;
                }
              } else {
                // Contar URLs que no coinciden con el patrón
                newStats.collectionStats['products'].unchangedUrls++;
              }
            }
          }
        }

        // Actualizar el documento si es necesario
        if (needsUpdate && !dryRun) {
          try {
            await updateDoc(doc.ref, product);
            addToLog(`   ✅ Producto ${doc.id} actualizado con éxito (${urlsUpdated} URLs)`);
            newStats.totalUrlsUpdated += urlsUpdated;
            newStats.collectionStats['products'].urlsUpdated += urlsUpdated;
          } catch (error: any) {
            const errorMsg = `Error al actualizar producto ${doc.id}: ${error.message}`;
            newStats.errors.push(errorMsg);
            addToLog(`   ❌ ${errorMsg}`);
          }
        } else if (needsUpdate) {
          // Simulación
          addToLog(`   🔍 [SIMULACIÓN] Producto ${doc.id} se actualizaría (${urlsUpdated} URLs)`);
          newStats.totalUrlsUpdated += urlsUpdated;
          newStats.collectionStats['products'].urlsUpdated += urlsUpdated;
        }
      }

      // 2. Actualizar categorías
      addToLog("\n📂 Procesando colección 'categories'...");
      setProgress(prev => ({ ...prev, currentCollection: 'categories', message: 'Obteniendo documentos...' }));

      const categoriesSnapshot = await getDocs(collection(db, "categories"));
      newStats.totalDocuments += categoriesSnapshot.size;
      newStats.collectionStats['categories'] = { documents: categoriesSnapshot.size, urlsUpdated: 0, unchangedUrls: 0 };

      setProgress(prev => ({ ...prev, total: categoriesSnapshot.size, current: 0 }));

      let categoryCounter = 0;

      for (const doc of categoriesSnapshot.docs) {
        categoryCounter++;
        setProgress(prev => ({
          ...prev,
          current: categoryCounter,
          message: `Procesando categoría ${categoryCounter}/${categoriesSnapshot.size}`
        }));

        const category = doc.data();
        let needsUpdate = false;
        let urlsUpdated = 0;

        // Imagen de categoría
        if (category.image) {
          if (category.image.includes('regalaalgosrl.com/imagenes')) {
            const newUrl = updateUrl(category.image);

            // Verificar si debemos comprobar la existencia de la URL
            const urlInfo = verifyUrls ? urlsToUpdate.find(u => u.url === category.image) : null;
            const imageExists = urlInfo ? urlInfo.exists !== false : true;

            if (imageExists || !verifyUrls) {
              addToLog(`   📄 Actualizando imagen de categoría ${category.name || doc.id}`);
              addToLog(`      - De: ${category.image}`);
              addToLog(`      - A:  ${newUrl}`);
              category.image = newUrl;
              needsUpdate = true;
              urlsUpdated++;
            } else {
              addToLog(`   ⚠️ Manteniendo URL original para categoría ${category.name || doc.id} (imagen no encontrada en nueva ruta)`);
              addToLog(`      - URL original conservada: ${category.image}`);
              newStats.collectionStats['categories'].unchangedUrls++;
            }
          } else {
            // Contar URLs que no coinciden con el patrón
            newStats.collectionStats['categories'].unchangedUrls++;
          }
        }

        // Actualizar el documento si es necesario
        if (needsUpdate && !dryRun) {
          try {
            await updateDoc(doc.ref, category);
            addToLog(`   ✅ Categoría ${doc.id} actualizada con éxito (${urlsUpdated} URLs)`);
            newStats.totalUrlsUpdated += urlsUpdated;
            newStats.collectionStats['categories'].urlsUpdated += urlsUpdated;
          } catch (error: any) {
            const errorMsg = `Error al actualizar categoría ${doc.id}: ${error.message}`;
            newStats.errors.push(errorMsg);
            addToLog(`   ❌ ${errorMsg}`);
          }
        } else if (needsUpdate) {
          // Simulación
          addToLog(`   🔍 [SIMULACIÓN] Categoría ${doc.id} se actualizaría (${urlsUpdated} URLs)`);
          newStats.totalUrlsUpdated += urlsUpdated;
          newStats.collectionStats['categories'].urlsUpdated += urlsUpdated;
        }
      }

      // 3. Actualizar testimonios
      addToLog("\n👤 Procesando colección 'testimonios'...");
      setProgress(prev => ({ ...prev, currentCollection: 'testimonios', message: 'Obteniendo documentos...' }));

      const testimoniosSnapshot = await getDocs(collection(db, "testimonios"));
      newStats.totalDocuments += testimoniosSnapshot.size;
      newStats.collectionStats['testimonios'] = { documents: testimoniosSnapshot.size, urlsUpdated: 0, unchangedUrls: 0 };

      setProgress(prev => ({ ...prev, total: testimoniosSnapshot.size, current: 0 }));

      let testimonioCounter = 0;

      for (const doc of testimoniosSnapshot.docs) {
        testimonioCounter++;
        setProgress(prev => ({
          ...prev,
          current: testimonioCounter,
          message: `Procesando testimonio ${testimonioCounter}/${testimoniosSnapshot.size}`
        }));

        const testimonio = doc.data();
        let needsUpdate = false;
        let urlsUpdated = 0;

        // Imagen de testimonio
        if (testimonio.imagenUrl) {
          if (testimonio.imagenUrl.includes('regalaalgosrl.com/imagenes')) {
            const newUrl = updateUrl(testimonio.imagenUrl);

            // Verificar si debemos comprobar la existencia de la URL
            const urlInfo = verifyUrls ? urlsToUpdate.find(u => u.url === testimonio.imagenUrl) : null;
            const imageExists = urlInfo ? urlInfo.exists !== false : true;

            if (imageExists || !verifyUrls) {
              addToLog(`   📄 Actualizando imagen de testimonio ${doc.id}`);
              addToLog(`      - De: ${testimonio.imagenUrl}`);
              addToLog(`      - A:  ${newUrl}`);
              testimonio.imagenUrl = newUrl;
              needsUpdate = true;
              urlsUpdated++;
            } else {
              addToLog(`   ⚠️ Manteniendo URL original para testimonio ${doc.id} (imagen no encontrada en nueva ruta)`);
              addToLog(`      - URL original conservada: ${testimonio.imagenUrl}`);
              newStats.collectionStats['testimonios'].unchangedUrls++;
            }
          } else {
            // Contar URLs que no coinciden con el patrón
            newStats.collectionStats['testimonios'].unchangedUrls++;
          }
        }

        // Actualizar el documento si es necesario
        if (needsUpdate && !dryRun) {
          try {
            await updateDoc(doc.ref, testimonio);
            addToLog(`   ✅ Testimonio ${doc.id} actualizado con éxito (${urlsUpdated} URLs)`);
            newStats.totalUrlsUpdated += urlsUpdated;
            newStats.collectionStats['testimonios'].urlsUpdated += urlsUpdated;
          } catch (error: any) {
            const errorMsg = `Error al actualizar testimonio ${doc.id}: ${error.message}`;
            newStats.errors.push(errorMsg);
            addToLog(`   ❌ ${errorMsg}`);
          }
        } else if (needsUpdate) {
          // Simulación
          addToLog(`   🔍 [SIMULACIÓN] Testimonio ${doc.id} se actualizaría (${urlsUpdated} URLs)`);
          newStats.totalUrlsUpdated += urlsUpdated;
          newStats.collectionStats['testimonios'].urlsUpdated += urlsUpdated;
        }
      }

      // Generar informe final
      addToLog("\n\n📊 INFORME DE ACTUALIZACIÓN");
      addToLog("══════════════════════════");
      addToLog(`Modo: ${dryRun ? '🔍 SIMULACIÓN (no se realizaron cambios)' : '✅ REAL (se actualizaron las URLs)'}`);
      addToLog(`Verificación de URLs: ${verifyUrls ? '✓ ACTIVADA' : '✗ DESACTIVADA'}`);
      addToLog(`URLs procesadas: ${newStats.totalDocuments} documentos`);
      addToLog(`URLs actualizadas: ${newStats.totalUrlsUpdated} imágenes`);

      if (verifyUrls) {
        addToLog(`URLs verificadas: ${newStats.totalUrlsVerified} imágenes`);
        addToLog(`URLs no encontradas: ${newStats.totalUrlsNotFound} imágenes`);
      }

      addToLog("");

      addToLog('Desglose por colección:');
      let totalUnchangedUrls = 0;
      for (const [collection, data] of Object.entries(newStats.collectionStats)) {
        const typedData = data as any;
        if (!typedData.unchangedUrls) {
          typedData.unchangedUrls = 0;
        }
        totalUnchangedUrls += typedData.unchangedUrls;
        addToLog(`- ${collection}: ${typedData.urlsUpdated} URLs actualizadas de ${typedData.documents} documentos, ${typedData.unchangedUrls} URLs sin cambios`);
      }

      addToLog(`\nResumen total: ${newStats.totalUrlsUpdated} URLs actualizadas, ${totalUnchangedUrls} URLs sin cambios`);
      addToLog(`Porcentaje de imágenes actualizadas: ${Math.round((newStats.totalUrlsUpdated / (newStats.totalUrlsUpdated + totalUnchangedUrls)) * 100)}%`);

      if (newStats.errors.length > 0) {
        addToLog(`\n❌ Se encontraron ${newStats.errors.length} errores durante la actualización:`);
        newStats.errors.forEach((error: string, index: number) => {
          addToLog(`   ${index + 1}. ${error}`);
        });
      }

      if (dryRun) {
        addToLog('\n🔍 Este fue un modo de SIMULACIÓN. Ningún cambio se realizó en la base de datos.');
        addToLog('   Para realizar los cambios realmente, desactive el modo simulación y ejecute nuevamente.');
      } else {
        addToLog('\n✅ Actualización completada con éxito. Todas las URLs han sido actualizadas.');
      }

    } catch (error: any) {
      addToLog(`\n❌ Error durante la actualización: ${error.message}`);
      console.error('Error durante la actualización:', error);
    } finally {
      setStats(newStats);
      setIsUpdating(false);
      setUpdateComplete(true);
      setProgress(prev => ({ ...prev, message: 'Proceso finalizado' }));
    }
  };

  const exportLogToFile = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `url_update_log_${timestamp}.txt`;
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
      <h1 className="text-2xl font-bold mb-4">Conversor de URLs de regalaalgosrl.com/imagenes a WebP</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-slate-50 rounded-lg p-4 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4">Configuración</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-base-url">URL base nueva (donde están tus imágenes)</Label>
                <Input
                  id="new-base-url"
                  value={newBaseUrl}
                  onChange={e => setNewBaseUrl(e.target.value)}
                  placeholder="https://regalaalgosrl.com/imagenes/"
                  disabled={isUpdating || isScanning}
                />
                <p className="text-xs text-slate-500">Ejemplo: https://regalaalgosrl.com/imagenes/</p>
              </div>

              <div className="space-y-2 mt-2">
                <Label htmlFor="target-extension">Cambiar extensión a</Label>
                <Input
                  id="target-extension"
                  value={targetExtension}
                  onChange={e => setTargetExtension(e.target.value)}
                  placeholder=".webp"
                  disabled={isUpdating || isScanning}
                />
                <p className="text-xs text-slate-500">Ejemplo: .webp (dejar vacío para mantener la extensión original)</p>
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Switch
                  id="dry-run"
                  checked={dryRun}
                  onCheckedChange={setDryRun}
                  disabled={isUpdating || isScanning}
                />
                <Label htmlFor="dry-run" className="font-medium">
                  {dryRun ? 'Modo simulación (sin cambios reales)' : 'Actualizar realmente la base de datos'}
                </Label>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="verify-urls"
                  checked={verifyUrls}
                  onCheckedChange={setVerifyUrls}
                  disabled={isUpdating || isScanning}
                />
                <Label htmlFor="verify-urls" className="font-medium">
                  Verificar existencia de imágenes antes de actualizar
                </Label>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            {!showPreview ? (
              <Button
                onClick={scanAllImageUrls}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isUpdating || isScanning}
              >
                {isScanning ? (
                  <span className="flex items-center">
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Escaneando URLs...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Escanear URLs de Cloudinary
                  </span>
                )}
              </Button>
            ) : (
              <Button
                onClick={updateAllImageUrls}
                className={`w-full ${dryRun ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                disabled={isUpdating || isScanning}
              >
                {isUpdating ? (
                  <span className="flex items-center">
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </span>
                ) : dryRun ? (
                  <span className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Simular Actualización
                  </span>
                ) : (
                  <span className="flex items-center">
                    <AlertOctagon className="mr-2 h-5 w-5" />
                    Actualizar URLs Realmente
                  </span>
                )}
              </Button>
            )}

            {updateComplete && (
              <Button
                onClick={exportLogToFile}
                variant="outline"
                className="w-full"
              >
                Exportar Log a Archivo
              </Button>
            )}
          </div>

          {(isUpdating || isScanning) && (
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

          {/* Lista de URLs encontradas */}
          {showPreview && urlsToUpdate.length > 0 && !isUpdating && (
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
              <h3 className="font-semibold text-lg flex items-center justify-between">
                <span>URLs encontradas ({urlsToUpdate.length})</span>
                <div className="flex items-center space-x-2">
                  {verifyUrls && !isVerifying && (
                    <Button
                      onClick={verifyUrlsExistence}
                      variant="outline"
                      size="sm"
                      className="text-xs flex items-center"
                    >
                      <FileCheck2 className="h-3 w-3 mr-1" />
                      Verificar URLs
                    </Button>
                  )}
                  <Button
                    onClick={() => setShowPreview(false)}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Volver a escanear
                  </Button>
                </div>
              </h3>

              <div className="max-h-[300px] overflow-y-auto pr-2">
                {urlsToUpdate.slice(0, 100).map((item, index) => (
                  <div key={index} className={`border-b border-slate-200 py-2 text-xs ${item.exists === false ? 'bg-red-50' : ''}`}>
                    <div className="font-medium flex justify-between">
                      <span>{index + 1}. {item.type} (ID: {item.docId})</span>
                      {item.exists !== undefined && (
                        <span className={`font-semibold ${item.exists ? 'text-green-600' : 'text-red-600'}`}>
                          {item.exists ? '✓ Encontrada' : '✗ No encontrada'}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-700 mt-1 break-all">
                      <span className="font-medium">Actual:</span> {item.url}
                    </div>
                    <div className={`${item.exists === false ? 'text-red-600' : 'text-green-600'} mt-1 break-all`}>
                      <span className="font-medium">Nueva:</span> {item.newUrl}
                    </div>
                  </div>
                ))}
                {urlsToUpdate.length > 100 && (
                  <div className="text-center py-2 text-slate-500 text-sm">
                    ...y {urlsToUpdate.length - 100} URLs más
                  </div>
                )}
              </div>
            </div>
          )}

          {updateComplete && (
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
              <h3 className="font-semibold text-lg">Resumen</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Documentos procesados:</div>
                <div>{stats.totalDocuments}</div>

                <div className="font-medium">URLs actualizadas:</div>
                <div>{stats.totalUrlsUpdated}</div>

                <div className="font-medium">Estado:</div>
                <div className={`flex items-center ${dryRun ? 'text-amber-600' : (stats.errors.length > 0 ? 'text-red-600' : 'text-green-600')}`}>
                  {dryRun ? (
                    <>
                      <AlertTriangle className="mr-1 h-4 w-4" />
                      Simulación
                    </>
                  ) : stats.errors.length > 0 ? (
                    <>
                      <AlertCircle className="mr-1 h-4 w-4" />
                      Completado con errores
                    </>
                  ) : (
                    <>
                      <Check className="mr-1 h-4 w-4" />
                      Actualización exitosa
                    </>
                  )}
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
          <p>Esta herramienta te permite actualizar todas las URLs de imágenes en tu base de datos que tengan el formato <code>regalaalgosrl.com/imagenes/</code>, cambiando las extensiones .jpg y .png a .webp y actualizando la ruta a 'imagenesconvertidas' para las imágenes que ya fueron convertidas.</p>

          <h3 className="font-semibold text-md">Cómo usar:</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Verifica que la URL base nueva es correcta (actualmente configurada a 'imagenesconvertidas').</li>
            <li>Mantén activada la opción <strong>"Verificar existencia de imágenes"</strong> para asegurar que solo se actualicen URLs de imágenes que realmente existen en la nueva ubicación.</li>
            <li>Inicia en <strong>"Modo simulación"</strong> para ver los cambios que se realizarían sin aplicarlos realmente.</li>
            <li>Revisa el log para confirmar que los cambios son correctos.</li>
            <li>Cuando estés seguro, desactiva el modo simulación y ejecuta la actualización real.</li>
          </ol>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
            <h4 className="font-semibold text-green-700">Funcionamiento Mejorado</h4>
            <p>Esta versión actualizada:</p>
            <ul className="list-disc list-inside space-y-1 text-green-700">
              <li>Busca URLs con el formato <code>regalaalgosrl.com/imagenes/...</code></li>
              <li>Cambia automáticamente las extensiones .jpg/.png a .webp</li>
              <li>Actualiza la ruta de 'imagenes' a 'imagenesconvertidas'</li>
              <li>Verifica si cada imagen existe en la nueva ubicación</li>
              <li>Mantiene la URL original si la imagen no existe en la nueva ruta</li>
              <li>Proporciona un informe detallado de todas las acciones realizadas</li>
            </ul>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
            <h4 className="font-semibold">¡Importante!</h4>
            <p>Antes de ejecutar la actualización real:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Asegúrate de tener una copia de seguridad de tu base de datos Firebase.</li>
              <li>Verifica que todas las imágenes convertidas ya están subidas a la carpeta 'imagenesconvertidas'.</li>
              <li>Prueba primero con el modo simulación para revisar todos los cambios.</li>
              <li><strong>Mantén activada</strong> la opción "Verificar existencia de imágenes" para que solo se actualicen URLs que realmente existen.</li>
              <li>Las imágenes no encontradas en 'imagenesconvertidas' mantendrán su URL original.</li>
            </ul>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
            <h4 className="font-semibold text-blue-700">Formato de URLs</h4>
            <p className="mb-2">Esta herramienta busca específicamente URLs con el formato:</p>
            <code className="block bg-white p-2 rounded text-blue-800 mb-2">https://regalaalgosrl.com/imagenes/nombre-de-archivo.jpg</code>
            <p>Y las reemplaza con:</p>
            <code className="block bg-white p-2 rounded text-green-700">https://regalaalgosrl.com/imagenesconvertidas/nombre-de-archivo.webp</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUrlUpdater;
