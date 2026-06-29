import { describe, it, expect, vi, beforeEach } from "vitest";
import { classifyTokenError, getRecoverySessionId } from "@/lib/password-recovery-analytics";

describe("password-recovery-analytics", () => {
  beforeEach(() => sessionStorage.clear());

  it("classifies expired tokens", () => {
    expect(classifyTokenError("Token has expired")).toBe("token_expired");
    expect(classifyTokenError("Email link is invalid or has expired")).toBe("token_expired");
  });

  it("classifies invalid tokens", () => {
    expect(classifyTokenError("invalid token")).toBe("token_invalid");
    expect(classifyTokenError(null)).toBe("token_invalid");
    expect(classifyTokenError(undefined)).toBe("token_invalid");
  });

  it("returns stable session id across calls", () => {
    const a = getRecoverySessionId();
    const b = getRecoverySessionId();
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(5);
  });
});

describe("recovery URL detection (mirror of usePasswordRecoveryRedirect logic)", () => {
  const isRecoveryUrl = (search: string, hash: string, pathname: string) =>
    (hash.includes("type=recovery") || search.includes("type=recovery")) &&
    pathname !== "/reset-password";

  it.each([
    ["?token_hash=abc&type=recovery", "", "/", true, "valid query token"],
    ["", "#access_token=x&type=recovery", "/", true, "valid hash token"],
    ["?token_hash=abc&type=recovery", "", "/reset-password", false, "already on reset"],
    ["", "", "/", false, "no token"],
    ["?type=recovery", "", "/admin", true, "deep route with token"],
  ])("%s + %s on %s -> %s (%s)", (s, h, p, expected) => {
    expect(isRecoveryUrl(s, h, p)).toBe(expected);
  });
});
