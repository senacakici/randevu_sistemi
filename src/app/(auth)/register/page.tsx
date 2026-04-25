'use client'

import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// İşletme sektörleri
const SEKTORLER = [
  { value: 'dis_hekimi',     label: 'Diş Hekimi' },
  { value: 'guzellik_salonu', label: 'Güzellik Salonu' },
  { value: 'avukat',         label: 'Avukat' },
  { value: 'veteriner',      label: 'Veteriner' },
  { value: 'spor_salonu',    label: 'Spor Salonu' },
  { value: 'emlakci',        label: 'Emlakçı' },
  { value: 'muhasebeci',     label: 'Muhasebeci' },
  { value: 'fizyoterapist',  label: 'Fizyoterapist' },
  { value: 'restoran',       label: 'Restoran' },
  { value: 'oto_servis',     label: 'Oto Servis' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.SubmitEvent & { currentTarget: HTMLFormElement }) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const getValue = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement).value.trim()

    const ad      = getValue('ad')
    const email   = getValue('email')
    const sifre   = getValue('sifre')
    const isletme = getValue('isletme')
    const sektor  = getValue('sektor')

    if (sifre.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.')
      setLoading(false)
      return
    }

    const supabase = createClient()

    // Supabase Auth ile kullanıcı oluştur
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password: sifre,
      options: {
        // Kullanıcı metadata olarak isim, işletme adı ve sektörü kaydet
        data: { full_name: ad, business_name: isletme, sector: sektor },
      },
    })

    if (signUpError) {
      setError(
        signUpError.message.includes('already registered')
          ? 'Bu e-posta adresi zaten kayıtlı.'
          : 'Kayıt sırasında hata oluştu. Lütfen tekrar deneyin.'
      )
      setLoading(false)
      return
    }

    // Kullanıcı oluşturulduysa işletmeyi de kaydet
    if (data.user) {
      // Slug: işletme adını URL-güvenli formata çevir
      const slug = isletme
        .toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      await supabase.from('businesses').insert({
        user_id:     data.user.id,
        name:        isletme,
        slug:        `${slug}-${data.user.id.slice(0, 6)}`,
        description: sektor,
        is_active:   false, // E-posta doğrulaması sonrası aktif olur
      })
    }

    router.push('/panel')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-violet-50 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">
          Hesap Oluştur
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          İşletmeniz için ücretsiz başlayın.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ad Soyad */}
          <div>
            <label htmlFor="ad" className="block text-sm font-medium text-gray-700 mb-1">
              Ad Soyad
            </label>
            <input
              id="ad"
              name="ad"
              type="text"
              autoComplete="name"
              required
              placeholder="Ahmet Yılmaz"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition"
            />
          </div>

          {/* E-posta */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-posta
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="ornek@mail.com"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition"
            />
          </div>

          {/* Şifre */}
          <div>
            <label htmlFor="sifre" className="block text-sm font-medium text-gray-700 mb-1">
              Şifre
            </label>
            <input
              id="sifre"
              name="sifre"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="En az 8 karakter"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition"
            />
          </div>

          {/* İşletme Adı */}
          <div>
            <label htmlFor="isletme" className="block text-sm font-medium text-gray-700 mb-1">
              İşletme Adı
            </label>
            <input
              id="isletme"
              name="isletme"
              type="text"
              required
              placeholder="Güzellik Salonu Ayşe"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition"
            />
          </div>

          {/* Sektör */}
          <div>
            <label htmlFor="sektor" className="block text-sm font-medium text-gray-700 mb-1">
              Sektör
            </label>
            <select
              id="sektor"
              name="sektor"
              required
              defaultValue=""
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition bg-white"
            >
              <option value="" disabled>
                Sektör seçin…
              </option>
              {SEKTORLER.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Hata mesajı */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Kayıt butonu */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-400 hover:bg-violet-500 disabled:bg-violet-200 text-white font-medium py-2 rounded-lg text-sm transition"
          >
            {loading ? 'Hesap oluşturuluyor…' : 'Kayıt Ol'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Zaten hesabınız var mı?{' '}
          <Link
            href="/login"
            className="text-violet-500 hover:text-violet-600 font-medium"
          >
            Giriş yapın
          </Link>
        </p>
      </div>
    </main>
  )
}
