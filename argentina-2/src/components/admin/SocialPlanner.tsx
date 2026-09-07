import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Image as ImageIcon,
  Link2,
  List,
  Pencil,
  Plus,
  Send,
  Settings2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

type PlatformId = 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'google' | 'youtube';
type PlannerView = 'calendar' | 'list' | 'connections' | 'analytics';
type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'blocked' | 'failed';

type SocialPost = {
  id: string;
  campaign: string;
  content: string;
  mediaUrl?: string;
  destinationUrl?: string;
  platforms: PlatformId[];
  scheduledAt?: string;
  status: PostStatus;
  createdAt: string;
  publishedAt?: string;
  error?: string;
};

type Platform = {
  id: PlatformId;
  name: string;
  short: string;
  color: string;
  supports: string;
};

const STORAGE_KEY = 'merco-social-planner-v2';
const platforms: Platform[] = [
  { id: 'facebook', name: 'Facebook', short: 'f', color: 'bg-[#1877f2]', supports: 'Texto, imágenes, video y reels' },
  { id: 'instagram', name: 'Instagram', short: 'IG', color: 'bg-gradient-to-br from-[#833ab4] via-[#e1306c] to-[#fcaf45]', supports: 'Imágenes, carruseles, reels y stories' },
  { id: 'linkedin', name: 'LinkedIn', short: 'in', color: 'bg-[#0a66c2]', supports: 'Perfiles, páginas, imágenes y video' },
  { id: 'tiktok', name: 'TikTok', short: '♪', color: 'bg-slate-950', supports: 'Videos y contenido vertical' },
  { id: 'google', name: 'Google Business', short: 'G', color: 'bg-[#4285f4]', supports: 'Novedades, ofertas, eventos e imágenes' },
  { id: 'youtube', name: 'YouTube', short: '▶', color: 'bg-[#ff0000]', supports: 'Videos, Shorts y publicaciones' },
];

const statusLabel: Record<PostStatus, string> = {
  draft: 'Borrador',
  scheduled: 'Programada',
  publishing: 'Publicando',
  published: 'Publicada',
  blocked: 'Requiere conexión',
  failed: 'Error',
};

const statusClass: Record<PostStatus, string> = {
  draft: 'border-slate-300 bg-slate-50 text-slate-600',
  scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
  publishing: 'border-amber-200 bg-amber-50 text-amber-700',
  published: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  blocked: 'border-orange-200 bg-orange-50 text-orange-700',
  failed: 'border-red-200 bg-red-50 text-red-700',
};

