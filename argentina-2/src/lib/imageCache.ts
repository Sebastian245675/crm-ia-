// imageCache.ts
// Este módulo implementa un sistema de caché para imágenes usando IndexedDB

interface CacheOptions {
  maxEntries?: number;
  maxAge?: number; // en milisegundos
}

class ImageCache {
  private dbName = 'regala-algo-image-cache';
  private dbVersion = 1;
  private storeName = 'images';
  private db: IDBDatabase | null = null;
  private options: CacheOptions;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxEntries: options.maxEntries || 100,
      maxAge: options.maxAge || 7 * 24 * 60 * 60 * 1000 // 7 días por defecto
    };
    
    this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return Promise.resolve(this.db);
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Error al abrir la base de datos de caché de imágenes');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async cacheImage(url: string, blob: Blob): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);

      const entry = {
        url,
        blob,
        timestamp: Date.now()
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Limpieza de caché antigua y excesiva
      await this.cleanupCache();
    } catch (error) {
      console.error('Error al guardar imagen en caché:', error);
    }
  }

  async getImage(url: string): Promise<Blob | null> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);

      const entry = await new Promise<{ url: string; blob: Blob; timestamp: number } | undefined>((resolve, reject) => {
        const request = store.get(url);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!entry) return null;

      // Verificar si la entrada está expirada
      if (Date.now() - entry.timestamp > (this.options.maxAge || 0)) {
        this.removeEntry(url);
        return null;
      }

      // Actualizar timestamp para mantener entradas frecuentemente usadas
      this.updateTimestamp(url);
      
      return entry.blob;
    } catch (error) {
      console.error('Error al recuperar imagen de caché:', error);
      return null;
    }
  }

  private async updateTimestamp(url: string): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);

      const request = store.get(url);
      
      request.onsuccess = () => {
        if (request.result) {
          const entry = request.result;
          entry.timestamp = Date.now();
          store.put(entry);
        }
      };
    } catch (error) {
      console.error('Error al actualizar timestamp:', error);
    }
  }

  private async removeEntry(url: string): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.delete(url);
    } catch (error) {
      console.error('Error al eliminar entrada de caché:', error);
    }
  }

  private async cleanupCache(): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const index = store.index('timestamp');

      // Eliminar entradas expiradas
      const currentTime = Date.now();
      const maxAge = this.options.maxAge || 0;

      const expiredEntriesRequest = index.openCursor();
      
      expiredEntriesRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          if (currentTime - cursor.value.timestamp > maxAge) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      // Limitar el número total de entradas (LRU)
      const countRequest = store.count();
      countRequest.onsuccess = async () => {
        const totalEntries = countRequest.result;
        const maxEntries = this.options.maxEntries || 100;
        
        if (totalEntries > maxEntries) {
          const entriesToDelete = totalEntries - maxEntries;
          
          // Obtener las entradas más antiguas y eliminarlas
          const oldestEntriesRequest = index.openCursor();
          let deleted = 0;
          
          oldestEntriesRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            
            if (cursor && deleted < entriesToDelete) {
              cursor.delete();
              deleted++;
              cursor.continue();
            }
          };
        }
      };
    } catch (error) {
      console.error('Error durante la limpieza de caché:', error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.clear();
    } catch (error) {
      console.error('Error al limpiar caché:', error);
    }
  }
}

// Singleton instance
const imageCache = new ImageCache({
  maxEntries: 200,
  maxAge: 14 * 24 * 60 * 60 * 1000 // 14 días
});

export default imageCache;
