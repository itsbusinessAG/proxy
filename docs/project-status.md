# Projekt-Status & Übergabe

> Stand: 2026-11-07. Kompakte Momentaufnahme nach dem Org-Umzug meinTest → **itsbusiness AG**.
> Start für Setup/Betrieb: [`docs/DEVELOPMENT.md`](DEVELOPMENT.md). Config-Referenz: [`docs/configuration.md`](configuration.md).

## Was das ist
Zweisprachige (DE/EN) Landing + Lizenz-/Onboarding-/Delivery-/Billing-**Proxy** für zwei Produkte:
**FW** (CC-Testframework, npm) und **TMT** (Verify Test Management, Electron). Next.js 16 (App Router), Vercel.

## Infrastruktur (nach Cutover)
- **Repo:** `itsbusinessAG/proxy` (dieses Repo). Frischer Single-Commit-Import, kein Transfer.
- **Vercel-Projekt:** `cc-testframework-landing` — **Projektname nicht ändern** (bestimmt die Default-Domain `itsbusiness.vercel.app`, die in ausgelieferten TMT-Clients hart verdrahtet ist). Canonical-Domain: `app.itsbusiness.ch`.
- **Release-Repos:** Framework `itsbusinessAG/tfw`, TMT `itsbusinessAG/tmt` (beide privat).
- **GitHub App:** `itsbusiness-proxy-app`, App-ID **5596356**, Org `itsbusinessAG`, Installation **178500416** (nur Repo `tmt`). Rechte: `contents:write` + `issues:write` (Issues ist **interim**, siehe Offene Punkte).
- **Env (Prod, in Vercel — nicht im Repo):** `GH_ORG=itsbusinessAG`, `GH_TMGMT_REPO=tmt`, `FEEDBACK_REPO=itsbusinessAG/tmt`, `GH_APP_*`, `GH_PACKAGES_TOKEN` (Classic PAT, `read:packages`). Stripe **nur TEST-Key**. Keygen/Resend unverändert.

## npm-Scope
Der Proxy bedient **ausschließlich `@itsbusinessag/*`** (GitHub Packages). Der alte `@meintest`-Scope wurde vollständig entfernt (→ 403). Lizenz-Gate akzeptiert weiterhin **beide** Produkt-Lizenzen (FW oder TMT).

## Offene Punkte
1. **Feedback → Jira umbauen:** In-App-Feedback soll von GitHub-Issues auf **Jira-Projekt `ICT`** (Intern_VTM) umziehen, **voller Round-Trip** (Anlegen + Liste + Status + Withdraw), bei unverändertem `/api/feedback`-Client-Vertrag. Danach: App-Permission `Issues` wieder entfernen und `Contents` auf **Read-only** reduzieren. Auth in Prod über ein Jira-API-Token (Service-Account), nicht über den MCP-Connector.
2. **Quickstart-Seiten selbst hosten:** aktuell zeigen `app/cc-testframework/page.tsx`, die Defaults in `app/api/signup/lib/perform.ts` und `.env.example` (`QUICKSTART_URL_*`) noch auf `meintest.github.io/...`. Neuer Host folgt in eigenem Task.
3. **Repo-Sichtbarkeit prüfen:** `itsbusinessAG/proxy` ist aktuell **public** — falls nicht gewollt, auf privat stellen.

## Entwickeln
```bash
npm install
npm run dev     # http://localhost:3000
npm test        # Node test runner (aktuell 203 Tests)
npm run build   # next build --webpack (NICHT auf plain next build zurück — Turbopack/next-font bricht)
```
Deploy: Push auf `main` → Vercel auto-deploy. Das Repo nutzt **keine PRs** (direkt auf `main`).
