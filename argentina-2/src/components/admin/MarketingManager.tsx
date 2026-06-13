import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { db } from '@/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  Send, 
  Trash2, 
  Plus, 
  X, 
  Mail, 
  Calendar, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle2, 
  FileText,
  Eye,
  MousePointer,
  FolderOpen,
  ArrowLeft
} from 'lucide-react';
import { MediaLibrary } from './MediaLibrary';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  preheader?: string;
  recipients: string;
  senderEmail: string;
  body: string;
  status: 'borrador' | 'programada' | 'enviada';
  scheduledAt?: string;
  sentAt?: string;
  created_at: string;
}

export const MarketingManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Selected Campaign for editing
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  
  // Create Modal State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [recipients, setRecipients] = useState('todos');
  const [senderEmail, setSenderEmail] = useState('correo@tienda.com');
  const [body, setBody] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const [activeSubTab, setActiveSubTab] = useState<'campaigns' | 'media'>('campaigns');

  const isSupabase = typeof (db as any)?.from === 'function';

  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [contactSearchTerm, setContactSearchTerm] = useState('');

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      if (isSupabase) {
        const { data, error } = await db.from('marketing_campaigns').select('*');
        if (error) throw error;
        // Ordenar por fecha desc
        const sorted = (data || []).sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setCampaigns(sorted);
      }
    } catch (e: any) {
      console.error('Error loading email campaigns:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      if (isSupabase) {
        const { data, error } = await db.from('contacts').select('id, name, email, phone');
        if (error) throw error;
        setContacts(data || []);
      }
    } catch (e: any) {
      console.error('Error loading contacts in MarketingManager:', e);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchContacts();
  }, []);

  const handleCreateNew = () => {
    setNewCampaignName('');
    setIsCreateDialogOpen(true);
  };

  const handleCreateConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) {
      toast({
        variant: "destructive",
        title: "Nombre requerido",
        description: "Ingresa un nombre para la campaña."
      });
      return;
    }

    setCreating(true);
    const campaignId = `camp-${Date.now()}`;
    const defaultSender = 'contacto@' + (window.location.hostname.replace('www.', '') || 'tienda.com');

    const campaignData: Campaign = {
      id: campaignId,
      name: newCampaignName.trim(),
      subject: '',
      preheader: '',
      recipients: 'todos',
      senderEmail: defaultSender,
      body: '',
      status: 'borrador',
      created_at: new Date().toISOString()
    };

    try {
      if (isSupabase) {
        const { error } = await db.from('marketing_campaigns').upsert(campaignData);
        if (error) throw error;

        toast({
          title: "💾 Campaña creada",
          description: `La campaña "${newCampaignName}" se ha creado en borradores.`
        });

        setIsCreateDialogOpen(false);
        setNewCampaignName('');
        
        // Recargar el listado y abrir editor para esta campaña
        await fetchCampaigns();
        handleEditCampaign(campaignData);
      }
    } catch (e: any) {
      console.error('Error creating campaign:', e);
      toast({
        variant: "destructive",
        title: "Error al crear",
        description: "No se pudo crear la campaña."
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setName(campaign.name);
    setSubject(campaign.subject || '');
    setPreheader(campaign.preheader || '');
    setSenderEmail(campaign.senderEmail || 'correo@tienda.com');
    setBody(campaign.body || '');
    setContactSearchTerm('');
    
    if (campaign.recipients && (campaign.recipients.startsWith('[') || campaign.recipients.includes(','))) {
      try {
        if (campaign.recipients.startsWith('[')) {
          const ids = JSON.parse(campaign.recipients);
          setSelectedRecipientIds(ids);
        } else {
          setSelectedRecipientIds(campaign.recipients.split(','));
        }
        setRecipients('personalizado');
      } catch (e) {
        setSelectedRecipientIds([]);
        setRecipients(campaign.recipients);
      }
    } else {
      setSelectedRecipientIds([]);
      setRecipients(campaign.recipients || 'todos');
    }
    
    if (campaign.scheduledAt) {
      const dateObj = new Date(campaign.scheduledAt);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      setScheduleDate(`${yyyy}-${mm}-${dd}`);
      
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      setScheduleTime(`${hh}:${min}`);
    } else {
      setScheduleDate('');
      setScheduleTime('');
    }
  };

  const handleSaveCampaign = async (status: 'enviada' | 'programada' | 'borrador') => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Nombre requerido",
        description: "El nombre de la campaña es obligatorio."
      });
      return;
    }

    setSaving(true);
    
    let scheduledAtString = undefined;
    if (status === 'programada') {
      if (!scheduleDate || !scheduleTime) {
        toast({
          variant: "destructive",
          title: "Programación incompleta",
          description: "Por favor define la fecha y hora de envío programada."
        });
        setSaving(false);
        return;
      }
      scheduledAtString = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    }

    if (recipients === 'personalizado' && selectedRecipientIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Destinatarios requeridos",
        description: "Por favor selecciona al menos un contacto destinatario."
      });
      setSaving(false);
      return;
    }

    const recipientsVal = recipients === 'personalizado' ? JSON.stringify(selectedRecipientIds) : recipients;

    const campaignData: Campaign = {
      id: selectedCampaign?.id || `camp-${Date.now()}`,
      name: name.trim(),
      subject: subject.trim(),
      preheader: preheader.trim(),
      recipients: recipientsVal,
      senderEmail,
      body,
      status,
      scheduledAt: scheduledAtString,
      sentAt: status === 'enviada' ? new Date().toISOString() : selectedCampaign?.sentAt,
      created_at: selectedCampaign?.created_at || new Date().toISOString()
    };

    try {
      if (isSupabase) {
        const { error } = await db.from('marketing_campaigns').upsert(campaignData);
        if (error) throw error;

        toast({
          title: status === 'enviada' 
            ? "🚀 Campaña enviada" 
            : status === 'programada' 
              ? "⏰ Campaña programada" 
              : "💾 Cambios guardados",
          description: `La campaña "${name}" fue registrada exitosamente.`
        });

        setSelectedCampaign(null);
        fetchCampaigns();
      }
    } catch (e: any) {
      console.error('Error saving campaign:', e);
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "Ocurrió un error al guardar tu campaña."
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCampaign = async (id: string, campName: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la campaña "${campName}"?`)) return;

    try {
      const { error } = await db.from('marketing_campaigns').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: "Campaña eliminada",
        description: `La campaña "${campName}" fue eliminada correctamente.`
      });

      fetchCampaigns();
    } catch (e: any) {
      console.error('Error deleting campaign:', e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la campaña."
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Marketing Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {selectedCampaign ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button 
                variant="ghost" 
                onClick={() => setSelectedCampaign(null)} 
                className="h-8 text-slate-500 hover:text-slate-800 text-xs px-2.5 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Volver
              </Button>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 text-xs font-semibold">Planificador y Redactor</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2 mt-1">
              <Mail className="h-6 w-6 text-blue-600 animate-pulse" />
              {selectedCampaign.name}
            </h1>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Mail className="h-6 w-6 text-blue-600" />
              Marketing y Campañas de Correo
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Diseña, planifica y envía correos masivos automatizados a tus segmentos de clientes.
            </p>
          </div>
        )}

        {!selectedCampaign && (
          <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Nueva Campaña
          </Button>
        )}
      </div>

      {/* Horizontal navigation tabs */}
      {!selectedCampaign && (
        <div className="border-b border-slate-200">
          <div className="flex space-x-6 text-sm font-semibold text-slate-500">
            <button 
              onClick={() => setActiveSubTab('campaigns')}
              className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
                activeSubTab === 'campaigns' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-slate-800'
              }`}
            >
              Campañas de Correo
            </button>
            <button 
              onClick={() => setActiveSubTab('media')}
              className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
                activeSubTab === 'media' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-slate-800'
              }`}
            >
              Biblioteca Multimedia
            </button>
          </div>
        </div>
      )}

      {/* Campaign List View */}
      {!selectedCampaign && activeSubTab === 'campaigns' && (
        <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base text-slate-900 font-bold">Historial de Campañas Masivas</CardTitle>
            <CardDescription className="text-xs">Monitorea los correos masivos enviados y los que están programados para salir próximamente.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-16">
                <Mail className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600 font-semibold text-sm">No has creado ninguna campaña</p>
                <p className="text-slate-400 text-xs mt-1">Empieza a planificar tu marketing de correos redactando una campaña nueva.</p>
                <Button onClick={handleCreateNew} size="sm" className="mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold px-4 rounded-lg">
                  Redactar campaña
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-150">
                  <thead className="bg-slate-50">
                    <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="px-6 py-3.5 text-left">Campaña / Asunto</th>
                      <th className="px-6 py-3.5 text-left">Segmento Destinatario</th>
                      <th className="px-6 py-3.5 text-left">Estado</th>
                      <th className="px-6 py-3.5 text-left">Fecha de envío</th>
                      <th className="px-6 py-3.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100 text-sm">
                    {campaigns.map(camp => (
                      <tr key={camp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div 
                            onClick={() => handleEditCampaign(camp)} 
                            className="font-bold text-blue-600 hover:underline cursor-pointer"
                          >
                            {camp.name}
                          </div>
                          <div className="text-slate-500 text-xs truncate max-w-[280px] mt-0.5">
                            {camp.subject || <span className="italic text-slate-400">(Sin asunto definido)</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">
                            {camp.recipients === 'todos' ? 'Todos los contactos' : 
                             camp.recipients === 'confirmados' ? 'Clientes con compras' : 
                             camp.recipients === 'usuarios' ? 'Usuarios registrados' : 
                             (camp.recipients && camp.recipients.startsWith('[')) ? `${JSON.parse(camp.recipients).length} contactos específicos` : 
                             'Contactos específicos'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`font-semibold uppercase text-[9px] px-2 py-0.5 border ${
                            camp.status === 'enviada'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : camp.status === 'programada'
                                ? 'bg-amber-50 text-amber-600 border-amber-200'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {camp.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-600">
                          {camp.status === 'enviada' && camp.sentAt ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              {new Date(camp.sentAt).toLocaleString('es-AR')}
                            </span>
                          ) : camp.status === 'programada' && camp.scheduledAt ? (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-amber-500" />
                              {new Date(camp.scheduledAt).toLocaleString('es-AR')}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Borrador</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                            title="Eliminar campaña"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Editor View for Selected Campaign */}
      {selectedCampaign && (
        <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-row justify-between items-center">
            <div>
              <CardTitle className="text-base text-slate-900 font-bold">Redactar y Configurar Envío</CardTitle>
              <CardDescription className="text-xs">Actualiza el nombre, contenido del correo y define las opciones de envío o programación.</CardDescription>
            </div>
            <button onClick={() => setSelectedCampaign(null)} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 text-left">
                <Label htmlFor="camp-name" className="text-xs text-slate-600 font-semibold">Nombre de la Campaña *</Label>
                <Input
                  id="camp-name"
                  placeholder="Ej: Campaña de Liquidación de Invierno"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-900 h-9.5 text-sm"
                />
              </div>

              <div className="space-y-1 text-left">
                <Label htmlFor="camp-recipients" className="text-xs text-slate-600 font-semibold">Destinatarios *</Label>
                <select
                  id="camp-recipients"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer h-9.5"
                >
                  <option value="todos">Todos los contactos de la tienda</option>
                  <option value="confirmados">Clientes con pedidos confirmados</option>
                  <option value="usuarios">Solo usuarios registrados</option>
                  <option value="personalizado">Seleccionar contactos específicos...</option>
                </select>
              </div>
            </div>

            {recipients === 'personalizado' && (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 text-left">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-blue-600" /> 
                  Seleccionar Contactos para la Campaña ({selectedRecipientIds.length} seleccionados)
                </span>
                
                <div className="relative">
                  <Input
                    placeholder="Buscar contactos por nombre, email o teléfono..."
                    value={contactSearchTerm}
                    onChange={(e) => setContactSearchTerm(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs pl-8 text-slate-900"
                  />
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                <div className="max-h-[180px] overflow-y-auto divide-y divide-slate-100 pr-1 mt-2 bg-white border border-slate-200 rounded-lg p-2">
                  {contacts.filter(c => {
                    const search = contactSearchTerm.toLowerCase();
                    return (
                      (c.name || '').toLowerCase().includes(search) ||
                      (c.email || '').toLowerCase().includes(search) ||
                      (c.phone || '').toLowerCase().includes(search)
                    );
                  }).length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No se encontraron contactos.
                    </div>
                  ) : (
                    contacts
                      .filter(c => {
                        const search = contactSearchTerm.toLowerCase();
                        return (
                          (c.name || '').toLowerCase().includes(search) ||
                          (c.email || '').toLowerCase().includes(search) ||
                          (c.phone || '').toLowerCase().includes(search)
                        );
                      })
                      .map(contact => {
                        const isSelected = selectedRecipientIds.includes(contact.id);
                        return (
                          <label key={contact.id} className="flex items-center gap-2.5 py-2 px-2 hover:bg-slate-50 cursor-pointer text-xs rounded-md transition-colors">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedRecipientIds(prev => 
                                  isSelected 
                                    ? prev.filter(id => id !== contact.id) 
                                    : [...prev, contact.id]
                                );
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-800 truncate">{contact.name || 'Sin nombre'}</span>
                              <span className="text-[10px] text-slate-500 truncate">
                                {contact.email || 'Sin email'} {contact.phone ? `· ${contact.phone}` : ''}
                              </span>
                            </div>
                          </label>
                        );
                      })
                  )}
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-slate-500 px-1 pt-1">
                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      className="hover:text-blue-600 font-bold transition-colors cursor-pointer"
                      onClick={() => setSelectedRecipientIds(contacts.map(c => c.id))}
                    >
                      ✓ Seleccionar todos ({contacts.length})
                    </button>
                    <button 
                      type="button" 
                      className="hover:text-red-500 font-bold transition-colors cursor-pointer"
                      onClick={() => setSelectedRecipientIds([])}
                    >
                      ✗ Deseleccionar todos
                    </button>
                  </div>
                  <span className="font-semibold text-slate-600">
                    {selectedRecipientIds.length} destinatarios seleccionados
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 text-left">
                <Label htmlFor="camp-subject" className="text-xs text-slate-600 font-semibold">Asunto del Correo *</Label>
                <Input
                  id="camp-subject"
                  placeholder="Ej: ¡Solo por hoy! 30% de descuento en toda la tienda"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-900 h-9.5 text-sm"
                />
              </div>

              <div className="space-y-1 text-left">
                <Label htmlFor="camp-preheader" className="text-xs text-slate-600 font-semibold">Texto de Vista Previa (Preheader)</Label>
                <Input
                  id="camp-preheader"
                  placeholder="Ej: No te pierdas nuestra oferta especial de invierno"
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-900 h-9.5 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 text-left">
                <Label htmlFor="camp-sender" className="text-xs text-slate-600 font-semibold">Correo Electrónico Remitente</Label>
                <Input
                  id="camp-sender"
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-900 h-9.5 text-sm"
                />
              </div>

              <div className="space-y-1 text-left">
                <span className="text-xs text-slate-600 font-semibold block">Biblioteca Multimedia</span>
                <button 
                  type="button"
                  onClick={() => {
                    setActiveSubTab('media');
                    setSelectedCampaign(null);
                  }}
                  className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-white h-9.5 transition-colors cursor-pointer"
                >
                  <FolderOpen className="h-4 w-4 text-slate-500" />
                  Abrir Galería de Imágenes (Copiar URLs)
                </button>
              </div>
            </div>

            <div className="space-y-1 text-left">
              <Label htmlFor="camp-body" className="text-xs text-slate-600 font-semibold">Contenido del Correo (HTML o Texto) *</Label>
              <textarea
                id="camp-body"
                rows={10}
                placeholder="Escribe tu mensaje aquí... Soporta HTML o texto sin formato"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 space-y-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Clock className="h-4 w-4 text-slate-500" /> ¿Cuándo deseas enviar esta campaña?
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <Label htmlFor="sched-date" className="text-xs text-slate-500 font-semibold">Fecha Programada</Label>
                  <Input
                    id="sched-date"
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-sm text-slate-900"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <Label htmlFor="sched-time" className="text-xs text-slate-500 font-semibold">Hora Programada</Label>
                  <Input
                    id="sched-time"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-sm text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-slate-100">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedCampaign(null)}
                className="border-slate-200 hover:bg-slate-100 text-slate-600 h-9.5 text-xs font-bold px-4 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button 
                type="button" 
                variant="outline"
                disabled={saving}
                onClick={() => handleSaveCampaign('borrador')}
                className="border-slate-200 hover:bg-slate-100 text-slate-700 h-9.5 text-xs font-bold px-4 bg-white cursor-pointer"
              >
                Guardar Borrador
              </Button>
              <Button 
                type="button"
                disabled={saving || !scheduleDate || !scheduleTime}
                onClick={() => handleSaveCampaign('programada')}
                className="bg-amber-500 hover:bg-amber-600 text-white h-9.5 text-xs font-bold px-4 shadow-sm cursor-pointer"
              >
                Programar Envío
              </Button>
              <Button 
                type="button"
                disabled={saving}
                onClick={() => handleSaveCampaign('enviada')}
                className="bg-blue-600 hover:bg-blue-700 text-white h-9.5 text-xs font-bold px-5 shadow-sm cursor-pointer"
              >
                {saving ? "Enviando..." : "Enviar Ahora 🚀"}
              </Button>
            </div>

          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: Media Library view */}
      {!selectedCampaign && activeSubTab === 'media' && (
        <MediaLibrary />
      )}

      {/* Creation Name Dialog (Modal) */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 font-bold">
              <Mail className="h-5 w-5 text-blue-600" />
              Nueva Campaña de Correo
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs text-left pt-1">
              Ingresa el nombre de la campaña. Al confirmarla, se creará un borrador y se abrirá el editor para que puedas redactar el asunto, preheader, contenido y configurar los destinatarios o programar el envío.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateConfirm} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="new-camp-name" className="text-xs text-slate-600 font-semibold">Nombre de la Campaña *</Label>
              <Input
                id="new-camp-name"
                placeholder="Ej: Ofertas del Día del Padre 2026"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                className="bg-slate-50 border-slate-200 text-slate-900 text-sm h-10"
                required
                autoFocus
              />
            </div>
            <DialogFooter className="pt-2 flex gap-2 justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
                className="border-slate-200 text-slate-700 text-xs font-semibold px-4 h-9"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={creating}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 h-9"
              >
                {creating ? "Creando..." : "Crear Campaña"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
};
