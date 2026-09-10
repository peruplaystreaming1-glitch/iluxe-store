import React from 'react';

export default function CartDrawer({ isOpen, onClose, cart, updateQuantity, removeFromCart, clearCart }) {
  if (!isOpen) return null;

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCheckoutWhatsApp = () => {
    if (cart.length === 0) return;

    let itemsText = cart.map((item, index) => {
      return `${index + 1}. ${item.platform}\nServicio: ${item.service}\nPrecio: S/ ${item.price.toFixed(2)}${item.quantity > 1 ? ` (Cant: ${item.quantity})` : ''}`;
    }).join('\n\n');

    const message = `Hola I-LUXE STORE 👋\n\nQuiero realizar el siguiente pedido:\n\n🛒 MI PEDIDO\n\n${itemsText}\n\n--------------------\n\nTOTAL: S/ ${total.toFixed(2)}\n\nQuedo atento a la información para realizar el pago.`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/51906246375?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Fondo sombreado */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Panel lateral */}
      <div className="relative w-full max-w-md bg-[#0f0f0f] border-l border-[#d4af37]/30 text-white h-full flex flex-col z-10 shadow-2xl">
        
        {/* Header del Carrito */}
        <div className="p-5 border-b border-[#d4af37]/20 flex items-center justify-between bg-[#141414]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛒</span>
            <h2 className="text-lg font-bold tracking-wider text-[#d4af37]">MI CARRITO</h2>
            <span className="text-xs bg-[#d4af37]/20 text-[#d4af37] px-2 py-0.5 rounded-full font-semibold">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl transition-colors leading-none"
          >
            &times;
          </button>
        </div>

        {/* Lista de productos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <span className="text-4xl block mb-2">🛍️</span>
              Tu carrito está vacío.
            </div>
          ) : (
            cart.map((item) => (
              <div 
                key={item.id} 
                className="bg-[#181818] border border-neutral-800 rounded-xl p-4 flex flex-col gap-2 hover:border-[#d4af37]/40 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-100">{item.platform}</h3>
                    <p className="text-xs text-[#d4af37]">{item.service}</p>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-gray-500 hover:text-red-400 text-sm transition-colors"
                  >
                    🗑️
                  </button>
                </div>

                <div className="flex justify-between items-center mt-2 pt-2 border-t border-neutral-800/80">
                  {/* Cantidad */}
                  <div className="flex items-center gap-2 bg-[#222] px-2 py-1 rounded-lg border border-neutral-700">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="text-gray-300 hover:text-white text-sm font-bold px-1"
                    >
                      -
                    </button>
                    <span className="text-xs font-semibold px-1">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="text-[#d4af37] hover:text-white text-sm font-bold px-1"
                    >
                      +
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">Subtotal</span>
                    <span className="text-sm font-bold text-gray-100">
                      S/ {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer y Checkout */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-[#d4af37]/20 bg-[#141414] space-y-4">
            <div className="flex justify-between items-center text-sm">
              <button 
                onClick={clearCart} 
                className="text-xs text-neutral-400 hover:text-red-400 transition-colors"
              >
                Vaciar carrito
              </button>
              <div className="text-right">
                <span className="text-xs text-gray-400 mr-2 uppercase tracking-wide">Total:</span>
                <span className="text-xl font-black text-[#d4af37]">S/ {total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckoutWhatsApp}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#e5c05b] to-[#b38a22] text-black font-extrabold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm tracking-wider uppercase flex items-center justify-center gap-2"
            >
              <span>💬</span> FINALIZAR PEDIDO POR WHATSAPP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
