// lib/supabase-server-pages.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextApiRequest, NextApiResponse } from 'next';

function serialize(name: string, value: string, opts: CookieOptions = {}) {
  const parts = [`${name}=${value}`, `Path=${opts.path ?? '/'}`];
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (opts.secure) parts.push('Secure');
  if (opts.httpOnly ?? true) parts.push('HttpOnly');
  return parts.join('; ');
}

export function getSupabaseServerFromPages(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies?.[name];
        },
        set(name, value, options) {
          const next = serialize(name, value, options);
          const existing = res.getHeader('Set-Cookie');
          if (!existing) res.setHeader('Set-Cookie', next);
          else res.setHeader('Set-Cookie', Array.isArray(existing) ? [...existing, next] : [existing as string, next]);
        },
        remove(name, options) {
          const expired = { ...options, maxAge: 0, expires: new Date(0) };
          const next = serialize(name, '', expired);
          const existing = res.getHeader('Set-Cookie');
          if (!existing) res.setHeader('Set-Cookie', next);
          else res.setHeader('Set-Cookie', Array.isArray(existing) ? [...existing, next] : [existing as string, next]);
        },
      },
    }
  );
}
