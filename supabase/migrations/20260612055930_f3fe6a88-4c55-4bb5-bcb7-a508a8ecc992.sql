DELETE FROM public.email_send_log p
WHERE p.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.email_send_log f
    WHERE f.message_id = p.message_id
      AND f.status IN ('sent','dlq','failed','suppressed')
  );