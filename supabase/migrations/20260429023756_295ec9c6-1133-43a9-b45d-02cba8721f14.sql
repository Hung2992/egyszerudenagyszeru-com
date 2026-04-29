-- Export log a render kimenetek nyomon követéséhez
CREATE TABLE public.ai_studio_export_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  clip_id uuid,
  preset_key text NOT NULL,
  preset_label text,
  width integer NOT NULL,
  height integer NOT NULL,
  fps integer NOT NULL DEFAULT 30,
  video_bitrate_mbps integer NOT NULL,
  audio_bitrate_kbps integer,
  audio_sample_rate integer,
  render_duration_ms integer NOT NULL,
  output_size_bytes bigint,
  output_path text,
  status text NOT NULL DEFAULT 'success',
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_studio_export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage export logs"
ON public.ai_studio_export_logs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ai_studio_export_logs_created_at ON public.ai_studio_export_logs (created_at DESC);