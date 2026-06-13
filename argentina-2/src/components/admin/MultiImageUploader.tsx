import React from 'react';
import { ImageUploader } from './ImageUploader';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface MultiImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  label?: string;
  maxImages?: number;
  folder?: string;
}

export const MultiImageUploader: React.FC<MultiImageUploaderProps> = ({
  images,
  onChange,
  label = "Imágenes Adicionales",
  maxImages = 5,
  folder = "products/additional"
}) => {
  const handleImageChange = (index: number, url: string) => {
    const newImages = [...images];
    newImages[index] = url;
    onChange(newImages);
  };

  const handleAddSlot = () => {
    if (images.length < maxImages) {
      onChange([...images, '']);
    }
  };

  const handleRemoveSlot = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const filledImages = images.filter(img => img !== '').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-2">
          {label}
          <span className="text-xs text-gray-500 font-normal">
            ({filledImages}/{maxImages} imágenes)
          </span>
        </Label>
        {images.length < maxImages && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSlot}
            className="h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Agregar imagen
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div key={index} className="relative group">
            <ImageUploader
              value={image}
              onChange={(url) => handleImageChange(index, url)}
              folder={folder}
              aspectRatio="aspect-square"
            />
            {images.length > 1 && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => handleRemoveSlot(index)}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity z-20"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};


