// Exportaciones principales del wizard de productos
export { ProductFormWizard } from './ProductFormWizard';
export { ProductFormWithWizard } from './ProductFormWithWizard';
export { useProductWizard } from './useProductWizard';
export type { ProductFormData, WizardStep, StepComponentProps } from './types';

// Exportaciones de los pasos (opcional, para uso directo si es necesario)
export { BasicInfoStep } from './steps/BasicInfoStep';
export { PricingStep } from './steps/PricingStep';
export { ImagesStep } from './steps/ImagesStep';
export { SpecificationsStep } from './steps/SpecificationsStep';
export { OffersStep } from './steps/OffersStep';
export { BenefitsStep } from './steps/BenefitsStep';
export { FilterGroupsStep } from './steps/FilterGroupsStep';
