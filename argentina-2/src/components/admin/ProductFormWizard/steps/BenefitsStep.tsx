import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepComponentProps } from '../types';

const predefinedBenefits = [
  "Envío gratis",
  "Entrega en 24 horas",
  "Producto importado",
  "Producto ecológico",
  "Ahorro energético",
  "Fabricación local",
  "Servicio post-venta",
  "Producto orgánico",
  "Soporte técnico incluido",
  "Materiales premium"
];

const predefinedWarranties = [
  "Garantía de 6 meses",
  "Garantía de 1 año",
  "Garantía de 2 años",
  "Garantía de por vida",
  "Devolución en 30 días",
  "Reembolso garantizado",
  "Cambio sin costo",
  "Reparación incluida",
  "Repuestos disponibles",
  "Servicio técnico oficial"
];

const predefinedPaymentMethods = [
  "Tarjeta de crédito",
  "Tarjeta de débito",
  "Transferencia bancaria",
  "PayPal",
  "Efectivo",
  "Contra-reembolso",
  "Pago en cuotas",
  "Mercado Pago",
  "Nequi",
  "Daviplata"
];

export const BenefitsStep: React.FC<StepComponentProps> = ({
  formData,
  setFormData
}) => {
  const toggleBenefit = (benefit: string) => {
    const current = formData.benefits || [];
    if (current.includes(benefit)) {
      setFormData({ ...formData, benefits: current.filter(b => b !== benefit) });
    } else {
      setFormData({ ...formData, benefits: [...current, benefit] });
    }
  };

  const toggleWarranty = (warranty: string) => {
    const current = formData.warranties || [];
    if (current.includes(warranty)) {
      setFormData({ ...formData, warranties: current.filter(w => w !== warranty) });
    } else {
      setFormData({ ...formData, warranties: [...current, warranty] });
    }
  };

  const togglePaymentMethod = (method: string) => {
    const current = formData.paymentMethods || [];
    if (current.includes(method)) {
      setFormData({ ...formData, paymentMethods: current.filter(m => m !== method) });
    } else {
      setFormData({ ...formData, paymentMethods: [...current, method] });
    }
  };

  return (
    <div className="space-y-8">
      {/* Beneficios */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold text-gray-900">Beneficios del Producto</Label>
          <p className="text-sm text-gray-600 mt-1">Selecciona los beneficios que aplican a este producto</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {predefinedBenefits.map((benefit) => {
            const isSelected = formData.benefits?.includes(benefit);
            return (
              <button
                key={benefit}
                type="button"
                onClick={() => toggleBenefit(benefit)}
                className={cn(
                  "p-3 border-2 rounded-lg text-left transition-all flex items-center justify-between",
                  isSelected
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <span className="text-sm">{benefit}</span>
                {isSelected && <Check className="h-4 w-4 text-green-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Garantías */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold text-gray-900">Garantías</Label>
          <p className="text-sm text-gray-600 mt-1">Selecciona las garantías que ofrece este producto</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {predefinedWarranties.map((warranty) => {
            const isSelected = formData.warranties?.includes(warranty);
            return (
              <button
                key={warranty}
                type="button"
                onClick={() => toggleWarranty(warranty)}
                className={cn(
                  "p-3 border-2 rounded-lg text-left transition-all flex items-center justify-between",
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <span className="text-sm">{warranty}</span>
                {isSelected && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Métodos de Pago */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold text-gray-900">Métodos de Pago Aceptados</Label>
          <p className="text-sm text-gray-600 mt-1">Selecciona los métodos de pago disponibles para este producto</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {predefinedPaymentMethods.map((method) => {
            const isSelected = formData.paymentMethods?.includes(method);
            return (
              <button
                key={method}
                type="button"
                onClick={() => togglePaymentMethod(method)}
                className={cn(
                  "p-3 border-2 rounded-lg text-left transition-all flex items-center justify-between",
                  isSelected
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <span className="text-sm">{method}</span>
                {isSelected && <Check className="h-4 w-4 text-purple-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resumen */}
      {(formData.benefits?.length || formData.warranties?.length || formData.paymentMethods?.length) && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">Resumen Seleccionado:</p>
          <div className="space-y-2">
            {formData.benefits?.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-600">Beneficios: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {formData.benefits.map((b, i) => (
                    <Badge key={i} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {b}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {formData.warranties?.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-600">Garantías: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {formData.warranties.map((w, i) => (
                    <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {w}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {formData.paymentMethods?.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-600">Métodos de Pago: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {formData.paymentMethods.map((m, i) => (
                    <Badge key={i} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
