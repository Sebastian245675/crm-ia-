import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { getAuthHeaders, storage } from '@/firebase';

// Mocks para evitar errores de compilación ya que Firebase fue removido
const ref = (...args: any[]) => ({}) as any;
const uploadBytesResumable = (...args: any[]) => ({
  on: (event: string, progress: any, error: any, complete: any) => { }
}) as any;
const getDownloadURL = (...args: any[]) => Promise.resolve('');
const deleteObject = (...args: any[]) => Promise.resolve();
import { toast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
  maxSizeMB?: number;
  aspectRatio?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label = "Imagen",
  folder = "products",
  maxSizeMB = 5,
  aspectRatio = "aspect-square"
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string>(value || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSupabase = typeof (storage as any)?.from === 'function';

  // Sincronizar preview con value cuando cambia (útil al editar productos)
  useEffect(() => {
    if (value !== preview) {
      setPreview(value || '');
    }
  }, [value]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Archivo no válido",
        description: "Por favor selecciona una imagen válida (JPG, PNG, WebP, etc.)"
      });
      return;
    }

    // Validar tamaño
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast({
        variant: "destructive",
        title: "Archivo muy grande",
        description: `La imagen debe ser menor a ${maxSizeMB}MB. Tu archivo es ${fileSizeMB.toFixed(2)}MB`
      });
      return;
    }

    // Crear preview local
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Subir a API local
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Simular progreso de carga local (ya que es local, va muy rápido)
      let progress = 10;
      const progressInterval = setInterval(() => {
        progress += 15;
        if (progress >= 90) {
          clearInterval(progressInterval);
        } else {
          setUploadProgress(progress);
        }
      }, 80);

      const authToken = localStorage.getItem('auth_access_token');
      const uploadUrl = authToken
        ? `${window.location.origin}/api/upload?access_token=${encodeURIComponent(authToken)}`
        : `${window.location.origin}/api/upload`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.url) {
        onChange(data.url);
        setPreview(data.url);
        setUploadProgress(100);
        setIsUploading(false);
        toast({
          title: "✅ Imagen subida",
          description: "La imagen se subió y convirtió correctamente a WEBP en el servidor.",
          className: "bg-green-50 border-green-200"
        });
      } else {
        throw new Error(data.message || "Error al procesar la imagen en el servidor.");
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setIsUploading(false);
      setUploadProgress(0);
      toast({
        variant: "destructive",
        title: "Error al subir imagen",
        description: error.message || "Ocurrió un error al procesar la imagen."
      });
    }
  };

  const handleRemove = () => {
    setPreview('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasImage = preview || value;

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-semibold flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          {label}
        </Label>
      )}

      <div className="space-y-3">
        {/* Input de archivo - siempre presente pero oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {/* Zona de carga */}
        {!hasImage ? (
          <div
            className={cn(
              "relative border-2 border-dashed rounded-xl transition-all duration-200",
              "hover:border-blue-400 hover:bg-blue-50/30",
              isDragging ? "border-blue-500 bg-blue-50 scale-[1.02]" : "border-gray-300 bg-gray-50",
              isUploading && "pointer-events-none opacity-60"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >

            <div className="p-8 text-center">
              {isUploading ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative">
                      <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">
                          {Math.round(uploadProgress)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-sm text-blue-600 font-medium">
                      Subiendo imagen...
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full">
                      <Upload className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-gray-700 mb-2">
                    Arrastra tu imagen aquí
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    o haz clic para seleccionar
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white hover:bg-blue-50 border-blue-200 text-blue-600"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar archivo
                  </Button>
                  <p className="text-xs text-gray-400 mt-3">
                    JPG, PNG, WebP • Máx. {maxSizeMB}MB
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Vista previa con imagen */
          <div className="relative group">
            <div className={cn(
              "relative overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-50",
              aspectRatio === "aspect-square" ? "aspect-square" : "aspect-video"
            )}>
              {isUploading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-10">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                  <Progress value={uploadProgress} className="w-1/2 h-2 mb-2" />
                  <p className="text-sm text-blue-600 font-medium">
                    {Math.round(uploadProgress)}%
                  </p>
                </div>
              ) : (
                <>
                  {/* Botones de acción siempre visibles */}
                  <div className="absolute top-2 right-2 flex gap-2 z-20">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (fileInputRef.current) {
                          fileInputRef.current.click();
                        }
                      }}
                      className="h-8 w-8 rounded-full bg-white/95 hover:bg-white shadow-lg border border-gray-200 cursor-pointer"
                      title="Cambiar imagen"
                    >
                      <Upload className="h-4 w-4 text-gray-700" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8 rounded-full shadow-lg bg-red-500/95 hover:bg-red-600"
                      onClick={handleRemove}
                      title="Eliminar imagen"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              <img
                src={preview || value}
                alt="Preview"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />

              {!isUploading && (
                <>
                  {/* Overlay con botón Cambiar - visible al hacer hover para mejor UX */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4 z-10 pointer-events-none">
                    <div className="flex gap-2 pointer-events-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (fileInputRef.current) {
                            fileInputRef.current.click();
                          }
                        }}
                        className="bg-white/90 hover:bg-white text-gray-800 cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        Cambiar imagen
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {uploadProgress === 100 && !isUploading && (
              <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full flex items-center gap-1 text-xs font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                <Check className="h-3 w-3" />
                Subida exitosa
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


