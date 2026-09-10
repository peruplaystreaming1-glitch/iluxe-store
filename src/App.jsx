// Estado y funciones del carrito
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
