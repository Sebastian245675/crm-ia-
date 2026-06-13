import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import {
  User, Mail, Lock, Phone, Eye, EyeOff, AlertCircle,
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, Home, ChevronDown
} from 'lucide-react';
import { auth, db } from "@/firebase";
// Mocks para evitar errores de compilación ya que Firebase fue removido
const createUserWithEmailAndPassword = (...args: any[]) => Promise.resolve({ user: { uid: 'mock-uid' } });
const signInWithEmailAndPassword = (...args: any[]) => Promise.resolve({ user: { uid: 'mock-uid' } });
const sendPasswordResetEmail = (...args: any[]) => Promise.resolve();
const sendEmailVerification = (...args: any[]) => Promise.resolve();
const setDoc = (...args: any[]) => Promise.resolve();
const doc = (...args: any[]) => ({}) as any;

type RegisterStep = 'personal' | 'account' | 'verification';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">(
    searchParams.get('tab') === 'register' ? 'register' : 'login'
  );
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [registerStep, setRegisterStep] = useState<RegisterStep>('personal');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyLogo = async () => {
      try {
        const { data, error } = await db.from('company_profile').select('logo').maybeSingle();
        if (data && data.logo) {
          setCompanyLogo(data.logo);
        }
      } catch (err) {
        console.warn("Error fetching company logo:", err);
      }
    };
    fetchCompanyLogo();
  }, []);

  // Form validation states
  const [errors, setErrors] = useState({
    loginEmail: '',
    loginPassword: '',
    registerName: '',
    registerEmail: '',
    registerPhone: '',
    registerPassword: '',
    resetEmail: ''
  });

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    acceptTerms: false
  });

  const [resetPasswordEmail, setResetPasswordEmail] = useState('');

  const handleQuickAdminLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, 'admin@gmail.com', 'admin123');
      toast({
        title: "¡Acceso de administrador!",
        description: "Bienvenido al panel de administración",
      });
      setTimeout(() => {
        navigate('/admin');
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo acceder como administrador",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const validatePhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
  };

  // Handle login with email and password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrors({
      ...errors,
      loginEmail: '',
      loginPassword: ''
    });

    let hasErrors = false;

    if (!validateEmail(loginData.email)) {
      setErrors(prev => ({ ...prev, loginEmail: 'Ingresa un email válido' }));
      hasErrors = true;
    }

    if (!loginData.password) {
      setErrors(prev => ({ ...prev, loginPassword: 'La contraseña es obligatoria' }));
      hasErrors = true;
    }

    if (hasErrors) return;

    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, loginData.email, loginData.password);

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', loginData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión correctamente",
      });
      navigate('/');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        setErrors(prev => ({ ...prev, loginEmail: 'No existe una cuenta con este email' }));
      } else if (error.code === 'auth/wrong-password') {
        setErrors(prev => ({ ...prev, loginPassword: 'Contraseña incorrecta' }));
      } else if (error.code === 'auth/too-many-requests') {
        toast({
          title: "Demasiados intentos",
          description: "Has realizado demasiados intentos fallidos. Prueba más tarde o restablece tu contraseña.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo iniciar sesión. Verifica tus credenciales.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrors({
      ...errors,
      resetEmail: ''
    });

    if (!validateEmail(resetPasswordEmail)) {
      setErrors(prev => ({ ...prev, resetEmail: 'Ingresa un email válido' }));
      return;
    }

    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, resetPasswordEmail);
      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña",
      });
      setShowForgotPassword(false);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        setErrors(prev => ({ ...prev, resetEmail: 'No existe una cuenta con este email' }));
      } else {
        toast({
          title: "Error",
          description: "No se pudo enviar el correo de recuperación",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle register
  const validateRegisterForm = () => {
    let isValid = true;
    const newErrors = { ...errors };

    if (registerStep === 'personal') {
      if (!registerData.name.trim()) {
        newErrors.registerName = 'El nombre es obligatorio';
        isValid = false;
      } else if (registerData.name.length < 3) {
        newErrors.registerName = 'El nombre debe tener al menos 3 caracteres';
        isValid = false;
      }

      if (!validatePhoneNumber(registerData.phone)) {
        newErrors.registerPhone = 'Teléfono debe tener entre 8 y 15 dígitos';
        isValid = false;
      }
    }

    if (registerStep === 'account') {
      if (!validateEmail(registerData.email)) {
        newErrors.registerEmail = 'Ingresa un email válido';
        isValid = false;
      }

      if (!validatePassword(registerData.password)) {
        newErrors.registerPassword = 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número';
        isValid = false;
      } else if (registerData.password !== registerData.confirmPassword) {
        newErrors.registerPassword = 'Las contraseñas no coinciden';
        isValid = false;
      }

      if (!registerData.acceptTerms) {
        toast({
          title: "Términos y condiciones",
          description: "Debes aceptar los términos y condiciones para continuar",
          variant: "destructive",
        });
        isValid = false;
      }
    }

    setErrors({ ...newErrors });
    return isValid;
  };

  const advanceRegisterStep = () => {
    if (!validateRegisterForm()) return;

    if (registerStep === 'personal') {
      setRegisterStep('account');
    } else if (registerStep === 'account') {
      handleRegisterSubmit();
    }
  };

  const handleRegisterSubmit = async () => {
    setIsLoading(true);

    const { email, password, name, phone, address } = registerData;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);

      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        name,
        email,
        phone,
        address: address || '',
        createdAt: new Date(),
        emailVerified: true
      });

      toast({
        title: "¡Cuenta creada!",
        description: "¡Bienvenido a nuestra tienda!",
      });

      setRegisterStep('verification');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setErrors(prev => ({ ...prev, registerEmail: 'Este email ya está en uso' }));
        setRegisterStep('account');
      } else {
        toast({
          title: "Error",
          description: "No se pudo crear tu cuenta. Intenta nuevamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    advanceRegisterStep();
  };

  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setLoginData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  const LogoIcon = () => (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 13V21M5 13L2 16M5 13L8 16" stroke="#4cbd5a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8V21M12 8L9 11M12 8L15 11" stroke="#fcdb3a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 4V21M19 4L16 7M19 4L22 7" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#f3f6f9] flex flex-col font-sans">
      {/* Header Bar */}
      <header className="w-full bg-white border-b border-slate-200/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
          {companyLogo ? (
            <img src={companyLogo} alt="Logo de la Empresa" className="h-8 max-w-[200px] object-contain" />
          ) : (
            <LogoIcon />
          )}
        </div>
        <div className="flex items-center space-x-1.5 text-slate-500 text-sm">
          <span>Idioma de la plataforma:</span>
          <span className="font-semibold text-slate-700">Español</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[450px]">
          {/* Card Principal */}
          <Card className="shadow-lg border border-slate-100 rounded-2xl overflow-hidden bg-white p-8 md:p-10">
            {showForgotPassword ? (
              // Formulario recuperar contraseña
              <div className="space-y-6">
                <Button
                  variant="ghost"
                  className="mb-2 p-0 text-slate-500 hover:text-slate-800"
                  onClick={() => setShowForgotPassword(false)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al inicio de sesión
                </Button>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-slate-800">Recupera tu contraseña</h2>
                  <p className="text-sm text-slate-500">Ingresa tu correo electrónico para enviarte un enlace de recuperación.</p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email" className="text-sm font-medium text-slate-700">Correo electrónico</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="tu@email.com"
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 h-11 px-4 text-slate-800 rounded-lg"
                      value={resetPasswordEmail}
                      onChange={(e) => setResetPasswordEmail(e.target.value)}
                    />
                    {errors.resetEmail && (
                      <div className="text-xs text-red-500 mt-1 flex items-center">
                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                        {errors.resetEmail}
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#3498db] hover:bg-[#2980b9] text-white font-semibold h-11 text-sm rounded-lg mt-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                    ) : (
                      'Enviar enlace de recuperación'
                    )}
                  </Button>
                </form>
              </div>
            ) : registerStep === 'verification' ? (
              // Confirmación de registro exitoso
              <div className="text-center space-y-6 py-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-50 p-4">
                    <CheckCircle2 className="h-14 w-14 text-green-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-800">¡Cuenta creada exitosamente!</h3>
                  <p className="text-slate-500 text-sm">
                    Hemos enviado un correo de bienvenida a <span className="font-semibold text-slate-700">{registerData.email}</span>.
                    Tu cuenta ya está activa y puedes comenzar a comprar de inmediato.
                  </p>
                </div>
                <Button
                  className="w-full bg-[#3498db] hover:bg-[#2980b9] text-white font-semibold h-11 text-sm rounded-lg"
                  onClick={() => {
                    navigate('/');
                    setRegisterStep('personal');
                  }}
                >
                  Comenzar a comprar
                </Button>
              </div>
            ) : activeTab === 'login' ? (
              // Formulario de Iniciar Sesión (Vista por Defecto)
              <div className="space-y-6">
                <h2 className="text-2xl md:text-3xl font-normal text-center text-slate-800 tracking-tight">
                  Inicia sesión en tu cuenta
                </h2>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-sm font-medium text-slate-700">
                      Correo electrónico
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="tu@email.com"
                      className={`border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-[#f0f4ff]/20 h-11 px-4 text-slate-800 rounded-lg ${errors.loginEmail ? 'border-red-500' : ''
                        }`}
                      value={loginData.email}
                      onChange={(e) => {
                        setLoginData({ ...loginData, email: e.target.value });
                        setErrors({ ...errors, loginEmail: '' });
                      }}
                    />
                    {errors.loginEmail && (
                      <div className="text-xs text-red-500 mt-1 flex items-center">
                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                        {errors.loginEmail}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-sm font-medium text-slate-700">
                      Contraseña
                    </Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Contraseña"
                        className={`border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-[#f0f4ff]/20 h-11 px-4 pr-10 text-slate-800 rounded-lg ${errors.loginPassword ? 'border-red-500' : ''
                          }`}
                        value={loginData.password}
                        onChange={(e) => {
                          setLoginData({ ...loginData, password: e.target.value });
                          setErrors({ ...errors, loginPassword: '' });
                        }}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                    {errors.loginPassword && (
                      <div className="text-xs text-red-500 mt-1 flex items-center">
                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                        {errors.loginPassword}
                      </div>
                    )}
                    <div className="flex justify-end mt-1.5">
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 text-sky-600 hover:text-sky-700 hover:underline h-auto text-xs font-normal"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        ¿Ha olvidado la password?
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#3498db] hover:bg-[#2980b9] text-white font-semibold h-11 text-sm rounded-lg mt-2 shadow-sm transition-all flex items-center justify-center cursor-pointer"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Iniciando sesión...</>
                    ) : (
                      'Iniciar sesión'
                    )}
                  </Button>
                </form>

                {/* Separador */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-slate-400 font-medium">O Continuar con</span>
                  </div>
                </div>

                {/* Botón de Google */}
                <button
                  type="button"
                  onClick={() => {
                    toast({
                      title: "Google Login",
                      description: "Iniciando sesión con Google...",
                    });
                  }}
                  className="w-full flex items-center justify-between p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                      <img src="https://lh3.googleusercontent.com/a/default-user=s80-c" alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs font-semibold text-slate-700">Demo Admin</span>
                      <span className="text-[10px] text-slate-400">admin@gmail.com</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                </button>

                {/* Switch to Register */}
                <div className="text-center mt-6 text-sm text-slate-500">
                  ¿No tienes una cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setRegisterStep('personal');
                    }}
                    className="text-sky-600 hover:text-sky-700 hover:underline font-semibold cursor-pointer"
                  >
                    Regístrate
                  </button>
                </div>
              </div>
            ) : (
              // Formulario de Crear Cuenta (Registro)
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold text-slate-800">
                    Crea tu cuenta
                  </h2>
                  <p className="text-xs text-slate-400">
                    Paso {registerStep === 'personal' ? '1/2: Información Personal' : '2/2: Datos de Cuenta'}
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  {registerStep === 'personal' ? (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="register-name" className="text-sm font-medium text-slate-700">
                          Nombre Completo
                        </Label>
                        <Input
                          id="register-name"
                          placeholder="Juan Pérez"
                          className={`border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-[#f0f4ff]/20 h-11 px-4 text-slate-800 rounded-lg ${errors.registerName ? 'border-red-500' : ''
                            }`}
                          value={registerData.name}
                          onChange={(e) => {
                            setRegisterData({ ...registerData, name: e.target.value });
                            setErrors({ ...errors, registerName: '' });
                          }}
                        />
                        {errors.registerName && (
                          <div className="text-xs text-red-500 mt-1 flex items-center">
                            <AlertCircle className="h-3.5 w-3.5 mr-1" />
                            {errors.registerName}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="register-phone" className="text-sm font-medium text-slate-700">
                          Teléfono
                        </Label>
                        <Input
                          id="register-phone"
                          type="tel"
                          placeholder="Ej: 3001234567"
                          className={`border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-[#f0f4ff]/20 h-11 px-4 text-slate-800 rounded-lg ${errors.registerPhone ? 'border-red-500' : ''
                            }`}
                          value={registerData.phone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setRegisterData({ ...registerData, phone: value });
                            setErrors({ ...errors, registerPhone: '' });
                          }}
                        />
                        {errors.registerPhone && (
                          <div className="text-xs text-red-500 mt-1 flex items-center">
                            <AlertCircle className="h-3.5 w-3.5 mr-1" />
                            {errors.registerPhone}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="register-address" className="text-sm font-medium text-slate-700">
                          Dirección <span className="text-xs text-slate-400 font-normal">(opcional)</span>
                        </Label>
                        <Input
                          id="register-address"
                          placeholder="Calle 123 #45-67"
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-[#f0f4ff]/20 h-11 px-4 text-slate-800 rounded-lg"
                          value={registerData.address}
                          onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="register-email" className="text-sm font-medium text-slate-700">
                          Email
                        </Label>
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="tu@email.com"
                          className={`border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-[#f0f4ff]/20 h-11 px-4 text-slate-800 rounded-lg ${errors.registerEmail ? 'border-red-500' : ''
                            }`}
                          value={registerData.email}
                          onChange={(e) => {
                            setRegisterData({ ...registerData, email: e.target.value });
                            setErrors({ ...errors, registerEmail: '' });
                          }}
                        />
                        {errors.registerEmail && (
                          <div className="text-xs text-red-500 mt-1 flex items-center">
                            <AlertCircle className="h-3.5 w-3.5 mr-1" />
                            {errors.registerEmail}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="register-password" className="text-sm font-medium text-slate-700">
                          Contraseña
                        </Label>
                        <div className="relative">
                          <Input
                            id="register-password"
                            type={showRegisterPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className={`border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-[#f0f4ff]/20 h-11 px-4 pr-10 text-slate-800 rounded-lg ${errors.registerPassword ? 'border-red-500' : ''
                              }`}
                            value={registerData.password}
                            onChange={(e) => {
                              setRegisterData({ ...registerData, password: e.target.value });
                              setErrors({ ...errors, registerPassword: '' });
                            }}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          >
                            {showRegisterPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                          </button>
                        </div>
                        {errors.registerPassword ? (
                          <div className="text-xs text-red-500 mt-1 flex items-center">
                            <AlertCircle className="h-3.5 w-3.5 mr-1" />
                            {errors.registerPassword}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                            Debe contener al menos 8 caracteres, una mayúscula, una minúscula y un número
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="register-confirm-password" className="text-sm font-medium text-slate-700">
                          Confirmar Contraseña
                        </Label>
                        <Input
                          id="register-confirm-password"
                          type={showRegisterPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-[#f0f4ff]/20 h-11 px-4 text-slate-800 rounded-lg"
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        />
                      </div>

                      <div className="flex items-center space-x-2 pt-1">
                        <Checkbox
                          id="accept-terms"
                          checked={registerData.acceptTerms}
                          onCheckedChange={(checked) =>
                            setRegisterData({ ...registerData, acceptTerms: checked === true })
                          }
                        />
                        <Label htmlFor="accept-terms" className="text-xs text-slate-600 font-normal">
                          Acepto los <a href="#" className="text-sky-600 hover:underline">términos y condiciones</a>
                        </Label>
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-3">
                    {registerStep === 'account' && (
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-11 border-slate-200 text-slate-700 hover:bg-slate-50"
                        onClick={() => setRegisterStep('personal')}
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
                      </Button>
                    )}

                    <Button
                      type="submit"
                      className="flex-1 bg-[#3498db] hover:bg-[#2980b9] text-white font-semibold h-11 text-sm rounded-lg transition-all"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>
                      ) : registerStep === 'personal' ? (
                        <>Siguiente <ArrowRight className="h-4 w-4 ml-1" /></>
                      ) : (
                        'Crear Cuenta'
                      )}
                    </Button>
                  </div>
                </form>

                {/* Switch to Login */}
                <div className="text-center mt-6 text-sm text-slate-500">
                  ¿Ya tienes una cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="text-sky-600 hover:text-sky-700 hover:underline font-semibold cursor-pointer"
                  >
                    Inicia sesión
                  </button>
                </div>
              </div>
            )}

            {/* Footer de Términos y condiciones */}
            <div className="text-center mt-8 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
              Al iniciar sesión, usted acepta nuestros{' '}
              <a href="#" className="text-sky-600 hover:underline">
                Términos y condiciones
              </a>
            </div>
          </Card>
        </div>
      </div>
      {/* Quick Admin Login button - subtle */}
      <div className="pb-4 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] text-slate-400 hover:text-slate-600 hover:bg-transparent"
          onClick={handleQuickAdminLogin}
        >
          Acceso Rápido Admin
        </Button>
      </div>
    </div>
  );
};

