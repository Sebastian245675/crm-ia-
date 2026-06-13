import React, { useState, useEffect } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { db, doc, getDoc, collection, query, where, getDocs } from '../firebase';
import EmployeeManager from '../components/admin/EmployeeManager';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Lock, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

const SharedEmployeeManager: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [error, setError] = useState('');

  // Get the token from URL
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Buscar el documento que contiene este token en su campo "token"
        const q = query(collection(db, "sharedLinks"), where("token", "==", token));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const shareDoc = querySnapshot.docs[0];
          const data = shareDoc.data();
          // Check if this token is for employee management
          if (data.type === 'employees') {
            // Check if token has expired (solo si tiene fecha de expiración)
            if (data.expiresAt !== null && data.expiresAt && data.expiresAt.toDate() < new Date()) {
              setError('Este enlace ha expirado.');
              setIsLoading(false);
              return;
            }

            // Check if access code is required
            if (data.requiresCode) {
              setAccessCode(data.accessCode || '');
              setIsLoading(false);
            } else {
              setIsValid(true);
              setIsLoading(false);
            }
          } else {
            setError('Tipo de enlace inválido.');
            setIsLoading(false);
          }
        } else {
          setError('Enlace no válido o ha expirado.');
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error verificando token:", error);
        setError('Error al verificar el acceso. Por favor, intente más tarde.');
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (enteredCode === accessCode) {
      setIsValid(true);
      setError('');
    } else {
      setError('Código de acceso incorrecto.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold text-blue-800">Verificando acceso...</h2>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-blue-50 to-white">
        <Card className="w-full max-w-md border-red-200 shadow-lg">
          <CardHeader className="bg-red-50 border-b border-red-100">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error de Acceso
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-red-700 mb-4">{error}</p>
            <Button
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Volver a la página principal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accessCode && !isValid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-blue-50 to-white">
        <Card className="w-full max-w-md border-blue-200 shadow-lg">
          <CardHeader className="bg-blue-50 border-b border-blue-100">
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Acceso Protegido
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-600 mb-4">
              Este enlace requiere un código de acceso. Por favor, introduzca el código proporcionado.
            </p>

            <form onSubmit={handleAccessCodeSubmit}>
              <div className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value)}
                    placeholder="Código de acceso"
                    className="w-full p-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                    required
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Verificar Acceso
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 border-b border-blue-100 pb-4">
          <h1 className="text-3xl font-bold text-blue-800">Gestión de Empleados</h1>
          <p className="text-gray-600">Acceso compartido para administración de empleados</p>
        </div>

        <EmployeeManager isSharedAccess={true} shareToken={token} />
      </div>
    </div>
  );
};

export default SharedEmployeeManager;
