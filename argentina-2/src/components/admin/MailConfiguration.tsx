import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Mail, Eye, EyeOff, Save } from 'lucide-react';

export const MailConfiguration: React.FC = () => {
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

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast({ 
        title: "Configuración guardada", 
        description: "Los ajustes de correo han sido guardados exitosamente." 
      });
    }, 800);
  };

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
                onChange={(e) => setMailConfig({...mailConfig, email: e.target.value})}
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
