import { db } from '@/firebase';

// Estructura de datos para el análisis de productos
export interface ProductView {
  productId: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  userEmail?: string;
  userName?: string;
  isAnonymous: boolean;
  date: string;
  time: string;
  deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
  browser?: string;
  os?: string;
  device?: string;
  isMobile?: boolean;
}

// Interfaz para detalles de visitantes
export interface Visitor {
  userId: string;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  isAnonymous?: boolean;
  lastSeen?: Date | string;
  totalVisits: number;
  firstVisit: Date | string;
  visits?: Array<{
    timestamp: Date;
    date: string;
    time: string;
    deviceInfo?: DeviceInfo;
  }>;
  deviceInfo?: DeviceInfo;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
}

// Interfaz para vistas de productos con detalle de visitantes
export interface ViewEvent {
  id: string;
  timestamp: Date | string;
  userId: string;
  displayName?: string;
  email?: string;
  duration?: number; // en segundos
  source?: string; // de dónde vino (referrer)
  deviceType?: string;
  location?: string;
}

export interface ProductAnalytics {
  id: string;
  productId: string;
  productName: string;
  totalViews: number;
  lastViewed: Date;
  viewsByDay?: Record<string, number>;
  category?: string;
  // Nuevos campos para análisis avanzado
  uniqueVisitors?: number;
  returningVisitors?: number;
  averageDuration?: number; // tiempo promedio en el producto
  conversionRate?: number; // porcentaje de vistas que resultaron en compra
  visitors?: Visitor[]; // detalles de los visitantes
  viewEvents?: ViewEvent[]; // historial detallado de vistas
}

// Obtener o crear session ID único para el usuario
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('website_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('website_session_id', sessionId);
    console.log('[getSessionId] ✅ Nueva sesión creada:', sessionId);
  }
  return sessionId;
};

