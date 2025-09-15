import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, upload_count, upload_package_count')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ success: false, message: 'Profile not found' }, { status: 404 })
    }

    // Determine package cost and size
    let packageCost: number
    let packageSize: number
    
    if (profile.upload_count === 0 && profile.upload_package_count === 0) {
      // First time user: 1 credit for 25 uploads
      packageCost = 1
      packageSize = 25
    } else {
      // Regular user: 100 credits for 10 uploads
      packageCost = 100
      packageSize = 10
    }

    // Check if user has enough credits
    if (profile.credits < packageCost) {
      return NextResponse.json({ 
        success: false, 
        message: `Insufficient credits. Need ${packageCost} credits.` 
      }, { status: 400 })
    }

    // Update user profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        credits: profile.credits - packageCost,
        upload_package_count: profile.upload_package_count + 1
      })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json({ success: false, message: 'Failed to update profile' }, { status: 500 })
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: `Package purchased! ${packageSize} uploads added.`,
      package_id: `${user.id}-${Date.now()}`,
      uploads_remaining: packageSize,
      credits_deducted: packageCost
    })

  } catch (error) {
    console.error('Purchase package error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}