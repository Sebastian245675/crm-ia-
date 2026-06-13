import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2 } from 'lucide-react';

interface ConfigurationPanelProps {
  onNavigateToSubaccounts: () => void;
  onNavigateToProfile: () => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  onNavigateToSubaccounts,
  onNavigateToProfile
}) => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Configuración
        </h1>
        <p className="text-slate-600">
          Gestionar la información y la configuración de su empresa
        </p>
      </div>

      {/* Menú de opciones de configuración */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Opción: Perfil de empresa */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-300"
          onClick={onNavigateToProfile}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-lg">Perfil de empresa</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Gestionar información general y logo de la empresa
            </p>
          </CardContent>
        </Card>

        {/* Opción: Subcuentas */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-300"
          onClick={onNavigateToSubaccounts}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-lg">Subcuentas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Administrar subcuentas con accesos privilegiados
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
