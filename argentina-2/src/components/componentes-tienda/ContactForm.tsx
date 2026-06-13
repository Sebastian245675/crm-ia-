import React, { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface ContactFormProps {
  title?: string;
  buttonText?: string;
  formId?: string;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  title = "Contáctanos",
  buttonText = "Enviar Mensaje",
  formId
}) => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [dynamicData, setDynamicData] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [customSchema, setCustomSchema] = useState<any | null>(null);

  // Load custom form schema if formId is provided
  useEffect(() => {
    if (!formId) {
      setCustomSchema(null);
      return;
    }

    try {
      let foundSchema = null;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('admin_custom_forms_')) {
          const formsList = JSON.parse(localStorage.getItem(key) || '[]');
          const found = formsList.find((f: any) => f.id === formId);
          if (found) {
            foundSchema = found;
            break;
          }
        }
      }
      setCustomSchema(foundSchema);
    } catch (e) {
      console.error("Error loading custom form schema:", e);
      setCustomSchema(null);
    }
  }, [formId]);

  // Submit Handler for Static Default Form
  const handleStaticSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Campos incompletos",
        description: "Por favor complete todos los datos requeridos.",
        variant: "destructive"
      });
      return;
    }

    // Save submission data even for the default form!
    try {
      const savedSubmissions = JSON.parse(localStorage.getItem('admin_form_submissions') || '[]');
      const newSubmission = {
        id: `sub-default-${Date.now()}`,
        formId: 'default',
        formData: {
          'Nombre Completo': formData.name,
          'Correo Electrónico': formData.email,
          'Mensaje o Consulta': formData.message
        },
        submittedAt: new Date().toISOString(),
        ip: '192.168.1.1 (Frente Web)',
        status: 'new'
      };
      localStorage.setItem('admin_form_submissions', JSON.stringify([newSubmission, ...savedSubmissions]));
    } catch (err) {
      console.error("Error saving static submission:", err);
    }

    setIsSubmitted(true);
    toast({
      title: "Mensaje enviado",
      description: "Recibimos tu consulta. Te responderemos a la brevedad."
    });
  };

  // Submit Handler for Dynamic Custom Form
  const handleDynamicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSchema) return;

    // Check required fields
    for (const field of customSchema.fields) {
      if (field.required && !dynamicData[field.id]?.trim()) {
        toast({
          title: "Campos incompletos",
          description: `El campo "${field.label}" es obligatorio.`,
          variant: "destructive"
        });
        return;
      }
    }

    // Save submission data
    try {
      const savedSubmissions = JSON.parse(localStorage.getItem('admin_form_submissions') || '[]');
      const newSubmission = {
        id: `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        formId: customSchema.id,
        formData: { ...dynamicData },
        submittedAt: new Date().toISOString(),
        ip: '192.168.1.20 (Frente Web)',
        status: 'new'
      };
      localStorage.setItem('admin_form_submissions', JSON.stringify([newSubmission, ...savedSubmissions]));
    } catch (err) {
      console.error("Error saving dynamic submission:", err);
    }

    setIsSubmitted(true);
    toast({
      title: "Formulario Enviado",
      description: customSchema.successMessage || "Hemos recibido tus datos correctamente."
    });
  };

  const handleReset = () => {
    setFormData({ name: '', email: '', message: '' });
    setDynamicData({});
    setIsSubmitted(false);
  };

  // Render Success State
  if (isSubmitted) {
    return (
      <section className="w-full py-16 px-6 md:px-12 bg-slate-50/50 flex justify-center">
        <div className="bg-white border border-slate-200 p-8 rounded-3xl max-w-md w-full shadow-sm text-center space-y-4">
          <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">¡Mensaje Recibido!</h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            {customSchema 
              ? customSchema.successMessage 
              : "Gracias por comunicarte con nosotros. Un asesor técnico se pondrá en contacto con vos a la brevedad."}
          </p>
          <button 
            onClick={handleReset}
            className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline font-bold"
          >
            Enviar otra consulta
          </button>
        </div>
      </section>
    );
  }

  // Render Dynamic Custom Form if schema matches
  if (customSchema) {
    return (
      <section className="w-full py-16 px-6 md:px-12 bg-slate-50/50 flex justify-center">
        <div className="bg-white border border-slate-200 p-8 rounded-3xl max-w-md w-full shadow-sm space-y-6 text-left">
          <div className="flex items-center space-x-2 border-b pb-3">
            <Mail className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              {customSchema.title || title}
            </h3>
          </div>

          <form onSubmit={handleDynamicSubmit} className="space-y-4">
            {customSchema.fields.map((field: any) => (
              <div key={field.id} className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-0.5">
                  <span>{field.label}</span>
                  {field.required && <span className="text-red-500 font-extrabold">*</span>}
                </label>

                {field.type === 'textarea' ? (
                  <textarea 
                    placeholder={field.placeholder || ''} 
                    rows={4} 
                    value={dynamicData[field.id] || ''}
                    onChange={(e) => setDynamicData(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                    required={field.required}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={dynamicData[field.id] || ''}
                    onChange={(e) => setDynamicData(prev => ({ ...prev, [field.id]: e.target.value }))}
                    required={field.required}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  >
                    <option value="" disabled>Selecciona una opción...</option>
                    {field.options?.map((opt: string, idx: number) => (
                      <option key={idx} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <div className="flex items-center gap-2.5 pt-1">
                    <input 
                      type="checkbox"
                      id={`form-check-${field.id}`}
                      checked={dynamicData[field.id] === 'Aceptado'}
                      onChange={(e) => setDynamicData(prev => ({ ...prev, [field.id]: e.target.checked ? 'Aceptado' : '' }))}
                      className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                      required={field.required}
                    />
                    <label htmlFor={`form-check-${field.id}`} className="text-[10px] font-bold text-slate-500 cursor-pointer">
                      Acepto los términos y condiciones.
                    </label>
                  </div>
                ) : (
                  <Input 
                    type={field.type}
                    placeholder={field.placeholder || ''} 
                    value={dynamicData[field.id] || ''}
                    onChange={(e) => setDynamicData(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="h-10 text-sm bg-white" 
                    required={field.required}
                  />
                )}
              </div>
            ))}

            <button 
              type="submit"
              className="h-10 w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{customSchema.buttonText || buttonText}</span>
            </button>
          </form>
        </div>
      </section>
    );
  }

  // Fallback to Static/Default Form
  return (
    <section className="w-full py-16 px-6 md:px-12 bg-slate-50/50 flex justify-center">
      <div className="bg-white border border-slate-200 p-8 rounded-3xl max-w-md w-full shadow-sm space-y-6 text-left">
        <div className="flex items-center space-x-2 border-b pb-3">
          <Mail className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
        </div>

        <form onSubmit={handleStaticSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre Completo</label>
            <Input 
              placeholder="Tu Nombre" 
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="h-10 text-sm bg-white" 
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Correo Electrónico</label>
            <Input 
              type="email"
              placeholder="Tu Correo" 
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="h-10 text-sm bg-white" 
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mensaje o Consulta</label>
            <textarea 
              placeholder="Escribe aquí tu consulta de ferretería..." 
              rows={4} 
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg p-3 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
            />
          </div>

          <button 
            type="submit"
            className="h-10 w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{buttonText}</span>
          </button>
        </form>
      </div>
    </section>
  );
};
