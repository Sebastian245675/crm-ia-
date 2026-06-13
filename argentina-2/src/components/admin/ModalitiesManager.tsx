import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { db } from '@/firebase';
import { Plus, Trash2, Save, X, Edit2, Sliders, Check, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string;
  required: boolean;
}

interface Modality {
  id: string;
  name: string;
  fields: FieldDefinition[];
}

export const ModalitiesManager: React.FC = () => {
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [fields, setFields] = useState<FieldDefinition[]>([]);

  // Field Add State
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'select' | 'boolean'>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  const isSupabase = typeof (db as any)?.from === 'function';

  useEffect(() => {
    fetchModalities();
  }, []);

  const fetchModalities = async () => {
    setLoading(true);
    try {
      if (isSupabase) {
        const { data, error } = await db.from('product_templates').select('*');
        if (error) throw error;
        
        // El db.from('product_templates') devolverá un array de registros
        // mapeados por el dbController desde el JSON 'datos'
        setModalities(data || []);
      }
    } catch (e: any) {
      console.error('Error fetching templates:', e);
      toast({
        variant: "destructive",
        title: "Error al cargar modalidades",
        description: e.message || "Ocurrió un error en el servidor."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      toast({
        variant: "destructive",
        title: "Campo inválido",
        description: "El nombre del campo para mostrar (Label) es requerido."
      });
      return;
    }

    const fieldKey = newFieldName.trim() ? slugify(newFieldName) : slugify(newFieldLabel);
    
    // Validar duplicados
    if (fields.some(f => f.name === fieldKey)) {
      toast({
        variant: "destructive",
        title: "Campo duplicado",
        description: "Ya existe un campo con este identificador."
      });
      return;
    }

    const newField: FieldDefinition = {
      name: fieldKey,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      options: newFieldType === 'select' ? newFieldOptions.trim() : undefined
    };

    setFields([...fields, newField]);
    
    // Reset inputs
    setNewFieldName('');
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldOptions('');
    setNewFieldRequired(false);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setFields([]);
    setIsFormOpen(true);
  };

  const handleEdit = (modality: Modality) => {
    setEditingId(modality.id);
    setName(modality.name);
    setFields(modality.fields || []);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El nombre de la modalidad es requerido."
      });
      return;
    }

    setSaving(true);
    const modalityId = editingId || slugify(name);
    const modalityData = {
      id: modalityId,
      name: name.trim(),
      fields
    };

    try {
      if (isSupabase) {
        // Usar upsert que es mapeado por el db.controller
        const { error } = await db.from('product_templates').upsert(modalityData);
        if (error) throw error;

        toast({
          title: editingId ? "Modalidad actualizada" : "Modalidad creada",
          description: `La modalidad "${name}" se guardó correctamente.`
        });
        
        setIsFormOpen(false);
        fetchModalities();
      }
    } catch (e: any) {
      console.error('Error saving modality:', e);
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: e.message || "Ocurrió un error."
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, modalityName: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la modalidad "${modalityName}"?`)) return;

    try {
      if (isSupabase) {
        const { error } = await db.from('product_templates').delete().eq('id', id);
        if (error) throw error;

        toast({
          title: "Modalidad eliminada",
          description: "La modalidad fue eliminada correctamente."
        });
        fetchModalities();
      }
    } catch (e: any) {
      console.error('Error deleting template:', e);
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: e.message || "Ocurrió un error."
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Sliders className="h-6 w-6 text-blue-600" />
            Modalidades y Plantillas de Producto
          </h2>
          <p className="text-sm text-slate-500">
            Define conjuntos de campos personalizados para diferentes tipos de negocios (Inmobiliaria, Autos, etc.)
          </p>
        </div>
        {!isFormOpen && (
          <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Modalidad
          </Button>
        )}
      </div>

      {isFormOpen ? (
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>{editingId ? 'Editar Modalidad' : 'Crear Nueva Modalidad'}</CardTitle>
              <CardDescription>Configure el nombre y agregue los campos que los productos de esta modalidad requerirán.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="modality-name">Nombre de la Modalidad</Label>
                <Input
                  id="modality-name"
                  placeholder="Ej: Inmobiliaria, Vehículos, Servicios"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11"
                  disabled={!!editingId}
                />
              </div>

              {/* Agregar Campos */}
              <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
                  <Settings className="h-4 w-4 text-slate-600" />
                  Agregar Campo a la Plantilla
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="field-label" className="text-xs">Nombre para Mostrar (Label)</Label>
                    <Input
                      id="field-label"
                      placeholder="Ej: Metros Cuadrados"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      className="bg-white h-10"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="field-name" className="text-xs">ID Técnico (Opcional - Autogenerado)</Label>
                    <Input
                      id="field-name"
                      placeholder="Ej: metros_cuadrados"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      className="bg-white h-10"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de Campo</Label>
                    <Select
                      value={newFieldType}
                      onValueChange={(val: any) => setNewFieldType(val)}
                    >
                      <SelectTrigger className="bg-white h-10">
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="select">Selección Desplegable</SelectItem>
                        <SelectItem value="boolean">Casilla de Verificación (Sí/No)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newFieldType === 'select' && (
                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor="field-options" className="text-xs">Opciones (separadas por comas)</Label>
                      <Input
                        id="field-options"
                        placeholder="Ej: Casa, Departamento, Lote, Local"
                        value={newFieldOptions}
                        onChange={(e) => setNewFieldOptions(e.target.value)}
                        className="bg-white h-10"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="field-required"
                      checked={newFieldRequired}
                      onCheckedChange={setNewFieldRequired}
                    />
                    <Label htmlFor="field-required" className="text-xs font-semibold text-slate-700 cursor-pointer">Requerido</Label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={handleAddField} className="bg-slate-800 hover:bg-slate-900 text-white gap-1">
                    <Plus className="h-4 w-4" /> Agregar Campo
                  </Button>
                </div>
              </div>

              {/* Lista de campos actuales */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800 text-sm">Campos definidos ({fields.length})</h4>
                {fields.length === 0 ? (
                  <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center text-sm text-slate-400">
                    Aún no se han definido campos personalizados. Agrega al menos uno arriba.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 font-semibold text-slate-700">Etiqueta (Label)</th>
                          <th className="px-4 py-2 font-semibold text-slate-700">Identificador</th>
                          <th className="px-4 py-2 font-semibold text-slate-700">Tipo</th>
                          <th className="px-4 py-2 font-semibold text-slate-700">Restricciones</th>
                          <th className="px-4 py-2 font-semibold text-slate-700 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {fields.map((field, idx) => (
                          <tr key={field.name} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 font-medium text-slate-900">{field.label}</td>
                            <td className="px-4 py-2 font-mono text-xs text-slate-500">{field.name}</td>
                            <td className="px-4 py-2">
                              <Badge variant="outline" className="capitalize">
                                {field.type === 'boolean' ? 'Sí/No' : field.type}
                              </Badge>
                            </td>
                            <td className="px-4 py-2">
                              {field.required && <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px]">Requerido</Badge>}
                              {field.options && <span className="text-xs text-slate-500 ml-1">Opciones: {field.options}</span>}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveField(idx)}
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {editingId ? 'Actualizar Modalidad' : 'Crear Modalidad'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* Listado de modalidades */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Default Standard Modality (Visual reference) */}
          <Card className="border-slate-200 opacity-90 shadow-sm relative overflow-hidden bg-slate-50">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Por defecto (E-commerce)</CardTitle>
                  <CardDescription className="mt-1">Plantilla estándar de la tienda</CardDescription>
                </div>
                <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 font-bold uppercase text-[9px]">
                  Fijo
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs text-slate-500 space-y-1">
                <p>• Nombre, descripción, categoría</p>
                <p>• Precio, costo, stock, imágenes</p>
                <p>• Especificaciones, ofertas, decants, beneficios</p>
              </div>
              <div className="pt-4 border-t border-slate-200 text-xs italic text-slate-400">
                Esta es la modalidad estándar y no se puede modificar.
              </div>
            </CardContent>
          </Card>

          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="border-slate-200 animate-pulse">
                <CardContent className="h-48"></CardContent>
              </Card>
            ))
          ) : modalities.length === 0 ? (
            <div className="col-span-full py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
              <Sliders className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No hay modalidades personalizadas</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">
                Comienza creando una modalidad para poder publicar inmuebles, vehículos u otros productos con sus propios campos.
              </p>
              <Button onClick={handleOpenCreate} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                Crear Modalidad
              </Button>
            </div>
          ) : (
            modalities.map((mod) => (
              <Card key={mod.id} className="border-slate-200 hover:border-slate-300 shadow-sm hover:shadow transition-all bg-white relative group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg text-slate-900 group-hover:text-blue-600 transition-colors">{mod.name}</CardTitle>
                      <CardDescription className="mt-1">ID: {mod.id}</CardDescription>
                    </div>
                    <Badge className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50 font-bold uppercase text-[9px]">
                      {mod.fields?.length || 0} campos
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-xs text-slate-600 space-y-1.5 min-h-[60px] max-h-[80px] overflow-y-auto">
                    {mod.fields && mod.fields.length > 0 ? (
                      mod.fields.map(f => (
                        <p key={f.name}>
                          <strong>• {f.label}:</strong> <span className="text-slate-500 font-mono text-[10px]">({f.type}{f.required ? ', req' : ''})</span>
                        </p>
                      ))
                    ) : (
                      <p className="text-slate-400 italic">Sin campos definidos.</p>
                    )}
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(mod)}
                      className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 text-xs flex items-center gap-1.5 h-8 px-2.5"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(mod.id, mod.name)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs flex items-center gap-1.5 h-8 px-2.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};
