
import React from 'react';

export default function CartDrawer({ isOpen, onClose, cart, updateQuantity, removeFromCart, clearCart }) {
  if (!isOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;

    let message = '👑 *PEDIDO - I-STORE LUXE* 👑\n\n';
    cart.forEach((item, index) => {
      message += `${index + 1}. *${item.platform}* (${item.service})\n`;
      message += `   Cantidad: ${item.quantity} | Precio: S/ ${(item.price * item.quantity).toFixed(2)}\n\n`;
    });
    message += `💰 *TOTAL A PAGAR: S/ ${subtotal.toFixed(2)}*\n\n`;
    message += 'Métodos de pago aceptados: Yape o Dale.\n';
    message += 'Por favor, envíeme los datos para realizar el pago.';

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/51906246375?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#121212] border-l border-[#d4af37]/30 text-white shadow-2xl flex flex-col">
          {/* HEADER */}
          <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-[#0f0f0f]">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛒</span>
              <h2 className="font-black text-[#d4af37] tracking-wider text-lg">TU CARRITO</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 p-2 rounded-full transition-all text-xs font-bold"
            >
              ✕
            </button>
          </div>

          {/* LISTA DE ITEMS */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <span className="text-4xl">🛒</span>
                <p className="text-gray-400 text-sm">Tu carrito está vacío.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="bg-[#181818] border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-white text-sm">{item.platform}</h4>
                      <p className="text-xs text-gray-400">{item.service}</p>
                    </div>
                    <span className="font-black text-[#d4af37] text-sm">
                      S/ {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-800/80 pt-3">
                    <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-2 py-1">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="text-gray-400 hover:text-white px-2 font-bold text-sm"
                      >
                        -
                      </button>
                      <span className="text-xs font-black text-white">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="text-gray-400 hover:text-white px-2 font-bold text-sm"
                      >
                        +
                      </button>
                    </div>

                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-400 hover:text-red-300 text-xs font-semibold"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* FOOTER / CHECKOUT */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-neutral-800 bg-[#0f0f0f] space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-300">Subtotal</span>
                <span className="text-lg font-black text-[#d4af37]">S/ {subtotal.toFixed(2)}</span>
              </div>

              <button
                onClick={handleWhatsAppCheckout}
                className="w-full py-3.5 bg-[#d4af37] hover:bg-[#c49f2c] text-black font-black rounded-xl text-sm transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95"
              >
                <span>💬</span> FINALIZAR PEDIDO POR WHATSAPP
              </button>

              <button
                onClick={clearCart}
                className="w-full py-2 bg-transparent hover:bg-neutral-800 text-gray-400 hover:text-white text-xs font-semibold rounded-xl transition-all"
              >
                Vaciar carrito
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
