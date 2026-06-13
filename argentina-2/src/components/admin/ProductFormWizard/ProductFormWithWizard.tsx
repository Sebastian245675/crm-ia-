import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Package, Edit, Trash2, Search, Plus, X, AlertTriangle, ShieldCheck,
  Loader2, Eye, Filter, ChevronDown, Tags, History, SlidersHorizontal, CreditCard,
  FileSpreadsheet, Download, MoreVertical
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { ProductFormWizard } from './ProductFormWizard';
import { CustomClock } from '@/components/ui/CustomClock';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Utilidad para crear slugs SEO-friendly
function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

interface ProductFormWithWizardProps {
  selectedProductId?: string | null;
  onProductSelected?: () => void;
}

export const ProductFormWithWizard: React.FC<ProductFormWithWizardProps> = ({
  selectedProductId,
  onProductSelected
}) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string; parentId?: string | null }>>([]);
  const [visibleProducts, setVisibleProducts] = useState<number>(20);
  const [hasMoreProducts, setHasMoreProducts] = useState<boolean>(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [liberta, setLiberta] = useState("no");
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'price-high' | 'price-low' | 'name-asc' | 'name-desc'>('recent');
  const [loadingImages, setLoadingImages] = useState<{ [key: string]: boolean }>({});
  const [importing, setImporting] = useState(false);
  const [showClearInventoryAlert, setShowClearInventoryAlert] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isSupabase = typeof (db as any)?.from === 'function';

  useEffect(() => {
    if (user) {
      const lowEmail = user.email?.toLowerCase();
      if (user.isAdmin || lowEmail === "admin@gmail.com" || lowEmail === "admin@tienda.com") {
        setLiberta("si");
      } else if (user.subCuenta === "si") {
        setLiberta(user.liberta === "si" ? "si" : "no");
      } else {
        setLiberta("si");
      }
    }
  }, [user]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Efecto para búsqueda y filtrado debounced (server-side)
  useEffect(() => {
    if (categories.length === 0) return; // Esperar a que las categorías carguen primero

    const timer = setTimeout(() => {
      fetchProducts(searchTerm, selectedCategory);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory, categories.length]);

  useEffect(() => {
    if (selectedProductId) {
      setEditingProductId(selectedProductId);
      setShowWizard(true);
    } else if (selectedProductId === null) {
      setEditingProductId(null);
      setShowWizard(false);
    }
  }, [selectedProductId]);

  const fetchCategories = async () => {
    try {
      if (isSupabase) {
        const { data, error } = await (db as any)
          .from("categories")
          .select("*")
          .order("created_at", { ascending: true });
        if (error) throw error;

        const allCategories = (data || []).map((cat: any) => ({
          id: cat.id,
          name: cat.name || "Categoría sin nombre",
          parentId: cat.parent_id ?? cat.parentId ?? null
        }));
        setCategories(allCategories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async (search?: string, category?: string) => {
    setLoadingProducts(true);
    try {
      if (isSupabase) {
        let query = (db as any).from("products").select("*");
        
        if (search && search.trim()) {
          const term = `%${search.trim()}%`;
          query = query.or(`name.ilike.${term},description.ilike.${term}`);
        }
        
        if (category) {
          query = query.or(`category_id.eq.${category},category.eq.${category},subcategory.eq.${category},tercera_categoria.eq.${category}`);
        }

        const { data, error } = await query
          .order("updated_at", { ascending: false })
          .limit(search ? 1000 : 500); // More products when searching
        
        if (error) throw error;

        const normalized = (data || []).map((product: any) => ({
          id: product.id,
          ...product,
          price: product.price ?? 0,
          originalPrice: product.original_price ?? product.originalPrice ?? product.price ?? 0,
          additionalImages: product.additional_images ?? [],
          category: product.category_id ?? product.category ?? '',
          subcategory: product.subcategory ?? '',
          terceraCategoria: product.tercera_categoria ?? '',
          isOffer: product.is_offer ?? product.isOffer ?? false,
          isPublished: product.is_published ?? product.isPublished ?? true,
          categoryName: categories.find(c => c.id === (product.category_id ?? product.category))?.name || product.category,
          subcategoryName: categories.find(c => c.id === product.subcategory)?.name || product.subcategory,
        }));
        setProducts(normalized);
        // Reset visible products to initial 20 when results change
        setVisibleProducts(20);
      }
    } catch (error) {
      console.error('Error cargando productos:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los productos."
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  // Actualizar nombres de categoría cuando cambien las categorías
  useEffect(() => {
    if (categories.length > 0 && products.length > 0) {
      setProducts(prevProducts => prevProducts.map(product => ({
        ...product,
        categoryName: categories.find(c => c.id === product.category)?.name || product.category,
        subcategoryName: categories.find(c => c.id === product.subcategory)?.name || product.subcategory,
      })));
    }
  }, [categories]);

  const filteredProducts = useMemo(() => {
    if (products.length === 0) return [];

    const hasSearchTerm = searchTerm.trim().length > 0;
    const hasCategoryFilter = selectedCategory.length > 0;

    if (!hasSearchTerm && !hasCategoryFilter) {
      return products;
    }

    const lowercasedTerm = hasSearchTerm ? searchTerm.toLowerCase() : '';

    return products.filter(product => {
      if (hasSearchTerm) {
        const matchesSearch =
          (product.name && product.name.toLowerCase().includes(lowercasedTerm)) ||
          (product.description && product.description.toLowerCase().includes(lowercasedTerm)) ||
          (product.categoryName && product.categoryName.toLowerCase().includes(lowercasedTerm)) ||
          (product.price && String(product.price).includes(lowercasedTerm));

        if (!matchesSearch) return false;
      }

      if (hasCategoryFilter) {
        const matchesCategory =
          product.category === selectedCategory ||
          product.subcategory === selectedCategory ||
          product.terceraCategoria === selectedCategory;

        if (!matchesCategory) return false;
      }

      return true;
    });
  }, [searchTerm, selectedCategory, products]);

  const sortedProducts = useMemo(() => {
    if (filteredProducts.length === 0) return [];

    const productsWithSortKeys = filteredProducts.map(product => {
      let sortKey: number | string = 0;

      switch (sortOrder) {
        case 'recent':
        case 'oldest':
          const modified = product.lastModified?.toDate?.() || product.updated_at || product.updatedAt || new Date();
          sortKey = modified instanceof Date ? modified.getTime() : new Date(modified).getTime();
          break;
        case 'price-high':
        case 'price-low':
          sortKey = parseFloat(String(product.price)) || 0;
          break;
        case 'name-asc':
        case 'name-desc':
          sortKey = (product.name || '').toLowerCase();
          break;
      }

      return { product, sortKey };
    });

    productsWithSortKeys.sort((a, b) => {
      switch (sortOrder) {
        case 'recent':
          return (b.sortKey as number) - (a.sortKey as number);
        case 'oldest':
          return (a.sortKey as number) - (b.sortKey as number);
        case 'price-high':
          return (b.sortKey as number) - (a.sortKey as number);
        case 'price-low':
          return (a.sortKey as number) - (b.sortKey as number);
        case 'name-asc':
          return (a.sortKey as string).localeCompare(b.sortKey as string);
        case 'name-desc':
          return (b.sortKey as string).localeCompare(a.sortKey as string);
        default:
          return 0;
      }
    });

    return productsWithSortKeys.map(item => item.product);
  }, [filteredProducts, sortOrder]);

  const paginatedProducts = useMemo(() => {
    return sortedProducts.slice(0, visibleProducts);
  }, [sortedProducts, visibleProducts]);

  useEffect(() => {
    setHasMoreProducts(visibleProducts < sortedProducts.length);
  }, [sortedProducts.length, visibleProducts]);

  const loadMoreProducts = () => {
    setLoadingMoreProducts(true);
    setTimeout(() => {
      setVisibleProducts(prev => prev + 20);
      setLoadingMoreProducts(false);
    }, 300);
  };

  const getStockStatus = useCallback((stock: number) => {
    if (stock > 10) {
      return { text: "En Stock", color: "bg-green-100 text-green-800 hover:bg-green-200" };
    } else if (stock > 0) {
      return { text: "Stock Bajo", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" };
    } else {
      return { text: "Agotado", color: "bg-red-100 text-red-800 hover:bg-red-200" };
    }
  }, []);

  const handleImageLoadStart = (productId: string) => {
    setLoadingImages(prev => ({ ...prev, [productId]: true }));
  };

  const handleImageLoadEnd = (productId: string) => {
    setLoadingImages(prev => ({ ...prev, [productId]: false }));
  };

  const handleEdit = (product: any) => {
    setEditingProductId(product.id);
    setShowWizard(true);
  };

  const handleDelete = async (productId: string) => {
    try {
      if (isSupabase) {
        const { error } = await (db as any).from("products").delete().eq("id", productId);
        if (error) throw error;

        toast({
          title: "Producto eliminado",
          description: "El producto ha sido eliminado exitosamente."
        });

        setProducts(products.filter(product => product.id !== productId));
      }
    } catch (error: any) {
      console.error("Error eliminando producto:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al intentar eliminar el producto."
      });
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleWizardClose = () => {
    setShowWizard(false);
    setEditingProductId(null);
    fetchProducts();
    if (onProductSelected) {
      onProductSelected();
    }
  };

  const handleAddProduct = () => {
    setEditingProductId(null);
    setShowWizard(true);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (rows.length < 2) {
        toast({
          variant: "destructive",
          title: "Archivo vacío",
          description: "No se encontraron datos válidos en el archivo Excel."
        });
        setImporting(false);
        return;
      }

      // El usuario especificó el orden: 
      // 0:Nombre, 1:Precio, 2:Precio_Original, 3:Costo, 4:Stock, 5:Decant/sellado, 6:Categoria, 7:Subcategoria, 8:Publicado

      let startIdx = 1;
      const headerRow = rows[0].map(h => String(h || '').toLowerCase());
      if (!headerRow.includes('nombre') && !headerRow.includes('name')) {
        startIdx = 0;
      }

      const cleanNum = (val: any) => {
        if (val === undefined || val === null || val === '' || val === '-') return 0;
        if (typeof val === 'number') return val;
        return parseFloat(String(val).replace(/[$,\s]/g, '').replace(',', '.')) || 0;
      };

      // 1. Asegurar que existe el filtro "Tipo" antes de empezar
      let filterId = null;
      try {
        const { data: existingFilters } = await (db as any).from("filters").select("*").eq("name", "Tipo").maybeSingle();
        if (!existingFilters) {
          const { data: newFilter, error: filterErr } = await (db as any)
            .from("filters")
            .insert([{ name: "Tipo", order: 5 }])
            .select("id")
            .single();
          if (!filterErr) filterId = newFilter.id;
        } else {
          filterId = existingFilters.id;
        }
      } catch (fErr) {
        console.error("Error checking filter 'Tipo':", fErr);
      }

      // Cache de opciones de filtro para "Tipo"
      const optionCache: Record<string, string> = {};
      if (filterId) {
        try {
          const { data: existingOptions } = await (db as any)
            .from("filter_options")
            .select("*")
            .eq("parent_id", filterId);
          existingOptions?.forEach((opt: any) => {
            optionCache[opt.name.toLowerCase()] = opt.id;
          });
        } catch (oErr) {
          console.error("Error cacheing filter options:", oErr);
        }
      }

      // Helper de normalización consistente
      const normalizeMainCat = (name: string) => {
        const low = (name || '').trim().toLowerCase();
        if (low.includes('arabe') || low.includes('árabe')) return 'Arabe';
        if (low.includes('diseña')) return 'Diseñador';
        if (low.includes('nicho')) return 'Nicho';
        return name.trim() || 'General';
      };

      // Cache de categorías para evitar duplicados
      const mainCatCache: Record<string, string> = {};
      const subCatCache: Record<string, string> = {}; // Clave: parentId + ":" + subName.toLowerCase()

      console.log("Categorías iniciales en DB:", categories);

      categories.forEach(c => {
        if (!c.parentId) {
          // Normalizamos la llave del cache igual que en el loop
          const normName = normalizeMainCat(c.name);
          mainCatCache[normName.toLowerCase()] = c.id;
        } else {
          subCatCache[c.parentId + ":" + c.name.trim().toLowerCase()] = c.id;
        }
      });

      console.log("Cache Main Normalizado:", mainCatCache);
      console.log("Cache Sub:", subCatCache);

      let successCount = 0;
      let updatedCount = 0;
      let createdCount = 0;
      let errorCount = 0;
      let newCatsCount = 0;
      let newSubsCount = 0;
      const errorDetails: string[] = [];

      console.log(`Total de filas detectadas en el Excel: ${rows.length}`);
      console.log(`Índice de inicio (fila de datos): ${startIdx}`);
      console.log(`Productos esperados: ${rows.length - startIdx}`);

      for (let i = startIdx; i < rows.length; i++) {
        const row = rows[i];
        const name = String(row[0] || '').trim();
        if (!name) {
          console.warn(`Fila ${i} saltada: El nombre está vacío.`);
          continue;
        }

        console.group(`Producto: ${name}`);
        try {
          const price = cleanNum(row[1]);
          const originalPrice = cleanNum(row[2]) || price;
          const cost = cleanNum(row[3]);
          const stock = parseInt(String(row[4] || '0')) || 0;
          const decantSelladoVal = String(row[5] || '').trim().toLowerCase();
          const catNameRaw = String(row[6] || 'General').trim();
          const subName = String(row[7] || '').trim();
          const publicadoVal = String(row[8] || '').toLowerCase();
          const isPublished = publicadoVal === 'sí' || publicadoVal === 'si' || publicadoVal === 'true' || publicadoVal === 'yes';

          // Normalización de categoría principal
          const catName = normalizeMainCat(catNameRaw);
          const catKey = catName.toLowerCase();

          console.log(`Buscando Principal: "${catName}" (Key: "${catKey}")`);

          // 1. Manejar Categoría Principal
          let categoryId = mainCatCache[catKey];
          if (!categoryId) {
            console.group(`Creando nueva principal: ${catName}`);
            const { data: newCat, error: catError } = await (db as any)
              .from("categories")
              .insert([{
                name: catName,
                slug: slugify(catName),
                display_order: 10
              }])
              .select("id")
              .single();

            if (catError) {
              const { data: existingCat } = await (db as any)
                .from("categories")
                .select("id")
                .eq("name", catName)
                .is("parent_id", null)
                .maybeSingle();
              if (existingCat) {
                categoryId = existingCat.id;
              } else {
                console.error("Error al obtener/crear principal:", catError);
                throw catError;
              }
            } else {
              categoryId = newCat.id;
            }
            console.groupEnd();
            mainCatCache[catKey] = categoryId;
            newCatsCount++;
            setCategories(prev => [...prev, { id: categoryId, name: catName, parentId: null }]);
          } else {
            console.log(`Usando principal existente: ${catName} (ID: ${categoryId})`);
          }

          // 2. Manejar Subcategoría (Scopeada al padre)
          let subcategoryId = null;
          if (subName) {
            const subKey = categoryId + ":" + subName.toLowerCase();
            subcategoryId = subCatCache[subKey];

            if (!subcategoryId) {
              console.group(`Buscando/Creando Subcategoría: "${subName}" bajo Padre: "${catName}"`);
              // Usamos un slug único (padre + hijo) para evitar colisiones globales
              const uniqueSubSlug = slugify(`${catName} ${subName}`);

              const { data: newSub, error: subError } = await (db as any)
                .from("categories")
                .insert([{
                  name: subName,
                  slug: uniqueSubSlug,
                  parent_id: categoryId,
                  parent_name: catName,
                  display_order: 20
                }])
                .select("id")
                .single();

              if (subError) {
                console.log("Subcategoría ya existe o error en insert, buscando en DB...");
                const { data: existingSub } = await (db as any)
                  .from("categories")
                  .select("id")
                  .eq("name", subName)
                  .eq("parent_id", categoryId)
                  .maybeSingle();
                if (existingSub) {
                  subcategoryId = existingSub.id;
                }
              } else {
                subcategoryId = newSub.id;
              }
              console.groupEnd();

              if (subcategoryId) {
                subCatCache[subKey] = subcategoryId;
                // Only increment if it was actually created (not just found existing)
                if (!subCatCache[subKey + '__was_existing']) newSubsCount++;
                setCategories(prev => [...prev, { id: subcategoryId, name: subName, parentId: categoryId }]);
              }
            } else {
              console.log(`Usando subcategoría existente: ${subName} (ID: ${subcategoryId})`);
            }
          }
          console.groupEnd();

          // 3. Manejar Filtro "Tipo" (Decants / Sellado)
          let filterOptionsEntry: Record<string, string[]> = {};
          if (filterId && decantSelladoVal) {
            let optionName = decantSelladoVal.includes('decant') ? 'Decants' : 'Sellado';
            let optionId = optionCache[optionName.toLowerCase()];

            if (!optionId) {
              const { data: newOpt, error: optErr } = await (db as any)
                .from("filter_options")
                .insert([{
                  name: optionName,
                  parent_id: filterId,
                  order: optionName === 'Decants' ? 0 : 1
                }])
                .select("id")
                .single();

              if (!optErr) {
                optionId = newOpt.id;
                optionCache[optionName.toLowerCase()] = optionId;
              }
            }

            if (optionId) {
              filterOptionsEntry[filterId] = [optionId];
            }
          }

          // --- LÓGICA DE SINCRONIZACIÓN MAESTRA ---
          const cleanName = name.trim();
          let matches: any[] = [];

          try {
            // Buscar por nombre (insensible a mayúsculas y espacios)
            // Usamos comodines para asegurar que el match ilike sea robusto
            const { data, error: fetchErr } = await (db as any)
              .from("products")
              .select("*")
              .ilike("name", `%${cleanName}%`);

            if (fetchErr) {
              console.warn(`Error buscando "${cleanName}", continuando sin match:`, fetchErr);
            } else {
              matches = data || [];
              // Filtrar para match exacto (case-insensitive) en JS para ser 100% precisos
              matches = matches.filter((m: any) => m.name?.toLowerCase().trim() === cleanName.toLowerCase());
            }
          } catch (err) {
            console.warn(`Error crítico buscando "${cleanName}":`, err);
          }

          let targetProduct = null;
          let rescuedImage = null;
          let rescuedAdditionalImages: string[] = [];

          if (matches && matches.length > 0) {
            // 2. Identificar el "Maestro" y rescatar imágenes de los demás
            // Priorizamos como maestro al que ya tenga imagen
            const sortedMatches = [...matches].sort((a, b) => {
              const aHasImg = (a.image || a.image_url) ? 1 : 0;
              const bHasImg = (b.image || b.image_url) ? 1 : 0;
              return bHasImg - aHasImg;
            });

            targetProduct = sortedMatches[0];
            rescuedImage = targetProduct.image || targetProduct.image_url;
            rescuedAdditionalImages = Array.isArray(targetProduct.additional_images) ? targetProduct.additional_images : [];

            // 3. Si hay duplicados, rescatar sus fotos y borrarlos
            if (matches.length > 1) {
              const duplicateIds = sortedMatches.slice(1).map(m => {
                // Si algún duplicado tiene foto y el maestro no, la rescatamos
                const dupImg = m.image || m.image_url;
                if (dupImg && !rescuedImage) rescuedImage = dupImg;

                // Unir galerías de imágenes si existen
                const dupExtras = Array.isArray(m.additional_images) ? m.additional_images : [];
                rescuedAdditionalImages = [...rescuedAdditionalImages, ...dupExtras];

                return m.id;
              });

              console.log(`Limpiando ${duplicateIds.length} duplicados para "${name}"...`);
              await (db as any).from("products").delete().in("id", duplicateIds);
            }
          }

          // 4. Preparar el Payload (Solo datos de texto, preservando la imagen rescatada)
          const payload: any = {
            name: cleanName,
            price,
            original_price: originalPrice,
            cost,
            stock,
            category: categoryId,
            category_id: categoryId,
            category_name: catName,
            subcategory: subcategoryId,
            subcategory_name: subName || null,
            is_published: isPublished,
            is_offer: originalPrice > price,
            discount: originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0,
            last_modified_by: user?.email || "import_panel",
            updated_at: new Date().toISOString(),
          };

          // Solo añadimos la imagen al payload si logramos rescatar una
          if (rescuedImage) {
            payload.image = rescuedImage;
          }
          if (rescuedAdditionalImages.length > 0) {
            payload.additional_images = [...new Set(rescuedAdditionalImages)].filter(Boolean);
          }

          // 5. Fusionar especificaciones (preservando descripción si existe)
          let finalSpecs: any[] = [];
          if (targetProduct && Array.isArray(targetProduct.specifications)) {
            finalSpecs = targetProduct.specifications.filter((s: any) =>
              s.name !== '_filter_options' && s.name?.toLowerCase() !== 'tipo'
            );
          }

          const tagLabel = decantSelladoVal.includes('decant') ? 'Decant' : 'Sellado';
          finalSpecs.push({ name: 'Tipo', value: tagLabel });

          if (Object.keys(filterOptionsEntry).length > 0) {
            finalSpecs.push({
              name: '_filter_options',
              value: JSON.stringify(filterOptionsEntry)
            });
          }
          payload.specifications = finalSpecs;

          // 6. Ejecutar Update o Insert
          if (targetProduct) {
            const { error: updateError } = await (db as any)
              .from("products")
              .update(payload)
              .eq("id", targetProduct.id);
            if (updateError) throw updateError;
            updatedCount++;
            console.log(`✅ ACTUALIZADO: ${name}`);
          } else {
            const { error: insertError } = await (db as any)
              .from("products")
              .insert([{
                ...payload,
                created_at: new Date().toISOString(),
                created_by: user?.email || "import_panel"
              }]);
            if (insertError) throw insertError;
            createdCount++;
            console.log(`✨ CREADO: ${name}`);
          }
          successCount++;
        } catch (err: any) {
          console.error(`❌ ERROR en "${name}":`, err);
          errorDetails.push(`"${name}": ${err?.message || err?.code || 'Error desconocido'}`);
          errorCount++;
        } finally {
          console.groupEnd();
        }
      }

      console.log("=== RESUMEN DE IMPORTACIÓN ===");
      console.log(`Total procesados: ${successCount + errorCount}`);
      console.log(`Exitosos: ${successCount} (Nuevos: ${createdCount}, Actualizados: ${updatedCount})`);
      console.log(`Errores: ${errorCount}`);
      if (errorDetails.length > 0) console.table(errorDetails);

      const summaryParts = [
        `📊 Total Filas Excel: ${rows.length - startIdx}`,
        `✅ Actualizados: ${updatedCount}`,
        `✨ CREADOS: ${createdCount}`,
        errorCount > 0 ? `❌ Errores: ${errorCount}` : null,
        newCatsCount > 0 ? `📁 Categorías nuevas: ${newCatsCount}` : null,
        newSubsCount > 0 ? `📂 Subcategorías nuevas: ${newSubsCount}` : null,
      ].filter(Boolean).join(' | ');

      if (errorDetails.length > 0) {
        console.warn("Productos con error durante importación:", errorDetails);
      }

      toast({
        title: `Importación finalizada — ${successCount + errorCount} productos`,
        description: summaryParts,
        duration: 10000,
      });
      fetchProducts();
    } catch (err: any) {
      console.error("Error importing Excel:", err);
      toast({
        variant: "destructive",
        title: "Error al importar",
        description: err?.message || "No se pudo procesar el archivo Excel."
      });
    } finally {
      setImporting(false);
    }
  };

  const handleExportExcel = () => {
    try {
      if (products.length === 0) {
        toast({
          variant: "destructive",
          title: "Error al exportar",
          description: "No hay productos para exportar."
        });
        return;
      }

      const exportData = products.map(p => ({
        Nombre: p.name || '',
        Precio: p.price || 0,
        Precio_Original: p.originalPrice || p.original_price || p.price || 0,
        Costo: p.cost || 0,
        Stock: p.stock || 0,
        Categoria: p.categoryName || p.category || '',
        Subcategoria: p.subcategoryName || p.subcategory || '',
        Publicado: p.isPublished !== false ? 'Sí' : 'No',
        Oferta: p.isOffer ? 'Sí' : 'No',
        Descripcion: p.description || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Productos");

      const fileName = `inventario_productos_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Exportación exitosa",
        description: `Se han exportado ${products.length} productos.`
      });
    } catch (error: any) {
      console.error("Error exporting Excel:", error);
      toast({
        variant: "destructive",
        title: "Error al exportar",
        description: "No se pudo generar el archivo Excel."
      });
    }
  };

  const handleDeleteAllProducts = async () => {
    try {
      // En Supabase para borrar todo necesitamos un filtro, usamos uno que siempre sea cierto
      const { error } = await (db as any)
        .from("products")
        .delete()
        .not("id", "is", null);

      if (error) throw error;

      toast({
        title: "Inventario vaciado",
        description: "Todos los productos han sido eliminados correctamente.",
      });
      fetchProducts();
    } catch (error: any) {
      console.error("Error vaciando inventario:", error);
      toast({
        variant: "destructive",
        title: "Error al vaciar inventario",
        description: error.message || "No se pudieron eliminar los productos."
      });
    }
  };
  // Si el wizard está abierto, mostrar solo el wizard
  if (showWizard) {
    return (
      <div className="space-y-4 max-w-full overflow-x-hidden">
        <ProductFormWizard
          key={editingProductId || 'new-product'}
          selectedProductId={editingProductId}
          onProductSelected={handleWizardClose}
          categories={categories}
          user={user}
          liberta={liberta}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 -mt-2">
      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Gestión de Productos
        </h1>
        <p className="text-slate-600">
          Administra el inventario y la información de tus productos
        </p>
      </div>

      {/* Aviso del estado de libertad */}
      {user?.subCuenta === "si" && (
        <div className={`p-4 rounded-lg border ${liberta === "si"
          ? "bg-green-50 border-green-200 text-green-800"
          : "bg-blue-50 border-blue-200 text-blue-800"}`}>
          <div className="flex items-center">
            {liberta === "si" ? (
              <ShieldCheck className="h-5 w-5 mr-2 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 mr-2 text-blue-600" />
            )}
            <p className="text-sm font-medium">
              {liberta === "si"
                ? "Tu cuenta tiene permisos para publicar cambios directamente."
                : "Tu cuenta no tiene permisos para publicar cambios directos. Los cambios que realices serán enviados a revisión del administrador."}
            </p>
          </div>
        </div>
      )}

      {/* Lista de Productos */}
      <Card className="shadow-sm border border-slate-200">
        <CardHeader className="bg-white border-b border-slate-200 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-xl font-semibold text-slate-900">
                Inventario de Productos ({sortedProducts.length})
              </CardTitle>
              <div className="flex gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImportExcel}
                />
                <div className="order-first">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200"
                        aria-label="Más acciones"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing || categories.length === 0}
                      >
                        Importar Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowClearInventoryAlert(true)}
                        disabled={importing || products.length === 0}
                        className="text-red-600"
                      >
                        Vaciar Inventario
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleExportExcel}
                        disabled={products.length === 0}
                      >
                        Exportar Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="order-last">
                  <Button
                    onClick={handleAddProduct}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Producto
                  </Button>
                </div>
              </div>
            </div>

            <AlertDialog open={showClearInventoryAlert} onOpenChange={setShowClearInventoryAlert}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción eliminará <strong>TODOS</strong> los {products.length} productos del inventario de forma permanente.
                    Se perderán las imágenes, descripciones y toda la información asociada. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllProducts}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Eliminar Todo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro por categoría */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 px-3 gap-1 text-slate-700 border-slate-200 hover:bg-slate-50">
                    <Filter className="h-4 w-4" />
                    <span>Categoría</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 max-h-[300px] overflow-y-auto">
                  <DropdownMenuItem onClick={() => setSelectedCategory('')} className={!selectedCategory ? 'bg-slate-100 text-slate-900' : ''}>
                    <span className="h-4 w-4 mr-2 opacity-70">🏠</span> Todas las categorías
                  </DropdownMenuItem>
                  {categories
                    .filter(category => !category.parentId)
                    .map((category) => (
                      <DropdownMenuItem
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={selectedCategory === category.id ? 'bg-slate-100 text-slate-900' : ''}
                      >
                        <Tags className="h-4 w-4 mr-2 opacity-70" /> {category.name}
                      </DropdownMenuItem>
                    ))
                  }
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Ordenamiento */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 px-3 gap-1 text-slate-700 border-slate-200 hover:bg-slate-50">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Ordenar por</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setSortOrder('recent')} className={sortOrder === 'recent' ? 'bg-slate-100 text-slate-900' : ''}>
                    <CustomClock className="h-4 w-4 mr-2 opacity-70" /> Más recientes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder('oldest')} className={sortOrder === 'oldest' ? 'bg-slate-100 text-slate-900' : ''}>
                    <History className="h-4 w-4 mr-2 opacity-70" /> Más antiguos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder('name-asc')} className={sortOrder === 'name-asc' ? 'bg-slate-100 text-slate-900' : ''}>
                    <Tags className="h-4 w-4 mr-2 opacity-70" /> Nombre (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder('name-desc')} className={sortOrder === 'name-desc' ? 'bg-slate-100 text-slate-900' : ''}>
                    <Tags className="h-4 w-4 mr-2 opacity-70" /> Nombre (Z-A)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder('price-high')} className={sortOrder === 'price-high' ? 'bg-slate-100 text-slate-900' : ''}>
                    <CreditCard className="h-4 w-4 mr-2 opacity-70" /> Precio (Mayor a menor)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder('price-low')} className={sortOrder === 'price-low' ? 'bg-slate-100 text-slate-900' : ''}>
                    <CreditCard className="h-4 w-4 mr-2 opacity-70" /> Precio (Menor a mayor)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Indicador de filtro activo */}
              {selectedCategory && (
                <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-200 gap-1">
                  {categories.find(cat => cat.id === selectedCategory)?.name || "Categoría"}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedCategory('')}
                    className="h-4 w-4 p-0 ml-1 hover:bg-slate-300 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          </div>

          <div className="relative mt-4">
            <div className="flex items-center bg-white border rounded-lg overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all">
              <div className="pl-3 py-2">
                <Search className="h-5 w-5 text-sky-500" />
              </div>
              <Input
                placeholder="Buscar por nombre, descripción, categoría o precio"
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-10 flex-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchTerm('')}
                  className="h-8 w-8 mr-1 rounded-full hover:bg-sky-50 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loadingProducts ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center text-sky-600">
                <Loader2 className="h-10 w-10 animate-spin mb-2" />
                <p className="text-sm font-medium">Cargando productos...</p>
              </div>
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-10 bg-sky-50/50 rounded-lg border border-dashed border-sky-200">
              <div className="flex flex-col items-center">
                <Package className="h-12 w-12 text-sky-300 mb-3" />
                <p className="text-sky-700 font-medium">No se encontraron productos</p>
                {searchTerm ? (
                  <p className="text-sm text-sky-600/70 mt-1">Prueba con otros términos de búsqueda</p>
                ) : selectedCategory ? (
                  <p className="text-sm text-sky-600/70 mt-1">No hay productos en esta categoría</p>
                ) : (
                  <p className="text-sm text-sky-600/70 mt-1">Añade tu primer producto</p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {paginatedProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stock || 0);
                  return (
                    <div key={product.id} className="flex items-center justify-between p-5 border rounded-xl hover:shadow-lg transition-all duration-200 hover:border-sky-200 bg-white">
                      <div className="flex items-center gap-5">
                        <div className="relative w-20 h-20">
                          {loadingImages[product.id] && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl">
                              <Loader2 className="h-5 w-5 text-sky-600 animate-spin" />
                            </div>
                          )}
                          <img
                            src={product.image}
                            alt={product.name}
                            className={cn(
                              "w-20 h-20 object-cover rounded-xl shadow-md transition-opacity duration-300",
                              loadingImages[product.id] ? "opacity-0" : "opacity-100"
                            )}
                            onLoad={() => handleImageLoadEnd(product.id)}
                            onError={(e) => {
                              handleImageLoadEnd(product.id);
                              e.currentTarget.src = '/placeholder.svg';
                            }}
                            onLoadStart={() => handleImageLoadStart(product.id)}
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg">{product.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
                          
                          {product.customFields && Object.keys(product.customFields).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                              {Object.entries(product.customFields).map(([key, val]) => {
                                if (val === undefined || val === null || val === '') return null;
                                return (
                                  <span key={key} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                    <strong className="capitalize">{key.replace(/_/g, ' ')}:</strong> {String(val)}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="font-medium bg-orange-50 text-orange-700 border-orange-200">
                                <span className="text-xs text-gray-500 mr-1">Categoría:</span> {product.categoryName || product.category}
                              </Badge>
                              {product.subcategoryName && (
                                <div className="flex items-center">
                                  <svg className="h-3 w-3 text-gray-400 mx-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                  <Badge variant="outline" className="font-medium bg-blue-50 text-blue-700 border-blue-200">
                                    <span className="text-xs text-gray-500 mr-1">Subcategoría:</span> {product.subcategoryName}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <span className="text-lg font-bold text-green-600">
                              ${(product.price || 0).toLocaleString()}
                              {product.cost && liberta === "si" && (
                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                  <span>Costo: </span>
                                  <span className="text-amber-700 font-medium">${Number(product.cost).toLocaleString()}</span>
                                  {product.price && product.cost && (
                                    <Badge variant="outline" className="ml-1 text-[10px] h-5 bg-green-50 text-green-700 border-green-200">
                                      {Math.round(((Number(product.price) - Number(product.cost)) / Number(product.price)) * 100)}% margen
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </span>
                            <Badge className={cn(
                              stockStatus.color,
                              "flex items-center gap-1"
                            )}>
                              <span className={cn(
                                "w-2 h-2 rounded-full",
                                stockStatus.text === "En Stock" ? "bg-green-400" :
                                  stockStatus.text === "Stock Bajo" ? "bg-yellow-400" :
                                    "bg-red-400"
                              )}></span>
                              {stockStatus.text}: {product.stock || 0}
                            </Badge>
                            <Badge className={cn(
                              "flex items-center gap-1",
                              product.isPublished !== false
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                            )}>
                              <Eye className="h-3 w-3" />
                              {product.isPublished !== false ? "Publicado" : "No publicado"}
                            </Badge>
                            {product.modalityId && product.modalityId !== 'default' && (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-200 uppercase text-[10px]">
                                ⚙️ {product.modalityId}
                              </Badge>
                            )}
                            {product.updated_at && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 ml-2">
                                <CustomClock className="h-3 w-3 mr-1 opacity-70" />
                                {new Date(product.updated_at).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(product)}
                                className="hover:bg-blue-50 hover:border-blue-300 transition-colors text-blue-600"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-blue-600">
                              <p className="text-xs">{liberta === "si" ? "Editar producto" : "Enviar cambios a revisión"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const slug = slugify(product.name || 'producto');
                                  const newWindow = window.open(`/producto/${slug}`, '_blank');
                                  newWindow?.focus();
                                }}
                                className="hover:bg-sky-50 hover:border-sky-300 transition-colors text-sky-600"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-sky-600">
                              <p className="text-xs">Ver producto</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                {liberta === "si" ? "¿Eliminar producto?" : "¿Enviar solicitud de eliminación?"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {liberta === "si" ?
                                  `Esta acción es irreversible y eliminará el producto "${product.name}" del sistema.` :
                                  `Se enviará una solicitud para eliminar el producto "${product.name}" que requerirá aprobación del administrador.`
                                }
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(product.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {liberta === "si" ? "Eliminar" : "Enviar solicitud"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMoreProducts && (
                <div className="flex justify-center mt-6">
                  <Button
                    onClick={loadMoreProducts}
                    variant="outline"
                    className="border-sky-200 text-sky-700 hover:bg-sky-50"
                    disabled={loadingMoreProducts}
                  >
                    {loadingMoreProducts ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Cargar más productos
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
