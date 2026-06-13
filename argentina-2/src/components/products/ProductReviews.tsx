import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
// Mocks para evitar errores de compilación ya que Firebase fue removido
const collection = (...args: any[]) => ({}) as any;
const addDoc = (...args: any[]) => Promise.resolve({ id: 'mock-id' });
const getDocs = (...args: any[]) => Promise.resolve({ forEach: () => { } });
const query = (...args: any[]) => ({}) as any;
const where = (...args: any[]) => ({}) as any;
const orderBy = (...args: any[]) => ({}) as any;
const deleteDoc = (...args: any[]) => Promise.resolve();
const doc = (...args: any[]) => ({}) as any;
const updateDoc = (...args: any[]) => Promise.resolve();
const serverTimestamp = () => new Date();
import { Star, Trash2, Edit2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

export const ProductReviews: React.FC<ProductReviewsProps> = ({ productId, productName }) => {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [productId, user]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const reviewsQuery = query(
        collection(db, 'product_reviews'),
        where('productId', '==', productId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(reviewsQuery);
      const reviewsList: Review[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        reviewsList.push({
          id: doc.id,
          productId: data.productId,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          rating: data.rating,
          comment: data.comment,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });

      setReviews(reviewsList);

      // Verificar si el usuario ya tiene una reseña
      if (user) {
        const existingReview = reviewsList.find(r => r.userId === user.id);
        setUserReview(existingReview || null);
        if (existingReview) {
          setRating(existingReview.rating);
          setComment(existingReview.comment);
        }
      }
    } catch (error) {
      console.error('Error al cargar reseñas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las reseñas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !isAuthenticated) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para dejar una reseña",
        variant: "destructive",
      });
      return;
    }

    if (comment.trim().length < 10) {
      toast({
        title: "Comentario muy corto",
        description: "Por favor escribe al menos 10 caracteres",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      if (editing && userReview) {
        // Actualizar reseña existente
        await updateDoc(doc(db, 'product_reviews', userReview.id), {
          rating,
          comment: comment.trim(),
          updatedAt: serverTimestamp(),
        });

        toast({
          title: "¡Reseña actualizada!",
          description: "Tu reseña ha sido actualizada exitosamente",
        });
      } else {
        // Crear nueva reseña
        await addDoc(collection(db, 'product_reviews'), {
          productId,
          userId: user.id,
          userName: user.name || 'Usuario',
          userEmail: user.email,
          rating,
          comment: comment.trim(),
          createdAt: serverTimestamp(),
        });

        toast({
          title: "¡Reseña publicada!",
          description: "Gracias por compartir tu opinión",
        });
      }

      // Resetear formulario
      setShowForm(false);
      setEditing(false);
      setComment('');
      setRating(5);

      // Recargar reseñas
      await fetchReviews();
    } catch (error) {
      console.error('Error al guardar reseña:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar tu reseña. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;

    try {
      await deleteDoc(doc(db, 'product_reviews', userReview.id));

      toast({
        title: "Reseña eliminada",
        description: "Tu reseña ha sido eliminada",
      });

      setUserReview(null);
      setComment('');
      setRating(5);
      setDeleteDialogOpen(false);
      await fetchReviews();
    } catch (error) {
      console.error('Error al eliminar reseña:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la reseña",
        variant: "destructive",
      });
    }
  };

  const handleEditReview = () => {
    if (userReview) {
      setRating(userReview.rating);
      setComment(userReview.comment);
      setEditing(true);
      setShowForm(true);
    }
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const StarRating = ({ value, interactive = false, size = "w-5 h-5" }: { value: number; interactive?: boolean; size?: string }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${star <= (interactive ? (hoveredRating || value) : value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
              } ${interactive ? 'cursor-pointer transition-colors' : ''}`}
            onClick={interactive ? () => setRating(star) : undefined}
            onMouseEnter={interactive ? () => setHoveredRating(star) : undefined}
            onMouseLeave={interactive ? () => setHoveredRating(0) : undefined}
          />
        ))}
      </div>
    );
  };

  const distribution = getRatingDistribution();
  const averageRating = calculateAverageRating();

  return (
    <div className="mt-12 space-y-8">
      {/* Resumen de calificaciones */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Opiniones del producto</h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Calificación promedio */}
          <div className="text-center">
            <div className="text-6xl font-bold text-orange-600 mb-2">
              {averageRating}
            </div>
            <StarRating value={parseFloat(averageRating)} size="w-6 h-6" />
            <p className="text-gray-600 mt-2">
              {reviews.length} {reviews.length === 1 ? 'opinión' : 'opiniones'}
            </p>
          </div>

          {/* Distribución de estrellas */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} className="flex items-center gap-3">
                <span className="text-sm font-medium w-8">{stars}</span>
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 transition-all"
                    style={{
                      width: `${reviews.length > 0 ? (distribution[stars as keyof typeof distribution] / reviews.length) * 100 : 0}%`
                    }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-8 text-right">
                  {distribution[stars as keyof typeof distribution]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Botón para dejar reseña */}
      {isAuthenticated && !userReview && !showForm && (
        <div className="text-center">
          <Button
            onClick={() => setShowForm(true)}
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            <Star className="w-5 h-5 mr-2" />
            Deja tu opinión sobre {productName}
          </Button>
        </div>
      )}

      {/* Reseña del usuario existente */}
      {userReview && !editing && (
        <Card className="border-2 border-orange-200 bg-orange-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-orange-500 text-white">
                    {userReview.userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900">{userReview.userName}</p>
                  <StarRating value={userReview.rating} size="w-4 h-4" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEditReview}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar
                </Button>
              </div>
            </div>
            <p className="text-gray-700">{userReview.comment}</p>
            <p className="text-sm text-gray-500 mt-2">
              {userReview.createdAt.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Formulario de reseña */}
      {showForm && (
        <Card className="border-2 border-orange-300">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4">
              {editing ? 'Editar tu opinión' : 'Comparte tu opinión'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Calificación
                </label>
                <StarRating value={rating} interactive size="w-8 h-8" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tu opinión (mínimo 10 caracteres)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Cuéntanos tu experiencia con este producto..."
                  rows={5}
                  className="resize-none"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {comment.length} caracteres
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSubmitReview}
                  disabled={submitting || comment.trim().length < 10}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {editing ? 'Actualizar opinión' : 'Publicar opinión'}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(false);
                    if (userReview) {
                      setRating(userReview.rating);
                      setComment(userReview.comment);
                    } else {
                      setRating(5);
                      setComment('');
                    }
                  }}
                  disabled={submitting}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de reseñas */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900">
            Todas las opiniones ({reviews.length})
          </h3>

          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-400 text-white">
                        {review.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{review.userName}</p>
                          <StarRating value={review.rating} size="w-4 h-4" />
                        </div>
                        <span className="text-sm text-gray-500">
                          {review.createdAt.toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <div className="text-center py-12">
          <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-600 mb-2">
            Aún no hay opiniones
          </p>
          <p className="text-gray-500">
            Sé el primero en compartir tu experiencia con este producto
          </p>
        </div>
      )}

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tu opinión?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Tu opinión será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReview}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