// Registra una visita general al sitio web (por dispositivo)
export const recordWebsiteVisit = async (
  pageUrl: string,
  pageTitle?: string,
  userId?: string,
  userEmail?: string | null,
  userName?: string | null
) => {
  try {
    const isSupabase = typeof (db as any)?.from === 'function';
    if (!isSupabase) {
      console.warn('[recordWebsiteVisit] ⚠️ Supabase no está disponible');
      return false;
    }

    console.log('[recordWebsiteVisit] 📊 Iniciando registro de visita al sitio web...');
    console.log('[recordWebsiteVisit] 📄 Página:', { pageUrl, pageTitle, userId: userId || 'Anónimo' });

    const sessionId = getSessionId();
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString();
    const userAgent = window.navigator.userAgent;
    const deviceInfo = {
      browser: getBrowserInfo(userAgent),
      os: getOSInfo(userAgent),
      isMobile: /Mobi|Android/i.test(userAgent),
      device: /Mobi|Android/i.test(userAgent) ? 'Mobile' : 'Desktop',
      userAgent: userAgent
    };

    console.log('[recordWebsiteVisit] 📱 Información del dispositivo:', deviceInfo);

    const visitData = {
      session_id: sessionId,
      user_id: userId ?? null,
      user_email: userEmail ?? null,
      user_name: userName ?? null,
      is_anonymous: !userId,
      page_url: pageUrl,
      page_title: pageTitle || document.title || 'Sin título',
      referrer: document.referrer || null,
      date: today,
      time: currentTime,
      timestamp: new Date().toISOString(),
      device_info: deviceInfo
    };

    console.log('[recordWebsiteVisit] 💾 Datos a insertar:', visitData);

    const { data, error } = await (db as any)
      .from('website_visits')
      .insert(visitData)
      .select();

    if (error) {
      console.error('[recordWebsiteVisit] ❌ Error al insertar visita:', error);
      console.error('[recordWebsiteVisit] ❌ Detalles del error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return false;
    }

    console.log('[recordWebsiteVisit] ✅ Visita registrada exitosamente en website_visits');
    console.log('[recordWebsiteVisit] ✅ ID de registro:', data?.[0]?.id);
    return true;
  } catch (error: any) {
    console.error('[recordWebsiteVisit] ❌ Error crítico al registrar visita:', error?.message || error);
    console.error('[recordWebsiteVisit] ❌ Stack trace:', error?.stack);
    return false;
  }
};

// Registra una vista de producto (SOLO Supabase)
export const recordProductView = async (
  productId: string, 
  productName: string,
  userId?: string,
  userEmail?: string | null,
  userName?: string | null
) => {
  try {
    console.log('[recordProductView] 🛍️ ========================================');
    console.log('[recordProductView] 🛍️ INICIANDO REGISTRO DE VISTA DE PRODUCTO');
    console.log('[recordProductView] 🛍️ ========================================');
    console.log('[recordProductView] 📦 Producto:', { productId, productName });
    console.log('[recordProductView] 👤 Usuario:', { userId: userId || 'Anónimo', userEmail, userName });

    const isSupabase = typeof (db as any)?.from === 'function';
    if (!isSupabase) {
      console.error('[recordProductView] ❌ Supabase no está disponible');
      return false;
    }

    const sessionId = getSessionId();
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString();
    const userAgent = window.navigator.userAgent;
    const deviceInfo = {
      browser: getBrowserInfo(userAgent),
      os: getOSInfo(userAgent),
      isMobile: /Mobi|Android/i.test(userAgent),
      device: /Mobi|Android/i.test(userAgent) ? 'Mobile' : 'Desktop'
    };

    console.log('[recordProductView] 📱 Dispositivo:', deviceInfo);
    console.log('[recordProductView] 📅 Fecha:', { today, currentTime });
    console.log('[recordProductView] 🔑 Sesión:', sessionId);
    
    // Paso 1: Registrar vista individual en product_views
    console.log('[recordProductView] 📝 Paso 1: Insertando en product_views...');
    try {
      const viewData = {
        product_id: productId,
        product_name: productName,
        user_id: userId ?? null,
        user_email: userEmail ?? null,
        user_name: userName ?? null,
        is_anonymous: !userId,
        session_id: sessionId,
        date: today,
        time: currentTime,
        timestamp: new Date().toISOString(),
        device_info: deviceInfo
      };

      console.log('[recordProductView] 💾 Datos de vista:', viewData);

      const { data: viewResult, error: viewError } = await (db as any)
        .from('product_views')
        .insert(viewData)
        .select();

      if (viewError) {
        console.error('[recordProductView] ❌ Error al insertar en product_views:', viewError);
        console.error('[recordProductView] ❌ Detalles:', {
          message: viewError.message,
          code: viewError.code,
          details: viewError.details,
          hint: viewError.hint
        });
        throw viewError;
      }

      console.log('[recordProductView] ✅ Vista individual registrada en product_views');
      console.log('[recordProductView] ✅ ID de registro:', viewResult?.[0]?.id);
    } catch (error: any) {
      console.error('[recordProductView] ❌ Error crítico en product_views:', error?.message || error);
      // Continuar con analytics aunque falle product_views
    }
    
    // Paso 2: Actualizar o crear analytics agregados en product_analytics
    console.log('[recordProductView] 📊 Paso 2: Actualizando product_analytics...');
    try {
      const { data: existing, error: fetchError } = await (db as any)
        .from('product_analytics')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();

      if (fetchError) {
        console.error('[recordProductView] ❌ Error al buscar analytics existente:', fetchError);
        throw fetchError;
      }

      if (existing) {
        console.log('[recordProductView] 📊 Analytics existente encontrado:', existing);
        const viewsByDay = (existing.views_by_day ?? {}) as Record<string, number>;
        const previousViews = viewsByDay[today] || 0;
        viewsByDay[today] = previousViews + 1;
        
        console.log('[recordProductView] 📈 Vistas del día:', { 
          fecha: today, 
          anteriores: previousViews, 
          nuevas: viewsByDay[today] 
        });

        const { error: updateError } = await (db as any)
          .from('product_analytics')
          .update({
            total_views: (existing.total_views ?? 0) + 1,
            last_viewed: new Date().toISOString(),
            views_by_day: viewsByDay,
            product_name: productName,
            updated_at: new Date().toISOString()
          })
          .eq('product_id', productId);

        if (updateError) {
          console.error('[recordProductView] ❌ Error al actualizar analytics:', updateError);
          throw updateError;
        }

        console.log('[recordProductView] ✅ Analytics actualizado en product_analytics');
        console.log('[recordProductView] ✅ Total de vistas:', (existing.total_views ?? 0) + 1);
      } else {
        console.log('[recordProductView] 📊 No existe analytics, creando nuevo registro...');
        const viewsByDay: Record<string, number> = {};
        viewsByDay[today] = 1;
        
        const newAnalytics = {
          product_id: productId,
          product_name: productName,
          total_views: 1,
          last_viewed: new Date().toISOString(),
          views_by_day: viewsByDay,
          first_viewed: new Date().toISOString()
        };

        console.log('[recordProductView] 💾 Nuevos analytics:', newAnalytics);

        const { error: insertError } = await (db as any)
          .from('product_analytics')
          .insert(newAnalytics);

        if (insertError) {
          // Si hay un error 409 (duplicate key), significa que otra llamada ya creó el registro
          // En ese caso, intentamos actualizar en lugar de fallar
          if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
            console.log('[recordProductView] 🔄 Conflicto detectado (otra llamada ya creó el registro), intentando actualizar...');
            
            // Intentar obtener el registro que ya existe
            const { data: existingAfterConflict, error: refetchError } = await (db as any)
              .from('product_analytics')
              .select('*')
              .eq('product_id', productId)
              .maybeSingle();

            if (refetchError || !existingAfterConflict) {
              console.error('[recordProductView] ❌ Error al obtener registro después del conflicto:', refetchError);
              throw insertError; // Lanzar el error original
            }

            // Actualizar el registro existente
            const viewsByDayUpdated = (existingAfterConflict.views_by_day ?? {}) as Record<string, number>;
            viewsByDayUpdated[today] = (viewsByDayUpdated[today] || 0) + 1;

            const { error: updateAfterConflictError } = await (db as any)
              .from('product_analytics')
              .update({
                total_views: (existingAfterConflict.total_views ?? 0) + 1,
                last_viewed: new Date().toISOString(),
                views_by_day: viewsByDayUpdated,
                product_name: productName,
                updated_at: new Date().toISOString()
              })
              .eq('product_id', productId);

            if (updateAfterConflictError) {
              console.error('[recordProductView] ❌ Error al actualizar después del conflicto:', updateAfterConflictError);
              throw updateAfterConflictError;
            }

            console.log('[recordProductView] ✅ Analytics actualizado después de resolver conflicto');
            console.log('[recordProductView] ✅ Total de vistas:', (existingAfterConflict.total_views ?? 0) + 1);
          } else {
            // Si es otro tipo de error, lanzarlo normalmente
            console.error('[recordProductView] ❌ Error al crear analytics:', insertError);
            throw insertError;
          }
        } else {
          console.log('[recordProductView] ✅ Analytics creado en product_analytics');
        }
      }
    } catch (error: any) {
      console.error('[recordProductView] ❌ Error crítico en product_analytics:', error?.message || error);
      console.error('[recordProductView] ❌ Stack trace:', error?.stack);
      return false;
    }

    console.log('[recordProductView] ✅ ========================================');
    console.log('[recordProductView] ✅ VISTA DE PRODUCTO REGISTRADA EXITOSAMENTE');
    console.log('[recordProductView] ✅ ========================================');
    return true;
  } catch (error: any) {
    console.error('[recordProductView] ❌ ========================================');
    console.error('[recordProductView] ❌ ERROR CRÍTICO AL REGISTRAR VISTA');
    console.error('[recordProductView] ❌ ========================================');
    console.error('[recordProductView] ❌ Error:', error?.message || error);
    console.error('[recordProductView] ❌ Stack:', error?.stack);
    return false;
  }
};

