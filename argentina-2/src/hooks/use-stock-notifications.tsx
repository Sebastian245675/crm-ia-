import { useEffect, useState, useRef } from 'react';
import { db } from '@/firebase';

// Tipos y mocks simulados para evitar errores de compilación si no se usa Firebase
type Unsubscribe = () => void;
const collection = (...args: any[]) => ({}) as any;
const query = (...args: any[]) => ({}) as any;
const onSnapshot = (...args: any[]) => (() => { }) as any;

export interface StockNotification {
  id: string;
  productId: string;
  productName: string;
  type: 'low_stock' | 'out_of_stock';
  stock: number;
  timestamp: Date;
  read: boolean;
}

const STOCK_LOW_THRESHOLD = 5; // Notificar cuando stock < 5
const STORAGE_KEY = 'stock-notifications';
const MAX_NOTIFICATIONS = 50;

// Generar ID consistente basado en productId y tipo
const generateNotificationId = (productId: string, type: 'low_stock' | 'out_of_stock') => {
  return `stock_${productId}_${type}`;
};

// Función para guardar notificaciones en localStorage
const saveNotificationsToStorage = (notifications: StockNotification[]) => {
  try {
    const serialized = notifications.map(n => ({
      ...n,
      timestamp: n.timestamp.toISOString()
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.error('Error guardando notificaciones en localStorage:', error);
  }
};

// Función para cargar notificaciones desde localStorage
const loadNotificationsFromStorage = (): StockNotification[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }));
    }
  } catch (error) {
    console.error('Error cargando notificaciones desde localStorage:', error);
  }
  return [];
};

export const useStockNotifications = () => {
  const isSupabase = typeof (db as any)?.from === 'function';
  const [notifications, setNotifications] = useState<StockNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousStockRef = useRef<Map<string, number>>(new Map());
  const notificationIdCounter = useRef(0);
  const isInitialized = useRef(false);

  // Cargar notificaciones guardadas al inicio
  useEffect(() => {
    if (!isInitialized.current) {
      const stored = loadNotificationsFromStorage();
      if (stored.length > 0) {
        setNotifications(stored);
        isInitialized.current = true;
      }
    }
  }, []);

  // Guardar notificaciones en localStorage cada vez que cambien (evitar guardar durante carga inicial)
  useEffect(() => {
    if (isInitialized.current) {
      saveNotificationsToStorage(notifications);
    }
  }, [notifications]);

  useEffect(() => {
    if (isSupabase) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // El código de Firebase ha sido desactivado ya que la librería fue removida
    // Si se requiere notificaciones de stock en tiempo real con Supabase, 
    // se debe implementar usando db.channel().

    const unsubscribe = () => { };

    return () => {
      unsubscribe();
    };
  }, [isSupabase]);

  // Actualizar contador de no leídas
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
      saveNotificationsToStorage(updated);
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveNotificationsToStorage(updated);
      return updated;
    });
  };

  const removeNotification = (notificationId: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== notificationId);
      saveNotificationsToStorage(updated);
      return updated;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  };
};

