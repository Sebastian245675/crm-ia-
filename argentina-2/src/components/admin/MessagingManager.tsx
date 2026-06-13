import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/firebase';
import { db } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Send, 
  Key, 
  Settings, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Loader2, 
  Info, 
  Sparkles, 
  Smartphone, 
  MessageSquare, 
  Terminal, 
  Eye, 
  EyeOff,
  ChevronDown,
  ChevronUp,
  Search,
  Star,
  Phone,
  Bell,
  Archive,
  Trash2,
  Filter,
  ArrowUpDown,
  Clock,
  Mail,
  Building2,
  Tag,
  ChevronRight,
  Image as ImageIcon,
  Smile,
  Paperclip,
  MoreVertical,
  X,
  UserPlus,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────────
interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  avatar?: string;
  tags?: string[];
  created_at?: string;
  last_activity?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'contact';
  text: string;
  timestamp: Date;
  thoughts?: string[];
  type?: 'text' | 'image';
  imageUrl?: string;
  status?: 'sent' | 'delivered' | 'read';
}

interface Conversation {
  contactId: string;
  contactName: string;
  contactAvatar?: string;
  contactInitials: string;
  contactColor: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isStarred: boolean;
  messages: ChatMessage[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500',
  'bg-amber-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-pink-500',
  'bg-teal-500', 'bg-orange-500', 'bg-lime-600', 'bg-fuchsia-500',
];

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// ─── Main Component ─────────────────────────────────────────────────────────────
interface MessagingManagerProps {
  onNavigateToConfig?: () => void;
}

export const MessagingManager: React.FC<MessagingManagerProps> = ({ onNavigateToConfig }) => {
  // Config state
  const [showMailConfig, setShowMailConfig] = useState(false);
  const [mailConfig, setMailConfig] = useState({
    email: '',
    password: '',
    imapHost: 'imap.hostinger.com',
    imapPort: '993',
    smtpHost: 'smtp.hostinger.com',
    smtpPort: '465'
  });
  const [showMailPassword, setShowMailPassword] = useState(false);

  const [geminiKey, setGeminiKey] = useState('');
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioNum, setTwilioNum] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Conversations & contacts
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'recents' | 'starred'>('all');
  const [showContactDetails, setShowContactDetails] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Chat
  const [inputText, setInputText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeThoughts, setActiveThoughts] = useState<Record<string, boolean>>({});
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const webhookUrl = `${window.location.origin}/api/whatsapp`;

