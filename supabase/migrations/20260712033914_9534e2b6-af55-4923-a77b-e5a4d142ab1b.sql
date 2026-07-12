ALTER TABLE public.product_3d_assets
  ADD COLUMN IF NOT EXISTS glb_storage_path text,
  ADD COLUMN IF NOT EXISTS usdz_storage_path text,
  ADD COLUMN IF NOT EXISTS poster_storage_path text;