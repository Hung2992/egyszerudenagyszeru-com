// AEGIS — közös őr minden AI-híváshoz: bemenet jelzése, kimenet kitakarása, naplózás.
const INPUT: [string, RegExp][] = [
  ["prompt_injection", /(ignore|hagyd figyelmen kívül|felejtsd el).{0,40}(instruction|utasítás|szabály)|jailbreak|szűrők nélkül|korlátok nélkül/i],
  ["privilege", /(adj|tegyél|legyen).{0,30}(admin|szuperadmin|super admin)|rls.{0,20}(kikapcs|töröl|disable)/i],
  ["ssrf", /(127\.0\.0\.1|169\.254\.|metadata\.google)/i],
];
const OUTPUT: [string, RegExp][] = [
  ["card_data", /\b(?:\d[ -]?){13,19}\b/g],
  ["jwt", /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g],
  ["api_key", /\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{10,}\b|\bAIza[0-9A-Za-z_-]{30,}\b/g],
];

export function aegisInput(text: string): string[] {
  return INPUT.filter(([, re]) => re.test(text)).map(([c]) => c);
}

export function aegisRedact(text: string): { text: string; findings: string[] } {
  const findings: string[] = [];
  let out = text;
  for (const [code, re] of OUTPUT) {
    out = out.replace(re, (m) => {
      if (code === "card_data" && m.replace(/\D/g, "").length < 13) return m;
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
