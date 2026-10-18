# Instructions for Codex — Мобильный прораб

## Read first
1. `docs/specification.docx` is the primary source of truth for functional behavior, persistence, state transitions, data contracts, and acceptance criteria.
2. `docs/CODEX_CONTEXT.md` summarizes previous decisions and the current implementation. It is subordinate to the specification.
3. Inspect the actual repository before editing. A file's presence does not prove its implementation is correct.

## Working agreement
- Continue this existing repository; do not recreate the project or introduce React/Vue/Angular without explicit approval.
- Backend: Java 21, Spring Boot, Gradle, PostgreSQL, JPA, Flyway. Frontend: plain HTML/CSS/ES modules.
- Backend packages are feature-oriented with explicit `controller`, `dto`, `service`, `repository`, `entity`, and `model` boundaries; shared cross-cutting concerns live in `common` and `config`.
- Never expose JPA entities as REST DTOs. Validate input on the server. Keep business rules in the service/domain layer, not in controllers.
- Treat screen designs as draft visuals. Preserve specified behavior, flow, field requirements, data persistence, and acceptance criteria.
- CP-01 creates a draft only on Continue; CP-02–04 persist only on Continue; CP-05 saves finish level and initiates estimate as one user action; CP-06 activates and opens DB-01.
- Use optimistic locking for changes; preserve unsaved local edits on network errors and do not overwrite server state without conflict handling.
- Do not invent a real estimate formula: the specification explicitly excludes it. Label any placeholder implementation clearly.
- Avoid logging addresses and other personal data. Do not commit credentials.
- Prefer small, reviewable changes. Add/update tests for each changed behavior and link test names to acceptance criteria when useful.
- Before saying a test passed, run it. If build tooling, network, or Docker are unavailable, report the exact limitation.
- Never silently change the specification or claim unimplemented features are done.

## First task when opening the repo
Read `docs/CODEX_CONTEXT.md`, inspect the backend and frontend, verify available build tools, run available tests, and produce a concise gap report against `docs/specification.docx`. Do not start a rewrite before presenting the gap report.
