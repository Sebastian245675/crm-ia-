/**
 * Utilidades para el manejo y optimización de imágenes
 */

/**
 * Verifica si el navegador soporta imágenes WebP
 */
export async function supportsWebp(): Promise<boolean> {
  if (!self.createImageBitmap) return false;
  
  const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
  const blob = await fetch(webpData).then(r => r.blob());
  
  try {
    return createImageBitmap(blob).then(() => true, () => false);
  } catch (e) {
    return false;
  }
}

/**
 * Genera una versión reducida de una imagen para usar como placeholder
 * @param src URL de la imagen original
 * @returns URL en base64 del placeholder
 */
export async function generatePlaceholder(src: string): Promise<string> {
  try {
    // Crear un canvas pequeño para generar el placeholder
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('No se pudo obtener el contexto 2D del canvas');
    }
    
    // Cargar la imagen original
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Promesa para esperar a que la imagen cargue
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });
    
    // Dibujar la imagen en el canvas pequeño
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
    
    // Convertir a base64 con calidad baja
    return canvas.toDataURL('image/jpeg', 0.1);
  } catch (error) {
    console.error('Error generando placeholder:', error);
    return '';
  }
}

/**
 * Convierte una URL de imagen al formato WebP si el navegador lo soporta
 * @param url URL original de la imagen
 * @param quality Calidad de la imagen WebP (0-100)
 * @returns URL optimizada
 */
export function getOptimizedImageUrl(url: string, quality = 75): string {
  // Validar URL
  if (!url || typeof url !== 'string') return '';
  
  // Si la URL ya es WebP o es una URL de datos, la dejamos igual
  if (url.includes('.webp') || url.startsWith('data:')) {
    return url;
  }

  // Si es una URL relativa que apunta a nuestras carpetas webp
  if (url.includes('/webp-') || url.includes('/webp/')) {
    return url;
  }

  // Para URLs de Firebase Storage
  if (url.includes('firebasestorage.googleapis.com')) {
    // Firebase permite cambiar el formato con parámetros
    if (url.includes('?')) {
      return `${url}&fm=webp&q=${quality}`;
    } else {
      return `${url}?fm=webp&q=${quality}`;
    }
  }

  // Para URLs normales, intentar reemplazar la extensión
  if (url.match(/\.(jpe?g|png)(\?.*)?$/i)) {
    // Si tiene parámetros de consulta
    if (url.includes('?')) {
      const [baseUrl, params] = url.split('?');
      const newBaseUrl = baseUrl.replace(/\.(jpe?g|png)$/i, '.webp');
      return `${newBaseUrl}?${params}`;
    } else {
      // Sin parámetros
      return url.replace(/\.(jpe?g|png)$/i, '.webp');
    }
  }

  // Si no podemos optimizar, devolver la original
  return url;
}

/**
 * Función para redimensionar una imagen en el navegador
 * @param file Archivo de imagen
 * @param maxWidth Ancho máximo deseado
 * @param maxHeight Alto máximo deseado
 * @param quality Calidad de la imagen (0-1)
 * @returns Blob de la imagen redimensionada
 */
export async function resizeImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const image = new Image();
      image.onload = () => {
        // Calcular dimensiones manteniendo la proporción
        let width = image.width;
        let height = image.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto 2D del canvas'));
          return;
        }
        
        ctx.drawImage(image, 0, 0, width, height);
        
        // Convertir a WebP si es posible
        supportsWebp().then(hasWebP => {
          const format = hasWebP ? 'image/webp' : 'image/jpeg';
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('No se pudo crear el blob'));
                return;
              }
              resolve(blob);
            },
            format,
            quality
          );
        });
      };
      
      image.onerror = () => {
        reject(new Error('Error al cargar la imagen'));
      };
      
      if (typeof readerEvent.target?.result === 'string') {
        image.src = readerEvent.target.result;
      } else {
        reject(new Error('Error al leer el archivo'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsDataURL(file);
  });
}

export default {
  supportsWebp,
  generatePlaceholder,
  getOptimizedImageUrl,
  resizeImage
};
