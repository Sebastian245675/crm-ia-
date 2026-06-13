import React, { useEffect, useState } from "react";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle, Eye, Trash2, FilePlus2, Edit2, XCircle,
  ArrowRightLeft, ArrowLeft, ArrowRight, AlertCircle
} from "lucide-react";
import { CustomClock } from '@/components/ui/CustomClock';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export const RevisionList: React.FC = () => {
  const { user } = useAuth();
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  // Estado para el diálogo de comparación
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentRevision, setCurrentRevision] = useState<any | null>(null);
  const [currentData, setCurrentData] = useState<any | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const isSupabase = typeof (db as any)?.from === 'function';

  const fetchRevisions = async () => {
    setLoading(true);
    try {
      if (isSupabase) {
        const { data, error } = await (db as any)
          .from('revision')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Error loading revisions:', error);
          setRevisions([]);
        } else {
          setRevisions(data || []);
        }
      } else {
        setRevisions([]);
      }
    } catch (error) {
      console.error('Error fetching revisions:', error);
      setRevisions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevisions();
  }, []);

  const handleApprove = async (revision: any) => {
    if (!isSupabase) {
      toast({ title: 'Error', description: 'Base de datos no configurada.', variant: 'destructive' });
      return;
    }
    try {
      if (revision.type === 'add') {
        const productData = { ...revision.data };
        delete productData.id;
        productData.created_by = revision.editorEmail || 'unknown';
        productData.last_modified_by = revision.editorEmail || 'unknown';
        const { error } = await (db as any).from('products').insert([productData]);
        if (error) throw error;
      } else if (revision.type === 'edit' && revision.data?.id) {
        const updateData = { ...revision.data };
        const productId = updateData.id;
        delete updateData.id;
        updateData.last_modified_by = revision.editorEmail || 'unknown';
        const { error } = await (db as any).from('products').update(updateData).eq('id', productId);
        if (error) throw error;
      } else if (revision.type === 'delete' && revision.data?.id) {
        if (window.confirm('¿Eliminar este producto permanentemente?')) {
          const { error } = await (db as any).from('products').delete().eq('id', revision.data.id);
          if (error) throw error;
        } else {
          toast({ title: 'Cancelado', description: 'La eliminación fue cancelada.' });
          return;
        }
      } else if (revision.type === 'info_edit' && revision.sectionId) {
        const { error } = await (db as any).from('info_sections').update({ content: revision.data.content }).eq('id', revision.sectionId);
        if (error) throw error;
      } else if (revision.type === 'info_toggle' && revision.sectionId) {
        const { error } = await (db as any).from('info_sections').update({ enabled: revision.data.enabled }).eq('id', revision.sectionId);
        if (error) throw error;
      }

      // Eliminar revisión después de aplicar
      const { error: delError } = await (db as any).from('revision').delete().eq('id', revision.id);
      if (delError) throw delError;

      toast({
        title: 'Cambio aplicado',
        description: revision.type === 'delete' ? 'Producto eliminado permanentemente.' : 'Revisión aprobada y aplicada.'
      });
      fetchRevisions();
      setSelected(null);
      setDialogOpen(false);
    } catch (e: any) {
      console.error('Error al aprobar revisión:', e);
      toast({ title: 'Error', description: e?.message || 'No se pudo aprobar la revisión.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!isSupabase) return;
    try {
      const revision = revisions.find(r => r.id === id);

      if (revision?.type === 'delete' && revision?.data?.id && user?.role === 'admin') {
        if (window.confirm('¿Desea eliminar también el producto?')) {
          const { error: prodError } = await (db as any).from('products').delete().eq('id', revision.data.id);
          if (prodError) {
            toast({ title: 'Error', description: 'No se pudo eliminar el producto.', variant: 'destructive' });
          } else {
            toast({ title: 'Producto eliminado', description: `${revision.data.name || 'Producto'} eliminado.` });
          }
        }
      }

      const { error } = await (db as any).from('revision').delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Revisión eliminada', description: 'La revisión fue eliminada correctamente.' });
      fetchRevisions();
      setSelected(null);
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Error al eliminar revisión:', error);
      toast({ title: 'Error', description: error?.message || 'Error al eliminar la revisión.', variant: 'destructive' });
    }
  };

  const handleViewChanges = async (revision: any) => {
    setCurrentRevision(revision);
    setLoadingCompare(true);
    setDialogOpen(true);

    try {
      if (isSupabase) {
        if (revision.type === 'edit' && revision.data?.id) {
          const { data, error } = await (db as any).from('products').select('*').eq('id', revision.data.id).maybeSingle();
          setCurrentData(error ? null : data);
        } else if (revision.type === 'info_edit' && revision.sectionId) {
          const { data, error } = await (db as any).from('info_sections').select('*').eq('id', revision.sectionId).maybeSingle();
          setCurrentData(error ? null : data);
        } else {
          setCurrentData(null);
        }
      } else {
        setCurrentData(null);
      }
    } catch (error) {
      console.error('Error al cargar datos para comparación:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos actuales', variant: 'destructive' });
      setCurrentData(null);
    } finally {
      setLoadingCompare(false);
    }
  };

  const typeBadge = (type: string) => {
    switch (type) {
      case "add":
        return <Badge className="bg-green-100 text-green-700 border-green-300"><FilePlus2 className="inline w-4 h-4 mr-1" />Alta</Badge>;
      case "edit":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300"><Edit2 className="inline w-4 h-4 mr-1" />Edición</Badge>;
      case "delete":
        return <Badge className="bg-red-100 text-red-700 border-red-300"><Trash2 className="inline w-4 h-4 mr-1" />Eliminación</Badge>;
      case "info_edit":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300"><Edit2 className="inline w-4 h-4 mr-1" />Edición Info</Badge>;
      case "info_toggle":
        return <Badge className="bg-purple-100 text-purple-700 border-purple-300"><CheckCircle className="inline w-4 h-4 mr-1" />Estado Info</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };
  // Función que renderiza la comparación en el diálogo
  const renderComparison = () => {
    if (!currentRevision) return null;

    return (
      <div className="space-y-4 max-h-[70vh] overflow-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-orange-500" />
              Comparación de cambios
            </h3>
            <p className="text-sm text-gray-500">
              {currentRevision.timestamp ?
                `Solicitado: ${new Date(currentRevision.timestamp.seconds * 1000).toLocaleString()}` :
                "Fecha no disponible"}
            </p>
          </div>
          {typeBadge(currentRevision.type)}
        </div>

        <Separator className="my-4" />

        {loadingCompare ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-t-blue-600 animate-spin mb-4"></div>
            <p className="text-blue-600">Cargando datos actuales...</p>
          </div>
        ) : (
          <>
            {/* Título general del cambio */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">Detalles del cambio:</h4>
              <div className="text-blue-900">
                {currentRevision.type === "add" && (
                  <p>Se agregará un nuevo producto: <strong>{currentRevision.data?.name}</strong></p>
                )}
                {currentRevision.type === "edit" && (
                  <p>Se editará el producto: <strong>{currentRevision.data?.name}</strong></p>
                )}
                {currentRevision.type === "delete" && (
                  <p>Se eliminará el producto: <strong>{currentRevision.data?.name}</strong></p>
                )}
                {currentRevision.type === "info_edit" && (
                  <p>Se editará la sección: <strong>{currentRevision.sectionTitle}</strong></p>
                )}
                {currentRevision.type === "info_toggle" && (
                  <p>Se cambiará el estado de la sección <strong>{currentRevision.sectionTitle}</strong> a: <strong>{currentRevision.data?.enabled ? "Habilitado" : "Deshabilitado"}</strong></p>
                )}
              </div>
            </div>

            {/* Comparación principal */}
            {(currentRevision.type === "edit" || currentRevision.type === "info_edit") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Estado actual */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2 pb-2 border-b border-gray-300">
                    <ArrowLeft className="h-4 w-4 text-blue-600 inline mr-2" />
                    Estado actual
                  </h4>

                  {currentData ? (
                    <div className="space-y-3">
                      {/* Para productos */}
                      {currentRevision.type === "edit" && (
                        <>
                          <div>
                            <span className="text-sm font-medium text-gray-500">Nombre:</span>
                            <div className="p-2 rounded bg-white border mt-1">{currentData.name || "N/A"}</div>
                          </div>
                          {currentData.price !== undefined && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">Precio:</span>
                              <div className="p-2 rounded bg-white border mt-1">${currentData.price}</div>
                            </div>
                          )}
                          {currentData.description && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">Descripción:</span>
                              <div className="p-2 rounded bg-white border mt-1 max-h-32 overflow-auto">
                                {currentData.description}
                              </div>
                            </div>
                          )}
                          {currentData.category && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">Categoría:</span>
                              <div className="p-2 rounded bg-white border mt-1">{currentData.category}</div>
                            </div>
                          )}
                          {currentData.stock !== undefined && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">Stock:</span>
                              <div className="p-2 rounded bg-white border mt-1">{currentData.stock}</div>
                            </div>
                          )}
                          {currentData.image && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">Imagen:</span>
                              <div className="p-2 rounded bg-white border mt-1">
                                <img src={currentData.image} alt="Imagen actual" className="h-32 object-contain mx-auto" />
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Para secciones de información */}
                      {currentRevision.type === "info_edit" && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Contenido:</span>
                          <div className="p-2 rounded bg-white border mt-1 max-h-64 overflow-auto whitespace-pre-wrap">
                            {currentData.content || "Sin contenido"}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      <AlertCircle className="h-10 w-10 mb-2 text-gray-300 mx-auto" />
                      <p>No hay datos actuales disponibles</p>
                    </div>
                  )}
                </div>

                {/* Cambios propuestos */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2 pb-2 border-b border-green-300">
                    <ArrowRight className="h-4 w-4 text-green-600 inline mr-2" />
                    Cambios propuestos
                  </h4>

                  <div className="space-y-3">
                    {/* Para productos */}
                    {(currentRevision.type === "edit" || currentRevision.type === "add") && currentRevision.data && (
                      <>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Nombre:</span>
                          <div className={`p-2 rounded border mt-1 ${currentData?.name !== currentRevision.data.name ? "bg-green-100 border-green-300" : "bg-white"
                            }`}>
                            {currentRevision.data.name || "N/A"}
                            {currentData?.name !== currentRevision.data.name && currentData?.name && (
                              <div className="mt-1 text-xs text-green-700">
                                Cambia de: {currentData.name}
                              </div>
                            )}
                          </div>
                        </div>

                        {currentRevision.data.price !== undefined && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Precio:</span>
                            <div className={`p-2 rounded border mt-1 ${currentData?.price !== currentRevision.data.price ? "bg-green-100 border-green-300" : "bg-white"
                              }`}>
                              ${currentRevision.data.price}
                              {currentData?.price !== currentRevision.data.price && currentData?.price !== undefined && (
                                <div className="mt-1 text-xs text-green-700">
                                  Cambia de: ${currentData.price}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {currentRevision.data.description && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Descripción:</span>
                            <div className={`p-2 rounded border mt-1 max-h-32 overflow-auto ${currentData?.description !== currentRevision.data.description ? "bg-green-100 border-green-300" : "bg-white"
                              }`}>
                              {currentRevision.data.description}
                              {currentData?.description !== currentRevision.data.description && currentData?.description && (
                                <div className="mt-1 text-xs text-green-700">
                                  Contenido modificado
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {currentRevision.data.category && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Categoría:</span>
                            <div className={`p-2 rounded border mt-1 ${currentData?.category !== currentRevision.data.category ? "bg-green-100 border-green-300" : "bg-white"
                              }`}>
                              {currentRevision.data.category}
                              {currentData?.category !== currentRevision.data.category && currentData?.category && (
                                <div className="mt-1 text-xs text-green-700">
                                  Cambia de: {currentData.category}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {currentRevision.data.stock !== undefined && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Stock:</span>
                            <div className={`p-2 rounded border mt-1 ${currentData?.stock !== currentRevision.data.stock ? "bg-green-100 border-green-300" : "bg-white"
                              }`}>
                              {currentRevision.data.stock}
                              {currentData?.stock !== currentRevision.data.stock && currentData?.stock !== undefined && (
                                <div className="mt-1 text-xs text-green-700">
                                  Cambia de: {currentData.stock}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {currentRevision.data.image && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Imagen:</span>
                            <div className={`p-2 rounded border mt-1 ${currentData?.image !== currentRevision.data.image ? "bg-green-100 border-green-300" : "bg-white"
                              }`}>
                              <img src={currentRevision.data.image} alt="Nueva imagen" className="h-32 object-contain mx-auto" />
                              {currentData?.image !== currentRevision.data.image && currentData?.image && (
                                <div className="mt-1 text-xs text-green-700">
                                  Imagen actualizada
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Para secciones de información */}
                    {currentRevision.type === "info_edit" && currentRevision.data && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Nuevo contenido:</span>
                        <div className={`p-2 rounded border mt-1 max-h-64 overflow-auto whitespace-pre-wrap ${currentData?.content !== currentRevision.data.content ? "bg-green-100 border-green-300" : "bg-white"
                          }`}>
                          {currentRevision.data.content || "Sin contenido"}
                          {currentData?.content !== currentRevision.data.content && currentData?.content && (
                            <div className="mt-2 pt-2 border-t text-xs text-green-700">
                              Contenido modificado
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Para cambios de estado */}
                    {currentRevision.type === "info_toggle" && currentRevision.data && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Estado:</span>
                        <div className="p-2 rounded bg-green-100 border border-green-300 mt-1">
                          <Badge className={currentRevision.data.enabled
                            ? "bg-green-200 text-green-800 border-green-400"
                            : "bg-red-200 text-red-800 border-red-400"
                          }>
                            {currentRevision.data.enabled ? "Habilitado" : "Deshabilitado"}
                          </Badge>
                          <div className="mt-2 text-xs text-green-700">
                            Cambia de {currentRevision.data.previousEnabled ? "habilitado" : "deshabilitado"} a {currentRevision.data.enabled ? "habilitado" : "deshabilitado"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Para eliminaciones */}
            {currentRevision.type === "delete" && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-800 mb-4">Se eliminará el siguiente elemento:</h4>
                <div className="space-y-3">
                  {currentRevision.data && (
                    <>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Nombre:</span>
                        <div className="p-2 rounded bg-white border border-red-200 mt-1">{currentRevision.data.name || "N/A"}</div>
                      </div>
                      {currentRevision.data.id && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">ID:</span>
                          <div className="p-2 rounded bg-white border border-red-200 mt-1">{currentRevision.data.id}</div>
                        </div>
                      )}
                      <div className="mt-3 p-3 bg-red-100 rounded-lg text-red-800 text-sm">
                        <p>⚠️ Esta acción eliminará permanentemente el producto de la base de datos.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Para adiciones */}
            {currentRevision.type === "add" && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-4">Se agregará un nuevo elemento:</h4>
                <div className="space-y-3">
                  {currentRevision.data && (
                    <>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Nombre:</span>
                        <div className="p-2 rounded bg-white border border-green-200 mt-1">{currentRevision.data.name || "N/A"}</div>
                      </div>
                      {currentRevision.data.price !== undefined && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Precio:</span>
                          <div className="p-2 rounded bg-white border border-green-200 mt-1">${currentRevision.data.price}</div>
                        </div>
                      )}
                      {currentRevision.data.category && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Categoría:</span>
                          <div className="p-2 rounded bg-white border border-green-200 mt-1">{currentRevision.data.category}</div>
                        </div>
                      )}
                      {currentRevision.data.description && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Descripción:</span>
                          <div className="p-2 rounded bg-white border border-green-200 mt-1 max-h-32 overflow-auto">
                            {currentRevision.data.description}
                          </div>
                        </div>
                      )}
                      {currentRevision.data.image && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Imagen:</span>
                          <div className="p-2 rounded bg-white border border-green-200 mt-1">
                            <img src={currentRevision.data.image} alt="Imagen" className="h-32 object-contain mx-auto" />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Revisiones Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Cargando...</div>
          ) : revisions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No hay revisiones pendientes.</div>
          ) : (
            <div className="space-y-4">
              {revisions.map(rev => (
                <div
                  key={rev.id}
                  className={`border p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3 transition-all hover:shadow-lg ${selected?.id === rev.id ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white"
                    }`}
                >
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      {typeBadge(rev.type)}
                      <Badge variant="outline" className="ml-2">{rev.entity}</Badge>
                      <span className="text-xs text-gray-400 ml-2">
                        {rev.userId ? `Solicitado por: ${rev.userId}` : ""}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      {rev.type === "add" && <>Nuevo producto: <b>{rev.data?.name}</b></>}
                      {rev.type === "edit" && <>Editar producto: <b>{rev.data?.name}</b></>}
                      {rev.type === "delete" && <>Eliminar producto: <b>{rev.data?.name}</b></>}
                      {rev.type === "info_edit" && <>Editar sección: <b>{rev.sectionTitle}</b></>}
                      {rev.type === "info_toggle" && <>
                        {rev.data?.enabled ? "Habilitar" : "Deshabilitar"} sección: <b>{rev.sectionTitle}</b>
                      </>}
                    </div>
                    {selected?.id === rev.id && (
                      <div className="mt-3 bg-gray-50 rounded-lg p-4 border border-orange-200">
                        <div className="font-semibold text-sm mb-2 text-orange-700 flex items-center gap-2">
                          <Eye className="w-4 h-4" /> Detalles de la revisión
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {/* Para productos */}
                          {rev.data?.name && (
                            <div>
                              <span className="font-medium text-gray-600">Nombre:</span>{" "}
                              <span className="text-gray-800">{rev.data.name}</span>
                            </div>
                          )}
                          {rev.data?.category && (
                            <div>
                              <span className="font-medium text-gray-600">Categoría:</span>{" "}
                              <span className="text-gray-800">{rev.data.category}</span>
                            </div>
                          )}
                          {rev.data?.price !== undefined && (
                            <div>
                              <span className="font-medium text-gray-600">Precio:</span>{" "}
                              <span className="text-gray-800">${rev.data.price}</span>
                            </div>
                          )}
                          {rev.data?.stock !== undefined && (
                            <div>
                              <span className="font-medium text-gray-600">Stock:</span>{" "}
                              <span className="text-gray-800">{rev.data.stock}</span>
                            </div>
                          )}
                          {rev.data?.description && !rev.type.includes("info") && (
                            <div className="md:col-span-2">
                              <span className="font-medium text-gray-600">Descripción:</span>{" "}
                              <span className="text-gray-800">{rev.data.description}</span>
                            </div>
                          )}
                          {rev.data?.image && (
                            <div className="md:col-span-2 flex items-center gap-2 mt-2">
                              <img
                                src={rev.data.image}
                                alt="Imagen"
                                className="w-16 h-16 object-cover rounded border"
                                onError={e => (e.currentTarget.style.display = "none")}
                              />
                              <span className="text-xs text-gray-400">{rev.data.image}</span>
                            </div>
                          )}

                          {/* Para Info Sections */}
                          {rev.type === "info_edit" && rev.data?.content && (
                            <div className="md:col-span-2">
                              <span className="font-medium text-gray-600">Contenido:</span>{" "}
                              <div className="text-gray-800 bg-gray-50 p-2 rounded mt-1 max-h-60 overflow-auto">
                                {rev.data.content}
                              </div>
                            </div>
                          )}
                          {rev.type === "info_toggle" && (
                            <div className="md:col-span-2">
                              <span className="font-medium text-gray-600">Estado:</span>{" "}
                              <span className={`font-medium ${rev.data.enabled ? "text-green-600" : "text-red-600"}`}>
                                {rev.data.enabled ? "Habilitar" : "Deshabilitar"}
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                Estado anterior: {rev.data.previousEnabled ? "Habilitado" : "Deshabilitado"}
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Si hay campos extra, muestra el JSON */}
                        {Object.keys(rev.data || {}).length > 7 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-xs text-gray-500">Ver JSON completo</summary>
                            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto mt-1">{JSON.stringify(rev.data, null, 2)}</pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-400 text-green-700 hover:bg-green-50"
                      onClick={() => handleApprove(rev)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-400 text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (window.confirm("¿Estás seguro de rechazar esta revisión? Esta acción eliminará la solicitud de cambio.")) {
                          handleDelete(rev.id);
                        }
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Rechazar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-400 text-blue-700 hover:bg-blue-50"
                      onClick={() => {
                        // Para el panel desplegable básico
                        setSelected(selected?.id === rev.id ? null : rev);

                        // Para mostrar el diálogo detallado de cambios
                        if (rev.type === "edit" || rev.type === "info_edit" ||
                          rev.type === "add" || rev.type === "delete" ||
                          rev.type === "info_toggle") {
                          handleViewChanges(rev);
                        }
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" /> {selected?.id === rev.id ? "Ocultar" : "Ver cambios"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de comparación de cambios */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-orange-700">
              Visualización de Cambios
            </DialogTitle>
          </DialogHeader>

          {renderComparison()}

          <DialogFooter className="mt-6 border-t pt-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cerrar
              </Button>
              {currentRevision && (
                <>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApprove(currentRevision)}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Aprobar
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => {
                      if (window.confirm("¿Estás seguro de rechazar esta revisión? Esta acción eliminará la solicitud de cambio.")) {
                        handleDelete(currentRevision.id);
                        setDialogOpen(false);
                      }
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Rechazar
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
