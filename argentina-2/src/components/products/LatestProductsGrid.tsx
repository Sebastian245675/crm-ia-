import React, { useEffect, useState } from "react";
import { ProductCard } from "./ProductCard";
import { Product } from "@/contexts/CartContext";
// Mocks para evitar errores de compilación ya que Firebase fue removido
const collection = (...args: any[]) => ({}) as any;
const getDocs = (...args: any[]) => Promise.resolve({ docs: [] }) as any;
const query = (...args: any[]) => ({}) as any;
const orderBy = (...args: any[]) => ({}) as any;
const limit = (...args: any[]) => ({}) as any;
import { db } from "@/firebase";
import { useNavigate } from "react-router-dom";



interface LatestProductsGridProps {
  maxItems?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const LatestProductsGrid: React.FC<LatestProductsGridProps> = ({ maxItems = 4, sortBy = "createdAt", sortOrder = "desc" }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLatest = async () => {
      setLoading(true);
      let q;
      try {
        q = query(
          collection(db, "products"),
          orderBy(sortBy, sortOrder),
          limit(maxItems * 2) // Obtener más para compensar filtrado
        );
      } catch {
        q = query(collection(db, "products"), limit(maxItems * 2));
      }
      const snapshot = await getDocs(q);
      const allData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) })) as Product[];

      // Filtrar solo productos publicados y limitar al máximo deseado
      const publishedData = allData.filter(product => product.isPublished !== false).slice(0, maxItems);

      setProducts(publishedData);
      setLoading(false);
    };
    fetchLatest();
  }, [maxItems, sortBy, sortOrder]);

  return (
    <div className="w-full">
      {/* Grid de productos optimizado para móvil y desktop */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        {loading ? (
          // Esqueletos de carga más atractivos
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden shadow-lg bg-white">
              <div className="h-52 bg-slate-200 animate-pulse"></div>
              <div className="p-5">
                <div className="h-5 bg-slate-200 animate-pulse rounded-full w-3/4 mb-3"></div>
                <div className="h-4 bg-slate-200 animate-pulse rounded-full w-1/2 mb-4"></div>
                <div className="h-7 bg-slate-200 animate-pulse rounded-full w-1/3 mb-4"></div>
                <div className="flex gap-2 mt-6">
                  <div className="h-10 bg-slate-200 animate-pulse rounded-lg flex-1"></div>
                  <div className="h-10 bg-slate-200 animate-pulse rounded-lg flex-1"></div>
                </div>
              </div>
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl">
            <div className="w-16 h-16 mx-auto bg-slate-200 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-700">No hay productos nuevos</h3>
            <p className="text-slate-500 mt-2">Vuelve más tarde para ver nuevos productos</p>
          </div>
        ) : (
          products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>
    </div>
  );
};

export default LatestProductsGrid;
