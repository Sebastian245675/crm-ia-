import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { db } from '@/firebase';
import {
  MessageSquare, Trash2, Edit2, Save, X, Star, Search, Filter,
  CheckCircle, XCircle, Eye, EyeOff, MoreVertical, User
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

interface Comment {
  id: string;
  product_id?: string;
  product_name?: string;
  user_name: string;
  user_email?: string;
  rating: number;
  content: string;
  visible: boolean;
  created_at: string;
}

export const CommentsManager: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisible, setFilterVisible] = useState<'all' | 'visible' | 'hidden'>('all');
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const isSupabase = typeof (db as any)?.from === 'function';

  const loadComments = async () => {
    setLoading(true);
    try {
      if (isSupabase) {
        const { data, error } = await (db as any)
          .from('comments')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Error loading comments:', error);
          setComments([]);
        } else {
          setComments(data || []);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este comentario? Esta acción no se puede deshacer.')) return;
    try {
      if (isSupabase) {
        const { error } = await (db as any).from('comments').delete().eq('id', id);
        if (error) throw error;
      }
      toast({ title: 'Eliminado', description: 'Comentario eliminado correctamente.' });
      loadComments();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error?.message || 'No se pudo eliminar.' });
    }
  };

  const handleToggleVisibility = async (comment: Comment) => {
    try {
      if (isSupabase) {
        const { error } = await (db as any)
          .from('comments')
          .update({ visible: !comment.visible })
          .eq('id', comment.id);
        if (error) throw error;
      }
      toast({
        title: comment.visible ? 'Oculto' : 'Visible',
        description: comment.visible ? 'El comentario fue ocultado.' : 'El comentario ahora es visible.'
      });
      loadComments();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error?.message || 'Error al cambiar visibilidad.' });
    }
  };

  const handleEditSave = async () => {
    if (!editingComment || !editContent.trim()) return;
    try {
      if (isSupabase) {
        const { error } = await (db as any)
          .from('comments')
          .update({ content: editContent.trim() })
          .eq('id', editingComment.id);
        if (error) throw error;
      }
      toast({ title: 'Actualizado', description: 'Comentario editado correctamente.' });
      setEditDialogOpen(false);
      setEditingComment(null);
      setEditContent('');
      loadComments();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error?.message || 'Error al editar.' });
    }
  };

  const openEditDialog = (comment: Comment) => {
    setEditingComment(comment);
    setEditContent(comment.content);
    setEditDialogOpen(true);
  };

  const filteredComments = comments.filter(c => {
    const matchesSearch = !searchTerm ||
      c.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.product_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVisibility = filterVisible === 'all' ||
      (filterVisible === 'visible' && c.visible) ||
      (filterVisible === 'hidden' && !c.visible);

    return matchesSearch && matchesVisibility;
  });

  const avgRating = comments.length > 0
    ? (comments.reduce((sum, c) => sum + (c.rating || 0), 0) / comments.length).toFixed(1)
    : '0';

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      />
    ));
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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Comentarios y Reseñas</h1>
          <p className="text-slate-500 mt-1">
            Gestiona los comentarios de tus clientes. Edita, oculta o elimina reseñas.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{comments.length}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="h-5 w-5 text-yellow-600 fill-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{avgRating}</p>
              <p className="text-xs text-slate-500">Promedio</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Eye className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{comments.filter(c => c.visible).length}</p>
              <p className="text-xs text-slate-500">Visibles</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <EyeOff className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{comments.filter(c => !c.visible).length}</p>
              <p className="text-xs text-slate-500">Ocultos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, producto o contenido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterVisible === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterVisible('all')}
          >
            Todos
          </Button>
          <Button
            variant={filterVisible === 'visible' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterVisible('visible')}
          >
            <Eye className="h-4 w-4 mr-1" /> Visibles
          </Button>
          <Button
            variant={filterVisible === 'hidden' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterVisible('hidden')}
          >
            <EyeOff className="h-4 w-4 mr-1" /> Ocultos
          </Button>
        </div>
      </div>

      {/* Comments List */}
      {filteredComments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No hay comentarios</h3>
            <p className="text-sm">Los comentarios de tus clientes aparecerán aquí.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredComments.map((comment) => (
            <Card key={comment.id} className={`border transition-all ${!comment.visible ? 'opacity-60 border-dashed border-slate-300 bg-slate-50' : 'border-slate-200 bg-white'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-blue-600">
                        {comment.user_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">{comment.user_name}</span>
                        {comment.product_name && (
                          <Badge variant="outline" className="text-xs font-normal">
                            {comment.product_name}
                          </Badge>
                        )}
                        {!comment.visible && (
                          <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">
                            <EyeOff className="h-3 w-3 mr-1" /> Oculto
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex">{renderStars(comment.rating)}</div>
                        <span className="text-xs text-slate-400">
                          {comment.created_at ? new Date(comment.created_at).toLocaleDateString('es-AR', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          }) : ''}
                        </span>
                      </div>

                      <p className="text-sm text-slate-700 mt-2 leading-relaxed">{comment.content}</p>

                      {comment.user_email && (
                        <p className="text-xs text-slate-400 mt-1">{comment.user_email}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(comment)}>
                        <Edit2 className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleVisibility(comment)}>
                        {comment.visible ? (
                          <><EyeOff className="h-4 w-4 mr-2" /> Ocultar</>
                        ) : (
                          <><Eye className="h-4 w-4 mr-2" /> Mostrar</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(comment.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-blue-600" />
              Editar Comentario
            </DialogTitle>
          </DialogHeader>
          {editingComment && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User className="h-4 w-4" />
                <span className="font-medium">{editingComment.user_name}</span>
                <div className="flex ml-auto">{renderStars(editingComment.rating)}</div>
              </div>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="resize-none"
                placeholder="Contenido del comentario..."
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleEditSave}
              disabled={!editContent.trim()}
            >
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommentsManager;
