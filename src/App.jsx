-- 1. EXTENSIÓN Y LIMPIEZA TOTAL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.platforms CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;

-- 2. TABLA DE CONFIGURACIÓN
CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1,
  business_name TEXT NOT NULL DEFAULT 'I-LUXE STORE',
  subtitle TEXT NOT NULL DEFAULT 'STREAMING PERÚ',
  whatsapp TEXT NOT NULL DEFAULT '51906246375',
  facebook TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  tiktok TEXT DEFAULT '',
  telegram TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.settings (id, business_name, subtitle, whatsapp)
VALUES (1, 'I-LUXE STORE', 'STREAMING PERÚ', '51906246375');

-- 3. TABLA DE PLATAFORMAS
CREATE TABLE public.platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABLA DE PRODUCTOS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  platform_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  description TEXT DEFAULT 'Acceso garantizado y soporte activo.',
  profiles_count INT DEFAULT 1,
  devices_count INT DEFAULT 1,
  price NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PEN',
  image_url TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABLA DE CLIENTES
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Activo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABLA DE PEDIDOS
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_contact TEXT NOT NULL,
  platform_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'Pendiente',
  service_status TEXT NOT NULL DEFAULT 'Activo',
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expiration_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '30 days'),
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Admin settings" ON public.settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Lectura platforms" ON public.platforms FOR SELECT USING (active = true);
CREATE POLICY "Admin platforms" ON public.platforms FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Lectura products" ON public.products FOR SELECT USING (active = true);
CREATE POLICY "Admin products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Publico pedidos" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin pedidos" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Publico clientes" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin clientes" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. CARGA COMPLETA DE LOS 15 SERVICIOS CON PRECIOS OFICIALES
DO $$
DECLARE
  v_netflix UUID;
  v_disney UUID;
  v_prime UUID;
  v_max UUID;
  v_paramount UUID;
  v_crunchy UUID;
  v_viki UUID;
  v_vix UUID;
  v_dgo UUID;
  v_movistar UUID;
  v_spotify UUID;
  v_youtube UUID;
  v_kocowa UUID;
  v_universal UUID;
  v_apple UUID;
