import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Heart, Sparkles } from 'lucide-react';
import { CustomClock } from '@/components/ui/CustomClock';

// Animación hiper-realista 3D de persona dando un regalo
const SplashScreen = () => {
  const [loading, setLoading] = useState(true);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [giftOpened, setGiftOpened] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [spotlightX, setSpotlightX] = useState(0);
  const [spotlightY, setSpotlightY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Partículas 3D con profundidad y efectos visuales
  const particles = useRef(Array.from({ length: 80 }, () => {
    const depth = Math.random() * 3 + 0.5; // Factor de profundidad 3D (z-index)
    return {
      x: Math.random() * 100,
      y: Math.random() * 100,
      z: depth,
      size: (Math.random() * 10 + 4) / depth, // Tamaño inversamente proporcional a la profundidad
      blur: depth < 1 ? 3 : depth < 2 ? 1 : 0, // Desenfoque basado en profundidad
      color: [
        'rgba(251, 191, 36, 0.9)', // Amarillo
        'rgba(236, 72, 153, 0.9)', // Rosa
        'rgba(59, 130, 246, 0.9)', // Azul
        'rgba(239, 68, 68, 0.9)',  // Rojo
        'rgba(16, 185, 129, 0.9)', // Verde
        'rgba(139, 92, 246, 0.9)'  // Púrpura
      ][Math.floor(Math.random() * 6)],
      opacity: (1 / depth) * 0.8,
      duration: (Math.random() * 0.8 + 0.6) * depth,
      delay: Math.random() * 3,
      rotation: Math.random() * 360
    };
  }));
  
  // Referencias para animaciones avanzadas
  const headControls = useAnimation();
  const expressionControls = useAnimation();
  const giftBoxControls = useAnimation();
  const giftLidControls = useAnimation();
  const lightIntensity = useRef(0);

  // Efecto para el seguimiento del spotlight dinámico
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setSpotlightX(x);
        setSpotlightY(y);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Simulación de carga avanzada con múltiples etapas
  useEffect(() => {
    let interval: any;
    if (loading) {
      // Velocidades variables para la carga
      const speeds = [
        { threshold: 30, speed: 1.2 }, // Inicio rápido
        { threshold: 60, speed: 0.7 }, // Desaceleración en el medio
        { threshold: 85, speed: 0.4 }, // Más lento cerca del final
        { threshold: 95, speed: 0.2 }, // Muy lento al final
      ];

      interval = setInterval(() => {
        setLoadingProgress(prev => {
          // Determinar velocidad actual según el progreso
          const currentSpeed = speeds.find(s => prev < s.threshold)?.speed || 0.1;
          const increment = (Math.random() * 2 + 0.5) * currentSpeed;
          const newProgress = prev + increment;
          
          if (newProgress >= 100) {
            clearInterval(interval);
            
            // Secuencia coordenada de animaciones
            setTimeout(() => {
              setLoading(false);
              // Iniciar efectos visuales avanzados
              expressionControls.start({ 
                scaleY: [1, 0.5, 1], 
                transition: { duration: 0.6, repeat: 2 } 
              });
              setTimeout(() => {
                setShowParticles(true);
                // Animaciones pre-apertura del regalo
                headControls.start({
                  rotateZ: [0, -5, 0, 5, 0],
                  transition: { duration: 1.2 }
                });
              }, 300);
            }, 800);
            return 100;
          }
          return newProgress;
        });
      }, 80);
    }
    return () => clearInterval(interval);
  }, [loading, headControls, expressionControls]);

  // Secuencia de animación cinematográfica completa
  useEffect(() => {
    if (!loading) {
      // Primera secuencia - preparación
      setTimeout(() => {
        headControls.start({
          scale: [1, 1.03, 1],
          transition: { duration: 0.8 }
        });
      }, 800);
      
      // Segunda secuencia - apertura del regalo
      const timer1 = setTimeout(() => {
        setGiftOpened(true);
        
        // Secuencia coordinada de animaciones al abrir el regalo
        giftBoxControls.start({
          scale: [1, 1.15, 1.05],
          transition: { duration: 0.8, type: "spring" }
        });
        
        setTimeout(() => {
          // Expresión de sorpresa
          expressionControls.start({ 
            scaleY: [1, 1.5, 1.2], 
            scaleX: [1, 0.8, 1],
            transition: { duration: 0.5 } 
          });
          
          // Luz que intensifica en el momento de abrir
          lightIntensity.current = 2;
          setTimeout(() => {
            lightIntensity.current = 1;
          }, 800);
        }, 300);
      }, 1800);
      
      // Tercera secuencia - finalización
      const timer2 = setTimeout(() => setAnimationComplete(true), 5000); 
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [loading, headControls, expressionControls, giftBoxControls]);

  // Animación de carga hiperrealista con efectos cinematográficos
  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden">
        {/* Fondo dinámico con efecto de vórtice */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-purple-900 to-indigo-950 overflow-hidden">
          <motion.div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.3) 0%, transparent 60%)',
              filter: 'blur(40px)'
            }}
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 360],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ 
              duration: 15, 
              ease: "linear", 
              repeat: Infinity,
              repeatType: "reverse" 
            }}
          />
          
          {/* Partículas flotantes de fondo */}
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={`bg-particle-${i}`}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 4 + 1,
                height: Math.random() * 4 + 1,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.1,
                filter: 'blur(1px)'
              }}
              animate={{
                y: [0, -100 - Math.random() * 100],
                x: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 60],
                opacity: [Math.random() * 0.5 + 0.1, 0]
              }}
              transition={{
                duration: Math.random() * 10 + 5,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 5
              }}
            />
          ))}
        </div>

        {/* Contenedor principal con efectos de glassmorphism */}
        <div className="relative w-full max-w-4xl mx-auto z-10 px-6">
          <motion.div 
            className="relative w-80 h-80 md:w-96 md:h-96 mb-10 mx-auto"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          >
            {/* Efectos de luz pulsante */}
            <motion.div 
              className="absolute inset-0 rounded-full bg-blue-500/30"
              style={{ filter: 'blur(60px)' }}
              animate={{ 
                opacity: [0.4, 0.8, 0.4], 
                scale: [1, 1.1, 1] 
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Caja de regalo 3D avanzada */}
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
              <defs>
                <linearGradient id="boxGradTop" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
                
                <linearGradient id="boxGradSide" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#4338ca" />
                </linearGradient>
                
                <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f472b6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                
                <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                
                <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.3"/>
                </filter>
                
                <filter id="innerShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feOffset dx="0" dy="2"/>
                  <feGaussianBlur stdDeviation="2" result="offset-blur"/>
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                  <feFlood floodColor="black" floodOpacity="0.4" result="color"/>
                  <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                  <feComposite operator="over" in="shadow" in2="SourceGraphic"/> 
                </filter>
              </defs>
              
              {/* Caja 3D - Lados con iluminación dinámica */}
              <motion.g
                animate={{ 
                  rotateY: [0, 10, 0, -10, 0], 
                  rotateX: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 8, 
                  repeat: Infinity, 
                  ease: "easeInOut"
                }}
                style={{ transformOrigin: 'center center', filter: 'drop-shadow(0px 20px 30px rgba(0, 0, 0, 0.2))' }}
              >
                {/* Cuerpo de la caja */}
                <rect x="50" y="70" width="100" height="80" rx="8" 
                      fill="url(#boxGradSide)" 
                      filter="url(#innerShadow)" />
                      
                {/* Tapa de la caja con efecto 3D */}
                <motion.g
                  animate={{ y: [-2, 2, -2] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <rect x="45" y="55" width="110" height="25" rx="8" 
                        fill="url(#boxGradTop)" 
                        filter="url(#innerShadow)" />
                  
                  {/* Borde de la tapa para efecto 3D */}
                  <rect x="50" y="70" width="100" height="10" rx="4" 
                        fill="url(#boxGradTop)" />
                </motion.g>
                
                {/* Cinta vertical */}
                <motion.rect 
                  x="95" y="55" width="10" height="95" 
                  fill="url(#ribbonGrad)"
                  filter="url(#innerShadow)"
                  animate={{ 
                    y: [-1, 1, -1],
                    fillOpacity: [0.8, 1, 0.8] 
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                {/* Cinta horizontal */}
                <motion.rect 
                  x="50" y="100" width="100" height="10" 
                  fill="url(#ribbonGrad)"
                  filter="url(#innerShadow)"
                  animate={{ 
                    fillOpacity: [0.8, 1, 0.8],
                    y: [-1, 1, -1]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                
                {/* Adorno central */}
                <motion.circle 
                  cx="100" cy="100" r="12" 
                  fill="#f0abfc" 
                  stroke="#f472b6" 
                  strokeWidth="2"
                  filter="url(#glowEffect)"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    fillOpacity: [0.9, 1, 0.9]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                {/* Detalles decorativos */}
                <motion.circle 
                  cx="100" cy="100" r="6" 
                  fill="#d946ef" 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                
                {/* Reflejos de luz en la caja */}
                <motion.path 
                  d="M60,80 Q80,75 100,78 T140,85" 
                  stroke="rgba(255,255,255,0.4)" 
                  strokeWidth="2" 
                  fill="none"
                  animate={{ opacity: [0.2, 0.5, 0.2], y: [0, 2, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                
                {/* Partículas brillantes alrededor */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.circle
                    key={i}
                    cx={100 + Math.cos(i * Math.PI / 4) * 40}
                    cy={100 + Math.sin(i * Math.PI / 4) * 40}
                    r={Math.random() * 2 + 1}
                    fill="#fff"
                    animate={{ 
                      opacity: [0.5, 0.9, 0.5],
                      scale: [1, 1.5, 1],
                      r: [Math.random() * 2 + 1, Math.random() * 3 + 1.5, Math.random() * 2 + 1]
                    }}
                    transition={{ 
                      duration: Math.random() * 2 + 1, 
                      repeat: Infinity,
                      delay: Math.random() * 2 
                    }}
                  />
                ))}
              </motion.g>
              
              {/* Líneas de efecto de escáner */}
              <motion.line 
                x1="0" y1="100" x2="200" y2="100" 
                stroke="rgba(255,255,255,0.8)" 
                strokeWidth="1"
                strokeDasharray="3 6"
                animate={{ y: [0, 200], opacity: [0.1, 0.6, 0.1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            </svg>
          </motion.div>
        
          {/* Texto animado */}
          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <motion.div 
              className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-pink-300 via-blue-300 to-indigo-400"
              animate={{ 
                backgroundPosition: ['0% center', '100% center', '0% center']
              }}
              transition={{ duration: 8, repeat: Infinity }}
              style={{ backgroundSize: '200% auto' }}
            >
              OmniShop
            </motion.div>
            
            <motion.div 
              className="text-lg text-blue-200 tracking-wider mb-8"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <span className="inline-flex items-center gap-2">
                <CustomClock className="h-4 w-4" /> Preparando experiencia inmersiva
              </span>
            </motion.div>
          </motion.div>
          
          {/* Barra de progreso avanzada */}
          <div className="relative mb-3">
            <motion.div 
              className="w-full h-2 bg-gradient-to-r from-blue-900/50 via-indigo-900/50 to-blue-900/50 rounded-full overflow-hidden backdrop-blur-sm shadow-inner relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <motion.div 
                className="absolute h-full w-full left-0 top-0"
                style={{ 
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  transform: 'translateX(-100%)'
                }}
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
              
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 rounded-full relative"
                style={{ width: `${loadingProgress}%` }}
                animate={{ 
                  boxShadow: [
                    '0 0 10px rgba(139, 92, 246, 0.5)', 
                    '0 0 20px rgba(139, 92, 246, 0.7)', 
                    '0 0 10px rgba(139, 92, 246, 0.5)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <motion.div 
                  className="absolute right-0 top-0 h-full w-2 bg-white"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                />
              </motion.div>
            </motion.div>
            
            <div className="flex justify-between text-xs text-blue-300/70 mt-2 px-1">
              <span>Iniciando</span>
              <span>Cargando recursos</span>
              <span>Optimizando</span>
            </div>
          </div>
          
          {/* Indicador de progreso con detalles técnicos */}
          <motion.div 
            className="flex items-center justify-center gap-3 text-blue-200 font-mono text-sm mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="text-blue-400"
            >
              <Loader2 size={16} />
            </motion.div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium">{Math.round(loadingProgress)}%</span>
                <span className="text-xs text-blue-300/70">
                  {loadingProgress < 30 ? 'Iniciando renderizado 3D...' : 
                   loadingProgress < 60 ? 'Cargando recursos visuales...' : 
                   loadingProgress < 85 ? 'Preparando efectos inmersivos...' : 
                   'Finalizando preparativos...'}
                </span>
              </div>
              <div className="text-xs text-blue-300/60 mt-1">
                {Math.floor(Math.random() * 1000) + 512}kb / {Math.floor(Math.random() * 2000) + 2048}kb
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Detalle de copyright minimalista */}
        <motion.div 
          className="absolute bottom-4 w-full text-center text-xs text-blue-200/40 font-light tracking-widest"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 1.5 }}
        >
          REGALA ALGO © {new Date().getFullYear()}
        </motion.div>
      </div>
    );
  }

  // Animación principal de la persona dando regalo
  return (
    <AnimatePresence>
      {!animationComplete && (
        <motion.div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-800 to-indigo-900 overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Fondo con partículas animadas */}
          {showParticles && (
            <div className="absolute inset-0 overflow-hidden">
              {particles.current.map((particle, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    backgroundColor: particle.color,
                    width: particle.size,
                    height: particle.size,
                    left: `${particle.x}%`,
                    top: `${particle.y}%`,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [0, 1.5, 1],
                    opacity: [0, 1, 0],
                    y: [0, -100 - Math.random() * 100],
                    x: [0, (Math.random() - 0.5) * 50]
                  }}
                  transition={{ 
                    duration: particle.duration * 2,
                    repeat: Infinity,
                    repeatDelay: Math.random() * 2,
                    ease: "easeOut",
                    delay: Math.random() * 2
                  }}
                />
              ))}
            </div>
          )}

          {/* Escena principal de la animación */}
          <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
            {/* Persona */}
            <motion.div 
              className="relative z-10"
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Cuerpo */}
              <motion.div className="relative">
                {/* Cabeza */}
                <motion.div 
                  className="w-32 h-32 rounded-full bg-gradient-to-b from-orange-200 to-orange-300 border-4 border-slate-800 flex items-center justify-center relative mx-auto"
                  animate={{ 
                    y: [0, -8, 0],
                    rotateZ: giftOpened ? [0, -5, 5, -3, 0] : [0, 0]
                  }}
                  transition={{ 
                    y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    rotateZ: { duration: 0.7, delay: 0.5 }
                  }}
                >
                  {/* Ojos */}
                  <div className="flex w-16 justify-between">
                    <motion.div 
                      className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center"
                      animate={{ 
                        scaleY: giftOpened ? [1, 0.3, 1, 0.3, 1] : [1, 1],
                        scaleX: giftOpened ? [1, 1.2, 1, 1.2, 1] : [1, 1]
                      }}
                      transition={{ duration: 0.7, delay: 0.8 }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white relative top-0.5 left-0.5"></div>
                    </motion.div>
                    <motion.div 
                      className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center"
                      animate={{ 
                        scaleY: giftOpened ? [1, 0.3, 1, 0.3, 1] : [1, 1],
                        scaleX: giftOpened ? [1, 1.2, 1, 1.2, 1] : [1, 1]
                      }}
                      transition={{ duration: 0.7, delay: 0.8 }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white relative top-0.5 left-0.5"></div>
                    </motion.div>
                  </div>
                  
                  {/* Boca */}
                  <motion.div 
                    className="absolute bottom-8 w-10 h-4 rounded-bl-full rounded-br-full bg-slate-800"
                    animate={{ 
                      height: giftOpened ? [4, 8, 4] : 4,
                      width: giftOpened ? [10, 14, 10] : 10
                    }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                  />
                </motion.div>
                
                {/* Torso */}
                <motion.div 
                  className="w-48 h-60 bg-gradient-to-b from-blue-500 to-blue-600 rounded-3xl mt-4 flex items-center justify-center relative"
                  animate={{ 
                    rotate: giftOpened ? [0, -2, 2, 0] : 0
                  }}
                  transition={{ 
                    rotate: { duration: 0.5, delay: 0.5 }
                  }}
                >
                  {/* Brazos */}
                  <motion.div 
                    className="absolute left-0 top-16 w-20 h-10 bg-blue-500 rounded-full transform -translate-x-12"
                    style={{ transformOrigin: "right center" }}
                    animate={{ 
                      rotateZ: giftOpened ? [-20, -40, -30] : -20,
                      translateX: giftOpened ? [-12, -14, -12] : -12
                    }}
                    transition={{
                      rotateZ: { duration: 0.5, delay: 0.6 },
                      translateX: { duration: 0.5, delay: 0.6 }
                    }}
                  >
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 -translate-x-2 w-8 h-8 rounded-full bg-orange-200"></div>
                  </motion.div>
                  
                  <motion.div 
                    className="absolute right-0 top-16 w-20 h-10 bg-blue-500 rounded-full transform translate-x-12"
                    style={{ transformOrigin: "left center" }}
                    animate={{ 
                      rotateZ: giftOpened ? [20, 40, 30] : 20,
                      translateX: giftOpened ? [12, 14, 12] : 12
                    }}
                    transition={{
                      rotateZ: { duration: 0.5, delay: 0.6 },
                      translateX: { duration: 0.5, delay: 0.6 }
                    }}
                  >
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 translate-x-2 w-8 h-8 rounded-full bg-orange-200"></div>
                  </motion.div>
                </motion.div>
              </motion.div>
              
              {/* Regalo */}
              <motion.div 
                className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-16 z-20"
                animate={{ 
                  y: giftOpened ? [-16, -50] : -16,
                  rotate: giftOpened ? [0, -5, 5, 0] : 0,
                }}
                transition={{ 
                  y: { duration: 0.4, delay: 0.5 },
                  rotate: { duration: 0.5, delay: 0.5 }
                }}
              >
                {/* Caja de regalo */}
                <div className="relative">
                  <motion.div 
                    className="w-28 h-28 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 shadow-xl border-2 border-white/20 flex items-center justify-center overflow-hidden"
                    animate={{ 
                      rotateY: giftOpened ? [0, 180] : 0,
                      scale: giftOpened ? [1, 1.1, 1] : 1
                    }}
                    transition={{ 
                      rotateY: { duration: 0.8, delay: 0.6 },
                      scale: { duration: 0.4, delay: 0.6 }
                    }}
                  >
                    {/* Interior del regalo */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: giftOpened ? 1 : 0, 
                        scale: giftOpened ? [0, 1.2, 1] : 0 
                      }}
                      transition={{ duration: 0.4, delay: 1.3 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Heart className="w-12 h-12 text-white animate-pulse" />
                    </motion.div>
                    
                    {/* Listón */}
                    <motion.div
                      className="absolute top-0 left-1/2 w-6 h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transform -translate-x-1/2"
                      animate={{ 
                        scaleY: giftOpened ? [1, 0] : 1
                      }}
                      transition={{ duration: 0.3, delay: 0.6 }}
                    ></motion.div>
                    <motion.div
                      className="absolute top-1/2 left-0 w-full h-6 bg-gradient-to-b from-yellow-400 to-yellow-500 transform -translate-y-1/2"
                      animate={{ 
                        scaleX: giftOpened ? [1, 0] : 1
                      }}
                      transition={{ duration: 0.3, delay: 0.6 }}
                    ></motion.div>
                    
                    {/* Tapa */}
                    <motion.div 
                      className="absolute top-0 left-0 w-full h-full rounded-lg bg-gradient-to-br from-red-500 to-pink-600 border-2 border-white/20"
                      animate={{ 
                        rotateX: giftOpened ? [0, -120] : 0,
                        y: giftOpened ? [0, -20] : 0,
                        opacity: giftOpened ? [1, 0] : 1
                      }}
                      transition={{ 
                        rotateX: { duration: 0.6, delay: 0.6 },
                        y: { duration: 0.6, delay: 0.6 },
                        opacity: { duration: 0.3, delay: 0.9 }
                      }}
                      style={{ transformOrigin: "center bottom" }}
                    >
                      <div className="absolute top-1/2 left-1/2 w-10 h-10 rounded-full bg-yellow-400 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-yellow-500"></div>
                      </div>
                    </motion.div>
                  </motion.div>
                  
                  {/* Partículas de explosión */}
                  {giftOpened && (
                    <motion.div
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1.5, delay: 0.7 }}
                    >
                      {Array.from({ length: 12 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-3 h-3 rounded-full"
                          style={{
                            left: '50%',
                            top: '50%',
                            backgroundColor: ['#fbbf24', '#ec4899', '#3b82f6', '#ef4444'][i % 4]
                          }}
                          initial={{ scale: 0 }}
                          animate={{ 
                            scale: [0, 1, 0],
                            x: [0, (Math.cos(i * 30 * Math.PI / 180) * 100)],
                            y: [0, (Math.sin(i * 30 * Math.PI / 180) * 100)]
                          }}
                          transition={{ duration: 1, delay: 0.7 }}
                        />
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
            
            {/* Reflejo en el suelo */}
            <motion.div
              className="absolute bottom-0 w-full h-5 bg-white/10 blur-md rounded-full transform scale-x-75"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          
          {/* Texto de OmniShop */}
          <motion.div 
            className="absolute bottom-24 left-0 w-full text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <motion.div 
              className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-pink-300 to-purple-400 drop-shadow-lg"
              animate={{ 
                scale: giftOpened ? [1, 1.1, 1] : 1
              }}
              transition={{ 
                scale: { duration: 0.5, delay: 1.2 }
              }}
            >
              OmniShop
            </motion.div>
            
            <motion.div 
              className="text-lg md:text-xl text-blue-100 mt-2 font-light tracking-wider"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              <span className="inline-flex items-center">
                Tu Tienda Online Multirrubro <Sparkles className="ml-2 w-5 h-5 text-yellow-300" />
              </span>
            </motion.div>
          </motion.div>

          {/* Botón para continuar */}
          <motion.button
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition duration-300 flex items-center font-medium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: giftOpened ? 1 : 0, 
              y: giftOpened ? 0 : 20 
            }}
            transition={{ delay: 2.2 }}
            onClick={() => setAnimationComplete(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Entrar <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="ml-2">→</motion.span>
          </motion.button>

          {/* Estilo para animaciones adicionales */}
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-15px); }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
