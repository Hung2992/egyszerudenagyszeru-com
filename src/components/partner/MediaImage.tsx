import { useEffect, useState } from "react";
import { getPartnerMediaUrl } from "@/lib/partner-storage";

interface Props {
  bucket: "partner-storefront-media" | "partner-product-images";
  path?: string | null;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
  loading?: "eager" | "lazy";
}

export const MediaImage = ({ bucket, path, alt = "", className, fallback, loading = "lazy" }: Props) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!path) { setUrl(null); return; }
    getPartnerMediaUrl(bucket, path).then(u => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [bucket, path]);
  if (!url) return <>{fallback ?? null}</>;
  return <img src={url} alt={alt} className={className} loading={loading} fetchPriority={loading === "eager" ? "high" : undefined} />;
};

export default MediaImage;