BEGIN
  -- 1. NETFLIX PREMIUM
  INSERT INTO public.platforms (name, description, image_url, order_index)
  VALUES ('NETFLIX PREMIUM', 'Series y producciones exclusivas en 4K UHD.', 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', 1)
  RETURNING id INTO v_netflix;
  INSERT INTO public.products (platform_id, platform_name, service_type, description, profiles_count, devices_count, price) VALUES
  (v_netflix, 'NETFLIX PREMIUM', 'Cuenta completa', 'Cuenta completa con acceso a perfiles.', 5, 5, 50.00),
  (v_netflix, 'NETFLIX PREMIUM', 'Perfil personal', 'Perfil personal privado en 1 dispositivo.', 1, 1, 15.00);

  -- 2. DISNEY+
  INSERT INTO public.platforms (name, description, image_url, order_index)
  VALUES ('DISNEY+', 'Disney, Pixar, Marvel, Star Wars y ESPN.', 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', 2)
  RETURNING id INTO v_disney;
  INSERT INTO public.products (platform_id, platform_name, service_type, description, profiles_count, devices_count, price) VALUES
  (v_disney, 'DISNEY+', 'Cuenta completa', 'Cuenta completa con deportes y estrenos.', 6, 4, 30.00),
  (v_disney, 'DISNEY+', 'Perfil personal', 'Perfil personal para 1 dispositivo.', 1, 1, 14.00);

  -- 3. AMAZON PRIME
  INSERT INTO public.platforms (name, description, image_url, order_index)
  VALUES ('AMAZON PRIME', 'Series Amazon Originals y películas.', 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png', 3)
  RETURNING id INTO v_prime;
  INSERT INTO public.products (platform_id, platform_name, service_type, description, profiles_count, devices_count, price) VALUES
  (v_prime, 'AMAZON PRIME', 'Cuenta completa', 'Acceso a cuenta completa Prime.', 5, 3, 20.00),
  (v_prime, 'AMAZON PRIME', 'Perfil personal', 'Perfil personal para 1 dispositivo.', 1, 1, 12.00);

  -- 4. HBO MAX
  INSERT INTO public.platforms (name, description, image_url, order_index)
  VALUES ('HBO MAX', 'Warner Bros, DC, HBO y producciones Max.', 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Max_logo.svg', 4)
  RETURNING id INTO v_max;
  INSERT INTO public.products (platform_id, platform_name, service_type, description, profiles_count, devices_count, price) VALUES
  (v_max, 'HBO MAX', 'Cuenta completa', 'Cuenta completa catálogo Platino.', 5, 4, 20.00),
  (v_max, 'HBO MAX', 'Perfil personal', 'Perfil privado para 1 pantalla.', 1, 1, 10.00);

  -- 5. PARAMOUNT+
  INSERT INTO public.platforms (name, description, image_url, order_index)
  VALUES ('PARAMOUNT+', 'Paramount Pictures, Showtime y Nickelodeon.', 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount_Plus.svg', 5)
  RETURNING id INTO v_paramount;
  INSERT INTO public.products (platform_id, platform_name, service_type, description, profiles_count, devices_count, price) VALUES
  (v_paramount, 'PARAMOUNT+', 'Cuenta completa', 'Cuenta completa oficial Paramount+.', 5, 3, 20.00),
  (v_paramount, 'PARAMOUNT+', 'Perfil personal', 'Perfil personal para 1 pantalla.', 1, 1, 10.00);

  -- 6. CRUNCHYROLL
  INSERT INTO public.platforms (name, description, image_url, order_index)
  VALUES ('CRUNCHYROLL', 'El catálogo de anime más grande del mundo.', 'https://upload.wikimedia.org/wikipedia/commons/0/08/Crunchyroll_Logo.png', 6)
  RETURNING id INTO v_crunchy;
  INSERT INTO public.products (platform_id, platform_name, service_type, description, profiles_count, devices_count, price) VALUES
  (v_crunchy, 'CRUNCHYROLL', 'Cuenta completa', 'Cuenta Mega Fan sin anuncios.', 4, 4, 15.00),
  (v_crunchy, 'CRUNCHYROLL', 'Perfil personal', 'Acceso personal en 1 pantalla.', 1, 1, 10.00);

  -- 7. VIKI RAKUTEN
  INSERT INTO public.platforms (name, description, image_url, order_index)
  VALUES ('VIKI RAKUTEN', 'Dramas asiáticos y series exclusivas.', 'https://upload.wikimedia.org/wikipedia/commons/2/29/Rakuten_Viki_Logo_2019.svg', 7)
  RETURNING id INTO v_viki;
  INSERT INTO public.products (platform_id, platform_name, service_type, description, profiles_count, devices_count, price) VALUES
  (v_viki, 'VIKI RAKUTEN', 'Cuenta completa', 'Pase Viki Pass Standard.', 4, 2, 20.00),
  (v_viki, 'VIKI RAKUTEN', 'Perfil personal', 'Perfil personal para 1 dispositivo.', 1, 1, 10.00);

  -- 8. VIX PREMIUM
  INSERT INTO public.platforms (name, description, image_url, order_index)
  VALUES ('VIX PREMIUM', 'Telenovelas, cine latino y Liga MX.', 'https://upload.wikimedia.org/wikipedia/commons/7/73/ViX_logo.svg', 8)
  RETURNING id INTO v_vix;
  INSERT INTO public.products (platform_id, platform_name, service_type, description, profiles_count, devices_count, price) VALUES
  (v_vix, 'VIX PREMIUM', 'Cuenta completa', 'Cuenta completa ViX Premium.', 4, 3, 15.00),
  (v_vix, 'VIX PREMIUM', 'Perfil personal', 'Perfil personal para 1 pantalla.', 1, 1, 10.00);

  -- 9. DGO
  INSERT INTO public.platforms (name, description, image_url, order_index)
  VALUES ('DGO', 'Televisión en vivo y deportes DIRECTV.', 'https://upload.wikimedia.org/wikipedia/commons/2/22/DGO_logo.png', 9)
  RETURNING id INTO v_dgo;
  INSERT INTO public.products (platform_id, platform_name, service_type, description, profiles_count, devices_count, price) VALUES
  (v_dgo, 'DGO', 'Servicio DGO', 'Acceso al servicio de TV DGO.', 1, 1, 25.00);

  -- 10. MOVISTAR
  INSERT INTO public.platforms (name, description, image_url, order_index)
  VALUES ('MOVISTAR', 'Canales nacionales y señal en vivo.', 'https://upload.wikimedia.org/wikipedia/commons/8/87/Movistar_2020.svg', 10)
  RETURNING id INTO v_movistar;
  INSERT INTO public.products (platform_id, platform_name, service_type, description, profiles_count, devices_count, price) VALUES
  (v_movistar, 'MOVISTAR', 'Servicio Movistar', 'Acceso al servicio Movistar TV.', 1, 1, 25.00);

  -- 11. SPOTIFY PREMIUM
  INSERT INTO public.platforms (name, description, image_url, order_index)
  VALUES ('SPOTIFY PREMIUM', 'Música ilimitada sin comerciales.', 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg', 11)
  RETURNING id INTO v_spotify;
  INSERT INTO public.products (platform_id, platform_name, service_type, description, profiles_count, devices_count, price) VALUES
  (v_spotify, 'SPOTIFY PREMIUM', 'Perfil o servicio Premium', 'Suscripción individual en alta calidad.', 1, 1, 15.00);

  -- 12. YOUTUBE PREMIUM
  INSERT INTO public.platforms (name, description, image_url, order_index)
  VALUES ('YOUTUBE PREMIUM', 'YouTube sin anuncios y YouTube Music.', 'https://upload.wikimedia.org/wikipedia/commons/d/dd/YouTube_Premium_logo.svg', 12)
  RETURNING id INTO v_youtube;
  INSERT INTO public.products (platform_id, platform_name, service_type, description, profiles_count, devices_count, price) VALUES
  (v_youtube, 'YOUTUBE PREMIUM', 'Perfil o servicio Premium', 'Activación a cuenta sin anuncios.', 1, 1, 15.00);

  -- 13. KOCOWA
  INSERT INTO public.platforms (name, description, image_url, order_index)
  VALUES ('KOCOWA', 'K-dramas y programas de Corea.', 'https://img.icons8.com/color/512/television.png', 13)
  RETURNING id INTO v_kocowa;
  INSERT INTO public.products (platform_id, platform_name, service_type, description, profiles_count, devices_count, price) VALUES
  (v_kocowa, 'KOCOWA', 'Perfil personal', 'Perfil personal para 1 dispositivo.', 1, 1, 15.00);

  -- 14. UNIVERSAL+
  INSERT INTO public.platforms (name, description, image_url, order_index)
  VALUES ('UNIVERSAL+', 'Películas de estreno de Universal Pictures.', 'https://img.icons8.com/color/512/television.png', 14)
  RETURNING id INTO v_universal;
  INSERT INTO public.products (platform_id, platform_name, service_type, description, profiles_count, devices_count, price) VALUES
  (v_universal, 'UNIVERSAL+', 'Perfil personal', 'Perfil personal para 1 pantalla.', 1, 1, 10.00);

  -- 15. APPLE TV+
  INSERT INTO public.platforms (name, description, image_url, order_index)
  VALUES ('APPLE TV+', 'Producciones originales Apple Original.', 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg', 15)
  RETURNING id INTO v_apple;
  INSERT INTO public.products (platform_id, platform_name, service_type, description, profiles_count, devices_count, price) VALUES
  (v_apple, 'APPLE TV+', 'Perfil personal', 'Perfil personal para 1 dispositivo.', 1, 1, 12.00);

END $$;
