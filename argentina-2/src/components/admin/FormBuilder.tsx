import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveAgencyId, isWebsiteForAgency, isFormForAgency } from '@/lib/agency-isolation';
import { 
  Plus, Trash2, ArrowUp, ArrowDown, Clipboard, Play, Save, CheckCircle, 
  Settings, ChevronRight, Check, Eye, HelpCircle, Layers, Mail, 
  Phone, List, FileSpreadsheet, Search, CheckCircle2, ChevronLeft,
  LayoutGrid, Trash, Sparkles, Copy, Calendar, MessageSquare, Info, Sliders
  ,ExternalLink, Link2, Monitor
} from 'lucide-react';

// Interfaces for custom forms
export interface FormField {
  id: string;
  type: 'text' | 'email' | 'textarea' | 'select' | 'checkbox' | 'tel';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select dropdown
  section?: string;
}

export interface CustomForm {
  id: string;
  name: string; // internal identifier
  title: string; // public title
  buttonText: string;
  successMessage: string;
  fields: FormField[];
  createdAt: string;
  description?: string;
  owner_id?: string;
  website_id?: string;
  published?: boolean;
}

export interface FormSubmission {
  id: string;
  formId: string;
  formData: Record<string, string>;
  submittedAt: string;
  ip: string;
  status: 'new' | 'read' | 'archived';
  owner_id?: string;
  website_id?: string;
}

const WEBSY_OWNER_EMAIL = 'juansalazat100@gmail.com';
const WEBSY_WEBSITE_ID = 'websy-multiservicios';
const WEBSY_FORM_ID = 'websy-cuestionario-multiservicios-2026';

const createWebsyQuestionnaire = (ownerId: string): CustomForm => {
  const mailQuestions = [
    '¿Cuántas personas usan un mail de la empresa hoy? Decinos el nombre de cada una y qué mail usa.',
    '¿Con qué programa revisan el mail hoy? (Outlook, Gmail, el navegador, etc.)',
    'La página web y el mail de la empresa, ¿con qué empresa los tienen contratados hoy? (el lugar donde pagan el hosting o el dominio)',
    '¿Quién tiene el usuario y la contraseña para entrar a administrar eso? (no hace falta pasárnoslo todavía, solo decirnos quién lo tiene)',
    '¿Van a seguir con el mismo nombre de dominio (lo de después de la @) o quieren cambiarlo?',
    'Además de los mails, ¿usan también agenda, calendario o contactos guardados ahí que no quieran perder?',
    '¿Hay algún horario (una tarde, una noche) en que la empresa pueda estar sin mail un rato para hacer el cambio tranquilos?',
    '¿Quién de la empresa es la persona de contacto para este tema, por si necesitamos algo puntual?',
    '¿Tienen pensado seguir usando lo mismo de siempre, o les gustaría pasarse a otra cosa (por ejemplo, Gmail para empresas)?',
    '¿Hay algo puntual que les preocupe de este cambio? (por ejemplo, perder mails viejos, que se corte el servicio, etc.)',
  ];
  const appQuestions = [
    '¿Para qué quieren la aplicación? Contanos con sus palabras qué problema resuelve.',
    '¿Quién la va a usar: la gente de la empresa, sus clientes, o los dos?',
    'Más o menos, ¿cuántas personas la usarían?',
    '¿Qué les gustaría que haga? (por ejemplo: anotar datos, hacer cotizaciones, mandar avisos, cobrar online)',
    '¿La quieren para usar desde la computadora, desde el celular, o ambos?',
    '¿Para cuándo les gustaría tenerla lista?',
    'Una vez lista, ¿qué esperan de nosotros? (por ejemplo: arreglar algún error, sumar cosas nuevas más adelante, ayudarlos si tienen dudas)',
  ];
  const makeFields = (questions: string[], prefix: string, section: string): FormField[] => questions.map((label, index) => ({
    id: `${prefix}-${index + 1}`,
    type: 'textarea',
    label: `${index + 1}. ${label}`,
    placeholder: 'Escribí tu respuesta…',
    required: false,
    section,
  }));

  return {
    id: WEBSY_FORM_ID,
    name: 'Cuestionario para arrancar Multiservicios',
    title: 'WEBSY — Cuestionario para arrancar Multiservicios',
    description: '6 de septiembre de 2026\n\n¡Hola! Para poder arrancar con la copia de seguridad de los mails y con la idea de la aplicación, necesitamos que nos cuenten estos datos. No hace falta que sea técnico ni que esté perfecto: con que nos cuenten lo que saben, alcanza. Pueden responder debajo de cada pregunta o mandarnos las respuestas por WhatsApp o mail.',
    buttonText: 'Enviar respuestas a Websy',
    successMessage: '¡Gracias! Recibimos las respuestas. Agustín, de Websy, se pondrá en contacto si necesita aclarar algún punto.',
    createdAt: '2026-09-06T00:00:00.000Z',
    owner_id: ownerId,
    website_id: WEBSY_WEBSITE_ID,
    fields: [
      ...makeFields(mailQuestions, 'mails', '1. Copia de seguridad y pase de los mails'),
      ...makeFields(appQuestions, 'app', '2. La aplicación que quieren armar'),
    ],
  };
};

