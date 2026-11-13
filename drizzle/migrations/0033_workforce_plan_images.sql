CREATE TABLE public.workforce_plan_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.workforce_plans(id) ON DELETE CASCADE,
  path text NOT NULL,
  caption text,
  uploaded_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.workforce_plan_images TO authenticated;
GRANT ALL ON public.workforce_plan_images TO service_role;
ALTER TABLE public.workforce_plan_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage plan images" ON public.workforce_plan_images FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin read workforce images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'workforce-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin upload workforce images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'workforce-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete workforce images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'workforce-images' AND public.has_role(auth.uid(), 'admin'));