import React from 'react';
import { Link } from 'react-router-dom';

interface CategoryBreadcrumbsProps {
  path: string[];
}

export const CategoryBreadcrumbs: React.FC<CategoryBreadcrumbsProps> = ({ path }) => {
  if (path.length === 0) return null;

  return (
    <nav
      className="w-full max-w-[1800px] mx-auto px-4 md:px-6 py-2 md:py-3 bg-white border-b border-gray-100"
      aria-label="Breadcrumb"
    >
      <ol className="flex flex-wrap items-center gap-1 text-xs md:text-sm text-gray-500">
        {path.map((label, i) => {
          const isLast = i === path.length - 1;
          const href = label === "Inicio" ? "/" : `/categoria/${encodeURIComponent(label)}`;

          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-400 mx-0.5">&gt;</span>}
              {isLast ? (
                <span className="font-medium text-gray-900">{label}</span>
              ) : (
                <Link
                  to={href}
                  className="hover:text-gray-900 transition-colors"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
