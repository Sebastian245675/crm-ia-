import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { StepComponentProps } from '../types';

export const SpecificationsStep: React.FC<StepComponentProps> = ({ 
  formData, 
  setFormData 
}) => {
  const addSpecification = () => {
    setFormData({
      ...formData,
      specifications: [...formData.specifications, { name: '', value: '' }]
    });
  };

  const removeSpecification = (index: number) => {
    setFormData({
      ...formData,
      specifications: formData.specifications.filter((_, i) => i !== index)
    });
  };

  const updateSpecification = (index: number, field: 'name' | 'value', value: string) => {
    const newSpecs = [...formData.specifications];
    newSpecs[index] = { ...newSpecs[index], [field]: value };
    setFormData({ ...formData, specifications: newSpecs });
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
        <p className="text-sm text-indigo-900">
          <strong>Especificaciones del Producto</strong>
        </p>
        <p className="text-sm text-indigo-700 mt-1">
          Agrega características técnicas o detalles específicos del producto (ej: Capacidad, Material, etc.)
        </p>
      </div>

      <div className="space-y-4">
        {formData.specifications.map((spec, index) => (
          <div key={index} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center bg-gray-50 p-3 rounded-lg">
            <div className="sm:col-span-2">
              <Input
                value={spec.name}
                onChange={(e) => updateSpecification(index, 'name', e.target.value)}
                placeholder="Ej: Capacidad"
                className="h-10"
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                value={spec.value}
                onChange={(e) => updateSpecification(index, 'value', e.target.value)}
                placeholder="Ej: 100ml"
                className="h-10"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSpecification(index)}
                disabled={formData.specifications.length === 1}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addSpecification}
          className="w-full flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Agregar Especificación
        </Button>
      </div>
    </div>
  );
};
