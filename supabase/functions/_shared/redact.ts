// Mask personal data before it reaches server logs.
export function maskEmail(email: unknown): string {
  if (typeof email !== "string" || !email.includes("@")) return "[redacted]";
  const [user, domain] = email.split("@");
  return `${user.slice(0, 1)}***@${domain}`;
}
