import { toast } from '@/hooks/use-toast';
import { db } from '@/firebase';
import { ProductFormData } from './types';

interface SaveProductParams {
  formData: ProductFormData;
  categories: Array<{ id: string; name: string; parentId?: string | null }>;
  user: any;
  liberta: string;
  isEditing?: boolean;
  editingId?: string | null;
  onSuccess?: () => void;
}

export const useProductSave = () => {
  const isSupabase = typeof (db as any)?.from === 'function';

  const saveProduct = async ({
    formData,
    categories,
    user,
    liberta,
    isEditing = false,
    editingId = null,
    onSuccess
  }: SaveProductParams): Promise<void> => {
    // Validación: para variantes, al menos una variante debe tener precio y stock
    const isDecantProduct = formData.isDecant && formData.decantOptions;
    if (!formData.name || !formData.category) {
      toast({
        variant: "destructive",
        title: "Error al guardar producto",
        description: "Por favor completa los campos obligatorios."
      });
      throw new Error("Campos obligatorios incompletos");
    }

    if (!isDecantProduct && (!formData.price || !formData.stock)) {
      toast({
        variant: "destructive",
        title: "Error al guardar producto",
        description: "Por favor completa el precio y el stock del producto."
      });
      throw new Error("Campos de precio/stock incompletos");
    }

    if (isDecantProduct) {
      const opts = formData.decantOptions!;
      const hasValidOption = (['2.5', '5', '10'] as const).some(
        ml => opts[ml].enabled && opts[ml].price !== '' && opts[ml].stock !== ''
      );
      if (!hasValidOption) {
        toast({
          variant: "destructive",
          title: "Error al guardar variantes",
          description: "Debes activar al menos una presentación con precio y stock para guardar el producto."
        });
        throw new Error("Producto sin variantes válidas");
      }
    }

    // Para variantes: precio global = precio mínimo de las variantes activas (fallback)
    // Para productos normales: usar el campo price directamente
    let numericPrice: number;
    let numericStock: number;

    if (isDecantProduct) {
      const opts = formData.decantOptions!;
      const activePrices = (['2.5', '5', '10'] as const)
        .filter(ml => opts[ml].enabled && opts[ml].price !== '')
        .map(ml => parseFloat(opts[ml].price));
      numericPrice = activePrices.length > 0 ? Math.min(...activePrices) : 0;

      const totalStock = (['2.5', '5', '10'] as const)
        .filter(ml => opts[ml].enabled && opts[ml].stock !== '')
        .reduce((sum, ml) => sum + (parseInt(opts[ml].stock, 10) || 0), 0);
      numericStock = totalStock;
    } else {
      numericPrice = parseFloat(formData.price || '0') || 0;
      numericStock = parseInt(formData.stock || '0', 10) || 0;
    }

    // Redondear para evitar 'numeric field overflow' en la DB
    numericPrice = Math.round(numericPrice);
    const numericCost = formData.cost ? Math.round(parseFloat(formData.cost) || 0) : null;
    const numericOriginalPrice = formData.originalPrice ? Math.round(parseFloat(formData.originalPrice) || numericPrice) : numericPrice;
    const numericDiscount = formData.discount ? Math.round(parseFloat(formData.discount) || 0) : 0;

    if (isNaN(numericPrice) || isNaN(numericStock)) {
      toast({
        variant: "destructive",
        title: "Error al guardar producto",
        description: "El precio y stock deben ser valores numéricos válidos."
      });
      throw new Error("Valores numéricos inválidos");
    }

    // Obtener nombres de categorías
    const categoryName = categories.find(cat => cat.id === formData.category)?.name || "";
    const subcategoryName = formData.subcategory
      ? categories.find(cat => cat.id === formData.subcategory)?.name || ""
      : "";
    const terceraCategoriaName = formData.terceraCategoria
      ? categories.find(cat => cat.id === formData.terceraCategoria)?.name || ""
      : "";

    const now = new Date().toISOString();

    if (isSupabase) {
      const supabasePayload: any = {
        name: formData.name,
        description: formData.description,
        price: numericPrice,
        original_price: formData.isOffer ? numericOriginalPrice : numericPrice,
        image: formData.image || null,
        additional_images: formData.additionalImages?.filter(Boolean) ?? [],
        category: formData.category,
        category_name: categoryName || null,
        subcategory: formData.subcategory || null,
        subcategory_name: subcategoryName || null,
        tercera_categoria: formData.terceraCategoria || null,
        tercera_categoria_name: terceraCategoriaName || null,
        stock: numericStock,
        cost: numericCost,
        is_published: formData.isPublished,
        is_offer: formData.isOffer,
        discount: formData.isOffer ? numericDiscount : 0,
        benefits: formData.benefits ?? [],
        warranties: formData.warranties ?? [],
        payment_methods: formData.paymentMethods ?? [],
        colors: formData.colors ?? [],
        specifications: formData.specifications ?? [],
        is_decant: formData.isDecant || false,
        decant_options: formData.isDecant && formData.decantOptions ? {
          '2.5': {
            enabled: formData.decantOptions['2.5'].enabled,
            price: Math.round(parseFloat(formData.decantOptions['2.5'].price)) || 0,
            stock: parseInt(formData.decantOptions['2.5'].stock, 10) || 0,
          },
          '5': {
            enabled: formData.decantOptions['5'].enabled,
            price: Math.round(parseFloat(formData.decantOptions['5'].price)) || 0,
            stock: parseInt(formData.decantOptions['5'].stock, 10) || 0,
          },
          '10': {
            enabled: formData.decantOptions['10'].enabled,
            price: Math.round(parseFloat(formData.decantOptions['10'].price)) || 0,
            stock: parseInt(formData.decantOptions['10'].stock, 10) || 0,
          },
        } : null,
        last_modified_by: user?.email || "unknown",
      };

      // Agregar opciones de filtros a specifications si existen
      if (formData.filterOptions && Object.keys(formData.filterOptions).length > 0) {
        // Agregar las opciones de filtros como una especificación especial
        const filterOptionsSpec = {
          name: '_filter_options',
          value: JSON.stringify(formData.filterOptions)
        };
        supabasePayload.specifications = [
          ...(supabasePayload.specifications || []),
          filterOptionsSpec
        ];
      }

      try {
        if (isEditing && editingId) {
          if (liberta === "si") {
            const { error } = await (db as any)
              .from("products")
              .update({ ...supabasePayload })
              .eq("id", editingId);

            if (error) throw error;

            toast({
              title: "Producto actualizado",
              description: "El producto ha sido actualizado exitosamente."
            });
          } else {
            // Enviar a revisión
            const { error } = await (db as any).from("revision").insert([{
              type: "edit",
              data: { ...supabasePayload, id: editingId },
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
          let newProductId: string | null = null;

          if (liberta === "si") {
            const { data: inserted, error } = await (db as any)
              .from("products")
              .insert([{ ...supabasePayload, created_by: user?.email || "unknown" }])
              .select()
              .single();

            if (error) throw error;

            newProductId = inserted?.id || null;

            toast({
              title: "Producto agregado",
              description: "El producto ha sido agregado exitosamente."
            });
          } else {
            // Enviar a revisión
            const { error } = await (db as any).from("revision").insert([{
              type: "add",
              data: supabasePayload,
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

          // Guardar grupos de filtros si existen (solo si se creó directamente, no en revisión)
          if (formData.filterGroups && formData.filterGroups.length > 0 && newProductId) {
            const filterGroupRelations = formData.filterGroups.map((groupId: string) => ({
              product_id: newProductId,
              filter_group_id: groupId
            }));

            await (db as any)
              .from("product_filter_groups")
              .insert(filterGroupRelations);
          }
        }

        // Guardar grupos de filtros para productos editados
        if (isEditing && editingId && formData.filterGroups && formData.filterGroups.length >= 0) {
          // Primero eliminar relaciones existentes
          await (db as any)
            .from("product_filter_groups")
            .delete()
            .eq("product_id", editingId);

          // Luego insertar las nuevas relaciones si hay grupos seleccionados
          if (formData.filterGroups.length > 0) {
            const filterGroupRelations = formData.filterGroups.map((groupId: string) => ({
              product_id: editingId,
              filter_group_id: groupId
            }));

            await (db as any)
              .from("product_filter_groups")
              .insert(filterGroupRelations);
          }
        }

        onSuccess?.();
      } catch (error: any) {
        console.error("Error al guardar producto:", error);
        toast({
          variant: "destructive",
          title: "Error al guardar producto",
          description: error?.message || "Ocurrió un error al guardar el producto."
        });
        throw error;
      }
    } else {
      // Fallback a Firestore si es necesario
      toast({
        variant: "destructive",
        title: "No disponible",
        description: "Esta funcionalidad requiere Supabase configurado."
      });
      throw new Error("Supabase no disponible");
    }
  };

  return { saveProduct };
};
