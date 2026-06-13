import React, { useEffect, useState, useMemo } from 'react';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Edit, Trash2, History, ChevronDown, FileText, Plus } from 'lucide-react';
import { getInfoSection, getUserLibertaByEmail, upsertInfoSection } from "@/lib/info-sections";

interface SectionInfo {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  lastEdited: Date | null;
  lastEditedBy?: string;
  version?: number;
  history?: {
    content: string;
    timestamp: Date;
    editedBy: string;
  }[];
  meta?: {
    displayOrder?: number;
    icon?: string;
    category?: string;
    importance?: 'low' | 'medium' | 'high';
  };
}

const defaultSections = [
  { 
    id: 'faqs', 
    title: 'Ayuda rápida', 
    content: '', 
    enabled: false, 
    lastEdited: null,
    version: 1,
    meta: {
      displayOrder: 1,
      icon: 'help-circle',
      category: 'support',
      importance: 'high' as const
    }
  },
];

export const InfoManager: React.FC = () => {
  const isSupabase = typeof (db as any)?.from === 'function';
  const [sections, setSections] = useState<SectionInfo[]>(defaultSections);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const { user } = useAuth();
  const [liberta, setLiberta] = useState("no");
  const [activeTab, setActiveTab] = useState("all");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterImportance, setFilterImportance] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [historySection, setHistorySection] = useState<SectionInfo | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Verificar permisos del usuario
  useEffect(() => {
    const fetchLiberta = async () => {
      if (user && (user as any).email) {
        // Verificamos si es el usuario admin principal
        const lowEmail = (user as any).email?.toLowerCase();
        if (lowEmail === "admin@gmail.com" || lowEmail === "admin@tienda.com" || (user as any).isAdmin === true) {
          setLiberta("si"); // El admin siempre tiene permisos
          console.log("Usuario identificado como administrador, tiene permisos completos");
          return;
        }

        // Supabase: leer liberta desde tabla users (si existe)
        if (isSupabase) {
          const found = await getUserLibertaByEmail((user as any).email);
          setLiberta(found);
          return;
        }

        // Si no hay backend soportado, por defecto no
        setLiberta("no");
      }
    };
    fetchLiberta();
  }, [user, isSupabase]);

  useEffect(() => {
    const fetchSections = async () => {
      setLoading(true);
      try {
        const infos: SectionInfo[] = defaultSections.map(s => ({ ...s }));

        if (isSupabase) {
          const row = await getInfoSection("faqs");
          if (row) {
            infos[0] = {
              ...infos[0],
              content: row.content || "",
              enabled: row.enabled ?? false,
              lastEdited: row.lastEdited ? new Date(row.lastEdited) : null,
              lastEditedBy: row.lastEditedBy || "",
              version: row.version || 1,
              history: Array.isArray(row.history)
                ? row.history.map((h: any) => ({
                    content: String(h?.content ?? ""),
                    timestamp: h?.timestamp ? new Date(h.timestamp) : new Date(),
                    editedBy: String(h?.editedBy ?? "Usuario"),
                  }))
                : [],
            };
          }
          setSections(infos);
          return;
        }

        // Sin Supabase, mantener default local (no crashear)
        setSections(infos);
      } catch (e: any) {
        console.error("Error loading info sections:", e);
        toast({ title: "Error", description: "No se pudo cargar Ayuda rápida", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSections();
  }, [isSupabase]);
  
  // Filtrado de secciones usando useMemo
  const filteredSections = useMemo(() => {
    let result = [...sections];
    
    // Filtrar por búsqueda
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter(section => 
        section.title?.toLowerCase().includes(searchLower) ||
        section.content?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filtrar por categoría
    if (filterCategory) {
      result = result.filter(section => section.meta?.category === filterCategory);
    }
    
    // Filtrar por importancia
    if (filterImportance) {
      result = result.filter(section => section.meta?.importance === filterImportance);
    }
    
    // Filtrar por pestaña activa
    if (activeTab === 'enabled') {
      result = result.filter(section => section.enabled);
    } else if (activeTab === 'disabled') {
      result = result.filter(section => !section.enabled);
    }
    
    // Ordenar por el orden de visualización
    result.sort((a, b) => (a.meta?.displayOrder || 0) - (b.meta?.displayOrder || 0));
    
    return result;
  }, [sections, filterCategory, filterImportance, activeTab, searchQuery]);
  
  // Extraer las categorías únicas para el filtro
  const categories = useMemo(() => {
    const uniqueCategories = new Set(sections.map(s => s.meta?.category).filter(Boolean));
    return Array.from(uniqueCategories);
  }, [sections]);

  const handleEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  const handleSave = async (id: string) => {
    setLoading(true);
    try {
      const section = sections.find(s => s.id === id);
      if (!section) return;
      
      const timestamp = new Date();
      const editorName = (user as any)?.displayName || (user as any)?.email || "Usuario";
      
      // Preparar el historial
      const historyEntry = {
        content: section.content,
        timestamp,
        editedBy: editorName
      };
      
      const currentVersion = section.version || 1;
      const newVersion = currentVersion + 1;
      
      // Si el usuario tiene liberta o es administrador, realiza cambios directamente
      if (liberta === "si") {
        const history = [...(section.history || []), historyEntry];

        if (!isSupabase) {
          toast({ title: "No disponible", description: "Esta sección requiere Supabase configurado.", variant: "destructive" });
          return;
        }

        await upsertInfoSection({
          id,
          content: editContent,
          enabled: true,
          lastEdited: timestamp.toISOString(),
          lastEditedBy: editorName,
          version: newVersion,
          history: history.map((h) => ({
            content: h.content,
            timestamp: h.timestamp instanceof Date ? h.timestamp.toISOString() : new Date().toISOString(),
            editedBy: h.editedBy,
          })),
        });
        
        toast({
          title: "Sección actualizada",
          description: `La sección ${section.title} ha sido actualizada exitosamente (v${newVersion}).`,
        });
        
        // Actualizar el estado local
        setSections(currentSections => 
          currentSections.map(s => s.id === id ? { 
            ...s, 
            content: editContent, 
            enabled: true, 
            lastEdited: timestamp,
            lastEditedBy: editorName,
            version: newVersion,
            history: [...(s.history || []), historyEntry]
          } : s)
        );
      } else {
        // Si no tiene libertad, enviar a revisión
        // En Supabase, por ahora aplicamos directo (para que funcione).
        // Si luego quieres flujo de revisión, se crea tabla "revision".
        if (!isSupabase) {
          toast({ title: "No disponible", description: "Esta sección requiere Supabase configurado.", variant: "destructive" });
          return;
        }

        await upsertInfoSection({
          id,
          content: editContent,
          enabled: true,
          lastEdited: timestamp.toISOString(),
          lastEditedBy: editorName,
          version: newVersion,
          history: [...(section.history || []), historyEntry].map((h) => ({
            content: h.content,
            timestamp: h.timestamp instanceof Date ? h.timestamp.toISOString() : new Date().toISOString(),
            editedBy: h.editedBy,
          })),
        });
        
        toast({
          title: "Sección actualizada",
          description: `La sección ${section.title} ha sido actualizada exitosamente (v${newVersion}).`,
        });
      }
      
      setEditingId(null);
      setEditContent('');
      
    } catch (error) {
      console.error("Error al guardar:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la información. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnableToggle = async (id: string, enabled: boolean) => {
    setLoading(true);
    try {
      const section = sections.find(s => s.id === id);
      if (!section) return;
      
      const timestamp = new Date();
      const editorName = (user as any)?.displayName || (user as any)?.email || "Usuario";
      
      // Si el usuario tiene liberta o es administrador, realiza cambios directamente
      if (liberta === "si") {
        if (!isSupabase) {
          toast({ title: "No disponible", description: "Esta sección requiere Supabase configurado.", variant: "destructive" });
          return;
        }

        await upsertInfoSection({
          id,
          content: section.content || "",
          enabled,
          lastEdited: timestamp.toISOString(),
          lastEditedBy: editorName,
          version: section.version || 1,
          history: (section.history || []).map((h) => ({
            content: h.content,
            timestamp: h.timestamp instanceof Date ? h.timestamp.toISOString() : new Date().toISOString(),
            editedBy: h.editedBy,
          })),
        });
        
        setSections(sections.map(s => s.id === id ? { 
          ...s, 
          enabled,
          lastEdited: timestamp,
          lastEditedBy: editorName
        } : s));
        
        toast({
          title: `Sección ${enabled ? 'habilitada' : 'deshabilitada'}`,
          description: `La sección ${section.title} ha sido ${enabled ? 'habilitada' : 'deshabilitada'} exitosamente.`,
        });
      } else {
        // En Supabase, por ahora aplicamos directo (para que funcione).
        if (!isSupabase) {
          toast({ title: "No disponible", description: "Esta sección requiere Supabase configurado.", variant: "destructive" });
          return;
        }

        await upsertInfoSection({
          id,
          content: section.content || "",
          enabled,
          lastEdited: timestamp.toISOString(),
          lastEditedBy: editorName,
          version: section.version || 1,
          history: (section.history || []).map((h) => ({
            content: h.content,
            timestamp: h.timestamp instanceof Date ? h.timestamp.toISOString() : new Date().toISOString(),
            editedBy: h.editedBy,
          })),
        });
        
        toast({
          title: `Sección ${enabled ? 'habilitada' : 'deshabilitada'}`,
          description: `La sección ${section.title} ha sido ${enabled ? 'habilitada' : 'deshabilitada'} exitosamente.`,
        });
      }
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado de la sección. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Método para ver el historial de una sección
  const handleViewHistory = (section: SectionInfo) => {
    setHistorySection(section);
    setIsHistoryModalOpen(true);
  };
  
  // Método para restaurar una versión anterior
  const handleRestoreVersion = async (historyItem: { content: string; timestamp: any; editedBy: string }, sectionId: string) => {
    if (!historySection) return;
    
    setEditingId(sectionId);
    setEditContent(historyItem.content);
    setIsHistoryModalOpen(false);
    
    toast({
      title: "Versión cargada",
      description: `Se ha cargado la versión editada por ${historyItem.editedBy}. Guarde los cambios para confirmar la restauración.`,
    });
  };
  
  // Método para renderizar el icono según el nombre
  const renderIcon = (iconName: string) => {
    const iconMap: Record<string, JSX.Element> = {
      'info': (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12" y2="8"></line>
        </svg>
      ),
      'truck': (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13"></rect>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
          <circle cx="5.5" cy="18.5" r="2.5"></circle>
          <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
      ),
      'store': (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      'credit-card': (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      ),
      'help-circle': (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12" y2="17"></line>
        </svg>
      ),
      // Icono por defecto para manejar cualquier caso no definido
      'default': (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12" y2="8"></line>
        </svg>
      )
    };
    
    return iconMap[iconName] || iconMap['default'];
  };
  
  // Método para obtener el color de importancia
  const getImportanceColor = (importance: 'low' | 'medium' | 'high') => {
    switch(importance) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  // Método para obtener el texto de importancia
  const getImportanceText = (importance: 'low' | 'medium' | 'high') => {
    switch(importance) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return '';
    }
  };

  return (
    <div className="bg-white min-h-screen p-6">
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex items-center">
          <button className="px-4 py-2 text-sm font-semibold text-gray-900 border-b-2 border-blue-600">
            Ayuda rápida
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Administra el contenido de ayuda rápida
        </h2>
        {liberta !== "si" && (
          <div className="flex items-center bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 rounded-md text-sm mt-2 inline-flex">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Tus cambios requieren aprobación
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="🔍 buscar en contenido"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Table View */}
      {filteredSections.length === 0 && !loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
          <p className="text-lg font-semibold text-gray-700 mb-2">
            {sections.length === 0 ? "No hay secciones registradas" : "No se encontraron resultados"}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contenido</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última edición</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSections.map(section => {
                  const isEditing = editingId === section.id;
                  
                  return (
                    <tr key={section.id} className="hover:bg-gray-50 transition-colors">
                      {/* Nombre */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center mr-3 flex-shrink-0">
                            {section.meta?.icon ? renderIcon(section.meta.icon) : renderIcon('default')}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{section.title}</div>
                            <div className="flex gap-2 mt-1">
                              {section.meta?.category && (
                                <Badge variant="outline" className="text-xs">
                                  {section.meta.category.charAt(0).toUpperCase() + section.meta.category.slice(1)}
                                </Badge>
                              )}
                              {section.meta?.importance && (
                                <Badge className={`text-xs ${getImportanceColor(section.meta.importance)}`}>
                                  {getImportanceText(section.meta.importance)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contenido */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <textarea
                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                          />
                        ) : (
                          <div className="text-sm text-gray-900 max-w-md">
                            {section.content ? (
                              <div className="line-clamp-2">{section.content}</div>
                            ) : (
                              <span className="text-gray-400 italic">Sin información personalizada</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={section.enabled} 
                            onCheckedChange={(checked) => handleEnableToggle(section.id, checked)} 
                            disabled={loading || isEditing}
                          />
                          <span className={`text-xs font-semibold ${
                            section.enabled ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {section.enabled ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </td>

                      {/* Última edición */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {section.lastEdited ? (
                            <div>
                              <div>{section.lastEdited.toLocaleDateString()}</div>
                              <div className="text-xs text-gray-500">
                                {section.lastEdited.toLocaleTimeString()}
                                {section.lastEditedBy && ` • ${section.lastEditedBy}`}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin ediciones</span>
                          )}
                        </div>
                        {section.version && (
                          <Badge variant="outline" className="text-xs bg-blue-50 mt-1">
                            v{section.version}
                          </Badge>
                        )}
                      </td>

                      {/* Acción */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleSave(section.id)} 
                              disabled={loading}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Guardar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setEditingId(null);
                                setEditContent('');
                              }} 
                              disabled={loading}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(section.id, section.content)}
                              disabled={loading}
                              className="text-gray-400 hover:text-blue-600 transition-colors"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {section.history && section.history.length > 0 && (
                              <button
                                onClick={() => handleViewHistory(section)}
                                className="text-gray-400 hover:text-purple-600 transition-colors"
                                title={`Ver historial (${section.history.length} versiones)`}
                              >
                                <History className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Modal para historial de versiones */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Historial de versiones - {historySection?.title}</DialogTitle>
            <DialogDescription>
              A continuación se muestran todas las versiones anteriores de este contenido.
            </DialogDescription>
          </DialogHeader>
          
          {historySection?.history && Array.isArray(historySection.history) && historySection.history.length > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto space-y-4 p-1">
              {historySection.history.map((item, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium">
                      Versión {index + 1} 
                      <span className="ml-2 text-gray-500">
                        {item.timestamp
                          ? `(${(item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp)).toLocaleString()})`
                          : '(Fecha no disponible)'}
                      </span>
                    </div>
                    <Badge variant="outline">Editado por {item.editedBy || 'Usuario desconocido'}</Badge>
                  </div>
                  <div className="bg-slate-50 p-2 rounded text-sm mb-2 whitespace-pre-wrap">
                    {item.content || <span className="text-gray-400 italic">Sin contenido</span>}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleRestoreVersion(item, historySection.id)}
                    className="w-full mt-1"
                  >
                    Restaurar esta versión
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded text-center">
              No hay versiones anteriores disponibles para este contenido.
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {filteredSections.length === 0 && !loading && (
        <Alert className="bg-slate-50">
          <AlertDescription>
            No se encontraron secciones que coincidan con los filtros aplicados.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default InfoManager;
