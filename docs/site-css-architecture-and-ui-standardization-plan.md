# Sitemap-Wide CSS Architecture and UI Standardization Plan

Updated: 2026-08-24  
Repository: `K:\Web Design\NCHurricane 2025`  
Status: Phase 0 approved; Phases 1-3 and the owner-directed legacy-page cleanup committed in `edc6a50`; owner-accepted Phase 4 committed in `1f6b0b1`; owner-accepted Phase 5 committed in `af8577a`; CI portability repair committed locally in `7a32866`; owner-accepted Phase 6 committed locally in `5448d61`; Phase 7 complete locally and owner-accepted but not committed; Phase 8 remains gated

Authorization boundary: this document is a roadmap, not authorization to begin a phase, stage, commit, push, deploy, change production data, alter scheduler state, or delete generated/runtime files.

## Current implementation status

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

Sitemap CSS Phase 7 is complete and owner-accepted in the local working tree at
baseline `5448d61`:

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
- Phase 7 is not staged or committed. Nothing was pushed, deployed, generated,
  or deleted; production/generated data and runtime artifacts were not changed.
  Phase 8 cascade layers remain unstarted and require explicit authorization.
- Owner smoke on 2026-08-24: after starting the bounded fixture router, the
  owner confirmed that deterministic `AL052025` loaded and that its alert popup
  worked, supplied a screenshot of the Coastal Colleton Tropical Storm Warning
  polygon/popup, and then reported exactly, "Ok, then it has passed." The
  fixture intentionally contains one SC zone for both wind and surge, so that
  screenshot is correct for the subset rather than evidence of the historical
  advisory's complete SC/NC extent. This closes Phase 7 owner review at the
  reported overall level; the other smoke pages/devices were not individually
  named in the final confirmation. Phase 8 was not authorized.
- A separate modification to `css/styles.css` appeared after Phase 7
  implementation and automated/browser validation. It is treated as
  user-owned, was not edited or absorbed here, and is outside the recorded
  Phase 7 validation boundary.

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
Phase 7 is complete locally and owner-accepted. Phase 8 remains gated.

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

Implementation status: complete and owner-accepted locally on 2026-08-24 at
baseline `5448d61`; not yet committed. Phase 8 remains gated and unstarted.

1. Remove `counties/css/county.css` from Home, Tropical, and Active once every required dependency has a shared or correct family owner.
2. Move reusable rules out of `home.css`; retain only homepage composition and explicit variants.
3. Remove migrated duplicate selectors, stale overrides, obsolete inline presentation, and unused legacy class names.
4. Update JavaScript hooks, tests, cache keys, and validator contracts atomically.
5. Use reference searches to prove every removed selector and file dependency is gone.

Acceptance: no page depends on an unrelated family stylesheet, and no old class is retained as an undocumented compatibility layer.

#### Phase 8: Introduce cascade layers

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

### External providers and production

External NWS/NHC/NOAA availability and source freshness are separate from CSS correctness. Deployment, production cache keys, server file paths, CDN/cache behavior, PHP capability, and production browser behavior remain open until separately authorized and verified.

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

## Questions and decision gates

There are no unresolved questions preventing Phase 0. Phase 0 may expose page-specific ambiguities—especially where a similar-looking title, label, popup, or control serves a different semantic or interaction role. Bring those cases back with screenshots, computed styles, consumer lists, and a recommendation rather than guessing.

Before each later phase, confirm the previous gate and the exact authorized slice. Do not treat this roadmap as blanket implementation approval.

## New-session startup prompt

```text
Continue the sitemap-wide CSS architecture and UI standardization work in:

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

Begin with Phase 0 only: build the read-only selector, consumer, JavaScript-hook,
stylesheet-owner, and responsive-behavior inventory for the 15 sitemap routes
plus required dependency consumers.

Use the current homepage as the visual direction, not as an unquestionable
numeric specification. Record the homepage commit and baseline screenshots
before implementation. Identify accessibility, overflow, target-size,
semantic-heading, duplicate-ownership, inline-style, and cross-page consistency
problems with evidence.

Do not begin implementation until the Phase 0 ownership matrix, proposed
old-to-new class mapping, page-specific variants, and two-wave validation
boundary have been reviewed and authorized.

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
