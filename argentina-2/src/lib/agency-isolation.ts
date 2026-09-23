/**
 * Utilidades para el aislamiento de datos por agencia (Multi-Tenancy)
 * Asegura que cada agencia (Websy, Voltium Sanrey, etc.) acceda y visualice
 * exclusivamente sus propios datos (oportunidades, contactos, configuraciones).
 */

export const normalizeAgencyId = (id?: string | null): string => {
  if (!id) return '';
  const s = String(id).trim().toLowerCase();
  if (s === 'voltium' || s === 'voltium-sanrey' || s === 'voltium_sanrey') {
    return 'voltium-sanrey';
  }
  if (s === 'websy' || s === '2') {
    return '2';
  }
  return s;
};
export const getActiveAgencyId = (user: any): string => {
  if (user?.agencyId) return String(user.agencyId).trim();
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('auth_user_session') : null;
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.agency_id) return String(u.agency_id).trim();
      if (u?.user_metadata?.agency_id) return String(u.user_metadata.agency_id).trim();
    }
  } catch {}
  return String(user?.agencies?.[0]?.id || '').trim();
};

/**
 * Determina si una oportunidad comercial pertenece a la agencia activa.
 */
export const isOpportunityForAgency = (opp: any, activeAgencyId?: string | null): boolean => {
  const normActive = normalizeAgencyId(activeAgencyId);
  const oppAgency = normalizeAgencyId(opp?.agency_id || opp?.agencyId);

  // Si la oportunidad tiene agency_id explícito:
  if (oppAgency) {
    if (normActive === 'voltium-sanrey') {
      return oppAgency === 'voltium-sanrey';
    }
    if (normActive === '2') {
      return oppAgency === '2';
    }
    return oppAgency === normActive;
  }

  // Si es un registro previo sin agency_id explícito:
  const text = `${opp?.title || ''} ${opp?.company_name || ''} ${opp?.notes || ''}`.toLowerCase();
  const isVoltium = text.includes('voltium');

  if (normActive === 'voltium-sanrey') {
    return isVoltium;
  }

  if (normActive === '2' || !normActive) {
    return !isVoltium;
  }

  return false;
};

/**
 * Determina si un contacto pertenece a la agencia activa.
 */
export const isContactForAgency = (contact: any, activeAgencyId?: string | null): boolean => {
  const normActive = normalizeAgencyId(activeAgencyId);
  const contactAgency = normalizeAgencyId(contact?.agency_id || contact?.agencyId || contact?.owner_id);

  // Si el contacto tiene agency_id explícito:
  if (contactAgency) {
    if (normActive === 'voltium-sanrey') {
      return contactAgency === 'voltium-sanrey';
    }
    if (normActive === '2') {
      return contactAgency === '2';
    }
    return contactAgency === normActive;
  }

  // Si es un contacto heredado sin agency_id explícito:
  const tagsStr = Array.isArray(contact?.tags) ? contact.tags.join(' ') : String(contact?.tags || '');
  const text = `${contact?.name || ''} ${contact?.company || ''} ${contact?.email || ''} ${tagsStr}`.toLowerCase();
  const isVoltium = text.includes('voltium');

  if (normActive === 'voltium-sanrey') {
    return isVoltium;
  }

  if (normActive === '2' || !normActive) {
    return !isVoltium;
  }

  return false;
};

/**
 * Determina si un sitio web pertenece a la agencia activa.
 */
export const isWebsiteForAgency = (site: any, activeAgencyId?: string | null): boolean => {
  const normActive = normalizeAgencyId(activeAgencyId);
  const siteAgency = normalizeAgencyId(site?.agency_id || site?.agencyId || site?.owner_id);

  if (siteAgency) {
    if (normActive === 'voltium-sanrey') return siteAgency === 'voltium-sanrey';
    if (normActive === '2') return siteAgency === '2';
    return siteAgency === normActive;
  }

  const text = `${site?.id || ''} ${site?.name || ''} ${site?.path || ''} ${site?.domain || ''}`.toLowerCase();
  const isVoltium = text.includes('voltium');

  if (normActive === 'voltium-sanrey') return isVoltium;
  if (normActive === '2' || !normActive) return !isVoltium;
  return false;
};

