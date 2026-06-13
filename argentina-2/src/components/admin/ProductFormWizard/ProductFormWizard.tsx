import React, { useState, useEffect, cloneElement } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, ChevronRight, Check, Package, DollarSign, Image as ImageIcon, 
  SlidersHorizontal, Tag, Award, Filter, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProductWizard } from './useProductWizard';
import { WizardStep } from './types';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { PricingStep } from './steps/PricingStep';
import { ImagesStep } from './steps/ImagesStep';
import { SpecificationsStep } from './steps/SpecificationsStep';
import { OffersStep } from './steps/OffersStep';
import { BenefitsStep } from './steps/BenefitsStep';
import { FilterGroupsStep } from './steps/FilterGroupsStep';
import { db } from '@/firebase';
import { useProductSave } from './useProductSave';
import { toast } from '@/hooks/use-toast';
import { clearProductWizardDraft } from './useProductWizard';

interface ProductFormWizardProps {
  selectedProductId?: string | null;
  onProductSelected?: () => void;
  onSave?: (formData: any) => Promise<void>;
  categories?: Array<{ id: string; name: string; parentId?: string | null }>;
  user?: any;
  liberta?: string;
}

export const ProductFormWizard: React.FC<ProductFormWizardProps> = ({ 
  selectedProductId, 
  onProductSelected,
  onSave,
  categories: externalCategories,
  user,
  liberta = 'no'
}) => {
  const [categories, setCategories] = useState<Array<{ id: string; name: string; parentId?: string | null }>>(externalCategories || []);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!!selectedProductId);
  const [editingId, setEditingId] = useState<string | null>(selectedProductId || null);
  const [currentLiberta, setCurrentLiberta] = useState(liberta || 'no');
  const [showDraftRestored, setShowDraftRestored] = useState(false);
  const isSupabase = typeof (db as any)?.from === 'function';
  const { saveProduct } = useProductSave();

  // Inicializar useProductWizard después de declarar isEditing
  const {
    formData,
    setFormData,
    currentStep,
    completedSteps,
    stepValidations,
    setStepValidation,
    goToStep,
    nextStep,
    previousStep,
    resetWizard,
    canProceedToStep
  } = useProductWizard(undefined, isEditing);

  // Verificar si hay un borrador guardado al montar el componente
  useEffect(() => {
    try {
      const stored = localStorage.getItem('product_wizard_draft');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.formData && (parsed.formData.name || parsed.formData.description || parsed.formData.price)) {
          setShowDraftRestored(true);
          // Ocultar el mensaje después de 5 segundos
          setTimeout(() => setShowDraftRestored(false), 5000);
        }
      }
    } catch (error) {
      // Ignorar errores de localStorage
    }
  }, []);

  useEffect(() => {
    if (externalCategories) {
      setCategories(externalCategories);
    } else {
      fetchCategories();
    }
  }, [externalCategories]);

  useEffect(() => {
    const loadProductData = async () => {
      if (selectedProductId) {
        setEditingId(selectedProductId);
        setIsEditing(true);
        setLoading(true);
        
        try {
          // Cargar datos del producto desde la base de datos
          if (isSupabase) {
            const { data, error } = await (db as any)
              .from("products")
              .select("*")
              .eq("id", selectedProductId)
              .single();
            
            if (error) throw error;
            
            if (data) {
              // Normalizar los datos del producto
              const addImages = data.additional_images ?? data.additionalImages ?? [];
              const validImages = Array.isArray(addImages) ? addImages.filter(img => img && img.trim()) : [];
              const paddedImages = [...validImages, '', '', ''].slice(0, 3);
              
              // Pre-llenar el formulario con los datos del producto
              setFormData({
                name: data.name || '',
                description: data.description || '',
                category: data.category_id ?? data.category ?? '',
                subcategory: data.subcategory || '',
                terceraCategoria: data.tercera_categoria ?? '',
                price: String(data.price || ''),
                cost: String(data.cost || ''),
                stock: String(data.stock || ''),
                image: data.image || '',
                additionalImages: paddedImages,
                specifications: data.specifications && data.specifications.length > 0 ? 
                  data.specifications : [{ name: '', value: '' }],
                colors: data.colors || [],
                isOffer: data.is_offer ?? data.isOffer ?? false,
                discount: String(data.discount || ''),
                originalPrice: String((data.original_price ?? data.originalPrice) || ''),
                benefits: data.benefits || [],
                warranties: data.warranties || [],
                paymentMethods: (data.payment_methods ?? data.paymentMethods) || [],
                filterGroups: (data.filter_groups ?? data.filterGroups) || [],
                filterOptions: (data.filter_options ?? data.filterOptions) || {},
                isDecant: data.is_decant ?? data.isDecant ?? false,
                decantOptions: (() => {
                  const raw = data.decant_options ?? data.decantOptions;
                  if (raw && typeof raw === 'object') {
                    return {
                      '2.5': { enabled: !!raw?.['2.5']?.enabled, price: String(raw?.['2.5']?.price ?? ''), stock: String(raw?.['2.5']?.stock ?? '') },
                      '5':   { enabled: !!raw?.['5']?.enabled,   price: String(raw?.['5']?.price ?? ''),   stock: String(raw?.['5']?.stock ?? '') },
                      '10':  { enabled: !!raw?.['10']?.enabled,  price: String(raw?.['10']?.price ?? ''),  stock: String(raw?.['10']?.stock ?? '') },
                    };
                  }
                  return {
                    '2.5': { enabled: false, price: '', stock: '' },
                    '5':   { enabled: true,  price: '', stock: '' },
                    '10':  { enabled: true,  price: '', stock: '' },
                  };
                })(),
                isPublished: data.is_published ?? data.isPublished ?? true,
              });
              
              toast({
                title: "Producto cargado",
                description: "Los datos del producto se han cargado correctamente para editar."
              });
            }
          }
        } catch (error) {
          console.error('Error cargando producto:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudieron cargar los datos del producto."
          });
        } finally {
          setLoading(false);
        }
      } else {
        setIsEditing(false);
        setEditingId(null);
      }
    };
    
    loadProductData();
  }, [selectedProductId, isSupabase]);

  useEffect(() => {
    if (user) {
      const lowEmail = user.email?.toLowerCase();
      if (user.isAdmin || lowEmail === "admin@gmail.com" || lowEmail === "admin@tienda.com") {
        setCurrentLiberta("si");
      } else if (user.subCuenta === "si") {
        setCurrentLiberta(user.liberta === "si" ? "si" : "no");
      } else {
        setCurrentLiberta("si");
      }
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      if (isSupabase) {
        const { data, error } = await (db as any)
          .from("categories")
          .select("*")
          .order("created_at", { ascending: true });
        if (error) throw error;

        const allCategories = (data || []).map((cat: any) => ({
          id: cat.id,
          name: cat.name || "Categoría sin nombre",
          parentId: cat.parent_id ?? cat.parentId ?? null
        }));
        setCategories(allCategories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const steps: WizardStep[] = [
    {
      id: 'basic',
      title: 'Información Básica',
      description: 'Nombre, descripción y categorías',
      icon: <Package className="w-5 h-5" />,
      required: true
    },
    {
      id: 'pricing',
      title: 'Precios y Stock',
      description: 'Precio, costo e inventario',
      icon: <DollarSign className="w-5 h-5" />,
      required: true
    },
    {
      id: 'images',
      title: 'Imágenes',
      description: 'Imagen principal y adicionales',
      icon: <ImageIcon className="w-5 h-5" />,
      required: true
    },
    {
      id: 'specifications',
      title: 'Especificaciones',
      description: 'Detalles técnicos y características',
      icon: <SlidersHorizontal className="w-5 h-5" />,
      required: false
    },
    {
      id: 'offers',
      title: 'Ofertas',
      description: 'Descuentos y promociones',
      icon: <Tag className="w-5 h-5" />,
      required: false
    },
    {
      id: 'benefits',
      title: 'Beneficios',
      description: 'Garantías y métodos de pago',
      icon: <Award className="w-5 h-5" />,
      required: false
    },
    {
      id: 'filters',
      title: 'Grupos de Filtros',
      description: 'Asociar a grupos de filtros',
      icon: <Filter className="w-5 h-5" />,
      required: false
    }
  ];

  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentStepData = steps[currentStep];

  const renderStepContent = () => {
    const stepProps = {
      formData,
      setFormData,
      categories,
      onValidationChange: (isValid: boolean) => {
        setStepValidation(currentStep, isValid);
      }
    };

    switch (currentStepData.id) {
      case 'basic':
        return <BasicInfoStep {...stepProps} />;
      case 'pricing':
        return <PricingStep {...stepProps} />;
      case 'images':
        return <ImagesStep {...stepProps} />;
      case 'specifications':
        return <SpecificationsStep {...stepProps} />;
      case 'offers':
        return <OffersStep {...stepProps} />;
      case 'benefits':
        return <BenefitsStep {...stepProps} />;
      case 'filters':
        return <FilterGroupsStep {...stepProps} />;
      default:
        return null;
    }
  };

  const handleCloseWizard = (clearDraft = false) => {
    if (clearDraft) {
      resetWizard();
      clearProductWizardDraft();
    }
    setIsEditing(false);
    setEditingId(null);
    if (onProductSelected) {
      onProductSelected();
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (onSave) {
        await onSave(formData);
        handleCloseWizard(true); // Limpiar borrador al guardar exitosamente
      } else {
        await saveProduct({
          formData,
          categories,
          user: user || {},
          liberta: currentLiberta,
          isEditing,
          editingId,
          onSuccess: () => {
            handleCloseWizard(true); // Limpiar borrador al guardar exitosamente
          }
        });
      }
    } catch (error) {
      console.error('Error al guardar producto:', error);
      // No limpiar el borrador si hay error, para que el usuario no pierda sus datos
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const isValid = stepValidations[currentStep] !== false;
    if (isValid || !currentStepData.required) {
      nextStep(currentStepData.id);
    }
  };

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden -mt-6">
      {/* Mensaje de borrador restaurado */}
      {showDraftRestored && (
        <Card className="border-blue-200 bg-blue-50 max-w-full">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 text-white">Borrador restaurado</Badge>
                <span className="text-sm text-blue-800">
                  Se ha restaurado tu borrador anterior. Puedes continuar donde lo dejaste.
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDraftRestored(false)}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Progress Bar */}
      <Card className="border-slate-200 max-w-full">
        <CardContent className="pt-3 pb-1">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="text-slate-600">Paso {currentStep + 1} de {totalSteps}</span>
                <span className="text-slate-600">{Math.round(progress)}% completado</span>
              </div>
              <div className="flex items-center gap-2">
                {(formData.name || formData.description || formData.price) && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    Borrador guardado
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCloseWizard(false)}
                  className="text-slate-600 hover:text-slate-900"
                  title="Cerrar (los datos se guardan automáticamente)"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Steps Navigation */}
      <Card className="border-slate-200 max-w-full">
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-7 gap-2 max-w-full">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.has(index);
              const isCurrent = index === currentStep;
              const isAccessible = canProceedToStep(index);

              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(index)}
                  disabled={!isAccessible}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                    isCurrent && "bg-blue-50 border-2 border-blue-500",
                    isCompleted && !isCurrent && "bg-green-50 border border-green-200",
                    !isAccessible && "opacity-50 cursor-not-allowed",
                    isAccessible && !isCurrent && "hover:bg-slate-50 border border-slate-200"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-full transition-colors flex-shrink-0",
                    isCurrent && "bg-blue-500 text-white",
                    isCompleted && !isCurrent && "bg-green-500 text-white",
                    !isCompleted && !isCurrent && "bg-slate-200 text-slate-600"
                  )}>
                    {isCompleted && !isCurrent ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      React.cloneElement(step.icon as React.ReactElement, { className: "w-3.5 h-3.5" })
                    )}
                  </div>
                  <div className="text-center w-full">
                    <div className={cn(
                      "text-[10px] font-semibold leading-tight",
                      isCurrent && "text-blue-700",
                      isCompleted && !isCurrent && "text-green-700",
                      !isCompleted && !isCurrent && "text-slate-600"
                    )}>
                      {step.title}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5 leading-tight">{step.description}</div>
                  </div>
                  {step.required && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 mt-0.5">Req.</Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <Card className="border-slate-200 max-w-full">
        <CardContent className="p-6">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={previousStep}
          disabled={currentStep === 0}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        <div className="flex items-center gap-2">
          {currentStep < totalSteps - 1 ? (
            <Button
              onClick={handleNext}
              disabled={stepValidations[currentStep] === false && currentStepData.required}
              className="flex items-center gap-2"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Guardar Producto
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
