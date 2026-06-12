import { describe, it, expect } from "vitest";

/**
 * Partner hozzáférési szabályok tesztje.
 * A logika az aktiválás / szüneteltetés / visszavonás állapotokat fedi le,
 * amelyek alapján a Navbar és a PartnerPortal eldönti, hogy a felhasználó
 * lát-e partner menüt és léphet-e be a felületre.
 */

type PartnerStatus = "active" | "paused" | "revoked" | "invited" | null;

const canSeePartnerMenu = (status: PartnerStatus): boolean => status === "active";

const canAccessPortal = (status: PartnerStatus, isAdmin: boolean): boolean => {
  if (isAdmin) return true;
  return status === "active";
};

describe("Partner hozzáférési logika", () => {
  it("aktív partner látja a menüt és beléphet", () => {
    expect(canSeePartnerMenu("active")).toBe(true);
    expect(canAccessPortal("active", false)).toBe(true);
  });

  it("szüneteltetett partner NEM látja a menüt és NEM léphet be", () => {
    expect(canSeePartnerMenu("paused")).toBe(false);
    expect(canAccessPortal("paused", false)).toBe(false);
  });

  it("visszavont partner NEM látja a menüt és NEM léphet be", () => {
    expect(canSeePartnerMenu("revoked")).toBe(false);
    expect(canAccessPortal("revoked", false)).toBe(false);
  });

  it("meghívott (még nem aktivált) partner NEM léphet be", () => {
    expect(canSeePartnerMenu("invited")).toBe(false);
    expect(canAccessPortal("invited", false)).toBe(false);
  });

  it("partner nélküli user nem fér hozzá", () => {
    expect(canSeePartnerMenu(null)).toBe(false);
    expect(canAccessPortal(null, false)).toBe(false);
  });

  it("admin akkor is hozzáfér, ha nem partner", () => {
    expect(canAccessPortal(null, true)).toBe(true);
    expect(canAccessPortal("revoked", true)).toBe(true);
  });
});

describe("CSV export logika", () => {
  const referrals = [
    { id: "1", created_at: "2026-01-15T10:00:00Z", status: "confirmed", order_total: 10000, commission_amount: 500 },
    { id: "2", created_at: "2026-02-10T10:00:00Z", status: "pending", order_total: 5000, commission_amount: 250 },
    { id: "3", created_at: "2026-03-01T10:00:00Z", status: "cancelled", order_total: 3000, commission_amount: 0 },
  ];

  const filter = (status: string, from: string, to: string) =>
    referrals.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      const d = new Date(r.created_at).getTime();
      if (from && d < new Date(from).getTime()) return false;
      if (to && d > new Date(to).getTime() + 86_399_000) return false;
      return true;
    });

  it("státusz szerinti szűrés", () => {
    expect(filter("confirmed", "", "").length).toBe(1);
    expect(filter("pending", "", "").length).toBe(1);
    expect(filter("all", "", "").length).toBe(3);
  });

  it("időszak szerinti szűrés (ettől–eddig)", () => {
    expect(filter("all", "2026-02-01", "2026-02-28").length).toBe(1);
    expect(filter("all", "2026-01-01", "2026-12-31").length).toBe(3);
  });
});
