import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, RefreshCw, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/firebase';
import { getAuthErrorMessage, isEmailConfirmationPendingError } from '@/lib/auth-email';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Redirigir si ya está logueado
  React.useEffect(() => {
    if (user) {
      if (user.subCuenta === 'saas-admin') {
        navigate('/superadmin');
      } else {
        navigate('/admin');
      }
    }
  }, [user, navigate]);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const isDemo = searchParams.get('demo') === 'true';

  const [loginData, setLoginData] = useState({
    email: isDemo ? 'admin@gmail.com' : '',
    password: isDemo ? 'admin123' : '',
  });

  const [resetEmail, setResetEmail] = useState('');
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors = {
      email: '',
      password: '',
    };

    if (!loginData.email || !validateEmail(loginData.email)) {
      nextErrors.email = 'Email invalido';
    }

    if (!loginData.password || loginData.password.length < 6) {
      nextErrors.password = 'Contrasena debe tener al menos 6 caracteres';
    }

    if (nextErrors.email || nextErrors.password) {
      setErrors(nextErrors);
      return;
    }

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
        description: 'Sesion iniciada correctamente.',
      });

      const sessionRaw = localStorage.getItem('auth_user_session');
      let isSaasAdmin = false;
      if (sessionRaw) {
        try {
          const u = JSON.parse(sessionRaw);
          isSaasAdmin = u.sub_cuenta === 'saas-admin' || u.subCuenta === 'saas-admin';
        } catch (e) {}
      }

      if (isSaasAdmin) {
        navigate('/superadmin');
      } else {
        navigate('/admin');
      }
    } catch (error) {
      if (isEmailConfirmationPendingError(error)) {
        toast({
          title: 'Confirma tu correo',
          description: 'Tu cuenta existe, pero falta confirmar el email antes de iniciar sesion.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error de login',
          description: getAuthErrorMessage(error) || 'No se pudo iniciar sesion',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail || !validateEmail(resetEmail)) {
      toast({
        title: 'Email invalido',
        description: 'Por favor ingresa un email valido',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;

      toast({
        title: 'Email enviado',
        description: 'Revisa tu email para restablecer tu contrasena.',
      });
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error) {
      toast({
        title: 'Error',
        description: getAuthErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6f9] flex flex-col font-sans">
      {/* Top Promo Notification Bar */}
      <div className="w-full bg-gradient-to-r from-[#3e3af8] via-[#7f56ff] to-[#4d62f9] py-2 px-4 text-center text-xs font-semibold text-white flex items-center justify-center gap-2 relative z-50">
        <span>🚀 YA DISPONIBLE: Crea tu Tienda Online Multirrubro en 5 minutos.</span>
        <a href="https://merco.com/#como-funciona" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/80 transition-colors flex items-center gap-0.5">
          Empezar gratis &rarr;
        </a>
      </div>

      {/* Header Bar (Same as Landing Page) */}
      <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-[#1d1452] to-[#140d3a] border-b border-white/10 backdrop-blur-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3 group">
              <img 
                src="/Picsart_26-06-08_19-14-58-865.webp" 
                alt="merco logo" 
                className="h-12 w-auto rounded-xl object-contain shadow-lg hover:scale-105 transition-transform duration-200"
              />
            </a>

            {/* Desktop Navigation Menu */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="/" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Inicio</a>
              <a href="/#caracteristicas" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Características</a>
              <a href="/#como-funciona" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Cómo Funciona</a>
              <a href="/#integraciones" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Integraciones</a>
              <a href="/#contacto" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Contacto</a>
            </nav>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center gap-5">
              {/* Social Networks */}
              <div className="flex items-center gap-3">
                <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Facebook">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Instagram">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="YouTube">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.507a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.871.507 9.388.507 9.388.507s7.517 0 9.388-.507a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>

              <a 
                href="/register" 
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white text-[#140d3a] text-sm font-semibold hover:bg-gray-100 active:scale-95 transition-all shadow-md animate-pulse"
              >
                Registrarse
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button 
              type="button" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-gradient-to-b from-[#1d1452] to-[#140d3a] border-t border-white/5 py-4 px-6 absolute top-20 left-0 w-full z-30 shadow-xl">
            <div className="flex flex-col gap-4">
              <a href="/" className="text-base font-medium text-gray-300 hover:text-white py-1">Inicio</a>
              <a href="/#caracteristicas" className="text-base font-medium text-gray-300 hover:text-white py-1">Características</a>
              <a href="/#como-funciona" className="text-base font-medium text-gray-300 hover:text-white py-1">Cómo Funciona</a>
              <a href="/#integraciones" className="text-base font-medium text-gray-300 hover:text-white py-1">Integraciones</a>
              <a href="/#contacto" className="text-base font-medium text-gray-300 hover:text-white py-1">Contacto</a>
              
              <hr className="border-white/5 my-2" />
              
              {/* Actions Mobile */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Facebook">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Instagram">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                  </a>
                </div>
                <a 
                  href="/register" 
                  className="px-5 py-2 rounded-full bg-white text-[#140d3a] text-sm font-semibold hover:bg-gray-100"
                >
                  Registrarse
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-[550px]">
          {/* Card Principal */}
          <div className="shadow-lg border border-slate-100 rounded-2xl overflow-hidden bg-white p-6 md:p-8">
            {!showForgotPassword ? (
              // Formulario de Iniciar Sesión (Vista por Defecto)
              <div className="space-y-6">
                <h2 className="text-2xl md:text-3xl font-normal text-center text-slate-800 tracking-tight">
                  Inicia sesión en tu cuenta
                </h2>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                      Correo electrónico
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      className={`border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-[#f0f4ff]/20 h-11 px-4 text-slate-800 rounded-lg ${
                        errors.email ? 'border-red-500' : ''
                      }`}
                      value={loginData.email}
                      onChange={(e) => {
                        setLoginData({ ...loginData, email: e.target.value });
                        setErrors({ ...errors, email: '' });
                      }}
                    />
                    {errors.email && (
                      <div className="text-xs text-red-500 mt-1 flex items-center">
                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                        {errors.email}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                      Contraseña
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Contraseña"
                        className={`border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-[#f0f4ff]/20 h-11 px-4 pr-10 text-slate-800 rounded-lg ${
                          errors.password ? 'border-red-500' : ''
                        }`}
                        value={loginData.password}
                        onChange={(e) => {
                          setLoginData({ ...loginData, password: e.target.value });
                          setErrors({ ...errors, password: '' });
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
                    {errors.password && (
                      <div className="text-xs text-red-500 mt-1 flex items-center">
                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                        {errors.password}
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

                  <label className="flex items-center gap-3 text-sm text-slate-600 cursor-pointer pt-1">
                    <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
                    Recordarme
                  </label>

                  <Button
                    type="submit"
                    className="w-full bg-[#3498db] hover:bg-[#2980b9] text-white font-semibold h-11 text-sm rounded-lg mt-2 shadow-sm transition-all flex items-center justify-center cursor-pointer"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ingresando...</>
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
                    onClick={() => navigate('/register')}
                    className="text-sky-600 hover:text-sky-700 hover:underline font-semibold cursor-pointer"
                  >
                    Regístrate aquí
                  </button>
                </div>
              </div>
            ) : (
              // Formulario de Recuperar Contraseña
              <div className="space-y-6">
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                  </button>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Recuperar acceso</h2>
                  <p className="text-slate-500 text-sm">Ingresa tu email para recibir instrucciones</p>
                </div>

                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email" className="text-sm font-medium text-slate-700">
                      Email
                    </Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 h-11 px-4 text-slate-800 rounded-lg"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#3498db] hover:bg-[#2980b9] text-white font-semibold h-11 text-sm rounded-lg mt-6 cursor-pointer"
                  >
                    {isLoading ? 'Enviando...' : 'Enviar email'}
                  </Button>
                </form>
              </div>
            )}

            {/* Footer de Términos y condiciones */}
            <div className="text-center mt-8 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
              Al iniciar sesión, usted acepta nuestros{' '}
              <a href="#" className="text-sky-600 hover:underline">
                Términos y condiciones
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
