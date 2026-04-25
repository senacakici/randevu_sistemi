-- ============================================================
-- Randevu Sistemi - Supabase SQL Şeması
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- Tekrar çalıştırılabilmesi için önceki nesneleri temizle
-- (bağımlılık sırasına göre: önce çocuk tablolar)
-- ------------------------------------------------------------
drop table if exists public.appointments cascade;
drop table if exists public.services     cascade;
drop table if exists public.businesses   cascade;
drop table if exists public.plans        cascade;

drop type if exists public.appointment_status;
drop type if exists public.payment_status;

drop function if exists public.update_updated_at() cascade;

-- ============================================================
-- 1. PLANS - Abonelik Planları
-- ============================================================
create table if not exists public.plans (
    id                         uuid        primary key default uuid_generate_v4(),
    -- Plan adı (Ücretsiz, Temel, Pro)
    name                       text        not null,
    -- Aylık fiyat (TL)
    price                      numeric(10,2) not null default 0,
    -- Aylık maksimum randevu sayısı (-1 = sınırsız)
    max_appointments_per_month integer     not null default 50,
    -- Maksimum hizmet sayısı (-1 = sınırsız)
    max_services               integer     not null default 5,
    -- Plan özellikleri listesi
    features                   jsonb       not null default '[]'::jsonb,
    -- Plan satışa açık mı
    is_active                  boolean     not null default true,
    created_at                 timestamptz not null default now()
);

