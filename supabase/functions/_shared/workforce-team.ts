export type TeamRecord = { value: { title?: string; content?: string; source?: string; target?: string | null; plan_id?: string | null }; expires_at?: string | null };
export function visibleTeamRecords(rows: TeamRecord[], department: string, now = Date.now()) {
  return rows.filter(r => (!r.expires_at || new Date(r.expires_at).getTime() > now) && (!r.value.target || r.value.target === department || r.value.source === department));
}