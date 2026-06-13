import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  FolderTree, Plus, Edit, Trash2, Info, ChevronRight, 
  ChevronDown, ExternalLink, Folder, Box, PackageOpen 
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  image?: string;
  parentId?: string | null;
}

interface CategoryDiagramProps {
  categories: Category[];
  products: any[];
  onEdit: (categoryId: string) => void;
  onDelete: (categoryId: string) => void;
}

export const CategoryDiagram: React.FC<CategoryDiagramProps> = ({ 
  categories, 
  products,
  onEdit,
  onDelete
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Separar categorías por niveles
  const mainCategories = categories.filter(cat => !cat.parentId);
  const subCategories = categories.filter(cat => cat.parentId && 
    mainCategories.some(main => main.id === cat.parentId));
  const thirdCategories = categories.filter(cat => 
    cat.parentId && subCategories.some(sub => sub.id === cat.parentId));

  // Inicializar el estado de expansión para todas las categorías principales
  useEffect(() => {
    const initialExpandState: Record<string, boolean> = {};
    mainCategories.forEach(cat => {
      initialExpandState[cat.id] = false;
    });
    subCategories.forEach(cat => {
      initialExpandState[cat.id] = false;
    });
    setExpandedCategories(initialExpandState);
  }, [categories]);

  // Contar productos por categoría
  const getProductCount = (categoryId: string, level: 'main' | 'sub' | 'third') => {
    return products.filter(product => {
      if (level === 'main') {
        return product.category === categoryId || 
               product.categoryName === categories.find(c => c.id === categoryId)?.name;
      } else if (level === 'sub') {
        return product.subcategory === categoryId || 
               product.subcategoryName === categories.find(c => c.id === categoryId)?.name;
      } else {
        return product.terceraCategoria === categoryId || 
               product.terceraCategoriaName === categories.find(c => c.id === categoryId)?.name;
      }
    }).length;
  };

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  return (
    <div className="category-diagram">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-sky-600" />
          <h3 className="font-medium text-lg text-sky-800">Vista Diagramada de Categorías</h3>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
            {mainCategories.length} Categorías Principales
          </Badge>
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
            {subCategories.length} Subcategorías
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            {thirdCategories.length} Terceras Categorías
          </Badge>
        </div>
      </div>

      <div className="diagram-container bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 p-6 shadow-inner overflow-auto">
        {mainCategories.map((mainCat) => {
          const mainProductCount = getProductCount(mainCat.id, 'main');
          const childSubcategories = subCategories.filter(sub => sub.parentId === mainCat.id);
          const isExpanded = expandedCategories[mainCat.id];
          
          return (
            <div key={mainCat.id} className="main-category mb-4">
              <div 
                className={`main-category-node flex items-center gap-2 p-3 rounded-lg bg-white border-2 ${
                  hoveredCategory === mainCat.id 
                    ? 'border-sky-400 shadow-md' 
                    : 'border-sky-200'
                } transition-all duration-200 cursor-pointer`}
                onMouseEnter={() => setHoveredCategory(mainCat.id)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full hover:bg-sky-100"
                  onClick={() => toggleExpand(mainCat.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-sky-600" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-sky-600" />
                  )}
                </Button>
                
                <div className="category-icon w-10 h-10 rounded-md bg-sky-100 flex items-center justify-center">
                  {mainCat.image ? (
                    <img 
                      src={mainCat.image} 
                      alt={mainCat.name} 
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = 'https://placehold.co/80/e5f6ff/0284c7?text=C';
                      }}
                    />
                  ) : (
                    <Folder className="h-5 w-5 text-sky-600" />
                  )}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-medium text-sky-800">{mainCat.name}</h4>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="bg-sky-50 text-sky-700 border-sky-100">
                      {childSubcategories.length} Subcategorías
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
                      {mainProductCount} Productos
                    </Badge>
                  </div>
                </div>
                
                <div className="actions flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full hover:bg-amber-100 hover:text-amber-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(mainCat.id);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full hover:bg-red-100 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(mainCat.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {isExpanded && childSubcategories.length > 0 && (
                <div className="subcategories pl-8 mt-2 space-y-2">
                  {childSubcategories.map((subCat) => {
                    const subProductCount = getProductCount(subCat.id, 'sub');
                    const childThirdCategories = thirdCategories.filter(third => third.parentId === subCat.id);
                    const isSubExpanded = expandedCategories[subCat.id];
                    
                    return (
                      <div key={subCat.id} className="subcategory">
                        <div 
                          className={`subcategory-node flex items-center gap-2 p-2 rounded-lg bg-white border-2 ${
                            hoveredCategory === subCat.id 
                              ? 'border-indigo-400 shadow-md' 
                              : 'border-indigo-200'
                          } transition-all duration-200 cursor-pointer`}
                          onMouseEnter={() => setHoveredCategory(subCat.id)}
                          onMouseLeave={() => setHoveredCategory(null)}
                        >
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 w-7 p-0 rounded-full hover:bg-indigo-100"
                            onClick={() => toggleExpand(subCat.id)}
                          >
                            {isSubExpanded ? (
                              <ChevronDown className="h-4 w-4 text-indigo-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-indigo-600" />
                            )}
                          </Button>
                          
                          <div className="category-icon w-8 h-8 rounded-md bg-indigo-100 flex items-center justify-center">
                            <Box className="h-4 w-4 text-indigo-600" />
                          </div>
                          
                          <div className="flex-1">
                            <h5 className="font-medium text-indigo-800 text-sm">{subCat.name}</h5>
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 text-xs">
                                {childThirdCategories.length} Subcategorías
                              </Badge>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-xs">
                                {subProductCount} Productos
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="actions flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 rounded-full hover:bg-amber-100 hover:text-amber-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(subCat.id);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 rounded-full hover:bg-red-100 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(subCat.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        
                        {isSubExpanded && childThirdCategories.length > 0 && (
                          <div className="third-categories pl-8 mt-1 space-y-1">
                            {childThirdCategories.map((thirdCat) => {
                              const thirdProductCount = getProductCount(thirdCat.id, 'third');
                              
                              return (
                                <div 
                                  key={thirdCat.id}
                                  className={`third-category-node flex items-center gap-2 p-2 rounded-lg bg-white border-2 ${
                                    hoveredCategory === thirdCat.id 
                                      ? 'border-purple-400 shadow-md' 
                                      : 'border-purple-200'
                                  } transition-all duration-200 cursor-pointer`}
                                  onMouseEnter={() => setHoveredCategory(thirdCat.id)}
                                  onMouseLeave={() => setHoveredCategory(null)}
                                >
                                  <div className="ml-4"></div>
                                  
                                  <div className="category-icon w-7 h-7 rounded-md bg-purple-100 flex items-center justify-center">
                                    <PackageOpen className="h-3.5 w-3.5 text-purple-600" />
                                  </div>
                                  
                                  <div className="flex-1">
                                    <h6 className="font-medium text-purple-800 text-xs">{thirdCat.name}</h6>
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100 text-xs">
                                      {thirdProductCount} Productos
                                    </Badge>
                                  </div>
                                  
                                  <div className="actions flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 rounded-full hover:bg-amber-100 hover:text-amber-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(thirdCat.id);
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 rounded-full hover:bg-red-100 hover:text-red-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(thirdCat.id);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        
        {mainCategories.length === 0 && (
          <div className="empty-state text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-100 mb-4">
              <FolderTree className="h-8 w-8 text-sky-500" />
            </div>
            <h4 className="text-lg font-medium text-slate-800 mb-1">No hay categorías</h4>
            <p className="text-slate-500 text-sm mb-4">
              Añade una categoría principal para empezar a organizar tu catálogo
            </p>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex items-center justify-center">
        <div className="text-xs text-slate-500 flex flex-wrap justify-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-sky-500"></div>
            <span>Categoría Principal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
            <span>Subcategoría</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>Tercera Categoría</span>
          </div>
        </div>
      </div>
    </div>
  );
};
