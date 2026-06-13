import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, MessageCircle, ArrowLeft, User, Mail, CreditCard } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { TopPromoBar } from '@/components/layout/TopPromoBar';
import { AdvancedHeader } from '@/components/layout/AdvancedHeader';
import { useCategories } from '@/hooks/use-categories';

export const OrderSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { clearCart, items, getTotal } = useCart();
    const { user, isAuthenticated } = useAuth();
    const { categories, mainCategories, subcategoriesByParent, thirdLevelBySubcategory } = useCategories();
    const [promoVisible, setPromoVisible] = useState(true);
    const [isSaving, setIsSaving] = useState(true);
    const [orderSaved, setOrderSaved] = useState(false);

    // Obtener parámetros de Mercado Pago de la URL
    const queryParams = new URLSearchParams(location.search);
    const paymentId = queryParams.get('payment_id');
    const status = queryParams.get('status');
    const externalReference = queryParams.get('external_reference');

    useEffect(() => {
        const saveOrder = async () => {
            if (orderSaved) return;

            // Solo guardamos si el estado es 'approved' o si no hay estado
            if (status && status !== 'approved') {
                setIsSaving(false);
                return;
            }

            // Intentar obtener datos del pedido de múltiples fuentes
            let orderItems: any[] = [];
            let orderTotal = 0;
            let orderUserName = 'Usuario';
            let orderUserEmail = '';
            let orderUserId = '';

            // Fuente 1: Datos guardados en localStorage por MercadoPagoButton antes de redirigir
            const pendingOrderRaw = localStorage.getItem('pending_mp_order');
            let pendingOrder: any = null;
            if (pendingOrderRaw) {
                try {
                    pendingOrder = JSON.parse(pendingOrderRaw);
                } catch (e) {
                    console.warn('[OrderSuccess] Could not parse pending order from localStorage');
                }
            }

            // Fuente 2: Carrito actual (si aún tiene items en localStorage)
            const cartItems = items.length > 0 ? items : null;

            // Fuente 3: Auth context
            if (isAuthenticated && user) {
                orderUserId = user.id;
                orderUserName = user.name || 'Usuario';
                orderUserEmail = user.email || '';
            }

            // Prioridad: pendingOrder > cartItems
            if (pendingOrder && pendingOrder.items?.length > 0) {
                orderItems = pendingOrder.items;
                orderTotal = pendingOrder.total || 0;
                orderUserId = orderUserId || pendingOrder.user_id || '';
                orderUserName = pendingOrder.user_name || orderUserName;
                orderUserEmail = pendingOrder.user_email || orderUserEmail;
            } else if (cartItems) {
                orderItems = cartItems.map((i: any) => ({
                    id: i.id,
                    name: i.name,
                    price: Number(i.price),
                    quantity: i.quantity,
                    image: i.image
                }));
                orderTotal = getTotal();
            }

            // Si no hay items de ninguna fuente, no podemos guardar
            if (orderItems.length === 0) {
                console.warn('[OrderSuccess] No order items found from any source');
                setIsSaving(false);
                return;
            }

            // Si no hay user_id, esperamos a que cargue la auth
            if (!orderUserId) {
                console.warn('[OrderSuccess] No user ID available yet, waiting...');
                setIsSaving(false);
                return; // useEffect se re-ejecutará cuando isAuthenticated cambie
            }

            try {
                const isSupabase = typeof (db as any)?.from === 'function';
                if (isSupabase) {
                    // 1. Verificación de seguridad: ¿Ya existe una orden con este paymentId?
                    if (paymentId) {
                        const { data: existingWithPayment } = await (db as any)
                            .from('orders')
                            .select('id')
                            .ilike('order_notes', `%ID Pago: ${paymentId}%`)
                            .limit(1);
                        
                        if (existingWithPayment && existingWithPayment.length > 0) {
                            console.log('[OrderSuccess] Pago ya registrado anteriormente:', existingWithPayment[0].id);
                            setOrderSaved(true);
                            setIsSaving(false);
                            clearCart();
                            localStorage.removeItem('pending_mp_order');
                            return;
                        }
                    }

                    // 2. Intentar encontrar la orden por external_reference primero, o por status 'pending'
                    let existingOrderId = null;
                    
                    if (externalReference) {
                        const { data: ordersWithRef } = await (db as any)
                            .from('orders')
                            .select('id')
                            .ilike('order_notes', `%Ref: ${externalReference}%`)
                            .limit(1);
                        
                        if (ordersWithRef && ordersWithRef.length > 0) {
                            existingOrderId = ordersWithRef[0].id;
                        }
                    }

                    if (!existingOrderId) {
                        const { data: pendingOrders } = await (db as any)
                            .from('orders')
                            .select('id')
                            .eq('user_id', orderUserId)
                            .eq('status', 'pending')
                            .order('created_at', { ascending: false })
                            .limit(1);
                        
                        if (pendingOrders && pendingOrders.length > 0) {
                            existingOrderId = pendingOrders[0].id;
                        }
                    }
                    
                    if (existingOrderId) {
                        // Actualizar la orden existente (sea por Ref o la última pending)
                        const { error: updateErr } = await (db as any)
                            .from('orders')
                            .update({
                                status: 'confirmed',
                                order_notes: `Pasarela MP | ID Pago: ${paymentId || 'N/A'} | Ref: ${externalReference || 'N/A'}`,
                            })
                            .eq('id', existingOrderId);
                        
                        if (updateErr) {
                            console.error('[OrderSuccess] Update error:', updateErr);
                            throw updateErr;
                        }
                        console.log('[OrderSuccess] Orden actualizada a confirmed:', existingOrderId);
                    } else {
                        // No se encontró ninguna orden para actualizar, crear una nueva
                        const { error } = await (db as any).from('orders').insert([{
                            user_id: orderUserId,
                            user_name: orderUserName,
                            user_email: orderUserEmail,
                            user_phone: pendingOrder?.user_phone || null,
                            items: orderItems,
                            total: orderTotal,
                            delivery_fee: pendingOrder?.delivery_fee || 0,
                            status: 'confirmed',
                            order_type: 'online',
                            order_notes: `Pasarela MP | ID Pago: ${paymentId || 'N/A'} | Ref: ${externalReference || 'N/A'}`,
                        }]);
                        if (error) {
                            console.error('[OrderSuccess] Insert error:', error);
                            throw error;
                        }
                        console.log('[OrderSuccess] Nueva orden creada como confirmed');
                    }
                }

                setOrderSaved(true);
                clearCart();
                // Limpiar el pedido pendiente de localStorage
                localStorage.removeItem('pending_mp_order');
                toast({
                    title: "¡Pago confirmado!",
                    description: "Tu pedido ha sido registrado correctamente."
                });
            } catch (error) {
                console.error('Error al guardar el pedido:', error);
                toast({
                    title: "Aviso",
                    description: "Tu pago fue exitoso, pero hubo un problema al registrar el pedido. Por favor contacta a soporte.",
                    variant: "destructive"
                });
            } finally {
                setIsSaving(false);
            }
        };

        saveOrder();
    }, [isAuthenticated, user, items, orderSaved]);

    const handleWhatsAppRedirect = (number: string) => {
        const message = `Hola! Acabo de realizar un pago por la pasarela de Mercado Pago.\n\n` +
            `👤 *Usuario:* ${user?.name || 'No especificado'}\n` +
            `📧 *Email:* ${user?.email || 'No especificado'}\n` +
            `🆔 *ID de Pago:* ${paymentId || 'No disponible'}\n\n` +
            `Adjunto el comprobante del pago.`;

        const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <TopPromoBar setPromoVisible={setPromoVisible} />
            <AdvancedHeader
                categories={categories}
                selectedCategory="Todos"
                setSelectedCategory={(cat) => navigate(cat === 'Todos' ? '/' : `/categoria/${encodeURIComponent(cat)}`)}
                promoVisible={promoVisible}
                mainCategories={mainCategories}
                subcategoriesByParent={subcategoriesByParent}
                thirdLevelBySubcategory={thirdLevelBySubcategory}
            />

            <main className="max-w-2xl mx-auto px-4 py-12">
                <Card className="border-none shadow-xl overflow-hidden rounded-2xl">
                    <div className="bg-emerald-600 h-2" />
                    <CardHeader className="text-center pt-8">
                        <div className="flex justify-center mb-4">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-12 w-12 text-emerald-600 animate-bounce" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl md:text-3xl font-bold text-slate-800">
                            ¡Pago Realizado con Éxito!
                        </CardTitle>
                        <p className="text-slate-500 mt-2">
                            Gracias por tu compra en OmniShop.
                        </p>
                    </CardHeader>

                    <CardContent className="px-6 pb-8 space-y-6">
                        <div className="bg-slate-100 rounded-xl p-5 space-y-4 border border-slate-200">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                <User className="h-4 w-4 text-[hsl(214,100%,38%)]" />
                                Información de Confirmación
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <span className="text-slate-500 block">Usuario en la página:</span>
                                    <span className="font-bold text-slate-800 break-all">{user?.name || 'Cargando...'}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-slate-500 block">Correo electrónico:</span>
                                    <span className="font-medium text-slate-800 break-all">{user?.email || 'No disponible'}</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200">
                                <div className="flex items-center gap-2 text-[hsl(214,100%,38%)] font-bold">
                                    <CreditCard className="h-4 w-4" />
                                    <span>Pago procesado por Pasarela</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="p-3 bg-amber-100 rounded-full">
                                    <MessageCircle className="h-6 w-6 text-amber-600" />
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-amber-800 text-lg">Paso obligatorio para confirmar:</h4>
                                <p className="text-amber-700 text-sm mt-1">
                                    Para que confirmemos tu pago y preparemos tu pedido, envía el comprobante a uno de nuestros asesores:
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={() => handleWhatsAppRedirect('541126711308')}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 shadow-lg hover:shadow-green-200 transition-all gap-2"
                                >
                                    <MessageCircle className="h-5 w-5" />
                                    Enviar a Asesor Comercial 1
                                </Button>

                                <Button
                                    onClick={() => handleWhatsAppRedirect('5493872228571')}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 shadow-lg hover:shadow-green-200 transition-all gap-2"
                                >
                                    <MessageCircle className="h-5 w-5" />
                                    Enviar a Asesor Comercial 2
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button variant="outline" className="flex-1 py-6" asChild>
                                <Link to="/">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Volver al inicio
                                </Link>
                            </Button>
                            <Button variant="outline" className="flex-1 py-6" asChild>
                                <Link to="/perfil">
                                    Ir a mis pedidos
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <p className="text-center text-slate-400 text-xs mt-8">
                    OmniShop - Tu tienda de confianza. Si tienes dudas, contáctanos.
                </p>
            </main>
        </div>
    );
};

export default OrderSuccess;
