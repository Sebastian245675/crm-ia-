import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Componente de depuración que muestra información sobre la navegación
 * Añádelo a tu aplicación temporalmente para depurar problemas de enrutamiento
 * 
 * Ejemplo de uso:
 * import { RoutingDebug } from '@/components/utils/RoutingDebug';
 * 
 * Luego en tu componente principal:
 * {process.env.NODE_ENV === 'development' && <RoutingDebug />}
 */
export const RoutingDebug: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Test de rutas para verificar
  const testRoutes = [
    '/admin/update-image-urls',
    '/admin/image-downloader',
    '/admin'
  ];

  const testRoute = (route: string) => {
    navigate(route);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '15px',
        borderRadius: '6px',
        zIndex: 9999,
        fontSize: '12px',
        maxWidth: '400px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}
    >
      <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 'bold' }}>Debug: Routing Info</h3>
      <div style={{ marginBottom: '10px' }}>
        <div><strong>Path:</strong> {location.pathname}</div>
        <div><strong>Search:</strong> {location.search}</div>
        <div><strong>Hash:</strong> {location.hash}</div>
      </div>
      
      <h4 style={{ margin: '10px 0', fontSize: '13px', fontWeight: 'bold' }}>Test Routes:</h4>
      {testRoutes.map((route, index) => (
        <button 
          key={index}
          onClick={() => testRoute(route)}
          style={{
            background: '#2563eb',
            color: 'white',
            border: 'none',
            padding: '6px 10px',
            borderRadius: '4px',
            margin: '0 5px 5px 0',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          Test: {route}
        </button>
      ))}
      
      <div style={{ marginTop: '10px', borderTop: '1px solid #444', paddingTop: '10px' }}>
        <p style={{ margin: '0', fontSize: '11px' }}>
          Para eliminar este componente de depuración, quítalo del componente App.
        </p>
      </div>
    </div>
  );
};
