import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Key,
  Lock,
  Loader2,
  Copy,
  CheckCircle2,
  Mail,
  Smartphone,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
  Laptop,
  Clock,
  FileText
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthToken } from '@/firebase';

export const SeguridadManager: React.FC = () => {
  const { user } = useAuth();
  const sessionEmail = user?.email?.trim() || '';
  const [loading, setLoading] = useState(true);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [email2faEnabled, setEmail2faEnabled] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [backupCodesCount, setBackupCodesCount] = useState(0);

  // ─── TOTP Setup state ───
  const [showTotpSetupDialog, setShowTotpSetupDialog] = useState(false);
  const [totpSetupLoading, setTotpSetupLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [verifyingTotp, setVerifyingTotp] = useState(false);

  // ─── TOTP Disable state ───
  const [showTotpDisableDialog, setShowTotpDisableDialog] = useState(false);
  const [disableTotpCode, setDisableTotpCode] = useState('');
  const [disablingTotp, setDisablingTotp] = useState(false);

  // ─── Email 2FA Setup state ───
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const [verifyingEmailCode, setVerifyingEmailCode] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);

  // ─── Email 2FA Disable state ───
  const [showEmailDisableDialog, setShowEmailDisableDialog] = useState(false);
  const [disablingEmail, setDisablingEmail] = useState(false);

  // ─── Backup Codes state ───
  const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false);
  const [generatingBackupCodes, setGeneratingBackupCodes] = useState(false);
  const [backupCodesList, setBackupCodesList] = useState<string[]>([]);
  const [hasCopiedCodes, setHasCopiedCodes] = useState(false);

  // ─── Change Password state ───
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Cooldown effect for email resend
  useEffect(() => {
    if (emailCooldown > 0) {
      const timer = setTimeout(() => setEmailCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailCooldown]);

  useEffect(() => {
    if (sessionEmail) setUserEmail(sessionEmail);
    check2faStatus();
  }, [sessionEmail]);

  const check2faStatus = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/auth/2fa/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTotpEnabled(!!data.totpEnabled);
        setEmail2faEnabled(!!data.emailEnabled);
        // El correo visible y el destinatario pertenecen a la sesión activa.
        // El backend vuelve a resolverlo desde el usuario incluido en este JWT.
        setUserEmail(sessionEmail || data.email || '');
        setBackupCodesCount(data.backupCodesCount || 0);
      } else {
        // Fallback user email from session
        const sessionRaw = localStorage.getItem('auth_user_session');
        if (sessionRaw) {
          try {
            const u = JSON.parse(sessionRaw);
            if (sessionEmail || u.email || u.correo) setUserEmail(sessionEmail || u.email || u.correo);
          } catch (_) {}
        }
      }
    } catch (e: any) {
      console.error('Error checking 2fa status:', e);
    } finally {
      setLoading(false);
    }
  };

  // ─── TOTP Handlers ───
  const handleStartTotpSetup = async () => {
    setTotpSetupLoading(true);
    setShowTotpSetupDialog(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setQrCodeUrl(data.qrCodeUrl);
        setSecretKey(data.secret);
      } else {
        toast({
          title: 'Error',
          description: data.message || 'No se pudo iniciar la configuración de Google Authenticator.',
          variant: 'destructive'
        });
        setShowTotpSetupDialog(false);
      }
    } catch (e: any) {
      toast({
        title: 'Error de conexión',
        description: 'No se pudo conectar con el servidor.',
        variant: 'destructive'
      });
      setShowTotpSetupDialog(false);
    } finally {
      setTotpSetupLoading(false);
    }
  };

  const handleConfirmVerifyTotp = async () => {
    if (totpCode.length !== 6) {
      toast({
        title: 'Error',
        description: 'Ingrese el PIN de 6 dígitos generado por la app.',
        variant: 'destructive'
      });
      return;
    }
    setVerifyingTotp(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ secret: secretKey, code: totpCode })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: '¡Google Authenticator Activado!',
          description: 'La verificación mediante app está lista para proteger tu cuenta.',
        });
        setTotpEnabled(true);
        setShowTotpSetupDialog(false);
        setTotpCode('');
        setSecretKey('');
        setQrCodeUrl('');
      } else {
        toast({
          title: 'Código incorrecto',
          description: data.message || 'El código introducido no es válido o ha expirado.',
          variant: 'destructive'
        });
      }
    } catch (e: any) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al verificar el código.',
        variant: 'destructive'
      });
    } finally {
      setVerifyingTotp(false);
    }
  };

  const handleDisableTotp = async () => {
    if (disableTotpCode.length !== 6) {
      toast({
        title: 'Error',
        description: 'Ingrese el PIN de 6 dígitos actual.',
        variant: 'destructive'
      });
      return;
    }
    setDisablingTotp(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: disableTotpCode })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: 'App 2FA Desactivada',
          description: 'Google Authenticator ha sido desvinculado de la cuenta.',
        });
        setTotpEnabled(false);
        setShowTotpDisableDialog(false);
        setDisableTotpCode('');
      } else {
        toast({
          title: 'Código incorrecto',
          description: data.message || 'El código ingresado es incorrecto.',
          variant: 'destructive'
        });
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudo desactivar Google Authenticator.',
        variant: 'destructive'
      });
    } finally {
      setDisablingTotp(false);
    }
  };

  // ─── Email 2FA Handlers ───
  const handleSendEmailCode = async () => {
    setSendingEmailCode(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/auth/2fa/email/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: 'Código enviado por correo',
          description: `Se envió un PIN de 6 dígitos a ${data.email || userEmail}. Revisa tu bandeja de entrada o spam.`,
        });
        setEmailCooldown(60);
        setShowEmailDialog(true);
      } else {
        toast({
          title: 'Error al enviar código',
          description: data.message || 'No se pudo generar el código.',
          variant: 'destructive'
        });
      }
    } catch (e: any) {
      toast({
        title: 'Error de conexión',
        description: 'No se pudo contactar al servidor de correo.',
        variant: 'destructive'
      });
    } finally {
      setSendingEmailCode(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (emailOtpCode.length !== 6) {
      toast({
        title: 'Código incompleto',
        description: 'Por favor escribe el código de 6 dígitos recibido en tu correo.',
        variant: 'destructive'
      });
      return;
    }
    setVerifyingEmailCode(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/auth/2fa/email/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: emailOtpCode })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: '¡2FA por Correo Activado!',
          description: 'A partir de ahora recibirás un PIN de seguridad en tu correo en cada inicio de sesión.',
        });
        setEmail2faEnabled(true);
        setShowEmailDialog(false);
        setEmailOtpCode('');
      } else {
        toast({
          title: 'Código no válido',
          description: data.message || 'El código introducido ha expirado o es incorrecto.',
          variant: 'destructive'
        });
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudo verificar el código de correo.',
        variant: 'destructive'
      });
    } finally {
      setVerifyingEmailCode(false);
    }
  };

  const handleDisableEmail2fa = async () => {
    setDisablingEmail(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/auth/2fa/email/disable', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: '2FA por Correo Desactivado',
          description: 'Ya no se solicitarán códigos enviados por correo para ingresar.',
        });
        setEmail2faEnabled(false);
        setShowEmailDisableDialog(false);
      } else {
        toast({
          title: 'Error',
          description: data.message || 'No se pudo desactivar el 2FA por correo.',
          variant: 'destructive'
        });
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudo procesar la solicitud.',
        variant: 'destructive'
      });
    } finally {
      setDisablingEmail(false);
    }
  };

  // ─── Backup Codes Handlers ───
  const handleGenerateBackupCodes = async () => {
    setGeneratingBackupCodes(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/auth/2fa/backup-codes/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.codes)) {
        setBackupCodesList(data.codes);
        setBackupCodesCount(data.codes.length);
        setShowBackupCodesDialog(true);
        setHasCopiedCodes(false);
        toast({
          title: 'Códigos de respaldo generados',
          description: 'Guarda estos 8 códigos en un lugar seguro.',
        });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'No se pudieron generar los códigos.',
          variant: 'destructive'
        });
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Error al generar códigos de respaldo.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingBackupCodes(false);
    }
  };

  const handleCopyBackupCodes = () => {
    const text = `CÓDIGOS DE RESPALDO MERCO CRM\nCuenta: ${userEmail}\nGenerados: ${new Date().toLocaleString()}\n\n` +
      backupCodesList.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      '\n\nCada código solo se puede usar una vez.';
    navigator.clipboard.writeText(text);
    setHasCopiedCodes(true);
    toast({
      title: 'Códigos copiados',
      description: 'Los códigos se copiaron al portapapeles.',
    });
  };

  const handleDownloadBackupCodes = () => {
    const text = `CÓDIGOS DE RECUPERACIÓN Y RESPALDO 2FA\n=======================================\nCuenta: ${userEmail}\nFecha: ${new Date().toLocaleString()}\n\n` +
      backupCodesList.map((c, i) => `[ ] ${c}`).join('\n') +
      '\n\nGuarde este archivo en un lugar seguro. Cada código de respaldo puede utilizarse una única vez si pierde acceso a su correo o app de autenticación.\n';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codigos-respaldo-merco-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Archivo descargado',
      description: 'El archivo con los códigos de respaldo ha sido descargado.',
    });
  };

  // ─── Change Password Handler ───
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor introduce tu contraseña actual y la nueva contraseña.',
        variant: 'destructive'
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: 'Contraseña débil',
        description: 'La nueva contraseña debe contener al menos 6 caracteres.',
        variant: 'destructive'
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: 'No coinciden',
        description: 'La nueva contraseña y su confirmación no son iguales.',
        variant: 'destructive'
      });
      return;
    }

    setChangingPassword(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: '¡Contraseña actualizada!',
          description: 'Tu contraseña administrativa ha sido cambiada correctamente.',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast({
          title: 'Error',
          description: data.message || 'No se pudo cambiar la contraseña. Verifica tu clave actual.',
          variant: 'destructive'
        });
      }
    } catch (e) {
      toast({
        title: 'Error de conexión',
        description: 'No se pudo contactar con el servidor.',
        variant: 'destructive'
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const activeMethodsCount = (totpEnabled ? 1 : 0) + (email2faEnabled ? 1 : 0);

  return (
    <div className="max-w-4xl pb-12 text-slate-900">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-semibold tracking-tight">Seguridad</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configuración de acceso para <span className="font-medium text-slate-700">{userEmail || 'esta cuenta'}</span>
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando configuración…
        </div>
      ) : (
        <div className="space-y-8 pt-7">
          {/* ─── Sección 1: Métodos de Autenticación en 2 Pasos (2FA) ─── */}
          <div>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Autenticación en dos pasos
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Solicita un código adicional después de ingresar la contraseña.
                </p>
              </div>
              <span className="hidden text-xs text-slate-500 sm:block">{activeMethodsCount} de 2 métodos activos</span>
            </div>

            <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
              {/* ── MÉTODO 1: CÓDIGO POR CORREO ELECTRÓNICO (EMAIL OTP) ── */}
              <Card className="grid rounded-none border-0 bg-white shadow-none md:grid-cols-[minmax(0,1fr)_340px]">
                <CardHeader className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white p-0 text-slate-600">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium text-slate-900">
                          Código por correo
                        </CardTitle>
                        <CardDescription className="text-[11px] text-slate-500">
                          {userEmail || 'Correo de la cuenta'}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={cn(
                      "border-0 bg-transparent p-0 text-xs font-normal shadow-none",
                      email2faEnabled
                        ? "text-emerald-700"
                        : "text-slate-500"
                    )}>
                      <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", email2faEnabled ? "bg-emerald-500" : "bg-slate-300")} />
                      {email2faEnabled ? 'Activo' : 'Desactivado'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-5 pt-0 md:border-l md:border-slate-200 md:pt-5">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Al iniciar sesión, enviaremos un código de seis dígitos al correo de la cuenta que esté autenticándose.
                  </p>

                  <div className="flex items-center justify-between">
                    {email2faEnabled ? (
                      <div className="flex items-center gap-2 w-full justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={sendingEmailCode || emailCooldown > 0}
                          onClick={handleSendEmailCode}
                          className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                        >
                          <RefreshCw className={cn("h-3 w-3", sendingEmailCode && "animate-spin")} />
                          {emailCooldown > 0 ? `Reenviar en ${emailCooldown}s` : 'Enviar prueba'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowEmailDisableDialog(true)}
                          className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          Desactivar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleSendEmailCode}
                        disabled={sendingEmailCode}
                        variant="outline"
                        className="h-8 text-xs font-medium"
                      >
                        {sendingEmailCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                        Configurar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── MÉTODO 2: APLICACIÓN TOTP (GOOGLE AUTHENTICATOR) ── */}
              <Card className="grid rounded-none border-0 bg-white shadow-none md:grid-cols-[minmax(0,1fr)_340px]">
                <CardHeader className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white p-0 text-slate-600">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium text-slate-900">
                          Aplicación de autenticación
                        </CardTitle>
                        <CardDescription className="text-[11px] text-slate-500">
                          Código temporal (TOTP)
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={cn(
                      "border-0 bg-transparent p-0 text-xs font-normal shadow-none",
                      totpEnabled
                        ? "text-emerald-700"
                        : "text-slate-500"
                    )}>
                      <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", totpEnabled ? "bg-emerald-500" : "bg-slate-300")} />
                      {totpEnabled ? 'Activo' : 'Desactivado'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-5 pt-0 md:border-l md:border-slate-200 md:pt-5">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Usa una aplicación de autenticación para generar códigos temporales, incluso sin conexión a internet.
                  </p>

                  <div className="flex items-center justify-between">
                    {totpEnabled ? (
                      <div className="flex items-center gap-2 w-full justify-between">
                        <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Vinculado a tu teléfono
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowTotpDisableDialog(true)}
                          className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          Desactivar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleStartTotpSetup}
                        variant="outline"
                        className="h-8 text-xs font-medium"
                      >
                        <Key className="h-3.5 w-3.5" />
                        Configurar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>

          {/* ─── Sección 2: Códigos de Respaldo de Emergencia (Backup Codes) ─── */}
          <Card className="rounded-none border-x-0 border-y border-slate-200 bg-white shadow-none">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                      Códigos de recuperación
                      {backupCodesCount > 0 && (
                        <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 bg-emerald-50">
                          {backupCodesCount} códigos disponibles
                        </Badge>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Códigos de un solo uso para recuperar el acceso si no puedes utilizar el segundo factor.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateBackupCodes}
                  disabled={generatingBackupCodes}
                  className="h-9 text-xs border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 shrink-0 flex items-center gap-1.5"
                >
                  {generatingBackupCodes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {backupCodesCount > 0 ? 'Regenerar códigos' : 'Generar códigos'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ─── Sección 3: Cambio de Contraseña Administrativa ─── */}
          <Card className="rounded-none border-x-0 border-y border-slate-200 bg-white shadow-none">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium text-slate-900">Contraseña</CardTitle>
                  <CardDescription className="text-[11px] text-slate-500">
                    Cambia la contraseña utilizada para iniciar sesión.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
                <div>
                  <Label className="text-xs font-medium text-slate-700">Contraseña actual</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showCurrentPass ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Introduce tu contraseña actual"
                      className="text-xs h-9 bg-slate-50 pr-10 border-slate-200 focus:bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Nueva contraseña</Label>
                    <div className="relative mt-1">
                      <Input
                        type={showNewPass ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="text-xs h-9 bg-slate-50 pr-10 border-slate-200 focus:bg-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-700">Confirmar nueva contraseña</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la nueva clave"
                      className="text-xs h-9 bg-slate-50 border-slate-200 focus:bg-white mt-1"
                      required
                    />
                  </div>
                </div>

                {/* Password strength hint */}
                {newPassword && (
                  <div className="text-[11px] flex items-center gap-2 pt-1">
                    <span className="text-slate-500">Fortaleza:</span>
                    <span className={cn(
                      "font-bold",
                      newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword)
                        ? "text-emerald-600"
                        : newPassword.length >= 6
                          ? "text-amber-600"
                          : "text-rose-600"
                    )}>
                      {newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword)
                        ? "Excelente (Robusta)"
                        : newPassword.length >= 6
                          ? "Aceptable"
                          : "Débil (Mínimo 6 caracteres)"}
                    </span>
                  </div>
                )}

                <div className="pt-2 flex justify-start">
                  <Button
                    type="submit"
                    disabled={changingPassword || !currentPassword || !newPassword}
                    className="h-9 text-xs bg-slate-800 hover:bg-slate-900 text-white font-semibold flex items-center gap-1.5"
                  >
                    {changingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Guardar contraseña
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* ─── Sesión actual ─── */}
          <Card className="rounded-none border-x-0 border-y border-slate-200 bg-white shadow-none">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-md bg-slate-50 text-slate-700 border border-slate-200">
                  <Laptop className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-800">Sesión actual</CardTitle>
                  <CardDescription className="text-[11px] text-slate-500">
                    Información del acceso que estás utilizando ahora.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-white text-slate-600 border border-slate-200 flex items-center justify-center">
                    <Laptop className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-slate-800">Este navegador</p>
                      <Badge className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold py-0">
                        Activa
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {userEmail || 'Cuenta autenticada'}
                    </p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Sesión activa" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════ MODALES DE CONFIGURACIÓN ═══════════════════════ */}

      {/* ─── Modal 1: Configurar Email 2FA ─── */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="bg-white border sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Mail className="h-5 w-5 text-blue-600" />
              Verificación en 2 Pasos por Correo
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              Hemos enviado un código numérico de 6 dígitos a <strong className="text-slate-700">{userEmail}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
              <p className="font-semibold">Revisa tu bandeja de entrada o carpeta de Spam.</p>
              <p className="text-[11px] text-blue-700">El código tiene una validez de 10 minutos para confirmar la activación.</p>
            </div>

            <div className="space-y-1.5 text-center">
              <Label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                Escribe el código de 6 dígitos:
              </Label>
              <Input
                type="text"
                value={emailOtpCode}
                onChange={(e) => setEmailOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="000000"
                className="h-12 text-center text-2xl font-black font-mono tracking-widest border-slate-300 focus:border-blue-600 max-w-[200px] mx-auto"
                maxLength={6}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>¿No recibiste el correo?</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={sendingEmailCode || emailCooldown > 0}
                onClick={handleSendEmailCode}
                className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold h-7"
              >
                {emailCooldown > 0 ? `Reenviar en ${emailCooldown}s` : 'Reenviar código'}
              </Button>
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleVerifyEmailCode}
              disabled={verifyingEmailCode || emailOtpCode.length !== 6}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {verifyingEmailCode && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Confirmar y Activar 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 2: Desactivar Email 2FA ─── */}
      <Dialog open={showEmailDisableDialog} onOpenChange={setShowEmailDisableDialog}>
        <DialogContent className="bg-white border sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2 text-base">
              <ShieldAlert className="w-5 h-5" />
              Desactivar 2FA por Correo
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2">
              ¿Estás seguro de que deseas desactivar la verificación en dos pasos por correo electrónico? Tu cuenta quedará menos protegida frente a accesos no autorizados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t pt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowEmailDisableDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={disablingEmail}
              onClick={handleDisableEmail2fa}
            >
              {disablingEmail && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Desactivar de todas formas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 3: Configurar Google Authenticator (TOTP) ─── */}
      <Dialog open={showTotpSetupDialog} onOpenChange={setShowTotpSetupDialog}>
        <DialogContent className="bg-white border sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Smartphone className="h-5 w-5 text-emerald-600" />
              Configurar Google Authenticator
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sigue los pasos a continuación con la cámara de tu teléfono móvil.
            </DialogDescription>
          </DialogHeader>

          {totpSetupLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-4 py-2 text-center">
              <div className="flex justify-center">
                {qrCodeUrl && (
                  <div className="border p-2 bg-white rounded-xl shadow-sm ring-1 ring-slate-100">
                    <img src={qrCodeUrl} alt="Google Authenticator QR Code" className="w-[170px] h-[170px]" />
                  </div>
                )}
              </div>

              <div className="text-left text-xs space-y-2">
                <p className="text-slate-600">
                  1. Abre <strong>Google Authenticator</strong> o <strong>Authy</strong> y escanea el código QR de arriba.
                </p>
                <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">¿No puedes escanearlo? Clave manual:</span>
                  <div className="flex items-center justify-between font-mono text-xs text-slate-800">
                    <span className="break-all font-bold select-all tracking-wider">{secretKey}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(secretKey);
                        toast({ title: 'Copiado', description: 'Clave secreta copiada.' });
                      }}
                      className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-left border-t pt-3">
                <Label htmlFor="totp-code" className="text-xs font-bold uppercase text-slate-700">
                  2. Ingresa el código de 6 dígitos que muestra tu teléfono:
                </Label>
                <Input
                  id="totp-code"
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="h-11 text-center text-xl font-black font-mono tracking-widest border-slate-300 focus:border-emerald-600"
                  maxLength={6}
                />
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowTotpSetupDialog(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmVerifyTotp}
              disabled={verifyingTotp || totpCode.length !== 6}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {verifyingTotp && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Confirmar y Activar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 4: Desactivar Google Authenticator (TOTP) ─── */}
      <Dialog open={showTotpDisableDialog} onOpenChange={setShowTotpDisableDialog}>
        <DialogContent className="bg-white border sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-1.5 text-base">
              <ShieldAlert className="w-5 h-5" /> Desactivar Google Authenticator
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-1">
              Confirma introduciendo el código de 6 dígitos que genera la app en este momento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="disable-totp-code" className="text-xs font-bold uppercase text-slate-700">
                Código actual de la aplicación:
              </Label>
              <Input
                id="disable-totp-code"
                type="text"
                value={disableTotpCode}
                onChange={(e) => setDisableTotpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="000000"
                className="h-10 text-center text-lg font-black font-mono tracking-widest border-slate-300"
                maxLength={6}
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowTotpDisableDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleDisableTotp}
              disabled={disablingTotp || disableTotpCode.length !== 6}
              variant="destructive"
              size="sm"
            >
              {disablingTotp && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Desactivar Seguridad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 5: Ver Códigos de Respaldo Generados ─── */}
      <Dialog open={showBackupCodesDialog} onOpenChange={setShowBackupCodesDialog}>
        <DialogContent className="bg-white border sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <FileText className="h-5 w-5 text-amber-600" />
              Tus Códigos de Respaldo de Emergencia
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              Guarda estos códigos ahora. Cada código puede utilizarse una única vez si no tienes tu celular o correo a mano.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
              {backupCodesList.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 font-mono text-xs font-bold text-slate-800 select-all"
                >
                  <span className="text-slate-400 text-[10px] mr-2">{index + 1}.</span>
                  <span className="tracking-wider">{code}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyBackupCodes}
                className="flex-1 text-xs border-slate-300 font-medium"
              >
                {hasCopiedCodes ? <Check className="h-3.5 w-3.5 text-emerald-600 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                {hasCopiedCodes ? '¡Copiados al portapapeles!' : 'Copiar Todos'}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadBackupCodes}
                className="flex-1 text-xs border-slate-300 font-medium"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Descargar (.txt)
              </Button>
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex justify-end">
            <Button
              size="sm"
              onClick={() => setShowBackupCodesDialog(false)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              He Guardado Mis Códigos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
