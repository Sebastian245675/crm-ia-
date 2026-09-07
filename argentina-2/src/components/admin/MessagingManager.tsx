import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/firebase';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from '@/components/ui/switch';
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
  PhoneCall,
  PhoneOff,
  Bell,
  BellOff,
  Archive,
  Trash2,
  Filter,
  ArrowUpDown,
  Clock,
  Mail,
  Building2,
  Tag,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Smile,
  Paperclip,
  MoreVertical,
  X,
  UserPlus,
  Users,
  ShieldAlert,
  Calendar,
  DollarSign,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Mic,
  MicOff,
  Briefcase,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────────
export interface DndSettings {
  all: boolean;
  whatsapp: boolean;
  email: boolean;
  calls: boolean;
  sms: boolean;
  reason: string;
}

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
  html?: string;
  timestamp: Date;
  thoughts?: string[];
  type?: 'text' | 'image';
  imageUrl?: string;
  status?: 'sent' | 'delivered' | 'read';
  emailUid?: number;
  bodyLoaded?: boolean;
  bodyLoading?: boolean;
  agentId?: string;
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
  isArchived?: boolean;
  isMuted?: boolean;
  messages: ChatMessage[];
  channel?: 'whatsapp' | 'email' | 'webchat';
  isEmail?: boolean;
  emailSubject?: string;
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

const safeParseTags = (tagsVal: any): string[] => {
  if (!tagsVal) return [];
  if (Array.isArray(tagsVal)) return tagsVal;
  if (typeof tagsVal === 'string') {
    try {
      const parsed = JSON.parse(tagsVal);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === 'string') {
        return parsed.split(',').map((t: string) => t.trim()).filter(Boolean);
      }
    } catch {
      return tagsVal.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
  }
  return [];
};

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

const CONVERSATIONS_STORAGE_PREFIX = 'merco_messaging_conversations_v2';

function getConversationChannel(conversation: Conversation): NonNullable<Conversation['channel']> {
  return conversation.channel || (conversation.isEmail ? 'email' : 'whatsapp');
}

function isMailboxConversation(conversation: Conversation): boolean {
  return conversation.contactId.startsWith('email-');
}

function normalizeConversation(conversation: any): Conversation {
  const messages: ChatMessage[] = (Array.isArray(conversation.messages) ? conversation.messages : [])
    .filter((message: any) => !(String(message.id || '').startsWith('welcome-') && message.text === 'Chat de prueba inicial'))
    .map((message: any) => ({ ...message, timestamp: new Date(message.timestamp) }));
  const lastMessage = conversation.lastMessage === 'Chat de prueba inicial'
    ? (messages[messages.length - 1]?.text || 'Sin mensajes todavía')
    : (conversation.lastMessage || 'Sin mensajes todavía');
  return {
    ...conversation,
    channel: conversation.channel || (conversation.isEmail ? 'email' : 'whatsapp'),
    lastMessage,
    lastMessageTime: new Date(conversation.lastMessageTime),
    messages,
  };
}

function restoreConversations(userId?: string): Conversation[] {
  if (!userId) return [];
  try {
    const saved = localStorage.getItem(`${CONVERSATIONS_STORAGE_PREFIX}:${userId}`);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeConversation);
  } catch {
    return [];
  }
}

