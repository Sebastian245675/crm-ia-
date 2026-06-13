import React, { useState } from 'react';
import ImageDownloader from '@/components/tools/ImageDownloader';
import { AdvancedHeader } from '@/components/layout/AdvancedHeader';
import { TopPromoBar } from '@/components/layout/TopPromoBar';
import { useCategories } from '@/hooks/use-categories';

// Modificar el archivo TopPromoBar.tsx para agregar mensajes personalizados está fuera del alcance
// de esta solución inmediata, así que usaremos el componente tal como está.

const ImageDownloaderPage: React.FC = () => {
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
        promoVisible={true}
        mainCategories={mainCategories}
        subcategoriesByParent={subcategoriesByParent}
        thirdLevelBySubcategory={thirdLevelBySubcategory}
      />
      
      <div className="pt-40 pb-20">
        <ImageDownloader />
      </div>
    </div>
  );
};

export default ImageDownloaderPage;
