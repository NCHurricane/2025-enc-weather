# Sitemap-Wide CSS Architecture and UI Standardization Plan

## Map-first prototype separated into V2 — 2026-09-09

The owner requested that the archived map-first Home/Bertie/Dare UI and workflow
be excluded from this repository and become the separate local project
`K:\Web Design\NCHurricane V2`. Its README and `docs/v2-project.md` own the source,
manual edits, roadmap, and validation history. V1 ignores its retained prototype
files/archive/tests and removes only their six CSS-contract entries. V1 work must
not depend on those ignored files. Prototype development and live adoption remain
paused until a new owner request. The older prototype approvals and startup
prompts below are historical. Existing main-site CSS/short-height work and the
mobile Home alert drawer remain preserved; this is not a rollback.

Updated: 2026-09-09
Repository: `K:\Web Design\NCHurricane 2025`  
Status: Phases 0-9 and their two local closeout repairs are committed in `04f8502`. The owner authorized the reviewed typography-token and fluid-padding changes as the first bounded Phase 10 slice on 2026-09-09. That slice is implemented locally and included in the CSS checkpoint described below. Further layout requests remain pending. Actual-device, text-zoom, populated-alert, provider-freshness, and production evidence remain separate; no deployment is established.

The pre-Phase 9 Tropical active-system chip and mobile weather-tab corrections
remain intact. Phase 9 advances all layered CSS and shared-map dependency
consumers atomically to `20260831-phase9-2` for the short-height correction.

Authorization boundary: this document is a roadmap, not authorization to begin a phase, stage, commit, push, deploy, change production data, alter scheduler state, or delete generated/runtime files.

## Phase 10 first slice: typography tokens and fluid padding — 2026-09-09

Git checkpoint: the owner requested "Ok, let's commit and checkoint". This record
accompanies `Simplify shared CSS tokens and smooth responsive spacing`, based on
`04f8502`, covering the five stylesheets, ownership contract, 17 HTML reference
updates, and three handoffs. The 11 focused tests, 80 application JS/MJS syntax
checks, 70 PHP lints, site validator, and reference-only HTML comparison passed
again before commit. Browser evidence below comes from the implementation run;
owner smoke and 200% zoom remain open. No push or deployment is part of this
checkpoint. Resolve its commit ID from Git history when resuming.

The owner approved the preceding CSS audit with "Ok,m make those changes".
The starting tree was clean at `04f8502`. This slice changes five stylesheets:
`css/styles.css`, `css/components.css`, `css/info.css`, `css/tropical.css`, and
`active/css/active.css`.

- The shared typography/tab/menu block now has 29 consumed tokens. The subtab
  font-size token owns the existing clamp; page-title tracking/leading and
  section-heading leading are constants in their shared component rules.
- Information-page section headings and Active module headings express their
  existing size variants through `--section-heading-size`. Compact primary-tab
  overrides are documented beside both defaults and the 680px container rule.
- Eight reversed Active clamps become their existing effective fixed sizes:
  `.9rem` for labels and `1.1rem` for values/center text. This preserves rendered
  typography instead of inventing a new font scale.
- About header padding is fluid from 18 to 48px, Active content panels from
  8 to 20px, and Tropical product panels from 12 to 18px at the default root
  font size. Their fixed mobile padding overrides are removed. Active Map
  deliberately retains its existing desktop zero padding and mobile 8px inset
  when the toolbar reflows. Structural and short-height breakpoints remain.
- All 40 references across 17 HTML consumers use `20260910-css-tokens-1` for
  those five assets. The ownership contract shares per-file version overrides;
  other assets and every HTML behavior/content/metadata remain unchanged.

Static evidence: 11 focused CSS ownership/cascade/responsive tests pass; syntax
checks pass for 80 tracked application JS/MJS and 70 tracked PHP files. Site
validation passes 18 HTML files, 341 JSON files, and 199 local references.
The reference-only HTML comparison, token-consumer audit, and diff checks pass.

Controlled-browser evidence: desktop/mobile comparisons at 1280x900 and 390x844
found no font-size, weight, leading, tracking, color, or shadow differences in
matched sampled elements across Home, Bertie, Dare, San Diego, Tropical, About,
Privacy, and the Active issued fixture. The 57-case responsive sweep includes 390x650,
844x390, intermediate widths, and both sides of the relevant padding thresholds.
No measured document overflow or collapsed visible map was found. About desktop
and mobile, Tropical Graphics, and Active Summary/Map/popup were visually checked.
The About header measures 29.165/29.2/29.235px padding at 719/720/721px, confirming
the old breakpoint jump is removed. Active content padding measures
12.185/12.2/12.215px and Tropical product padding 14.79/14.8/14.81px at
679/680/681px. The explicit map inset exception is preserved.

Interaction checks passed: Home Alerts and Menu Escape restore their own opener;
Home condition and Tropical graphic subtabs support ArrowRight with focus and
selection together; Tropical Graphics/Text panels open; Satellite playback
advances through its 12 frames, pause clears `aria-pressed`, and Home on the
scrubber selects frame zero. Rapid basin switching, Back/Forward, and refresh
retain a valid selected basin (the observed history returned Atlantic, then
Central Pacific on Forward/refresh). Dare Hatteras selection survives reload.
The Active Map tab and Erin popup work in the short mobile viewport.

Runtime evidence uses the existing owner PHP server at 127.0.0.1:8085 and a
temporary loopback fixture router at 8015. The Active response is 200 with the
`issued` fixture header and updated CSS version. Sampled network events include
expected missing Active fixture text/preview files (404), with visible product
unavailability; those are not live-provider results. Some network buffers were
truncated. Captured console warning/error logs in the page-family sweep were
empty. Current caches include stale source times; no freshness claim is made.

Browser zoom shortcuts had no effect in the in-app browser; 200% browser/text
zoom remains unverified. Actual-device touch, populated Home alerts, owner
acceptance of this slice, and production smoke remain separate owner checks.
Weather data, fixtures, navigation behavior, map engines, and ignored V2 files
are preserved. The implementation/validation run did not stage, commit, push,
deploy, change schedulers, generate weather data, or delete repository files.
The later owner-authorized Git checkpoint is recorded above.
The task-created browser tab was closed and its viewport reset; Home's condition
and Dare's zone were restored to Temperature/Mainland. The temporary Active
fixture process was stopped and its two temporary logs removed. The owner's
8085 server still returns 200.

## Resolved local closeout findings — 2026-09-09

The owner requested resolution of the two recorded local closeout items. Both
are now resolved; the earlier discovery and owner report below remain dated
evidence, not current blockers.

### CSS-CLOSE-01: Escape focus ownership — resolved

`js/modules/navigation.js` now ignores Escape when another control has already
handled it or when navigation has no open menu/submenu. An open mobile menu
still closes and focuses Menu; an open desktop submenu closes and focuses its
visible opener. Closing Home Alerts with Escape now retains its own return
focus. All 17 navigation consumers and the ownership contract use
`20260909-navigation-escape-1`; unrelated asset versions remain unchanged.

Five behavioral regressions in `scripts/tests/navigation-escape.test.mjs`
exercise closed navigation, already-handled Escape, mobile menu/submenu closure,
desktop submenu focus, and unrelated keys. Controlled-browser checks confirmed
Home Alerts and mobile Menu focus at `390x650`, plus the desktop Counties submenu
at `1280x900`. No CSS/layout or weather behavior was changed for this repair.

### Short-height controlled-browser verification — completed

- 158 page/state/viewport cases covered all 15 public page routes and the
  dependency-only `404.html` and `counties/bertie/index_test.html`. All had no
  horizontal document overflow; visible maps remained nonzero in size.
- Every page received `1280x900` and `390x844` checks. The representative Home,
  Bertie, Dare, San Diego, Tropical, Active, and About families also received
  `390x650`, `844x390`, `1280x600`, `3840x2160`, `320x650`, `360x650`, `430x844`,
  `768x650`, `1024x650`, and `1440x900`. The six remaining counties also received
  short portrait and landscape checks.
- Additional six-size sweeps exercised Home/Bertie/Tropical Satellite, Dare
  Hatteras Radar, and Active issued Alerts. Short-mobile maps, controls, and
  legends were visually inspected. Ordinary scrolling over Dare's landscape
  map moved the document from 0 to 390 pixels and exposed its timeline and
  legend. Home and Tropical playback, pause, and manual frame selection worked.
- Dare Northern/Hatteras selection and refresh retained the requested zone;
  rapid Tropical basin changes, Back/Forward, and refresh retained basin state.
  The Active storm popup fit within the narrow map (284-pixel popup at 390-pixel
  viewport width) and its close control worked.
- Home/County/Tropical used the existing owner-run PHP server at
  `http://127.0.0.1:8085/`. Active used the existing immutable `AL052025` issued
  fixture through a temporary loopback PHP router on port 8015; no current-storm
  feed or generated weather package was edited. Active Summary, Map, and Alerts
  were exercised; unavailable fixture text products were not treated as live
  source failures.
- Captured browser console warning/error logs were empty. Sampled CDP network
  events had no HTTP errors or uncanceled request failures; expected canceled
  requests occurred during navigation/basin switching. Some older events were
  evicted from the bounded buffer, so this is sampled network evidence, not a
  complete provider audit. Home/County observation caches were stale; no source
  freshness or populated Home-alert result is claimed.

### Automated, runtime, and preservation evidence

The focused suite passed 23/23; the complete tracked V1 JavaScript suite plus
the new navigation tests passed 51/51. Syntax checks passed for all 80 tracked
JavaScript/MJS files and the new test; all 70 tracked PHP files passed lint.
Site validation passed 18 HTML files, 341 JSON files, and 199 local references.
Local Home and the exact Active fixture returned 200 with the corrected
navigation version; the Active response carried the expected fixture header.

Existing documentation edits and the V2 separation were preserved. The change
owns only navigation Escape behavior, its version references, the regression
test, and current handoff evidence. Phase 10 has not started. Actual-device touch,
populated Home alerts, broad provider availability/freshness, and production
verification remain separate evidence. No files were staged, committed, pushed,
or deployed; no scheduler, weather cache, or production data changed. The
temporary browser viewport was reset, the task-created fixture server was
stopped, and its two temporary logs were removed. The owner's 8085 server remains
running. No repository file was deleted.

## Earlier owner acceptance and closeout discovery — 2026-09-09

The owner reported exactly, "Ok, from the dev tools all look good." They also
requested that their remaining layout changes belong to a later phase. Record
this as owner acceptance of the reviewed original-site CSS/UI at the reported
DevTools level. The URL, browser, pages, viewport sizes, individual interactions,
and actual-device touch coverage were not specified. Do not expand this report
into an independent browser matrix, populated-alert verification, or deployment
evidence. The later layout preferences do not reopen the accepted design scope.

Verification before the repair above:

- Static/automated: the focused responsive-scroll, CSS Phase 7 ownership,
  CSS Phase 8 cascade, and basemap suites passed 16/16. The site validator
  passed 18 HTML files, 341 JSON files, and 199 local references.
- Local HTTP: the owner-run PHP homepage at `http://127.0.0.1:8085/` returned
  200 and referenced the Phase 9 styles and original Home drawer assets.
- Controlled-browser spot check: Home at `390x650` had no horizontal document
  overflow and a visible `357x202` Conditions map. The drawer opened and focused
  Close; clicking Close restored focus to its trigger. Escape closed the drawer
  but focused the header Menu button instead of the drawer trigger, reproduced
  twice. The exercised tab had no captured console warnings/errors. Complete
  network/provider coverage and the wider responsive matrix were not rerun.
