import React from 'react';

// Extendemos la interfaz para aceptar la propiedad size
interface ClockProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

// Esta es una reimplementación del componente Clock de lucide-react
// para evitar problemas de importación y compilación
export const CustomClock = React.forwardRef<
  SVGSVGElement,
  ClockProps
>(({ color = 'currentColor', strokeWidth = 2, size = 24, ...props }, ref) => {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
});

CustomClock.displayName = 'CustomClock';

export default CustomClock;
