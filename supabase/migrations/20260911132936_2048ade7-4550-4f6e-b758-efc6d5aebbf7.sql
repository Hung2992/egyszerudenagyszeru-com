ALTER TABLE public.ai_local_endpoints
  ADD COLUMN IF NOT EXISTS avg_latency_ms numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cooldown_until timestamptz,
  ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.ai_endpoint_record(
  _id uuid,
  _ok boolean,
  _latency_ms integer DEFAULT NULL,
  _error text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _ok THEN
    UPDATE public.ai_local_endpoints
    SET success_count = success_count + 1,
        consecutive_failures = 0,
        cooldown_until = NULL,
        last_status = 'ok',
        last_error = NULL,
        last_checked_at = now(),
        avg_latency_ms = CASE
          WHEN _latency_ms IS NULL THEN avg_latency_ms
          WHEN avg_latency_ms = 0 THEN _latency_ms
          ELSE round((avg_latency_ms * 0.7) + (_latency_ms * 0.3))
        END,
        updated_at = now()
    WHERE id = _id;
  ELSE
    UPDATE public.ai_local_endpoints
    SET failure_count = failure_count + 1,
        consecutive_failures = consecutive_failures + 1,
        last_status = 'error',
        last_error = left(coalesce(_error, 'unknown'), 300),
        last_checked_at = now(),
        cooldown_until = CASE
          WHEN consecutive_failures + 1 >= 3 THEN now() + interval '5 minutes'
          ELSE cooldown_until
        END,
        updated_at = now()
    WHERE id = _id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_endpoint_record(uuid, boolean, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_endpoint_record(uuid, boolean, integer, text) TO service_role;