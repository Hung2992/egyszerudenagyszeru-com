export interface PublishGate {
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  approval_expires_at: string | null;
  approval_hash: string | null;
}

// Advisory mirror of the authoritative transactional database gate.
export function approvalIsCurrent(item: PublishGate, now = Date.now()): boolean {
  return item.status === "pending" && Boolean(item.approved_by && item.approval_hash && item.approved_at)
    && Number.isFinite(Date.parse(item.approval_expires_at ?? ""))
    && Date.parse(item.approval_expires_at ?? "") > now;
}

export function budapestHour(date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Budapest", hour: "2-digit", hourCycle: "h23" }).format(date));
}

export function inQuietHours(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

// Provider acceptance is not proof that an asynchronous publication is live.
export function providerOutcome(platform: string): "published" | "processing" {
  return platform === "tiktok" ? "processing" : "published";
}