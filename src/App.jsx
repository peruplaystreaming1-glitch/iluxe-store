import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

const products = [
  { id: 1, name: "Netflix Premium (Ultra HD)", price: "S/ 15.00", icon: "🎬", badge: "Más Vendido" },
  { id: 2, name: "Disney+  Premium", price: "S/ 15.00", icon: "✨", badge: "Popular" },
  { id: 3, name: "Max (HBO) Platino", price: "S/ 10.00", icon: "🍿", badge: "HD / 4K" },
  { id: 4, name: "Spotify Premium Individual", price: "S/ 12.00", icon: "🎵", badge: "Música" },
  { id: 5, name: "YouTube Premium", price: "S/ 10.00", icon: "▶️", badge: "Sin Anuncios" },
  { id: 6, name: "Prime Video", price: "S/ 10.00", icon: "📦", badge: "Estable" }
];

export default function App() {
  const handleOrder = (product) => {
    const text = `Hola I-Store Luxe, deseo adquirir ${product.name} por ${product.price}. Medios de pago: Yape / Dale.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 font-sans">
      <header className="text-center py-6">
        <div className="inline-block bg-amber-400/10 border border-amber-400/30 text-amber-400 px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-3">
          Streaming Oficial
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-amber-400 tracking-wider">I-STORE LUXE</h1>
        <p className="text-gray-400 mt-2 text-sm sm:text-base">Cuentas y perfiles premium con entrega inmediata y soporte activo</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {products.map((p) => (
          <div key={p.id} className="bg-gray-900/90 border border-gray-800 hover:border-amber-400/60 transition-all duration-200 rounded-2xl p-6 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-4xl">{p.icon}</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">{p.badge}</span>
              </div>
              <h3 className="text-xl font-bold mt-4 text-white">{p.name}</h3>
              <p className="text-amber-400 font-extrabold text-2xl mt-2">{p.price}</p>
              <p className="text-gray-400 text-xs mt-1">Renovación mensual garantizada</p>
            </div>
            <button
              onClick={() => handleOrder(p)}
              className="mt-6 w-full bg-amber-400 hover:bg-amber-300 text-black font-bold py-3 rounded-xl transition-all shadow-md active:scale-95"
            >
              Pedir por WhatsApp
            </button>
          </div>
        ))}
      </div>

      <footer className="text-center text-xs text-gray-500 mt-16 border-t border-gray-800/80 pt-8">
        <p className="font-medium text-gray-400">Medios de pago aceptados: Yape y Dale</p>
        <p className="mt-1">© 2026 I-Store Luxe. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
