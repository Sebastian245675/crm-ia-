import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Info, Copy, Upload, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { db, getAuthHeaders } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface CompanyProfile {
  id: string;
  friendlyName: string;
  legalName: string;
  logo?: string;
  postalAddress: string;
  city: string;
  postalCode: string;
  state: string;
  country: string;
}

export const CompanyConfiguration: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CompanyProfile>({
    id: '',
    friendlyName: '',
    legalName: '',
    logo: '',
    postalAddress: '',
    city: '',
    postalCode: '',
    state: '',
    country: 'Colombia'
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    loadCompanyProfile();
  }, []);

  const loadCompanyProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await db
        .from('company_profile')
        .select()
        .maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.warn('[CompanyConfiguration] company_profile:', error.code, (error as any)?.message);
        }

        if (error.code === 'PGRST116') {
          const newId = generateId();
          setFormData(prev => ({
            ...prev,
            id: newId
          }));
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: `Error al cargar: ${error.message || 'Error desconocido'}`
          });
        }
      } else if (data) {
        setFormData({
          id: data.id || generateId(),
          friendlyName: data.friendly_name || '',
          legalName: data.legal_name || '',
          logo: data.logo || '',
          postalAddress: data.postal_address || '',
          city: data.city || '',
          postalCode: data.postal_code || '',
          state: data.state || '',
          country: data.country || 'Colombia'
        });
      } else {
        const newId = generateId();
        setFormData(prev => ({
          ...prev,
          id: newId
        }));
      }
    } catch (error: any) {
      console.warn('[CompanyConfiguration] company_profile load failed:', error?.message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `No se pudo cargar la configuración: ${error?.message || 'Error desconocido'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const generateId = () => {
    return `ZNnq${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 9)}`;
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(formData.id);
    toast({
      title: 'Copiado',
      description: 'ID copiado al portapapeles.'
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload: any = {
        id: formData.id,
        friendly_name: formData.friendlyName || null,
        legal_name: formData.legalName || null,
        logo: formData.logo || null,
        postal_address: formData.postalAddress || null,
        city: formData.city || null,
        postal_code: formData.postalCode || null,
        state: formData.state || null,
        country: formData.country || 'Colombia',
        updated_at: new Date().toISOString(),
        updated_by: user?.email || 'unknown'
      };

      if (!payload.id) {
        payload.id = generateId();
      }

      const { data, error } = await db
        .from('company_profile')
        .upsert(payload, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error detallado al guardar:', error);
        throw new Error(`Error al guardar: ${error.message || error.code || 'Error desconocido'}`);
      }

      if (data && data.id && data.id !== formData.id) {
        setFormData(prev => ({ ...prev, id: data.id }));
      }

      window.dispatchEvent(new CustomEvent('companyProfileUpdated'));

      toast({
        title: 'Guardado exitosamente',
        description: 'La configuración de la empresa ha sido actualizada.'
      });
    } catch (error: any) {
      console.error('Error saving company profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message || 'No se pudo guardar la configuración.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El archivo no debe exceder 2.5 MB.'
      });
      return;
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor selecciona una imagen válida (JPG, PNG, WebP, etc.)'
      });
      return;
    }

    setUploadingLogo(true);

    try {
      const authToken = localStorage.getItem('auth_access_token');
      const uploadUrl = authToken
        ? `${window.location.origin}/api/upload?access_token=${encodeURIComponent(authToken)}`
        : `${window.location.origin}/api/upload`;

      const uploadData = new FormData();
      uploadData.append('file', file);

      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        },
        body: uploadData
      });

      const uploadText = await uploadRes.text();
      let uploadJson: any;
      try {
        uploadJson = uploadText ? JSON.parse(uploadText) : null;
      } catch (err) {
        throw new Error(`Upload failed ${uploadRes.status}: ${uploadText || 'No response body'}`);
      }

      if (!uploadRes.ok || !uploadJson?.success) {
        throw new Error(uploadJson?.message || `Error al subir el logo al backend (${uploadRes.status})`);
      }

      const publicUrl = uploadJson.url;
      if (!publicUrl) {
        throw new Error('No se recibió URL de logo después de subirlo');
      }

      setFormData({
        ...formData,
        logo: publicUrl
      });

      const payload: any = {
        id: formData.id || generateId(),
        friendly_name: formData.friendlyName || null,
        legal_name: formData.legalName || null,
        logo: publicUrl,
        postal_address: formData.postalAddress || null,
        city: formData.city || null,
        postal_code: formData.postalCode || null,
        state: formData.state || null,
        country: formData.country || 'Colombia',
        updated_at: new Date().toISOString(),
        updated_by: user?.email || 'unknown'
      };

      const { error: saveError } = await db
        .from('company_profile')
        .upsert(payload, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error guardando logo:', saveError);
        toast({
          variant: 'destructive',
          title: 'Logo subido pero no guardado',
          description: 'El logo se subió pero no se pudo guardar en la base de datos. Haz clic en "Guardar cambios".'
        });
      } else {
        if (!formData.id && payload.id) {
          setFormData(prev => ({ ...prev, id: payload.id }));
        }

        toast({
          title: 'Logo subido y guardado',
          description: 'El logo se ha subido y guardado correctamente.'
        });

        window.dispatchEvent(new CustomEvent('companyProfileUpdated'));
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error);

      // Mensaje específico para errores de políticas de Storage
      if (error?.message?.includes('row-level security') || error?.message?.includes('policy')) {
        toast({
          variant: 'destructive',
          title: 'Error de permisos',
          description: (
            <div className="space-y-2">
              <p className="font-semibold">Las políticas de Storage no están configuradas.</p>
              <p className="text-sm">Ejecuta el script <code className="bg-slate-100 px-1 rounded">storage-policies.sql</code> en el SQL Editor de Supabase.</p>
              <p className="text-xs text-slate-500">Ve a: Supabase Dashboard → SQL Editor → Ejecuta storage-policies.sql</p>
            </div>
          ),
          duration: 10000
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: `No se pudo subir el logo: ${error?.message || 'Error desconocido'}`
        });
      }
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = () => {
    setFormData({
      ...formData,
      logo: ''
    });
  };

  if (loading) {
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
          Configuración del perfil de empresa
        </h1>
        <p className="text-slate-600">
          Gestionar la información y la configuración de su perfil de empresa
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: General Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Información general la ubicación</span>
              <Info className="h-4 w-4 text-slate-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ID Field - Read Only */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">ID de la empresa</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={formData.id}
                  readOnly
                  className="bg-slate-50 font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyId}
                  className="flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Company Logo Section */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Logotipo de la empresa</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50 flex flex-col items-center justify-center min-h-[200px]">
                {formData.logo ? (
                  <div className="relative w-full max-w-[350px]">
                    <img
                      src={formData.logo}
                      alt="Company Logo"
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">BM</span>
                    </div>
                    <span className="text-sm font-medium text-slate-700">BIOSA MARKET</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 text-center">
                Logotipo de la empresa. El tamaño propuesto es de 350 x 180 px. No más de 2.5 MB.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  className="flex-1"
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Subir
                    </>
                  )}
                </Button>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploadingLogo}
                />
                {formData.logo && (
                  <Button
                    variant="outline"
                    onClick={handleDeleteLogo}
                    className="flex-1"
                    disabled={uploadingLogo}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>

            {/* Friendly Name */}
            <div className="space-y-2">
              <Label htmlFor="friendlyName">Nombre comercial amigable</Label>
              <Input
                id="friendlyName"
                value={formData.friendlyName}
                onChange={(e) => setFormData({ ...formData, friendlyName: e.target.value })}
                placeholder="Biosa Colombia"
              />
            </div>

            {/* Legal Name */}
            <div className="space-y-2">
              <Label htmlFor="legalName" className="flex items-center gap-2">
                Nombre legal de la empresa
                <Info className="h-4 w-4 text-slate-500" />
              </Label>
              <Input
                id="legalName"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                placeholder="Biosa Colombia SAS"
              />
            </div>
          </CardContent>
        </Card>

        {/* Right Card: Physical Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Dirección física de la empresa</span>
              <Info className="h-4 w-4 text-slate-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Postal Address */}
            <div className="space-y-2">
              <Label htmlFor="postalAddress" className="flex items-center gap-2">
                Dirección postal
                <Info className="h-4 w-4 text-slate-500" />
              </Label>
              <Input
                id="postalAddress"
                value={formData.postalAddress}
                onChange={(e) => setFormData({ ...formData, postalAddress: e.target.value })}
                placeholder="Carrera 18A #13B-26"
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Cali"
              />
            </div>

            {/* Postal Code */}
            <div className="space-y-2">
              <Label htmlFor="postalCode">Código postal</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="760001"
              />
            </div>

            {/* State/Province/Region */}
            <div className="space-y-2">
              <Label htmlFor="state">Estado / Prov. / Región</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Valle del Cauca"
              />
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Colombia"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4 pt-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="px-6"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
};
