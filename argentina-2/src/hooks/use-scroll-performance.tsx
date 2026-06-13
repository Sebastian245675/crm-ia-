import { useEffect, useState } from 'react';

/**
 * Hook para optimizar el rendimiento durante el scroll
 * Deshabilita efectos pesados mientras el usuario está haciendo scroll
 */
export const useScrollPerformance = () => {
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolling(true);
          
          // Limpiar timeout anterior
          if (scrollTimeout) {
            clearTimeout(scrollTimeout);
          }
          
          // Después de 150ms sin scroll, considerar que terminó
          const timeout = setTimeout(() => {
            setIsScrolling(false);
          }, 150);
          
          setScrollTimeout(timeout);
          ticking = false;
        });
        
        ticking = true;
      }
    };

    // Usar passive listener para mejor performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [scrollTimeout]);

  return isScrolling;
};

/**
 * Hook para reducir animaciones durante scroll en dispositivos móviles
 */
export const useReduceMotionDuringScroll = () => {
  const isScrolling = useScrollPerformance();
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);

  useEffect(() => {
    // Solo reducir en móviles o dispositivos de bajos recursos
    const isMobile = window.innerWidth < 768;
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const deviceMemory = (navigator as any).deviceMemory || 4;
    const isLowEndDevice = hardwareConcurrency < 4 || deviceMemory < 4;

    if ((isMobile || isLowEndDevice) && isScrolling) {
      setShouldReduceMotion(true);
      
      // Aplicar clase al body
      document.body.classList.add('reducing-motion');
      
      return () => {
        document.body.classList.remove('reducing-motion');
      };
    } else {
      setShouldReduceMotion(false);
      document.body.classList.remove('reducing-motion');
    }
  }, [isScrolling]);

  return shouldReduceMotion;
};

