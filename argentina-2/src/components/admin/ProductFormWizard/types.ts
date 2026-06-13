// Tipos compartidos para el wizard de productos
export interface ProductFormData {
  // Información básica
  name: string;
  description: string;
  category: string;
  subcategory: string;
  terceraCategoria: string;

  // Precios y stock
  price: string;
  cost: string;
  stock: string;

  // Imágenes
  image: string;
  additionalImages: string[];

  // Especificaciones
  specifications: Array<{ name: string; value: string }>;
  colors: Array<{ name: string; hexCode: string; image: string }>;

  // Ofertas
  isOffer: boolean;
  discount: string;
  originalPrice: string;

  // Beneficios y garantías
  benefits: string[];
  warranties: string[];
  paymentMethods: string[];

  // Grupos de filtros (legacy - mantener para compatibilidad)
  filterGroups: string[];

  // Opciones de filtros seleccionadas: { filterId: [optionId1, optionId2, ...] }
  filterOptions?: { [filterId: string]: string[] };

  // Opciones de decant (volúmenes con precio individual y stock individual)
  isDecant?: boolean;
  decantOptions?: {
    '2.5': { enabled: boolean; price: string; stock: string };
    '5': { enabled: boolean; price: string; stock: string };
    '10': { enabled: boolean; price: string; stock: string };
  };

  // Estado
  isPublished: boolean;
}

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  required?: boolean;
}

export interface StepComponentProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData | ((prev: ProductFormData) => ProductFormData)) => void;
  categories: Array<{ id: string; name: string; parentId?: string | null }>;
  onValidationChange?: (isValid: boolean) => void;
}
