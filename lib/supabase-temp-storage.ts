"use client"

import { getSupabaseBrowserClient } from "./supabase-browser"

interface UploadReferenceResult {
  storagePath: string
  publicUrl: string
}

/**
 * Upload a reference image to temporary storage for AI generation
 * These images are meant to be deleted after generation completes
 */
export async function uploadTempReferenceImage(
  file: File,
  deviceId: string
): Promise<UploadReferenceResult> {
  const supabase = getSupabaseBrowserClient()
  
  // Get user session if exists (optional for temp uploads)
  const { data: { user } } = await supabase.auth.getUser()
  
  // Create a unique path using user ID or device ID
  const identifier = user?.id || deviceId
  const timestamp = Date.now()
  const randomId = crypto.randomUUID().slice(0, 8)
  
  // Get file extension
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${timestamp}-${randomId}.${extension}`
  const storagePath = `${identifier}/${fileName}`
  
  console.log("📤 Uploading temp reference image:", { storagePath, size: file.size })
  
  // Upload to temp-references bucket
  const { data, error: uploadError } = await supabase.storage
    .from("temp-references")
    .upload(storagePath, file, {
      cacheControl: "300", // 5 minute cache
      upsert: false,
      contentType: file.type || 'image/jpeg',
    })
  
  if (uploadError) {
    console.error("Failed to upload reference image:", uploadError)
    throw new Error(`Upload failed: ${uploadError.message}`)
  }
  
  // Generate a signed URL for the uploaded file (since bucket is private)
  const { data: signedData, error: signedError } = await supabase.storage
    .from("temp-references")
    .createSignedUrl(storagePath, 600) // 10 minute expiry
  
  if (signedError || !signedData?.signedUrl) {
    console.error("Failed to create signed URL:", signedError)
    // Fall back to public URL (though it won't work for private bucket)
    const { data: { publicUrl } } = supabase.storage
      .from("temp-references")
      .getPublicUrl(storagePath)
    return { storagePath, publicUrl }
  }
  
  const publicUrl = signedData.signedUrl
  
  return {
    storagePath,
    publicUrl
  }
}

/**
 * Delete a temporary reference image from storage
 */
export async function deleteTempReferenceImage(storagePath: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  
  try {
    const { error } = await supabase.storage
      .from("temp-references")
      .remove([storagePath])
    
    if (error) {
      console.warn("Failed to delete temp reference image:", error)
      // Don't throw - cleanup failures shouldn't break the flow
    } else {
      console.log("🗑️ Deleted temp reference image:", storagePath)
    }
  } catch (e) {
    console.warn("Error during temp image cleanup:", e)
  }
}

/**
 * Get a signed URL for a temporary reference image
 * This is useful if the bucket is private and we need a temporary access URL
 */
export async function getTempReferenceSignedUrl(
  storagePath: string,
  expiresIn = 300 // 5 minutes default
): Promise<string> {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await supabase.storage
    .from("temp-references")
    .createSignedUrl(storagePath, expiresIn)
  
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to get signed URL: ${error?.message || 'Unknown error'}`)
  }
  
  return data.signedUrl
}