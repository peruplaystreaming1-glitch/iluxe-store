import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import CartDrawer from './CartDrawer';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

// Definición de Categorías Oficiales
const CATEGORIES = [
  {
    id: 'streaming-popular',
    name: 'STREAMING POPULAR',
    icon: '🔥',
    platforms: ['NETFLIX PREMIUM', 'DISNEY+', 'AMAZON PRIME', 'HBO MAX', 'PARAMOUNT+']
  },
  {
    id: 'tv-entretenimiento',
    name: 'TV Y ENTRETENIMIENTO',
    icon: '📺',
    platforms: ['DGO', 'MOVISTAR+', 'VIX PREMIUM']
  },
  {
    id: 'musica-educacion',
    name: 'MÚSICA Y EDUCACIÓN',
    icon: '🎵',
    platforms: ['SPOTIFY', 'YOUTUBE PREMIUM', 'CANVA PRO', 'CRUNCHYROLL']
  }
];

export default function App() {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('iluxe_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    localStorage.setItem('iluxe_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(item => item.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });

    setToastMessage(`✓ ${product.platform} (${product.service}) agregado`);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => setCart([]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#d4af37] selection:text-black">
      {/* HEADER / ENCABEZADO */}
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur border-b border-[#d4af37]/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👑</span>
          <div>
            <h1 className="font-black tracking-widest text-[#d4af37] text-lg">I-STORE LUXE</h1>
            <p className="text-[10px] text-gray-400 tracking-wider">STREAMING PERÚ</p>
          </div>
        </div>

        {/* Botón Carrito con Contador */}
        <button 
          onClick={() => setIsCartOpen(true)}
          className="flex items-center gap-2 border border-[#d4af37]/40 px-4 py-2 rounded-full bg-[#141414] hover:bg-[#d4af37]/15 transition-all text-sm font-bold shadow-lg"
        >
          <span>🛒</span>
          <span className="tracking-wide">CARRITO</span>
          <span className="bg-[#d4af37] text-black font-black px-2 py-0.5 rounded-full text-xs">
            ({cart.reduce((a, b) => a + b.quantity, 0)})
          </span>
        </button>
      </header>

      {/* HERO SECTION */}
      <section className="py-16 px-6 text-center bg-gradient-to-b from-[#141414] to-[#0a0a0a] border-b border-neutral-800">
        <div className="max-w-3xl mx-auto space-y-4">
          <span className="bg-[#d4af37]/10 text-[#d4af37] text-xs font-bold px-3 py-1 rounded-full border border-[#d4af37]/30 tracking-wider">
            ⚡ CATÁLOGO OFICIAL 2026
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            TU ENTRETENIMIENTO, <span className="text-[#d4af37]">FÁCIL Y RÁPIDO</span>
          </h2>
          <p className="text-gray-400 text-sm md:text-base">
            Elige tus plataformas favoritas con entrega inmediata y garantía total. Pagos seguros por Yape o Dale.
          </p>
        </div>
      </section>

      {/* CATÁLOGO DE PLATAFORMAS */}
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        {CATEGORIES.map((cat) => (
          <div key={cat.id} className="space-y-6">
            <div className="flex items-center gap-3 border-b border-[#d4af37]/20 pb-3">
              <span className="text-xl">{cat.icon}</span>
              <h3 className="text-xl font-bold tracking-wider text-[#d4af37]">{cat.name}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cat.platforms.map((platName) => (
                <div 
                  key={platName}
                  className="bg-[#121212] border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between hover:border-[#d4af37]/50 transition-all shadow-xl group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="font-extrabold text-lg tracking-wide text-white group-hover:text-[#d4af37] transition-colors">
                        {platName}
                      </span>
                      <span className="text-xs bg-neutral-800 text-gray-300 px-2.5 py-1 rounded-lg">
                        Garantizado
                      </span>
                    </div>

                    {/* Planes / Modalidades */}
                    <div className="space-y-3 mb-6">
                      <div className="bg-[#181818] p-3.5 rounded-xl border border-neutral-800 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-300">Perfil Personal</p>
                          <p className="text-sm font-black text-[#d4af37]">S/ 15.00</p>
                        </div>
                        <button
                          onClick={() => addToCart({
                            id: `${platName}-Perfil Personal`,
                            platform: platName,
                            service: 'Perfil Personal',
                            price: 15.00
                          })}
                          className="py-2 px-3 bg-[#d4af37] hover:bg-[#c49f2c] text-black font-extrabold rounded-lg text-xs transition-all flex items-center gap-1 active:scale-95 shadow-md"
                        >
                          <span>🛒</span> AGREGAR
                        </button>
                      </div>

                      <div className="bg-[#181818] p-3.5 rounded-xl border border-neutral-800 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-300">Cuenta Completa</p>
                          <p className="text-sm font-black text-[#d4af37]">S/ 45.00</p>
                        </div>
                        <button
                          onClick={() => addToCart({
                            id: `${platName}-Cuenta Completa`,
                            platform: platName,
                            service: 'Cuenta Completa',
                            price: 45.00
                          })}
                          className="py-2 px-3 bg-[#d4af37] hover:bg-[#c49f2c] text-black font-extrabold rounded-lg text-xs transition-all flex items-center gap-1 active:scale-95 shadow-md"
                        >
                          <span>🛒</span> AGREGAR
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-400 text-center border-t border-neutral-800/80 pt-3">
                    Soporte oficial y activación inmediata ⚡
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-neutral-800 py-8 text-center text-xs text-gray-400 bg-[#0f0f0f]">
        <p>© 2026 I-STORE LUXE. Todos los derechos reservados.</p>
        <p className="mt-1 text-[#d4af37]">Ventas y Activaciones oficiales por WhatsApp: 906246375</p>
      </footer>

      {/* Toast de confirmación elegante */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141414] border-2 border-[#d4af37] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <span className="text-[#d4af37] font-bold text-lg">✓</span>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Panel Lateral del Carrito */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        clearCart={clearCart}
      />
    </div>
  );
}
