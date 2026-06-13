// download-images.js
// Script para descargar imágenes desde la base de datos Firebase

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const admin = require('firebase-admin');
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Necesitarás crear un archivo serviceAccountKey.json desde Firebase Console
// Proyecto > Configuración > Cuentas de servicio > Generar nueva clave privada
const serviceAccount = require(path.join(PROJECT_ROOT, 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const DOWNLOAD_FOLDER = path.join(PROJECT_ROOT, 'downloaded_images');

// Crear la carpeta si no existe
if (!fs.existsSync(DOWNLOAD_FOLDER)) {
  fs.mkdirSync(DOWNLOAD_FOLDER);
  fs.mkdirSync(path.join(DOWNLOAD_FOLDER, 'products'));
  fs.mkdirSync(path.join(DOWNLOAD_FOLDER, 'categories'));
  fs.mkdirSync(path.join(DOWNLOAD_FOLDER, 'testimonials'));
  fs.mkdirSync(path.join(DOWNLOAD_FOLDER, 'other'));
}

// Función para extraer el nombre del archivo de una URL
function getFilenameFromUrl(url) {
  if (!url) return null;
  
  try {
    // Intentar extraer el nombre del archivo de la URL
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    
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
    console.error(`Error obteniendo nombre de archivo para ${url}:`, error);
    return `image-${Date.now()}.jpg`;
  }
}

// Función para descargar una imagen
async function downloadImage(url, folder, customFilename) {
  if (!url || url.trim() === '') {
    return null;
  }
  
  try {
    // Obtener el nombre del archivo
    const filename = customFilename || getFilenameFromUrl(url);
    if (!filename) {
      return null;
    }
    
    // Crear la ruta de destino
    const filePath = path.join(DOWNLOAD_FOLDER, folder, filename);
    
    console.log(`Descargando ${url} a ${filePath}...`);
    
    // Descargar la imagen
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Error al descargar ${url}: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const buffer = await response.buffer();
    fs.writeFileSync(filePath, buffer);
    
    console.log(`✅ Imagen guardada: ${filename}`);
    return filename;
  } catch (error) {
    console.error(`❌ Error descargando ${url}:`, error);
    return null;
  }
}

// Función principal
async function main() {
  try {
    console.log('Iniciando descarga de imágenes...');
    
    // Crear un archivo para el registro de mapeo URL -> nombre de archivo
    const urlMap = {};
    
    // 1. Descargar imágenes de productos
    console.log('\n📦 Procesando productos...');
    const productsSnapshot = await db.collection('products').get();
    let productsCount = 0;
    
    for (const doc of productsSnapshot.docs) {
      const product = { id: doc.id, ...doc.data() };
      
      // Imagen principal
      if (product.image) {
        const filename = await downloadImage(product.image, 'products');
        if (filename) {
          urlMap[product.image] = filename;
          productsCount++;
        }
      }
      
      // Imágenes adicionales
      if (product.additionalImages && Array.isArray(product.additionalImages)) {
        for (const [index, url] of product.additionalImages.entries()) {
          if (url && url.trim() !== '') {
            const filename = await downloadImage(url, 'products');
            if (filename) {
              urlMap[url] = filename;
              productsCount++;
            }
          }
        }
      }
      
      // Imágenes de colores
      if (product.colors && Array.isArray(product.colors)) {
        for (const color of product.colors) {
          if (color.image && color.image.trim() !== '') {
            const filename = await downloadImage(color.image, 'products');
            if (filename) {
              urlMap[color.image] = filename;
              productsCount++;
            }
          }
        }
      }
    }
    
    console.log(`\n✅ Descargadas ${productsCount} imágenes de productos`);
    
    // 2. Descargar imágenes de categorías
    console.log('\n📂 Procesando categorías...');
    const categoriesSnapshot = await db.collection('categories').get();
    let categoriesCount = 0;
    
    for (const doc of categoriesSnapshot.docs) {
      const category = { id: doc.id, ...doc.data() };
      
      if (category.image && category.image.trim() !== '') {
        const filename = await downloadImage(category.image, 'categories');
        if (filename) {
          urlMap[category.image] = filename;
          categoriesCount++;
        }
      }
    }
    
    console.log(`\n✅ Descargadas ${categoriesCount} imágenes de categorías`);
    
    // 3. Descargar imágenes de testimonios
    console.log('\n👤 Procesando testimonios...');
    const testimoniosSnapshot = await db.collection('testimonios').get();
    let testimoniosCount = 0;
    
    for (const doc of testimoniosSnapshot.docs) {
      const testimonio = { id: doc.id, ...doc.data() };
      
      if (testimonio.imagenUrl && testimonio.imagenUrl.trim() !== '') {
        const filename = await downloadImage(testimonio.imagenUrl, 'testimonials');
        if (filename) {
          urlMap[testimonio.imagenUrl] = filename;
          testimoniosCount++;
        }
      }
    }
    
    console.log(`\n✅ Descargadas ${testimoniosCount} imágenes de testimonios`);
    
    // Guardar el mapeo URL -> nombre de archivo
    fs.writeFileSync(
      path.join(DOWNLOAD_FOLDER, 'url_mapping.json'),
      JSON.stringify(urlMap, null, 2)
    );
    
    console.log('\n📊 Resumen de descargas:');
    console.log(`📦 Productos: ${productsCount} imágenes`);
    console.log(`📂 Categorías: ${categoriesCount} imágenes`);
    console.log(`👤 Testimonios: ${testimoniosCount} imágenes`);
    console.log(`📝 Total: ${Object.keys(urlMap).length} imágenes`);
    console.log(`\n✅ Proceso completado. Las imágenes se guardaron en la carpeta ${DOWNLOAD_FOLDER}`);
    console.log(`✅ Mapa de URLs guardado en ${DOWNLOAD_FOLDER}/url_mapping.json`);
    
  } catch (error) {
    console.error('Error en el proceso principal:', error);
  } finally {
    process.exit(0);
  }
}

main();
