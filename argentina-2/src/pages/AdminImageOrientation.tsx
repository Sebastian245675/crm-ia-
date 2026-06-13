import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ImageOrientationEditor from '@/components/admin/ImageOrientationEditor';
import { sampleProducts as productsData } from '@/data/products';

const getProductImage = (product: any) => product.image || product.images?.[0] || '';

const uploadImage = async (blob: Blob): Promise<string> => {
  // Aquí deberías subir el blob a Cloudinary/Firebase y devolver la URL
  // Simulación: devolver un ObjectURL temporal
  return URL.createObjectURL(blob);
};

const AdminImageOrientation: React.FC = () => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const product = productsData.find((p: any) => p.id === selectedProductId);
  const imageUrl = newImageUrl || (product ? getProductImage(product) : '');

  const handleSave = async (blob: Blob) => {
    setSaving(true);
    const url = await uploadImage(blob);
    setNewImageUrl(url);
    // Aquí deberías actualizar la URL en la base de datos del producto
    setSaving(false);
    alert('Imagen rotada y guardada. Actualiza la URL en la base de datos.');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Rotar Imagen de Producto</h1>
      <Card className="p-6 mb-8">
        <label className="block mb-2 font-medium">Selecciona un producto:</label>
        <select
          value={selectedProductId}
          onChange={e => {
            setSelectedProductId(e.target.value);
            setNewImageUrl('');
          }}
          className="border rounded px-3 py-2 w-full max-w-md"
        >
          <option value="">-- Selecciona --</option>
          {productsData.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Card>
      {imageUrl && (
        <ImageOrientationEditor imageUrl={imageUrl} onSave={handleSave} />
      )}
      {saving && <div className="mt-4 text-blue-600">Guardando imagen...</div>}
    </div>
  );
};

export default AdminImageOrientation;
