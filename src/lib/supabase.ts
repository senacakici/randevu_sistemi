import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Ortam değişkenleri
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Tarayıcı tarafı istemci — Client Component'lerde kullanılır
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Sunucu tarafı istemci — Server Component ve Server Action'larda kullanılır
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Component içinden çağrıldığında set işlemi mümkün olmayabilir
        }
      },
    },
  })
}
