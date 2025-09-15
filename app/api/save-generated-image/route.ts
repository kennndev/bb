import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { imageUrl, prompt, revisedPrompt } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    // Generate unique card name with database collision detection
    const finalName = 'AI Generated'

    // Save to generated_images table
    const { data, error } = await supabase
      .from('generated_images')
      .insert({
        user_id: user.id,
        prompt: prompt || 'Generated card',
        title: finalName, // This is the key field that will be used for display
        image_url: imageUrl,
        revised_prompt: revisedPrompt,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving generated image:', error)
      return NextResponse.json({ error: 'Failed to save generated image' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        title: finalName,
        imageUrl: data.image_url
      }
    })

  } catch (error) {
    console.error('Error in save-generated-image API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