const readPosts = (): SocialPost[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const localDateTime = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const PlatformMark = ({ platform, small = false }: { platform: Platform; small?: boolean }) => (
  <span className={cn('inline-grid shrink-0 place-items-center font-black text-white', small ? 'h-6 w-6 text-[9px]' : 'h-9 w-9 text-xs', platform.color)}>
    {platform.short}
  </span>
);

export const SocialPlanner: React.FC = () => {
  const [posts, setPosts] = useState<SocialPost[]>(readPosts);
  const [view, setView] = useState<PlannerView>('calendar');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState('Contenido general');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>([]);
  const [scheduledAt, setScheduledAt] = useState(localDateTime(new Date(Date.now() + 3600000)));

  const connectedPlatforms = useMemo<PlatformId[]>(() => {
    const connected: PlatformId[] = [];
    if (localStorage.getItem('tiktok_connected') === 'true' && localStorage.getItem('tiktok_access_token')) connected.push('tiktok');
    return connected;
  }, [composerOpen, view]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }, [posts]);

  const resetComposer = () => {
    setEditingId(null);
    setCampaign('Contenido general');
    setContent('');
    setMediaUrl('');
    setDestinationUrl('');
    setSelectedPlatforms([]);
    setScheduledAt(localDateTime(new Date(Date.now() + 3600000)));
  };

  const openComposer = (post?: SocialPost, date?: Date) => {
    if (post) {
      setEditingId(post.id);
      setCampaign(post.campaign);
      setContent(post.content);
      setMediaUrl(post.mediaUrl || '');
      setDestinationUrl(post.destinationUrl || '');
      setSelectedPlatforms(post.platforms);
      setScheduledAt(post.scheduledAt || localDateTime(new Date(Date.now() + 3600000)));
    } else {
      resetComposer();
      if (date) setScheduledAt(localDateTime(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0)));
    }
    setComposerOpen(true);
  };

  const savePost = (mode: 'draft' | 'schedule') => {
    if (!content.trim()) {
      toast({ title: 'Contenido requerido', description: 'Escribe el texto de la publicación.', variant: 'destructive' });
      return;
    }
    if (!selectedPlatforms.length) {
      toast({ title: 'Selecciona los canales', description: 'Elige al menos una red social.', variant: 'destructive' });
      return;
    }
    if (mode === 'schedule' && (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now())) {
      toast({ title: 'Fecha inválida', description: 'Selecciona una fecha y hora futuras.', variant: 'destructive' });
      return;
    }

    const missing = selectedPlatforms.filter((platform) => !connectedPlatforms.includes(platform));
    const status: PostStatus = mode === 'draft' ? 'draft' : missing.length ? 'blocked' : 'scheduled';
    const next: SocialPost = {
      id: editingId || `social-${Date.now()}`,
      campaign: campaign.trim() || 'Contenido general',
      content: content.trim(),
      mediaUrl: mediaUrl.trim() || undefined,
      destinationUrl: destinationUrl.trim() || undefined,
      platforms: selectedPlatforms,
      scheduledAt: mode === 'schedule' ? scheduledAt : undefined,
      status,
      createdAt: posts.find((post) => post.id === editingId)?.createdAt || new Date().toISOString(),
      error: missing.length ? `Falta autorizar: ${missing.map((id) => platforms.find((platform) => platform.id === id)?.name).join(', ')}` : undefined,
    };
    setPosts((current) => [next, ...current.filter((post) => post.id !== next.id)]);
    setComposerOpen(false);
    toast({
      title: status === 'blocked' ? 'Plan guardado; faltan conexiones' : mode === 'draft' ? 'Borrador guardado' : 'Publicación programada',
      description: status === 'blocked' ? next.error : 'La programación quedó registrada correctamente.',
    });
  };

  const publishTikTok = async (post: SocialPost) => {
    const accessToken = localStorage.getItem('tiktok_access_token');
    if (!accessToken || !post.mediaUrl) throw new Error(!accessToken ? 'TikTok no está autorizado por API.' : 'TikTok requiere una URL de video.');
    const response = await fetch('/api/tiktok/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, caption: post.content, video_url: post.mediaUrl }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'TikTok rechazó la publicación.');
  };

  const publishNow = async (post: SocialPost) => {
    const missing = post.platforms.filter((platform) => !connectedPlatforms.includes(platform));
    if (missing.length) {
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, status: 'blocked', error: `Falta autorizar: ${missing.map((id) => platforms.find((platform) => platform.id === id)?.name).join(', ')}` } : item));
      toast({ title: 'No se publicó', description: 'Autoriza todos los canales seleccionados antes de publicar.', variant: 'destructive' });
      return;
    }
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, status: 'publishing', error: undefined } : item));
    try {
      for (const platform of post.platforms) {
        if (platform === 'tiktok') await publishTikTok(post);
        else throw new Error(`${platforms.find((item) => item.id === platform)?.name} todavía no tiene un conector API autorizado.`);
      }
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, status: 'published', publishedAt: new Date().toISOString() } : item));
      toast({ title: 'Publicación enviada', description: 'La API del canal confirmó la recepción del contenido.' });
    } catch (error: any) {
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, status: 'failed', error: error.message } : item));
      toast({ title: 'No se pudo publicar', description: error.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      posts.filter((post) => post.status === 'scheduled' && post.scheduledAt && new Date(post.scheduledAt).getTime() <= Date.now()).forEach(publishNow);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [posts, connectedPlatforms]);

  const removePost = (id: string) => {
    if (!window.confirm('¿Eliminar esta publicación del plan?')) return;
    setPosts((current) => current.filter((post) => post.id !== id));
  };

  const monthDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [month]);

  const scheduled = posts.filter((post) => post.status === 'scheduled').length;
  const published = posts.filter((post) => post.status === 'published').length;
  const blocked = posts.filter((post) => post.status === 'blocked' || post.status === 'failed').length;

  return <div className="border border-slate-200 bg-white">
    <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="flex items-center gap-2"><ShareHeader /><h1 className="text-lg font-bold text-slate-900">Planificador social</h1><span className="border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">Multicanal</span></div>
        <p className="mt-1 text-xs text-slate-500">Crea, programa y controla contenido desde un calendario central.</p>
      </div>
      <Button onClick={() => openComposer()} className="h-9 rounded-none bg-blue-600 text-xs font-semibold hover:bg-blue-700"><Plus className="mr-1.5 h-4 w-4" />Crear publicación</Button>
    </div>

    <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 md:grid-cols-4">
      {[
        ['Programadas', scheduled, Clock3, 'text-blue-700'],
        ['Publicadas', published, Check, 'text-emerald-700'],
        ['Requieren atención', blocked, AlertCircle, 'text-orange-700'],
        ['Canales autorizados', connectedPlatforms.length, Link2, 'text-slate-800'],
      ].map(([label, value, Icon, color], index) => <div key={String(label)} className={cn('p-3', index > 0 && 'border-l border-slate-200')}><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{String(label)}</span><Icon className={cn('h-4 w-4', String(color))} /></div><strong className={cn('mt-1 block text-xl', String(color))}>{String(value)}</strong></div>)}
    </div>

    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
      <div className="flex overflow-x-auto">
        {([['calendar', 'Calendario', CalendarDays], ['list', 'Publicaciones', List], ['connections', 'Cuentas', Settings2], ['analytics', 'Rendimiento', BarChart3]] as const).map(([id, label, Icon]) => <button key={id} onClick={() => setView(id)} className={cn('flex h-9 items-center gap-1.5 border px-3 text-xs font-semibold -mr-px', view === id ? 'relative z-10 border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}><Icon className="h-3.5 w-3.5" />{label}</button>)}
      </div>
      <div className="flex items-center gap-1">{platforms.map((platform) => <PlatformMark key={platform.id} platform={platform} small />)}</div>
    </div>

    {view === 'calendar' && <div>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center border border-slate-200 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
        <strong className="text-sm capitalize text-slate-800">{month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</strong>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center border border-slate-200 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => <div key={day} className="border-r border-slate-200 px-2 py-2 text-center text-[10px] font-bold uppercase text-slate-500">{day}</div>)}</div>
      <div className="grid grid-cols-7">{monthDays.map((date) => {
        const key = dayKey(date);
        const dayPosts = posts.filter((post) => post.scheduledAt?.slice(0, 10) === key);
        const currentMonth = date.getMonth() === month.getMonth();
        const today = key === dayKey(new Date());
        return <button key={key} onClick={() => openComposer(undefined, date)} className={cn('min-h-24 border-b border-r border-slate-200 p-1.5 text-left align-top hover:bg-blue-50/40', !currentMonth && 'bg-slate-50 text-slate-300')}><span className={cn('inline-grid h-6 w-6 place-items-center text-[11px] font-semibold', today && 'bg-blue-600 text-white')}>{date.getDate()}</span><div className="mt-1 space-y-1">{dayPosts.slice(0, 3).map((post) => <span key={post.id} onClick={(event) => { event.stopPropagation(); openComposer(post); }} className={cn('block truncate border-l-2 bg-white px-1 py-0.5 text-[9px]', post.status === 'published' ? 'border-emerald-500' : post.status === 'blocked' || post.status === 'failed' ? 'border-orange-500' : 'border-blue-500')}>{post.scheduledAt?.slice(11, 16)} · {post.content}</span>)}{dayPosts.length > 3 && <span className="block text-[9px] text-slate-500">+{dayPosts.length - 3} más</span>}</div></button>;
      })}</div>
    </div>}

    {view === 'list' && <PostTable posts={posts} onEdit={openComposer} onDelete={removePost} onPublish={publishNow} />}

    {view === 'connections' && <div className="grid md:grid-cols-2 xl:grid-cols-3">
      {platforms.map((platform, index) => {
        const connected = connectedPlatforms.includes(platform.id);
        return <div key={platform.id} className={cn('flex gap-3 p-4', index % 3 !== 0 && 'xl:border-l border-slate-200', index >= 3 && 'border-t border-slate-200', index % 2 !== 0 && 'md:border-l xl:border-l-0')}><PlatformMark platform={platform} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><strong className="block text-sm text-slate-800">{platform.name}</strong><span className="text-[10px] text-slate-500">{platform.supports}</span></div><span className={cn('shrink-0 border px-1.5 py-0.5 text-[9px] font-bold uppercase', connected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500')}>{connected ? 'Autorizada' : 'Sin autorizar'}</span></div><button onClick={() => toast({ title: `Conexión de ${platform.name}`, description: 'La autorización se administra desde Integraciones generales. El canal seguirá desconectado hasta recibir credenciales OAuth válidas.' })} className="mt-3 text-[11px] font-semibold text-blue-700 underline underline-offset-2">{connected ? 'Ver estado de conexión' : 'Configurar en Integraciones'}</button></div></div>;
      })}
    </div>}

    {view === 'analytics' && <div className="grid gap-3 p-4 md:grid-cols-3">
      <Metric label="Tasa de publicación" value={posts.length ? `${Math.round(published / posts.length * 100)}%` : '—'} note="Publicadas sobre el total planificado" />
      <Metric label="Contenido planificado" value={String(posts.length)} note="Borradores y publicaciones del calendario" />
      <Metric label="Incidencias" value={String(blocked)} note="Conexiones o publicaciones que requieren revisión" warning={blocked > 0} />
      <div className="border border-slate-200 bg-slate-50 p-4 md:col-span-3"><h3 className="text-xs font-bold text-slate-800">Métricas verificadas por canal</h3><p className="mt-1 text-[11px] text-slate-500">El alcance, impresiones, clics y conversiones aparecerán cuando cada API oficial entregue datos reales. No se generan números simulados.</p></div>
    </div>}

    <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-none border-slate-300 bg-white sm:max-w-4xl">
        <DialogHeader><DialogTitle>{editingId ? 'Editar publicación' : 'Nueva publicación multicanal'}</DialogTitle></DialogHeader>
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div><Label>Publicar en</Label><div className="mt-2 flex flex-wrap gap-2">{platforms.map((platform) => { const selected = selectedPlatforms.includes(platform.id); const connected = connectedPlatforms.includes(platform.id); return <button key={platform.id} type="button" onClick={() => setSelectedPlatforms((current) => selected ? current.filter((id) => id !== platform.id) : [...current, platform.id])} className={cn('flex items-center gap-2 border px-2 py-1.5 text-xs', selected ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-600')}><PlatformMark platform={platform} small /><span>{platform.name}</span>{connected ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <AlertCircle className="h-3.5 w-3.5 text-orange-500" />}</button>; })}</div><p className="mt-1.5 text-[10px] text-slate-500">El símbolo naranja indica que falta autorizar la API del canal.</p></div>
            <div><Label htmlFor="social-content">Contenido</Label><Textarea id="social-content" value={content} onChange={(event) => setContent(event.target.value)} rows={7} maxLength={2200} placeholder="Escribe el contenido de la publicación..." className="mt-1 rounded-none" /><div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>Admite hashtags, menciones y enlaces</span><span>{content.length}/2200</span></div></div>
            <div className="grid gap-3 sm:grid-cols-2"><div><Label>Multimedia por URL</Label><div className="relative mt-1"><ImageIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><Input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="https://.../imagen-o-video.mp4" className="rounded-none pl-9" /></div></div><div><Label>Enlace de destino</Label><div className="relative mt-1"><Link2 className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><Input value={destinationUrl} onChange={(event) => setDestinationUrl(event.target.value)} placeholder="https://tu-sitio.com/oferta" className="rounded-none pl-9" /></div></div></div>
            <div className="grid gap-3 sm:grid-cols-2"><div><Label>Campaña</Label><Input value={campaign} onChange={(event) => setCampaign(event.target.value)} className="mt-1 rounded-none" /></div><div><Label>Fecha y hora</Label><Input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="mt-1 rounded-none" /></div></div>
          </div>
          <div className="border border-slate-200 bg-slate-50 p-3"><p className="mb-2 text-[10px] font-bold uppercase text-slate-500">Vista previa</p><div className="border border-slate-200 bg-white"><div className="flex items-center gap-2 border-b border-slate-100 p-3"><div className="h-8 w-8 bg-slate-200" /><div><strong className="block text-xs">Tu empresa</strong><span className="text-[9px] text-slate-400">Publicación programada</span></div></div>{mediaUrl && <div className="grid min-h-36 place-items-center overflow-hidden bg-slate-100"><img src={mediaUrl} alt="Vista previa" className="max-h-56 w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} /></div>}<p className="whitespace-pre-wrap break-words p-3 text-xs text-slate-700">{content || 'Tu contenido aparecerá aquí.'}</p>{destinationUrl && <div className="truncate border-t border-slate-100 bg-slate-50 p-2 text-[9px] text-blue-700">{destinationUrl}</div>}</div></div>
        </div>
        <DialogFooter className="gap-2 border-t pt-4"><Button variant="outline" onClick={() => savePost('draft')} className="rounded-none">Guardar borrador</Button><Button onClick={() => savePost('schedule')} className="rounded-none bg-blue-600 hover:bg-blue-700"><Clock3 className="mr-1.5 h-4 w-4" />Programar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
};

const ShareHeader = () => <div className="grid h-9 w-9 place-items-center bg-blue-600 text-white"><Send className="h-4 w-4" /></div>;

const Metric = ({ label, value, note, warning = false }: { label: string; value: string; note: string; warning?: boolean }) => <div className="border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase text-slate-500">{label}</p><strong className={cn('mt-2 block text-2xl', warning ? 'text-orange-700' : 'text-slate-900')}>{value}</strong><p className="mt-1 text-[10px] text-slate-500">{note}</p></div>;

const PostTable = ({ posts, onEdit, onDelete, onPublish }: { posts: SocialPost[]; onEdit: (post: SocialPost) => void; onDelete: (id: string) => void; onPublish: (post: SocialPost) => void }) => <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left"><thead><tr className="border-b border-slate-200 bg-slate-50">{['Contenido', 'Canales', 'Programación', 'Estado', 'Acciones'].map((label) => <th key={label} className="px-3 py-2 text-[10px] font-bold uppercase text-slate-500">{label}</th>)}</tr></thead><tbody>{posts.map((post) => <tr key={post.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="max-w-sm px-3 py-3"><strong className="block text-xs text-slate-800">{post.campaign}</strong><span className="mt-0.5 block truncate text-[11px] text-slate-500">{post.content}</span>{post.error && <span className="mt-1 block text-[10px] text-red-600">{post.error}</span>}</td><td className="px-3 py-3"><div className="flex gap-1">{post.platforms.map((id) => { const platform = platforms.find((item) => item.id === id)!; return <PlatformMark key={id} platform={platform} small />; })}</div></td><td className="px-3 py-3 text-[11px] text-slate-600">{post.scheduledAt ? new Date(post.scheduledAt).toLocaleString('es-ES') : 'Sin programar'}</td><td className="px-3 py-3"><span className={cn('border px-2 py-1 text-[10px] font-bold', statusClass[post.status])}>{statusLabel[post.status]}</span></td><td className="px-3 py-3"><div className="flex gap-1"><button onClick={() => onEdit(post)} className="grid h-8 w-8 place-items-center border border-slate-200 text-slate-500 hover:text-blue-700" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>{post.status !== 'published' && <button onClick={() => onPublish(post)} className="grid h-8 w-8 place-items-center border border-slate-200 text-slate-500 hover:text-emerald-700" title="Publicar ahora"><Send className="h-3.5 w-3.5" /></button>}<button onClick={() => onDelete(post.id)} className="grid h-8 w-8 place-items-center border border-slate-200 text-slate-500 hover:text-red-700" title="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>)}{!posts.length && <tr><td colSpan={5} className="py-16 text-center text-xs text-slate-400">Aún no hay publicaciones. Crea la primera desde el botón superior.</td></tr>}</tbody></table></div>;

export default SocialPlanner;
