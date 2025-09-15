// Scheduled Edge Function to clean up orphaned temp reference images
// Run this daily to delete files older than 24 hours

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
  try {
    // List all files in the temp-references bucket
    const { data: files, error: listError } = await supabase.storage
      .from('temp-references')
      .list('', {
        limit: 1000,
        offset: 0
      })

    if (listError) {
      console.error('Error listing files:', listError)
      return new Response(
        JSON.stringify({ error: 'Failed to list files', details: listError }),
        { status: 500 }
      )
    }

    if (!files || files.length === 0) {
      console.log('No files to clean up')
      return new Response(
        JSON.stringify({ message: 'No files to clean up', count: 0 }),
        { status: 200 }
      )
    }

    // Calculate cutoff time (24 hours ago)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    // Filter files older than 24 hours
    const filesToDelete: string[] = []
    
    for (const file of files) {
      // Skip directories
      if (file.id === null) continue
      
      const fileDate = new Date(file.created_at || file.updated_at)
      if (fileDate < cutoffTime) {
        filesToDelete.push(file.name)
      }
    }

    if (filesToDelete.length === 0) {
      console.log('No old files to delete')
      return new Response(
        JSON.stringify({ message: 'No old files to delete', count: 0 }),
        { status: 200 }
      )
    }

    // Delete old files in batches of 100
    const batchSize = 100
    let deletedCount = 0
    
    for (let i = 0; i < filesToDelete.length; i += batchSize) {
      const batch = filesToDelete.slice(i, i + batchSize)
      
      const { error: deleteError } = await supabase.storage
        .from('temp-references')
        .remove(batch)

      if (deleteError) {
        console.error(`Error deleting batch ${i / batchSize + 1}:`, deleteError)
      } else {
        deletedCount += batch.length
        console.log(`Deleted batch ${i / batchSize + 1}: ${batch.length} files`)
      }
    }

    console.log(`Cleanup complete: deleted ${deletedCount} files`)
    
    return new Response(
      JSON.stringify({ 
        message: 'Cleanup complete',
        deletedCount,
        totalChecked: files.length
      }),
      { status: 200 }
    )

  } catch (error) {
    console.error('Unexpected error during cleanup:', error)
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: String(error) }),
      { status: 500 }
    )
  }
})