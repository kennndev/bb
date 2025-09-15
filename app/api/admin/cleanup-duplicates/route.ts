import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  console.log('🧹 Cleanup duplicates API called')
  
  try {
    // Get Supabase client with service key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // First, check if current user is admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminProfile, error: adminError } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .single()

    if (adminError || !adminProfile) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('✅ Admin access confirmed, starting cleanup...')

    // Find duplicate detection records with the same matched_asset_id
    const { data: duplicateRecords, error: fetchError } = await supabase
      .from('duplicate_detections')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('❌ Error fetching duplicate records:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch duplicate records' }, { status: 500 })
    }

    console.log(`📊 Found ${duplicateRecords?.length || 0} duplicate detection records`)

    // Group records by matched_asset_id to find duplicates
    const groupedByMatchedAsset = new Map<string, any[]>()
    
    duplicateRecords?.forEach(record => {
      const key = record.matched_asset_id
      if (!groupedByMatchedAsset.has(key)) {
        groupedByMatchedAsset.set(key, [])
      }
      groupedByMatchedAsset.get(key)!.push(record)
    })

    // Find groups with multiple records (potential duplicates)
    const duplicateGroups = Array.from(groupedByMatchedAsset.entries())
      .filter(([_, records]) => records.length > 1)
      .sort(([_, a], [__, b]) => b.length - a.length)

    console.log(`🔍 Found ${duplicateGroups.length} groups with potential duplicate matched_asset_id issues`)

    let cleanedCount = 0
    const cleanupResults = []

    for (const [matchedAssetId, records] of duplicateGroups) {
      console.log(`🧹 Processing group with matched_asset_id: ${matchedAssetId} (${records.length} records)`)
      
      // Keep the first record (most recent) and mark others for deletion
      const [keepRecord, ...duplicateRecords] = records.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      console.log(`  ✅ Keeping record: ${keepRecord.id} (created: ${keepRecord.created_at})`)
      console.log(`  🗑️ Marking ${duplicateRecords.length} records for deletion`)

      // Delete duplicate records
      for (const duplicateRecord of duplicateRecords) {
        const { error: deleteError } = await supabase
          .from('duplicate_detections')
          .delete()
          .eq('id', duplicateRecord.id)

        if (deleteError) {
          console.error(`  ❌ Failed to delete record ${duplicateRecord.id}:`, deleteError)
        } else {
          console.log(`  ✅ Deleted duplicate record: ${duplicateRecord.id}`)
          cleanedCount++
        }
      }

      cleanupResults.push({
        matchedAssetId,
        totalRecords: records.length,
        keptRecord: keepRecord.id,
        deletedRecords: duplicateRecords.length
      })
    }

    console.log(`🎉 Cleanup completed! Deleted ${cleanedCount} duplicate records`)

    return NextResponse.json({
      success: true,
      message: `Cleanup completed successfully`,
      results: {
        totalRecordsProcessed: duplicateRecords?.length || 0,
        duplicateGroupsFound: duplicateGroups.length,
        recordsDeleted: cleanedCount,
        cleanupResults
      }
    })

  } catch (error) {
    console.error('💥 Cleanup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Duplicate cleanup API is working',
    endpoint: 'POST /api/admin/cleanup-duplicates',
    description: 'Clean up duplicate detection records with incorrect matched_asset_id values'
  })
}
