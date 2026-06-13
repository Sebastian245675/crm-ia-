import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { db, collection, addDoc, deleteDoc, doc, updateDoc, getDocs, query, orderBy } from '@/firebase';
import { Plus, Trash2, Edit2, Save, X, Filter, ChevronDown, ChevronRight } from 'lucide-react';

interface FilterOption {
  id: string;
  name: string;
  parentId: string;
  order: number;
}

interface Filter {
  id: string;
  name: string;
  order: number;
  options: FilterOption[];
}

export const FilterManager: React.FC = () => {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFilterName, setNewFilterName] = useState('');
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [editingFilterName, setEditingFilterName] = useState('');
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());

  // Estados para opciones de filtro
  const [newOptionName, setNewOptionName] = useState<{ [filterId: string]: string }>({});
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editingOptionName, setEditingOptionName] = useState('');

  const isSupabase = typeof (db as any)?.from === 'function';

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      setLoading(true);
      if (isSupabase) {
        // Implementación para Supabase
        const { data: filtersData, error: filtersError } = await db
          .from('filters')
          .select('*')
          .order('order', { ascending: true });

        if (filtersError) throw filtersError;

        const { data: optionsData, error: optionsError } = await db
          .from('filter_options')
          .select('*')
          .order('order', { ascending: true });

        if (optionsError) throw optionsError;

        const filtersWithOptions = (filtersData || []).map((filter: any) => ({
          id: filter.id,
          name: filter.name,
          order: filter.order || 0,
          options: (optionsData || [])
            .filter((opt: any) => opt.parent_id === filter.id)
            .map((opt: any) => ({
              id: opt.id,
              name: opt.name,
              parentId: opt.parent_id,
              order: opt.order || 0
            }))
        }));

        setFilters(filtersWithOptions);
      } else {
        // Implementación para Firebase
        const filtersSnapshot = await getDocs(query(collection(db, 'filters'), orderBy('order', 'asc')));
        const filtersData = await Promise.all(
          filtersSnapshot.docs.map(async (filterDoc) => {
            const optionsSnapshot = await getDocs(
              query(
                collection(db, 'filter_options'),
                orderBy('order', 'asc')
              )
            );

            const options = optionsSnapshot.docs
              .filter(optDoc => optDoc.data().parentId === filterDoc.id)
              .map(optDoc => ({
                id: optDoc.id,
                name: optDoc.data().name,
                parentId: optDoc.data().parentId,
                order: optDoc.data().order || 0
              }));

            return {
              id: filterDoc.id,
              name: filterDoc.data().name,
              order: filterDoc.data().order || 0,
              options
            };
          })
        );

        setFilters(filtersData);
      }
    } catch (error) {
      console.error('Error al cargar filtros:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los filtros',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFilter = async () => {
    if (!newFilterName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del filtro no puede estar vacío',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (isSupabase) {
        const { error } = await db.from('filters').insert({
          name: newFilterName.trim(),
          order: filters.length
        });

        if (error) throw error;
      } else {
        await addDoc(collection(db, 'filters'), {
          name: newFilterName.trim(),
          order: filters.length,
          createdAt: new Date()
        });
      }

      toast({
        title: 'Éxito',
        description: 'Filtro creado correctamente'
      });

      setNewFilterName('');
      fetchFilters();
    } catch (error) {
      console.error('Error al crear filtro:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el filtro',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteFilter = async (filterId: string) => {
    if (!confirm('¿Estás seguro de eliminar este filtro y todas sus opciones?')) return;

    try {
      if (isSupabase) {
        // Primero eliminar las opciones
        await db.from('filter_options').delete().eq('parent_id', filterId);
        // Luego eliminar el filtro
        await db.from('filters').delete().eq('id', filterId);
      } else {
        // Eliminar opciones del filtro
        const optionsSnapshot = await getDocs(collection(db, 'filter_options'));
        const deletePromises = optionsSnapshot.docs
          .filter(doc => doc.data().parentId === filterId)
          .map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // Eliminar filtro
        await deleteDoc(doc(db, 'filters', filterId));
      }

      toast({
        title: 'Éxito',
        description: 'Filtro eliminado correctamente'
      });

      fetchFilters();
    } catch (error) {
      console.error('Error al eliminar filtro:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el filtro',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateFilter = async (filterId: string) => {
    if (!editingFilterName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del filtro no puede estar vacío',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (isSupabase) {
        await db.from('filters').update({ name: editingFilterName.trim() }).eq('id', filterId);
      } else {
        await updateDoc(doc(db, 'filters', filterId), {
          name: editingFilterName.trim(),
          updatedAt: new Date()
        });
      }

      toast({
        title: 'Éxito',
        description: 'Filtro actualizado correctamente'
      });

      setEditingFilterId(null);
      setEditingFilterName('');
      fetchFilters();
    } catch (error) {
      console.error('Error al actualizar filtro:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el filtro',
        variant: 'destructive'
      });
    }
  };

  const handleAddOption = async (filterId: string) => {
    const optionName = newOptionName[filterId]?.trim();
    if (!optionName) {
      toast({
        title: 'Error',
        description: 'El nombre de la opción no puede estar vacío',
        variant: 'destructive'
      });
      return;
    }

    try {
      const filter = filters.find(f => f.id === filterId);
      const optionOrder = filter?.options.length || 0;

      if (isSupabase) {
        const { error } = await db.from('filter_options').insert({
          name: optionName,
          parent_id: filterId,
          order: optionOrder
        });

        if (error) throw error;
      } else {
        await addDoc(collection(db, 'filter_options'), {
          name: optionName,
          parentId: filterId,
          order: optionOrder,
          createdAt: new Date()
        });
      }

      toast({
        title: 'Éxito',
        description: 'Opción agregada correctamente'
      });

      setNewOptionName({ ...newOptionName, [filterId]: '' });
      fetchFilters();
    } catch (error) {
      console.error('Error al agregar opción:', error);
      toast({
        title: 'Error',
        description: 'No se pudo agregar la opción',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta opción?')) return;

    try {
      if (isSupabase) {
        await db.from('filter_options').delete().eq('id', optionId);
      } else {
        await deleteDoc(doc(db, 'filter_options', optionId));
      }

      toast({
        title: 'Éxito',
        description: 'Opción eliminada correctamente'
      });

      fetchFilters();
    } catch (error) {
      console.error('Error al eliminar opción:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la opción',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateOption = async (optionId: string) => {
    if (!editingOptionName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la opción no puede estar vacío',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (isSupabase) {
        await db.from('filter_options').update({ name: editingOptionName.trim() }).eq('id', optionId);
      } else {
        await updateDoc(doc(db, 'filter_options', optionId), {
          name: editingOptionName.trim(),
          updatedAt: new Date()
        });
      }

      toast({
        title: 'Éxito',
        description: 'Opción actualizada correctamente'
      });

      setEditingOptionId(null);
      setEditingOptionName('');
      fetchFilters();
    } catch (error) {
      console.error('Error al actualizar opción:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la opción',
        variant: 'destructive'
      });
    }
  };

  const toggleExpanded = (filterId: string) => {
    const newExpanded = new Set(expandedFilters);
    if (newExpanded.has(filterId)) {
      newExpanded.delete(filterId);
    } else {
      newExpanded.add(filterId);
    }
    setExpandedFilters(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestión de Filtros</h1>
        <p className="text-slate-600">
          Crea y gestiona filtros personalizados para tus productos
        </p>
      </div>

      {/* Agregar nuevo filtro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Crear Nuevo Filtro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Nombre del filtro (ej: Mililitros, Marca, Notas Principales)"
              value={newFilterName}
              onChange={(e) => setNewFilterName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddFilter()}
            />
            <Button onClick={handleAddFilter}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de filtros */}
      <div className="space-y-4">
        {filters.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No hay filtros creados aún</p>
              <p className="text-sm mt-2">Crea tu primer filtro para comenzar</p>
            </CardContent>
          </Card>
        ) : (
          filters.map((filter) => (
            <Card key={filter.id} className="overflow-hidden">
              <CardHeader className="bg-slate-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(filter.id)}
                      className="p-1 h-auto"
                    >
                      {expandedFilters.has(filter.id) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </Button>

                    {editingFilterId === filter.id ? (
                      <div className="flex gap-2 flex-1">
                        <Input
                          value={editingFilterName}
                          onChange={(e) => setEditingFilterName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateFilter(filter.id)}
                          autoFocus
                        />
                        <Button size="sm" onClick={() => handleUpdateFilter(filter.id)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingFilterId(null);
                            setEditingFilterName('');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <CardTitle className="flex items-center gap-2">
                          <Filter className="h-5 w-5 text-blue-600" />
                          {filter.name}
                        </CardTitle>
                        <Badge variant="secondary">{filter.options.length} opciones</Badge>
                      </>
                    )}
                  </div>

                  {editingFilterId !== filter.id && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingFilterId(filter.id);
                          setEditingFilterName(filter.name);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteFilter(filter.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              {expandedFilters.has(filter.id) && (
                <CardContent className="pt-4">
                  {/* Agregar nueva opción */}
                  <div className="flex gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
                    <Input
                      placeholder="Nueva opción (ej: 2.5, 5, 10, Dulces / Gourmand)"
                      value={newOptionName[filter.id] || ''}
                      onChange={(e) =>
                        setNewOptionName({ ...newOptionName, [filter.id]: e.target.value })
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handleAddOption(filter.id)}
                    />
                    <Button size="sm" onClick={() => handleAddOption(filter.id)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar
                    </Button>
                  </div>

                  {/* Lista de opciones */}
                  {filter.options.length === 0 ? (
                    <div className="text-center p-4 text-slate-500 text-sm">
                      No hay opciones aún. Agrega la primera opción arriba.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filter.options.map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          {editingOptionId === option.id ? (
                            <div className="flex gap-2 flex-1">
                              <Input
                                value={editingOptionName}
                                onChange={(e) => setEditingOptionName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateOption(option.id)}
                                autoFocus
                              />
                              <Button size="sm" onClick={() => handleUpdateOption(option.id)}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingOptionId(null);
                                  setEditingOptionName('');
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="text-slate-700">{option.name}</span>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingOptionId(option.id);
                                    setEditingOptionName(option.name);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteOption(option.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default FilterManager;