  // ─── Load Config ────────────────────────────────────────────────────────────
  useEffect(() => { fetchConfig(); loadContacts(); }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, selectedConvId]);

  const fetchConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await fetch('/api/agent/config', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setGeminiKey(data.gemini_key || '');
        setTwilioSid(data.twilio_sid || '');
        setTwilioToken(data.twilio_token || '');
        setTwilioNum(data.twilio_num || '');
      }
    } catch (e) {
      console.error("Error loading agent config:", e);
    } finally {
      setLoadingConfig(false);
    }
  };

  // ─── Load contacts from DB ────────────────────────────────────────────────
  const loadContacts = async () => {
    try {
      const { data, error } = await db.from('contacts').select('*').order('created_at', { ascending: false });
      if (error) { console.error('Error loading contacts:', error); return; }

      const contacts: Contact[] = (data || []).map((c: any) => ({
        id: String(c.id),
        name: c.name || 'Sin nombre',
        phone: c.phone || '',
        email: c.email || '',
        company: c.company || '',
        avatar: c.avatar || '',
        tags: c.tags || [],
        created_at: c.created_at || '',
        last_activity: c.last_activity || '',
      }));

      // Build conversations from contacts
      const convs: Conversation[] = contacts.map((c) => ({
        contactId: c.id,
        contactName: c.name,
        contactAvatar: c.avatar,
        contactInitials: getInitials(c.name),
        contactColor: getColorForName(c.name),
        lastMessage: 'Chat de prueba inicial',
        lastMessageTime: c.last_activity ? new Date(c.last_activity) : new Date(c.created_at || Date.now()),
        unreadCount: 0,
        isStarred: false,
        messages: [
          {
            id: `welcome-${c.id}`,
            sender: 'agent',
            text: 'Chat de prueba inicial',
            timestamp: new Date(c.created_at || Date.now()),
            status: 'read',
          }
        ],
      }));

      // Add a default simulated conversation if no contacts
      if (convs.length === 0) {
        convs.push({
          contactId: 'sim-1',
          contactName: 'Usuario Simulado',
          contactAvatar: '',
          contactInitials: 'US',
          contactColor: 'bg-blue-500',
          lastMessage: 'Chat de prueba inicial',
          lastMessageTime: new Date(),
          unreadCount: 0,
          isStarred: false,
          messages: [
            {
              id: 'welcome-sim',
              sender: 'agent',
              text: 'Chat de prueba inicial',
              timestamp: new Date(),
              status: 'read',
            }
          ],
        });
      }

      setConversations(convs);
      if (convs.length > 0) {
        setSelectedConvId(convs[0].contactId);
        setSelectedContact(contacts[0] || null);
      }
    } catch (err) {
      console.error('Error loading contacts for messaging:', err);
      // Create default simulated conversation on error
      const defaultConv: Conversation = {
        contactId: 'sim-1',
        contactName: 'Usuario Simulado',
        contactAvatar: '',
        contactInitials: 'US',
        contactColor: 'bg-blue-500',
        lastMessage: 'Chat de prueba inicial',
        lastMessageTime: new Date(),
        unreadCount: 0,
        isStarred: false,
        messages: [
          {
            id: 'welcome-sim',
            sender: 'agent',
            text: 'Chat de prueba inicial',
            timestamp: new Date(),
            status: 'read',
          }
        ],
      };
      setConversations([defaultConv]);
      setSelectedConvId('sim-1');
    }
  };

  // ─── Save config ────────────────────────────────────────────────────────────
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const payload = { gemini_key: geminiKey, twilio_sid: twilioSid, twilio_token: twilioToken, twilio_num: twilioNum };
      const res = await fetch('/api/agent/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: "Configuración guardada", description: "La configuración del agente de IA se guardó correctamente." });
        fetchConfig();
      } else {
        throw new Error(data.message || "Failed to save configuration");
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: e.message });
    } finally {
      setSavingConfig(false);
    }
  };

  // ─── Send message ─────────────────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sendingMessage || !selectedConvId) return;

    const userText = inputText;
    setInputText('');
    setSendingMessage(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date(),
      status: 'sent',
    };

    setConversations(prev => prev.map(c =>
      c.contactId === selectedConvId
        ? { ...c, messages: [...c.messages, userMsg], lastMessage: userText, lastMessageTime: new Date() }
        : c
    ));

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ message: userText, sender: 'Usuario_Simulado' })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const agentMsg: ChatMessage = {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: data.response,
          timestamp: new Date(),
          thoughts: data.thoughts || [],
          status: 'read',
        };

        setConversations(prev => prev.map(c =>
          c.contactId === selectedConvId
            ? { ...c, messages: [...c.messages, agentMsg], lastMessage: data.response.substring(0, 50) + '...' }
            : c
        ));

        if (data.thoughts && data.thoughts.length > 0) {
          setActiveThoughts(prev => ({ ...prev, [agentMsg.id]: true }));
        }
      } else {
        throw new Error(data.response || "Error al conectar con el agente");
      }
    } catch (e: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'agent',
        text: `⚠️ Error de conexión: ${e.message}`,
        timestamp: new Date(),
      };
      setConversations(prev => prev.map(c =>
        c.contactId === selectedConvId
          ? { ...c, messages: [...c.messages, errMsg] }
          : c
      ));
    } finally {
      setSendingMessage(false);
    }
  };

  const toggleThoughts = (id: string) => {
    setActiveThoughts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast({ title: "Copiado al portapapeles" });
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const toggleStar = (convId: string) => {
    setConversations(prev => prev.map(c =>
      c.contactId === convId ? { ...c, isStarred: !c.isStarred } : c
    ));
  };

  // ─── Derived state ──────────────────────────────────────────────────────────
  const selectedConv = conversations.find(c => c.contactId === selectedConvId);

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === 'unread') return c.unreadCount > 0;
    if (activeFilter === 'starred') return c.isStarred;
    return true;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500 font-medium animate-pulse">Cargando módulo de mensajería...</p>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-[calc(100vh-140px)] flex rounded-xl overflow-hidden border border-slate-200 bg-white shadow-lg">
      
      {/* ═══════════════════════ LEFT PANEL: Conversations List ═══════════════════════ */}
      <div className="w-[320px] min-w-[280px] flex flex-col border-r border-slate-200 bg-white shrink-0">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              Bandeja del Equipo
              <Filter className="h-3.5 w-3.5 text-slate-400 cursor-pointer hover:text-slate-600" />
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 cursor-pointer hover:text-slate-600" />
            </h2>
            <button
              onClick={() => setShowMailConfig(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Configuración de Correo Electrónico"
            >
              <Mail className="h-4 w-4" />
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 mb-3">
            {[
              { key: 'unread' as const, label: 'Sin leer', count: totalUnread },
              { key: 'all' as const, label: 'Todos' },
              { key: 'recents' as const, label: 'Recientes' },
              { key: 'starred' as const, label: 'Favoritos', icon: Star },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={cn(
                  "px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-all flex items-center gap-1",
                  activeFilter === filter.key
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                {filter.icon && <filter.icon className="h-3 w-3" />}
                {filter.label}
                {filter.count !== undefined && filter.count > 0 && (
                  <span className={cn(
                    "ml-0.5 px-1.5 py-0 text-[10px] font-bold rounded-full",
                    activeFilter === filter.key ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                  )}>
                    {filter.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Buscar conversaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 rounded-lg focus-visible:ring-blue-500"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <MessageSquare className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-xs font-medium">No hay conversaciones</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.contactId}
                onClick={() => {
                  setSelectedConvId(conv.contactId);
                  setConversations(prev => prev.map(c =>
                    c.contactId === conv.contactId ? { ...c, unreadCount: 0 } : c
                  ));
                  // Find matching contact
                  const matchedContact: Contact = {
                    id: conv.contactId,
                    name: conv.contactName,
                    avatar: conv.contactAvatar,
                    tags: [],
                  };
                  setSelectedContact(matchedContact);
                }}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-slate-50 transition-colors relative",
                  selectedConvId === conv.contactId
                    ? "bg-blue-50/70 border-l-[3px] border-l-blue-500"
                    : "hover:bg-slate-50 border-l-[3px] border-l-transparent"
                )}
              >
                {/* Avatar */}
                <div className="relative shrink-0 mt-0.5">
                  {conv.contactAvatar ? (
                    <img src={conv.contactAvatar} className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm" />
                  ) : (
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm",
                      conv.contactColor
                    )}>
                      {conv.contactInitials}
                    </div>
                  )}
                  {/* Online indicator */}
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-sm font-semibold text-slate-800 truncate">
                      {conv.contactName}
                    </h4>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                      {formatRelativeTime(conv.lastMessageTime)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5 leading-relaxed">
                    {conv.lastMessage}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {conv.unreadCount > 0 && (
                    <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {conv.unreadCount}
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleStar(conv.contactId); }}
                    className="p-0.5"
                  >
                    <Star className={cn(
                      "h-3.5 w-3.5 transition-colors",
                      conv.isStarred ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-400"
                    )} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ═══════════════════════ CENTER PANEL: Chat Area ═══════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                {selectedConv.contactAvatar ? (
                  <img src={selectedConv.contactAvatar} className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-100" />
                ) : (
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold",
                    selectedConv.contactColor
                  )}>
                    {selectedConv.contactInitials}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    {selectedConv.contactName}
                    {geminiKey ? (
                      <Badge className="bg-emerald-50 text-emerald-700 text-[9px] py-0 px-1.5 border border-emerald-200 font-bold">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" /> IA Activa
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 text-[9px] py-0 px-1.5 border border-amber-200 font-bold">
                        Modo Reglas
                      </Badge>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">En línea</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <Bell className="h-4 w-4" />
                </button>
                <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <Phone className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleStar(selectedConv.contactId)}
                  className="p-2 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                >
                  <Star className={cn("h-4 w-4", selectedConv.isStarred && "fill-amber-400 text-amber-400")} />
                </button>
                <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <Archive className="h-4 w-4" />
                </button>
                <button className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="w-px h-5 bg-slate-200 mx-1" />
                
                <button
                  onClick={() => onNavigateToConfig?.()}
                  className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Configuración IA & WhatsApp"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowContactDetails(!showContactDetails)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    showContactDetails ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  )}
                  title="Detalles del contacto"
                >
                  <User className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23e2e8f0\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
              {selectedConv.messages.map((msg) => (
                <div key={msg.id} className="space-y-1">
                  <div className={cn("flex", msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2.5 text-[13px] shadow-sm relative leading-relaxed",
                      msg.sender === 'user'
                        ? 'bg-emerald-100 text-slate-800 rounded-tr-sm'
                        : 'bg-white text-slate-800 rounded-tl-sm border border-slate-100'
                    )}>
                      {/* Message text */}
                      <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                      
                      {/* Timestamp & status */}
                      <div className={cn(
                        "flex items-center gap-1 mt-1.5 select-none",
                        msg.sender === 'user' ? 'justify-end' : 'justify-start'
                      )}>
                        <span className="text-[10px] text-slate-400">{formatTime(msg.timestamp)}</span>
                        {msg.sender === 'user' && msg.status === 'read' && (
                          <span className="text-blue-500 text-[10px]">✓✓</span>
                        )}
                        {msg.sender === 'user' && msg.status === 'delivered' && (
                          <span className="text-slate-400 text-[10px]">✓✓</span>
                        )}
                        {msg.sender === 'user' && msg.status === 'sent' && (
                          <span className="text-slate-400 text-[10px]">✓</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Agent thoughts (debug panel) */}
                  {msg.sender === 'agent' && msg.thoughts && msg.thoughts.length > 0 && (
                    <div className="ml-2 pl-3 border-l-2 border-slate-200">
                      <button
                        type="button"
                        onClick={() => toggleThoughts(msg.id)}
                        className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1 py-0.5 transition-colors"
                      >
                        <Terminal className="h-3 w-3" />
                        <span>{activeThoughts[msg.id] ? 'Ocultar' : 'Ver'} flujo cognitivo ({msg.thoughts.length})</span>
                        {activeThoughts[msg.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      
                      {activeThoughts[msg.id] && (
                        <div className="bg-slate-900 text-slate-200 rounded-lg p-3 text-[11px] font-mono leading-normal space-y-1.5 shadow-inner mt-1 max-w-[90%]">
                          <div className="text-[10px] text-blue-400 font-bold uppercase border-b border-slate-700 pb-1 mb-1">
                            🧠 Procesamiento Cognitivo
                          </div>
                          {msg.thoughts.map((thought, tIdx) => (
                            <div key={tIdx} className="break-all whitespace-pre-wrap pl-2 border-l border-slate-700">
                              {thought}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {sendingMessage && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 text-slate-500 rounded-2xl rounded-tl-sm px-4 py-3 text-sm shadow-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="font-medium animate-pulse text-xs">merco está escribiendo...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-2 shrink-0">
              <button type="button" className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                <Smile className="h-5 w-5" />
              </button>
              <button type="button" className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                <Paperclip className="h-5 w-5" />
              </button>
              <div className="flex-1">
                <Input
                  placeholder="Escribe un mensaje..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={sendingMessage}
                  className="bg-slate-50 border-slate-200 h-10 rounded-xl px-4 text-sm focus-visible:ring-blue-500 shadow-inner"
                />
              </div>
              <Button
                type="submit"
                size="icon"
                disabled={!inputText.trim() || sendingMessage}
                className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shrink-0 active:scale-95 transition-all shadow-md"
                aria-label="Enviar mensaje"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>

            {/* Connection Banner */}
            <div className="bg-amber-50 border-t border-amber-100 px-4 py-2.5 flex items-center justify-between text-xs text-amber-800 shrink-0 font-medium">
              <span className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-amber-500" />
                WhatsApp no está conectado para recibir mensajes reales.
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onNavigateToConfig?.()}
                className="text-amber-700 border-amber-200 bg-white hover:bg-amber-50 font-bold h-7 px-3 text-xs"
              >
                Conectar
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
            <h3 className="text-lg font-semibold text-slate-500">Selecciona una conversación</h3>
            <p className="text-sm text-slate-400 mt-1">Elige un contacto de la lista para comenzar</p>
          </div>
        )}
      </div>

      {/* ═══════════════════════ RIGHT PANEL: Contact Details ═══════════════════════ */}
      {showContactDetails && selectedConv && (
        <div className="w-[300px] min-w-[260px] border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700">Detalles del Contacto</h3>
            <button
              onClick={() => setShowContactDetails(false)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Contact Card */}
          <div className="px-4 py-5 flex flex-col items-center text-center border-b border-slate-100">
            {selectedConv.contactAvatar ? (
              <img src={selectedConv.contactAvatar} className="w-16 h-16 rounded-full object-cover ring-4 ring-blue-50 shadow-md mb-3" />
            ) : (
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold ring-4 ring-blue-50 shadow-md mb-3",
                selectedConv.contactColor
              )}>
                {selectedConv.contactInitials}
              </div>
            )}
            <h4 className="text-base font-bold text-slate-800">{selectedConv.contactName}</h4>
            
            {/* Owner & Followers row */}
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-600">Propietario</span>
                <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <User className="h-2.5 w-2.5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold truncate max-w-[60px]">Admin</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-600">Seguidores</span>
                <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full">
                  <Users className="h-3 w-3 text-slate-500" />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
              {(selectedContact?.tags || []).length > 0 ? (
                (selectedContact?.tags || []).map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0 font-semibold">
                    {tag}
                    <button className="ml-1 text-blue-400 hover:text-blue-600">&times;</button>
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0">
                  Sin etiquetas
                </Badge>
              )}
              <button className="text-blue-500 hover:text-blue-700 transition-colors">
                <Tag className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Info Tabs */}
          <div className="border-b border-slate-100">
            <div className="flex px-2">
              {['Campos', 'DND', 'Acciones'].map((tab, i) => (
                <button
                  key={tab}
                  className={cn(
                    "flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors border-b-2",
                    i === 0
                      ? "text-blue-600 border-blue-500"
                      : "text-slate-400 border-transparent hover:text-slate-600"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Fields Search */}
          <div className="px-4 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
              <Input
                placeholder="Buscar campos y carpetas"
                className="pl-7 h-7 text-[11px] bg-slate-50 border-slate-200 rounded-md"
              />
            </div>
          </div>

          {/* Collapsible sections */}
          <div className="flex-1 px-4 pb-4 space-y-1">
            {/* Contact Section */}
            <details className="group" open>
              <summary className="flex items-center justify-between py-2 cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900">
                <span>Contacto</span>
                <ChevronDown className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="space-y-2.5 pb-3">
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-600">{selectedContact?.phone || 'No registrado'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-600 truncate">{selectedContact?.email || 'No registrado'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-600">{selectedContact?.company || 'No registrada'}</span>
                </div>
              </div>
            </details>

            <Separator className="bg-slate-100" />

            {/* General Info Section */}
            <details className="group">
              <summary className="flex items-center justify-between py-2 cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900">
                <span>Información General</span>
                <ChevronDown className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="space-y-2.5 pb-3 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Creado</span>
                  <span className="text-slate-700 font-medium">
                    {selectedContact?.created_at
                      ? new Date(selectedContact.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Reciente'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Última actividad</span>
                  <span className="text-slate-700 font-medium">
                    {selectedContact?.last_activity
                      ? formatRelativeTime(new Date(selectedContact.last_activity))
                      : 'Ahora'
                    }
                  </span>
                </div>
              </div>
            </details>

            <Separator className="bg-slate-100" />

            {/* Additional Info */}
            <details className="group">
              <summary className="flex items-center justify-between py-2 cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900">
                <span>Información Adicional</span>
                <ChevronDown className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pb-3 text-xs text-slate-500">
                <p>Sin información adicional disponible.</p>
              </div>
            </details>

            <Separator className="bg-slate-100" />

            {/* Created by */}
            <div className="pt-2 text-center">
              <p className="text-[10px] text-slate-400 font-medium">
                Creado por: <span className="text-blue-500">WhatsApp</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración de Correo */}
      <Dialog open={showMailConfig} onOpenChange={setShowMailConfig}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Configuración de Correo Electrónico
            </DialogTitle>
            <DialogDescription>
              Introduce tus credenciales IMAP/SMTP para poder recibir y enviar correos desde la bandeja.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Credenciales de Acceso</Label>
              <Input 
                placeholder="tu@correo.com" 
                value={mailConfig.email}
                onChange={(e) => setMailConfig({...mailConfig, email: e.target.value})}
                className="bg-slate-50 border-slate-200"
              />
              <div className="relative">
                <Input 
                  type={showMailPassword ? "text" : "password"} 
                  placeholder="Contraseña o App Password" 
                  value={mailConfig.password}
                  onChange={(e) => setMailConfig({...mailConfig, password: e.target.value})}
                  className="bg-slate-50 border-slate-200 pr-10"
                />
                <button 
                  type="button"
                  onClick={() => setShowMailPassword(!showMailPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showMailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Servidor IMAP (Recibir)</Label>
                <Input 
                  placeholder="imap.hostinger.com" 
                  value={mailConfig.imapHost}
                  onChange={(e) => setMailConfig({...mailConfig, imapHost: e.target.value})}
                  className="bg-slate-50 border-slate-200 text-sm"
                />
                <Input 
                  placeholder="Puerto (ej: 993)" 
                  value={mailConfig.imapPort}
                  onChange={(e) => setMailConfig({...mailConfig, imapPort: e.target.value})}
                  className="bg-slate-50 border-slate-200 text-sm"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Servidor SMTP (Enviar)</Label>
                <Input 
                  placeholder="smtp.hostinger.com" 
                  value={mailConfig.smtpHost}
                  onChange={(e) => setMailConfig({...mailConfig, smtpHost: e.target.value})}
                  className="bg-slate-50 border-slate-200 text-sm"
                />
                <Input 
                  placeholder="Puerto (ej: 465)" 
                  value={mailConfig.smtpPort}
                  onChange={(e) => setMailConfig({...mailConfig, smtpPort: e.target.value})}
                  className="bg-slate-50 border-slate-200 text-sm"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
            <Button variant="outline" onClick={() => setShowMailConfig(false)}>Cancelar</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                toast({ title: "Configuración guardada", description: "Los ajustes de correo han sido guardados exitosamente." });
                setShowMailConfig(false);
              }}
            >
              Guardar Configuración
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
