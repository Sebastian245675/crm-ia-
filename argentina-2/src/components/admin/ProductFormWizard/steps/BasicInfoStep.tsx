import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StepComponentProps } from '../types';
import { db } from '@/firebase';
import { Switch } from '@/components/ui/switch';

export const BasicInfoStep: React.FC<StepComponentProps> = ({ 
  formData, 
  setFormData, 
  categories,
  onValidationChange 
}) => {
  const [modalities, setModalities] = React.useState<any[]>([]);
  const mainCategories = categories.filter(cat => !cat.parentId);
  const subCategories = categories.filter(cat => cat.parentId === formData.category);
  const thirdCategories = categories.filter(cat => cat.parentId === formData.subcategory);
  
  const isSupabase = typeof (db as any)?.from === 'function';

  React.useEffect(() => {
    const fetchModalities = async () => {
      try {
        if (isSupabase) {
          const { data } = await db.from('product_templates').select('*');
          if (data) setModalities(data);
        }
      } catch (e) {
        console.error('Error loading modalities in BasicInfoStep:', e);
      }
    };
    fetchModalities();
  }, [isSupabase]);

  // Validación en tiempo real
  React.useEffect(() => {
    let isValid = !!(formData.name && formData.category);

    // Validar campos requeridos de la modalidad
    if (formData.modalityId && formData.modalityId !== 'default' && modalities.length > 0) {
      const selectedMod = modalities.find(m => m.id === formData.modalityId);
      if (selectedMod && selectedMod.fields) {
        const custom = formData.customFields || {};
        const allRequiredFilled = selectedMod.fields
          .filter((f: any) => f.required)
          .every((f: any) => {
            const val = custom[f.name];
            if (f.type === 'boolean') return val !== undefined;
            return val !== undefined && val !== null && String(val).trim() !== '';
          });
        if (!allRequiredFilled) {
          isValid = false;
        }
      }
    }

    onValidationChange?.(isValid);
  }, [formData.name, formData.category, formData.modalityId, formData.customFields, modalities, onValidationChange]);

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    const currentCustomFields = formData.customFields || {};
    setFormData({
      ...formData,
      customFields: {
        ...currentCustomFields,
        [fieldName]: value
      }
    });
  };

  const selectedModality = modalities.find(m => m.id === formData.modalityId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nombre del Producto */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
            Nombre del Producto <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej: Perfume Chanel No. 5 o Casa de 2 plantas"
            required
            className="h-11"
          />
        </div>

        {/* Modalidad del Producto */}
        <div className="space-y-2">
          <Label htmlFor="modality" className="text-sm font-semibold text-gray-700">
            Modalidad / Plantilla de Producto
          </Label>
          <Select 
            value={formData.modalityId || "default"} 
            onValueChange={(value) => {
              setFormData({ 
                ...formData, 
                modalityId: value,
                customFields: {} // Limpiar campos si cambia modalidad
              });
            }}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Seleccionar modalidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Estándar (E-commerce)</SelectItem>
              {modalities.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categoría Principal */}
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-semibold">
            Categoría Principal <span className="text-red-500">*</span>
          </Label>
          <Select 
            value={formData.category} 
            onValueChange={(value) => {
              setFormData({ 
                ...formData, 
                category: value, 
                subcategory: '',
                terceraCategoria: ''
              });
            }}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Seleccionar categoría principal" />
            </SelectTrigger>
            <SelectContent>
              {mainCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subcategoría */}
        {formData.category && (
          <div className="space-y-2">
            <Label htmlFor="subcategory" className="text-sm font-semibold">
              Subcategoría <span className="text-xs text-gray-500">(Opcional)</span>
            </Label>
            <Select 
              value={formData.subcategory || "none"} 
              onValueChange={(value) => {
                setFormData({
                  ...formData, 
                  subcategory: value === "none" ? "" : value,
                  terceraCategoria: ""
                });
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Seleccionar subcategoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguna</SelectItem>
                {subCategories.map((subCategory) => (
                  <SelectItem key={subCategory.id} value={subCategory.id}>
                    {subCategory.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Tercera Categoría */}
        {formData.category && formData.subcategory && (
          <div className="space-y-2">
            <Label htmlFor="terceraCategoria" className="text-sm font-semibold">
              Tercera Categoría <span className="text-xs text-gray-500">(Opcional)</span>
            </Label>
            <Select 
              value={formData.terceraCategoria || "none"} 
              onValueChange={(value) => {
                setFormData({
                  ...formData, 
                  terceraCategoria: value === "none" ? "" : value
                });
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Seleccionar tercera categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguna</SelectItem>
                {thirdCategories.map((thirdCategory) => (
                  <SelectItem key={thirdCategory.id} value={thirdCategory.id}>
                    {thirdCategory.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Descripción */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
            Descripción <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe el producto o inmueble detalladamente..."
            required
            className="min-h-[100px]"
          />
        </div>

        {/* Dynamic Modality Custom Fields */}
        {selectedModality && selectedModality.fields && selectedModality.fields.length > 0 && (
          <div className="md:col-span-2 border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
              Campos Personalizados de la Modalidad ({selectedModality.name})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedModality.fields.map((field: any) => {
                const fieldValue = (formData.customFields || {})[field.name] ?? (field.type === 'boolean' ? false : '');
                
                return (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={`custom-${field.name}`} className="text-xs font-semibold text-slate-700 flex items-center">
                      {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    
                    {field.type === 'text' && (
                      <Input
                        id={`custom-${field.name}`}
                        value={fieldValue}
                        onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                        placeholder={`Ingrese ${field.label}`}
                        className="bg-white h-10"
                        required={field.required}
                      />
                    )}

                    {field.type === 'number' && (
                      <Input
                        id={`custom-${field.name}`}
                        type="number"
                        value={fieldValue}
                        onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                        placeholder={`Ingrese ${field.label}`}
                        className="bg-white h-10"
                        required={field.required}
                      />
                    )}

                    {field.type === 'boolean' && (
                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          id={`custom-${field.name}`}
                          checked={fieldValue === true || fieldValue === 'true'}
                          onCheckedChange={(checked) => handleCustomFieldChange(field.name, checked)}
                        />
                        <span className="text-xs text-slate-600">Habilitar / Sí</span>
                      </div>
                    )}

                    {field.type === 'select' && (
                      <Select
                        value={fieldValue || "none"}
                        onValueChange={(val) => handleCustomFieldChange(field.name, val === "none" ? "" : val)}
                      >
                        <SelectTrigger className="bg-white h-10">
                          <SelectValue placeholder={`Seleccionar ${field.label}`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Seleccionar...</SelectItem>
                          {(field.options || "").split(',').map((opt: string) => {
                            const trimmed = opt.trim();
                            return (
                              <SelectItem key={trimmed} value={trimmed}>
                                {trimmed}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Vista previa de clasificación */}
      {(formData.category || formData.subcategory || formData.terceraCategoria) && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900">Clasificación:</p>
          <p className="text-sm text-blue-700 mt-1">
            {categories.find(cat => cat.id === formData.category)?.name || ''}
            {formData.subcategory && ' > ' + categories.find(cat => cat.id === formData.subcategory)?.name}
            {formData.terceraCategoria && ' > ' + categories.find(cat => cat.id === formData.terceraCategoria)?.name}
          </p>
        </div>
      )}
    </div>
  );
};
