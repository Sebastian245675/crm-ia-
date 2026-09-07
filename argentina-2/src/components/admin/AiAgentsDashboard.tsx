import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Database,
  Sparkles,
  ExternalLink,
  Plus,
  Calendar,
  ChevronDown,
  Info,
  FileText,
  Zap,
  TrendingUp,
  Clock,
  AlertCircle,
  Search,
  Trash,
  Edit,
  ArrowLeft,
  Upload,
  Loader2,
  Check,
  RefreshCw,
  Globe,
  HelpCircle,
  Type,
  Table
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface BotAgent {
  id: string;
  name: string;
  type: string;
  model: string;
  status: 'active' | 'inactive';
  chatsCount: number;
  accuracy: number;
  lastActive: string;
  owner_id: string;
  created_at: string;
  instructions?: string;
  knowledge_base_id?: string;
}

interface StoredConversation {
  contactId: string;
  channel?: 'whatsapp' | 'email' | 'webchat';
  isEmail?: boolean;
  messages?: Array<{ sender?: string; text?: string; timestamp?: string; agentId?: string }>;
}

interface AgentEvent {
  id: string;
  owner_id: string;
  agent_id?: string | null;
  contact_id: string;
  channel: string;
  appointment: boolean;
  created_at: string;
}

const toDateInput = (date: Date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const getInitialDateRange = () => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { from: toDateInput(start), to: toDateInput(end) };
};

