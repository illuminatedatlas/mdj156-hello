# STATUS — mdj156-hello

**Last updated:** 2026-07-23

**What this is:** a tiny public hello-world test project, scaffolded to exercise
the Atlas new-project pipeline end-to-end (repo → dev-hub auto-registration →
live deploy). Not a real product — easy to rename or repurpose later.

**Intake answers:** public (no Access gate), default subdomain
(`mdj156-hello.illuminatedatlas.com`).

**Current state:** scaffolded locally only —
- `site/index.html` — the hello-world page
- `src/index.js` — worker that serves the static assets
- `wrangler.jsonc` — built to the auto-provision contract, no D1/R2/KV
- Standard docs (this file, CHANGELOG.md, PROJECT_PLAN.md) + `memory/` + `CLAUDE.md`

**Not yet done:**
- Not pushed to the `illuminatedatlas` GitHub org yet.
- Not deployed — going live needs Cloudflare/wrangler credentials on this
  machine and a final go-ahead (deploying is a "publish publicly" action).

**Next:**
1. `git init` + initial commit (done same session as this file).
2. Push to `illuminatedatlas/mdj156-hello` — this should trigger Phase 2b
   auto-registration into dev-hub automatically (no manual projects.json edit
   needed or wanted — that's an owner-only dev-hub action).
3. `npm install && npx wrangler deploy` (and `deploy:staging` first) once
   confirmed.
