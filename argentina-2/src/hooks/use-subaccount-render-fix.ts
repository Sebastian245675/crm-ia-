import { useEffect, useState } from 'react';

/**
 * Hook que monitorea y resuelve problemas de renderizado específicos para las subcuentas
 * @param isSubAccount - Indica si el usuario actual es una subcuenta
 * @returns Un objeto con métodos útiles para solucionar problemas
 */
export const useSubAccountRenderFix = (isSubAccount: boolean) => {
  const [hasRenderIssues, setHasRenderIssues] = useState(false);

  // Detección y prevención de problemas de traducción
  useEffect(() => {
    if (!isSubAccount) return;
    
    // Añadir metaetiqueta para prevenir traducción automática
    const metaTranslate = document.createElement('meta');
    metaTranslate.setAttribute('name', 'google');
    metaTranslate.setAttribute('content', 'notranslate');
    document.head.appendChild(metaTranslate);
    
    // Añadir clases para prevenir traducción
    document.documentElement.classList.add('notranslate');
    document.body.classList.add('notranslate');
    
    // Detectar y resolver problemas específicos de visualización en subcuentas
    const detectRenderIssues = () => {
      // Verificar si hay elementos visibles en el panel de admin
      const adminPanelContent = document.querySelector('.admin-panel-content');
      const sidebar = document.querySelector('.admin-sidebar');
      
      // Si alguno de estos elementos críticos no está visible o tiene dimensiones incorrectas
      if (
        (adminPanelContent && (adminPanelContent as HTMLElement).offsetHeight < 10) ||
        (sidebar && (sidebar as HTMLElement).offsetWidth < 10)
      ) {
        console.warn('[SubAccount Fix] Se detectaron problemas de renderizado en el panel de administración');
        setHasRenderIssues(true);
        
        // Intento de solución automática
        try {
          fixLayoutIssues();
        } catch (error) {
          console.error('[SubAccount Fix] Error al intentar solucionar problemas de diseño:', error);
        }
      } else {
        setHasRenderIssues(false);
      }
    };
    
    // Verificar después de que el componente se monte
    const timeoutId = setTimeout(detectRenderIssues, 1000);
    
    return () => {
      clearTimeout(timeoutId);
      // Limpiar meta etiqueta cuando el componente se desmonte
      const meta = document.querySelector('meta[name="google"]');
      if (meta && meta.parentNode) {
        meta.parentNode.removeChild(meta);
      }
    };
  }, [isSubAccount]);

  /**
   * Fuerza la reconstrucción del DOM para solucionar problemas de diseño
   */
  const fixLayoutIssues = () => {
    // Aplicar arreglos para restaurar la visualización
    const adminLayout = document.querySelector('.admin-layout');
    if (adminLayout) {
      // Forzar recálculo de diseño
      (adminLayout as HTMLElement).style.opacity = '0.99';
      setTimeout(() => {
        (adminLayout as HTMLElement).style.opacity = '1';
      }, 50);
      
      // Forzar recálculo de todas las tablas y listas
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        table.style.display = 'none';
        setTimeout(() => {
          table.style.display = '';
        }, 20);
      });
    }
  };

  /**
   * Reinicia manualmente la visualización si el usuario detecta problemas
   */
  const manualRefresh = () => {
    try {
      fixLayoutIssues();
      
      // Forzar la reconstrucción de componentes críticos
      const contentContainers = document.querySelectorAll('.critical-ui-container');
      contentContainers.forEach(container => {
        const parent = container.parentNode;
        if (parent) {
          const clone = container.cloneNode(true);
          parent.replaceChild(clone, container);
        }
      });
      
      setHasRenderIssues(false);
      
      return true;
    } catch (error) {
      console.error('[SubAccount Fix] Error durante refresh manual:', error);
      return false;
    }
  };

  // Devuelve utilidades útiles para componentes que usan este hook
  return {
    hasRenderIssues,
    manualRefresh,
    fixLayoutIssues
  };
};

export default useSubAccountRenderFix;
