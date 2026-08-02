#!/usr/bin/env node
/*!
 * Outfitter part: version-badge v1.0.0 — the stamping script
 *
 * Reads the version out of CHANGELOG.md and writes site/version.json for the
 * badge to read at runtime. This is what keeps CHANGELOG.md the single source of
 * truth for the version (PROJECT_STANDARDS §2) — nothing else in the repo
 * repeats the number, so it can never disagree with itself.
 *
 * Copy into your project as tools/stamp-version.mjs and wire it into deploys:
 *
 *   "scripts": {
 *     "stamp": "node tools/stamp-version.mjs",
 *     "deploy": "npm run stamp && wrangler deploy",
 *     "deploy:staging": "npm run stamp && wrangler deploy --env staging"
 *   }
 *
 * Now every deploy re-stamps, and the badge on the live site always matches the
 * top of the changelog. Add site/version.json to .gitignore — it's a build
 * output, not source.
 *
 * Options (all optional):
 *   --changelog <path>   default: CHANGELOG.md
 *   --out <path>         default: site/version.json
 *   --project <id>       default: the "name" from wrangler.jsonc, else package.json
 *   --changelog-url <url>  a link the badge shows as "What's new →"
 *   --quiet
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const argv = process.argv.slice(2);
function flag(name, fallback = null) {
  const i = argv.indexOf(`--${name}`);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
}
const quiet = argv.includes('--quiet');

const changelogPath = flag('changelog', 'CHANGELOG.md');
const outPath = flag('out', path.join('site', 'version.json'));
const changelogUrl = flag('changelog-url');

/* ---------- the version ---------- */

if (!fs.existsSync(changelogPath)) {
  fail(
    `no changelog at ${changelogPath}\n` +
      `Every Atlas project is versioned from its CHANGELOG.md. Create one with a ` +
      `heading like "## [0.1.0] - ${today()}" and run this again.`
  );
}

const changelog = fs.readFileSync(changelogPath, 'utf8');

// Accept the shapes real Atlas changelogs use:
//   ## [0.4.2] — 2026-07-30
//   ## [0.4.2]
//   ## v0.4.2 - 2026-07-30
//   ## 0.4.2
// "Unreleased" is skipped — it isn't a version anyone is running.
const headingRe = /^##\s+(?:\[\s*v?(\d+\.\d+\.\d+[^\]\s]*)\s*\]|v?(\d+\.\d+\.\d+[^\s]*))\s*(?:[-–—:]\s*(\d{4}-\d{2}-\d{2}))?/gim;

let version = null;
let date = null;
let match;
while ((match = headingRe.exec(changelog)) !== null) {
  const candidate = match[1] || match[2];
  if (!candidate) continue;
  version = candidate;
  date = match[3] || null;
  break;
}

if (!version) {
  fail(
    `could not find a version heading in ${changelogPath}\n` +
      `Expected something like:  ## [0.1.0] - ${today()}\n` +
      `(An "## [Unreleased]" section is fine, but there must be a real version below it.)`
  );
}

/* ---------- project id ---------- */

let project = flag('project');
if (!project) project = nameFromWrangler() || nameFromPackage() || null;

/* ---------- git commit (best effort) ---------- */

let commit = null;
let dirty = false;
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
  const status = execSync('git status --porcelain', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
  dirty = status.length > 0;
} catch {
  // No git (CI checkout without history, or a plain folder) — the commit is a
  // nicety, not a requirement.
}

/* ---------- write ---------- */

const payload = {
  version,
  date,
  project,
  commit: commit ? commit + (dirty ? '+local' : '') : null,
  builtAt: new Date().toISOString(),
  ...(changelogUrl ? { changelog: changelogUrl } : {}),
  _generatedBy: 'outfitter/version-badge stamp-version.mjs',
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');

if (!quiet) {
  const bits = [`v${version}`];
  if (date) bits.push(date);
  if (payload.commit) bits.push(payload.commit);
  console.log(`stamped ${outPath} — ${bits.join(' · ')}`);
}

/* ---------- helpers ---------- */

function nameFromWrangler() {
  for (const file of ['wrangler.jsonc', 'wrangler.json']) {
    if (!fs.existsSync(file)) continue;
    // wrangler.jsonc allows comments, so read the name with a regex rather than
    // pretending it is strict JSON.
    const m = fs.readFileSync(file, 'utf8').match(/"name"\s*:\s*"([^"]+)"/);
    if (m) return m[1];
  }
  return null;
}

function nameFromPackage() {
  if (!fs.existsSync('package.json')) return null;
  try {
    return JSON.parse(fs.readFileSync('package.json', 'utf8')).name || null;
  } catch {
    return null;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fail(message) {
  // Fail the deploy rather than shipping a site whose badge says "unversioned".
  console.error(`stamp-version: ${message}`);
  process.exit(1);
}
