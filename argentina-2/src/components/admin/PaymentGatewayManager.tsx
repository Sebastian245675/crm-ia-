import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { CreditCard, Landmark, ShieldCheck, Key, Lock, Save, Loader2, Info } from 'lucide-react';

interface GatewayConfig {
  mercadoPagoEnabled: boolean;
  mercadoPagoPublicKey: string;
  mercadoPagoAccessToken: string;
  mercadoPagoSandbox: boolean;
  
  stripeEnabled: boolean;
  stripePublishableKey: string;
  stripeSecretKey: string;
  stripeLiveMode: boolean;
  
  bankEnabled: boolean;
  bankName: string;
  bankCbu: string;
  bankOwner: string;
  bankCuit: string;
  bankInstructions: string;
}

export const PaymentGatewayManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<GatewayConfig>({
    mercadoPagoEnabled: false,
    mercadoPagoPublicKey: '',
    mercadoPagoAccessToken: '',
    mercadoPagoSandbox: true,
    
    stripeEnabled: false,
    stripePublishableKey: '',
    stripeSecretKey: '',
    stripeLiveMode: false,
    
    bankEnabled: false,
    bankName: '',
    bankCbu: '',
    bankOwner: '',
    bankCuit: '',
    bankInstructions: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('admin_payment_gateway_config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (err) {
        console.error('Error al cargar pasarelas:', err);
      }
    }
  }, []);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('admin_payment_gateway_config', JSON.stringify(config));
      setLoading(false);
      toast({
        title: 'Configuración Guardada',
        description: 'Las pasarelas de pago se han actualizado correctamente.'
      });
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pt-1 pb-10">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pasarelas de Pago</h1>
        <p className="text-xs text-slate-500">
          Configura y conecta las plataformas de pago para recibir compras de tus clientes de forma segura.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Mercado Pago */}
        <Card className="border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm select-none">
                  MP
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">Mercado Pago</CardTitle>
                  <CardDescription className="text-[10px]">Cobros locales en pesos (CABA, BsAs, etc.)</CardDescription>
                </div>
              </div>
              <Switch
                checked={config.mercadoPagoEnabled}
                onCheckedChange={(checked) => setConfig({ ...config, mercadoPagoEnabled: checked })}
              />
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className={`space-y-4 transition-all duration-300 ${config.mercadoPagoEnabled ? 'opacity-100 pointer-events-auto' : 'opacity-50 pointer-events-none'}`}>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <Key className="h-3 w-3 text-sky-500" />
                  Public Key (Clave Pública)
                </label>
                <Input
                  placeholder="Ej. APP_USR-..."
                  value={config.mercadoPagoPublicKey}
                  onChange={(e) => setConfig({ ...config, mercadoPagoPublicKey: e.target.value })}
                  className="h-9 text-xs"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <Lock className="h-3 w-3 text-sky-500" />
                  Access Token (Token de Acceso)
                </label>
                <Input
                  type="password"
                  placeholder="Ej. APP_USR-87654..."
                  value={config.mercadoPagoAccessToken}
                  onChange={(e) => setConfig({ ...config, mercadoPagoAccessToken: e.target.value })}
                  className="h-9 text-xs"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex items-center justify-between bg-sky-50/50 p-2.5 rounded-lg border border-sky-100 text-xs text-sky-800">
                <div className="flex items-center gap-1.5 font-medium">
                  <Info className="h-4 w-4 text-sky-500" />
                  <span>Modo Sandbox (Pruebas)</span>
                </div>
                <Switch
                  checked={config.mercadoPagoSandbox}
                  onCheckedChange={(checked) => setConfig({ ...config, mercadoPagoSandbox: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stripe */}
        <Card className="border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-sm select-none">
                  Stripe
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">Stripe</CardTitle>
                  <CardDescription className="text-[10px]">Cobros internacionales con tarjeta de crédito</CardDescription>
                </div>
              </div>
              <Switch
                checked={config.stripeEnabled}
                onCheckedChange={(checked) => setConfig({ ...config, stripeEnabled: checked })}
              />
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className={`space-y-4 transition-all duration-300 ${config.stripeEnabled ? 'opacity-100 pointer-events-auto' : 'opacity-50 pointer-events-none'}`}>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <Key className="h-3 w-3 text-indigo-500" />
                  Publishable Key (Clave Pública)
                </label>
                <Input
                  placeholder="Ej. pk_test_..."
                  value={config.stripePublishableKey}
                  onChange={(e) => setConfig({ ...config, stripePublishableKey: e.target.value })}
                  className="h-9 text-xs font-mono"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <Lock className="h-3 w-3 text-indigo-500" />
                  Secret Key (Clave Secreta)
                </label>
                <Input
                  type="password"
                  placeholder="Ej. sk_test_..."
                  value={config.stripeSecretKey}
                  onChange={(e) => setConfig({ ...config, stripeSecretKey: e.target.value })}
                  className="h-9 text-xs font-mono"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex items-center justify-between bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 text-xs text-indigo-800">
                <div className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="h-4 w-4 text-indigo-500" />
                  <span>Modo Real (Live Mode)</span>
                </div>
                <Switch
                  checked={config.stripeLiveMode}
                  onCheckedChange={(checked) => setConfig({ ...config, stripeLiveMode: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transferencia Bancaria */}
        <Card className="border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow md:col-span-2">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm select-none">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">Transferencia Bancaria / Efectivo</CardTitle>
                  <CardDescription className="text-[10px]">Configura tus datos para recibir pagos manuales coordinados</CardDescription>
                </div>
              </div>
              <Switch
                checked={config.bankEnabled}
                onCheckedChange={(checked) => setConfig({ ...config, bankEnabled: checked })}
              />
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-300 ${config.bankEnabled ? 'opacity-100 pointer-events-auto' : 'opacity-50 pointer-events-none'}`}>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Nombre del Banco</label>
                <Input
                  placeholder="Ej. Banco Galicia / Banco Santander"
                  value={config.bankName}
                  onChange={(e) => setConfig({ ...config, bankName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">CBU / Alias</label>
                <Input
                  placeholder="Ej. alias.mercado.pago o CBU de 22 dígitos"
                  value={config.bankCbu}
                  onChange={(e) => setConfig({ ...config, bankCbu: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Titular de la Cuenta</label>
                <Input
                  placeholder="Ej. Juan Pérez"
                  value={config.bankOwner}
                  onChange={(e) => setConfig({ ...config, bankOwner: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">CUIT / CUIL</label>
                <Input
                  placeholder="Ej. 20-12345678-9"
                  value={config.bankCuit}
                  onChange={(e) => setConfig({ ...config, bankCuit: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Instrucciones de Pago</label>
                <textarea
                  placeholder="Indica las instrucciones que verá el cliente al finalizar la compra (ej. 'Envía el comprobante de transferencia a nuestro WhatsApp...')"
                  value={config.bankInstructions}
                  onChange={(e) => setConfig({ ...config, bankInstructions: e.target.value })}
                  className="w-full min-h-[70px] px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-slate-400 bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 px-6 shadow"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Guardar Configuración</span>
            </>
          )}
        </Button>
      </div>

    </div>
  );
};

export default PaymentGatewayManager;