-- ============================================================
-- 2. BUSINESSES - İşletmeler
-- ============================================================
create table if not exists public.businesses (
    id            uuid        primary key default uuid_generate_v4(),
    -- Supabase Auth kullanıcı ID (işletme sahibi)
    user_id       uuid        not null references auth.users(id) on delete cascade,
    -- Abonelik planı
    plan_id       uuid        references public.plans(id) on delete set null,
    -- İşletme adı
    name          text        not null,
    -- Benzersiz URL tanımlayıcısı (örn: berber-ahmet)
    slug          text        not null unique,
    -- İşletme açıklaması
    description   text,
    -- Telefon numarası
    phone         text,
    -- E-posta adresi
    email         text,
    -- Açık adres
    address       text,
    -- Logo görseli URL
    logo_url      text,
    -- Saat dilimi
    timezone      text        not null default 'Europe/Istanbul',
    -- Günlük çalışma saatleri
    working_hours jsonb       not null default '{"monday":{"open":"09:00","close":"18:00","enabled":true},"tuesday":{"open":"09:00","close":"18:00","enabled":true},"wednesday":{"open":"09:00","close":"18:00","enabled":true},"thursday":{"open":"09:00","close":"18:00","enabled":true},"friday":{"open":"09:00","close":"18:00","enabled":true},"saturday":{"open":"10:00","close":"14:00","enabled":false},"sunday":{"open":"10:00","close":"14:00","enabled":false}}'::jsonb,
    -- İşletme aktif / yayında mı
    is_active     boolean     not null default true,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists businesses_user_id_idx on public.businesses(user_id);
create index if not exists businesses_slug_idx    on public.businesses(slug);

-- ============================================================
-- 3. SERVICES - Hizmetler
-- ============================================================
create table if not exists public.services (
    id          uuid          primary key default uuid_generate_v4(),
    -- Bağlı olduğu işletme
    business_id uuid          not null references public.businesses(id) on delete cascade,
    -- Hizmet adı
    name        text          not null,
    -- Hizmet açıklaması
    description text,
    -- Süre (dakika)
    duration    integer       not null default 30,
    -- Fiyat
    price       numeric(10,2) not null default 0,
    -- Para birimi
    currency    text          not null default 'TRY',
    -- Takvimde gösterilecek renk (hex)
    color       text          not null default '#3B82F6',
    -- Hizmet aktif mi
    is_active   boolean       not null default true,
    created_at  timestamptz   not null default now(),
    updated_at  timestamptz   not null default now()
);

create index if not exists services_business_id_idx on public.services(business_id);

-- ============================================================
-- 4. APPOINTMENTS - Randevular
-- ============================================================

-- Randevu durum seçenekleri
create type public.appointment_status as enum (
    'pending',    -- Onay bekliyor
    'confirmed',  -- Onaylandı
    'cancelled',  -- İptal edildi
    'completed',  -- Tamamlandı
    'no_show'     -- Müşteri gelmedi
);

-- Ödeme durum seçenekleri
create type public.payment_status as enum (
    'unpaid',   -- Ödeme yapılmadı
    'paid',     -- Ödeme alındı
    'refunded'  -- İade edildi
);

create table if not exists public.appointments (
    id                       uuid                     primary key default uuid_generate_v4(),
    -- Bağlı olduğu işletme
    business_id              uuid                     not null references public.businesses(id) on delete cascade,
    -- Seçilen hizmet (hizmet silinirse randevu korunsun)
    service_id               uuid                     not null references public.services(id) on delete restrict,
    -- Kayıtlı müşteri ID (misafir randevularda null)
    customer_id              uuid                     references auth.users(id) on delete set null,
    -- Müşteri adı soyadı
    customer_name            text                     not null,
    -- Müşteri e-posta adresi
    customer_email           text                     not null,
    -- Müşteri telefon numarası
    customer_phone           text,
    -- Randevu başlangıç zamanı
    start_time               timestamptz              not null,
    -- Randevu bitiş zamanı
    end_time                 timestamptz              not null,
    -- Randevu durumu
    status                   public.appointment_status not null default 'pending',
    -- Müşteri veya işletmenin ek notu
    notes                    text,
    -- Ödeme durumu
    payment_status           public.payment_status    not null default 'unpaid',
    -- Stripe Payment Intent ID
    stripe_payment_intent_id text,
    created_at               timestamptz              not null default now(),
    updated_at               timestamptz              not null default now(),

    -- Bitiş zamanı başlangıçtan sonra olmalı
    constraint end_after_start check (end_time > start_time)
);

create index if not exists appointments_business_id_idx on public.appointments(business_id);
create index if not exists appointments_customer_id_idx on public.appointments(customer_id);
create index if not exists appointments_start_time_idx  on public.appointments(start_time);
create index if not exists appointments_status_idx      on public.appointments(status);

-- ============================================================
-- UPDATED_AT OTOMATİK GÜNCELLEME
-- ============================================================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace trigger businesses_updated_at
    before update on public.businesses
    for each row execute function public.update_updated_at();

create or replace trigger services_updated_at
    before update on public.services
    for each row execute function public.update_updated_at();

create or replace trigger appointments_updated_at
    before update on public.appointments
    for each row execute function public.update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- PLANS -------------------------------------------------------
alter table public.plans enable row level security;

create policy "Planları herkes görebilir"
    on public.plans for select
    using (is_active = true);

-- BUSINESSES --------------------------------------------------
alter table public.businesses enable row level security;

create policy "Aktif işletmeleri herkes görebilir"
    on public.businesses for select
    using (is_active = true);

create policy "İşletme sahibi kendi işletmesini görebilir"
    on public.businesses for select
    using (auth.uid() = user_id);

create policy "Giriş yapmış kullanıcı işletme oluşturabilir"
    on public.businesses for insert
    with check (auth.uid() = user_id);

create policy "İşletme sahibi güncelleyebilir"
    on public.businesses for update
    using (auth.uid() = user_id);

create policy "İşletme sahibi silebilir"
    on public.businesses for delete
    using (auth.uid() = user_id);

-- SERVICES ----------------------------------------------------
alter table public.services enable row level security;

create policy "Aktif hizmetleri herkes görebilir"
    on public.services for select
    using (
        is_active = true
        and exists (
            select 1 from public.businesses b
            where b.id = services.business_id
              and b.is_active = true
        )
    );

create policy "İşletme sahibi kendi hizmetlerini görebilir"
    on public.services for select
    using (
        exists (
            select 1 from public.businesses b
            where b.id = services.business_id
              and b.user_id = auth.uid()
        )
    );

create policy "İşletme sahibi hizmet ekleyebilir"
    on public.services for insert
    with check (
        exists (
            select 1 from public.businesses b
            where b.id = services.business_id
              and b.user_id = auth.uid()
        )
    );

create policy "İşletme sahibi hizmet güncelleyebilir"
    on public.services for update
    using (
        exists (
            select 1 from public.businesses b
            where b.id = services.business_id
              and b.user_id = auth.uid()
        )
    );

create policy "İşletme sahibi hizmet silebilir"
    on public.services for delete
    using (
        exists (
            select 1 from public.businesses b
            where b.id = services.business_id
              and b.user_id = auth.uid()
        )
    );

-- APPOINTMENTS ------------------------------------------------
alter table public.appointments enable row level security;

create policy "İşletme sahibi randevuları görebilir"
    on public.appointments for select
    using (
        exists (
            select 1 from public.businesses b
            where b.id = appointments.business_id
              and b.user_id = auth.uid()
        )
    );

create policy "Müşteri kendi randevularını görebilir"
    on public.appointments for select
    using (auth.uid() = customer_id);

create policy "Herkes randevu oluşturabilir"
    on public.appointments for insert
    with check (
        exists (
            select 1 from public.businesses b
            where b.id = appointments.business_id
              and b.is_active = true
        )
    );

create policy "İşletme sahibi randevuyu güncelleyebilir"
    on public.appointments for update
    using (
        exists (
            select 1 from public.businesses b
            where b.id = appointments.business_id
              and b.user_id = auth.uid()
        )
    );

create policy "Müşteri kendi randevusunu güncelleyebilir"
    on public.appointments for update
    using (auth.uid() = customer_id);

create policy "İşletme sahibi randevuyu silebilir"
    on public.appointments for delete
    using (
        exists (
            select 1 from public.businesses b
            where b.id = appointments.business_id
              and b.user_id = auth.uid()
        )
    );

-- ============================================================
-- BAŞLANGIÇ VERİLERİ - Abonelik Planları
-- ============================================================
insert into public.plans (name, price, max_appointments_per_month, max_services, features) values
(
    'Ücretsiz', 0, 30, 3,
    '["Aylık 30 randevu", "3 hizmet", "Temel takvim görünümü"]'::jsonb
),
(
    'Temel', 199, 150, 10,
    '["Aylık 150 randevu", "10 hizmet", "E-posta bildirimleri", "SMS bildirimleri", "Özel sayfa tasarımı"]'::jsonb
),
(
    'Pro', 499, -1, -1,
    '["Sınırsız randevu", "Sınırsız hizmet", "E-posta ve SMS bildirimleri", "Stripe ödeme entegrasyonu", "AI asistan", "Öncelikli destek"]'::jsonb
);
