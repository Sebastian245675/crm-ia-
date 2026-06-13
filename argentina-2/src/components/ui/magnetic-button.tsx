
import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className,
  onClick,
  variant = 'primary'
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      const distance = Math.sqrt(x * x + y * y);
      const maxDistance = 100;
      
      if (distance < maxDistance) {
        const force = (maxDistance - distance) / maxDistance;
        const moveX = x * force * 0.3;
        const moveY = y * force * 0.3;
        
        button.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
      }
    };

    const handleMouseLeave = () => {
      button.style.transform = 'translate(0px, 0px) scale(1)';
    };

    document.addEventListener('mousemove', handleMouseMove);
    button.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      button.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const variants = {
    primary: "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg hover:shadow-[0_0_30px_rgba(255,107,53,0.5)]",
    secondary: "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg hover:shadow-[0_0_30px_rgba(147,51,234,0.5)]",
    ghost: "bg-transparent border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
  };

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      className={cn(
        "relative px-8 py-3 rounded-xl font-semibold transition-all duration-300 overflow-hidden",
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0",
        "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
        variants[variant],
        className
      )}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
};
