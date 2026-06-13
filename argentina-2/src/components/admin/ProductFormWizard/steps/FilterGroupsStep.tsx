import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Filter, Check } from 'lucide-react';
import { useFilters, Filter as FilterType } from '@/hooks/use-filters';
import { StepComponentProps } from '../types';

export const FilterGroupsStep: React.FC<StepComponentProps> = ({ 
  formData, 
  setFormData 
}) => {
  const { filters, loading } = useFilters();
  const [selectedFilterOptions, setSelectedFilterOptions] = useState<{ [filterId: string]: string[] }>(() => {
    // Inicializar desde formData si existe (para compatibilidad con el formato anterior)
    return {};
  });

  const toggleFilterOption = (filterId: string, optionId: string) => {
    setSelectedFilterOptions(prev => {
      const currentOptions = prev[filterId] || [];
      const newOptions = currentOptions.includes(optionId)
        ? currentOptions.filter(id => id !== optionId)
        : [...currentOptions, optionId];
      
      const updated = { ...prev, [filterId]: newOptions };
      
      // Actualizar formData con las opciones seleccionadas
      setFormData({
        ...formData,
        filterOptions: updated
      });
      
      return updated;
    });
  };

  // Cargar selecciones existentes cuando el componente se monta o cuando cambia formData
  useEffect(() => {
    if (formData.filterOptions) {
      setSelectedFilterOptions(formData.filterOptions);
    }
  }, [formData.filterOptions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Cargando filtros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros Disponibles
          {filters.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {filters.length}
            </Badge>
          )}
        </Label>

        {filters.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg bg-gray-50">
            <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-700 mb-1">No hay filtros disponibles</p>
            <p className="text-xs text-gray-500">
              Crea filtros en la sección "Gestión de Filtros" del panel de administración.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filters.map((filter) => (
              <div key={filter.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-gray-600" />
                  <h4 className="font-semibold text-sm text-gray-900">{filter.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {filter.options.length} opciones
                  </Badge>
                </div>
                
                {filter.options.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {filter.options.map((option) => {
                      const isSelected = selectedFilterOptions[filter.id]?.includes(option.id) || false;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleFilterOption(filter.id, option.id)}
                          className={`
                            px-3 py-1.5 rounded-lg text-sm border-2 transition-all
                            ${isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }
                          `}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected && <Check className="h-3 w-3" />}
                            <span>{option.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No hay opciones disponibles para este filtro</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtros Seleccionados */}
      {Object.values(selectedFilterOptions).flat().length > 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-900 mb-2">
            Opciones Seleccionadas ({Object.values(selectedFilterOptions).flat().length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const selectedOptions = selectedFilterOptions[filter.id] || [];
              return selectedOptions.map((optionId) => {
                const option = filter.options.find(opt => opt.id === optionId);
                return option ? (
                  <Badge key={optionId} variant="outline" className="bg-white border-green-300 text-green-700">
                    {filter.name}: {option.name}
                  </Badge>
                ) : null;
              });
            })}
          </div>
        </div>
      )}
    </div>
  );
};
