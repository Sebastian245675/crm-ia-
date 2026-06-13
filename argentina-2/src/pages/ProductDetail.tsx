import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db } from '@/firebase';
import { AdvancedHeader } from '@/components/layout/AdvancedHeader';
import { TopPromoBar } from '@/components/layout/TopPromoBar';
import { Footer } from '@/components/layout/Footer';
import { FloatingActionButtons } from '@/components/layout/FloatingActionButtons';
import { useCategories } from '@/hooks/use-categories';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProductCard } from '@/components/products/ProductCard';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import { recordProductView } from '@/lib/product-analytics';
import { useAuth } from '@/contexts/AuthContext';

import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Star,
  Shield,
  Truck,
  Share2,
  ArrowLeft,
  MapPin,
  Mail,
  Loader2
} from 'lucide-react';

import { Product } from '@/contexts/CartContext';

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


// Carrusel de productos similares con estilo Mercado Libre
type SimilarProductsCarouselProps = {
  products: Product[];
  onViewDetails: (prod: Product) => void;
  onViewAll?: () => void;
};

const SimilarProductsCarousel = (props: SimilarProductsCarouselProps) => {
  const { products, onViewDetails, onViewAll } = props;
  const [start, setStart] = React.useState(0);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  // Ajuste responsivo para mostrar diferentes cantidades según el ancho
  const [maxVisible, setMaxVisible] = React.useState(5);

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1536) {
        setMaxVisible(6);
      } else if (width >= 1280) {
        setMaxVisible(5);
      } else if (width >= 1024) {
        setMaxVisible(4);
      } else if (width >= 768) {
        setMaxVisible(3);
      } else {
        setMaxVisible(2);
      }
    };

    handleResize(); // Inicializar
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const canPrev = start > 0;
  const canNext = start + maxVisible < products.length;

  const handlePrev = () => {
    if (canPrev) setStart(Math.max(0, start - maxVisible));
  };

  const handleNext = () => {
    if (canNext) setStart(Math.min(products.length - maxVisible, start + maxVisible));
  };

  return (
    <div className="relative w-full py-2">
      {/* Navegación */}
      <div className="flex items-center">
        {/* Botón anterior */}
        <button
          onClick={handlePrev}
          disabled={!canPrev}
          className={`absolute left-0 z-10 rounded-full w-10 h-10 flex items-center justify-center border border-gray-200 bg-white shadow-lg transition-all ${!canPrev ? 'opacity-0 cursor-default' : 'opacity-95 hover:opacity-100 hover:border-blue-300 hover:text-blue-500'
            }`}
          style={{ transform: 'translateX(-50%)' }}
          aria-label="Anterior"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Productos en el carrusel */}
        <div className="flex gap-4 overflow-hidden w-full mx-4">
          {products.slice(start, start + maxVisible).map((prod, index) => (
            <div
              key={prod.id}
              className="w-full flex-shrink-0 transition-all"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div
                onClick={() => onViewDetails(prod)}
                className={`bg-white rounded-lg overflow-hidden border ${hoveredIndex === index
                  ? 'border-blue-300 shadow-md'
                  : 'border-gray-200'
                  } cursor-pointer transition-all h-full flex flex-col`}
              >
                {/* Imagen del producto */}
                <div className="pt-2 px-2 bg-white flex items-center justify-center h-48 relative">
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="max-h-full max-w-full object-contain transition-transform duration-300"
                    style={{
                      transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)'
                    }}
                  />

                  {/* Badge de oferta */}
                  {prod.isOffer && prod.originalPrice && (
                    <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                      {Math.round((1 - (prod.price / prod.originalPrice)) * 100)}% OFF
                    </span>
                  )}
                </div>

                {/* Información del producto */}
                <div className="p-4 flex-1 flex flex-col border-t border-gray-100">
                  {/* Nombre del producto con clamp para 2 líneas */}
                  <h3 className="text-sm text-gray-700 line-clamp-2 mb-2 h-10">{prod.name}</h3>

                  {/* Precio y descuento */}
                  <div className="mt-auto">
                    <p className="text-lg font-semibold text-gray-900">${prod.price.toLocaleString()}</p>
                    {prod.isOffer && prod.originalPrice && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs line-through text-gray-500">${prod.originalPrice.toLocaleString()}</span>
                      </div>
                    )}

                    {/* Envío (simulado) */}
                    {prod.price > 100 && (
                      <p className="text-xs font-medium text-green-600 mt-1">Envío en compras +$70.000</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Botón siguiente */}
        <button
          onClick={handleNext}
          disabled={!canNext}
          className={`absolute right-0 z-10 rounded-full w-10 h-10 flex items-center justify-center border border-gray-200 bg-white shadow-lg transition-all ${!canNext ? 'opacity-0 cursor-default' : 'opacity-95 hover:opacity-100 hover:border-blue-300 hover:text-blue-500'
            }`}
          style={{ transform: 'translateX(50%)' }}
          aria-label="Siguiente"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Botón "Ver todos" */}
      {products.length > maxVisible && onViewAll && (
        <div className="flex justify-center mt-6">
          <button
            onClick={onViewAll}
            className="px-5 py-2 rounded-lg bg-white border border-blue-500 text-blue-600 font-medium hover:bg-blue-50 transition-colors flex items-center gap-2 text-sm"
          >
            Ver todos los productos similares
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};


// Permite URLs tipo /producto/:slug
const ProductDetailPage = () => {
  const { slug: urlSlug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewRecorded, setViewRecorded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeImageUrl, setActiveImageUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'descripcion' | 'especificaciones'>('descripcion');
  const [selectedColor, setSelectedColor] = useState<{ name: string, hexCode: string, image: string } | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [mostViewedProducts, setMostViewedProducts] = useState<Product[]>([]);
  const [loadingMostViewed, setLoadingMostViewed] = useState(true);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { categories, categoriesData, mainCategories, subcategoriesByParent, thirdLevelBySubcategory } = useCategories();
  const [selectedMililitros, setSelectedMililitros] = useState<'2.5' | '5' | '10'>('2.5');


  // Estados para sistema de reseñas
  const [reviews, setReviews] = useState<any[]>([]);
  const [userReview, setUserReview] = useState<any>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Agregar URL canónica para SEO y redirigir si el slug no coincide
  useEffect(() => {
    if (!product || !urlSlug) return;
    const canonicalSlug = slugify(product.name);
    const canonicalUrl = `${window.location.origin}/producto/${canonicalSlug}`;

    // Redirigir si el slug de la URL no coincide
    if (urlSlug !== canonicalSlug) {
      navigate(`/producto/${canonicalSlug}`, { replace: true });
      return;
    }

    // Eliminar cualquier enlace canónico existente
    const existingCanonical = document.querySelector('link[rel="canonical"]');
    if (existingCanonical) {
      existingCanonical.remove();
    }
    // Crear y agregar el nuevo enlace canónico
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = canonicalUrl;
    document.head.appendChild(link);
    // Limpiar al desmontar
    return () => {
      const canonicalToRemove = document.querySelector('link[rel="canonical"]');
      if (canonicalToRemove) {
        canonicalToRemove.remove();
      }
    };
  }, [product, urlSlug, navigate]);

  // Actualizar título de página para SEO cuando carga el producto
  useEffect(() => {
    if (product) {
      const productTitle = `${product.name} | OmniShop`;
      const productDescription = product.description || `${product.name} - Compra ahora en OmniShop. Envíos rápidos y envíos gratis.`;
      const productUrl = window.location.href;
      const productImage = product.image || (product.additionalImages && product.additionalImages[0]) || '/logo-nuevo.png';

      document.title = productTitle;

      // Función helper para actualizar o crear meta tags
      const setMetaTag = (name: string, content: string, isProperty = false) => {
        const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
        let meta = document.querySelector(selector) as HTMLMetaElement;

        if (!meta) {
          meta = document.createElement('meta');
          if (isProperty) {
            meta.setAttribute('property', name);
          } else {
            meta.setAttribute('name', name);
          }
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      // Meta tags básicos
      setMetaTag('description', productDescription);
      setMetaTag('keywords', `${product.name}, ${product.category || ''}, OmniShop, compra online, Argentina`);

      // Open Graph para productos
      setMetaTag('og:title', productTitle, true);
      setMetaTag('og:description', productDescription, true);
      setMetaTag('og:type', 'product', true);
      setMetaTag('og:url', productUrl, true);
      setMetaTag('og:image', productImage, true);
      setMetaTag('og:image:width', '1200', true);
      setMetaTag('og:image:height', '630', true);

      // Twitter Card
      setMetaTag('twitter:card', 'summary_large_image');
      setMetaTag('twitter:title', productTitle);
      setMetaTag('twitter:description', productDescription);
      setMetaTag('twitter:image', productImage);

      // Schema.org para producto
      const existingProductSchema = document.querySelector('script[type="application/ld+json"][data-product-schema]');
      if (existingProductSchema) {
        existingProductSchema.remove();
      }

      const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: productDescription,
        image: [product.image, ...(product.additionalImages || [])].filter(Boolean),
        brand: {
          '@type': 'Brand',
          name: 'OmniShop'
        },
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: 'ARS',
          availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: productUrl,
          ...(product.id && { sku: product.id })
        },
        ...(product.category && { category: product.category })
      };

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-product-schema', 'true');
      script.text = JSON.stringify(productSchema);
      document.head.appendChild(script);
    } else {
      document.title = 'Producto | OmniShop';
    }
  }, [product]);

  // Mapear fila de Supabase al tipo Product
  const mapSupabaseProduct = (row: any): Product => {
    const categoryId = row.category_id ?? row.category ?? '';
    const subcategoryId = row.subcategory ?? '';
    const terceraCategoriaId = row.tercera_categoria ?? '';

    // Buscar nombres de categorías desde el hook useCategories
    const categoryObj = categoriesData.find(cat => cat.id === categoryId);
    const subcategoryObj = categoriesData.find(cat => cat.id === subcategoryId);
    const terceraCategoriaObj = categoriesData.find(cat => cat.id === terceraCategoriaId);

    // Parsear decant_options de la base de datos
    let parsedDecantOptions: Product['decantOptions'] = undefined;
    if (row.decant_options) {
      try {
        const raw = typeof row.decant_options === 'string' ? JSON.parse(row.decant_options) : row.decant_options;
        parsedDecantOptions = {
          '2.5': { enabled: !!raw?.['2.5']?.enabled, price: Number(raw?.['2.5']?.price ?? 0) },
          '5': { enabled: !!raw?.['5']?.enabled, price: Number(raw?.['5']?.price ?? 0) },
          '10': { enabled: !!raw?.['10']?.enabled, price: Number(raw?.['10']?.price ?? 0) },
        };
      } catch (e) {
        console.warn('[mapSupabaseProduct] Error parsing decant_options:', e);
      }
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      price: Number(row.price ?? 0),
      image: row.image ?? '',
      additionalImages: (() => {
        const v = row.additional_images;
        if (Array.isArray(v)) return v.filter(Boolean);
        if (typeof v === 'string') {
          if (!v || v === '{}') return [];
          if (v.startsWith('{') && v.endsWith('}')) {
            return v.slice(1, -1).split(',').map(s => String(s).trim().replace(/^"|"$/g, '')).filter(Boolean);
          }
          return v ? [v] : [];
        }
        return [];
      })(),
      specifications: row.specifications,
      category: categoryId,
      categoryName: categoryObj?.name || row.category_name || row.categoryName || (categoryId && categoryId.length > 20 ? 'Categoría no encontrada' : categoryId),
      subcategory: subcategoryId,
      subcategoryName: subcategoryObj?.name || row.subcategory_name || row.subcategoryName || (subcategoryId && subcategoryId.length > 20 ? null : subcategoryId),
      terceraCategoria: terceraCategoriaId,
      terceraCategoriaName: terceraCategoriaObj?.name || row.tercera_categoria_name || row.terceraCategoriaName || null,
      stock: Number(row.stock ?? 0),
      isOffer: row.is_offer,
      discount: row.discount,
      originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
      benefits: row.benefits,
      warranties: row.warranties,
      paymentMethods: row.payment_methods,
      colors: row.colors,
      isPublished: row.is_published !== false,
      isDecant: row.is_decant === true,
      decantOptions: parsedDecantOptions,
    };
  };

  // Cargar datos del producto por slug (Supabase)
  useEffect(() => {
    const fetchProduct = async () => {
      if (!urlSlug) return;
      setLoading(true);
      setImageLoading(true);
      window.scrollTo(0, 0);
      setQuantity(1);
      const isSupabase = typeof (db as any)?.from === 'function';
      try {
        if (isSupabase) {
          // Buscar producto por slug del nombre
          // Obtener todos los productos publicados y filtrar por slug
          const { data: allProducts, error } = await db
            .from('products')
            .select('*')
            .eq('is_published', true)
            .order('updated_at', { ascending: false });

          if (error) throw error;

          // Buscar producto cuyo nombre normalizado coincida con el slug
          const matchingProduct = allProducts?.find((p: any) => {
            const productSlug = slugify(p.name || '');
            return productSlug === urlSlug;
          });

          if (matchingProduct) {
            const productData = mapSupabaseProduct(matchingProduct);
            setProduct(productData);
            setActiveImageUrl(productData.image);
            setActiveImageIndex(0);
            if (productData.colors && productData.colors.length > 0) {
              setSelectedColor(productData.colors[0]);
            }
            if (!viewRecorded) {
              console.log('[ProductDetail] 🛍️ ========================================');
              console.log('[ProductDetail] 🛍️ INICIANDO REGISTRO DE VISTA DE PRODUCTO');
              console.log('[ProductDetail] 🛍️ ========================================');
              console.log('[ProductDetail] 📦 Producto ID:', productData.id);
              console.log('[ProductDetail] 📦 Nombre:', productData.name);
              console.log('[ProductDetail] 👤 Usuario:', {
                id: user?.id || 'Anónimo',
                email: user?.email || 'N/A',
                name: user?.name || 'N/A'
              });
              console.log('[ProductDetail] 📄 URL:', window.location.href);
              try {
                const result = await recordProductView(
                  productData.id,
                  productData.name,
                  user?.id,
                  user?.email,
                  user?.name
                );
                if (result) {
                  console.log('[ProductDetail] ✅ ========================================');
                  console.log('[ProductDetail] ✅ VISTA DE PRODUCTO REGISTRADA EXITOSAMENTE');
                  console.log('[ProductDetail] ✅ ========================================');
                } else {
                  console.warn('[ProductDetail] ⚠️ La función retornó false - revisa los logs anteriores');
                }
              } catch (error: any) {
                console.error('[ProductDetail] ❌ ========================================');
                console.error('[ProductDetail] ❌ ERROR AL REGISTRAR VISTA');
                console.error('[ProductDetail] ❌ ========================================');
                console.error('[ProductDetail] ❌ Error:', error?.message || error);
                console.error('[ProductDetail] ❌ Stack:', error?.stack);
              }
              setViewRecorded(true);
            }
            // Productos similares por categoría (Supabase)
            try {
              let similarItems: Product[] = [];
              if (productData.category) {
                const { data: similarData } = await db
                  .from('products')
                  .select('*')
                  .eq('category', productData.category)
                  .eq('is_published', true)
                  .neq('id', productData.id)
                  .limit(30);
                similarItems = (similarData || []).map(mapSupabaseProduct).slice(0, 8);
              }
              setSimilarProducts(similarItems);
            } catch (err) {
              console.error("Error al cargar productos similares:", err);
              const { data: fallbackData } = await db.from('products').select('*').eq('is_published', true).limit(10);
              const fallbackItems = (fallbackData || []).map(mapSupabaseProduct).slice(0, 4);
              setSimilarProducts(fallbackItems);
            }
          } else {
            toast({ title: "Producto no encontrado", description: "El producto que buscas no existe o ha sido eliminado", variant: "destructive" });
            navigate('/');
          }
        } else {
          setError("Configuración de base de datos no disponible.");
        }
      } catch (error) {
        console.error("Error al cargar el producto:", error);
        setError("No se pudo cargar el producto. Por favor, inténtalo de nuevo más tarde.");
        toast({ title: "Error", description: "No se pudo cargar el producto", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [urlSlug, user?.id, viewRecorded, navigate]);

  // Cargar productos más vistos (Supabase)
  useEffect(() => {
    const fetchMostViewedProducts = async () => {
      setLoadingMostViewed(true);
      try {
        const { getMostViewedProducts } = await import('@/lib/product-analytics');
        const productAnalytics = await getMostViewedProducts(8);
        const isSupabase = typeof (db as any)?.from === 'function';
        if (!isSupabase || !productAnalytics.length) {
          setMostViewedProducts([]);
          return;
        }
        const productsPromises = productAnalytics.map(async (item) => {
          try {
            const { data } = await db.from('products').select('*').eq('id', item.id).maybeSingle();
            return data ? mapSupabaseProduct(data) : null;
          } catch (err) {
            console.error(`Error al obtener producto ${item.id}:`, err);
            return null;
          }
        });
        const products = (await Promise.all(productsPromises)).filter(Boolean) as Product[];
        setMostViewedProducts(products.filter(p => p.id !== product?.id).slice(0, 6));
      } catch (error) {
        console.error("Error al cargar productos más vistos:", error);
        setMostViewedProducts([]);
      } finally {
        setLoadingMostViewed(false);
      }
    };
    fetchMostViewedProducts();
  }, [product?.id]);

  // Cargar reseñas del producto
  useEffect(() => {
    const fetchReviews = async () => {
      if (!product?.id) return;

      try {
        const { data, error } = await db
          .from('product_reviews')
          .select('*')
          .eq('product_id', product.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const reviewsList = (data || []).map((review: any) => ({
          id: review.id,
          productId: review.product_id,
          userId: review.user_id,
          userName: review.user_name,
          rating: review.rating,
          comment: review.comment,
          createdAt: new Date(review.created_at),
        }));

        setReviews(reviewsList);

        // Verificar si el usuario ya tiene una reseña
        if (user) {
          const existingReview = reviewsList.find((r: any) => r.userId === user.id);
          setUserReview(existingReview || null);
        }
      } catch (error) {
        console.error('Error al cargar reseñas:', error);
      }
    };

    fetchReviews();
  }, [product?.id, user]);

  // Función para enviar reseña
  const handleSubmitReview = async () => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para dejar una reseña",
        variant: "destructive",
      });
      return;
    }

    if (reviewComment.trim().length < 10) {
      toast({
        title: "Comentario muy corto",
        description: "Por favor escribe al menos 10 caracteres",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingReview(true);

      const { error } = await db
        .from('product_reviews')
        .insert({
          product_id: product?.id,
          user_id: user.id,
          user_name: user.name || 'Usuario',
          user_email: user.email,
          rating: reviewRating,
          comment: reviewComment.trim(),
        });

      if (error) throw error;

      toast({
        title: "¡Reseña publicada!",
        description: "Gracias por compartir tu opinión",
      });

      setShowReviewForm(false);
      setReviewComment('');
      setReviewRating(5);

      // Recargar reseñas
      const { data } = await db
        .from('product_reviews')
        .select('*')
        .eq('product_id', product?.id)
        .order('created_at', { ascending: false });

      const reviewsList = (data || []).map((review: any) => ({
        id: review.id,
        productId: review.product_id,
        userId: review.user_id,
        userName: review.user_name,
        rating: review.rating,
        comment: review.comment,
        createdAt: new Date(review.created_at),
      }));

      setReviews(reviewsList);

      const existingReview = reviewsList.find((r: any) => r.userId === user.id);
      setUserReview(existingReview || null);
    } catch (error) {
      console.error('Error al guardar reseña:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar tu reseña. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  // Calcular promedio de calificación
  const calculateAverageRating = () => {
    if (reviews.length === 0) return "0";
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  // Detectar si el producto es un Decant:
  // 1. Campo is_decant de la BD
  // 2. Nombre empieza con "D " (convención de nomenclatura de la tienda)
  // 3. Nombre contiene "Decant" (fallback)
  const isDecant = React.useMemo(() => {
    if (!product) return false;
    if (product.isDecant === true) return true;
    const name = (product.name || '').trim();
    if (name.startsWith('D ')) return true;
    if (/decant/i.test(name)) return true;
    const cat = (product.categoryName || product.category || '').toLowerCase();
    if (cat.includes('decant')) return true;
    return false;
  }, [product]);

  // Obtener las variantes de ml habilitadas para decants
  const enabledMlOptions = React.useMemo((): ('2.5' | '5' | '10')[] => {
    if (!isDecant) return [];
    // Si hay decantOptions configuradas en la BD, usar solo las habilitadas
    if (product?.decantOptions) {
      const opts = (['2.5', '5', '10'] as const).filter(ml => product.decantOptions?.[ml]?.enabled);
      if (opts.length > 0) return opts;
    }
    // Fallback: si es decant pero no tiene opciones configuradas explícitamente, mostrar solo 5ml por defecto
    return ['5'];
  }, [isDecant, product]);

  // Calcular precio actual según si es decant y el ml seleccionado
  const currentPrice = React.useMemo(() => {
    if (!product) return 0;
    if (isDecant && product.decantOptions) {
      const opt = product.decantOptions[selectedMililitros];
      if (opt?.enabled && opt.price > 0) return opt.price;
    }
    return product.price;
  }, [product, selectedMililitros, isDecant]);

  // Auto-seleccionar el primer ml habilitado al cargar un decant
  React.useEffect(() => {
    if (isDecant && enabledMlOptions.length > 0 && !enabledMlOptions.includes(selectedMililitros)) {
      setSelectedMililitros(enabledMlOptions[0]);
    }
  }, [product?.id, enabledMlOptions, isDecant]);

  // Manejadores
  const handleAddToCart = () => {
    if (product) {
      // Para decants, crear un producto con el precio correcto del ml seleccionado
      const productToAdd = isDecant
        ? { ...product, price: currentPrice }
        : product;

      // Para decants, pasar el ml seleccionado para identificación única en el carrito
      const mlForCart = isDecant ? selectedMililitros : undefined;
      addToCart(productToAdd, quantity, selectedColor || undefined, mlForCart);

      const colorInfo = selectedColor ? ` (color: ${selectedColor.name})` : '';
      const mlInfo = isDecant ? ` (${selectedMililitros === '2.5' ? 'Chico' : selectedMililitros === '5' ? 'Mediano' : 'Grande'})` : '';
      toast({
        title: "¡Producto agregado!",
        description: `${quantity}x ${product.name}${mlInfo}${colorInfo} agregado a tu carrito`,
      });
    }
  };

  // Navegación avanzada con slug
  const goToProduct = (prod: Product) => {
    const slug = slugify(prod.name);
    navigate(`/producto/${slug}`);
  };

  const incrementQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name || 'Producto OmniShop',
        text: product?.description || 'Mira este producto',
        url: window.location.href
      })
        .catch(error => console.log('Error al compartir', error));
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Enlace copiado",
        description: "El enlace al producto ha sido copiado al portapapeles",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        {/* TopPromoBar eliminada de esta vista */}
        <AdvancedHeader
          selectedCategory=""
          setSelectedCategory={(cat) => navigate('/categoria/' + encodeURIComponent(cat))}
          categories={categories}
          mainCategories={mainCategories}
          subcategoriesByParent={subcategoriesByParent}
          thirdLevelBySubcategory={thirdLevelBySubcategory}
        />
        <div className="container mx-auto px-4 pt-32 pb-16 md:pt-40 md:pb-24 flex items-center justify-center min-h-[70vh]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <h2 className="text-xl font-semibold mb-2 text-gray-700">Cargando producto</h2>
            <p className="text-gray-500">Estamos obteniendo toda la información para ti...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        {/* TopPromoBar eliminada de esta vista */}
        <AdvancedHeader
          selectedCategory=""
          setSelectedCategory={(cat) => navigate('/categoria/' + encodeURIComponent(cat))}
          categories={categories}
          mainCategories={mainCategories}
          subcategoriesByParent={subcategoriesByParent}
          thirdLevelBySubcategory={thirdLevelBySubcategory}
        />
        <div className="container mx-auto px-4 pt-32 pb-16 md:pt-40 md:pb-24 flex items-center justify-center min-h-[70vh]">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
            <h2 className="text-xl font-semibold text-red-600 mb-4">Error al cargar el producto</h2>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Volver a la tienda
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col min-h-screen">
        {/* TopPromoBar eliminada de esta vista */}
        <AdvancedHeader
          selectedCategory=""
          setSelectedCategory={(cat) => navigate('/categoria/' + encodeURIComponent(cat))}
          categories={categories}
          mainCategories={mainCategories}
          subcategoriesByParent={subcategoriesByParent}
          thirdLevelBySubcategory={thirdLevelBySubcategory}
        />
        <div className="container mx-auto px-4 py-28 md:py-32 text-center min-h-[70vh] flex flex-col items-center justify-center">
          <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md border border-gray-100">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4">Producto no encontrado</h1>
            <p className="mb-6 text-gray-600">El producto que estás buscando no existe o ha sido eliminado.</p>
            <Button onClick={() => navigate('/')} className="bg-orange-600 hover:bg-orange-700">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la tienda
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <FloatingActionButtons />
      {/* TopPromoBar eliminada de esta vista */}
      <AdvancedHeader
        selectedCategory={product?.category || ""}
        setSelectedCategory={(cat) => navigate('/categoria/' + encodeURIComponent(cat))}
        categories={categories}
        mainCategories={mainCategories}
        subcategoriesByParent={subcategoriesByParent}
        thirdLevelBySubcategory={thirdLevelBySubcategory}
      />

      <main className="w-full bg-white px-0 sm:px-4 pt-6 pb-16 md:pt-8 md:pb-24">
        {/* Breadcrumbs - estilo Esenzzia (Inicio > Categoría > Producto) */}
        <div className="max-w-6xl mx-auto px-4 mb-3">
          <nav className="flex flex-wrap items-center text-sm text-neutral-500">
            <button type="button" onClick={() => navigate('/')} className="hover:text-black transition-colors">Inicio</button>
            {(() => {
              // Obtener nombre de categoría desde el hook o desde el producto
              const categoryName = product.categoryName ||
                (product.category && categoriesData.find(cat => cat.id === product.category)?.name) ||
                (product.category && product.category.length > 20 ? 'Categoría' : product.category) ||
                '';
              const subcategoryName = product.subcategoryName ||
                (product.subcategory && categoriesData.find(cat => cat.id === product.subcategory)?.name) ||
                (product.subcategory && product.subcategory.length > 20 ? null : product.subcategory) ||
                null;

              return (
                <>
                  {categoryName && (
                    <>
                      <span className="mx-2">/</span>
                      <button
                        type="button"
                        onClick={() => navigate('/categoria/' + encodeURIComponent(product.category || ''))}
                        className="hover:text-black transition-colors"
                      >
                        {categoryName}
                      </button>
                    </>
                  )}
                  {subcategoryName && (
                    <>
                      <span className="mx-2">/</span>
                      <span className="text-neutral-600">{subcategoryName}</span>
                    </>
                  )}
                  <span className="mx-2">/</span>
                  <span className="text-black font-medium truncate">{product.name}</span>
                </>
              );
            })()}
          </nav>
        </div>

        {/* Dos columnas: imagen + pasar de imagen + Decant | datos + compra */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12 px-4">
          {/* Columna izquierda: imagen + controles para pasar de imagen (flechas) + Decant */}
          <div className="flex flex-col">
            <div className="relative bg-white flex flex-col items-center">
              <div className="relative w-full flex justify-center">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80">
                    <Loader2 className="h-12 w-12 text-black animate-spin" />
                  </div>
                )}
                <img
                  src={activeImageUrl || product.image}
                  alt={product.name}
                  width="500"
                  height="500"
                  className={`max-h-[380px] w-auto object-contain ${imageLoading ? 'opacity-50' : ''}`}
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                />
              </div>
              {/* Cuadritos debajo de la imagen principal — siempre visibles para cambiar de imagen */}
              {(() => {
                const extra = Array.isArray(product.additionalImages) ? product.additionalImages.filter(Boolean) : [];
                const allImages = [product.image, ...extra].filter(Boolean);
                if (allImages.length === 0) return null;
                return (
                  <div className="flex justify-center gap-2 mt-4 flex-wrap" aria-label="Imágenes del producto">
                    {allImages.map((url, i) => (
                      <button
                        key={`${i}-${url.slice(-20)}`}
                        type="button"
                        onClick={() => {
                          setActiveImageIndex(i);
                          setActiveImageUrl(url);
                        }}
                        className={`w-14 h-14 rounded border-2 flex-shrink-0 overflow-hidden bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 transition-all ${activeImageIndex === i ? 'border-black ring-1 ring-black' : 'border-neutral-200 hover:border-neutral-400'}`}
                        aria-pressed={activeImageIndex === i}
                        aria-label={`Ver imagen ${i + 1}`}
                      >
                        <img src={url} alt="" width="56" height="56" className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                );
              })()}
              {/* Bloque "Fraccionado" — solo visible para productos fraccionados/variantes */}
              {isDecant && enabledMlOptions.length > 0 && (
              <div className="mt-6 w-full">
                <p className="text-2xl font-bold text-black tracking-tight mb-2">Medidas Disponibles</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <svg className="flex-shrink-0 w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M19 14L5 14M19 14L13 8M19 14L13 20" />
                  </svg>
                  <div className="flex gap-2">
                    {enabledMlOptions.map((ml) => (
                      <button
                        key={ml}
                        type="button"
                        onClick={() => setSelectedMililitros(ml)}
                        className={`inline-flex items-center justify-center min-w-[3rem] px-3 py-1.5 rounded border text-sm font-medium transition-colors ${selectedMililitros === ml ? 'bg-black text-white border-black' : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'}`}
                      >
                        {ml === '2.5' ? 'Chico' : ml === '5' ? 'Mediano' : 'Grande'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>

          {/* Columna derecha: título, precio, formas de pago, ml, cantidad, CTA, envío */}
          <div className="flex flex-col">
            <h1 className="text-3xl md:text-4xl font-bold text-black mb-1">{product.name}</h1>
            <div className="text-4xl md:text-5xl font-bold text-black mb-2">${currentPrice.toLocaleString('es-AR')}</div>

            {/* Precio sin impuestos — solo para sellados */}
            {!isDecant && (
              <p className="text-sm text-neutral-500 mb-3">Precio sin impuestos ${(currentPrice / 1.21).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
            )}

            {/* Cuotas — solo para sellados */}
            {!isDecant && (
              <p className="text-sm text-neutral-700 mb-4">6 x ${(currentPrice / 6).toLocaleString('es-AR', { maximumFractionDigits: 0 })} sin interés con tarjeta de crédito</p>
            )}

            <p className="text-sm text-neutral-600 mb-6">Envío gratis superando los $150.000</p>

            {/* Selector Medida — solo para productos fraccionados/variantes */}
            {isDecant && enabledMlOptions.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-black mb-2">Tamaño / Medida: <strong>{selectedMililitros === '2.5' ? 'Chico' : selectedMililitros === '5' ? 'Mediano' : 'Grande'}</strong></p>
              <div className="flex gap-2">
                {enabledMlOptions.map((ml) => (
                  <button
                    key={ml}
                    type="button"
                    onClick={() => setSelectedMililitros(ml)}
                    className={`px-4 py-2 rounded border text-sm font-medium transition-colors ${selectedMililitros === ml ? 'bg-black text-white border-black' : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'}`}
                  >
                    {ml === '2.5' ? 'Chico' : ml === '5' ? 'Mediano' : 'Grande'}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Cantidad [- 1 +] */}
            <div className="flex items-center border border-neutral-300 rounded overflow-hidden w-fit mb-4">
              <button
                type="button"
                onClick={decrementQuantity}
                disabled={quantity <= 1 || product.stock === 0}
                className="h-11 w-11 flex items-center justify-center bg-white hover:bg-neutral-50 disabled:opacity-50 border-r border-neutral-300"
                aria-label="Disminuir cantidad"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="h-11 min-w-[3rem] flex items-center justify-center bg-white border-r border-neutral-300 font-medium">{quantity}</div>
              <button
                type="button"
                onClick={incrementQuantity}
                disabled={quantity >= product.stock || product.stock === 0}
                className="h-11 w-11 flex items-center justify-center bg-white hover:bg-neutral-50 disabled:opacity-50"
                aria-label="Aumentar cantidad"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* AGREGAR AL CARRITO */}
            <Button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="w-full bg-black hover:bg-neutral-800 text-white py-6 rounded-none font-bold uppercase tracking-wider text-sm mb-6"
            >
              {product.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
            </Button>


          </div>
        </div>

        {/* Zona de descripción y detalles: ancho completo bajo el producto, tipo tablas */}
        <section className="w-full px-4 sm:px-6 lg:px-8 mt-12 mb-12 border-t border-neutral-200 pt-10">
          <div className="w-full max-w-6xl mx-auto">
            {/* Tabs Descripción / Especificaciones — ancho completo */}
            <div className="w-full">
              <div className="flex border-b border-neutral-200 mb-6">
                <button
                  onClick={() => setActiveTab('descripcion')}
                  className={`pb-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'descripcion' ? 'border-black text-black' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
                >
                  Descripción
                </button>
                <button
                  onClick={() => setActiveTab('especificaciones')}
                  className={`pb-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'especificaciones' ? 'border-black text-black' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
                >
                  Especificaciones
                </button>
              </div>
              <div className="w-full text-neutral-700 text-sm leading-relaxed">
                {activeTab === 'descripcion' ? (
                  <table className="w-full border border-neutral-200 rounded-lg overflow-hidden text-left">
                    <tbody>
                      <tr className="bg-neutral-50 border-b border-neutral-200">
                        <th scope="row" className="py-3 px-4 font-semibold text-neutral-900 align-top w-40 sm:w-48 border-r border-neutral-200">Descripción</th>
                        <td className="py-3 px-4">
                          <p className="whitespace-pre-wrap">{product.description || 'Sin descripción.'}</p>
                          <div className="mt-4 p-4 bg-neutral-50 border-l-2 border-black rounded-r">
                            <p className="text-xs font-semibold uppercase tracking-wide text-black mb-1">Garantía de Satisfacción</p>
                            <p className="italic text-neutral-600">Todos nuestros productos cuentan con garantía oficial y soporte post-venta.</p>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="w-full overflow-x-auto">
                    {product.specifications && product.specifications.length > 0 ? (
                      <table className="w-full border border-neutral-200 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-neutral-100 border-b border-neutral-200">
                            <th className="py-3 px-4 text-left font-semibold text-neutral-900 w-1/3">Característica</th>
                            <th className="py-3 px-4 text-left font-semibold text-neutral-900">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                          {product.specifications.map((spec, index) => (
                            <tr key={index} className="bg-white hover:bg-neutral-50/50">
                              <td className="py-3 px-4 font-medium text-neutral-900 align-top border-r border-neutral-100">{spec.name}</td>
                              <td className="py-3 px-4 text-neutral-600">{spec.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-neutral-500 italic py-4">No hay especificaciones adicionales.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Beneficios y garantías — tabla ancho completo */}
            <div className="w-full mt-8 border border-neutral-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th scope="col" className="py-3 px-4 text-left font-semibold text-base">
                      <span className="inline-flex items-center gap-2">
                        <Shield className="h-4 w-4 text-neutral-600" />
                        Beneficios y Garantías
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-0 align-top">
                      <div className="p-4 sm:p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                          {product.benefits && product.benefits.length > 0 ? (
                            product.benefits.map((benefit, index) => (
                              <div key={`benefit-${index}`} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-neutral-100">
                                <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                  </svg>
                                </div>
                                <span className="font-medium text-sm">{benefit}</span>
                              </div>
                            ))
                          ) : (
                            <>
                              <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-neutral-100">
                                <Shield className="h-5 w-5 text-green-600 flex-shrink-0" />
                                <div>
                                  <span className="font-medium text-sm block">Garantía de calidad</span>
                                  <span className="text-xs text-neutral-500">Satisfacción garantizada</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-neutral-100">
                                <Truck className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                <div>
                                  <span className="font-medium text-sm block">Envío</span>
                                  <span className="text-xs text-neutral-500">En compras mayores a $70.000</span>
                                </div>
                              </div>
                            </>
                          )}
                          {product.warranties && product.warranties.length > 0 ? (
                            product.warranties.map((warranty, index) => (
                              <div key={`warranty-${index}`} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-neutral-100">
                                <div className="bg-emerald-100 p-2 rounded-full flex-shrink-0">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                  </svg>
                                </div>
                                <span className="font-medium text-sm">{warranty}</span>
                              </div>
                            ))
                          ) : (
                            !(product.benefits && product.benefits.length > 0) && (
                              <>
                                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-neutral-100">
                                  <Star className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                                  <div>
                                    <span className="font-medium text-sm block">Producto premium</span>
                                    <span className="text-xs text-neutral-500">Calidad garantizada</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-neutral-100">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-600 flex-shrink-0">
                                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                  </svg>
                                  <div>
                                    <span className="font-medium text-sm block">Retiro en tienda</span>
                                    <span className="text-xs text-neutral-500">En nuestras sucursales</span>
                                  </div>
                                </div>
                              </>
                            )
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Selector de color — tabla ancho completo, solo si aplica */}
            {product.colors && product.colors.length > 0 && (
              <div className="w-full mt-8 border border-neutral-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <tbody>
                    <tr className="bg-white border-b border-neutral-200">
                      <th scope="row" className="py-3 px-4 font-semibold text-neutral-900 align-top w-40 sm:w-48 border-r border-neutral-200 bg-neutral-50 text-left">Color</th>
                      <td className="py-3 px-4">
                        <p className="font-medium text-sm mb-3"><span className="text-orange-600">{selectedColor?.name || 'Selecciona un color'}</span></p>
                        <div className="flex flex-wrap gap-3">
                          {product.colors.map((color, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                setSelectedColor(color);
                                if (color.image) {
                                  setActiveImageUrl(color.image);
                                  if (color.image === product.image) setActiveImageIndex(0);
                                  else if (product.additionalImages) {
                                    const i = product.additionalImages.findIndex(img => img === color.image);
                                    if (i !== -1) setActiveImageIndex(i + 1);
                                  }
                                }
                              }}
                              className={`relative p-1 rounded-full transition-all ${selectedColor?.name === color.name ? 'ring-2 ring-offset-2 ring-orange-500 scale-110' : 'hover:ring-1 hover:ring-orange-200'}`}
                              aria-label={`Seleccionar color ${color.name}`}
                              title={color.name}
                            >
                              <span className="block w-8 h-8 rounded-full border border-neutral-300" style={{ backgroundColor: color.hexCode }} />
                              {selectedColor?.name === color.name && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={color.hexCode?.toLowerCase() === '#ffffff' ? 'text-black' : 'text-white'}>
                                    <path d="M20 6L9 17l-5-5" />
                                  </svg>
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                        {selectedColor?.image && (
                          <div className="mt-4 flex items-center gap-3">
                            <div className="w-14 h-14 rounded-lg overflow-hidden border border-neutral-200 flex-shrink-0">
                              <img src={selectedColor.image} alt={String(selectedColor.name)} width="56" height="56" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-sm text-neutral-600">Vista: <strong>{selectedColor.name}</strong></span>
                          </div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Google Reseñas - estilo Esenzzia */}
        <section className="max-w-6xl mx-auto px-4 my-12">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-black">Reseñas</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-lg font-semibold text-black">{calculateAverageRating()}</span>
              <div className="flex text-amber-500">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={`h-5 w-5 ${i <= Math.round(Number(calculateAverageRating())) ? 'fill-current' : ''}`} />
                ))}
              </div>
              <span className="text-sm text-neutral-500">{reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'}</span>
              {user && !userReview && (
                <Button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="bg-black hover:bg-neutral-800 text-white rounded-none font-medium"
                >
                  {showReviewForm ? 'Cancelar' : 'Escribe una reseña'}
                </Button>
              )}
              {!user && (
                <Button
                  onClick={() => {
                    toast({
                      title: "Inicia sesión",
                      description: "Debes iniciar sesión para dejar una reseña",
                    });
                  }}
                  className="bg-black hover:bg-neutral-800 text-white rounded-none font-medium"
                >
                  Escribe una reseña
                </Button>
              )}
            </div>
          </div>

          {/* Formulario de reseña */}
          {showReviewForm && user && !userReview && (
            <div className="mb-6 p-6 bg-white border border-neutral-200 rounded-lg shadow-sm">
              <h3 className="font-bold text-lg mb-4">Comparte tu opinión</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Calificación</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-8 w-8 cursor-pointer transition-colors ${star <= reviewRating ? 'fill-amber-500 text-amber-500' : 'text-gray-300'
                          }`}
                        onClick={() => setReviewRating(star)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tu opinión (mínimo 10 caracteres)</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Cuéntanos tu experiencia con este producto..."
                    rows={4}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <p className="text-sm text-neutral-500 mt-1">{reviewComment.length} caracteres</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmitReview}
                    disabled={submittingReview || reviewComment.trim().length < 10}
                    className="bg-black hover:bg-neutral-800 text-white rounded-none"
                  >
                    {submittingReview ? 'Publicando...' : 'Publicar reseña'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowReviewForm(false);
                      setReviewComment('');
                      setReviewRating(5);
                    }}
                    variant="outline"
                    className="rounded-none"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de reseñas */}
          {reviews.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
              {reviews.map((review) => (
                <div key={review.id} className="flex-shrink-0 w-72 snap-center bg-white border border-neutral-200 rounded-lg shadow-sm p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-sm font-bold text-white">
                      {review.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-black text-sm">{review.userName}</p>
                      <p className="text-xs text-neutral-500">
                        {review.createdAt.toLocaleDateString('es-ES', { month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex text-amber-500 mb-2">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <Star key={j} className={`h-4 w-4 ${j <= review.rating ? 'fill-current' : ''}`} />
                    ))}
                  </div>
                  <p className="text-sm text-neutral-700 line-clamp-3">
                    {review.comment}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-neutral-50 rounded-lg">
              <Star className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-neutral-600 mb-2">
                Aún no hay reseñas
              </p>
              <p className="text-neutral-500">
                Sé el primero en compartir tu experiencia con este producto
              </p>
            </div>
          )}
        </section>

        {/* Productos relacionados - estilo Esenzzia */}
        <section className="max-w-6xl mx-auto px-4 my-12">
          <h2 className="text-2xl font-bold text-black mb-6">Productos relacionados</h2>
          <div className="relative flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
            {(similarProducts?.length ? similarProducts : []).slice(0, 6).map((p) => {
              const pIsDecant = p.isDecant === true || (p.name || '').trim().startsWith('D ') || /decant/i.test(p.name || '') || (p.categoryName || p.category || '').toLowerCase().includes('decant');
              return (
              <div
                key={p.id}
                className="flex-shrink-0 w-64 snap-center bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => goToProduct(p)}
              >
                {pIsDecant && (
                  <p className="text-center text-xs font-medium text-neutral-600 py-2 border-b border-neutral-100">Fraccionado</p>
                )}
                <div className="p-4 flex justify-center h-40">
                  <img src={p.image} alt={p.name} width="160" height="160" className="max-h-full w-auto object-contain" />
                </div>
                <div className="p-4 border-t border-neutral-100">
                  <p className="font-medium text-black text-sm line-clamp-2 mb-2">{p.name}</p>
                  <p className="text-xl font-bold text-black mb-1">${p.price.toLocaleString('es-AR')}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-neutral-700 hover:bg-neutral-800 text-white rounded-none text-xs"
                      onClick={(e) => { e.stopPropagation(); addToCart(p, 1); toast({ title: 'Agregado', description: `${p.name} agregado al carrito` }); }}
                    >
                      Comprar
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 rounded-none text-xs border-neutral-300" onClick={(e) => { e.stopPropagation(); goToProduct(p); }}>
                      Ver
                    </Button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
