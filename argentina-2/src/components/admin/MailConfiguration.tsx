import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Mail, Eye, EyeOff, Save } from 'lucide-react';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveAgencyId } from '@/lib/agency-isolation';

export const MailConfiguration: React.FC = () => {
  const { user } = useAuth();
  const activeAgencyId = getActiveAgencyId(user);
  const configId = `mail_config_${activeAgencyId || '2'}`;
  const [mailConfig, setMailConfig] = useState({
    email: '',
    password: '',
    imapHost: 'imap.hostinger.com',
    imapPort: '993',
    smtpHost: 'smtp.hostinger.com',
    smtpPort: '465'
  });
  const [showMailPassword, setShowMailPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMailConfig();

    const handleUpdate = () => {
      loadMailConfig();
    };
    window.addEventListener('mailConfigUpdated', handleUpdate);
    return () => {
      window.removeEventListener('mailConfigUpdated', handleUpdate);
    };
  }, [configId]);

  const loadMailConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await db
        .from('mail_config')
        .select()
        .eq('id', configId)
        .maybeSingle();

      if (error) {
        console.warn('Error al cargar config de correo:', error);
      } else if (data) {
        setMailConfig({
          email: data.email || '',
          password: data.password || '',
          imapHost: data.imap_host || 'imap.hostinger.com',
          imapPort: data.imap_port || '993',
          smtpHost: data.smtp_host || 'smtp.hostinger.com',
          smtpPort: data.smtp_port || '465'
        });
      } else if (!activeAgencyId || activeAgencyId === '2') {
        // Fallback to legacy default_mail if websy
        const fallback = await db.from('mail_config').select().eq('id', 'default_mail').maybeSingle();
        if (fallback.data) {
          setMailConfig({
            email: fallback.data.email || '',
            password: fallback.data.password || '',
            imapHost: fallback.data.imap_host || 'imap.hostinger.com',
            imapPort: fallback.data.imap_port || '993',
            smtpHost: fallback.data.smtp_host || 'smtp.hostinger.com',
            smtpPort: fallback.data.smtp_port || '465'
          });
        }
      } else {
        setMailConfig({
          email: '',
          password: '',
          imapHost: 'imap.hostinger.com',
          imapPort: '993',
          smtpHost: 'smtp.hostinger.com',
          smtpPort: '465'
        });
      }
    } catch (e) {
      console.error('Error in loadMailConfig:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        id: configId,
        agency_id: activeAgencyId || '2',
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
        throw new Error(error.message || 'Error desconocido');
      }

      // Dispatch custom event to notify other components (e.g. MessagingManager)
      window.dispatchEvent(new CustomEvent('mailConfigUpdated'));

      toast({ 
        title: "Configuración guardada", 
        description: "Los ajustes de correo han sido guardados exitosamente." 
      });
    } catch (e: any) {
      console.error('Error al guardar config de correo:', e);
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: e.message || "No se pudo guardar la configuración de correo."
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Mail className="h-6 w-6 text-blue-600" />
          Configuración de Correo Electrónico
        </h1>
        <p className="text-slate-500 mt-2">
          Configura tus credenciales IMAP y SMTP para recibir y enviar correos directamente desde la plataforma.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Credenciales de Acceso</CardTitle>
          <CardDescription>
            Introduce la cuenta de correo y la contraseña (o contraseña de aplicación) que utilizará el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input 
                id="email"
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
              />
            </div>
            <div className="space-y-2 relative">
              <Label htmlFor="password">Contraseña o App Password</Label>
              <div className="relative">
                <Input 
                  id="password"
                  type={showMailPassword ? "text" : "password"} 
                  placeholder="*********" 
                  value={mailConfig.password}
                  onChange={(e) => setMailConfig({...mailConfig, password: e.target.value})}
                  className="pr-10"
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
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Servidor de Entrada (IMAP)</CardTitle>
            <CardDescription>
              Configuración para recibir correos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Servidor IMAP</Label>
              <Input 
                placeholder="imap.dominio.com" 
                value={mailConfig.imapHost}
                onChange={(e) => setMailConfig({...mailConfig, imapHost: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Puerto IMAP</Label>
              <Input 
                placeholder="993" 
                value={mailConfig.imapPort}
                onChange={(e) => setMailConfig({...mailConfig, imapPort: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Servidor de Salida (SMTP)</CardTitle>
            <CardDescription>
              Configuración para enviar correos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Servidor SMTP</Label>
              <Input 
                placeholder="smtp.dominio.com" 
                value={mailConfig.smtpHost}
                onChange={(e) => setMailConfig({...mailConfig, smtpHost: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Puerto SMTP</Label>
              <Input 
                placeholder="465" 
                value={mailConfig.smtpPort}
                onChange={(e) => setMailConfig({...mailConfig, smtpPort: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          size="lg"
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 min-w-[200px]"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>
    </div>
  );
};

export default MailConfiguration;
