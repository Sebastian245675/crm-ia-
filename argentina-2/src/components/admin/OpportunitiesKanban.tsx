import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { db } from '@/firebase';
import {
  Plus, Search, Trash2, Edit, SlidersHorizontal, ArrowUpDown, Download, Upload,
  LayoutGrid, List, Settings, Briefcase, Sparkles, Layers, ChevronDown, X,
  GripVertical, Phone, Mail, DollarSign, User, Building2, FileText, Calendar,
  Filter, MoreHorizontal, Star, Kanban, PenLine, MoveVertical, CircleDot,
  ChevronUp, ChevronLeft, ChevronRight
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface StageConfig {
  id: string;          // slug unique
  title: string;
  color: string;       // tailwind color name, e.g. "blue"
  order: number;
}

interface Opportunity {
  id: string;
  title: string;
  client_name: string;
  company_name: string;
  value: number;
  email: string;
  phone: string;
  stage: string;       // matches StageConfig.id
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  expected_close?: string;
  created_at?: string;
}

interface FieldConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  visible: boolean;
  required?: boolean;
}

interface SortConfig { field: keyof Opportunity; direction: 'asc' | 'desc'; }
interface FilterConfig { field: keyof Opportunity; operator: 'contains' | 'equals' | 'gt' | 'lt'; value: string; }

// ─── Color palette for stages ────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { name: 'blue',    label: 'Azul',      top: 'border-t-blue-500',    text: 'text-blue-700',    dot: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700',    swatch: '#3b82f6' },
  { name: 'violet',  label: 'Violeta',   top: 'border-t-violet-500',  text: 'text-violet-700',  dot: 'bg-violet-500',  badge: 'bg-violet-100 text-violet-700', swatch: '#7c3aed' },
  { name: 'amber',   label: 'Amarillo',  top: 'border-t-amber-500',   text: 'text-amber-700',   dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700',   swatch: '#f59e0b' },
  { name: 'indigo',  label: 'Índigo',    top: 'border-t-indigo-500',  text: 'text-indigo-700',  dot: 'bg-indigo-500',  badge: 'bg-indigo-100 text-indigo-700', swatch: '#4f46e5' },
  { name: 'emerald', label: 'Verde',     top: 'border-t-emerald-500', text: 'text-emerald-700', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700',swatch: '#10b981' },
  { name: 'rose',    label: 'Rojo',      top: 'border-t-rose-500',    text: 'text-rose-700',    dot: 'bg-rose-500',    badge: 'bg-rose-100 text-rose-700',     swatch: '#f43f5e' },
  { name: 'orange',  label: 'Naranja',   top: 'border-t-orange-500',  text: 'text-orange-700',  dot: 'bg-orange-500',  badge: 'bg-orange-100 text-orange-700', swatch: '#f97316' },
  { name: 'sky',     label: 'Celeste',   top: 'border-t-sky-500',     text: 'text-sky-700',     dot: 'bg-sky-500',     badge: 'bg-sky-100 text-sky-700',       swatch: '#0ea5e9' },
  { name: 'teal',    label: 'Teal',      top: 'border-t-teal-500',    text: 'text-teal-700',    dot: 'bg-teal-500',    badge: 'bg-teal-100 text-teal-700',     swatch: '#14b8a6' },
  { name: 'pink',    label: 'Rosa',      top: 'border-t-pink-500',    text: 'text-pink-700',    dot: 'bg-pink-500',    badge: 'bg-pink-100 text-pink-700',     swatch: '#ec4899' },
  { name: 'slate',   label: 'Gris',      top: 'border-t-slate-500',   text: 'text-slate-700',   dot: 'bg-slate-500',   badge: 'bg-slate-100 text-slate-700',   swatch: '#64748b' },
  { name: 'lime',    label: 'Lima',      top: 'border-t-lime-500',    text: 'text-lime-700',    dot: 'bg-lime-500',    badge: 'bg-lime-100 text-lime-700',     swatch: '#84cc16' },
];

const getColor = (name: string) => COLOR_OPTIONS.find(c => c.name === name) ?? COLOR_OPTIONS[0];

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_STAGES: StageConfig[] = [
  { id: 'contacto_recibido',    title: 'Contacto recibido',       color: 'blue',    order: 0 },
  { id: 'contacto_gestion',     title: 'Contacto en gestión',      color: 'violet',  order: 1 },
  { id: 'reunion_negociacion',  title: 'Reunión de negociación',   color: 'amber',   order: 2 },
  { id: 'contacto_seguimiento', title: 'Contacto en seguimiento',  color: 'indigo',  order: 3 },
  { id: 'ganado',               title: 'Negocio ganado',           color: 'emerald', order: 4 },
  { id: 'perdido',              title: 'Negocio perdido',          color: 'rose',    order: 5 },
];

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low:    { label: 'Baja',  color: 'text-slate-500 bg-slate-100' },
  medium: { label: 'Media', color: 'text-amber-600 bg-amber-50'  },
  high:   { label: 'Alta',  color: 'text-red-600   bg-red-50'    },
};

