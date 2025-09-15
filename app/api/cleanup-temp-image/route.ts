import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { storagePath } = body
    
    if (!storagePath || typeof storagePath !== 'string') {
      return NextResponse.json(
        { error: 'Invalid storage path' },
        { status: 400 }
      )
    }
    
    // Initialize Supabase client
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Delete the temp reference image
    const { error } = await supabase.storage
      .from('temp-references')
      .remove([storagePath])
    
    if (error) {
      console.warn('Failed to delete temp reference image:', error)
      // Don't return error - cleanup failures shouldn't break the flow
      return NextResponse.json({ 
        success: false, 
        message: 'Cleanup failed but not critical' 
      })
    }
    
    console.log('Successfully cleaned up temp reference image:', storagePath)
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Cleanup API error:', error)
    // Don't fail hard on cleanup errors
    return NextResponse.json({ 
      success: false, 
      error: 'Cleanup error' 
    })
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}