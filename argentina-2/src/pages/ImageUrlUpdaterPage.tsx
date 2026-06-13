import React, { useState } from 'react';
import ImageUrlUpdater from '@/components/tools/ImageUrlUpdater';
import { AdvancedHeader } from '@/components/layout/AdvancedHeader';
import { TopPromoBar } from '@/components/layout/TopPromoBar';
import { useCategories } from '@/hooks/use-categories';
import { AlertOctagon } from 'lucide-react';

const ImageUrlUpdaterPage: React.FC = () => {
  const { categories, setCategories, mainCategories, subcategoriesByParent, thirdLevelBySubcategory } = useCategories();
  const [selectedCategory, setSelectedCategory] = React.useState("Todos");
  const [promoVisible, setPromoVisible] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50">
      <TopPromoBar setPromoVisible={setPromoVisible} />
      
      <AdvancedHeader
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        promoVisible={promoVisible}
        mainCategories={mainCategories}
        subcategoriesByParent={subcategoriesByParent}
        thirdLevelBySubcategory={thirdLevelBySubcategory}
      />
      
      <div className="pt-40 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-md">
            <div className="flex items-start">
              <AlertOctagon className="h-6 w-6 text-amber-600 mr-2 mt-0.5" />
              <div>
                <h2 className="font-bold text-amber-800">Herramienta de Administración</h2>
                <p className="text-amber-700">
                  Esta herramienta permite actualizar todas las URLs de imágenes en la base de datos, 
                  cambiando la ruta base de Cloudinary a tu nuevo servidor Hostinger. 
                  Utiliza con precaución y asegúrate de tener una copia de seguridad.
                </p>
              </div>
            </div>
          </div>
          
          <ImageUrlUpdater />
        </div>
      </div>
    </div>
  );
};

export default ImageUrlUpdaterPage;
