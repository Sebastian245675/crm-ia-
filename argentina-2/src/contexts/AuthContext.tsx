import { auth, db, sendWelcomeEmail } from "@/firebase";
import { getDocumentById, createDocumentWithId, updateDocument } from "@/lib/database";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { AgencyPermissions } from '@/lib/agency-permissions';

export interface UserAgency {
  id: string;
  name: string;
  role: string;
  logo?: string;
  plan?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  departmentNumber: string;
  phone: string;
  address: string;
  isAdmin: boolean;
  subCuenta?: string; // Permite identificar subcuentas
  liberta?: string; // "si" = subcuenta puede publicar directo; "no" = enviar a revisión
  accountRole?: 'agency_owner' | 'agency_user' | 'saas_admin';
  agencyId?: string | null;
  parentUserId?: string | null;
  permissions?: AgencyPermissions;
  active?: boolean;
  subscription?: {
    plan: string;
    plan_display_name: string;
    status: string;
    is_demo: boolean;
    trial_ends_at: string | null;
  };
  agencies?: UserAgency[];
}

interface AuthContextType {
  user: User | null;
  currentUser: any; // Firebase user object
  login: (email: string, password: string) => Promise<{
    success: boolean;
    require2fa?: boolean;
    tempToken?: string;
    method?: string;
    email?: string;
    requireAgencySelection?: boolean;
    agencies?: UserAgency[];
    error?: any;
  }>;
  login2fa: (tempToken: string, code: string) => Promise<{
    success: boolean;
    requireAgencySelection?: boolean;
    tempToken?: string;
    agencies?: UserAgency[];
    error?: any;
  }>;
  selectAgency: (tempToken: string, agencyId: string) => Promise<{ success: boolean; error?: any }>;
  switchAgency: (agencyId: string) => Promise<{ success: boolean; error?: any }>;
  register: (userData: Omit<User, 'id' | 'isAdmin'> & { password: string; plan?: string }) => Promise<{ success: boolean; error?: string; session?: any }>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Escucha cambios de sesión de Supabase
  useEffect(() => {
    let mounted = true;

    const applySession = async (supabaseUser: any) => {
      if (!mounted) return;
      await handleAuthStateChange(supabaseUser);
    };

    // Obtener sesión actual inmediatamente
    const sessionPromise = auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) return session.user;
        return null;
      })
      .catch(() => null);

    sessionPromise.then((user) => {
      if (mounted) applySession(user);
    });

    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      await applySession(session?.user || null);
    });

    // Fallback: si tras 8 segundos seguimos cargando, forzar fin (evita bloqueo infinito)
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, []);

  const handleAuthStateChange = async (supabaseUser: any) => {
    setCurrentUser(supabaseUser);
    if (supabaseUser) {
      const accountRole = supabaseUser.user_metadata?.account_role as User['accountRole'];
      const baseUser = {
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || "Usuario",
        departmentNumber: "",
        phone: "",
        address: "",
        isAdmin: accountRole === 'agency_owner' || accountRole === 'saas_admin' ||
                 supabaseUser.email?.toLowerCase() === "admin@gmail.com" ||
                 supabaseUser.email?.toLowerCase() === "admin@tienda.com",
        subCuenta: supabaseUser.user_metadata?.sub_cuenta || undefined,
        liberta: supabaseUser.user_metadata?.liberta as string | undefined,
        accountRole,
        agencyId: supabaseUser.user_metadata?.agency_id ? String(supabaseUser.user_metadata.agency_id) : null,
        parentUserId: supabaseUser.user_metadata?.parent_user_id ? String(supabaseUser.user_metadata.parent_user_id) : null,
        permissions: supabaseUser.user_metadata?.permissions || {},
        active: supabaseUser.user_metadata?.active !== false,
        subscription: (supabaseUser as any).subscription || null,
        agencies: supabaseUser.user_metadata?.agencies || [],
      };
      setUser(baseUser);
      setLoading(false);
    } else {
      setUser(null);
      setLoading(false);
    }
  };

  // Login con Supabase / Backend API
  const login = async (email: string, password: string) => {
    try {
      console.log("AuthContext:login:start", { email });
      
      const { data, error } = await auth.signInWithPassword({
        email,
        password
      });

      console.log("AuthContext:login:result", { userId: data?.user?.id, hasSession: !!data?.session, error });
      if (error) throw error;
      
      if (data?.require2fa) {
        return { success: true, require2fa: true, tempToken: data.tempToken, method: data.method, email: data.email };
      }

      if (data?.requireAgencySelection) {
        return { success: true, requireAgencySelection: true, tempToken: data.tempToken, agencies: data.agencies };
      }

      if (data?.user) {
        await handleAuthStateChange(data.user);
        return { success: true };
      }
      return { success: false, error: 'No se pudo obtener el usuario' };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error };
    }
  };

  const login2fa = async (tempToken: string, code: string) => {
    try {
      console.log("AuthContext:login2fa:start");
      const { data, error } = await (auth as any).signInWith2fa(tempToken, code);
      if (error) throw error;

      if (data?.requireAgencySelection) {
        return { success: true, requireAgencySelection: true, tempToken: data.tempToken, agencies: data.agencies };
      }

      if (data?.user) {
        await handleAuthStateChange(data.user);
        return { success: true };
      }
      return { success: false, error: 'No se pudo validar 2FA' };
    } catch (error) {
      console.error("Login 2FA error:", error);
      return { success: false, error };
    }
  };

  const selectAgency = async (tempToken: string, agencyId: string): Promise<{ success: boolean; error?: any }> => {
    try {
      console.log("AuthContext:selectAgency:start", { agencyId });
      const { data, error } = await (auth as any).selectAgency(tempToken, agencyId);
      if (error) throw error;

      if (data?.user) {
        await handleAuthStateChange(data.user);
        return { success: true };
      }
      return { success: false, error: 'No se pudo seleccionar la agencia' };
    } catch (error) {
      console.error("selectAgency error:", error);
      return { success: false, error };
    }
  };

  const switchAgency = async (agencyId: string): Promise<{ success: boolean; error?: any }> => {
    try {
      console.log("AuthContext:switchAgency:start", { agencyId });
      const { data, error } = await (auth as any).switchAgency(agencyId);
      if (error) throw error;

      if (data?.user) {
        await handleAuthStateChange(data.user);
        return { success: true };
      }
      return { success: false, error: 'No se pudo cambiar de agencia' };
    } catch (error) {
      console.error("switchAgency error:", error);
      return { success: false, error };
    }
  };

  // Registro con Supabase
  const register = async (userData: Omit<User, 'id' | 'isAdmin'> & { password: string; plan?: string }): Promise<{ success: boolean; error?: string; session?: any }> => {
    try {
      console.log("AuthContext:register:start", { email: userData.email });
      const { data, error: signupError } = await auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.name,
            phone: userData.phone,
            address: userData.address || "",
            plan: userData.plan || "free"
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (signupError) throw signupError;
      // Supabase devuelve un 200 pero sin identidades si el correo ya existe
      // (cuando la protección de enumeración está activa)
      if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
        return { 
          success: false, 
          error: "Este correo electrónico ya está registrado. Por favor, intenta iniciar sesión." 
        };
      }
      
      return { success: true, session: data.session };
    } catch (error: any) {
      console.error("Registration error:", error);
      return { success: false, error: error.message || "Error al registrar usuario" };
    }
  };

  // Reenviar correo de verificación
  const resendVerificationEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Resend verification error:", error);
      return { success: false, error: error.message || "Error al reenviar el correo" };
    }
  };

  // Actualizar datos del usuario
  const updateUser = (userData: Partial<User>) => {
    if (!user || !user.id) return;

    // Actualizar en Firestore
    updateDocument("users", user.id, userData);

    // Actualizar estado local
    setUser({
      ...user,
      ...userData,
    });
  };

  // Cerrar sesión
  const logout = async () => {
    await auth.signOut();
    setUser(null);
  };

  // No mostramos nada mientras verificamos el estado de autenticación
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Valor que se pasa al contexto
  const value = {
    user,
    currentUser,
    login,
    login2fa,
    selectAgency,
    switchAgency,
    register,
    resendVerificationEmail,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
