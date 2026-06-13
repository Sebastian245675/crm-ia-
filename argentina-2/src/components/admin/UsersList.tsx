import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Search, Eye, Edit, Shield, Mail, Send, Clock,
  Key, User, X, Save, RefreshCw, UserCog, Users, CheckCheck, Filter
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { db, collection, getDocs } from "@/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const UsersList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubscribers, setLoadingSubscribers] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("usuarios");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState<boolean>(false);
  const [viewDialogOpen, setViewDialogOpen] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>("all");
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    departmentNumber: "",
    address: "",
  });
  const [newPassword, setNewPassword] = useState<string>("");
  const [emailContent, setEmailContent] = useState({
    subject: "",
    body: "",
  });

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
      setLoading(false);
    };

    const fetchSubscribers = async () => {
      setLoadingSubscribers(true);
      try {
        const querySnapshot = await getDocs(collection(db, "suscripciones"));
        const subscribersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSubscribers(subscribersData);
      } catch (error) {
        console.error("Error al obtener suscriptores:", error);
      } finally {
        setLoadingSubscribers(false);
      }
    };

    fetchUsers();
    fetchSubscribers();
  }, []);

  // Filtrar usuarios según el término de búsqueda
  const filteredUsers = users.filter(user => {
    // Primero aplicar filtro de estado si está activo
    if (filter === "admin" && !user.isAdmin) return false;
    if (filter === "normal" && user.isAdmin) return false;

    // Luego aplicar término de búsqueda
    return (
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.departmentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.conjunto?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Función para editar usuario
  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      departmentNumber: user.departmentNumber || user.conjunto || "",
      address: user.address || "",
    });
    setEditDialogOpen(true);
  };

  // Función para cambiar contraseña
  const handleChangePassword = (user: any) => {
    setSelectedUser(user);
    setNewPassword("");
    setPasswordDialogOpen(true);
  };

  // Función para ver detalles del usuario
  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  // Función para guardar cambios del usuario
  const saveUserChanges = async () => {
    try {
      // Aquí iría la lógica para guardar los cambios en Firebase
      // Por ahora simulamos la acción exitosa
      toast({
        title: "Cambios guardados",
        description: `Los datos de ${editForm.name} han sido actualizados`,
      });
      setEditDialogOpen(false);

      // Actualizar usuario en el estado local
      setUsers(users.map(user =>
        user.id === selectedUser.id
          ? { ...user, ...editForm }
          : user
      ));
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    }
  };

  // Función para cambiar contraseña
  const saveNewPassword = async () => {
    try {
      // Aquí iría la lógica para cambiar la contraseña en Firebase Auth
      // Por ahora simulamos la acción exitosa
      toast({
        title: "Contraseña cambiada",
        description: `La contraseña de ${selectedUser.name} ha sido actualizada`,
      });
      setPasswordDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar la contraseña",
        variant: "destructive"
      });
    }
  };

  // Función para enviar correo masivo
  const sendMassEmail = async () => {
    try {
      // Aquí iría la lógica para enviar el correo utilizando Firebase Functions
      // Por ahora simulamos la acción exitosa
      toast({
        title: "Correo enviado",
        description: `El correo ha sido enviado a ${subscribers.length} suscriptores`,
      });

      // Resetear el formulario
      setEmailContent({
        subject: "",
        body: ""
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el correo",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs
        defaultValue="usuarios"
        className="w-full"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-2 bg-sky-50">
          <TabsTrigger
            value="usuarios"
            className="data-[state=active]:bg-gradient-to-r from-sky-500 to-blue-600 data-[state=active]:text-white"
          >
            <Users className="h-4 w-4 mr-2" />
            Gestión de Usuarios
          </TabsTrigger>
          <TabsTrigger
            value="envio-masivo"
            className="data-[state=active]:bg-gradient-to-r from-sky-500 to-blue-600 data-[state=active]:text-white"
          >
            <Mail className="h-4 w-4 mr-2" />
            Envío Masivo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-6">
          <Card className="border-sky-100 shadow-md">
            <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-sky-100">
              <CardTitle className="flex items-center gap-2 text-sky-700">
                <Shield className="h-5 w-5 text-sky-600" />
                Gestión de Usuarios ({filteredUsers.length})
              </CardTitle>
              <CardDescription className="text-sky-600">
                Administra los usuarios registrados en la plataforma
              </CardDescription>

              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sky-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por nombre, email o departamento..."
                    className="pl-10 border-sky-200 focus-visible:ring-sky-300"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-sky-200 text-sky-700 hover:bg-sky-50 w-full sm:w-auto">
                      <Filter className="h-4 w-4 mr-2" />
                      Filtrar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white">
                    <DropdownMenuLabel>Tipo de usuario</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className={filter === "all" ? "bg-sky-50 text-sky-700" : ""}
                      onClick={() => setFilter("all")}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Todos
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={filter === "admin" ? "bg-sky-50 text-sky-700" : ""}
                      onClick={() => setFilter("admin")}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Administradores
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={filter === "normal" ? "bg-sky-50 text-sky-700" : ""}
                      onClick={() => setFilter("normal")}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Usuarios normales
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center items-center py-12 text-sky-600">
                  <RefreshCw className="h-6 w-6 mr-2 animate-spin" />
                  <span>Cargando usuarios...</span>
                </div>
              ) : (
                <div className="rounded-lg border border-sky-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-sky-50">
                      <TableRow className="hover:bg-sky-100/70">
                        <TableHead className="text-sky-700">Usuario</TableHead>
                        <TableHead className="text-sky-700">Departamento</TableHead>
                        <TableHead className="text-sky-700">Contacto</TableHead>
                        <TableHead className="text-sky-700">Estado</TableHead>
                        <TableHead className="text-sky-700">Registro</TableHead>
                        <TableHead className="text-right text-sky-700">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-sky-50/50">
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {user.name}
                                {user.isAdmin && (
                                  <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs hover:from-orange-600 hover:to-red-700">
                                    Admin
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-sky-700/70">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sky-800">{user.departmentNumber || user.conjunto}</div>
                              <div className="text-sm text-sky-600/70">{user.address}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-sky-700">{user.phone}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                              Activo
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="text-sm">
                                {user.registeredAt
                                  ? new Date(user.registeredAt).toLocaleDateString('es-AR')
                                  : ''}
                              </div>
                              <div className="text-xs text-sky-600/70">
                                {user.lastActive
                                  ? `Último acceso: ${new Date(user.lastActive).toLocaleDateString('es-AR')}`
                                  : ''}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-sky-600 border-sky-200 hover:bg-sky-50 hover:border-sky-300"
                                onClick={() => handleViewUser(user)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:border-amber-300"
                                onClick={() => handleChangePassword(user)}
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {filteredUsers.length === 0 && !loading && (
                <div className="text-center py-12 bg-sky-50/30">
                  <User className="h-12 w-12 text-sky-300 mx-auto mb-3" />
                  <p className="text-sky-700 font-medium">No se encontraron usuarios</p>
                  <p className="text-sm text-sky-600/70 mt-1">Prueba con otros términos de búsqueda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="envio-masivo" className="mt-6">
          <Card className="border-sky-100 shadow-md">
            <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-sky-100">
              <CardTitle className="flex items-center gap-2 text-sky-700">
                <Mail className="h-5 w-5 text-sky-600" />
                Envío Masivo de Correos
              </CardTitle>
              <CardDescription className="text-sky-600">
                Envía correos a todos los suscriptores ({subscribers.length} suscriptores)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingSubscribers ? (
                <div className="flex justify-center items-center py-12 text-sky-600">
                  <RefreshCw className="h-6 w-6 mr-2 animate-spin" />
                  <span>Cargando suscriptores...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email-subject" className="text-sky-700">Asunto del correo</Label>
                    <Input
                      id="email-subject"
                      placeholder="Ej: Novedades de la tienda"
                      className="border-sky-200 focus-visible:ring-sky-300"
                      value={emailContent.subject}
                      onChange={(e) => setEmailContent({ ...emailContent, subject: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-body" className="text-sky-700">Contenido del correo</Label>
                    <Textarea
                      id="email-body"
                      placeholder="Escribe el contenido del correo aquí..."
                      className="min-h-[200px] border-sky-200 focus-visible:ring-sky-300"
                      value={emailContent.body}
                      onChange={(e) => setEmailContent({ ...emailContent, body: e.target.value })}
                    />
                  </div>

                  <div className="p-4 border border-blue-100 rounded-lg bg-blue-50 text-blue-700 text-sm">
                    <p className="flex items-center font-medium mb-2">
                      <CheckCheck className="h-4 w-4 mr-2" />
                      Suscriptores a los que se enviará:
                    </p>
                    <div className="max-h-[150px] overflow-y-auto pl-6">
                      <ul className="list-disc space-y-1">
                        {subscribers.slice(0, 10).map((sub, index) => (
                          <li key={index} className="text-blue-600">{sub.email}</li>
                        ))}
                        {subscribers.length > 10 && (
                          <li className="text-blue-500 font-medium">Y {subscribers.length - 10} más...</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-600 hover:to-blue-700"
                    disabled={!emailContent.subject || !emailContent.body}
                    onClick={sendMassEmail}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar correo a {subscribers.length} suscriptores
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo de edición de usuario */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-sky-700 flex items-center gap-2">
              <UserCog className="h-5 w-5 text-sky-600" />
              Editar Usuario
            </DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario. Haz clic en guardar cuando termines.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sky-700">Nombre</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="border-sky-200 focus-visible:ring-sky-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sky-700">Correo electrónico</Label>
              <Input
                id="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="border-sky-200 focus-visible:ring-sky-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sky-700">Teléfono</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="border-sky-200 focus-visible:ring-sky-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deptNumber" className="text-sky-700">Departamento</Label>
              <Input
                id="deptNumber"
                value={editForm.departmentNumber}
                onChange={(e) => setEditForm({ ...editForm, departmentNumber: e.target.value })}
                className="border-sky-200 focus-visible:ring-sky-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sky-700">Dirección</Label>
              <Input
                id="address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="border-sky-200 focus-visible:ring-sky-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="border-sky-200 text-sky-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveUserChanges}
              className="bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-600 hover:to-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de cambio de contraseña */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-sky-700 flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-500" />
              Cambiar Contraseña
            </DialogTitle>
            <DialogDescription>
              Establece una nueva contraseña para {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sky-700">Nueva contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="border-sky-200 focus-visible:ring-sky-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
              className="border-sky-200 text-sky-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveNewPassword}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
            >
              <Key className="h-4 w-4 mr-2" />
              Cambiar contraseña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para ver detalles del usuario */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-sky-700 flex items-center gap-2">
              <User className="h-5 w-5 text-sky-600" />
              Detalles del Usuario
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-2">
              <div className="bg-sky-50 p-4 rounded-lg border border-sky-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-sky-800">{selectedUser.name}</h3>
                    <p className="text-sky-600">{selectedUser.email}</p>
                  </div>
                  {selectedUser.isAdmin && (
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                      Administrador
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-sky-500">Departamento</p>
                  <p className="font-medium">{selectedUser.departmentNumber || selectedUser.conjunto || "No especificado"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-sky-500">Teléfono</p>
                  <p className="font-medium">{selectedUser.phone || "No especificado"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-sky-500">Dirección</p>
                  <p className="font-medium">{selectedUser.address || "No especificada"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-sky-500">Fecha de registro</p>
                  <p className="font-medium">
                    {selectedUser.registeredAt
                      ? new Date(selectedUser.registeredAt).toLocaleDateString('es-AR')
                      : "No disponible"}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-4">
                <h4 className="font-medium text-blue-700 mb-2">Historial de actividad</h4>
                <div className="space-y-2 text-sm">
                  {selectedUser.lastActive ? (
                    <p className="flex items-center text-blue-600">
                      <Clock className="h-4 w-4 mr-2 opacity-70" />
                      Último acceso: {new Date(selectedUser.lastActive).toLocaleDateString('es-AR')}
                    </p>
                  ) : (
                    <p className="text-blue-600 opacity-70">No hay datos de actividad</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setViewDialogOpen(false)}
              className="bg-sky-100 text-sky-700 hover:bg-sky-200"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
