CREATE INDEX IF NOT EXISTS idx_ai_video_processing_queue_status_created
ON public.ai_video_processing_queue (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_video_processing_queue_type_status
ON public.ai_video_processing_queue (media_type, status);

CREATE INDEX IF NOT EXISTS idx_ai_video_processing_queue_bulk_job
ON public.ai_video_processing_queue (bulk_job_id, created_at DESC);