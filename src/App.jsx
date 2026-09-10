import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

// Definición de Categorías Oficiales
const CATEGORIES = [
  {
    id: 'streaming-popular',
    name: 'STREAMING POPULAR',
    icon: '🌟',
    platforms: ['NETFLIX PREMIUM', 'DISNEY+', 'AMAZON PRIME', 'HBO MAX', 'PARAMOUNT+']
  },
  {
    id: 'tv-entretenimiento',
    name: 'ENTRETENIMIENTO Y TV',
    icon: '📺',
    platforms: ['DGO', 'MOVISTAR', 'VIX PREMIUM']
  },
  {
    id: 'anime-series',
    name: 'ANIME Y SERIES',
    icon: '🎌',
    platforms: ['CRUNCHYROLL', 'VIKI RAKUTEN', 'KOCOWA']
  },
  {
    id: 'musica-premium',
    name: 'MÚSICA Y CONTENIDO PREMIUM',
    icon: '🎧',
    platforms: ['SPOTIFY PREMIUM', 'YOUTUBE PREMIUM', 'UNIVERSAL+', 'APPLE TV+']
  }
];

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Estados públicos
  const [platforms, setPlatforms] = useState([]);
  const [settings, setSettings] = useState({
    business_name: 'I-LUXE STORE',
    subtitle: 'STREAMING PERÚ',
    whatsapp: '906246375',
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    tiktok: 'https://tiktok.com',
    telegram: ''
  });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Estados Admin
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Panel Tabs: 'dashboard' | 'orders' | 'clients' | 'products' | 'platforms' | 'settings'
  const [adminTab, setAdminTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);

  // Formulario Producto
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

  // Formulario Plataforma
  const [platForm, setPlatForm] = useState({
    id: null,
    name: '',
    description: '',
    image_url: '',
    active: true
  });
  const [isEditingPlat, setIsEditingPlat] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Formulario Ajustes
  const [settingsForm, setSettingsForm] = useState({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Enrutamiento SPA
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

  // Sesión Supabase
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

  // Cargar Catálogo desde Supabase
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: setData } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
      if (setData) {
        setSettings(prev => ({
          ...prev,
          ...setData,
          facebook: setData.facebook || 'https://facebook.com',
          instagram: setData.instagram || 'https://instagram.com',
          tiktok: setData.tiktok || 'https://tiktok.com'
        }));
        setSettingsForm(prev => ({
          ...prev,
          ...setData,
          facebook: setData.facebook || 'https://facebook.com',
          instagram: setData.instagram || 'https://instagram.com',
          tiktok: setData.tiktok || 'https://tiktok.com'
        }));
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

  // Login de Supabase
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

  // Subir imagen a Supabase Storage
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
      alert('Error al subir imagen: ' + (err.message || 'Verifica el bucket images.'));
    } finally {
      setUploadingImage(false);
    }
  };

  // Botón Comprar por WhatsApp (Formato Exacto)
  const handleBuyWhatsApp = (platformName, serviceType, price) => {
    let cleanWa = (settings.whatsapp || '906246375').replace(/[^0-9]/g, '');
    if (!cleanWa.startsWith('51') && cleanWa.length === 9) {
      cleanWa = '51' + cleanWa;
    }

    const message = `Hola I-LUXE STORE 👋

Estoy interesado en:

Plataforma: ${platformName}
Servicio: ${serviceType}
Precio: S/ ${Number(price).toFixed(2)}

Quiero más información.`;

    window.open(`https://wa.me/${cleanWa}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCustomInquiryWhatsApp = () => {
    let cleanWa = (settings.whatsapp || '906246375').replace(/[^0-9]/g, '');
    if (!cleanWa.startsWith('51') && cleanWa.length === 9) {
      cleanWa = '51' + cleanWa;
    }

    const message = `Hola I-LUXE STORE 👋 No encuentro la plataforma o servicio que estoy buscando, ¿me podrían ayudar con información y disponibilidad?`;
    window.open(`https://wa.me/${cleanWa}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // CRUD Productos
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

  // CRUD Plataformas
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
    if (window.confirm('¿Deseas eliminar esta plataforma y todas sus modalidades asociadas?')) {
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

  let officialWaNumber = (settings.whatsapp || '906246375').replace(/[^0-9]/g, '');
  if (!officialWaNumber.startsWith('51') && officialWaNumber.length === 9) {
    officialWaNumber = '51' + officialWaNumber;
  }

  // URLs de redes con valores por defecto
  const fbUrl = settings.facebook || 'https://facebook.com';
  const igUrl = settings.instagram || 'https://instagram.com';
  const ttUrl = settings.tiktok || 'https://tiktok.com';
  const waUrl = `https://wa.me/${officialWaNumber}?text=${encodeURIComponent('Hola I-LUXE STORE 👋 Deseo realizar una consulta sobre el catálogo de streaming.')}`;

  // ==========================================
  // VISTA 1: PANEL ADMINISTRATIVO PRIVADO (/admin)
  // ==========================================
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
      <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 flex flex-col md:flex-row font-sans">
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
                <p className="text-xs text-neutral-400 mt-1">Monitorea tus pedidos, clientes y servicios activos.</p>
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
                <p className="text-xs text-neutral-400 mt-1">Control de pagos y cuentas activas.</p>
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
                <p className="text-xs text-neutral-400 mt-1">Directorio de compradores registrados.</p>
              </div>

              <div className="bg-[#121212] border border-neutral-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-900 border-b border-neutral-800 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                    <tr>
                      <th className="p-3.5">Nombre Completo</th>
                      <th className="p-3.5">WhatsApp</th>
                      <th className="p-3.5">Correo</th>
                      <th className="p-3.5">Registro</th>
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
                <h1 className="text-2xl font-black text-white">SERVICIOS Y PRECIOS</h1>
                <p className="text-xs text-neutral-400 mt-1">Edita precios en Soles, perfiles y modalidades.</p>
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
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">Tipo de servicio</label>
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
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">Descripción corta</label>
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
                      placeholder="Ej: NETFLIX, DISNEY+"
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
                <h1 className="text-2xl font-black text-white">CONFIGURACIÓN GENERAL & REDES SOCIALES</h1>
                <p className="text-xs text-neutral-400 mt-1">Coloca y modifica los enlaces de tus redes sociales y WhatsApp oficial.</p>
              </div>

              {saveSuccess && (
                <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs p-3 rounded-xl">
                  ✓ Configuración y enlaces de redes sociales actualizados en la página web.
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
                  <p className="text-[10px] text-neutral-500 mt-1">Número actual: 906246375</p>
                </div>

                <div className="pt-3 border-t border-neutral-800 space-y-3">
                  <span className="block text-[11px] font-bold text-amber-400 uppercase">Enlaces de Redes Sociales</span>
                  
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">📘 URL de Facebook</label>
                    <input
                      type="text"
                      placeholder="https://facebook.com/tu-pagina"
                      value={settingsForm.facebook}
                      onChange={(e) => setSettingsForm({ ...settingsForm, facebook: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">📸 URL de Instagram</label>
                    <input
                      type="text"
                      placeholder="https://instagram.com/tu-perfil"
                      value={settingsForm.instagram}
                      onChange={(e) => setSettingsForm({ ...settingsForm, instagram: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">🎵 URL de TikTok</label>
                    <input
                      type="text"
                      placeholder="https://tiktok.com/@tu-cuenta"
                      value={settingsForm.tiktok}
                      onChange={(e) => setSettingsForm({ ...settingsForm, tiktok: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">✈️ URL de Telegram (Opcional)</label>
                    <input
                      type="text"
                      placeholder="https://t.me/tu-canal"
                      value={settingsForm.telegram}
                      onChange={(e) => setSettingsForm({ ...settingsForm, telegram: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-400 hover:bg-amber-300 text-black font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  GUARDAR AJUSTES
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ==========================================
  // VISTA 2: PÁGINA PÚBLICA (I-LUXE STORE)
  // ==========================================
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
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition active:scale-95"
            >
              <span>WHATSAPP</span>
            </a>
          </div>
        </div>
      </header>

      {/* 2. PORTADA PRINCIPAL */}
      <section className="py-14 sm:py-20 px-4 text-center border-b border-neutral-900 relative">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3.5 py-1 rounded-full mb-5">
            STREAMING OFICIAL EN PERÚ
          </span>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.15] mb-4">
            Tu entretenimiento, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
              fácil y rápido.
            </span>
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
              href={`https://wa.me/${officialWaNumber}?text=${encodeURIComponent('Hola I-LUXE STORE 👋 Deseo realizar una consulta para adquirir un servicio de streaming.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-black font-black px-6 py-3.5 rounded-xl text-xs tracking-wider uppercase transition shadow-lg shadow-amber-400/10 active:scale-95"
            >
              COMPRAR POR WHATSAPP
            </a>
          </div>
        </div>
      </section>

      {/* 3. ENCABEZADO DEL CATÁLOGO */}
      <section id="catalogo" className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-[11px] font-extrabold tracking-[0.25em] text-amber-400 uppercase bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
            CATÁLOGO OFICIAL · PRECIOS EN SOLES (S/)
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-3">
            TU ENTRETENIMIENTO FAVORITO
          </h2>
          <p className="text-sm sm:text-base text-neutral-400 mt-2">
            Elige tu plataforma favorita y disfruta del mejor entretenimiento.
          </p>
        </div>

        {/* FILTRO DE CATEGORÍAS */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8 mb-12">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              selectedCategory === 'all'
                ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                : 'bg-[#121212] text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            Todos
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                  : 'bg-[#121212] text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* LISTADO DE PRODUCTOS POR CATEGORÍA */}
        {loading ? (
          <div className="text-center py-20 text-neutral-500 text-sm">
            <p className="animate-pulse">Cargando catálogo oficial...</p>
          </div>
        ) : activePlatforms.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-neutral-800 rounded-2xl bg-[#121212]">
            <p className="text-sm text-neutral-400">No hay servicios disponibles temporalmente.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {CATEGORIES.filter(cat => selectedCategory === 'all' || selectedCategory === cat.id).map((category) => {
              const catPlatforms = activePlatforms.filter(p => category.platforms.includes(p.name));
              if (catPlatforms.length === 0) return null;

              return (
                <div key={category.id} className="space-y-6">
                  <div className="flex items-center gap-3 pb-3 border-b border-neutral-800">
                    <span className="text-2xl">{category.icon}</span>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
                      {category.name}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {catPlatforms.map((platform) => {
                      const activeProds = (platform.products || []).filter((p) => p.active);

                      return (
                        <div
                          key={platform.id}
                          className="bg-[#121212] border border-neutral-800/90 hover:border-neutral-700 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xl transition-all"
                        >
                          <div>
                            <div className="flex items-center space-x-3.5 pb-4 border-b border-neutral-800/80">
                              <div className="w-12 h-12 rounded-xl bg-black border border-neutral-800 p-2 flex items-center justify-center flex-shrink-0">
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
                                <h4 className="text-xl font-black text-white tracking-wide uppercase leading-tight mt-0.5">
                                  {platform.name}
                                </h4>
                              </div>
                            </div>

                            <div className="mt-4 space-y-3.5">
                              {activeProds.length > 0 ? (
                                activeProds.map((prod) => (
                                  <div
                                    key={prod.id}
                                    className="bg-[#171717] border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 transition flex flex-col justify-between"
                                  >
                                    <div>
                                      <div className="flex justify-between items-baseline gap-2 mb-1">
                                        <span className="font-extrabold text-sm text-white uppercase tracking-wide">
                                          {prod.service_type}
                                        </span>
                                        <span className="text-xl font-black text-amber-400 font-mono flex-shrink-0">
                                          S/ {Number(prod.price).toFixed(2)}
                                        </span>
                                      </div>

                                      <div className="flex flex-wrap gap-1.5 my-2">
                                        {prod.profiles_count > 1 && (
                                          <span className="text-[11px] bg-neutral-900 border border-neutral-700 text-neutral-300 px-2 py-0.5 rounded font-semibold">
                                            {prod.profiles_count} perfiles
                                          </span>
                                        )}
                                        <span className="text-[11px] bg-neutral-900 border border-neutral-700 text-neutral-300 px-2 py-0.5 rounded font-semibold">
                                          {prod.devices_count} {prod.devices_count === 1 ? 'dispositivo' : 'dispositivos'}
                                        </span>
                                      </div>

                                      <p className="text-xs text-neutral-400 leading-relaxed mb-3">
                                        {prod.description || 'Acceso completo para disfrutar tu entretenimiento.'}
                                      </p>
                                    </div>

                                    <button
                                      onClick={() => handleBuyWhatsApp(platform.name, prod.service_type, prod.price)}
                                      className="w-full bg-amber-400 hover:bg-amber-300 text-black font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-400/10 cursor-pointer"
                                    >
                                      <span>💬 COMPRAR POR WHATSAPP</span>
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-neutral-500 italic py-2 text-center">
                                  Modalidades en actualización.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-neutral-900 text-center">
                            <span className="text-[10px] text-neutral-500 font-medium">
                              ✓ Activación rápida y soporte garantizado
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. SECCIÓN DE CONFIANZA */}
      <section className="py-16 px-4 max-w-5xl mx-auto border-t border-neutral-900">
        <div className="text-center mb-10">
          <span className="text-[11px] font-extrabold tracking-[0.25em] text-amber-400 uppercase">
            GARANTÍA Y COMPROMISO
          </span>
          <h3 className="text-2xl sm:text-4xl font-black text-white mt-1 uppercase tracking-tight">
            ¿POR QUÉ ELEGIR I-LUXE STORE?
          </h3>
          <p className="text-xs sm:text-sm text-neutral-400 mt-2">
            La opción más confiable y segura para tus servicios digitales en Perú.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-[#121212] border border-neutral-800 p-5 rounded-2xl flex items-center gap-3.5">
            <span className="text-2xl">⚡</span>
            <div>
              <h4 className="text-sm font-black text-white">Atención rápida</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Respuestas y entregas sin demoras.</p>
            </div>
          </div>

          <div className="bg-[#121212] border border-neutral-800 p-5 rounded-2xl flex items-center gap-3.5">
            <span className="text-2xl">💬</span>
            <div>
              <h4 className="text-sm font-black text-white">Soporte por WhatsApp</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Asistencia directa en todo momento.</p>
            </div>
          </div>

          <div className="bg-[#121212] border border-neutral-800 p-5 rounded-2xl flex items-center gap-3.5">
            <span className="text-2xl">📺</span>
            <div>
              <h4 className="text-sm font-black text-white">Variedad de plataformas</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Tus servicios favoritos en un solo lugar.</p>
            </div>
          </div>

          <div className="bg-[#121212] border border-neutral-800 p-5 rounded-2xl flex items-center gap-3.5">
            <span className="text-2xl">💰</span>
            <div>
              <h4 className="text-sm font-black text-white">Precios accesibles</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Tarifas justas y transparentes en Soles.</p>
            </div>
          </div>

          <div className="bg-[#121212] border border-neutral-800 p-5 rounded-2xl flex items-center gap-3.5 sm:col-span-2 lg:col-span-2 justify-start">
            <span className="text-2xl">🤝</span>
            <div>
              <h4 className="text-sm font-black text-white">Atención personalizada</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Te asesoramos para elegir la modalidad que mejor se adapte a tus necesidades.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. NUEVA SECCIÓN OFICIAL: SÍGUENOS EN NUESTRAS REDES */}
      <section className="py-16 px-4 max-w-5xl mx-auto border-t border-neutral-900">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-[11px] font-extrabold tracking-[0.25em] text-amber-400 uppercase bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
            COMUNIDAD & ATENCIÓN
          </span>
          <h3 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight mt-3">
            SÍGUENOS EN NUESTRAS REDES
          </h3>
          <p className="text-xs sm:text-sm text-neutral-400 mt-3 leading-relaxed">
            Mantente conectado con I-LUXE STORE y descubre novedades, promociones, nuevos servicios y contenido exclusivo.
          </p>
        </div>

        {/* BOTONES E ICONOS GRANDES, MODERNOS Y PROFESIONALES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* FACEBOOK */}
          <a
            href={fbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-[#121212] hover:bg-[#181818] border border-neutral-800 hover:border-blue-500/60 rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-300 shadow-xl hover:-translate-y-1"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/30 group-hover:border-blue-500 flex items-center justify-center text-blue-500 mb-4 transition-colors">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <span className="text-base font-black text-white tracking-wide group-hover:text-blue-400 transition-colors">
              FACEBOOK
            </span>
            <span className="text-[11px] text-neutral-500 mt-1">@iluxestore</span>
            <span className="mt-4 text-[11px] font-bold text-neutral-300 group-hover:text-white flex items-center gap-1">
              Seguir página →
            </span>
          </a>

          {/* INSTAGRAM */}
          <a
            href={igUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-[#121212] hover:bg-[#181818] border border-neutral-800 hover:border-pink-500/60 rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-300 shadow-xl hover:-translate-y-1"
          >
            <div className="w-16 h-16 rounded-2xl bg-pink-600/10 border border-pink-500/30 group-hover:border-pink-500 flex items-center justify-center text-pink-500 mb-4 transition-colors">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <span className="text-base font-black text-white tracking-wide group-hover:text-pink-400 transition-colors">
              INSTAGRAM
            </span>
            <span className="text-[11px] text-neutral-500 mt-1">@iluxestore</span>
            <span className="mt-4 text-[11px] font-bold text-neutral-300 group-hover:text-white flex items-center gap-1">
              Ver perfil →
            </span>
          </a>

          {/* TIKTOK */}
          <a
            href={ttUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-[#121212] hover:bg-[#181818] border border-neutral-800 hover:border-amber-400/60 rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-300 shadow-xl hover:-translate-y-1"
          >
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-700 group-hover:border-amber-400 flex items-center justify-center text-white mb-4 transition-colors">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
            </div>
            <span className="text-base font-black text-white tracking-wide group-hover:text-amber-400 transition-colors">
              TIKTOK
            </span>
            <span className="text-[11px] text-neutral-500 mt-1">@iluxestore</span>
            <span className="mt-4 text-[11px] font-bold text-neutral-300 group-hover:text-white flex items-center gap-1">
              Ver videos →
            </span>
          </a>

          {/* WHATSAPP */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-[#121212] hover:bg-[#181818] border border-neutral-800 hover:border-emerald-500/60 rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-300 shadow-xl hover:-translate-y-1"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 group-hover:border-emerald-500 flex items-center justify-center text-emerald-400 mb-4 transition-colors">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
            </div>
            <span className="text-base font-black text-white tracking-wide group-hover:text-emerald-400 transition-colors">
              WHATSAPP
            </span>
            <span className="text-[11px] text-neutral-500 mt-1">906 246 375</span>
            <span className="mt-4 text-[11px] font-bold text-neutral-300 group-hover:text-white flex items-center gap-1">
              Enviar mensaje →
            </span>
          </a>
        </div>
      </section>

      {/* 6. LLAMADA A LA ACCIÓN FINAL */}
      <section className="py-14 px-4 max-w-3xl mx-auto text-center border-t border-neutral-900">
        <div className="bg-gradient-to-b from-[#141414] to-[#0d0d0d] border border-amber-400/30 rounded-3xl p-8 sm:p-10 shadow-2xl">
          <span className="text-[10px] tracking-[0.25em] text-amber-400 font-extrabold uppercase block mb-2">
            ATENCIÓN A MEDIDA
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mb-3">
            ¿NO ENCUENTRAS EL SERVICIO QUE BUSCAS?
          </h3>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto mb-6 leading-relaxed">
            Escríbenos por WhatsApp y te ayudaremos a conseguir la suscripción o modalidad que necesitas de inmediato.
          </p>
          <button
            onClick={handleCustomInquiryWhatsApp}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider transition active:scale-95 shadow-lg shadow-emerald-950/50 cursor-pointer"
          >
            <span>💬 CONTACTAR POR WHATSAPP</span>
          </button>
        </div>
      </section>

      {/* 7. MEDIOS DE PAGO */}
      <section className="py-10 px-4 max-w-xl mx-auto text-center">
        <div className="bg-[#121212] border border-neutral-800 rounded-2xl p-6">
          <span className="text-[10px] tracking-widest text-amber-400 font-bold uppercase block mb-1">Pagos rápidos</span>
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
            Número oficial: <span className="text-white font-mono font-bold">{settings.whatsapp || '906246375'}</span>
          </p>
        </div>
      </section>

      {/* 8. FOOTER PROFESIONAL RENOVADO */}
      <footer className="bg-black border-t border-neutral-900 py-14 px-4 text-center md:text-left">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h4 className="text-2xl font-black tracking-widest text-white">
              {settings.business_name}
            </h4>
            <p className="text-[10px] tracking-[0.25em] text-amber-400 font-bold uppercase mt-0.5">
              {settings.subtitle}
            </p>
            <p className="text-xs text-neutral-400 mt-2 font-medium">
              Tu entretenimiento favorito en un solo lugar.
            </p>
            <p className="text-xs text-neutral-300 font-mono mt-1">
              WhatsApp: <span className="text-amber-400 font-bold">{settings.whatsapp || '906246375'}</span>
            </p>
          </div>

          {/* Enlaces de Redes Sociales en el Footer */}
          <div className="flex flex-col items-center md:items-end gap-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500">
              CONÉCTATE CON NOSOTROS
            </span>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={fbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#121212] hover:bg-neutral-800 border border-neutral-800 hover:border-amber-400 text-neutral-300 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition"
              >
                Facebook
              </a>
              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#121212] hover:bg-neutral-800 border border-neutral-800 hover:border-amber-400 text-neutral-300 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition"
              >
                Instagram
              </a>
              <a
                href={ttUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#121212] hover:bg-neutral-800 border border-neutral-800 hover:border-amber-400 text-neutral-300 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition"
              >
                TikTok
              </a>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800 text-emerald-400 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* COPYRIGHT OFICIAL 2026 */}
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-600 gap-2">
          <span>© 2026 I-LUXE STORE · Streaming Perú</span>
          <span className="text-neutral-500 font-medium">Todos los derechos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
