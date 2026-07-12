import type { ComponentType } from "react";

type Importer<T> = () => Promise<{ default: T }>;

/**
 * Wraps a dynamic import so a stale chunk (typical after a deploy) triggers
 * exactly one silent page reload instead of a fatal "Importing a module script failed".
 * Uses sessionStorage so we don't loop forever if the chunk is genuinely broken.
 */
export function lazyRetry<T extends ComponentType<any>>(
  importer: Importer<T>,
  key = "chunk-reload",
): Importer<T> {
  return () =>
    new Promise((resolve, reject) => {
      const storageKey = `lovable:${key}`;
      let hasRefreshed = false;
      try {
        hasRefreshed = window.sessionStorage.getItem(storageKey) === "true";
      } catch {
        // sessionStorage may be blocked (private mode, SSR-ish env) — treat as no refresh yet
      }

      importer()
        .then((mod) => {
          try {
            window.sessionStorage.removeItem(storageKey);
          } catch {
            /* noop */
          }
          resolve(mod);
        })
        .catch((error) => {
          const msg = String(error?.message ?? error ?? "");
          const isChunkError =
            /Importing a module script failed|Failed to fetch dynamically imported module|Loading chunk .* failed|ChunkLoadError/i.test(
              msg,
            );

          if (isChunkError && !hasRefreshed) {
            try {
              window.sessionStorage.setItem(storageKey, "true");
            } catch {
              /* noop */
            }
            window.location.reload();
            return;
          }
          reject(error);
        });
    });
}