/**
 * Determina si un formulario personalizado pertenece a la agencia activa.
 */
export const isFormForAgency = (form: any, activeAgencyId?: string | null): boolean => {
  const normActive = normalizeAgencyId(activeAgencyId);
  const formAgency = normalizeAgencyId(form?.agency_id || form?.agencyId || form?.owner_id);

  if (formAgency) {
    if (normActive === 'voltium-sanrey') return formAgency === 'voltium-sanrey';
    if (normActive === '2') return formAgency === '2';
    return formAgency === normActive;
  }

  const text = `${form?.id || ''} ${form?.name || ''} ${form?.title || ''} ${form?.website_id || ''}`.toLowerCase();
  const isVoltium = text.includes('voltium');

  if (normActive === 'voltium-sanrey') return isVoltium;
  if (normActive === '2' || !normActive) return !isVoltium;
  return false;
};

/**
 * Determina si una campaña de marketing pertenece a la agencia activa.
 */
export const isCampaignForAgency = (campaign: any, activeAgencyId?: string | null): boolean => {
  const normActive = normalizeAgencyId(activeAgencyId);
  const campAgency = normalizeAgencyId(campaign?.agency_id || campaign?.agencyId || campaign?.owner_id);

  if (campAgency) {
    if (normActive === 'voltium-sanrey') return campAgency === 'voltium-sanrey';
    if (normActive === '2') return campAgency === '2';
    return campAgency === normActive;
  }

  const text = `${campaign?.id || ''} ${campaign?.name || ''} ${campaign?.subject || ''} ${campaign?.senderEmail || ''}`.toLowerCase();
  const isVoltium = text.includes('voltium');

  if (normActive === 'voltium-sanrey') return isVoltium;
  if (normActive === '2' || !normActive) return !isVoltium;
  return false;
};

/**
 * Determina si un evento de calendario pertenece a la agencia activa.
 */
export const isEventForAgency = (event: any, activeAgencyId?: string | null): boolean => {
  const normActive = normalizeAgencyId(activeAgencyId);
  const eventAgency = normalizeAgencyId(event?.agency_id || event?.agencyId || event?.owner_id);

  if (eventAgency) {
    if (normActive === 'voltium-sanrey') return eventAgency === 'voltium-sanrey';
    if (normActive === '2') return eventAgency === '2';
    return eventAgency === normActive;
  }

  const text = `${event?.id || ''} ${event?.title || ''} ${event?.clientName || ''} ${event?.description || ''}`.toLowerCase();
  const isVoltium = text.includes('voltium');

  if (normActive === 'voltium-sanrey') return isVoltium;
  if (normActive === '2' || !normActive) return !isVoltium;
  return false;
};

/**
 * Determina si un producto pertenece a la agencia activa.
 */
export const isProductForAgency = (product: any, activeAgencyId?: string | null): boolean => {
  const normActive = normalizeAgencyId(activeAgencyId);
  const prodAgency = normalizeAgencyId(product?.agency_id || product?.agencyId || product?.owner_id);

  if (prodAgency) {
    if (normActive === 'voltium-sanrey') return prodAgency === 'voltium-sanrey';
    if (normActive === '2') return prodAgency === '2';
    return prodAgency === normActive;
  }

  const text = `${product?.id || ''} ${product?.name || ''} ${product?.title || ''} ${product?.category || ''} ${product?.description || ''}`.toLowerCase();
  const isVoltium = text.includes('voltium') || text.includes('aguila') || text.includes('moto') || text.includes('bicicleta') || text.includes('velmpu');

  if (normActive === 'voltium-sanrey') return isVoltium;
  if (normActive === '2' || !normActive) return !isVoltium;
  return false;
};

