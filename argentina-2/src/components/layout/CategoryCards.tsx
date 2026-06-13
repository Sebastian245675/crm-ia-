import React from 'react';
import { useNavigate } from 'react-router-dom';

export const CategoryCards: React.FC = () => {
  const navigate = useNavigate();

  const categories = [
    {
      id: 'masculinas',
      title: 'MASCULINAS',
      subtitle: 'DISEÑADOR',
      image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=800',
      path: '/categoria/Masculinos'
    },
    {
      id: 'arabes',
      title: 'ÁRABES',
      image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=800',
      path: '/categoria/Arabes'
    }
  ];

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 md:px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <div 
            key={cat.id}
            className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-3xl group cursor-pointer"
            onClick={() => navigate(cat.path)}
          >
            {/* Background Image with overlay */}
            <img 
              src={cat.image} 
              alt={cat.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <h2 className="text-white text-3xl md:text-5xl font-black tracking-tighter leading-none mb-1 drop-shadow-lg">
                {cat.title}
              </h2>
              {cat.subtitle && (
                <h3 className="text-white text-2xl md:text-4xl font-black tracking-tighter leading-none mb-6 drop-shadow-lg">
                  {cat.subtitle}
                </h3>
              )}
              
              <button 
                className="mt-4 px-10 py-3 border-2 border-white text-white text-sm font-bold tracking-widest uppercase hover:bg-white hover:text-black transition-all duration-300 rounded-none"
              >
                DESCUBRIR
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
