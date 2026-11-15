import { describe, it, expect } from "vitest";
import { socialErrorHint } from "./social-error-hint";

describe("socialErrorHint", () => {
  it("Facebook page-permission error tells to post manually", () => {
    expect(socialErrorHint("facebook", "Provider [403]: requires both pages_read_engagement and pages_manage_posts")).toMatch(/kézzel/);
  });
  it("TikTok missing scope tells to upload manually", () => {
    expect(socialErrorHint("tiktok", 'Provider [401]: {"code":"scope_not_authorized"}')).toMatch(/nincs posztolási joga/);
  });
  it("no error gives no hint", () => {
    expect(socialErrorHint("facebook", null)).toBeNull();
  });
});