// Función auxiliar para obtener información del navegador
function getBrowserInfo(userAgent: string): string {
  if (userAgent.indexOf('Firefox') > -1) return 'Firefox';
  else if (userAgent.indexOf('SamsungBrowser') > -1) return 'Samsung';
  else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) return 'Opera';
  else if (userAgent.indexOf('Trident') > -1) return 'IE';
  else if (userAgent.indexOf('Edge') > -1) return 'Edge';
  else if (userAgent.indexOf('Chrome') > -1) return 'Chrome';
  else if (userAgent.indexOf('Safari') > -1) return 'Safari';
  else return 'Unknown';
}

// Función auxiliar para obtener información del sistema operativo
function getOSInfo(userAgent: string): string {
  if (userAgent.indexOf('Windows NT 10.0') > -1) return 'Windows 10';
  else if (userAgent.indexOf('Windows NT 6.3') > -1) return 'Windows 8.1';
  else if (userAgent.indexOf('Windows NT 6.2') > -1) return 'Windows 8';
  else if (userAgent.indexOf('Windows NT 6.1') > -1) return 'Windows 7';
  else if (userAgent.indexOf('Windows NT 6.0') > -1) return 'Windows Vista';
  else if (userAgent.indexOf('Windows NT 5.1') > -1) return 'Windows XP';
  else if (userAgent.indexOf('Windows NT') > -1) return 'Windows';
  else if (userAgent.indexOf('Mac') > -1) return 'MacOS';
  else if (userAgent.indexOf('Android') > -1) return 'Android';
  else if (userAgent.indexOf('iOS') > -1 || /iPhone|iPad|iPod/.test(userAgent)) return 'iOS';
  else if (userAgent.indexOf('Linux') > -1) return 'Linux';
  else return 'Unknown';
}

