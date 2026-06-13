import React from 'react';

interface PieChartProps {
  data?: { label: string; value: number; color?: string }[];
  size?: number;
}

// Genera colores modernos automáticamente si no se proveen
const modernColors = [
  '#38bdf8', // sky-400
  '#818cf8', // indigo-400
  '#2dd4bf', // teal-400
  '#fbbf24', // amber-400
  '#f472b6', // pink-400
  '#a3e635', // lime-400
  '#fb7185', // rose-400
  '#c084fc', // purple-400
  '#34d399', // emerald-400
  '#60a5fa'  // blue-400
];

export const PieChart: React.FC<PieChartProps> = ({ data = [], size = 200 }) => {
  // Datos de ejemplo si no se proporcionan
  const chartData = data.length > 0 ? data : [
    { label: "Ropa", value: 42, color: modernColors[0] },
    { label: "Accesorios", value: 28, color: modernColors[1] },
    { label: "Electrónica", value: 18, color: modernColors[2] },
    { label: "Otros", value: 12, color: modernColors[3] },
  ];

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  let cumulative = 0;

  // Asegurarse de que total sea un número válido
  const validTotal = total || 1; // Evitar división por cero

  // Calcula los arcos para cada segmento
  const arcs = chartData.map((d, i) => {
    const value = typeof d.value === 'number' ? d.value : 0;
    const startAngle = (cumulative / validTotal) * 2 * Math.PI;
    const angle = (value / validTotal) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    cumulative += value;

    // Coordenadas para el arco
    const radius = (size / 2) - 10 || 90; // Asegura un valor por defecto
    const x1 = size / 2 + radius * Math.cos(startAngle - Math.PI / 2);
    const y1 = size / 2 + radius * Math.sin(startAngle - Math.PI / 2);
    const x2 = size / 2 + radius * Math.cos(endAngle - Math.PI / 2);
    const y2 = size / 2 + radius * Math.sin(endAngle - Math.PI / 2);
    const largeArc = angle > Math.PI ? 1 : 0;
    const color = d.color || modernColors[i % modernColors.length];

    const pathData = [
      `M ${size / 2} ${size / 2}`,
      `L ${x1} ${y1}`,
      `A ${size / 2 - 10} ${size / 2 - 10} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    return { pathData, color, label: d.label, value: d.value };
  });

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
          {/* Añadir un círculo de fondo */}
          <circle cx={size/2} cy={size/2} r={Math.max((size/2)-10, 90)} fill="#f8fafc" />
          
          {/* Dibujar los arcos */}
          {arcs.map((arc, i) => (
            <g key={i} className="hover:opacity-90 transition-opacity cursor-pointer">
              <path 
                d={arc.pathData} 
                fill={arc.color} 
                stroke="#fff" 
                strokeWidth={2}
              />
              {/* Añadir etiquetas internas para segmentos grandes */}
              {(arc.value / total) > 0.1 && (
                <text
                  x={size / 2 + (size / 3) * Math.cos((cumulative - arc.value / 2) / total * 2 * Math.PI - Math.PI / 2)}
                  y={size / 2 + (size / 3) * Math.sin((cumulative - arc.value / 2) / total * 2 * Math.PI - Math.PI / 2)}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {Math.round(arc.value / total * 100)}%
                </text>
              )}
            </g>
          ))}
          
          {/* Círculo central */}
          <circle cx={size/2} cy={size/2} r={Math.max(size/5, 40)} fill="#fff" stroke="#f1f5f9" strokeWidth="1" />
          
          {/* Texto central */}
          <text
            x={size/2}
            y={size/2 - 5}
            textAnchor="middle"
            fill="#334155"
            fontSize="16"
            fontWeight="bold"
          >
            {total}
          </text>
          <text
            x={size/2}
            y={size/2 + 15}
            textAnchor="middle"
            fill="#64748b"
            fontSize="10"
          >
            TOTAL
          </text>
        </svg>
      </div>
      
      {/* Leyenda mejorada */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-6 max-w-xs">
        {arcs.map((arc, i) => (
          <div key={i} className="flex items-center space-x-2 group">
            <div className="w-3 h-3 rounded-full" style={{ background: arc.color }}></div>
            <div className="flex justify-between w-full">
              <span className="text-xs text-slate-600 font-medium">{arc.label}</span>
              <span className="text-xs text-slate-700">
                <span className="font-medium">{Math.round(arc.value / total * 100)}%</span>
                <span className="ml-1 text-slate-400">({arc.value})</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
