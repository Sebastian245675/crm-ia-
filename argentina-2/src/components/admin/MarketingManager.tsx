import React, { useState, useEffect, useRef } from 'react';
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
  ArrowLeft,
  Video,
  Share2,
  UploadCloud,
  Smartphone,
  Heart,
  MessageCircle
} from 'lucide-react';
import { MediaLibrary } from './MediaLibrary';
import { SocialPlanner } from './SocialPlanner';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveAgencyId, isCampaignForAgency, isContactForAgency } from '@/lib/agency-isolation';

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
  agency_id?: string;
}

interface TikTokPost {
  id: string;
  caption: string;
  videoUrl: string;
  status: 'borrador' | 'programada' | 'publicada';
  scheduledDate?: string;
  scheduledTime?: string;
  publishedAt?: string;
  created_at: string;
}

export const MarketingManager: React.FC = () => {
  const { user } = useAuth();
  const activeAgencyId = React.useMemo(() => getActiveAgencyId(user), [user]);

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
  const [isCampaignMediaPickerOpen, setIsCampaignMediaPickerOpen] = useState(false);
  const campaignBodyRef = useRef<HTMLTextAreaElement>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const [activeSubTab, setActiveSubTab] = useState<'social' | 'campaigns' | 'media' | 'tiktok'>('social');

  // Estados para la Integración de TikTok
  const [tiktokPosts, setTiktokPosts] = useState<TikTokPost[]>([]);
  const [loadingTiktok, setLoadingTiktok] = useState(false);
  const [isTikTokEditorOpen, setIsTikTokEditorOpen] = useState(false);
  const [selectedTikTokPost, setSelectedTikTokPost] = useState<TikTokPost | null>(null);
  
  // Conectividad TikTok
  const [isTikTokConnected, setIsTikTokConnected] = useState(() => {
    return localStorage.getItem('tiktok_connected') === 'true' && Boolean(localStorage.getItem('tiktok_access_token'));
  });
  const publishingTikTokIds = useRef(new Set<string>());
  const [tiktokProfile, setTiktokProfile] = useState(() => {
    try {
      const stored = localStorage.getItem('tiktok_profile');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { username: '', followers: '0', likes: '0', views: '0' };
  });
  const [showTikTokAuthDialog, setShowTikTokAuthDialog] = useState(false);
  const [isConnectingTikTok, setIsConnectingTikTok] = useState(false);

  // Metodos de conexion y configuracion real
  const [connectionMethod, setConnectionMethod] = useState<'manual' | 'api'>('manual');
  const [clientKey, setClientKey] = useState(() => localStorage.getItem('tiktok_client_key') || '');
  const [clientSecret, setClientSecret] = useState(() => localStorage.getItem('tiktok_client_secret') || '');
  const [redirectUri, setRedirectUri] = useState(() => localStorage.getItem('tiktok_redirect_uri') || (window.location.origin + '/admin/marketing'));
  const [showManualPostDialog, setShowManualPostDialog] = useState(false);
  const [manualPostDetails, setManualPostDetails] = useState<TikTokPost | null>(null);

  // Estados de entrada para el modal de autorización
  const [authUsername, setAuthUsername] = useState('@');
  const [authFollowers, setAuthFollowers] = useState('12492');
  const [authLikes, setAuthLikes] = useState('452000');
  
  // Formulario TikTok
  const [tiktokCaption, setTiktokCaption] = useState('');
  const [tiktokVideoUrl, setTiktokVideoUrl] = useState('https://assets.mixkit.co/videos/preview/mixkit-delivery-man-with-a-scooter-driving-down-the-street-34208-large.mp4');
  const [tiktokDate, setTiktokDate] = useState('');
  const [tiktokTime, setTiktokTime] = useState('');

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
        // Filtrar por agencia activa y ordenar por fecha desc
        const sorted = (data || [])
          .filter((c: any) => isCampaignForAgency(c, activeAgencyId))
          .sort((a: any, b: any) =>
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
        const { data, error } = await db.from('contacts').select('id, name, email, phone, tags, company, agency_id, owner_id');
        if (error) throw error;
        const filteredContacts = (data || []).filter((c: any) => isContactForAgency(c, activeAgencyId));
        setContacts(filteredContacts);
      }
    } catch (e: any) {
      console.error('Error loading contacts in MarketingManager:', e);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchContacts();

    // Check for TikTok OAuth callback code redirect
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code && state === 'tiktok') {
      const storedClientKey = localStorage.getItem('tiktok_client_key') || '';
      const storedClientSecret = localStorage.getItem('tiktok_client_secret') || '';
      const storedRedirectUri = localStorage.getItem('tiktok_redirect_uri') || (window.location.origin + '/admin/marketing');
      
      const exchangeToken = async () => {
        setLoadingTiktok(true);
        try {
          const response = await fetch('/api/tiktok/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              client_key: storedClientKey,
              client_secret: storedClientSecret,
              redirect_uri: storedRedirectUri,
            }),
          });
          const result = await response.json();
          if (result.success) {
            const data = result.data;
            const accessToken = data.access_token;
            localStorage.setItem('tiktok_access_token', accessToken);
            localStorage.setItem('tiktok_connected', 'true');
            
            // Try to fetch profile details from TikTok
            const profileRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username', {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });
            const profileData = await profileRes.json();
            
            let username = '@mi_canal_tiktok';
            if (profileData.data?.user) {
              username = `@${profileData.data.user.username || profileData.data.user.display_name}`;
            }

            const profile = {
              username,
              followers: 'API Activa',
              likes: 'Conectado',
              views: 'Sincronizado',
            };

            localStorage.setItem('tiktok_profile', JSON.stringify(profile));
            setTiktokProfile(profile);
            setIsTikTokConnected(true);
            toast({
              title: "⚡ Conectado por API",
              description: `Se vinculó la cuenta ${username} de forma real.`,
            });
          } else {
            toast({
              title: "Error de Vinculación Real",
              description: result.message || "Fallo en el intercambio de token con TikTok.",
              variant: "destructive",
            });
          }
        } catch (e: any) {
          toast({
            title: "Error de Red",
            description: e.message || "Error al comunicarse con el servidor local.",
            variant: "destructive",
          });
        } finally {
          setLoadingTiktok(false);
          // Limpiar parámetros de la URL sin recargar la página
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          window.history.replaceState({}, document.title, url.toString());
        }
      };

      exchangeToken();
    }
  }, []);

  // --- INTEGRACIÓN Y LÓGICA DE TIKTOK ---

  const fetchTikTokPosts = async () => {
    setLoadingTiktok(true);
    try {
      if (isSupabase) {
        const { data, error } = await db.from('social_posts').select('*');
        if (error) throw error;
        const sorted = (data || []).sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setTiktokPosts(sorted);
        setLoadingTiktok(false);
        return;
      }
    } catch (e) {
      console.warn("Error leyendo de base de datos social_posts, usando localStorage:", e);
    }
    
    // Fallback local
    const local = JSON.parse(localStorage.getItem('pos_tiktok_schedules') || '[]');
    setTiktokPosts(local);
    setLoadingTiktok(false);
  };

  const saveTikTokPost = async (post: TikTokPost) => {
    try {
      if (isSupabase) {
        const { error } = await db.from('social_posts').upsert(post);
        if (error) throw error;
      }
    } catch (e) {
      console.warn("Error guardando social_post en base de datos, usando localStorage:", e);
    }

    const local = JSON.parse(localStorage.getItem('pos_tiktok_schedules') || '[]');
    const idx = local.findIndex((p: any) => p.id === post.id);
    if (idx >= 0) {
      local[idx] = post;
    } else {
      local.unshift(post);
    }
    localStorage.setItem('pos_tiktok_schedules', JSON.stringify(local));
  };

  const deleteTikTokPost = async (postId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta publicación de TikTok?")) return;
    try {
      if (isSupabase) {
        const { error } = await db.from('social_posts').delete().eq('id', postId);
        if (error) throw error;
      }
    } catch (e) {
      console.warn("Error eliminando de base de datos social_posts:", e);
    }

    const local = JSON.parse(localStorage.getItem('pos_tiktok_schedules') || '[]');
    const filtered = local.filter((p: any) => p.id !== postId);
    localStorage.setItem('pos_tiktok_schedules', JSON.stringify(filtered));
    setTiktokPosts(filtered);
    toast({ title: "Publicación eliminada", description: "Se descartó la programación." });
  };

  const handleConnectTikTok = () => {
    setShowTikTokAuthDialog(true);
  };

  const handleRealTikTokRedirect = () => {
    if (!clientKey.trim() || !clientSecret.trim()) {
      toast({ 
        title: "Credenciales requeridas", 
        description: "Por favor ingresa tu Client Key y Client Secret.", 
        variant: "destructive" 
      });
      return;
    }
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey.trim()}&scope=video.upload,user.info.basic&response_type=code&redirect_uri=${encodeURIComponent(redirectUri.trim())}&state=tiktok`;
    toast({ title: "Redirigiendo...", description: "Conectando con la página de inicio de sesión de TikTok..." });
    setTimeout(() => {
      window.location.href = authUrl;
    }, 800);
  };

  const handleConfirmTikTokAuth = () => {
    if (!authUsername.trim() || authUsername === '@') {
      toast({ 
        title: "Usuario requerido", 
        description: "Por favor ingresa tu nombre de usuario de TikTok.", 
        variant: "destructive" 
      });
      return;
    }

    setIsConnectingTikTok(true);
    setTimeout(() => {
      setIsConnectingTikTok(false);
      setIsTikTokConnected(false);
      localStorage.removeItem('tiktok_connected');

      const cleanUsername = authUsername.trim().startsWith('@') ? authUsername.trim() : `@${authUsername.trim()}`;
      
      // Try to parse followers and likes
      const rawFollowers = parseInt(authFollowers.replace(/,/g, '')) || 0;
      const rawLikes = parseInt(authLikes.replace(/,/g, '')) || 0;

      const profile = {
        username: cleanUsername,
        followers: rawFollowers.toLocaleString('es-AR'),
        likes: rawLikes.toLocaleString('es-AR'),
        views: (rawFollowers * 10).toLocaleString('es-AR')
      };

      localStorage.setItem('tiktok_profile', JSON.stringify(profile));
      setTiktokProfile(profile);
      setShowTikTokAuthDialog(false);
      
      toast({
        title: "Perfil guardado para carga manual",
        description: `${cleanUsername} no está conectado por API. Para publicar automáticamente debes completar OAuth oficial.`
      });
    }, 1500);
  };

  const handleDisconnectTikTok = () => {
    if (!window.confirm("¿Seguro que deseas desconectar tu cuenta de TikTok?")) return;
    setIsTikTokConnected(false);
    localStorage.removeItem('tiktok_connected');
    localStorage.removeItem('tiktok_profile');
    setTiktokProfile({ username: '', followers: '0', likes: '0', views: '0' });
    toast({
      title: "Cuenta desconectada",
      description: "Se desvinculó tu cuenta de TikTok."
    });
  };

  const handleOpenTikTokEditor = (post?: TikTokPost) => {
    if (post) {
      setSelectedTikTokPost(post);
      setTiktokCaption(post.caption);
      setTiktokVideoUrl(post.videoUrl);
      setTiktokDate(post.scheduledDate || '');
      setTiktokTime(post.scheduledTime || '');
    } else {
      setSelectedTikTokPost(null);
      setTiktokCaption('');
      setTiktokVideoUrl('https://assets.mixkit.co/videos/preview/mixkit-delivery-man-with-a-scooter-driving-down-the-street-34208-large.mp4');
      setTiktokDate('');
      setTiktokTime('');
    }
    setIsTikTokEditorOpen(true);
  };

  const handleSaveTikTokPublish = async (status: 'borrador' | 'programada') => {
    if (!tiktokVideoUrl) {
      toast({ title: "Video requerido", description: "Por favor selecciona un video para tu publicación.", variant: "destructive" });
      return;
    }

    if (status === 'programada' && (!tiktokDate || !tiktokTime)) {
      toast({ title: "Fecha/Hora requerida", description: "Por favor define la fecha y hora de programación.", variant: "destructive" });
      return;
    }

    if (status === 'programada' && !localStorage.getItem('tiktok_access_token')) {
      toast({ title: "API de TikTok requerida", description: "No se puede programar una publicación automática sin una autorización OAuth válida.", variant: "destructive" });
      return;
    }

    const postId = selectedTikTokPost?.id || `tiktok-post-${Date.now()}`;
    const newPost: TikTokPost = {
      id: postId,
      caption: tiktokCaption,
      videoUrl: tiktokVideoUrl,
      status,
      scheduledDate: status === 'programada' ? tiktokDate : undefined,
      scheduledTime: status === 'programada' ? tiktokTime : undefined,
      created_at: selectedTikTokPost?.created_at || new Date().toISOString()
    };

    await saveTikTokPost(newPost);
    setIsTikTokEditorOpen(false);
    fetchTikTokPosts();
    toast({
      title: status === 'programada' ? "⏰ Video Programado" : "💾 Borrador Guardado",
      description: "Tu publicación de TikTok se registró correctamente."
    });
  };

  const handlePublishTikTokPost = async (post: TikTokPost) => {
    const accessToken = localStorage.getItem('tiktok_access_token');
    
    if (accessToken) {
      // Real API upload!
      toast({ 
        title: "Subiendo a TikTok...", 
        description: "Enviando video y programando publicación a los servidores de TikTok..." 
      });
      try {
        const response = await fetch('/api/tiktok/publish', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            access_token: accessToken,
            caption: post.caption,
            video_url: post.videoUrl
          })
        });
        const result = await response.json();
        if (result.success) {
          toast({
            title: "⚡ Publicado en TikTok",
            description: "¡El video se ha subido y publicado en tu cuenta real de TikTok!"
          });
          const publishedPost: TikTokPost = {
            ...post,
            status: 'publicada',
            publishedAt: new Date().toISOString()
          };
          await saveTikTokPost(publishedPost);
          fetchTikTokPosts();
        } else {
          toast({
            title: "Error de publicación",
            description: result.message || "Fallo en la subida a TikTok API.",
            variant: "destructive"
          });
        }
      } catch (e: any) {
        toast({
          title: "Error de conexión",
          description: e.message || "No se pudo conectar con el servidor local para subir el video.",
          variant: "destructive"
        });
      }
    } else {
      // Manual mode fallback: Open Creator Center!
      toast({ title: "Preparando publicación...", description: "Copiando pie de foto y abriendo TikTok..." });
      
      // Copy caption to clipboard
      try {
        await navigator.clipboard.writeText(post.caption);
        toast({ title: "Copiado", description: "El pie de foto se ha copiado al portapapeles." });
      } catch (e) {}
      
      // Open TikTok upload center
      window.open("https://www.tiktok.com/creator-center/upload", "_blank");
      
      // Open helpful instructional modal in our CRM
      setManualPostDetails(post);
      setShowManualPostDialog(true);
    }
  };

  // Cargar posts de TikTok al montar e iniciar interval de chequeo de programación
  useEffect(() => {
    fetchTikTokPosts();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      
      tiktokPosts.forEach((p) => {
        if (p.status === 'programada' && p.scheduledDate && p.scheduledTime) {
          const schedTime = new Date(`${p.scheduledDate}T${p.scheduledTime}`);
          if (now >= schedTime && localStorage.getItem('tiktok_access_token') && !publishingTikTokIds.current.has(p.id)) {
            publishingTikTokIds.current.add(p.id);
            handlePublishTikTokPost(p).finally(() => publishingTikTokIds.current.delete(p.id));
          }
        }
      });
    }, 5000); // Chequea cada 5 segundos para que sea súper dinámico si lo programan pronto
    return () => clearInterval(interval);
  }, [tiktokPosts]);

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
      agency_id: activeAgencyId || '2',
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
      agency_id: selectedCampaign?.agency_id || activeAgencyId || '2',
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

  const handleSelectCampaignImage = (url: string) => {
    const textarea = campaignBodyRef.current;
    const start = textarea?.selectionStart ?? body.length;
    const end = textarea?.selectionEnd ?? body.length;
    const imageHtml = `<img src="${url}" alt="" style="max-width:100%;height:auto;">`;
    setBody((current) => `${current.slice(0, start)}${imageHtml}${current.slice(end)}`);
    setIsCampaignMediaPickerOpen(false);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      const cursor = start + imageHtml.length;
      textarea?.setSelectionRange(cursor, cursor);
    });
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
        ) : activeSubTab === 'social' ? (
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              Marketing multicanal
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Planifica contenido, administra cuentas y controla publicaciones para todas tus redes sociales.
            </p>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Mail className="h-6 w-6 text-blue-600" />
              Marketing y CampaÃ±as de Correo
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Diseña, planifica y envía correos masivos automatizados a tus segmentos de clientes.
            </p>
          </div>
        )}

        {!selectedCampaign && (
          activeSubTab === 'campaigns' ? (
            <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Nueva Campaña
            </Button>
          ) : null
        )}
      </div>

      {/* Horizontal navigation tabs */}
      {!selectedCampaign && (
        <div className="border-b border-slate-200">
          <div className="flex space-x-6 text-sm font-semibold text-slate-500">
            <button
              onClick={() => setActiveSubTab('social')}
              className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
                activeSubTab === 'social' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-slate-800'
              }`}
            >
              Planificador Social
            </button>
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
      {!selectedCampaign && activeSubTab === 'social' && (
        <SocialPlanner />
      )}

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
                  onClick={() => setIsCampaignMediaPickerOpen(true)}
                  className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-white h-9.5 transition-colors cursor-pointer"
                >
                  <FolderOpen className="h-4 w-4 text-slate-500" />
                  Elegir imagen para la campaña
                </button>
              </div>
            </div>

            <div className="space-y-1 text-left">
              <Label htmlFor="camp-body" className="text-xs text-slate-600 font-semibold">Contenido del Correo (HTML o Texto) *</Label>
              <textarea
                id="camp-body"
                ref={campaignBodyRef}
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

      <Dialog open={isCampaignMediaPickerOpen} onOpenChange={setIsCampaignMediaPickerOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Elegir imagen para la campaña</DialogTitle>
            <DialogDescription>Selecciona una imagen de la biblioteca o sube una nueva. Se insertará en el contenido del correo.</DialogDescription>
          </DialogHeader>
          <MediaLibrary onSelectImage={handleSelectCampaignImage} />
        </DialogContent>
      </Dialog>

      {/* TAB CONTENT: TikTok Marketing view */}
      {false && !selectedCampaign && activeSubTab === 'tiktok' && (
        <div className="space-y-6">
          {!isTikTokConnected ? (
            /* DISCONNECTED STATE */
            <Card className="bg-slate-950 border-slate-800 text-white rounded-2xl overflow-hidden shadow-2xl p-8 relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#FE2C55]/20 to-[#25F4EE]/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="max-w-2xl mx-auto text-center space-y-6 py-8 relative z-10">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-lg">
                  {/* TikTok Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-9 h-9 text-black fill-current">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.63 4.19 1.13 1.25 2.72 2.01 4.39 2.22v3.91c-1.74-.03-3.46-.57-4.88-1.59-.28-.2-.55-.42-.8-.66v6.62c.04 2.87-1.39 5.61-3.84 7.08-2.6 1.61-6.07 1.76-8.81.39-2.82-1.37-4.66-4.48-4.52-7.65.1-3.6 2.83-6.73 6.39-7.23.82-.12 1.65-.07 2.46.12v3.96c-.6-.24-1.25-.33-1.89-.25-1.57.17-2.92 1.34-3.23 2.91-.4 1.83.67 3.73 2.47 4.19 1.61.43 3.42-.4 3.93-1.97.11-.32.15-.65.15-.99V.02z" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-[#25F4EE] via-white to-[#FE2C55] bg-clip-text text-transparent">
                    Conectar con TikTok Creator
                  </h2>
                  <p className="text-slate-400 text-sm max-w-lg mx-auto">
                    Autoriza la API oficial para publicar videos, administrar borradores y recibir estados reales del canal.
                  </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
                  <Button 
                    onClick={() => {
                      setConnectionMethod('api');
                      setShowTikTokAuthDialog(true);
                    }}
                    className="bg-white hover:bg-slate-100 text-black font-extrabold rounded-full px-6 py-5 text-xs flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105 cursor-pointer border-transparent"
                  >
                    Conectar API oficial
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-slate-800 text-left">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#25F4EE]" /> Programación de Reels
                    </h4>
                    <p className="text-slate-400 text-xs">Programa tus videos promocionales para publicarse a horas pico del día.</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-[#FE2C55]" /> Vista Previa Realista
                    </h4>
                    <p className="text-slate-400 text-xs">Visualiza cómo lucirá tu video en la aplicación móvil con subtítulos en vivo.</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-green-400" /> Analíticas del Canal
                    </h4>
                    <p className="text-slate-400 text-xs">Sigue de cerca las métricas de visualizaciones directas desde tu panel de Voltium.</p>
                  </div>
                </div>
              </div>
            </Card>
          ) : isTikTokEditorOpen ? (
            /* TIKTOK EDITOR / CREATOR VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Form Configurer */}
              <div className="lg:col-span-7 space-y-6">
                <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                  <CardHeader className="border-b border-slate-100 pb-4 flex flex-row justify-between items-center">
                    <div>
                      <CardTitle className="text-base text-slate-900 font-bold">
                        {selectedTikTokPost ? 'Editar Video Programado' : 'Programar Nueva Publicación de TikTok'}
                      </CardTitle>
                      <CardDescription className="text-xs">Sube tu archivo de video promocional, escoge los hashtags y define los permisos de privacidad.</CardDescription>
                    </div>
                    <button onClick={() => setIsTikTokEditorOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-5 w-5" />
                    </button>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5 text-left">
                    
                    {/* Video URL Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700 uppercase">Selecciona el Video *</Label>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setTiktokVideoUrl('https://assets.mixkit.co/videos/preview/mixkit-delivery-man-with-a-scooter-driving-down-the-street-34208-large.mp4')}
                          className={`p-2 border rounded-lg text-xs font-semibold text-center cursor-pointer transition-all ${
                            tiktokVideoUrl === 'https://assets.mixkit.co/videos/preview/mixkit-delivery-man-with-a-scooter-driving-down-the-street-34208-large.mp4'
                              ? 'border-[#FE2C55] bg-[#FE2C55]/5 text-[#FE2C55]'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          🛵 Preset 1: Scooter Delivery
                        </button>
                        <button
                          type="button"
                          onClick={() => setTiktokVideoUrl('https://assets.mixkit.co/videos/preview/mixkit-man-riding-a-motorcycle-on-a-country-road-41662-large.mp4')}
                          className={`p-2 border rounded-lg text-xs font-semibold text-center cursor-pointer transition-all ${
                            tiktokVideoUrl === 'https://assets.mixkit.co/videos/preview/mixkit-man-riding-a-motorcycle-on-a-country-road-41662-large.mp4'
                              ? 'border-[#FE2C55] bg-[#FE2C55]/5 text-[#FE2C55]'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          🏍️ Preset 2: Moto Ruta
                        </button>
                        <button
                          type="button"
                          onClick={() => setTiktokVideoUrl('https://assets.mixkit.co/videos/preview/mixkit-young-woman-with-shopping-bags-walking-in-slow-motion-41857-large.mp4')}
                          className={`p-2 border rounded-lg text-xs font-semibold text-center cursor-pointer transition-all ${
                            tiktokVideoUrl === 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-with-shopping-bags-walking-in-slow-motion-41857-large.mp4'
                              ? 'border-[#FE2C55] bg-[#FE2C55]/5 text-[#FE2C55]'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          🛍️ Preset 3: Compras Cliente
                        </button>
                      </div>

                      {/* Custom Upload simulated */}
                      <div className="pt-2">
                        <Label htmlFor="customVideoInput" className="border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/50 p-4 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all">
                          <UploadCloud className="w-8 h-8 text-slate-400 mb-1.5" />
                          <span className="text-xs font-bold text-slate-700">Subir Archivo de Video Local</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">Soporta MP4, MOV de hasta 100MB</span>
                          <input
                            id="customVideoInput"
                            type="file"
                            accept="video/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = URL.createObjectURL(file);
                                setTiktokVideoUrl(url);
                                toast({ title: "Video cargado", description: `${file.name} listo para previsualizar.` });
                              }
                            }}
                            className="hidden"
                          />
                        </Label>
                      </div>
                    </div>

                    {/* Caption (Pie de foto) */}
                    <div className="space-y-1.5">
                      <Label htmlFor="tiktokCaption" className="text-xs font-bold text-slate-700 uppercase">Pie de Foto y Hashtags *</Label>
                      <textarea
                        id="tiktokCaption"
                        rows={3}
                        maxLength={2200}
                        placeholder="Escribe algo pegajoso... Ej: ¡Nuevas unidades disponibles en Voltium Sanrey! 🛵💨 #motos #scooter #deliveryargentina"
                        value={tiktokCaption}
                        onChange={(e) => setTiktokCaption(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#FE2C55]"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Recomendados: #voltiumsas #delivery #motos</span>
                        <span>{tiktokCaption.length} / 2200 caracteres</span>
                      </div>
                    </div>

                    {/* Advanced Post Settings */}
                    <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 space-y-3">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        ⚙️ Configuración Avanzada de la Publicación
                      </span>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-600 font-semibold">¿Quién puede ver este video?</Label>
                          <select className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none">
                            <option value="public">Público (Todos)</option>
                            <option value="friends">Amigos (Mutuos)</option>
                            <option value="private">Solo yo (Privado)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-600 font-semibold">Pista de Audio Integrada</Label>
                          <select className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none">
                            <option value="original">Sonido original - Voltium Sanrey</option>
                            <option value="trending-beat">Trending: Electro Delivery Beat</option>
                            <option value="speed-up">Trending: Neon City Ride (Speed Up)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 pt-1 text-xs text-slate-600">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded text-[#FE2C55] focus:ring-[#FE2C55] h-3.5 w-3.5" />
                          Permitir Comentarios
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded text-[#FE2C55] focus:ring-[#FE2C55] h-3.5 w-3.5" />
                          Permitir Dueto
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded text-[#FE2C55] focus:ring-[#FE2C55] h-3.5 w-3.5" />
                          Permitir Pegado/Stitch
                        </label>
                      </div>
                    </div>

                    {/* Schedule Config */}
                    <div className="bg-[#FAF9F5] p-4 rounded-xl border border-[#EAE8E2] space-y-3">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-[#FE2C55]" /> Programar Fecha y Hora de Publicación
                      </span>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="ttDate" className="text-xs text-slate-500 font-semibold">Fecha</Label>
                          <Input
                            id="ttDate"
                            type="date"
                            value={tiktokDate}
                            onChange={(e) => setTiktokDate(e.target.value)}
                            className="bg-white border-slate-200 h-9 text-sm text-slate-900"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="ttTime" className="text-xs text-slate-500 font-semibold">Hora</Label>
                          <Input
                            id="ttTime"
                            type="time"
                            value={tiktokTime}
                            onChange={(e) => setTiktokTime(e.target.value)}
                            className="bg-white border-slate-200 h-9 text-sm text-slate-900"
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 flex justify-between items-center px-0.5">
                        <span>Zona Horaria: América/Argentina/Buenos_Aires (GMT-3)</span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsTikTokEditorOpen(false)}
                        className="h-9.5 text-xs font-bold"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSaveTikTokPublish('borrador')}
                        className="h-9.5 text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      >
                        Guardar Borrador
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleSaveTikTokPublish('programada')}
                        disabled={!tiktokDate || !tiktokTime}
                        className="h-9.5 text-xs font-bold bg-[#FE2C55] hover:bg-[#E02247] text-white"
                      >
                        Programar Publicación
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* iPhone Live Preview Mockup */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-[300px] h-[610px] bg-slate-950 rounded-[40px] border-[10px] border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between select-none">
                  {/* Phone Speaker/Camera Notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-4.5 bg-black rounded-full z-40 flex items-center justify-center">
                    <span className="w-2.5 h-2.5 bg-slate-900 rounded-full border border-slate-800" />
                  </div>

                  {/* TikTok Screen Mockup Content */}
                  <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-black z-10">
                    
                    {/* Header tabs (Para ti, Siguiendo) */}
                    <div className="absolute top-8 left-0 right-0 flex justify-center gap-4 text-xs font-bold text-white/60 z-30 pt-1">
                      <span>Siguiendo</span>
                      <span className="text-white border-b-2 border-white pb-1">Para ti</span>
                    </div>

                    {/* Live Video Playing */}
                    <div className="absolute inset-0 w-full h-full z-15 bg-slate-900">
                      {tiktokVideoUrl ? (
                        <video
                          key={tiktokVideoUrl}
                          src={tiktokVideoUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                          <Video className="w-12 h-12 mb-2 animate-bounce" />
                          <span>Sin video seleccionado</span>
                        </div>
                      )}
                    </div>

                    {/* Right side interaction icons */}
                    <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4.5 z-30 text-white">
                      {/* Profile avatar */}
                      <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-white flex items-center justify-center relative mb-2">
                        <span className="text-white font-black text-[10px]">V</span>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#FE2C55] rounded-full flex items-center justify-center font-bold text-[10px] text-white border border-white">+</div>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <Heart className="w-7 h-7 text-white fill-current animate-pulse" />
                        <span className="text-[10px] font-bold">12.4K</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <MessageCircle className="w-7 h-7 text-white fill-current" />
                        <span className="text-[10px] font-bold">342</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <Share2 className="w-7 h-7 text-white fill-current" />
                        <span className="text-[10px] font-bold">89</span>
                      </div>

                      {/* Spinning audio disc */}
                      <div className="w-9 h-9 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center animate-spin duration-3000">
                        <span className="w-4 h-4 bg-slate-950 rounded-full border border-slate-600" />
                      </div>
                    </div>

                    {/* Bottom overlay text: User handle & caption */}
                    <div className="absolute left-3 right-16 bottom-6 z-30 text-white text-left space-y-1.5 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-lg">
                      <div className="font-extrabold text-sm">{tiktokProfile.username || '@creador'}</div>
                      <div className="text-xs text-white/95 leading-snug line-clamp-3">
                        {tiktokCaption || "Tu pie de foto y hashtags se verán aquí en tiempo real..."}
                      </div>
                      <div className="text-[10px] text-white/80 font-bold flex items-center gap-1.5">
                        <span className="animate-pulse">♬</span>
                        <span>Sonido original - Voltium Sanrey</span>
                      </div>
                    </div>

                    {/* Top Status Bar indicator */}
                    <div className="absolute top-1 left-4 text-[9.5px] font-black text-white/80 z-40">12:00</div>
                    <div className="absolute top-1 right-4 text-[9.5px] font-black text-white/80 z-40 flex gap-1">
                      <span>5G</span>
                      <span>100%</span>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TIKTOK DASHBOARD */
            <div className="space-y-6 text-left">
              {/* Linked Account Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Account Details Box */}
                <Card className="lg:col-span-1 bg-white border-slate-200 shadow-sm rounded-xl p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-slate-950 border-2 border-[#FE2C55] flex items-center justify-center font-black text-white text-lg overflow-hidden">
                        <span className="text-white text-xl">
                          {tiktokProfile.username ? tiktokProfile.username.replace('@','').substring(0,1).toUpperCase() : 'T'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold text-slate-800 text-base">{tiktokProfile.username || '@creador'}</span>
                          {/* TikTok blue verification badge */}
                          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#25F4EE] fill-current">
                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5">TikTok Business Verified</p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-3 flex gap-2 justify-between">
                      <button
                        onClick={handleDisconnectTikTok}
                        className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100/50 py-1.5 px-3 rounded-lg border border-red-100 transition-all cursor-pointer"
                      >
                        Desconectar
                      </button>
                      <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold px-2 py-0.5">
                        API Activa
                      </Badge>
                    </div>
                  </div>
                </Card>

                {/* STATS PANELS */}
                <div className="lg:col-span-2 grid grid-cols-3 gap-3">
                  <Card className="bg-white border-slate-200 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Seguidores</span>
                      <h3 className="text-2xl font-black text-slate-800 mt-1">{tiktokProfile.followers || '0'}</h3>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-0.5">
                      ▲ +8.2% <span className="text-slate-400 font-normal">este mes</span>
                    </span>
                  </Card>
                  
                  <Card className="bg-white border-slate-200 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visualizaciones (7d)</span>
                      <h3 className="text-2xl font-black text-slate-800 mt-1">{tiktokProfile.views || '0'}</h3>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-0.5">
                      ▲ +14.5% <span className="text-slate-400 font-normal">este mes</span>
                    </span>
                  </Card>

                  <Card className="bg-white border-slate-200 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Me Gusta</span>
                      <h3 className="text-2xl font-black text-slate-800 mt-1">{tiktokProfile.likes || '0'}</h3>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-0.5">
                      ▲ +5.1% <span className="text-slate-400 font-normal">este mes</span>
                    </span>
                  </Card>
                </div>
              </div>

              {/* Analytics growth chart (SVG Interactive line graph) */}
              <Card className="bg-white border-slate-200 shadow-sm rounded-xl p-5">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Alcance de Videos (Últimos 7 Días)</h3>
                    <p className="text-[10px] text-slate-500">Métrica diaria de visualizaciones orgánicas en TikTok.</p>
                  </div>
                  <Badge className="bg-[#FE2C55]/10 text-[#FE2C55] hover:bg-[#FE2C55]/10 border-transparent text-[10px] font-bold">TikTok Live Feed</Badge>
                </div>
                
                <div className="w-full h-[140px] relative">
                  {/* Glowing SVG Chart */}
                  <svg className="w-full h-full" viewBox="0 0 600 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FE2C55" stopOpacity="0.25"/>
                        <stop offset="100%" stopColor="#FE2C55" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Gridlines */}
                    <line x1="0" y1="20" x2="600" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="50" x2="600" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="80" x2="600" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="110" x2="600" y2="110" stroke="#f1f5f9" strokeWidth="1" />

                    {/* Area under curve */}
                    <path d="M 0 120 L 0 85 L 100 70 L 200 95 L 300 45 L 400 30 L 500 75 L 600 15 L 600 120 Z" fill="url(#chart-glow)" />

                    {/* Main Line path */}
                    <path d="M 0 85 L 100 70 L 200 95 L 300 45 L 400 30 L 500 75 L 600 15" fill="none" stroke="#FE2C55" strokeWidth="3.5" strokeLinecap="round" />
                    
                    {/* Dots */}
                    <circle cx="0" cy="85" r="4" fill="#FE2C55" stroke="#fff" strokeWidth="1.5" />
                    <circle cx="100" cy="70" r="4" fill="#FE2C55" stroke="#fff" strokeWidth="1.5" />
                    <circle cx="200" cy="95" r="4" fill="#FE2C55" stroke="#fff" strokeWidth="1.5" />
                    <circle cx="300" cy="45" r="4" fill="#FE2C55" stroke="#fff" strokeWidth="1.5" />
                    <circle cx="400" cy="30" r="4" fill="#FE2C55" stroke="#fff" strokeWidth="1.5" />
                    <circle cx="500" cy="75" r="4" fill="#FE2C55" stroke="#fff" strokeWidth="1.5" />
                    <circle cx="600" cy="15" r="4" fill="#FE2C55" stroke="#fff" strokeWidth="1.5" />
                  </svg>
                  
                  {/* Chart X axis labels */}
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase pt-2">
                    <span>Lun</span>
                    <span>Mar</span>
                    <span>Mié</span>
                    <span>Jue</span>
                    <span>Vie</span>
                    <span>Sáb</span>
                    <span>Dom (Hoy)</span>
                  </div>
                </div>
              </Card>

              {/* Weekly Calendar Grid / Post slots */}
              <Card className="bg-white border-slate-200 shadow-sm rounded-xl p-5">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Calendario de Publicaciones (Vista de Slots)</h3>
                    <p className="text-[10px] text-slate-500">Planifica visualmente las publicaciones semanales y configura slots de video.</p>
                  </div>
                  <Button 
                    onClick={() => handleOpenTikTokEditor()}
                    size="sm" 
                    className="bg-[#FE2C55] hover:bg-[#E02247] text-white text-[11px] font-bold h-8 cursor-pointer"
                  >
                    + Nuevo Video
                  </Button>
                </div>

                {/* Calendar Layout */}
                <div className="grid grid-cols-7 gap-2.5">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day, idx) => {
                    const postsForDay = tiktokPosts.filter(p => {
                      if (p.status !== 'programada' || !p.scheduledDate) return false;
                      const dateObj = new Date(p.scheduledDate);
                      const dayNum = dateObj.getDay();
                      const adjustedDay = dayNum === 0 ? 6 : dayNum - 1;
                      return adjustedDay === idx;
                    });

                    return (
                      <div key={day} className="border border-slate-150 bg-[#F9F8F6] rounded-xl p-2.5 min-h-[140px] flex flex-col justify-between">
                        <div>
                          <span className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider block">{day}</span>
                          <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Jul 1{idx + 3}</span>
                          
                          <div className="mt-2 space-y-1.5">
                            {postsForDay.map(post => (
                              <div 
                                key={post.id} 
                                onClick={() => handleOpenTikTokEditor(post)}
                                className="bg-slate-900 text-white rounded p-1.5 text-[9px] cursor-pointer hover:border-[#FE2C55] border border-transparent shadow transition-all relative overflow-hidden group"
                              >
                                <div className="absolute right-1 top-1 bg-amber-500 text-white rounded-full w-2 h-2" />
                                <span className="font-bold block truncate text-slate-200">@{post.scheduledTime}</span>
                                <span className="text-[8px] text-slate-400 block truncate leading-tight">{post.caption}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {postsForDay.length === 0 && (
                          <button
                            onClick={() => {
                              const date = new Date();
                              const currentDay = date.getDay() === 0 ? 6 : date.getDay() - 1;
                              const diff = idx - currentDay;
                              date.setDate(date.getDate() + diff);
                              const yyyy = date.getFullYear();
                              const mm = String(date.getMonth() + 1).padStart(2, '0');
                              const dd = String(date.getDate()).padStart(2, '0');
                              setTiktokDate(`${yyyy}-${mm}-${dd}`);
                              setTiktokTime('18:00');
                              setTiktokVideoUrl('https://assets.mixkit.co/videos/preview/mixkit-delivery-man-with-a-scooter-driving-down-the-street-34208-large.mp4');
                              setTiktokCaption('');
                              setIsTikTokEditorOpen(true);
                            }}
                            className="w-full text-center border border-dashed border-slate-300 hover:border-slate-450 hover:bg-slate-100 rounded-lg py-2 text-[9px] font-bold text-slate-500 transition-all cursor-pointer"
                          >
                            + Slot
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Schedules list list */}
              <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-base text-slate-900 font-bold">Listado Detallado de Publicaciones</CardTitle>
                  <CardDescription className="text-xs">Revisa y edita el estado de todos tus borradores, programados e historial de envíos de TikTok.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingTiktok ? (
                    <div className="flex justify-center items-center py-16">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FE2C55]"></div>
                    </div>
                  ) : tiktokPosts.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs italic">
                      No hay ningún video en cola de programación. Usa el botón superior para agregar uno.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-150">
                        <thead className="bg-slate-50">
                          <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            <th className="px-6 py-3.5 text-left">Vista Previa</th>
                            <th className="px-6 py-3.5 text-left">Pie de Foto (Hashtags)</th>
                            <th className="px-6 py-3.5 text-left">Estado</th>
                            <th className="px-6 py-3.5 text-left">Fecha Programada / Publicación</th>
                            <th className="px-6 py-3.5 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100 text-sm">
                          {tiktokPosts.map(post => (
                            <tr key={post.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="w-12 h-20 rounded bg-slate-900 overflow-hidden relative flex items-center justify-center border border-slate-200">
                                  <video src={post.videoUrl} className="w-full h-full object-cover" muted />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Video className="w-4.5 h-4.5 text-white/95" />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div 
                                  onClick={() => handleOpenTikTokEditor(post)}
                                  className="font-bold text-[#FE2C55] hover:underline cursor-pointer truncate max-w-[280px]"
                                >
                                  {post.caption || <span className="italic text-slate-400">(Sin pie de foto)</span>}
                                </div>
                                <div className="text-slate-400 text-[10px] mt-0.5 truncate max-w-[280px]">
                                  Video URL: {post.videoUrl.substring(0, 45)}...
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Badge className={`font-semibold uppercase text-[9px] px-2 py-0.5 border ${
                                  post.status === 'publicada'
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                    : post.status === 'programada'
                                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                                      : 'bg-slate-50 text-slate-500 border-slate-200'
                                }`}>
                                  {post.status}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                                {post.status === 'publicada' && post.publishedAt ? (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                    Publicado el {new Date(post.publishedAt).toLocaleString('es-AR')}
                                  </span>
                                ) : post.status === 'programada' && post.scheduledDate && post.scheduledTime ? (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                                    Programado: {new Date(`${post.scheduledDate}T${post.scheduledTime}`).toLocaleString('es-AR')}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Borrador</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-1.5">
                                  {post.status !== 'publicada' && (
                                    <button
                                      onClick={() => handlePublishTikTokPost(post)}
                                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 py-1 px-2 hover:bg-emerald-50 border border-emerald-100 rounded transition-all cursor-pointer"
                                      title="Publicar Ahora"
                                    >
                                      Publicar Ahora
                                    </button>
                                  )}
                                  <button
                                    onClick={() => deleteTikTokPost(post.id)}
                                    className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                                    title="Eliminar publicación"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TikTok OAuth authorization dialog (Modal) */}
      <Dialog open={showTikTokAuthDialog} onOpenChange={setShowTikTokAuthDialog}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white rounded-2xl overflow-hidden p-6 z-50">
          {connectionMethod === 'manual' ? (
            <>
              <DialogHeader className="text-center space-y-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6.5 h-6.5 text-black fill-current">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.63 4.19 1.13 1.25 2.72 2.01 4.39 2.22v3.91c-1.74-.03-3.46-.57-4.88-1.59-.28-.2-.55-.42-.8-.66v6.62c.04 2.87-1.39 5.61-3.84 7.08-2.6 1.61-6.07 1.76-8.81.39-2.82-1.37-4.66-4.48-4.52-7.65.1-3.6 2.83-6.73 6.39-7.23.82-.12 1.65-.07 2.46.12v3.96c-.6-.24-1.25-.33-1.89-.25-1.57.17-2.92 1.34-3.23 2.91-.4 1.83.67 3.73 2.47 4.19 1.61.43 3.42-.4 3.93-1.97.11-.32.15-.65.15-.99V.02z" />
                  </svg>
                </div>
                <DialogTitle className="text-lg font-black tracking-tight text-white">
                  Vincular Canal Creator Center
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  Introduce tu nombre de usuario y tus números actuales de seguidores y likes en TikTok para vincular el panel.
                </DialogDescription>
              </DialogHeader>

              {/* Account credentials custom configuration fields */}
              <div className="space-y-3 my-2">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nombre de Usuario de TikTok *</label>
                  <Input
                    type="text"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="@tu_marca"
                    className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 h-9.5 text-sm focus:ring-[#FE2C55]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Seguidores</label>
                    <Input
                      type="number"
                      value={authFollowers}
                      onChange={(e) => setAuthFollowers(e.target.value)}
                      placeholder="12492"
                      className="bg-slate-800 border-slate-700 text-white h-9.5 text-sm focus:ring-[#FE2C55]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Me Gusta</label>
                    <Input
                      type="number"
                      value={authLikes}
                      onChange={(e) => setAuthLikes(e.target.value)}
                      placeholder="452000"
                      className="bg-slate-800 border-slate-700 text-white h-9.5 text-sm focus:ring-[#FE2C55]"
                    />
                  </div>
                </div>
              </div>

              <div className="py-3 space-y-2 text-left border-y border-slate-800 my-3 text-xs text-slate-355">
                <p className="font-semibold text-white text-[10.5px]">Esta aplicación tendrá acceso a:</p>
                <div className="space-y-1.5">
                  <div className="flex gap-2.5 items-start">
                    <span className="text-[#25F4EE] font-bold">✓</span>
                    <span>Información pública del perfil (nombre de usuario, avatar, seguidores).</span>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="text-[#25F4EE] font-bold">✓</span>
                    <span>Subir borradores de video y publicarlos automáticamente.</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-end pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowTikTokAuthDialog(false)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmTikTokAuth}
                  disabled={isConnectingTikTok}
                  className="bg-[#FE2C55] hover:bg-[#E02247] text-white text-xs font-extrabold px-6 rounded-full h-9 shadow-lg"
                >
                  {isConnectingTikTok ? "Vinculando..." : "Autorizar Acceso"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader className="text-center space-y-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6.5 h-6.5 text-black fill-current">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.63 4.19 1.13 1.25 2.72 2.01 4.39 2.22v3.91c-1.74-.03-3.46-.57-4.88-1.59-.28-.2-.55-.42-.8-.66v6.62c.04 2.87-1.39 5.61-3.84 7.08-2.6 1.61-6.07 1.76-8.81.39-2.82-1.37-4.66-4.48-4.52-7.65.1-3.6 2.83-6.73 6.39-7.23.82-.12 1.65-.07 2.46.12v3.96c-.6-.24-1.25-.33-1.89-.25-1.57.17-2.92 1.34-3.23 2.91-.4 1.83.67 3.73 2.47 4.19 1.61.43 3.42-.4 3.93-1.97.11-.32.15-.65.15-.99V.02z" />
                  </svg>
                </div>
                <DialogTitle className="text-lg font-black tracking-tight text-white">
                  Configurar API Oficial de TikTok
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  Ingresa tus credenciales de desarrollador para iniciar la autorización real por OAuth con TikTok.
                </DialogDescription>
              </DialogHeader>

              {/* Developer Client API configuration fields */}
              <div className="space-y-3 my-2">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Client Key (TikTok Developers) *</label>
                  <Input
                    type="text"
                    value={clientKey}
                    onChange={(e) => {
                      setClientKey(e.target.value);
                      localStorage.setItem('tiktok_client_key', e.target.value);
                    }}
                    placeholder="awXXXXXXXX"
                    className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 h-9.5 text-sm"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Client Secret *</label>
                  <Input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => {
                      setClientSecret(e.target.value);
                      localStorage.setItem('tiktok_client_secret', e.target.value);
                    }}
                    placeholder="••••••••••••••••"
                    className="bg-slate-800 border-slate-700 text-white h-9.5 text-sm"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Redirect URI *</label>
                  <Input
                    type="text"
                    value={redirectUri}
                    onChange={(e) => {
                      setRedirectUri(e.target.value);
                      localStorage.setItem('tiktok_redirect_uri', e.target.value);
                    }}
                    placeholder="http://localhost:5173/admin/marketing"
                    className="bg-slate-800 border-slate-700 text-white h-9.5 text-xs font-mono"
                  />
                  <span className="text-[9px] text-slate-500 block">Debe estar habilitada en la consola de TikTok.</span>
                </div>
                <div className="text-[10px] text-slate-400 text-center pt-1.5">
                  ¿No tienes credenciales? Créalas en el <a href="https://developers.tiktok.com/" target="_blank" rel="noopener noreferrer" className="text-[#25F4EE] hover:underline font-bold">TikTok Developer Portal</a>.
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-end pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowTikTokAuthDialog(false)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleRealTikTokRedirect}
                  className="bg-[#FE2C55] hover:bg-[#E02247] text-white text-xs font-extrabold px-6 rounded-full h-9 shadow-lg"
                >
                  Iniciar Autorización Real
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Upload Help Dialog */}
      <Dialog open={showManualPostDialog} onOpenChange={setShowManualPostDialog}>
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-800 rounded-2xl overflow-hidden p-6 z-50">
          <DialogHeader className="text-center space-y-3">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
              <UploadCloud className="w-6.5 h-6.5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              ¡Pie de foto copiado! Paso final en TikTok
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs text-center">
              Sigue estas sencillas instrucciones para publicar tu video en TikTok Creator Portal:
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4 text-left border-y my-3 text-xs text-slate-700">
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-[#FE2C55]/10 text-[#FE2C55] rounded-full flex items-center justify-center font-bold shrink-0">1</div>
              <div>
                <p className="font-bold text-slate-950">Sube el Video</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Arrastra el archivo de video en la pestaña abierta de TikTok Creator Portal.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 bg-[#FE2C55]/10 text-[#FE2C55] rounded-full flex items-center justify-center font-bold shrink-0">2</div>
              <div>
                <p className="font-bold text-slate-950">Pega el Pie de Foto</p>
                <p className="text-slate-500 text-[11px] mt-0.5">El pie de foto se ha copiado automáticamente. Haz clic derecho y selecciona "Pegar" (Ctrl+V) en la descripción del video.</p>
                <div className="mt-1.5 p-2 bg-slate-50 border rounded font-mono text-[10px] text-slate-600 break-words">
                  {manualPostDetails?.caption || '(Sin texto)'}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 bg-[#FE2C55]/10 text-[#FE2C55] rounded-full flex items-center justify-center font-bold shrink-0">3</div>
              <div>
                <p className="font-bold text-slate-950">Confirma en el CRM</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Una vez publicado en TikTok, haz clic en "Confirmar Publicado" para marcarlo como publicado en el panel.</p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowManualPostDialog(false)}
              className="text-xs h-9 font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (manualPostDetails) {
                  const publishedPost: TikTokPost = {
                    ...manualPostDetails,
                    status: 'publicada',
                    publishedAt: new Date().toISOString()
                  };
                  await saveTikTokPost(publishedPost);
                  fetchTikTokPosts();
                }
                setShowManualPostDialog(false);
                toast({ title: "Confirmado", description: "La publicación se marcó como completada." });
              }}
              className="bg-[#FE2C55] hover:bg-[#E02247] text-white text-xs h-9 font-semibold px-4 cursor-pointer"
            >
              ✓ Confirmar Publicado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
