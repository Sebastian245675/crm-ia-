import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/firebase';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import {
  getAuthErrorMessage,
  isAlreadyRegisteredError,
  isEmailConfirmationPendingError,
  isEmailRateLimitError,
  registerUserWithEmail,
  resendSignupConfirmationEmail,
} from '@/lib/auth-email';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RegisterStep = 'personal' | 'account' | 'verification';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [registerStep, setRegisterStep] = useState<RegisterStep>('personal');
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [errors, setErrors] = useState({
    loginEmail: '',
    loginPassword: '',
    registerName: '',
    registerEmail: '',
    registerPhone: '',
    registerPassword: '',
    resetEmail: '',
  });

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    acceptTerms: false,
  });

  const [resetPasswordEmail, setResetPasswordEmail] = useState('');

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setLoginData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (user && isOpen) {
      onClose();
    }
  }, [user, isOpen, onClose]);

  const resetRegisterState = () => {
    setRegisterStep('personal');
    setRequiresEmailConfirmation(false);
    setIsResendingConfirmation(false);
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePassword = (password: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);

  const validatePhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrors(prev => ({
      ...prev,
      loginEmail: '',
      loginPassword: '',
    }));

    let hasErrors = false;

    if (!validateEmail(loginData.email)) {
      hasErrors = true;
      setErrors(prev => ({ ...prev, loginEmail: 'Ingresa un email valido' }));
    }

    if (!loginData.password) {
      hasErrors = true;
      setErrors(prev => ({ ...prev, loginPassword: 'La contrasena es obligatoria' }));
    }

    if (hasErrors) return;

    setIsLoading(true);

    try {
      const result = await login(loginData.email, loginData.password);

      if (!result.success) {
        throw result.error;
      }

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', loginData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      toast({
        title: 'Bienvenido',
        description: 'Has iniciado sesion correctamente.',
      });

      if (true) { // User is logged in if success
        setTimeout(() => onClose(), 250);
      }
    } catch (error) {
      if (isEmailConfirmationPendingError(error)) {
        toast({
          title: 'Confirma tu correo',
          description: 'Tu cuenta existe, pero falta confirmar el email antes de iniciar sesion.',
          variant: 'destructive',
        });
      } else if (getAuthErrorMessage(error).includes('Invalid login credentials')) {
        setErrors(prev => ({ ...prev, loginEmail: 'Email o contrasena incorrectos' }));
      } else {
        toast({
          title: 'Error',
          description: getAuthErrorMessage(error) || 'No se pudo iniciar sesion.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrors(prev => ({ ...prev, resetEmail: '' }));

    if (!validateEmail(resetPasswordEmail)) {
      setErrors(prev => ({ ...prev, resetEmail: 'Ingresa un email valido' }));
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await auth.resetPasswordForEmail(resetPasswordEmail, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;

      toast({
        title: 'Correo enviado',
        description: 'Revisa tu bandeja para restablecer la contrasena.',
      });
      setShowForgotPassword(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: getAuthErrorMessage(error) || 'No se pudo enviar el correo de recuperacion.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateRegisterForm = () => {
    let isValid = true;
    const nextErrors = {
      ...errors,
      registerName: '',
      registerEmail: '',
      registerPhone: '',
      registerPassword: '',
    };

    if (registerStep === 'personal') {
      if (!registerData.name.trim()) {
        nextErrors.registerName = 'El nombre es obligatorio';
        isValid = false;
      } else if (registerData.name.trim().length < 3) {
        nextErrors.registerName = 'El nombre debe tener al menos 3 caracteres';
        isValid = false;
      }

      if (!validatePhoneNumber(registerData.phone)) {
        nextErrors.registerPhone = 'Telefono debe tener entre 8 y 15 digitos';
        isValid = false;
      }
    }

    if (registerStep === 'account') {
      if (!validateEmail(registerData.email)) {
        nextErrors.registerEmail = 'Ingresa un email valido';
        isValid = false;
      }

      if (!validatePassword(registerData.password)) {
        nextErrors.registerPassword =
          'La contrasena debe tener al menos 8 caracteres, una mayuscula, una minuscula y un numero';
        isValid = false;
      } else if (registerData.password !== registerData.confirmPassword) {
        nextErrors.registerPassword = 'Las contrasenas no coinciden';
        isValid = false;
      }

      if (!registerData.acceptTerms) {
        toast({
          title: 'Terminos y condiciones',
          description: 'Debes aceptar los terminos y condiciones para continuar.',
          variant: 'destructive',
        });
        isValid = false;
      }
    }

    setErrors(nextErrors);
    return isValid;
  };

  const handleRegisterSubmit = async () => {
    setIsLoading(true);

    try {
      const result = await registerUserWithEmail({
        email: registerData.email,
        password: registerData.password,
        name: registerData.name,
        phone: registerData.phone,
        address: registerData.address,
      });

      setRequiresEmailConfirmation(result.requiresEmailConfirmation);
      setRegisterStep('verification');

      toast({
        title: 'Cuenta creada',
        description: result.requiresEmailConfirmation
          ? 'Revisa tu correo para confirmar la cuenta.'
          : 'Tu cuenta ya esta activa.',
      });
    } catch (error) {
      if (isAlreadyRegisteredError(error)) {
        setErrors(prev => ({ ...prev, registerEmail: 'Este email ya esta en uso' }));
        setRegisterStep('account');
      } else {
        toast({
          title: 'Error',
          description: getAuthErrorMessage(error) || 'No se pudo crear tu cuenta.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const advanceRegisterStep = () => {
    if (!validateRegisterForm()) return;

    if (registerStep === 'personal') {
      setRegisterStep('account');
      return;
    }

    handleRegisterSubmit();
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    advanceRegisterStep();
  };

  const handleResendConfirmation = async () => {
    setIsResendingConfirmation(true);

    try {
      await resendSignupConfirmationEmail(registerData.email);
      toast({
        title: 'Correo reenviado',
        description: 'Te enviamos un nuevo enlace de confirmacion.',
      });
    } catch (error) {
      toast({
        title: isEmailRateLimitError(error) ? 'Espera un momento' : 'No se pudo reenviar',
        description: isEmailRateLimitError(error)
          ? 'Supabase limito temporalmente el envio. Intenta de nuevo en unos minutos.'
          : getAuthErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsResendingConfirmation(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setShowForgotPassword(false);
          resetRegisterState();
        }
      }}
    >
      <DialogContent className="sm:max-w-[450px] w-full max-w-[98vw] p-0 overflow-hidden">
        <div className="gradient-orange h-2"></div>

        {showForgotPassword ? (
          <>
            <DialogHeader className="p-4 sm:p-6 pb-4">
              <div className="flex items-center mb-2">
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 mr-2"
                  onClick={() => setShowForgotPassword(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="text-xl font-bold">Recuperar contrasena</DialogTitle>
              </div>
              <p className="text-gray-600 text-sm">
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contrasena.
              </p>
            </DialogHeader>

            <div className="p-4 sm:p-6 pt-0">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-orange-400" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="tu@email.com"
                      className="pl-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 w-full"
                      value={resetPasswordEmail}
                      onChange={(e) => setResetPasswordEmail(e.target.value)}
                    />
                    {errors.resetEmail && (
                      <div className="text-xs text-red-500 mt-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.resetEmail}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-orange hover:opacity-90 transition-opacity"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                    </>
                  ) : (
                    'Enviar enlace de recuperacion'
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : registerStep === 'verification' ? (
          <>
            <DialogHeader className="p-4 sm:p-6 pb-4">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-center text-green-600">
                {requiresEmailConfirmation ? 'Revisa tu correo' : 'Cuenta creada'}
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 sm:p-6 pt-0 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">
                {requiresEmailConfirmation ? 'Falta confirmar el email' : 'Tu acceso ya esta listo'}
              </h3>
              <p className="text-gray-600 mb-6">
                {requiresEmailConfirmation ? (
                  <>
                    Enviamos un correo de confirmacion a <span className="font-semibold">{registerData.email}</span>.
                    Revisa spam o promociones si no lo ves enseguida.
                  </>
                ) : (
                  <>
                    La cuenta de <span className="font-semibold">{registerData.email}</span> ya quedo activa.
                  </>
                )}
              </p>

              <div className="space-y-3">
                {requiresEmailConfirmation && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleResendConfirmation}
                    disabled={isResendingConfirmation}
                  >
                    {isResendingConfirmation ? 'Reenviando...' : 'Reenviar correo'}
                  </Button>
                )}
                <Button
                  className="w-full gradient-orange hover:opacity-90 transition-opacity"
                  onClick={() => {
                    onClose();
                    resetRegisterState();
                    navigate(requiresEmailConfirmation ? '/login' : '/');
                  }}
                >
                  {requiresEmailConfirmation ? 'Ir a iniciar sesion' : 'Comenzar a comprar'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="p-4 sm:p-6 pb-2">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-center gradient-text-orange">
                Bienvenido a la tienda
              </DialogTitle>
              <p className="text-center text-gray-600 text-xs sm:text-sm">
                {activeTab === 'login' ? 'Accede a tu cuenta para comprar' : 'Crea una cuenta para empezar a comprar'}
              </p>
            </DialogHeader>

            <div className="p-4 sm:px-6 pt-2" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <Tabs
                value={activeTab}
                onValueChange={(value) => {
                  setActiveTab(value as 'login' | 'register');
                  if (value === 'register') resetRegisterState();
                }}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-sm">
                    Iniciar sesion
                  </TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-sm">
                    Crear cuenta
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <Card className="border-0 shadow-none">
                    <CardContent className="px-0 pt-0">
                      <form onSubmit={handleLogin} className="space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor="login-email" className="text-sm font-medium">
                            Email
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-orange-400" />
                            <Input
                              id="login-email"
                              type="email"
                              placeholder="tu@email.com"
                              className={`pl-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 w-full ${
                                errors.loginEmail ? 'border-red-500' : ''
                              }`}
                              value={loginData.email}
                              onChange={(e) => {
                                setLoginData({ ...loginData, email: e.target.value });
                                setErrors({ ...errors, loginEmail: '' });
                              }}
                            />
                            {errors.loginEmail && (
                              <div className="text-xs text-red-500 mt-1 flex items-center">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {errors.loginEmail}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="login-password" className="text-sm font-medium">
                              Contrasena
                            </Label>
                            <Button
                              type="button"
                              variant="link"
                              className="p-0 text-orange-500 h-auto text-sm"
                              onClick={() => setShowForgotPassword(true)}
                            >
                              Olvidaste tu contrasena?
                            </Button>
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-orange-400" />
                            <Input
                              id="login-password"
                              type={showLoginPassword ? 'text' : 'password'}
                              placeholder="........"
                              className={`pl-10 pr-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 w-full ${
                                errors.loginPassword ? 'border-red-500' : ''
                              }`}
                              value={loginData.password}
                              onChange={(e) => {
                                setLoginData({ ...loginData, password: e.target.value });
                                setErrors({ ...errors, loginPassword: '' });
                              }}
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                            >
                              {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                            <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
                            Recordarme
                          </label>
                        </div>

                        <Button type="submit" className="w-full gradient-orange hover:opacity-90 transition-opacity" disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ingresando...
                            </>
                          ) : (
                            'Iniciar sesion'
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="register">
                  <Card className="border-0 shadow-none">
                    <CardContent className="px-0 pt-0">
                      <form onSubmit={handleRegister} className="space-y-4">
                        {registerStep === 'personal' ? (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="register-name" className="text-sm font-medium">
                                Nombre completo
                              </Label>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-orange-400" />
                                <Input
                                  id="register-name"
                                  type="text"
                                  placeholder="Tu nombre"
                                  className={`pl-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 ${
                                    errors.registerName ? 'border-red-500' : ''
                                  }`}
                                  value={registerData.name}
                                  onChange={(e) => {
                                    setRegisterData({ ...registerData, name: e.target.value });
                                    setErrors({ ...errors, registerName: '' });
                                  }}
                                />
                              </div>
                              {errors.registerName && (
                                <div className="text-xs text-red-500 mt-1 flex items-center">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {errors.registerName}
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="register-phone" className="text-sm font-medium">
                                Telefono
                              </Label>
                              <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-orange-400" />
                                <Input
                                  id="register-phone"
                                  type="tel"
                                  placeholder="1234567890"
                                  className={`pl-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 ${
                                    errors.registerPhone ? 'border-red-500' : ''
                                  }`}
                                  value={registerData.phone}
                                  onChange={(e) => {
                                    setRegisterData({ ...registerData, phone: e.target.value });
                                    setErrors({ ...errors, registerPhone: '' });
                                  }}
                                />
                              </div>
                              {errors.registerPhone && (
                                <div className="text-xs text-red-500 mt-1 flex items-center">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {errors.registerPhone}
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="register-address" className="text-sm font-medium">
                                Direccion (opcional)
                              </Label>
                              <Input
                                id="register-address"
                                type="text"
                                placeholder="Tu direccion"
                                className="border-orange-200 focus:border-orange-400 focus:ring-orange-400"
                                value={registerData.address}
                                onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                              />
                            </div>

                            <Button type="submit" className="w-full gradient-orange hover:opacity-90 transition-opacity">
                              Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-8 px-2 -ml-2"
                              onClick={() => setRegisterStep('personal')}
                            >
                              <ArrowLeft className="h-4 w-4 mr-1" /> Atras
                            </Button>

                            <div className="space-y-2">
                              <Label htmlFor="register-email" className="text-sm font-medium">
                                Email
                              </Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-orange-400" />
                                <Input
                                  id="register-email"
                                  type="email"
                                  placeholder="tu@email.com"
                                  className={`pl-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 ${
                                    errors.registerEmail ? 'border-red-500' : ''
                                  }`}
                                  value={registerData.email}
                                  onChange={(e) => {
                                    setRegisterData({ ...registerData, email: e.target.value });
                                    setErrors({ ...errors, registerEmail: '' });
                                  }}
                                />
                              </div>
                              {errors.registerEmail && (
                                <div className="text-xs text-red-500 mt-1 flex items-center">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {errors.registerEmail}
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="register-password" className="text-sm font-medium">
                                Contrasena
                              </Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-orange-400" />
                                <Input
                                  id="register-password"
                                  type={showRegisterPassword ? 'text' : 'password'}
                                  placeholder="........"
                                  className={`pl-10 pr-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 ${
                                    errors.registerPassword ? 'border-red-500' : ''
                                  }`}
                                  value={registerData.password}
                                  onChange={(e) => {
                                    setRegisterData({ ...registerData, password: e.target.value });
                                    setErrors({ ...errors, registerPassword: '' });
                                  }}
                                />
                                <button
                                  type="button"
                                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                >
                                  {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="register-confirm-password" className="text-sm font-medium">
                                Confirmar contrasena
                              </Label>
                              <Input
                                id="register-confirm-password"
                                type={showRegisterPassword ? 'text' : 'password'}
                                placeholder="........"
                                className="border-orange-200 focus:border-orange-400 focus:ring-orange-400"
                                value={registerData.confirmPassword}
                                onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                              />
                              {errors.registerPassword && (
                                <div className="text-xs text-red-500 mt-1 flex items-center">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {errors.registerPassword}
                                </div>
                              )}
                            </div>

                            <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                              <Checkbox
                                checked={registerData.acceptTerms}
                                onCheckedChange={(checked) =>
                                  setRegisterData({ ...registerData, acceptTerms: checked === true })
                                }
                              />
                              <span>Acepto los terminos y condiciones.</span>
                            </label>

                            <Button type="submit" className="w-full gradient-orange hover:opacity-90 transition-opacity" disabled={isLoading}>
                              {isLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando cuenta...
                                </>
                              ) : (
                                'Crear cuenta'
                              )}
                            </Button>
                          </>
                        )}
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
