import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { User, Mail, Lock, Phone, Eye, EyeOff, ArrowLeft, ArrowRight, CheckCircle2, MailCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type RegisterStep = 'personal' | 'account' | 'verification';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, register, resendVerificationEmail } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Redirigir si ya está logueado
  React.useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);
  const [resendLoading, setResendLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registerStep, setRegisterStep] = useState<RegisterStep>('personal');

  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    acceptTerms: false,
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: '',
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => password.length >= 6;

  const validatePhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      acceptTerms: '',
    };

    if (registerStep === 'personal') {
      if (!registerData.name.trim()) {
        newErrors.name = 'El nombre es requerido';
      }

      if (!registerData.email || !validateEmail(registerData.email)) {
        newErrors.email = 'Email invalido';
      }

      if (!registerData.phone || !validatePhoneNumber(registerData.phone)) {
        newErrors.phone = 'Telefono debe tener entre 8 y 15 digitos';
      }

      if (newErrors.name || newErrors.email || newErrors.phone) {
        setErrors(newErrors);
        return;
      }

      setRegisterStep('account');
      return;
    }

    if (!registerData.password || !validatePassword(registerData.password)) {
      newErrors.password = 'Contrasena debe tener al menos 6 caracteres';
    }

    if (registerData.password !== registerData.confirmPassword) {
      newErrors.confirmPassword = 'Las contrasenas no coinciden';
    }

    if (newErrors.password || newErrors.confirmPassword) {
      setErrors(newErrors);
      return;
    }

    setRegisterStep('verification');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerData.acceptTerms) {
      setErrors(prev => ({
        ...prev,
        acceptTerms: 'Debes aceptar los terminos y condiciones',
      }));
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({
        email: registerData.email,
        password: registerData.password,
        name: registerData.name,
        phone: registerData.phone,
        address: registerData.address,
        departmentNumber: "" // Requerido por la interfaz User
      });
      
      if (!result.success) throw new Error(result.error);
      
      setIsSuccess(true);
      toast({
        title: "¡Bienvenido!",
        description: "Tu cuenta ha sido creada exitosamente.",
      });

      // Redirigir automáticamente después de 2 segundos
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error en el registro",
        description: error.message || "No se pudo completar el registro",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    try {
      const result = await resendVerificationEmail(registerData.email);
      if (!result.success) throw new Error(result.error);
      
      toast({
        title: "Correo enviado",
        description: "Hemos reenviado el enlace de verificación",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el correo",
        variant: "destructive",
      });
    } finally {
      setResendLoading(false);
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
                href="/login" 
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white text-[#140d3a] text-sm font-semibold hover:bg-gray-100 active:scale-95 transition-all shadow-md animate-pulse"
              >
                Ingresar
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
                  href="/login" 
                  className="px-5 py-2 rounded-full bg-white text-[#140d3a] text-sm font-semibold hover:bg-gray-100"
                >
                  Ingresar
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
            
            {/* Progress Indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold ${
                  registerStep === 'personal' || registerStep === 'account' || registerStep === 'verification'
                    ? 'bg-[#3498db] text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  1
                </div>
                <div className={`flex-1 h-0.5 mx-2 ${
                  registerStep === 'account' || registerStep === 'verification'
                    ? 'bg-[#3498db]' : 'bg-slate-200'
                }`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold ${
                  registerStep === 'account' || registerStep === 'verification'
                    ? 'bg-[#3498db] text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  2
                </div>
                <div className={`flex-1 h-0.5 mx-2 ${
                  registerStep === 'verification'
                    ? 'bg-[#3498db]' : 'bg-slate-200'
                }`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold ${
                  registerStep === 'verification'
                    ? 'bg-[#3498db] text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  3
                </div>
              </div>
            </div>

            {isSuccess ? (
              <div className="text-center animate-in fade-in zoom-in duration-500 py-6">
                <div className="flex justify-center mb-4">
                  <div className="bg-green-100 p-3 rounded-full animate-bounce">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Registro Exitoso!</h2>
                <p className="text-slate-600 mb-6 text-sm">
                  Bienvenido a nuestra tienda, <span className="font-semibold text-slate-900">{registerData.name}</span>. 
                  Estamos preparando todo para que empieces a comprar.
                </p>
                
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-[#3498db] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-400 italic">Redirigiendo a la tienda...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl md:text-3xl font-normal text-center text-slate-800 tracking-tight">
                    Crea tu cuenta
                  </h2>
                  <p className="text-center text-slate-500 text-xs mt-1">
                    {registerStep === 'personal' && 'Paso 1: Información personal'}
                    {registerStep === 'account' && 'Paso 2: Datos de la cuenta'}
                    {registerStep === 'verification' && 'Paso 3: Términos y condiciones'}
                  </p>
                </div>

                <form onSubmit={registerStep === 'verification' ? handleRegister : handleNextStep} className="space-y-4">
                  
                  {/* Step 1: Personal Info */}
                  {registerStep === 'personal' && (
                    <div className="space-y-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                          Nombre completo
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                          <Input
                            id="name"
                            type="text"
                            placeholder="Tu nombre"
                            value={registerData.name}
                            onChange={(e) => {
                              setRegisterData({ ...registerData, name: e.target.value });
                              setErrors({ ...errors, name: '' });
                            }}
                            className={`pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-[#f0f4ff]/20 h-11 px-4 text-slate-800 rounded-lg ${
                              errors.name ? 'border-red-500' : ''
                            }`}
                          />
                        </div>
                        {errors.name && (
                          <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                          Email
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="tu@email.com"
                            value={registerData.email}
                            onChange={(e) => {
                              setRegisterData({ ...registerData, email: e.target.value });
                              setErrors({ ...errors, email: '' });
                            }}
                            className={`pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-[#f0f4ff]/20 h-11 px-4 text-slate-800 rounded-lg ${
                              errors.email ? 'border-red-500' : ''
                            }`}
                          />
                        </div>
                        {errors.email && (
                          <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                        )}
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                          Teléfono
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="1234567890"
                            value={registerData.phone}
                            onChange={(e) => {
                              setRegisterData({ ...registerData, phone: e.target.value });
                              setErrors({ ...errors, phone: '' });
                            }}
                            className={`pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-[#f0f4ff]/20 h-11 px-4 text-slate-800 rounded-lg ${
                              errors.phone ? 'border-red-500' : ''
                            }`}
                          />
                        </div>
                        {errors.phone && (
                          <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-[#3498db] hover:bg-[#2980b9] text-white font-semibold h-11 text-sm rounded-lg mt-6 shadow-sm transition-all flex items-center justify-center cursor-pointer gap-2"
                      >
                        Siguiente <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Step 2: Account */}
                  {registerStep === 'account' && (
                    <div className="space-y-4">
                      {/* Password */}
                      <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                          Contraseña
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={registerData.password}
                            onChange={(e) => {
                              setRegisterData({ ...registerData, password: e.target.value });
                              setErrors({ ...errors, password: '' });
                            }}
                            className={`pl-10 pr-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-[#f0f4ff]/20 h-11 px-4 text-slate-800 rounded-lg ${
                              errors.password ? 'border-red-500' : ''
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4.5 h-4.5" />
                            ) : (
                              <Eye className="w-4.5 h-4.5" />
                            )}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div className="space-y-1.5">
                        <Label htmlFor="confirm-password" className="text-sm font-medium text-slate-700">
                          Confirmar contraseña
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                          <Input
                            id="confirm-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={registerData.confirmPassword}
                            onChange={(e) => {
                              setRegisterData({ ...registerData, confirmPassword: e.target.value });
                              setErrors({ ...errors, confirmPassword: '' });
                            }}
                            className={`pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-[#f0f4ff]/20 h-11 px-4 text-slate-800 rounded-lg ${
                              errors.confirmPassword ? 'border-red-500' : ''
                            }`}
                          />
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                        )}
                      </div>

                      {/* Address */}
                      <div className="space-y-1.5">
                        <Label htmlFor="address" className="text-sm font-medium text-slate-700">
                          Dirección (opcional)
                        </Label>
                        <Input
                          id="address"
                          type="text"
                          placeholder="Tu dirección"
                          value={registerData.address}
                          onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-[#f0f4ff]/20 h-11 px-4 text-slate-800 rounded-lg"
                        />
                      </div>

                      <div className="flex gap-3 mt-6">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setRegisterStep('personal')}
                          className="flex-1 border-slate-200 hover:bg-slate-50 h-11 text-sm rounded-lg font-medium transition-all"
                        >
                          Atrás
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 bg-[#3498db] hover:bg-[#2980b9] text-white font-semibold h-11 text-sm rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          Siguiente <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Verification */}
                  {registerStep === 'verification' && (
                    <div className="space-y-5">
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 mb-4">
                        <div className="flex gap-3">
                          <CheckCircle2 className="w-5 h-5 text-[#3498db] flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-slate-800 text-sm mb-1.5">Resumen de registro</h3>
                            <div className="text-xs text-slate-500 space-y-1">
                              <p><strong>Nombre:</strong> {registerData.name}</p>
                              <p><strong>Email:</strong> {registerData.email}</p>
                              <p><strong>Teléfono:</strong> {registerData.phone}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <label className="flex items-start gap-3 cursor-pointer text-slate-600 mb-6">
                        <Checkbox
                          checked={registerData.acceptTerms}
                          onCheckedChange={(checked) => {
                            setRegisterData({ ...registerData, acceptTerms: checked as boolean });
                            setErrors({ ...errors, acceptTerms: '' });
                          }}
                          className="mt-1"
                        />
                        <span className="text-xs">
                          Acepto los términos y condiciones y la política de privacidad
                        </span>
                      </label>
                      {errors.acceptTerms && (
                        <p className="text-red-500 text-xs -mt-4 mb-4">{errors.acceptTerms}</p>
                      )}

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setRegisterStep('account')}
                          className="flex-1 border-slate-200 hover:bg-slate-50 h-11 text-sm rounded-lg font-medium transition-all"
                        >
                          Atrás
                        </Button>
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="flex-1 bg-[#3498db] hover:bg-[#2980b9] text-white font-semibold h-11 text-sm rounded-lg transition-all flex items-center justify-center"
                        >
                          {isLoading ? 'Registrando...' : 'Completar registro'}
                        </Button>
                      </div>
                    </div>
                  )}
                </form>

                {/* Login Link */}
                {registerStep === 'personal' && (
                  <div className="mt-6 text-center border-t border-slate-100 pt-6 text-sm text-slate-500">
                    ¿Ya tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="text-sky-600 hover:text-sky-700 hover:underline font-semibold cursor-pointer"
                    >
                      Ingresa aquí
                    </button>
                    {/* Solo mostrar Panel Admin si el usuario tiene permisos */}
                    {user?.isAdmin && (
                      <button onClick={() => { navigate('/admin'); }} className="w-full text-center mt-3 text-xs text-blue-600 font-bold uppercase tracking-wider block">Panel Admin</button>
                    )}
                  </div>
                )}
              </>
            )}
            
            {/* Footer de Términos y condiciones */}
            <div className="text-center mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
              Al registrarse, usted acepta nuestros{' '}
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

export default RegisterPage;
