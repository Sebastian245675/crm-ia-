
import React from 'react';
import { cn } from '@/lib/utils';

interface GlassmorphismCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassmorphismCard: React.FC<GlassmorphismCardProps> = ({
  children,
  className,
  hover = false
}) => {
  return (
    <div
      className={cn(
        "relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl",
        "before:absolute before:inset-0 before:rounded-2xl before:p-[1px]",
        "before:bg-gradient-to-br before:from-white/30 before:via-transparent before:to-white/10",
        "before:mask-composite-exclude before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]",
        hover && "transform transition-all duration-500 hover:scale-105 hover:bg-white/20 hover:shadow-[0_0_50px_rgba(255,107,53,0.3)]",
        "animate-fade-in",
        className
      )}
    >
      {children}
    </div>
  );
};
