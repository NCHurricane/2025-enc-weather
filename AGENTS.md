# NCHurricane Repository Instructions

These instructions apply to the entire repository. A more specific `AGENTS.md`
may add rules for a subtree. The user's current request is authoritative; newer,
task-specific handoff documents supply implementation status but do not expand
the authorized scope on their own.

## Working principles

- Begin when the task is clear. Ask only when missing information would
  materially change the result or authorize a risky action.
- Make the smallest coherent change that completely handles the authorized
  task. Avoid unrelated refactoring, formatting, dependency changes, source
  migrations, cleanup, or speculative follow-on phases.
- A request to plan, inspect, diagnose, audit, or document is read-only unless
  the user also authorizes implementation.
- A phase or roadmap entry is not authorization. Stop at every documented gate
  unless the user explicitly authorizes the next phase.
- Preserve page-specific behavior. Shared code should expose reusable engines
  or utilities; page controllers should continue to own their page lifecycle.
- Treat user-reported behavior and design choices as contracts. Do not silently
  replace an accepted workflow with a technically similar one.
- Act as a candid, evidence-based design and engineering partner. When a user
  proposal would weaken UI/UX, accessibility, maintainability, consistency, or
  an existing product contract, explain the concern and recommend a stronger
  alternative instead of merely implementing it; respect the user's final
  decision after the tradeoff is clear.

## Start-of-task checklist

Before editing:

1. Read this file and any more specific instructions.
2. Run `git status --short` and a short recent log such as
   `git log -5 --oneline`.
3. Identify modified, staged, untracked, ignored, fixture, cache, and generated
   files relevant to the task. Assume existing changes are user-owned unless
   the current task proves otherwise.
4. Read only the relevant current handoff and source contracts:
   - Tropical or active-storm work:
     `docs/tropical-map-next-session-plan.md`. Consult the applicable
     historical Phase 0-3 record under
     `docs/archive/tropical-map/2026-08/` only when its evidence is relevant.
   - County UI, statewide conditions, alerts, markers, or shared county maps:
     `docs/county-ui-next-session-plan.md`.
   - SEO, analytics, launch, headers, or account-owned marketing work:
     `docs/marketing-readiness.md`.
   - General architecture, local setup, cache jobs, and deployment:
     `README.md`.
5. Inspect imports, callers, tests, cache-busting query strings, and current
   versioned asset references before patching shared modules.
6. State the preservation boundary when the work overlaps dirty files,
   generated data, current fixtures, production behavior, or a phased plan.

Do not stage, commit, push, deploy, alter production data, change scheduler or
cron state, or run destructive cache maintenance unless the user explicitly
requests that action. If staging is authorized, stage only the task's hunks.

## Project architecture

- The frontend is hand-built HTML, mobile-first CSS, and native ES modules.
  There is no bundler or transpilation step.
- The backend and cache jobs target PHP 8.4. File-based JSON/GeoJSON is the data
  store; there is no application database.
- Core external libraries are loaded in the browser, including Leaflet 1.9.4,
  D3, Chart.js, and Font Awesome. Do not introduce a framework or build system
  as an incidental change.
- Official NWS, NHC, NOAA/NESDIS, and USGS sources are authoritative. Verify
  live upstream filenames, schemas, timestamps, and availability when a change
  depends on them; old observations in documentation are not proof of current
  behavior.
- Cache publishers must remain bounded, lock-aware where concurrency is
  possible, and atomic (temporary file plus rename/publication commit point).
  A failed refresh must preserve last-known-good data when the existing
  contract does so.
- Browser code consumes normalized local data. Do not move KMZ extraction,
  untrusted document parsing, or broad upstream aggregation into the browser.
- Keep TLS verification enabled for upstream PHP requests. Use a trusted CA
  bundle; never solve a local certificate problem by disabling verification.

## Data and safety contracts

- Never fabricate alerts, outlooks, advisories, warnings, hazards, storm data,
  station observations, analytics IDs, verification tokens, or source text.
- Distinguish legitimate empty data, stale data, partial failure, unavailable
  data, and loading state. An upstream failure is not "no activity."
- Validate identity before publication or rendering. Never substitute one
  storm, basin, county, zone, station, advisory, or cache package for another.
- Treat ignored cache files, logs, generated imagery, storm directories, and
  test output as runtime artifacts, not cleanup targets. Do not delete or
  commit them without task-specific authorization.
- `active/cache/nhc_current_storms.json` is intentionally retained fixture/state
  in source control. Do not edit it to simulate a live storm or make an archive
  appear current unless a specifically authorized deterministic test requires
  it, and never absorb a user's edit to it opportunistically.
- `counties/data/*-current.json`, county weather output, tropical map cache,
  logs, and `test/output/` are generated. Tests may create bounded ignored
  output, but production/generated files must not be used as disposable test
  fixtures.
