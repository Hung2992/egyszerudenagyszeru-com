/**
 * Classify a Supabase / fetch error into a user-friendly category.
 * Keeps error copy consistent across the app.
 */
export type SupabaseErrorKind = "network" | "auth" | "forbidden" | "server" | "not_found" | "unknown";

export interface ClassifiedError {
  kind: SupabaseErrorKind;
  message: string;
}

export function classifySupabaseError(error: unknown): ClassifiedError {
  if (!error) return { kind: "unknown", message: "Ismeretlen hiba." };

  const anyErr = error as { message?: string; code?: string; status?: number; name?: string };
  const status = anyErr.status ?? Number(anyErr.code);
  const raw = String(anyErr.message ?? error ?? "");

  const isNetwork =
    anyErr.name === "TypeError" ||
    /Load failed|Failed to fetch|NetworkError|network|fetch/i.test(raw);

  if (isNetwork) {
    return { kind: "network", message: "Nincs kapcsolat a szerverrel. Ellenőrizd az internetet." };
  }
  if (status === 401) return { kind: "auth", message: "Be kell jelentkezned." };
  if (status === 403) return { kind: "forbidden", message: "Nincs jogosultságod ehhez a művelethez." };
  if (status === 404) return { kind: "not_found", message: "Nem található." };
  if (status && status >= 500) return { kind: "server", message: "Szerverhiba. Próbáld újra pár perc múlva." };

  return { kind: "unknown", message: raw || "Váratlan hiba történt." };
}
