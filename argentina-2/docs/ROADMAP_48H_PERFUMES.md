# Hoja de Ruta de 48h - Lanzamiento Tienda de Perfumes de Lujo

## 🕒 Día 1: Arquitectura de Estado y Optimizaciones Estéticas (24h)

### Bloque 1: Data Management (0h - 6h)
> **Diagnóstico del repositorio:** Noté que el proyecto ya tiene instalado `@tanstack/react-query` y `@supabase/supabase-js`. *No necesitas Redux*. Para una tienda de 75 productos, Redux es sobreingeniería (boilerplate excesivo) y el Context puro para peticiones provocaría re-renders innecesarios.

1. **Estrategia de Estado:**
   - **Estado Servidor (Productos):** Usa **React Query** (`useQuery`) para traer los 75 productos desde Supabase. React Query resuelve de tu lado el caché, la deduplicación y los estados de carga nativamente.
   - **Estado Cliente (Filtros y Carrito):** Como son exactamente 75 productos en total, te conviene cargar todos al cliente inicialmente. Usa **Context API** SOLO para el estado reactivo del carrito de compras (y/o Zustand si requieres una solución más escalable, pero Context basta aquí).

### Bloque 2: Ajustes UI/UX "Pixel-Perfect" de Lujo (6h - 18h)
Como es una tienda de perfumes premium, el minimalismo y la respuesta visual "suave" lo son todo:
1. **Tipografía y "Whitespace":** Usa fuentes elegantes y simples (*Inter*, combinada opcionalmente con una fuente serifa para títulos como *Playfair*). Respeta al máximo los márgenes. Un diseño recargado destruye la percepción "premium".
2. **Micro-interacciones:** Noté que existe `framer-motion` en tu `package.json`. Añade transiciones estilo "Fade In Up" al renderizar la cuadrícula y un `whileHover` de un cambio microscópico de escala de imagen (y flotación).
3. **Fotografía:** Las imágenes son el 90% del impacto. Fuerza cajas que mantengan una relación de aspecto consistente (`aspect-[4/5]`) o cuadrada (`aspect-square`), integrando `object-cover` sobre fondos hiper neutros (`bg-[#FAFAFA]` o `bg-[#F5F5F5]`).
4. **Skeleton Loading:** Jamás uses spinners circulares genéricos. Cuando el layout cargue (mediante el isLoading de React Query), muestra *Skeleton Cards* grises destellando suavemente de fondo.

### Bloque 3: Revisión de Hooks (18h - 24h)
1. **Memoización Constante:** Utiliza `useMemo` en todos los cálculos derivados: filtrado de los 75 productos (búsqueda) y suma total en dinero del carrito. Reducirá el CPU a cero en los re-renders.
2. **Lazy Loading y Optimizaciones de Imagen:** Asegúrate de que todas tus tarjetas incluyan en la etiqueta de imagen nativa `loading="lazy"`. Esto evitará un colapso en cascada del primer render visual.

---

## 🕒 Día 2: Pasarela de Pagos, Pruebas y Despliegue (24h - 48h)

### Bloque 4: Integración y Pruebas de Pagos (24h - 36h)
> **Diagnóstico Extra:** Analizando tu `package.json`, veo que tienes `@mercadopago/sdk-react`. Si tu objetivo en lugar de PayPal/Stripe ahora mismo es Mercado Pago (o planeas sumar los primeros), aplica esta lista:

**Checklist Crítico de la Pasarela:**
- [ ] **Validación Servidor-Servidor:** JAMÁS pases solamente el valor final numérico del front al back para cobrar. Envía el ID del carrito y haz que tu servidor (ej. Edge Functions o Webhook en Node) calcule el importe y le pida el intention a la pasarela antes.
- [ ] **Webhooks vs Redirecciones:** La lógica de stock debe descontarse y ser marcado como "Pagado" cuando tu base de datos reciba el webhook exitoso de MercadoPago/Stripe, **NO** cuando el frontend vuelva de la página `/success`.
- [ ] **Edge Cases / Casos de Corte:** ¿Qué sucede en tu UI si el usuario cierra el tab en el medio del loading tras dar clic en "pagar"? Simula errores de saldo, timeout, y verifica que el usuario reciba un toast de error elegante sin romperse.
- [ ] **Testeo de Formularios:** Comprueba rigurosamente en iPhone y Android que el teclado no achique malventuradamente tu UI estropeando el input del botón de compra.

