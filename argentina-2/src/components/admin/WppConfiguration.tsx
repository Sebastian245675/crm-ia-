import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/firebase';
import { Key, Settings, Sparkles, Eye, EyeOff, Loader2, Info, Check, Copy } from 'lucide-react';

export const WppConfiguration: React.FC = () => {
  const [geminiKey, setGeminiKey] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const webhookUrl = `${window.location.origin}/api/whatsapp`;

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await fetch('/api/agent/config', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setGeminiKey(data.gemini_key || '');
        setPhoneNumberId(data.phone_number_id || data.twilio_sid || '');
        setMetaAccessToken(data.meta_access_token || data.twilio_token || '');
        setVerifyToken(data.verify_token || data.twilio_num || '');
      }
    } catch (e) {
      console.error("Error loading agent config:", e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const payload = {
        gemini_key: geminiKey,
        phone_number_id: phoneNumberId,
        meta_access_token: metaAccessToken,
        verify_token: verifyToken,
      };
      const res = await fetch('/api/agent/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: "Configuración guardada", description: "La configuración del Agente e integración con Meta se guardó correctamente." });
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

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast({ title: "Webhook copiado" });
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(verifyToken);
    setCopiedToken(true);
    toast({ title: "Token copiado" });
    setTimeout(() => setCopiedToken(false), 2000);
  };

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Configuración de WhatsApp (Meta Cloud API)
        </h1>
        <p className="text-slate-600">
          Establece las credenciales de Gemini y Meta Developers para el Agente de IA y WhatsApp
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Form Settings */}
        <Card className="shadow-lg border border-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <span>Credenciales de API</span>
            </CardTitle>
            <CardDescription>
              Configura las llaves de acceso para activar el Agente de IA y la pasarela directa de Meta WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveConfig} className="space-y-5">
              {/* Gemini API Key */}
              <div className="space-y-2">
                <Label htmlFor="gemini-key" className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Gemini API Key</span>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px] py-0 px-2 flex items-center gap-1 border-none font-bold">
                    <Sparkles className="h-2.5 w-2.5" /> IA Activa
                  </Badge>
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="gemini-key"
                    type={showGeminiKey ? "text" : "password"}
                    placeholder={geminiKey ? "••••••••••••••••" : "Ingresa tu API Key de Gemini"}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="pl-9 pr-10 border-slate-200 h-10 text-sm focus-visible:ring-blue-500"
                  />
                  <button type="button" onClick={() => setShowGeminiKey(!showGeminiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              {/* Phone Number ID */}
              <div className="space-y-2">
                <Label htmlFor="phone-number-id" className="text-xs font-bold uppercase tracking-wider text-slate-500">ID del Teléfono (Phone Number ID)</Label>
                <Input
                  id="phone-number-id"
                  placeholder="Ej: 106555123456789"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  className="border-slate-200 h-10 text-sm focus-visible:ring-blue-500"
                />
              </div>

              {/* Meta Access Token */}
              <div className="space-y-2">
                <Label htmlFor="meta-access-token" className="text-xs font-bold uppercase tracking-wider text-slate-500">Token de Acceso Permanente (Meta Access Token)</Label>
                <div className="relative">
                  <Input
                    id="meta-access-token"
                    type={showMetaToken ? "text" : "password"}
                    placeholder={metaAccessToken ? "••••••••••••••••" : "Token de acceso permanente de Meta Developers"}
                    value={metaAccessToken}
                    onChange={(e) => setMetaAccessToken(e.target.value)}
                    className="pr-10 border-slate-200 h-10 text-sm focus-visible:ring-blue-500"
                  />
                  <button type="button" onClick={() => setShowMetaToken(!showMetaToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showMetaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Verify Token */}
              <div className="space-y-2">
                <Label htmlFor="verify-token" className="text-xs font-bold uppercase tracking-wider text-slate-500">Token de Verificación del Webhook (Verify Token)</Label>
                <Input
                  id="verify-token"
                  placeholder="Ej: mi_token_secreto_123"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  className="border-slate-200 h-10 text-sm focus-visible:ring-blue-500"
                />
              </div>

              <Button type="submit" disabled={savingConfig} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm active:scale-[0.98] transition-transform">
                {savingConfig ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Guardando...</>) : 'Guardar Configuración'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Column: Webhook Instructions */}
        <Card className="shadow-lg border border-slate-100 flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                <span>Instrucciones del Webhook</span>
              </CardTitle>
              <CardDescription>
                Cómo conectar tu número de WhatsApp de Meta con el Agente de IA de merco
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <p>
                Para recibir los mensajes enviados por tus clientes a tu número de WhatsApp y procesarlos directamente con el Agente de IA, debes configurar el Webhook en el portal de desarrolladores de Meta.
              </p>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  URL de devolución de llamada (Webhook URL)
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-2.5">
                  <code className="text-xs text-blue-600 break-all select-all flex-1 font-mono">{webhookUrl}</code>
                  <Button type="button" variant="ghost" size="icon" onClick={handleCopyWebhook} className="h-8 w-8 shrink-0">
                    {copiedWebhook ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
                  </Button>
                </div>

                {verifyToken && (
                  <>
                    <div className="font-bold text-xs uppercase tracking-wider text-slate-800 pt-1">
                      Token de verificación (Verify Token)
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-2.5">
                      <code className="text-xs text-slate-700 break-all select-all flex-1 font-mono">{verifyToken}</code>
                      <Button type="button" variant="ghost" size="icon" onClick={handleCopyToken} className="h-8 w-8 shrink-0">
                        {copiedToken ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
                      </Button>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <div className="font-bold text-xs uppercase tracking-wider text-slate-800">Pasos de Configuración en Meta Developers:</div>
                <ol className="list-decimal pl-5 space-y-2 text-xs">
                  <li>Inicia sesión en la consola de <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Meta Developers</a>.</li>
                  <li>Ve a tu aplicación configurada y selecciona **WhatsApp** &gt; **Configuración**.</li>
                  <li>En el apartado de **Webhooks**, haz clic en **Editar**.</li>
                  <li>Pega la **URL de devolución de llamada** copiada arriba.</li>
                  <li>Pega el **Token de verificación** correspondiente.</li>
                  <li>Haz clic en **Verificar y guardar**.</li>
                  <li>Una vez guardado, en la sección de Webhooks, suscríbete al campo de webhook llamado **messages** para empezar a recibir notificaciones en tiempo real.</li>
                </ol>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default WppConfiguration;