const ConversationChannelBadge: React.FC<{
  channel: NonNullable<Conversation['channel']>;
  compact?: boolean;
}> = ({ channel, compact = false }) => {
  if (channel === 'email') {
    return (
      <span title="Correo electrónico" className={cn(
        'inline-flex items-center justify-center border border-indigo-200 bg-indigo-50 text-indigo-600',
        compact ? 'h-4 w-4 rounded-full' : 'h-5 gap-1 rounded px-1.5 text-[10px] font-semibold'
      )}>
        <Mail className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />{!compact && 'Correo'}
      </span>
    );
  }
  if (channel === 'webchat') {
    return (
      <span title="Chat web" className={cn(
        'inline-flex items-center justify-center border border-sky-200 bg-sky-50 text-sky-600',
        compact ? 'h-4 w-4 rounded-full' : 'h-5 gap-1 rounded px-1.5 text-[10px] font-semibold'
      )}>
        <MessageSquare className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />{!compact && 'Chat web'}
      </span>
    );
  }
  return (
    <span title="WhatsApp" className={cn(
      'inline-flex items-center justify-center border border-emerald-200 bg-emerald-50 text-emerald-600',
      compact ? 'h-4 w-4 rounded-full' : 'h-5 gap-1 rounded px-1.5 text-[10px] font-semibold'
    )}>
      <svg className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 11.6a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 8.5c.3 2.8 2.2 4.7 5 5l1-1c.2-.2.5-.3.8-.2l2 .8c.3.1.5.4.4.8l-.3 1.8c-.1.5-.5.8-1 .8A10.4 10.4 0 0 1 6.5 7.1c0-.5.3-.9.8-1l1.8-.3c.4-.1.7.1.8.4l.8 2c.1.3 0 .6-.2.8l-1 .9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && 'WhatsApp'}
    </span>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────
// ─── Module-Level Cache for Instant Tab Transitions (like GHL) ──────────────────
let cacheConversations: Conversation[] | null = null;
let cacheConversationsUserId: string | null = null;
let cacheSelectedConvId: string | null = null;
let cacheMailConfig: any = null;
let cacheGeminiKey = '';
let cacheTwilioSid = '';
let cacheTwilioToken = '';
let cacheTwilioNum = '';
let cacheLoaded = false;
let cacheConfigLoadedAt = 0;
let cacheMailboxLoadedAt = 0;
const CONFIG_CACHE_MS = 5 * 60_000;
const MAILBOX_CACHE_MS = 60_000;

interface MessagingManagerProps {
  onNavigateToConfig?: () => void;
  isActive?: boolean;
}

export const MessagingManager: React.FC<MessagingManagerProps> = ({ onNavigateToConfig, isActive = false }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || '';
  // Config state
  const [showMailConfig, setShowMailConfig] = useState(false);
  const [mailConfig, setMailConfig] = useState(cacheMailConfig || {
    email: '',
    password: '',
    imapHost: 'imap.hostinger.com',
    imapPort: '993',
    smtpHost: 'smtp.hostinger.com',
    smtpPort: '465'
  });
  const [showMailPassword, setShowMailPassword] = useState(false);

  const [geminiKey, setGeminiKey] = useState(cacheGeminiKey);
  const [twilioSid, setTwilioSid] = useState(cacheTwilioSid);
  const [twilioToken, setTwilioToken] = useState(cacheTwilioToken);
  const [twilioNum, setTwilioNum] = useState(cacheTwilioNum);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(!cacheLoaded);
  const [loadingMailbox, setLoadingMailbox] = useState(false);
  const [mailboxVersion, setMailboxVersion] = useState(0);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Conversations & contacts
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const persisted = restoreConversations(currentUserId);
    if (persisted.length) return persisted;
    return cacheConversationsUserId === currentUserId ? (cacheConversations || []) : [];
  });
  const [selectedConvId, setSelectedConvId] = useState<string | null>(
    cacheConversationsUserId === currentUserId ? cacheSelectedConvId : null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'recents' | 'starred' | 'archived'>('all');
  const [showContactDetails, setShowContactDetails] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Right Panel Subtabs: Campos, DND, Acciones
  const [rightPanelTab, setRightPanelTab] = useState<'campos' | 'dnd' | 'acciones'>('campos');

  // Interactive Call Dialog State
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [callSeconds, setCallSeconds] = useState(0);
  const [callIsMuted, setCallIsMuted] = useState(false);

  // Delete & Settings Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showChatSettingsDialog, setShowChatSettingsDialog] = useState(false);

  // DND Map State (persistido en localStorage)
  const [dndMap, setDndMap] = useState<Record<string, DndSettings>>(() => {
    try {
      const saved = localStorage.getItem('merco_crm_dnd_map');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  // Actions Tab State
  const [oppTitle, setOppTitle] = useState('');
  const [oppValue, setOppValue] = useState('');
  const [oppStage, setOppStage] = useState('Nuevo');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [contactNotes, setContactNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('merco_crm_notes_map');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  // Call timer interval
  useEffect(() => {
    let interval: any = null;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Sync state to memory cache
  useEffect(() => {
    cacheConversations = conversations;
    cacheConversationsUserId = currentUserId;
    if (!currentUserId) return;
    const localConversations = conversations.filter((conversation) => !isMailboxConversation(conversation));
    try {
      localStorage.setItem(`${CONVERSATIONS_STORAGE_PREFIX}:${currentUserId}`, JSON.stringify(localConversations));
    } catch (error) {
      console.warn('[MessagingManager] No se pudieron guardar las conversaciones locales:', error);
    }
  }, [conversations, currentUserId]);

  useEffect(() => {
    cacheSelectedConvId = selectedConvId;
  }, [selectedConvId]);

  useEffect(() => {
    cacheMailConfig = mailConfig;
  }, [mailConfig]);

  useEffect(() => {
    cacheGeminiKey = geminiKey;
    cacheTwilioSid = twilioSid;
    cacheTwilioToken = twilioToken;
    cacheTwilioNum = twilioNum;
  }, [geminiKey, twilioSid, twilioToken, twilioNum]);

  // Chat
  const [inputText, setInputText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeThoughts, setActiveThoughts] = useState<Record<string, boolean>>({});
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const webhookUrl = `${window.location.origin}/api/whatsapp`;

  const [savingMailConfig, setSavingMailConfig] = useState(false);

  // Mobile responsive view state
  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileView, setActiveMobileView] = useState<'list' | 'chat' | 'details'>('list');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ─── Load Config on Active Tab ───────────────────────────────────────────────
  useEffect(() => {
    if (isActive) {
      if (!cacheLoaded || Date.now() - cacheConfigLoadedAt > CONFIG_CACHE_MS) fetchConfig();
      else setLoadingConfig(false);
      loadContacts();
    }
  }, [isActive, currentUserId]);

  // ─── Event Listener for Mail Config Update ──────────────────────────────────
  useEffect(() => {
    const handleUpdate = () => {
      cacheMailboxLoadedAt = 0;
      loadContacts(true);
    };
    window.addEventListener('mailConfigUpdated', handleUpdate);
    return () => {
      window.removeEventListener('mailConfigUpdated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, selectedConvId]);

  const fetchConfig = async () => {
    try {
      if (!cacheLoaded) {
        setLoadingConfig(true);
      }
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

        cacheGeminiKey = data.gemini_key || '';
        cacheTwilioSid = data.twilio_sid || '';
        cacheTwilioToken = data.twilio_token || '';
        cacheTwilioNum = data.twilio_num || '';
      }
    } catch (e) {
      console.error("Error loading agent config:", e);
    } finally {
      cacheLoaded = true;
      cacheConfigLoadedAt = Date.now();
      setLoadingConfig(false);
    }
  };

  // ─── Load contacts from DB ────────────────────────────────────────────────
  const loadContacts = async (forceEmails = false) => {
    try {
      const mailConfigPromise = db.from('mail_config').select().eq('id', 'default_mail').maybeSingle();
      const contactsPromise = db.from('contacts').select('*').order('created_at', { ascending: false });
      const { data, error } = await contactsPromise;
      if (error) throw error;

      const contacts: Contact[] = (data || []).map((contact: any) => ({
        id: String(contact.id), name: contact.name || 'Sin nombre', phone: contact.phone || '', email: contact.email || '',
        company: contact.company || '', avatar: contact.avatar || '', tags: safeParseTags(contact.tags),
        created_at: contact.created_at || '', last_activity: contact.last_activity || '',
      }));
      const storedConversations = restoreConversations(currentUserId);
      const memoryConversations = cacheConversationsUserId === currentUserId ? (cacheConversations || []) : [];
      const knownConversations = [...storedConversations, ...memoryConversations, ...conversations].map(normalizeConversation);
      const knownByContact = new Map<string, Conversation>(
        knownConversations
          .filter((conversation) => !isMailboxConversation(conversation))
          .map((conversation) => [conversation.contactId, conversation] as const)
      );
      const localConversations: Conversation[] = contacts.map((contact) => {
        const existing = knownByContact.get(contact.id);
        const inferredChannel: NonNullable<Conversation['channel']> = contact.phone
          ? 'whatsapp'
          : contact.email ? 'email' : 'webchat';
        if (existing) {
          return {
            ...existing,
            contactName: contact.name,
            contactAvatar: contact.avatar,
            contactInitials: getInitials(contact.name),
            contactColor: getColorForName(contact.name),
            channel: existing.channel || inferredChannel,
          };
        }
        return {
          contactId: contact.id,
          contactName: contact.name,
          contactAvatar: contact.avatar,
          contactInitials: getInitials(contact.name),
          contactColor: getColorForName(contact.name),
          lastMessage: 'Sin mensajes todavía',
          lastMessageTime: contact.last_activity ? new Date(contact.last_activity) : new Date(contact.created_at || Date.now()),
          unreadCount: 0,
          isStarred: false,
          channel: inferredChannel,
          isEmail: inferredChannel === 'email',
          messages: [],
        };
      });
      const cachedEmailConversations = knownConversations.filter(isMailboxConversation);
      const immediateConversations = [...localConversations, ...cachedEmailConversations];
      if (immediateConversations.length) {
        setConversations(immediateConversations);
        setSelectedConvId((previous) => previous && immediateConversations.some((conversation) => conversation.contactId === previous) ? previous : immediateConversations[0].contactId);
        const activeId = selectedConvId && immediateConversations.some((conversation) => conversation.contactId === selectedConvId) ? selectedConvId : immediateConversations[0].contactId;
        const contact = contacts.find((item) => item.id === activeId);
        if (contact) setSelectedContact(contact);
      }

      const { data: savedMailConfig } = await mailConfigPromise;
      if (!savedMailConfig?.email) return;
      setMailConfig({
        email: savedMailConfig.email || '', password: savedMailConfig.password || '',
        imapHost: savedMailConfig.imap_host || savedMailConfig.imapHost || 'imap.hostinger.com',
        imapPort: savedMailConfig.imap_port || savedMailConfig.imapPort || '993',
        smtpHost: savedMailConfig.smtp_host || savedMailConfig.smtpHost || 'smtp.hostinger.com',
        smtpPort: savedMailConfig.smtp_port || savedMailConfig.smtpPort || '465',
      });
      if (!forceEmails && cachedEmailConversations.length && Date.now() - cacheMailboxLoadedAt < MAILBOX_CACHE_MS) return;

      setLoadingMailbox(true);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15_000);
      let response: Response;
      try { response = await fetch(`/api/emails${forceEmails ? '?refresh=1' : ''}`, { headers: getAuthHeaders(), signal: controller.signal }); }
      finally { window.clearTimeout(timeout); }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'No se pudo actualizar el correo');

      const conversationsBySender: Record<string, Conversation> = {};
      for (const email of result.emails || []) {
        const senderKey = String(email.fromEmail || 'sin-remitente').toLowerCase();
        const message: ChatMessage = { id: email.id, emailUid: Number(email.uid), sender: 'contact', text: 'Cargando contenido del correo…', timestamp: new Date(email.date), status: email.unread ? 'delivered' : 'read', bodyLoaded: false };
        const existing = conversationsBySender[senderKey];
        if (!existing) {
          conversationsBySender[senderKey] = {
            contactId: `email-${senderKey}`, contactName: email.fromName || senderKey, contactAvatar: '',
            contactInitials: getInitials(email.fromName || senderKey), contactColor: getColorForName(email.fromName || senderKey),
            lastMessage: email.subject, lastMessageTime: new Date(email.date), unreadCount: email.unread ? 1 : 0,
            isStarred: false, channel: 'email', isEmail: true, emailSubject: email.subject, messages: [message],
          };
        } else {
          if (email.unread) existing.unreadCount += 1;
          if (new Date(email.date) > existing.lastMessageTime) {
            existing.lastMessage = email.subject; existing.lastMessageTime = new Date(email.date); existing.emailSubject = email.subject; existing.messages = [message];
          }
        }
      }
      cacheMailboxLoadedAt = Date.now();
      setConversations((current) => [...current.filter((conversation) => !isMailboxConversation(conversation)), ...Object.values(conversationsBySender)]);
      setMailboxVersion((version) => version + 1);
    } catch (error) {
      console.error('[MessagingManager] Error actualizando bandeja:', error);
      if (!cacheConversations?.length) await loadContactsLegacy();
    } finally { setLoadingMailbox(false); }
  };

  const loadContactsLegacy = async () => {
    try {
      // Cargar credenciales de correo para verificar si está configurado
      let hasEmailConfig = false;
      let emailUser = '';
      let realEmails: any[] = [];
      let imapErrorMsg = '';

      try {
        const { data: mConfig } = await db.from('mail_config').select().eq('id', 'default_mail').maybeSingle();
        if (mConfig) {
          if (mConfig.email) {
            hasEmailConfig = true;
            emailUser = mConfig.email;
          }
          setMailConfig({
            email: mConfig.email || '',
            password: mConfig.password || '',
            imapHost: mConfig.imap_host || mConfig.imapHost || 'imap.hostinger.com',
            imapPort: mConfig.imap_port || mConfig.imapPort || '993',
            smtpHost: mConfig.smtp_host || mConfig.smtpHost || 'smtp.hostinger.com',
            smtpPort: mConfig.smtp_port || mConfig.smtpPort || '465'
          });
        }
      } catch (err) {
        console.warn('No se pudo verificar configuración de correo:', err);
      }

      if (hasEmailConfig) {
        try {
          const res = await fetch('/api/emails', {
            method: 'GET',
            headers: getAuthHeaders(),
          });
          const result = await res.json();
          if (res.ok && result.success) {
            realEmails = result.emails || [];
          } else {
            imapErrorMsg = result.message || 'Error al obtener correos';
            console.warn('[MessagingManager] Falló la obtención de correos:', imapErrorMsg);
          }
        } catch (err: any) {
          imapErrorMsg = err.message || 'Error de red';
          console.error('[MessagingManager] Error fetching real emails:', err);
        }
      }

      const { data, error } = await db.from('contacts').select('*').order('created_at', { ascending: false });
      if (error) { console.error('Error loading contacts:', error); return; }

      const contacts: Contact[] = (data || []).map((c: any) => ({
        id: String(c.id),
        name: c.name || 'Sin nombre',
        phone: c.phone || '',
        email: c.email || '',
        company: c.company || '',
        avatar: c.avatar || '',
        tags: safeParseTags(c.tags),
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
        lastMessage: 'Sin mensajes todavía',
        lastMessageTime: c.last_activity ? new Date(c.last_activity) : new Date(c.created_at || Date.now()),
        unreadCount: 0,
        isStarred: false,
        channel: c.phone ? 'whatsapp' : c.email ? 'email' : 'webchat',
        isEmail: !c.phone && !!c.email,
        messages: [],
      }));

      // Agregar conversaciones de email reales si el correo está configurado
      if (hasEmailConfig) {
        if (realEmails.length > 0) {
          // Group real emails by fromEmail
          const emailConvsMap: Record<string, Conversation> = {};

          for (const email of realEmails) {
            const senderKey = email.fromEmail.toLowerCase();
            
            const chatMsg: ChatMessage = {
              id: email.id,
              sender: 'contact',
              text: email.body || '(Mensaje de correo)',
              html: email.html || '',
              timestamp: new Date(email.date),
              status: email.unread ? 'delivered' : 'read',
            };

            if (!emailConvsMap[senderKey]) {
              emailConvsMap[senderKey] = {
                contactId: `email-${senderKey}`,
                contactName: email.fromName,
                contactAvatar: '',
                contactInitials: getInitials(email.fromName),
                contactColor: getColorForName(email.fromName),
                lastMessage: email.subject,
                lastMessageTime: new Date(email.date),
                unreadCount: email.unread ? 1 : 0,
                isStarred: false,
                channel: 'email',
                isEmail: true,
                emailSubject: email.subject,
                messages: [chatMsg]
              };
            } else {
              emailConvsMap[senderKey].messages.push(chatMsg);
              if (new Date(email.date) > emailConvsMap[senderKey].lastMessageTime) {
                emailConvsMap[senderKey].lastMessage = email.subject;
                emailConvsMap[senderKey].lastMessageTime = new Date(email.date);
                emailConvsMap[senderKey].emailSubject = email.subject;
              }
              if (email.unread) {
                emailConvsMap[senderKey].unreadCount += 1;
              }
            }
          }

          // Add to convs
          Object.values(emailConvsMap).forEach(c => {
            c.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            convs.push(c);
          });
        } else {
          // Si no hay correos reales pero está configurado, mostramos una conversación indicativa o vacía
          convs.push({
            contactId: 'email-empty',
            contactName: 'Bandeja de Correo',
            contactAvatar: '',
            contactInitials: 'BC',
            contactColor: 'bg-indigo-600',
            lastMessage: imapErrorMsg ? 'Error de conexión IMAP' : 'Sin correos en bandeja',
            lastMessageTime: new Date(),
            unreadCount: imapErrorMsg ? 1 : 0,
            isStarred: false,
            channel: 'email',
            isEmail: true,
            emailSubject: imapErrorMsg ? 'Error de conexión' : 'Bandeja vacía',
            messages: [
              {
                id: 'mail-empty-msg',
                sender: 'contact',
                text: imapErrorMsg 
                  ? `Error al conectar al servidor de correo: ${imapErrorMsg}. Por favor, verifica las credenciales y la configuración del servidor IMAP.` 
                  : `Se ha establecido la conexión con tu cuenta de correo ${emailUser}. Sin embargo, no hemos encontrado correos en tu bandeja de entrada INBOX.`,
                timestamp: new Date(),
                status: 'read',
              }
            ]
          });
        }
      }

      setConversations(convs);
      if (convs.length > 0) {
        setSelectedConvId(prevId => {
          const idToSelect = (prevId && convs.some(c => c.contactId === prevId)) ? prevId : convs[0].contactId;
          
          const matched = contacts.find(c => c.id === idToSelect);
          if (matched) {
            setSelectedContact(matched);
          } else {
            const foundConv = convs.find(c => c.contactId === idToSelect);
            if (foundConv) {
              setSelectedContact({
                id: foundConv.contactId,
                name: foundConv.contactName,
                email: foundConv.isEmail ? `${foundConv.contactName.toLowerCase().replace(/\s+/g, '.')}@gmail.com` : '',
                phone: foundConv.isEmail ? '' : '34343',
                tags: foundConv.isEmail ? ['Email', 'Cliente'] : []
              });
            }
          }
          return idToSelect;
        });
      }
    } catch (err) {
      console.error('Error loading contacts for messaging:', err);
      // Conserva la bandeja local si la fuente remota falla temporalmente.
      setConversations((current) => current);
    }
  };

  useEffect(() => {
    if (!isActive || !selectedConvId) return;
    const conversation = conversations.find((item) => item.contactId === selectedConvId);
    const message = conversation?.isEmail ? conversation.messages[conversation.messages.length - 1] : null;
    if (!message?.emailUid || message.bodyLoaded || message.bodyLoading) return;
    const controller = new AbortController();
    setConversations((current) => current.map((item) => item.contactId === selectedConvId ? { ...item, messages: item.messages.map((candidate) => candidate.id === message.id ? { ...candidate, bodyLoading: true } : candidate) } : item));
    fetch(`/api/emails/${message.emailUid}`, { headers: getAuthHeaders(), signal: controller.signal })
      .then(async (response) => ({ response, result: await response.json() }))
      .then(({ response, result }) => {
        if (!response.ok || !result.success) throw new Error(result.message || 'No se pudo abrir el correo');
        setConversations((current) => current.map((item) => item.contactId === selectedConvId ? { ...item, messages: item.messages.map((candidate) => candidate.id === message.id ? { ...candidate, text: result.email.body, html: result.email.html, bodyLoaded: true, bodyLoading: false } : candidate) } : item));
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setConversations((current) => current.map((item) => item.contactId === selectedConvId ? { ...item, messages: item.messages.map((candidate) => candidate.id === message.id ? { ...candidate, text: 'No se pudo cargar el contenido del correo.', bodyLoading: false } : candidate) } : item));
      });
    return () => controller.abort();
    // mailboxVersion notifica que llegaron nuevos encabezados sin depender de cada cambio en conversaciones.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, selectedConvId, mailboxVersion]);

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

  const handleSaveMailConfig = async () => {
    setSavingMailConfig(true);
    try {
      const payload = {
        id: 'default_mail',
        email: mailConfig.email,
        password: mailConfig.password,
        imap_host: mailConfig.imapHost,
        imap_port: mailConfig.imapPort,
        smtp_host: mailConfig.smtpHost,
        smtp_port: mailConfig.smtpPort,
        updated_at: new Date().toISOString()
      };

      const { error } = await db
        .from('mail_config')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        throw new Error(error.message || 'Error al guardar la configuración');
      }

      toast({ 
        title: "Configuración guardada", 
        description: "Los ajustes de correo han sido guardados exitosamente." 
      });

      // Dispatch custom event so that MailConfiguration page syncs its fields
      window.dispatchEvent(new CustomEvent('mailConfigUpdated'));

      setShowMailConfig(false);
      cacheMailboxLoadedAt = 0;
      await loadContacts(true);
    } catch (e: any) {
      console.error('Error al guardar configuración de correo:', e);
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: e.message || "No se pudo guardar la configuración de correo."
      });
    } finally {
      setSavingMailConfig(false);
    }
  };

  // ─── Send message ─────────────────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sendingMessage || !selectedConvId) return;

    const userText = inputText;
    setInputText('');

    if (selectedConv?.isEmail) {
      setSendingMessage(true);
      const userMsg: ChatMessage = {
        id: `email-sent-${Date.now()}`,
        sender: 'user',
        text: userText,
        timestamp: new Date(),
        status: 'sent',
      };

      setConversations(prev => prev.map(c =>
        c.contactId === selectedConvId
          ? { ...c, messages: [...c.messages, userMsg], lastMessage: `Enviado: ${userText}` }
          : c
      ));

      // Simular entrega SMTP
      setTimeout(() => {
        setConversations(prev => prev.map(c =>
          c.contactId === selectedConvId
            ? {
                ...c,
                messages: c.messages.map(m => m.id === userMsg.id ? { ...m, status: 'read' } : m)
              }
            : c
        ));

        // Responder automáticamente de parte del cliente de email tras 1.5s
        setTimeout(() => {
          const clientReply: ChatMessage = {
            id: `email-reply-${Date.now()}`,
            sender: 'contact',
            text: `¡Gracias por tu respuesta! He recibido el correo y lo estaré revisando a la brevedad.`,
            timestamp: new Date(),
            status: 'unread',
          };
          
          setConversations(prev => prev.map(c =>
            c.contactId === selectedConvId
              ? { ...c, messages: [...c.messages, clientReply], lastMessage: clientReply.text.substring(0, 40) + '...' }
              : c
          ));
        }, 1500);

        setSendingMessage(false);
      }, 1000);
      return;
    }

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
      const conversationChannel = getConversationChannel(selectedConv!);
      const { data: agentRows } = await db.from('ai_agents').select();
      const activeAgent = (agentRows || []).find((agent: any) => {
        const agentChannel = String(agent.type || '').includes('WhatsApp') ? 'whatsapp'
          : String(agent.type || '').includes('Correo') ? 'email'
          : 'webchat';
        return agent.owner_id === currentUserId && agent.status === 'active' && agentChannel === conversationChannel;
      });
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          message: userText,
          sender: selectedConv?.contactId || currentUserId,
          contactId: selectedConv?.contactId,
          channel: conversationChannel,
          agentId: activeAgent?.id || null,
        })
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
          agentId: activeAgent?.id,
        };

        setConversations(prev => prev.map(c =>
          c.contactId === selectedConvId
            ? { ...c, messages: [...c.messages, agentMsg], lastMessage: data.response.substring(0, 50) + '...' }
            : c
        ));

        await db.from('ai_agent_events').insert({
          id: `agent-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          owner_id: currentUserId,
          agent_id: activeAgent?.id || null,
          contact_id: selectedConv?.contactId || currentUserId,
          channel: conversationChannel,
          appointment: /\b(cita|turno|reuni[oó]n|agendad[ao]|reservad[ao])\b/i.test(`${userText} ${data.response || ''}`),
          created_at: new Date().toISOString(),
        });

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
    setConversations(prev => prev.map(c => {
      if (c.contactId === convId) {
        const nextStarred = !c.isStarred;
        toast({
          title: nextStarred ? "⭐ Conversación destacada" : "Conversación quitada de favoritos",
          description: c.contactName
        });
        return { ...c, isStarred: nextStarred };
      }
      return c;
    }));
  };

  const toggleMute = (convId: string) => {
    setConversations(prev => prev.map(c => {
      if (c.contactId === convId) {
        const nextMuted = !c.isMuted;
        toast({
          title: nextMuted ? "🔕 Notificaciones silenciadas" : "🔔 Notificaciones activadas",
          description: `Para ${c.contactName}`
        });
        return { ...c, isMuted: nextMuted };
      }
      return c;
    }));
  };

  const handleArchive = (convId: string) => {
    setConversations(prev => prev.map(c => {
      if (c.contactId === convId) {
        const nextArchived = !c.isArchived;
        toast({
          title: nextArchived ? "📦 Conversación archivada" : "Conversación restaurada a la bandeja",
          description: c.contactName
        });
        return { ...c, isArchived: nextArchived };
      }
      return c;
    }));
  };

  const handleDeleteConversation = (convId: string) => {
    const convToDelete = conversations.find(c => c.contactId === convId);
    setConversations(prev => prev.filter(c => c.contactId !== convId));
    if (selectedConvId === convId) {
      const remaining = conversations.filter(c => c.contactId !== convId);
      setSelectedConvId(remaining.length > 0 ? remaining[0].contactId : null);
    }
    setShowDeleteDialog(false);
    toast({
      title: "Conversación eliminada",
      description: `Se eliminaron los mensajes de ${convToDelete?.contactName || 'este contacto'}.`
    });
  };

  const startWebCall = () => {
    setCallStatus('calling');
    setCallSeconds(0);
    setTimeout(() => {
      setCallStatus('connected');
    }, 1800);
  };

  const endWebCall = () => {
    const finalSecs = callSeconds;
    setCallStatus('ended');
    const mins = Math.floor(finalSecs / 60);
    const secs = finalSecs % 60;
    const durationStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (selectedConvId && finalSecs > 0) {
      const callLogMsg: ChatMessage = {
        id: `call-log-${Date.now()}`,
        sender: 'user',
        text: `📞 Llamada de voz finalizada (duración: ${durationStr})`,
        timestamp: new Date(),
        status: 'read'
      };
      setConversations(prev => prev.map(c =>
        c.contactId === selectedConvId
          ? { ...c, messages: [...c.messages, callLogMsg], lastMessage: `📞 Llamada (${durationStr})`, lastMessageTime: new Date() }
          : c
      ));
    }

    setTimeout(() => {
      setShowCallDialog(false);
      setCallStatus('idle');
      setCallSeconds(0);
    }, 500);
  };

  const exportChatHistory = () => {
    if (!selectedConv) return;
    const lines = [
      `====================================================`,
      `HISTORIAL DE CONVERSACIÓN - MERCO BUSINESS SOFTWARE`,
      `Contacto: ${selectedConv.contactName}`,
      `ID Contacto: ${selectedConv.contactId}`,
      `Fecha de exportación: ${new Date().toLocaleString('es-ES')}`,
      `Total de mensajes: ${selectedConv.messages.length}`,
      `====================================================\n`
    ];

    selectedConv.messages.forEach((m) => {
      const time = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const sender = m.sender === 'user' ? 'Tú (Agente)' : m.sender === 'agent' ? 'Asistente IA' : selectedConv.contactName;
      lines.push(`[${time}] ${sender}:`);
      lines.push(`${m.text}\n`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat_${selectedConv.contactName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Historial exportado",
      description: `Se descargó la conversación de ${selectedConv.contactName}.`
    });
  };

  const getContactDnd = (contactId: string): DndSettings => {
    return dndMap[contactId] || {
      all: false,
      whatsapp: false,
      email: false,
      calls: false,
      sms: false,
      reason: 'Solicitud del cliente'
    };
  };

  const updateContactDnd = (contactId: string, updates: Partial<DndSettings>) => {
    setDndMap(prev => {
      const current = prev[contactId] || {
        all: false,
        whatsapp: false,
        email: false,
        calls: false,
        sms: false,
        reason: 'Solicitud del cliente'
      };
      const updated = { ...current, ...updates };
      const next = { ...prev, [contactId]: updated };
      try {
        localStorage.setItem('merco_crm_dnd_map', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    toast({
      title: "Configuración DND actualizada",
      description: "Preferencias de No Molestar guardadas para este contacto."
    });
  };

  const handleCreateOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oppTitle.trim()) return;
    const valueNum = parseFloat(oppValue) || 0;

    if (selectedConvId) {
      const oppLogMsg: ChatMessage = {
        id: `opp-log-${Date.now()}`,
        sender: 'user',
        text: `💼 *Oportunidad registrada*: "${oppTitle}" por $${valueNum.toLocaleString('es-AR')} [${oppStage}]`,
        timestamp: new Date(),
        status: 'read'
      };
      setConversations(prev => prev.map(c =>
        c.contactId === selectedConvId
          ? { ...c, messages: [...c.messages, oppLogMsg], lastMessage: `💼 Oportunidad: ${oppTitle}`, lastMessageTime: new Date() }
          : c
      ));
    }

    toast({
      title: "Oportunidad registrada",
      description: `"${oppTitle}" creada para ${selectedConv?.contactName || 'el contacto'}.`
    });
    setOppTitle('');
    setOppValue('');
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    if (selectedConvId) {
      const dateStr = taskDate ? new Date(taskDate).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Próximamente';
      const taskLogMsg: ChatMessage = {
        id: `task-log-${Date.now()}`,
        sender: 'user',
        text: `📅 *Cita / Tarea agendada*: "${taskTitle}" (${dateStr})`,
        timestamp: new Date(),
        status: 'read'
      };
      setConversations(prev => prev.map(c =>
        c.contactId === selectedConvId
          ? { ...c, messages: [...c.messages, taskLogMsg], lastMessage: `📅 Cita: ${taskTitle}`, lastMessageTime: new Date() }
          : c
      ));
    }

    toast({
      title: "Cita / Tarea agendada",
      description: `"${taskTitle}" ha sido registrada.`
    });
    setTaskTitle('');
    setTaskDate('');
  };

  const handleSaveNotes = (contactId: string, notes: string) => {
    setContactNotes(prev => {
      const next = { ...prev, [contactId]: notes };
      try {
        localStorage.setItem('merco_crm_notes_map', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    toast({
      title: "Notas guardadas",
      description: "Las notas del contacto se han actualizado correctamente."
    });
  };

  const handleUseTemplate = (text: string) => {
    setInputText(text);
    toast({
      title: "Plantilla cargada",
      description: "Texto insertado en el chat listo para enviar."
    });
  };

  // ─── Derived state ──────────────────────────────────────────────────────────
  const selectedConv = conversations.find(c => c.contactId === selectedConvId);

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === 'archived') return !!c.isArchived;
    if (c.isArchived) return false;
    if (activeFilter === 'unread') return c.unreadCount > 0;
    if (activeFilter === 'starred') return c.isStarred;
    return true;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  // ─── Loading state ──────────────────────────────────────────────────────────
  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-[calc(100vh-64px)] flex rounded-xl overflow-hidden border border-slate-200 bg-white shadow-lg">
      
      {/* ═══════════════════════ LEFT PANEL: Conversations List ═══════════════════════ */}
      <div className={cn(
        "w-[320px] min-w-[280px] flex flex-col border-r border-slate-200 bg-white shrink-0",
        isMobile ? (activeMobileView === 'list' ? 'w-full flex' : 'hidden') : ''
      )}>
        {/* Header */}
        <div className="px-4 pt-4 pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              Bandeja del Equipo
              <Filter className="h-3.5 w-3.5 text-slate-400 cursor-pointer hover:text-slate-600" />
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 cursor-pointer hover:text-slate-600" />
            </h2>
            <div className="flex items-center gap-1">
              {/* Botón Favoritos arriba */}
              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === 'starred' ? 'all' : 'starred')}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  activeFilter === 'starred'
                    ? "text-amber-500 bg-amber-50 ring-1 ring-amber-200"
                    : "text-slate-400 hover:text-amber-500 hover:bg-slate-50"
                )}
                title={activeFilter === 'starred' ? "Ver todas" : "Ver favoritos"}
              >
                <Star className={cn("h-4 w-4", activeFilter === 'starred' && "fill-amber-400 text-amber-500")} />
              </button>

              {/* Botón Archivados arriba */}
              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === 'archived' ? 'all' : 'archived')}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  activeFilter === 'archived'
                    ? "text-blue-600 bg-blue-50 ring-1 ring-blue-200"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
                title={activeFilter === 'archived' ? "Ver activas" : "Ver archivados"}
              >
                <Archive className="h-4 w-4" />
              </button>

              {(loadingConfig || loadingMailbox) && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {loadingMailbox ? 'Actualizando correo' : 'Configurando'}
                </span>
              )}
              <button
                onClick={() => setShowMailConfig(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Configuración de Correo Electrónico"
              >
                <Mail className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter tabs - Sin leer, Todos, Recientes tal como estaban originalmente */}
          <div className="flex items-center gap-1.5 mb-3">
            {[
              { key: 'unread' as const, label: 'Sin leer', count: totalUnread },
              { key: 'all' as const, label: 'Todos' },
              { key: 'recents' as const, label: 'Recientes' },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
                  activeFilter === filter.key
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
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
                    email: conv.isEmail ? `${conv.contactName.toLowerCase().replace(/\s+/g, '.')}@gmail.com` : '',
                    tags: conv.isEmail ? ['Email'] : [],
                  };
                  setSelectedContact(matchedContact);
                  if (isMobile) {
                    setActiveMobileView('chat');
                  }
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
                  <span className="absolute -bottom-0.5 -right-0.5 rounded-full ring-1 ring-white">
                    <ConversationChannelBadge channel={getConversationChannel(conv)} compact />
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-sm font-semibold text-slate-800 truncate">{conv.contactName}</h4>
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
      <div className={cn(
        "flex-1 flex flex-col min-w-0 bg-slate-50",
        isMobile ? (activeMobileView === 'chat' ? 'w-full flex' : 'hidden') : ''
      )}>
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-slate-200 px-3 md:px-5 py-3 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-2 md:gap-3">
                {isMobile && (
                  <button
                    onClick={() => setActiveMobileView('list')}
                    className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors mr-1"
                    type="button"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                )}
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
                    <ConversationChannelBadge channel={getConversationChannel(selectedConv)} />
                    {!selectedConv.isEmail && (geminiKey ? (
                      <Badge className="bg-emerald-50 text-emerald-700 text-[9px] py-0 px-1.5 border border-emerald-200 font-bold">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" /> IA Activa
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 text-[9px] py-0 px-1.5 border border-amber-200 font-bold">
                        Modo Reglas
                      </Badge>
                    ))}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedConv.isEmail
                      ? `Asunto: ${selectedConv.emailSubject || 'Sin asunto'}`
                      : getConversationChannel(selectedConv) === 'whatsapp' ? 'Conversación de WhatsApp' : 'Conversación de chat web'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* 1. Silenciar / Activar notificaciones */}
                <button
                  onClick={() => toggleMute(selectedConv.contactId)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    selectedConv.isMuted
                      ? "text-amber-500 bg-amber-50 hover:bg-amber-100 ring-1 ring-amber-200"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  )}
                  title={selectedConv.isMuted ? "Notificaciones silenciadas (clic para activar)" : "Silenciar notificaciones"}
                  type="button"
                >
                  {selectedConv.isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </button>

                {/* 2. Llamada / Marcador directo */}
                <button
                  onClick={() => setShowCallDialog(true)}
                  className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  title="Llamar o iniciar llamada VoIP"
                  type="button"
                >
                  <Phone className="h-4 w-4" />
                </button>

                {/* 3. Favorito / Destacar */}
                <button
                  onClick={() => toggleStar(selectedConv.contactId)}
                  className="p-2 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                  title={selectedConv.isStarred ? "Quitar de favoritos" : "Marcar como favorito"}
                  type="button"
                >
                  <Star className={cn("h-4 w-4", selectedConv.isStarred && "fill-amber-400 text-amber-400")} />
                </button>

                {/* 4. Archivar / Desarchivar */}
                <button
                  onClick={() => handleArchive(selectedConv.contactId)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    selectedConv.isArchived
                      ? "text-blue-600 bg-blue-50 hover:bg-blue-100 ring-1 ring-blue-200"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  )}
                  title={selectedConv.isArchived ? "Desarchivar conversación" : "Archivar conversación"}
                  type="button"
                >
                  <Archive className="h-4 w-4" />
                </button>

                {/* 5. Eliminar conversación */}
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Eliminar conversación"
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="w-px h-5 bg-slate-200 mx-1" />
                
                {/* 6. Ajustes de la conversación */}
                <button
                  onClick={() => setShowChatSettingsDialog(true)}
                  className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Opciones y ajustes de la conversación"
                  type="button"
                >
                  <Settings className="h-4 w-4" />
                </button>

                {/* 7. Detalles del contacto (alternar panel derecho) */}
                <button
                  onClick={() => {
                    if (isMobile) {
                      setActiveMobileView('details');
                    } else {
                      setShowContactDetails(!showContactDetails);
                    }
                  }}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    ((!isMobile && showContactDetails) || (isMobile && activeMobileView === 'details'))
                      ? "text-blue-600 bg-blue-50 ring-1 ring-blue-200"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  )}
                  title="Detalles del contacto"
                  type="button"
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
                      selectedConv.isEmail && msg.sender !== 'user'
                        ? 'w-full max-w-[95%] bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-100 p-4 shadow-sm relative leading-relaxed'
                        : msg.sender === 'user'
                          ? 'max-w-[70%] bg-emerald-100 text-slate-800 rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13px] shadow-sm relative leading-relaxed'
                          : 'max-w-[70%] bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-100 px-4 py-2.5 text-[13px] shadow-sm relative leading-relaxed'
                    )}>
                      {/* Message text / HTML iframe */}
                      {selectedConv.isEmail && msg.sender !== 'user' && msg.html ? (
                        <div className="w-full flex flex-col gap-2">
                          <iframe
                            srcDoc={msg.html}
                            title={`Email-${msg.id}`}
                            className="w-full border-0 rounded-lg bg-white min-h-[300px] shadow-inner"
                            sandbox="allow-popups allow-popups-to-escape-sandbox"
                            onLoad={(e) => {
                              const iframe = e.currentTarget;
                              try {
                                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                                if (doc && doc.documentElement) {
                                  const height = doc.documentElement.scrollHeight || doc.body.scrollHeight;
                                  iframe.style.height = `${height + 30}px`;
                                }
                              } catch (err) {
                                console.warn('Cannot auto-resize iframe:', err);
                              }
                            }}
                            style={{ width: '100%' }}
                          />
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                      )}
                      
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
            {selectedConv.isEmail ? (
              <div className="bg-blue-50 border-t border-blue-100 px-4 py-2.5 flex items-center justify-between text-xs text-blue-800 shrink-0 font-medium animate-in slide-in-from-bottom-2">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-500" />
                  Bandeja de Entrada de Correo IMAP/SMTP Conectada
                </span>
                <Badge className="bg-blue-100 text-blue-800 text-[10px] py-0.5 px-2 border-none font-bold">
                  En línea
                </Badge>
              </div>
            ) : (
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
            )}
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
      {((!isMobile && showContactDetails) || (isMobile && activeMobileView === 'details')) && selectedConv && (
        <div className={cn(
          "w-[300px] min-w-[260px] border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto",
          isMobile ? "w-full" : ""
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            {isMobile && (
              <button
                onClick={() => setActiveMobileView('chat')}
                className="p-1 mr-2 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                type="button"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <h3 className="text-sm font-bold text-slate-700 flex-1">Detalles del Contacto</h3>
            <button
              onClick={() => {
                if (isMobile) {
                  setActiveMobileView('chat');
                } else {
                  setShowContactDetails(false);
                }
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              type="button"
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
              {safeParseTags(selectedContact?.tags).length > 0 ? (
                safeParseTags(selectedContact?.tags).map((tag, i) => (
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
            {/* DND status badge if active */}
            {selectedContact && (
              getContactDnd(selectedContact.id).all ||
              getContactDnd(selectedContact.id).whatsapp ||
              getContactDnd(selectedContact.id).email ||
              getContactDnd(selectedContact.id).calls ||
              getContactDnd(selectedContact.id).sms
            ) && (
              <div className="mt-2">
                <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] py-0.5 px-2 font-bold flex items-center gap-1">
                  <BellOff className="h-3 w-3 text-rose-600" /> DND Activo
                </Badge>
              </div>
            )}
          </div>

          {/* Info Tabs */}
          <div className="border-b border-slate-100">
            <div className="flex px-2">
              {[
                { id: 'campos' as const, label: 'Campos' },
                { id: 'dnd' as const, label: 'DND' },
                { id: 'acciones' as const, label: 'Acciones' },
              ].map((tab) => {
                const isDndActive = tab.id === 'dnd' && selectedContact && (
                  getContactDnd(selectedContact.id).all ||
                  getContactDnd(selectedContact.id).whatsapp ||
                  getContactDnd(selectedContact.id).email ||
                  getContactDnd(selectedContact.id).calls ||
                  getContactDnd(selectedContact.id).sms
                );
                return (
                  <button
                    key={tab.id}
                    onClick={() => setRightPanelTab(tab.id)}
                    className={cn(
                      "flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-1.5",
                      rightPanelTab === tab.id
                        ? "text-blue-600 border-blue-500"
                        : "text-slate-400 border-transparent hover:text-slate-600"
                    )}
                    type="button"
                  >
                    {tab.label}
                    {isDndActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab 1: CAMPOS */}
          {rightPanelTab === 'campos' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
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
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-600 truncate">{selectedContact?.phone || 'No registrado'}</span>
                      </div>
                      {selectedContact?.phone && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedContact.phone || '');
                            toast({ title: "Teléfono copiado" });
                          }}
                          className="text-[10px] text-blue-600 hover:underline shrink-0"
                        >
                          Copiar
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-600 truncate">{selectedContact?.email || 'No registrado'}</span>
                      </div>
                      {selectedContact?.email && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedContact.email || '');
                            toast({ title: "Correo copiado" });
                          }}
                          className="text-[10px] text-blue-600 hover:underline shrink-0"
                        >
                          Copiar
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-600 truncate">{selectedContact?.company || 'No registrada'}</span>
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

                {/* Quick Notes Section */}
                <details className="group" open>
                  <summary className="flex items-center justify-between py-2 cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900">
                    <span>Notas del Contacto</span>
                    <ChevronDown className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="pb-3 space-y-2">
                    <textarea
                      placeholder="Escribe notas sobre este cliente (preferencias, presupuesto, acuerdos)..."
                      value={selectedContact ? (contactNotes[selectedContact.id] || '') : ''}
                      onChange={(e) => {
                        if (selectedContact) {
                          const val = e.target.value;
                          setContactNotes(prev => ({ ...prev, [selectedContact.id]: val }));
                        }
                      }}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none h-20"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (selectedContact) {
                          handleSaveNotes(selectedContact.id, contactNotes[selectedContact.id] || '');
                        }
                      }}
                      className="w-full h-7 text-xs bg-slate-800 hover:bg-slate-900 text-white font-medium"
                    >
                      Guardar Notas
                    </Button>
                  </div>
                </details>

                <Separator className="bg-slate-100" />

                {/* Created by */}
                <div className="pt-2 text-center">
                  <p className="text-[10px] text-slate-400 font-medium">
                    Canal origen: <span className="text-blue-500 font-semibold">{selectedConv?.isEmail ? 'Correo' : 'WhatsApp'}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: DND (Do Not Disturb) */}
          {rightPanelTab === 'dnd' && selectedContact && (() => {
            const dnd = getContactDnd(selectedContact.id);
            return (
              <div className="flex-1 px-4 py-3 space-y-4 overflow-y-auto">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 leading-relaxed">
                      <p className="font-bold">Control de No Molestar (DND)</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Impide que las automatizaciones y campañas contacten a este cliente por los canales seleccionados.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Master Switch */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <Label className="text-xs font-bold text-slate-800">DND en todos los canales</Label>
                    <p className="text-[10px] text-slate-500">Bloquear toda comunicación automática</p>
                  </div>
                  <Switch
                    checked={dnd.all}
                    onCheckedChange={(checked) => {
                      updateContactDnd(selectedContact.id, {
                        all: checked,
                        whatsapp: checked,
                        email: checked,
                        calls: checked,
                        sms: checked
                      });
                    }}
                  />
                </div>

                {/* Individual Channels */}
                <div className="space-y-2.5 pt-1">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Canales Específicos
                  </Label>

                  {/* WhatsApp */}
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                      <div>
                        <span className="text-xs font-medium text-slate-700">WhatsApp</span>
                        <p className="text-[10px] text-slate-400">Bots y respuestas automáticas</p>
                      </div>
                    </div>
                    <Switch
                      checked={dnd.whatsapp || dnd.all}
                      disabled={dnd.all}
                      onCheckedChange={(checked) => updateContactDnd(selectedContact.id, { whatsapp: checked })}
                    />
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-blue-600" />
                      <div>
                        <span className="text-xs font-medium text-slate-700">Correo Electrónico</span>
                        <p className="text-[10px] text-slate-400">Campañas y secuencias por email</p>
                      </div>
                    </div>
                    <Switch
                      checked={dnd.email || dnd.all}
                      disabled={dnd.all}
                      onCheckedChange={(checked) => updateContactDnd(selectedContact.id, { email: checked })}
                    />
                  </div>

                  {/* Llamadas */}
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-indigo-600" />
                      <div>
                        <span className="text-xs font-medium text-slate-700">Llamadas telefónicas</span>
                        <p className="text-[10px] text-slate-400">Llamadas y recordatorios por voz</p>
                      </div>
                    </div>
                    <Switch
                      checked={dnd.calls || dnd.all}
                      disabled={dnd.all}
                      onCheckedChange={(checked) => updateContactDnd(selectedContact.id, { calls: checked })}
                    />
                  </div>

                  {/* SMS */}
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-3.5 w-3.5 text-purple-600" />
                      <div>
                        <span className="text-xs font-medium text-slate-700">Mensajes SMS</span>
                        <p className="text-[10px] text-slate-400">Notificaciones SMS automáticas</p>
                      </div>
                    </div>
                    <Switch
                      checked={dnd.sms || dnd.all}
                      disabled={dnd.all}
                      onCheckedChange={(checked) => updateContactDnd(selectedContact.id, { sms: checked })}
                    />
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-semibold text-slate-700">Motivo del DND</Label>
                  <select
                    value={dnd.reason}
                    onChange={(e) => updateContactDnd(selectedContact.id, { reason: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Solicitud del cliente">Solicitado por el cliente</option>
                    <option value="Demasiados mensajes">Demasiados mensajes recibidos</option>
                    <option value="Número incorrecto">Número no pertenece al titular</option>
                    <option value="Opt-out comercial">Desuscripción de promociones</option>
                  </select>
                </div>
              </div>
            );
          })()}

          {/* Tab 3: ACCIONES */}
          {rightPanelTab === 'acciones' && (
            <div className="flex-1 px-4 py-3 space-y-4 overflow-y-auto">
              {/* 1. Registrar Oportunidad */}
              <details className="group bg-slate-50 border border-slate-200 rounded-lg p-3" open>
                <summary className="flex items-center justify-between cursor-pointer text-xs font-bold text-slate-800 hover:text-blue-600">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    Registrar Oportunidad (Pipeline)
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <form onSubmit={handleCreateOpportunity} className="space-y-2.5 mt-3 pt-2 border-t border-slate-200">
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-600">Título del Trato</Label>
                    <Input
                      placeholder="Ej: Pedido mayorista / Plan Pro"
                      value={oppTitle}
                      onChange={(e) => setOppTitle(e.target.value)}
                      className="h-7 text-xs bg-white mt-1"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] font-semibold text-slate-600">Monto ($)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={oppValue}
                        onChange={(e) => setOppValue(e.target.value)}
                        className="h-7 text-xs bg-white mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold text-slate-600">Etapa</Label>
                      <select
                        value={oppStage}
                        onChange={(e) => setOppStage(e.target.value)}
                        className="w-full h-7 text-xs bg-white border border-slate-200 rounded-md px-1.5 mt-1"
                      >
                        <option value="Nuevo">Nuevo</option>
                        <option value="Calificado">Calificado</option>
                        <option value="Propuesta">Propuesta</option>
                        <option value="Ganado">Cerrado Ganado</option>
                      </select>
                    </div>
                  </div>
                  <Button type="submit" size="sm" className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                    <Plus className="h-3 w-3 mr-1" /> Registrar Oportunidad
                  </Button>
                </form>
              </details>

              {/* 2. Agendar Cita o Tarea */}
              <details className="group bg-slate-50 border border-slate-200 rounded-lg p-3">
                <summary className="flex items-center justify-between cursor-pointer text-xs font-bold text-slate-800 hover:text-blue-600">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Agendar Cita o Tarea
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <form onSubmit={handleCreateTask} className="space-y-2.5 mt-3 pt-2 border-t border-slate-200">
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-600">Motivo / Asunto</Label>
                    <Input
                      placeholder="Ej: Llamada de cierre de venta"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="h-7 text-xs bg-white mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-600">Fecha y Hora</Label>
                    <Input
                      type="datetime-local"
                      value={taskDate}
                      onChange={(e) => setTaskDate(e.target.value)}
                      className="h-7 text-xs bg-white mt-1"
                      required
                    />
                  </div>
                  <Button type="submit" size="sm" className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium">
                    <Calendar className="h-3 w-3 mr-1" /> Agendar Recordatorio
                  </Button>
                </form>
              </details>

              {/* 3. Plantillas Rápidas */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  Plantillas Rápidas (1 Clic)
                </Label>
                <div className="space-y-1.5">
                  {[
                    {
                      title: "👋 Saludo de Bienvenida",
                      text: "¡Hola! Gracias por comunicarte con MERCO. ¿En qué podemos ayudarte hoy?"
                    },
                    {
                      title: "📋 Seguimiento Comercial",
                      text: "Hola, te escribo para consultar si tuviste oportunidad de revisar la propuesta que te compartimos."
                    },
                    {
                      title: "💳 Datos de Transferencia",
                      text: "Nuestros datos de cuenta bancaria son: Alias: MERCO.PAGOS - CBU: 0000003100098765432109 - Titular: MERCO SRL"
                    },
                    {
                      title: "🚚 Confirmación de Pedido",
                      text: "¡Tu pedido ha sido confirmado con éxito! Ya se encuentra en el sector de empaque y despacho."
                    }
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleUseTemplate(tpl.text)}
                      className="w-full text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-xs group shadow-xs"
                    >
                      <p className="font-semibold text-slate-700 group-hover:text-blue-600">{tpl.title}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{tpl.text}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Exportar Historial */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <Button
                  type="button"
                  onClick={exportChatHistory}
                  variant="outline"
                  className="w-full h-8 text-xs font-medium text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  Descargar historial (.txt)
                </Button>
              </div>
            </div>
          )}
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
                onChange={(e) => {
                  const val = e.target.value;
                  const updates: any = { email: val };
                  const domain = val.trim().split('@')[1]?.toLowerCase();
                  if (domain === 'gmail.com') {
                    updates.imapHost = 'imap.gmail.com';
                    updates.smtpHost = 'smtp.gmail.com';
                  } else if (domain === 'outlook.com' || domain === 'hotmail.com') {
                    updates.imapHost = 'outlook.office365.com';
                    updates.imapPort = '993';
                    updates.smtpHost = 'smtp.office365.com';
                    updates.smtpPort = '587';
                  }
                  setMailConfig(prev => ({ ...prev, ...updates }));
                }}
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
            <Button variant="outline" disabled={savingMailConfig} onClick={() => setShowMailConfig(false)}>Cancelar</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={savingMailConfig}
              onClick={handleSaveMailConfig}
            >
              {savingMailConfig ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Modal de Llamada Telefónica / VoIP ─── */}
      <Dialog open={showCallDialog} onOpenChange={(open) => {
        if (!open && callStatus === 'connected') endWebCall();
        else setShowCallDialog(open);
      }}>
        <DialogContent className="sm:max-w-[420px] text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-base">
              <Phone className="h-5 w-5 text-emerald-600" />
              Llamada con {selectedConv?.contactName || 'Contacto'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Conéctate por teléfono directo, WhatsApp o llamada web integrada.
            </DialogDescription>
          </DialogHeader>

          <div className="py-5 flex flex-col items-center justify-center space-y-4">
            {/* Avatar with calling pulse */}
            <div className="relative">
              {callStatus === 'calling' && (
                <div className="absolute -inset-2 rounded-full bg-emerald-400/30 animate-ping" />
              )}
              {selectedConv?.contactAvatar ? (
                <img src={selectedConv.contactAvatar} className="w-20 h-20 rounded-full object-cover ring-4 ring-emerald-100 shadow-md relative z-10" />
              ) : (
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold ring-4 ring-emerald-100 shadow-md relative z-10",
                  selectedConv?.contactColor || 'bg-emerald-600'
                )}>
                  {selectedConv?.contactInitials || 'C'}
                </div>
              )}
            </div>

            <div className="text-center">
              <h4 className="text-base font-bold text-slate-800">{selectedConv?.contactName}</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedContact?.phone || 'Sin número registrado'}
              </p>

              {/* Call Status / Timer */}
              <div className="mt-2">
                {callStatus === 'idle' && (
                  <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
                    Listo para llamar
                  </Badge>
                )}
                {callStatus === 'calling' && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs animate-pulse">
                    Llamando...
                  </Badge>
                )}
                {callStatus === 'connected' && (
                  <div className="flex flex-col items-center gap-1">
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-mono">
                      ● Conectado: {Math.floor(callSeconds / 60).toString().padStart(2, '0')}:{(callSeconds % 60).toString().padStart(2, '0')}
                    </Badge>
                    {callIsMuted && <span className="text-[10px] text-rose-500 font-semibold">Micrófono silenciado</span>}
                  </div>
                )}
                {callStatus === 'ended' && (
                  <Badge className="bg-slate-100 text-slate-600 text-xs">
                    Llamada finalizada
                  </Badge>
                )}
              </div>
            </div>

            {/* Direct External Action Buttons */}
            {callStatus === 'idle' && (
              <div className="w-full grid grid-cols-2 gap-2 pt-2">
                <a
                  href={selectedContact?.phone ? `tel:${selectedContact.phone}` : '#'}
                  onClick={(e) => {
                    if (!selectedContact?.phone) {
                      e.preventDefault();
                      toast({ title: "Sin número", description: "Este contacto no tiene teléfono registrado." });
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <Phone className="h-4 w-4 text-blue-600" />
                  Llamada Celular
                </a>
                <a
                  href={selectedContact?.phone ? `https://wa.me/${selectedContact.phone.replace(/\D/g, '')}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!selectedContact?.phone) {
                      e.preventDefault();
                      toast({ title: "Sin número", description: "Este contacto no tiene teléfono registrado." });
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold text-emerald-700 transition-colors"
                >
                  <Smartphone className="h-4 w-4 text-emerald-600" />
                  Vía WhatsApp
                </a>
              </div>
            )}

            {/* Web VoIP Call Controls */}
            <div className="w-full pt-3 border-t border-slate-100 flex items-center justify-center gap-3">
              {callStatus === 'idle' ? (
                <Button
                  onClick={startWebCall}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2"
                >
                  <PhoneCall className="h-4 w-4" /> Iniciar Llamada Web VoIP
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCallIsMuted(!callIsMuted)}
                    className={cn("rounded-full w-10 h-10", callIsMuted ? "bg-rose-50 text-rose-600 border-rose-200" : "")}
                    title={callIsMuted ? "Activar micrófono" : "Silenciar micrófono"}
                  >
                    {callIsMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    onClick={endWebCall}
                    className="rounded-full px-6 bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2"
                  >
                    <PhoneOff className="h-4 w-4" /> Colgar
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Modal de Confirmación para Eliminar Conversación ─── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 text-base">
              <Trash2 className="h-5 w-5" />
              Eliminar conversación
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2 space-y-2">
              <p>
                ¿Estás seguro de que deseas eliminar la conversación con <strong className="text-slate-800">{selectedConv?.contactName}</strong>?
              </p>
              <p className="text-slate-500 text-[11px]">
                Esta acción vaciará el historial de mensajes de este chat. El contacto permanecerá en tu lista general.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (selectedConv) handleDeleteConversation(selectedConv.contactId);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Eliminar Definitivamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Modal de Ajustes de la Conversación ─── */}
      <Dialog open={showChatSettingsDialog} onOpenChange={setShowChatSettingsDialog}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 text-base">
              <Settings className="h-5 w-5 text-blue-600" />
              Ajustes de Conversación
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configuración específica para el chat con {selectedConv?.contactName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Notificaciones */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <p className="font-semibold text-slate-800">Silenciar notificaciones</p>
                <p className="text-[11px] text-slate-500">No recibir alertas sonoras de este chat</p>
              </div>
              <Switch
                checked={!!selectedConv?.isMuted}
                onCheckedChange={() => {
                  if (selectedConv) toggleMute(selectedConv.contactId);
                }}
              />
            </div>

            {/* Archivar */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <p className="font-semibold text-slate-800">Archivar conversación</p>
                <p className="text-[11px] text-slate-500">Mover a la pestaña de archivados</p>
              </div>
              <Switch
                checked={!!selectedConv?.isArchived}
                onCheckedChange={() => {
                  if (selectedConv) handleArchive(selectedConv.contactId);
                }}
              />
            </div>

            {/* Exportar */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div>
                <p className="font-semibold text-slate-800">Copia de seguridad del chat</p>
                <p className="text-[11px] text-slate-500">Descarga una copia completa de los mensajes en texto plano</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={exportChatHistory}
                className="w-full text-xs font-medium border-slate-300 flex items-center justify-center gap-2"
              >
                <Download className="h-3.5 w-3.5" /> Descargar Transcripción (.txt)
              </Button>
            </div>

            {/* Acceso a Configuración de WhatsApp / IA */}
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[11px] text-slate-500">¿Quieres modificar la clave de IA o el Webhook?</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowChatSettingsDialog(false);
                  onNavigateToConfig?.();
                }}
                className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold"
              >
                Ir a Ajustes Globales &rarr;
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
