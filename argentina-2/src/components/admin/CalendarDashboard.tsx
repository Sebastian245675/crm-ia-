import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { db, collection, getDocs } from '@/firebase';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Check,
  X,
  Clock,
  User,
  Settings,
  List,
  Grid,
  CalendarDays,
  MoreVertical,
  Trash2,
  Edit,
  AlertCircle
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  type: 'cita' | 'bloqueo';
  status: 'pendiente' | 'confirmada' | 'cancelada';
  assignedUser: string;
  calendarId: string;
  notes?: string;
  created_at?: string;
}

interface CustomCalendar {
  id: string;
  name: string;
  color: string;
}

const DEFAULT_CALENDARS: CustomCalendar[] = [
  { id: 'general', name: 'Calendario General', color: '#3b82f6' },
  { id: 'citas', name: 'Citas de Ventas', color: '#10b981' },
  { id: 'inmobiliaria', name: 'Asesoría Inmobiliaria', color: '#8b5cf6' },
];

export const CalendarDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'calendar' | 'list' | 'settings'>('calendar');
  const [calendarViewMode, setCalendarViewMode] = useState<'week' | 'day' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [customCalendars, setCustomCalendars] = useState<CustomCalendar[]>(DEFAULT_CALENDARS);
  const [usersList, setUsersList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [selectedCalendarFilter, setSelectedCalendarFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all'); // all, cita, bloqueo
  const [searchQuery, setSearchQuery] = useState('');

  // Event Modal State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  // Event Form State
  const [eventTitle, setEventTitle] = useState('');
  const [eventClientName, setEventClientName] = useState('');
  const [eventClientEmail, setEventClientEmail] = useState('');
  const [eventClientPhone, setEventClientPhone] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndTime, setEventEndTime] = useState('10:00');
  const [eventType, setEventType] = useState<'cita' | 'bloqueo'>('cita');
  const [eventStatus, setEventStatus] = useState<'pendiente' | 'confirmada' | 'cancelada'>('pendiente');
  const [eventAssignedUser, setEventAssignedUser] = useState('');
  const [eventCalendarId, setEventCalendarId] = useState('general');
  const [eventNotes, setEventNotes] = useState('');

  // Settings State
  const [settingsStartHour, setSettingsStartHour] = useState('08:00');
  const [settingsEndHour, setSettingsEndHour] = useState('20:00');
  const [settingsWorkDays, setSettingsWorkDays] = useState<string[]>(['1', '2', '3', '4', '5']); // Mon - Fri

  const isSupabase = typeof (db as any)?.from === 'function';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let currentEmployees: string[] = [];
      try {
        const querySnapshot = await getDocs(collection(db, "empleados"));
        currentEmployees = querySnapshot.docs.map(doc => {
          const d = doc.data();
          return d?.nombre || d?.name || '';
        }).filter(Boolean);
      } catch (err) {
        console.error('Error fetching employees:', err);
      }

      const activeEmployees = currentEmployees.length > 0 ? currentEmployees : ['Administrador'];
      setUsersList(activeEmployees);

      if (isSupabase) {
        // Load custom calendars
        const { data: calendarsData } = await db.from('calendar_settings').select('*').eq('id', 'calendars').maybeSingle();
        if (calendarsData && calendarsData.list) {
          setCustomCalendars(calendarsData.list);
        }

        // Load hours settings
        const { data: hoursData } = await db.from('calendar_settings').select('*').eq('id', 'work_hours').maybeSingle();
        if (hoursData) {
          setSettingsStartHour(hoursData.start || '08:00');
          setSettingsEndHour(hoursData.end || '20:00');
          setSettingsWorkDays(hoursData.workDays || ['1', '2', '3', '4', '5']);
        }

        // Load events
        const { data: eventsData } = await db.from('calendar_events').select('*');
        if (eventsData && eventsData.length > 0) {
          setEvents(eventsData);
        } else {
          // Seed mock events if empty
          const mockEvents = getMockEvents(activeEmployees[0]);
          setEvents(mockEvents);
          // Save mock events to DB
          for (const ev of mockEvents) {
            await db.from('calendar_events').insert([ev]);
          }
        }
      }
    } catch (e) {
      console.error('Error loading calendar data:', e);
      setEvents(getMockEvents('Administrador'));
    } finally {
      setLoading(false);
    }
  };

  const getMockEvents = (assignedName: string): CalendarEvent[] => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    return [
      {
        id: 'mock-1',
        title: 'Asesoría Inmobiliaria - Casa Palermo',
        clientName: 'Juan Pérez',
        clientEmail: 'juan.perez@gmail.com',
        clientPhone: '1123456789',
        date: todayStr,
        startTime: '10:00',
        endTime: '11:00',
        type: 'cita',
        status: 'confirmada',
        assignedUser: assignedName,
        calendarId: 'inmobiliaria',
        notes: 'Interesado en casa de 3 habitaciones con m2 de jardín.'
      },
      {
        id: 'mock-2',
        title: 'Llamada de Venta - Perfumes Importados',
        clientName: 'María Rodríguez',
        clientEmail: 'maria.rod@hotmail.com',
        clientPhone: '1198765432',
        date: todayStr,
        startTime: '14:30',
        endTime: '15:30',
        type: 'cita',
        status: 'pendiente',
        assignedUser: assignedName,
        calendarId: 'citas',
        notes: 'Quiere cotización para lote mayorista.'
      },
      {
        id: 'mock-3',
        title: 'Almuerzo de Equipo (Bloqueado)',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        date: tomorrowStr,
        startTime: '13:00',
        endTime: '14:30',
        type: 'bloqueo',
        status: 'confirmada',
        assignedUser: assignedName,
        calendarId: 'general'
      }
    ];
  };

  // Save Settings Helper
  const handleSaveSettings = async () => {
    try {
      if (isSupabase) {
        await db.from('calendar_settings').upsert({
          id: 'work_hours',
          start: settingsStartHour,
          end: settingsEndHour,
          workDays: settingsWorkDays
        });
        toast({ title: 'Ajustes guardados', description: 'El horario de trabajo se actualizó correctamente.' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: e.message });
    }
  };

  // Add Calendar Helper
  const handleAddCalendar = async (name: string, color: string) => {
    const newCalendar: CustomCalendar = {
      id: slugify(name),
      name,
      color
    };
    const newList = [...customCalendars, newCalendar];
    setCustomCalendars(newList);
    try {
      if (isSupabase) {
        await db.from('calendar_settings').upsert({
          id: 'calendars',
          list: newList
        });
        toast({ title: 'Calendario agregado', description: `Se creó el calendario "${name}".` });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  // Delete Calendar Helper
  const handleDeleteCalendar = async (id: string) => {
    if (customCalendars.length <= 1) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debe haber al menos un calendario.' });
      return;
    }
    const newList = customCalendars.filter(c => c.id !== id);
    setCustomCalendars(newList);
    try {
      if (isSupabase) {
        await db.from('calendar_settings').upsert({
          id: 'calendars',
          list: newList
        });
        toast({ title: 'Calendario eliminado', description: 'El calendario fue eliminado.' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  // Save Event Action
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (eventType === 'cita' && !eventClientName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'El nombre del cliente es obligatorio.' });
      return;
    }
    if (!eventDate || !eventStartTime || !eventEndTime) {
      toast({ variant: 'destructive', title: 'Error', description: 'La fecha y las horas son obligatorias.' });
      return;
    }

    const title = eventTitle.trim() || (eventType === 'bloqueo' ? 'Bloqueado' : `Cita con ${eventClientName}`);
    const eventData: CalendarEvent = {
      id: selectedEvent?.id || `event-${Date.now()}`,
      title,
      clientName: eventType === 'bloqueo' ? '' : eventClientName,
      clientEmail: eventType === 'bloqueo' ? '' : eventClientEmail,
      clientPhone: eventType === 'bloqueo' ? '' : eventClientPhone,
      date: eventDate,
      startTime: eventStartTime,
      endTime: eventEndTime,
      type: eventType,
      status: eventStatus,
      assignedUser: eventAssignedUser || usersList[0] || 'Administrador',
      calendarId: eventCalendarId,
      notes: eventNotes
    };

    try {
      if (isSupabase) {
        const { error } = await db.from('calendar_events').upsert(eventData);
        if (error) throw error;

        toast({
          title: selectedEvent ? 'Cita modificada' : 'Cita programada',
          description: `La cita "${title}" se guardó correctamente.`
        });
        
        setIsEventModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: err.message });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta cita?')) return;
    try {
      if (isSupabase) {
        const { error } = await db.from('calendar_events').delete().eq('id', id);
        if (error) throw error;
        toast({ title: 'Cita eliminada', description: 'La cita fue eliminada del calendario.' });
        setIsEventModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error al eliminar', description: err.message });
    }
  };

  const openCreateModal = (dateStr?: string, timeStr?: string) => {
    setSelectedEvent(null);
    setEventTitle('');
    setEventClientName('');
    setEventClientEmail('');
    setEventClientPhone('');
    setEventDate(dateStr || new Date().toISOString().split('T')[0]);
    setEventStartTime(timeStr || '09:00');
    setEventEndTime(timeStr ? incrementTime(timeStr) : '10:00');
    setEventType('cita');
    setEventStatus('pendiente');
    setEventAssignedUser(usersList[0] || 'Administrador');
    setEventCalendarId(customCalendars[0]?.id || 'general');
    setEventNotes('');
    setIsEventModalOpen(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventTitle(event.title);
    setEventClientName(event.clientName);
    setEventClientEmail(event.clientEmail);
    setEventClientPhone(event.clientPhone);
    setEventDate(event.date);
    setEventStartTime(event.startTime);
    setEventEndTime(event.endTime);
    setEventType(event.type);
    setEventStatus(event.status);
    setEventAssignedUser(event.assignedUser);
    setEventCalendarId(event.calendarId);
    setEventNotes(event.notes || '');
    setIsEventModalOpen(true);
  };

  const incrementTime = (time: string): string => {
    const [h, m] = time.split(':').map(Number);
    const newH = (h + 1) % 24;
    return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Navigation Logic
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (calendarViewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else if (calendarViewMode === 'day') {
      newDate.setDate(currentDate.getDate() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (calendarViewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else if (calendarViewMode === 'day') {
      newDate.setDate(currentDate.getDate() + 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // Get date range string (e.g. "8 - 14 jun 2026")
  const dateRangeLabel = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    const locale = 'es-AR';

    if (calendarViewMode === 'day') {
      return currentDate.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    }
    
    if (calendarViewMode === 'month') {
      return currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    }

    // Week mode
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startOfWeek.setDate(diff);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startLabel = startOfWeek.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    const endLabel = endOfWeek.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    
    return `${startLabel} - ${endLabel}`;
  }, [currentDate, calendarViewMode]);

  // Week Days representation
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Mon is start
    startOfWeek.setDate(diff);

    return Array.from({ length: 7 }).map((_, idx) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + idx);
      return date;
    });
  }, [currentDate]);

  // Hours array based on settings
  const hoursArray = useMemo(() => {
    const start = parseInt(settingsStartHour.split(':')[0]);
    const end = parseInt(settingsEndHour.split(':')[0]);
    return Array.from({ length: end - start + 1 }).map((_, idx) => {
      const h = start + idx;
      return `${String(h).padStart(2, '0')}:00`;
    });
  }, [settingsStartHour, settingsEndHour]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesUser = selectedUserFilter === 'all' || e.assignedUser === selectedUserFilter;
      const matchesCalendar = selectedCalendarFilter === 'all' || e.calendarId === selectedCalendarFilter;
      const matchesType = selectedTypeFilter === 'all' || e.type === selectedTypeFilter;
      
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = !searchLower || 
        (e.title && e.title.toLowerCase().includes(searchLower)) ||
        (e.clientName && e.clientName.toLowerCase().includes(searchLower)) ||
        (e.clientEmail && e.clientEmail.toLowerCase().includes(searchLower)) ||
        (e.clientPhone && e.clientPhone.toLowerCase().includes(searchLower)) ||
        (e.notes && e.notes.toLowerCase().includes(searchLower));

      return matchesUser && matchesCalendar && matchesType && matchesSearch;
    });
  }, [events, selectedUserFilter, selectedCalendarFilter, selectedTypeFilter, searchQuery]);

  // Map events to date & hour for week view rendering
  const getEventsForSlot = (dateStr: string, hourStr: string) => {
    const targetHour = parseInt(hourStr.split(':')[0]);
    return filteredEvents.filter(e => {
      if (e.date !== dateStr) return false;
      const startH = parseInt(e.startTime.split(':')[0]);
      return startH === targetHour;
    });
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 min-h-screen bg-slate-50 p-1">
      {/* Sidebar Filters */}
      <div className="w-full xl:w-72 flex-shrink-0 space-y-5">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-slate-800">Gestionar la Vista</CardTitle>
            <CardDescription>Filtros y clasificaciones rápidas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Filter by Type */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ver por Tipo</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="type-filter"
                    checked={selectedTypeFilter === 'all'}
                    onChange={() => setSelectedTypeFilter('all')}
                    className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>Todo</span>
                </label>
                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="type-filter"
                    checked={selectedTypeFilter === 'cita'}
                    onChange={() => setSelectedTypeFilter('cita')}
                    className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>Citas</span>
                </label>
                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="type-filter"
                    checked={selectedTypeFilter === 'bloqueo'}
                    onChange={() => setSelectedTypeFilter('bloqueo')}
                    className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>Franjas horarias bloqueadas</span>
                </label>
              </div>
            </div>

            {/* Filter by Calendar */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Calendarios</Label>
              <Select value={selectedCalendarFilter} onValueChange={setSelectedCalendarFilter}>
                <SelectTrigger className="h-10 bg-white">
                  <SelectValue placeholder="Seleccionar calendario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los calendarios</SelectItem>
                  {customCalendars.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Input */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar clientes o notas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-white"
                />
              </div>
            </div>

            {/* Filter by User */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuarios / Asesores</Label>
              <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-100 rounded-lg p-2.5 bg-slate-50/50">
                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="user-filter"
                    checked={selectedUserFilter === 'all'}
                    onChange={() => setSelectedUserFilter('all')}
                    className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <strong>Todos los usuarios</strong>
                </label>
                {usersList.map(user => (
                  <label key={user} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="user-filter"
                      checked={selectedUserFilter === user}
                      onChange={() => setSelectedUserFilter(user)}
                      className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="truncate">{user}</span>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Board */}
      <div className="flex-1 flex flex-col space-y-5">
        {/* Navigation Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          {/* View Toggle Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveView('calendar')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${activeView === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Grid className="w-3.5 h-3.5" />
              Vista Calendario
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${activeView === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List className="w-3.5 h-3.5" />
              Lista de Citas
            </button>
            <button
              onClick={() => setActiveView('settings')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${activeView === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Settings className="w-3.5 h-3.5" />
              Ajustes
            </button>
          </div>

          {/* Date Navigator (Visible only when in calendar view) */}
          {activeView === 'calendar' && (
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" onClick={handleToday} className="h-9 font-semibold">
                Hoy
              </Button>
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                <Button variant="ghost" size="icon" onClick={handlePrev} className="h-9 w-9 rounded-none border-r border-slate-200">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="px-3 text-xs font-bold text-slate-700 min-w-[120px] text-center select-none">
                  {dateRangeLabel}
                </div>
                <Button variant="ghost" size="icon" onClick={handleNext} className="h-9 w-9 rounded-none border-l border-slate-200">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* View Mode Select */}
              <Select value={calendarViewMode} onValueChange={(val: any) => setCalendarViewMode(val)}>
                <SelectTrigger className="w-32 h-9 bg-white text-xs font-bold">
                  <SelectValue placeholder="Vista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Vista semanal</SelectItem>
                  <SelectItem value="day">Vista diaria</SelectItem>
                  <SelectItem value="month">Vista mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action button */}
          <Button onClick={() => openCreateModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9">
            <Plus className="h-4 w-4 mr-1.5" /> Nuevo
          </Button>
        </div>

        {/* View Content */}
        {activeView === 'calendar' && (
          <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-0">
              {calendarViewMode === 'week' ? (
                /* Weekly Grid View */
                <div className="overflow-x-auto min-w-full">
                  <div className="grid grid-cols-[80px_repeat(7,1fr)] min-w-[800px] border-b border-slate-200 bg-slate-50/50">
                    {/* Time Header Column */}
                    <div className="p-3 text-center border-r border-slate-200 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">
                      Hora ({settingsStartHour})
                    </div>
                    {/* Days Columns Headers */}
                    {weekDays.map((date) => {
                      const isToday = new Date().toDateString() === date.toDateString();
                      return (
                        <div
                          key={date.toISOString()}
                          className={`p-3 text-center border-r border-slate-200 flex flex-col items-center justify-center ${isToday ? 'bg-blue-50/60' : ''}`}
                        >
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                            {date.toLocaleDateString('es-AR', { weekday: 'short' })}
                          </span>
                          <span className={`text-base font-black mt-0.5 rounded-full w-8 h-8 flex items-center justify-center ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-800'}`}>
                            {date.getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Hourly Rows */}
                  <div className="min-w-[800px]">
                    {hoursArray.map((hour) => (
                      <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-100 min-h-[75px] relative group">
                        {/* Time label */}
                        <div className="p-3 text-center border-r border-slate-200 bg-slate-50/20 text-xs font-semibold text-slate-400 flex items-center justify-center">
                          {hour}
                        </div>
                        {/* Time slots for each day */}
                        {weekDays.map((date) => {
                          const dateStr = date.toISOString().split('T')[0];
                          const slotEvents = getEventsForSlot(dateStr, hour);
                          const isToday = new Date().toDateString() === date.toDateString();

                          return (
                            <div
                              key={dateStr}
                              onClick={() => openCreateModal(dateStr, hour)}
                              className={`p-1.5 border-r border-slate-100 relative group/slot cursor-pointer transition-colors duration-150 flex flex-col gap-1 ${isToday ? 'bg-blue-50/10' : 'hover:bg-slate-50/50'}`}
                            >
                              {/* Hover indicator to schedule */}
                              <div className="absolute inset-0 opacity-0 group-hover/slot:opacity-100 flex items-center justify-center pointer-events-none bg-blue-50/10 transition-opacity">
                                <span className="text-[10px] font-bold text-blue-500 bg-white border border-blue-200 px-2 py-0.5 rounded shadow-sm">
                                  + Agendar
                                </span>
                              </div>

                              {/* Render events inside slot */}
                              {slotEvents.map(event => {
                                const calendarObj = customCalendars.find(c => c.id === event.calendarId);
                                const calendarColor = calendarObj?.color || '#3b82f6';
                                const isCanceled = event.status === 'cancelada';

                                return (
                                  <div
                                    key={event.id}
                                    onClick={(e) => {
                                      e.stopPropagation(); // Avoid opening schedule modal
                                      openEditModal(event);
                                    }}
                                    style={{
                                      borderLeft: `4px solid ${calendarColor}`,
                                      backgroundColor: `${calendarColor}15`
                                    }}
                                    className={`relative z-10 p-2 rounded-lg text-left shadow-sm border border-slate-100 hover:shadow transition-shadow ${isCanceled ? 'opacity-55' : ''}`}
                                  >
                                    <div className="text-[11px] font-black leading-tight truncate" style={{ color: calendarColor }}>
                                      {event.type === 'bloqueo' ? '⚠️ BLOQUEADO' : event.title}
                                    </div>
                                    {event.type === 'cita' && (
                                      <div className="text-[10px] font-bold text-slate-700 truncate mt-0.5">
                                        👤 {event.clientName}
                                      </div>
                                    )}
                                    <div className="text-[9px] text-slate-500 flex items-center gap-1 mt-1 font-semibold">
                                      <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                                      {event.startTime} - {event.endTime}
                                    </div>
                                    {event.assignedUser && (
                                      <div className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">
                                        {event.assignedUser.split(' ')[0]}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ) : calendarViewMode === 'day' ? (
                /* Daily View Grid */
                <div className="divide-y divide-slate-100">
                  <div className="grid grid-cols-[100px_1fr] bg-slate-50 p-4 border-b border-slate-200 font-bold text-sm text-slate-700">
                    <div>Hora</div>
                    <div>Citas / Eventos</div>
                  </div>
                  {hoursArray.map((hour) => {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    const slotEvents = getEventsForSlot(dateStr, hour);
                    return (
                      <div key={hour} className="grid grid-cols-[100px_1fr] min-h-[80px] hover:bg-slate-50/30 transition-colors">
                        <div className="p-4 border-r border-slate-200 flex items-center justify-center font-bold text-slate-400 text-xs">
                          {hour}
                        </div>
                        <div
                          onClick={() => openCreateModal(dateStr, hour)}
                          className="p-2 flex gap-3 flex-wrap items-center cursor-pointer relative group/slot"
                        >
                          <div className="absolute inset-0 opacity-0 group-hover/slot:opacity-100 flex items-center justify-center pointer-events-none bg-blue-50/5 transition-opacity">
                            <span className="text-[10px] font-bold text-blue-500 bg-white border border-blue-200 px-2 py-1 rounded shadow-sm">
                              + Agendar cita en esta hora
                            </span>
                          </div>

                          {slotEvents.map(event => {
                            const calendarObj = customCalendars.find(c => c.id === event.calendarId);
                            const calendarColor = calendarObj?.color || '#3b82f6';
                            return (
                              <div
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(event);
                                }}
                                style={{ borderLeft: `4px solid ${calendarColor}`, backgroundColor: `${calendarColor}10` }}
                                className="w-full max-w-md p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-shadow flex items-start justify-between"
                              >
                                <div>
                                  <h5 className="text-xs font-black" style={{ color: calendarColor }}>
                                    {event.type === 'bloqueo' ? '⚠️ BLOQUEO DE HORARIO' : event.title}
                                  </h5>
                                  {event.clientName && <p className="text-xs text-slate-800 font-bold mt-1">Cliente: {event.clientName} ({event.clientPhone})</p>}
                                  <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {event.startTime} - {event.endTime} | Asignado: {event.assignedUser}
                                  </p>
                                </div>
                                <Badge className={
                                  event.status === 'confirmada' ? 'bg-green-100 text-green-800' :
                                    event.status === 'cancelada' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                }>
                                  {event.status}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Monthly View Grid */
                <div className="p-4 bg-slate-50/50">
                  <div className="grid grid-cols-7 gap-2">
                    {/* Days Header */}
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingos'].map(day => (
                      <div key={day} className="p-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">{day}</div>
                    ))}

                    {/* Month Slots */}
                    {Array.from({ length: 35 }).map((_, idx) => {
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                      // Adjust to monday start
                      const dayOffset = date.getDay() === 0 ? 6 : date.getDay() - 1;
                      date.setDate(1 - dayOffset + idx);

                      const dateStr = date.toISOString().split('T')[0];
                      const dayEvents = filteredEvents.filter(e => e.date === dateStr);
                      const isCurrentMonth = date.getMonth() === currentDate.getMonth();

                      return (
                        <div
                          key={idx}
                          onClick={() => openCreateModal(dateStr)}
                          className={`min-h-[100px] border border-slate-200 rounded-lg p-2 flex flex-col justify-between cursor-pointer transition-colors ${isCurrentMonth ? 'bg-white' : 'bg-slate-100/60 opacity-60'} hover:bg-slate-50`}
                        >
                          <div className="text-xs font-black text-slate-600">{date.getDate()}</div>
                          <div className="flex-1 flex flex-col gap-1 mt-1 overflow-y-auto max-h-[70px]">
                            {dayEvents.map(e => (
                              <div
                                key={e.id}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  openEditModal(e);
                                }}
                                className="text-[9px] font-black truncate px-1 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${customCalendars.find(c => c.id === e.calendarId)?.color || '#3b82f6'}15`,
                                  color: customCalendars.find(c => c.id === e.calendarId)?.color || '#3b82f6'
                                }}
                              >
                                {e.startTime} {e.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Appointment List View */}
        {activeView === 'list' && (
          <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader>
              <CardTitle>Listado General de Citas</CardTitle>
              <CardDescription>Busca y gestiona tus reservas pendientes</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-slate-700">Cliente</th>
                      <th className="px-6 py-3 font-semibold text-slate-700">Cita / Asesoría</th>
                      <th className="px-6 py-3 font-semibold text-slate-700">Fecha y Hora</th>
                      <th className="px-6 py-3 font-semibold text-slate-700">Asesor Asignado</th>
                      <th className="px-6 py-3 font-semibold text-slate-700">Estado</th>
                      <th className="px-6 py-3 font-semibold text-slate-700 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredEvents.filter(e => e.type === 'cita').length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          No se encontraron citas agendadas con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      filteredEvents.filter(e => e.type === 'cita').map((e) => {
                        const calendarColor = customCalendars.find(c => c.id === e.calendarId)?.color || '#3b82f6';
                        return (
                          <tr key={e.id} className="hover:bg-slate-50/40">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">{e.clientName}</div>
                              <div className="text-xs text-slate-500">{e.clientEmail} | {e.clientPhone}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-800">{e.title}</div>
                              <div className="text-xs flex items-center gap-1.5 mt-0.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: calendarColor }} />
                                <span className="text-slate-500 font-medium">
                                  {customCalendars.find(c => c.id === e.calendarId)?.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-800">{e.date}</div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">{e.startTime} - {e.endTime}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-700 font-medium">{e.assignedUser}</td>
                            <td className="px-6 py-4">
                              <Badge className={
                                e.status === 'confirmada' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50' :
                                  e.status === 'cancelada' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50' :
                                    'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50'
                              }>
                                {e.status.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditModal(e)}
                                  className="h-8 w-8 text-blue-600 hover:text-blue-800"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteEvent(e.id)}
                                  className="h-8 w-8 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings View */}
        {activeView === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Work Hours and Work Days */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader>
                <CardTitle>Disponibilidad y Horarios</CardTitle>
                <CardDescription>Establece tus horas de trabajo generales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora de Inicio</Label>
                    <Select value={settingsStartHour} onValueChange={setSettingsStartHour}>
                      <SelectTrigger className="h-10 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['06:00', '07:00', '08:00', '09:00', '10:00', '11:00'].map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hora de Finalización</Label>
                    <Select value={settingsEndHour} onValueChange={setSettingsEndHour}>
                      <SelectTrigger className="h-10 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'].map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Días Laborales</Label>
                  <div className="flex flex-wrap gap-2.5 pt-1.5">
                    {[
                      { key: '1', label: 'Lun' },
                      { key: '2', label: 'Mar' },
                      { key: '3', label: 'Mié' },
                      { key: '4', label: 'Jue' },
                      { key: '5', label: 'Vie' },
                      { key: '6', label: 'Sáb' },
                      { key: '0', label: 'Dom' },
                    ].map(d => {
                      const isActive = settingsWorkDays.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setSettingsWorkDays(settingsWorkDays.filter(k => k !== d.key));
                            } else {
                              setSettingsWorkDays([...settingsWorkDays, d.key]);
                            }
                          }}
                          className={`w-12 h-10 rounded-lg text-xs font-bold border transition-all ${isActive ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <Button onClick={handleSaveSettings} className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5">
                    <Check className="w-4 h-4" /> Guardar Disponibilidad
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Custom Calendars Rooms */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader>
                <CardTitle>Salas / Tipos de Calendario</CardTitle>
                <CardDescription>Configura los distintos calendarios de atención</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const name = fd.get('name') as string;
                    const color = fd.get('color') as string;
                    if (name.trim()) {
                      handleAddCalendar(name, color);
                      e.currentTarget.reset();
                    }
                  }}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_80px_100px] gap-3 bg-slate-50 p-4 border border-slate-200 rounded-xl"
                >
                  <div className="space-y-1">
                    <Label htmlFor="cal-name" className="text-xs">Nombre del Calendario</Label>
                    <Input id="cal-name" name="name" required placeholder="Ej: Consultas Médicas" className="h-9 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cal-color" className="text-xs">Color</Label>
                    <Input id="cal-color" name="color" type="color" defaultValue="#3b82f6" className="h-9 w-full bg-white p-1" />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white h-9 font-bold text-xs gap-1">
                      <Plus className="w-3.5 h-3.5" /> Añadir
                    </Button>
                  </div>
                </form>

                <div className="space-y-3">
                  <Label>Calendarios Actuales</Label>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {customCalendars.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50/30">
                        <div className="flex items-center gap-3 font-semibold text-slate-800 text-sm">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                          {c.name}
                          <span className="text-[10px] text-slate-400 font-mono">({c.id})</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCalendar(c.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Appointment / Event Edit/Create Modal dialog */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="max-w-md border-slate-200 rounded-xl bg-white shadow-xl">
          <form onSubmit={handleSaveEvent} className="space-y-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                {selectedEvent ? 'Editar Cita / Bloqueo' : 'Programar Cita / Bloqueo'}
              </DialogTitle>
              <DialogDescription>
                {selectedEvent ? 'Edite los detalles correspondientes de esta cita.' : 'Programe un nuevo turno de atención o bloquee una franja.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Type Toggle */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setEventType('cita')}
                  className={`py-1.5 rounded text-xs font-bold transition-all ${eventType === 'cita' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Cita Comercial
                </button>
                <button
                  type="button"
                  onClick={() => setEventType('bloqueo')}
                  className={`py-1.5 rounded text-xs font-bold transition-all ${eventType === 'bloqueo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Bloquear Horario
                </button>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <Label htmlFor="ev-title">Título del Evento</Label>
                <Input
                  id="ev-title"
                  placeholder={eventType === 'bloqueo' ? 'Ej: Fuera de servicio' : 'Ej: Asesoría Técnica'}
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="h-10 bg-white"
                />
              </div>

              {/* Client Info (Only for Citas) */}
              {eventType === 'cita' && (
                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">Detalles del Cliente</h4>
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="client-name" className="text-xs">Nombre Completo <span className="text-red-500">*</span></Label>
                      <Input
                        id="client-name"
                        value={eventClientName}
                        onChange={(e) => setEventClientName(e.target.value)}
                        placeholder="Ej: Juan Pérez"
                        className="bg-white h-9"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="client-email" className="text-xs">Email</Label>
                        <Input
                          id="client-email"
                          type="email"
                          value={eventClientEmail}
                          onChange={(e) => setEventClientEmail(e.target.value)}
                          placeholder="correo@ejemplo.com"
                          className="bg-white h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="client-phone" className="text-xs">Teléfono</Label>
                        <Input
                          id="client-phone"
                          value={eventClientPhone}
                          onChange={(e) => setEventClientPhone(e.target.value)}
                          placeholder="Ej: 1123456789"
                          className="bg-white h-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Time Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="ev-date" className="text-xs">Fecha</Label>
                  <Input
                    id="ev-date"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="h-9 bg-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ev-start" className="text-xs">Inicio</Label>
                  <Input
                    id="ev-start"
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="h-9 bg-white font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ev-end" className="text-xs">Fin</Label>
                  <Input
                    id="ev-end"
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="h-9 bg-white font-mono"
                    required
                  />
                </div>
              </div>

              {/* Extra selections */}
              <div className="grid grid-cols-2 gap-3">
                {/* Assigned User */}
                <div className="space-y-1">
                  <Label className="text-xs">Asignar a Asesor</Label>
                  <Select value={eventAssignedUser} onValueChange={setEventAssignedUser}>
                    <SelectTrigger className="h-9 bg-white">
                      <SelectValue placeholder="Seleccionar asesor" />
                    </SelectTrigger>
                    <SelectContent>
                      {usersList.map(user => (
                        <SelectItem key={user} value={user}>{user}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Calendar Type Selection */}
                <div className="space-y-1">
                  <Label className="text-xs">Sala / Tipo de Cita</Label>
                  <Select value={eventCalendarId} onValueChange={setEventCalendarId}>
                    <SelectTrigger className="h-9 bg-white">
                      <SelectValue placeholder="Seleccionar sala" />
                    </SelectTrigger>
                    <SelectContent>
                      {customCalendars.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
                {eventType === 'cita' ? (
                  <div className="space-y-1">
                    <Label className="text-xs">Estado de la Cita</Label>
                    <Select value={eventStatus} onValueChange={(val: any) => setEventStatus(val)}>
                      <SelectTrigger className="h-9 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="confirmada">Confirmada</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div />
                )}
                <div className="space-y-1">
                  <Label htmlFor="ev-notes" className="text-xs">Notas / Observaciones</Label>
                  <Input
                    id="ev-notes"
                    placeholder="Detalles sobre la cita..."
                    value={eventNotes}
                    onChange={(e) => setEventNotes(e.target.value)}
                    className="h-9 bg-white"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-100 pt-4 mt-2">
              {selectedEvent && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="text-red-500 hover:text-red-700 mr-auto flex items-center gap-1.5 h-10 px-3 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setIsEventModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5">
                <Check className="w-4 h-4" /> Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
