/**
 * Marketing kampány életciklus + szerepkör-alapú hozzáférés integrációs tesztek.
 *
 * A tesztek a Supabase kliens hívásait mockolják és igazolják, hogy:
 *   1. A teljes kampány életciklus (draft → schedule → send) helyes payloaddal fut.
 *   2. Az admin `marketing_campaigns` tábla csak admin szerepkörrel érhető el.
 *   3. A partner `partner_marketing_campaigns` lista SZIGORÚAN a saját `partner_id`-ra
 *      szűrve töltődik — más partner kampányai nem szivárognak.
 *   4. Az audit napló csak admin számára olvasható.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = Record<string, any>;

interface MockDb {
  marketing_campaigns: Row[];
  partner_marketing_campaigns: Row[];
  marketing_campaign_audit_log: Row[];
}

const makeDb = (): MockDb => ({
  marketing_campaigns: [],
  partner_marketing_campaigns: [
    { id: "c1", partner_id: "partner-A", title: "A promó", status: "draft" },
    { id: "c2", partner_id: "partner-A", title: "A hírlevél", status: "sent" },
    { id: "c3", partner_id: "partner-B", title: "B kampány", status: "draft" },
  ],
  marketing_campaign_audit_log: [],
});

type Role = "admin" | "partner" | "anon";

const buildClient = (db: MockDb, role: Role, currentPartnerId: string | null = null) => {
  const denied = (msg = "permission denied") => Promise.resolve({ data: null, error: { message: msg } });

  const from = (table: keyof MockDb) => {
    const isAdmin = role === "admin";
    const isPartner = role === "partner";

    // RLS szimuláció
    const canRead = () => {
      if (table === "marketing_campaigns") return isAdmin;
      if (table === "marketing_campaign_audit_log") return isAdmin;
      if (table === "partner_marketing_campaigns") return isAdmin || isPartner;
      return true;
    };
    const canWrite = () => {
      if (table === "marketing_campaigns") return isAdmin;
      if (table === "marketing_campaign_audit_log") return isAdmin;
      if (table === "partner_marketing_campaigns") return isAdmin || isPartner;
      return false;
    };

    const state = { filters: [] as Array<[string, any]> };

    const applyFilters = (rows: Row[]) =>
      rows.filter(r => state.filters.every(([k, v]) => r[k] === v));

    const enforcePartnerScope = (rows: Row[]) => {
      if (table === "partner_marketing_campaigns" && isPartner) {
        return rows.filter(r => r.partner_id === currentPartnerId);
      }
      return rows;
    };

    const chain: any = {
      select: () => chain,
      order: () => chain,
      limit: () => chain,
      eq: (col: string, val: any) => {
        state.filters.push([col, val]);
        return chain;
      },
      then: (resolve: any) => {
        if (!canRead()) return resolve({ data: null, error: { message: "permission denied" } });
        const rows = enforcePartnerScope(applyFilters(db[table]));
        return resolve({ data: rows, error: null });
      },
      insert: (payload: Row) => {
        if (!canWrite()) return denied();
        const row = { id: `id-${db[table].length + 1}`, ...payload };
        db[table].push(row);
        if (table === "marketing_campaigns") {
          db.marketing_campaign_audit_log.push({
            campaign_id: row.id,
            campaign_name: row.name,
            action: "create",
            status_to: row.status,
          });
        }
        return Promise.resolve({ data: row, error: null });
      },
      update: (payload: Row) => ({
        eq: (col: string, val: any) => {
          if (!canWrite()) return denied();
          const idx = db[table].findIndex(r => r[col] === val);
          if (idx < 0) return Promise.resolve({ data: null, error: null });
          const old = db[table][idx];
          const next = { ...old, ...payload };
          db[table][idx] = next;
          if (table === "marketing_campaigns" && old.status !== next.status) {
            db.marketing_campaign_audit_log.push({
              campaign_id: next.id,
              campaign_name: next.name,
              action: next.status === "sent" ? "send" : next.status === "scheduled" ? "schedule" : "update",
              status_from: old.status,
              status_to: next.status,
            });
          }
          return Promise.resolve({ data: next, error: null });
        },
      }),
      delete: () => ({
        eq: (col: string, val: any) => {
          if (!canWrite()) return denied();
          const idx = db[table].findIndex(r => r[col] === val);
          if (idx < 0) return Promise.resolve({ data: null, error: null });
          const old = db[table][idx];
          db[table].splice(idx, 1);
          if (table === "marketing_campaigns") {
            db.marketing_campaign_audit_log.push({
              campaign_id: old.id,
              campaign_name: old.name,
              action: "delete",
              status_from: old.status,
            });
          }
          return Promise.resolve({ data: null, error: null });
        },
      }),
    };
    return chain;
  };

  return { from };
};

describe("Marketing kampány életciklus (admin)", () => {
  let db: MockDb;
  let sb: ReturnType<typeof buildClient>;

  beforeEach(() => {
    db = makeDb();
    sb = buildClient(db, "admin");
  });

  it("létrehozás → ütemezés → küldés → audit napló", async () => {
    await sb.from("marketing_campaigns").insert({
      name: "Húsvéti akció",
      campaign_type: "promotion",
      target_segment: "all",
      status: "draft",
    });
    expect(db.marketing_campaigns).toHaveLength(1);
    const id = db.marketing_campaigns[0].id;

    await sb.from("marketing_campaigns").update({
      status: "scheduled",
      scheduled_at: "2026-08-01T10:00:00Z",
    }).eq("id", id);

    await sb.from("marketing_campaigns").update({
      status: "sent",
      sent_at: "2026-08-01T10:05:00Z",
    }).eq("id", id);

    const actions = db.marketing_campaign_audit_log.map(a => a.action);
    expect(actions).toEqual(["create", "schedule", "send"]);
    expect(db.marketing_campaign_audit_log[2].status_from).toBe("scheduled");
    expect(db.marketing_campaign_audit_log[2].status_to).toBe("sent");
  });

  it("kampány törlése audit bejegyzést hoz létre", async () => {
    await sb.from("marketing_campaigns").insert({ name: "X", status: "draft" });
    const id = db.marketing_campaigns[0].id;
    await sb.from("marketing_campaigns").delete().eq("id", id);
    expect(db.marketing_campaigns).toHaveLength(0);
    expect(db.marketing_campaign_audit_log.map(a => a.action)).toContain("delete");
  });
});

describe("Szerepkör-alapú hozzáférés", () => {
  it("nem-admin NEM olvashat admin marketing kampányokat", async () => {
    const db = makeDb();
    db.marketing_campaigns.push({ id: "adm1", name: "Titkos", status: "draft" });
    const partner = buildClient(db, "partner", "partner-A");
    const anon = buildClient(db, "anon");

    const p = await partner.from("marketing_campaigns").select();
    const a = await anon.from("marketing_campaigns").select();
    expect(p.error).toBeTruthy();
    expect(a.error).toBeTruthy();
  });

  it("nem-admin NEM írhat/módosíthat admin marketing kampányt", async () => {
    const db = makeDb();
    const partner = buildClient(db, "partner", "partner-A");
    const res = await partner.from("marketing_campaigns").insert({ name: "Hack", status: "draft" });
    expect(res.error).toBeTruthy();
    expect(db.marketing_campaigns).toHaveLength(0);
  });

  it("partner CSAK a saját kampányait látja", async () => {
    const db = makeDb();
    const partnerA = buildClient(db, "partner", "partner-A");
    const partnerB = buildClient(db, "partner", "partner-B");

    const a = await partnerA.from("partner_marketing_campaigns").select().eq("partner_id", "partner-A");
    const b = await partnerB.from("partner_marketing_campaigns").select().eq("partner_id", "partner-B");

    expect(a.data?.map((r: any) => r.id).sort()).toEqual(["c1", "c2"]);
    expect(b.data?.map((r: any) => r.id)).toEqual(["c3"]);

    // Kereszt-partner szivárgás elleni védelem: még ha másik partner_id-t kérnek is, üres jön
    const leak = await partnerA.from("partner_marketing_campaigns").select().eq("partner_id", "partner-B");
    expect(leak.data).toEqual([]);
  });

  it("audit naplót csak admin láthatja", async () => {
    const db = makeDb();
    db.marketing_campaign_audit_log.push({ id: "a1", action: "create", campaign_name: "X" });
    const partner = buildClient(db, "partner", "partner-A");
    const admin = buildClient(db, "admin");

    const p = await partner.from("marketing_campaign_audit_log").select();
    const a = await admin.from("marketing_campaign_audit_log").select();
    expect(p.error).toBeTruthy();
    expect(a.data).toHaveLength(1);
  });
});
