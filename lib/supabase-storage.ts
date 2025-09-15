"use client";

import { getSupabaseBrowserClient } from "./supabase-browser";
import { checkImageDuplicate, createDuplicateDetection } from "./image-processing";

const mimeToExt: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/gif":  "gif",
};

type UploadOpts = {
  /** Extra metadata merged into uploaded_images.metadata (e.g. { is_ai_generation: true }) */
  metadata?: Record<string, any>;
  /** Whether this is an AI-generated image (affects bucket and table selection) */
  isGenerated?: boolean;
};

export type UploadResult = {
  success: boolean;
  publicUrl?: string;
  storagePath?: string;
  imageRecordId?: string | null;
  error?: string;
  message?: string;
  duplicateCheckResult?: any;
};

/**
 * Upload → Storage (bucket based on type) → insert into appropriate table.
 * The DB trigger mirrors into user_assets, so the client must NOT write user_assets.
 */
export async function uploadToSupabase(
  file: Blob | File,
  customPath?: string,
  opts: UploadOpts = {}
): Promise<UploadResult> {
  const supabase = getSupabaseBrowserClient();

  // ── auth guard ──
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error("not_signed_in");

  const userId = session.user.id;
  const isGenerated = opts.isGenerated || opts.metadata?.is_ai_generation;

  // ── Check for duplicates before uploading (only for user uploads) ──
  let duplicateCheckResult: any = null;
  if (!isGenerated) {
    try {
      console.log('🔍 Starting duplicate check for user:', userId);
      // Check for duplicates BEFORE uploading to storage
      duplicateCheckResult = await checkImageDuplicate(file, userId);
      console.log('🔍 Duplicate check result:', duplicateCheckResult);
      
      if (duplicateCheckResult.action === 'block') {
        // Block the upload completely
        console.log('🚨 BLOCKING UPLOAD - Duplicate detected:', duplicateCheckResult.message);
        // Return error object instead of throwing
        return {
          success: false,
          error: 'duplicate_image',
          message: duplicateCheckResult.message,
          duplicateCheckResult
        };
      } else if (duplicateCheckResult.action === 'flag') {
        // Allow upload but mark for review - we'll handle this after upload
        console.log('✅ First duplicate detected - allowing upload but will flag for review:', duplicateCheckResult.message);
      } else {
        // Allow upload - no duplicates
        console.log('✅ No duplicates found - upload allowed:', duplicateCheckResult.message);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('duplicate_image:')) {
        console.log('🚨 Re-throwing duplicate image error:', error.message);
        throw error; // Re-throw duplicate errors
      }
      console.warn('Duplicate check failed, continuing with upload:', error);
    }
  }

  // ── determine bucket and table based on type ──
  console.log('🔍 Proceeding with upload setup...');
  const bucketName = isGenerated ? "generated-images" : "user-uploads";
  const tableName = isGenerated ? "generated_images" : "uploaded_images";
  const baseDir = isGenerated ? `generations/${userId}` : `uploads/${userId}`;

  // ── build storage path ──
  const srcFile = file as File;
  const name = srcFile.name || "uploaded";
  const mime = srcFile.type || "application/octet-stream";
  const extFromMime = mimeToExt[mime];
  const ext = (extFromMime || (name.includes(".") ? name.split(".").pop()! : "bin"))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const fileName   = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const safeCustom = (customPath || "").replace(/^\/+/, "").replace(/\.\./g, "");
  const storagePath = safeCustom ? `${baseDir}/${safeCustom}/${fileName}` : `${baseDir}/${fileName}`;

  // ── 1) upload to storage ──
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: mime,
    });

  if (uploadError) {
    // If object already exists, surface as normal error — the row insert handles dedupe.
    throw uploadError;
  }

  // ── public URL ──
  const { data: { publicUrl } } = supabase
    .storage
    .from(bucketName)
    .getPublicUrl(storagePath);

  // ── 2) insert into appropriate table (trigger mirrors into user_assets) ──
  let payload: any;
  
  if (isGenerated) {
    // Insert into generated_images table
    payload = {
      user_id: userId,
      prompt: opts.metadata?.prompt || null,
      title: opts.metadata?.title || null, // Include the title field
      image_url: publicUrl,
      storage_path: storagePath,
      file_size_bytes: srcFile.size ?? null,
      mime_type: mime,
      generation_params: {
        model: opts.metadata?.model,
        style: opts.metadata?.style,
        ...(opts.metadata?.generation_params || {})
      },
      metadata: {
        original_filename: name,
        timestamp: new Date().toISOString(),
        ...(opts.metadata || {})
      }
    };
  } else {
    // Insert into uploaded_images table
    payload = {
      user_id: userId,
      original_filename: name,
      image_url: publicUrl,
      storage_path: storagePath,
      file_size_bytes: srcFile.size ?? null,
      mime_type: mime,
      metadata: {
        timestamp: new Date().toISOString(),
        ...(opts.metadata || {})
      }
    };
  }

  const { data: rec, error: dbError } = await supabase
    .from(tableName)
    .insert(payload)
    .select("id")
    .single<{ id: string }>();

  // ── 3) duplicate-key guard (e.g., unique storage_path) ──
  if (dbError && dbError.code === "23505") {
    // Fetch the existing row safely (no 406 on 0 rows)
    const { data: existing } = await supabase
      .from(tableName)
      .select("id")
      .eq("storage_path", storagePath)
      .maybeSingle<{ id: string }>();
    return { success: true, publicUrl, storagePath, imageRecordId: existing?.id ?? null };
  }

  // Other DB errors: optionally clean up the storage object on known billing failures
  if (dbError) {
    const msg = String(dbError.message || dbError);
    if (
      msg.includes("insufficient_credits") ||
      msg.includes("insufficient_credits_or_free_gens") ||
      msg.includes("profile_not_found") ||
      msg.includes("missing_user_id")
    ) {
      // best-effort rollback
      await supabase.storage.from(bucketName).remove([storagePath]).catch(() => {});
    }
    throw dbError;
  }

  // ── 4) Handle flagged duplicates (only for uploads, not generated images) ──
  if (!isGenerated && rec?.id && duplicateCheckResult?.action === 'flag') {
    try {
      // Create duplicate detection record for flagged upload
      await createDuplicateDetection(
        rec.id,
        duplicateCheckResult.existingImageId!,
        userId,
        0.08 // Use threshold as similarity score
      );
      console.log('Duplicate detection record created for flagged upload');
    } catch (error) {
      console.error('Error creating duplicate detection record:', error);
      // Don't fail the upload if duplicate detection fails
    }
  }

  // ── 4) Backend duplicate check removed - frontend check is sufficient ──
  // The frontend checkImageDuplicate function already handles duplicate detection
  // and creates the necessary records. No need for redundant backend checks.

  // ── 5) broadcast fresh balance (best-effort) ──
  try {
    const { data: prof } = await supabase
      .from("profiles") // Updated table name
      .select("credits, free_generations_used")
      .eq("id", userId)
      .maybeSingle();

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cardify-credits-updated", {
          detail: {
            credits: Number(prof?.credits ?? 0),
            free_generations_used: Number(prof?.free_generations_used ?? 0),
          },
        })
      );
    }
  } catch {
    // non-fatal
  }

  return { 
    success: true, 
    publicUrl, 
    storagePath, 
    imageRecordId: rec?.id ?? null,
    duplicateCheckResult 
  };
}