- Finding CSS-CLOSE-01 as originally recorded: repair the Home drawer Escape focus return and
  verify it together with the navigation menu's own Escape behavior. The drawer
  calls `preventDefault()` and restores its trigger, but the document Escape
  handler in `js/modules/navigation.js` also unconditionally focuses the
  hamburger. This is a keyboard behavior finding, separate from unspecified
  owner layout preferences; no application repair is part of this documentation
  update. The older September 4 focus-pass record remains dated evidence.
- Remaining evidence: full short-height controlled-browser revalidation,
  specifically identified actual-device touch coverage, populated Home alerts,
  source freshness, and staging/production verification remain unestablished by
  this turn. Owner acceptance and technical verification remain separate.

Phase 10 below holds the requested future V1 layout refinements. Its exact
changes have not been supplied and implementation has not started. V2 remains
separate and paused. This update changes only the plan and its County/Tropical
handoff pointers; application files, weather data, existing manual work, and
ignored V2 material are preserved. No staging, commit, push, deployment,
scheduling, cache publication, or deletion was performed by this update.

## Historical implementation and validation records

The dated entries below preserve their original checkpoint evidence. For current
owner acceptance, remaining findings, and continuation scope, use the September 9
closeout record above and the current startup prompt at the end of this plan.

The owner approved the Phase 0 ownership ledger and authorized Phase 1 on
2026-08-24. Phase 1 is complete in the local working tree:

- The exact npm-published Leaflet 1.9.4 runtime previously served by unpkg is
  self-hosted under `vendor/leaflet/1.9.4/`, with its BSD-2-Clause license,
  source archive SHA-256, per-file checksums, and provenance.
- All 14 consumers use the local versioned assets: 12 public map routes, the
  Bertie prototype, and the ignored Tropical Phase 2 harness.
- The temporary pre-layer order is normalized to vendor, global, shared
  components, shared map, shared engine where applicable, then family CSS.
- `scripts/css-ownership-contract.mjs` records the current dependency and order
  contract. `scripts/validate-site.mjs` rejects remote or undeclared Leaflet
  consumers, validates integrity attributes and vendor hashes, and enforces the
  approved order.
- Static checks passed: both changed JavaScript files pass `node --check`, all
  50 Tropical/shared-map tests pass, the site validator passes 20 HTML files,
  307 JSON files, and 184 local references, and `git diff --check` passes.
- Local HTTP checks returned `200` with the expected MIME type and byte length
  for Leaflet CSS, JavaScript, source map, and all five images.
- Desktop controlled-browser checks covered Home, Tropical, every live County,
  the Bertie prototype, the ignored harness, and Active using the retained exact
  `EP092026` state. Mobile checks covered Home, Tropical, a standard County,
  multi-zone County, San Diego, and Active. Maps, controls, attribution,
  basin/zone/product switching, local paths, stylesheet order, and document
  overflow were checked. The exercised Home, Tropical, and Active console
  warning/error logs were empty. `/active/` without a storm parameter retained
  its expected no-storm 404 behavior.

The owner subsequently authorized Wave A Phase 2. Phase 2 is complete in the
local working tree:

- `styles.css` now owns the demonstrated color/surface, type, spacing, radius,
  shadow, border, motion, content-width, interaction-size and z-index tokens.
  The misleading breakpoint custom properties and the vague legacy
  section/shell/radius tokens were removed rather than aliased.
- At the time of Phase 2 validation, the 15 sitemap routes plus the
  dependency-required `404.html`, Tropical compatibility pair, Bertie prototype
  and `index_update.html` used
  `.site-page` family roots and one `.page-shell`. The retired `.container`,
  `.site-weather-page` and `.info-page` roots have no compatibility aliases.
- Home, County and Tropical retain the demonstrated 1200px maximum content
  measure; Active retains its 1600px maximum and narrower mobile gutter; Info
  retains its wider fluid reading surface. The shared breadcrumb offset is
  116px on desktop and 108px on mobile, while no-breadcrumb Home/legacy pages
  retain their 95px/85px rhythm.
- Active map-label variables moved from global `:root` to
  `.site-page--active`. `active/js/ww-maps.js` now reads them through the
  dedicated `data-active-page` hook; desktop/mobile values remained `13` and
  `11` for priority 10 under the retained `EP092026` fixture.
- `scripts/css-ownership-contract.mjs` and `scripts/validate-site.mjs` now
  enforce Phase 2 page roots, shell classes, affected cache versions, retired
  classes/tokens, global token presence and the Active data hook.
- Static checks passed: all three changed JavaScript files pass `node --check`,
  all 73 repository JavaScript tests pass, the site validator passes 20 HTML
  files, 307 JSON files and 184 local references, focused retired-selector and
  cache-version searches are clean, and `git diff --check` passes.
- Local HTTP checks returned `200` for all 20 page/dependency consumers and all
  seven changed CSS/JavaScript assets.
- A temporary same-origin responsive harness exercised all 20 consumers at true
  `1280x900` and `390x844` browsing-context viewports. All 40 cases had one
  shell and zero document-level horizontal overflow. Desktop Home/Active and
  mobile Home were visually inspected. A further 42-case representative sweep
  covered Home, standard County, multi-zone County, San Diego, Tropical,
  deterministic Active and Info at widths 320, 360, 430, 768, 1024 and 1440;
  every case retained one shell and zero document-level overflow. Clean Home,
  Tropical, deterministic Active, Dare and Info console checks had no warnings
  or errors. The
  then-existing dependency-only `index_update.html` retained its pre-existing
  `Container not found for NCCountyMap` console error; Phase 2 did not alter its
  controller contract. The temporary harness was removed after validation.

The owner then separately authorized removal of `index_update.html`,
`tropical_at.html`, and `tropical_ep.html`. That cleanup is complete locally:

- The three HTML files, the now-orphaned `css/index.css`, the compatibility-only
  `js/modules/tropicalCompatibility.js`, and the compatibility-only Tropical CSS
  block are removed.
- Existing `.htaccess` 301 redirects continue to map both extensionless and
  `.html` Atlantic/Eastern Pacific legacy paths to the canonical `/tropical`
  basin query. Old bookmarks therefore remain supported without maintaining
  duplicate HTML resources.
- The current Phase 2 machine contract covers 17 tracked consumers: the 15
  sitemap routes, `404.html`, and the Bertie prototype. The ignored Tropical
  harness remains a Phase 1 Leaflet dependency consumer.
- The validator also guards the five retired files against accidental
  restoration while continuing to require both production 301 rules.
- Historical Phase 1-2 validation counts above describe the pre-cleanup test
  runs and have not been rewritten as current evidence.
- Cleanup validation: syntax passed for the validator and ownership contract;
  all 73 JavaScript tests passed; the site validator passed 18 HTML files, 307
  JSON files, and 162 local references; and `git diff --check` passed.
- Local HTTP returned `200` for canonical Atlantic and Eastern Pacific Tropical
  state and `404` for the two retired dedicated assets. The PHP development
  server does not execute `.htaccess`, so it is not evidence for the production
  redirects.
- Controlled browser at the available `1280x720` viewport preserved one shell,
  zero document overflow, the live Leaflet map, basin selection, URL state, and
  Back/Forward with no console errors. A same-origin `390x844` iframe check
  confirmed the same shell/map/selection/overflow state; it logged one
  iframe-only `MutationObserver` error that did not reproduce in either direct
  canonical tab. Production Apache redirect behavior remains unverified.

The owner then authorized Wave A Phase 3. Phase 3 is complete and is included
in checkpoint commit `edc6a50`:

- `styles.css` now owns bounded page-title, section-heading, card-heading,
  helper, metadata and status-role tokens. `components.css` owns the shared
  `.page-header`, `.page-title`, `.section-heading`, `.card-heading` and
  `.text-role` presentation; family sheets own only demonstrated variants.
- All 15 sitemap routes plus `404.html` and the Bertie prototype use one native
  `h1` with a canonical page-title role. Static `h2` and `h3` content uses the
  section/card roles without changing semantic levels. County forecast regions
  now use an explicit `#forecast-heading` `h2`; the Detailed, Meteogram and
  Discussion labels remain disclosure buttons for Phase 4 rather than being
  misrepresented as headings.
- Tropical and Active title presentation moved out of inline `<style>` blocks.
  Tropical retains its gold branded title. Active retains the `#storm-title`
  and `#storm-id` script hooks, and the designation is now visible on its own
  bounded line at narrow widths instead of being hidden below 640px.
- Dynamic County alert-dialog/card headings and the analytics-consent heading
  use the same semantic visual roles. Their versioned dependency chains were
  updated through the County entry modules and shared Navigation module.
- The legacy title/header aliases and vague text-role classes were removed.
  `navigation.js` no longer assigns a heading role from the brittle
  `section.section-title > div:first-child` structure.
- `scripts/css-ownership-contract.mjs` and `scripts/validate-site.mjs` enforce
  page/title/header roles, one native `h1`, non-skipping heading order, County
  forecast labeling, dynamic heading sources, retired classes/tokens, exact
  stylesheet and JavaScript consumers, and Phase 3 cache versions.
- Static validation passes: all changed JavaScript parses, all 73 native Node
  tests pass, the site validator passes 18 HTML files, 307 JSON files and 166
  local references, focused retired-selector searches are clean, and
  `git diff --check` passes.
- Controlled-browser checks covered the 15 sitemap routes, `404.html`, and the
  Bertie prototype at `1280x900` and `390x844`; representative Home, Tropical,
  Active, San Diego and About checks also passed at `1920x1080` and at a
  640px-wide 200%-reflow equivalent. Every checked route had one visible `h1`,
  no heading-level skip, loaded fonts, bounded long-title wrapping, and zero
  document-level horizontal overflow. Mobile Home, Active and About were
  visually inspected. A clean all-route pass using explicit valid multi-zone
  URLs had no console warnings or errors.
- Browser validation exposed an unrelated retained County defect: after San
  Diego stores `coastal`, opening Dare without a zone query requests
  `counties/dare/data/coastal/{current,forecast,alerts}.json` and receives three
  `404` responses instead of normalizing to a Dare zone. Phase 3 did not change
  County URL/local-storage lifecycle; this evidence remains an open County
  follow-up rather than being absorbed into typography work.

The owner then authorized Wave A Phase 4. Phase 4 is committed in `1f6b0b1`
and has passed owner review:

- Shared BEM blocks now own primary tabsets, subtabs, information cards,
  general buttons, analytics consent, County alert/HWO dialogs, the navigation
  menu, and back-to-top behavior. JavaScript uses IDs or `data-*` hooks and
  `.is-active`/`[hidden]` state; the retired presentation classes have no legacy
  aliases.
- Home, all nine County pages, Tropical, Active, the three information pages,
  `404.html`, and the Bertie prototype use the new component contracts. Active
  dynamically generated text, graphics, and radii controls were migrated with
  their producers instead of being styled through compatibility selectors.
- Reusable tab, card-grid, and multi-zone-selector layout responds to its owning
  container. Viewport media queries remain only for page-level navigation and
  other true structural changes. Migrated interactive targets are at least
  44 by 44 CSS pixels at the checked viewports.
- Static inline width/display presentation was removed only from the migrated
  components. Map loading/error, scrubber, legend, control, and popup state is
  deliberately frozen for Wave B.
- The County zone selector changed only presentation classes, data hooks,
  active state, and `aria-pressed`. Phase 4 did not change URL/local-storage or
  data-loading lifecycle, so the retained San Diego `coastal` to Dare defect
  remains open for a separate County fix.