### Bloque 5: Performance y Lanzamiento (36h - 48h)
- [ ] Confirmar Build de Producción (`npm run build`). Vite en TypeScript es estricto; haz este paso rápido para validar tipados de TypeScript (Zod ya lo tienes).
- [ ] Ejecutar auditoría Lighthouse en ventana de incógnito buscando un mínimo de 90+ de puntuación.
- [ ] Pulido final de meta-tags y OG-Images para WhatsApp a la hora de compartir el link del e-commerce.

---

## 💻 Script Base: Componente Optimizado de Renderizado (React + Framer Motion)

Como tu stack cuenta con **Supabase**, **React Query**, **Framer Motion** y **Tailwind**, así debería verse la obra maestra base que renderice los 75 perfumes de la manera más rápida posible y con un "look premium":

```tsx
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
// Se asume la inicialización de supabase en lib/supabase
import { supabase } from '@/lib/supabase'; 

// Fetching directo de tu base Supabase
const fetchPerfumes = async () => {
  const { data, error } = await supabase.from('products').select('*');
  if (error) throw error;
  return data;
};

export const LuxuryPerfumeGrid = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // 1. Delegamos el peso mental de Fetch+Cache+Deduplication a React Query
  // Para 75 productos esto es absurdamente rápido.
  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ['perfumes-collection'],
    queryFn: fetchPerfumes,
    staleTime: 1000 * 60 * 60, // Súper Optimización: Caché válido por 1 hora
  });

  // 2. Filtramos la totalidad de ítems (75 máximo) localmente en memoria RAM 
  // con 0 latencia para el usuario y sin disparar llamadas REST al presionar teclas.
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      
      {/* Header Interfaz */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h2 className="text-4xl font-light tracking-wider text-gray-900 border-l-2 border-black pl-4">
            Colección Exclusiva
          </h2>
          <p className="text-sm text-gray-500 mt-2 uppercase tracking-widest pl-4">
            {products.length === 0 ? "..." : `${products.length} fragancias maestras`}
          </p>
        </div>
        
        {/* Input Lujoso */}
        <div className="relative w-full md:w-64">
           <input 
              type="text" 
              placeholder="Buscar esencia..." 
              className="w-full border-b border-gray-300 focus:border-black py-2 outline-none transition-colors bg-transparent text-sm placeholder:tracking-widest"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* Manejo de Loading UI elegante */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => (
             <div key={i} className="animate-pulse bg-gray-100/80 aspect-[4/5] rounded-sm"></div>
          ))}
        </div>
      )}

      {isError && (
        <p className="text-red-800 text-sm py-4">Recepción inestable de la colección. Por favor, intente de nuevo.</p>
      )}

      {/* Grid Animado para Perfumes */}
      <motion.div 
        layout 
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12 md:gap-x-10 md:gap-y-16"
      >
        <AnimatePresence>
          {filteredProducts.map((product) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              whileHover={{ y: -8 }} // 3. Flotación suave 'Lujo feeling' al interactuar con ratón
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }} 
              key={product.id}
              className="group cursor-pointer flex flex-col"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#FAFAFA] mb-5">
                <img
                  src={product.image_url}
                  alt={`Frasco de perfúme ${product.name}`}
                  loading="lazy" 
                  className="w-full h-full object-cover object-center transition-transform duration-[1200ms] group-hover:scale-105" // Escala mega suave
                />
              </div>
              <h3 className="text-xs md:text-sm font-medium text-gray-900 uppercase tracking-widest text-center">
                {product.name}
              </h3>
              <p className="mt-2 text-xs text-gray-500 font-light text-center">
                ${Number(product.price).toLocaleString('es-AR')}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {!isLoading && filteredProducts.length === 0 && (
         <div className="py-20 text-center">
            <p className="text-gray-400 font-light tracking-wide">No localizamos esa nota de fragancia en nuestra colección.</p>
         </div>
      )}
    </div>
  );
}
```

### ¿Por qué este enfoque?
1. **Delegación a React Query**: Te olvidas de manejar promesas locales con `useEffect` que suelen generar "waterfalls" o peticiones dobles fallidas.
2. **Poder del cliente (`useMemo`)**: Teniendo sólo **75 registros**, volver a llamar a Supabase o filtrar en servidor al teclear es dispararse en el pie. Lo resolvemos en memoria RAM de manera instantánea.
3. **Flujo de Framer Motion**: La curva de aceleración `[0.25, 0.1, 0.25, 1]` proporciona un acabado sedoso y sofisticado, muy superior al CSS bruto que otorga sensación económica. Es ese "premium touch".
