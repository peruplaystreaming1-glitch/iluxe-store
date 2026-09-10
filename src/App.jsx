import React, { useState, useEffect } from 'react';

export default function App() {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('iluxe_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    localStorage.setItem('iluxe_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setToast(`✓ Agregado al carrito: ${product.name}`);
    setTimeout(() => setToast(''), 2500);
  };

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== id));
      return;
    }
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity } : item));
  };

  const removeItem = (id) => setCart(prev => prev.filter(item => item.id !== id));
  const clearCart = () => setCart([]);

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleWhatsAppCheckout = () => {
    let msg = "Hola I-LUXE STORE 👋\n\nQuiero realizar el siguiente pedido:\n\n🛒 MI PEDIDO\n\n";
    cart.forEach((item, i) => {
      msg += `${i + 1}. ${item.name}\nServicio: ${item.type}\nPrecio: S/ ${(item.price * item.quantity).toFixed(2)}${item.quantity > 1 ? ` (Cant: ${item.quantity})` : ''}\n\n`;
    });
    msg += `--------------------\nTOTAL: S/ ${totalPrice.toFixed(2)}\n\nQuedo atento a la información para realizar el pago.`;
    window.open(`https://wa.me/51906246375?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="bg-black text-white min-h-screen relative font-sans">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#d4af37] text-black px-4 py-3 rounded-xl font-bold shadow-2xl animate-pulse">
          {toast}
        </div>
      )}

      <header className="flex justify-between items-center p-6 border-b border-zinc-800 bg-[#0b0b0b]">
        <div>
          <h1 className="text-xl font-bold text-[#d4af37]">I-LUXE STORE</h1>
          <p className="text-xs text-zinc-400">STREAMING PERÚ</p>
        </div>
        <button 
          onClick={() => setIsCartOpen(true)}
          className="bg-zinc-900 border border-[#d4af37]/40 hover:border-[#d4af37] text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg transition-all"
        >
          <span>🛒 CARRITO</span>
          <span className="bg-[#d4af37] text-black font-bold text-xs px-2 py-0.5 rounded-full">
            {totalItems}
          </span>
        </button>
      </header>

      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b0b0b] border-l border-[#d4af37]/30 text-white p-6 flex flex-col h-full shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
              <h2 className="text-xl font-bold text-[#d4af37]">🛒 MI CARRITO</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-zinc-400 hover:text-white text-xl font-bold px-2">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center text-zinc-500 py-20">
                  <p className="text-4xl mb-2">🛒</p>
                  <p>Tu carrito está vacío</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white">{item.name}</h4>
                        <p className="text-xs text-[#d4af37]">{item.type}</p>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-zinc-500 hover:text-red-400 text-sm">🗑️ Eliminar</button>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-semibold text-zinc-300">S/ {(item.price * item.quantity).toFixed(2)}</span>
                      <div className="flex items-center gap-3 bg-black px-3 py-1 rounded-lg border border-zinc-800">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="text-[#d4af37] font-bold">-</button>
                        <span className="text-sm">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="text-[#d4af37] font-bold">+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-zinc-800 pt-4 mt-auto space-y-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-zinc-400">TOTAL:</span>
                  <span className="text-[#d4af37] text-xl">S/ {totalPrice.toFixed(2)}</span>
                </div>
                <button onClick={handleWhatsAppCheckout} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg text-center transition-all">
                  FINALIZAR PEDIDO POR WHATSAPP 📲
                </button>
                <button onClick={clearCart} className="w-full text-center text-xs text-zinc-500 hover:text-zinc-400 underline">Vaciar carrito</button>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="p-8 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-[#d4af37] mb-6 border-b border-zinc-800 pb-2">Catálogo de Servicios</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg">Netflix Premium</h3>
              <p className="text-xs text-[#d4af37] mt-1">Perfil Personal</p>
              <p className="text-xl font-bold text-white mt-4">S/ 15.00</p>
            </div>
            <button 
              onClick={() => addToCart({ id: 'net-perfil', name: 'Netflix Premium', type: 'Perfil Personal', price: 15.00 })}
              className="w-full mt-6 bg-gradient-to-r from-[#d4af37] to-[#aa8c2c] hover:opacity-90 text-black font-bold py-2.5 rounded-xl transition-all shadow-md text-sm"
            >
              🛒 AGREGAR AL CARRITO
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg">Disney+</h3>
              <p className="text-xs text-[#d4af37] mt-1">Perfil Personal</p>
              <p className="text-xl font-bold text-white mt-4">S/ 14.00</p>
            </div>
            <button 
              onClick={() => addToCart({ id: 'dis-perfil', name: 'Disney+', type: 'Perfil Personal', price: 14.00 })}
              className="w-full mt-6 bg-gradient-to-r from-[#d4af37] to-[#aa8c2c] hover:opacity-90 text-black font-bold py-2.5 rounded-xl transition-all shadow-md text-sm"
            >
              🛒 AGREGAR AL CARRITO
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg">Spotify Premium</h3>
              <p className="text-xs text-[#d4af37] mt-1">Cuenta Completa</p>
              <p className="text-xl font-bold text-white mt-4">S/ 15.00</p>
            </div>
            <button 
              onClick={() => addToCart({ id: 'spot-prem', name: 'Spotify Premium', type: 'Cuenta Completa', price: 15.00 })}
              className="w-full mt-6 bg-gradient-to-r from-[#d4af37] to-[#aa8c2c] hover:opacity-90 text-black font-bold py-2.5 rounded-xl transition-all shadow-md text-sm"
            >
              🛒 AGREGAR AL CARRITO
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
