import { SetMetadata } from '@nestjs/common';

export type AgencyPermission =
  | 'viewDashboard'
  | 'manageMessages'
  | 'manageContacts'
  | 'manageCalendar'
  | 'manageOpportunities'
  | 'manageProducts'
  | 'publishProducts'
  | 'manageMarketing'
  | 'manageOrders'
  | 'accessErp'
  | 'manageWebsite'
  | 'accessAiAssistant'
  | 'viewAccounting'
  | 'manageSettings';

export const AGENCY_PERMISSION_KEY = 'agency_permission';
export const RequireAgencyPermission = (permission: AgencyPermission | 'table') =>
  SetMetadata(AGENCY_PERMISSION_KEY, permission);
