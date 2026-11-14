import DOMPurify from "dompurify";

/**
 * Partner/felhasználó által írt HTML biztonságos megjelenítése:
 * scriptek, eseménykezelők, iframe-ek és javascript: linkek eltávolítva.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button", "textarea", "select", "meta", "link", "base"],
    FORBID_ATTR: ["style", "srcdoc", "formaction"],
    ALLOW_DATA_ATTR: false,
  });
}
