import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Heart, Sparkles } from 'lucide-react';

const SimpleSplashScreen = () => {
  const [loading, setLoading] = useState(true);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Simulación de carga más simple
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (loading) {
      interval = setInterval(() => {
        setLoadingProgress(prev => {
          const newProgress = prev + (Math.random() * 3 + 1);
          
          if (newProgress >= 100) {
            clearInterval(interval);
            setTimeout(() => setLoading(false), 500);
            return 100;
          }
          return newProgress;
        });
      }, 80);
    }
    
    return () => clearInterval(interval as NodeJS.Timeout);
  }, [loading]);

  // Finalizar la animación después de un tiempo
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setAnimationComplete(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Pantalla de carga simplificada
  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-blue-950 to-indigo-950">
        {/* Logo */}
        <motion.div 
          className="w-32 h-32 mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-full h-full flex flex-col items-center justify-center">
            <svg className="w-20 h-20 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </div>
        </motion.div>
        
        {/* Texto */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">OmniShop</h1>
          <p className="text-blue-200">Cargando experiencia...</p>
        </motion.div>
        
        {/* Barra de progreso */}
        <div className="w-64 h-2 bg-blue-900 rounded-full mb-4 overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
        
        {/* Indicador de progreso */}
        <div className="flex items-center text-blue-200">
          <Loader2 className="animate-spin mr-2" size={16} />
          <span>{Math.round(loadingProgress)}%</span>
        </div>
      </div>
    );
  }

  // Pantalla de bienvenida simplificada
  return (
    <AnimatePresence>
      {!animationComplete && (
        <motion.div 
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo con animación simple */}
          <motion.div
            className="mb-6"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-2">
              <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </div>
          </motion.div>
          
          {/* Mensaje de bienvenida */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-4xl font-bold text-white mb-2">OmniShop</h1>
            <p className="text-blue-200 flex items-center justify-center">
              Tu Tienda Online Multirrubro <Sparkles className="ml-2 w-4 h-4 text-yellow-300" />
            </p>
          </motion.div>
          
          {/* Botón para continuar */}
          <motion.button
            className="px-6 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => setAnimationComplete(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Entrar →
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SimpleSplashScreen;