- Controlled browser covered the 15 sitemap routes plus `404.html` and the
  Bertie prototype at `1280x900` and `390x844`. All 34 cases had one visible
  `h1`, no document-level horizontal overflow, no undersized visible migrated
  target, and no local resource response at or above `400`. The exercised
  console had no warnings or errors.
- Interaction checks passed for tab Arrow/Home/End behavior, Tropical basin URL
  and Back/Forward state, desktop and nested mobile navigation with Escape focus
  restoration, multi-zone selector state/URL changes, consent choice and status,
  back-to-top visibility, and County HWO Close/Escape/backdrop dismissal. The
  run exposed and corrected missing opener-focus restoration after HWO Escape;
  the final Close, Escape, and backdrop cases all restore focus.
- Static validation passes: all changed JavaScript parses, all 73 native Node
  tests pass, the site validator passes 18 HTML files, 307 JSON files and 166
  local references, and `git diff --check` reports no whitespace errors. The
  existing ignored Tropical dependency harness assertion was updated to require
  the Phase 4 BEM basin-tab block instead of its retired presentation classes.

Checkpoint `edc6a50` contains the authorized Phase 1-3 and legacy-page work.
The owner subsequently reported, "Visual acceptance passed." No exact pages,
devices, viewport sizes, or interactions were supplied, so that owner evidence
is retained only at the reported Wave A level. The owner authorized committing
Phase 4 and continuing with Phase 5. Phase 4 was committed as `1f6b0b1`. No
push, deployment, production-data change, cascade layer, or generated/runtime
cleanup was performed.

Phase 5 is complete and committed in `af8577a`:

- Home, all nine live County pages, the Bertie prototype, Tropical, and Active
  now use the approved `.weather-map-card`, `.map-toolbar`, `.weather-map`,
  `.map-timeline`, `.map-legend`, `.map-menu`, `.map-place-label`, `.field`,
  and `.status-message` contracts. IDs and `data-*` attributes remain the
  JavaScript hooks; the retired presentation classes have no aliases.
- `css/interactive-weather-map.css` owns the shared map card, toolbar, field,
  canvas, fallback, timestamp, status, timeline, legend, basemap menu, city
  label, temperature-marker, and Leaflet control presentation.
  `css/tropical-map-engine.css` retains only engine-specific presentation;
  Home, County, Tropical, and Active styles retain explicit contextual or
  family variants rather than duplicate base ownership.
- Map size uses the owned `--weather-map-block-size` with bounded `clamp()` and
  `svh` values. Visible map controls meet the 44-pixel target floor. Static map
  loading/error display styles were replaced by semantic `[hidden]` state, and
  the live County controller now toggles that state without inline display
  presentation.
- Provider/product choices, station and zone configuration, camera policy,
  frame count, retained animation-layer behavior, playback, scrubbing,
  basemaps, legends, map content, storm identity, and generated/runtime data
  remain unchanged. Popup content and wrapper consolidation remain frozen for
  the separately gated Phase 6.
- The ownership contract and validator enforce Phase 5 consumers, load order,
  cache versions, required BEM/data hooks, single base ownership, retired-class
  absence, and the ban on reintroducing migrated inline display state. The
  ignored Tropical dependency harness and its focused assertion were updated
  in place but remain outside the tracked commit boundary.
- Static/automated validation passes: all 13 changed JavaScript files parse,
  all 73 focused repository tests pass, the site validator passes 18 HTML
  files, 307 JSON files, and 166 local references, focused retired-selector
  searches are clean, and `git diff --check` reports no whitespace errors.
- Local PHP HTTP probes returned `200` for the 15 sitemap consumers plus
  `404.html` and the Bertie prototype. Controlled-browser checks covered all
  17 pages at `1280x900` and `390x844`: all 34 cases retained one main `h1`,
  zero document-level horizontal overflow, no undersized visible map control,
  no retired presentation class, and the expected versioned stylesheets.
- Interaction checks passed for Home radar station/product switching,
  playback/pause and direct scrubber input; Tropical basin URL and Satellite
  switching; Active map, menu, and responsive control states; a standard
  County radar product and settled loading state; explicit multi-zone changes;
  and San Diego's zone-specific center/URL state. Tropical, Active, and County
  map presentation was visually inspected at narrow and wide viewports.
- A clean explicit-zone Home/Tropical/Active/Bertie/Dare/San Diego run captured
  zero console warnings or errors and zero local failures across 421 response
  events. Deliberately exercising the already-recorded invalid/stored-zone Dare
  defect reproduced its three expected cache `404`s; Phase 5 did not alter or
  absorb that County lifecycle issue.

The owner subsequently reported, "Ok, visual acceptance passed." No exact
pages, devices, viewport sizes, or interactions were supplied, so this evidence
is retained only as overall Phase 5 owner acceptance. The owner then separately
authorized Phase 6 on 2026-08-24; its implementation and validation are
recorded below. The owner accepted Phase 6 at the reported overall level and
authorized Phase 7, which is now complete locally and owner-accepted. Phase 8
remains gated.

The first GitHub Actions run for `af8577a` exposed two portability defects in
the validation contract rather than a site regression: the tracked contract
required an ignored local-only dependency harness, and Git line-ending
conversion changed the raw hashes of Leaflet's `LICENSE` and `leaflet.css` on
Linux. The bounded CI follow-up tracks only the three deterministic harness
assets, preserves exact upstream Leaflet bytes with `.gitattributes`, and moves
the official checkout/setup-node actions from v4 to v7. It does not change site
presentation, runtime data, map behavior, or the Phase 6 authorization gate.
The full 73-file PHP lint and 65-file JavaScript syntax baselines, all 73 focused
Node tests, and the site validator pass. The non-vendor staged diff check also
passes; the two byte-preserved Leaflet files are verified against their declared
upstream SHA-256 hashes because their intentional CRLF bytes make Git's generic
whitespace check unsuitable for those exact vendor blobs.

Sitemap CSS Phase 6 is complete in the local working tree at baseline
`7a32866` and owner-accepted:

- `css/interactive-weather-map.css` now exclusively owns the opt-in
  `.weather-map-popup` Leaflet wrapper, tip, bounded inline/block size, padding,
  scrolling, shared text rhythm, 44-pixel close/link targets, focus treatment,
  and map-feature focus ring. The selectors remain scoped to the Phase 6 block;
  unrelated Leaflet popups are not changed.
- Homepage, County, Tropical, and Active popup producers now emit BEM content
  blocks and elements with no legacy presentation aliases. Homepage and shared
  Tropical/Active geometry use explicit `data-weather-map-popup-trigger`
  hooks; County observation markers and the retained inline details panel use
  `data-observation-popup-trigger` and `data-observation-popup-close` hooks.
- `js/modules/leafletPopupShell.js` centralizes Leaflet popup close behavior,
  Enter/Space activation for generated SVG features, and keyboard focus return
  to the originating feature. County keeps its accepted inline observation
  details lifecycle rather than being converted into a different Leaflet
  overlay workflow.
- Family sheets retain only content differences: the compact Home width and
  alert content, County observation grid/status/inline close, Tropical product
  typography/list/link treatment, and Active legacy alert text. Active's
  detailed engine and alert-map consumers share the same Active shell modifier.
- `scripts/css-ownership-contract.mjs` and `scripts/validate-site.mjs` enforce
  one generic owner, family variants, generated source contracts, retired-class
  absence, all live/compatibility consumers, and the atomic
  `20260824-phase6-1` dependency versions. The Phase 2 harness now declares its
  real shared-popup stylesheet dependency.
- Static/automated validation: all 14 changed JavaScript files pass
  `node --check`; the full baselines pass for 70 tracked PHP files and 75
  tracked/task JavaScript files; all 78 focused repository tests pass; the site
  validator passes 18 HTML files, 307 JSON files, and 167 local references;
  focused retired-selector searches are clean; and `git diff --check` reports
  no whitespace errors. The 14 changed-file count includes the two relevant
  ignored local Tropical test modules; the durable tracked Phase 6 assertion is
  `scripts/tests/popup-system.test.mjs`.
- PHP-served HTTP probes returned `200` for Home, Bertie, explicit Dare
  Hatteras, explicit San Diego Mountains, Atlantic Tropical, the deterministic
  `AL052025` Active map, and the versioned popup-shell module.
- Controlled browser at `1280x900` covered Home, Bertie, Dare Hatteras after a
  zone change, San Diego Mountains after a zone change, Atlantic Tropical, and
  deterministic `AL052025` Active. Mouse and keyboard opening, mouse and
  Enter/Space closing, close/link targets, focus rings/restoration, official or
  page links where present, content scrolling, and horizontal bounds passed.
  Home's internal County link navigation and Back return also passed. Active
  popup content has no product link by design; its detailed warning and current
  position content remained unchanged.
- The same six page families passed direct `390x844` checks. Every exercised
  popup/details panel stayed horizontally bounded with zero document or
  internal horizontal overflow; close and applicable link targets measured at
  least 44 CSS pixels. Dare retained `?zone=hatteras`, San Diego retained
  `?zone=mountains`, and the County panels retained their mobile below-map
  placement.
- Console warning/error logs were empty for every final page pass. Home,
  County, and Tropical network checks were clean. The retained Active fixture
  produced only its known missing text/graphic-product `404`s plus canceled map
  requests during view changes; the visible unavailable-product state remained
  truthful and no popup asset failed.
- No files were staged, committed, pushed, deployed, generated, or deleted;
  production/generated data and runtime artifacts were not changed. Phase 7
  dependency removal and Phase 8 cascade layers remain unstarted; Phase 7 is
  now separately authorized, while Phase 8 still requires authorization.
- Owner smoke on 2026-08-24: the owner reported exactly, "Ok, smoke passed."
  No pages, devices, viewport sizes, or individual interactions were supplied,
  so this is retained as overall Phase 6 owner evidence only. The same message
  explicitly authorized Phase 7; it did not authorize Phase 8.

Sitemap CSS Phase 7 is complete, owner-accepted, and committed locally as
`dbd7c8c` (`Complete CSS architecture phase 7 ownership`):

- Home, Tropical, and Active no longer load `counties/css/county.css`. County
  CSS is now consumed only by the nine live County routes and the Bertie
  prototype. The Phase 2 compatibility harness continues to load only its real
  shared-map and Tropical-engine dependencies.
- The reusable `observation-popup` content block and
  `temperature-station-details` layout moved intact from County CSS to
  `css/interactive-weather-map.css`, where their shared Home/County runtime
  owner already lives. County CSS retains only County composition, forecast,
  alert, multi-zone, San Diego, and other genuine family variants.
- A stale Home header-paragraph override was removed after the consumer audit
  proved that no such paragraph exists. The remaining `css/home.css` rules are
  generated or static Home composition and explicit Home variants; no reusable
  block required another owner. Existing BEM presentation classes and
  IDs/`data-*` behavior hooks were preserved because this dependency-only slice
  did not require JavaScript hook changes.
- All affected stylesheet consumers use `20260824-phase7-1`. The ownership
  contract, site validator, durable popup test, local Tropical compatibility
  assertion, and new focused Phase 7 test enforce the relocated selectors,
  consumer lists, cache keys, and absence of the three cross-family links and
  obsolete Home rule.
- Static/automated validation: all five changed JavaScript/MJS files pass
  `node --check`, including the relevant ignored local Tropical test; the full
  baselines pass for 70 tracked PHP files and 76 tracked/task JavaScript files;
  all 80 focused repository tests pass; and the site validator passes 18 HTML
  files, 307 JSON files, and 164 local references. Focused dependency/selector
  searches and `git diff --check` are clean. The validator also reverified the
  exact local Leaflet 1.9.4 asset checksums.
