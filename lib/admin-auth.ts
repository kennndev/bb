import { getSupabaseBrowserClient } from './supabase-browser'

// Simple admin check: if user_id is in admins table, show dashboard
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    console.log('🔐 Starting admin check for user:', userId)
    
    const supabase = getSupabaseBrowserClient()
    
    // Check if user_id exists in admins table
    console.log('🔐 Querying admins table for user_id:', userId)
    const { data: admin, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .single()

    console.log('🔐 Admin query result:', { admin, error, userId })

    const isAuthorized = !error && !!admin
    
    console.log('🔐 Admin check result:', { 
      userId, 
      isAuthorized 
    })
    
    return isAuthorized
  } catch (error) {
    console.error('💥 Admin check error:', error)
    return false
  }
}

export async function isEmailAuthorized(email: string): Promise<boolean> {
  try {
    const supabase = getSupabaseBrowserClient()
    
    // Simple check: if email is in admins table, they're authorized
    const { data: admin, error } = await supabase
      .from('admins')
      .select('email')
      .eq('email', email)
      .single()
    
    return !error && !!admin
  } catch (error) {
    console.error('💥 Email authorization check failed:', error)
    return false
  }
}

export async function getAuthorizedEmails(): Promise<string[]> {
  try {
    const supabase = getSupabaseBrowserClient()
    
    const { data: admins, error } = await supabase
      .from('admins')
      .select('email')
    
    if (error || !admins) return []
    
    return admins.map((a: any) => a.email as string).filter(Boolean)
  } catch (error) {
    console.error('💥 Failed to get authorized emails:', error)
    return []
  }
}