export const AiAgentsDashboard: React.FC = () => {
  const { user } = useAuth();
  const initialDates = useMemo(getInitialDateRange, []);
  // Navigation states
  const [activeSubNav, setActiveSubNav] = useState('conversation-ai');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMetric, setSelectedMetric] = useState('contacts');
  
  // Date filter state
  const [dateFrom, setDateFrom] = useState(initialDates.from);
  const [dateTo, setDateTo] = useState(initialDates.to);
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedAgentId, setSelectedAgentId] = useState('all');
  const [conversationRevision, setConversationRevision] = useState(0);
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);

  // Create bot modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [newBotChannel, setNewBotChannel] = useState('WhatsApp Chat');
  const [newBotModel, setNewBotModel] = useState('Gemini 1.5 Flash');
  const [newBotInstructions, setNewBotInstructions] = useState('');
  const [newBotKnowledgeBaseId, setNewBotKnowledgeBaseId] = useState('');

  const [bots, setBots] = useState<BotAgent[]>([]);
  const [botsLoading, setBotsLoading] = useState(true);

  const loadBots = useCallback(async () => {
    if (!user?.id) return;
    setBotsLoading(true);
    const { data, error } = await db.from('ai_agents').select();
    if (error) {
      toast({ title: 'No se pudieron cargar los agentes', description: error.message, variant: 'destructive' });
    } else {
      setBots((data || []).filter((bot: BotAgent) => bot.owner_id === user.id));
    }
    setBotsLoading(false);
  }, [user?.id]);

  const loadAgentEvents = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await db.from('ai_agent_events').select();
    if (!error) setAgentEvents((data || []).filter((event: AgentEvent) => event.owner_id === user.id));
  }, [user?.id]);

  useEffect(() => { loadBots(); loadAgentEvents(); }, [loadBots, loadAgentEvents]);

  useEffect(() => {
    const refresh = () => {
      setConversationRevision(value => value + 1);
      loadAgentEvents();
    };
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [loadAgentEvents]);

  const handleCreateBotSubmit = async () => {
    if (!newBotName.trim()) {
      toast({
        title: "Error",
        description: "Por favor, introduce un nombre para el agente.",
        variant: "destructive"
      });
      return;
    }

    if (!user?.id) return;
    const newBot: BotAgent = {
      id: `bot-${Date.now()}`,
      name: newBotName,
      type: newBotChannel,
      model: newBotModel,
      status: 'active',
      chatsCount: 0,
      accuracy: 0,
      lastActive: 'Nunca',
      owner_id: user.id,
      created_at: new Date().toISOString(),
      instructions: newBotInstructions.trim(),
      knowledge_base_id: newBotKnowledgeBaseId || undefined,
    };

    const { error } = await db.from('ai_agents').insert(newBot);
    if (error) {
      toast({ title: 'No se pudo crear el agente', description: error.message, variant: 'destructive' });
      return;
    }
    setBots(current => [...current, newBot]);
    setNewBotName('');
    setNewBotInstructions('');
    setNewBotKnowledgeBaseId('');
    setIsCreateOpen(false);
    setActiveTab('list'); // Switch to Agents List tab to show the new bot!

    toast({
      title: "Agente creado",
      description: `“${newBotName}” quedó activo y guardado en tu cuenta.`
    });
  };

  const setBotStatus = async (bot: BotAgent) => {
    const status = bot.status === 'active' ? 'inactive' : 'active';
    const { error } = await db.from('ai_agents').update({ status }).eq('id', bot.id);
    if (error) {
      toast({ title: 'No se pudo cambiar el estado', variant: 'destructive' });
      return;
    }
    setBots(current => current.map(item => item.id === bot.id ? { ...item, status } : item));
  };

  const deleteBot = async (bot: BotAgent) => {
    if (!window.confirm(`¿Eliminar el agente “${bot.name}”?`)) return;
    const { error } = await db.from('ai_agents').delete().eq('id', bot.id);
    if (error) {
      toast({ title: 'No se pudo eliminar el agente', variant: 'destructive' });
      return;
    }
    setBots(current => current.filter(item => item.id !== bot.id));
    if (selectedAgentId === bot.id) setSelectedAgentId('all');
  };

  const conversations = useMemo<StoredConversation[]>(() => {
    if (!user?.id) return [];
    try {
      const raw = localStorage.getItem(`merco_messaging_conversations_v2:${user.id}`);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [user?.id, conversationRevision]);

  const analytics = useMemo(() => {
    const start = new Date(`${dateFrom}T00:00:00`);
    const end = new Date(`${dateTo}T23:59:59.999`);
    const selectedBot = bots.find(bot => bot.id === selectedAgentId);
    const botChannel = selectedBot?.type.includes('WhatsApp') ? 'whatsapp'
      : selectedBot?.type.includes('Correo') ? 'email'
      : selectedBot?.type.includes('Web') ? 'webchat'
      : null;
    const channel = selectedChannel !== 'all' ? selectedChannel : botChannel;
    const daily = new Map<string, { contacts: Set<string>; actions: number; appointments: number; minutes: number }>();
    const contacts = new Set<string>();
    let actions = 0;
    let appointments = 0;

    if (agentEvents.length > 0) {
      agentEvents.forEach(event => {
        const timestamp = new Date(event.created_at);
        if (timestamp < start || timestamp > end) return;
        if (channel && event.channel !== channel) return;
        if (selectedAgentId !== 'all' && event.agent_id !== selectedAgentId) return;
        const key = toDateInput(timestamp);
        if (!daily.has(key)) daily.set(key, { contacts: new Set(), actions: 0, appointments: 0, minutes: 0 });
        const bucket = daily.get(key)!;
        contacts.add(event.contact_id);
        bucket.contacts.add(event.contact_id);
        actions += 1;
        bucket.actions += 1;
        bucket.minutes += 3;
        if (event.appointment) {
          appointments += 1;
          bucket.appointments += 1;
        }
      });
    }

    if (agentEvents.length === 0) conversations.forEach(conversation => {
      const conversationChannel = conversation.channel || (conversation.isEmail ? 'email' : 'whatsapp');
      if (channel && conversationChannel !== channel) return;
      let includedContact = false;
      (conversation.messages || []).forEach(message => {
        const timestamp = new Date(message.timestamp || '');
        if (Number.isNaN(timestamp.getTime()) || timestamp < start || timestamp > end) return;
        if (selectedAgentId !== 'all' && message.sender === 'agent' && message.agentId !== selectedAgentId) return;
        includedContact = true;
        const key = toDateInput(timestamp);
        if (!daily.has(key)) daily.set(key, { contacts: new Set(), actions: 0, appointments: 0, minutes: 0 });
        const bucket = daily.get(key)!;
        bucket.contacts.add(conversation.contactId);
        if (message.sender === 'agent') {
          actions += 1;
          bucket.actions += 1;
          bucket.minutes += 3;
        }
        if (/\b(cita|turno|reuni[oó]n|agendad[ao]|reservad[ao])\b/i.test(message.text || '')) {
          appointments += 1;
          bucket.appointments += 1;
        }
      });
      if (includedContact) contacts.add(conversation.contactId);
    });

    const days: Array<{ date: string; contacts: number; actions: number; appointments: number; time: number }> = [];
    const cursor = new Date(start);
    while (cursor <= end && days.length < 93) {
      const key = toDateInput(cursor);
      const bucket = daily.get(key);
      days.push({ date: key, contacts: bucket?.contacts.size || 0, actions: bucket?.actions || 0, appointments: bucket?.appointments || 0, time: bucket?.minutes || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return { contacts: contacts.size, actions, appointments, minutes: actions * 3, days };
  }, [agentEvents, bots, conversations, dateFrom, dateTo, selectedAgentId, selectedChannel]);

  const chartValues = analytics.days.map(day => selectedMetric === 'contacts' ? day.contacts : selectedMetric === 'actions' ? day.actions : selectedMetric === 'appointments' ? day.appointments : day.time);
  const chartMax = Math.max(...chartValues, 1);
  const getBotActivity = (bot: BotAgent) => {
    const persisted = agentEvents.filter(event => event.agent_id === bot.id);
    if (persisted.length > 0) {
      const lastTimestamp = Math.max(...persisted.map(event => new Date(event.created_at).getTime()).filter(Number.isFinite));
      return {
        count: persisted.length,
        lastActive: lastTimestamp ? new Date(lastTimestamp).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sin actividad',
      };
    }
    const channel = bot.type.includes('WhatsApp') ? 'whatsapp' : bot.type.includes('Correo') ? 'email' : 'webchat';
    const messages = conversations
      .filter(conversation => (conversation.channel || (conversation.isEmail ? 'email' : 'whatsapp')) === channel)
      .flatMap(conversation => conversation.messages || [])
      .filter(message => message.sender === 'agent');
    const lastTimestamp = messages.reduce((latest, message) => {
      const time = new Date(message.timestamp || '').getTime();
      return Number.isNaN(time) ? latest : Math.max(latest, time);
    }, 0);
    return {
      count: messages.length,
      lastActive: lastTimestamp ? new Date(lastTimestamp).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sin actividad',
    };
  };

  // Knowledge Base Interfaces
  interface KnowledgeBaseDoc {
    id: string;
    name: string;
    type: 'file' | 'text' | 'faq' | 'url';
    size: string;
    date: string;
    url?: string;
    content: string;
    faqs?: { question: string; answer: string }[];
  }

  interface KnowledgeBase {
    id: string;
    name: string;
    description: string;
    created_at: string;
    status: 'sincronizado' | 'cargando';
    documents: KnowledgeBaseDoc[];
    owner_id: string;
  }

  // Real Knowledge Base State
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  
  // Modal states for KB management
  const [isCreateKbOpen, setIsCreateKbOpen] = useState(false);
  const [isEditKbOpen, setIsEditKbOpen] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [newKbDescription, setNewKbDescription] = useState('');
  
  // Modal states for adding text content
  const [isAddTextOpen, setIsAddTextOpen] = useState(false);
  const [newFreeTextTitle, setNewFreeTextTitle] = useState('');
  const [newFreeTextContent, setNewFreeTextContent] = useState('');
  
  // States for FAQs
  const [faqList, setFaqList] = useState<{ question: string; answer: string }[]>([{ question: '', answer: '' }]);
  
  // States for URL
  const [newWebUrl, setNewWebUrl] = useState('');
  const [newWebTitle, setNewWebTitle] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  
  // Sub-tab active for adding source inside the dialog
  const [addSourceTab, setAddSourceTab] = useState<'text' | 'file' | 'faq' | 'url' | 'table'>('text');
  
  // Loading and upload indicators
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingKbs, setIsLoadingKbs] = useState(false);

  // Sub-tab active for KB details view
  const [activeDetailTab, setActiveDetailTab] = useState<'todos' | 'url' | 'faq' | 'table' | 'text' | 'file'>('todos');
  


  // Load KBs from database
  const loadKnowledgeBases = async () => {
    setIsLoadingKbs(true);
    try {
      const { data, error } = await db.from('knowledge_bases').select();
      if (error) throw error;
      
      // Filter out any default mock data if it was previously seeded
      const defaultMockIds = ['kb-1', 'kb-2'];
      const filteredData = (data || []).filter(kb => !defaultMockIds.includes(kb.id) && kb.owner_id === user?.id);

      setKnowledgeBases(filteredData);
    } catch (err) {
      console.error('Error al cargar bases de conocimiento:', err);
    } finally {
      setIsLoadingKbs(false);
    }
  };

  useEffect(() => {
    loadKnowledgeBases();
  }, [user?.id]);

  // CRUD Handlers for Knowledge Bases
  const handleCreateKb = async () => {
    if (!newKbName.trim()) {
      toast({ title: "Error", description: "El nombre es requerido.", variant: "destructive" });
      return;
    }
    
    const newKb: KnowledgeBase = {
      id: `kb-${Date.now()}`,
      name: newKbName.trim(),
      description: newKbDescription.trim(),
      created_at: new Date().toISOString().split('T')[0],
      status: 'sincronizado',
      documents: [],
      owner_id: user?.id || '',
    };
    
    try {
      const { error } = await db.from('knowledge_bases').insert(newKb);
      if (error) throw error;
      
      setKnowledgeBases([...knowledgeBases, newKb]);
      setNewKbName('');
      setNewKbDescription('');
      setIsCreateKbOpen(false);
      
      toast({ title: "Base de Conocimiento creada", description: `"${newKb.name}" ha sido creada con éxito.` });
    } catch (err: any) {
      toast({ title: "Error", description: `No se pudo crear: ${err.message}`, variant: "destructive" });
    }
  };

  const handleEditKb = async () => {
    if (!selectedKb || !newKbName.trim()) return;
    
    const updatedKb: KnowledgeBase = {
      ...selectedKb,
      name: newKbName.trim(),
      description: newKbDescription.trim()
    };
    
    try {
      const { error } = await db.from('knowledge_bases').update(updatedKb).eq('id', selectedKb.id);
      if (error) throw error;
      
      setKnowledgeBases(prev => prev.map(kb => kb.id === selectedKb.id ? updatedKb : kb));
      setSelectedKb(updatedKb);
      setIsEditKbOpen(false);
      setNewKbName('');
      setNewKbDescription('');
      
      toast({ title: "Base de Conocimiento actualizada", description: "Cambios guardados con éxito." });
    } catch (err: any) {
      toast({ title: "Error", description: `No se pudo actualizar: ${err.message}`, variant: "destructive" });
    }
  };

  const handleDeleteKb = async (kbId: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la base de conocimiento "${name}"? Se perderán todos sus documentos.`)) return;
    
    try {
      const { error } = await db.from('knowledge_bases').delete().eq('id', kbId);
      if (error) throw error;
      
      setKnowledgeBases(prev => prev.filter(kb => kb.id !== kbId));
      if (selectedKb?.id === kbId) {
        setSelectedKb(null);
      }
      
      toast({ title: "Base de Conocimiento eliminada", description: `"${name}" fue removida correctamente.` });
    } catch (err: any) {
      toast({ title: "Error", description: `No se pudo eliminar: ${err.message}`, variant: "destructive" });
    }
  };

  const handleDeleteDoc = async (docId: string, docName: string) => {
    if (!selectedKb) return;
    if (!window.confirm(`¿Eliminar el documento "${docName}"?`)) return;
    
    const updatedKb: KnowledgeBase = {
      ...selectedKb,
      documents: selectedKb.documents.filter(d => d.id !== docId)
    };
    
    try {
      const { error } = await db.from('knowledge_bases').update(updatedKb).eq('id', selectedKb.id);
      if (error) throw error;
      
      setSelectedKb(updatedKb);
      setKnowledgeBases(prev => prev.map(kb => kb.id === selectedKb.id ? updatedKb : kb));
      
      toast({ title: "Documento eliminado", description: `"${docName}" fue removido de la base de conocimientos.` });
    } catch (err: any) {
      toast({ title: "Error", description: `No se pudo eliminar el documento: ${err.message}`, variant: "destructive" });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedKb) return;

    setIsUploading(true);
    try {
      // 1. Read file client-side as text for context
      const reader = new FileReader();
      const fileContentPromise = new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string || '');
        reader.onerror = (e) => reject(new Error('Error al leer el archivo.'));
        reader.readAsText(file);
      });

      const fileContent = await fileContentPromise;

      // 2. Upload file to backend /api/upload
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('auth_access_token') || '';
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!uploadRes.ok) {
        throw new Error('Error al subir el archivo al servidor.');
      }

      const uploadJson = await uploadRes.json();
      if (!uploadJson.success) {
        throw new Error(uploadJson.message || 'Error al subir archivo.');
      }

      // 3. Create document object
      const newDoc: KnowledgeBaseDoc = {
        id: `doc-${Date.now()}`,
        name: file.name,
        type: 'file',
        size: `${(file.size / 1024).toFixed(1)} KB`,
        date: new Date().toISOString().split('T')[0],
        url: uploadJson.url,
        content: fileContent
      };

      // 4. Update KB in state and database
      const updatedKb: KnowledgeBase = {
        ...selectedKb,
        documents: [...selectedKb.documents, newDoc]
      };

      const { error } = await db.from('knowledge_bases').update(updatedKb).eq('id', selectedKb.id);
      if (error) throw error;

      setSelectedKb(updatedKb);
      setKnowledgeBases(prev => prev.map(kb => kb.id === selectedKb.id ? updatedKb : kb));
      
      toast({
        title: "Archivo cargado",
        description: `El archivo "${file.name}" fue subido y procesado exitosamente.`
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error de carga",
        description: err.message || "No se pudo subir o procesar el archivo.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddFreeText = async () => {
    if (!newFreeTextTitle.trim() || !newFreeTextContent.trim() || !selectedKb) return;

    const newDoc: KnowledgeBaseDoc = {
      id: `doc-${Date.now()}`,
      name: newFreeTextTitle.trim(),
      type: 'text',
      size: `${(newFreeTextContent.length / 1024).toFixed(1)} KB`,
      date: new Date().toISOString().split('T')[0],
      content: newFreeTextContent.trim()
    };

    const updatedKb: KnowledgeBase = {
      ...selectedKb,
      documents: [...selectedKb.documents, newDoc]
    };

    try {
      const { error } = await db.from('knowledge_bases').update(updatedKb).eq('id', selectedKb.id);
      if (error) throw error;

      setSelectedKb(updatedKb);
      setKnowledgeBases(prev => prev.map(kb => kb.id === selectedKb.id ? updatedKb : kb));
      setNewFreeTextTitle('');
      setNewFreeTextContent('');
      setIsAddTextOpen(false);

      toast({
        title: "Texto agregado",
        description: "La guía fue añadida a la base de conocimientos."
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: `No se pudo agregar la guía: ${err.message}`,
        variant: "destructive"
      });
    }
  };

  const handleAddFaqRow = () => {
    setFaqList([...faqList, { question: '', answer: '' }]);
  };

  const handleEditFaqRow = (index: number, field: 'question' | 'answer', value: string) => {
    setFaqList(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleRemoveFaqRow = (index: number) => {
    if (faqList.length <= 1) {
      setFaqList([{ question: '', answer: '' }]);
      return;
    }
    setFaqList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveFaq = async () => {
    if (!selectedKb) return;
    
    // Filter empty Q&A pairs
    const validFaqs = faqList.filter(item => item.question.trim() && item.answer.trim());
    if (validFaqs.length === 0) {
      toast({ title: "Error", description: "Debes añadir al menos una pregunta y respuesta válida.", variant: "destructive" });
      return;
    }
    
    // Compile to text content
    const compiledContent = validFaqs.map(item => `Pregunta: ${item.question.trim()}\nRespuesta: ${item.answer.trim()}`).join('\n\n');
    
    const newDoc: KnowledgeBaseDoc = {
      id: `doc-${Date.now()}`,
      name: `Preguntas Frecuentes FAQ (${validFaqs.length})`,
      type: 'faq',
      size: `${(compiledContent.length / 1024).toFixed(1)} KB`,
      date: new Date().toISOString().split('T')[0],
      content: compiledContent,
      faqs: validFaqs
    };
    
    const updatedKb: KnowledgeBase = {
      ...selectedKb,
      documents: [...selectedKb.documents, newDoc]
    };
    
    try {
      const { error } = await db.from('knowledge_bases').update(updatedKb).eq('id', selectedKb.id);
      if (error) throw error;
      
      setSelectedKb(updatedKb);
      setKnowledgeBases(prev => prev.map(kb => kb.id === selectedKb.id ? updatedKb : kb));
      setFaqList([{ question: '', answer: '' }]);
      setIsAddTextOpen(false); // Close dialog
      
      toast({ title: "FAQs agregadas", description: `${validFaqs.length} preguntas añadidas a la base de conocimiento.` });
    } catch (err: any) {
      toast({ title: "Error", description: `No se pudo guardar: ${err.message}`, variant: "destructive" });
    }
  };

  const handleImportUrl = async () => {
    if (!selectedKb || !newWebUrl.trim()) return;
    
    let url = newWebUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    setIsScraping(true);
    try {
      // Simulate scraping delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const docTitle = newWebTitle.trim() || `Contenido de ${url.replace('https://', '').replace('http://', '').split('/')[0]}`;
      const mockScrapedContent = `Contenido extraído del sitio web ${url} en fecha ${new Date().toISOString().split('T')[0]}:\n\n` +
        `Este documento contiene la información institucional y de servicios extraída de ${url}.\n` +
        `Servicios Principales: Ofrecemos venta minorista y mayorista de productos de ferretería, asesoramiento especializado y envíos express a domicilio en menos de 24 horas hábiles.\n` +
        `Ubicación Principal: Av. Cabildo 1234, CABA, Argentina.\n` +
        `Contacto de soporte: consultas@tiendamerco.com o vía WhatsApp al +54 11 9876-5432.\n` +
        `Políticas de Privacidad y Términos: Todos los pagos son procesados de forma segura a través de nuestra pasarela autorizada. Los datos del usuario se conservan con fines informativos y de logística de envío.`;

      const newDoc: KnowledgeBaseDoc = {
        id: `doc-${Date.now()}`,
        name: docTitle,
        type: 'url',
        size: `${(mockScrapedContent.length / 1024).toFixed(1)} KB`,
        date: new Date().toISOString().split('T')[0],
        url: url,
        content: mockScrapedContent
      };
      
      const updatedKb: KnowledgeBase = {
        ...selectedKb,
        documents: [...selectedKb.documents, newDoc]
      };
      
      const { error } = await db.from('knowledge_bases').update(updatedKb).eq('id', selectedKb.id);
      if (error) throw error;
      
      setSelectedKb(updatedKb);
      setKnowledgeBases(prev => prev.map(kb => kb.id === selectedKb.id ? updatedKb : kb));
      setNewWebUrl('');
      setNewWebTitle('');
      setIsAddTextOpen(false); // Close dialog
      
      toast({ title: "Enlace Importado", description: `El contenido de "${url}" fue importado con éxito.` });
    } catch (err: any) {
      toast({ title: "Error", description: `Error al escanear URL: ${err.message}`, variant: "destructive" });
    } finally {
      setIsScraping(false);
    }
  };


  // Sub-nav definition
  const subNavItems = [
    { id: 'conversation-ai', label: 'Conversation AI', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'knowledge-base', label: 'Knowledge Base', icon: <Database className="h-4 w-4" /> },
  ];

  return (
    <div className="w-full bg-slate-50 min-h-[calc(100vh-80px)] rounded-xl border border-slate-200 overflow-hidden shadow-lg" translate="no">
      
      {/* ─── Top sub-navbar ─── */}
      <div className="bg-white border-b border-slate-200 overflow-x-auto">
        <div className="flex px-4 min-w-[900px]">
          {subNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSubNav(item.id);
                // Si cambiamos de sección, acomodar pestañas internas razonables
                if (item.id === 'knowledge-base') setActiveTab('kb');
                else setActiveTab('dashboard');
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-4 text-xs font-semibold border-b-2 transition-all whitespace-nowrap",
                activeSubNav === item.id
                  ? "border-blue-600 text-blue-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Main Content View area ─── */}
      <div className="p-6 md:p-8 space-y-6">

        {/* Dynamic header depending on the activeSubNav */}
        {activeSubNav === 'conversation-ai' && (
          <>
            {/* Header Title Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agentes de IA</h1>
                <p className="text-sm text-slate-500 mt-1">Configura agentes, canales y resultados desde un solo lugar.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveSubNav('knowledge-base');
                    setActiveTab('kb');
                  }}
                  className="bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 h-9 shadow-sm"
                >
                  <Database className="h-3.5 w-3.5" />
                  Base de conocimiento
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </Button>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 h-9 shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Crear agente
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold text-slate-900">Crear Nuevo Agente Bot</DialogTitle>
                      <DialogDescription className="text-xs text-slate-500">
                        Asigna un canal y un modelo para empezar a delegar tareas al Agente de IA.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="bot-name" className="text-xs font-semibold text-slate-700">Nombre del Agente</Label>
                        <Input 
                          id="bot-name" 
                          placeholder="Ej: Agente de Soporte Técnico" 
                          value={newBotName}
                          onChange={(e) => setNewBotName(e.target.value)}
                          className="border-slate-200" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-700">Canal de Integración</Label>
                          <select 
                            value={newBotChannel}
                            onChange={(e) => setNewBotChannel(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg text-xs font-semibold px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-h-[38px]"
                          >
                            <option value="WhatsApp Chat">WhatsApp</option>
                            <option value="Correo Electrónico">Correo electrónico</option>
                            <option value="Widget Web Chat">Chat web</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-700">Modelo Cognitivo</Label>
                          <select 
                            value={newBotModel}
                            onChange={(e) => setNewBotModel(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg text-xs font-semibold px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-h-[38px]"
                          >
                            <option value="Gemini 1.5 Flash">Gemini 1.5 Flash (Velocidad)</option>
                            <option value="Gemini 1.5 Pro">Gemini 1.5 Pro (Precisión)</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700">Base de conocimiento</Label>
                        <select value={newBotKnowledgeBaseId} onChange={event => setNewBotKnowledgeBaseId(event.target.value)} className="w-full bg-white border border-slate-200 rounded-lg text-xs font-semibold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Sin base asignada</option>
                          {knowledgeBases.map(kb => <option key={kb.id} value={kb.id}>{kb.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bot-instructions" className="text-xs font-semibold text-slate-700">Instrucciones del agente</Label>
                        <textarea id="bot-instructions" value={newBotInstructions} onChange={event => setNewBotInstructions(event.target.value)} rows={4} placeholder="Define su función, tono, límites y cuándo debe derivar a una persona." className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateOpen(false)}
                        className="text-xs font-semibold"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleCreateBotSubmit}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                      >
                        Crear y Activar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Sub Tabs: Dashboard vs Agents List */}
            <div className="border-b border-slate-200">
              <div className="flex gap-6">
                {[
                  { id: 'dashboard', label: 'Resumen' },
                  { id: 'list', label: 'Agentes' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "pb-2.5 text-xs font-bold border-b-2 transition-all relative top-[2px]",
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Tab Content */}
            {activeTab === 'dashboard' ? (
              <div className="space-y-6">
                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Channels filter */}
                  <div className="relative">
                    <select value={selectedChannel} onChange={event => setSelectedChannel(event.target.value)} className="bg-white border border-slate-200 rounded-lg text-xs font-semibold px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[145px]">
                      <option value="all">Todos los canales</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Correo</option>
                      <option value="webchat">Chat web</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Date range picker */}
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-600">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="border-none focus:outline-none focus:ring-0 p-0 text-xs w-[105px] bg-transparent font-semibold cursor-pointer"
                    />
                    <span className="text-slate-300 mx-1">→</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="border-none focus:outline-none focus:ring-0 p-0 text-xs w-[105px] bg-transparent font-semibold cursor-pointer"
                    />
                  </div>

                  {/* Agents Filter */}
                  <div className="relative">
                    <select value={selectedAgentId} onChange={event => setSelectedAgentId(event.target.value)} className="bg-white border border-slate-200 rounded-lg text-xs font-semibold px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[145px]">
                      <option value="all">Todos los agentes</option>
                      {bots.map(bot => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>

                  <span className="ml-auto inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Datos de conversaciones reales
                  </span>
                </div>

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Unique Contacts */}
                  <Card
                    onClick={() => setSelectedMetric('contacts')}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md border",
                      selectedMetric === 'contacts' ? "border-blue-500 ring-1 ring-blue-500 bg-white" : "border-slate-200 bg-white"
                    )}
                  >
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                        Contactos atendidos
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-3xl font-extrabold text-slate-900 mb-2">
                        {analytics.contacts}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Personas únicas con actividad en el período.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Card 2: Actions Triggered */}
                  <Card
                    onClick={() => setSelectedMetric('actions')}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md border",
                      selectedMetric === 'actions' ? "border-blue-500 ring-1 ring-blue-500 bg-white" : "border-slate-200 bg-white"
                    )}
                  >
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                        Respuestas automáticas
                        <Zap className="h-3.5 w-3.5 text-blue-500" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-3xl font-extrabold text-slate-900 mb-2">
                        {analytics.actions}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Mensajes enviados por los agentes de IA.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Card 3: Appointment Booked */}
                  <Card
                    onClick={() => setSelectedMetric('appointments')}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md border",
                      selectedMetric === 'appointments' ? "border-blue-500 ring-1 ring-blue-500 bg-white" : "border-slate-200 bg-white"
                    )}
                  >
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                        Citas detectadas
                        <Calendar className="h-3.5 w-3.5 text-amber-500" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-3xl font-extrabold text-slate-900 mb-2">
                        {analytics.appointments}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Conversaciones que registran una cita o reunión.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Card 4: Time Saved */}
                  <Card
                    onClick={() => setSelectedMetric('time')}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md border",
                      selectedMetric === 'time' ? "border-blue-500 ring-1 ring-blue-500 bg-white" : "border-slate-200 bg-white"
                    )}
                  >
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          Tiempo ahorrado
                          <Info className="h-3 w-3 text-slate-400 cursor-help" title="Tiempo ahorrado resolviendo dudas repetitivas" />
                        </span>
                        <Clock className="h-3.5 w-3.5 text-purple-500" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-3xl font-extrabold text-slate-900 mb-2">
                        {(analytics.minutes / 60).toLocaleString('es-AR', { maximumFractionDigits: 1 })} h
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Estimación conservadora de 3 minutos por respuesta.
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Big visualization area */}
                <Card className="bg-white border border-slate-200 shadow-md rounded-xl overflow-hidden min-h-[350px] flex flex-col">
                  <CardHeader className="border-b border-slate-100 p-5">
                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      {selectedMetric === 'contacts' && "Contactos atendidos"}
                      {selectedMetric === 'actions' && "Respuestas automáticas"}
                      {selectedMetric === 'appointments' && "Citas detectadas"}
                      {selectedMetric === 'time' && "Tiempo ahorrado"}
                      <Info className="h-3.5 w-3.5 text-slate-400" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    {chartValues.some(value => value > 0) ? (
                      <div className="w-full h-[220px] flex flex-col justify-end">
                        <div className="w-full flex-1 flex items-end justify-between gap-2 px-6 pb-2">
                          {analytics.days.map((day, i) => {
                            const value = chartValues[i] || 0;
                            const height = value === 0 ? 2 : Math.max(12, Math.round((value / chartMax) * 130));
                            return (
                            <div key={day.date} className="flex-1 min-w-[8px] flex flex-col items-center group relative">
                              <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-20">
                                {value}
                              </div>
                              <div 
                                style={{ height: `${height}px` }}
                                className="w-full bg-gradient-to-t from-blue-500 to-sky-400 rounded-t-md opacity-85 hover:opacity-100 transition-opacity cursor-pointer shadow-sm relative overflow-hidden"
                              >
                                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.2),transparent)]" />
                              </div>
                              {(analytics.days.length <= 14 || i % Math.ceil(analytics.days.length / 7) === 0) && (
                                <span className="text-[9px] text-slate-400 mt-2 font-semibold whitespace-nowrap">{day.date.slice(5).replace('-', '/')}</span>
                              )}
                            </div>
                          )})}
                        </div>
                        <div className="border-t border-slate-200 w-full pt-2 text-xs text-slate-500 font-medium">
                          Actividad registrada en Mensajes para el período seleccionado
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-w-sm">
                        <AlertCircle className="h-10 w-10 text-slate-300 mx-auto" />
                        <h4 className="text-sm font-semibold text-slate-600">No hay información disponible</h4>
                        <p className="text-xs text-slate-400 leading-normal">
                          Aún no hay conversaciones para estos filtros. Las métricas aparecerán cuando se reciban o respondan mensajes reales.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Agents List Tab Content */
              <Card className="bg-white border border-slate-200 shadow-md rounded-xl overflow-hidden">
                <CardHeader className="border-b border-slate-100 p-5 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-800">Agentes creados</CardTitle>
                    <CardDescription className="text-xs">Visualiza los agentes y sus respectivos estados de integración</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100 uppercase tracking-wider text-[10px] text-slate-500 font-bold">
                        <tr>
                          <th className="p-4">Nombre del Agente</th>
                          <th className="p-4">Canal</th>
                          <th className="p-4">Modelo</th>
                          <th className="p-4">Respuestas enviadas</th>
                          <th className="p-4">Estado</th>
                          <th className="p-4">Último Evento</th>
                          <th className="p-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {bots.map((bot) => {
                          const activity = getBotActivity(bot);
                          return <tr key={bot.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-bold text-slate-800">{bot.name}</td>
                            <td className="p-4">
                              <Badge className="bg-slate-100 text-slate-600 border border-slate-200 py-0 px-2 rounded-md font-semibold">{bot.type}</Badge>
                            </td>
                            <td className="p-4 font-mono text-slate-600">{bot.model}</td>
                            <td className="p-4 font-bold">{activity.count}</td>
                            <td className="p-4">
                              {bot.status === 'active' ? (
                                <Badge className="bg-green-50 text-green-700 border border-green-200 py-0.5 px-2 rounded-full font-bold">Activo</Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-500 border border-slate-200 py-0.5 px-2 rounded-full">Inactivo</Badge>
                              )}
                            </td>
                            <td className="p-4 text-slate-400">{activity.lastActive}</td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => setBotStatus(bot)} className="px-2.5 py-1.5 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
                                  {bot.status === 'active' ? 'Pausar' : 'Activar'}
                                </button>
                                <button onClick={() => deleteBot(bot)} title="Eliminar agente" className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600">
                                  <Trash className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>;
                        })}
                        {!botsLoading && bots.length === 0 && (
                          <tr><td colSpan={7} className="p-10 text-center text-sm text-slate-500">No hay agentes creados. Crea el primero para comenzar.</td></tr>
                        )}
                        {botsLoading && (
                          <tr><td colSpan={7} className="p-10 text-center text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Cargando agentes…</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ─── Knowledge Base View ─── */}
        {activeSubNav === 'knowledge-base' && (
          <div className="space-y-6">
            
            {/* Dialogs */}
            <Dialog open={isCreateKbOpen} onOpenChange={setIsCreateKbOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-slate-900">Crear Base de Conocimiento</DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Crea un contenedor para agrupar documentos sobre un tema específico (ej: Catálogo de productos).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="kb-name" className="text-xs font-semibold text-slate-700">Nombre de la Base</Label>
                    <Input 
                      id="kb-name" 
                      placeholder="Ej: Políticas de Envío" 
                      value={newKbName}
                      onChange={(e) => setNewKbName(e.target.value)}
                      className="border-slate-200" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kb-desc" className="text-xs font-semibold text-slate-700">Descripción (Opcional)</Label>
                    <Input 
                      id="kb-desc" 
                      placeholder="Ej: Plazos y costos de entrega" 
                      value={newKbDescription}
                      onChange={(e) => setNewKbDescription(e.target.value)}
                      className="border-slate-200" 
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsCreateKbOpen(false)} className="text-xs font-semibold">Cancelar</Button>
                  <Button onClick={handleCreateKb} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">Crear</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isEditKbOpen} onOpenChange={setIsEditKbOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-slate-900">Editar Base de Conocimiento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-kb-name" className="text-xs font-semibold text-slate-700">Nombre de la Base</Label>
                    <Input 
                      id="edit-kb-name" 
                      value={newKbName}
                      onChange={(e) => setNewKbName(e.target.value)}
                      className="border-slate-200" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-kb-desc" className="text-xs font-semibold text-slate-700">Descripción</Label>
                    <Input 
                      id="edit-kb-desc" 
                      value={newKbDescription}
                      onChange={(e) => setNewKbDescription(e.target.value)}
                      className="border-slate-200" 
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsEditKbOpen(false)} className="text-xs font-semibold">Cancelar</Button>
                  <Button onClick={handleEditKb} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">Guardar Cambios</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddTextOpen} onOpenChange={setIsAddTextOpen}>
              <DialogContent className="sm:max-w-[550px] p-6 max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-slate-900">Añadir Fuentes de Información</DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Selecciona el tipo de fuente de información que deseas añadir a tu Base de Conocimiento.
                  </DialogDescription>
                </DialogHeader>

                {/* Sub-tabs header for source type */}
                <div className="flex border-b border-slate-200 mt-2 mb-4">
                  {[
                    { id: 'text', label: 'Texto Plano' },
                    { id: 'file', label: 'Cargar Archivo' },
                    { id: 'faq', label: 'Preguntas Frecuentes' },
                    { id: 'url', label: 'Enlace Web (URL)' },
                    { id: 'table', label: 'Tabla' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setAddSourceTab(tab.id as any)}
                      className={cn(
                        "flex-1 pb-2 text-xs font-bold border-b-2 transition-all relative top-[1px]",
                        addSourceTab === tab.id
                          ? "border-blue-600 text-blue-600 font-bold"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-4 py-2">
                  {/* TEXT TAB */}
                  {addSourceTab === 'text' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="text-title" className="text-xs font-semibold text-slate-700">Título de la Guía</Label>
                        <Input 
                          id="text-title" 
                          placeholder="Ej: Horarios y Ubicación" 
                          value={newFreeTextTitle}
                          onChange={(e) => setNewFreeTextTitle(e.target.value)}
                          className="border-slate-200 text-xs" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="text-content" className="text-xs font-semibold text-slate-700">Contenido</Label>
                        <textarea 
                          id="text-content" 
                          placeholder="Escribe la información detallada aquí..." 
                          rows={6}
                          value={newFreeTextContent}
                          onChange={(e) => setNewFreeTextContent(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg text-xs font-semibold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 animate-none min-h-[120px]"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsAddTextOpen(false)} className="text-xs font-semibold">Cancelar</Button>
                        <Button onClick={handleAddFreeText} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">Añadir Guía</Button>
                      </div>
                    </div>
                  )}

                  {/* FILE TAB */}
                  {addSourceTab === 'file' && (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 transition-colors rounded-xl p-8 text-center cursor-pointer relative bg-slate-50/50">
                        <input 
                          type="file" 
                          accept=".txt" 
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={isUploading}
                        />
                        {isUploading ? (
                          <div className="space-y-2">
                            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
                            <p className="text-xs font-bold text-slate-600">Subiendo y procesando...</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                            <p className="text-xs font-bold text-slate-600">Haz clic o arrastra un archivo aquí</p>
                            <span className="text-[10px] text-slate-400 block font-semibold">Formato soportado: .txt</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsAddTextOpen(false)} className="text-xs font-semibold">Cerrar</Button>
                      </div>
                    </div>
                  )}

                  {/* FAQ TAB */}
                  {addSourceTab === 'faq' && (
                    <div className="space-y-4">
                      <p className="text-[11px] text-slate-500">Agrega pares de preguntas y respuestas frecuentes sobre tu negocio.</p>
                      
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {faqList.map((faq, idx) => (
                          <div key={idx} className="p-3 border border-slate-100 rounded-xl bg-slate-50 space-y-2 relative">
                            <button 
                              onClick={() => handleRemoveFaqRow(idx)}
                              className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                              type="button"
                              title="Remover pregunta"
                            >
                              <Plus className="h-4 w-4 transform rotate-45" />
                            </button>
                            <div className="space-y-1 pr-6">
                              <Label className="text-[10px] font-bold text-slate-600">Pregunta #{idx + 1}</Label>
                              <Input 
                                placeholder="Ej: ¿Tienen envíos gratis?" 
                                value={faq.question}
                                onChange={(e) => handleEditFaqRow(idx, 'question', e.target.value)}
                                className="border-slate-200 text-xs h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-slate-600">Respuesta</Label>
                              <textarea 
                                placeholder="Ej: Sí, en compras superiores a $50." 
                                rows={2}
                                value={faq.answer}
                                onChange={(e) => handleEditFaqRow(idx, 'answer', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg text-xs font-semibold px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[60px]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button 
                        variant="outline" 
                        onClick={handleAddFaqRow} 
                        className="text-xs font-bold w-full border-dashed flex items-center justify-center gap-1.5"
                        type="button"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar Pregunta
                      </Button>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button variant="outline" onClick={() => setIsAddTextOpen(false)} className="text-xs font-semibold">Cancelar</Button>
                        <Button onClick={handleSaveFaq} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">Guardar FAQs</Button>
                      </div>
                    </div>
                  )}

                  {/* URL TAB */}
                  {addSourceTab === 'url' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="web-title" className="text-xs font-semibold text-slate-700">Título / Nombre de Referencia</Label>
                        <Input 
                          id="web-title" 
                          placeholder="Ej: Quiénes Somos - Enlace Oficial" 
                          value={newWebTitle}
                          onChange={(e) => setNewWebTitle(e.target.value)}
                          className="border-slate-200 text-xs" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="web-url" className="text-xs font-semibold text-slate-700">Dirección URL del sitio</Label>
                        <Input 
                          id="web-url" 
                          placeholder="Ej: https://ferreteriamerco.com/nosotros" 
                          value={newWebUrl}
                          onChange={(e) => setNewWebUrl(e.target.value)}
                          className="border-slate-200 text-xs" 
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsAddTextOpen(false)} className="text-xs font-semibold" disabled={isScraping}>Cancelar</Button>
                        <Button 
                          onClick={handleImportUrl} 
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5"
                          disabled={isScraping || !newWebUrl.trim()}
                        >
                          {isScraping ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Escaneando sitio...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3.5 w-3.5" />
                              Escanear e Importar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* TABLE TAB */}
                  {addSourceTab === 'table' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="table-title" className="text-xs font-semibold text-slate-700">Nombre de la Tabla</Label>
                        <Input 
                          id="table-title" 
                          placeholder="Ej: Lista de Precios o Inventario" 
                          value={newFreeTextTitle}
                          onChange={(e) => setNewFreeTextTitle(e.target.value)}
                          className="border-slate-200 text-xs" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="table-content" className="text-xs font-semibold text-slate-700">Contenido Tabular (CSV o Markdown)</Label>
                        <textarea 
                          id="table-content" 
                          placeholder="Producto,Precio,Stock&#10;Martillo,$15.50,10&#10;Alicate,$12.00,5" 
                          rows={6}
                          value={newFreeTextContent}
                          onChange={(e) => setNewFreeTextContent(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg text-xs font-semibold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 animate-none min-h-[120px]"
                        />
                        <span className="text-[10px] text-slate-400 font-semibold block mt-1">Escribe los datos separados por comas (CSV) o en formato de tabla Markdown para estructurar la información.</span>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsAddTextOpen(false)} className="text-xs font-semibold">Cancelar</Button>
                        <Button 
                          onClick={async () => {
                            if (!newFreeTextTitle.trim() || !newFreeTextContent.trim() || !selectedKb) return;
                            const newDoc: KnowledgeBaseDoc = {
                              id: `doc-${Date.now()}`,
                              name: newFreeTextTitle.trim(),
                              type: 'table',
                              size: `${(newFreeTextContent.length / 1024).toFixed(1)} KB`,
                              date: new Date().toISOString().split('T')[0],
                              content: newFreeTextContent.trim()
                            };
                            const updatedKb: KnowledgeBase = {
                              ...selectedKb,
                              documents: [...selectedKb.documents, newDoc]
                            };
                            try {
                              const { error } = await db.from('knowledge_bases').update(updatedKb).eq('id', selectedKb.id);
                              if (error) throw error;
                              setSelectedKb(updatedKb);
                              setKnowledgeBases(prev => prev.map(kb => kb.id === selectedKb.id ? updatedKb : kb));
                              setNewFreeTextTitle('');
                              setNewFreeTextContent('');
                              setIsAddTextOpen(false);
                              toast({ title: "Tabla añadida", description: `"${newDoc.name}" cargada con éxito.` });
                            } catch (err: any) {
                              toast({ title: "Error", description: `No se pudo guardar la tabla: ${err.message}`, variant: "destructive" });
                            }
                          }} 
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                        >
                          Añadir Tabla
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* List View vs Selected KB Detail View */}
            {!selectedKb ? (
              <div className="space-y-6">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Base de Conocimientos del Agente</h2>
                    <p className="text-xs text-slate-500 mt-1">Sube archivos u organiza guías que tu asistente de IA usará para responder preguntas.</p>
                  </div>
                  <Button 
                    onClick={() => { setNewKbName(''); setNewKbDescription(''); setIsCreateKbOpen(true); }} 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 h-9 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva Base de Conocimiento
                  </Button>
                </div>

                {/* Quota indicator card */}
                <Card className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                      <Database className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Uso de Bases de Conocimiento</h4>
                      <p className="text-[10px] text-slate-500">Puedes crear hasta 5 bases independientes para organizar el aprendizaje del bot.</p>
                    </div>
                  </div>
                  <div className="w-full md:w-64">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-1">
                      <span>Cuota Utilizada</span>
                      <span>{knowledgeBases.length} / 5</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${(knowledgeBases.length / 5) * 100}%` }} 
                      />
                    </div>
                  </div>
                </Card>

                {/* Search & Table */}
                {isLoadingKbs ? (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white border border-slate-200 rounded-xl">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="text-xs font-semibold mt-2">Cargando bases de conocimientos...</span>
                  </div>
                ) : knowledgeBases.length === 0 ? (
                  <div className="text-center p-12 bg-white border border-slate-200 rounded-xl max-w-xl mx-auto space-y-4">
                    <AlertCircle className="h-12 w-12 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-semibold text-slate-700">No se encontraron bases de conocimiento</h4>
                    <p className="text-xs text-slate-400">
                      Crea una base de conocimiento para empezar a entrenar a tu bot de inteligencia artificial.
                    </p>
                    <Button onClick={() => setIsCreateKbOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                      Crear mi primera base
                    </Button>
                  </div>
                ) : (
                  <Card className="bg-white border border-slate-200 shadow-md rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <div className="relative w-72">
                        <Input 
                          placeholder="Buscar bases..." 
                          value={kbSearchQuery} 
                          onChange={(e) => setKbSearchQuery(e.target.value)}
                          className="pl-8 bg-white border-slate-200 text-xs h-8"
                        />
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-100 uppercase tracking-wider text-[10px] text-slate-500 font-bold">
                          <tr>
                            <th className="p-4">Nombre de la Base</th>
                            <th className="p-4">Descripción</th>
                            <th className="p-4">Documentos</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4">Fecha de Creación</th>
                            <th className="p-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {knowledgeBases
                            .filter(kb => 
                              kb.name.toLowerCase().includes(kbSearchQuery.toLowerCase()) ||
                              kb.description.toLowerCase().includes(kbSearchQuery.toLowerCase())
                            )
                            .map((kb) => (
                              <tr key={kb.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                                  <Database className="h-4 w-4 text-blue-500" />
                                  <button onClick={() => setSelectedKb(kb)} className="hover:underline text-left">
                                    {kb.name}
                                  </button>
                                </td>
                                <td className="p-4 text-slate-500 max-w-xs truncate">{kb.description || "Sin descripción"}</td>
                                <td className="p-4">
                                  <Badge className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                                    {kb.documents?.length || 0} docs
                                  </Badge>
                                </td>
                                <td className="p-4">
                                  <Badge className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-max">
                                    <Check className="h-3 w-3" />
                                    Sincronizado
                                  </Badge>
                                </td>
                                <td className="p-4 text-slate-400">{kb.created_at}</td>
                                <td className="p-4 text-right flex items-center justify-end gap-1.5">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => { setSelectedKb(kb); setNewKbName(kb.name); setNewKbDescription(kb.description); setIsEditKbOpen(true); }}
                                    className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDeleteKb(kb.id, kb.name)}
                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                  >
                                    <Trash className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setSelectedKb(kb)}
                                    className="h-8 text-[11px] font-bold flex items-center gap-1"
                                  >
                                    Administrar
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            ) : (() => {
              // KB Detail View
              const urlDocs = selectedKb.documents?.filter(d => d.type === 'url') || [];
              const faqDocs = selectedKb.documents?.filter(d => d.type === 'faq') || [];
              const textDocs = selectedKb.documents?.filter(d => d.type === 'text') || [];
              const tableDocs = selectedKb.documents?.filter(d => d.type === 'table') || [];
              const fileDocs = selectedKb.documents?.filter(d => d.type === 'file') || [];

              const urlDocsCount = urlDocs.length;
              const faqQuestionsCount = faqDocs.reduce((acc, d) => acc + (d.faqs?.length || 0), 0);
              const textDocsCount = textDocs.length;
              const tableDocsCount = tableDocs.length;
              const fileDocsCount = fileDocs.length;

              const filteredDocuments = selectedKb.documents?.filter(d => {
                if (activeDetailTab === 'todos') return true;
                if (activeDetailTab === 'url') return d.type === 'url';
                if (activeDetailTab === 'faq') return d.type === 'faq';
                if (activeDetailTab === 'text') return d.type === 'text';
                if (activeDetailTab === 'table') return d.type === 'table';
                if (activeDetailTab === 'file') return d.type === 'file';
                return true;
              }) || [];

              return (
                <div className="space-y-6">
                  {/* Header details bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSelectedKb(null)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Base de conocimientos - {selectedKb.name}</h2>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => { setNewKbName(selectedKb.name); setNewKbDescription(selectedKb.description || ''); setIsEditKbOpen(true); }}
                            className="h-6 w-6 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md shrink-0"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{selectedKb.description || "Sin descripción"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => setSelectedKb(null)}
                        className="text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 border-slate-200 h-9 shadow-sm"
                      >
                        Fuentes de conocimiento
                      </Button>
                    </div>
                  </div>

                  {/* Sub Tabs */}
                  <div className="border-b border-slate-200">
                    <div className="flex gap-6 overflow-x-auto">
                      {[
                        { id: 'todos', label: 'Todos' },
                        { id: 'url', label: 'Rastreador web' },
                        { id: 'faq', label: 'Preguntas frecuentes' },
                        { id: 'table', label: 'Tablas' },
                        { id: 'text', label: 'Texto enriquecido' },
                        { id: 'file', label: 'Archivos' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveDetailTab(tab.id as any)}
                          className={cn(
                            "pb-2.5 text-xs font-bold border-b-2 transition-all relative top-[2px] whitespace-nowrap",
                            activeDetailTab === tab.id
                              ? "border-blue-600 text-blue-600"
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category cards grid when Todos is active */}
                  {activeDetailTab === 'todos' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Card 1: Rastreador web */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                              <Globe className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-slate-800 text-sm">Rastreador web</span>
                          </div>
                          <button 
                            onClick={() => { setAddSourceTab('url'); setIsAddTextOpen(true); }}
                            className="p-1 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-slate-400 font-medium">Enlaces</div>
                          <div className="text-2xl font-bold text-slate-800">{urlDocsCount}</div>
                        </div>
                      </div>

                      {/* Card 2: Preguntas frecuentes */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                              <HelpCircle className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-slate-800 text-sm">Preguntas frecuentes</span>
                          </div>
                          <button 
                            onClick={() => { setFaqList([{ question: '', answer: '' }]); setAddSourceTab('faq'); setIsAddTextOpen(true); }}
                            className="p-1 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-slate-400 font-medium">Preguntas Frecuentes</div>
                          <div className="text-2xl font-bold text-slate-800">{faqQuestionsCount}</div>
                        </div>
                      </div>

                      {/* Card 3: Texto enriquecido */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                              <Type className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-slate-800 text-sm">Texto enriquecido</span>
                          </div>
                          <button 
                            onClick={() => { setNewFreeTextTitle(''); setNewFreeTextContent(''); setAddSourceTab('text'); setIsAddTextOpen(true); }}
                            className="p-1 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-slate-400 font-medium">Texto enriquecido</div>
                          <div className="text-2xl font-bold text-slate-800">{textDocsCount}</div>
                        </div>
                      </div>

                      {/* Card 4: Tablas */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                              <Table className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-slate-800 text-sm">Tablas</span>
                          </div>
                          <button 
                            onClick={() => { setNewFreeTextTitle(''); setNewFreeTextContent(''); setAddSourceTab('table'); setIsAddTextOpen(true); }}
                            className="p-1 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-slate-400 font-medium">Tablas</div>
                          <div className="text-2xl font-bold text-slate-800">{tableDocsCount}</div>
                        </div>
                      </div>

                      {/* Card 5: Subir archivo */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                              <Upload className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-slate-800 text-sm">Subir archivo</span>
                          </div>
                          <button 
                            onClick={() => { setAddSourceTab('file'); setIsAddTextOpen(true); }}
                            className="p-1 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-slate-400 font-medium">Subidas de archivos</div>
                          <div className="text-2xl font-bold text-slate-800">{fileDocsCount}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Main contents grids */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Documents List */}
                    <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-md rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 mb-1">Fuentes de Información Cargadas</h3>
                          <p className="text-xs text-slate-500">Administra los documentos, FAQs y enlaces web que este agente utiliza para aprender sobre el negocio.</p>
                        </div>
                        {activeDetailTab !== 'todos' && (
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setNewFreeTextTitle('');
                              setNewFreeTextContent('');
                              if (activeDetailTab === 'url') setAddSourceTab('url');
                              else if (activeDetailTab === 'faq') setAddSourceTab('faq');
                              else if (activeDetailTab === 'table') setAddSourceTab('table');
                              else if (activeDetailTab === 'text') setAddSourceTab('text');
                              else if (activeDetailTab === 'file') setAddSourceTab('file');
                              setIsAddTextOpen(true);
                            }}
                            className="text-xs font-bold bg-white text-slate-700 flex items-center gap-1 h-8 shadow-sm"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Añadir Fuente
                          </Button>
                        )}
                      </div>
                      
                      {filteredDocuments.length === 0 ? (
                        <div className="text-center p-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                          <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                          <h5 className="text-xs font-bold text-slate-600">No hay fuentes en esta categoría</h5>
                          <p className="text-[11px] text-slate-400">Agrega fuentes de información haciendo clic en el botón "+" de la tarjeta o del listado.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredDocuments.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-blue-500 flex items-center justify-center shrink-0">
                                  {doc.type === 'url' && <Globe className="h-4 w-4 text-blue-500" />}
                                  {doc.type === 'faq' && <HelpCircle className="h-4 w-4 text-blue-500" />}
                                  {doc.type === 'text' && <Type className="h-4 w-4 text-blue-500" />}
                                  {doc.type === 'table' && <Table className="h-4 w-4 text-blue-500" />}
                                  {doc.type === 'file' && <Upload className="h-4 w-4 text-blue-500" />}
                                  {doc.type !== 'url' && doc.type !== 'faq' && doc.type !== 'text' && doc.type !== 'table' && doc.type !== 'file' && <FileText className="h-4 w-4 text-blue-500" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-bold text-slate-800">{doc.name}</h4>
                                    <Badge className={cn(
                                      "px-1.5 py-0 text-[9px] font-bold rounded-md uppercase tracking-wider",
                                      doc.type === 'file' && "bg-amber-50 text-amber-700 border border-amber-200",
                                      doc.type === 'text' && "bg-blue-50 text-blue-700 border border-blue-200",
                                      doc.type === 'faq' && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                      doc.type === 'url' && "bg-purple-50 text-purple-700 border border-purple-200",
                                      doc.type === 'table' && "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                    )}>
                                      {doc.type === 'file' && 'Archivo'}
                                      {doc.type === 'text' && 'Texto Plano'}
                                      {doc.type === 'faq' && 'FAQs'}
                                      {doc.type === 'url' && 'Enlace Web'}
                                      {doc.type === 'table' && 'Tabla'}
                                    </Badge>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                                    {doc.type === 'faq' && doc.faqs ? `${doc.faqs.length} preguntas/respuestas` : doc.size}
                                    {doc.type === 'url' && ` • URL: ${doc.url}`}
                                    {` • Cargado ${doc.date}`}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {doc.url && (
                                  <a 
                                    href={doc.url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="p-1.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-700"
                                    title="Ver archivo/enlace original"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteDoc(doc.id, doc.name)}
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>

                    {/* Resumen Stats Panel */}
                    <div className="space-y-6">
                      <Card className="bg-white border border-slate-200 shadow-md rounded-xl p-6">
                        <h3 className="text-xs font-bold text-slate-800 mb-4 uppercase tracking-wider">Resumen de Aprendizaje</h3>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                            <span className="text-slate-500 font-medium">Archivos de Texto (.txt)</span>
                            <span className="font-bold text-slate-800">{fileDocsCount}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                            <span className="text-slate-500 font-medium">Guías de Texto Plano</span>
                            <span className="font-bold text-slate-800">{textDocsCount}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                            <span className="text-slate-500 font-medium">Preguntas de FAQ</span>
                            <span className="font-bold text-slate-800">{faqQuestionsCount}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                            <span className="text-slate-500 font-medium">Enlaces Web (URLs)</span>
                            <span className="font-bold text-slate-800">{urlDocsCount}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-2 font-bold text-slate-800">
                            <span>Total Datos Entrenados</span>
                            <span className="text-blue-600">
                              {((selectedKb.documents?.reduce((acc, d) => acc + (d.content?.length || 0), 0) || 0) / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                          <span className="flex items-center gap-1">
                            <Check className="h-3.5 w-3.5 text-green-500" />
                            Sincronizado
                          </span>
                          <span>Frecuencia: Tiempo real</span>
                        </div>
                      </Card>
                    </div>
                  </div>


                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
};

export default AiAgentsDashboard;
