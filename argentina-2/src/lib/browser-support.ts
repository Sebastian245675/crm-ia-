/**
 * Browser Support Detection Utility
 * 
 * Este módulo proporciona funciones para detectar si el navegador del usuario
 * soporta características modernas de web necesarias para un rendimiento óptimo.
 */

/**
 * Detecta si el navegador soporta IntersectionObserver (usado para lazy loading)
 */
export const supportsIntersectionObserver = (): boolean => {
  return 'IntersectionObserver' in window && 
         'IntersectionObserverEntry' in window && 
         'intersectionRatio' in window.IntersectionObserverEntry.prototype;
};

/**
 * Detecta si el navegador soporta imágenes WebP
 */
export const supportsWebp = async (): Promise<boolean> => {
  if (!self.createImageBitmap) return false;
  
  const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
  const blob = await fetch(webpData).then(r => r.blob());
  
  try {
    return createImageBitmap(blob).then(() => true, () => false);
  } catch (e) {
    return false;
  }
};

/**
 * Detecta si el navegador es antiguo o tiene limitaciones significativas
 */
export const isLegacyBrowser = (): boolean => {
  // Verificamos características que indiquen un navegador moderno
  const hasModernFeatures = 
    'Promise' in window && 
    'fetch' in window && 
    'Symbol' in window && 
    'Map' in window &&
    'requestAnimationFrame' in window;
  
  // IE detection
  const isIE = /*@cc_on!@*/false || !!(document as any).documentMode;
  
  // Versiones antiguas de Edge (EdgeHTML, no Chromium)
  const isOldEdge = !isIE && !!(window as any).StyleMedia;
  
  return !hasModernFeatures || isIE || isOldEdge;
};

/**
 * Detecta si el dispositivo probablemente tiene recursos limitados
 * (memoria o CPU) basado en User-Agent y otras señales
 */
export const isLowEndDevice = (): boolean => {
  const memory = (navigator as any).deviceMemory;
  if (memory && memory <= 2) return true;
  
  const cpuCores = navigator.hardwareConcurrency;
  if (cpuCores && cpuCores <= 2) return true;
  
  // User agent strings comunes en dispositivos de gama baja
  const ua = navigator.userAgent.toLowerCase();
  if (
    ua.includes('android 4.') || 
    ua.includes('android 5.0') || 
    ua.includes('mobile') && (ua.includes('jio') || ua.includes('micromax'))
  ) {
    return true;
  }
  
  return false;
};

/**
 * Devuelve un objeto con todos los resultados de detección
 */
export const getBrowserCapabilities = async (): Promise<{
  supportsWebp: boolean;
  supportsIntersectionObserver: boolean;
  isLegacyBrowser: boolean;
  isLowEndDevice: boolean;
}> => {
  const webpSupport = await supportsWebp();
  
  return {
    supportsWebp: webpSupport,
    supportsIntersectionObserver: supportsIntersectionObserver(),
    isLegacyBrowser: isLegacyBrowser(),
    isLowEndDevice: isLowEndDevice()
  };
};

/**
 * Función principal para determinar si debemos aplicar optimizaciones extra
 * para navegadores/dispositivos antiguos o de bajos recursos
 */
export const shouldApplyExtraOptimizations = async (): Promise<boolean> => {
  const capabilities = await getBrowserCapabilities();
  
  // Si cualquiera de estas condiciones es verdadera, aplicamos optimizaciones
  return capabilities.isLegacyBrowser || 
         capabilities.isLowEndDevice || 
         !capabilities.supportsIntersectionObserver;
};

export default {
  supportsIntersectionObserver,
  supportsWebp,
  isLegacyBrowser,
  isLowEndDevice,
  getBrowserCapabilities,
  shouldApplyExtraOptimizations
};
