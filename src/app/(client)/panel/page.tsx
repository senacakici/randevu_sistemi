import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function PanelPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Oturum yoksa login'e yönlendir
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('user_id', user.id)
    .single()

  return (
    <main className="min-h-screen bg-sky-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">👋</span>
        </div>

        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          Hoş geldiniz!
        </h1>

        {business?.name && (
          <p className="text-sky-600 font-medium mb-4">{business.name}</p>
        )}

        <p className="text-sm text-gray-500">
          Paneliniz hazırlanıyor. Yakında randevularınızı buradan yönetebileceksiniz.
        </p>
      </div>
    </main>
  )
}
