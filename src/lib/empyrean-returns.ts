export type ReturnStatus = "requested" | "approved" | "rejected" | "refunded";
export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: "Jóváhagyásra vár", approved: "Jóváhagyva", rejected: "Elutasítva", refunded: "Visszatérítve",
};
/** Visszatérítés csak jóváhagyás után lehetséges; lezárt kérésen nincs több lépés. */
export function nextReturnActions(s: ReturnStatus): ("approve" | "reject" | "refund")[] {
  if (s === "requested") return ["approve", "reject"];
  if (s === "approved") return ["refund"];
  return [];
}
