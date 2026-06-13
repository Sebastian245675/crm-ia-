import { createContext, useContext, useCallback, ReactNode, useEffect, useState } from 'react';

// Interfaz para los elementos en caché
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// Interfaz para configuraciones de caché
interface CacheConfig {
  maxAge?: number; // Tiempo en milisegundos hasta que un elemento expira
}

// Interfaz para el contexto de caché
interface CacheContextType {
  get: <T>(key: string) => T | null;
  set: <T>(key: string, data: T) => void;
  remove: (key: string) => void;
  clear: () => void;
  has: (key: string) => boolean;
}

// Crear contexto con valores por defecto
const CacheContext = createContext<CacheContextType>({
  get: () => null,
  set: () => {},
  remove: () => {},
  clear: () => {},
  has: () => false
});

// Props para el proveedor de caché
interface CacheProviderProps {
  children: ReactNode;
  config?: CacheConfig;
}

// Proveedor de caché
export const CacheProvider = ({ children, config = {} }: CacheProviderProps) => {
  const maxAge = config.maxAge || 30 * 60 * 1000; // 30 minutos por defecto
  const [cache, setCache] = useState<Map<string, CacheItem<any>>>(new Map());

  // Función para limpiar elementos expirados
  const cleanExpired = useCallback(() => {
    const now = Date.now();
    let hasChanges = false;
    const updatedCache = new Map(cache);

    Array.from(updatedCache.entries()).forEach(([key, item]) => {
      if (now - item.timestamp > maxAge) {
        updatedCache.delete(key);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setCache(updatedCache);
    }
  }, [cache, maxAge]);

  // Programar limpieza periódica
  useEffect(() => {
    const interval = setInterval(cleanExpired, maxAge / 10);
    return () => clearInterval(interval);
  }, [cleanExpired, maxAge]);

  // Cargar caché desde localStorage al inicio
  useEffect(() => {
    try {
      const savedCache = localStorage.getItem('appDataCache');
      if (savedCache) {
        const parsed = JSON.parse(savedCache);
        const newCache = new Map();
        
        Object.entries(parsed).forEach(([key, value]) => {
          newCache.set(key, value as CacheItem<any>);
        });
        
        setCache(newCache);
        // Limpiar items expirados inmediatamente
        setTimeout(cleanExpired, 0);
      }
    } catch (error) {
      console.error('Error loading cache from localStorage:', error);
    }
  }, []);

  // Guardar caché en localStorage cuando cambie
  useEffect(() => {
    try {
      const cacheObj = Object.fromEntries(cache.entries());
      localStorage.setItem('appDataCache', JSON.stringify(cacheObj));
    } catch (error) {
      console.error('Error saving cache to localStorage:', error);
    }
  }, [cache]);

  // Implementación de funciones de caché
  const get = useCallback(<T,>(key: string): T | null => {
    const item = cache.get(key);
    
    if (!item) return null;
    
    // Comprobar si el elemento ha expirado
    if (Date.now() - item.timestamp > maxAge) {
      const newCache = new Map(cache);
      newCache.delete(key);
      setCache(newCache);
      return null;
    }
    
    return item.data;
  }, [cache, maxAge]);

  const set = useCallback(<T,>(key: string, data: T): void => {
    setCache(prevCache => {
      const newCache = new Map(prevCache);
      newCache.set(key, { data, timestamp: Date.now() });
      return newCache;
    });
  }, []);

  const remove = useCallback((key: string): void => {
    setCache(prevCache => {
      const newCache = new Map(prevCache);
      newCache.delete(key);
      return newCache;
    });
  }, []);

  const clear = useCallback((): void => {
    setCache(new Map());
  }, []);

  const has = useCallback((key: string): boolean => {
    if (!cache.has(key)) return false;
    
    const item = cache.get(key);
    // Verificar expiración
    return item && (Date.now() - item.timestamp <= maxAge);
  }, [cache, maxAge]);

  return (
    <CacheContext.Provider value={{ get, set, remove, clear, has }}>
      {children}
    </CacheContext.Provider>
  );
};

// Hook para usar el caché
export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};

export default useCache;
