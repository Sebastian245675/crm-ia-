import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { db, getAuthHeaders } from '@/firebase';
import { 
  Upload, 
  Trash2, 
  Copy, 
  FileText, 
  Video, 
  Image as ImageIcon, 
  Search, 
  Plus, 
  X, 
  ExternalLink, 
  File,
  Check,
  Folder,
  FolderPlus,
  ArrowLeft,
  Move
} from 'lucide-react';

interface MediaItem {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  created_at: string;
  folder_id?: string | null;
}

export const MediaLibrary: React.FC = () => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video' | 'other'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folders and navigation states
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [movingItem, setMovingItem] = useState<MediaItem | null>(null);

  const isSupabase = typeof (db as any)?.from === 'function';

  const loadMedia = async () => {
    setLoading(true);
    try {
      if (isSupabase) {
        const { data, error } = await db.from('media_library').select('*');
        if (error) throw error;
        // Ordenar por fecha de creación desc
        const items = (data || []).sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setMediaItems(items);
      }
    } catch (e: any) {
      console.error('Error loading media library:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleUpload(files[0]);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simular progreso de subida
      let progress = 10;
      const progressInterval = setInterval(() => {
        progress += 15;
        if (progress >= 90) {
          clearInterval(progressInterval);
        } else {
          setUploadProgress(progress);
        }
      }, 100);

      const authToken = localStorage.getItem('auth_access_token');
      const uploadUrl = authToken
        ? `${window.location.origin}/api/upload?access_token=${encodeURIComponent(authToken)}`
        : `${window.location.origin}/api/upload`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.url) {
        setUploadProgress(100);

        // Guardar metadata en db
        const newItem: MediaItem = {
          id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          url: data.url,
          size: file.size,
          type: file.type || 'application/octet-stream',
          created_at: new Date().toISOString(),
          folder_id: currentFolderId
        };

        const { error } = await db.from('media_library').upsert(newItem);
        if (error) throw error;

        toast({
          title: "✅ Archivo subido",
          description: `"${file.name}" se subió y registró correctamente en tu biblioteca.`,
          className: "bg-green-50 border-green-200"
        });

        loadMedia();
      } else {
        throw new Error(data.message || "Error al procesar el archivo en el servidor.");
      }
    } catch (error: any) {
      console.error('Error uploading to media library:', error);
      toast({
        variant: "destructive",
        title: "Error al subir archivo",
        description: error.message || "Ocurrió un error al procesar el archivo."
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar "${name}" de tu biblioteca?`)) return;

    try {
      const { error } = await db.from('media_library').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: "Archivo eliminado",
        description: `"${name}" fue eliminado de tu biblioteca.`
      });

      loadMedia();
    } catch (e: any) {
      console.error('Error deleting media item:', e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el archivo."
      });
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const newFolder: MediaItem = {
        id: `folder-${Date.now()}`,
        name: name,
        url: '',
        size: 0,
        type: 'folder',
        created_at: new Date().toISOString(),
        folder_id: null
      };

      const { error } = await db.from('media_library').upsert(newFolder);
      if (error) throw error;

      toast({
        title: "Carpeta creada",
        description: `La carpeta "${name}" se ha creado con éxito.`
      });
      setNewFolderName('');
      setIsCreateFolderOpen(false);
      loadMedia();
    } catch (e: any) {
      console.error('Error creating folder:', e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear la carpeta."
      });
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la carpeta "${folderName}"? Los archivos que contiene se moverán a la raíz.`)) return;
    try {
      // 1. Move all children back to root
      const children = mediaItems.filter(item => item.folder_id === folderId);
      for (const child of children) {
        await db.from('media_library').upsert({ ...child, folder_id: null });
      }

      // 2. Delete the folder
      const { error } = await db.from('media_library').delete().eq('id', folderId);
      if (error) throw error;

      toast({
        title: "Carpeta eliminada",
        description: `"${folderName}" fue eliminada. Los archivos se movieron a la raíz.`
      });
      
      // If we are currently inside the deleted folder, navigate back to root
      if (currentFolderId === folderId) {
        setCurrentFolderId(null);
      }

      loadMedia();
    } catch (e: any) {
      console.error('Error deleting folder:', e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la carpeta."
      });
    }
  };

  const handleMoveToFolder = async (itemId: string, targetFolderId: string | null) => {
    try {
      const item = mediaItems.find(i => i.id === itemId);
      if (!item) return;

      const updatedItem = { ...item, folder_id: targetFolderId };
      const { error } = await db.from('media_library').upsert(updatedItem);
      if (error) throw error;

      toast({
        title: "Archivo movido",
        description: `El archivo se movió al destino seleccionado.`
      });
      setMovingItem(null);
      loadMedia();
    } catch (e: any) {
      console.error('Error moving item:', e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo mover el archivo."
      });
    }
  };

  const copyLink = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      toast({
        title: "Enlace copiado",
        description: "El enlace público del archivo fue copiado al portapapeles.",
        className: "bg-blue-50 border-blue-200"
      });
    }).catch(() => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo copiar el enlace."
      });
    });
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const filteredItems = mediaItems.filter(item => {
    // If searching, search globally
    const nameMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (searchQuery !== '') {
      // Don't show folder items in type-filtered search results unless filter is 'all'
      if (item.type === 'folder') {
        return typeFilter === 'all' && nameMatch;
      }
      if (typeFilter === 'all') return nameMatch;
      if (typeFilter === 'image') return nameMatch && item.type.startsWith('image/');
      if (typeFilter === 'video') return nameMatch && item.type.startsWith('video/');
      if (typeFilter === 'other') return nameMatch && !item.type.startsWith('image/') && !item.type.startsWith('video/');
      return nameMatch;
    }

    // Standard folder browsing
    const folderMatch = (item.folder_id || null) === (currentFolderId || null);
    
    // If it's a folder item, it has folder_id === null/undefined itself. We only show it at Root and when filter is 'all'
    if (item.type === 'folder') {
      return currentFolderId === null && typeFilter === 'all';
    }

    // For file items:
    if (!folderMatch) return false;
    if (typeFilter === 'all') return true;
    if (typeFilter === 'image') return item.type.startsWith('image/');
    if (typeFilter === 'video') return item.type.startsWith('video/');
    if (typeFilter === 'other') return !item.type.startsWith('image/') && !item.type.startsWith('video/');
    return true;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ImageIcon className="h-5.5 w-5.5 text-blue-600" />
            Biblioteca de Contenido Multimedia
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Sube, almacena y gestiona archivos multimedia para utilizarlos en tus páginas o campañas.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <Button
            onClick={() => setIsCreateFolderOpen(true)}
            variant="outline"
            className="border-slate-200 text-slate-700 font-semibold flex items-center gap-2 shadow-sm transition-all hover:bg-slate-50"
          >
            <FolderPlus className="h-4 w-4 text-slate-500" />
            Nueva Carpeta
          </Button>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            {uploading ? (
              <>
                <LoaderIcon className="animate-spin h-4 w-4" />
                Cargando... {Math.round(uploadProgress)}%
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Subir Archivo
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {(currentFolderId !== null || searchQuery !== '') && (
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/50 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 animate-in fade-in duration-200">
          {searchQuery !== '' ? (
            <div className="flex items-center gap-1.5 text-blue-600">
              <Search className="h-3.5 w-3.5" />
              <span>Resultados de búsqueda global para "{searchQuery}"</span>
              <button 
                onClick={() => setSearchQuery('')}
                className="ml-2 text-slate-400 hover:text-slate-655 underline font-bold"
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={() => setCurrentFolderId(null)}
                className="text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1"
              >
                Biblioteca
              </button>
              <span className="text-slate-300">/</span>
              <span className="text-slate-800 flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 text-blue-500 fill-blue-50/50" />
                {mediaItems.find(i => i.id === currentFolderId)?.name || 'Carpeta'}
              </span>
              <button 
                onClick={() => setCurrentFolderId(null)}
                className="ml-auto flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-all font-bold text-[11px]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver a la raíz
              </button>
            </>
          )}
        </div>
      )}

      {uploading && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-blue-700">
            <span>Subiendo archivo al servidor...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2 bg-blue-100" />
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar archivo por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9.5 bg-white border-slate-200 text-sm focus:border-blue-400 focus:bg-white text-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'image', label: 'Imágenes' },
            { id: 'video', label: 'Videos' },
            { id: 'other', label: 'Otros' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setTypeFilter(filter.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === filter.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Media Items Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 py-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square bg-slate-100 animate-pulse rounded-xl border border-slate-200"></div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
          <ImageIcon className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-slate-700 font-bold text-base">No hay archivos en tu biblioteca</h3>
          <p className="text-slate-500 text-xs mt-1">Sube tu primer archivo usando el botón superior.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredItems.map(item => {
            // Folders logic
            if (item.type === 'folder') {
              return (
                <Card 
                  key={item.id} 
                  onClick={() => setCurrentFolderId(item.id)}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer animate-in fade-in duration-200"
                >
                  <div className="aspect-square w-full bg-slate-50/50 relative border-b border-slate-100 flex flex-col items-center justify-center overflow-hidden">
                    <Folder className="h-14 w-14 text-blue-500 fill-blue-50/50 group-hover:scale-105 transition-transform duration-200" />
                    <span className="text-[10px] uppercase font-extrabold tracking-wider mt-2.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      Carpeta
                    </span>
                  </div>
                  
                  <div className="p-3 space-y-1 text-left flex-1 flex flex-col justify-between bg-slate-50/20">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate" title={item.name}>
                        {item.name}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {mediaItems.filter(f => f.folder_id === item.id).length} archivos
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                      <span className="text-[8px] text-slate-400 font-mono">
                        {new Date(item.created_at).toLocaleDateString('es-AR')}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(item.id, item.name);
                        }}
                        className="text-slate-400 hover:text-red-650 transition-colors p-0.5 rounded"
                        title="Eliminar carpeta"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            }

            const isImg = item.type.startsWith('image/');
            const isVid = item.type.startsWith('video/');
            const isDoc = item.type.startsWith('text/') || item.type.includes('pdf') || item.type.includes('document') || item.type.includes('sheet');

            return (
              <Card key={item.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between animate-in fade-in duration-200">
                <div className="aspect-square w-full bg-slate-50 relative border-b border-slate-100 flex items-center justify-center overflow-hidden">
                  {isImg ? (
                    <img 
                      src={item.url} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  ) : isVid ? (
                    <div className="flex flex-col items-center justify-center text-blue-600">
                      <Video className="h-10 w-10 text-blue-500" />
                      <span className="text-[10px] uppercase font-bold tracking-wider mt-1 text-slate-400">Video</span>
                    </div>
                  ) : isDoc ? (
                    <div className="flex flex-col items-center justify-center text-amber-600">
                      <FileText className="h-10 w-10 text-amber-500" />
                      <span className="text-[10px] uppercase font-bold tracking-wider mt-1 text-slate-400">Doc</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <File className="h-10 w-10 text-slate-400" />
                      <span className="text-[10px] uppercase font-bold tracking-wider mt-1 text-slate-400">Archivo</span>
                    </div>
                  )}

                  {/* Quick copy overlay on hover */}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => copyLink(item.url)}
                      className="h-8.5 w-8.5 rounded-full bg-white text-slate-700 hover:bg-slate-100 hover:text-blue-600 shadow cursor-pointer animate-in zoom-in-50 duration-150"
                      title="Copiar enlace"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => setMovingItem(item)}
                      className="h-8.5 w-8.5 rounded-full bg-white text-slate-700 hover:bg-slate-100 hover:text-blue-600 shadow cursor-pointer animate-in zoom-in-50 duration-150"
                      title="Mover de carpeta"
                    >
                      <Move className="h-4 w-4" />
                    </Button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8.5 w-8.5 rounded-full bg-white flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-blue-600 shadow animate-in zoom-in-50 duration-150"
                      title="Abrir en pestaña nueva"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                <div className="p-3 space-y-1 text-left flex-1 flex flex-col justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      {formatBytes(item.size)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                    <span className="text-[8px] text-slate-400 font-mono">
                      {new Date(item.created_at).toLocaleDateString('es-AR')}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setMovingItem(item)}
                        className="text-slate-400 hover:text-blue-600 transition-colors p-0.5 rounded"
                        title="Mover a carpeta"
                      >
                        <Move className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="text-slate-400 hover:text-red-650 transition-colors p-0.5 rounded"
                        title="Eliminar archivo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: Create Folder */}
      {isCreateFolderOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm rounded-2xl border-slate-100 shadow-xl overflow-hidden bg-white">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 flex items-center gap-2 text-base">
                <FolderPlus className="h-5 w-5 text-blue-600" />
                Crear Nueva Carpeta
              </h3>
              <button 
                onClick={() => setIsCreateFolderOpen(false)}
                className="text-slate-450 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="folder-name" className="text-xs font-bold text-slate-500 uppercase">Nombre de la carpeta</Label>
                <Input 
                  id="folder-name"
                  placeholder="Ej. Campaña Navidad, Productos"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="rounded-xl border-slate-200"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                  }}
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateFolderOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateFolder}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
              >
                Crear Carpeta
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Dialog: Move File */}
      {movingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <Card className="w-full max-w-md rounded-2xl border-slate-100 shadow-xl overflow-hidden bg-white">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 flex items-center gap-2 text-base">
                <Move className="h-5 w-5 text-blue-600" />
                Mover Archivo
              </h3>
              <button 
                onClick={() => setMovingItem(null)}
                className="text-slate-450 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs font-semibold text-slate-500 mb-2">
                Selecciona el destino para: <span className="font-bold text-slate-800">{movingItem.name}</span>
              </p>
              
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto border border-slate-200/50 rounded-xl p-1 bg-slate-50/20">
                {/* Root Option */}
                <button
                  onClick={() => handleMoveToFolder(movingItem.id, null)}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                    movingItem.folder_id === null
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <ImageIcon className="h-4.5 w-4.5 text-slate-400" />
                  <span className="text-xs font-semibold">Biblioteca Principal (Raíz)</span>
                  {movingItem.folder_id === null && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                </button>
                
                {/* Folders list */}
                {mediaItems
                  .filter(item => item.type === 'folder' && item.id !== movingItem.id)
                  .map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => handleMoveToFolder(movingItem.id, folder.id)}
                      className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                        movingItem.folder_id === folder.id
                          ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Folder className="h-4.5 w-4.5 text-blue-500 fill-blue-50/50" />
                      <span className="text-xs font-semibold">{folder.name}</span>
                      {movingItem.folder_id === folder.id && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                    </button>
                  ))}
                  
                {mediaItems.filter(item => item.type === 'folder').length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500 italic">
                    No hay carpetas creadas. Crea una carpeta primero.
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <Button 
                variant="outline" 
                onClick={() => setMovingItem(null)}
                className="rounded-xl"
              >
                Cerrar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

const LoaderIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
