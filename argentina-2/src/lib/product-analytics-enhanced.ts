import { getProductVisitors } from './product-analytics';
// Mocks para evitar errores de compilación ya que Firebase fue removido
const collection = (...args: any[]) => ({}) as any;
const getDocs = (...args: any[]) => Promise.resolve({ forEach: () => { } }) as any;
const query = (...args: any[]) => ({}) as any;
const where = (...args: any[]) => ({}) as any;
const orderBy = (...args: any[]) => ({}) as any;
const Timestamp = { now: () => new Date() } as any;
import { db } from '@/firebase';
import { ViewEvent } from './product-analytics';

// Obtiene los eventos detallados de visualización de un producto
export const getDetailedViewEvents = async (productId: string, startDate?: string, endDate?: string): Promise<ViewEvent[]> => {
  try {
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    let q;

    if (startDateObj && endDateObj) {
      q = query(
        collection(db, "productViews"),
        where("productId", "==", productId),
        where("timestamp", ">=", startDateObj),
        where("timestamp", "<=", endDateObj),
        orderBy("timestamp", "desc")
      );
    } else {
      q = query(
        collection(db, "productViews"),
        where("productId", "==", productId),
        orderBy("timestamp", "desc")
      );
    }

    const snapshot = await getDocs(q);
    const events: ViewEvent[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date();

      events.push({
        id: doc.id,
        timestamp: timestamp,
        date: data.date || timestamp.toLocaleDateString(),
        time: data.time || timestamp.toLocaleTimeString(),
        userId: data.userId || data.sessionId || 'unknown',
        displayName: data.userName || (data.isAnonymous ? 'Usuario anónimo' : 'Usuario'),
        email: data.userEmail || null,
        deviceType: data.deviceInfo?.device || 'Desconocido',
        source: data.source || 'Directo',
        duration: data.duration || null,
        location: data.location?.country || 'Desconocido',
        deviceInfo: data.deviceInfo
      });
    });

    return events;
  } catch (error) {
    console.error("Error al obtener eventos de vistas:", error);
    return [];
  }
};
