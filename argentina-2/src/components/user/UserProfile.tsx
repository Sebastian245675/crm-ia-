import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase";
// Mocks para evitar errores de compilación ya que Firebase fue removido
const doc = (...args: any[]) => ({}) as any;
const getDoc = (...args: any[]) => Promise.resolve({ exists: () => false, data: () => ({}), id: 'mock-id' }) as any;
const updateDoc = (...args: any[]) => Promise.resolve();
const collection = (...args: any[]) => ({}) as any;
const getDocs = (...args: any[]) => Promise.resolve({ docs: [], size: 0, forEach: (cb: any) => [] }) as any;
const query = (...args: any[]) => ({}) as any;
const where = (...args: any[]) => ({}) as any;
const orderBy = (...args: any[]) => ({}) as any;
const limit = (...args: any[]) => ({}) as any;
const addDoc = (...args: any[]) => Promise.resolve({ id: 'mock-id' });
const deleteDoc = (...args: any[]) => Promise.resolve();
const writeBatch = (...args: any[]) => ({
  update: () => { },
  commit: () => Promise.resolve()
}) as any;
const Timestamp = { now: () => new Date() } as any;
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User as UserIcon, Mail, Phone, MapPin, Gift, Package, Heart,
  Edit, Save, AlertCircle, CheckCircle2, Home as HomeIcon, Truck, ChevronRight,
  Calendar as CalendarIcon, ShoppingBag, BadgeCheck, History,
  Trash2, Star, Plus, Check, X, CreditCard, MapPinned, Clock
} from "lucide-react";
import { CustomClock } from '@/components/ui/CustomClock';
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";

// Tipo para las órdenes recientes
interface Order {
  id: string;
  date: Date;
  total: number;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: number;
  trackingNumber?: string;
}

// Tipo para los productos favoritos
interface FavoriteProduct {
  id: string;
  name: string;
  image: string;
  price: number;
}

// Tipo para direcciones guardadas
interface SavedAddress {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
}

