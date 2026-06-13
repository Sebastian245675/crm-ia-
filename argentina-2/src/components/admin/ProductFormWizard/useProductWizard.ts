import { useState, useCallback, useEffect } from 'react';
import { ProductFormData } from './types';

const STORAGE_KEY = 'product_wizard_draft';

// Función para guardar en localStorage
const saveToStorage = (data: {
  formData: ProductFormData;
  currentStep: number;
  completedSteps: number[];
  stepValidations: Record<number, boolean>;
}) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('No se pudo guardar el borrador en localStorage:', error);
  }
};

// Función para cargar desde localStorage
const loadFromStorage = (): {
  formData: ProductFormData;
  currentStep: number;
  completedSteps: number[];
  stepValidations: Record<number, boolean>;
} | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convertir completedSteps de array a Set
      return {
        ...parsed,
        completedSteps: Array.isArray(parsed.completedSteps) ? parsed.completedSteps : []
      };
    }
  } catch (error) {
    console.warn('No se pudo cargar el borrador desde localStorage:', error);
  }
  return null;
};

// Función para limpiar localStorage
export const clearProductWizardDraft = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('No se pudo limpiar el borrador de localStorage:', error);
  }
};

const defaultFormData: ProductFormData = {
  name: '',
  description: '',
  category: '',
  subcategory: '',
  terceraCategoria: '',
  price: '',
  cost: '',
  stock: '',
  image: '',
  additionalImages: ['', '', ''],
  specifications: [{ name: '', value: '' }],
  colors: [],
  isOffer: false,
  discount: '',
  originalPrice: '',
  benefits: [],
  warranties: [],
  paymentMethods: [],
  filterGroups: [],
  filterOptions: {},
  isDecant: false,
  decantOptions: {
    '2.5': { enabled: false, price: '', stock: '' },
    '5': { enabled: true, price: '', stock: '' },
    '10': { enabled: true, price: '', stock: '' },
  },
  isPublished: true,
};

export const useProductWizard = (initialData?: Partial<ProductFormData>, isEditing = false) => {
  // Solo cargar borrador si NO estamos editando un producto existente
  // Si initialData tiene un ID o datos significativos, probablemente es edición
  const [isEditingMode, setIsEditingMode] = useState(isEditing || (initialData && 'id' in initialData));

  // Actualizar isEditingMode cuando cambia el prop isEditing
  useEffect(() => {
    setIsEditingMode(isEditing || (initialData && 'id' in initialData));
  }, [isEditing, initialData]);

  const storedData = !isEditingMode ? loadFromStorage() : null;
  const hasStoredData = storedData && storedData.formData &&
    (storedData.formData.name || storedData.formData.description || storedData.formData.price);

  const [formData, setFormData] = useState<ProductFormData>(() => {
    // Si hay initialData (edición), usar eso primero
    if (initialData && Object.keys(initialData).length > 0) {
      return { ...defaultFormData, ...initialData };
    }
    // Si hay borrador guardado y no estamos editando, restaurar
    if (hasStoredData) {
      return { ...defaultFormData, ...storedData.formData };
    }
    return { ...defaultFormData };
  });

  const [currentStep, setCurrentStep] = useState(() => {
    // Si estamos editando, empezar desde el paso 0
    if (isEditingMode) return 0;
    // Si hay borrador guardado, restaurar el paso
    if (hasStoredData) {
      return storedData.currentStep || 0;
    }
    return 0;
  });

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => {
    // Si estamos editando, empezar sin pasos completados
    if (isEditingMode) return new Set();
    // Si hay borrador guardado, restaurar pasos completados
    if (hasStoredData && storedData.completedSteps) {
      return new Set(storedData.completedSteps);
    }
    return new Set();
  });

  const [stepValidations, setStepValidations] = useState<Record<number, boolean>>(() => {
    // Si estamos editando, empezar sin validaciones
    if (isEditingMode) return {};
    // Si hay borrador guardado, restaurar validaciones
    if (hasStoredData) {
      return storedData.stepValidations || {};
    }
    return {};
  });

  // Guardar en localStorage cada vez que cambie el formData, currentStep o completedSteps
  // Solo si NO estamos editando un producto existente
  useEffect(() => {
    if (isEditingMode) return; // No guardar borradores cuando se edita

    // Solo guardar si hay datos significativos (no un formulario vacío)
    const hasData = formData.name || formData.description || formData.price ||
      formData.image || formData.category || formData.specifications?.length > 0;

    if (hasData) {
      saveToStorage({
        formData,
        currentStep,
        completedSteps: Array.from(completedSteps),
        stepValidations
      });
    }
  }, [formData, currentStep, completedSteps, stepValidations, isEditingMode]);

  const updateFormData = useCallback((updates: Partial<ProductFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const updateFormDataField = useCallback(<K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const validateStep = useCallback((stepId: string, formData: ProductFormData): boolean => {
    switch (stepId) {
      case 'basic':
        return !!(formData.name && formData.category);
      case 'pricing': {
        // Si es Decant, validar que al menos una variante tenga precio y stock
        if (formData.isDecant && formData.decantOptions) {
          const opts = formData.decantOptions;
          return (['2.5', '5', '10'] as const).some(
            ml => opts[ml].enabled && opts[ml].price !== '' && opts[ml].stock !== ''
          );
        }
        return !!(formData.price && formData.stock);
      }
      case 'images':
        return !!formData.image;
      case 'specifications':
      case 'offers':
      case 'benefits':
      case 'filters':
        return true; // Pasos opcionales
      default:
        return true;
    }
  }, []);

  const markStepCompleted = useCallback((stepIndex: number) => {
    setCompletedSteps(prev => new Set(prev).add(stepIndex));
  }, []);

  const setStepValidation = useCallback((stepIndex: number, isValid: boolean) => {
    setStepValidations(prev => ({ ...prev, [stepIndex]: isValid }));
  }, []);

  const canProceedToStep = useCallback((targetStep: number): boolean => {
    // Puede ir al paso actual o anterior
    if (targetStep <= currentStep) return true;
    // Puede ir a un paso si todos los anteriores requeridos están completados
    return Array.from({ length: targetStep }, (_, i) => i)
      .every(step => completedSteps.has(step) || stepValidations[step] !== false);
  }, [currentStep, completedSteps, stepValidations]);

  const goToStep = useCallback((stepIndex: number) => {
    if (canProceedToStep(stepIndex)) {
      setCurrentStep(stepIndex);
    }
  }, [canProceedToStep]);

  const nextStep = useCallback((stepId: string) => {
    if (validateStep(stepId, formData)) {
      markStepCompleted(currentStep);
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, formData, validateStep, markStepCompleted]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const resetWizard = useCallback(() => {
    setFormData({
      ...defaultFormData,
      ...initialData
    });
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setStepValidations({});
    // Limpiar localStorage cuando se resetea (solo si no estamos editando)
    if (!isEditingMode) {
      clearProductWizardDraft();
    }
  }, [initialData, isEditingMode]);

  return {
    formData,
    setFormData,
    updateFormData,
    updateFormDataField,
    currentStep,
    completedSteps,
    stepValidations,
    setStepValidation,
    validateStep,
    goToStep,
    nextStep,
    previousStep,
    resetWizard,
    canProceedToStep
  };
};
