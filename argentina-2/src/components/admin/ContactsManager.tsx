import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Plus,
  Download,
  MoreVertical,
  Search,
  Filter,
  ArrowUpDown,
  Settings,
  List,
  Users,
  Building2,
  RotateCcw,
  CheckSquare,
  Mail,
  Phone,
  Calendar,
  Tag as TagIcon,
  User,
  History,
  Trash2,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from '@/hooks/use-toast';
import { db, getDocs, collection, query, orderBy } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  createdAt: Date;
  lastActivity?: Date;
  tags?: string[];
  avatar?: string;
  customFields?: Record<string, string>;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'done' | string;
  contactId?: string;
  contactName?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

interface ContactFormState {
  name: string;
  phone: string;
  email: string;
  company: string;
  tags: string[];
  customFields: Record<string, string>;
}

interface CustomFieldDefinition {
  key: string;
  label: string;
}

export const ContactsManager: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('smart-lists');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCreateTagDialog, setShowCreateTagDialog] = useState(false);
  const [showFieldsDialog, setShowFieldsDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newGlobalTag, setNewGlobalTag] = useState('');
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [newCustomFieldLabel, setNewCustomFieldLabel] = useState('');
  const [newContact, setNewContact] = useState<ContactFormState>({ name: '', phone: '', email: '', company: '', tags: [], customFields: {} });
  const [newContactTag, setNewContactTag] = useState('');
  const [newTask, setNewTask] = useState({ title: '', description: '', contactId: '', dueDate: '', status: 'pending' });
  const isSupabase = typeof (db as any)?.from === 'function';

  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkRemoveTagInput, setBulkRemoveTagInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadContacts();
    loadTasks();
  }, []);

  const handleExportContacts = () => {
    if (selectedContacts.length === 0) {
      toast({
        title: 'Ningún contacto seleccionado',
        description: 'Selecciona al menos un contacto para exportar.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const contactsToExport = contacts.filter(c => selectedContacts.includes(c.id));
      
      // Generate CSV content
      const headers = ['Nombre', 'Teléfono', 'Email', 'Empresa', 'Etiquetas', 'Fecha de Creación'];
      const rows = contactsToExport.map(c => [
        `"${c.name.replace(/"/g, '""')}"`,
        `"${(c.phone || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${(c.company || '').replace(/"/g, '""')}"`,
        `"${(c.tags || []).join(', ').replace(/"/g, '""')}"`,
        `"${c.createdAt.toISOString()}"`
      ]);

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `contactos_exportados_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Exportación completada',
        description: `Se han exportado ${contactsToExport.length} contactos a un archivo CSV.`
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'No se pudieron exportar los contactos.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteSelected = () => {
    if (selectedContacts.length === 0) {
      toast({
        title: 'Ningún contacto seleccionado',
        description: 'Por favor, selecciona al menos un contacto de la lista.',
        variant: 'destructive'
      });
      return;
    }
    setShowDeleteConfirm(true);
  };

  const executeDeleteSelected = async () => {
    setShowDeleteConfirm(false);
    setLoading(true);
    try {
      if (isSupabase) {
        const { error } = await db.from('contacts').delete().in('id', selectedContacts);
        if (error) throw error;
      } else {
        toast({ title: 'Error', description: 'No se usa Supabase para esta operación.', variant: 'destructive'});
        return;
      }

      toast({
        title: 'Contactos eliminados',
        description: `Se han eliminado ${selectedContacts.length} contactos correctamente.`
      });
      setSelectedContacts([]);
      await loadContacts();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'No se pudieron eliminar los contactos.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAddTag = async (tag: string) => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;
    setLoading(true);
    try {
      if (isSupabase) {
        const promises = contacts
          .filter(c => selectedContacts.includes(c.id))
          .map(c => {
            const currentTags = c.tags || [];
            if (!currentTags.includes(cleanTag)) {
              return db.from('contacts').update({ tags: [...currentTags, cleanTag] }).eq('id', c.id);
            }
            return Promise.resolve();
          });
        await Promise.all(promises);
      }

      toast({
        title: 'Etiqueta asociada masivamente',
        description: `Se añadió la etiqueta '${cleanTag}' a los contactos seleccionados.`
      });
      setBulkTagInput('');
      await loadContacts();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'No se pudo asociar la etiqueta masivamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRemoveTag = async (tag: string) => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;
    setLoading(true);
    try {
      if (isSupabase) {
        const promises = contacts
          .filter(c => selectedContacts.includes(c.id))
          .map(c => {
            const currentTags = c.tags || [];
            if (currentTags.includes(cleanTag)) {
              return db.from('contacts').update({ tags: currentTags.filter(t => t !== cleanTag) }).eq('id', c.id);
            }
            return Promise.resolve();
          });
        await Promise.all(promises);
      }

      toast({
        title: 'Etiqueta eliminada masivamente',
        description: `Se eliminó la etiqueta '${cleanTag}' de los contactos seleccionados.`
      });
      setBulkRemoveTagInput('');
      await loadContacts();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'No se pudo desasociar la etiqueta masivamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name.trim()) {
      toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }

    setSavingContact(true);
    try {
      if (isSupabase) {
        const insertPayload: any = {
          name: newContact.name,
          phone: newContact.phone,
          email: newContact.email,
          company: newContact.company,
          tags: newContact.tags,
          created_at: new Date().toISOString()
        };

        if (Object.keys(newContact.customFields).length > 0) {
          insertPayload.custom_fields = newContact.customFields;
        }

        const { data, error } = await (db as any).from('contacts').insert([insertPayload]).select();
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const newSavedContact = {
            id: data[0].id,
            name: data[0].name || '',
            phone: data[0].phone || '',
            email: data[0].email || '',
            company: data[0].company || '',
            createdAt: new Date(data[0].created_at),
            tags: data[0].tags || [],
            avatar: data[0].avatar || '',
            customFields: newContact.customFields
          };
          setContacts(prev => [newSavedContact, ...prev]);
          setAvailableTags(prev => Array.from(new Set([...(prev || []), ...(newSavedContact.tags || [])])));
        }
      } else {
        toast({ title: 'Error', description: 'No se usa Firebase, favor configurar Supabase.', variant: 'destructive'});
      }

      setNewContact({ name: '', phone: '', email: '', company: '', tags: [] });
      setNewContactTag('');
      setShowAddDialog(false);
      toast({ title: 'Contacto Agregado', description: 'El contacto ha sido guardado exitosamente.' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: 'No se pudo guardar el contacto.', variant: 'destructive' });
    } finally {
      setSavingContact(false);
    }
  };

  const handleAddNewContactTag = () => {
    const tag = newContactTag.trim();
    if (!tag) return;
    if (newContact.tags.length >= 1) {
      toast({ title: 'Etiqueta única', description: 'Solo se permite una etiqueta por contacto.', variant: 'destructive' });
      setNewContactTag('');
      return;
    }
    if (newContact.tags.includes(tag)) {
      setNewContactTag('');
      return;
    }
    setNewContact(prev => ({ ...prev, tags: [tag] }));
    setNewContactTag('');
  };

  const handleRemoveNewContactTag = (tag: string) => {
    setNewContact(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const syncAvailableTags = (contactsList: Contact[]) => {
    setAvailableTags(prev => Array.from(new Set([...(prev || []), ...contactsList.flatMap(contact => contact.tags || [])])));
  };

  const handleAddGlobalTag = () => {
    const tag = newGlobalTag.trim();
    if (!tag) return;
    if (availableTags.includes(tag)) {
      setNewGlobalTag('');
      return;
    }
    setAvailableTags(prev => [...prev, tag]);
    setNewGlobalTag('');
    toast({ title: 'Etiqueta creada', description: `Etiqueta '${tag}' agregada a la lista global.` });
  };

  const updateContactTags = async (contactId: string, tags: string[]) => {
    if (!isSupabase) {
      toast({ title: 'Error', description: 'No se usa Supabase para actualizar etiquetas.', variant: 'destructive' });
      return false;
    }

    try {
      const { error } = await db.from('contacts').update({ tags }).eq('id', contactId);
      if (error) throw error;
      setContacts(prev => {
        const updated = prev.map(contact => contact.id === contactId ? { ...contact, tags } : contact);
        syncAvailableTags(updated);
        return updated;
      });
      return true;
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudieron actualizar las etiquetas.', variant: 'destructive' });
      return false;
    }
  };

  const handleAssociateTag = async (contactId: string, tag: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    const tags = Array.from(new Set([...(contact.tags || []), tag]));
    const success = await updateContactTags(contactId, tags);
    if (success) {
      toast({ title: 'Etiqueta asociada', description: `La etiqueta '${tag}' se agregó al contacto.` });
    }
  };

  const handleRemoveTag = async (contactId: string, tag: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    const tags = (contact.tags || []).filter(t => t !== tag);
    await updateContactTags(contactId, tags);
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      if (isSupabase) {
        const { data, error } = await db
          .from('contacts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading contacts:', error);
        } else if (data) {
          const contactsData = data.map((contact: any) => ({
            id: contact.id,
            name: contact.name || '',
            phone: contact.phone || '',
            email: contact.email || '',
            company: contact.company || '',
            createdAt: contact.created_at ? new Date(contact.created_at) : new Date(),
            lastActivity: contact.last_activity ? new Date(contact.last_activity) : undefined,
            tags: contact.tags || [],
            avatar: contact.avatar || '',
            customFields: contact.custom_fields || contact.customFields || {}
          }));
          setContacts(contactsData);
          syncAvailableTags(contactsData);
        }
      } else {
        // Firebase fallback (MOCKED)
        const contactsRef = collection(db, 'contacts');
        const q = query(contactsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const contactsData: Contact[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          contactsData.push({
            id: doc.id,
            name: data.name || '',
            phone: data.phone || '',
            email: data.email || '',
            company: data.company || '',
            createdAt: data.createdAt?.toDate() || new Date(),
            lastActivity: data.lastActivity?.toDate(),
            tags: data.tags || [],
            avatar: data.avatar || '',
            customFields: data.customFields || {}
          });
        });
        setContacts(contactsData);
        syncAvailableTags(contactsData);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los contactos.'
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string): string => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-yellow-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const generateFieldKey = (label: string): string => {
    return label
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  };

  const handleAddCustomField = () => {
    const label = newCustomFieldLabel.trim();
    if (!label) return;
    const key = generateFieldKey(label);
    if (customFields.some(field => field.key === key)) {
      toast({ title: 'Campo duplicado', description: 'Ya existe un campo con ese nombre.', variant: 'destructive' });
      setNewCustomFieldLabel('');
      return;
    }
    setCustomFields(prev => [...prev, { key, label }]);
    setNewCustomFieldLabel('');
  };

  const handleRemoveCustomField = (key: string) => {
    setCustomFields(prev => prev.filter(field => field.key !== key));
    setNewContact(prev => {
      const nextCustomFields = { ...prev.customFields };
      delete nextCustomFields[key];
      return { ...prev, customFields: nextCustomFields };
    });
  };

  const handleCustomFieldValueChange = (key: string, value: string) => {
    setNewContact(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [key]: value
      }
    }));
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('es-ES', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Hace menos de una hora';
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} horas`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Hace ${diffInDays} días`;
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.name.toLowerCase().includes(searchLower) ||
      contact.phone?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.company?.toLowerCase().includes(searchLower)
    );
  });

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  const getContactName = (contactId?: string) => {
    if (!contactId) return 'Sin contacto';
    return contacts.find(contact => contact.id === contactId)?.name || 'Sin contacto';
  };

  const loadTasks = async () => {
    try {
      if (isSupabase) {
        const { data, error } = await db
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading tasks:', error);
        } else if (data) {
          setTasks(data.map((task: any) => ({
            id: task.id,
            title: task.title || '',
            description: task.description || '',
            status: task.status || 'pending',
            contactId: task.contact_id?.toString(),
            dueDate: task.due_date ? new Date(task.due_date) : undefined,
            createdAt: task.created_at ? new Date(task.created_at) : new Date(),
            updatedAt: task.updated_at ? new Date(task.updated_at) : undefined,
          })));
        }
      } else {
        // Fallback: no tasks in Firebase implementation for now.
        setTasks([]);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar las tareas.', variant: 'destructive' });
    }
  };

  const filteredTasks = selectedContacts.length === 1
    ? tasks.filter(task => task.contactId === selectedContacts[0])
    : tasks;

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      toast({ title: 'Error', description: 'El título de la tarea es obligatorio', variant: 'destructive' });
      return;
    }

    setSavingTask(true);
    try {
      if (isSupabase) {
        const { data, error } = await db.from('tasks').insert([
          {
            title: newTask.title,
            description: newTask.description,
            status: newTask.status,
            contact_id: newTask.contactId || null,
            due_date: newTask.dueDate || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]).select();

        if (error) throw error;

        if (data && data.length > 0) {
          const task = data[0];
          setTasks(prev => [{
            id: task.id,
            title: task.title || '',
            description: task.description || '',
            status: task.status || 'pending',
            contactId: task.contact_id?.toString(),
            dueDate: task.due_date ? new Date(task.due_date) : undefined,
            createdAt: task.created_at ? new Date(task.created_at) : new Date(),
            updatedAt: task.updated_at ? new Date(task.updated_at) : undefined,
          }, ...prev]);
        }
      } else {
        toast({ title: 'Error', description: 'No se usa Firebase, favor configurar Supabase.', variant: 'destructive' });
      }

      setNewTask({ title: '', description: '', contactId: '', dueDate: '', status: 'pending' });
      setShowTaskDialog(false);
      toast({ title: 'Tarea creada', description: 'La tarea se ha guardado correctamente.' });
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudo guardar la tarea.', variant: 'destructive' });
    } finally {
      setSavingTask(false);
    }
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
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Contactos
          </h1>
          <p className="text-slate-500 mt-1">
            Gestiona tus contactos y listas inteligentes con herramientas avanzadas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-slate-200 shadow-sm hidden sm:flex" onClick={handleExportContacts}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <div className="flex items-center gap-1">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-md active:scale-95" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Contacto
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 border border-transparent hover:border-slate-200">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Acciones de gestión</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => setShowCreateTagDialog(true)}>
                  <TagIcon className="mr-2 h-4 w-4" />
                  <span>Crear etiqueta</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Gestionar listas inteligentes</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  <span>Restaurar / Restablecer</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={handleDeleteSelected}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Eliminar seleccionados ({selectedContacts.length})</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-px">
          <TabsList className="bg-transparent p-0 h-auto flex flex-wrap gap-2 sm:gap-6">
            <TabsTrigger
              value="smart-lists"
              className="px-2 py-3 text-sm font-semibold text-slate-500 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none transition-all"
            >
              Listas inteligentes
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="px-2 py-3 text-sm font-semibold text-slate-500 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none transition-all"
            >
              Tareas
            </TabsTrigger>
          </TabsList>

          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-blue-600 gap-2 shrink-0 self-start sm:self-auto">
            <Settings className="h-4 w-4" />
            <span>Configuración</span>
          </Button>
        </div>

        {/* Info Message */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
          Las opciones de menú «Gestionar listas inteligentes» y «Restaurar» cambian de sitio. A partir del 29 de enero de 2026, las encontrará en el menú de acciones (:) junto al botón «Añadir contacto».
        </div>

        <TabsContent value="smart-lists" className="space-y-4">
          {/* Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900">Todos los contactos</h2>
              <div className="flex items-center bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold ring-1 ring-blue-100">
                {filteredContacts.length}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="bg-white border-slate-200 hover:bg-slate-50 shadow-sm">
                <Download className="h-3.5 w-3.5 mr-2 text-slate-500" />
                Importar
              </Button>
              <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-blue-600 flex items-center gap-2">
                <Filter className="h-3.5 w-3.5" />
                Filtros
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-blue-600 flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5" />
                Ordenar
              </Button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-3 flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg ring-1 ring-slate-200">
                <List className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                  Vista Predeterminada
                </span>
              </div>
            </div>

            <div className="lg:col-span-6 flex items-center gap-2">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Busca por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white border-slate-200 rounded-lg shadow-sm focus-visible:ring-blue-500 h-10"
                />
              </div>
            </div>

            <div className="lg:col-span-3 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" className="h-10 text-slate-600 hover:text-blue-600 border-slate-200 hover:bg-slate-50">
                <Plus className="h-3.5 w-3.5 mr-2" />
                Lista
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-slate-600 hover:text-blue-600 border-slate-200 hover:bg-slate-50"
                onClick={() => setShowFieldsDialog(true)}
              >
                <Settings className="h-3.5 w-3.5 mr-2" />
                Campos
              </Button>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {filteredContacts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-900">Sin contactos</h3>
                <p className="text-slate-500 text-sm">No hay resultados para tu búsqueda.</p>
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm active:bg-slate-50 transition-colors"
                  onClick={() => toggleContactSelection(contact.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {contact.avatar ? (
                        <img src={contact.avatar} className="w-10 h-10 rounded-full ring-2 ring-blue-50" />
                      ) : (
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold", getAvatarColor(contact.name))}>
                          {getInitials(contact.name)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-900">{contact.name}</h4>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => { }} // Controlled by parent div click
                      className="rounded text-blue-600 h-4 w-4"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {contact.phone || '-'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Mail className="h-3 w-3 text-slate-400" />
                      <span className="truncate">{contact.email || '-'}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {contact.tags?.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-none flex items-center gap-1 px-2 py-0">
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTag(contact.id, tag);
                            }}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    {contact.tags && contact.tags.length > 0 ? (
                      <div className="text-xs text-slate-500">Ya existe una etiqueta asociada. Elimina primero para cambiarla.</div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-8 w-8 rounded-md flex items-center justify-center text-slate-500 border border-slate-200 hover:bg-slate-50">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <DropdownMenuLabel>Etiquetas disponibles</DropdownMenuLabel>
                          {availableTags.filter(tag => !contact.tags?.includes(tag)).length === 0 ? (
                            <DropdownMenuItem className="cursor-default text-slate-500" disabled>
                              No hay etiquetas para asociar
                            </DropdownMenuItem>
                          ) : (
                            availableTags.filter(tag => !contact.tags?.includes(tag)).map((tag) => (
                              <DropdownMenuItem key={tag} onSelect={() => handleAssociateTag(contact.id, tag)}>
                                {tag}
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Contacts Table - Desktop Only */}
          <Card className="shadow-sm border border-slate-200 hidden lg:block overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-4 text-left w-10">
                        <input
                          type="checkbox"
                          checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition-colors">
                          Contacto
                          <ChevronDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition-colors">
                          Teléfono
                          <ChevronDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition-colors">
                          Email
                          <ChevronDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition-colors">
                          Creado
                          <ChevronDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        Etiquetas
                      </th>
                      <th className="px-5 py-4 text-right">
                        <Settings className="h-4 w-4 text-slate-300 ml-auto" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredContacts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-20 text-center">
                          <div className="flex flex-col items-center justify-center max-w-xs mx-auto">
                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                              <Users className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-slate-900 font-bold mb-1">No hay contactos</h3>
                            <p className="text-slate-500 text-sm">Prueba a cambiar los filtros o agrega un nuevo contacto para empezar.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredContacts.map((contact) => (
                        <tr key={contact.id} className="hover:bg-slate-50/50 transition-all cursor-pointer group">
                          <td className="px-5 py-4">
                            <input
                              type="checkbox"
                              checked={selectedContacts.includes(contact.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleContactSelection(contact.id);
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {contact.avatar ? (
                                <img
                                  src={contact.avatar}
                                  alt={contact.name}
                                  className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                                />
                              ) : (
                                <div className={cn(
                                  "w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white",
                                  getAvatarColor(contact.name)
                                )}>
                                  {getInitials(contact.name)}
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {contact.name || 'Sin nombre'}
                                </span>
                                {contact.tags && contact.tags.length > 0 && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {contact.tags[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-700 font-medium">
                            {contact.phone || '-'}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {contact.email ? (
                              <span className="truncate block max-w-[180px] hover:text-blue-600 transition-colors">
                                {contact.email}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600 font-medium">
                            <div className="flex items-center gap-2">
                              {contact.company ? (
                                <>
                                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="truncate max-w-[140px]">{contact.company}</span>
                                </>
                              ) : '-'}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-700">{formatDate(contact.createdAt).split(',')[0]}</span>
                              <span className="text-[10px]">{formatDate(contact.createdAt).split(',')[1]}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap gap-1.5">
                                {contact.tags?.map((tag, index) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="text-[10px] bg-slate-100 text-slate-600 border-none font-bold px-2 py-0 flex items-center gap-1"
                                  >
                                    <span>{tag}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveTag(contact.id, tag);
                                      }}
                                      className="text-slate-400 hover:text-slate-600"
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                              {contact.tags && contact.tags.length > 0 ? (
                                <div className="text-xs text-slate-500">Ya existe una etiqueta asociada. Elimina primero para cambiarla.</div>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full h-8 text-slate-600 justify-between">
                                      Asociar etiqueta
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="w-56">
                                    <DropdownMenuLabel>Etiquetas disponibles</DropdownMenuLabel>
                                    {availableTags.filter(tag => !contact.tags?.includes(tag)).length === 0 ? (
                                      <DropdownMenuItem className="cursor-default text-slate-500" disabled>
                                        No hay etiquetas para asociar
                                      </DropdownMenuItem>
                                    ) : (
                                      availableTags.filter(tag => !contact.tags?.includes(tag)).map((tag) => (
                                        <DropdownMenuItem key={tag} onSelect={() => handleAssociateTag(contact.id, tag)}>
                                          {tag}
                                        </DropdownMenuItem>
                                      ))
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100">
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Etiquetas disponibles</DropdownMenuLabel>
                                {availableTags.filter(tag => !contact.tags?.includes(tag)).length === 0 ? (
                                  <DropdownMenuItem className="cursor-default text-slate-500" disabled>
                                    No hay etiquetas para asociar
                                  </DropdownMenuItem>
                                ) : (
                                  availableTags.filter(tag => !contact.tags?.includes(tag)).map((tag) => (
                                    <DropdownMenuItem key={tag} onSelect={() => handleAssociateTag(contact.id, tag)}>
                                      {tag}
                                    </DropdownMenuItem>
                                  ))
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="reset" className="space-y-4">
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              Restablecer
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Tareas</h2>
              <p className="text-slate-500 text-sm">Crea tareas y vincúlalas a un contacto para darles seguimiento.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewTask(prev => ({
                    ...prev,
                    contactId: selectedContacts.length === 1 ? selectedContacts[0] : prev.contactId
                  }));
                  setShowTaskDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva tarea
              </Button>
            </div>
          </div>

          <Card className="shadow-sm border border-slate-200 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Título</th>
                      <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Contacto</th>
                      <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Estado</th>
                      <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Vence</th>
                      <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Creada</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                          No hay tareas disponibles. Crea una tarea y asociala a un contacto.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => (
                        <tr key={task.id}>
                          <td className="px-5 py-4 text-slate-800 font-medium">{task.title}</td>
                          <td className="px-5 py-4 text-slate-600">{getContactName(task.contactId)}</td>
                          <td className="px-5 py-4">
                            <Badge variant={task.status === 'done' ? 'secondary' : task.status === 'in-progress' ? 'outline' : 'destructive'}>
                              {task.status.replace('-', ' ')}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {task.dueDate ? formatDate(task.dueDate) : 'Sin fecha'}
                          </td>
                          <td className="px-5 py-4 text-slate-600">{formatDate(task.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage-lists" className="space-y-4">
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              Gestionar listas inteligentes
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Agregar Contacto */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <Plus className="h-5 w-5 text-blue-600" />
              Agregar Contacto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="contact-name" className="text-sm font-semibold">Nombre *</label>
              <Input
                id="contact-name"
                placeholder="Nombre completo"
                value={newContact.name}
                onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="contact-phone" className="text-sm font-semibold">Teléfono</label>
              <Input
                id="contact-phone"
                placeholder="Ej: +54 9 11 1234-5678"
                value={newContact.phone}
                onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="contact-email" className="text-sm font-semibold">Email</label>
              <Input
                id="contact-email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={newContact.email}
                onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Campos adicionales</label>
              {customFields.length === 0 ? (
                <p className="text-sm text-slate-500">No hay campos adicionales definidos. Usa el botón Campos para agregarlos.</p>
              ) : (
                customFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label htmlFor={`custom-field-${field.key}`} className="text-sm font-medium">{field.label}</label>
                    <Input
                      id={`custom-field-${field.key}`}
                      placeholder={`Ingresa ${field.label.toLowerCase()}`}
                      value={newContact.customFields[field.key] || ''}
                      onChange={(e) => handleCustomFieldValueChange(field.key, e.target.value)}
                    />
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="contact-tags" className="text-sm font-semibold">Etiquetas</label>
              <div className="flex gap-2">
                <Input
                  id="contact-tags"
                  placeholder="Agregar etiqueta"
                  value={newContactTag}
                  onChange={(e) => setNewContactTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewContactTag();
                    }
                  }}
                />
                <Button variant="outline" className="h-10" onClick={handleAddNewContactTag}>
                  Agregar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {newContact.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[11px] bg-slate-100 text-slate-700 border-none">
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewContactTag(tag)}
                      className="ml-1 text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleAddContact}
              disabled={savingContact}
            >
              {savingContact ? 'Guardando...' : 'Agregar Contacto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateTagDialog} onOpenChange={setShowCreateTagDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <TagIcon className="h-5 w-5 text-blue-600" />
              Crear etiqueta
            </DialogTitle>
            <DialogDescription>Agrega una etiqueta global disponible para asociar a contactos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="tag-name" className="text-sm font-semibold">Nombre de etiqueta</label>
              <Input
                id="tag-name"
                placeholder="Ej: cliente VIP"
                value={newGlobalTag}
                onChange={(e) => setNewGlobalTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGlobalTag();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTagDialog(false)}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                handleAddGlobalTag();
                setShowCreateTagDialog(false);
              }}
            >
              Crear etiqueta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFieldsDialog} onOpenChange={setShowFieldsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Campos del formulario</DialogTitle>
            <DialogDescription>Define campos adicionales para el formulario de registro de clientes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="custom-field-name" className="text-sm font-semibold">Nombre del campo</label>
              <div className="flex gap-2">
                <Input
                  id="custom-field-name"
                  placeholder="Ej: DNI, Calle, Referencias"
                  value={newCustomFieldLabel}
                  onChange={(e) => setNewCustomFieldLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomField();
                    }
                  }}
                />
                <Button variant="outline" className="h-10" onClick={handleAddCustomField}>
                  Agregar
                </Button>
              </div>
            </div>
            {customFields.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Campos definidos</h4>
                <div className="space-y-2">
                  {customFields.map((field) => (
                    <div key={field.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                      <span className="text-sm text-slate-700">{field.label}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveCustomField(field.key)}>
                        Eliminar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFieldsDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <Plus className="h-5 w-5 text-blue-600" />
              Nueva Tarea
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="task-title" className="text-sm font-semibold">Título *</label>
              <Input
                id="task-title"
                placeholder="Ej: Llamar al cliente"
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="task-description" className="text-sm font-semibold">Descripción</label>
              <Input
                id="task-description"
                placeholder="Detalles de la tarea"
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="task-contact" className="text-sm font-semibold">Contacto</label>
                <select
                  id="task-contact"
                  value={newTask.contactId}
                  onChange={(e) => setNewTask(prev => ({ ...prev, contactId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">Sin contacto</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>{contact.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="task-status" className="text-sm font-semibold">Estado</label>
                <select
                  id="task-status"
                  value={newTask.status}
                  onChange={(e) => setNewTask(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="pending">Pendiente</option>
                  <option value="in-progress">En progreso</option>
                  <option value="done">Completada</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="task-due-date" className="text-sm font-semibold">Fecha de vencimiento</label>
              <Input
                id="task-due-date"
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleAddTask}
              disabled={savingTask}
            >
              {savingTask ? 'Guardando...' : 'Agregar Tarea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Eliminación Masiva */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar permanentemente los {selectedContacts.length} contactos seleccionados? Esta acción no se puede deshacer y borrará toda la información asociada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={executeDeleteSelected}
            >
              Confirmar Eliminación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
