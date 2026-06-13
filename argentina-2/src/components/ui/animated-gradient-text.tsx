
import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedGradientTextProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const AnimatedGradientText: React.FC<AnimatedGradientTextProps> = ({
  children,
  className,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl'
  };

  return (
    <span
      className={cn(
        "font-bold bg-gradient-to-r from-orange-400 via-red-500 to-pink-500",
        "bg-[length:200%_200%] animate-[gradient_3s_ease_infinite] bg-clip-text text-transparent",
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
};
