import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { recordWebsiteVisit } from '@/lib/product-analytics';

/**
 * Componente que rastrea las visitas generales al sitio web
 * Se monta una vez y registra cada cambio de página
 */
export const WebsiteVisitTracker = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Registrar visita cuando cambia la ubicación, pero con un ligero retraso para no bloquear el hilo principal
    const pageUrl = window.location.href;
    const pageTitle = document.title;

    const recordVisit = () => {
      recordWebsiteVisit(
        pageUrl,
        pageTitle,
        user?.id,
        user?.email || null,
        user?.name || null
      );
    };

    // Usar requestIdleCallback o setTimeout para diferir el registro
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => recordVisit(), { timeout: 2000 });
    } else {
      setTimeout(recordVisit, 2000);
    }
  }, [location.pathname, user?.id, user?.email, user?.name]);

  return null; // Este componente no renderiza nada
};
