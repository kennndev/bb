import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// LPIPS threshold for duplicate detection
// Based on AlexNet backbone: tight=0.06, balanced=0.08
// Lower score = more similar (0.0 = identical, 1.0 = completely different)
const DUPLICATE_THRESHOLD = 0.08  // Balanced threshold for AlexNet
const DETECTION_API_URL = 'https://mirac107-MH.hf.space/score'

// Test endpoint to manually test LPIPS API
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const imageUrl1 = url.searchParams.get('img1')
  const imageUrl2 = url.searchParams.get('img2')
  
  if (!imageUrl1 || !imageUrl2) {
    return NextResponse.json({ 
      error: 'Missing img1 or img2 parameters',
      usage: 'GET /api/check-duplicate?img1=URL1&img2=URL2'
    }, { status: 400 })
  }

  try {
    console.log('🧪 Testing LPIPS API with:', { imageUrl1, imageUrl2 })
    
    // Download both images
    const [image1Response, image2Response] = await Promise.all([
      fetch(imageUrl1),
      fetch(imageUrl2)
    ])

    if (!image1Response.ok || !image2Response.ok) {
      return NextResponse.json({ 
        error: 'Failed to download images',
        image1Status: image1Response.status,
        image2Status: image2Response.status
      }, { status: 400 })
    }

    const [image1Blob, image2Blob] = await Promise.all([
      image1Response.blob(),
      image2Response.blob()
    ])

    // Create form data for the API
    const formData = new FormData()
    formData.append('img1', image1Blob, 'image1.jpg')
    formData.append('img2', image2Blob, 'image2.jpg')

    console.log('🚀 Calling Hugging Face API for test:', DETECTION_API_URL)
    console.log('📊 Image details:', {
      image1Size: image1Blob.size,
      image1Type: image1Blob.type,
      image2Size: image2Blob.size,
      image2Type: image2Blob.type
    })
    
    const response = await fetch(DETECTION_API_URL, {
      method: 'POST',
      body: formData
    })

    if (response.ok) {
      const result = await response.json()
      console.log('📊 Test API response:', result)
      
      return NextResponse.json({
        success: true,
        lpips_score: result.lpips,
        is_duplicate: result.lpips <= DUPLICATE_THRESHOLD,
        threshold: DUPLICATE_THRESHOLD,
        similarity_percentage: Math.round((1 - result.lpips) * 100),
        raw_response: result,
        image1_url: imageUrl1,
        image2_url: imageUrl2
      })
    } else {
      const errorText = await response.text()
      return NextResponse.json({ 
        error: 'LPIPS API error',
        status: response.status,
        details: errorText
      }, { status: response.status })
    }
  } catch (error) {
    console.error('❌ Test error:', error)
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  console.log('🔍 Check duplicate API called')
  
  try {
    const body = await request.json()
    console.log('📝 Request body:', { assetId: body.assetId, imageUrl: body.imageUrl ? 'present' : 'missing' })
    
    const { assetId, imageUrl } = body

    if (!assetId || !imageUrl) {
      console.log('❌ Missing required parameters')
      return NextResponse.json({ error: 'Missing assetId or imageUrl' }, { status: 400 })
    }

    // Get Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Get the uploaded image details
    const { data: asset, error: assetError } = await supabase
      .from('uploaded_images')
      .select('id, user_id, image_url, original_filename')
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      console.log('❌ Uploaded image not found:', assetId, assetError)
      return NextResponse.json({ 
        error: 'Uploaded image not found', 
        assetId,
        details: assetError?.message 
      }, { status: 404 })
    }

    console.log('✅ Uploaded image found:', { id: asset.id, user_id: asset.user_id, filename: asset.original_filename })

    // Get all other uploaded images for comparison (excluding the current one)
    // Allow cross-user duplicate detection for better security
    const { data: otherAssets, error: otherAssetsError } = await supabase
      .from('uploaded_images')
      .select('id, user_id, image_url, original_filename')
      .neq('id', assetId) // Compare against ALL other images, not just same user
      .not('image_url', 'is', null)

    if (otherAssetsError) {
      console.log('❌ Failed to fetch other uploaded images:', otherAssetsError)
      return NextResponse.json({ error: 'Failed to fetch other images for comparison' }, { status: 500 })
    }

    console.log(`🔍 Comparing against ${otherAssets?.length || 0} other uploaded images from user ${asset.user_id}`)
    
    if (otherAssets && otherAssets.length === 0) {
      console.log('ℹ️ No other images from this user to compare against')
      return NextResponse.json({
        isDuplicate: false,
        similarity: 1.0,
        message: 'No other images from this user to compare against',
        debug: {
          threshold: DUPLICATE_THRESHOLD,
          userImagesCount: 0
        }
      })
    }

    // Check for duplicates using the Hugging Face API
    let lowestSimilarity = Infinity // LPIPS: lower = more similar
    let matchedAsset = null
    let allScores: Array<{asset: any, score: number}> = []

    for (const otherAsset of otherAssets || []) {
      try {
        console.log(`🔄 Comparing with: ${otherAsset.original_filename} (${otherAsset.id})`)
        
        // Download both images
        const [image1Response, image2Response] = await Promise.all([
          fetch(imageUrl),
          fetch(otherAsset.image_url)
        ])

        if (image1Response.ok && image2Response.ok) {
          const [image1Blob, image2Blob] = await Promise.all([
            image1Response.blob(),
            image2Response.blob()
          ])

          console.log('🖼️ Image comparison details:')
          console.log('  Current image:', asset.original_filename, 'URL:', imageUrl)
          console.log('  Other image:', otherAsset.original_filename, 'URL:', otherAsset.image_url)
          console.log('  Current image size:', image1Blob.size, 'bytes')
          console.log('  Other image size:', image2Blob.size, 'bytes')
          console.log('  Current image type:', image1Blob.type)
          console.log('  Other image type:', image2Blob.type)

          // Create form data for the API
          const formData = new FormData()
          formData.append('img1', image1Blob, 'image1.jpg')
          formData.append('img2', image2Blob, 'image2.jpg')

          console.log('🚀 Calling Hugging Face API:', DETECTION_API_URL)
          
          const response = await fetch(DETECTION_API_URL, {
            method: 'POST',
            body: formData
          })

          console.log('📡 API Response status:', response.status)
          console.log('📡 API Response headers:', Object.fromEntries(response.headers.entries()))

          if (response.ok) {
            const result = await response.json()
            console.log('📊 Raw API response:', result)
            console.log('📊 API response type:', typeof result)
            console.log('📊 API response keys:', Object.keys(result))
            
            const lpipsScore = result.lpips || 1.0 // Default to high dissimilarity
            console.log(`📊 LPIPS score: ${lpipsScore} (type: ${typeof lpipsScore})`)
            console.log(`📊 Threshold: ${DUPLICATE_THRESHOLD}`)
            console.log(`📊 Is duplicate? ${lpipsScore <= DUPLICATE_THRESHOLD}`)
            console.log(`📊 Score comparison: ${lpipsScore} <= ${DUPLICATE_THRESHOLD} = ${lpipsScore <= DUPLICATE_THRESHOLD}`)
            console.log(`📊 Full result object:`, JSON.stringify(result, null, 2))

            // Store all scores for debugging
            allScores.push({ asset: otherAsset, score: lpipsScore })

            // For LPIPS: lower score = more similar
            if (lpipsScore < lowestSimilarity) {
              lowestSimilarity = lpipsScore
              matchedAsset = otherAsset
              console.log('🎯 New best match found:', { score: lpipsScore, asset: otherAsset.original_filename })
            }
          } else {
            const errorText = await response.text()
            console.log(`⚠️ Hugging Face API error: ${response.status} - ${errorText}`)
          }
        } else {
          console.log(`⚠️ Failed to download images for comparison: ${image1Response.status} vs ${image2Response.status}`)
        }
      } catch (error) {
        console.error('❌ Error checking similarity:', error)
        // Continue with other assets
      }
    }

    // Log all scores for debugging
    console.log('📋 All similarity scores:', allScores.map(s => ({ filename: s.asset.original_filename, score: s.score })))
    console.log(`🎯 Best match similarity: ${lowestSimilarity === Infinity ? 'N/A' : lowestSimilarity}`)
    console.log(`🎯 Threshold: ${DUPLICATE_THRESHOLD}`)
    console.log(`🎯 Would trigger duplicate detection: ${lowestSimilarity <= DUPLICATE_THRESHOLD}`)
    console.log(`🎯 Final decision breakdown:`)
    console.log(`    - Lowest score: ${lowestSimilarity}`)
    console.log(`    - Threshold: ${DUPLICATE_THRESHOLD}`)
    console.log(`    - Score <= Threshold: ${lowestSimilarity <= DUPLICATE_THRESHOLD}`)
    console.log(`    - Has matched asset: ${!!matchedAsset}`)
    console.log(`    - Final result: ${lowestSimilarity <= DUPLICATE_THRESHOLD && matchedAsset ? 'DUPLICATE DETECTED' : 'NO DUPLICATE'}`)

    // If similarity is below threshold (more similar), create duplicate detection record
    if (lowestSimilarity <= DUPLICATE_THRESHOLD && matchedAsset) {
      console.log('🚨 DUPLICATE DETECTED! Creating detection record...')
      console.log('🚨 Details:', {
        currentImage: asset.original_filename,
        matchedImage: matchedAsset.original_filename,
        similarityScore: lowestSimilarity,
        threshold: DUPLICATE_THRESHOLD
      })
      
      // First, we need to get the user_assets IDs for both assets
      const { data: assetUserAsset, error: assetUserAssetError } = await supabase
        .from('user_assets')
        .select('id')
        .eq('asset_type', 'uploaded')
        .eq('source_id', assetId)
        .single()

      const { data: matchedUserAsset, error: matchedUserAssetError } = await supabase
        .from('user_assets')
        .select('id')
        .eq('asset_type', 'uploaded')
        .eq('source_id', matchedAsset.id)
        .single()

      // Check if this duplicate detection already exists to prevent duplicates
      if (assetUserAsset && matchedUserAsset) {
        const { data: existingDetection, error: existingDetectionError } = await supabase
          .from('duplicate_detections')
          .select('id')
          .or(`and(asset_id.eq.${assetUserAsset.id},matched_asset_id.eq.${matchedUserAsset.id}),and(asset_id.eq.${matchedUserAsset.id},matched_asset_id.eq.${assetUserAsset.id})`)
          .single()

        if (existingDetection) {
          console.log('⚠️ Duplicate detection already exists for this image pair:', existingDetection.id)
          return NextResponse.json({
            isDuplicate: true,
            similarity: lowestSimilarity,
            matchedAsset: {
              id: matchedAsset.id,
              filename: matchedAsset.original_filename,
              user_id: matchedAsset.user_id
            },
            message: 'Duplicate detection already exists for this image pair',
            debug: {
              existingDetectionId: existingDetection.id,
              threshold: DUPLICATE_THRESHOLD,
              similarity: lowestSimilarity
            }
          })
        }
      }

      if (assetUserAssetError || matchedUserAssetError) {
        console.error('❌ Error finding user_assets records:', { assetUserAssetError, matchedUserAssetError })
        return NextResponse.json({ 
          error: 'Failed to link assets to user_assets table',
          details: 'Database schema mismatch'
        }, { status: 500 })
      }

      console.log('✅ Found user_assets records:', { 
        assetUserAssetId: assetUserAsset?.id, 
        matchedUserAssetId: matchedUserAsset?.id 
      })
      
      console.log('🚨 Creating duplicate detection record with data:', {
        asset_id: assetUserAsset.id,
        user_id: asset.user_id,
        similarity_score: lowestSimilarity,
        matched_asset_id: matchedUserAsset.id,
        matched_user_id: matchedAsset.user_id,
        detection_method: 'lpips',
        status: 'pending',
        current_image: asset.original_filename,
        matched_image: matchedAsset.original_filename
      })

      const { data: insertData, error: insertError } = await supabase
        .from('duplicate_detections')
        .insert({
          asset_id: assetUserAsset.id, // Use user_assets ID, not uploaded_images ID
          user_id: asset.user_id,
          similarity_score: lowestSimilarity,
          matched_asset_id: matchedUserAsset.id, // Use user_assets ID, not uploaded_images ID
          matched_user_id: matchedAsset.user_id,
          detection_method: 'lpips',
          status: 'pending'
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('❌ Error inserting duplicate detection:', insertError)
        return NextResponse.json({ 
          error: 'Failed to record duplicate detection',
          details: insertError.message 
        }, { status: 500 })
      }

      console.log('✅ Duplicate detection record created successfully with ID:', insertData?.id)

      return NextResponse.json({
        isDuplicate: true,
        similarity: lowestSimilarity,
        matchedAsset: {
          id: matchedAsset.id,
          filename: matchedAsset.original_filename,
          user_id: matchedAsset.user_id
        },
        message: 'Image appears to be a duplicate and is pending admin review',
        debug: {
          detectionId: insertData?.id,
          threshold: DUPLICATE_THRESHOLD,
          similarity: lowestSimilarity
        }
      })
    }

    console.log('✅ No duplicates detected')

    return NextResponse.json({
      isDuplicate: false,
      similarity: lowestSimilarity === Infinity ? 1.0 : lowestSimilarity,
      message: 'No duplicates detected',
      debug: {
        threshold: DUPLICATE_THRESHOLD,
        bestScore: lowestSimilarity === Infinity ? 'N/A' : lowestSimilarity,
        allScores: allScores.map(s => ({ filename: s.asset.original_filename, score: s.score }))
      }
    })

  } catch (error) {
    console.error('💥 Duplicate detection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

