import React from 'react';
import { Label } from '@/components/ui/label';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { MultiImageUploader } from '@/components/admin/MultiImageUploader';
import { StepComponentProps } from '../types';

export const ImagesStep: React.FC<StepComponentProps> = ({ 
  formData, 
  setFormData,
  onValidationChange 
}) => {
  // Validación en tiempo real
  React.useEffect(() => {
    const isValid = !!formData.image;
    onValidationChange?.(isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.image]);

  return (
    <div className="space-y-6">
      {/* Imagen Principal */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-gray-700">
          Imagen Principal <span className="text-red-500">*</span>
        </Label>
        <ImageUploader
          value={formData.image}
          onChange={(url) => setFormData({ ...formData, image: url })}
          label=""
          folder="products/main"
          maxSizeMB={5}
          aspectRatio="aspect-square"
        />
        <p className="text-xs text-gray-500">
          Esta será la imagen principal que se mostrará en las tarjetas de producto
        </p>
      </div>

      {/* Imágenes Adicionales */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-gray-700">
          Imágenes Adicionales <span className="text-xs text-gray-500">(Opcional)</span>
        </Label>
        <MultiImageUploader
          images={formData.additionalImages}
          onChange={(images) => setFormData({ ...formData, additionalImages: images })}
          label=""
          maxImages={6}
          folder="products/additional"
        />
        <p className="text-xs text-gray-500">
          Agrega hasta 6 imágenes adicionales para mostrar diferentes ángulos del producto
        </p>
      </div>
    </div>
  );
};
