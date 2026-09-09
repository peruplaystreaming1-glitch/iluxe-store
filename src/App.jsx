import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Estados públicos
  const [platforms, setPlatforms] = useState([]);
  const [settings, setSettings] = useState({
    business_name: 'I-LUXE STORE',
    subtitle: 'STREAMING PERÚ',
    whatsapp: '51906246375',
    facebook: '',
    instagram: '',
    tiktok: '',
    telegram: ''
  });
  const [loading, setLoading] = useState(true);

  // Modal de Compra Directa
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [clientName, setClientName] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Estados Admin
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Pestañas Admin
  const [adminTab, setAdminTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);

  // Formularios
  const [prodForm, setProdForm] = useState({
    id: null,
    platform_id: '',
    service_type: '',
    description: 'Acceso garantizado y soporte activo.',
    profiles_count: 1,
    devices_count: 1,
    price: '',
    active: true
  });
  const [isEditingProd, setIsEditingProd] = useState(false);

  const [platForm, setPlatForm] = useState({
    id: null,
    name: '',
    description: '',
    image_url: '',
    active: true
  });
  const [isEditingPlat, setIsEditingPlat] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [settingsForm, setSettingsForm] = useState({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: setData } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
      if (setData) {
        setSettings(setData);
        setSettingsForm(setData);
      }

      const { data: platData } = await supabase
        .from('platforms')
        .select(`
          id,
          name,
          description,
          image_url,
          active,
          order_index,
          products (
            id,
            platform_id,
            service_type,
            description,
            profiles_count,
            devices_count,
            price,
            currency,
            active
          )
        `)
        .order('order_index', { ascending: true });

      if (platData) setPlatforms(platData);

      if (user) {
        const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (ordersData) setOrders(ordersData);

        const { data: clientsData } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
        if (clientsData) setClients(clientsData);
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword
      });
      if (error) throw error;
      setUser(data.user);
    } catch (err) {
      setLoginError(err.message || 'Credenciales inválidas.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  const handleFileUpload = async (e, callback) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `platforms/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      callback(data.publicUrl);
    } catch (err) {
      alert('Error al subir imagen: ' + (err.message || 'Error en Supabase Storage'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFinalizePurchase = async () => {
    if (!checkoutItem) return;
    if (!clientName.trim() || !clientWhatsapp.trim()) {
      alert('Por favor indica tu nombre y tu número de WhatsApp.');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const { data: newClient } = await supabase.from('clients').insert([{
        full_name: clientName.trim(),
        whatsapp: clientWhatsapp.trim(),
        email: clientEmail.trim(),
        status: 'Activo'
      }]).select().single();

      await supabase.from('orders').insert([{
        client_id: newClient?.id || null,
        client_name: clientName.trim(),
        client_contact: clientWhatsapp.trim(),
        platform_name: checkoutItem.platformName,
        service_type: checkoutItem.serviceType,
        price: checkoutItem.price,
        payment_status: 'Pendiente',
        service_status: 'Activo',
        notes: `Comprado directo. Correo: ${clientEmail.trim() || 'No brindado'}`
      }]);

      const cleanWa = (settings.whatsapp || '51906246375').replace(/[^0-9]/g, '');
      const msg = `¡Hola I-LUXE STORE! 👋 Acabo de realizar mi compra directa:

📺 Plataforma: ${checkoutItem.platformName}
📦 Modalidad: ${checkoutItem.serviceType}
💰 Monto a pagar: S/ ${Number(checkoutItem.price).toFixed(2)}
💳 Método: Yape / Dale (906 246 375)
👤 Titular: ${clientName.trim()}
📱 WhatsApp: ${clientWhatsapp.trim()}
📧 Correo: ${clientEmail.trim() || 'Entrega por este WhatsApp'}

Adjunto mi comprobante de pago para la entrega inmediata de mi acceso. 🚀`;

      window.open(`https://wa.me/${cleanWa}?text=${encodeURIComponent(msg)}`, '_blank');

      setCheckoutItem(null);
      setClientName('');
      setClientWhatsapp('');
      setClientEmail('');
    } catch (err) {
      console.error(err);
      const cleanWa = (settings.whatsapp || '51906246375').replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanWa}?text=${encodeURIComponent('Hola I-LUXE STORE, quiero mi cuenta de ' + checkoutItem.platformName)}`, '_blank');
      setCheckoutItem(null);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const plat = platforms.find(p => p.id === prodForm.platform_id);
    const payload = {
      platform_id: prodForm.platform_id,
      platform_name: plat?.name || '',
      service_type: prodForm.service_type.trim(),
      description: prodForm.description.trim(),
      profiles_count: parseInt(prodForm.profiles_count) || 1,
      devices_count: parseInt(prodForm.devices_count) || 1,
      price: parseFloat(prodForm.price),
      active: prodForm.active
    };

    if (isEditingProd) {
      await supabase.from('products').update(payload).eq('id', prodForm.id);
    } else {
      await supabase.from('products').insert([payload]);
    }

    setProdForm({ id: null, platform_id: '', service_type: '', description: 'Acceso garantizado y soporte activo.', profiles_count: 1, devices_count: 1, price: '', active: true });
    setIsEditingProd(false);
    loadData();
  };

  const handleEditProduct = (prod) => {
    setProdForm({
      id: prod.id,
      platform_id: prod.platform_id,
      service_type: prod.service_type,
      description: prod.description || '',
      profiles_count: prod.profiles_count || 1,
      devices_count: prod.devices_count || 1,
      price: prod.price,
      active: prod.active
    });
    setIsEditingProd(true);
    setAdminTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('¿Deseas eliminar este producto?')) {
      await supabase.from('products').delete().eq('id', id);
      loadData();
    }
  };

  const handleToggleProductActive = async (prod) => {
    await supabase.from('products').update({ active: !prod.active }).eq('id', prod.id);
    loadData();
  };

  const handleSavePlatform = async (e) => {
    e.preventDefault();
    const payload = {
      name: platForm.name.trim().toUpperCase(),
      description: platForm.description.trim(),
      image_url: platForm.image_url,
      active: platForm.active
    };

    if (isEditingPlat) {
      await supabase.from('platforms').update(payload).eq('id', platForm.id);
    } else {
      await supabase.from('platforms').insert([payload]);
    }

    setPlatForm({ id: null, name: '', description: '', image_url: '', active: true });
    setIsEditingPlat(false);
    loadData();
  };

  const handleEditPlatform = (plat) => {
    setPlatForm({
      id: plat.id,
      name: plat.name,
      description: plat.description || '',
      image_url: plat.image_url || '',
      active: plat.active
    });
    setIsEditingPlat(true);
    setAdminTab('platforms');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePlatform = async (id) => {
    if (window.confirm('¿Deseas eliminar esta plataforma y sus productos?')) {
      await supabase.from('platforms').delete().eq('id', id);
      loadData();
    }
  };

  const handleTogglePlatformActive = async (plat) => {
    await supabase.from('platforms').update({ active: !plat.active }).eq('id', plat.id);
    loadData();
  };

  const handleUpdateOrderStatus = async (orderId, newPayStatus, newServStatus) => {
    await supabase.from('orders').update({
      payment_status: newPayStatus,
      service_status: newServStatus
    }).eq('id', orderId);
    loadData();
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const cleanWa = settingsForm.whatsapp.replace(/[^0-9]/g, '');
    const payload = {
      business_name: settingsForm.business_name.trim(),
      subtitle: settingsForm.subtitle.trim(),
      whatsapp: cleanWa,
      facebook: settingsForm.facebook.trim(),
      instagram: settingsForm.instagram.trim(),
      tiktok: settingsForm.tiktok.trim(),
      telegram: settingsForm.telegram.trim()
    };

    await supabase.from('settings').update(payload).eq('id', 1);
    setSettings(payload);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const allProducts = platforms.flatMap((p) => p.products || []);
  const activeProducts = allProducts.filter((p) => p.active);
  const activePlatforms = platforms.filter((p) => p.active);
  const cleanWhatsapp = (settings.whatsapp || '51906246375').replace(/[^0-9]/g, '');

  // VISTA PANEL ADMIN
  if (currentPath.startsWith('/admin')) {
    if (authChecking) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-amber-400 font-mono text-xs uppercase tracking-widest animate-pulse">
          Verificando sesión segura I-LUXE STORE...
        </div>
      );
    }

    if (!user) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 selection:bg-amber-400 selection:text-black">
          <div className="bg-[#121212] border border-neutral-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl relative">
            <div className="text-center mb-6">
              <span className="text-[10px] tracking-[0.25em] font-bold text-neutral-500 uppercase">
                ACCESO PRIVADO
              </span>
              <h1 className="text-xl font-black text-white mt-1">Panel de administración</h1>
              <p className="text-xs text-amber-400 font-semibold tracking-wider mt-1 uppercase">
                I-LUXE STORE · STREAMING PERÚ
              </p>
            </div>

            {loginError && (
              <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs p-3 rounded-xl mb-4 text-center">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@iluxestore.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-neutral-800 text-black font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer active:scale-95"
              >
                {loginLoading ? 'Verificando...' : 'INICIAR SESIÓN'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-[11px] text-neutral-500 hover:text-white transition"
              >
                ← Volver al catálogo
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 flex flex-col md:flex-row">
        <aside className="w-full md:w-64 bg-[#121212] border-b md:border-b-0 md:border-r border-neutral-800 p-5 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-neutral-800 mb-4">
              <h2 className="text-base font-black text-white tracking-wider">I-LUXE STORE</h2>
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">STREAMING PERÚ · ADMIN</p>
              <p className="text-[11px] text-neutral-500 truncate mt-1">{user.email}</p>
            </div>

            <nav className="space-y-1">
              {[
                { id: 'dashboard', label: '📊 Dashboard' },
                { id: 'orders', label: '🧾 Pedidos' },
                { id: 'clients', label: '👥 Clientes' },
                { id: 'products', label: '📦 Productos & Precios' },
                { id: 'platforms', label: '📺 Plataformas' },
                { id: 'settings', label: '⚙️ Configuración' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAdminTab(tab.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    adminTab === tab.id
                      ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="pt-4 border-t border-neutral-800 space-y-2 mt-6">
            <button
              onClick={() => navigate('/')}
              className="w-full text-left px-3 py-2 text-xs text-neutral-400 hover:text-white transition"
            >
              🌐 Ver Catálogo Público
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/20 rounded-lg transition"
            >
              🚪 Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-6xl">
          {adminTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white">PANEL DE CONTROL</h1>
                <p className="text-xs text-neutral-400 mt-1">Monitorea pedidos, clientes y servicios activos.</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#121212] border border-neutral-800 p-5 rounded-2xl">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase">Total Pedidos</span>
                  <p className="text-3xl font-black text-white mt-1">{orders.length}</p>
                </div>
                <div className="bg-[#121212] border border-neutral-800 p-5 rounded-2xl">
                  <span className="text-[11px] font-bold text-amber-400 uppercase">Total Clientes</span>
                  <p className="text-3xl font-black text-amber-400 mt-1">{clients.length}</p>
                </div>
                <div className="bg-[#121212] border border-neutral-800 p-5 rounded-2xl">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase">Plataformas</span>
                  <p className="text-3xl font-black text-emerald-400 mt-1">{platforms.length}</p>
                </div>
                <div className="bg-[#121212] border border-neutral-800 p-5 rounded-2xl">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase">Servicios Activos</span>
                  <p className="text-3xl font-black text-white mt-1">{activeProducts.length}</p>
                </div>
              </div>
            </div>
          )}

          {adminTab === 'orders' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white">GESTIÓN DE PEDIDOS</h1>
                <p className="text-xs text-neutral-400 mt-1">Control de pagos y estados de entrega.</p>
              </div>

              <div className="bg-[#121212] border border-neutral-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-900 border-b border-neutral-800 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                    <tr>
                      <th className="p-3.5">Cliente</th>
                      <th className="p-3.5">Servicio</th>
                      <th className="p-3.5">Precio</th>
                      <th className="p-3.5">Estado Pago</th>
                      <th className="p-3.5">Estado Servicio</th>
                      <th className="p-3.5">Vencimiento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-neutral-500">No hay pedidos registrados aún.</td>
                      </tr>
                    ) : (
                      orders.map((o) => (
                        <tr key={o.id} className="hover:bg-neutral-900/50">
                          <td className="p-3.5">
                            <p className="font-bold text-white">{o.client_name}</p>
                            <p className="text-[10px] text-neutral-500">{o.client_contact}</p>
                          </td>
                          <td className="p-3.5">
                            <p className="font-semibold text-amber-300">{o.platform_name}</p>
                            <p className="text-[10px] text-neutral-400">{o.service_type}</p>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-white">
                            S/ {Number(o.price).toFixed(2)}
                          </td>
                          <td className="p-3.5">
                            <select
                              value={o.payment_status}
                              onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value, o.service_status)}
                              className="bg-black border border-neutral-800 rounded px-2 py-1 text-[11px] text-white"
                            >
                              <option value="Pendiente">Pendiente</option>
                              <option value="Pagado">Pagado</option>
                              <option value="Vencido">Vencido</option>
                              <option value="Cancelado">Cancelado</option>
                            </select>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={o.service_status}
                              onChange={(e) => handleUpdateOrderStatus(o.id, o.payment_status, e.target.value)}
                              className="bg-black border border-neutral-800 rounded px-2 py-1 text-[11px] text-white"
                            >
                              <option value="Activo">Activo</option>
                              <option value="Por vencer">Por vencer</option>
                              <option value="Vencido">Vencido</option>
                              <option value="Suspendido">Suspendido</option>
                            </select>
                          </td>
                          <td className="p-3.5 text-neutral-400 text-[11px] font-mono">
                            {o.expiration_date ? new Date(o.expiration_date).toLocaleDateString() : '30 días'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab === 'clients' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white">BASE DE CLIENTES</h1>
                <p className="text-xs text-neutral-400 mt-1">Clientes registrados mediante compra directa.</p>
              </div>

              <div className="bg-[#121212] border border-neutral-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-900 border-b border-neutral-800 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                    <tr>
                      <th className="p-3.5">Nombre Completo</th>
                      <th className="p-3.5">WhatsApp</th>
                      <th className="p-3.5">Correo</th>
                      <th className="p-3.5">Fecha</th>
                      <th className="p-3.5">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {clients.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-6 text-center text-neutral-500">No hay clientes registrados aún.</td>
                      </tr>
                    ) : (
                      clients.map((c) => (
                        <tr key={c.id} className="hover:bg-neutral-900/50">
                          <td className="p-3.5 font-bold text-white">{c.full_name}</td>
                          <td className="p-3.5 font-mono text-amber-400">
                            <a href={`https://wa.me/${c.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="hover:underline">
                              {c.whatsapp}
                            </a>
                          </td>
                          <td className="p-3.5 text-neutral-400">{c.email || 'No registrado'}</td>
                          <td className="p-3.5 text-[11px] font-mono">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab === 'products' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white">SERVICIOS Y MODALIDADES</h1>
                <p className="text-xs text-neutral-400 mt-1">Configura precios en Soles (S/), perfiles y dispositivos.</p>
              </div>

              <form onSubmit={handleSaveProduct} className="bg-[#121212] border border-neutral-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {isEditingProd ? 'Editar Modalidad' : '+ Agregar Nuevo Servicio'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">Plataforma</label>
                    <select
                      required
                      value={prodForm.platform_id}
                      onChange={(e) => setProdForm({ ...prodForm, platform_id: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="">Seleccionar plataforma</option>
                      {platforms.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">Modalidad</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Cuenta completa, Perfil personal"
                      value={prodForm.service_type}
                      onChange={(e) => setProdForm({ ...prodForm, service_type: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">Perfiles / Disp.</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Perfiles"
                        value={prodForm.profiles_count}
                        onChange={(e) => setProdForm({ ...prodForm, profiles_count: e.target.value })}
                        className="w-1/2 bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-2 py-2 text-xs text-white"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Disp."
                        value={prodForm.devices_count}
                        onChange={(e) => setProdForm({ ...prodForm, devices_count: e.target.value })}
                        className="w-1/2 bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-2 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">Precio en Soles (S/)</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      placeholder="Ej: 15.00"
                      value={prodForm.price}
                      onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">Descripción</label>
                  <input
                    type="text"
                    value={prodForm.description}
                    onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                    className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="prodActive"
                    checked={prodForm.active}
                    onChange={(e) => setProdForm({ ...prodForm, active: e.target.checked })}
                    className="rounded bg-black border-neutral-700 text-amber-400"
                  />
                  <label htmlFor="prodActive" className="text-xs text-neutral-300 font-semibold cursor-pointer">
                    Servicio activo en el catálogo
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-5 py-2 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    {isEditingProd ? 'Guardar Cambios' : 'Guardar Servicio'}
                  </button>
                  {isEditingProd && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProd(false);
                        setProdForm({ id: null, platform_id: '', service_type: '', description: 'Acceso garantizado y soporte activo.', profiles_count: 1, devices_count: 1, price: '', active: true });
                      }}
                      className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2 rounded-xl text-xs"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

              <div className="bg-[#121212] border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-neutral-800">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Catálogo Activo</h3>
                </div>
                <div className="divide-y divide-neutral-800">
                  {allProducts.map((p) => {
                    const plat = platforms.find((pl) => pl.id === p.platform_id);
                    return (
                      <div key={p.id} className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] text-amber-400 font-bold uppercase">{plat?.name || p.platform_name}</span>
                          <h4 className="text-sm font-bold text-white">{p.service_type}</h4>
                          <p className="text-xs font-mono font-bold text-neutral-300">
                            S/ {Number(p.price).toFixed(2)} 
                            <span className="text-[10px] font-sans text-neutral-500 ml-2">
                              ({p.profiles_count} perfil(es) · {p.devices_count} disp.)
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleProductActive(p)}
                            className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${
                              p.active ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {p.active ? 'Activo' : 'Inactivo'}
                          </button>
                          <button onClick={() => handleEditProduct(p)} className="text-xs text-amber-400 hover:underline px-2">Editar</button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="text-xs text-rose-400 hover:underline px-2">Eliminar</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'platforms' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white">ADMINISTRAR PLATAFORMAS</h1>
                <p className="text-xs text-neutral-400 mt-1">Crea nuevas plataformas y sube sus logos.</p>
              </div>

              <form onSubmit={handleSavePlatform} className="bg-[#121212] border border-neutral-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {isEditingPlat ? 'Editar Plataforma' : '+ Agregar Plataforma'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">Nombre</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: DISNEY+, HBO MAX"
                      value={platForm.name}
                      onChange={(e) => setPlatForm({ ...platForm, name: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">URL de Logo</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={platForm.image_url}
                      onChange={(e) => setPlatForm({ ...platForm, image_url: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">
                    Subir foto a Supabase Storage:
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImage}
                    onChange={(e) => handleFileUpload(e, (url) => setPlatForm({ ...platForm, image_url: url }))}
                    className="text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer"
                  />
                  {uploadingImage && <span className="text-xs text-amber-400 ml-2">Subiendo imagen...</span>}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="platActive"
                    checked={platForm.active}
                    onChange={(e) => setPlatForm({ ...platForm, active: e.target.checked })}
                    className="rounded bg-black border-neutral-700 text-amber-400"
                  />
                  <label htmlFor="platActive" className="text-xs text-neutral-300 font-semibold cursor-pointer">
                    Plataforma activa en el catálogo
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-5 py-2 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    {isEditingPlat ? 'Guardar Cambios' : 'Crear Plataforma'}
                  </button>
                  {isEditingPlat && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPlat(false);
                        setPlatForm({ id: null, name: '', description: '', image_url: '', active: true });
                      }}
                      className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2 rounded-xl text-xs"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

              <div className="bg-[#121212] border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-neutral-800">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Plataformas Registradas</h3>
                </div>
                <div className="divide-y divide-neutral-800">
                  {platforms.map((p) => (
                    <div key={p.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image_url || 'https://img.icons8.com/color/512/television.png'}
                          alt={p.name}
                          className="w-10 h-10 object-contain bg-black border border-neutral-800 rounded p-1"
                        />
                        <h4 className="text-sm font-bold text-white">{p.name}</h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePlatformActive(p)}
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${
                            p.active ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {p.active ? 'Activo' : 'Inactivo'}
                        </button>
                        <button onClick={() => handleEditPlatform(p)} className="text-xs text-amber-400 hover:underline px-2">Editar</button>
                        <button onClick={() => handleDeletePlatform(p.id)} className="text-xs text-rose-400 hover:underline px-2">Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'settings' && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h1 className="text-2xl font-black text-white">CONFIGURACIÓN GENERAL</h1>
                <p className="text-xs text-neutral-400 mt-1">Modifica el WhatsApp oficial y redes sociales.</p>
              </div>

              {saveSuccess && (
                <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs p-3 rounded-xl">
                  ✓ Configuración actualizada.
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="bg-[#121212] border border-neutral-800 rounded-2xl p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">Nombre del negocio</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.business_name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, business_name: e.target.value })}
                    className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">Subtítulo</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.subtitle}
                    onChange={(e) => setSettingsForm({ ...settingsForm, subtitle: e.target.value })}
                    className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">WhatsApp Oficial</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.whatsapp}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                    className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>

                <div className="pt-3 border-t border-neutral-800 space-y-3">
                  <span className="block text-[11px] font-bold text-amber-400 uppercase">Redes Sociales</span>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Facebook URL</label>
                    <input
                      type="text"
                      placeholder="https://facebook.com/..."
                      value={settingsForm.facebook}
                      onChange={(e) => setSettingsForm({ ...settingsForm, facebook: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Instagram URL</label>
                    <input
                      type="text"
                      placeholder="https://instagram.com/..."
                      value={settingsForm.instagram}
                      onChange={(e) => setSettingsForm({ ...settingsForm, instagram: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">TikTok URL</label>
                    <input
                      type="text"
                      placeholder="https://tiktok.com/@..."
                      value={settingsForm.tiktok}
                      onChange={(e) => setSettingsForm({ ...settingsForm, tiktok: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Telegram URL</label>
                    <input
                      type="text"
                      placeholder="https://t.me/..."
                      value={settingsForm.telegram}
                      onChange={(e) => setSettingsForm({ ...settingsForm, telegram: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-400 hover:bg-amber-300 text-black font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  GUARDAR CAMBIOS
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    );
  }

  // VISTA PÁGINA PÚBLICA
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 font-sans selection:bg-amber-400 selection:text-black">
      {/* 1. HEADER */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-neutral-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex flex-col text-left">
            <span className="text-xl sm:text-2xl font-black tracking-widest text-white">
              {settings.business_name}
            </span>
            <span className="text-[10px] tracking-[0.25em] text-amber-400 font-bold uppercase">
              {settings.subtitle}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href="#catalogo"
              className="px-4 py-2 text-xs font-bold text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-xl transition"
            >
              VER CATÁLOGO
            </a>

            <a
              href={`https://wa.me/${cleanWhatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition active:scale-95"
            >
              <span>WHATSAPP</span>
            </a>
          </div>
        </div>
      </header>

      {/* 2. PORTADA */}
      <section className="py-14 sm:py-24 px-4 text-center border-b border-neutral-900 relative">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3.5 py-1 rounded-full mb-6">
            ENTRETENIMIENTO DIGITAL
          </span>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.15] mb-5">
            Tu entretenimiento, <br />
            <span className="text-neutral-300 font-medium">fácil y rápido.</span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-400 max-w-xl mx-auto mb-8 leading-relaxed">
            Elige una plataforma, selecciona la modalidad que necesitas y realiza tu pedido de forma rápida y sencilla.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <a
              href="#catalogo"
              className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 px-6 py-3.5 rounded-xl text-xs font-bold tracking-wider uppercase transition"
            >
              VER CATÁLOGO
            </a>

            <a
              href="#catalogo"
              className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-black font-black px-6 py-3.5 rounded-xl text-xs tracking-wider uppercase transition shadow-lg shadow-amber-400/10 active:scale-95"
            >
              COMPRAR DIRECTO
            </a>
          </div>
        </div>
      </section>

      {/* 3. CATÁLOGO CON LOS 15 SERVICIOS */}
      <section id="catalogo" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <span className="text-[11px] font-bold tracking-[0.2em] text-amber-400 uppercase">
            Precios en soles · Compra directa
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
            CATÁLOGO OFICIAL
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-20 text-neutral-500 text-sm">
            <p className="animate-pulse">Cargando catálogo oficial...</p>
          </div>
        ) : activePlatforms.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-neutral-800 rounded-2xl bg-[#121212]">
            <p className="text-sm text-neutral-400">No hay plataformas activas disponibles por el momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activePlatforms.map((platform) => {
              const activeProds = (platform.products || []).filter((p) => p.active);

              return (
                <div
                  key={platform.id}
                  className="bg-[#121212] border border-neutral-800/90 hover:border-neutral-700 rounded-2xl p-6 flex flex-col justify-between shadow-xl transition-all"
                >
                  <div>
                    <div className="flex items-center space-x-4 pb-4 border-b border-neutral-800">
                      <div className="w-14 h-14 rounded-xl bg-black border border-neutral-800 p-2 flex items-center justify-center flex-shrink-0">
                        <img
                          src={platform.image_url || 'https://img.icons8.com/color/512/television.png'}
                          alt={platform.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://img.icons8.com/color/512/television.png';
                          }}
                        />
                      </div>
                      <div>
                        <span className="text-[10px] tracking-widest text-amber-400 font-bold uppercase">Streaming</span>
                        <h3 className="text-2xl font-black text-white tracking-wide uppercase leading-none mt-1">
                          {platform.name}
                        </h3>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      {activeProds.length > 0 ? (
                        activeProds.map((prod) => (
                          <div
                            key={prod.id}
                            className="bg-[#181818] border border-neutral-800 rounded-xl p-4 transition"
                          >
                            <div className="flex justify-between items-baseline mb-1">
                              <h4 className="font-bold text-sm text-neutral-100 uppercase tracking-wide">
                                {prod.service_type}
                              </h4>
                              <span className="text-xl font-black text-amber-400 font-mono">
                                S/ {Number(prod.price).toFixed(2)}
                              </span>
                            </div>

                            <div className="flex gap-2 my-2">
                              {prod.profiles_count > 1 && (
                                <span className="text-[10px] bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded text-neutral-300 font-semibold">
                                  {prod.profiles_count} perfiles
                                </span>
                              )}
                              <span className="text-[10px] bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded text-neutral-300 font-semibold">
                                {prod.devices_count} dispositivo(s)
                              </span>
                            </div>

                            <p className="text-xs text-neutral-400 mb-3">
                              {prod.description}
                            </p>

                            <button
                              onClick={() => setCheckoutItem({
                                platformName: platform.name,
                                serviceType: prod.service_type,
                                price: prod.price,
                                productId: prod.id
                              })}
                              className="w-full bg-amber-400 hover:bg-amber-300 text-black font-extrabold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-400/10 cursor-pointer"
                            >
                              <span>⚡ COMPRAR DIRECTO</span>
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-neutral-500 italic py-4 text-center">
                          Modalidades en preparación para esta plataforma.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-neutral-900 text-center">
                    <span className="text-[10px] text-neutral-500 font-medium">
                      ✓ Entrega inmediata y soporte activo
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL CHECKOUT CON REGISTRO */}
      {checkoutItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-amber-400/50 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setCheckoutItem(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white text-lg font-bold cursor-pointer"
            >
              ✕
            </button>

            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block mb-1">
              Checkout Inmediato
            </span>
            <h3 className="text-lg font-black text-white">{checkoutItem.platformName}</h3>
            <p className="text-xs text-neutral-300 font-semibold mt-0.5">{checkoutItem.serviceType}</p>
            <p className="text-3xl font-black text-amber-400 font-mono mt-2">
              S/ {Number(checkoutItem.price).toFixed(2)}
            </p>

            <div className="my-4 bg-white p-3 rounded-xl inline-block shadow-md">
              <img
                src="https://i.postimg.cc/05f0pV8j/qr-png.jpg"
                alt="QR Pago Yape / Dale"
                className="w-40 h-40 object-contain mx-auto"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=51906246375";
                }}
              />
              <span className="text-black font-extrabold text-xs mt-1 block">YAPE / DALE</span>
            </div>

            <div className="bg-neutral-900 rounded-xl p-3 text-xs text-left border border-neutral-800 space-y-1 mb-4">
              <p className="text-neutral-400">Número Yape / Dale: <span className="text-amber-300 font-mono font-bold">906 246 375</span></p>
              <p className="text-neutral-400">Titular: <span className="text-white font-semibold">I-LUXE STORE</span></p>
            </div>

            <div className="space-y-2 mb-4 text-left">
              <input
                type="text"
                required
                placeholder="Tu nombre completo *"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
              <input
                type="tel"
                required
                placeholder="Número de WhatsApp *"
                value={clientWhatsapp}
                onChange={(e) => setClientWhatsapp(e.target.value)}
                className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
              />
              <input
                type="email"
                placeholder="Correo (opcional para entrega)"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <button
              disabled={isSubmittingOrder}
              onClick={handleFinalizePurchase}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950/50 active:scale-95 cursor-pointer disabled:bg-neutral-700"
            >
              {isSubmittingOrder ? 'REGISTRANDO...' : '✓ YA TRANSFERÍ · ENTREGAR MI CUENTA'}
            </button>
            <p className="text-[10px] text-neutral-500 mt-2">
              Se registrará tu pedido en el sistema y se abrirá WhatsApp con el comprobante.
            </p>
          </div>
        </div>
      )}

      {/* 4. BENEFICIOS */}
      <section className="py-16 px-4 max-w-6xl mx-auto border-t border-neutral-900">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-[#121212] border border-neutral-800 p-6 rounded-2xl">
            <span className="text-2xl mb-3 block">💬</span>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
              ATENCIÓN PERSONALIZADA
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Atención directa por WhatsApp.
            </p>
          </div>

          <div className="bg-[#121212] border border-neutral-800 p-6 rounded-2xl">
            <span className="text-2xl mb-3 block">🛡️</span>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
              SOPORTE
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Estamos disponibles para ayudarte.
            </p>
          </div>

          <div className="bg-[#121212] border border-neutral-800 p-6 rounded-2xl">
            <span className="text-2xl mb-3 block">🇵🇪</span>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
              ATENCIÓN EN PERÚ
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Servicio orientado a clientes en Perú.
            </p>
          </div>
        </div>
      </section>

      {/* 5. REDES */}
      {(settings.facebook || settings.instagram || settings.tiktok || settings.telegram) && (
        <section className="py-12 px-4 max-w-4xl mx-auto text-center border-t border-neutral-900">
          <h3 className="text-xs font-bold tracking-[0.2em] text-neutral-400 uppercase mb-5">
            SÍGUENOS EN NUESTRAS REDES
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {settings.facebook && (
              <a href={settings.facebook} target="_blank" rel="noreferrer" className="bg-[#121212] border border-neutral-800 hover:border-amber-400 text-neutral-200 px-5 py-2 rounded-xl text-xs font-semibold transition">
                Facebook
              </a>
            )}
            {settings.instagram && (
              <a href={settings.instagram} target="_blank" rel="noreferrer" className="bg-[#121212] border border-neutral-800 hover:border-amber-400 text-neutral-200 px-5 py-2 rounded-xl text-xs font-semibold transition">
                Instagram
              </a>
            )}
            {settings.tiktok && (
              <a href={settings.tiktok} target="_blank" rel="noreferrer" className="bg-[#121212] border border-neutral-800 hover:border-amber-400 text-neutral-200 px-5 py-2 rounded-xl text-xs font-semibold transition">
                TikTok
              </a>
            )}
            {settings.telegram && (
              <a href={settings.telegram} target="_blank" rel="noreferrer" className="bg-[#121212] border border-neutral-800 hover:border-amber-400 text-neutral-200 px-5 py-2 rounded-xl text-xs font-semibold transition">
                Telegram
              </a>
            )}
          </div>
        </section>
      )}

      {/* 6. PAGOS */}
      <section className="py-12 px-4 max-w-xl mx-auto text-center">
        <div className="bg-[#121212] border border-neutral-800 rounded-2xl p-6">
          <span className="text-[10px] tracking-widest text-amber-400 font-bold uppercase block mb-1">Pagos instantáneos</span>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Medios de Pago Aceptados</h4>
          <div className="flex justify-center gap-4 my-4">
            <span className="bg-purple-950/60 border border-purple-800 text-purple-300 px-4 py-1.5 rounded-lg text-xs font-black tracking-wider">
              YAPE
            </span>
            <span className="bg-amber-950/60 border border-amber-800 text-amber-300 px-4 py-1.5 rounded-lg text-xs font-black tracking-wider">
              DALE
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Número oficial: <span className="text-white font-mono font-bold">906 246 375</span>
          </p>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-black border-t border-neutral-900 py-12 px-4 text-center md:text-left">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h4 className="text-lg font-black tracking-widest text-white">{settings.business_name}</h4>
            <p className="text-[10px] tracking-[0.2em] text-amber-400 font-bold uppercase mb-2">{settings.subtitle}</p>
            <p className="text-xs text-neutral-400">Tu entretenimiento, nuestra prioridad.</p>
            <p className="text-xs text-neutral-300 font-mono mt-1">WhatsApp: {settings.whatsapp}</p>
          </div>

          <nav className="flex flex-wrap justify-center gap-4 text-xs text-neutral-400">
            <a href="/" className="hover:text-white transition">Inicio</a>
            <a href="#catalogo" className="hover:text-white transition">Catálogo</a>
            <a href={`https://wa.me/${cleanWhatsapp}`} target="_blank" rel="noreferrer" className="hover:text-white transition">WhatsApp</a>
            {settings.facebook && <a href={settings.facebook} target="_blank" rel="noreferrer" className="hover:text-white transition">Facebook</a>}
            {settings.instagram && <a href={settings.instagram} target="_blank" rel="noreferrer" className="hover:text-white transition">Instagram</a>}
            {settings.tiktok && <a href={settings.tiktok} target="_blank" rel="noreferrer" className="hover:text-white transition">TikTok</a>}
            {settings.telegram && <a href={settings.telegram} target="_blank" rel="noreferrer" className="hover:text-white transition">Telegram</a>}
          </nav>
        </div>

        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-neutral-950 text-center text-[11px] text-neutral-600">
          © {new Date().getFullYear()} {settings.business_name}. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
