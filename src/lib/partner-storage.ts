import { supabase } from "@/integrations/supabase/untyped-client";

const cache = new Map<string, { url: string; exp: number }>();
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getPartnerMediaUrl(bucket: "partner-storefront-media" | "partner-product-images", path?: string | null): Promise<string | null> {
  if (!path) return null;
  const key = `${bucket}/${path}`;
  const c = cache.get(key);
  if (c && c.exp > Date.now()) return c.url;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, ONE_YEAR);
  if (!data?.signedUrl) return null;
  cache.set(key, { url: data.signedUrl, exp: Date.now() + ONE_YEAR * 1000 * 0.9 });
  return data.signedUrl;
}

export async function uploadPartnerMedia(bucket: "partner-storefront-media" | "partner-product-images", partnerId: string, file: File): Promise<string | null> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${partnerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) { console.error(error); return null; }
  return path;
}
