/**
 * Translation Blocker Utility
 * 
 * Este módulo proporciona funciones para prevenir la traducción automática
 * del navegador, lo cual puede causar problemas de visualización en la interfaz.
 */

/**
 * Previene la traducción automática del navegador añadiendo metadatos
 * y clases a los elementos HTML.
 */
export const preventAutomaticTranslation = (): void => {
  // Agregar meta tag para prevenir traducción de Google
  const existingMetaTranslate = document.querySelector('meta[name="google"]');
  if (!existingMetaTranslate) {
    const metaTag = document.createElement('meta');
    metaTag.name = 'google';
    metaTag.content = 'notranslate';
    document.head.appendChild(metaTag);
  }
  
  // Agregar clase notranslate al html
  document.documentElement.classList.add('notranslate');
  
  // Establecer attribute translate="no" en elementos clave
  const elementsToProtect = [
    ...document.querySelectorAll('.admin-panel'),
    ...document.querySelectorAll('.dropdown-menu'),
    ...document.querySelectorAll('button'),
    ...document.querySelectorAll('input'),
    ...document.querySelectorAll('select'),
    document.body
  ];
  
  elementsToProtect.forEach(el => {
    if (el) {
      (el as HTMLElement).setAttribute('translate', 'no');
    }
  });
  
  // Definir CSS para mejor soporte
  const style = document.createElement('style');
  style.textContent = `
    .notranslate {
      translate: no;
    }
    
    [translate="no"] {
      translate: no;
    }
    
    /* Prevenir cambios de diseño durante la traducción */
    .admin-panel, .dropdown-menu, button {
      white-space: nowrap;
      translate: no;
    }
  `;
  document.head.appendChild(style);
};

/**
 * Función para detectar si la página está siendo traducida automáticamente
 */
export const isPageBeingTranslated = (): boolean => {
  // Detectar traducción de Google
  if (window.navigator.language !== document.documentElement.lang) {
    return true;
  }
  
  // Detectar herramienta de traducción de Google
  if (document.documentElement.classList.contains('translated-rtl') || 
      document.documentElement.classList.contains('translated-ltr')) {
    return true;
  }
  
  // Detectar elemento de iframe de traducción de Google
  if (document.getElementById('google_translate_element')) {
    return true;
  }
  
  return false;
};

/**
 * Detectar y resolver problemas de traducción
 */
export const handleTranslationIssues = (): void => {
  preventAutomaticTranslation();
  
  if (isPageBeingTranslated()) {
    console.warn('Se detectó traducción automática. Algunos elementos pueden no funcionar correctamente.');
    
    // Intentar recargar elementos críticos si es necesario
    const criticalElements = document.querySelectorAll('.critical-ui-element');
    criticalElements.forEach(el => {
      try {
        // Forzar actualización del elemento
        const parent = el.parentNode;
        if (parent) {
          const clone = el.cloneNode(true);
          parent.replaceChild(clone, el);
        }
      } catch (e) {
        console.error('Error al restaurar elemento crítico:', e);
      }
    });
  }
};

export default {
  preventAutomaticTranslation,
  isPageBeingTranslated,
  handleTranslationIssues
};
