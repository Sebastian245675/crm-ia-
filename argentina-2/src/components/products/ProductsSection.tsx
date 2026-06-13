import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCard } from './ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product } from '@/contexts/CartContext';
import { db } from "@/firebase";
import { useCategories } from '@/hooks/use-categories';
import { useFilters } from '@/hooks/use-filters';

interface ProductsSectionProps {
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  setCategories: (cats: string[]) => void;
  initialSearchTerm?: string;
}

const ML_VALUES = [2.5, 5, 10, 30, 100] as const;

function extractMlFromProduct(p: Product): number[] {
  const out: number[] = [];
  const text = [p.name, p.description, JSON.stringify(p.specifications || [])].join(' ').toLowerCase();
  const patterns: { ml: number; re: RegExp }[] = [
    { ml: 2.5, re: /(?:^|[^\d])(?:2[,.]5|2\.5)\s*ml|ml\s*(?:2[,.]5|2\.5)/i },
    { ml: 5, re: /(?:^|[^\d])5\s*ml|ml\s*5(?:[^\d]|$)/i },
    { ml: 10, re: /(?:^|[^\d])10\s*ml|ml\s*10(?:[^\d]|$)/i },
    { ml: 30, re: /(?:^|[^\d])30\s*ml|ml\s*30(?:[^\d]|$)/i },
    { ml: 100, re: /(?:^|[^\d])100\s*ml|ml\s*100(?:[^\d]|$)/i },
  ];
  for (const { ml, re } of patterns) {
    if (re.test(text)) out.push(ml);
  }
  return out;
}

const NOTAS_OPTIONS = [
  'Dulces / Gourmand',
  'Amaderadas',
  'Frescas / Acuáticas / Verdes',
  'Orientales / Especiadas',
  'Cítricas',
  'Florales',
  'Ahumadas / Cuero / Tabaco',
  'Almizcladas',
] as const;

const OCACION_OPTIONS = [
  'Diario',
  'Salidas Nocturnas',
  'Ocasiones Especiales',
  'Eventos Formales',
  'Casual / Chill / Deportivo',
] as const;

const ESTACIONALIDAD_OPTIONS = [
  'Invierno',
  'Verano',
  'Primavera',
  'Otoño',
  'Todo El Año',
] as const;

function getSpecValue(p: Product, key: string): string | undefined {
  const specs = p.specifications || [];
  const s = specs.find((sp: { name: string }) =>
    String(sp.name).toLowerCase().includes(key.toLowerCase())
  );
  return s ? String((s as any).value) : undefined;
}

