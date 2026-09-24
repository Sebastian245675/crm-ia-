export const AGENCY_PERMISSIONS = [
  { key: 'viewDashboard', label: 'Ver dashboard', description: 'Indicadores generales y analítica ejecutiva.' },
  { key: 'manageMessages', label: 'Mensajes', description: 'Conversaciones, canales y bandeja omnicanal.' },
  { key: 'manageContacts', label: 'Contactos', description: 'Contactos, tareas y datos comerciales.' },
  { key: 'manageCalendar', label: 'Calendario', description: 'Citas, agendas y disponibilidad.' },
  { key: 'manageOpportunities', label: 'Oportunidades', description: 'Pipeline, etapas y oportunidades.' },
  { key: 'manageProducts', label: 'Productos', description: 'Catálogo, categorías, filtros e inventario.' },
  { key: 'publishProducts', label: 'Publicar sin revisión', description: 'Permite aplicar cambios de productos directamente, sin aprobación.' },
  { key: 'manageMarketing', label: 'Marketing', description: 'Campañas, publicaciones y biblioteca multimedia.' },
  { key: 'manageOrders', label: 'Pedidos y POS', description: 'Pedidos, ventas físicas, cobros y devoluciones.' },
  { key: 'accessErp', label: 'ERP integral', description: 'Operaciones, compras, almacenes y recursos.' },
  { key: 'manageWebsite', label: 'Sitio web', description: 'Funnels, sitios, SEO, formularios y comentarios.' },
  { key: 'accessAiAssistant', label: 'Asistente IA', description: 'Agentes, configuración y conocimiento de IA.' },
  { key: 'viewAccounting', label: 'Contabilidad', description: 'Contabilidad, facturación y reportes financieros.' },
  { key: 'manageSettings', label: 'Configuración', description: 'Ajustes e integraciones de la agencia.' },
] as const;

export type AgencyPermissionKey = typeof AGENCY_PERMISSIONS[number]['key'];
export type AgencyPermissions = Partial<Record<AgencyPermissionKey, boolean>>;

export const EMPTY_AGENCY_PERMISSIONS: Record<AgencyPermissionKey, boolean> = Object.fromEntries(
  AGENCY_PERMISSIONS.map(({ key }) => [key, false])
) as Record<AgencyPermissionKey, boolean>;

const TAB_PERMISSION: Record<string, AgencyPermissionKey> = {
  dashboard: 'viewDashboard',
  mensajeria: 'manageMessages',
  contacts: 'manageContacts',
  calendars: 'manageCalendar',
  opportunities: 'manageOpportunities',
  products: 'manageProducts',
  categories: 'manageProducts',
  filters: 'manageProducts',
  marketing: 'manageMarketing',
  media: 'manageMarketing',
  orders: 'manageOrders',
  erp: 'accessErp',
  website: 'manageWebsite',
  funnels: 'manageWebsite',
  sitios: 'manageWebsite',
  seo: 'manageWebsite',
  analytics: 'manageWebsite',
  comments: 'manageWebsite',
  'ai-assistant': 'accessAiAssistant',
  contabilidad: 'viewAccounting',
  'flujo-caja': 'viewAccounting',
  facturacion: 'viewAccounting',
  reportes: 'viewAccounting',
  configuration: 'manageSettings',
  wpp: 'manageSettings',
  'mail-config': 'manageSettings',
  'payment-gateways': 'manageSettings',
  modalities: 'manageSettings',
  revisiones: 'manageSettings',
};

export interface AgencyUserLike {
  subCuenta?: string;
  accountRole?: string;
  permissions?: AgencyPermissions;
}

export const isAgencySubAccount = (user?: AgencyUserLike | null) =>
  user?.accountRole === 'agency_user' || user?.subCuenta === 'si';

export const canAccessAdminTab = (user: AgencyUserLike | null | undefined, tab: string) => {
  if (!isAgencySubAccount(user)) return true;
  if (tab === 'help-manual') return true;
  if (['subaccounts', 'employees', 'seguridad', 'planes', 'info'].includes(tab)) return false;
  const permission = TAB_PERMISSION[tab];
  return permission ? user?.permissions?.[permission] === true : false;
};

export const firstAllowedAdminTab = (user: AgencyUserLike | null | undefined) => {
  const priority = ['dashboard', 'mensajeria', 'contacts', 'calendars', 'opportunities', 'orders', 'products', 'marketing', 'erp', 'website', 'ai-assistant', 'flujo-caja', 'contabilidad'];
  return priority.find((tab) => canAccessAdminTab(user, tab)) || 'help-manual';
};
