import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileText, Loader2, LockKeyhole } from 'lucide-react';

type PublicField = { id: string; type: 'text' | 'email' | 'textarea' | 'select' | 'checkbox' | 'tel'; label: string; placeholder?: string; required?: boolean; options?: string[]; section?: string };
type PublicForm = { id: string; title: string; description?: string; buttonText: string; successMessage: string; fields: PublicField[] };
type FormResponse = { form: PublicForm; branding: { name: string; logo?: string } };

const PublicFormPage: React.FC = () => {
  const { formId = '' } = useParams();
  const [payload, setPayload] = useState<FormResponse | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/forms/${encodeURIComponent(formId)}`)
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.message || 'No pudimos abrir este formulario.');
        if (!cancelled) setPayload(data);
      })
      .catch(loadError => !cancelled && setError(loadError?.message || 'No pudimos abrir este formulario.'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [formId]);

  const sections = useMemo(() => {
    const groups: Array<{ title: string; fields: PublicField[] }> = [];
    for (const field of payload?.form.fields || []) {
      const title = field.section || 'Información';
      const group = groups.find(item => item.title === title);
      if (group) group.fields.push(field);
      else groups.push({ title, fields: [field] });
    }
    return groups;
  }, [payload]);

  const currentSection = sections[activeSection];
  const progress = sections.length ? ((activeSection + 1) / sections.length) * 100 : 0;

  const validateCurrentSection = () => {
    const missing = currentSection?.fields.find(field => field.required && !values[field.id]?.trim());
    if (missing) {
      setError(`Completa el campo obligatorio: ${missing.label}`);
      document.getElementById(missing.id)?.focus();
      return false;
    }
    setError('');
    return true;
  };

  const goNext = () => {
    if (!validateCurrentSection()) return;
    setActiveSection(current => Math.min(current + 1, sections.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!payload || submitting || !validateCurrentSection()) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/public/forms/${encodeURIComponent(formId)}/submissions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ formData: values }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || 'No pudimos guardar las respuestas.');
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (submitError: any) {
      setError(submitError?.message || 'No pudimos guardar las respuestas. Intenta nuevamente.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></main>;
  if (!payload) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-md border border-slate-200 bg-white p-9 text-center shadow-sm">
        <FileText className="mx-auto h-7 w-7 text-slate-300" /><h1 className="mt-4 text-lg font-semibold text-slate-900">Formulario no disponible</h1><p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
      </div>
    </main>
  );

  const { form, branding } = payload;
  const descriptionParagraphs = (form.description || '').split(/\n\s*\n/).filter(Boolean);

  return (
    <main className="min-h-screen bg-[#eef1f5] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3.5">
            {branding.logo ? <img src={branding.logo} alt={branding.name} className="h-11 max-w-[170px] object-contain object-left" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#152238] text-sm font-semibold tracking-wide text-white">{branding.name.slice(0, 2).toUpperCase()}</div>}
            <div className="min-w-0 border-l border-slate-200 pl-3.5"><p className="truncate text-sm font-semibold text-slate-900">{branding.name}</p><p className="text-xs text-slate-500">Relevamiento inicial</p></div>
          </div>
          <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex"><LockKeyhole className="h-3.5 w-3.5" /> Información confidencial</div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-8 sm:py-10">
        {submitted ? (
          <section className="mx-auto max-w-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:px-14">
            <div className="mx-auto flex h-12 w-12 items-center justify-center bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-7 w-7" /></div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Envío confirmado</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Recibimos la información</h1><p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-slate-600">{form.successMessage}</p><div className="mx-auto mt-8 h-px max-w-xs bg-slate-200" /><p className="mt-5 text-xs text-slate-500">Puedes cerrar esta ventana.</p>
          </section>
        ) : (
          <div className="grid overflow-hidden border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.07)] lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="bg-[#152238] px-6 py-8 text-white sm:px-8 sm:py-10 lg:min-h-[680px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300">Cuestionario de proyecto</p><h1 className="mt-4 text-2xl font-semibold leading-8 tracking-tight">{form.title}</h1>
              <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">{descriptionParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
              <div className="mt-9 border-t border-white/15 pt-7">
                <div className="flex items-center justify-between text-xs"><span className="font-medium text-white">Progreso</span><span className="text-slate-300">{activeSection + 1} de {sections.length}</span></div>
                <div className="mt-3 h-1 bg-white/15"><div className="h-full bg-blue-400 transition-all duration-300" style={{ width: `${progress}%` }} /></div>
                <ol className="mt-6 space-y-4">{sections.map((section, index) => {
                  const done = index < activeSection; const active = index === activeSection;
                  return <li key={section.title} className={`flex items-start gap-3 ${active ? 'text-white' : 'text-slate-400'}`}><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border text-[11px] font-semibold ${done ? 'border-emerald-400 bg-emerald-400 text-slate-950' : active ? 'border-white bg-white text-slate-950' : 'border-white/20'}`}>{done ? <Check className="h-3.5 w-3.5" /> : index + 1}</span><span className="text-xs font-medium leading-5">{section.title.replace(/^\d+\.\s*/, '')}</span></li>;
                })}</ol>
              </div>
            </aside>

            <form onSubmit={handleSubmit} className="min-w-0 px-5 py-8 sm:px-10 sm:py-10 lg:px-12">
              <div className="border-b border-slate-200 pb-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Paso {activeSection + 1}</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{currentSection?.title.replace(/^\d+\.\s*/, '')}</h2><p className="mt-2 text-sm text-slate-500">Completa lo que sepas. Puedes dejar vacíos los campos que no sean obligatorios.</p></div>
              <div className="mt-7 space-y-7">{currentSection?.fields.map(field => (
                <div key={field.id} className="space-y-2.5">
                  {field.type !== 'checkbox' && <label htmlFor={field.id} className="block text-sm font-medium leading-5 text-slate-800">{field.label} {field.required && <span className="text-red-600">*</span>}</label>}
                  {field.type === 'textarea' ? <textarea id={field.id} rows={3} required={field.required} value={values[field.id] || ''} onChange={event => setValues(current => ({ ...current, [field.id]: event.target.value }))} placeholder={field.placeholder || 'Escribe tu respuesta'} className="w-full resize-y border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
                  : field.type === 'select' ? <select id={field.id} required={field.required} value={values[field.id] || ''} onChange={event => setValues(current => ({ ...current, [field.id]: event.target.value }))} className="h-11 w-full border border-slate-300 bg-white px-3 text-sm outline-none hover:border-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100"><option value="">Selecciona una opción</option>{field.options?.map(option => <option key={option} value={option}>{option}</option>)}</select>
                  : field.type === 'checkbox' ? <label className="flex cursor-pointer items-start gap-3 border border-slate-200 bg-slate-50 p-4"><input type="checkbox" required={field.required} checked={values[field.id] === 'Aceptado'} onChange={event => setValues(current => ({ ...current, [field.id]: event.target.checked ? 'Aceptado' : '' }))} className="mt-0.5 h-4 w-4 border-slate-300 text-blue-700" /><span className="text-sm leading-5 text-slate-700">{field.label}</span></label>
                  : <input id={field.id} type={field.type} required={field.required} value={values[field.id] || ''} onChange={event => setValues(current => ({ ...current, [field.id]: event.target.value }))} placeholder={field.placeholder || ''} className="h-11 w-full border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />}
                </div>
              ))}</div>
              {error && <p role="alert" className="mt-7 border-l-2 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              <div className="mt-9 flex items-center justify-between border-t border-slate-200 pt-6">
                <button type="button" onClick={() => setActiveSection(current => Math.max(0, current - 1))} disabled={activeSection === 0} className="inline-flex h-10 items-center gap-2 px-1 text-sm font-semibold text-slate-600 hover:text-slate-950 disabled:invisible"><ArrowLeft className="h-4 w-4" /> Anterior</button>
                {activeSection < sections.length - 1 ? <button type="button" onClick={goNext} className="inline-flex h-11 items-center gap-2 bg-[#152238] px-6 text-sm font-semibold text-white hover:bg-[#20314d]">Continuar <ArrowRight className="h-4 w-4" /></button> : <button type="submit" disabled={submitting} className="inline-flex h-11 items-center gap-2 bg-blue-700 px-6 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{submitting ? 'Enviando…' : form.buttonText}</button>}
              </div>
            </form>
          </div>
        )}
        <footer className="flex flex-col items-center justify-between gap-2 py-5 text-xs text-slate-500 sm:flex-row"><span>© {new Date().getFullYear()} {branding.name}</span><span>La información se utiliza únicamente para evaluar y organizar el proyecto.</span></footer>
      </div>
    </main>
  );
};

export default PublicFormPage;