const DEFAULT_FIELDS: FieldConfig[] = [
  { id: 'title',          label: 'Nombre / Oportunidad', icon: <FileText className="h-3.5 w-3.5" />,  visible: true,  required: true },
  { id: 'client_name',    label: 'Contacto / Cliente',   icon: <User className="h-3.5 w-3.5" />,       visible: true },
  { id: 'company_name',   label: 'Empresa',               icon: <Building2 className="h-3.5 w-3.5" />,  visible: true },
  { id: 'value',          label: 'Valor Económico',       icon: <DollarSign className="h-3.5 w-3.5" />, visible: true },
  { id: 'email',          label: 'Correo electrónico',    icon: <Mail className="h-3.5 w-3.5" />,       visible: false },
  { id: 'phone',          label: 'Teléfono',              icon: <Phone className="h-3.5 w-3.5" />,      visible: false },
  { id: 'priority',       label: 'Prioridad',             icon: <Star className="h-3.5 w-3.5" />,       visible: true  },
  { id: 'expected_close', label: 'Fecha de cierre',       icon: <Calendar className="h-3.5 w-3.5" />,   visible: false },
  { id: 'notes',          label: 'Notas',                 icon: <FileText className="h-3.5 w-3.5" />,   visible: false },
];

// ─── Slug helper ─────────────────────────────────────────────────────────────

const toSlug = (str: string) =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
     .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 40);

// ════════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════════

