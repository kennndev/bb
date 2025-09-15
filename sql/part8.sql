-- Add title field to generated_images table
-- This allows us to store a deterministic name for each generated card

ALTER TABLE public.generated_images 
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add a comment to document the purpose
COMMENT ON COLUMN public.generated_images.title IS 'Deterministic display name for the generated card, generated once at creation time';

-- Update the sync_generated_to_assets function to use the title field
-- This ensures that the generated title is properly copied to user_assets

CREATE OR REPLACE FUNCTION sync_generated_to_assets() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_assets (
        user_id, asset_type, source_id, asset_id, title, description, image_url,
        storage_path, mime_type, file_size_bytes, metadata, created_at, updated_at
    ) VALUES (
        NEW.user_id, 'generated', NEW.id, NEW.id, 
        COALESCE(NEW.title, COALESCE(NEW.prompt, 'Generated Image')), -- Use title field first, fallback to prompt
        NULL, NEW.image_url, NEW.storage_path, NEW.mime_type, NEW.file_size_bytes,
        COALESCE(NEW.metadata, '{"credits_used": 1}'::jsonb), NEW.created_at, NOW()
    ) ON CONFLICT (user_id, asset_id) DO UPDATE SET
        image_url = EXCLUDED.image_url,
        storage_path = EXCLUDED.storage_path,
        mime_type = EXCLUDED.mime_type,
        file_size_bytes = EXCLUDED.file_size_bytes,
        title = EXCLUDED.title, -- Update title when syncing
        description = EXCLUDED.description,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
