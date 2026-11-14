export type SocialPeriod = "month" | "week" | "day";
export const socialPlatforms = ["facebook", "tiktok", "linkedin"] as const;
export function budapestDay(value: string | Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
export function periodKey(value: string, period: SocialPeriod): string {
  const day = budapestDay(value);
  if (period === "month") return day.slice(0, 7);
  if (period === "day") return day;
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.toISOString().slice(0, 10);
}
export function dailyMonthSlots(month: string) {
  const [year, number] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Array.from({ length: days }, (_, index) => socialPlatforms.map(platform => ({ day: `${month}-${String(index + 1).padStart(2, "0")}`, platform }))).flat();
}
export function approvalLabel(post?: { status: string; approval_hash: string | null; approval_expires_at: string | null }, now = Date.now()) {
  if (!post) return "Tartalom hiányzik";
  if (post.status === "published") return "Publikálva";
  if (post.status === "cancelled") return "Visszavonva";
  if (post.approval_hash && Date.parse(post.approval_expires_at ?? "") > now) return "Jóváhagyva";
  return post.approval_hash ? "Jóváhagyás lejárt" : "Jóváhagyásra vár";
}