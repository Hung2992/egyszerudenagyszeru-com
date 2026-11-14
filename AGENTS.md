# Architecture rules

- The dedicated Social AI center reuses existing marketing studios and reads the existing social queue; planned orchestration is explicitly distinguished from implemented workflows to avoid duplicate data and false capability claims.
- Social publication uses payload-bound expiring human approval and service-only transactional claim/preflight/receipt RPCs on every path; uncertain provider outcomes never trigger automatic resends, preventing duplicate external effects.
- Social test/live publication capabilities are stored separately from admin roles; test-only drafts never reach provider adapters, and each approval/attempt captures immutable content and verified actor identity.

- EMPYREAN is a control plane over existing domain systems, not a duplicate commerce database; authoritative records remain in their existing domains.
- Keep shared governance schemas in `src/lib/empyrean-contracts.ts`; client validation is advisory and must be re-enforced by the backend before privileged execution.
- Until durable approval, audit, emergency pause and independent verification are proven on the live backend, EMPYREAN's foundation interface may only change data through backend-enforced approved actions (propose, approve, execute, verify, rollback RPCs) and must not invoke legacy autonomous runners.
- AEGIS automatically isolates an AI agent only on repeated output leaks, never on attacker-triggerable signals (blocked inputs, prompt-leak canary hits, cost spikes); those only alert, so attackers cannot disable a customer-facing assistant.
- Workforce assistants share explicitly confirmed knowledge and recipient-scoped handoffs through the existing Agent Bus and an audited admin RPC; shared text is untrusted context, never execution authority.
- Workforce performance is derived from persisted step states under non-cancelled owned plans; completion and share of completed team steps are separate metrics, not measured human attendance.
- Render any partner/user-authored HTML only through `sanitizeHtml` (`src/lib/sanitize-html.ts`); stored HTML is untrusted.
- Server functions fetch caller- or partner-chosen URLs only via `safeFetch` (`_shared/safe-url.ts`) to block internal-network access.
- Scheduled/internal function paths are trusted only via `isInternalCall`/`requireInternalOrAdmin` (cron secret header or service key), never a query flag; provider callbacks require a URL token and fail closed when it is unset.

- Spreadsheet exports build cells only via `csvCell`/`toCsv` (`src/lib/csv.ts`) so stored text can never run as a formula.
- Caller-supplied chat history passes through `sanitizeChatMessages` and free text in PostgREST filters through `filterSafe` (`_shared/chat-input.ts`); redirects/returns use `appOrigin` (`_shared/app-origin.ts`); log emails only via `maskEmail`.
