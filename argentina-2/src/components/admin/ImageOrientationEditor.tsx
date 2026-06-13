import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

interface ImageOrientationEditorProps {
  imageUrl: string;
  onSave: (blob: Blob) => void;
}

const ROTATIONS = [0, 90, 180, 270];

export const ImageOrientationEditor: React.FC<ImageOrientationEditorProps> = ({ imageUrl, onSave }) => {
  const [rotation, setRotation] = useState<number>(0);
  const [previewUrl, setPreviewUrl] = useState<string>(imageUrl);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);

  // Rotar la imagen y actualizar la previsualización
  const handleRotate = (angle: number) => {
    setRotation((prev) => (prev + angle) % 360);
    setTimeout(drawImage, 100); // Esperar a que el estado se actualice
  };

  // Dibujar la imagen en el canvas con la rotación actual
  const drawImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      let angle = rotation % 360;
      if (angle < 0) angle += 360;
      // Ajustar dimensiones del canvas según rotación
      if (angle === 90 || angle === 270) {
        canvas.width = h;
        canvas.height = w;
      } else {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      // Transformar según ángulo
      switch (angle) {
        case 90:
          ctx.translate(h, 0);
          ctx.rotate(Math.PI / 2);
          break;
        case 180:
          ctx.translate(w, h);
          ctx.rotate(Math.PI);
          break;
        case 270:
          ctx.translate(0, w);
          ctx.rotate(-Math.PI / 2);
          break;
        default:
          // 0 grados, no transformar
          break;
      }
      ctx.drawImage(img, 0, 0);
      ctx.restore();
      // Actualizar preview
      setPreviewUrl(canvas.toDataURL());
    };
  };

  // Guardar la imagen rotada
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setLoading(true);
    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob);
      }
      setLoading(false);
    }, 'image/jpeg', 0.95);
  };

  // Redibujar cuando cambia la imagen o la rotación
  React.useEffect(() => {
    drawImage();
    // eslint-disable-next-line
  }, [imageUrl, rotation]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-2">Editor de Orientación de Imagen</h3>
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <img src={previewUrl} alt="Preview" className="max-w-xs max-h-80 border rounded" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button onClick={() => handleRotate(90)} disabled={loading}>Rotar 90°</Button>
            <Button onClick={() => handleRotate(180)} disabled={loading}>Rotar 180°</Button>
            <Button onClick={() => handleRotate(270)} disabled={loading}>Rotar 270°</Button>
            <Button onClick={() => setRotation(0)} disabled={loading}>Reset</Button>
          </div>
          <Button onClick={handleSave} disabled={loading} className="bg-blue-600 text-white">Guardar imagen rotada</Button>
        </div>
      </div>
    </div>
  );
};

export default ImageOrientationEditor;
