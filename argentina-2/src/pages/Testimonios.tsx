import React, { useEffect, useState, useRef } from "react";
import { TopPromoBar } from "@/components/layout/TopPromoBar";
import { AdvancedHeader } from "@/components/layout/AdvancedHeader";
import { useCategories } from "@/hooks/use-categories";
import { useAuth } from "@/contexts/AuthContext";
import { db, collection, getDoc, doc, getDocs, addDoc, query, where, updateDoc, deleteDoc } from '@/firebase';
const serverTimestamp = () => new Date() as any;
import { Star, Quote, Check, Edit, Trash2, X, PenLine, Send, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface Testimonio {
  id: string;
  nombre: string;
  comentario: string;
  calificacion: number;
  fecha: Date;
  imagenUrl?: string;
  profesion?: string;
  userId?: string;
  email?: string;

  productoComprado?: string;
  fotoProducto?: string;
}

const Testimonios = () => {
  const { categories, mainCategories, subcategoriesByParent, thirdLevelBySubcategory } = useCategories();
  const { user, isAuthenticated, currentUser } = useAuth();
  const [selectedCategory, setSelectedCategory] = React.useState("Todos");
  const [promoVisible, setPromoVisible] = React.useState(true);
  const [info, setInfo] = useState<{ content: string; enabled: boolean } | null>(null);
  const [testimonios, setTestimonios] = useState<Testimonio[]>([]);
  const [loading, setLoading] = useState(true);
  const [usuarioYaComentó, setUsuarioYaComentó] = useState<boolean>(false);
  const [miTestimonio, setMiTestimonio] = useState<Testimonio | null>(null);
  const [formTestimonio, setFormTestimonio] = useState({
    comentario: "",
    calificacion: 5,
    profesion: "",
    productoComprado: ""
  });
  const [enviandoTestimonio, setEnviandoTestimonio] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editando, setEditando] = useState<boolean>(false);
  const [mostrarFormulario, setMostrarFormulario] = useState<boolean>(false);

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      // Intentar obtener contenido personalizado primero
      const docRef = doc(db, 'infoSections', 'testimonios');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setInfo({
          content: docSnap.data().content || '',
          enabled: docSnap.data().enabled ?? false,
        });
      } else {
        setInfo(null);
      }

      // Obtener testimonios (si existe la colección)
      try {
        const testimoniosSnapshot = await getDocs(collection(db, 'testimonios'));
        const testimoniosList: Testimonio[] = [];
        testimoniosSnapshot.forEach(doc => {
          const data = doc.data();
          testimoniosList.push({
            id: doc.id,
            nombre: data.nombre || 'Cliente',
            comentario: data.comentario || '',
            calificacion: data.calificacion || 5,
            fecha: data.fecha?.toDate() || new Date(),
            imagenUrl: data.imagenUrl || '',
            profesion: data.profesion || '',
            userId: data.userId || '',
            email: data.email || '',

            productoComprado: data.productoComprado || '',
            fotoProducto: data.fotoProducto || ''
          });
        });

        // Solo usar testimonios reales de la base de datos
        // Ordenar por fecha (más recientes primero)
        testimoniosList.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
        setTestimonios(testimoniosList);

        // Verificar si el usuario ya ha comentado
        if (user) {
          const miTestimonio = testimoniosList.find(t => t.userId === user.id);
          if (miTestimonio) {
            setUsuarioYaComentó(true);
            setMiTestimonio(miTestimonio);
            setFormTestimonio({
              comentario: miTestimonio.comentario || '',
              calificacion: miTestimonio.calificacion || 5,
              profesion: miTestimonio.profesion || '',
              productoComprado: miTestimonio.productoComprado || ''
            });
          }
        }
      } catch (error) {
        console.error("Error obteniendo testimonios:", error);
        setTestimonios([]); // En caso de error, mostramos una lista vacía en lugar de testimonios de muestra
      }

      setLoading(false);
    };

    fetchInfo();
  }, [user]);

  // Ya no usamos testimonios de muestra

  // Función para renderizar estrellas según la calificación
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
        />
      );
    }
    return stars;
  };

  // Función para renderizar estrellas seleccionables
  const renderSelectableStars = (selectedRating: number, onSelect: (rating: number) => void) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-6 w-6 cursor-pointer transition-colors duration-200 ${i <= selectedRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-200"
            }`}
          onClick={() => onSelect(i)}
        />
      );
    }
    return stars;
  };

  // Función para manejar cambios en el formulario
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormTestimonio(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para guardar un nuevo testimonio
  const guardarTestimonio = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para dejar un testimonio",
        variant: "destructive"
      });
      return;
    }

    if (!formTestimonio.comentario) {
      toast({
        title: "Error",
        description: "Por favor, escribe un comentario",
        variant: "destructive"
      });
      return;
    }

    setEnviandoTestimonio(true);

    try {
      // Si está editando, actualizar el testimonio existente
      if (editando && miTestimonio) {
        await updateDoc(doc(db, "testimonios", miTestimonio.id), {
          comentario: formTestimonio.comentario,
          calificacion: formTestimonio.calificacion,
          profesion: formTestimonio.profesion,
          productoComprado: formTestimonio.productoComprado,
          fechaActualizado: serverTimestamp()
        });

        // Actualizar el estado local
        const testimonioActualizado: Testimonio = {
          ...miTestimonio,
          comentario: formTestimonio.comentario,
          calificacion: formTestimonio.calificacion,
          profesion: formTestimonio.profesion,
          productoComprado: formTestimonio.productoComprado,
          fecha: new Date() // Esto es solo para la visualización, en Firestore usamos serverTimestamp()
        };

        setMiTestimonio(testimonioActualizado);
        setTestimonios(prev => prev.map(t => t.id === miTestimonio.id ? testimonioActualizado : t));

        toast({
          title: "¡Éxito!",
          description: "Tu testimonio ha sido actualizado correctamente",
          variant: "default"
        });
      } else {
        // Crear un nuevo testimonio
        const nuevoTestimonio = {
          nombre: user.name || user.email?.split('@')[0] || "Usuario",
          email: user.email,
          comentario: formTestimonio.comentario,
          calificacion: formTestimonio.calificacion,
          profesion: formTestimonio.profesion,
          productoComprado: formTestimonio.productoComprado,
          fecha: serverTimestamp(),
          userId: user.id,
          imagenUrl: currentUser?.photoURL || ""
        };

        const docRef = await addDoc(collection(db, "testimonios"), nuevoTestimonio);

        // Agregar el nuevo testimonio al estado local
        const testimonioParaMostrar: Testimonio = {
          id: docRef.id,
          ...nuevoTestimonio,
          fecha: new Date() // Esto es solo para la visualización, en Firestore usamos serverTimestamp()
        };

        setMiTestimonio(testimonioParaMostrar);
        setTestimonios(prev => [testimonioParaMostrar, ...prev]);
        setUsuarioYaComentó(true);

        toast({
          title: "¡Gracias por tu opinión!",
          description: "Tu testimonio ha sido publicado correctamente",
          variant: "default"
        });
      }

      setModalOpen(false);
      setEditando(false);
    } catch (error) {
      console.error("Error al guardar el testimonio:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar tu testimonio. Por favor, intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setEnviandoTestimonio(false);
    }
  };

  // Función para eliminar un testimonio
  const eliminarTestimonio = async () => {
    if (!miTestimonio || !isAuthenticated) return;

    try {
      await deleteDoc(doc(db, "testimonios", miTestimonio.id));

      // Actualizar estado local
      setTestimonios(prev => prev.filter(t => t.id !== miTestimonio.id));
      setMiTestimonio(null);
      setUsuarioYaComentó(false);

      toast({
        title: "Testimonio eliminado",
        description: "Tu testimonio ha sido eliminado correctamente",
        variant: "default"
      });
    } catch (error) {
      console.error("Error al eliminar testimonio:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el testimonio",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {promoVisible && <TopPromoBar setPromoVisible={setPromoVisible} />}
      <AdvancedHeader
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        promoVisible={promoVisible}
        mainCategories={mainCategories}
        subcategoriesByParent={subcategoriesByParent}
        thirdLevelBySubcategory={thirdLevelBySubcategory}
      />
      <main className="flex-1 flex flex-col">
        <section className="flex-1 min-h-[calc(100vh-8rem)] w-full flex flex-col justify-center items-center bg-white">
          <div className="flex flex-col w-full items-center pt-40 pb-24 md:pt-56 md:pb-32">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
              <nav className="w-full text-sm text-gray-500 mb-6">
                <a href="/" className="font-semibold text-black hover:underline">Inicio</a>
                <span className="mx-2">&gt;</span>
                <span className="text-black">Testimonios</span>
              </nav>
              <h1 className="text-5xl md:text-7xl font-serif font-bold text-black mb-4 tracking-tight w-full">
                Testimonios
              </h1>
              <p className="text-xl text-gray-600 mb-12">
                Conoce las experiencias de nuestros clientes satisfechos
              </p>

              {loading ? (
                <div className="flex justify-center items-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
                </div>
              ) : info && info.enabled ? (
                <div className="prose prose-lg max-w-none text-gray-800 mb-12" dangerouslySetInnerHTML={{ __html: info.content.replace(/\n/g, '<br />') }} />
              ) : null}

              {isAuthenticated && (
                <div className="mb-12">
                  {usuarioYaComentó ? (
                    <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 p-6 rounded-xl shadow-md border border-blue-100">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold text-blue-800 flex items-center gap-2">
                          <PenLine className="h-5 w-5 text-blue-600" />
                          Tu testimonio
                        </h3>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditando(true);
                              setModalOpen(true);
                            }}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará permanentemente tu testimonio y no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={eliminarTestimonio} className="bg-red-600 hover:bg-red-700 text-white">
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {miTestimonio && (
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <div className="flex items-center mb-3">
                            <div className="flex mb-1">
                              {renderStars(miTestimonio.calificacion)}
                            </div>
                          </div>
                          <p className="text-gray-700 italic mb-3">"{miTestimonio.comentario}"</p>

                          {miTestimonio.productoComprado && (
                            <div className="flex items-center bg-gray-50 p-2 rounded-md text-sm text-gray-600 mb-3">
                              <span className="mr-2">Producto:</span>
                              <span className="font-medium">{miTestimonio.productoComprado}</span>
                            </div>
                          )}

                          <p className="text-xs text-gray-500">
                            {miTestimonio.fecha.toLocaleDateString('es-AR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 p-6 rounded-xl shadow-md border border-blue-100">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-blue-800 flex items-center gap-2">
                          <PenLine className="h-5 w-5 text-blue-600" />
                          Compartir tu experiencia
                        </h3>
                      </div>
                      <p className="text-gray-700 mb-4">
                        Ayuda a otros clientes compartiendo tu experiencia de compra con nosotros.
                        Tu opinión es muy valiosa.
                      </p>
                      <Button
                        onClick={() => setModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Escribir mi testimonio
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Sección principal de testimonios */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
                {testimonios.length === 0 ? (
                  <div className="col-span-3 text-center py-10">
                    <p className="text-gray-500 text-lg">Aún no hay testimonios disponibles.</p>
                    <p className="text-gray-500">¡Sé el primero en compartir tu experiencia!</p>
                  </div>
                ) : testimonios.map((testimonio) => (
                  <Card
                    key={testimonio.id}
                    className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${miTestimonio?.id === testimonio.id ? 'ring-2 ring-blue-400' : ''
                      }`}
                  >
                    <CardContent className="p-6 relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                      <Quote className="absolute text-blue-200 h-16 w-16 -top-2 -left-2 opacity-20" />
                      <div className="flex items-center mb-4 mt-4">
                        <Avatar className="h-12 w-12 border-2 border-blue-200">
                          {testimonio.imagenUrl && testimonio.imagenUrl !== '' ? (
                            <AvatarImage src={testimonio.imagenUrl} alt={testimonio.nombre} />
                          ) : (
                            <AvatarFallback className="bg-blue-600 text-white">
                              {testimonio.nombre && testimonio.nombre.length > 0
                                ? testimonio.nombre.substring(0, 2).toUpperCase()
                                : 'US'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="font-semibold text-lg">{testimonio.nombre}</p>
                          </div>
                          {testimonio.profesion && (
                            <p className="text-sm text-gray-500">{testimonio.profesion}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center mb-4">
                        <div className="flex">
                          {renderStars(testimonio.calificacion)}
                        </div>
                      </div>

                      <p className="text-gray-700 italic mb-4">"{testimonio.comentario}"</p>

                      {testimonio.productoComprado && (
                        <div className="bg-white/70 p-2 rounded mb-3 text-sm border border-indigo-50">
                          <p className="font-medium text-indigo-700">Producto comprado:</p>
                          <p className="text-gray-600">{testimonio.productoComprado}</p>
                        </div>
                      )}

                      <p className="text-xs text-gray-500">
                        {testimonio.fecha.toLocaleDateString('es-AR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* Modal para agregar o editar testimonio */}
              <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-md" aria-describedby="dialog-description">
                  <DialogHeader>
                    <DialogTitle>{editando ? 'Editar testimonio' : 'Nuevo testimonio'}</DialogTitle>
                    <p id="dialog-description" className="text-sm text-gray-500">
                      {editando
                        ? 'Modifica tu testimonio para compartir tu experiencia actualizada con nuestros productos.'
                        : 'Comparte tu experiencia con nuestros productos y ayuda a otros clientes.'}
                    </p>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="calificacion">Tu calificación</Label>
                      <div className="flex gap-1 py-2">
                        {renderSelectableStars(formTestimonio.calificacion, (rating) =>
                          setFormTestimonio(prev => ({ ...prev, calificacion: rating }))
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="comentario">Tu comentario</Label>
                      <Textarea
                        id="comentario"
                        name="comentario"
                        placeholder="Comparte tu experiencia con nuestros productos y servicio..."
                        value={formTestimonio.comentario}
                        onChange={handleFormChange}
                        className="min-h-[120px]"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="profesion">Profesión (opcional)</Label>
                        <Input
                          id="profesion"
                          name="profesion"
                          placeholder="Ej: Diseñador, Médica, Estudiante..."
                          value={formTestimonio.profesion}
                          onChange={handleFormChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="productoComprado">Producto que compraste</Label>
                        <Input
                          id="productoComprado"
                          name="productoComprado"
                          placeholder="Ej: Smartwatch, Mate Personalizado..."
                          value={formTestimonio.productoComprado}
                          onChange={handleFormChange}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      onClick={guardarTestimonio}
                      disabled={!formTestimonio.comentario || enviandoTestimonio}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {enviandoTestimonio ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {editando ? 'Actualizar' : 'Publicar'}
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Sección de invitación para dejar testimonio */}
              <div className="mt-16 text-center bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-8 rounded-2xl shadow-md">
                <h3 className="text-2xl font-semibold mb-4">¿Has comprado con nosotros?</h3>
                <p className="text-lg text-gray-700 mb-6">
                  Nos encantaría conocer tu opinión. Comparte tu experiencia y ayuda a otros clientes a conocer nuestros productos y servicios.
                </p>

                {isAuthenticated ? (
                  usuarioYaComentó ? (
                    <div className="bg-white/70 p-4 rounded-lg inline-block shadow-sm">
                      <p className="text-blue-600 flex items-center gap-2">
                        <Check className="h-5 w-5" />
                        Ya has publicado tu testimonio. ¡Gracias por compartir tu experiencia!
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setModalOpen(true)}
                      className="px-8 py-6 bg-blue-600 hover:bg-blue-700 text-lg"
                    >
                      <PenLine className="h-5 w-5 mr-2" />
                      Escribir mi testimonio
                    </Button>
                  )
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-blue-700 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Inicia sesión para dejar tu testimonio
                    </p>
                    <Button
                      onClick={() => setModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Iniciar sesión
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-muted/50 py-12 mt-16">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 gradient-orange rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">O</span>
                </div>
                <span className="text-lg font-bold gradient-text-orange">OmniShop</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Tu plataforma de e-commerce multirrubro con la mejor selección y experiencia de compra.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Productos</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Tecnología</li>
                <li>Moda y Calzado</li>
                <li>Hogar y Cocina</li>
                <li>Salud y Belleza</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Centro de Ayuda</li>
                <li>Política de Devoluciones</li>
                <li>Compra Segura</li>
                <li>Garantías</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/sobre-nosotros" className="hover:underline">Sobre Nosotros</a></li>
                <li><a href="/envios" className="hover:underline">Envíos</a></li>
                <li><a href="/testimonios" className="hover:underline">Testimonios</a></li>
                <li><a href="/retiros" className="hover:underline">Retiros</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Testimonios;
