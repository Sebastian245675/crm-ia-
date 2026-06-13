import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import {
  Plus, Package, Edit, Trash2, Search, Save, X, Image, AlertTriangle, Check, CreditCard,
  ShieldCheck, Award, Wand2, ChevronDown, Calendar, Filter, RefreshCw, Tags, History,
  SlidersHorizontal, Loader2, Eye
} from 'lucide-react';
import { CustomClock } from '@/components/ui/CustomClock';
import { sampleProducts } from '@/data/products';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { db, collection, query, where, getDocs, doc, deleteDoc, updateDoc, addDoc, setDoc, getDoc } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { ImageUploader } from './ImageUploader';
import { MultiImageUploader } from './MultiImageUploader';

const createUserWithEmailAndPassword = async (...args: any[]) => ({ user: { uid: 'mock-uid' } }) as any;

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

interface ProductFormProps {
  selectedProductId?: string | null;
  onProductSelected?: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ selectedProductId, onProductSelected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost: '',  // Costo de adquisición/producción del producto
    category: '',
    subcategory: '',  // Será "none" en la UI, pero guardamos como "" cuando no hay subcategoría
    terceraCategoria: '', // Será "none" en la UI, pero guardamos como "" cuando no hay tercera categoría
    stock: '',
    image: '',
    additionalImages: ['', '', ''],
    specifications: [{ name: '', value: '' }],
    isOffer: false,
    discount: '',
    originalPrice: '',
    benefits: [] as string[],
    warranties: [] as string[],
    paymentMethods: [] as string[],
    colors: [] as { name: string, hexCode: string, image: string }[],
    isPublished: true,  // Por defecto publicado
    // Campos exclusivos para Decants
    isDecant: false,
    decantOptions: {
      '2.5': { enabled: false, price: '', stock: '' },
      '5':   { enabled: true,  price: '', stock: '' },
      '10':  { enabled: true,  price: '', stock: '' },
    } as Record<string, { enabled: boolean; price: string; stock: string }>
  });
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(5);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; parentId?: string | null; }[]>([]);
  const [visibleProducts, setVisibleProducts] = useState<number>(20); // Número de productos visibles inicialmente
  const [hasMoreProducts, setHasMoreProducts] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(''); // Filtro por categoría

  // Estados para secciones colapsables
  const [sectionsOpen, setSectionsOpen] = useState({
    basic: true,
    pricing: true,
    images: true,
    specs: false,
    offers: false,
    benefits: false,
    colors: false,
    decant: false
  });

  const isSupabase = typeof (db as any)?.from === 'function';
  const { auth } = useAuth() as any;

  const [monthlyCostData, setMonthlyCostData] = useState<{
    month: string;
    year: number;
    totalCost: number;
    totalProducts: number;
    breakdown: Array<{ category: string; cost: number; count: number }>;
  } | null>(null);
  const [isLoadingCosts, setIsLoadingCosts] = useState(false);
  const { user } = useAuth();
  // Por defecto, establecemos liberta como "no" para asegurar que los cambios vayan a revisión
  // hasta que se verifique el permiso
  const [liberta, setLiberta] = useState("no");

  // Lista predefinida de beneficios
  const predefinedBenefits = [
    "Envío gratis",
    "Entrega en 24 horas",
    "Producto importado",
    "Producto ecológico",
    "Ahorro energético",
    "Fabricación local",
    "Servicio post-venta",
    "Producto orgánico",
    "Soporte técnico incluido",
    "Materiales premium"
  ];

  // Lista predefinida de garantías
  const predefinedWarranties = [
    "Garantía de 6 meses",
    "Garantía de 1 año",
    "Garantía de 2 años",
    "Garantía de por vida",
    "Devolución en 30 días",
    "Reembolso garantizado",
    "Cambio sin costo",
    "Reparación incluida",
    "Repuestos disponibles",
    "Servicio técnico oficial"
  ];

  // Lista predefinida de medios de pago
  const predefinedPaymentMethods = [
    "Tarjeta de crédito",
    "Tarjeta de débito",
    "Transferencia bancaria",
    "PayPal",
    "Efectivo",
    "Contra-reembolso",
    "Pago en cuotas",
    "Mercado Pago",
    "Nequi",
    "Daviplata"
  ];

  // This is now handled by the useMemo implementation later in the code

  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const { data, error } = await db
          .from("products")
          .select("*")
          .order("updated_at", { ascending: false });
        if (error) throw error;

        const normalized = (data || []).map((product: any) => {
          const addImages = product.additional_images ?? product.additionalImages ?? [];
          const validImages = Array.isArray(addImages) ? addImages.filter(img => img && img.trim()) : [];
          const paddedImages = [...validImages, '', '', ''].slice(0, 3);

          const categoryId = product.category_id ?? product.category ?? '';
          const subcategoryId = product.subcategory ?? '';
          const terceraCategoriaId = product.tercera_categoria ?? '';

          const categoryObj = categories.find(cat => cat.id === categoryId);
          const subcategoryObj = categories.find(cat => cat.id === subcategoryId);
          const terceraCategoriaObj = categories.find(cat => cat.id === terceraCategoriaId);

          return {
            id: product.id,
            ...product,
            price: product.price ?? 0,
            originalPrice: product.original_price ?? product.originalPrice ?? product.price ?? 0,
            additionalImages: paddedImages,
            category: categoryId,
            categoryName: categoryObj?.name || product.category_name || product.categoryName || (categoryId && categoryId.length > 20 ? 'Categoría no encontrada' : categoryId),
            subcategory: subcategoryId,
            subcategoryName: subcategoryObj?.name || product.subcategory_name || product.subcategoryName || (subcategoryId && subcategoryId.length > 20 ? null : subcategoryId),
            terceraCategoria: terceraCategoriaId,
            terceraCategoriaName: terceraCategoriaObj?.name || product.tercera_categoria_name || product.terceraCategoriaName || null,
            isOffer: product.is_offer ?? product.isOffer ?? false,
            isPublished: product.is_published ?? product.isPublished ?? true,
            paymentMethods: product.payment_methods ?? product.paymentMethods ?? [],
            warranties: product.warranties ?? product.warranty ?? [],
            benefits: product.benefits ?? [],
            colors: product.colors ?? [],
            specifications: product.specifications ?? [],
            stock: product.stock ?? 0,
          };
        });
        setProducts(normalized);
      } catch (error) {
        console.error('Error cargando productos:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const { data, error } = await db
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

        const lowEmail = user?.email?.toLowerCase();
        if (user?.isAdmin || lowEmail === "admin@gmail.com" || lowEmail === "admin@tienda.com") {
          setLiberta("si");
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, [user]);

  // Efecto para normalizar productos cuando cambien las categorías
  useEffect(() => {
    if (categories.length === 0) return;

    const refetchProducts = async () => {
      setLoadingProducts(true);
      try {
        if (isSupabase) {
          const { data, error } = await db
            .from("products")
            .select("*")
            .order("updated_at", { ascending: false });
          if (error) throw error;

          const normalized = (data || []).map((product: any) => {
            const addImages = product.additional_images ?? product.additionalImages ?? [];
            const validImages = Array.isArray(addImages) ? addImages.filter(img => img && img.trim()) : [];
            const paddedImages = [...validImages, '', '', ''].slice(0, 3);

            // Obtener nombres de categorías desde el array de categorías
            const categoryId = product.category_id ?? product.category ?? '';
            const subcategoryId = product.subcategory ?? '';
            const terceraCategoriaId = product.tercera_categoria ?? '';

            const categoryObj = categories.find(cat => cat.id === categoryId);
            const subcategoryObj = categories.find(cat => cat.id === subcategoryId);
            const terceraCategoriaObj = categories.find(cat => cat.id === terceraCategoriaId);

            return {
              id: product.id,
              ...product,
              price: product.price ?? 0,
              originalPrice: product.original_price ?? product.originalPrice ?? product.price ?? 0,
              additionalImages: paddedImages,
              category: categoryId,
              categoryName: categoryObj?.name || product.category_name || product.categoryName || (categoryId && categoryId.length > 20 ? 'Categoría no encontrada' : categoryId),
              subcategory: subcategoryId,
              subcategoryName: subcategoryObj?.name || product.subcategory_name || product.subcategoryName || (subcategoryId && subcategoryId.length > 20 ? null : subcategoryId),
              terceraCategoria: terceraCategoriaId,
              terceraCategoriaName: terceraCategoriaObj?.name || product.tercera_categoria_name || product.terceraCategoriaName || null,
              isOffer: product.is_offer ?? product.isOffer ?? false,
              isPublished: product.is_published ?? product.isPublished ?? true,
              paymentMethods: product.payment_methods ?? product.paymentMethods ?? [],
              warranties: product.warranties ?? product.warranty ?? [],
              benefits: product.benefits ?? [],
              colors: product.colors ?? [],
              specifications: product.specifications ?? [],
              stock: product.stock ?? 0,
            };
          });
          setProducts(normalized);
        }
      } catch (error) {
        console.error('Error cargando productos:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    refetchProducts();
  }, [categories, isSupabase]);

  // Efecto para abrir automáticamente un producto cuando se selecciona desde una notificación
  useEffect(() => {
    if (selectedProductId && products.length > 0 && !loadingProducts && editingId !== selectedProductId) {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        handleEdit(product);
        // Notificar al padre que el producto fue seleccionado
        if (onProductSelected) {
          onProductSelected();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId, products, loadingProducts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.stock || !formData.category) {
      toast({
        variant: "destructive",
        title: "Error al guardar producto",
        description: "Por favor completa los campos obligatorios."
      });
      return;
    }

    // La imagen es opcional, no hay validación requerida

    const numericPrice = parseFloat(formData.price);
    const numericStock = parseInt(formData.stock, 10);
    // Convertir costo a número si existe, de lo contrario NULL
    const numericCost = formData.cost ? parseFloat(formData.cost) : null;

    if (isNaN(numericPrice) || isNaN(numericStock) || (formData.cost && isNaN(numericCost as number))) {
      toast({
        variant: "destructive",
        title: "Error al guardar producto",
        description: "El precio, costo y stock deben ser valores numéricos."
      });
      return;
    }

    // Encontrar nombres completos de categorías para mejor visualización
    const categoryName = categories.find(cat => cat.id === formData.category)?.name || "";
    const subcategoryName = formData.subcategory ?
      categories.find(cat => cat.id === formData.subcategory)?.name || "" :
      "";
    const terceraCategoriaName = formData.terceraCategoria ?
      categories.find(cat => cat.id === formData.terceraCategoria)?.name || "" :
      "";

    const productData = {
      ...formData,
      price: numericPrice,
      cost: numericCost,
      stock: numericStock,
      originalPrice: formData.isOffer ? parseFloat(formData.originalPrice) : numericPrice,
      discount: formData.isOffer ? parseFloat(formData.discount) : 0,
      isOffer: formData.isOffer,
      categoryName, // Agregar nombres descriptivos
      subcategoryName,
      terceraCategoriaName,
      lastModified: new Date(),
      lastModifiedBy: user?.email || "unknown",
      // Agregar información para el seguimiento del inventario y costos
      costUpdatedAt: new Date(),
      profitMargin: numericCost ? ((numericPrice - numericCost) / numericPrice) * 100 : null,
      // Asegurar que la imagen se maneje correctamente
      image: formData.image || undefined,
    };

    try {
      const now = new Date().toISOString();
      const supabasePayload = {
        name: formData.name,
        description: formData.description,
        price: numericPrice,
        original_price: formData.isOffer ? parseFloat(formData.originalPrice) : numericPrice,
        image: formData.image || null,
        additional_images: formData.additionalImages?.filter(Boolean) ?? [],
        category: formData.category,
        category_name: categoryName || null,
        subcategory: formData.subcategory || null,
        subcategory_name: subcategoryName || null,
        tercera_categoria: formData.terceraCategoria || null,
        tercera_categoria_name: terceraCategoriaName || null,
        stock: numericStock,
        is_published: formData.isPublished,
        is_offer: formData.isOffer,
        discount: formData.isOffer ? parseFloat(formData.discount) : 0,
        benefits: formData.benefits ?? [],
        warranties: formData.warranties ?? [],
        payment_methods: formData.paymentMethods ?? [],
        colors: formData.colors ?? [],
        specifications: formData.specifications ?? [],
        last_modified_by: user?.email || "unknown",
        // Campos Decant (solo se activan si es un producto Decant)
        is_decant: formData.isDecant || false,
        decant_options: formData.isDecant ? {
          '2.5': { enabled: formData.decantOptions['2.5'].enabled, price: parseFloat(formData.decantOptions['2.5'].price) || 0, stock: parseInt(formData.decantOptions['2.5'].stock, 10) || 0 },
          '5':   { enabled: formData.decantOptions['5'].enabled,   price: parseFloat(formData.decantOptions['5'].price)   || 0, stock: parseInt(formData.decantOptions['5'].stock, 10)   || 0 },
          '10':  { enabled: formData.decantOptions['10'].enabled,  price: parseFloat(formData.decantOptions['10'].price)  || 0, stock: parseInt(formData.decantOptions['10'].stock, 10)  || 0 },
        } : null,
      };

      if (isEditing && editingId) {
        if (liberta === "si") {
          const { error } = await db
            .from("products")
            .update({ ...supabasePayload })
            .eq("id", editingId);
          if (error) throw error;

          const updatedProducts = products.map(product =>
            product.id === editingId ? { id: editingId, ...productData, lastModified: now } : product
          );
          setProducts(updatedProducts);
          toast({
            title: "Producto actualizado",
            description: "El producto ha sido actualizado exitosamente."
          });
        } else {
          const { error } = await db.from("revision").insert([{
            type: "edit",
            data: { ...productData, id: editingId },
            status: "pendiente",
            timestamp: now,
            editorEmail: user?.email || "unknown",
            userName: user?.name || user?.email || "unknown"
          }]);
          if (error) throw error;
          toast({
            title: "Cambios enviados a revisión",
            description: "Los cambios han sido enviados para aprobación del administrador."
          });
        }
      } else {
        if (liberta === "si") {
          const { data: inserted, error } = await db
            .from("products")
            .insert([{ ...supabasePayload, created_by: user?.email || "unknown" }])
            .select()
            .single();
          if (error) throw error;

          const newProductState = { id: inserted?.id || `temp-${Date.now()}`, ...productData, createdAt: now, lastModified: now };
          setProducts([...products, newProductState]);
          toast({
            title: "Producto agregado",
            description: "El producto ha sido agregado exitosamente."
          });
        } else {
          const { error } = await db.from("revision").insert([{
            type: "add",
            data: productData,
            status: "pendiente",
            timestamp: now,
            editorEmail: user?.email || "unknown",
            userName: user?.name || user?.email || "unknown"
          }]);
          if (error) throw error;
          toast({
            title: "Producto enviado a revisión",
            description: "El producto ha sido enviado para aprobación del administrador."
          });
        }
      }

      resetForm();
    } catch (error: any) {
      console.error("Error guardando producto:", error);
      const errorMessage = error?.message || error?.details || JSON.stringify(error);
      toast({
        variant: "destructive",
        title: "Error al guardar producto",
        description: errorMessage || "Ocurrió un error al guardar el producto. Inténtalo nuevamente."
      });
    }
  };

  const handleEdit = (product: any) => {
    setIsEditing(true);
    setEditingId(product.id);
    setIsFormOpen(true); // Abrir el formulario automáticamente

    // Convertir valores numéricos a string para el formulario
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: String(product.price) || '',
      cost: String(product.cost) || '',
      category: product.category || '',
      subcategory: product.subcategory || '',
      terceraCategoria: product.terceraCategoria || '',
      stock: String(product.stock) || '',
      image: product.image || '',
      additionalImages: (() => {
        const addImages = product.additional_images ?? product.additionalImages ?? [];
        const validImages = Array.isArray(addImages) ? addImages.filter(img => img && img.trim()) : [];
        return [...validImages, '', '', ''].slice(0, 3);
      })(),
      specifications: product.specifications && product.specifications.length > 0 ?
        product.specifications : [{ name: '', value: '' }],
      isOffer: product.isOffer || false,
      discount: String(product.discount || ''),
      originalPrice: String(product.originalPrice || ''),
      benefits: product.benefits || [],
      warranties: product.warranties || [],
      paymentMethods: product.paymentMethods || [],
      colors: product.colors || [],
      isPublished: product.isPublished !== undefined ? product.isPublished : true,
      isDecant: product.isDecant || product.is_decant || false,
      decantOptions: (() => {
        const raw = product.decantOptions || product.decant_options;
        if (raw && typeof raw === 'object') {
          return {
            '2.5': { enabled: !!raw?.['2.5']?.enabled, price: String(raw?.['2.5']?.price || ''), stock: String(raw?.['2.5']?.stock || '') },
            '5':   { enabled: !!raw?.['5']?.enabled,   price: String(raw?.['5']?.price || ''),   stock: String(raw?.['5']?.stock || '') },
            '10':  { enabled: !!raw?.['10']?.enabled,  price: String(raw?.['10']?.price || ''),  stock: String(raw?.['10']?.stock || '') },
          };
        }
        return {
          '2.5': { enabled: false, price: '', stock: '' },
          '5':   { enabled: true,  price: '', stock: '' },
          '10':  { enabled: true,  price: '', stock: '' },
        };
      })()
    });

    // Scroll al formulario
    setTimeout(() => {
      document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleDelete = async (productId: string) => {
    try {
      // Confirmar la eliminación permanente
      if (!window.confirm("¿Estás seguro de eliminar este producto PERMANENTEMENTE? Esta acción no se puede deshacer.")) {
        return;
      }

      if (isSupabase) {
        const { error } = await db.from("products").delete().eq("id", productId);
        if (error) throw error;

        try {
          const { data: revisions, error: revisionsError } = await db.from("revision").select("id, data");
          if (revisionsError) throw revisionsError;
          const related = (revisions || []).filter((rev: any) => rev?.data?.id === productId);
          if (related.length > 0) {
            await db.from("revision").delete().in("id", related.map((rev: any) => rev.id));
          }
        } catch (cleanupError) {
          console.error("Error limpiando referencias del producto (Supabase):", cleanupError);
        }

        toast({
          title: "Producto eliminado permanentemente",
          description: "El producto ha sido eliminado de la base de datos de forma permanente."
        });

        setProducts(products.filter(product => product.id !== productId));
        return;
      }

      // Eliminar de forma permanente utilizando la función deleteDoc
      await deleteDoc(doc(db, "products", productId));

      // También eliminar posibles referencias relacionadas en otras colecciones
      // Por ejemplo, eliminar imágenes asociadas, reviews, etc.
      try {
        // Eliminar revisiones pendientes relacionadas con este producto
        const revisionsQuery = query(collection(db, "revision"),
          where("data.id", "==", productId));
        const revisionsSnapshot = await getDocs(revisionsQuery);

        const deletePromises = revisionsSnapshot.docs.map(revDoc => {
          return deleteDoc(doc(db, "revision", revDoc.id));
        });

        // Ejecutar todas las eliminaciones en paralelo
        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }
      } catch (cleanupError) {
        console.error("Error limpiando referencias del producto:", cleanupError);
        // No interrumpir el flujo por errores en limpieza
      }

      toast({
        title: "Producto eliminado permanentemente",
        description: "El producto ha sido eliminado de la base de datos de forma permanente."
      });

      // Actualizar la lista de productos
      setProducts(products.filter(product => product.id !== productId));
    } catch (error) {
      console.error("Error eliminando producto:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al intentar eliminar el producto. Inténtalo nuevamente."
      });
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setIsFormOpen(false); // Cerrar el formulario al cancelar
    setFormData({
      name: '',
      description: '',
      price: '',
      cost: '',
      category: '',
      subcategory: '',
      terceraCategoria: '',
      stock: '',
      image: '',
      additionalImages: ['', '', ''],
      specifications: [{ name: '', value: '' }],
      isOffer: false,
      discount: '',
      originalPrice: '',
      benefits: [],
      warranties: [],
      paymentMethods: [],
      colors: [],
      isPublished: true,
      isDecant: false,
      decantOptions: {
        '2.5': { enabled: false, price: '', stock: '' },
        '5':   { enabled: true,  price: '', stock: '' },
        '10':  { enabled: true,  price: '', stock: '' },
      }
    });
  };

  // OPTIMIZACIÓN: Memoizar función de estado de stock
  const getStockStatus = useCallback((stock: number) => {
    if (stock > 10) {
      return { text: "En Stock", color: "bg-green-100 text-green-800 hover:bg-green-200" };
    } else if (stock > 0) {
      return { text: "Stock Bajo", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" };
    } else {
      return { text: "Agotado", color: "bg-red-100 text-red-800 hover:bg-red-200" };
    }
  }, []);

  // State for sorting
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'price-high' | 'price-low' | 'name-asc' | 'name-desc'>('recent');

  // OPTIMIZACIÓN: Filtrado combinado en una sola pasada para mejor rendimiento
  const filteredProducts = useMemo(() => {
    if (products.length === 0) return [];

    const hasSearchTerm = searchTerm.trim().length > 0;
    const hasCategoryFilter = selectedCategory.length > 0;

    // Si no hay filtros, retornar todos los productos directamente
    if (!hasSearchTerm && !hasCategoryFilter) {
      return products;
    }

    const lowercasedTerm = hasSearchTerm ? searchTerm.toLowerCase() : '';

    // Filtrar en una sola pasada combinando ambos filtros
    return products.filter(product => {
      // Filtro de búsqueda
      if (hasSearchTerm) {
        const matchesSearch =
          (product.name && product.name.toLowerCase().includes(lowercasedTerm)) ||
          (product.description && product.description.toLowerCase().includes(lowercasedTerm)) ||
          (product.category && product.category.toLowerCase().includes(lowercasedTerm)) ||
          (product.price && String(product.price).includes(lowercasedTerm));

        if (!matchesSearch) return false;
      }

      // Filtro de categoría
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

  // OPTIMIZACIÓN: Sort más eficiente con caché de valores calculados
  const sortedProducts = useMemo(() => {
    if (filteredProducts.length === 0) return [];

    // Crear array con valores pre-calculados para evitar recalcular en cada comparación
    const productsWithSortKeys = filteredProducts.map(product => {
      let sortKey: number | string = 0;

      switch (sortOrder) {
        case 'recent':
        case 'oldest':
          const modified = product.updated_at || product.updatedAt || new Date();
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

    // Ordenar usando los valores pre-calculados
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

  // Limitar el número de productos visibles para paginación
  const paginatedProducts = useMemo(() => {
    return sortedProducts.slice(0, visibleProducts);
  }, [sortedProducts, visibleProducts]);

  // Actualizar el estado de hasMoreProducts cuando cambien sortedProducts o visibleProducts
  useEffect(() => {
    setHasMoreProducts(visibleProducts < sortedProducts.length);
  }, [sortedProducts.length, visibleProducts]);

  // Función para cargar más productos
  const loadMoreProducts = () => {
    setLoadingMoreProducts(true);
    // Simular pequeño retraso para mejor UX
    setTimeout(() => {
      setVisibleProducts(prev => prev + 20);
      setLoadingMoreProducts(false);
    }, 500);
  };

  // Image loading state
  const [loadingImages, setLoadingImages] = useState<{ [key: string]: boolean }>({});

  // Function to handle image load start/end
  const handleImageLoadStart = (productId: string) => {
    setLoadingImages(prev => ({ ...prev, [productId]: true }));
  };

  const handleImageLoadEnd = (productId: string) => {
    setLoadingImages(prev => ({ ...prev, [productId]: false }));
  };

  // Function to calculate monthly cost summary
  const calculateMonthlyCostSummary = async (month?: number, year?: number) => {
    setIsLoadingCosts(true);

    try {
      // Use current month and year if not specified
      const targetDate = new Date();
      if (month !== undefined) targetDate.setMonth(month);
      if (year !== undefined) targetDate.setFullYear(year);

      // Get first and last day of month
      const firstDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

      // Format month name in Spanish
      const monthName = targetDate.toLocaleString('es-ES', { month: 'long' });

      const { data, error } = await db
        .from("products")
        .select("*");
      if (error) throw error;
      const productsData = data || [];

      let totalCost = 0;
      let productsWithCost = 0;
      const categoryBreakdown: { [key: string]: { cost: number, count: number } } = {};

      // Calculate totals
      productsData.forEach((product: any) => {
        if (product.cost) {
          const cost = parseFloat(product.cost);
          const stock = parseInt(product.stock || 0, 10);

          if (!isNaN(cost) && !isNaN(stock) && stock > 0) {
            const totalProductCost = cost * stock;
            totalCost += totalProductCost;
            productsWithCost++;

            // Add to category breakdown
            const category = product.categoryName || product.category_name || product.category || "Sin categoría";
            if (!categoryBreakdown[category]) {
              categoryBreakdown[category] = { cost: 0, count: 0 };
            }

            categoryBreakdown[category].cost += totalProductCost;
            categoryBreakdown[category].count++;
          }
        }
      });

      // Transform category breakdown to array
      const breakdownArray = Object.entries(categoryBreakdown).map(([category, data]) => ({
        category,
        cost: data.cost,
        count: data.count
      })).sort((a, b) => b.cost - a.cost); // Sort by cost descending

      // Set the data
      setMonthlyCostData({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1), // Capitalize first letter
        year: targetDate.getFullYear(),
        totalCost,
        totalProducts: productsWithCost,
        breakdown: breakdownArray
      });

    } catch (error) {
      console.error("Error calculating monthly costs:", error);
      toast({
        variant: "destructive",
        title: "Error al calcular costos",
        description: "No se pudieron calcular los costos mensuales."
      });
    } finally {
      setIsLoadingCosts(false);
    }
  };

  // Initialize expandable sections based on form data
  // Calculate costs on component mount
  useEffect(() => {
    if (user && liberta === "si") {
      calculateMonthlyCostSummary();
    }
  }, [user, liberta]);

  useEffect(() => {
    // Helper function to check if a section has content
    const hasSectionContent = (sectionData: any[]) => {
      return sectionData.length > 0;
    };

    // Set timeout to ensure DOM elements are available
    const timer = setTimeout(() => {
      // Handle colors section visibility
      const colorsSection = document.getElementById('colorsSection');
      const colorsChevron = document.getElementById('colorsChevron');
      if (colorsSection && colorsChevron) {
        if (!hasSectionContent(formData.colors)) {
          colorsSection.classList.add('hidden');
        } else {
          colorsChevron.classList.add('rotate-180');
        }
      }

      // Handle benefits section visibility
      const benefitsSection = document.getElementById('benefitsSection');
      const benefitsChevron = document.getElementById('benefitsChevron');
      if (benefitsSection && benefitsChevron) {
        if (!hasSectionContent(formData.benefits)) {
          benefitsSection.classList.add('hidden');
        } else {
          benefitsChevron.classList.add('rotate-180');
        }
      }

      // Handle warranties section visibility
      const warrantiesSection = document.getElementById('warrantiesSection');
      const warrantiesChevron = document.getElementById('warrantiesChevron');
      if (warrantiesSection && warrantiesChevron) {
        if (!hasSectionContent(formData.warranties)) {
          warrantiesSection.classList.add('hidden');
        } else {
          warrantiesChevron.classList.add('rotate-180');
        }
      }

      // Handle payment methods section visibility
      const paymentMethodsSection = document.getElementById('paymentMethodsSection');
      const paymentMethodsChevron = document.getElementById('paymentMethodsChevron');
      if (paymentMethodsSection && paymentMethodsChevron) {
        if (!hasSectionContent(formData.paymentMethods)) {
          paymentMethodsSection.classList.add('hidden');
        } else {
          paymentMethodsChevron.classList.add('rotate-180');
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [formData.colors.length, formData.benefits.length, formData.warranties.length, formData.paymentMethods.length]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
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

      {/* Formulario para agregar/editar productos */}
      <Card id="product-form" className="shadow-sm border border-slate-200">
        <CardHeader className="bg-white border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <Edit className="h-5 w-5 text-slate-600" />
                  <CardTitle className="text-xl font-semibold text-slate-900">Editar Producto</CardTitle>
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-slate-600" />
                  <CardTitle className="text-xl font-semibold text-slate-900">Agregar Nuevo Producto</CardTitle>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetForm();
                  }}
                  className="text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
              {!isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFormOpen(!isFormOpen)}
                  className="text-slate-600 hover:bg-slate-100"
                >
                  {isFormOpen ? 'Ocultar' : 'Mostrar'} formulario
                  <ChevronDown className={cn(
                    "h-4 w-4 ml-2 transition-transform duration-300",
                    isFormOpen && "rotate-180"
                  )} />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {isFormOpen && (
          <CardContent className="p-6 bg-white">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sección: Información Básica - Colapsable */}
              <div className="space-y-4 border border-slate-200 rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => setSectionsOpen({ ...sectionsOpen, basicInfo: !sectionsOpen.basicInfo })}
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-slate-600" />
                    <h3 className="text-base font-semibold text-slate-900">Información Básica</h3>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Requerido</Badge>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-slate-500 transition-transform duration-300",
                    sectionsOpen.basicInfo && "rotate-180"
                  )} />
                </div>

                {sectionsOpen.basicInfo && (
                  <div className="p-4">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                          Nombre del Producto <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ej: Coca-Cola 600ml"
                          required
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-sm font-semibold">
                          Categoría Principal <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => {
                            setFormData({ ...formData, category: value, subcategory: '' }); // Reset subcategory when category changes (se mostrará como "none")
                          }}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Seleccionar categoría principal" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Mostrar solo categorías principales */}
                            {categories
                              .filter(category => !category.parentId)
                              .map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {/* Mostrar nombre de la categoría seleccionada */}
                        {formData.category && !formData.subcategory && (
                          <div className="mt-1 text-xs text-blue-600 font-medium">
                            Clasificación: {categories.find(cat => cat.id === formData.category)?.name || 'Categoría seleccionada'}
                          </div>
                        )}
                      </div>

                      {/* Subcategoría (opcional) - solo mostrado si se ha seleccionado una categoría */}
                      {formData.category && (
                        <div className="space-y-2">
                          <Label htmlFor="subcategory" className="text-sm font-semibold flex items-center">
                            Subcategoría <span className="ml-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">Opcional</span>
                          </Label>
                          <Select
                            value={formData.subcategory || "none"}
                            onValueChange={(value) => setFormData({
                              ...formData,
                              subcategory: value === "none" ? "" : value,
                              terceraCategoria: "" // Reset tercera categoría cuando cambia la subcategoría
                            })}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Seleccionar subcategoría (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Ninguna - Usar solo categoría principal</SelectItem>
                              {/* Mostrar subcategorías de la categoría seleccionada */}
                              {categories
                                .filter(category => category.parentId === formData.category)
                                .map((subCategory) => (
                                  <SelectItem key={subCategory.id} value={subCategory.id}>
                                    {subCategory.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {formData.category && formData.subcategory && (
                            <div className="mt-1 text-xs text-blue-600 font-medium">
                              Clasificación: {categories.find(cat => cat.id === formData.category)?.name || 'Categoría principal'} {'>'} {categories.find(cat => cat.id === formData.subcategory)?.name || 'Subcategoría'}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tercera categoría (opcional) - solo mostrado si se ha seleccionado una subcategoría */}
                      {formData.category && formData.subcategory && (
                        <div className="space-y-2">
                          <Label htmlFor="terceraCategoria" className="text-sm font-semibold flex items-center">
                            Tercera Categoría <span className="ml-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">Opcional</span>
                          </Label>
                          <Select
                            value={formData.terceraCategoria || "none"}
                            onValueChange={(value) => setFormData({
                              ...formData,
                              terceraCategoria: value === "none" ? "" : value
                            })}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Seleccionar tercera categoría (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Ninguna - Usar solo hasta subcategoría</SelectItem>
                              {/* Mostrar terceras categorías de la subcategoría seleccionada */}
                              {categories
                                .filter(category => category.parentId === formData.subcategory)
                                .map((terceraCategoria) => (
                                  <SelectItem key={terceraCategoria.id} value={terceraCategoria.id}>
                                    {terceraCategoria.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {formData.category && formData.subcategory && formData.terceraCategoria && (
                            <div className="mt-1 text-xs text-blue-600 font-medium">
                              Clasificación: {categories.find(cat => cat.id === formData.category)?.name || 'Categoría principal'} {'>'}
                              {categories.find(cat => cat.id === formData.subcategory)?.name || 'Subcategoría'} {'>'}
                              {categories.find(cat => cat.id === formData.terceraCategoria)?.name || 'Tercera categoría'}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-sm font-semibold">
                          Precio de venta <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          placeholder="Ej: 12500"
                          required
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cost" className="text-sm font-semibold flex items-center">
                          Costo de adquisición
                          <div className="ml-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-xs font-medium">Uso interno</div>
                        </Label>
                        <Input
                          id="cost"
                          type="number"
                          value={formData.cost}
                          onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                          placeholder="Ej: 8000"
                          className="h-11"
                        />
                        {formData.cost && formData.price && (
                          <div className="mt-2 text-xs">
                            <span className="font-medium">Margen: </span>
                            {parseFloat(formData.price) > 0 && parseFloat(formData.cost) > 0 ? (
                              <span className="text-green-600 font-medium">
                                {Math.round(((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price)) * 100)}%
                              </span>
                            ) : (
                              <span className="text-gray-500">No calculable</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Control de Publicación - Compacto */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Estado de Publicación
                        </Label>
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              formData.isPublished ? "bg-green-500" : "bg-gray-400"
                            )}></div>
                            <span className="text-xs text-gray-600">
                              {formData.isPublished ? "Publicado" : "No publicado"}
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.isPublished}
                              onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">
                          {formData.isPublished
                            ? "✅ Visible para el público"
                            : "🔒 Solo visible internamente"}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="stock" className="text-sm font-semibold">
                          Stock <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="stock"
                          type="number"
                          value={formData.stock}
                          onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                          placeholder="Ej: 100"
                          required
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
                          Descripción <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Describe el producto detalladamente..."
                          required
                          className="min-h-[120px]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ================================================================ */}
              {/* SECCIÓN MULTI-TAMAÑO — Precios y Stock por Presentación / Variantes */}
              {/* ================================================================ */}
              {(() => {
                return (
                  <div className="border-2 border-emerald-300 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 border-b border-emerald-200">
                      <span className="text-2xl">📏</span>
                      <div>
                        <h3 className="text-base font-bold text-emerald-900">Precios y Stock por Presentación / Variantes</h3>
                        <p className="text-xs text-emerald-600">Configura precio y stock para cada tamaño/medida. La opción Chico está desactivada por defecto.</p>
                      </div>
                    </div>
                    <div className="p-4 space-y-4 bg-white">
                      {/* Toggle isDecant */}
                      <div className={`flex items-center justify-between p-3 rounded-lg border ${formData.isDecant ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-200'}`}>
                        <span className="text-sm font-semibold text-gray-700">
                          {formData.isDecant ? '✅ Habilitado: Múltiples tamaños' : '⚠️ Vender con múltiples tamaños / medidas'}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={formData.isDecant} onChange={(e) => setFormData({ ...formData, isDecant: e.target.checked })} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                      {/* Tarjetas por presentación */}
                      {formData.isDecant && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {(['2.5', '5', '10'] as const).map((ml) => {
                            const opt = formData.decantOptions[ml];
                            return (
                              <div key={ml} className={`rounded-xl border-2 p-4 transition-all ${opt.enabled ? 'border-emerald-400 bg-emerald-50/40 shadow-sm' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xl font-black text-gray-900">
                                    {ml === '2.5' ? 'Chico' : ml === '5' ? 'Mediano' : 'Grande'}
                                  </span>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={opt.enabled} onChange={(e) => setFormData({ ...formData, decantOptions: { ...formData.decantOptions, [ml]: { ...opt, enabled: e.target.checked } } })} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                  </label>
                                </div>
                                {ml === '2.5' && !opt.enabled && <p className="text-[10px] text-gray-400 mb-2">Desactivada por defecto</p>}
                                <div className="space-y-2">
                                  <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Precio ($)</label>
                                    <input type="number" value={opt.price} disabled={!opt.enabled} onChange={(e) => setFormData({ ...formData, decantOptions: { ...formData.decantOptions, [ml]: { ...opt, price: e.target.value } } })} placeholder="Ej: 8000" className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 disabled:bg-gray-100 disabled:cursor-not-allowed" />
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Stock (unidades)</label>
                                    <input type="number" value={opt.stock} disabled={!opt.enabled} onChange={(e) => setFormData({ ...formData, decantOptions: { ...formData.decantOptions, [ml]: { ...opt, stock: e.target.value } } })} placeholder="Ej: 20" className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 disabled:bg-gray-100 disabled:cursor-not-allowed" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs text-gray-400">💡 El campo "Precio de venta" y "Stock" global actúan como fallback si no se configuran valores por presentación.</p>
                    </div>
                  </div>
                );
              })()}

              {/* Sección: Imágenes del Producto - Colapsable */}
              <div className="space-y-4 border border-slate-200 rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => setSectionsOpen({ ...sectionsOpen, images: !sectionsOpen.images })}
                >
                  <div className="flex items-center gap-3">
                    <Image className="h-5 w-5 text-slate-600" />
                    <h3 className="text-base font-semibold text-slate-900">Imágenes del Producto</h3>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">Recomendado</Badge>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-slate-500 transition-transform duration-300",
                    sectionsOpen.images && "rotate-180"
                  )} />
                </div>

                {sectionsOpen.images && (
                  <div className="p-4 space-y-4">

                    <div className="space-y-2">
                      <ImageUploader
                        value={formData.image}
                        onChange={(url) => setFormData({ ...formData, image: url })}
                        label="Imagen Principal del Producto (Opcional)"
                        folder="products/main"
                        maxSizeMB={5}
                        aspectRatio="aspect-square"
                      />
                    </div>

                    {/* Imágenes adicionales */}
                    <div className="space-y-4">
                      <MultiImageUploader
                        images={formData.additionalImages}
                        onChange={(images) => setFormData({ ...formData, additionalImages: images })}
                        label="Imágenes Adicionales del Producto"
                        maxImages={6}
                        folder="products/additional"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sección: Ofertas y Promociones - Colapsable */}
              <div className="space-y-4 border border-slate-200 rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => setSectionsOpen({ ...sectionsOpen, offers: !sectionsOpen.offers })}
                >
                  <div className="flex items-center gap-3">
                    <Award className="h-5 w-5 text-slate-600" />
                    <h3 className="text-base font-semibold text-slate-900">Ofertas y Promociones</h3>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Opcional</Badge>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-slate-500 transition-transform duration-300",
                    sectionsOpen.offers && "rotate-180"
                  )} />
                </div>

                {sectionsOpen.offers && (
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isOffer"
                        checked={formData.isOffer}
                        onChange={(e) => setFormData({ ...formData, isOffer: e.target.checked })}
                        className="w-5 h-5 rounded text-green-600 focus:ring-2 focus:ring-green-500"
                      />
                      <Label htmlFor="isOffer" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                        Activar oferta especial
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {formData.isOffer ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </Label>
                    </div>

                    {formData.isOffer && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="space-y-2">
                          <Label htmlFor="originalPrice" className="text-sm font-semibold text-gray-700">
                            Precio Original
                          </Label>
                          <Input
                            id="originalPrice"
                            type="number"
                            value={formData.originalPrice}
                            onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                            placeholder="Ej: 15000"
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="discount" className="text-sm font-semibold text-gray-700">
                            Descuento (%)
                          </Label>
                          <Input
                            id="discount"
                            type="number"
                            value={formData.discount}
                            onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                            placeholder="Ej: 20"
                            className="h-11"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sección: Detalles del Producto - Colapsable */}
              <div className="space-y-4 border border-slate-200 rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => setSectionsOpen({ ...sectionsOpen, details: !sectionsOpen.details })}
                >
                  <div className="flex items-center gap-3">
                    <SlidersHorizontal className="h-5 w-5 text-slate-600" />
                    <h3 className="text-base font-semibold text-slate-900">Detalles del Producto</h3>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">Opcional</Badge>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-slate-500 transition-transform duration-300",
                    sectionsOpen.details && "rotate-180"
                  )} />
                </div>

                {sectionsOpen.details && (
                  <div className="p-4 space-y-4">

                    {/* Especificaciones */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <div className="p-1 bg-sky-50 rounded">
                            <Package className="h-4 w-4 text-sky-600" />
                          </div>
                          Especificaciones
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData({
                            ...formData,
                            specifications: [...formData.specifications, { name: '', value: '' }]
                          })}
                          className="flex items-center gap-1 text-xs h-7"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Añadir especificación
                        </Button>
                      </div>

                      <div className="grid gap-3">
                        {formData.specifications.map((spec, index) => (
                          <div key={index} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center bg-gray-50 p-3 rounded-lg">
                            <div className="sm:col-span-2">
                              <Label htmlFor={`spec-name-${index}`} className="sr-only">
                                Nombre
                              </Label>
                              <Input
                                id={`spec-name-${index}`}
                                value={spec.name}
                                onChange={(e) => {
                                  const newSpecs = [...formData.specifications];
                                  newSpecs[index] = { ...newSpecs[index], name: e.target.value };
                                  setFormData({ ...formData, specifications: newSpecs });
                                }}
                                placeholder="Nombre (ej: Marca, Material)"
                                className="h-9"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label htmlFor={`spec-value-${index}`} className="sr-only">
                                Valor
                              </Label>
                              <Input
                                id={`spec-value-${index}`}
                                value={spec.value}
                                onChange={(e) => {
                                  const newSpecs = [...formData.specifications];
                                  newSpecs[index] = { ...newSpecs[index], value: e.target.value };
                                  setFormData({ ...formData, specifications: newSpecs });
                                }}
                                placeholder="Valor (ej: Sony, Aluminio)"
                                className="h-9"
                              />
                            </div>
                            <div className="flex justify-end">
                              {formData.specifications.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const newSpecs = [...formData.specifications];
                                    newSpecs.splice(index, 1);
                                    setFormData({ ...formData, specifications: newSpecs });
                                  }}
                                  className="h-8 w-8 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Colores */}
                    <div className="space-y-4 md:col-span-2">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => {
                          // Toggle a DOM class for expanding/collapsing
                          const element = document.getElementById('colorsSection');
                          if (element) {
                            element.classList.toggle('hidden');
                          }
                          // Toggle the rotation of the chevron
                          const chevron = document.getElementById('colorsChevron');
                          if (chevron) {
                            chevron.classList.toggle('rotate-180');
                          }
                        }}
                      >
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <div className="p-1 bg-purple-50 rounded">
                            <div className="h-4 w-4 rounded-full bg-gradient-to-r from-pink-500 to-violet-500"></div>
                          </div>
                          Colores Disponibles
                          <span className="text-xs text-gray-500">(Opcional)</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent the parent onClick from firing
                              setFormData({
                                ...formData,
                                colors: [...formData.colors, { name: '', hexCode: '#000000', image: '' }]
                              })
                            }}
                            className="flex items-center gap-1 text-xs h-7"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Añadir color
                          </Button>
                          <ChevronDown id="colorsChevron" className="h-4 w-4 text-gray-500 transition-transform" />
                        </div>
                      </div>

                      <div id="colorsSection" className="space-y-6 border rounded-lg p-6 bg-white shadow-sm">
                        {formData.colors.map((color, index) => (
                          <div key={index} className="relative bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-6 hover:border-purple-300 transition-all">
                            {/* Botón eliminar en la esquina */}
                            {formData.colors.length > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const newColors = [...formData.colors];
                                  newColors.splice(index, 1);
                                  setFormData({ ...formData, colors: newColors });
                                }}
                                className="absolute top-2 right-2 h-8 w-8 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 z-10"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Información del color */}
                              <div className="space-y-4">
                                <div>
                                  <Label className="text-xs font-semibold text-gray-600 mb-2 block">Nombre del Color</Label>
                                  <Input
                                    value={color.name}
                                    onChange={(e) => {
                                      const newColors = [...formData.colors];
                                      newColors[index] = { ...newColors[index], name: e.target.value };
                                      setFormData({ ...formData, colors: newColors });
                                    }}
                                    placeholder="Ej: Rojo, Azul, Negro"
                                    className="h-11"
                                  />
                                </div>

                                <div>
                                  <Label className="text-xs font-semibold text-gray-600 mb-2 block">Código de Color</Label>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="color"
                                      value={color.hexCode}
                                      onChange={(e) => {
                                        const newColors = [...formData.colors];
                                        newColors[index] = { ...newColors[index], hexCode: e.target.value };
                                        setFormData({ ...formData, colors: newColors });
                                      }}
                                      className="w-14 h-11 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-purple-400 transition-colors"
                                    />
                                    <Input
                                      value={color.hexCode}
                                      onChange={(e) => {
                                        const newColors = [...formData.colors];
                                        newColors[index] = { ...newColors[index], hexCode: e.target.value };
                                        setFormData({ ...formData, colors: newColors });
                                      }}
                                      placeholder="#000000"
                                      className="h-11 flex-1"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Imagen del color */}
                              <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-gray-600 mb-2 block">Imagen del Producto en este Color</Label>
                                <ImageUploader
                                  value={color.image}
                                  onChange={(url) => {
                                    const newColors = [...formData.colors];
                                    newColors[index] = { ...newColors[index], image: url };
                                    setFormData({ ...formData, colors: newColors });
                                  }}
                                  folder="products/colors"
                                  maxSizeMB={3}
                                  aspectRatio="aspect-square"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        {formData.colors.length === 0 && (
                          <div className="text-center py-4 text-gray-500">
                            No hay colores definidos. Utiliza el botón "Añadir color" para agregar opciones de colores al producto.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sección: Beneficios y Garantías - Colapsable */}
              {/* Sección: Beneficios y Garantías - Colapsable */}
              <div className="space-y-4 border border-slate-200 rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => setSectionsOpen({ ...sectionsOpen, benefits: !sectionsOpen.benefits })}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-slate-600" />
                    <h3 className="text-base font-semibold text-slate-900">Beneficios y Garantías</h3>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Opcional</Badge>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-slate-500 transition-transform duration-300",
                    sectionsOpen.benefits && "rotate-180"
                  )} />
                </div>

                {sectionsOpen.benefits && (
                  <div className="p-4 space-y-4">

                    {/* Beneficios del Producto */}
                    <div className="space-y-4">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => {
                          // Toggle a DOM class for expanding/collapsing
                          const element = document.getElementById('benefitsSection');
                          if (element) {
                            element.classList.toggle('hidden');
                          }
                          // Toggle the rotation of the chevron
                          const chevron = document.getElementById('benefitsChevron');
                          if (chevron) {
                            chevron.classList.toggle('rotate-180');
                          }
                        }}
                      >
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <div className="p-1 bg-green-50 rounded">
                            <Award className="h-4 w-4 text-green-600" />
                          </div>
                          Beneficios del Producto
                          <span className="text-xs text-gray-500">(Opcional)</span>
                          <Badge variant="outline" className="ml-2 py-0 px-2 text-xs">
                            {formData.benefits.length} seleccionados
                          </Badge>
                        </Label>
                        <ChevronDown id="benefitsChevron" className="h-4 w-4 text-gray-500 transition-transform" />
                      </div>

                      <div id="benefitsSection" className="border rounded-lg p-4 bg-slate-50">
                        <div className="flex flex-wrap gap-2">
                          {predefinedBenefits.map((benefit) => (
                            <Badge
                              key={benefit}
                              variant={formData.benefits.includes(benefit) ? "default" : "outline"}
                              className={`cursor-pointer py-1.5 px-3 ${formData.benefits.includes(benefit)
                                ? "bg-green-500 hover:bg-green-600"
                                : "hover:bg-slate-100"
                                }`}
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent the parent onClick from firing
                                if (formData.benefits.includes(benefit)) {
                                  setFormData({
                                    ...formData,
                                    benefits: formData.benefits.filter(b => b !== benefit)
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    benefits: [...formData.benefits, benefit]
                                  });
                                }
                              }}
                            >
                              {formData.benefits.includes(benefit) && (
                                <Check className="h-3.5 w-3.5 mr-1" />
                              )}
                              {benefit}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Garantías del Producto */}
                    <div className="space-y-4 md:col-span-2">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => {
                          // Toggle a DOM class for expanding/collapsing
                          const element = document.getElementById('warrantiesSection');
                          if (element) {
                            element.classList.toggle('hidden');
                          }
                          // Toggle the rotation of the chevron
                          const chevron = document.getElementById('warrantiesChevron');
                          if (chevron) {
                            chevron.classList.toggle('rotate-180');
                          }
                        }}
                      >
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <div className="p-1 bg-blue-50 rounded">
                            <ShieldCheck className="h-4 w-4 text-blue-600" />
                          </div>
                          Garantías y Respaldo
                          <span className="text-xs text-gray-500">(Opcional)</span>
                          <Badge variant="outline" className="ml-2 py-0 px-2 text-xs">
                            {formData.warranties.length} seleccionados
                          </Badge>
                        </Label>
                        <ChevronDown id="warrantiesChevron" className="h-4 w-4 text-gray-500 transition-transform" />
                      </div>

                      <div id="warrantiesSection" className="border rounded-lg p-4 bg-slate-50">
                        <div className="flex flex-wrap gap-2">
                          {predefinedWarranties.map((warranty) => (
                            <Badge
                              key={warranty}
                              variant={formData.warranties.includes(warranty) ? "default" : "outline"}
                              className={`cursor-pointer py-1.5 px-3 ${formData.warranties.includes(warranty)
                                ? "bg-blue-500 hover:bg-blue-600"
                                : "hover:bg-slate-100"
                                }`}
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent the parent onClick from firing
                                if (formData.warranties.includes(warranty)) {
                                  setFormData({
                                    ...formData,
                                    warranties: formData.warranties.filter(w => w !== warranty)
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    warranties: [...formData.warranties, warranty]
                                  });
                                }
                              }}
                            >
                              {formData.warranties.includes(warranty) && (
                                <Check className="h-3.5 w-3.5 mr-1" />
                              )}
                              {warranty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Métodos de Pago */}
                    <div className="space-y-4 md:col-span-2">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => {
                          // Toggle a DOM class for expanding/collapsing
                          const element = document.getElementById('paymentMethodsSection');
                          if (element) {
                            element.classList.toggle('hidden');
                          }
                          // Toggle the rotation of the chevron
                          const chevron = document.getElementById('paymentMethodsChevron');
                          if (chevron) {
                            chevron.classList.toggle('rotate-180');
                          }
                        }}
                      >
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <div className="p-1 bg-cyan-50 rounded">
                            <CreditCard className="h-4 w-4 text-cyan-600" />
                          </div>
                          Métodos de Pago Aceptados
                          <span className="text-xs text-gray-500">(Opcional)</span>
                          <Badge variant="outline" className="ml-2 py-0 px-2 text-xs">
                            {formData.paymentMethods.length} seleccionados
                          </Badge>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent the parent onClick from firing
                              setFormData({
                                ...formData,
                                paymentMethods: [...formData.paymentMethods, '']
                              })
                            }}
                            className="flex items-center gap-1 text-xs h-7"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Añadir método
                          </Button>
                          <ChevronDown id="paymentMethodsChevron" className="h-4 w-4 text-gray-500 transition-transform" />
                        </div>
                      </div>

                      <div id="paymentMethodsSection" className="space-y-3 border rounded-lg p-4 bg-gray-50">
                        {/* Lista predefinida */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {predefinedPaymentMethods.map((method) => (
                            <Badge
                              key={method}
                              variant={formData.paymentMethods.includes(method) ? "default" : "outline"}
                              className={`cursor-pointer py-1.5 px-3 ${formData.paymentMethods.includes(method)
                                ? "bg-cyan-500 hover:bg-cyan-600"
                                : "hover:bg-slate-100"
                                }`}
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent the parent onClick from firing
                                if (formData.paymentMethods.includes(method)) {
                                  setFormData({
                                    ...formData,
                                    paymentMethods: formData.paymentMethods.filter(m => m !== method)
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    paymentMethods: [...formData.paymentMethods, method]
                                  });
                                }
                              }}
                            >
                              {formData.paymentMethods.includes(method) && (
                                <Check className="h-3.5 w-3.5 mr-1" />
                              )}
                              {method}
                            </Badge>
                          ))}
                        </div>

                        {/* Métodos personalizados */}
                        {formData.paymentMethods
                          .filter(method => !predefinedPaymentMethods.includes(method))
                          .map((method, index) => (
                            <div key={`custom-${index}`} className="flex items-center gap-2">
                              <Input
                                value={method}
                                onChange={(e) => {
                                  const newMethods = [...formData.paymentMethods];
                                  const customIndex = formData.paymentMethods.findIndex(m => m === method);
                                  if (customIndex >= 0) {
                                    newMethods[customIndex] = e.target.value;
                                    setFormData({ ...formData, paymentMethods: newMethods });
                                  }
                                }}
                                placeholder="Método de pago personalizado"
                                className="h-10"
                                onClick={(e) => e.stopPropagation()} // Prevent the section from collapsing when clicking on the input
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent the parent onClick from firing
                                  setFormData({
                                    ...formData,
                                    paymentMethods: formData.paymentMethods.filter(m => m !== method)
                                  });
                                }}
                                className="h-8 w-8 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-8 mt-8 border-t-2 border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-purple-700 border-purple-200 shadow-md"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      name: "Producto de Prueba",
                      price: "4444",
                      cost: "3000",
                      stock: "50",
                      description: "Hola, este es un producto con datos de prueba.",
                      isPublished: true
                    });
                  }}
                >
                  <Wand2 className="h-5 w-5 mr-2" />
                  Auto-Rellenar
                </Button>

                <div className="flex gap-3">
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={resetForm}
                      className="border-gray-300 hover:bg-gray-100 shadow-md"
                    >
                      <X className="h-5 w-5 mr-2" />
                      Cancelar
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="bg-blue-600 text-white hover:bg-blue-700 px-6"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing && liberta !== "si"
                      ? 'Enviar Cambios a Revisión'
                      : isEditing
                        ? 'Actualizar Producto'
                        : liberta !== "si"
                          ? 'Enviar Producto a Revisión'
                          : 'Agregar Producto'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Resumen de Costos Mensuales */}
      {user && liberta === "si" && (
        <Card className="shadow-sm border border-slate-200">
          <CardHeader className="bg-white border-b border-slate-200">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-600" />
              Resumen de Costos de Inventario
            </CardTitle>
            <CardDescription className="text-slate-600">
              Análisis de costos basado en los productos actuales y su stock
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {isLoadingCosts ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <span className="ml-2 text-indigo-600">Calculando costos...</span>
              </div>
            ) : !monthlyCostData ? (
              <div className="flex items-center justify-center py-6">
                <Button
                  onClick={() => calculateMonthlyCostSummary()}
                  variant="outline"
                  className="bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Calcular Costos del Mes
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-indigo-100">
                    <div className="text-sm text-indigo-600 mb-1">Periodo</div>
                    <div className="text-xl font-bold">{monthlyCostData.month} {monthlyCostData.year}</div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
                    <div className="text-sm text-green-600 mb-1">Costo Total de Inventario</div>
                    <div className="text-xl font-bold text-green-700">
                      ${monthlyCostData.totalCost.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
                    <div className="text-sm text-blue-600 mb-1">Productos con Costo Registrado</div>
                    <div className="text-xl font-bold text-blue-700">
                      {monthlyCostData.totalProducts}
                    </div>
                  </div>
                </div>

                {monthlyCostData.breakdown.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-indigo-100">
                    <div className="p-4 border-b border-indigo-100">
                      <h3 className="font-semibold text-indigo-800">Costos por Categoría</h3>
                    </div>
                    <div className="p-4">
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {monthlyCostData.breakdown.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-2 rounded-md hover:bg-indigo-50 transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <Tags className="h-4 w-4 text-indigo-600" />
                              <span>{item.category}</span>
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 text-xs">
                                {item.count} productos
                              </Badge>
                            </div>
                            <span className="font-semibold text-green-600">
                              ${item.cost.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-indigo-50 p-3 rounded-b-lg border-t border-indigo-100">
                      <div className="flex justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs bg-white text-indigo-700"
                          onClick={() => calculateMonthlyCostSummary()}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Actualizar datos
                        </Button>
                        <div className="text-xs text-indigo-600">
                          <span>Última actualización: {new Date().toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator className="my-8" />

      {/* Lista de productos existentes */}
      <Card className="shadow-sm border border-slate-200">
        <CardHeader className="bg-white border-b border-slate-200">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-xl font-semibold text-slate-900">
                Inventario de Productos ({sortedProducts.length})
              </CardTitle>
              <Button
                onClick={() => {
                  setIsFormOpen(true);
                  setTimeout(() => {
                    document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Button>
            </div>

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
                  const stockStatus = getStockStatus(product.stock);
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
                          <h4 className="font-bold text-lg text-gray-900">{product.name}</h4>
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">{product.description || 'Sin descripción'}</p>

                          {/* Información organizada en filas */}
                          <div className="mt-3 space-y-2">
                            {/* Primera fila: Categorías */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-500 font-medium">Categoría:</span>
                                <span className="text-gray-900 font-semibold">
                                  {product.categoryName ||
                                    (product.category && product.category.length > 20 ? 'Categoría no encontrada' : product.category) ||
                                    'Sin categoría'}
                                </span>
                              </div>
                              {product.subcategoryName && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-500 font-medium">Subcategoría:</span>
                                    <span className="text-gray-900 font-semibold">{product.subcategoryName}</span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Segunda fila: Precio y Costo */}
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-green-600">${product.price.toLocaleString()}</span>
                                {product.cost && liberta === "si" && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <span>Costo:</span>
                                    <span className="font-medium text-amber-700">${Number(product.cost).toLocaleString()}</span>
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                                      {Math.round(((Number(product.price) - Number(product.cost)) / Number(product.price)) * 100)}% margen
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Tercera fila: Estado y Stock */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium",
                                stockStatus.text === "En Stock" ? "bg-green-100 text-green-800" :
                                  stockStatus.text === "Stock Bajo" ? "bg-yellow-100 text-yellow-800" :
                                    "bg-red-100 text-red-800"
                              )}>
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  stockStatus.text === "En Stock" ? "bg-green-500" :
                                    stockStatus.text === "Stock Bajo" ? "bg-yellow-500" :
                                      "bg-red-500"
                                )}></span>
                                {stockStatus.text}: {product.stock}
                              </div>

                              <div className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium",
                                product.isPublished !== false
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              )}>
                                <Eye className="h-3 w-3" />
                                {product.isPublished !== false ? "Publicado" : "No publicado"}
                              </div>

                              {product.lastModified && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-gray-600 bg-gray-50 border border-gray-200">
                                  <CustomClock className="h-3 w-3 opacity-70" />
                                  {new Date(product.lastModified.toDate?.() || product.lastModified).toLocaleDateString()}
                                </div>
                              )}
                            </div>
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
