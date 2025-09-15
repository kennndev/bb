// /app/api/assets/rename/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST(req: NextRequest) {
  const { id, title } = await req.json()
  const supabase = createRouteHandlerClient({ cookies: () => req.cookies })
  const { error } = await supabase
    .from('user_assets')
    .update({ title })
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}