// Obtiene los visitantes detallados de un producto específico (SOLO Supabase)
export const getProductVisitors = async (productId: string, startDate?: Date, endDate?: Date) => {
  try {
    console.log('[getProductVisitors] 🔍 Buscando visitantes para producto:', productId);
    
    const isSupabase = typeof (db as any)?.from === 'function';
    if (!isSupabase) {
      console.warn('[getProductVisitors] ⚠️ Supabase no está disponible');
      return [];
    }

    if (!productId) {
      console.error('[getProductVisitors] ❌ No se proporcionó un ID de producto válido');
      return [];
    }

    let query = (db as any).from('product_views').select('*').eq('product_id', productId);

    if (startDate && endDate) {
      const startISO = startDate.toISOString();
      const endISO = new Date(endDate);
      endISO.setHours(23, 59, 59, 999);
      query = query.gte('timestamp', startISO).lte('timestamp', endISO.toISOString());
      console.log('[getProductVisitors] 📅 Filtrando por fechas:', { startISO, endISO: endISO.toISOString() });
    }

    query = query.order('timestamp', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[getProductVisitors] ❌ Error al obtener visitantes:', error);
      return [];
    }

    console.log('[getProductVisitors] ✅ Encontrados', data?.length || 0, 'registros');

    // Procesar los resultados para agrupar por usuario
    const visitorMap = new Map<string, Visitor>();

    (data || []).forEach((viewData: any) => {
      const visitorId = viewData.user_id || viewData.session_id;
      const timestamp = new Date(viewData.timestamp);

      if (visitorMap.has(visitorId)) {
        const existingVisitor = visitorMap.get(visitorId)!;
        existingVisitor.totalVisits += 1;
        if (timestamp > new Date(existingVisitor.lastSeen as string)) {
          existingVisitor.lastSeen = timestamp;
        }
        existingVisitor.visits?.push({
          timestamp,
          date: viewData.date,
          time: viewData.time,
          deviceInfo: viewData.device_info
        });
      } else {
        visitorMap.set(visitorId, {
          userId: visitorId,
          displayName: viewData.user_name || (viewData.is_anonymous ? 'Usuario anónimo' : null),
          email: viewData.user_email || null,
          isAnonymous: viewData.is_anonymous || !viewData.user_id,
          totalVisits: 1,
          firstVisit: timestamp,
          lastSeen: timestamp,
          deviceInfo: viewData.device_info,
          visits: [{
            timestamp,
            date: viewData.date,
            time: viewData.time,
            deviceInfo: viewData.device_info
          }]
        });
      }
    });

    return Array.from(visitorMap.values());
  } catch (error: any) {
    console.error('[getProductVisitors] ❌ Error crítico:', error?.message || error);
    return [];
  }
};