- Seven PHP-served HTTP probes returned `200` for Home, Bertie, explicit Dare
  Hatteras, explicit San Diego Mountains, Atlantic Tropical, deterministic
  `AL052025` Active, and the shared popup-shell module.
- Controlled browser at `1280x900` and `390x844` covered Home, Bertie, Dare
  Hatteras, San Diego Mountains, Atlantic Tropical, and deterministic
  `AL052025` Active. Every route loaded the Phase 7 shared stylesheet; only the
  County routes loaded County CSS. Observation panels and Home/Tropical/Active
  popups retained mouse and keyboard opening/closing, focus return, official or
  page links where applicable, 44-pixel close/link targets, bounded content,
  and zero document/internal horizontal overflow. Dare retained
  `?zone=hatteras`, San Diego retained `?zone=mountains`, and mobile observation
  panels retained their below-map placement.
- Per-page console/network capture was clean for Home, all exercised County
  cases, and Tropical at both widths. Active retained only its known fixture
  text/graphic-product `404`s and the missing-image ORB failure; its truthful
  unavailable-product state remained intact and no Phase 7 stylesheet or popup
  asset failed.
- Phase 7 was committed locally as `dbd7c8c`. Nothing was pushed, deployed,
  generated, or deleted; production/generated data and runtime artifacts were
  not changed. The owner then explicitly authorized Phase 8 cascade layers.
- Owner smoke on 2026-08-24: after starting the bounded fixture router, the
  owner confirmed that deterministic `AL052025` loaded and that its alert popup
  worked, supplied a screenshot of the Coastal Colleton Tropical Storm Warning
  polygon/popup, and then reported exactly, "Ok, then it has passed." The
  fixture intentionally contains one SC zone for both wind and surge, so that
  screenshot is correct for the subset rather than evidence of the historical
  advisory's complete SC/NC extent. This closes Phase 7 owner review at the
  reported overall level; the other smoke pages/devices were not individually
  named in the final confirmation. The following owner request then authorized
  Phase 8.
- The apparent separate `css/styles.css` modification after Phase 7 was
  verified before commit as content-identical to `HEAD` by both blob hash and
  empty diff. It was excluded from the Phase 7 commit; Phase 8 now intentionally
  modifies that file only to contain its token and base rules in named layers.

Sitemap CSS Phase 8 is implemented and validated locally on 2026-08-24 from
committed Phase 7 baseline `dbd7c8c`, then committed and pushed in `2f53445`.
Functional owner smoke passed at the reported overall level; Wave B layout
closeout remains open:

- `css/cascade-layers.css` establishes the single early order `vendor, tokens,
  base, components, maps, pages, utilities` on all 18 tracked HTML consumers.
  Map pages additionally load `css/leaflet-vendor.css`, which imports the
  untouched local Leaflet 1.9.4 stylesheet into `vendor`; non-map information
  pages do not acquire Leaflet as a new dependency.
- `css/styles.css` owns `tokens` and `base`; shared components use
  `components`; the shared weather-map and Tropical-engine sheets use `maps`;
  Home, County, Tropical, Active, storm-graphics, info, and the dependency-only
  harness use `pages`. The nine County background style blocks are explicitly
  layered as `pages`. No application rule or tracked stylesheet remains
  unlayered.
- All application stylesheets and both wrappers use cache key
  `20260824-phase8-1`. Direct HTML references to Leaflet CSS are removed while
  the versioned Leaflet JavaScript and its integrity attribute remain intact.
  The validator continues to verify every exact Leaflet asset checksum and now
  rejects direct CSS bypasses, unlayered or undeclared application CSS, stale
  layer/cache references, and undocumented inline style blocks.
- The `!important` audit removed 17 obsolete specificity/vendor overrides.
  The exact remaining allowlist is limited to hidden-state enforcement,
  Tropical visually-hidden accessibility clipping, County contrast overrides
  for generated inline temperature colors, and the Leaflet inline popup width
  override. Focused Phase 8 tests and the validator enforce that allowlist.
- Static/automated evidence: all seven changed tracked or dependency-only
  JavaScript/MJS files pass `node --check`; the full baselines pass for 73 PHP
  and 81 JavaScript/MJS files; all 84 focused repository tests pass; the site
  validator passes 18 HTML files, 307 JSON files, and 182 local references;
  exact Leaflet hashes, focused old-reference/`!important` searches, and
  `git diff --check` pass.
- Controlled browser at `1280x900` and `390x844` covered Home, Bertie, Dare,
  San Diego, Tropical Overview, deterministic `AL052025` Active, and the About
  information family. Every page loaded the order sheet first; map pages loaded
  the layered Leaflet wrapper and non-map pages did not. Maps, tabs, menus,
  multi-zone switching, family composition, and responsive variants retained
  their intended presentation with zero horizontal overflow.
- County observation details and Tropical/Active Leaflet popups retained mouse
  or keyboard opening, 44-pixel close targets, bounded `overflow:auto`, narrow
  viewport fit, and focus restoration. The Active alert fixture still renders
  only its intentional Coastal Colleton subset. Browser diagnostics found no
  Phase 8 CSS/resource failure or new console error.
- A separate existing state issue was reproduced when navigating San Diego
  `coastal` localStorage directly into Dare without an explicit Dare zone: Dare
  briefly requested nonexistent `data/coastal/*` files before a valid choice.
  Explicit `?zone=mainland` followed by Northern OBX switching was clean. This
  is outside the CSS-only Phase 8 authorization; no controller or generated
  data was changed.
- Phase 8 is committed and pushed in `2f53445`. Nothing was deployed by Codex,
  generated, or deleted, and production/generated data and runtime artifacts
  were not changed by the implementation. The owner later uploaded and tested
  the checkpoint. Stop here for Wave B layout closeout; the proposed final
  tuning phase is not authorized for implementation by this handoff.

## Purpose

Standardize the site's reusable visual language and CSS ownership while preserving page-family behavior. The homepage at this planning checkpoint is the visual direction for spacing, typography, tabs, controls, map cards, and popup treatment. It is not an unquestionable numeric specification: accessibility, overflow, semantic, or interaction problems found during the migration should be corrected with evidence.

The result should make a global change genuinely global, make a page-specific exception obvious, and prevent a shared component from drifting back into an unrelated page stylesheet.

This work is a visual and structural CSS refactor. It must not change weather sources, stations, county or zone behavior, storm identity, alert semantics, map products, map-camera policy, cache publication, or other product behavior as collateral work.

## Scope

### Public routes

The visual migration covers only the 15 routes currently listed in `sitemap.xml`:

1. `/`
2. `/tropical`
3. `/active/`
4. `/counties/beaufort/`
5. `/counties/bertie/`
6. `/counties/dare/`
7. `/counties/hyde/`
8. `/counties/martin/`
9. `/counties/pitt/`
10. `/counties/tyrrell/`
11. `/counties/washington/`
12. `/counties/san-diego/`
13. `/about.html`
14. `/privacy.html`
15. `/accessibility.html`

### Dependency-only consumers

Non-sitemap pages are not redesign targets. They receive only the changes required to keep shared CSS, JavaScript hooks, local Leaflet, navigation, or compatibility behavior working. Known examples include:

- `counties/bertie/index_test.html`
- `404.html`
- the ignored Tropical Phase 2 harness
- test or compatibility consumers discovered by dependency inventory

Do not broaden dependency maintenance into a visual redesign or promotion of a prototype.

### Explicitly out of scope

- New product families, weather sources, stations, zones, map layers, or data workflows
- Frameworks, bundlers, preprocessors, or a new CSS lint dependency
- A Leaflet major-version upgrade
- Removal of server compatibility redirects or script-owned IDs without validated parity and separate approval
- Production deployment, cron changes, cache maintenance, or generated-data edits
- Unrelated SEO, metadata, navigation, analytics, marketing, or backend work

## Decisions already made

1. Use the current homepage as the visual direction across the site, subject to evidence-based accessibility and layout corrections.
2. Migrate reusable components one component at a time but update every affected site consumer atomically. Do not complete one whole page at a time when that would leave two competing component systems.
3. Do not retain legacy class aliases. Rename the HTML, CSS, JavaScript references, tests, and validator contracts in the same component slice.
4. Use BEM-style presentation classes and IDs or `data-*` attributes for JavaScript and state hooks.
5. Keep `home.css`, but only for genuine homepage composition and explicit homepage variants. Move every reusable rule to its actual shared owner.
6. Preserve family-specific behavior with explicit variants or page-root custom properties rather than copying an entire shared component into a page stylesheet.
7. Self-host the official, unmodified Leaflet 1.9.4 distribution before the main CSS migration. Introduce cascade layers only after stylesheet ownership and load order are stable.
8. Prefer intrinsic layout, fluid values, and container queries. Use media queries when the viewport itself causes a real structural change; `clamp()` is not a replacement for every media query.
9. Extend the existing dependency-free site validator to enforce ownership and migration contracts. Do not add a build system solely for CSS enforcement.
10. Use two broad owner-review waves: general interface components first, shared map interface and final cascade architecture second.
11. Update non-sitemap pages only when a dependency change would otherwise break them.
12. Raise and resolve large visual, accessibility, semantic, or behavioral discrepancies before silently applying the homepage treatment.

## Design and engineering principles

### Consistency does not mean visual sameness

Headings should share a type system and spacing rhythm, but an `h1`, section `h2`, card heading, tab label, status label, and popup title do not all have the same role or need the same size. Semantic `h1`-`h6` structure remains meaningful; presentation classes define the visual role.

Use a shared base plus a clear specialization. For example:

```html
<h1 class="page-title page-title--tropical">Tropical Weather</h1>
```

For a whole page family, prefer a root theme variable when only a value changes:

```css
.site-page--tropical {
  --page-title-color: var(--color-tropical-accent);
}
```

Use a component modifier such as `.page-title--tropical` when the component itself has an isolated structural or visual variant. Do not use `.main-title .tropical-main-title`; that descendant selector would mean one element nested inside another, not two classes on the same element.

### Responsive methods have different jobs

- Use `clamp()` for scalar values that should grow smoothly, such as type size, gaps, padding, and bounded map height.
- Use Grid/Flexbox, `minmax()`, wrapping, `auto-fit`, and content-sized tracks for intrinsic layout.
- Use container queries when a reusable component should react to its own available width.
- Use media queries for genuine viewport-level structural changes, device capabilities, and user preferences such as reduced motion or contrast.
- Use logical properties and modern viewport units (`dvh`, `svh`, and `lvh`) where they solve a demonstrated layout issue.
- Treat `320`, `360`, `390`, `430`, `768`, `1024`, and `1440` pixels as test widths, not an automatic breakpoint set.

There is no universal modern breakpoint list that should be copied into this site. A breakpoint belongs where content or interaction fails. The current `--breakpoint-sm`, `--breakpoint-md`, and `--breakpoint-lg` custom properties should be removed unless they have a non-media-query use, because ordinary custom properties cannot be used as media-query conditions and imply a reusable capability they do not provide.

### Accessibility is part of the baseline

- Preserve semantic heading order, landmarks, skip links, keyboard behavior, focus visibility, dialog semantics, reduced-motion behavior, readable state messages, and no-horizontal-overflow behavior.
- Meet the WCAG 2.2 target-size minimum of 24 by 24 CSS pixels or its spacing exception. Aim near 44 pixels for important touch controls where the layout permits.
- Do not use font scaling or fixed-height containers that clip text at zoom or with longer labels.
- Keep source, loading, empty, stale, partial-failure, and unavailable states distinguishable.

