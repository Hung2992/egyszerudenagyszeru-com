// Felolvasó hang beállítása: a dashboardon választott hang (alapból az első magyar) minden munkatársnál érvényes.
const KEY = "wf-voice";
export const huVoices = () => (typeof speechSynthesis === "undefined" ? [] : speechSynthesis.getVoices().filter(v => v.lang?.toLowerCase().startsWith("hu")));
export const getVoicePref = () => localStorage.getItem(KEY) || "";
export const setVoicePref = (name: string) => localStorage.setItem(KEY, name);
export function pickVoice(): SpeechSynthesisVoice | undefined {
  const all = huVoices(); const pref = getVoicePref();
  return all.find(v => v.name === pref) ?? all[0];
}
