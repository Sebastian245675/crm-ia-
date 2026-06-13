import React, { useState } from 'react';
import { ShoppingCart, MessageCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';

export const FloatingActionButtons = () => {
    const navigate = useNavigate();
    const { getItemCount } = useCart();
    const itemCount = getItemCount();
    const [showWhatsAppMenu, setShowWhatsAppMenu] = useState(false);

    const whatsapp1 = {
        number: "541126711308",
        label: "Asesor comercial 1"
    };
    const whatsapp2 = {
        number: "5493872228571",
        label: "Asesor comercial 2"
    };

    return (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
            {/* Menú de WhatsApp */}
            {showWhatsAppMenu && (
                <div className="flex flex-col gap-2 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <a
                        href={`https://wa.me/${whatsapp1.number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-gray-800 px-4 py-2 rounded-full shadow-lg border border-gray-100 flex items-center gap-2 hover:bg-gray-50 transition-all text-sm font-bold whitespace-nowrap"
                    >
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        {whatsapp1.label}
                    </a>
                    <a
                        href={`https://wa.me/${whatsapp2.number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-gray-800 px-4 py-2 rounded-full shadow-lg border border-gray-100 flex items-center gap-2 hover:bg-gray-50 transition-all text-sm font-bold whitespace-nowrap"
                    >
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        {whatsapp2.label}
                    </a>
                </div>
            )}

            {/* Botón Carrito - Solo visible en móvil arriba de whatsapp */}
            {itemCount > 0 && (
                <button
                    onClick={() => navigate('/cart')}
                    className="md:hidden bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl p-3 flex items-center justify-center transition-all hover:scale-110 relative border-2 border-white/20"
                    aria-label="Ver carrito"
                >
                    <ShoppingCart className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                        {itemCount}
                    </span>
                </button>
            )}

            {/* Botón WhatsApp - Toggle Menu */}
            <button
                onClick={() => setShowWhatsAppMenu(!showWhatsAppMenu)}
                className={`${showWhatsAppMenu ? 'bg-red-500 hover:bg-red-600' : 'bg-[#25D366] hover:bg-[#128C7E]'} text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 w-[52px] h-[52px] border-2 border-white/10`}
                aria-label="Contactar por WhatsApp"
            >
                {showWhatsAppMenu ? (
                    <X className="w-6 h-6" />
                ) : (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 448 512"
                        width="28"
                        height="28"
                        fill="currentColor"
                    >
                        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-117zm-157 338.7c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.7-30.6-38.1-3.2-5.4-.3-8.3 2.4-11.1 2.4-2.5 5.5-6.4 8.3-9.6 2.8-3.2 3.7-5.5 5.5-9.3 1.9-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3s19.9 53.7 22.6 57.4c2.8 3.7 39.1 59.7 94.8 83.8 13.3 5.7 23.7 9.1 31.7 11.7 13.3 4.2 25.5 3.6 35.2 2.2 10.8-1.6 32.7-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                    </svg>
                )}
            </button>
        </div>
    );
};