## Naming convention

### Presentation classes

Use BEM consistently:

- Block: `.weather-tabs`
- Element: `.weather-tabs__tab`
- Modifier: `.weather-tabs--compact`
- State: `.is-active`, `.is-loading`, `.has-alerts`

Avoid names tied to a single page when the component is shared. Avoid broad generic selectors such as `.title`, `.tabs`, or `.popup` that are likely to collide.

### Page roots

Give each family an explicit root class:

- `.site-page--home`
- `.site-page--county`
- `.site-page--tropical`
- `.site-page--active`
- `.site-page--info`

Page roots may set family-wide custom properties. They should not be used to recreate a second full version of a shared component.

### JavaScript hooks

- Use IDs for unique document relationships and targets where an ID is semantically appropriate.
- Use `data-*` attributes for controller lookup, action, product, state, and configuration hooks.
- Do not make a presentation class the only JavaScript contract for new or migrated code.
- Preserve existing script-owned IDs until replacement parity is verified and removal is explicitly approved.
- When an old class is also a JavaScript hook, migrate the markup, selector, tests, and controller together. Do not leave a compatibility alias.

## Target stylesheet ownership

| File | Intended ownership |
| --- | --- |
| `css/styles.css` | Design tokens, fonts, reset/base rules, semantic page shell, global vertical rhythm, accessibility foundations, and genuinely global utilities |
| `css/components.css` | Shared non-map components: titles, heading roles, labels, tabs, selectors, buttons, cards, toolbars, menus, dialogs, notices, and other reusable interface blocks |
| `css/interactive-weather-map.css` | Shared map card internals, Leaflet overrides, controls, timestamps/status overlays, legends, scrubbers, markers, city labels, and the generic popup shell |
| `css/tropical-map-engine.css` | Shared Tropical Overview and Active engine-specific map presentation that does not belong to every weather map |
| `css/home.css` | Homepage-only composition and explicit homepage component variants, including the homepage county-popup content variant |
| `counties/css/county.css` | County-only content, forecast, alert-detail, observation-popup, multi-zone, San Diego, and other county-family variants |
| `css/tropical.css` | Tropical Overview page composition and Tropical-only variants |
| `active/css/active.css` | Active-storm page composition and Active-only variants |
| `active/css/storm-graphics.css` | Active storm-graphics component and presentation details |
| `css/info.css` | About, Privacy, and Accessibility page composition and variants |
| `vendor/leaflet/1.9.4/` | Official Leaflet files and adjacent images, retained unmodified |

The final architecture must allow Home, Tropical, and Active to stop loading `counties/css/county.css`. Shared city-label markup such as `.weather-place-label` belongs in the shared map stylesheet; only genuine family modifiers remain in County, Tropical, or Active stylesheets.

## Baseline snapshot at plan creation

This snapshot is evidence for Phase 0, not a permanent truth. Recheck it before implementation.

- `HEAD` is `8d20ddb` and the working tree was clean when this plan was created.
- `sitemap.xml` lists the 15 in-scope routes above.
- Principal stylesheet size and responsive-rule counts:

| Stylesheet | Lines | `@media` rules | `@layer` rules | `@container` rules |
| --- | ---: | ---: | ---: | ---: |
| `css/styles.css` | 1459 | 5 | 0 | 0 |
| `css/components.css` | 804 | 4 | 0 | 0 |
| `css/interactive-weather-map.css` | 471 | 2 | 0 | 0 |
| `css/home.css` | 288 | 2 | 0 | 0 |
| `counties/css/county.css` | 2383 | 15 | 0 | 0 |
| `css/tropical.css` | 397 | 3 | 0 | 0 |
| `active/css/active.css` | 1769 | 15 | 0 | 0 |

- Home, Tropical, and Active load `counties/css/county.css` even though they are not county pages.
- Home, County, Tropical, and Active currently load `css/components.css` after page-family styles, which makes the cascade depend on a counterintuitive order.
- All current map families and the Bertie prototype reference Leaflet 1.9.4 from `unpkg.com`; a local Leaflet distribution is not present.
- Embedded `<style>` blocks or presentational `style` attributes remain on Tropical, Active, and county-family pages. Phase 0 must distinguish static presentation from legitimate initial/runtime state before removing them.
- `counties/css/county.css` still owns shared map-label rules, including `.weather-place-label` inside `.weather-center-map-card`.
- The primary stylesheets have no cascade layers or container queries.
- `css/styles.css` defines breakpoint-looking custom properties that cannot serve as media-query conditions.

## Migration artifacts

Phase 0 should create two complementary controls:

1. A human-readable ownership and migration ledger in `docs/`, recording each old selector, new selector, component owner, variants, consumers, JavaScript hooks, tokens, and validation coverage.
2. A machine-readable CSS ownership contract under `scripts/` that `scripts/validate-site.mjs` can enforce without a third-party package.

The ledger is the planning and review source. The machine contract prevents later drift. Neither should duplicate page behavior that is already authoritative in the current County or Tropical handoff.

## Phased implementation plan

### Phase 0: Baseline, inventory, and ownership contract

This is the only phase the next session should begin before further approval.

#### Work

1. Re-read `AGENTS.md`, this plan, and the current County and Tropical handoffs.
2. Record Git state, the current homepage commit, current stylesheet cache keys, and every relevant consumer.
3. Inventory the 15 sitemap routes plus dependency-only pages for:
   - stylesheet order and versioned references;
   - inline `<style>` blocks and `style` attributes;
   - selectors defined by more than one owner;
   - presentation classes used by JavaScript;
   - IDs, `data-*` hooks, ARIA relationships, and state classes;
   - generated Leaflet DOM and plugin-owned selectors;
   - page-level tokens and custom-property overrides;
   - media queries, structural failure points, and avoidable fixed dimensions;
   - shared components, legitimate family variants, and one-off composition;
   - accessibility, target-size, heading, clipping, focus, and overflow findings.
4. Capture baseline screenshots and computed styles for representative components at desktop and mobile widths.
5. Build the old-to-new class ledger and the proposed stylesheet-owner matrix.
6. Define the machine-readable ownership contract and extend the validator only after the contract is reviewed.
7. Flag any proposed change that would materially alter an accepted page-family design or interaction.

#### Required review output

- Complete consumer list
- Shared-component inventory
- Old-to-new selector mapping
- JavaScript-hook migration mapping
- Proposed tokens and page-root variables
- Page-specific variant list
- Inline-style disposition list
- Responsive behavior and query rationale
- Accessibility and overflow findings with evidence
- Wave A and Wave B component boundary

#### Gate

Do not begin Leaflet hosting or CSS migration until the owner reviews the Phase 0 matrix, variants, discrepancies, and two-wave boundary.

### Phase 1: Self-host Leaflet 1.9.4 and normalize pre-layer load order

#### Work

1. Obtain the official Leaflet 1.9.4 distribution without upgrading it.
2. Store the unmodified JavaScript, CSS, and adjacent image assets under a versioned directory such as `vendor/leaflet/1.9.4/`.
3. Record the source URL, version, license, and checksums in a small vendor provenance file.
4. Replace every CDN reference in sitemap routes and dependency-only consumers with the local versioned path.
5. Confirm Leaflet CSS image URLs still resolve relative to the local stylesheet.
6. Normalize the temporary pre-layer order to:
   1. Leaflet vendor CSS
   2. `styles.css`
   3. `components.css`
   4. `interactive-weather-map.css`
   5. shared engine CSS where applicable
   6. page-family CSS last
7. Update all affected cache-busting references consistently.
8. Add validator guards that reject remote Leaflet references and require all expected local assets.

#### Recommendation and tradeoff

Self-hosting removes a third-party runtime dependency, makes the exact production asset auditable, and avoids CDN availability or policy changes. It also makes update ownership local, so the repository must explicitly track Leaflet security and maintenance updates. Do not combine that maintenance responsibility with a Leaflet 2.x migration during this CSS work.

#### Acceptance

- Every map initializes normally.
- Leaflet control icons, marker images, popup tips, and attribution render correctly.
- No CDN Leaflet request remains.
- Network and console checks are clean apart from separately recorded provider behavior.
- Existing map interaction and camera behavior is unchanged.

### Wave A: General interface system

#### Phase 2: Tokens, page shell, and vertical rhythm

Implementation status: completed locally on 2026-08-24; Phase 3 was completed later in the same local working tree.

1. Consolidate color, type, spacing, radius, shadow, border, motion, content-width, and z-index tokens in `styles.css`.
2. Define a shared page shell and the spacing between the full header/breadcrumb region and the first page element.
3. Add the page-root classes.
4. Replace magic values only when the new token represents a real repeated design decision.
5. Remove misleading breakpoint custom properties.
6. Keep utility classes limited and purposeful; do not recreate a utility framework.

Acceptance: all page families begin at a consistent visual rhythm, with documented variants and no horizontal overflow.

#### Phase 3: Titles, headings, labels, and text roles

Implementation status: completed locally on 2026-08-24; Phase 4 was completed later in the same local working tree.

1. Define canonical roles such as page title, section title, card title, eyebrow, label, helper text, metadata, and status text.
2. Apply semantic headings according to document structure and the shared visual classes according to role.
3. Move Tropical and Active inline title presentation into their page styles or shared modifiers.
4. Preserve the Active storm-title metadata and Tropical branding behavior.
5. Use fluid type values only within safe bounds and verify zoom/long-label behavior.

Acceptance: titles and labels are consistent by role, not flattened into one identical style; heading hierarchy and accessible names remain correct.

#### Phase 4: Cards, tabs, selectors, buttons, menus, and dialogs

Implementation status: completed and accepted by the owner; committed in
`1f6b0b1` on 2026-08-24.

1. Establish shared component markup and BEM classes.
2. Move common rules into `components.css`.
3. Use container queries for reusable components whose layout depends on card width.
4. Use page modifiers or root variables only for documented differences.
5. Separate presentation selectors from JavaScript hooks.
6. Replace static inline display/width presentation with state classes, `[hidden]`, or owned component rules where behavior permits.
7. Preserve all accepted keyboard, focus, alert-dialog, menu, selector, and scroll-lock behavior.

Acceptance: each migrated component has one base owner, explicit variants, no legacy alias, and equivalent or better keyboard/touch behavior.

### Wave A owner review

Implementation status: owner reported "Visual acceptance passed" on 2026-08-24; exact pages, devices, widths, and interactions were not supplied.

Review the 15 public routes after the general interface migration. Compare against the recorded homepage direction and baseline screenshots. Resolve approved discrepancies before starting shared map work so Wave B does not hide general-layout regressions.

### Wave B: Shared map interface and final cascade architecture

#### Phase 5: Map card and shared map controls

Implementation status: completed, owner-accepted, and committed in `af8577a`
on 2026-08-24. Phase 6 is owner-accepted and committed locally in `5448d61`;
Phase 7 is owner-accepted and committed locally in `dbd7c8c`. Phase 8 is
implemented, validated, committed, and pushed in `2f53445`; Wave B owner review
remains open.

1. Make `.weather-center-map-card` or its approved replacement the canonical shared map-card block.
2. Define bounded fluid map height with an owned custom property and modern viewport units so maps neither collapse nor overflow the available layout.
3. Centralize timestamps/status overlays, source labels, legends, scrubbers, play controls, layer controls, markers, and city-label presentation in `interactive-weather-map.css`.
4. Keep Tropical/Active engine-only presentation in `tropical-map-engine.css`.
5. Remove the County timestamp and label overrides already made redundant by the shared behavior.
6. Preserve provider/product selectors, map status content, frame counts, animation pools, camera policy, and all interaction behavior.

