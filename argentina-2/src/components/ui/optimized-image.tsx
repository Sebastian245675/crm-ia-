import React, { useState, useEffect, useRef, memo } from 'react';
import { cn } from '@/lib/utils';
import imageCache from '@/lib/imageCache';
import { shouldApplyExtraOptimizations } from '@/lib/browser-support';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  loading?: 'eager' | 'lazy';
  className?: string;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Componente OptimizedImage - Mejora el rendimiento de carga de imágenes
 * 
 * Características:
 * - Lazy loading mediante IntersectionObserver
 * - Soporte para WebP automático con fallback
 * - Caché de imágenes usando IndexedDB
 * - Placeholder y efecto blur durante la carga
 * - Optimización para dispositivos y navegadores antiguos
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  loading: propLoading,
  className,
  placeholder = 'empty',
  blurDataURL,
  quality = 75,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Determinar el nivel de optimización
  useEffect(() => {
    shouldApplyExtraOptimizations().then(shouldOptimize => {
      setIsLowEndDevice(shouldOptimize);
    });
  }, []);

  // Manejar el lazy loading
  useEffect(() => {
    // Si la imagen es prioritaria o el navegador no soporta IntersectionObserver,
    // cargamos inmediatamente
    if (priority || propLoading === 'eager') {
      loadImage();
      return;
    }

    // No usar IntersectionObserver en dispositivos antiguos
    if (isLowEndDevice) {
      const timeout = setTimeout(() => loadImage(), 500);
      return () => clearTimeout(timeout);
    }

    // Para dispositivos modernos, usamos IntersectionObserver
    if ('IntersectionObserver' in window && imgRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            loadImage();
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        });
      }, {
        rootMargin: '200px', // Precargar cuando la imagen esté a 200px de aparecer
        threshold: 0.01
      });

      observerRef.current.observe(imgRef.current);
    } else {
      // Fallback para navegadores que no soportan IntersectionObserver
      loadImage();
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, isLowEndDevice, priority, propLoading]);

  // Función para cargar la imagen con caché
  const loadImage = async () => {
    if (!src) {
      setIsError(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);

    try {
      // Intentamos obtener la imagen desde la caché
      const cachedImage = await imageCache.getImage(src);

      if (cachedImage) {
        // Si está en caché, la usamos directamente
        const objectURL = URL.createObjectURL(cachedImage);
        setImageSrc(objectURL);
        setIsLoading(false);
        onLoad?.();
        return;
      }

      // Si no está en caché, la cargamos de la red
      const imageUrl = getOptimizedImageUrl(src);
      setImageSrc(imageUrl);

      // Guardamos en caché para futuras visitas
      fetch(imageUrl)
        .then(response => response.blob())
        .then(blob => {
          imageCache.cacheImage(src, blob);
        })
        .catch(err => console.error('Error caching image:', err));

    } catch (error) {
      console.error('Error loading image:', error);
      setImageSrc(src); // Fallback al src original
      setIsError(true);
    }
  };

  // Convertir URL a formato WebP si el navegador lo soporta
  const getOptimizedImageUrl = (url: string): string => {
    // Si la URL ya es WebP o es una URL de datos, la dejamos igual
    if (url.includes('.webp') || url.startsWith('data:')) {
      return url;
    }

    // Si es una URL relativa que apunta a nuestras carpetas webp
    if (url.includes('/webp-') || url.includes('/webp/')) {
      return url;
    }

    // Para URLs de Firebase Storage o URLs externas
    // Intentamos reemplazar la extensión por .webp o añadir parámetro
    if (url.match(/\.(jpe?g|png)(\?.*)?$/i)) {
      // Buscar URL equivalente en webp
      const baseName = url.split('/').pop()?.split('.')[0];
      if (baseName) {
        // Buscar en nuestras carpetas de webp
        const possibleWebpUrl = `/webp-images/products/${baseName}.webp`;
        // Aquí podríamos verificar si el archivo existe, pero por ahora
        // simplemente devolvemos la URL original
      }

      // Si es una URL con parámetros, añadimos formato webp
      if (url.includes('?')) {
        return `${url}&fm=webp&q=${quality}`;
      } else {
        // Si es una URL simple, tratamos de cambiar la extensión
        return url.replace(/\.(jpe?g|png)$/i, '.webp');
      }
    }

    return url;
  };

  // Manejadores de eventos
  const handleImageLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleImageError = () => {
    setIsLoading(false);
    setIsError(true);
    setImageSrc(src); // Fallback a la imagen original
    onError?.();
  };

  // Clases para los distintos estados
  const imageClasses = cn(
    className,
    {
      'opacity-0': isLoading,
      'opacity-100 transition-opacity duration-500': !isLoading && !isError,
    }
  );

  const placeholderClasses = cn(
    'absolute inset-0 bg-gray-200',
    {
      'blur-sm': placeholder === 'blur',
    }
  );

  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      style={{ 
        width: width ? `${width}px` : '100%', 
        height: height ? `${height}px` : 'auto'
      }}
    >
      {/* Placeholder durante la carga */}
      {isLoading && (
        <div 
          className={placeholderClasses}
          style={{
            backgroundImage: blurDataURL ? `url(${blurDataURL})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}
      
      {/* Imagen principal */}
      <img
        ref={imgRef}
        src={imageSrc || (isLowEndDevice ? src : undefined)}
        alt={alt}
        width={width}
        height={height}
        className={imageClasses}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading={priority ? 'eager' : 'lazy'}
        {...props}
      />
      
      {/* Indicador de error */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <span className="text-red-500">Error al cargar la imagen</span>
        </div>
      )}
    </div>
  );
};

// Usar memo para prevenir re-renders innecesarios
export default memo(OptimizedImage);