export const FormBuilder: React.FC = () => {
  const { user } = useAuth();
  const activeAgencyId = React.useMemo(() => getActiveAgencyId(user), [user]);
  const agencyOwnerId = activeAgencyId || String(user?.agencyId || user?.id || '2');
  // Websites from local storage
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedWebId, setSelectedWebId] = useState<string>('');

  // Forms state
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const [activeForm, setActiveForm] = useState<CustomForm | null>(null);

  // Submissions state
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);

  // Tab views
  const [activeSubTab, setActiveSubTab] = useState<'designer' | 'submissions'>('designer');
  const [submissionSearch, setSubmissionSearch] = useState('');

  // Selected Field state in Designer (for configuring placeholder, required, or select options)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Interactive Live Preview State
  const [previewFormData, setPreviewFormData] = useState<Record<string, string>>({});
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const [isPublicPreviewOpen, setIsPublicPreviewOpen] = useState(false);

  // Load Websites first
  useEffect(() => {
    if (!agencyOwnerId) return;
    let cancelled = false;
    const loadWebsites = async () => {
      const storageKey = `admin_websites_${agencyOwnerId}`;
      const savedWebsites = localStorage.getItem(storageKey) || (agencyOwnerId === '2' ? localStorage.getItem('admin_websites') : null);
      const parsed = user?.accountRole === 'agency_user'
        ? []
        : (savedWebsites ? JSON.parse(savedWebsites).filter((w: any) => isWebsiteForAgency(w, agencyOwnerId)) : []);

      // Cargar sitios desde la tabla websites de la base de datos
      try {
        const { data: dbWebsites } = await db.from('websites').select();
        (dbWebsites || [])
          .filter((w: any) => isWebsiteForAgency(w, agencyOwnerId))
          .forEach((w: any) => {
            if (!parsed.some((website: any) => website.id === w.id)) {
              parsed.push({
                id: w.id,
                name: w.name,
                agency_id: w.agency_id || agencyOwnerId
              });
            }
          });
      } catch (_) {}

      // Cargar formularios pertenecientes a la agencia
      const { data: agencyForms } = await db.from('website_forms').select();
      (agencyForms || [])
        .filter((form: CustomForm) => isFormForAgency(form, agencyOwnerId) && form.website_id)
        .forEach((form: CustomForm) => {
          if (!parsed.some((website: any) => website.id === form.website_id)) {
            parsed.push({
              id: form.website_id,
              name: form.website_id === WEBSY_WEBSITE_ID ? 'Multiservicios — Websy' : form.website_id,
            });
          }
        });

      if (!cancelled) {
        setWebsites(parsed);
        setSelectedWebId(current => current && parsed.some((website: any) => website.id === current) ? current : parsed[0]?.id || '');
      }
    };
    loadWebsites();
    return () => { cancelled = true; };
  }, [agencyOwnerId, user?.accountRole]);

  // Default templates to pre-populate custom forms if empty
  const getDefaultTemplates = (webId: string): CustomForm[] => {
    return [
      {
        id: `form-news-${Date.now()}`,
        name: 'Suscripción Boletín',
        title: 'Únete a nuestro Boletín Informativo',
        buttonText: 'Suscribirme Ahora',
        successMessage: '¡Gracias por suscribirte! Recibirás nuestras novedades en tu correo.',
        createdAt: new Date().toISOString(),
        fields: [
          {
            id: 'field-1',
            type: 'text',
            label: 'Nombre Completo',
            placeholder: 'Ingresa tu nombre',
            required: false
          },
          {
            id: 'field-2',
            type: 'email',
            label: 'Correo Electrónico',
            placeholder: 'correo@ejemplo.com',
            required: true
          }
        ]
      },
      {
        id: `form-contact-${Date.now() + 1}`,
        name: 'Consulta de Soporte / Ventas',
        title: 'Envíanos tu Consulta',
        buttonText: 'Enviar Mensaje',
        successMessage: '¡Consulta recibida! Nos pondremos en contacto contigo a la brevedad.',
        createdAt: new Date().toISOString(),
        fields: [
          {
            id: 'field-c1',
            type: 'text',
            label: 'Nombre completo',
            placeholder: 'Nombre y Apellido',
            required: true
          },
          {
            id: 'field-c2',
            type: 'email',
            label: 'Correo electrónico',
            placeholder: 'tu@correo.com',
            required: true
          },
          {
            id: 'field-c3',
            type: 'tel',
            label: 'Número de WhatsApp',
            placeholder: '+54 9 11 ...',
            required: false
          },
          {
            id: 'field-c4',
            type: 'select',
            label: 'Asunto de Consulta',
            required: true,
            options: ['Ventas / Cotizaciones', 'Soporte Técnico', 'Facturación', 'Otros']
          },
          {
            id: 'field-c5',
            type: 'textarea',
            label: 'Escribe aquí tu consulta',
            placeholder: 'Detalla tu consulta aquí...',
            required: true
          }
        ]
      }
    ];
  };

  // Load Forms & Submissions when Selected Web ID changes
  useEffect(() => {
    if (!selectedWebId) return;
    let cancelled = false;
    const load = async () => {
      const [{ data: formRows }, { data: submissionRows }] = await Promise.all([
        db.from('website_forms').select(),
        db.from('website_form_submissions').select(),
      ]);
      if (cancelled) return;
      let loadedForms = (formRows || []).filter((form: CustomForm) =>
        isFormForAgency(form, agencyOwnerId) && form.website_id === selectedWebId
      );
      // El cuestionario de Websy SOLO se siembra si la agencia activa es Websy ("2")
      if (agencyOwnerId === '2' && user?.email?.toLowerCase() === WEBSY_OWNER_EMAIL && selectedWebId === WEBSY_WEBSITE_ID && !loadedForms.some((form: CustomForm) => form.id === WEBSY_FORM_ID)) {
        const questionnaire = createWebsyQuestionnaire(agencyOwnerId);
        const { error } = await db.from('website_forms').upsert(questionnaire);
        if (!error) loadedForms = [questionnaire, ...loadedForms];
      }
      setForms(loadedForms);
      setActiveFormId(loadedForms[0]?.id || null);
      setActiveForm(loadedForms[0] || null);
      setSubmissions((submissionRows || []).filter((submission: FormSubmission) =>
        isFormForAgency(submission, agencyOwnerId) && submission.website_id === selectedWebId
      ));
    };
    load();
    return () => { cancelled = true; };
  }, [selectedWebId, user?.email, agencyOwnerId]);

  const persistForm = async (form: CustomForm) => {
    if (!agencyOwnerId || !selectedWebId) return;
    const record = { ...form, owner_id: agencyOwnerId, agency_id: agencyOwnerId, website_id: selectedWebId };
    const { error } = await db.from('website_forms').upsert(record);
    if (error) toast({ title: 'No se pudo guardar el formulario', description: error.message, variant: 'destructive' });
  };

  const persistSubmission = async (submission: FormSubmission) => {
    if (!agencyOwnerId || !selectedWebId) return;
    const { error } = await db.from('website_form_submissions').insert({ ...submission, owner_id: agencyOwnerId, agency_id: agencyOwnerId, website_id: selectedWebId });
    if (error) throw error;
  };

  // Synchronize Active Form edits to forms array and Local Storage
  const saveFormToStorage = (updatedForm: CustomForm) => {
    if (!selectedWebId) return;
    const formsKey = `admin_custom_forms_${selectedWebId}`;
    const updatedForms = forms.map(f => f.id === updatedForm.id ? updatedForm : f);
    setForms(updatedForms);
    localStorage.setItem(formsKey, JSON.stringify(updatedForms));
    persistForm(updatedForm);
  };

  const handleUpdateFormMeta = (key: keyof CustomForm, value: string) => {
    if (!activeForm) return;
    const updated = { ...activeForm, [key]: value };
    setActiveForm(updated);
    saveFormToStorage(updated);
  };

  // Switch Active Form
  const handleSelectForm = (formId: string) => {
    const target = forms.find(f => f.id === formId) || null;
    setActiveFormId(formId);
    setActiveForm(target);
    setSelectedFieldId(null);
    setPreviewFormData({});
    setPreviewSubmitted(false);
  };

  // Create Form
  const handleCreateNewForm = () => {
    if (!selectedWebId) {
      toast({
        title: "No hay sitio web",
        description: "Por favor crea un sitio web antes de crear formularios.",
        variant: "destructive"
      });
      return;
    }

    const newForm: CustomForm = {
      id: `form-custom-${Date.now()}`,
      name: `Nuevo Formulario ${forms.length + 1}`,
      title: 'Contáctanos',
      buttonText: 'Enviar Formulario',
      successMessage: '¡Formulario enviado con éxito! Nos pondremos en contacto contigo.',
      createdAt: new Date().toISOString(),
      owner_id: agencyOwnerId,
      website_id: selectedWebId,
      published: true,
      fields: [
        {
          id: `field-${Date.now()}-1`,
          type: 'text',
          label: 'Nombre completo',
          placeholder: 'Escribe tu nombre',
          required: true
        },
        {
          id: `field-${Date.now()}-2`,
          type: 'email',
          label: 'Correo electrónico',
          placeholder: 'correo@ejemplo.com',
          required: true
        }
      ]
    };

    const formsKey = `admin_custom_forms_${selectedWebId}`;
    const updatedForms = [...forms, newForm];
    setForms(updatedForms);
    localStorage.setItem(formsKey, JSON.stringify(updatedForms));
    persistForm(newForm);

    setActiveFormId(newForm.id);
    setActiveForm(newForm);
    setSelectedFieldId(null);
    setPreviewFormData({});
    setPreviewSubmitted(false);

    toast({
      title: "Formulario Creado",
      description: `Se ha creado "${newForm.name}" con éxito.`
    });
  };

  // Delete Form
  const handleDeleteForm = (formId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de que deseas eliminar este formulario? Se eliminarán también sus respuestas.')) return;

    const formsKey = `admin_custom_forms_${selectedWebId}`;
    const updatedForms = forms.filter(f => f.id !== formId);
    setForms(updatedForms);
    localStorage.setItem(formsKey, JSON.stringify(updatedForms));
    db.from('website_forms').delete().eq('id', formId);

    // Clear submissions for this form
    const filteredSubmissions = submissions.filter(s => s.formId !== formId);
    setSubmissions(filteredSubmissions);
    localStorage.setItem('admin_form_submissions', JSON.stringify(filteredSubmissions));
    submissions.filter(s => s.formId === formId).forEach(submission => {
      db.from('website_form_submissions').delete().eq('id', submission.id);
    });

    if (activeFormId === formId) {
      if (updatedForms.length > 0) {
        setActiveFormId(updatedForms[0].id);
        setActiveForm(updatedForms[0]);
      } else {
        setActiveFormId(null);
        setActiveForm(null);
      }
    }

    toast({
      title: "Formulario Eliminado",
      description: "El formulario fue eliminado permanentemente.",
      variant: "destructive"
    });
  };

  // Copy Form (Duplicate)
  const handleDuplicateForm = (formToCopy: CustomForm, e: React.MouseEvent) => {
    e.stopPropagation();
    const duplicated: CustomForm = {
      ...formToCopy,
      id: `form-copy-${Date.now()}`,
      name: `${formToCopy.name} (Copia)`,
      createdAt: new Date().toISOString(),
      fields: formToCopy.fields.map(f => ({ ...f, id: `field-copy-${Math.random().toString(36).substr(2, 9)}` }))
      ,owner_id: agencyOwnerId,
      website_id: selectedWebId,
    };

    const formsKey = `admin_custom_forms_${selectedWebId}`;
    const updatedForms = [...forms, duplicated];
    setForms(updatedForms);
    localStorage.setItem(formsKey, JSON.stringify(updatedForms));
    persistForm(duplicated);

    setActiveFormId(duplicated.id);
    setActiveForm(duplicated);
    setSelectedFieldId(null);

    toast({
      title: "Formulario Duplicado",
      description: `Se duplicó "${formToCopy.name}" como "${duplicated.name}".`
    });
  };

  // Add field to active form
  const handleAddField = (type: FormField['type']) => {
    if (!activeForm) return;

    const newField: FormField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      label: type === 'text' ? 'Campo de Texto'
           : type === 'email' ? 'Correo Electrónico'
           : type === 'textarea' ? 'Mensaje Largo'
           : type === 'select' ? 'Selector / Opciones'
           : type === 'checkbox' ? 'Casilla de Selección (Acepto Términos)'
           : 'Teléfono',
      placeholder: type !== 'checkbox' ? 'Escribe aquí...' : undefined,
      required: false,
      options: type === 'select' ? ['Opción A', 'Opción B', 'Opción C'] : undefined
    };

    const updatedFields = [...activeForm.fields, newField];
    const updatedForm = { ...activeForm, fields: updatedFields };
    setActiveForm(updatedForm);
    saveFormToStorage(updatedForm);
    setSelectedFieldId(newField.id); // select it automatically

    toast({
      title: "Campo añadido",
      description: `Se agregó un campo tipo ${type.toUpperCase()}.`
    });
  };

  // Delete field
  const handleDeleteField = (fieldId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeForm) return;

    const updatedFields = activeForm.fields.filter(f => f.id !== fieldId);
    const updatedForm = { ...activeForm, fields: updatedFields };
    setActiveForm(updatedForm);
    saveFormToStorage(updatedForm);
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }

    toast({
      title: "Campo eliminado",
      description: "El campo fue retirado del formulario.",
      variant: "destructive"
    });
  };

  // Move Field Up/Down
  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (!activeForm) return;
    const fields = [...activeForm.fields];
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = fields[index];
    fields[index] = fields[targetIndex];
    fields[targetIndex] = temp;

    const updatedForm = { ...activeForm, fields };
    setActiveForm(updatedForm);
    saveFormToStorage(updatedForm);
  };

  // Update Field properties
  const handleUpdateFieldProp = (fieldId: string, key: keyof FormField, value: any) => {
    if (!activeForm) return;

    const updatedFields = activeForm.fields.map(f => {
      if (f.id === fieldId) {
        return { ...f, [key]: value };
      }
      return f;
    });

    const updatedForm = { ...activeForm, fields: updatedFields };
    setActiveForm(updatedForm);
    saveFormToStorage(updatedForm);
  };

  // Update options array for selector field
  const handleUpdateSelectOptions = (fieldId: string, optionsText: string) => {
    const options = optionsText.split(',').map(o => o.trim()).filter(Boolean);
    handleUpdateFieldProp(fieldId, 'options', options);
  };

  // Mock Submit inside Preview Panel
  const handlePreviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeForm) return;

    // Check required fields
    for (const field of activeForm.fields) {
      if (field.required && !previewFormData[field.id]?.trim()) {
        toast({
          title: "Faltan campos obligatorios",
          description: `El campo "${field.label}" es obligatorio.`,
          variant: "destructive"
        });
        return;
      }
    }

    // Save actual submission response to make the system fully dynamic!
    const newSubmission: FormSubmission = {
      id: `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      formId: activeForm.id,
      formData: { ...previewFormData },
      submittedAt: new Date().toISOString(),
      ip: `192.168.1.${Math.floor(Math.random() * 254) + 1} (Vista Previa)`,
      status: 'new'
      ,owner_id: agencyOwnerId,
      website_id: selectedWebId,
    };

    const updatedSubmissions = [newSubmission, ...submissions];
    setSubmissions(updatedSubmissions);
    localStorage.setItem('admin_form_submissions', JSON.stringify(updatedSubmissions));

    try {
      await persistSubmission(newSubmission);
    } catch (error: any) {
      toast({ title: 'No se pudo enviar el formulario', description: error.message, variant: 'destructive' });
      return;
    }
    setPreviewSubmitted(true);
    toast({
      title: "Envío Registrado",
      description: "El formulario se envió correctamente y se guardó en la base de datos."
    });
  };

  // Export Submissions to CSV
  const handleExportSubmissions = (formId: string) => {
    const form = forms.find(f => f.id === formId);
    if (!form) return;

    const formSubs = submissions.filter(s => s.formId === formId);
    if (formSubs.length === 0) {
      toast({
        title: "Sin respuestas",
        description: "No hay respuestas registradas para este formulario.",
        variant: "destructive"
      });
      return;
    }

    // Prepare headers
    const fieldHeaders = form.fields.map(f => f.label);
    const headers = ['Fecha', 'IP', ...fieldHeaders].join(';');

    // Prepare rows
    const rows = formSubs.map(s => {
      const date = new Date(s.submittedAt).toLocaleDateString();
      const ip = s.ip;
      const values = form.fields.map(f => {
        const val = s.formData[f.id] || '';
        return `"${val.replace(/"/g, '""')}"`;
      });
      return [date, ip, ...values].join(';');
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `respuestas_${form.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "CSV Exportado",
      description: `Se descargaron ${formSubs.length} respuestas.`
    });
  };

  // Clear Submissions for form
  const handleClearSubmissions = (formId: string) => {
    if (!confirm('¿Estás seguro de que deseas vaciar todas las respuestas de este formulario?')) return;
    const remaining = submissions.filter(s => s.formId !== formId);
    setSubmissions(remaining);
    localStorage.setItem('admin_form_submissions', JSON.stringify(remaining));
    submissions.filter(s => s.formId === formId).forEach(submission => {
      db.from('website_form_submissions').delete().eq('id', submission.id);
    });
    setSelectedSubmission(null);
    toast({
      title: "Respuestas vaciadas",
      description: "Se eliminaron todas las respuestas del formulario.",
      variant: "destructive"
    });
  };

  // Get active form submissions
  const filteredSubmissions = activeForm 
    ? submissions.filter(s => {
        if (s.formId !== activeForm.id) return false;
        if (!submissionSearch) return true;
        // Search inside submission values
        return Object.values(s.formData).some(val => 
          val.toLowerCase().includes(submissionSearch.toLowerCase())
        );
      })
    : [];

  const publicFormPath = activeForm ? `/formularios/${encodeURIComponent(activeForm.id)}` : '';
  const publicFormUrl = typeof window !== 'undefined' && publicFormPath
    ? `${window.location.origin}${publicFormPath}`
    : publicFormPath;

  const handleCopyPublicUrl = async () => {
    if (!publicFormUrl) return;
    await navigator.clipboard.writeText(publicFormUrl);
    toast({ title: 'Enlace copiado', description: 'Ya puedes compartirlo con el cliente.' });
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl min-h-[580px] flex flex-col md:flex-row shadow-xs overflow-hidden">
      
      {/* 1. SIDEBAR: Forms List */}
      <div className="w-full md:w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
        
        {/* Website Selector in sidebar header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Sitio Web Activo
          </label>
          <select
            value={selectedWebId}
            onChange={(e) => setSelectedWebId(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {websites.length === 0 ? (
              <option value="">Sin sitios disponibles</option>
            ) : (
              websites.map((web) => (
                <option key={web.id} value={web.id}>
                  {web.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Form List Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100">
          <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
            <LayoutGrid className="h-4 w-4 text-blue-600" />
            Formularios ({forms.length})
          </span>
          <button
            onClick={handleCreateNewForm}
            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            title="Crear nuevo formulario"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {forms.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              No tienes formularios creados. Haz clic en "+" para empezar.
            </div>
          ) : (
            forms.map((form) => {
              const isActive = form.id === activeFormId;
              const subCount = submissions.filter(s => s.formId === form.id).length;
              return (
                <div
                  key={form.id}
                  onClick={() => handleSelectForm(form.id)}
                  className={`group relative p-3 rounded-xl cursor-pointer border transition-all ${
                    isActive 
                      ? 'bg-blue-50/50 border-blue-200 shadow-2xs' 
                      : 'bg-white hover:bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1 text-left">
                    <span className={`text-xs font-bold block truncate pr-14 ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                      {form.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-400 block font-mono">
                        {form.fields.length} campos
                      </span>
                      <Badge variant="secondary" className="h-4 px-1.5 text-[8px] bg-slate-100 text-slate-500 font-bold border-0">
                        {subCount} leads
                      </Badge>
                    </div>
                  </div>

                  {/* Actions overlay visible on hover */}
                  <div className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={(e) => handleDuplicateForm(form, e)}
                      className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded transition-colors"
                      title="Duplicar formulario"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteForm(form.id, e)}
                      className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 rounded transition-colors"
                      title="Eliminar formulario"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. WORKSPACE: Active Form Dashboard */}
      {activeForm ? (
        <div className="flex-1 flex flex-col bg-slate-50">
          
          {/* Main Top Header Controls */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={activeForm.name}
                  onChange={(e) => handleUpdateFormMeta('name', e.target.value)}
                  className="text-sm font-extrabold text-slate-800 hover:bg-slate-50 focus:bg-slate-50 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded px-1.5 py-0.5 focus:outline-none transition-all w-52 sm:w-64"
                />
                <Badge variant="outline" className="text-[9px] border-slate-200 bg-slate-50 text-slate-600 font-medium">
                  ID: {activeForm.id}
                </Badge>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Creado el {new Date(activeForm.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsPublicPreviewOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Monitor className="h-3.5 w-3.5" /> Vista previa
              </button>
              <a
                href={publicFormPath}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Abrir formulario
              </a>
              {/* Sub-tab view toggle (Diseño vs Respuestas) */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 w-fit">
              <button
                onClick={() => setActiveSubTab('designer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeSubTab === 'designer' 
                    ? 'bg-white text-slate-800 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Diseñador</span>
              </button>
              <button
                onClick={() => setActiveSubTab('submissions')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all relative ${
                  activeSubTab === 'submissions' 
                    ? 'bg-white text-slate-800 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Respuestas</span>
                {submissions.filter(s => s.formId === activeForm.id).length > 0 && (
                  <span className="h-2 w-2 rounded-full bg-blue-600 absolute top-1 right-1 animate-pulse" />
                )}
              </button>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-white px-6 py-3">
            <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Link2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Enlace público activo</p>
                  <p className="truncate text-xs font-medium text-slate-700">{publicFormUrl}</p>
                </div>
              </div>
              <button onClick={handleCopyPublicUrl} className="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50">
                <Copy className="h-3.5 w-3.5" /> Copiar enlace
              </button>
            </div>
          </div>

          {/* VIEW A: DESIGNER (Form editor & preview split) */}
          {activeSubTab === 'designer' && (
            <div className="flex-1 overflow-hidden min-h-[500px]">
              
              {/* Left Panel: Field config & edit */}
              <div className="h-full p-5 overflow-y-auto space-y-5">
                
                {/* Form Meta Settings Group */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block border-b pb-1.5">
                    Ajustes de Encabezado y Envío
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Título Público</label>
                      <Input 
                        value={activeForm.title} 
                        onChange={(e) => handleUpdateFormMeta('title', e.target.value)}
                        placeholder="Título del formulario en la web"
                        className="h-8.5 text-xs"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Texto del Botón</label>
                      <Input 
                        value={activeForm.buttonText} 
                        onChange={(e) => handleUpdateFormMeta('buttonText', e.target.value)}
                        placeholder="Enviar Mensaje, Suscribirse, etc."
                        className="h-8.5 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Introducción</label>
                    <textarea
                      value={activeForm.description || ''}
                      onChange={(e) => handleUpdateFormMeta('description', e.target.value)}
                      placeholder="Explica brevemente para qué sirve el formulario"
                      rows={4}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Mensaje de Éxito</label>
                    <Input 
                      value={activeForm.successMessage} 
                      onChange={(e) => handleUpdateFormMeta('successMessage', e.target.value)}
                      placeholder="Texto que se muestra tras un envío correcto"
                      className="h-8.5 text-xs"
                    />
                  </div>
                </div>

                {/* Fields Editor List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                      Campos del Formulario ({activeForm.fields.length})
                    </span>
                    <div className="flex gap-1.5">
                      <select 
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddField(e.target.value as FormField['type']);
                            e.target.value = '';
                          }
                        }}
                        className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled>+ Añadir Campo...</option>
                        <option value="text">Texto Corto</option>
                        <option value="email">Correo Electrónico</option>
                        <option value="tel">Teléfono / WhatsApp</option>
                        <option value="textarea">Área de Mensaje</option>
                        <option value="select">Lista de Selección</option>
                        <option value="checkbox">Casilla de Aceptación</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {activeForm.fields.length === 0 ? (
                      <div className="p-10 border-2 border-dashed border-slate-350 bg-white rounded-xl text-center text-slate-400 text-xs">
                        Este formulario no tiene campos. Haz clic en "+ Añadir Campo" arriba para estructurarlo.
                      </div>
                    ) : (
                      activeForm.fields.map((field, idx) => {
                        const isSelected = field.id === selectedFieldId;
                        return (
                          <div 
                            key={field.id}
                            onClick={() => setSelectedFieldId(field.id)}
                            className={`border rounded-xl bg-white p-3.5 transition-all text-left relative cursor-pointer ${
                              isSelected 
                                ? 'border-blue-500 ring-2 ring-blue-50 shadow-xs' 
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[8px] bg-slate-50 text-slate-500 border-slate-200 font-bold uppercase tracking-wider">
                                  {field.type}
                                </Badge>
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => handleUpdateFieldProp(field.id, 'label', e.target.value)}
                                  className="text-xs font-bold text-slate-700 focus:outline-none focus:bg-slate-50 border-b border-transparent focus:border-slate-300 px-1 py-0.5 rounded"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleMoveField(idx, 'up'); }}
                                  disabled={idx === 0}
                                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 rounded"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleMoveField(idx, 'down'); }}
                                  disabled={idx === activeForm.fields.length - 1}
                                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 rounded"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                                <button 
                                  onClick={(e) => handleDeleteField(field.id, e)}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            {/* Additional configuration panel inside selected card */}
                            {isSelected && (
                              <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
                                {field.type !== 'checkbox' && (
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Placeholder (Marca de agua)</label>
                                    <Input
                                      value={field.placeholder || ''}
                                      onChange={(e) => handleUpdateFieldProp(field.id, 'placeholder', e.target.value)}
                                      placeholder="Ej. Escribe tu respuesta..."
                                      className="h-7.5 text-xs bg-slate-50/50"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                )}
                                
                                <div className="flex items-center space-x-2.5 h-full mt-4">
                                  <input 
                                    type="checkbox"
                                    id={`req-${field.id}`}
                                    checked={field.required}
                                    onChange={(e) => handleUpdateFieldProp(field.id, 'required', e.target.checked)}
                                    className="h-3.5 w-3.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <label 
                                    htmlFor={`req-${field.id}`} 
                                    className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    ¿Obligatorio / Requerido?
                                  </label>
                                </div>

                                {field.type === 'select' && (
                                  <div className="col-span-1 md:col-span-2 space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Opciones del selector (Separadas por comas)</label>
                                    <textarea
                                      rows={2}
                                      defaultValue={field.options?.join(', ') || ''}
                                      onBlur={(e) => handleUpdateSelectOptions(field.id, e.target.value)}
                                      placeholder="Ventas, Soporte, Facturación"
                                      className="w-full border border-slate-200 rounded-md p-2 text-xs bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="text-[9px] text-slate-400 italic block">Las opciones deben separarse por coma (ej. Opción 1, Opción 2).</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel: Interactive Live Preview */}
              <div className="hidden">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-3 text-left">
                  Vista Previa Interactiva
                </span>
                
                <div className="bg-white border border-slate-250 rounded-2xl shadow-xs p-5 space-y-4 max-w-sm mx-auto w-full text-left">
                  
                  {previewSubmitted ? (
                    <div className="text-center py-6 space-y-3">
                      <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-5.5 w-5.5" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">¡Mensaje Recibido!</h4>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                        {activeForm.successMessage}
                      </p>
                      <button
                        onClick={() => {
                          setPreviewFormData({});
                          setPreviewSubmitted(false);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 underline font-bold mt-2"
                      >
                        Enviar otra prueba
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handlePreviewSubmit} className="space-y-3.5">
                        <div className="border-b pb-3 space-y-2">
                          <span className="text-sm font-extrabold text-slate-800 block">
                            {activeForm.title || 'Contáctanos'}
                          </span>
                          {activeForm.description && (
                            <p className="text-[10px] whitespace-pre-line leading-relaxed text-slate-500">{activeForm.description}</p>
                          )}
                        </div>

                      {activeForm.fields.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs italic">
                          Añade campos para verlos acá.
                        </div>
                      ) : (
                        activeForm.fields.map((field, fieldIndex) => (
                          <React.Fragment key={field.id}>
                          {field.section && (fieldIndex === 0 || activeForm.fields[fieldIndex - 1]?.section !== field.section) && (
                            <div className="pt-3 pb-1 border-b border-slate-200">
                              <h3 className="text-[11px] font-extrabold text-slate-800">{field.section}</h3>
                            </div>
                          )}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-0.5">
                              <span>{field.label}</span>
                              {field.required && <span className="text-red-500">*</span>}
                            </label>

                            {field.type === 'textarea' ? (
                              <textarea
                                placeholder={field.placeholder || 'Escribe aquí...'}
                                value={previewFormData[field.id] || ''}
                                onChange={(e) => setPreviewFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                                rows={3}
                                required={field.required}
                                className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                              />
                            ) : field.type === 'select' ? (
                              <select
                                value={previewFormData[field.id] || ''}
                                onChange={(e) => setPreviewFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                                required={field.required}
                                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="" disabled>Selecciona una opción...</option>
                                {field.options?.map((opt, oIdx) => (
                                  <option key={oIdx} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : field.type === 'checkbox' ? (
                              <div className="flex items-center gap-2 pt-1">
                                <input
                                  type="checkbox"
                                  id={`prev-${field.id}`}
                                  checked={!!previewFormData[field.id]}
                                  onChange={(e) => setPreviewFormData(prev => ({ ...prev, [field.id]: e.target.checked ? 'Aceptado' : '' }))}
                                  required={field.required}
                                  className="h-3.5 w-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                />
                                <label htmlFor={`prev-${field.id}`} className="text-[10px] font-bold text-slate-500 cursor-pointer">
                                  Acepto los términos y políticas
                                </label>
                              </div>
                            ) : (
                              <Input
                                type={field.type}
                                placeholder={field.placeholder || ''}
                                value={previewFormData[field.id] || ''}
                                onChange={(e) => setPreviewFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                                required={field.required}
                                className="h-8.5 text-xs bg-white"
                              />
                            )}
                          </div>
                          </React.Fragment>
                        ))
                      )}

                      <button
                        type="submit"
                        disabled={activeForm.fields.length === 0}
                        className="w-full h-9 mt-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play className="h-3 w-3" />
                        <span>{activeForm.buttonText}</span>
                      </button>
                    </form>
                  )}
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-left space-y-1">
                  <div className="flex items-center gap-1 text-blue-700">
                    <Info className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-extrabold uppercase tracking-wide">Prueba Interactiva</span>
                  </div>
                  <p className="text-[9.5px] text-slate-500 leading-normal">
                    Rellena el formulario y envíalo. La respuesta se guardará en la cuenta de la agencia y aparecerá en <strong>Respuestas</strong>.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* VIEW B: SUBMISSIONS / LEADS TABLE */}
          {activeSubTab === 'submissions' && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              
              {/* Header with Search and Exports */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-2xs">
                
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar respuestas..."
                    value={submissionSearch}
                    onChange={(e) => setSubmissionSearch(e.target.value)}
                    className="w-full h-8.5 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Export / Clear buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleExportSubmissions(activeForm.id)}
                    className="h-8.5 px-3 bg-emerald-550 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <DownloadIcon className="h-3.5 w-3.5" />
                    <span>Exportar CSV</span>
                  </button>
                  <button
                    onClick={() => handleClearSubmissions(activeForm.id)}
                    className="h-8.5 px-3 border border-red-200 hover:border-red-300 text-red-500 hover:bg-red-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Trash className="h-3.5 w-3.5" />
                    <span>Vaciar</span>
                  </button>
                </div>
              </div>

              {/* Table / Grid */}
              {filteredSubmissions.length === 0 ? (
                <div className="p-16 bg-white border border-slate-200 rounded-xl text-center space-y-3">
                  <Mail className="h-8 w-8 text-slate-300 mx-auto" />
                  <h5 className="text-xs font-bold text-slate-600">No hay respuestas registradas</h5>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                    Los envíos de tus clientes en la web (y las pruebas enviadas desde la vista previa) aparecerán acá en tiempo real.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-250 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          <th className="p-3">Fecha</th>
                          <th className="p-3">IP / Origen</th>
                          {activeForm.fields.slice(0, 3).map(field => (
                            <th key={field.id} className="p-3 truncate max-w-[120px]">{field.label}</th>
                          ))}
                          {activeForm.fields.length > 3 && <th className="p-3">Otros</th>}
                          <th className="p-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredSubmissions.map((sub) => {
                          const date = new Date(sub.submittedAt).toLocaleString();
                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/50">
                              <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-[10px]">
                                {date}
                              </td>
                              <td className="p-3 whitespace-nowrap font-medium text-slate-600">
                                {sub.ip}
                              </td>
                              {activeForm.fields.slice(0, 3).map(field => (
                                <td key={field.id} className="p-3 truncate max-w-[120px] text-slate-500">
                                  {sub.formData[field.id] || '-'}
                                </td>
                              ))}
                              {activeForm.fields.length > 3 && (
                                <td className="p-3 text-[10px] font-bold text-blue-600 font-mono">
                                  +{activeForm.fields.length - 3} datos
                                </td>
                              )}
                              <td className="p-3 text-right whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedSubmission(sub)}
                                  className="h-7 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 rounded-md font-bold text-[10px] transition-colors"
                                >
                                  Ver Detalles
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 text-slate-400 space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
            <Sparkles className="h-8 w-8 animate-pulse" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">Diseña Formularios Dinámicos</h4>
          <p className="text-xs max-w-sm text-center text-slate-500">
            Selecciona un formulario de la lista izquierda o haz clic en "+" para empezar a recopilar información y leads.
          </p>
        </div>
      )}

      {/* Vista previa real en modal: no modifica la altura del diseñador */}
      {isPublicPreviewOpen && activeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex min-w-0 items-center gap-3 text-left">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Monitor className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">Vista previa pública</p>
                  <p className="truncate text-xs text-slate-500">{publicFormUrl}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={publicFormPath} target="_blank" rel="noreferrer" className="hidden h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:flex">
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir aparte
                </a>
                <button onClick={() => setIsPublicPreviewOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Cerrar vista previa">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe key={publicFormPath} src={publicFormPath} title={`Vista previa de ${activeForm.title}`} className="min-h-0 flex-1 w-full bg-slate-50" />
          </div>
        </div>
      )}

      {/* 3. MODAL: Submission Details */}
      {selectedSubmission && activeForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <Card className="bg-white border border-slate-250 max-w-md w-full rounded-2xl shadow-xl overflow-hidden text-left flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Detalles de Respuesta</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {selectedSubmission.id}</p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-750 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              
              {/* Metadata Panel */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border text-[10px]">
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-bold block uppercase tracking-wider">Fecha / Hora</span>
                  <span className="text-slate-600 font-mono">{new Date(selectedSubmission.submittedAt).toLocaleString()}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-bold block uppercase tracking-wider">IP de Envío</span>
                  <span className="text-slate-600 font-mono">{selectedSubmission.ip}</span>
                </div>
              </div>

              {/* Fields List */}
              <div className="space-y-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block border-b pb-1">
                  Datos Recopilados
                </span>
                
                <div className="space-y-3">
                  {activeForm.fields.map(field => {
                    const value = selectedSubmission.formData[field.id];
                    return (
                      <div key={field.id} className="space-y-1 bg-white border border-slate-100 p-2.5 rounded-lg shadow-2xs">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block">
                          {field.label}
                        </label>
                        <span className="text-xs font-semibold text-slate-850 block whitespace-pre-wrap">
                          {value || <em className="text-slate-350 font-normal">Sin responder</em>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-100 flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSubmission(null)}
                className="text-xs font-bold h-8 border-slate-200 shadow-2xs"
              >
                Cerrar
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};

// Reusable download icon
const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={2.5} 
    stroke="currentColor" 
    className="h-3.5 w-3.5"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

// Reusable X icon
const X: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={2.5} 
    stroke="currentColor" 
    className="h-4 w-4"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