// Tabla product_analytics puede no existir en Supabase. Si no existe, no llamar para evitar 404.
// Cuando la crees y quieras “más vistos”, quita el early-return y descomenta la query.
// Habilitar analytics de Supabase si está disponible
const USE_PRODUCT_ANALYTICS_SUPABASE = typeof (db as any)?.from === 'function';

// Obtiene los productos más vistos (Supabase o fallback vacío)
export const getMostViewedProducts = async (limitCount = 10): Promise<ProductAnalytics[]> => {
  try {
    const isSupabase = typeof (db as any)?.from === 'function';
    
    if (isSupabase) {
      // Intentar con Supabase primero
      try {
        const { data, error } = await (db as any)
          .from('product_analytics')
          .select('*')
          .order('total_views', { ascending: false })
          .limit(limitCount);
        if (error) throw error;
        const rows = data || [];
        return rows.map((r: any) => ({
          id: r.product_id ?? r.id,
          productId: r.product_id ?? r.id,
          productName: r.product_name ?? '',
          totalViews: r.total_views ?? 0,
          lastViewed: r.last_viewed ? new Date(r.last_viewed) : new Date(),
          viewsByDay: r.views_by_day ?? {},
          firstViewed: r.first_viewed ? new Date(r.first_viewed) : undefined,
          uniqueVisitors: r.visitors?.length ?? 0,
          returningVisitors: (r.visitors?.filter((v: any) => (v.totalVisits ?? 0) > 1).length) ?? 0
        })) as ProductAnalytics[];
      } catch (supabaseError) {
        console.error('[getMostViewedProducts] ❌ Error con Supabase:', supabaseError);
        return [];
      }
    }
    
    console.warn('[getMostViewedProducts] ⚠️ Supabase no está disponible');
    return [];
  } catch (error: any) {
    console.error('[getMostViewedProducts] ❌ Error crítico:', error?.message || error);
    return [];
  }
};

// Obtiene los productos menos vistos (SOLO Supabase)
export const getLeastViewedProducts = async (limitCount = 10): Promise<ProductAnalytics[]> => {
  try {
    console.log('[getLeastViewedProducts] 🔍 Buscando productos menos vistos, límite:', limitCount);
    
    const isSupabase = typeof (db as any)?.from === 'function';
    if (!isSupabase) {
      console.warn('[getLeastViewedProducts] ⚠️ Supabase no está disponible');
      return [];
    }

    const { data, error } = await (db as any)
      .from('product_analytics')
      .select('*')
      .order('total_views', { ascending: true })
      .limit(limitCount);

    if (error) {
      console.error('[getLeastViewedProducts] ❌ Error:', error);
      return [];
    }

    console.log('[getLeastViewedProducts] ✅ Encontrados', data?.length || 0, 'productos');

    return (data || []).map((r: any) => ({
      id: r.product_id ?? r.id,
      productId: r.product_id ?? r.id,
      productName: r.product_name ?? '',
      totalViews: r.total_views ?? 0,
      lastViewed: r.last_viewed ? new Date(r.last_viewed) : new Date(),
      viewsByDay: r.views_by_day ?? {},
      firstViewed: r.first_viewed ? new Date(r.first_viewed) : undefined,
      uniqueVisitors: r.visitors?.length ?? 0,
      returningVisitors: (r.visitors?.filter((v: any) => (v.totalVisits ?? 0) > 1).length) ?? 0
    })) as ProductAnalytics[];
  } catch (error: any) {
    console.error('[getLeastViewedProducts] ❌ Error crítico:', error?.message || error);
    return [];
  }
};

