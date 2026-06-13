import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import {
  Folder, Sparkles, Plus, Home, Clock, List, Search, MoreVertical,
  ChevronDown, ChevronLeft, ChevronRight, Edit2, Trash2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FunnelRow {
  id: string;
  name: string;
  lastUpdated: string;
  steps: number;
}

export const FunnelsManager: React.FC = () => {
  const [funnels, setFunnels] = useState<FunnelRow[]>(() => {
    const saved = localStorage.getItem('admin_funnels');
    return saved ? JSON.parse(saved) : [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [editingFunnel, setEditingFunnel] = useState<FunnelRow | null>(null);

  const saveFunnels = (newFunnels: FunnelRow[]) => {
    setFunnels(newFunnels);
    localStorage.setItem('admin_funnels', JSON.stringify(newFunnels));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFunnelName.trim()) return;

    const now = new Date();
    // Formatear la fecha en español: "DD de MMM de AAAA, HH:MM" o similar
    const formattedDate = now.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const newFunnel: FunnelRow = {
      id: `f-${Date.now()}`,
      name: newFunnelName.trim(),
      lastUpdated: formattedDate,
      steps: 2 // Por defecto 2 pasos
    };

    saveFunnels([newFunnel, ...funnels]);
    setNewFunnelName('');
    setIsCreateOpen(false);
    toast({
      title: 'Funnel Creado',
      description: `El embudo "${newFunnel.name}" ha sido creado con éxito.`
    });
  };

  const handleEdit = (funnel: FunnelRow) => {
    setEditingFunnel(funnel);
    setNewFunnelName(funnel.name);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFunnel || !newFunnelName.trim()) return;

    const updated = funnels.map(f => {
      if (f.id === editingFunnel.id) {
        return { ...f, name: newFunnelName.trim() };
      }
      return f;
    });

    saveFunnels(updated);
    setEditingFunnel(null);
    setNewFunnelName('');
    toast({
      title: 'Funnel Actualizado',
      description: 'El nombre del embudo ha sido actualizado.'
    });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este embudo?')) return;
    const updated = funnels.filter(f => f.id !== id);
    saveFunnels(updated);
    toast({
      title: 'Funnel Eliminado',
      description: 'El embudo ha sido eliminado permanentemente.'
    });
  };

  const filteredFunnels = funnels.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 pt-1">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Funnels</h1>
          <p className="text-xs text-slate-500">
            Crea y gestiona embudos de venta para captar leads, programar citas y recibir pagos.
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Template Button */}
          <Button 
            variant="outline" 
            size="icon" 
            className="h-9 w-9 border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Plantillas"
          >
            <Folder className="h-4 w-4" />
          </Button>

          {/* Build with AI */}
          <Button 
            variant="outline" 
            className="h-9 px-3 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs flex items-center gap-1.5"
            onClick={() => {
              toast({
                title: 'Crear con IA',
                description: 'La inteligencia artificial está preparando tu nuevo embudo de ventas...'
              });
            }}
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-500 fill-violet-50" />
            <span>Crear con IA</span>
          </Button>

          {/* + New Funnel */}
          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nuevo funnel</span>
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Table Action Bar */}
        <div className="flex items-center justify-between p-3 border-b border-slate-200 gap-4">
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" title="Inicio">
              <Home className="h-4 w-4" />
            </Button>
            <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" title="Historial">
              <Clock className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 bg-blue-50/50 hover:bg-blue-50" title="Lista">
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Search box */}
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Buscar funnels"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Nombre</th>
                <th className="px-5 py-3 font-semibold">Última actualización</th>
                <th className="px-5 py-3 font-semibold">Pasos del funnel</th>
                <th className="px-5 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredFunnels.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                    No se encontraron funnels. Haz clic en "Nuevo funnel" para crear uno.
                  </td>
                </tr>
              ) : (
                filteredFunnels.map((funnel) => (
                  <tr key={funnel.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {funnel.name}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {funnel.lastUpdated}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {funnel.steps} {funnel.steps === 1 ? 'Paso' : 'Pasos'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuItem onClick={() => handleEdit(funnel)}>
                            <Edit2 className="h-3.5 w-3.5 mr-2" /> Cambiar Nombre
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(funnel.id)} className="text-red-600 focus:text-red-700">
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between p-3 border-t border-slate-200 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span>Filas por página</span>
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded cursor-pointer hover:bg-slate-100">
              <span>15</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span>1 - {filteredFunnels.length} de {filteredFunnels.length}</span>
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 pointer-events-none">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="h-6 w-6 border border-blue-600 bg-blue-50/35 text-blue-600 flex items-center justify-center font-semibold rounded text-[11px]">
                1
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 pointer-events-none">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog 
        open={isCreateOpen || editingFunnel !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingFunnel(null);
            setNewFunnelName('');
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-800">
              {editingFunnel ? 'Cambiar Nombre del Funnel' : 'Crear Nuevo Funnel'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingFunnel 
                ? 'Ingresa el nuevo nombre para tu embudo de ventas.' 
                : 'Ingresa un nombre para tu nuevo embudo de ventas.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editingFunnel ? handleSaveEdit : handleCreate} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 block uppercase">Nombre del Funnel</label>
              <Input
                placeholder="Ej. Lanzamiento de Invierno"
                value={newFunnelName}
                onChange={e => setNewFunnelName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateOpen(false);
                setEditingFunnel(null);
                setNewFunnelName('');
              }}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={editingFunnel ? handleSaveEdit : handleCreate}
              disabled={!newFunnelName.trim()}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editingFunnel ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FunnelsManager;
