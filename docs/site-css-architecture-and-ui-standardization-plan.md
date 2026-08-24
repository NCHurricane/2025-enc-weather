# Sitemap-Wide CSS Architecture and UI Standardization Plan

Updated: 2026-08-24  
Repository: `K:\Web Design\NCHurricane 2025`  
Status: approved planning direction; implementation has not started  
Authorization boundary: this document is a roadmap, not authorization to begin a phase, stage, commit, push, deploy, change production data, alter scheduler state, or delete generated/runtime files.

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

- `tropical_at.html`
- `tropical_ep.html`
- `counties/bertie/index_test.html`
- test or compatibility pages discovered by the Phase 0 dependency inventory

Do not broaden dependency maintenance into a visual redesign or promotion of a prototype.

### Explicitly out of scope

- New product families, weather sources, stations, zones, map layers, or data workflows
- Frameworks, bundlers, preprocessors, or a new CSS lint dependency
- A Leaflet major-version upgrade
- Removal of compatibility routes or script-owned IDs without validated parity and separate approval
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

1. Consolidate color, type, spacing, radius, shadow, border, motion, content-width, and z-index tokens in `styles.css`.
2. Define a shared page shell and the spacing between the full header/breadcrumb region and the first page element.
3. Add the page-root classes.
4. Replace magic values only when the new token represents a real repeated design decision.
5. Remove misleading breakpoint custom properties.
6. Keep utility classes limited and purposeful; do not recreate a utility framework.

Acceptance: all page families begin at a consistent visual rhythm, with documented variants and no horizontal overflow.

#### Phase 3: Titles, headings, labels, and text roles

1. Define canonical roles such as page title, section title, card title, eyebrow, label, helper text, metadata, and status text.
2. Apply semantic headings according to document structure and the shared visual classes according to role.
3. Move Tropical and Active inline title presentation into their page styles or shared modifiers.
4. Preserve the Active storm-title metadata and Tropical branding behavior.
5. Use fluid type values only within safe bounds and verify zoom/long-label behavior.

Acceptance: titles and labels are consistent by role, not flattened into one identical style; heading hierarchy and accessible names remain correct.

#### Phase 4: Cards, tabs, selectors, buttons, menus, and dialogs

1. Establish shared component markup and BEM classes.
2. Move common rules into `components.css`.
3. Use container queries for reusable components whose layout depends on card width.
4. Use page modifiers or root variables only for documented differences.
5. Separate presentation selectors from JavaScript hooks.
6. Replace static inline display/width presentation with state classes, `[hidden]`, or owned component rules where behavior permits.
7. Preserve all accepted keyboard, focus, alert-dialog, menu, selector, and scroll-lock behavior.

Acceptance: each migrated component has one base owner, explicit variants, no legacy alias, and equivalent or better keyboard/touch behavior.

### Wave A owner review

Review the 15 public routes after the general interface migration. Compare against the recorded homepage direction and baseline screenshots. Resolve approved discrepancies before starting shared map work so Wave B does not hide general-layout regressions.

### Wave B: Shared map interface and final cascade architecture

#### Phase 5: Map card and shared map controls

1. Make `.weather-center-map-card` or its approved replacement the canonical shared map-card block.
2. Define bounded fluid map height with an owned custom property and modern viewport units so maps neither collapse nor overflow the available layout.
3. Centralize timestamps/status overlays, source labels, legends, scrubbers, play controls, layer controls, markers, and city-label presentation in `interactive-weather-map.css`.
4. Keep Tropical/Active engine-only presentation in `tropical-map-engine.css`.
5. Remove the County timestamp and label overrides already made redundant by the shared behavior.
6. Preserve provider/product selectors, map status content, frame counts, animation pools, camera policy, and all interaction behavior.

Acceptance: identical shared map elements have identical markup, names, and base presentation across families; variants are explicit and local.

#### Phase 6: Popup system

Create one shared Leaflet popup shell plus purpose-specific content variants:

- Homepage county popup
- County observation/temperature popup
- Tropical overview popup
- Active-storm popup

The shared map stylesheet owns Leaflet wrapper normalization, maximum inline size, padding, close target, tip, focus, overflow, and generic paragraph rhythm. Page-family styles own only their content variant. Generated popup markup and JavaScript class names must be updated in the same slice.

Do not apply broad `.leaflet-popup-content p` rules site-wide when only one popup family needs a change. Scope content spacing to the shared popup block or its modifier so Leaflet or other popup families are not unintentionally changed.

Acceptance: popups fit narrow viewports, do not obscure required controls unnecessarily, retain readable content and touch targets, and pass mouse, touch, keyboard, close, link, and focus checks.

#### Phase 7: Remove cross-family dependencies and dead ownership

1. Remove `counties/css/county.css` from Home, Tropical, Active, and compatibility consumers once every required dependency has a shared or correct family owner.
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
- Update non-sitemap compatibility pages only when dependency changes require it.
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
