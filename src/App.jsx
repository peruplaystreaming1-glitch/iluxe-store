import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Conexión segura con variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  // Rutas: "/" (pública) o "/admin" (panel)
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Estados de datos públicos
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

  // Estados de autenticación en /admin
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Pestañas del Admin: 'dashboard' | 'products' | 'platforms' | 'settings'
  const [adminTab, setAdminTab] = useState('dashboard');

  // Formularios de administración
  // 1. Producto
  const [prodForm, setProdForm] = useState({
    id: null,
    platform_id: '',
    modality: '',
    description: 'Acceso según modalidad disponible.',
    price: '',
    image_url: '',
    active: true
  });
  const [isEditingProd, setIsEditingProd] = useState(false);

  // 2. Plataforma
  const [platForm, setPlatForm] = useState({
    id: null,
    name: '',
    description: '',
    image_url: '',
    active: true
  });
  const [isEditingPlat, setIsEditingPlat] = useState(false);

  // 3. Ajustes
  const [settingsForm, setSettingsForm] = useState({ ...settings });
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // Subida de imagen
  const [uploadingImage, setUploadingImage] = useState(false);

  // Modal de confirmación para eliminar
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  });

  // Manejador del historial de navegación (SPA)
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

  // Verificar sesión de Supabase Auth
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

  // Cargar catálogo y configuración de Supabase
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Settings
      const { data: setData } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
      if (setData) {
        setSettings(setData);
        setSettingsForm(setData);
      }

      // 2. Plataformas y sus productos
      const { data: platData } = await supabase
        .from('platforms')
        .select(`
          id,
          name,
          description,
          image_url,
          active,
          products (
            id,
            platform_id,
            modality,
            description,
            price,
            image_url,
            active
          )
        `)
        .order('name', { ascending: true });

      if (platData) {
        setPlatforms(platData);
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Login de Supabase Auth
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

  // Cerrar sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  // Subida de imagen a Supabase Storage (Bucket 'images')
  const handleFileUpload = async (e, callback) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `uploads/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      callback(data.publicUrl);
    } catch (err) {
      alert('Error al subir imagen: ' + (err.message || 'Verifica que el bucket images sea público.'));
    } finally {
      setUploadingImage(false);
    }
  };

  // Operaciones de Producto
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!prodForm.platform_id || !prodForm.modality.trim() || !prodForm.price) {
      alert('Por favor completa los campos obligatorios: Plataforma, Modalidad y Precio.');
      return;
    }

    const payload = {
      platform_id: prodForm.platform_id,
      modality: prodForm.modality.trim(),
      description: prodForm.description.trim(),
      price: parseFloat(prodForm.price),
      image_url: prodForm.image_url,
      active: prodForm.active
    };

    if (isEditingProd) {
      await supabase.from('products').update(payload).eq('id', prodForm.id);
    } else {
      await supabase.from('products').insert([payload]);
    }

    setProdForm({
      id: null,
      platform_id: '',
      modality: '',
      description: 'Acceso según modalidad disponible.',
      price: '',
      image_url: '',
      active: true
    });
    setIsEditingProd(false);
    loadData();
  };

  const handleEditProduct = (prod) => {
    setProdForm({
      id: prod.id,
      platform_id: prod.platform_id,
      modality: prod.modality,
      description: prod.description || '',
      price: prod.price,
      image_url: prod.image_url || '',
      active: prod.active
    });
    setIsEditingProd(true);
    setAdminTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProduct = (id) => {
    setConfirmModal({
      open: true,
      title: '¿Eliminar producto?',
      message: 'Esta acción no se puede deshacer y el producto desaparecerá del catálogo.',
      onConfirm: async () => {
        await supabase.from('products').delete().eq('id', id);
        setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
        loadData();
      }
    });
  };

  const handleToggleProductActive = async (prod) => {
    await supabase.from('products').update({ active: !prod.active }).eq('id', prod.id);
    loadData();
  };

  // Operaciones de Plataforma
  const handleSavePlatform = async (e) => {
    e.preventDefault();
    if (!platForm.name.trim()) {
      alert('Ingresa el nombre de la plataforma.');
      return;
    }

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

  const handleDeletePlatform = (id) => {
    setConfirmModal({
      open: true,
      title: '¿Eliminar plataforma?',
      message: 'Al eliminar la plataforma, también se eliminarán todas sus modalidades y productos asociados.',
      onConfirm: async () => {
        await supabase.from('platforms').delete().eq('id', id);
        setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
        loadData();
      }
    });
  };

  const handleTogglePlatformActive = async (plat) => {
    await supabase.from('platforms').update({ active: !plat.active }).eq('id', plat.id);
    loadData();
  };

  // Guardar configuración general
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
    setSaveSettingsSuccess(true);
    setTimeout(() => setSaveSettingsSuccess(false), 3000);
  };

  // Enlace WhatsApp con mensaje formateado
  const buildWhatsAppLink = (platformName, modality, price) => {
    const cleanNumber = (settings.whatsapp || '51906246375').replace(/[^0-9]/g, '');
    const msg = `Hola I-LUXE STORE 👋\n\nQuiero comprar:\n\n📺 Plataforma: ${platformName}\n👤 Modalidad: ${modality}\n💰 Precio: S/ ${Number(price).toFixed(2)}\n\n¿Me indican cómo realizar el pago?`;
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;
  };

  // Todos los productos planos para conteo en dashboard
  const allProducts = platforms.flatMap((p) => p.products || []);
  const activeProductsCount = allProducts.filter((p) => p.active).length;
  const inactiveProductsCount = allProducts.length - activeProductsCount;

  // ==========================================
  // VISTA 1: PANEL ADMINISTRATIVO (/admin)
  // ==========================================
  if (currentPath.startsWith('/admin')) {
    if (authChecking) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-amber-400">
          <p className="text-sm tracking-widest uppercase animate-pulse">Verificando sesión segura...</p>
        </div>
      );
    }

    // Pantalla de LOGIN si no hay usuario autenticado
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
                className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-neutral-800 text-black font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
              >
                {loginLoading ? 'Verificando...' : 'INICIAR SESIÓN'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-[11px] text-neutral-500 hover:text-white transition"
              >
                ← Volver a la tienda
              </button>
            </div>
          </div>
        </div>
      );
    }

    // DASHBOARD ADMINISTRATIVO
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 flex flex-col md:flex-row">
        {/* Barra Lateral */}
        <aside className="w-full md:w-64 bg-[#121212] border-b md:border-b-0 md:border-r border-neutral-800 p-5 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-neutral-800 mb-4">
              <h2 className="text-base font-black text-white tracking-wider">I-LUXE STORE</h2>
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">PANEL PRIVADO</p>
              <p className="text-[11px] text-neutral-500 truncate mt-1">{user.email}</p>
            </div>

            <nav className="space-y-1">
              {[
                { id: 'dashboard', label: '📊 Dashboard' },
                { id: 'products', label: '📦 Productos' },
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
              🌐 Ver Tienda Pública
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/20 rounded-lg transition"
            >
              🚪 Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Contenido del Panel */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-5xl">
          {/* TAB 1: DASHBOARD */}
          {adminTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white">PANEL DE ADMINISTRACIÓN</h1>
                <p className="text-xs text-neutral-400 mt-1">Métricas y resumen general de tu tienda en Supabase.</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#121212] border border-neutral-800 p-5 rounded-2xl">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase">Total plataformas</span>
                  <p className="text-3xl font-black text-white mt-1">{platforms.length}</p>
                </div>
                <div className="bg-[#121212] border border-neutral-800 p-5 rounded-2xl">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase">Total productos</span>
                  <p className="text-3xl font-black text-white mt-1">{allProducts.length}</p>
                </div>
                <div className="bg-[#121212] border border-neutral-800 p-5 rounded-2xl">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase">Productos activos</span>
                  <p className="text-3xl font-black text-emerald-400 mt-1">{activeProductsCount}</p>
                </div>
                <div className="bg-[#121212] border border-neutral-800 p-5 rounded-2xl">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase">Productos inactivos</span>
                  <p className="text-3xl font-black text-neutral-500 mt-1">{inactiveProductsCount}</p>
                </div>
              </div>

              <div className="bg-[#121212] border border-neutral-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold uppercase text-amber-400 mb-2">Accesos rápidos</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setIsEditingProd(false);
                      setProdForm({ id: null, platform_id: '', modality: '', description: 'Acceso según modalidad disponible.', price: '', image_url: '', active: true });
                      setAdminTab('products');
                    }}
                    className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-4 py-2 rounded-xl text-xs"
                  >
                    + Agregar Producto
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingPlat(false);
                      setPlatForm({ id: null, name: '', description: '', image_url: '', active: true });
                      setAdminTab('platforms');
                    }}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold px-4 py-2 rounded-xl text-xs border border-neutral-700"
                  >
                    + Agregar Plataforma
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTOS */}
          {adminTab === 'products' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white">ADMINISTRAR PRODUCTOS</h1>
                <p className="text-xs text-neutral-400 mt-1">Crea, modifica precios, modalidades y activa/desactiva productos.</p>
              </div>

              {/* Formulario Producto */}
              <form onSubmit={handleSaveProduct} className="bg-[#121212] border border-neutral-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {isEditingProd ? 'Editar Producto' : '+ Agregar Producto'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">Plataforma</label>
                    <select
                      required
                      value={prodForm.platform_id}
                      onChange={(e) => setProdForm({ ...prodForm, platform_id: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="">Selecciona plataforma</option>
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
                      value={prodForm.modality}
                      onChange={(e) => setProdForm({ ...prodForm, modality: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">Precio (S/)</label>
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
                    Producto activo (visible para compra)
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-5 py-2 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    {isEditingProd ? 'Guardar Cambios' : 'Guardar Producto'}
                  </button>
                  {isEditingProd && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProd(false);
                        setProdForm({ id: null, platform_id: '', modality: '', description: 'Acceso según modalidad disponible.', price: '', image_url: '', active: true });
                      }}
                      className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2 rounded-xl text-xs"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

              {/* Lista de Productos */}
              <div className="bg-[#121212] border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-neutral-800">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Productos Registrados</h3>
                </div>
                <div className="divide-y divide-neutral-800">
                  {allProducts.length === 0 ? (
                    <p className="p-4 text-xs text-neutral-500 text-center">No hay productos registrados.</p>
                  ) : (
                    allProducts.map((p) => {
                      const plat = platforms.find((pl) => pl.id === p.platform_id);
                      return (
                        <div key={p.id} className="p-4 flex items-center justify-between gap-4">
                          <div>
                            <span className="text-[10px] text-amber-400 font-bold uppercase">{plat?.name || 'Sin plataforma'}</span>
                            <h4 className="text-sm font-bold text-white">{p.modality}</h4>
                            <p className="text-xs font-mono font-bold text-neutral-300">S/ {Number(p.price).toFixed(2)}</p>
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
                            <button
                              onClick={() => handleEditProduct(p)}
                              className="text-xs text-amber-400 hover:underline px-2"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="text-xs text-rose-400 hover:underline px-2"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLATAFORMAS */}
          {adminTab === 'platforms' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white">ADMINISTRAR PLATAFORMAS</h1>
                <p className="text-xs text-neutral-400 mt-1">Crea nuevas plataformas o actualiza sus nombres y logos.</p>
              </div>

              {/* Formulario Plataforma */}
              <form onSubmit={handleSavePlatform} className="bg-[#121212] border border-neutral-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {isEditingPlat ? 'Editar Plataforma' : '+ Agregar Plataforma'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">Nombre de la plataforma</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: MAX, CRUNCHYROLL, PRIME VIDEO"
                      value={platForm.name}
                      onChange={(e) => setPlatForm({ ...platForm, name: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">URL de Logo / Imagen</label>
                    <input
                      type="text"
                      placeholder="https://... (o sube una imagen abajo)"
                      value={platForm.image_url}
                      onChange={(e) => setPlatForm({ ...platForm, image_url: e.target.value })}
                      className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                {/* Subir archivo a Supabase Storage */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">
                    Subir foto desde tu computadora a Supabase Storage:
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImage}
                    onChange={(e) => handleFileUpload(e, (url) => setPlatForm({ ...platForm, image_url: url }))}
                    className="text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer"
                  />
                  {uploadingImage && <span className="text-xs text-amber-400 ml-2">Subiendo imagen...</span>}
                  {platForm.image_url && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={platForm.image_url} alt="Vista previa" className="w-10 h-10 object-contain bg-black border border-neutral-800 rounded p-1" />
                      <span className="text-[10px] text-emerald-400">✓ Imagen cargada</span>
                    </div>
                  )}
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

              {/* Lista de Plataformas */}
              <div className="bg-[#121212] border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-neutral-800">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Plataformas en Base de Datos</h3>
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
                        <div>
                          <h4 className="text-sm font-bold text-white">{p.name}</h4>
                          <span className="text-[10px] text-neutral-400">
                            {p.products?.length || 0} modalidad(es) configuradas
                          </span>
                        </div>
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
                        <button
                          onClick={() => handleEditPlatform(p)}
                          className="text-xs text-amber-400 hover:underline px-2"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeletePlatform(p.id)}
                          className="text-xs text-rose-400 hover:underline px-2"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CONFIGURACIÓN GENERAL */}
          {adminTab === 'settings' && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h1 className="text-2xl font-black text-white">CONFIGURACIÓN GENERAL</h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Modifica el WhatsApp oficial, nombres y redes sociales. Se actualiza en vivo para todos los clientes.
                </p>
              </div>

              {saveSettingsSuccess && (
                <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs p-3 rounded-xl">
                  ✓ Configuración actualizada correctamente en la tienda pública.
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
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1 uppercase">
                    Número de WhatsApp (con código de país 51)
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.whatsapp}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                    placeholder="51906246375"
                    className="w-full bg-black border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">Formato: 51906246375 (sin signos ni espacios).</p>
                </div>

                <div className="pt-3 border-t border-neutral-800 space-y-3">
                  <span className="block text-[11px] font-bold text-amber-400 uppercase">Redes Sociales (Opcionales)</span>

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

        {/* Modal de confirmación */}
        {confirmModal.open && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#121212] border border-neutral-800 rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-base font-bold text-white mb-2">{confirmModal.title}</h3>
              <p className="text-xs text-neutral-400 mb-6">{confirmModal.message}</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmModal({ open: false, title: '', message: '', onConfirm: null })}
                  className="px-4 py-2 text-xs font-semibold text-neutral-300 bg-neutral-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VISTA 2: PÁGINA PÚBLICA (Para los clientes)
  // ==========================================
  const activePlatforms = platforms.filter((p) => p.active);
  const cleanWhatsapp = (settings.whatsapp || '51906246375').replace(/[^0-9]/g, '');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 font-sans selection:bg-amber-400 selection:text-black">
      {/* 1. ENCABEZADO */}
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
              href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent('Hola I-LUXE STORE 👋 Quisiera realizar una consulta sobre el catálogo de streaming.')}`}
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
              href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent('Hola I-LUXE STORE 👋 Deseo más información para adquirir un servicio de streaming.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-black font-black px-6 py-3.5 rounded-xl text-xs tracking-wider uppercase transition shadow-lg shadow-amber-400/10 active:scale-95"
            >
              COMPRAR POR WHATSAPP
            </a>
          </div>
        </div>
      </section>

      {/* 3. CATÁLOGO */}
      <section id="catalogo" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <span className="text-[11px] font-bold tracking-[0.2em] text-amber-400 uppercase">
            Precios en soles · Compra rápida
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
            CATÁLOGO
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
                    {/* Cabecera Plataforma */}
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
                        <span className="text-[10px] tracking-widest text-amber-400 font-bold uppercase">Plataforma</span>
                        <h3 className="text-2xl font-black text-white tracking-wide uppercase leading-none mt-1">
                          {platform.name}
                        </h3>
                      </div>
                    </div>

                    {/* Modalidades / Productos */}
                    <div className="mt-5 space-y-4">
                      {activeProds.length > 0 ? (
                        activeProds.map((prod) => (
                          <div
                            key={prod.id}
                            className="bg-[#181818] border border-neutral-800 rounded-xl p-4 transition"
                          >
                            <div className="flex justify-between items-baseline mb-1">
                              <h4 className="font-bold text-sm text-neutral-100 uppercase tracking-wide">
                                {prod.modality}
                              </h4>
                              <span className="text-xl font-black text-amber-400 font-mono">
                                S/ {Number(prod.price).toFixed(2)}
                              </span>
                            </div>

                            <p className="text-xs text-neutral-400 mb-3">
                              {prod.description || 'Acceso según modalidad disponible.'}
                            </p>

                            <a
                              href={buildWhatsAppLink(platform.name, prod.modality, prod.price)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-950/40"
                            >
                              <span>COMPRAR</span>
                            </a>
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
                      ✓ Entrega inmediata y soporte continuo
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

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

      {/* 5. REDES SOCIALES */}
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

      {/* 6. MEDIOS DE PAGO */}
      <section className="py-12 px-4 max-w-xl mx-auto text-center">
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
            Número de contacto: <span className="text-white font-mono font-bold">906 246 375</span>
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