/**
 * Determina si un pedido pertenece a la agencia activa.
 */
export const isOrderForAgency = (order: any, activeAgencyId?: string | null): boolean => {
  const normActive = normalizeAgencyId(activeAgencyId);
  const orderAgency = normalizeAgencyId(order?.agency_id || order?.agencyId || order?.owner_id);

  if (orderAgency) {
    if (normActive === 'voltium-sanrey') return orderAgency === 'voltium-sanrey';
    if (normActive === '2') return orderAgency === '2';
    return orderAgency === normActive;
  }

  const text = `${order?.id || ''} ${order?.order_number || ''} ${order?.customer_name || ''} ${order?.userName || ''} ${order?.notes || ''} ${JSON.stringify(order?.items || '')}`.toLowerCase();
  const isVoltium = text.includes('voltium') || text.includes('aguila') || text.includes('moto');

  if (normActive === 'voltium-sanrey') return isVoltium;
  if (normActive === '2' || !normActive) return !isVoltium;
  return false;
};

/**
 * Determina si una categoría pertenece a la agencia activa.
 */
export const isCategoryForAgency = (category: any, activeAgencyId?: string | null): boolean => {
  const normActive = normalizeAgencyId(activeAgencyId);
  const catAgency = normalizeAgencyId(category?.agency_id || category?.agencyId || category?.owner_id);

  if (catAgency) {
    if (normActive === 'voltium-sanrey') return catAgency === 'voltium-sanrey';
    if (normActive === '2') return catAgency === '2';
    return catAgency === normActive;
  }

  const text = `${category?.id || ''} ${category?.name || ''} ${category?.title || ''} ${category?.filterKey || ''}`.toLowerCase();
  const isVoltium = text.includes('velmpu') || text.includes('motos') || text.includes('triciclos') || text.includes('voltium');

  if (normActive === 'voltium-sanrey') return isVoltium;
  if (normActive === '2' || !normActive) return !isVoltium;
  return false;
};

/**
 * Determina si un archivo multimedia pertenece a la agencia activa.
 */
export const isMediaForAgency = (media: any, activeAgencyId?: string | null): boolean => {
  const normActive = normalizeAgencyId(activeAgencyId);
  const mediaAgency = normalizeAgencyId(media?.agency_id || media?.agencyId || media?.owner_id);

  if (mediaAgency) {
    if (normActive === 'voltium-sanrey') return mediaAgency === 'voltium-sanrey';
    if (normActive === '2') return mediaAgency === '2';
    return mediaAgency === normActive;
  }

  const text = `${media?.id || ''} ${media?.name || ''} ${media?.url || ''}`.toLowerCase();
  const isVoltium = text.includes('voltium');

  if (normActive === 'voltium-sanrey') return isVoltium;
  if (normActive === '2' || !normActive) return !isVoltium;
  return false;
};

/**
 * Determina si un ítem genérico (gastos, tareas, filtros, plantillas, empleados, etc.) pertenece a la agencia activa.
 */
export const isItemForAgency = (item: any, activeAgencyId?: string | null): boolean => {
  const normActive = normalizeAgencyId(activeAgencyId);
  const itemAgency = normalizeAgencyId(item?.agency_id || item?.agencyId || item?.owner_id);

  if (itemAgency) {
    if (normActive === 'voltium-sanrey') return itemAgency === 'voltium-sanrey';
    if (normActive === '2') return itemAgency === '2';
    return itemAgency === normActive;
  }

  const text = `${item?.id || ''} ${item?.name || ''} ${item?.title || ''} ${item?.description || ''} ${item?.empresa || ''} ${item?.categoria || ''}`.toLowerCase();
  const isVoltium = text.includes('voltium') || text.includes('aguila') || text.includes('moto');

  if (normActive === 'voltium-sanrey') return isVoltium;
  if (normActive === '2' || !normActive) return !isVoltium;
  return false;
};
