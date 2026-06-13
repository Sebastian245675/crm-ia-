// update-image-urls.js
// Script para actualizar URLs de imágenes en la base de datos Firebase

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Configuraciones
const OLD_BASE_URL = 'https://res.cloudinary.com/djyrschvm/image/upload/v1754395448/';
const NEW_BASE_URL = 'https://regalaalgosrl.com/imagenes/';
const DRY_RUN = false; // Cambiar a false para realizar las actualizaciones reales

// Configurar Firebase Admin
try {
  // Necesitarás crear un archivo serviceAccountKey.json desde Firebase Console
  // Proyecto > Configuración > Cuentas de servicio > Generar nueva clave privada
  const serviceAccount = require(path.join(PROJECT_ROOT, 'serviceAccountKey.json'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('❌ Error al inicializar Firebase Admin:');
  console.error('   Asegúrate de tener un archivo serviceAccountKey.json válido en la carpeta del proyecto.');
  console.error('   Puedes generarlo desde Firebase Console > Configuración del proyecto > Cuentas de servicio');
  console.error('\nDetalles del error:', error);
  process.exit(1);
}

const db = admin.firestore();

// Función para actualizar una URL
function updateUrl(url) {
  if (!url || typeof url !== 'string') return url;
  return url.replace(OLD_BASE_URL, NEW_BASE_URL);
}

// Función para mostrar el progreso
function showProgress(current, total, message) {
  const percentage = Math.round((current / total) * 100);
  process.stdout.write(`\r${message}: ${current}/${total} (${percentage}%) `);
  if (current === total) console.log('✅');
}

// Función principal para actualizar todas las imágenes
async function updateAllImageUrls() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              ACTUALIZACIÓN DE URLs DE IMÁGENES                 ║
╠════════════════════════════════════════════════════════════════╣
║ Cambiando:                                                     ║
║ DE: ${OLD_BASE_URL}        ║
║ A:  ${NEW_BASE_URL}                        ║
${DRY_RUN ? '║ MODO SIMULACIÓN: No se realizarán cambios reales            ║' : '║ MODO REAL: Se actualizarán las URLs en la base de datos      ║'}
╚════════════════════════════════════════════════════════════════╝
`);

  // Estadísticas
  const stats = {
    totalCollections: 0,
    totalDocuments: 0,
    totalUrlsUpdated: 0,
    collectionStats: {},
    errors: []
  };

  try {
    // 1. Actualizar productos
    console.log('\n📦 Procesando colección "products"...');
    
    const productsSnapshot = await db.collection('products').get();
    stats.totalDocuments += productsSnapshot.size;
    stats.collectionStats['products'] = { documents: productsSnapshot.size, urlsUpdated: 0 };
    
    let productCounter = 0;
    
    for (const doc of productsSnapshot.docs) {
      productCounter++;
      showProgress(productCounter, productsSnapshot.size, 'Procesando productos');
      
      const product = doc.data();
      let urlsUpdated = 0;
      let needsUpdate = false;
      
      // Imagen principal
      if (product.image && product.image.includes(OLD_BASE_URL)) {
        product.image = updateUrl(product.image);
        needsUpdate = true;
        urlsUpdated++;
      }
      
      // Imágenes adicionales
      if (product.additionalImages && Array.isArray(product.additionalImages)) {
        for (let i = 0; i < product.additionalImages.length; i++) {
          if (product.additionalImages[i] && product.additionalImages[i].includes(OLD_BASE_URL)) {
            product.additionalImages[i] = updateUrl(product.additionalImages[i]);
            needsUpdate = true;
            urlsUpdated++;
          }
        }
      }
      
      // Colores con imágenes
      if (product.colors && Array.isArray(product.colors)) {
        for (let i = 0; i < product.colors.length; i++) {
          if (product.colors[i] && product.colors[i].image && product.colors[i].image.includes(OLD_BASE_URL)) {
            product.colors[i].image = updateUrl(product.colors[i].image);
            needsUpdate = true;
            urlsUpdated++;
          }
        }
      }
      
      // Actualizar el documento si es necesario
      if (needsUpdate && !DRY_RUN) {
        try {
          await db.collection('products').doc(doc.id).update(product);
          stats.totalUrlsUpdated += urlsUpdated;
          stats.collectionStats['products'].urlsUpdated += urlsUpdated;
        } catch (error) {
          stats.errors.push(`Error al actualizar producto ${doc.id}: ${error.message}`);
          console.error(`\n❌ Error al actualizar producto ${doc.id}:`, error);
        }
      } else if (needsUpdate) {
        // Simulación
        stats.totalUrlsUpdated += urlsUpdated;
        stats.collectionStats['products'].urlsUpdated += urlsUpdated;
      }
    }

    // 2. Actualizar categorías
    console.log('\n📂 Procesando colección "categories"...');
    
    const categoriesSnapshot = await db.collection('categories').get();
    stats.totalDocuments += categoriesSnapshot.size;
    stats.collectionStats['categories'] = { documents: categoriesSnapshot.size, urlsUpdated: 0 };
    
    let categoryCounter = 0;
    
    for (const doc of categoriesSnapshot.docs) {
      categoryCounter++;
      showProgress(categoryCounter, categoriesSnapshot.size, 'Procesando categorías');
      
      const category = doc.data();
      let needsUpdate = false;
      let urlsUpdated = 0;
      
      // Imagen de categoría
      if (category.image && category.image.includes(OLD_BASE_URL)) {
        category.image = updateUrl(category.image);
        needsUpdate = true;
        urlsUpdated++;
      }
      
      // Actualizar el documento si es necesario
      if (needsUpdate && !DRY_RUN) {
        try {
          await db.collection('categories').doc(doc.id).update(category);
          stats.totalUrlsUpdated += urlsUpdated;
          stats.collectionStats['categories'].urlsUpdated += urlsUpdated;
        } catch (error) {
          stats.errors.push(`Error al actualizar categoría ${doc.id}: ${error.message}`);
          console.error(`\n❌ Error al actualizar categoría ${doc.id}:`, error);
        }
      } else if (needsUpdate) {
        // Simulación
        stats.totalUrlsUpdated += urlsUpdated;
        stats.collectionStats['categories'].urlsUpdated += urlsUpdated;
      }
    }

    // 3. Actualizar testimonios
    console.log('\n👤 Procesando colección "testimonios"...');
    
    const testimoniosSnapshot = await db.collection('testimonios').get();
    stats.totalDocuments += testimoniosSnapshot.size;
    stats.collectionStats['testimonios'] = { documents: testimoniosSnapshot.size, urlsUpdated: 0 };
    
    let testimonioCounter = 0;
    
    for (const doc of testimoniosSnapshot.docs) {
      testimonioCounter++;
      showProgress(testimonioCounter, testimoniosSnapshot.size, 'Procesando testimonios');
      
      const testimonio = doc.data();
      let needsUpdate = false;
      let urlsUpdated = 0;
      
      // Imagen de testimonio
      if (testimonio.imagenUrl && testimonio.imagenUrl.includes(OLD_BASE_URL)) {
        testimonio.imagenUrl = updateUrl(testimonio.imagenUrl);
        needsUpdate = true;
        urlsUpdated++;
      }
      
      // Actualizar el documento si es necesario
      if (needsUpdate && !DRY_RUN) {
        try {
          await db.collection('testimonios').doc(doc.id).update(testimonio);
          stats.totalUrlsUpdated += urlsUpdated;
          stats.collectionStats['testimonios'].urlsUpdated += urlsUpdated;
        } catch (error) {
          stats.errors.push(`Error al actualizar testimonio ${doc.id}: ${error.message}`);
          console.error(`\n❌ Error al actualizar testimonio ${doc.id}:`, error);
        }
      } else if (needsUpdate) {
        // Simulación
        stats.totalUrlsUpdated += urlsUpdated;
        stats.collectionStats['testimonios'].urlsUpdated += urlsUpdated;
      }
    }

    // 4. Verificar otras colecciones que puedan tener imágenes
    const collections = ['banners', 'carousel', 'config', 'info', 'users'];
    
    for (const collectionName of collections) {
      try {
        console.log(`\n🔍 Buscando imágenes en colección "${collectionName}"...`);
        
        const snapshot = await db.collection(collectionName).get();
        stats.totalDocuments += snapshot.size;
        stats.collectionStats[collectionName] = { documents: snapshot.size, urlsUpdated: 0 };
        
        if (snapshot.empty) {
          console.log(`   No se encontraron documentos en "${collectionName}"`);
          continue;
        }
        
        let counter = 0;
        
        for (const doc of snapshot.docs) {
          counter++;
          showProgress(counter, snapshot.size, `Procesando ${collectionName}`);
          
          const data = doc.data();
          let needsUpdate = false;
          let urlsUpdated = 0;
          
          // Buscar y reemplazar URLs en todo el documento de forma recursiva
          const processObject = (obj) => {
            if (!obj || typeof obj !== 'object') return 0;
            
            let count = 0;
            
            for (const key in obj) {
              if (typeof obj[key] === 'string' && obj[key].includes(OLD_BASE_URL)) {
                obj[key] = updateUrl(obj[key]);
                needsUpdate = true;
                count++;
              } else if (typeof obj[key] === 'object') {
                count += processObject(obj[key]);
              }
            }
            
            return count;
          };
          
          urlsUpdated = processObject(data);
          
          // Actualizar el documento si es necesario
          if (needsUpdate && !DRY_RUN) {
            try {
              await db.collection(collectionName).doc(doc.id).update(data);
              stats.totalUrlsUpdated += urlsUpdated;
              stats.collectionStats[collectionName].urlsUpdated += urlsUpdated;
            } catch (error) {
              stats.errors.push(`Error al actualizar ${collectionName} ${doc.id}: ${error.message}`);
              console.error(`\n❌ Error al actualizar ${collectionName} ${doc.id}:`, error);
            }
          } else if (needsUpdate) {
            // Simulación
            stats.totalUrlsUpdated += urlsUpdated;
            stats.collectionStats[collectionName].urlsUpdated += urlsUpdated;
          }
        }
      } catch (error) {
        console.log(`   Omitiendo colección "${collectionName}": ${error.message}`);
      }
    }
    
    // Generar informe
    console.log('\n\n📊 INFORME DE ACTUALIZACIÓN');
    console.log('══════════════════════════\n');
    console.log(`Modo: ${DRY_RUN ? '🔍 SIMULACIÓN (no se realizaron cambios)' : '✅ REAL (se actualizaron las URLs)'}`);
    console.log(`URLs procesadas: ${stats.totalDocuments} documentos en ${Object.keys(stats.collectionStats).length} colecciones`);
    console.log(`URLs actualizadas: ${stats.totalUrlsUpdated} imágenes\n`);
    
    console.log('Desglose por colección:');
    for (const [collection, data] of Object.entries(stats.collectionStats)) {
      console.log(`- ${collection}: ${data.urlsUpdated} URLs actualizadas de ${data.documents} documentos`);
    }
    
    if (stats.errors.length > 0) {
      console.log(`\n❌ Se encontraron ${stats.errors.length} errores durante la actualización:`);
      stats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    // Guardar informe en archivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFilename = `image_urls_update_report_${timestamp}.json`;
    
    fs.writeFileSync(
      reportFilename,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        mode: DRY_RUN ? 'simulation' : 'real',
        oldBaseUrl: OLD_BASE_URL,
        newBaseUrl: NEW_BASE_URL,
        stats
      }, null, 2)
    );
    
    console.log(`\n✅ Informe guardado en ${reportFilename}`);
    
    if (DRY_RUN) {
      console.log('\n🔍 Este fue un modo de SIMULACIÓN. Ningún cambio se realizó en la base de datos.');
      console.log('   Para realizar los cambios realmente, cambia DRY_RUN = false en el script y ejecútalo nuevamente.');
    } else {
      console.log('\n✅ Actualización completada con éxito. Todas las URLs han sido actualizadas.');
    }
    
  } catch (error) {
    console.error('\n❌ Error durante la actualización:', error);
  } finally {
    process.exit(0);
  }
}

// Iniciar el proceso
updateAllImageUrls();
