import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const { detectionId, action, notes } = await request.json()
    
    // Validate required fields
    if (!detectionId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: detectionId and action' },
        { status: 400 }
      )
    }
    
    // Validate action
    if (!['approved', 'rejected'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approved" or "rejected"' },
        { status: 400 }
      )
    }
    
    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Check if user is admin using admins table
    const { data: adminProfile } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single()
    
    // Only allow admins to review duplicates
    if (!adminProfile) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    console.log(`🔄 Attempting to update duplicate detection ${detectionId} to status: ${action}`)
    
    // Update the duplicate detection status
    const { data: updateData, error: updateError } = await supabase
      .from('duplicate_detections')
      .update({
        status: action,
        admin_notes: notes || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', detectionId)
      .select()
    
    if (updateError) {
      console.error('❌ Error updating duplicate detection:', updateError)
      console.error('❌ Error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      })
      return NextResponse.json(
        { error: 'Failed to update duplicate detection' },
        { status: 500 }
      )
    }
    
    if (!updateData || updateData.length === 0) {
      console.error('❌ No data returned after update')
      return NextResponse.json(
        { error: 'Duplicate detection not found' },
        { status: 404 }
      )
    }
    
    console.log(`✅ Duplicate detection ${detectionId} ${action} successfully by user ${user.id}`)
    console.log(`✅ Updated data:`, updateData[0])
    
    return NextResponse.json({
      success: true,
      message: `Duplicate detection ${action} successfully`,
      data: updateData[0]
    })
    
  } catch (error) {
    console.error('Error in duplicate review API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin duplicate review GET called')
    
    // Get Supabase client
    const supabase = createRouteHandlerClient({ cookies })

    console.log('✅ Supabase client created')

    // First, let's check if there are any duplicate detections at all
    const { data: allDetections, error: allError } = await supabase
      .from('duplicate_detections')
      .select('id, status, created_at')
      .order('created_at', { ascending: false })

    console.log('🔍 All duplicate detections (any status):', { 
      allCount: allDetections?.length || 0, 
      allError: allError?.message || 'none',
      allDetections: allDetections?.map(d => ({ id: d.id, status: d.status, created: d.created_at }))
    })

    // Get all pending duplicate detections
    const { data: detections, error } = await supabase
      .from('duplicate_detections')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching duplicate detections:', error)
      return NextResponse.json({ error: 'Failed to fetch detections' }, { status: 500 })
    }

    console.log(`📊 Found ${detections?.length || 0} pending duplicate detections`)
    if (detections && detections.length > 0) {
      console.log('🔍 First detection details:', {
        id: detections[0].id,
        asset_id: detections[0].asset_id,
        matched_asset_id: detections[0].matched_asset_id,
        user_id: detections[0].user_id
      })
    }

    // Now fetch the actual image data separately
    if (detections && detections.length > 0) {
      // Get the user_assets IDs from duplicate_detections
      const userAssetIds = detections.map(d => [d.asset_id, d.matched_asset_id]).flat()
      console.log('🔍 User asset IDs to fetch:', userAssetIds)
      console.log('🔍 User asset IDs type:', typeof userAssetIds, 'length:', userAssetIds.length)
      console.log('🔍 User asset IDs content:', JSON.stringify(userAssetIds))
      
      // Let's also try a direct query to see what's in user_assets
      console.log('🔍 Testing direct user_assets query...')
      const { data: testUserAssets, error: testError } = await supabase
        .from('user_assets')
        .select('id, asset_type')
        .limit(5)
      
      console.log('🔍 Test user_assets query result:', { 
        count: testUserAssets?.length || 0, 
        error: testError?.message || 'none',
        sample: testUserAssets?.slice(0, 2)
      })
      
      // Fetch the user_assets records first - use a more specific query
      const { data: userAssets, error: userAssetsError } = await supabase
        .from('user_assets')
        .select('id, source_id, asset_type, user_id')
        .in('id', userAssetIds)

      if (userAssetsError) {
        console.error('❌ Error fetching user assets:', userAssetsError)
        return NextResponse.json({ error: 'Failed to fetch user assets' }, { status: 500 })
      }

      console.log('📊 User assets found:', userAssets?.length || 0)
      if (userAssets && userAssets.length > 0) {
        console.log('🔍 First user asset details:', {
          id: userAssets[0].id,
          source_id: userAssets[0].source_id,
          asset_type: userAssets[0].asset_type,
          user_id: userAssets[0].user_id
        })
      } else {
        console.log('⚠️ No user assets found - this is the problem!')
        console.log('🔍 We were looking for IDs:', userAssetIds)
        console.log('🔍 But found none in user_assets table')
      }

      // Extract the uploaded_images source_ids from user_assets
      const uploadedImageIds = userAssets
        ?.filter(ua => ua.asset_type === 'uploaded')
        ?.map(ua => ua.source_id)
        ?.filter(id => id !== null) || []

      console.log('🔍 Uploaded image IDs to fetch:', uploadedImageIds)

      if (uploadedImageIds.length === 0) {
        console.log('⚠️ No uploaded image IDs found in user assets')
        console.log('🔍 User assets that were found:', userAssets?.map(ua => ({
          id: ua.id,
          asset_type: ua.asset_type,
          source_id: ua.source_id
        })))
        return NextResponse.json({ detections: [] })
      }

      // Fetch the uploaded images using the source_ids
      const { data: uploadedImages, error: uploadedImagesError } = await supabase
        .from('uploaded_images')
        .select('id, original_filename, image_url, user_id, storage_path')
        .in('id', uploadedImageIds)

      if (uploadedImagesError) {
        console.error('❌ Error fetching uploaded images:', uploadedImagesError)
        return NextResponse.json({ error: 'Failed to fetch uploaded images' }, { status: 500 })
      }

      console.log('📊 Uploaded images found:', uploadedImages?.length || 0)

      // Create lookup maps
      const userAssetsMap = new Map(userAssets?.map(ua => [ua.id, ua]) || [])
      const uploadedImagesMap = new Map(uploadedImages?.map(ui => [ui.id, ui]) || [])

      // Get unique user IDs
      const userIds = new Set<string>()
      userAssets?.forEach(asset => {
        if (asset.user_id) userIds.add(asset.user_id)
      })

      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, email, avatar_url')
        .in('id', Array.from(userIds))

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError)
        return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 })
      }

      // Create a profiles lookup map
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])

      // Enrich the detections with asset and profile data
      const enrichedDetections = detections.map(detection => {
        const userAsset = userAssetsMap.get(detection.asset_id)
        const matchedUserAsset = userAssetsMap.get(detection.matched_asset_id)
        
        // Get the uploaded images using source_id from user_assets
        const asset = userAsset ? uploadedImagesMap.get(userAsset.source_id) : null
        const matchedAsset = matchedUserAsset ? uploadedImagesMap.get(matchedUserAsset.source_id) : null
        
        console.log('🔍 Enriching detection:', {
          detectionId: detection.id,
          userAssetId: detection.asset_id,
          matchedUserAssetId: detection.matched_asset_id,
          assetSourceId: userAsset?.source_id,
          matchedAssetSourceId: matchedUserAsset?.source_id,
          assetFound: !!asset,
          matchedAssetFound: !!matchedAsset
        })
        
        return {
          ...detection,
          asset: asset ? {
            id: asset.id,
            title: asset.original_filename || 'Untitled',
            image_url: asset.image_url,
            user_id: asset.user_id,
            asset_type: userAsset?.asset_type || 'uploaded', // Add missing asset_type
            storage_path: asset.storage_path,
            profile: profilesMap.get(asset.user_id)
          } : null,
          matched_asset: matchedAsset ? {
            id: matchedAsset.id,
            title: matchedAsset.original_filename || 'Untitled',
            image_url: matchedAsset.image_url,
            user_id: matchedAsset.user_id,
            asset_type: matchedUserAsset?.asset_type || 'uploaded', // Add missing asset_type
            storage_path: matchedAsset.storage_path,
            profile: profilesMap.get(matchedAsset.user_id)
          } : null
        }
      })

      console.log('✅ Successfully fetched and enriched detections')
      return NextResponse.json({ detections: enrichedDetections })
    }

    console.log('✅ Successfully fetched detections (no assets to enrich)')
    return NextResponse.json({ detections })

  } catch (error) {
    console.error('💥 Fetch detections error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