/**
 * Upload a user-uploaded image (custom artwork, etc.)
 */
export async function uploadUserImage(
  file: Blob | File,
  customPath?: string,
  metadata?: Record<string, any>
): Promise<UploadResult> {
  return uploadToSupabase(file, customPath, {
    isGenerated: false,
    metadata
  });
}

/**
 * Upload an AI-generated image
 */
export async function uploadGeneratedImage(
  file: Blob | File,
  prompt?: string,
  generationParams?: Record<string, any>,
  metadata?: Record<string, any>,
  title?: string
): Promise<UploadResult> {
  return uploadToSupabase(file, undefined, {
    isGenerated: true,
    metadata: {
      prompt,
      title, // Pass the title to be saved in the database
      generation_params: generationParams,
      is_ai_generation: true,
      ...metadata
    }
  });
}

/**
 * Upload a temporary reference image (for AI generation)
 */
export async function uploadTempReference(
  file: Blob | File,
  sessionId: string
): Promise<UploadResult> {
  const supabase = getSupabaseBrowserClient();

  // ── build storage path ──
  const srcFile = file as File;
  const name = srcFile.name || "reference";
  const mime = srcFile.type || "application/octet-stream";
  const extFromMime = mimeToExt[mime];
  const ext = (extFromMime || (name.includes(".") ? name.split(".").pop()! : "bin"))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const storagePath = `temp/${sessionId}/${fileName}`;

  // ── upload to temp-references bucket ──
  const { error: uploadError } = await supabase.storage
    .from("temp-references")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: mime,
    });

  if (uploadError) {
    throw uploadError;
  }

  // ── get signed URL (temp bucket is private) ──
  const { data, error: urlError } = await supabase.storage
    .from("temp-references")
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (urlError || !data?.signedUrl) {
    throw urlError || new Error('Failed to create signed URL');
  }

  return { 
    success: true,
    publicUrl: data.signedUrl, 
    storagePath, 
    imageRecordId: null // No DB record for temp files
  };
}

/**
 * Clean up a temporary reference image
 */
export async function deleteTempReference(storagePath: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  
  const { error } = await supabase.storage
    .from("temp-references")
    .remove([storagePath]);
    
  if (error) {
    console.warn("Failed to delete temp reference:", error);
  }
}
