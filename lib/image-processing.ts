import { getSupabaseBrowserClient } from "./supabase-browser";

// LPIPS threshold for duplicate detection (same as API route)
const DUPLICATE_THRESHOLD = 0.08;

/**
 * Fallback duplicate detection method that works without LPIPS API
 * Uses file size, name similarity, and basic image properties
 */
async function checkDuplicateFallback(
  file: File | Blob,
  existingImage: { id: string; image_url: string | null; original_filename: string | null }
): Promise<{ isDuplicate: boolean; confidence: number }> {
  try {
    // Method 1: Check file names for exact or similar matches
    const newFileName = file instanceof File ? file.name.toLowerCase() : 'blob';
    const existingFileName = existingImage.original_filename?.toLowerCase() || '';
    
    // Exact filename match
    if (newFileName === existingFileName) {
      console.log('🔍 Fallback: Exact filename match detected');
      return { isDuplicate: true, confidence: 0.95 };
    }
    
    // Similar filename patterns (e.g., both contain "doll", "princess", etc.)
    const newWords = newFileName.split(/[\s\-_\.]+/).filter(word => word.length > 2);
    const existingWords = existingFileName.split(/[\s\-_\.]+/).filter(word => word.length > 2);
    
    const commonWords = newWords.filter(word => 
      existingWords.some(existingWord => 
        existingWord.includes(word) || word.includes(existingWord)
      )
    );
    
    if (commonWords.length > 0) {
      console.log('🔍 Fallback: Similar filename patterns detected:', commonWords);
      return { isDuplicate: true, confidence: 0.8 };
    }
    
    // Method 2: Check file sizes (if they're very similar, might be duplicates)
    if (file instanceof File && existingImage.image_url) {
      try {
        const existingResponse = await fetch(existingImage.image_url);
        if (existingResponse.ok) {
          const existingBlob = await existingResponse.blob();
          const sizeDiff = Math.abs(file.size - existingBlob.size);
          const sizeSimilarity = 1 - (sizeDiff / Math.max(file.size, existingBlob.size));
          
          if (sizeSimilarity > 0.9) {
            console.log('🔍 Fallback: Very similar file sizes detected:', {
              newSize: file.size,
              existingSize: existingBlob.size,
              similarity: sizeSimilarity
            });
            return { isDuplicate: true, confidence: 0.7 };
          }
        }
      } catch (e) {
        console.log('🔍 Fallback: Could not check file sizes');
      }
    }
    
    return { isDuplicate: false, confidence: 0 };
  } catch (error) {
    console.log('🔍 Fallback duplicate check error:', error);
    return { isDuplicate: false, confidence: 0 };
  }
}

/**
 * Image processing utilities for handling custom card uploads
 * Ensures uploaded images match the preview by applying the same stretching logic as CSS object-fill
 */

/**
 * Stretches an image to match the standard playing card aspect ratio (2.5:3.5)
 * Uses the same stretching logic as CSS object-fill to ensure preview matches output
 * @param file - The original image file
 * @param targetRatio - The target aspect ratio (width/height), defaults to 2.5/3.5
 * @returns Promise<Blob> - The stretched image as a blob
 */
