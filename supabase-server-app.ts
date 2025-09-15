// lib/supabase-server-app.ts
import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function getSupabaseServerApp() {
  const jar = await cookies(); // Next 15: async cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => jar.get(name)?.value,
        set: (name, value, options) => jar.set({ name, value, ...options }),
        remove: (name, options) =>
          jar.set({ name, value: '', expires: new Date(0), ...options }),
      },
    }
  );
}
