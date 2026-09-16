import { describe, it, expect, beforeEach } from "vitest";
import { setCampaignAttribution, getCampaignAttribution, clearCampaignAttribution } from "@/lib/campaign-attribution";

describe("campaign attribution", () => {
  beforeEach(() => localStorage.clear());

  it("megjegyzi a kampányt kattintás után", () => {
    setCampaignAttribution("plan-1");
    expect(getCampaignAttribution()).toBe("plan-1");
  });

  it("24 óra után lejár", () => {
    setCampaignAttribution("plan-1");
    expect(getCampaignAttribution(Date.now() + 25 * 3600_000)).toBeNull();
  });

  it("törölhető", () => {
    setCampaignAttribution("plan-1");
    clearCampaignAttribution();
    expect(getCampaignAttribution()).toBeNull();
  });

  it("üres tárolónál null", () => {
    expect(getCampaignAttribution()).toBeNull();
  });
});
