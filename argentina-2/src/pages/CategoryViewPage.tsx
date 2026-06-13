import React, { useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { TopPromoBar } from "@/components/layout/TopPromoBar";
import { AdvancedHeader } from "@/components/layout/AdvancedHeader";
import { CategoryBanner } from "@/components/layout/CategoryBanner";
import { CategoryBreadcrumbs } from "@/components/layout/CategoryBreadcrumbs";
import { Footer } from "@/components/layout/Footer";
import { FloatingActionButtons } from "@/components/layout/FloatingActionButtons";
import { ProductsSection } from "@/components/products/ProductsSection";
import { useCategories } from "@/hooks/use-categories";

const CategoryViewPage = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const [promoVisible, setPromoVisible] = React.useState(true);
  const {
    categories,
    setCategories,
    mainCategories,
    subcategoriesByParent,
    thirdLevelBySubcategory,
    getCategoryByIdOrNameOrSlug,
    getBreadcrumbPath,
  } = useCategories();

  const categoryName = categorySlug ? decodeURIComponent(categorySlug) : "";
  const currentCategory = categoryName ? getCategoryByIdOrNameOrSlug(categoryName) : undefined;
  const breadcrumbPath = currentCategory ? getBreadcrumbPath(currentCategory) : [];

  const setSelectedCategory = (cat: string) => {
    if (cat === "Todos") {
      navigate("/");
      return;
    }
    navigate(`/categoria/${encodeURIComponent(cat)}`);
  };

  useEffect(() => {
    if (categoryName) window.scrollTo(0, 0);
  }, [categoryName]);

  const whatsappNumber = "+541126711308";
  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}`;

  if (!categoryName) return <Navigate to="/" replace />;

  const displayCategoryName = currentCategory?.name || categoryName;

  return (
    <div className="min-h-screen bg-white text-neutral-900 overflow-x-hidden font-sans">
      <FloatingActionButtons />

      <div className="w-full">
        <TopPromoBar setPromoVisible={setPromoVisible} />
      </div>
      <AdvancedHeader
        categories={categories}
        selectedCategory={displayCategoryName}
        setSelectedCategory={setSelectedCategory}
        promoVisible={promoVisible}
        mainCategories={mainCategories}
        subcategoriesByParent={subcategoriesByParent}
        thirdLevelBySubcategory={thirdLevelBySubcategory}
      />

      <CategoryBanner name={displayCategoryName} image={currentCategory?.image} />
      <CategoryBreadcrumbs path={breadcrumbPath} />

      <main className="relative z-10 w-full pt-4">
        <ProductsSection
          selectedCategory={categoryName}
          setSelectedCategory={setSelectedCategory}
          setCategories={setCategories}
        />
      </main>

      <Footer />
    </div>
  );
};

export default CategoryViewPage;