Acceptance: identical shared map elements have identical markup, names, and base presentation across families; variants are explicit and local.

#### Phase 6: Popup system

Implementation status: complete locally on 2026-08-24 at baseline `7a32866`;
owner smoke passed at the reported overall level. Phase 7 is separately
authorized but is not part of this Phase 6 checkpoint.

Create one shared Leaflet popup shell plus purpose-specific content variants:

- Homepage county popup
- County observation/temperature popup
- Tropical overview popup
- Active-storm popup

The shared map stylesheet owns Leaflet wrapper normalization, maximum inline size, padding, close target, tip, focus, overflow, and generic paragraph rhythm. Page-family styles own only their content variant. Generated popup markup and JavaScript class names must be updated in the same slice.

Do not apply broad `.leaflet-popup-content p` rules site-wide when only one popup family needs a change. Scope content spacing to the shared popup block or its modifier so Leaflet or other popup families are not unintentionally changed.

Acceptance: popups fit narrow viewports, do not obscure required controls unnecessarily, retain readable content and touch targets, and pass mouse, touch, keyboard, close, link, and focus checks.

#### Phase 7: Remove cross-family dependencies and dead ownership

Implementation status: complete, owner-accepted, and committed locally on
2026-08-24 as `dbd7c8c`. Phase 8 was subsequently authorized.

1. Remove `counties/css/county.css` from Home, Tropical, and Active once every required dependency has a shared or correct family owner.
2. Move reusable rules out of `home.css`; retain only homepage composition and explicit variants.
3. Remove migrated duplicate selectors, stale overrides, obsolete inline presentation, and unused legacy class names.
4. Update JavaScript hooks, tests, cache keys, and validator contracts atomically.
5. Use reference searches to prove every removed selector and file dependency is gone.

Acceptance: no page depends on an unrelated family stylesheet, and no old class is retained as an undocumented compatibility layer.

#### Phase 8: Introduce cascade layers

Implementation status: complete and validated locally on 2026-08-24 from
baseline `dbd7c8c`; committed and pushed in `2f53445`. Functional owner smoke
passed at the reported overall level; Wave B layout closeout remains open.

Add layers only after ownership and load order are stable:

```css
@layer vendor, tokens, base, components, maps, pages, utilities;
```

1. Put the untouched Leaflet stylesheet into `vendor` through a local wrapper/import; never edit the vendor file.
2. Assign every application stylesheet to its documented layer.
3. Keep the layer-order declaration consistent and early.
4. Do not leave unlayered application rules, because unlayered author styles would outrank layered author styles.
5. Re-audit every `!important`; retain only cases supported by a documented vendor, accessibility, or state requirement.
6. Confirm the final order does not change page-family variants or Leaflet overrides.

Acceptance: the cascade follows ownership rather than accidental link order or specificity escalation, and the validator enforces the contract.

### Wave B owner review

Review shared map cards, controls, timestamps, legends, markers, labels, and all popup variants across Home, County, Tropical, and Active. Resolve findings before declaring the architecture complete.

Owner evidence on 2026-08-26: after uploading the checkpoint to the server and
testing on the owner's devices, the owner reported exactly, "All functions
passed on all devices." Known coverage includes an unspecified Samsung phone
and a `3840x2160` display; the exact page, browser, and remaining-device matrix
was not supplied, so this closes functional smoke only at that reported overall
level. The owner later clarified that this testing used
`http://s194842513.onlinehome.us/test/`; `chuckcopelandwx.com` is the future
production replacement. Wave B visual/layout acceptance remains open because
the owner also
reported:

- excessive empty element height on a `3840x2160` display;
- alerts and/or zone selectors pushing the map scrubber and Radar/Satellite
  color bar below the visible viewport on mobile and smaller desktops; and
- maps and text-product regions capturing mobile vertical scrolling unless the
  gesture begins near the extreme viewport edge.

The previously recorded cross-county persisted-zone defect is resolved in a
separate bounded County lifecycle slice on 2026-08-26. Shared multi-zone
initialization now validates URL/localStorage state before its first product
request; focused tests and desktop/mobile reload plus Back/Forward browser
checks cover Bertie, Dare, Hyde, and San Diego. This does not authorize or form
part of Phase 9, and it does not change the open height/scroll findings.

#### Pre-Phase 9 regression corrections

The owner-authorized 2026-08-31 correction is complete in the current
uncommitted tree and remains outside Phase 9:

- Tropical once again owns the complete contextual presentation for its active
  storm links instead of depending on the County-only stylesheet removed from
  Tropical in Phase 7. The restored chip is a padded, rounded flex card with
  readable white text, storm-color icon treatment, hover, and keyboard focus.
- The shared `@container (max-width: 680px)` weather-tab icon rule now uses a
  documented vendor override so the unlayered Font Awesome display declaration
  cannot re-show icons on mobile. Desktop icons remain visible.
- The existing atomic CSS contract and all 18 HTML consumers use cache key
  `20260831`. This aligns with, but does not absorb, concurrent user-owned
  County HWO height edits and their County stylesheet cache key.
- Static/automated checks pass: changed MJS syntax, five cascade-layer tests,
  nine Tropical overview tests, the site validator for 18 HTML files, 307 JSON
  files, and 199 local references, plus `git diff --check`.
- Controlled browser checks at `390x844` and `1280x900` passed on Tropical,
  Home, and Bertie. The Tropical active chip retained its complete card styling;
  Home and Bertie icons collapsed to zero width on mobile and remained visible
  on desktop; all checked pages had zero horizontal overflow and no console
  errors or warnings.
- No fixture/runtime data or external provider was changed; owner smoke,
  staging/production, commit, push, and deployment remain unestablished.

#### Phase 9: Responsive height and scroll ergonomics

Implementation status: explicitly authorized by the owner on 2026-08-31. The
initial implementation was validated through static/automated, local HTTP, and
controlled-browser gates and committed in `1372cf9`. Owner-supplied staging
screenshots then exposed a short-visual-height mobile failure. Its bounded
correction was statically and locally validated, owner-accepted, and committed
in `7094744`. Exact pages, devices, browsers, and individual interactions were
not supplied with the owner's "All smoke tests pass" report, so this remains
overall owner smoke evidence only. The owner's subsequent manual CSS edits are
user-owned work and are not retroactively part of that checkpoint. Full
short-height controlled-browser revalidation and all production gates remain
open.

1. Measure the occupied vertical stack for Home, standard County, multi-zone
   County, Tropical, and Active at `3840x2160`, representative smaller desktop,
   and mobile viewports before changing sizing rules.
2. Replace one-size map/product heights with bounded shared calculations and
   explicit page-family/context modifiers for alert and zone-selector rows.
   Use literal page-specific values only when measured content differences
   cannot be represented by a stable family variant.
3. Keep scrubbers, timelines, legends, and Radar/Satellite color bars reachable
   without sacrificing readable map/product space.
4. Audit touch and wheel ownership separately for Leaflet maps, animated
   products, and text products. Preserve deliberate map interaction while
   preventing nested-scroll traps and maintaining keyboard accessibility.
5. Preserve map cameras, products, frame counts, playback/scrubbing, alert and
   zone state, popups, providers, data, and generated/runtime output.
6. Validate width and height sweeps plus actual-device touch scrolling; include
   large desktop, smaller desktop, mobile portrait/landscape, keyboard, console,
   network, and no-horizontal-overflow evidence.

Implementation record:

- The pre-change matrix confirmed that Home, standard County, multi-zone
  County, and Tropical inherited a forced `calc(100svh + 1px)` page-shell
  minimum. At `3840x2160`, it extended otherwise complete content into a
  roughly 2394-pixel document with a large empty gap before the footer.
  Multi-zone selector rows also pushed maps and their lower controls farther
  down at smaller heights.
- Shared map height ownership now uses bounded `clamp()` calculations with
  explicit Home, standard County, multi-zone County, Tropical, and Active stack
  offsets. Weather-family roots may size intrinsically instead of inheriting
  the extra-tall generic shell. Active's later panel minimums use bounded
  viewport values instead of width-driven values.
- Ordinary wheel input remains available to the document over Leaflet maps.
  Ctrl+wheel retains deliberate zoom through one shared helper. On coarse
  pointers, Leaflet drag/zoom containers expose vertical pan to the page.
- Long Tropical text and mobile County forecast-discussion content now remain
  in the document scroller instead of introducing nested vertical scrolling.
  Map cameras, products, frames, playback, legends, selectors, providers, and
  data contracts were not changed.
- `scripts/css-ownership-contract.mjs`,
  `scripts/validate-site.mjs`, and
  `scripts/tests/responsive-scroll-ergonomics.test.mjs` enforce the Phase 9
  height, touch, wheel, text-scroll, consumer-version, and removed-runtime-height
  contracts.
- Owner-supplied mobile staging screenshots on 2026-08-31 showed the Bertie
  Satellite and Tropical Satellite maps consuming the remaining visible page
  height while their frame scrubbers and legends continued below the initial
  viewport. The Tropical Overview screenshot showed the same over-tall map
  behavior. This is recorded as a failed owner layout check, not as
  controlled-browser evidence.
- Root cause: on short visual viewports, the family stack calculation requested
  a smaller map, but the existing `20rem` to `20.625rem` family minimums won the
  `clamp()` and kept the map at 320 to 330 pixels. At viewport heights up to
  `43.75rem`, Home, County (including multi-zone), Tropical, and Active now use
  a `12rem` map minimum. This preserves the existing calculation and normal
  `390x844` layout while allowing browser-chrome-shortened portrait and
  landscape views to contract. Scrubbers remain in document flow, and their
  44-pixel controls were not overlaid or reduced.
- All affected layered CSS and shared-map dependency consumers were advanced
  atomically from `20260831-phase9-1` to `20260831-phase9-2`; the ownership
  contract, validator, and focused responsive test guard the short-height
  breakpoint and minimum.

Validation record:

- Static/automated: all changed JavaScript passed `node --check`;
  `node --test scripts/tests/*.test.mjs test/tropical-map/*.test.mjs` passed
  98/98; `node scripts/validate-site.mjs` validated 18 HTML files, 307 JSON
  files, and 199 local references; `git diff --check` passed.
- Local HTTP: Home, Bertie, Dare, San Diego, Tropical, deterministic Active
  fixture, and representative versioned CSS/JavaScript assets returned 200
  with the expected HTML, CSS, and JavaScript MIME types.
- Controlled browser: the six-family matrix passed at `3840x2160`,
  `1280x900`, and `390x844`; Home, Dare, Tropical, and Active also passed at
  `844x390`. No checked route had horizontal overflow. At 4K, Home, County,
  and Tropical now end within one viewport instead of retaining the previous
  empty shell extension.
- Interaction: ordinary wheel input over the Dare Radar map moved document
  scroll from 0 to 260 pixels. Tropical long text computed to
  `overflow-y: visible`; wheel input moved document scroll 360 pixels while
  its own `scrollTop` stayed 0. County weather tabs passed End-key selection,
  and coarse-pointer emulation produced `touch-action: pan-y` on the visible
  Leaflet container.
- Console: a fresh representative Home, Dare, Tropical, and Active navigation
  sequence produced no browser warnings or errors. The in-app browser's CDP
  event stream returned no usable per-response entries, so local HTTP probes
  are the recorded network evidence rather than a claim of complete provider
  coverage.
