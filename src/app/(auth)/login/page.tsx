'use client'

import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form     = e.currentTarget
    const email    = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError('E-posta veya şifre hatalı.')
      setLoading(false)
      return
    }

    router.push('/panel')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-rose-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">
          Giriş Yap
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Randevu sisteminize hoş geldiniz.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* E-posta */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              E-posta
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="ornek@mail.com"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition"
            />
          </div>

          {/* Şifre */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Şifre
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition"
            />
          </div>

          {/* Hata mesajı */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Giriş butonu */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-400 hover:bg-rose-500 disabled:bg-rose-200 text-white font-medium py-2 rounded-lg text-sm transition"
          >
            {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Hesabınız yok mu?{' '}
          <Link
            href="/register"
            className="text-rose-500 hover:text-rose-600 font-medium"
          >
            Kayıt olun
          </Link>
        </p>
      </div>
    </main>
  )
}
