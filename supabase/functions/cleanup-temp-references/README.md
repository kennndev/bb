# Cleanup Temp References Function

This Edge Function cleans up orphaned temporary reference images from the `temp-references` storage bucket.

## Purpose

When users upload reference images for AI card generation, these images are stored temporarily in Supabase Storage. While the main application cleans up images after successful generation, some images might be orphaned due to:

- User closing the browser before generation completes
- Network failures during generation
- Application errors

This function acts as a safety net, deleting any reference images older than 24 hours.

## Deployment

To deploy this function to Supabase:

```bash
supabase functions deploy cleanup-temp-references
```

## Scheduling

To run this function daily, you can set up a cron job using Supabase's pg_cron extension:

```sql
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup function to run daily at 2 AM UTC
SELECT cron.schedule(
  'cleanup-temp-references',
  '0 2 * * *',  -- Daily at 2 AM UTC
  $$
    SELECT
      net.http_post(
        url := 'https://qltfmuxgmdzcjvnfdqfn.supabase.co/functions/v1/cleanup-temp-references',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := '{}'::jsonb
      );
  $$
);
```

## Manual Execution

To run the cleanup manually:

```bash
curl -X POST https://qltfmuxgmdzcjvnfdqfn.supabase.co/functions/v1/cleanup-temp-references \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Configuration

The function automatically:
- Deletes files older than 24 hours
- Processes files in batches of 100 to avoid timeouts
- Logs detailed information about the cleanup process

## Monitoring

Check function logs in the Supabase dashboard under:
Functions → cleanup-temp-references → Logs