import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Youtube, Facebook } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-20">
      {/* Newsletter Section */}
      <div className="bg-[#f2f2f2] py-8 border-y border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-16 w-full md:w-auto">
            <h2 className="text-2xl font-bold text-black">Newsletter</h2>
            <p className="text-sm text-gray-700 text-center md:text-left max-w-sm">
              Ingresá tu correo electrónico para recibir nuestras novedades.
            </p>
          </div>
          <div className="flex items-center w-full md:w-auto gap-4">
            <input
              type="email"
              placeholder="Ingresá tu email..."
              className="w-full md:w-80 px-4 py-2 border border-gray-300 bg-transparent text-sm focus:outline-none focus:border-black"
              aria-label="Correo electrónico para newsletter"
            />
            <button
              className="text-sm font-semibold text-black hover:underline"
              aria-label="Enviar newsletter"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>

      {/* Main Footer Section */}
      <div className="bg-black text-white pt-16 pb-8">
        <div className="max-w-[1400px] mx-auto px-4 md:px-12">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 relative">
            {/* Column 1: Links / Categories */}
            <div>
              <h3 className="text-[15px] font-semibold mb-6">Categorías y Ayuda</h3>
              <ul className="space-y-3 text-[13px] text-gray-300">
                <li><Link to="/categoria/tecnologia" className="hover:text-white transition-colors">Tecnología</Link></li>
                <li><Link to="/categoria/moda" className="hover:text-white transition-colors">Moda y Calzado</Link></li>
                <li><Link to="/categoria/hogar" className="hover:text-white transition-colors">Hogar y Cocina</Link></li>
                <li><Link to="/categoria/beauty" className="hover:text-white transition-colors">Salud y Belleza</Link></li>
                <li><Link to="/categoria/deportes" className="hover:text-white transition-colors">Deportes y Fitness</Link></li>
                <li><Link to="/preguntas-frecuentes" className="hover:text-white transition-colors">Preguntas Frecuentes</Link></li>
                <li><Link to="/terminos" className="hover:text-white transition-colors">Términos y condiciones</Link></li>
              </ul>
            </div>

            {/* Column 2: Contact */}
            <div>
              <h3 className="text-[15px] font-semibold mb-6">Contactános</h3>
              <ul className="space-y-4 text-[13px] text-gray-300">
                <li>
                  <a href="https://wa.me/541126711308" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors block">
                    +54 11 2671-1308
                  </a>
                </li>
                <li>
                  <a href="https://wa.me/5493872228571" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors block">
                    +54 9 387 222-8571
                  </a>
                </li>
                <li>
                  <a href="mailto:soporte@omnishop.com" className="hover:text-white transition-colors block">
                    soporte@omnishop.com
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Social Icons (Positioned appropriately) */}
            <div className="flex gap-4 md:justify-end">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300 transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300 transition-colors" aria-label="Youtube">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300 transition-colors" aria-label="TikTok">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z"/>
                </svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300 transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Payment & Shipping Methods */}
          <div className="border-t border-gray-800 pt-8 pb-8 flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h3 className="text-[13px] font-semibold mb-4">Medios de pago</h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-white rounded px-2 py-1 flex items-center justify-center h-8 w-14">
                  {/* Visa SVG */}
                  <svg viewBox="0 0 38 12" xmlns="http://www.w3.org/2000/svg" className="h-4 w-full">
                    <path fill="#1434CB" d="M14.996 11.458L17.382.497h3.815l-2.386 10.96h-3.815zm20.892-10.74c-.672-.257-1.802-.533-3.238-.533-3.486 0-5.94 1.76-5.961 4.285-.021 1.862 1.764 2.9 3.11 3.525 1.378.636 1.84.978 1.84 1.503-.021.808-1.026 1.186-1.97 1.186-1.637 0-2.52-.244-3.844-.808l-.533-.245-.533 3.17c1.006.44 2.853.808 4.78.808 3.69 0 6.085-1.737 6.106-4.42-.02-1.468-1.068-2.58-2.986-3.45-1.23-.586-1.99-.978-1.99-1.576 0-.55.65-1.125 1.865-1.125 1.298-.021 2.222.257 2.955.575l.356.171.533-3.065h-.002zm-18.067.244l-3.69 7.495-.4-2.03c-.693-2.35-2.873-4.966-5.325-6.335L7.202 11.46H11.2l6.619-10.74h-3.9z"/>
                    <path fill="#F5A623" d="M8.397.498H2.76C2.174.498 1.672.84 1.442 1.365L.016 11.46h3.94l.797-2.078h4.84l.462 2.078h3.486L10.597.498H8.397zm-2.85 6.446l1.152-3.007c.23-.623.44-1.284.629-1.895l.334 1.638 1.026 3.264H5.547z"/>
                  </svg>
                </div>
                <div className="bg-white rounded px-2 py-1 flex items-center justify-center h-8 w-14">
                  {/* Mastercard SVG */}
                  <svg viewBox="0 0 32 20" xmlns="http://www.w3.org/2000/svg" className="h-5 w-full">
                    <path fill="#EB001B" d="M20.217 10A10.005 10.005 0 0115.5 18.32a10 10 0 110-16.64A10.005 10.005 0 0120.217 10z"/>
                    <path fill="#F79E1B" d="M31 10a10 10 0 01-15.5 8.32 10 10 0 100-16.64A10 10 0 0131 10z"/>
                    <path fill="#FF5F00" d="M20.217 10a10.038 10.038 0 00-4.717-8.32 10.038 10.038 0 000 16.64 10.038 10.038 0 004.717-8.32z"/>
                  </svg>
                </div>
                <div className="bg-white rounded px-2 py-1 flex items-center justify-center h-8 px-3">
                  {/* Mercado Pago Text SVG */}
                  <svg viewBox="0 0 120 30" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
                    <path d="M24.8 17.5V10c0-1.8-1.1-2.6-2.6-2.6-1.6 0-2.6 1.1-2.6 2.6v7.5h-2.1V10c0-1.8-1.1-2.6-2.6-2.6-1.6 0-2.6 1.1-2.6 2.6v7.5h-2.1v-12h2.1v1.6c.5-.9 1.4-1.8 3-1.8 1.4 0 2.4.7 2.8 1.8.5-.9 1.4-1.8 3-1.8 2.2 0 3.7 1.3 3.7 3.8v8.4h-2.1zM34.8 14.1v.6h-5.9c.2 1.3 1.2 2 2.6 2 1 0 1.9-.4 2.5-1.1l1.4 1c-.8 1-2.2 1.6-4 1.6-2.6 0-4.7-1.7-4.7-4.5 0-2.8 1.9-4.5 4.3-4.5 2.5 0 4 1.7 4 4.1v.8zm-2.1-1.1c0-1.2-.8-1.9-1.9-1.9-1 0-1.9.7-2 1.9h3.9zM41.7 10.9v1.6c-.4-1.1-1.5-1.8-2.9-1.8-.4 0-.8.1-1.2.2v2h1c1.5 0 2.4.9 2.4 2.4v2.2h-2.1V13c0-1-.5-1.4-1.4-1.4h-.1v5.9h-2.1V9.2h2.1v1.6c.6-1 1.7-1.6 3.1-1.6.4 0 .8.1 1.2.2v1.5zM49 17.7c-2.4 0-4.3-1.8-4.3-4.3 0-2.4 1.9-4.3 4.3-4.3s4.3 1.8 4.3 4.3c0 2.4-1.9 4.3-4.3 4.3zm0-1.6c1.4 0 2.3-1.1 2.3-2.6 0-1.5-.9-2.6-2.3-2.6-1.4 0-2.3 1.1-2.3 2.6 0 1.5.9 2.6 2.3 2.6zM62.6 15.6c-.6 1.4-2.1 2.1-3.6 2.1-2.1 0-3.6-1.5-3.6-3.8 0-2.4 1.5-3.8 3.5-3.8 1.4 0 2.6.7 3.2 1.9l-1.6 1c-.4-.7-1-1.1-1.7-1.1-1.1 0-1.6 1-1.6 2.1 0 1.2.6 2.1 1.7 2.1.8 0 1.4-.4 1.8-1.2l1.9.7zM69.3 17.7c-2 0-3.3-1.2-3.3-3.3s1.2-3.3 3.3-3.3c2 0 3.3 1.2 3.3 3.3s-1.3 3.3-3.3 3.3zm0-1.6c1 0 1.5-.7 1.5-1.7 0-1-.5-1.7-1.5-1.7s-1.5.7-1.5 1.7c0-1-.5-1.7 1.5-1.7zM64 12c.5-1.7 1.8-2.9 3.6-2.9 1 0 1.9.3 2.6 1V8.8h1.9v8.7h-1.9v-1.1c-.7.6-1.6 1-2.6 1-1.9 0-3.2-1.3-3.6-3V12zM80.1 17.5v-3.7c0-1.8-1.1-2.6-2.6-2.6-1.6 0-2.6 1.1-2.6 2.6v3.7h-2.1V5.5h2.1v4c.6-1 1.6-1.8 3-1.8 2.2 0 3.7 1.3 3.7 3.8v6h-1.5zM88.7 17.7c-2.4 0-4.3-1.8-4.3-4.3 0-2.4 1.9-4.3 4.3-4.3s4.3 1.8 4.3 4.3c0 2.4-1.9 4.3-4.3 4.3zm0-1.6c1.4 0 2.3-1.1 2.3-2.6 0-1.5-.9-2.6-2.3-2.6-1.4 0-2.3 1.1-2.3 2.6 0 1.5.9 2.6 2.3 2.6zM99.6 17.6c-1 0-1.9-.3-2.6-1v3.9h-2V9.2h2v1.1c.7-.6 1.6-1 2.6-1 1.9 0 3.2 1.3 3.6 3v2.3c-.4 1.7-1.7 3-3.6 3zm-1.1-6.8c-1 0-1.5.7-1.5 1.7 0 1 .5 1.7 1.5 1.7s1.5-.7 1.5-1.7c0-1-.5-1.7-1.5-1.7zM111.3 17.7c-2.4 0-4.3-1.8-4.3-4.3 0-2.4 1.9-4.3 4.3-4.3s4.3 1.8 4.3 4.3c0 2.4-1.9 4.3-4.3 4.3zm0-1.6c1.4 0 2.3-1.1 2.3-2.6 0-1.5-.9-2.6-2.3-2.6-1.4 0-2.3 1.1-2.3 2.6 0 1.5.9 2.6 2.3 2.6zM114.7 14.1v.6h-5.9c.2 1.3 1.2 2 2.6 2 1 0 1.9-.4 2.5-1.1l1.4 1c-.8 1-2.2 1.6-4 1.6-2.6 0-4.7-1.7-4.7-4.5 0-2.8 1.9-4.5 4.3-4.5 2.5 0 4 1.7 4 4.1v.8zm-2.1-1.1c0-1.2-.8-1.9-1.9-1.9-1 0-1.9.7-2 1.9h3.9z" fill="#009EE3"/>
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-[13px] font-semibold mb-4">Medios de envío</h3>
              <div className="flex flex-wrap items-center gap-3">
                {/* Optional shipping icons, text fallback for now */}
                <span className="text-[11px] text-gray-400">Acordar con el vendedor</span>
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[11px] text-gray-400 text-center md:text-left">
              Copyright OmniShop - {new Date().getFullYear()}. Todos los derechos reservados. Defensa de las y los consumidores. Para reclamos <a href="#" className="underline hover:text-white">ingresá acá</a>.
            </p>
            <div className="text-[11px] text-gray-400">
              creado con <a href="https://websysrl.com/" target="_blank" rel="noopener noreferrer" className="font-bold text-white hover:underline">websy</a>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};