export const UserProfile: React.FC = () => {
  const isSupabase = typeof (db as any)?.from === 'function';
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    province: "",
    postalCode: "",
    address: "",
    birthdate: "",
    preferences: "",
    notifications: {
      email: true,
      sms: false,
      promotions: true
    }
  });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProduct[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [newAddress, setNewAddress] = useState({
    name: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    isDefault: false
  });
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        if (isSupabase) {
          setFormData(prev => ({
            ...prev,
            name: user.name || user.email || "",
            email: user.email || "",
            phone: "",
            address: "",
          }));

          // 1. Cargar pedidos desde Supabase
          const { data: ordersData, error: ordersErr } = await (db as any)
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

          if (!ordersErr && ordersData) {
            setRecentOrders(ordersData.map((d: any) => ({
              id: d.id,
              date: new Date(d.created_at),
              total: d.total ?? 0,
              status: (d.status as Order['status']) || 'processing',
              items: Array.isArray(d.items) ? d.items.length : 0,
              trackingNumber: d.tracking_number
            })));
          }

          // 2. Cargar favoritos desde Supabase
          const { data: favData, error: favErr } = await (db as any)
            .from('favorites')
            .select('product_id')
            .eq('user_id', user.id);

          if (!favErr && favData) {
            const productIds = favData.map((f: any) => f.product_id);
            if (productIds.length > 0) {
              const { data: productsData, error: prodErr } = await (db as any)
                .from('products')
                .select('*')
                .in('id', productIds);

              if (!prodErr && productsData) {
                setFavoriteProducts(productsData.map((p: any) => ({
                  id: p.id,
                  name: p.name || "",
                  image: p.image || (p.images && p.images[0]) || "",
                  price: p.price ?? 0
                })));
              }
            }
          }

          // 3. Cargar direcciones desde Supabase
          const { data: addrData, error: addrErr } = await (db as any)
            .from('user_addresses')
            .select('*')
            .eq('user_id', user.id);

          if (!addrErr && addrData) {
            setSavedAddresses(addrData.map((a: any) => ({
              id: a.id,
              name: a.name || "",
              address: a.address || "",
              city: a.city || "",
              province: a.province || "",
              postalCode: a.postal_code || "",
              isDefault: !!a.is_default
            })));
          }
        } else {
          const userDoc = await getDoc(doc(db, "users", user.id));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setFormData(prev => ({
              ...prev,
              name: userData.name || userData.nombre || "",
              email: userData.email || userData.correo || user.email || "",
              phone: userData.phone || "",
              address: userData.address || "",
              birthdate: userData.birthday || userData.birthdate || "",
              notifications: {
                email: userData.notifications?.email ?? true,
                sms: userData.notifications?.sms ?? false,
                promotions: userData.notifications?.promotions ?? true
              }
            }));
            const addressesSnap = await getDocs(query(
              collection(db, "userAddresses"),
              where("userId", "==", user.id)
            ));
            const addressesData: SavedAddress[] = addressesSnap.docs.map(d => {
              const dta = d.data();
              return {
                id: d.id,
                name: dta.name || "",
                address: dta.address || "",
                city: dta.city || "",
                province: dta.province || "",
                postalCode: dta.postalCode || "",
                isDefault: !!dta.isDefault
              };
            });
            setSavedAddresses(addressesData);
            const ordersSnap = await getDocs(query(
              collection(db, "orders"),
              where("userId", "==", user.id),
              orderBy("createdAt", "desc"),
              limit(5)
            ));
            const ordersData: Order[] = ordersSnap.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                date: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                total: data.total ?? 0,
                status: (data.status as Order['status']) || 'processing',
                items: data.items ?? 0,
                trackingNumber: data.trackingNumber
              };
            });
            setRecentOrders(ordersData);
            const favSnap = await getDocs(query(
              collection(db, "favorites"),
              where("userId", "==", user.id),
              limit(4)
            ));
            const ids = favSnap.docs.map(d => d.data().productId).filter(Boolean);
            const productsData: FavoriteProduct[] = [];
            for (const id of ids) {
              const prodSnap = await getDoc(doc(db, "products", id));
              if (prodSnap.exists()) {
                const data = prodSnap.data();
                productsData.push({
                  id: prodSnap.id,
                  name: data.name || "",
                  image: data.images?.[0] || data.image || "",
                  price: data.price ?? 0
                });
              }
            }
            setFavoriteProducts(productsData);
          }
        }
      } catch (error) {
        console.error("Error al cargar datos del usuario:", error);
        toast({
          title: "Error al cargar perfil",
          description: "No pudimos cargar tu información. Intenta de nuevo más tarde.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNotificationChange = (type: string, value: boolean) => {
    setFormData({
      ...formData,
      notifications: {
        ...formData.notifications,
        [type]: value
      }
    });
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewAddress({
      ...newAddress,
      [e.target.name]: e.target.value
    });
  };

  const toggleDefaultAddress = () => {
    setNewAddress({
      ...newAddress,
      isDefault: !newAddress.isDefault
    });
  };

  const addNewAddress = async () => {
    if (!user) return;
    setAddressLoading(true);

    try {
      const addressRef = collection(db, "userAddresses");
      const newAddressData = {
        ...newAddress,
        userId: user.id,
        createdAt: Timestamp.now()
      };

      // Si es dirección predeterminada, actualizar las demás
      if (newAddress.isDefault) {
        const batch = writeBatch(db);
        const addressesQuery = query(
          collection(db, "userAddresses"),
          where("userId", "==", user.id),
          where("isDefault", "==", true)
        );
        const snapshot = await getDocs(addressesQuery);
        snapshot.forEach(doc => {
          batch.update(doc.ref, { isDefault: false });
        });
        await batch.commit();
      }

      // Añadir la nueva dirección
      await addDoc(addressRef, newAddressData);

      // Actualizar la UI
      setSavedAddresses([
        ...savedAddresses,
        { id: "temp-id", ...newAddress } // El ID real se obtendría al recargar
      ]);

      // Limpiar formulario
      setNewAddress({
        name: "",
        address: "",
        city: "",
        province: "",
        postalCode: "",
        isDefault: false
      });

      setAddingAddress(false);
      toast({
        title: "Dirección añadida",
        description: "Tu nueva dirección ha sido guardada correctamente."
      });
    } catch (error) {
      console.error("Error al añadir dirección:", error);
      toast({
        title: "Error",
        description: "No pudimos guardar tu nueva dirección.",
        variant: "destructive"
      });
    } finally {
      setAddressLoading(false);
    }
  };

  const setAddressAsDefault = async (addressId: string) => {
    if (!user) return;
    setAddressLoading(true);

    try {
      // Quitar predeterminado de todas las direcciones
      const batch = writeBatch(db);
      const addressesQuery = query(
        collection(db, "userAddresses"),
        where("userId", "==", user.id)
      );
      const snapshot = await getDocs(addressesQuery);
      snapshot.forEach(doc => {
        batch.update(doc.ref, { isDefault: doc.id === addressId });
      });
      await batch.commit();

      // Actualizar UI
      const updatedAddresses = savedAddresses.map(addr => ({
        ...addr,
        isDefault: addr.id === addressId
      }));
      setSavedAddresses(updatedAddresses);

      toast({
        title: "Dirección actualizada",
        description: "Dirección predeterminada actualizada correctamente."
      });
    } catch (error) {
      console.error("Error al actualizar dirección:", error);
      toast({
        title: "Error",
        description: "No pudimos actualizar tu dirección predeterminada.",
        variant: "destructive"
      });
    } finally {
      setAddressLoading(false);
    }
  };

  const removeAddress = async (addressId: string) => {
    if (!user) return;
    setAddressLoading(true);

    try {
      await deleteDoc(doc(db, "userAddresses", addressId));

      // Actualizar UI
      setSavedAddresses(savedAddresses.filter(addr => addr.id !== addressId));

      toast({
        title: "Dirección eliminada",
        description: "La dirección ha sido eliminada correctamente."
      });
    } catch (error) {
      console.error("Error al eliminar dirección:", error);
      toast({
        title: "Error",
        description: "No pudimos eliminar la dirección.",
        variant: "destructive"
      });
    } finally {
      setAddressLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        name: formData.name,
        phone: formData.phone,
        city: formData.city,
        province: formData.province,
        postalCode: formData.postalCode,
        address: formData.address,
        birthdate: formData.birthdate,
        preferences: formData.preferences,
        notifications: formData.notifications,
        updatedAt: new Date()
      });
      updateUser(formData); // Actualiza en el contexto
      toast({
        title: "Perfil actualizado",
        description: "Tus datos han sido guardados correctamente."
      });
      setEditing(false);
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar tu perfil.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-slate-100 text-slate-700';
      case 'confirmed': return 'bg-emerald-100 text-emerald-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-amber-100 text-amber-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmado';
      case 'processing': return 'Procesando';
      case 'shipped': return 'Enviado';
      case 'delivered': return 'Entregado';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconocido';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle2 className="h-4 w-4" />;
      case 'processing': return <CustomClock className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (!user) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 mt-8 sm:px-6">
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-100 to-amber-50 p-12 flex flex-col items-center justify-center">
            <div className="h-20 w-20 bg-white rounded-full shadow-md flex items-center justify-center mb-6">
              <UserIcon className="h-10 w-10 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Perfil de Usuario</h2>
            <p className="text-gray-600 mb-6">Accede a tu cuenta para ver tu información personal</p>
            <Button className="gradient-orange">Iniciar sesión</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mt-6 pb-16 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Cuenta</h1>
        <p className="text-gray-500 text-sm">Gestiona tus datos personales, direcciones y pedidos</p>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8 w-full justify-start bg-transparent p-0 gap-x-1 border-b border-gray-200">
          <TabsTrigger
            value="profile"
            className="px-4 py-3 text-sm font-medium text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none bg-transparent data-[state=active]:shadow-none hover:text-gray-900 transition-colors"
          >
            <UserIcon className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger
            value="addresses"
            className="px-4 py-3 text-sm font-medium text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none bg-transparent data-[state=active]:shadow-none hover:text-gray-900 transition-colors"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Direcciones
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            className="px-4 py-3 text-sm font-medium text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none bg-transparent data-[state=active]:shadow-none hover:text-gray-900 transition-colors"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger
            value="favorites"
            className="px-4 py-3 text-sm font-medium text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none bg-transparent data-[state=active]:shadow-none hover:text-gray-900 transition-colors"
          >
            <Heart className="h-4 w-4 mr-2" />
            Favoritos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <Card className="overflow-hidden border border-gray-200 shadow-sm">
                <CardHeader className="bg-white border-b border-gray-200 py-5">
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
                    <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-gray-700" />
                    </div>
                    Información Personal
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-500 mt-1">
                    Actualiza tu información personal
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 bg-gray-50/50 space-y-5">
                  {loading ? (
                    <div className="flex justify-center items-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-4"
                    >
                      <div className="bg-white rounded-lg p-5 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Nombre completo
                            </label>
                            <Input
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              disabled={!editing}
                              placeholder="Tu nombre completo"
                              className={`h-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900 ${!editing ? 'bg-gray-50 text-gray-600' : 'bg-white'}`}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-2">
                              Email
                              <BadgeCheck className="h-3.5 w-3.5 text-green-600" />
                            </label>
                            <Input
                              name="email"
                              value={formData.email}
                              disabled
                              className="h-10 bg-gray-50 text-gray-600 border-gray-300"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-5 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Teléfono
                            </label>
                            <Input
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              disabled={!editing}
                              placeholder="Tu número de teléfono"
                              className={`h-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900 ${!editing ? 'bg-gray-50 text-gray-600' : 'bg-white'}`}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Fecha de nacimiento
                            </label>
                            <Input
                              type="date"
                              name="birthdate"
                              value={formData.birthdate}
                              onChange={handleChange}
                              disabled={!editing}
                              className={`h-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900 ${!editing ? 'bg-gray-50 text-gray-600' : 'bg-white'}`}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-5 border border-gray-200">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Preferencias de regalo
                          </label>
                          <Textarea
                            name="preferences"
                            value={formData.preferences}
                            onChange={handleChange}
                            disabled={!editing}
                            placeholder="¿Qué tipo de regalos te gusta recibir? Esto nos ayuda a recomendarte productos"
                            className={`min-h-[100px] border-gray-300 focus:border-gray-900 focus:ring-gray-900 ${!editing ? 'bg-gray-50 text-gray-600' : 'bg-white'}`}
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end gap-3 border-t border-gray-200">
                        {editing ? (
                          <>
                            <Button
                              onClick={() => setEditing(false)}
                              variant="outline"
                              className="h-10 border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancelar
                            </Button>
                            <Button
                              onClick={handleSave}
                              className="h-10 bg-gray-900 hover:bg-gray-800 text-white"
                              disabled={loading}
                            >
                              {loading ? (
                                <>
                                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                                  Guardando...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  Guardar cambios
                                </>
                              )}
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => setEditing(true)}
                            className="h-10 bg-gray-900 hover:bg-gray-800 text-white"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar información
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4">
              <Card className="border border-gray-200 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-white p-6 border-b border-gray-200">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-16 w-16 border-2 border-gray-200">
                        <AvatarFallback className="bg-gray-100 text-gray-700 text-lg font-semibold">
                          {formData.name ? formData.name.substring(0, 2).toUpperCase() : (user.email?.substring(0, 2) || "").toUpperCase()}
                        </AvatarFallback>
                        <AvatarImage src={''} />
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900 truncate">{formData.name || 'Usuario'}</h3>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <Badge className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-100">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Cliente Verificado
                      </Badge>
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50/50">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Cliente desde</p>
                          <p className="text-sm font-medium text-gray-900">{format(new Date(), 'MMMM yyyy')}</p>
                        </div>
                        <History className="h-5 w-5 text-gray-400" />
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Última actividad</p>
                          <p className="text-sm font-medium text-gray-900">{format(new Date(), 'dd/MM/yyyy')}</p>
                        </div>
                        <CustomClock className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="addresses" className="mt-0">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold">Mis Direcciones</CardTitle>
                {!addingAddress && (
                  <Button
                    onClick={() => setAddingAddress(true)}
                    className="gradient-orange"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir dirección
                  </Button>
                )}
              </div>
              <CardDescription>Administra tus direcciones de envío</CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              {addressLoading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {addingAddress && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-6"
                    >
                      <h3 className="text-lg font-medium mb-4 text-orange-800">Nueva dirección</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Nombre de la dirección</label>
                          <Input
                            name="name"
                            value={newAddress.name}
                            onChange={handleAddressChange}
                            placeholder="Casa, Trabajo, etc."
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Dirección completa</label>
                          <Input
                            name="address"
                            value={newAddress.address}
                            onChange={handleAddressChange}
                            placeholder="Calle, número, etc."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Ciudad</label>
                          <Input
                            name="city"
                            value={newAddress.city}
                            onChange={handleAddressChange}
                            placeholder="Ciudad"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Provincia</label>
                          <Input
                            name="province"
                            value={newAddress.province}
                            onChange={handleAddressChange}
                            placeholder="Provincia"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Código postal</label>
                          <Input
                            name="postalCode"
                            value={newAddress.postalCode}
                            onChange={handleAddressChange}
                            placeholder="CP"
                          />
                        </div>
                      </div>

                      <div className="flex items-center mb-4">
                        <Switch
                          checked={newAddress.isDefault}
                          onCheckedChange={toggleDefaultAddress}
                          id="default-address"
                        />
                        <label htmlFor="default-address" className="ml-2 text-sm text-gray-700">
                          Establecer como dirección predeterminada
                        </label>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={addNewAddress}
                          className="gradient-orange"
                          disabled={addressLoading}
                        >
                          Guardar dirección
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setAddingAddress(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    {savedAddresses.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="h-16 w-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <MapPin className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-700 mb-2">No tienes direcciones guardadas</h3>
                        <p className="text-gray-500 mb-4">Añade una dirección para agilizar tus futuros pedidos</p>
                        <Button
                          onClick={() => setAddingAddress(true)}
                          className="gradient-orange"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Añadir mi primera dirección
                        </Button>
                      </div>
                    ) : (
                      savedAddresses.map((address) => (
                        <div
                          key={address.id}
                          className={`border rounded-lg p-4 ${address.isDefault ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                              <MapPinned className="h-5 w-5 mr-2 text-orange-500" />
                              <h3 className="font-medium text-gray-800">
                                {address.name}
                                {address.isDefault && (
                                  <Badge className="ml-2 bg-orange-100 text-orange-800 hover:bg-orange-200">
                                    Predeterminada
                                  </Badge>
                                )}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2">
                              {!address.isDefault && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setAddressAsDefault(address.id)}
                                  className="h-8 text-xs"
                                >
                                  Predeterminada
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                                onClick={() => removeAddress(address.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="text-gray-600 text-sm mt-2">
                            <p>{address.address}</p>
                            <p>{address.city}, {address.province}</p>
                            <p>{address.postalCode}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-0">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Mis Pedidos</CardTitle>
              <CardDescription>Historial de tus compras recientes</CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              {recentOrders.length === 0 ? (
                <div className="text-center py-10">
                  <div className="h-16 w-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No tienes pedidos recientes</h3>
                  <p className="text-gray-500 mb-4">Cuando realices una compra, aparecerá aquí</p>
                  <Button className="gradient-orange">
                    Ver productos
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Pedido #{order.id.substring(0, 6)}</p>
                          <p className="font-medium">{format(order.date, 'dd/MM/yyyy')}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full flex items-center ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1 text-sm font-medium">{getStatusText(order.status)}</span>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <p className="text-sm text-gray-500">Total del pedido</p>
                            <p className="font-semibold text-lg">${order.total.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 text-right">Productos</p>
                            <p className="font-medium text-right">{order.items} {order.items === 1 ? 'producto' : 'productos'}</p>
                          </div>
                        </div>

                        {order.status === 'shipped' && order.trackingNumber && (
                          <div className="bg-blue-50 p-3 rounded-lg flex items-center">
                            <Truck className="h-5 w-5 text-blue-600 mr-3" />
                            <div>
                              <p className="text-sm font-medium text-blue-800">En camino</p>
                              <p className="text-xs text-blue-600">Seguimiento: {order.trackingNumber}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                          <Button variant="outline" size="sm" className="text-sm">
                            Ver detalles
                          </Button>
                          {order.status === 'delivered' && (
                            <Button size="sm" variant="ghost" className="text-sm">
                              <Star className="h-4 w-4 mr-1" /> Valorar productos
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {recentOrders.length > 0 && (
              <CardFooter className="px-6 pb-6 pt-0">
                <Button variant="link" className="mx-auto flex items-center">
                  <History className="h-4 w-4 mr-1" />
                  Ver historial completo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="favorites" className="mt-0">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Mis Favoritos</CardTitle>
              <CardDescription>Productos que te han gustado</CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              {favoriteProducts.length === 0 ? (
                <div className="text-center py-10">
                  <div className="h-16 w-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Heart className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No tienes favoritos guardados</h3>
                  <p className="text-gray-500 mb-4">Guarda productos que te gusten para verlos después</p>
                  <Button className="gradient-orange">
                    Explorar productos
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {favoriteProducts.map((product) => (
                    <Card key={product.id} className="overflow-hidden border">
                      <div className="aspect-square relative">
                        <img
                          src={product.image || '/placeholder-product.png'}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 hover:bg-white shadow-sm"
                        >
                          <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                        </Button>
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-medium text-sm line-clamp-2 h-10">{product.name}</h3>
                        <p className="font-bold text-orange-600 mt-1">${product.price?.toLocaleString()}</p>
                        <Button className="w-full mt-2 gradient-orange text-xs h-8">
                          Añadir al carrito
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>

            {favoriteProducts.length > 0 && (
              <CardFooter className="px-6 pb-6 pt-0">
                <Button variant="link" className="mx-auto flex items-center">
                  Ver todos mis favoritos
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};