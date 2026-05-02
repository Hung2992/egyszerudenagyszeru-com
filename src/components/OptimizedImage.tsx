import { useState, useRef, useEffect } from "react";

interface OptimizedImageProps {
  src: string | null;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function OptimizedImage({ src, alt, className = "", width, height, priority = false }: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  if (!src || error) {
    return (
      <div className={`bg-secondary flex items-center justify-center ${className}`}>
        <span className="text-xl font-bold text-muted-foreground/20">{alt?.[0] || "?"}</span>
      </div>
    );
  }

  // Add Supabase image transform params for optimization
  const optimizedSrc = src.includes("/storage/v1/object/public/")
    ? `${src}${src.includes("?") ? "&" : "?"}width=${width || 400}&quality=80`
    : src;

  return (
    <img
      ref={imgRef}
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}
