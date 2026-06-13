import React, { useState } from 'react';
import { Wallet } from '@mercadopago/sdk-react';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase';

interface MercadoPagoButtonProps {
    items: any[];
    payer?: {
        email: string;
        name?: string;
    };
    onPaymentCreated?: (preferenceId: string) => void;
}

export const MercadoPagoButton: React.FC<MercadoPagoButtonProps> = ({ items, payer, onPaymentCreated }) => {
    const [preferenceId, setPreferenceId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { getTotal } = useCart();
    const { user } = useAuth();

    const handleCreatePreference = async () => {
        setIsLoading(true);
        try {
            // PASO 1: Guardar datos del pedido en localStorage ANTES de redirigir a MP
            // Esto es crítico porque al volver de MP, el carrito podría estar vacío
            const subtotal = getTotal();
            const deliveryFee = subtotal >= 60000 ? 0 : 2000;
            const total = subtotal + deliveryFee;
            
            const pendingOrder = {
                user_id: user?.id || '',
                user_name: payer?.name || user?.name || 'Usuario',
                user_email: payer?.email || user?.email || '',
                user_phone: null,
                items: items.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: Number(item.price),
                    quantity: Number(item.quantity),
                    image: item.image
                })),
                total: total,
                delivery_fee: deliveryFee,
                saved_at: new Date().toISOString()
            };
            
            localStorage.setItem('pending_mp_order', JSON.stringify(pendingOrder));
            console.log('[MercadoPago] Pedido guardado en localStorage antes de redirigir:', pendingOrder);

            // PASO 2: También guardar la orden en Supabase como 'pending' inmediatamente
            const externalRef = `ORDER-${Date.now()}`;
            const isSupabase = typeof (db as any)?.from === 'function';
            if (isSupabase && user?.id) {
                const { error } = await (db as any).from('orders').insert([{
                    user_id: user.id,
                    user_name: payer?.name || user?.name || null,
                    user_email: payer?.email || user?.email || null,
                    items: pendingOrder.items,
                    total: total,
                    delivery_fee: deliveryFee,
                    status: 'pending',
                    order_type: 'online',
                    order_notes: `Pago con Mercado Pago (pendiente) | Ref: ${externalRef}`,
                }]);
                if (error) {
                    console.error('[MercadoPago] Error pre-saving order:', error);
                    // No bloqueamos el flujo, el pedido se guardará al volver de MP
                } else {
                    console.log('[MercadoPago] Orden pre-guardada con status pending y ref:', externalRef);
                }
            }

            // PASO 3: Crear preferencia de Mercado Pago
            const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-8082943511700817-030508-69f017ff1dbb9cfd758e54290ba6953f-439164010'}`
                },
                body: JSON.stringify({
                    items: [
                        ...items.map(item => ({
                            id: item.id,
                            title: item.name,
                            unit_price: Number(item.price),
                            quantity: Number(item.quantity),
                            currency_id: 'ARS',
                            picture_url: item.image
                        })),
                        // Agregar el costo de envío como un item si existe
                        ...(deliveryFee > 0 ? [{
                            id: 'shipping-fee',
                            title: 'Costo de Envío',
                            unit_price: Number(deliveryFee),
                            quantity: 1,
                            currency_id: 'ARS'
                        }] : [])
                    ],
                    payer: payer ? {
                        email: payer.email,
                        first_name: payer.name?.split(' ')[0] || '',
                        last_name: payer.name?.split(' ').slice(1).join(' ') || '',
                    } : undefined,
                    back_urls: {
                        success: `${window.location.origin}/order-success`,
                        failure: `${window.location.origin}/cart`,
                        pending: `${window.location.origin}/cart`
                    },
                    external_reference: externalRef,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al crear la preferencia de pago');
            }

            const data = await response.json();
            setPreferenceId(data.id);
            if (onPaymentCreated) {
                onPaymentCreated(data.id);
            }
        } catch (error) {
            console.error('Error MP:', error);
            toast({
                title: "Error de pago",
                description: "No se pudo conectar con Mercado Pago. Intenta nuevamente.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!preferenceId) {
        return (
            <Button
                className="w-full bg-[#009EE3] hover:bg-[#0089C7] text-white flex items-center justify-center gap-2"
                onClick={handleCreatePreference}
                disabled={isLoading}
            >
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <CreditCard className="h-4 w-4" />
                )}
                Pagar con Mercado Pago
            </Button>
        );
    }

    return (
        <div id="wallet_container" className="w-full">
            <Wallet
                initialization={{ preferenceId }}
            />
        </div>
    );
};