- Open gates: the in-app browser cannot synthesize the required touch gesture,
  so actual-device vertical page scrolling over maps remains owner smoke.
  External-provider freshness, owner acceptance, staging/production,
  commit, push, and deployment are not established.
- Short-height correction validation: all changed JavaScript passed
  `node --check`; the focused responsive/cascade/basemap tests passed 13/13;
  the full JavaScript suite passed 99/99; the site validator passed 18 HTML
  files, 307 JSON files, and 199 local references; and `git diff --check`
  passed. Local HTTP returned 200 for Home, Bertie, Dare, San Diego, Tropical,
  the corrected CSS assets, and the versioned Tropical module chain.
- Short-height controlled-browser revalidation is blocked in this turn. The
  in-app browser was selected while the local server was unavailable and its
  resulting error document is prevented by the browser URL policy from
  navigating back to the local site. Static checks and HTTP probes do not
  substitute for that gate. Codex did not upload the corrected files or
  independently verify staging; the supplied screenshots remain pre-correction
  evidence. The subsequent owner smoke result is recorded separately below.
- Owner smoke on 2026-08-31: the owner subsequently reported exactly, "All
  smoke tests pass." Exact pages, devices, browsers, and interactions were not
  supplied, so this closes owner smoke only at the reported overall level; it
  does not establish the still-blocked controlled-browser gate. The owner's
  planned manual corrections are outside this committed correction set until
  their exact changes are made and validated.

#### Post-Phase 9 follow-up: mobile Home map alert drawer

Implementation status: explicitly requested by the owner on 2026-09-04 and
implemented in the current uncommitted tree.

- At widths through 600 pixels, the Home Conditions alert/county key remains
  inside the Leaflet map as a compact top-right `Alerts` trigger instead of
  being moved into an always-expanded block below the map.
- The trigger opens a right-side in-map drawer. Its existing alert-type rows,
  counts, zone-highlighting behavior, unavailable-source message, and Home
  Counties boundary key are preserved. The desktop key remains continuously
  visible in its existing bottom-right position.
- The drawer exposes expanded/hidden state, makes closed content inert, moves
  focus to its 44-pixel close button, restores focus after Close or Escape,
  closes on outside pointer input, and removes its transition when reduced
  motion is requested.
- `home.css` and `homeMapOverlays.js` consumers advance together to
  `20260904-home-map-drawer-1`. The ownership contract and validator retain
  the earlier Phase 2 and Phase 5-8 cache requirements through explicit
  per-phase overrides rather than rewriting historical asset versions.
- Preservation boundary: the owner's pre-existing manual edits in
  `active/css/active.css`, `css/home.css`, `css/interactive-weather-map.css`,
  `css/styles.css`, and `css/tropical.css` remain user-owned and were not
  reverted or broadened. This follow-up adds only the Home drawer rules to the
  overlapping `css/home.css` file and does not change stations, alerts, map
  cameras, observations, providers, or generated/runtime data.

Validation record:

- Static/automated: all changed JavaScript passed `node --check`; the complete
  test suite passed 100/100; `node scripts/validate-site.mjs` validated 18 HTML
  files, 307 JSON files, and 199 local references; `git diff --check` passed.
- Local HTTP: Home plus the versioned Home CSS and map-overlay JavaScript each
  returned 200, and the served page referenced both new cache keys.
- Controlled browser: at `390x844`, the key started collapsed with no document
  overflow, opened as an in-map drawer, focused Close, and dismissed through
  Close, Escape, and outside click; Close and Escape restored focus. At
  `1280x900`, the trigger and close button remained hidden and the original
  bottom-right key remained visible. Crossing the breakpoint in both directions
  rebuilt the Leaflet control without losing its interaction handlers. The
  exercised local state had no current alerts, so live active-alert badge/count
  and highlighting remain owner/staging smoke rather than controlled-browser
  evidence.
- No files were staged, committed, pushed, deployed, generated, or deleted for
  this follow-up. Production and owner staging smoke remain open.

#### Map-first Home UI prototype

Implementation status: explicitly requested by the owner on 2026-09-04 and
implemented as an isolated test page at `test/home-map-ui/index.html`.

- The no-index test harness loads the current homepage in a same-origin frame
  and applies prototype-only CSS and JavaScript. It does not duplicate or
  replace the live Home document, controllers, sources, or runtime data.
- The map fills the usable viewport below the current site header. A compact
  overlay identifies the active mode/product and opens one modal right-side
  settings panel. The original Conditions, Radar, and Satellite tabs are moved
  into that panel with their existing event handlers.
- The panel includes all seven Conditions fields; all five Radar station
  choices and their regional/station-specific products; all six Satellite
  products; the four existing basemap choices; and the generated Radar and
  Satellite legends. These are the real controls used by the existing Home
  controllers, not look-alike prototype inputs.
- Animation playback and manual scrubbing remain on the map as frequent-use
  controls. The alert/count control remains independently visible so hazard
  access is not buried in Settings. Current station details, county alert
  popups, and the existing Satellite fallback dialog remain functional.
- A separate mode-aware information dialog explains the current Conditions,
  Radar, or Satellite view and its sources. Both prototype dialogs use native
  modal semantics, Close/Escape/backdrop dismissal, focus entry/return, 44-pixel
  prototype controls, constrained internal scrolling, and reduced-motion
  fallbacks.
- The Settings drawer leaves the map fully visible while open: its backdrop is
  transparent and applies no blur. The separate information dialog retains its
  dimmed backdrop to distinguish modal explanatory content from navigation.
- The visible Settings panel is content-sized rather than full-height. Logical
  inset and size properties, `100dvh`, and safe-area insets cap it to the usable
  viewport; `minmax(0, 1fr)` plus a zero-minimum internal scroller absorbs any
  extra option groups on shorter screens without shrinking the full dialog's
  outside-click coverage.
- Settings keeps the primary Conditions/Radar/Satellite tabs in a three-column
  grid at every viewport width. The seven Conditions fields use four columns
  and wrap to a second row; separate responsive `clamp()` type scales keep both
  groups legible without reintroducing horizontal overflow.
- On mobile, decorative Font Awesome icons are hidden from the primary weather
  tabs while the actionable Close icon remains visible. Basemap selection uses
  four equal pressed-state buttons instead of visible radio controls. The two
  prototype-only notice blocks and redundant footer Done action were removed;
  the header Close, Escape, and backdrop dismissal paths remain available.
- As a candidate sitewide compact-control standard, the prototype uses a
  44-pixel mobile interaction target for tabs, basemap buttons, selectors,
  drawer controls, range inputs, and animation playback. The play button keeps
  that target while rendering a 32-pixel visual surface; the mobile timeline
  stays on one row and omits only the redundant visible `Frame` label. Native
  selector text remains 16 pixels to avoid focus zoom on mobile browsers.
- Mobile buttons with constrained labels use the existing `data-short-label`
  contract: Conditions/Satellite become Cond/Sat, the seven Conditions fields
  use their existing abbreviations, and Dark Gray/Light Gray become Dark/Light.
  Full text and explicit accessible names remain available, and wider screens
  continue to render the unabbreviated labels.
- Radar and Satellite selectors now render their closed-state values with the
  same responsive compact type token as the condition and basemap buttons. The
  native selects retain 16-pixel text for mobile focus behavior, including the
  native option picker. A one-rem block gap now separates the final selector
  from its Legend heading.
- Shared components now live in `css/map-ui.css` in the `maps` cascade layer,
  using page-neutral `map-ui`, `map-settings`, and `map-info` classes alongside
  the existing tabset, subtabs, field, legend, and timeline classes. The owner's
  corrected native-option text color (`#b9cad6`) is preserved.
- The Home adapter remains in the `prototypes` layer and owns the outer harness,
  Home map layout, station-detail placement, and 3/4/4 weather/conditions/basemap
  grids. Future test pages can reuse the component sheet and supply their own
  layout and grid rules. Instance-specific dialog IDs remain accessible JS hooks.
- Only the Home test harness loads the shared base and adapter, in that order.
  Cache keys are `20260904-map-ui-base-1` and `20260904-map-ui-prototype-15`.
  Live pages do not load the new sheet; county and Tropical adoption remain
  subsequent prototype work.

Validation record:

- Static/automated: the prototype JavaScript and its focused test passed
  `node --check`; the focused prototype/responsive tests passed 9/9; the site
  validator passed with 19 HTML files, 307 JSON files, and 203 local references; and
  `git diff --check` passed with line-ending notices only.
- Local HTTP/browser: the PHP-served prototype loaded the current Home maps and
  data. At mobile and desktop sizes, Conditions, Radar, and Satellite switched
  through Settings; Conditions changed to Humidity; the regional Radar options
  changed to Reflectivity/Precipitation Type and KMHX exposed Reflectivity,
  Velocity, and Storm Total; all six Satellite products were present; Radar and
  Satellite legends rendered inside the panel; Dark Gray selected on the real
  active map; and the Satellite timeline retained 12/12 frames. The selector
  overlay matched the compact button type at both tested widths (10.4 pixels at
  366 pixels and 11.52 pixels at 1280 pixels), while the mobile native select
  remained 16 pixels. Radar and Satellite each measured a 16-pixel selector-to-
  Legend gap, dynamic KMHX labels stayed synchronized, and horizontal overflow
  remained zero.
- Popup/accessibility checks: Settings and map information opened by pointer
  and keyboard, focused Close, dismissed through Close or Escape, and restored
  trigger focus. The information dialog changed with the active mode. A real
  Conditions station detail and keyboard-opened Bertie County popup both
  remained functional; the station detail stayed within the mobile map width.
  No tested viewport introduced horizontal document overflow.
- Shared-base extraction recheck: controlled browsers at 1280x900 and 390x844
  rendered the extracted styles with no horizontal overflow. Settings retained
  its transparent backdrop and content-sized panel; the 3/4/4 grids, mobile
  short labels, 44-pixel controls/play target, 16-pixel native selector text,
  corrected option color, and selector-to-Legend spacing were preserved.
  Conditions, Radar, and Satellite switched successfully; Satellite displayed
  its legend and 12/12 timeline. Escape restored Settings trigger focus and the
  information dialog opened, focused Close, closed, and restored its trigger.
  The final Chrome checks captured no console warnings or errors. This is a
  component-extraction regression check, not a new provider-freshness or full
  map-lifecycle certification.
- Owner review: the owner accepted the map-first direction on 2026-09-04 and
  requested that Settings not dim or blur the map; the prototype now reflects
  that decision. The local alert state was empty, so populated alert-count and
  highlight behavior still require owner/staging smoke. This remains an
  isolated prototype rather than authorization to replace the live Home page
  or extend the shell to other page families.
- Nothing in this prototype slice was staged, committed, pushed, deployed,
  generated, or deleted. The owner's unrelated manual CSS edits remain
  untouched.

#### County map-first prototypes: 2026-09-04

The owner authorized `/test/county-map-ui/bertie/` and
`/test/county-map-ui/dare/` as the next single-zone and multi-zone templates.
Both use the existing `css/map-ui.css` base and a shared county adapter for
four-column county views/conditions/forecast/basemaps and three-column Dare
zones. Common dialog/select builders moved to `test/map-ui/components.js` and
are reused by Home; Home's cache key is now `20260904-map-ui-prototype-16`.
County assets use `20260904-county-map-ui-3`. No live consumer was added.

Original county controllers and data paths remain in the iframe, including
alerts/HWO, station details, forecasts, meteograms, animation, and zone state.
Forecast content has a bounded scroller; map timestamps and controls remain
separated. The county adapter corrects accordion/sibling-dependent visibility
after control relocation. Full scope and validation are recorded in
`docs/county-ui-next-session-plan.md` and `test/county-map-ui/README.md`.