export async function cropImageToAspectRatio(
  file: File,
  targetRatio: number = 2.5 / 3.5
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    let imageUrl: string | null = null
    let useDataUrl = false
    
    // Function to load image with fallback to data URL
    const loadImage = async () => {
      try {
        // First try blob URL
        if (!useDataUrl) {
          imageUrl = URL.createObjectURL(file)
          img.src = imageUrl
        } else {
          // Fallback to data URL for better compatibility
          const reader = new FileReader()
          const dataUrl = await new Promise<string>((res, rej) => {
            reader.onload = () => res(reader.result as string)
            reader.onerror = rej
            reader.readAsDataURL(file)
          })
          img.src = dataUrl
        }
      } catch (err) {
        reject(new Error(`Failed to create image URL: ${err}`))
      }
    }

    img.onload = async () => {
      try {
        // Clean up blob URL if we used one
        if (imageUrl && !useDataUrl) {
          URL.revokeObjectURL(imageUrl)
        }

        // Detect if mobile device based on screen size and touch support
        const isMobile = typeof window !== 'undefined' && 
          (window.innerWidth < 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0)
        
        // Never upscale images - only downscale if needed
        // Max width: 1024px to keep file sizes reasonable
        const maxWidth = 1024
        const outputWidth = Math.min(img.width, maxWidth)
        const outputHeight = Math.round(outputWidth / targetRatio)
        
        console.log(`Processing image for ${isMobile ? 'mobile' : 'desktop'}: ${outputWidth}x${outputHeight}px`)

        const canvas = document.createElement('canvas')
        canvas.width = outputWidth
        canvas.height = outputHeight

        const ctx = canvas.getContext('2d', { 
          // Add options for better memory management
          willReadFrequently: false,
          desynchronized: true 
        })
        
        if (!ctx) {
          throw new Error('Failed to get canvas context')
        }

        // Enable high quality image smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        // Draw the entire image stretched to fill the canvas (object-fill behavior)
        // This matches the preview which uses object-fill
        ctx.drawImage(
          img,
          0, 0, img.width, img.height,              // Source rectangle (entire image)
          0, 0, outputWidth, outputHeight           // Destination rectangle (full canvas, stretched)
        )

        // Helper function to compress image with progressive quality reduction
        const compressImage = async (targetQuality: number, maxSizeMB: number = 2.8): Promise<Blob> => {
          return new Promise((resolveCompress, rejectCompress) => {
            // Force JPEG conversion using toDataURL then convert to blob
            const dataUrl = canvas.toDataURL('image/jpeg', targetQuality)
            
            // Convert data URL to blob
            fetch(dataUrl)
              .then(res => res.blob())
              .then(async (blob) => {
                const sizeMB = blob.size / (1024 * 1024)
                console.log(`Compressed to ${sizeMB.toFixed(2)}MB at quality ${(targetQuality * 100).toFixed(0)}%`)
                
                // If still too large and quality can be reduced further
                if (sizeMB > maxSizeMB && targetQuality > 0.5) {
                  console.log(`Image still too large, reducing quality...`)
                  const nextQuality = Math.max(0.5, targetQuality - 0.1)
                  try {
                    const smallerBlob = await compressImage(nextQuality, maxSizeMB)
                    resolveCompress(smallerBlob)
                  } catch (err) {
                    rejectCompress(err)
                  }
                } else if (sizeMB > maxSizeMB) {
                  // If we've hit minimum quality but still too large, reduce dimensions
                  console.log(`At minimum quality but still ${sizeMB.toFixed(2)}MB, reducing dimensions...`)
                  const scaleFactor = 0.75
                  const smallerCanvas = document.createElement('canvas')
                  smallerCanvas.width = Math.round(canvas.width * scaleFactor)
                  smallerCanvas.height = Math.round(canvas.height * scaleFactor)
                  const smallerCtx = smallerCanvas.getContext('2d')
                  if (!smallerCtx) {
                    rejectCompress(new Error('Failed to create smaller canvas'))
                    return
                  }
                  smallerCtx.imageSmoothingEnabled = true
                  smallerCtx.imageSmoothingQuality = 'high'
                  smallerCtx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height)
                  
                  // Force JPEG with toDataURL for smaller canvas too
                  const smallerDataUrl = smallerCanvas.toDataURL('image/jpeg', 0.7)
                  fetch(smallerDataUrl)
                    .then(res => res.blob())
                    .then(smallerBlob => {
                      console.log(`Reduced dimensions to ${smallerCanvas.width}x${smallerCanvas.height}, size: ${(smallerBlob.size / (1024 * 1024)).toFixed(2)}MB`)
                      resolveCompress(smallerBlob)
                    })
                    .catch(err => rejectCompress(err))
                } else {
                  resolveCompress(blob)
                }
              })
              .catch(err => rejectCompress(err))
          })
        }
        
        // Start with reasonable quality and let it auto-adjust if needed
        const initialQuality = isMobile ? 0.8 : 0.85
        
        try {
          const compressedBlob = await compressImage(initialQuality)
          console.log(`Final image size: ${(compressedBlob.size / (1024 * 1024)).toFixed(2)}MB`)
          resolve(compressedBlob)
        } catch (error) {
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      // Clean up blob URL if it exists
      if (imageUrl && !useDataUrl) {
        URL.revokeObjectURL(imageUrl)
      }
      
      // If blob URL failed and we haven't tried data URL yet, try it
      if (!useDataUrl) {
        console.warn('Blob URL failed, trying data URL fallback...')
        useDataUrl = true
        loadImage().catch(err => reject(new Error('Failed to load image with both blob and data URL')))
      } else {
        reject(new Error('Failed to load image'))
      }
    }

    // Start loading the image
    loadImage().catch(reject)
  })
}

