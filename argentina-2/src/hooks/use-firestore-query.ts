import { useState, useEffect, useCallback } from 'react';
import { db } from '@/firebase';
import { useCache } from '@/contexts/CacheContext';

// Tipo para las opciones de la consulta
interface UseFirestoreQueryOptions {
  collectionName: string;
  queryConstraints?: any[];
  cacheKey?: string;
  cacheTtl?: number; // Tiempo de vida en ms
  dependencies?: any[];
  skipCache?: boolean;
}

/**
 * Hook personalizado para consultar Supabase (ex-Firestore) con caché
 * 
 * Este hook optimiza las consultas a Supabase almacenando los resultados en caché
 * para reducir las llamadas a la base de datos y mejorar el rendimiento.
 * 
 * @param options Opciones para la consulta
 * @returns Objeto con los datos, estado de carga y errores
 */
export function useFirestoreQuery<T = any>({
  collectionName,
  queryConstraints = [],
  cacheKey,
  cacheTtl = 5 * 60 * 1000, // 5 minutos por defecto
  dependencies = [],
  skipCache = false
}: UseFirestoreQueryOptions) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Hook de caché
  const cache = useCache();

  // Generar clave de caché automáticamente si no se proporciona
  const effectiveCacheKey = cacheKey ||
    `supabase_${collectionName}_${JSON.stringify(queryConstraints)}`;

  // Función para ejecutar la consulta
  const executeQuery = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar caché primero si no se omite
      if (!skipCache) {
        const cachedData = cache.get<T[]>(effectiveCacheKey);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      }

      // Ejecutar la consulta en Supabase
      // db es el cliente de Supabase re-exportado desde @/firebase
      const { data: results, error: queryError } = await db
        .from(collectionName)
        .select('*');

      if (queryError) throw queryError;

      // Guardar resultados
      setData(results as T[]);

      // Almacenar en caché si no se omite
      if (!skipCache) {
        cache.set(effectiveCacheKey, results);
      }
    } catch (err) {
      console.error(`Error al consultar ${collectionName}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [collectionName, cache, effectiveCacheKey, skipCache, ...dependencies]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  // Función para refrescar los datos (útil para actualizaciones manuales)
  const refresh = useCallback(async () => {
    // Eliminar de la caché para forzar una recarga
    cache.remove(effectiveCacheKey);
    await executeQuery();
  }, [cache, effectiveCacheKey, executeQuery]);

  return {
    data,
    loading,
    error,
    refresh
  };
}

export default useFirestoreQuery;
