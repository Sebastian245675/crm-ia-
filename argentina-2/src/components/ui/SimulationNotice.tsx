import React, { useEffect } from 'react';
import { simulatedDB } from '@/lib/simulatedDB';
import { toast } from '@/hooks/use-toast';

export const SimulationNotice: React.FC = () => {
  useEffect(() => {
    const checkSimulationMode = () => {
      if (simulatedDB.isSimulationActive()) {
        toast({
          title: "🔔 Modo de simulación activado",
          description: "La aplicación está usando datos simulados debido a problemas de permisos con Firebase. Configura las reglas de seguridad para desactivar este modo.",
          variant: "destructive",
          duration: 10000
        });
      }
    };
    
    // Comprobar después de un breve retraso para dar tiempo a Firebase a inicializarse
    const timer = setTimeout(checkSimulationMode, 2000);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);
  
  return null;  // Este componente no renderiza nada visible
};
