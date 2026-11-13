// AEGIS — közös őr minden AI-híváshoz: bemenet jelzése, kimenet kitakarása, naplózás.
const INPUT: [string, RegExp][] = [
  ["prompt_injection", /(ignore|disregard|forget|hagyd figyelmen kívül|felejtsd el|ne vedd figyelembe).{0,40}(instruction|rules|utasítás|szabály)|jailbreak|szűrők nélkül|korlátok nélkül|\bDAN\b|developer mode|fejlesztői mód|you are now (an? )?(unrestricted|unfiltered)/i],
  ["prompt_exfiltration", /(reveal|show|print|repeat|mutasd meg|írd ki|add ki|ismételd meg).{0,40}(system prompt|rendszerprompt|rejtett utasítás|hidden instruction|your instructions|utasításaidat)/i],
  ["privilege", /(adj|tegyél|legyen|grant|make me).{0,30}(admin|szuperadmin|super admin|service.?role)|rls.{0,20}(kikapcs|töröl|disable)/i],
  ["credential", /(add meg|küldd el|mutasd|give me|send me|reveal).{0,30}(jelszó|jelszav|password|api.?kulcs|api.?key|service.?role|titkos kulcs|secret key|token)/i],
  ["destructive_sql", /\b(drop\s+(table|schema|database)|truncate\s+table|delete\s+from\s+\w+\s*(;|$))/i],
  ["ssrf", /(127\.0\.0\.1|169\.254\.|metadata\.google|\blocalhost:\d|0\.0\.0\.0|\[::1\])/i],
];
const OUTPUT: [string, RegExp][] = [
  ["private_key", /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g],
  ["card_data", /\b(?:\d[ -]?){13,19}\b/g],
  ["jwt", /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g],
  ["api_key", /\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{10,}\b|\bAIza[0-9A-Za-z_-]{30,}\b|\bsk-[A-Za-z0-9_-]{20,}\b|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bxox[abpr]-[A-Za-z0-9-]{10,}\b|\bAKIA[0-9A-Z]{16}\b/g],
];
// Csak valódi (Luhn-érvényes) kártyaszámot takarunk ki, a rendelésszámot és a telefonszámot nem.
export function luhn(d: string): boolean {
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}

// Álcázás elleni normalizálás: láthatatlan karakterek, ékezetek, leetspeak, széthúzott betűk, base64.
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };
export function aegisVariants(text: string): string[] {
  const noZw = text.replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, "");
  const folded = noZw.normalize("NFKC");
  const leet = folded.replace(/[013457@$]/g, (c) => LEET[c]);
  const joined = leet.replace(/\b(\w)([ ._\-*]+(?=\w\b))/g, "$1").replace(/(?<=\b\w) (?=\w\b)/g, "");
  const out = [noZw, folded, leet, joined];
  for (const m of noZw.match(/[A-Za-z0-9+/]{24,}={0,2}/g) ?? []) {
    try { const d = atob(m); if (/^[\x20-\x7E\u00C0-\u017F\s]+$/.test(d)) out.push(d); } catch { /* nem base64 */ }
  }
  return out;
}

export function aegisInput(text: string): string[] {
  const vs = aegisVariants(text);
  const found = INPUT.filter(([, re]) => vs.some((v) => re.test(v))).map(([c]) => c);
  if (found.length && !INPUT.some(([, re]) => re.test(text))) found.push("obfuscation");
  return found;
}

export function aegisRedact(text: string): { text: string; findings: string[] } {
  const findings: string[] = [];
  let out = text;
  for (const [code, re] of OUTPUT) {
    out = out.replace(re, (m) => {
      if (code === "card_data" && !luhn(m.replace(/\D/g, ""))) return m;
      if (!findings.includes(code)) findings.push(code);
      return "[AEGIS: kitakarva]";
    });
  }
  return { text: out, findings };
}

// deno-lint-ignore no-explicit-any
export function aegisLog(db: any, source: string, stage: "input" | "output", action: "redacted" | "flagged", findings: string[]) {
  if (!findings.length) return;
  db.from("aegis_events").insert({ source, stage, action, findings }).then(() => {}, () => {});
}