export const ProductsSection: React.FC<ProductsSectionProps> = ({
  selectedCategory,
  setSelectedCategory,
  setCategories,
  initialSearchTerm = '',
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [sortBy, setSortBy] = useState('relevance');
  const { categoriesData: categories, getCategoryByIdOrNameOrSlug } = useCategories();
  const { filters, loading: filtersLoading } = useFilters();
  const [loading, setLoading] = useState(true);

  const [selectedMililitros, setSelectedMililitros] = useState<number[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceFrom, setPriceFrom] = useState<string>('');
  const [priceTo, setPriceTo] = useState<string>('');
  const [priceApplied, setPriceApplied] = useState<{ from: number; to: number } | null>(null);
  const [selectedNotas, setSelectedNotas] = useState<string[]>([]);
  const [selectedOcasion, setSelectedOcasion] = useState<string[]>([]);
  const [selectedEstacionalidad, setSelectedEstacionalidad] = useState<string[]>([]);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [showAllNotas, setShowAllNotas] = useState(false);
  const [showAllOcasion, setShowAllOcasion] = useState(false);
  const [showAllEstacionalidad, setShowAllEstacionalidad] = useState(false);

  // Estado dinámico para filtros personalizados
  const [selectedFilterOptions, setSelectedFilterOptions] = useState<{ [filterId: string]: string[] }>({});
  const [showAllForFilter, setShowAllForFilter] = useState<{ [filterId: string]: boolean }>({});

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [displayLimit, setDisplayLimit] = useState(24);
  const PAGE_SIZE = 24;

  useEffect(() => {
    setSearchTerm(initialSearchTerm || '');
  }, [initialSearchTerm]);

  const fetchAllProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from('products')
        .select();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Fetched products count:", data?.length);

      const productsData = (data || []).map((item: any) => ({
        ...item,
        id: String(item.id || item._id || Math.random()),
        name: item.name || 'Sin nombre',
        price: Number(item.price || 0),
        originalPrice: Number(item.original_price || item.price || 0),
        isPublished: item.is_published !== false,
        categoryName: item.category_name || item.category || '',
        subcategoryName: item.subcategory_name || item.subcategory || '',
        terceraCategoriaName: item.tercera_categoria_name || item.tercera_categoria || ''
      })) as Product[];

      setAllProducts(productsData);
    } catch (e) {
      console.error("Error cargando productos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProducts();
  }, []);

  const filterFn = useMemo(() => {
    const selCat = selectedCategory?.trim() || '';
    const sel = selCat.toLowerCase();
    const targetCategory = getCategoryByIdOrNameOrSlug(selCat);

    return (p: Product) => {
      // 1. Filtro de búsqueda
      if (searchTerm && searchTerm.trim().length > 0) {
        const term = searchTerm.toLowerCase().trim();
        const name = String(p.name || '').toLowerCase();
        const desc = String(p.description || '').toLowerCase();
        if (!name.includes(term) && !desc.includes(term)) return false;
      }

      // 2. Filtro de categoría
      if (selectedCategory === 'Todos') return true;
      
      // If we found the exact category in DB, match by ID
      if (targetCategory && targetCategory.id) {
        // If it's a main category (no parent)
        if (!targetCategory.parentId || targetCategory.parentId === "") {
          return p.category === targetCategory.id || (p as any).category_id === targetCategory.id;
        }
        
        // If it's a subcategory or third level category
        return p.subcategory === targetCategory.id || (p as any).subcategory === targetCategory.id ||
               p.terceraCategoria === targetCategory.id || (p as any).tercera_categoria === targetCategory.id;
      }

      // Fallback to name/string matching if category not found in DB
      const catName = String(p.categoryName || p.category || '').toLowerCase().trim();
      const subName = String(p.subcategoryName || p.subcategory || '').toLowerCase().trim();
      const tercName = String(p.terceraCategoriaName || '').toLowerCase().trim();

      return catName.includes(sel) || sel.includes(catName) || 
             subName.includes(sel) || sel.includes(subName) || 
             tercName.includes(sel);
    };
  }, [searchTerm, selectedCategory, getCategoryByIdOrNameOrSlug]);

  const baseFiltered = useMemo(() => {
    return allProducts.filter(p => p.isPublished !== false).filter(filterFn);
  }, [allProducts, filterFn]);

  const mlCounts = useMemo(() => {
    const counts: Record<number, number> = { 2.5: 0, 5: 0, 10: 0, 30: 0, 100: 0 };
    for (const p of baseFiltered) {
      const mls = extractMlFromProduct(p);
      for (const ml of mls) counts[ml] = (counts[ml] || 0) + 1;
    }
    return counts;
  }, [baseFiltered]);

  const brandCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of baseFiltered) {
      const b = (p as any).brand ? String((p as any).brand).trim() : '';
      if (!b) continue;
      map[b] = (map[b] || 0) + 1;
    }
    return map;
  }, [baseFiltered]);

  const uniqueBrands = useMemo(() => Object.keys(brandCounts).sort((a, b) => a.localeCompare(b)), [brandCounts]);

  const notasCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const n of NOTAS_OPTIONS) m[n] = 0;
    for (const p of baseFiltered) {
      const v = getSpecValue(p, 'notas') || getSpecValue(p, 'notas principales') || '';
      for (const n of NOTAS_OPTIONS) {
        if (v && v.toLowerCase().includes(n.toLowerCase())) m[n]++;
      }
    }
    return m;
  }, [baseFiltered]);

  const ocasionCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of OCACION_OPTIONS) m[o] = 0;
    for (const p of baseFiltered) {
      const v = getSpecValue(p, 'ocasión') || getSpecValue(p, 'ocasion') || '';
      for (const o of OCACION_OPTIONS) {
        if (v && v.toLowerCase().includes(o.toLowerCase())) m[o]++;
      }
    }
    return m;
  }, [baseFiltered]);

  const estacionalidadCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of ESTACIONALIDAD_OPTIONS) m[e] = 0;
    for (const p of baseFiltered) {
      const v = getSpecValue(p, 'estacionalidad') || '';
      for (const e of ESTACIONALIDAD_OPTIONS) {
        if (v && v.toLowerCase().includes(e.toLowerCase())) m[e]++;
      }
    }
    return m;
  }, [baseFiltered]);

  // Función para obtener las opciones de filtros guardadas en un producto
  const getProductFilterOptions = (product: Product): { [filterId: string]: string[] } => {
    const specs = product.specifications || [];
    const filterOptionsSpec = specs.find((s: any) => s.name === '_filter_options');
    if (filterOptionsSpec && filterOptionsSpec.value) {
      try {
        const parsed = JSON.parse(filterOptionsSpec.value);
        return parsed;
      } catch (e) {
        console.warn('[ProductsSection] Error parseando _filter_options:', e, filterOptionsSpec.value);
        return {};
      }
    }
    return {};
  };

  // Contar productos por opción de filtro dinámico
  const filterOptionCounts = useMemo(() => {
    const counts: { [filterId: string]: { [optionId: string]: number } } = {};

    filters.forEach(filter => {
      counts[filter.id] = {};
      filter.options.forEach(option => {
        counts[filter.id][option.id] = 0;
      });
    });

    baseFiltered.forEach(product => {
      const productFilterOptions = getProductFilterOptions(product);

      filters.forEach(filter => {
        const productOptions = productFilterOptions[filter.id] || [];
        filter.options.forEach(option => {
          if (productOptions.includes(option.id)) {
            counts[filter.id][option.id] = (counts[filter.id][option.id] || 0) + 1;
          } else {
            const hasMatchingName = productOptions.some(productOptionId => {
              const productOption = filter.options.find(opt => opt.id === productOptionId);
              return productOption && productOption.name === option.name;
            });
            if (hasMatchingName) {
              counts[filter.id][option.id] = (counts[filter.id][option.id] || 0) + 1;
            }
          }
        });
      });
    });

    return counts;
  }, [baseFiltered, filters]);

  const sidebarFilterFn = useMemo(() => {
    return (p: Product) => {
      // Filtro de marca
      if (selectedBrands.length) {
        const brand = String((p as any).brand || '').trim();
        if (!brand || !selectedBrands.includes(brand)) return false;
      }

      // Filtro de mililitros
      if (selectedMililitros.length) {
        const mls = extractMlFromProduct(p);
        const ok = selectedMililitros.some((ml) => mls.includes(ml));
        if (!ok) return false;
      }

      // Filtro de precio
      if (priceApplied) {
        const pr = p.price ?? 0;
        if (pr < priceApplied.from) return false;
        if (pr > priceApplied.to) return false;
      }

      // Filtros dinámicos desde selectedFilterOptions
      if (Object.keys(selectedFilterOptions).length > 0) {
        const productFilterOptions = getProductFilterOptions(p);

        for (const [filterId, selectedOptionIds] of Object.entries(selectedFilterOptions)) {
          if (selectedOptionIds.length === 0) continue;

          const productOptions = productFilterOptions[filterId] || [];

          const hasMatchingOption = selectedOptionIds.some(selectedOptionId => {
            if (productOptions.includes(selectedOptionId)) return true;

            const filter = filters.find(f => f.id === filterId);
            if (filter) {
              const selectedOption = filter.options.find(opt => opt.id === selectedOptionId);
              if (selectedOption) {
                return productOptions.some(productOptionId => {
                  const productOption = filter.options.find(opt => opt.id === productOptionId);
                  return productOption && productOption.name === selectedOption.name;
                });
              }
            }
            return false;
          });

          if (!hasMatchingOption) return false;
        }
      }

      return true;
    };
  }, [selectedBrands, selectedMililitros, priceApplied, selectedFilterOptions, filters]);

  const filteredAndSortedProducts = useMemo(() => {
    let list = baseFiltered.filter(sidebarFilterFn);
    switch (sortBy) {
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'name': list.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      default: break;
    }
    return list;
  }, [baseFiltered, sidebarFilterFn, sortBy]);

  const paginatedProducts = useMemo(() => {
    return filteredAndSortedProducts.slice(0, displayLimit);
  }, [filteredAndSortedProducts, displayLimit]);

  const toggleBrand = (b: string) => {
    setSelectedBrands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  };
  const toggleMl = (ml: number) => {
    setSelectedMililitros((prev) => (prev.includes(ml) ? prev.filter((x) => x !== ml) : [...prev, ml]));
  };
  const toggleNotas = (n: string) => {
    setSelectedNotas((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };
  const toggleOcasion = (o: string) => {
    setSelectedOcasion((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  };
  const toggleEstacionalidad = (e: string) => {
    setSelectedEstacionalidad((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  };

  const toggleFilterOption = (filterId: string, optionId: string) => {
    setSelectedFilterOptions((prev) => {
      const current = prev[filterId] || [];
      const updated = current.includes(optionId)
        ? current.filter((x) => x !== optionId)
        : [...current, optionId];
      return { ...prev, [filterId]: updated };
    });
  };

  const applyPrice = () => {
    const from = priceFrom.trim() ? Math.max(0, Number(priceFrom) || 0) : 0;
    const to = priceTo.trim() ? Math.max(0, Number(priceTo) || 0) : Infinity;
    setPriceApplied(from || to !== Infinity ? { from: from || 0, to: to === Infinity ? 999999999 : to } : null);
  };

  const clearAllFilters = () => {
    setSelectedBrands([]);
    setSelectedMililitros([]);
    setPriceFrom('');
    setPriceTo('');
    setPriceApplied(null);
    setSelectedNotas([]);
    setSelectedOcasion([]);
    setSelectedEstacionalidad([]);
    setSelectedFilterOptions({});
  };

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedMililitros.length > 0 ||
    priceApplied != null ||
    selectedNotas.length > 0 ||
    selectedOcasion.length > 0 ||
    selectedEstacionalidad.length > 0 ||
    Object.values(selectedFilterOptions).some(options => options.length > 0);

  const BRAND_SHOW = showAllBrands ? uniqueBrands.length : 8;
  const NOTAS_SHOW = showAllNotas ? NOTAS_OPTIONS.length : 6;
  const OCACION_SHOW = showAllOcasion ? OCACION_OPTIONS.length : 4;
  const EST_SHOW = showAllEstacionalidad ? ESTACIONALIDAD_OPTIONS.length : 4;

  return (
    <section id="productos" className="py-8 bg-white w-full max-w-[1800px] mx-auto px-4 md:px-6 min-h-screen">
      <div className="flex flex-col md:flex-row gap-10">
        <aside className="w-full md:w-64 flex-shrink-0 hidden md:block pt-2 border-r border-gray-100 pr-6 pb-8">
          <h2 className="text-base font-bold mb-6 text-black pb-3 border-b border-gray-200">Filtrar por</h2>

          {/* Filtros Dinámicos desde la Base de Datos */}
          {!filtersLoading && filters.map((filter) => {
            // Determinar si es un filtro especial (Marca o Precio)
            if (filter.name.toLowerCase() === 'marca') {
              // Filtro de Marca (usar lógica existente)
              return (
                <div key={filter.id} className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 text-black">{filter.name}</h3>
                  <div className="space-y-2 pr-1">
                    {uniqueBrands.slice(0, showAllBrands ? uniqueBrands.length : 8).map((brand) => (
                      <label key={brand} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand)}
                          onChange={() => toggleBrand(brand)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-black focus:ring-black"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-black capitalize truncate">
                          {brand} <span className="text-gray-400 text-xs">({brandCounts[brand] ?? 0})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {uniqueBrands.length > 8 && (
                    <button
                      type="button"
                      className="text-xs text-black underline mt-1 hover:no-underline"
                      onClick={() => setShowAllBrands((v) => !v)}
                    >
                      {showAllBrands ? 'Ver menos' : 'Ver todos'}
                    </button>
                  )}
                </div>
              );
            }

            if (filter.name.toLowerCase() === 'precio') {
              // Filtro de Precio (usar lógica existente)
              return (
                <div key={filter.id} className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 text-black">{filter.name}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      placeholder="Desde"
                      value={priceFrom}
                      onChange={(e) => setPriceFrom(e.target.value)}
                      type="number"
                      min={0}
                      className="w-24 h-9 text-sm rounded border-gray-300"
                    />
                    <Input
                      placeholder="Hasta"
                      value={priceTo}
                      onChange={(e) => setPriceTo(e.target.value)}
                      type="number"
                      min={0}
                      className="w-24 h-9 text-sm rounded border-gray-300"
                    />
                    <Button type="button" size="sm" className="h-9 rounded" onClick={applyPrice}>
                      Aplicar
                    </Button>
                  </div>
                </div>
              );
            }

            // Filtros normales con opciones
            if (filter.options.length === 0) return null;

            const showAll = showAllForFilter[filter.id] || false;
            // Filtrar la opción específica que el usuario quiere ocultar (decan5 / 5ml)
            const filteredOptions = filter.options.filter(opt => {
              const name = opt.name.toLowerCase();
              return name !== 'decan5' && name !== 'decant 5ml' && name !== '5ml';
            });

            if (filteredOptions.length === 0) return null;

            const displayOptions = showAll ? filteredOptions : filteredOptions.slice(0, 6);

            return (
              <div key={filter.id} className="mb-6">
                <h3 className="font-semibold text-sm mb-3 text-black">{filter.name}</h3>
                <div className="space-y-2">
                  {displayOptions.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={(selectedFilterOptions[filter.id] || []).includes(option.id)}
                        onChange={() => toggleFilterOption(filter.id, option.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-black focus:ring-black"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-black">
                        {option.name} <span className="text-gray-400 text-xs">({filterOptionCounts[filter.id]?.[option.id] ?? 0})</span>
                      </span>
                    </label>
                  ))}
                </div>
                {filter.options.length > 6 && (
                  <button
                    type="button"
                    className="text-xs text-black underline mt-1 hover:no-underline"
                    onClick={() => setShowAllForFilter((prev) => ({ ...prev, [filter.id]: !showAll }))}
                  >
                    {showAll ? 'Ver menos' : 'Ver todos'}
                  </button>
                )}
              </div>
            );
          })}
        </aside>

        <div className="flex-1">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-gray-200">
            <div className="w-full md:w-auto mb-4 md:mb-0">
              <h2 className="text-2xl font-bold text-black mb-1">Resultados de búsqueda</h2>
              <p className="text-sm text-gray-500">{filteredAndSortedProducts.length} productos encontrados</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-sm text-gray-600">Ordenar por:</span>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
                <SelectTrigger
                  className="w-[180px] border-gray-300 border rounded-none h-10 text-sm ring-0 focus:ring-0"
                  aria-label="Ordenar productos por"
                >
                  <SelectValue placeholder="Relevancia" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-gray-300">
                  <SelectItem value="relevance">Relevancia</SelectItem>
                  <SelectItem value="name">Nombre (A-Z)</SelectItem>
                  <SelectItem value="price-asc">Menor precio</SelectItem>
                  <SelectItem value="price-desc">Mayor precio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedBrands.map((b) => (
                <div key={b} className="flex items-center bg-gray-100 px-3 py-1 text-sm rounded-full text-black">
                  {b}
                  <button type="button" onClick={() => toggleBrand(b)} className="ml-2 text-gray-500 hover:text-black">×</button>
                </div>
              ))}
              {selectedMililitros.map((ml) => (
                <div key={ml} className="flex items-center bg-gray-100 px-3 py-1 text-sm rounded-full text-black">
                  {ml === 2.5 ? '2,5' : ml} ml
                  <button type="button" onClick={() => toggleMl(ml)} className="ml-2 text-gray-500 hover:text-black">×</button>
                </div>
              ))}
              {priceApplied != null && (
                <div className="flex items-center bg-gray-100 px-3 py-1 text-sm rounded-full text-black">
                  ${priceApplied.from} – ${priceApplied.to}
                  <button
                    type="button"
                    onClick={() => { setPriceFrom(''); setPriceTo(''); setPriceApplied(null); }}
                    className="ml-2 text-gray-500 hover:text-black"
                  >
                    ×
                  </button>
                </div>
              )}
              {selectedNotas.map((n) => (
                <div key={n} className="flex items-center bg-gray-100 px-3 py-1 text-sm rounded-full text-black">
                  {n}
                  <button type="button" onClick={() => toggleNotas(n)} className="ml-2 text-gray-500 hover:text-black">×</button>
                </div>
              ))}
              {selectedOcasion.map((o) => (
                <div key={o} className="flex items-center bg-gray-100 px-3 py-1 text-sm rounded-full text-black">
                  {o}
                  <button type="button" onClick={() => toggleOcasion(o)} className="ml-2 text-gray-500 hover:text-black">×</button>
                </div>
              ))}
              {selectedEstacionalidad.map((e) => (
                <div key={e} className="flex items-center bg-gray-100 px-3 py-1 text-sm rounded-full text-black">
                  {e}
                  <button type="button" onClick={() => toggleEstacionalidad(e)} className="ml-2 text-gray-500 hover:text-black">×</button>
                </div>
              ))}
              <button type="button" onClick={clearAllFilters} className="text-sm text-black underline ml-2">
                Limpiar todos
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-12">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col h-full">
                  <div className="bg-gray-100 animate-pulse aspect-[3/4] w-full mb-3" />
                  <div className="h-3 bg-gray-100 w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-12">
                {paginatedProducts.length > 0 ? (
                  paginatedProducts.map((product) => (
                    <div key={product.id} className="w-full">
                      <ProductCard product={{ ...product, price: product.price, originalPrice: product.originalPrice }} />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-24 text-center">
                    <h3 className="text-xl font-semibold text-black mb-2">No se encontraron productos</h3>
                    <p className="text-gray-500 mb-6">Intenta modificar los filtros o términos de búsqueda</p>
                    <Button
                      variant="outline"
                      className="rounded-none border-black hover:bg-black hover:text-white px-6"
                      onClick={clearAllFilters}
                    >
                      Limpiar todos los filtros
                    </Button>
                  </div>
                )}
              </div>

              {displayLimit < filteredAndSortedProducts.length && !searchTerm && (
                <div className="flex justify-center pt-8 border-t border-gray-100">
                  <Button
                    variant="outline"
                    className="h-12 px-12 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-black uppercase tracking-widest transition-all rounded-full shadow-lg"
                    onClick={() => setDisplayLimit(prev => prev + PAGE_SIZE)}
                  >
                    Ver más productos
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