// Obtiene las vistas de un producto específico (SOLO Supabase)
export const getProductViewsData = async (productId: string) => {
  try {
    console.log('[getProductViewsData] 🔍 Buscando datos para producto:', productId);
    
    const isSupabase = typeof (db as any)?.from === 'function';
    if (!isSupabase) {
      console.warn('[getProductViewsData] ⚠️ Supabase no está disponible');
      return null;
    }

    const { data, error } = await (db as any)
      .from('product_analytics')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle();

    if (error) {
      console.error('[getProductViewsData] ❌ Error:', error);
      return null;
    }

    if (!data) {
      console.log('[getProductViewsData] ℹ️ No se encontraron datos para el producto');
      return null;
    }

    console.log('[getProductViewsData] ✅ Datos encontrados:', {
      productId: data.product_id,
      totalViews: data.total_views
    });

    return {
      id: data.product_id ?? data.id,
      productId: data.product_id ?? data.id,
      productName: data.product_name ?? '',
      totalViews: data.total_views ?? 0,
      lastViewed: data.last_viewed ? new Date(data.last_viewed) : new Date(),
      viewsByDay: data.views_by_day ?? {},
      firstViewed: data.first_viewed ? new Date(data.first_viewed) : undefined
    } as ProductAnalytics;
  } catch (error: any) {
    console.error('[getProductViewsData] ❌ Error crítico:', error?.message || error);
    return null;
  }
};

// Obtiene datos para gráficos de tendencia (últimos 30 días) (SOLO Supabase)
export const getProductViewsTrend = async (productId?: string) => {
  try {
    console.log('[getProductViewsTrend] 📈 Obteniendo tendencia de vistas', productId ? `para producto: ${productId}` : 'para todos los productos');
    
    // Generamos un array de los últimos 30 días (formato YYYY-MM-DD)
    const last30Days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last30Days.push(date.toISOString().split('T')[0]);
    }
    
    const isSupabase = typeof (db as any)?.from === 'function';
    if (!isSupabase) {
      console.warn('[getProductViewsTrend] ⚠️ Supabase no está disponible');
      return last30Days.map(day => ({ date: day, views: 0 }));
    }
    
    // Si se especifica un producto, obtenemos solo sus datos
    if (productId) {
      const productData = await getProductViewsData(productId);
      if (productData) {
        const viewsByDay = productData.viewsByDay || {};
        return last30Days.map(day => ({
          date: day,
          views: viewsByDay[day] || 0
        }));
      }
      return last30Days.map(day => ({ date: day, views: 0 }));
    } 
    
    // Si no se especifica producto, obtenemos datos agregados de todos los productos
    const { data, error } = await (db as any)
      .from('product_analytics')
      .select('views_by_day');
    
    if (error) {
      console.error('[getProductViewsTrend] ❌ Error:', error);
      return last30Days.map(day => ({ date: day, views: 0 }));
    }
    
    const aggregated: Record<string, number> = {};
    (data || []).forEach((row: any) => {
      const viewsByDay = row.views_by_day || {};
      for (const day in viewsByDay) {
        aggregated[day] = (aggregated[day] || 0) + (viewsByDay[day] || 0);
      }
    });
    
    console.log('[getProductViewsTrend] ✅ Tendencias calculadas');
    
    return last30Days.map(day => ({
      date: day,
      views: aggregated[day] || 0
    }));
  } catch (error: any) {
    console.error('[getProductViewsTrend] ❌ Error crítico:', error?.message || error);
    return [];
  }
};