- Use immutable or disposable non-production fixtures for missing, stale,
  multi-alert, active-storm, archive, and provider-failure cases. Remove only
  temporary files created by the current task.
- Never commit secrets or local environment files. `test/.env` and `.env` stay
  local. The maintenance dashboard must remain disabled unless explicitly
  configured, password-hashed, and IP-restricted.
- Any material deletion, archive purge, or irreversible cleanup requires fresh
  explicit approval after the exact paths, size/scope, and recovery risk are
  stated.

## Durable product contracts

### Tropical overview and active storms

- Keep responsibilities distinct: the canonical Tropical overview shows basin
  basics (active systems, tracks/cones, and areas of interest); `/active` owns
  granular storm-specific layers, products, and controls.
- Preserve URL-addressable Atlantic, Eastern Pacific, and Central Pacific basin
  state and the server-owned redirects from the retired `tropical_at` and
  `tropical_ep` paths to the canonical Tropical basin query.
- Preserve the outlined Tropical/Active SVG wordmark, its counterclockwise
  flashing cyclone animation, reduced-motion fallback, and accessible
  `NCHurricane home` label.
- The overview Satellite view is basin-only. Do not center it on or select a
  current storm; storm/floater targeting belongs to `/active`.
- Keep Clean IR as the overview Satellite default and preserve the shared
  product legend semantics and NOAA STAR fallback unless the user approves a
  source/product change. Source freshness is an acceptance criterion; a more
  global but materially delayed mosaic is not an equivalent replacement.
- Use the shared Leaflet engine with explicit overview/storm modes, separate
  controllers, named groups, one map instance per page, generation/abort
  protection, escaped accessible popups, source timestamps, and explicit
  loading/empty/stale/unavailable states.
- Convert NHC KMZ/GIS inputs server-side with bounded extraction and
  non-networked parsing. Publish validated JSON/GeoJSON atomically, retain
  last-known-good packages, and require exact ATCF storm identity.
- Central Pacific geometry must remain date-line safe: canonical normalization,
  split crossing geometry, bounded rendering, and no duplicate world-wrap
  markers or near-global fit bounds.
- Human-facing popups may link to readable official NHC pages, never directly
  to KMZ downloads. Unknown source-link mappings fail closed.
- Preserve text products, English/Espanol/Francais graphics behavior, archived
  storm files, official-link behavior, satellite/radii workflows, and
  script-owned DOM IDs until replacement parity is validated and the user
  approves removal.

### County, homepage, and shared maps

- Preserve standard single-zone behavior and the multi-zone lifecycle for
  Dare, Hyde, and San Diego, including URL/localStorage state, active-zone data
  paths, and invalid-zone normalization. San Diego retains its intended local
  conditions source and local exceptions.
- Do not change stations, order, zones, provider/product selectors, fallback
  order, county backgrounds, meteogram behavior, or generated data as collateral
  to UI work.
- Preserve the accepted centered alert dialog behavior: 95% width, responsive
  selector grid without horizontal scrolling, internal content scrolling,
  focus restoration, Escape/Close/backdrop dismissal, scroll locking, and
  left/right/Home/End selector navigation. Report shared source bulletins
  accurately; do not manufacture event-specific text.
- Conditions markers remain viewport-aware and collision-thinned; configured
  county/zone centers and responsive zoom policies remain authoritative. A
  selected marker with an open detail panel remains mounted until its detail
  closes.
- Preserve working interactive-map controls, frame counts, playback/pause,
  manual scrubbing, legends, boundary behavior, basemaps, fallbacks, and
  responsive layout. Retained ready tile-layer pools prevent animation flashes;
  readiness timing alone is not an equivalent implementation.
- Editorial city priorities belong only in
  `js/data/map-city-favorites.json`, using explicit `tropical`, `homepage`, and
  `county` scopes plus `minZoom`. Do not edit or regenerate large source/derived
  city datasets merely to add a favorite. A scope must never leak into another
  map family.
- If the user designates a prototype such as
  `counties/bertie/index_test.html`, work there first and do not promote it to a
  live page without explicit authorization.

### Public pages, metadata, and accessibility

- Preserve canonical URLs, Open Graph/Twitter metadata, sitemap/robots rules,
  structured data, analytics consent behavior, and compatibility redirects
  unless they are in the authorized scope.
- Keep metadata internally consistent: canonical and `og:url` must agree with
  the intended public route, social-image type/dimensions/alt text must match
  the asset, and legacy/test pages must retain their indexing policy.
- Do not add placeholder analytics IDs, Search Console tokens, outcome claims,
  or account-owned configuration. Production account verification is an owner
  step and a separate evidence category.
- Preserve skip links, semantic main targets, keyboard access, focus behavior,
  accessible labels, dialog semantics, reduced-motion behavior, readable
  loading/error states, and no-horizontal-overflow requirements.
