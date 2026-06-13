import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

const AdvancedAnalyticsChart: React.FC = () => {
  // Aquí podrías integrarlo con una librería real de gráficos como Chart.js, Recharts, etc.
  // Pero para simular, creamos un gráfico visual con CSS
  
  // Datos simulados para la gráfica
  const [data, setData] = useState<Array<{month: string; sales: number; orders: number}>>([]);
  
  useEffect(() => {
    // Simular carga de datos
    const generateData = () => {
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'];
      return months.map(month => ({
        month,
        sales: Math.floor(Math.random() * 50000) + 10000,
        orders: Math.floor(Math.random() * 100) + 20,
      }));
    };
    
    setData(generateData());
  }, []);
  
  // Encontrar el valor máximo para escalar las barras correctamente
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.sales)) : 60000;
  
  return (
    <div className="space-y-6">
      {/* Leyenda */}
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-sky-500 rounded-full"></div>
          <span className="text-sm text-slate-600">Ventas ($)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-300 rounded-full"></div>
          <span className="text-sm text-slate-600">Órdenes</span>
        </div>
      </div>
      
      {/* Gráfico */}
      <div className="relative h-72 mt-6">
        {/* Líneas horizontales de referencia */}
        {[0, 1, 2, 3, 4].map((_, i) => (
          <div 
            key={i} 
            className="absolute w-full border-t border-slate-100 text-xs text-slate-400"
            style={{ bottom: `${i * 25}%`, left: 0 }}
          >
            <span className="absolute -left-12 -top-2">${(maxValue * i / 4).toLocaleString()}</span>
          </div>
        ))}
        
        {/* Barras del gráfico */}
        <div className="absolute left-0 bottom-0 right-0 top-0 flex items-end pt-6">
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center justify-end h-full" style={{ paddingLeft: '1%', paddingRight: '1%' }}>
              {/* Tooltip */}
              <div className="group relative mb-2">
                {/* Contenido del tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 bg-slate-800 text-white text-xs rounded-md p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <p className="font-medium">{item.month}</p>
                  <p>Ventas: ${item.sales.toLocaleString()}</p>
                  <p>Órdenes: {item.orders}</p>
                </div>
                
                {/* Punto de indicación para el tooltip */}
                <div className="w-2 h-2 bg-sky-500 rounded-full opacity-0 group-hover:opacity-100"></div>
              </div>
              
              {/* Barra de ventas */}
              <div 
                className="w-full bg-gradient-to-t from-sky-500 to-blue-400 rounded-t-md hover:from-sky-600 hover:to-blue-500 transition-all duration-300 cursor-pointer relative group"
                style={{ height: `${(item.sales / maxValue) * 100}%` }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 rounded-t-md transition-opacity"></div>
              </div>
              
              {/* Mes en el eje X */}
              <div className="text-xs text-slate-500 mt-2">{item.month}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Métricas de resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Ventas', value: `$${data.reduce((sum, item) => sum + item.sales, 0).toLocaleString()}`, color: 'bg-sky-100 text-sky-700' },
          { label: 'Total Órdenes', value: data.reduce((sum, item) => sum + item.orders, 0).toString(), color: 'bg-blue-100 text-blue-700' },
          { label: 'Promedio Ventas', value: `$${Math.round(data.reduce((sum, item) => sum + item.sales, 0) / (data.length || 1)).toLocaleString()}`, color: 'bg-indigo-100 text-indigo-700' },
          { label: 'Promedio Órdenes', value: Math.round(data.reduce((sum, item) => sum + item.orders, 0) / (data.length || 1)).toString(), color: 'bg-violet-100 text-violet-700' },
        ].map((metric, index) => (
          <div key={index} className={`${metric.color} rounded-xl p-3 text-center`}>
            <p className="text-xs font-medium mb-1">{metric.label}</p>
            <p className="text-lg font-bold">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdvancedAnalyticsChart;
