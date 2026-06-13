import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from "@/firebase";

export interface Category {
  id?: string;
  name: string;
  image?: string;
  parentId?: string;
  parentName?: string;
  isMain?: boolean;
  slug?: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<string[]>(["Todos"]);
  const [categoriesData, setCategoriesData] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const { data: categoriesData, error } = await db
          .from('categories')
          .select('*');
        
        if (error) throw error;
        
        // Obtener todas las categorías y procesarlas
        const todosCategory = { 
          id: "todos", 
          name: "Todos", 
          image: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=facearea&w=96&q=80",
          isMain: true 
        };

        const processedCats = [
          todosCategory,
          ...(categoriesData || []).map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            image: cat.image,
            parentId: cat.parent_id,
            parentName: cat.parent_name,
            slug: cat.slug,
            // Es categoría principal si no tiene parentId o está vacío
            isMain: !cat.parent_id || cat.parent_id === ""
          }))
        ];

        setCategoriesData(processedCats);
        
        // Solo incluir en el array de strings las categorías principales
        const mainCategories = processedCats
          .filter(cat => cat.isMain)
          .map(cat => cat.name);
        
        setCategories(mainCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);

  // Categorías principales solamente
  const mainCategories = useMemo(() => {
    return categoriesData.filter(cat => cat.isMain);
  }, [categoriesData]);

  // Subcategorías agrupadas por categoría principal (key = nombre del padre)
  // Usar parent.id para obtener el nombre real del padre (más fiable que parentName)
  const subcategoriesByParent = useMemo(() => {
    const mainCats = categoriesData.filter(c => c.isMain && c.id && c.id !== "todos");
    const mainIds = new Set(mainCats.map(c => c.id!));
    const mainById = Object.fromEntries(mainCats.map(c => [c.id!, c]));
    const result: Record<string, Category[]> = {};
    categoriesData.forEach(cat => {
      if (cat.parentId && mainIds.has(cat.parentId)) {
        const parent = mainById[cat.parentId];
        const parentName = parent?.name?.trim();
        if (parentName) {
          if (!result[parentName]) result[parentName] = [];
          result[parentName].push(cat);
        }
      }
    });
    return result;
  }, [categoriesData]);

  // Terceras categorías agrupadas por subcategoría (key = sub id, por parent_id)
  const thirdLevelBySubcategory = useMemo(() => {
    const mainIds = new Set(
      categoriesData.filter(c => c.isMain && c.id && c.id !== "todos").map(c => c.id!)
    );
    const subIds = new Set(
      categoriesData
        .filter(c => c.parentId && mainIds.has(c.parentId))
        .map(c => c.id!)
    );
    const result: Record<string, Category[]> = {};
    categoriesData
      .filter(c => c.id && c.id !== "todos")
      .forEach(cat => {
        if (cat.parentId && subIds.has(cat.parentId)) {
          const key = cat.parentId;
          if (!result[key]) result[key] = [];
          result[key].push(cat);
        }
      });
    return result;
  }, [categoriesData]);

  const categoriesById = useMemo(() => {
    const m: Record<string, Category> = {};
    categoriesData.forEach((c) => {
      if (c.id) m[c.id] = c;
    });
    return m;
  }, [categoriesData]);

  const categoriesByName = useMemo(() => {
    const m: Record<string, Category> = {};
    categoriesData.forEach((c) => {
      m[c.name] = c;
    });
    return m;
  }, [categoriesData]);

  const categoriesBySlug = useMemo(() => {
    const m: Record<string, Category> = {};
    categoriesData.forEach((c) => {
      if (c.slug) m[c.slug] = c;
    });
    return m;
  }, [categoriesData]);

  const getCategoryByIdOrNameOrSlug = useCallback((val: string) => {
    if (!val) return undefined;
    const lower = val.toLowerCase().trim();
    if (categoriesById[val]) return categoriesById[val];
    if (categoriesBySlug[val]) return categoriesBySlug[val];
    const match = categoriesData.find(c => c.name.toLowerCase() === lower);
    if (match) return match;
    return undefined;
  }, [categoriesById, categoriesBySlug, categoriesData]);

  const getCategoryById = useCallback((id: string) => categoriesById[id], [categoriesById]);
  const getCategoryByName = useCallback((name: string) => categoriesByName[name], [categoriesByName]);

  const getBreadcrumbPath = useCallback(
    (categoryOrName: Category | string): string[] => {
      if (!categoryOrName || categoryOrName === "Todos") return [];
      const path: string[] = [];
      let cat = typeof categoryOrName === 'string' 
        ? getCategoryByIdOrNameOrSlug(categoryOrName)
        : categoryOrName;
      while (cat) {
        path.unshift(cat.name);
        cat = cat.parentId ? categoriesById[cat.parentId] : undefined;
      }
      if (path.length) path.unshift("Inicio");
      else path.push("Inicio", typeof categoryOrName === 'string' ? categoryOrName : categoryOrName.name);
      return path;
    },
    [getCategoryByIdOrNameOrSlug, categoriesById]
  );

  return {
    categories,
    categoriesData,
    mainCategories,
    subcategoriesByParent,
    thirdLevelBySubcategory,
    getCategoryById,
    getCategoryByName,
    getCategoryByIdOrNameOrSlug,
    getBreadcrumbPath,
    loading,
    setCategories,
  };
}
