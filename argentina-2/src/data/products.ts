import { Product } from '@/contexts/CartContext';

export const sampleProducts: Product[] = [
  {
    id: '1',
    name: 'Coca-Cola 600ml',
    description: 'Bebida refrescante carbonatada original. Perfecta para acompañar tus comidas o refrescarte en cualquier momento del día.',
    price: 3500,
    image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400',
    category: 'Bebidas',
    stock: 48
  },
  {
    id: '2',
    name: 'Agua Cristal 500ml',
    description: 'Agua purificada natural sin gas. Hidratación pura y refrescante para toda la familia.',
    price: 2000,
    image: 'https://images.unsplash.com/photo-1550472218-2a4c2d23c5ea?w=400',
    category: 'Bebidas',
    stock: 72
  },
  {
    id: '3',
    name: 'Papas Margarita Original',
    description: 'Papas fritas crujientes con sal marina. El snack perfecto para compartir en familia o disfrutar solo.',
    price: 2800,
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400',
    category: 'Snacks',
    stock: 35
  },
  {
    id: '4',
    name: 'Chocolatina Jet',
    description: 'Deliciosa chocolatina con maní y caramelo. Un dulce irresistible para cualquier momento del día.',
    price: 2500,
    image: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=400',
    category: 'Dulces',
    stock: 28
  },
  {
    id: '5',
    name: 'Gatorade Azul 500ml',
    description: 'Bebida hidratante deportiva sabor frutas azules. Ideal para recuperar electrolitos después del ejercicio.',
    price: 4200,
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400',
    category: 'Bebidas',
    stock: 24
  },
  {
    id: '6',
    name: 'Galletas Oreo',
    description: 'Galletas de chocolate rellenas de crema. El clásico que nunca pasa de moda, perfecto para toda la familia.',
    price: 3200,
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400',
    category: 'Dulces',
    stock: 18
  },
  {
    id: '7',
    name: 'Doritos Nacho',
    description: 'Totopos de maíz con sabor a queso nacho. Crujientes y llenos de sabor para los amantes de lo picante.',
    price: 3800,
    image: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400',
    category: 'Snacks',
    stock: 22
  },
  {
    id: '8',
    name: 'Leche Alquería 1L',
    description: 'Leche entera pasteurizada ultra fresca. Nutrición completa para toda la familia en presentación familiar.',
    price: 4800,
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
    category: 'Lácteos',
    stock: 15
  },
  {
    id: '9',
    name: 'Pan Tajado Bimbo',
    description: 'Pan de molde suave y esponjoso. Perfecto para el desayuno, meriendas y preparaciones rápidas.',
    price: 5200,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
    category: 'Panadería',
    stock: 12
  },
  {
    id: '10',
    name: 'Huevos AA x 12',
    description: 'Huevos frescos de gallina categoría AA. Proteína de alta calidad para una alimentación balanceada.',
    price: 6500,
    image: 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?w=400',
    category: 'Lácteos',
    stock: 8
  },
  {
    id: '11',
    name: 'Café Juan Valdez 500g',
    description: 'Café colombiano premium molido. Aroma y sabor únicos para empezar el día con energía.',
    price: 18500,
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400',
    category: 'Despensa',
    stock: 6
  },
  {
    id: '12',
    name: 'Aceite Girasol 1L',
    description: 'Aceite de girasol refinado para cocinar. Ideal para freír, guisar y preparar todo tipo de comidas.',
    price: 8900,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400',
    category: 'Despensa',
    stock: 10
  },
  {
    id: '13',
    name: 'Jabón Protex Antibacterial',
    description: 'Jabón de tocador antibacterial. Protección y limpieza para toda la familia con aroma fresco.',
    price: 3800,
    image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400',
    category: 'Aseo',
    stock: 25
  },
  {
    id: '14',
    name: 'Papel Higiénico Familia x4',
    description: 'Papel higiénico suave y resistente. Calidad superior para el cuidado y comodidad de tu hogar.',
    price: 12500,
    image: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400',
    category: 'Aseo',
    stock: 14
  },
  {
    id: '15',
    name: 'Detergente Ariel 1kg',
    description: 'Detergente en polvo para ropa. Limpieza profunda y cuidado de tus prendas favoritas.',
    price: 15200,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    category: 'Aseo',
    stock: 9
  },
  {
    id: '16',
    name: 'Kit Snacks Variado',
    description: 'Combo especial con papas, galletas y dulces. Perfecto para compartir en reuniones familiares.',
    price: 12800,
    image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400',
    category: 'Combos',
    stock: 7
  }
];

export const categories = [
  'Todos',
  'Bebidas',
  'Snacks',
  'Dulces',
  'Lácteos',
  'Panadería',
  'Despensa',
  'Aseo',
  'Combos'
];
