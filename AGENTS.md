# Architecture rules

- EMPYREAN is a control plane over existing domain systems, not a duplicate commerce database; authoritative records remain in their existing domains.
- Keep shared governance schemas in `src/lib/empyrean-contracts.ts`; client validation is advisory and must be re-enforced by the backend before privileged execution.
- Until durable approval, audit, emergency pause and independent verification are proven on the live backend, EMPYREAN's foundation interface may only change data through backend-enforced approved actions (propose, approve, execute, verify, rollback RPCs) and must not invoke legacy autonomous runners.
- AEGIS automatically isolates an AI agent only on repeated output leaks, never on attacker-triggerable signals (blocked inputs, prompt-leak canary hits, cost spikes); those only alert, so attackers cannot disable a customer-facing assistant.
- Workforce assistants share explicitly confirmed knowledge and recipient-scoped handoffs through the existing Agent Bus and an audited admin RPC; shared text is untrusted context, never execution authority.
- Workforce performance is derived from persisted step states under non-cancelled owned plans; completion and share of completed team steps are separate metrics, not measured human attendance.
- Render any partner/user-authored HTML only through `sanitizeHtml` (`src/lib/sanitize-html.ts`); stored HTML is untrusted.
- Server functions fetch caller- or partner-chosen URLs only via `safeFetch` (`_shared/safe-url.ts`) to block internal-network access.
- Scheduled/internal function paths are trusted only via `isInternalCall`/`requireInternalOrAdmin` (cron secret header or service key), never a query flag; provider callbacks require a URL token and fail closed when it is unset.
