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
export function periodRange(day: string, period: SocialPeriod) {
  const start = new Date(`${periodKey(`${day}T12:00:00Z`, period)}${period === "month" ? "-01" : ""}T00:00:00Z`);
  const end = new Date(start);
  if (period === "month") end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCDate(end.getUTCDate() + (period === "week" ? 7 : 1));
  // Fetch a timezone-safe superset; periodKey performs exact Budapest filtering.
  start.setUTCHours(start.getUTCHours() - 14);
  end.setUTCHours(end.getUTCHours() + 14);
  return { start: start.toISOString(), end: end.toISOString() };
}
export function approvalLabel(post?: { status: string; approval_hash: string | null; approval_expires_at: string | null; approval_current?: boolean }, now = Date.now()) {
  if (!post) return "Tartalom hiányzik";
  if (post.status === "published") return "Publikálva";
  if (post.status === "cancelled") return "Visszavonva";
  if (post.approval_current === false && post.approval_hash) return "Új jóváhagyás szükséges";
  if (post.approval_hash && Date.parse(post.approval_expires_at ?? "") > now) return "Jóváhagyva";
  return post.approval_hash ? "Jóváhagyás lejárt" : "Jóváhagyásra vár";
}