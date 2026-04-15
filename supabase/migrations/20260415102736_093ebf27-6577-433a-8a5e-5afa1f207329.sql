
-- Add preferred refund method column
ALTER TABLE public.return_requests
ADD COLUMN preferred_refund_method text DEFAULT NULL;

-- Allow users to delete their own PENDING return requests
CREATE POLICY "Users can delete own pending return requests"
ON public.return_requests
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND status = 'pending'
);