/**
 * Creates a File object from a Blob with the original filename
 * @param blob - The blob to convert
 * @param originalFilename - The original filename to preserve
 * @returns File object
 */
export function blobToFile(blob: Blob, originalFilename: string): File {
  // Preserve the original filename but indicate it's been processed
  const extension = originalFilename.split('.').pop() || 'png'
  const nameWithoutExt = originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename
  const processedFilename = `${nameWithoutExt}_cropped.${extension}`
  
  return new File([blob], processedFilename, {
    type: blob.type,
    lastModified: Date.now()
  })
}

/**
 * Validates if an image file can be processed
 * @param file - The file to validate
 * @returns boolean indicating if the file is valid
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  const maxSize = 10 * 1024 * 1024 // 10MB
  
  return validTypes.includes(file.type) && file.size <= maxSize
}

/**
 * Check if an image is a duplicate and determine action needed
 * This allows first upload but flags subsequent duplicates for review
 */
export async function checkImageDuplicate(
  file: File | Blob, 
  userId: string
): Promise<{ 
  isDuplicate: boolean; 
  existingImageId?: string; 
  action: 'allow' | 'flag' | 'block';
  message: string;
}> {
  try {
    console.log('🔍 Starting duplicate check for user:', userId);
    const supabase = getSupabaseBrowserClient();
    
    // Get all existing images for this user to compare against
    const { data: existingImages, error } = await supabase
      .from('uploaded_images')
      .select('id, image_url, original_filename')
      .eq('user_id', userId)
      .not('image_url', 'is', null);
    
    if (error) {
      console.error('❌ Error fetching existing images:', error);
      return { 
        isDuplicate: false, 
        action: 'allow', 
        message: 'Upload allowed - error checking duplicates' 
      };
    }
    
    console.log(`🔍 Found ${existingImages?.length || 0} existing images for user ${userId}`);
    
    if (!existingImages || existingImages.length === 0) {
      console.log('✅ No existing images - upload allowed');
      return { 
        isDuplicate: false, 
        action: 'allow', 
        message: 'Upload allowed - first image' 
      }; // No existing images to compare against
    }
    
    // Convert the new file to a blob for comparison
    const newImageBlob = file instanceof Blob ? file : new Blob([file]);
    console.log('🖼️ New image blob size:', newImageBlob.size, 'bytes');
    
    // Check against each existing image using the LPIPS API
    let bestMatch = null;
    let bestScore = Infinity;
    let allScores: Array<{imageId: string, filename: string, score: number}> = [];
    
    for (const existingImage of existingImages) {
      try {
        console.log(`🔄 Comparing with existing image: ${existingImage.original_filename} (${existingImage.id})`);
        
        // Create form data for the LPIPS API
        const formData = new FormData();
        formData.append('img1', newImageBlob, 'new_image.jpg');
        
        // Fetch the existing image and add it to form data
        if (typeof existingImage.image_url === 'string') {
          console.log('📥 Fetching existing image from:', existingImage.image_url);
          const existingImageResponse = await fetch(existingImage.image_url);
          if (existingImageResponse.ok) {
            const existingImageBlob = await existingImageResponse.blob();
            console.log('📥 Existing image blob size:', existingImageBlob.size, 'bytes');
            formData.append('img2', existingImageBlob, 'existing_image.jpg');
            
            // Call the LPIPS duplicate detection API with timeout
            console.log('🚀 Calling LPIPS API...');
            console.log('🔍 Comparing images:', {
              newImage: file instanceof File ? file.name : 'blob',
              existingImage: existingImage.original_filename,
              existingImageId: existingImage.id,
              existingImageUrl: existingImage.image_url
            });
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            try {
              const response = await fetch('https://mirac107-MH.hf.space/score', {
                method: 'POST',
                body: formData,
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              
              if (response.ok) {
                const result = await response.json() as { lpips?: number };
                console.log('📊 Raw LPIPS API response:', result);
                const lpipsScore = result.lpips ?? 1.0;
                console.log(`📊 LPIPS score: ${lpipsScore} (threshold: ${DUPLICATE_THRESHOLD})`);
                
                // Store all scores for analysis
                allScores.push({
                  imageId: existingImage.id as string,
                  filename: (existingImage.original_filename as string) || 'unknown',
                  score: lpipsScore
                });
                
                // Track the best (lowest) score
                if (lpipsScore < bestScore) {
                  bestScore = lpipsScore;
                  bestMatch = existingImage;
                }
                
                // If LPIPS score is below threshold, it's a duplicate
                if (lpipsScore <= DUPLICATE_THRESHOLD) {
                  console.log('🚨 DUPLICATE DETECTED!');
                  console.log('Duplicate detected via LPIPS:', {
                    newImage: file instanceof File ? file.name : 'blob',
                    existingImage: existingImage.original_filename || 'unknown',
                    lpipsScore: lpipsScore,
                    threshold: DUPLICATE_THRESHOLD
                  });
                } else {
                  console.log('✅ No duplicate detected for this image');
                }
              } else {
                console.log(`⚠️ LPIPS API error: ${response.status} - ${response.statusText}`);
                // Try to get error details
                try {
                  const errorText = await response.text();
                  console.log('🔍 LPIPS API error details:', errorText);
                } catch (e) {
                  console.log('🔍 Could not read error response');
                }
                
                // Use fallback duplicate detection when LPIPS fails
                console.log('🔍 LPIPS API failed, using fallback duplicate detection...');
                const fallbackResult = await checkDuplicateFallback(file, {
                  id: existingImage.id as string,
                  image_url: existingImage.image_url,
                  original_filename: existingImage.original_filename as string | null
                });
                if (fallbackResult.isDuplicate) {
                  console.log('🚨 DUPLICATE DETECTED via fallback method!');
                  allScores.push({
                    imageId: existingImage.id as string,
                    filename: (existingImage.original_filename as string) || 'unknown',
                    score: 0.05 // Low score to indicate duplicate
                  });
                  
                  if (0.05 < bestScore) {
                    bestScore = 0.05;
                    bestMatch = existingImage;
                  }
                }
              }
            } catch (fetchError: unknown) {
              clearTimeout(timeoutId);
              if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                console.log('⏰ LPIPS API timeout - treating as no duplicate');
              } else {
                console.log(`⚠️ LPIPS API fetch error:`, fetchError);
                
                // Use fallback duplicate detection when LPIPS fails
                console.log('🔍 LPIPS API failed, using fallback duplicate detection...');
                const fallbackResult = await checkDuplicateFallback(file, {
                  id: existingImage.id as string,
                  image_url: existingImage.image_url,
                  original_filename: existingImage.original_filename as string | null
                });
                if (fallbackResult.isDuplicate) {
                  console.log('🚨 DUPLICATE DETECTED via fallback method!');
                  allScores.push({
                    imageId: existingImage.id as string,
                    filename: (existingImage.original_filename as string) || 'unknown',
                    score: 0.05 // Low score to indicate duplicate
                  });
                  
                  if (0.05 < bestScore) {
                    bestScore = 0.05;
                    bestMatch = existingImage;
                  }
                }
              }
            }
          } else {
            console.log(`⚠️ Failed to fetch existing image: ${existingImageResponse.status}`);
          }
        } else {
          console.log('⚠️ Existing image URL is not a string:', existingImage.image_url);
        }
      } catch (comparisonError) {
        console.warn('❌ Error comparing with existing image:', comparisonError);
        // Continue with next image
      }
    }
    
    // After checking all images, determine the action based on the best match
    console.log('📋 All similarity scores:', allScores.map(s => ({ filename: s.filename, score: s.score })));
    console.log(`🎯 Best match: ${bestMatch?.original_filename || 'unknown'} with score: ${bestScore}`);
    
    // Add debug logging for threshold check
    console.log(`🔍 Debug: Checking threshold - bestScore: ${bestScore}, threshold: ${DUPLICATE_THRESHOLD}, isDuplicate: ${bestScore <= DUPLICATE_THRESHOLD}`);
    
    if (bestScore <= DUPLICATE_THRESHOLD && bestMatch) {
      console.log(`🚨 DUPLICATE THRESHOLD MET! Score below ${DUPLICATE_THRESHOLD}`);
      // Check if this is the first duplicate or subsequent duplicates
      const duplicateCount = await getDuplicateCount(userId, bestMatch.id as string);
      console.log(`📊 Existing duplicate count: ${duplicateCount}`);
      
      if (duplicateCount === 0) {
        // First duplicate - allow upload but flag for review
        console.log('✅ First duplicate - allowing upload but will flag for review');
        return { 
          isDuplicate: true, 
          existingImageId: bestMatch.id as string,
          action: 'flag',
          message: 'Similar image detected - this will be reviewed by our team'
        };
      } else {
        // Subsequent duplicate - block upload
        console.log('❌ Subsequent duplicate - blocking upload');
        return { 
          isDuplicate: true, 
          existingImageId: bestMatch.id as string,
          action: 'block',
          message: `Duplicate detected - ${duplicateCount + 1} copies already exist. Upload blocked.`
        };
      }
    } else {
      console.log(`❌ NO DUPLICATE: Score ${bestScore} is above threshold ${DUPLICATE_THRESHOLD}`);
    }
    
    console.log('✅ No duplicates found - upload allowed');
    return { 
      isDuplicate: false, 
      action: 'allow', 
      message: 'Upload allowed - no duplicates found' 
    };
  } catch (error) {
    console.error('💥 Error checking image duplicate:', error);
    return { 
      isDuplicate: false, 
      action: 'allow', 
      message: 'Upload allowed - error checking duplicates' 
    };
  }
}

/**
 * Get the count of duplicate detections for a specific image
 */
async function getDuplicateCount(userId: string, imageId: string): Promise<number> {
  try {
    const supabase = getSupabaseBrowserClient();
    
    // Get the user_assets ID for the image
    const { data: userAsset } = await supabase
      .from('user_assets')
      .select('id')
      .eq('asset_type', 'uploaded')
      .eq('source_id', imageId)
      .maybeSingle();
    
    if (!userAsset) return 0;
    
    // Count existing duplicate detections
    const { count } = await supabase
      .from('duplicate_detections')
      .select('*', { count: 'exact', head: true })
      .eq('matched_asset_id', userAsset.id as string)
      .eq('status', 'pending');
    
    return count || 0;
  } catch (error) {
    console.error('Error getting duplicate count:', error);
    return 0;
  }
}

/**
 * Create a duplicate detection record for flagged uploads
 */
export async function createDuplicateDetection(
  newAssetId: string,
  matchedAssetId: string,
  userId: string,
  similarityScore: number
): Promise<void> {
  try {
    console.log('🔍 Creating duplicate detection record...');
    console.log('📝 Parameters:', { newAssetId, matchedAssetId, userId, similarityScore });
    
    const supabase = getSupabaseBrowserClient();
    
    // Get the user_assets IDs for both assets
    console.log('🔍 Fetching user_assets records...');
    const { data: newUserAsset, error: newUserAssetError } = await supabase
      .from('user_assets')
      .select('id')
      .eq('asset_type', 'uploaded')
      .eq('source_id', newAssetId)
      .maybeSingle();
    
    if (newUserAssetError) {
      console.error('❌ Error fetching new user asset:', newUserAssetError);
    }
    
    const { data: matchedUserAsset, error: matchedUserAssetError } = await supabase
      .from('user_assets')
      .select('id')
      .eq('asset_type', 'uploaded')
      .eq('source_id', matchedAssetId)
      .maybeSingle();
    
    if (matchedUserAssetError) {
      console.error('❌ Error fetching matched user asset:', matchedUserAssetError);
    }
    
    console.log('📊 User assets found:', { 
      newUserAsset: newUserAsset?.id, 
      matchedUserAsset: matchedUserAsset?.id,
      newUserAssetError: newUserAssetError?.message,
      matchedUserAssetError: matchedUserAssetError?.message
    });
    
    if (!newUserAsset || !matchedUserAsset) {
      console.error('❌ Could not find user_assets records for duplicate detection');
      return;
    }
    
    // Create duplicate detection record
    console.log('📝 Inserting duplicate detection record...');
    
    // Get the user ID of the matched asset (the existing image)
    const { data: matchedAssetDetails } = await supabase
      .from('uploaded_images')
      .select('user_id')
      .eq('id', matchedAssetId)
      .single();
    
    const matchedUserId = matchedAssetDetails?.user_id || userId;
    
    const { data: insertData, error: insertError } = await supabase
      .from('duplicate_detections')
      .insert({
        asset_id: newUserAsset.id as string,
        user_id: userId,
        similarity_score: similarityScore,
        matched_asset_id: matchedUserAsset.id as string,
        matched_user_id: matchedUserId, // Use the actual user ID of the matched asset
        detection_method: 'lpips',
        status: 'pending'
      })
      .select('id')
      .single();
    
    if (insertError) {
      console.error('❌ Error inserting duplicate detection record:', insertError);
      console.error('❌ Insert error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
    } else {
      console.log('✅ Duplicate detection record created successfully with ID:', insertData?.id);
    }
  } catch (error) {
    console.error('💥 Error creating duplicate detection:', error);
  }
}