The focused static suites pass 14/14, the validator passes 21 HTML/307 JSON/209
references, and desktop/mobile browser checks pass for both templates. The
local hourly cache cannot supply the tested meteogram ranges, so fresh-chart
and populated-alert smoke remain open. Live promotion, owner acceptance,
staging/commit, and deployment remain separate gates.

#### Phase 10: Original-site layout refinements

Status: first bounded slice authorized and implemented locally on 2026-09-09:
the typography-token and fluid-padding changes recorded above. Owner smoke for
this slice is pending. This follows the original CSS/UI Phases 0-9 and concerns
V1; it does not resume the separate map-first V2 workflow.

The original additional layout preferences still lack their exact pages,
elements, and desired behavior. Keep that backlog pending; the CSS audit approval
authorizes only the first slice above, not an unspecified redesign or V2 proposals.

1. Record each requested change with its page, element, current layout, desired
   result, and relevant desktop/mobile context.
2. Agree on a bounded implementation slice, preserving the accepted component
   ownership, accessibility, page lifecycle, and weather/data contracts.
3. Apply only that slice and update affected asset references consistently.
4. Run focused static checks and desktop/mobile browser checks for the affected
   page families; record owner acceptance separately.

Existing technical closeout findings remain in the closeout record above. They
are not silently reclassified as optional layout preferences. Further slices
start when the owner supplies and requests concrete changes. Git publication
and deployment remain separate.

## Automated drift prevention

Extend `scripts/validate-site.mjs` and its machine contract to check, at minimum:

- the public route set and required dependency-only consumers;
- local Leaflet 1.9.4 references and required adjacent assets;
- canonical stylesheet order before layers and valid layer ownership afterward;
- forbidden remote Leaflet URLs;
- forbidden legacy selectors after each migration slice;
- base component plus approved modifier usage;
- required JavaScript `data-*` hooks and preserved required IDs;
- prohibited shared base selectors in page-family stylesheets;
- prohibited page-family stylesheet imports on unrelated routes;
- static inline presentation, with a narrow documented allowlist where necessary;
- expected cache-busting agreement across affected consumers;
- no unlayered application rules after Phase 8.

Keep exceptions few, named, and justified in the contract. An unrestricted allowlist would recreate the ownership problem in another form.

## Validation plan

Validation categories remain separate. Passing one does not imply another.

### Static and automated

- `node --check` for every changed JavaScript file
- `php -l` for any changed PHP file
- JSON/XML parsing for changed machine-readable files
- focused component/controller tests
- `node scripts/validate-site.mjs`
- focused searches for renamed/removed classes, IDs, hooks, CDN URLs, and stylesheet consumers
- `git diff --check`
- the repository CI baseline before a Git checkpoint

### Controlled browser

At minimum, exercise every sitemap route at:

- mobile near `390x844`
- desktop near `1280x900`

Run a wider representative sweep at `320`, `360`, `430`, `768`, `1024`, and `1440` pixels for:

- Home
- a standard single-zone county
- a multi-zone county
- San Diego
- Tropical Overview
- Active Storms
- an informational page

These widths are validation samples, not automatic CSS breakpoints.

Check:

- header-to-title spacing and semantic heading order;
- title, label, tab, selector, and card consistency;
- keyboard order, visible focus, target size, and reduced motion;
- text zoom, wrapping, clipping, and horizontal overflow;
- direct links, refresh, Back/Forward, and URL-owned basin/zone/storm state;
- dialogs, menus, tabs, selectors, and focus restoration;
- map size, camera, controls, timestamps, status text, legends, markers, playback, pause, scrubbing, and fallback behavior;
- every popup family at narrow and wide sizes;
- browser console and network behavior, with provider failures reported separately.

Dependency-only pages receive the smallest checks needed to prove compatibility and shared dependency loading.

### Owner review

- Wave A: general interface system across public routes
- Wave B: map interface, popup system, and final cascade

Record exactly which pages, devices, widths, and interactions the owner checks. Do not convert owner smoke into controlled-browser evidence or vice versa.

The 2026-08-26 report and its layout findings are historical evidence. On
2026-09-09 the owner reported a DevTools pass and deferred further layout
preferences to Phase 10. Owner acceptance is recorded at that reported level;
the separate technical closeout finding and missing verification are listed in
the current closeout record above.

### External providers and production

External NWS/NHC/NOAA availability and source freshness are separate from CSS
correctness. A read-only audit of the actual staging target on 2026-08-26 found
Home, Dare, the Phase 8 cascade sheets, self-hosted fallback tile, current logo,
and ArcGIS-enabled map module at `200`. Browser checks rendered nonzero ArcGIS
tiles with a clean Dare console. Dare/NC packages and the Atlantic overview
were current; California Conditions existed but retained an August 22 embedded
generation time. The earlier probe of another public domain was not evidence
for this deployment. The installed California publisher/log, production PHP/CA
capability, and future `chuckcopelandwx.com` replacement remain open; no
staging or production state was changed by the audit.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Shared visual changes break a page-specific workflow | Inventory controllers and variants first; migrate a component across all consumers atomically |
| Removing legacy classes breaks JavaScript | Move hooks to IDs/`data-*`, update controller/tests/validator in the same slice, and search for every old selector |
| Page sheets begin owning shared components again | Enforce the machine ownership contract through the existing validator |
| Layered vendor CSS unexpectedly outranks or loses to app CSS | Self-host first, stabilize ordinary order, then wrap vendor CSS in the vendor layer and layer all app rules |
| Fluid sizing creates text or map extremes | Use bounded `clamp()` values, intrinsic layout, content-driven queries, zoom testing, and width sweeps |
| One visual style damages semantic hierarchy | Separate semantic heading level from named visual role |
| Inline styles are removed even though code depends on them | Classify static, initial-state, and runtime styles in Phase 0; replace behavior atomically |
| Cache-buster drift serves mixed CSS | Inventory and update every affected consumer together; validate matching references |
| Homepage measurements are copied despite an accessibility flaw | Treat the homepage as direction and require evidence for objective corrections |
| The project drifts during a long component migration | Maintain the ledger, validate after every atomic component slice, and stop at the two broad owner-review gates |

## Completion criteria

The plan is complete only when:

1. Every in-scope route uses the agreed shared component names and styling roles.
2. Home, Tropical, and Active no longer load County CSS.
3. Shared components have one documented owner and only explicit, tested variants.
4. Old presentation class names are absent from HTML, CSS, JavaScript, tests, and generated markup paths.
5. JavaScript hooks use approved IDs or `data-*` attributes and required existing IDs remain intact where product contracts require them.
6. Leaflet 1.9.4 is served locally with all required assets and provenance.
7. The final cascade layers and validator ownership contract pass.
8. Static, controlled-browser, and both owner-review waves pass with separate evidence.
9. All sitemap routes pass heading, focus, target-size, text-zoom, popup, and no-horizontal-overflow checks.
10. Current County, Tropical, Active, navigation, map, and accessibility product contracts remain intact.
11. The current handoff documents record exact implementation status, validation, remaining gates, and the next authorized action.
12. Deployment and production status are reported truthfully and separately.

Phases 0-9 are implemented and the owner DevTools acceptance is recorded. The
two tracked local closeout items, CSS-CLOSE-01 and the broader short-height
browser matrix, are resolved by the repair and September 9 verification above.
This does not expand owner device coverage or establish provider/production
readiness. Phase 10's first typography/padding slice is implemented locally;
further layout preferences remain pending.
The Home drawer is part of V1 checkpoint `0448038`; map-first prototypes belong
to the separate V2 project and are not V1 continuation work.

## Questions and decision gates

The original-site baseline is owner-accepted at the September 9 DevTools level.
Both tracked local closeout findings are resolved; retain separate device,
populated-alert, provider, and production evidence limits. Phase 10's first
typography/padding slice is implemented locally; its owner smoke and text-zoom
checks remain open. Earlier V1 work is committed in `04f8502`; the new slice is
included in the CSS checkpoint described above. Preserve later working changes. V2
implementation, Git publication, deployment, scheduler changes, and weather-data
mutation are outside this continuation unless separately requested.

Before each later phase, confirm the previous gate and the exact authorized slice. Do not treat this roadmap as blanket implementation approval.

## New-session startup prompt

```text
Continue after Phase 10's first typography-token/fluid-padding slice in:

K:\Web Design\NCHurricane 2025

Before changing files:

1. Read `AGENTS.md` completely.
2. Read `docs/site-css-architecture-and-ui-standardization-plan.md` completely.
3. Read `docs/county-ui-next-session-plan.md` and
   `docs/tropical-map-next-session-plan.md`.
4. Run `git status --short --untracked-files=all` and
   `git log -5 --oneline`.
5. Treat every existing working-tree change as user-owned unless the current
   task proves otherwise.
6. Do not stage, commit, push, deploy, change production data, or delete
   generated/runtime files without explicit authorization.

At the latest September 9 update, HEAD was `04f8502`, including the V1 Home
drawer, V2 separation, and local closeout repairs. Verify fresh Git state; do not infer remote or
deployment state from this checkpoint. Phases 0-9 are implemented. The owner
reported exactly, "Ok, from the dev tools all look good." Pages, devices,
viewports, and individual interactions were not specified, so preserve this as
owner evidence only. It does not establish acceptance of the new Phase 10 slice.

Read the resolved closeout record before changing code. CSS-CLOSE-01 is repaired:
navigation only handles Escape for its own open menu/submenu and respects an
already-handled event. All 17 consumers use 20260909-navigation-escape-1. The
focused tests passed 23/23, the tracked V1 suite plus new tests passed 51/51,
syntax/PHP lint and site validation passed, and 158 browser viewport cases
completed without horizontal document overflow or collapsed visible maps.
Home drawer, mobile Menu, and desktop submenu focus checks passed. Preserve
the committed repair and its evidence; do not repeat these two closed items
without a new change or failure that justifies revalidation.

Read the current Phase 10 first-slice/checkpoint record above and preserve its
CSS, version references, contract, and documentation. Owner smoke and 200% zoom
remain separate. Obtain specific pages/elements/results before starting further
layout slices. Preserve V1 behavior, manual work, and generated weather data.
Do not resume or require ignored map-first files; that workflow now belongs to
K:\Web Design\NCHurricane V2 and remains paused. Old prototype approvals and
continuation prompts in dated records are historical only.

Actual-device touch, populated Home alerts, source freshness, and deployment
remain separate evidence. The old staging/California observations are dated
August evidence and must be refreshed before claiming their current status.
Do not stage, commit, push, upload, change schedulers, publish caches, or delete
files unless the owner separately requests those actions.

Durable decisions:

- Use BEM-style component classes and IDs/data attributes for JavaScript hooks.
- Do not retain legacy class aliases.
- Migrate component-by-component but site-wide.
- Update non-sitemap dependency consumers only when dependency changes require it.
- Retain `home.css` only for genuinely homepage-specific rules.
- Self-host unchanged Leaflet 1.9.4 before CSS migration; introduce cascade
  layers only after ownership and load order are stable.
- Prefer intrinsic layout, fluid values, and container queries; use media
  queries only for true viewport-level structural changes.
- Enforce ownership through the existing site validator without adding a
  framework, bundler, preprocessor, or third-party CSS lint dependency.
- Use two owner-review waves: general UI first, shared map UI and final cascade
  architecture second.
- Raise evidence-based objections when a requested choice would weaken UI/UX,
  accessibility, maintainability, consistency, or existing behavior.
```