- The site is informational and must continue to direct life-safety decisions
  to official agencies. Do not imply that NCHurricane issues warnings or that
  locally processed data supersedes NWS/NHC products.

## Editing and documentation rules

- Search narrowly first with `rg`/`rg --files`. Expand to imports, callers,
  sibling page variants, tests, and runtime evidence only when necessary.
- Prefer focused patches. Preserve line endings and unrelated formatting.
- Check the current cache-busting query before editing a versioned asset; update
  every affected consumer consistently, but do not bump unrelated assets.
- Shared-module changes require checking every consuming page family. Do not
  assume homepage, Tropical, standard county, multi-zone county, San Diego, and
  active-storm controllers have identical ownership or configuration.
- Keep changing status, commit IDs, open findings, validation evidence, and
  phase gates in the relevant handoff document rather than freezing them in
  this durable instruction file.
- Update a handoff only when the task changes its behavior, phase status,
  preservation boundary, validation record, or next-session instructions. Do
  not rewrite historical evidence to make a current result look complete.
- Record user-confirmed owner smoke exactly as owner evidence. Do not promote it
  to controlled-browser evidence, and do not infer either from tests.

## Validation gates

Run the narrowest meaningful checks first, then expand according to impact.
Report each category separately; one category never substitutes for another.

### 1. Static and automated checks

- Run `node --check` for every changed JavaScript file.
- Run `php -l` for every changed PHP file.
- Parse every changed JSON, JSON-LD, GeoJSON, webmanifest, or XML file and run
  task-specific schema/identity checks.
- Run focused tests for the changed subsystem. Tropical/shared-map coverage is
  under `test/tropical-map/`; storm-product state coverage is under
  `scripts/tests/`.
- Run `node scripts/validate-site.mjs` when HTML, navigation, metadata,
  compatibility routes, shared references, active-storm contracts, or public
  data files could be affected.
- Run `git diff --check` and a focused reference search for removed/renamed
  selectors, scripts, styles, IDs, routes, products, or source URLs.
- The CI baseline in `.github/workflows/site-quality.yml` lints all PHP, checks
  all JavaScript syntax, and runs the site validator. Passing focused checks
  does not waive this baseline when the change reaches Git.

### 2. Fixture, runtime, and HTTP/API checks

- Use deterministic fixtures for parsers, source states, basin/date-line cases,
  exact storm identity, alerts, and archive behavior.
- For cache/publisher changes, exercise success, legitimate empty, stale,
  partial failure, complete failure, lock/concurrency where relevant, and
  last-known-good preservation without touching production data.
- Serve the site through PHP for features that depend on PHP, rewrites, fetches,
  or cache files. A static file server is not equivalent.
- Record HTTP status, schema/identity, source timestamps, and the expected
  visible state. A `200` alone does not prove correct data or rendering.

### 3. Controlled-browser checks

Required for visible HTML/CSS, navigation, interaction, or map behavior unless
the user explicitly accepts a narrower gate. At minimum cover a representative
desktop viewport near `1280x900` and mobile near `390x844`.

- Check keyboard navigation, focus restoration, Back/Forward and refresh where
  URL state exists, direct/deep links, dialogs/popups, responsive layout, and
  horizontal overflow.
- For maps, check rapid basin/zone/product switching, controls, legends,
  markers/layers, playback, pause, scrubbing, fallback behavior, and stale-load
  cancellation as applicable.
- Inspect both browser console and network behavior. Report visible acceptance,
  console errors/warnings, and provider failures separately.
- If browser control is unavailable, say so and leave browser validation open.
  Syntax, tests, native decoding, HTTP probes, screenshots of static output, or
  logs do not prove interactive browser behavior.

### 4. Owner smoke, external sources, and production

- Owner smoke is separate evidence. Record the exact pages, devices, cases, and
  result the user reports; do not broaden the claim.
- External-provider availability/freshness is separate from local correctness.
  Recheck live NHC/NWS/NOAA contracts when the task depends on them and label
  time-dependent results.
- Local validation does not establish upload, deployment, production PHP
  extensions, scheduler configuration, analytics/search verification, cache
  freshness, or production browser success.
- Deployment requires explicit authorization and a production verification
  checklist. Never say "deployed" or "production passed" based only on local
  files, Git state, or a local server.

## Completion report

Keep the final handoff concise and evidence-based:

- Summarize the requested outcome and list the files changed.
- State the preservation boundary, including unrelated dirty files left alone.
- List validation by category: static/automated, fixture/runtime/API,
  controlled-browser, owner, external-provider, and deployment/production.
- Identify every skipped, blocked, failed, time-dependent, or owner-only gate.
- State whether anything was staged, committed, pushed, deployed, generated,
  or deleted. Never imply one of those actions occurred when it did not.