export const OpportunitiesKanban: React.FC = () => {
  const isSupabase = typeof (db as any)?.from === 'function';

  // ── State ─────────────────────────────────────────────────────────────────
  const [stages, setStages]               = useState<StageConfig[]>(() => {
    try { const s = localStorage.getItem('kanban_stages'); return s ? JSON.parse(s) : DEFAULT_STAGES; } catch { return DEFAULT_STAGES; }
  });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading]             = useState(true);
  const [searchQuery, setSearchQuery]     = useState('');
  const [viewMode, setViewMode]           = useState<'grid' | 'list'>('grid');
  const [selectedPipeline, setSelectedPipeline] = useState('Comercial B2B');
  const [fields, setFields]               = useState<FieldConfig[]>(DEFAULT_FIELDS);
  const [sortConfig, setSortConfig]       = useState<SortConfig | null>(null);
  const [filters, setFilters]             = useState<FilterConfig[]>([]);
  const [dragOverCol, setDragOverCol]     = useState<string | null>(null);

  // Modals
  const [isCreateOpen,   setIsCreateOpen]   = useState(false);
  const [isDetailOpen,   setIsDetailOpen]   = useState(false);
  const [isFieldsOpen,   setIsFieldsOpen]   = useState(false);
  const [isFiltersOpen,  setIsFiltersOpen]  = useState(false);
  const [isSortOpen,     setIsSortOpen]     = useState(false);
  const [isImportOpen,   setIsImportOpen]   = useState(false);
  const [isStagesOpen,   setIsStagesOpen]   = useState(false);
  const [isMenuOpen,     setIsMenuOpen]     = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);   // ← NEW

  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  // Form: opportunity
  const [formTitle,       setFormTitle]       = useState('');
  const [formClientName,  setFormClientName]  = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formValue,       setFormValue]       = useState('0');
  const [formEmail,       setFormEmail]       = useState('');
  const [formPhone,       setFormPhone]       = useState('');
  const [formStage,       setFormStage]       = useState('');
  const [formNotes,       setFormNotes]       = useState('');
  const [formPriority,    setFormPriority]    = useState<'low'|'medium'|'high'>('medium');
  const [formClose,       setFormClose]       = useState('');

  // Form: stage editor
  const [editingStage,    setEditingStage]    = useState<StageConfig | null>(null);
  const [stageFormTitle,  setStageFormTitle]  = useState('');
  const [stageFormColor,  setStageFormColor]  = useState('blue');
  const [isStageFormOpen, setIsStageFormOpen] = useState(false);

  // ── Persist stages ────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('kanban_stages', JSON.stringify(stages));
  }, [stages]);

  // ── Data loading ──────────────────────────────────────────────────────────
  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      if (isSupabase) {
        const { data, error } = await (db as any).from('sales_opportunities').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setOpportunities(data || []);
      } else {
        const { collection, getDocs, query, orderBy } = await import('@/firebase');
        const q = query(collection(db, 'sales_opportunities'), orderBy('created_at', 'desc'));
        const snap = await getDocs(q);
        setOpportunities(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Opportunity)));
      }
    } catch {
      loadMock();
    } finally {
      setLoading(false);
    }
  };

  const loadMock = () => {
    const saved = localStorage.getItem('mock_opportunities');
    if (saved) { setOpportunities(JSON.parse(saved)); return; }
    const initial: Opportunity[] = [
      { id: 'opp-1', title: 'Licencia Corporativa Merco', client_name: 'Santiago Méndez', company_name: 'Méndez Asociados', value: 2500, email: 'santiago@mendez.com', phone: '+54 11 5000 1111', stage: 'contacto_recibido', priority: 'high',   notes: 'Interesado en 5 agentes IA.', created_at: new Date().toISOString() },
      { id: 'opp-2', title: 'Implementación E-commerce',  client_name: 'Verónica Castro',  company_name: 'Boutique Glam',    value: 4800, email: 'veronica@glam.com',    phone: '+54 11 5000 2222', stage: 'contacto_gestion', priority: 'medium', notes: 'Pendiente cotizar pasarelas.', created_at: new Date().toISOString() },
      { id: 'opp-3', title: 'Plan Premium Marketing',     client_name: 'Roberto Díaz',     company_name: 'AgencyPro',        value: 1200, email: 'rdiaz@agency.com',      phone: '+54 11 5000 3333', stage: 'reunion_negociacion', priority: 'low', created_at: new Date().toISOString() },
    ];
    setOpportunities(initial);
    localStorage.setItem('mock_opportunities', JSON.stringify(initial));
  };

  const persist = (list: Opportunity[]) => localStorage.setItem('mock_opportunities', JSON.stringify(list));

  useEffect(() => { fetchOpportunities(); }, []);

  // Default stage from sorted stages
  const defaultStageId = useMemo(() => [...stages].sort((a, b) => a.order - b.order)[0]?.id ?? '', [stages]);

  // ── CRUD: Opportunity ─────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) { toast({ title: 'El nombre es obligatorio', variant: 'destructive' }); return; }
    const opp: Opportunity = {
      id: `opp-${Date.now()}`, title: formTitle.trim(), client_name: formClientName.trim() || 'Sin nombre',
      company_name: formCompanyName.trim(), value: parseFloat(formValue) || 0, email: formEmail.trim(),
      phone: formPhone.trim(), stage: formStage || defaultStageId, notes: formNotes.trim(),
      priority: formPriority, expected_close: formClose, created_at: new Date().toISOString(),
    };
    try {
      if (isSupabase) {
        const { data, error } = await (db as any).from('sales_opportunities').insert([opp]).select();
        if (error) throw error;
        setOpportunities(p => [data?.[0] ?? opp, ...p]);
      } else {
        const { collection, addDoc } = await import('@/firebase');
        const ref = await addDoc(collection(db, 'sales_opportunities'), opp);
        setOpportunities(p => [{ ...opp, id: ref.id }, ...p]);
      }
    } catch {
      const list = [opp, ...opportunities]; setOpportunities(list); persist(list);
    }
    toast({ title: '¡Oportunidad creada!' }); setIsCreateOpen(false); resetForm();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpportunity) return;
    const updated: Opportunity = {
      ...selectedOpportunity, title: formTitle.trim(), client_name: formClientName.trim(),
      company_name: formCompanyName.trim(), value: parseFloat(formValue) || 0,
      email: formEmail.trim(), phone: formPhone.trim(), stage: formStage, notes: formNotes.trim(),
      priority: formPriority, expected_close: formClose,
    };
    try {
      if (isSupabase) {
        const { error } = await (db as any).from('sales_opportunities').update(updated).eq('id', selectedOpportunity.id);
        if (error) throw error;
      } else {
        const { doc, updateDoc } = await import('@/firebase');
        await updateDoc(doc(db, 'sales_opportunities', selectedOpportunity.id), { ...updated });
      }
    } catch { /* fallthrough */ }
    const list = opportunities.map(o => o.id === selectedOpportunity.id ? updated : o);
    setOpportunities(list); persist(list);
    toast({ title: 'Cambios guardados' }); setIsDetailOpen(false); setSelectedOpportunity(null); resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta oportunidad?')) return;
    try {
      if (isSupabase) await (db as any).from('sales_opportunities').delete().eq('id', id);
      else { const { doc, deleteDoc } = await import('@/firebase'); await deleteDoc(doc(db, 'sales_opportunities', id)); }
    } catch { /* fallthrough */ }
    const list = opportunities.filter(o => o.id !== id); setOpportunities(list); persist(list);
    toast({ title: 'Oportunidad eliminada' }); setIsDetailOpen(false); setSelectedOpportunity(null);
  };

  const handleStageChange = async (oppId: string, newStage: string) => {
    const opp = opportunities.find(o => o.id === oppId);
    if (!opp || opp.stage === newStage) return;
    const updated = { ...opp, stage: newStage };
    setOpportunities(p => p.map(o => o.id === oppId ? updated : o));
    try {
      if (isSupabase) await (db as any).from('sales_opportunities').update({ stage: newStage }).eq('id', oppId);
      else { const { doc, updateDoc } = await import('@/firebase'); await updateDoc(doc(db, 'sales_opportunities', oppId), { stage: newStage }); }
    } catch { persist(opportunities.map(o => o.id === oppId ? updated : o)); }
    toast({ title: `Movido a: ${stages.find(s => s.id === newStage)?.title ?? newStage}` });
  };

  const resetForm = () => {
    setFormTitle(''); setFormClientName(''); setFormCompanyName(''); setFormValue('0');
    setFormEmail(''); setFormPhone(''); setFormStage(defaultStageId); setFormNotes('');
    setFormPriority('medium'); setFormClose('');
  };

  const openDetail = (opp: Opportunity) => {
    setSelectedOpportunity(opp); setFormTitle(opp.title); setFormClientName(opp.client_name);
    setFormCompanyName(opp.company_name); setFormValue(opp.value.toString()); setFormEmail(opp.email);
    setFormPhone(opp.phone); setFormStage(opp.stage); setFormNotes(opp.notes || '');
    setFormPriority(opp.priority || 'medium'); setFormClose(opp.expected_close || '');
    setIsDetailOpen(true);
  };

  // ── CRUD: Stage ───────────────────────────────────────────────────────────
  const openCreateStage = () => {
    setEditingStage(null); setStageFormTitle(''); setStageFormColor('blue'); setIsStageFormOpen(true);
  };

  const openEditStage = (stage: StageConfig) => {
    setEditingStage(stage); setStageFormTitle(stage.title); setStageFormColor(stage.color); setIsStageFormOpen(true);
  };

  const handleSaveStage = () => {
    if (!stageFormTitle.trim()) { toast({ title: 'El nombre es obligatorio', variant: 'destructive' }); return; }
    if (editingStage) {
      setStages(prev => prev.map(s => s.id === editingStage.id ? { ...s, title: stageFormTitle.trim(), color: stageFormColor } : s));
      toast({ title: 'Etapa actualizada' });
    } else {
      const slug = toSlug(stageFormTitle);
      if (stages.find(s => s.id === slug)) { toast({ title: 'Ya existe una etapa con ese nombre', variant: 'destructive' }); return; }
      const newStage: StageConfig = { id: slug, title: stageFormTitle.trim(), color: stageFormColor, order: stages.length };
      setStages(prev => [...prev, newStage]);
      toast({ title: '¡Etapa creada!', description: stageFormTitle.trim() });
    }
    setIsStageFormOpen(false);
  };

  const handleDeleteStage = (stageId: string) => {
    const count = opportunities.filter(o => o.stage === stageId).length;
    const msg = count > 0
      ? `Esta etapa tiene ${count} oportunidad(es). Al eliminarla, quedarán sin etapa. ¿Continuar?`
      : '¿Eliminar esta etapa?';
    if (!window.confirm(msg)) return;
    setStages(prev => prev.filter(s => s.id !== stageId).map((s, i) => ({ ...s, order: i })));
    toast({ title: 'Etapa eliminada' });
  };

  const moveStage = (id: string, dir: 'up' | 'down') => {
    const sorted = [...stages].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(s => s.id === id);
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === sorted.length - 1) return;
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    [sorted[idx].order, sorted[swapIdx].order] = [sorted[swapIdx].order, sorted[idx].order];
    setStages([...sorted]);
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, id: string) => { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; };
  const onDragOver  = (e: React.DragEvent, stage: string) => { e.preventDefault(); setDragOverCol(stage); };
  const onDragLeave = () => setDragOverCol(null);
  const onDrop      = (e: React.DragEvent, stage: string) => { e.preventDefault(); setDragOverCol(null); const id = e.dataTransfer.getData('text/plain'); if (id) handleStageChange(id, stage); };

  // ── Filtering / Sorting ───────────────────────────────────────────────────
  const sortedStages = useMemo(() => [...stages].sort((a, b) => a.order - b.order), [stages]);

  const processedOpportunities = useMemo(() => {
    let list = [...opportunities];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o => o.title.toLowerCase().includes(q) || o.client_name.toLowerCase().includes(q) || o.company_name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q));
    }
    filters.forEach(f => {
      list = list.filter(o => {
        const val = String((o as any)[f.field] || '').toLowerCase();
        const fv = f.value.toLowerCase();
        if (f.operator === 'contains') return val.includes(fv);
        if (f.operator === 'equals')   return val === fv;
        if (f.operator === 'gt')       return parseFloat(val) > parseFloat(fv);
        if (f.operator === 'lt')       return parseFloat(val) < parseFloat(fv);
        return true;
      });
    });
    if (sortConfig) {
      list.sort((a, b) => {
        const cmp = String((a as any)[sortConfig.field] ?? '').localeCompare(String((b as any)[sortConfig.field] ?? ''), undefined, { numeric: true });
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [opportunities, searchQuery, filters, sortConfig]);

  const columnsData = useMemo(() => {
    const data = {} as Record<string, { list: Opportunity[]; totalValue: number }>;
    sortedStages.forEach(s => { data[s.id] = { list: [], totalValue: 0 }; });
    processedOpportunities.forEach(o => {
      if (data[o.stage]) { data[o.stage].list.push(o); data[o.stage].totalValue += o.value; }
    });
    return data;
  }, [processedOpportunities, sortedStages]);

  const totalPipeline = useMemo(() => opportunities.reduce((s, o) => s + o.value, 0), [opportunities]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!opportunities.length) { toast({ title: 'Sin datos para exportar' }); return; }
    const hdr = 'ID,Titulo,Cliente,Empresa,Valor,Etapa,Email,Telefono,Prioridad,CierreEsperado,Notas\n';
    const rows = opportunities.map(o =>
      `"${o.id}","${o.title}","${o.client_name}","${o.company_name}",${o.value},"${o.stage}","${o.email}","${o.phone}","${o.priority||''}","${o.expected_close||''}","${o.notes||''}"`
    ).join('\n');
    const blob = new Blob([hdr + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `oportunidades_${selectedPipeline.replace(/ /g,'_').toLowerCase()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast({ title: 'CSV exportado' });
  };

  // ── Field visibility ──────────────────────────────────────────────────────
  const toggleField = (id: string) =>
    setFields(f => f.map(field => field.id === id && !field.required ? { ...field, visible: !field.visible } : field));
  const isFieldVisible = (id: string) => fields.find(f => f.id === id)?.visible ?? false;

  // ── Opportunity Form (plain function, NOT a component, to avoid remount on each render) ──
  const renderOpportunityForm = () => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">Nombre de la oportunidad *</Label>
        <Input placeholder="Ej: Licencia Anual AFE Gym" value={formTitle} onChange={e => setFormTitle(e.target.value)} required className="border-slate-200 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Contacto / Cliente</Label>
          <Input placeholder="Juan Pérez" value={formClientName} onChange={e => setFormClientName(e.target.value)} className="border-slate-200 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Empresa</Label>
          <Input placeholder="AFE Gym S.A." value={formCompanyName} onChange={e => setFormCompanyName(e.target.value)} className="border-slate-200 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Valor (USD)</Label>
          <Input type="number" min="0" step="any" value={formValue} onChange={e => setFormValue(e.target.value)} className="border-slate-200 font-semibold text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Etapa</Label>
          <select value={formStage || defaultStageId} onChange={e => setFormStage(e.target.value)} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {sortedStages.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Email</Label>
          <Input type="email" placeholder="correo@empresa.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="border-slate-200 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Teléfono</Label>
          <Input placeholder="+54 9 ..." value={formPhone} onChange={e => setFormPhone(e.target.value)} className="border-slate-200 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Prioridad</Label>
          <select value={formPriority} onChange={e => setFormPriority(e.target.value as any)} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Fecha de cierre esperada</Label>
          <Input type="date" value={formClose} onChange={e => setFormClose(e.target.value)} className="border-slate-200 text-sm" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">Notas</Label>
        <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Detalles del contacto..." rows={3}
          className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="bg-[#f9fafb] min-h-screen flex flex-col">

      {/* ── TOOLBAR ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left */}
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-slate-900 mr-1">Clientes Potenciales</h1>
          <div className="relative">
            <select value={selectedPipeline} onChange={e => setSelectedPipeline(e.target.value)}
              className="appearance-none bg-white border border-slate-300 text-slate-800 text-sm font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
              <option>Comercial B2B</option>
              <option>Servicios Premium</option>
              <option>Suscripciones SaaS</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
          <span className="text-sm text-slate-500 font-medium">
            <span className="font-bold text-slate-700">{processedOpportunities.length}</span>{' '}
            {processedOpportunities.length === 1 ? 'cliente potencial' : 'clientes potenciales'}
          </span>
          <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-semibold">
            Pipeline: ${totalPipeline.toLocaleString()} USD
          </span>
        </div>
        {/* Right */}
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg p-1 bg-slate-50 gap-0.5">
            <button onClick={() => setViewMode('grid')} title="Vista Kanban"
              className={`p-1.5 rounded-md transition-colors ${viewMode==='grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('list')} title="Vista Lista"
              className={`p-1.5 rounded-md transition-colors ${viewMode==='list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Gestionar etapas ← NEW button */}
          <button onClick={() => setIsStagesOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-sm font-semibold transition-colors">
            <Kanban className="h-3.5 w-3.5" />
            Etapas ({stages.length})
          </button>

          <button onClick={() => { resetForm(); setIsCreateOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Añadir oportunidad
          </button>

          {/* 3-dot menu: Importar / Exportar */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(p => !p)}
              className={`p-1.5 rounded-lg border transition-colors ${
                isMenuOpen
                  ? 'border-slate-300 bg-slate-100 text-slate-700'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {isMenuOpen && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl border border-slate-200 shadow-lg z-20 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button onClick={() => { setIsMenuOpen(false); setIsImportOpen(true); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    <Upload className="h-3.5 w-3.5 text-slate-400" /> Importar CSV
                  </button>
                  <button onClick={() => { setIsMenuOpen(false); handleExport(); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    <Download className="h-3.5 w-3.5 text-slate-400" /> Exportar CSV
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── FILTER BAR ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsFiltersOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filters.length>0 ? 'border-blue-300 text-blue-700 bg-blue-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros{filters.length>0 ? ` (${filters.length})` : ''}
          </button>
          <button onClick={() => setIsSortOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${sortConfig ? 'border-blue-300 text-blue-700 bg-blue-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <ArrowUpDown className="h-3.5 w-3.5" />
            Ordenar{sortConfig ? ' (1)' : ''}
          </button>
          {(filters.length>0 || sortConfig) && (
            <button onClick={() => { setFilters([]); setSortConfig(null); }}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors">
              <X className="h-3.5 w-3.5" /> Limpiar
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar Clientes Potenciales..."
              className="pl-8 h-8 text-xs border-slate-200 bg-slate-50 focus:bg-white" />
          </div>
          <button onClick={() => setIsFieldsOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors whitespace-nowrap">
            <Settings className="h-3.5 w-3.5" /> Gestionar campos
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
            <p className="text-sm text-slate-500">Cargando embudo de ventas...</p>
          </div>

        ) : stages.length === 0 ? (
          /* No stages */
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border-2 border-dashed border-violet-200 text-center">
            <Kanban className="h-12 w-12 text-violet-300 mb-4" />
            <p className="text-base font-bold text-slate-700 mb-1">No hay etapas configuradas</p>
            <p className="text-sm text-slate-400 mb-6">Crea tu primera etapa para empezar a organizar tus oportunidades</p>
            <button onClick={() => setIsStagesOpen(true)}
              className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold transition-colors">
              <Plus className="h-4 w-4" /> Crear primera etapa
            </button>
          </div>

        ) : processedOpportunities.length === 0 && !searchQuery && filters.length === 0 ? (
          /* No opps */
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 text-center">
            <div className="w-40 h-32 mb-6 opacity-60">
              <svg viewBox="0 0 200 130" fill="none" className="w-full h-full">
                <rect x="30" y="20" width="70" height="90" rx="6" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
                <line x1="42" y1="42" x2="88" y2="42" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="42" y1="56" x2="78" y2="56" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="130" cy="85" r="30" fill="white" stroke="#3b82f6" strokeWidth="3" />
                <text x="121" y="93" fill="#3b82f6" fontSize="26" fontWeight="bold">?</text>
              </svg>
            </div>
            <p className="text-base font-bold text-slate-700 mb-1">No hay clientes potenciales</p>
            <p className="text-sm text-slate-400 mb-6">Añade tu primera oportunidad al embudo</p>
            <button onClick={() => { resetForm(); setIsCreateOpen(true); }}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
              <Plus className="h-4 w-4" /> Añadir oportunidad
            </button>
          </div>

        ) : processedOpportunities.length === 0 ? (
          /* No results */
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 text-center">
            <Filter className="h-10 w-10 text-slate-300 mb-4" />
            <p className="text-base font-bold text-slate-700 mb-1">Sin resultados</p>
            <p className="text-sm text-slate-400 mb-6">No hay clientes potenciales que coincidan con los filtros activos.</p>
            <button onClick={() => { setFilters([]); setSortConfig(null); setSearchQuery(''); }}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors">
              <X className="h-4 w-4" /> Limpiar filtros
            </button>
          </div>

        ) : viewMode === 'grid' ? (
          /* ── KANBAN BOARD ── */
          <div className="overflow-x-auto pb-4 -mx-6 px-6">
            <div className="flex gap-4 min-w-max items-start">
              {sortedStages.map(col => {
                const clr = getColor(col.color);
                const { list, totalValue } = columnsData[col.id] ?? { list: [], totalValue: 0 };
                const isOver = dragOverCol === col.id;
                return (
                  <div key={col.id}
                    onDragOver={e => onDragOver(e, col.id)} onDragLeave={onDragLeave} onDrop={e => onDrop(e, col.id)}
                    className={`flex flex-col w-64 rounded-xl border-2 border-t-4 ${clr.top} transition-colors ${isOver ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 bg-slate-100/40'}`}>
                    {/* Column Header */}
                    <div className="px-3 pt-2.5 pb-2.5 border-b border-slate-200 bg-white rounded-t-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider truncate">{col.title}</span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full ml-1.5 flex-shrink-0">{list.length}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">${totalValue.toLocaleString('es-AR', { minimumFractionDigits: 0 })} USD</span>
                    </div>
                    {/* Cards */}
                    <div className="flex-1 p-2 space-y-1.5 min-h-[65vh] overflow-y-auto">
                      {list.length === 0 ? (
                        <div className={`h-full min-h-[100px] rounded-lg border-2 border-dashed flex items-center justify-center text-[10px] text-slate-300 transition-colors ${isOver ? 'border-blue-300 bg-blue-50/60 text-blue-400' : 'border-slate-200'}`}>
                          Arrastra aquí
                        </div>
                      ) : list.map(opp => {
                        const pr = PRIORITY_LABELS[opp.priority || 'medium'];
                        return (
                          <div key={opp.id} draggable onDragStart={e => onDragStart(e, opp.id)} onClick={() => openDetail(opp)}
                            className="bg-white rounded-md border border-slate-200/80 px-2.5 py-1.5 hover:border-slate-300 hover:bg-slate-50/40 cursor-pointer group transition-all relative overflow-hidden">
                            <div className={`absolute inset-y-0 left-0 w-0.5 ${clr.dot}`} />
                            <div className="pl-2">
                              {/* Title + priority badge inline */}
                              <div className="flex items-start justify-between gap-1.5 mb-0.5">
                                <h4 className="text-[11px] font-semibold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight flex-1">{opp.title}</h4>
                                {isFieldVisible('priority') && (
                                  <span className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded leading-none ${pr.color}`}>{pr.label}</span>
                                )}
                              </div>
                              {/* Secondary info — all on one compact row */}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0">
                                {isFieldVisible('client_name') && opp.client_name && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5 leading-none"><User className="h-2.5 w-2.5 flex-shrink-0" />{opp.client_name}</span>
                                )}
                                {isFieldVisible('company_name') && opp.company_name && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5 leading-none"><Briefcase className="h-2.5 w-2.5 flex-shrink-0" />{opp.company_name}</span>
                                )}
                                {isFieldVisible('email') && opp.email && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5 leading-none"><Mail className="h-2.5 w-2.5 flex-shrink-0" />{opp.email}</span>
                                )}
                                {isFieldVisible('phone') && opp.phone && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5 leading-none"><Phone className="h-2.5 w-2.5 flex-shrink-0" />{opp.phone}</span>
                                )}
                                {isFieldVisible('expected_close') && opp.expected_close && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5 leading-none"><Calendar className="h-2.5 w-2.5 flex-shrink-0" />{opp.expected_close}</span>
                                )}
                              </div>
                              {/* Value — tiny, right-aligned, no border */}
                              {isFieldVisible('value') && opp.value > 0 && (
                                <div className="flex justify-end mt-1">
                                  <span className="text-[10px] font-bold text-slate-500">${opp.value.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Add button at bottom of column */}
                    <button onClick={() => { resetForm(); setFormStage(col.id); setIsCreateOpen(true); }}
                      className="mx-2 mb-2 flex items-center gap-1 px-2 py-1.5 rounded-md border border-dashed border-slate-300/70 text-[10px] text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                      <Plus className="h-3 w-3" /> Añadir
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        ) : (
          /* ── LIST VIEW ─────────────────────────────────────────────────── */
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {['Oportunidad','Cliente','Empresa','Valor','Prioridad','Etapa','Acciones'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedOpportunities.map(opp => {
                  const col = stages.find(s => s.id === opp.stage);
                  const clr = getColor(col?.color ?? 'slate');
                  const pr = PRIORITY_LABELS[opp.priority||'medium'];
                  return (
                    <tr key={opp.id} className="hover:bg-slate-50/60 transition-colors text-sm">
                      <td className="px-5 py-3.5 font-semibold text-slate-800 max-w-xs truncate">{opp.title}</td>
                      <td className="px-5 py-3.5 text-slate-600">{opp.client_name}</td>
                      <td className="px-5 py-3.5 text-slate-500">{opp.company_name || '—'}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-700">${opp.value.toLocaleString()}</td>
                      <td className="px-5 py-3.5"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pr.color}`}>{pr.label}</span></td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${clr.badge}`}>{col?.title ?? opp.stage}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openDetail(opp)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="h-3.5 w-3.5" /></button>
                          <button onClick={() => handleDelete(opp.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════ MODALS ══════════════════════════════════════ */}

      {/* ── CREATE OPP ─────────────────────────────────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-blue-500" /> Nueva Oportunidad</DialogTitle>
            <DialogDescription>Registra los datos del cliente potencial.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>{renderOpportunityForm()}
            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Crear oportunidad</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT OPP ───────────────────────────────────────────────────────── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-lg font-bold pr-8">
              <span className="flex items-center gap-2"><Layers className="h-5 w-5 text-purple-500" /> Detalle de Oportunidad</span>
              {selectedOpportunity && (
                <button onClick={() => handleDelete(selectedOpportunity.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
              )}
            </DialogTitle>
            <DialogDescription>Edita los datos o cambia la etapa manualmente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>{renderOpportunityForm()}
            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Guardar cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          ── GESTIONAR ETAPAS ── (NEW)
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={isStagesOpen} onOpenChange={setIsStagesOpen}>
        <DialogContent className="sm:max-w-[540px] rounded-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Kanban className="h-5 w-5 text-violet-500" /> Gestionar etapas del tablero
            </DialogTitle>
            <DialogDescription>
              Crea, edita, reordena o elimina las columnas de tu embudo de ventas.
            </DialogDescription>
          </DialogHeader>

          {/* Stage list */}
          <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
            {sortedStages.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center text-slate-400 gap-2">
                <Kanban className="h-10 w-10 text-slate-200" />
                <p className="text-sm font-medium">No hay etapas todavía</p>
                <p className="text-xs">Usa el botón de abajo para crear tu primera etapa</p>
              </div>
            ) : sortedStages.map((stage, idx) => {
              const clr = getColor(stage.color);
              const oppCount = (columnsData[stage.id]?.list ?? []).length;
              const totalVal = columnsData[stage.id]?.totalValue ?? 0;
              return (
                <div key={stage.id}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors group">
                  {/* Order controls */}
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveStage(stage.id, 'up')} disabled={idx===0}
                      className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors rounded">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => moveStage(stage.id, 'down')} disabled={idx===sortedStages.length-1}
                      className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors rounded">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Color dot */}
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${clr.dot}`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{stage.title}</p>
                    <p className="text-xs text-slate-400">
                      {oppCount} {oppCount===1?'oportunidad':'oportunidades'}
                      {totalVal > 0 && <span className="ml-2 font-medium text-slate-500">${totalVal.toLocaleString()} USD</span>}
                    </p>
                  </div>

                  {/* Color badge */}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${clr.badge} capitalize hidden sm:inline`}>
                    {clr.label}
                  </span>

                  {/* Order badge */}
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                    {idx+1}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditStage(stage)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteStage(stage.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 pt-4 flex items-center gap-3">
            <button onClick={openCreateStage}
              className="flex items-center gap-2 flex-1 justify-center px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors">
              <Plus className="h-4 w-4" /> Crear nueva etapa
            </button>
            <button onClick={() => { setStages(DEFAULT_STAGES); toast({ title: 'Etapas restablecidas' }); }}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors">
              Restablecer
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── STAGE FORM (create / edit) ──────────────────────────────────────── */}
      <Dialog open={isStageFormOpen} onOpenChange={setIsStageFormOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              {editingStage ? <><Edit className="h-5 w-5 text-blue-500" /> Editar etapa</> : <><Plus className="h-5 w-5 text-violet-500" /> Nueva etapa</>}
            </DialogTitle>
            <DialogDescription>{editingStage ? 'Modifica el nombre y color de la etapa.' : 'Define el nombre y color de la nueva columna del tablero.'}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Nombre de la etapa *</Label>
              <Input
                placeholder="Ej: En negociación avanzada"
                value={stageFormTitle}
                onChange={e => setStageFormTitle(e.target.value)}
                className="border-slate-200 text-sm"
                autoFocus
              />
              {stageFormTitle && !editingStage && (
                <p className="text-[10px] text-slate-400">ID generado: <code className="bg-slate-100 px-1 rounded">{toSlug(stageFormTitle)}</code></p>
              )}
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Color de la etapa</Label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.name} onClick={() => setStageFormColor(c.name)} title={c.label}
                    className={`relative w-full aspect-square rounded-xl transition-all ${stageFormColor===c.name ? 'ring-2 ring-offset-2 ring-slate-700 scale-110' : 'hover:scale-105'}`}
                    style={{ background: c.swatch }}>
                    {stageFormColor===c.name && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <svg className="h-3.5 w-3.5 text-white drop-shadow" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {/* Preview */}
              <div className="flex items-center gap-2 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className={`w-3 h-3 rounded-full ${getColor(stageFormColor).dot}`} />
                <span className="text-sm font-semibold text-slate-700">{stageFormTitle || 'Vista previa'}</span>
                <span className={`ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full ${getColor(stageFormColor).badge}`}>0 oportunidades</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStageFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveStage} className="bg-violet-600 hover:bg-violet-700 text-white">
              {editingStage ? 'Guardar cambios' : 'Crear etapa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── GESTIONAR CAMPOS ────────────────────────────────────────────────── */}
      <Dialog open={isFieldsOpen} onOpenChange={setIsFieldsOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold"><Settings className="h-5 w-5 text-slate-600" /> Gestionar campos</DialogTitle>
            <DialogDescription>Activa o desactiva los campos visibles en las tarjetas del Kanban.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            {fields.map(field => (
              <div key={field.id} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-colors ${field.visible ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-400">{field.icon}</span>
                  <span className="text-sm font-medium text-slate-700">{field.label}</span>
                  {field.required && <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">Siempre visible</span>}
                </div>
                <button onClick={() => toggleField(field.id)} disabled={field.required}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${field.visible ? 'bg-blue-500' : 'bg-slate-200'} ${field.required ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${field.visible ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsFieldsOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white w-full">Aplicar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── FILTROS AVANZADOS ───────────────────────────────────────────────── */}
      <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold"><Filter className="h-5 w-5 text-blue-500" /> Filtros avanzados</DialogTitle>
            <DialogDescription>Filtra tus oportunidades por cualquier campo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {filters.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl p-3 border border-slate-200">
                <select value={f.field} onChange={e => setFilters(prev => prev.map((x,j)=>j===i?{...x,field:e.target.value as any}:x))}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="title">Nombre</option>
                  <option value="client_name">Cliente</option>
                  <option value="company_name">Empresa</option>
                  <option value="value">Valor</option>
                  <option value="email">Email</option>
                  <option value="stage">Etapa</option>
                </select>
                <select value={f.operator} onChange={e => setFilters(prev => prev.map((x,j)=>j===i?{...x,operator:e.target.value as any}:x))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="contains">contiene</option>
                  <option value="equals">igual a</option>
                  <option value="gt">mayor que</option>
                  <option value="lt">menor que</option>
                </select>
                <Input value={f.value} onChange={e => setFilters(prev => prev.map((x,j)=>j===i?{...x,value:e.target.value}:x))}
                  placeholder="valor..." className="flex-1 h-8 text-sm border-slate-200" />
                <button onClick={() => setFilters(prev => prev.filter((_,j)=>j!==i))} className="text-slate-400 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
              </div>
            ))}
            <button onClick={() => setFilters(prev => [...prev, { field:'title', operator:'contains', value:'' }])}
              className="flex items-center gap-2 w-full px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
              <Plus className="h-4 w-4" /> Agregar condición
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFilters([]); setIsFiltersOpen(false); }}>Limpiar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsFiltersOpen(false)}>Aplicar filtros</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ORDENAR ─────────────────────────────────────────────────────────── */}
      <Dialog open={isSortOpen} onOpenChange={setIsSortOpen}>
        <DialogContent className="sm:max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold"><ArrowUpDown className="h-5 w-5 text-blue-500" /> Ordenar resultados</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Ordenar por</Label>
              <select value={sortConfig?.field||'created_at'} onChange={e => setSortConfig(p => ({field:e.target.value as any, direction:p?.direction||'desc'}))}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="created_at">Fecha de creación</option>
                <option value="title">Nombre</option>
                <option value="value">Valor económico</option>
                <option value="client_name">Cliente</option>
                <option value="company_name">Empresa</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Dirección</Label>
              <div className="flex gap-2">
                {(['asc','desc'] as const).map(dir => (
                  <button key={dir} onClick={() => setSortConfig(p => ({field:p?.field||'created_at', direction:dir}))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${(sortConfig?.direction||'desc')===dir ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {dir==='asc' ? '↑ Ascendente' : '↓ Descendente'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSortConfig(null); setIsSortOpen(false); }}>Sin ordenar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsSortOpen(false)}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── IMPORTAR ────────────────────────────────────────────────────────── */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold"><Upload className="h-5 w-5 text-blue-500" /> Importar Clientes Potenciales</DialogTitle>
            <DialogDescription>Sube un archivo CSV con tus datos de oportunidades.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div onClick={() => toast({ title: 'Próximamente', description: 'Usa Exportar para obtener la plantilla CSV.' })}
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center gap-3 text-center hover:border-blue-300 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 text-slate-300" />
              <div><p className="text-sm font-semibold text-slate-600">Haz clic para seleccionar un archivo CSV</p><p className="text-xs text-slate-400 mt-1">o arrastra y suelta aquí</p></div>
              <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Formato: .csv</span>
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">¿No tienes la plantilla?{' '}
              <button onClick={handleExport} className="text-blue-600 hover:underline font-medium">Exportar plantilla CSV</button>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancelar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setIsImportOpen(false); toast({ title: 'Próximamente disponible' }); }}>Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
