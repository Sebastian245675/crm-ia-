import React, { useState } from 'react';
// Mocks para evitar errores de compilación ya que Firebase fue removido
const addDoc = (...args: any[]) => ({}) as any;
const collection = (...args: any[]) => ({}) as any;
const serverTimestamp = () => new Date();
const Timestamp = { fromDate: (date: Date) => date } as any;
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from '../../hooks/use-toast';
import { LinkIcon, Link2Off, Copy, Share2, Calendar, Lock, Shield } from 'lucide-react';

interface ShareableLinkGeneratorProps {
  moduleType: string;
  moduleName: string;
}

const ShareableLinkGenerator: React.FC<ShareableLinkGeneratorProps> = ({
  moduleType,
  moduleName
}) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [requiresCode, setRequiresCode] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [expiryDays, setExpiryDays] = useState('7'); // Default 7 days

  const generateToken = () => {
    // Generate a random token of 20 characters
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleGenerateLink = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para generar enlaces compartidos",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const token = generateToken();

      // Calculate expiry date
      let expiresAt = null;
      if (expiryDays !== 'never') {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(expiryDays));
        // Convertimos a timestamp de Firestore
        expiresAt = Timestamp.fromDate(expiryDate);
      }

      // Save to Firestore
      await addDoc(collection(db, "sharedLinks"), {
        token,
        type: moduleType,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        expiresAt,
        requiresCode,
        accessCode: requiresCode ? accessCode : null,
        usageCount: 0
      });

      // Generate the link
      const baseUrl = window.location.origin;
      const generatedUrl = `${baseUrl}/shared/${moduleType}?token=${token}`;

      setGeneratedLink(generatedUrl);

      toast({
        title: "Enlace generado",
        description: "Se ha generado un enlace compartible exitosamente",
        variant: "default"
      });
    } catch (error) {
      console.error("Error generando enlace:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el enlace compartible",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast({
        title: "Enlace copiado",
        description: "El enlace ha sido copiado al portapapeles",
        variant: "default"
      });
    }
  };

  return (
    <Card className="border-blue-200 shadow-md mb-6">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
        <CardTitle className="text-blue-800 flex items-center gap-2">
          <Share2 className="h-5 w-5 text-blue-700" />
          Compartir {moduleName}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        {generatedLink ? (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
              <p className="text-sm text-blue-700 mb-1 font-medium">Enlace generado:</p>
              <div className="flex items-center">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="flex-1 p-2 border border-blue-200 rounded-l-md focus:outline-none bg-white text-gray-700 text-sm"
                />
                <Button
                  onClick={copyToClipboard}
                  className="rounded-l-none bg-blue-600 hover:bg-blue-700"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Detalles del enlace:</h4>
              <ul className="space-y-1 text-xs text-blue-700">
                <li className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Expiración: {expiryDays === 'never' ? 'Nunca expira' : `${expiryDays} días`}
                </li>
                <li className="flex items-center gap-2">
                  {requiresCode ? (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      Protegido con contraseña
                    </>
                  ) : (
                    <>
                      <Link2Off className="h-3.5 w-3.5" />
                      Sin protección de contraseña
                    </>
                  )}
                </li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setGeneratedLink(null)}
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                Generar otro enlace
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-600" />
                Expiración del enlace
              </label>
              <Select value={expiryDays} onValueChange={setExpiryDays}>
                <SelectTrigger className="border-blue-200 focus:border-blue-400">
                  <SelectValue placeholder="Selecciona expiración" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 día</SelectItem>
                  <SelectItem value="7">7 días</SelectItem>
                  <SelectItem value="30">30 días</SelectItem>
                  <SelectItem value="90">90 días</SelectItem>
                  <SelectItem value="never">Nunca expira</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requiresCode"
                  checked={requiresCode}
                  onCheckedChange={() => setRequiresCode(!requiresCode)}
                />
                <label
                  htmlFor="requiresCode"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 flex items-center gap-1.5"
                >
                  <Shield className="h-4 w-4 text-blue-600" />
                  Proteger con código de acceso
                </label>
              </div>

              {requiresCode && (
                <div className="pt-2">
                  <Input
                    type="text"
                    placeholder="Código de acceso"
                    value={accessCode}
                    onChange={e => setAccessCode(e.target.value)}
                    className="border-blue-200 focus:border-blue-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Este código deberá ser proporcionado para acceder al contenido compartido.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                onClick={handleGenerateLink}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading || (requiresCode && accessCode.length < 4)}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Generando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Generar Enlace Compartible
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShareableLinkGenerator;