// Exporta datos para Excel (todos los productos con su análisis) (SOLO Supabase)
export const getProductsViewsForExport = async () => {
  try {
    console.log('[getProductsViewsForExport] 📊 Preparando datos para exportación...');
    
    const isSupabase = typeof (db as any)?.from === 'function';
    if (!isSupabase) {
      console.warn('[getProductsViewsForExport] ⚠️ Supabase no está disponible');
      return [];
    }

    const { data, error } = await (db as any)
      .from('product_analytics')
      .select('*');

    if (error) {
      console.error('[getProductsViewsForExport] ❌ Error:', error);
      return [];
    }

    console.log('[getProductsViewsForExport] ✅ Encontrados', data?.length || 0, 'productos para exportar');

    return (data || []).map((row: any) => {
      const viewsByDay = row.views_by_day || {};
      const dates = Object.keys(viewsByDay);
      const totalDays = dates.length;
      const totalViews = row.total_views || 0;
      const averageViewsPerDay = totalDays > 0 ? totalViews / totalDays : 0;
      
      // Encontramos el día con más vistas
      let peakDay = "";
      let peakViews = 0;
      
      for (const day in viewsByDay) {
        if (viewsByDay[day] > peakViews) {
          peakDay = day;
          peakViews = viewsByDay[day];
        }
      }
      
      return {
        id: row.product_id ?? row.id,
        productName: row.product_name || "Producto sin nombre",
        totalViews,
        averageViewsPerDay: averageViewsPerDay.toFixed(2),
        firstViewed: dates.length > 0 ? dates.sort()[0] : "Sin datos",
        lastViewed: row.last_viewed ? new Date(row.last_viewed).toLocaleDateString() : "Sin datos",
        peakDay,
        peakViews,
        viewsByDay
      };
    });
  } catch (error: any) {
    console.error('[getProductsViewsForExport] ❌ Error crítico:', error?.message || error);
    return [];
  }
};

// Obtiene los eventos detallados de visualización de un producto (SOLO Supabase)
export const getDetailedViewEvents = async (productId: string, startDate?: string, endDate?: string): Promise<ViewEvent[]> => {
  try {
    console.log('[getDetailedViewEvents] 🔍 Buscando eventos detallados para producto:', productId);
    
    const isSupabase = typeof (db as any)?.from === 'function';
    if (!isSupabase) {
      console.warn('[getDetailedViewEvents] ⚠️ Supabase no está disponible');
      return [];
    }

    if (!productId) {
      console.error('[getDetailedViewEvents] ❌ No se proporcionó un ID de producto válido');
      return [];
    }

    let query = (db as any).from('product_views').select('*').eq('product_id', productId);

    if (startDate && endDate) {
      const startISO = new Date(startDate).toISOString();
      const endISO = new Date(endDate);
      endISO.setHours(23, 59, 59, 999);
      query = query.gte('timestamp', startISO).lte('timestamp', endISO.toISOString());
      console.log('[getDetailedViewEvents] 📅 Filtrando por fechas:', { startISO, endISO: endISO.toISOString() });
    }

    query = query.order('timestamp', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[getDetailedViewEvents] ❌ Error:', error);
      return [];
    }

    console.log('[getDetailedViewEvents] ✅ Encontrados', data?.length || 0, 'eventos');

    return (data || []).map((row: any) => ({
      id: row.id,
      timestamp: new Date(row.timestamp),
      userId: row.user_id || row.session_id || 'unknown',
      displayName: row.user_name || (row.is_anonymous ? 'Usuario anónimo' : 'Usuario'),
      email: row.user_email || null,
      deviceType: row.device_info?.device || 'Desconocido',
      source: row.referrer || 'Directo',
      duration: null,
      location: row.device_info?.location?.country || 'Desconocido'
    })) as ViewEvent[];
  } catch (error: any) {
    console.error('[getDetailedViewEvents] ❌ Error crítico:', error?.message || error);
    return [];
  }
};
