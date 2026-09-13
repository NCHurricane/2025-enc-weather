# County UI: Current Handoff

## Phase 11 local closeout — 2026-09-12

**Local status: complete. Owner actual-device/200% zoom acceptance remains open.**
This section and the continuation prompt at the end are the current V1 handoff.
All earlier implementation, planning, repository-boundary, prototype, staging,
and "next course" entries are dated historical evidence. Their references to
uncommitted work, older asset versions, unstarted phases, or current remote
packages do not describe today's checkout or authorize work.

### Verified checkpoint and preservation boundary

The requested Git recheck found `HEAD`, `main`, and the local `origin/main`
tracking ref at `d7c9f2d` ("Changes to styling and layout"), with a clean working
tree and no newer commits. No fetch or remote/deployment verification was run.
That commit includes the initial Phase 11 implementation and all September 12
HWO, parameter-button/layout, and forecast-label follow-ups below. Their
"nothing committed" statements describe those earlier work sessions only.

This closeout adds one bounded mobile CSS correction, its ten template asset
references, the stylesheet-version contract, and this handoff. These new edits
are uncommitted. The owner's existing CSS tuning, JavaScript, Home, county
sources/stations/zones, San Diego exceptions, legacy Bertie forecast structure,
and generated weather data remain preserved. Nothing was staged, committed,
pushed, deployed, generated, or deleted; caches, logs, scheduler state, and
ignored V2 material were not modified.

### Approved behavior and the one local correction

- Weather Center retains Conditions / Radar / Satellite; Forecasts is a separate
  card below it. Every forecast period remains a full-width row with matching,
  initially collapsed native `details`/`summary` content.
- Full/short forecast labels remain `7-Day` / `7-Day`, `Meteogram` / `Meteo`,
  `Discussion` / `Disc`, and `Hazardous Weather` / `Haz Wx`. Short labels apply
  to Forecast-card content widths at most 600px; full accessible names remain,
  including `Hazardous Weather Outlook`.
- Live-page HWO remains inline only while current, clears on zone loading and
  expiry, and retains metadata and validated official links. Active alerts
  remain in Alerts. The retained Bertie test keeps its legacy HWO dialog and
  separate forecast/Detailed structure.
- Desktop Meteogram parameters remain a compact centered group with 4px gaps.
  The committed mobile layout also computes to flex; older "mobile grid"
  descriptions are historical. Its padding, typography, colors, hour-button
  wrapping, and spacing were retained. At 320px the committed `Precip` label
  wrapped, making all five parameter buttons 46px tall. The bounded correction
  gives mobile parameter items an intrinsic minimum width and keeps their text
  on one line, restoring five fitting 32px buttons. It applies only at viewport
  widths up to 600px and leaves the 601px-and-wider rules untouched.
- The owner's committed disclosure summary target is 24px, not the historical
  44px measurement. It remains keyboard operable; no sizing was reverted.
  Dare, Hyde, and San Diego zone selectors remain one row at 320px, with heights
  of 48px, 44px, and 48px respectively in the final checks.

Changed source owners: `counties/css/county.css`; all nine live County
`index.html` files and `counties/bertie/index_test.html` (CSS reference only);
`scripts/css-ownership-contract.mjs`; this document. All ten County CSS
consumers now use `20260912-phase11-closeout-1`. Unchanged module versions are
`20260912-phase11-hwo-2` for HWO/forecast/app controllers,
`20260912-meteogram-buttons-1` for meteogram modules/entry wrappers, and
`20260912-phase11-1` for Weather Center/data loaders. Shared CSS and Home asset
references retain the owner's committed versions.

### Validation evidence and reuse

- **Static/automated, fresh:** 16/16 tests pass from
  `county-forecast.test.mjs`, `county-zone-normalization.test.mjs`, and
  `css-phase7-ownership.test.mjs`; `node --check` passes the changed stylesheet
  contract; site validation passes 18 HTML, 352 JSON, and 199 references.
  The focused reference search finds the new County CSS version in exactly ten
  templates and its contract, with no old live reference. `git diff --check`
  passes; Git reports line-ending notices only. No PHP or weather JSON changed.
- **Static/automated, reused:** the September 12 parameter/HWO entries record
  all 76 Node tests and 83 JavaScript/MJS syntax checks passing; the initial
  implementation records 70 tracked PHP lints and 20 HWO PHP assertions.
  Unchanged code retains those gates. They were not all rerun for this CSS-only
  correction; the CI baseline remains required if changes later reach Git.
- **Fixture/runtime/API:** the 16-test run rechecks forecast single-fetch,
  matching/escaped details, failure and superseded-response handling, HWO
  freshness/expiry/metadata/link validation, and alert failure versus valid
  empty states. Prior browser-only HWO absent/stale/expired/unavailable,
  live-expiry focus restoration, zone-loading clearance, and alert-dialog
  fixtures are reused from the HWO follow-up, whose runtime code is unchanged.
  No new response fixture or generated weather file was needed.
- **Local HTTP:** reused the existing PHP preview at
  `http://127.0.0.1:8085/`. Bertie forecast/alerts/hourly, Hyde config/mainland
  alerts, and versioned County CSS return 200. Bertie forecast has 14 periods;
  forecast/hourly generation is `2026-09-12T17:47:34-04:00`. Its local HWO is
  `ok`, AKQ/NCZ030, issued `2026-09-12T04:27:00-04:00`, valid until
  `2026-09-13T04:30:00-04:00`. Hyde Mainland HWO is `ok`, MHX/NCZ081, issued
  `2026-09-12T16:00:00-04:00`, valid until `2026-09-13T16:00:00-04:00`.
  These are local package observations, not fresh upstream certification.
- **Controlled browser, fresh:** final saved CSS passes visible parameter checks
  on all nine live pages and retained Bertie test at 320x844: five fitting,
  single-line 32px buttons and zero horizontal document overflow. All three
  multi-zone selectors remain one row. Bertie passes 1280x900, 390x844, and
  the parameter rule's 600/601px viewport boundary, with centered controls,
  exactly 4px gaps, fitting labels, and no overflow; Space selects a parameter
  and updates `aria-pressed`. The legacy test retains its original tabs,
  separate Detailed mount, and two-column narrow forecast layout.
- **Controlled browser, committed-style reconciliation:** Bertie desktop/mobile
  has 14 full-width periods; Enter/Space opens two native disclosures and both
  stay open after changing forecast tabs. Full accessible tab names and the
  short visible labels pass. The label container-query boundary is bracketed
  by Forecast content widths 599.125px (short labels at a 636px viewport) and
  600.09375px (full labels at 637px). Hyde at 320px shows current inline HWO
  with MHX/NCZ081, issued/valid-until/area metadata and the validated official
  product link. The small subsequent CSS patch affects only parameter items.
- **Controlled browser, reused:** the initial Phase 11 and September 12
  follow-ups retain the broader all-nine desktop/390px/320px row/tab checks,
  zone switches/reload/Back/Forward, invalid-zone normalization, hidden-HWO
  keyboard behavior, active-alert dialogs, parameter fallback/reinitialization,
  Radar/Satellite controls, Home shared-module regression, and legacy Bertie
  behavior. None of their JavaScript or map owners changed in this closeout.
- **Console/network:** regression consoles have no captured warnings/errors.
  A fresh final Bertie reload/Meteogram sample captured 76 responses without
  truncation, HTTP errors, or failed requests; new CSS and local
  forecast/alerts/hourly packages returned 200. An earlier long-run capture
  truncated, so it is not claimed as complete network coverage. The temporary
  CSS probe was removed by reload; viewport overrides and both test tabs were
  closed/reset. The existing PHP preview remains running.
- **Owner:** no new actual-device or actual 200% browser/text-zoom result was
  supplied. Prior owner DevTools/general acceptance does not close this gate.
  Viewport emulation is not zoom or touch evidence.
- **External provider:** no new upstream freshness/availability certification.
  Local Conditions displayed old observation times and zero fresh sites in
  the sampled cache; successful local rendering does not establish fresh data.
- **Deployment/production:** not attempted or verified. Historical staging,
  California cache, scheduler, and future production statements below remain
  dated evidence, not current remote status or authorization.

### Short owner checklist and next bounded V1 recommendation

On an actual phone and an actual desktop browser set to **200% zoom in its
browser menu**, record device/browser, page/zone, zoom, and pass/fail:

1. Bertie: scroll Weather Center through Forecasts; check full-width rows,
   readable tabs, no horizontal overflow, and multiple independent Details
   disclosures. Use keyboard arrows/Home/End and Enter/Space on desktop.
2. Bertie and San Diego: toggle multiple Meteogram parameters, check the visible
   selected state/chart legend and Temperature fallback; confirm `Precip` fits
   and the accepted hour-control wrapping remains usable.
3. Dare, Hyde, San Diego: switch zones, refresh, and use Back/Forward; confirm
   selector fit, matching refreshed content, and immediate removal of old HWO.
4. Where current HWO/alerts exist, check inline metadata/source access and
   separate alert-dialog Close/Escape/focus return. Check normal touch scrolling
   over maps/text products. Report absent HWO/alerts as unexercised, not passed.

**Recommended next bounded V1 step, for owner approval:** perform this Phase 11
actual-device/200% zoom acceptance pass, then triage only concrete reported
findings. No next feature phase is proposed or begun. V2, broad responsive
retuning, staging/commit/push, upload, data refresh, and scheduler work remain
outside this authorization. Read this closeout first even if an older roadmap
still labels Phase 11 "planned" or "uncommitted."

## Phase 11 forecast tab labels — 2026-09-12

All nine live County templates now use `7-Day`, `Meteogram`, `Discussion`, and
`Hazardous Weather`. Their `data-short-label` values are `7-Day`, `Meteo`, `Disc`,
and `Haz Wx`. Scoped County CSS displays these short labels when the Forecast
card is at most 600px wide. Full accessible names, including Hazardous Weather
Outlook, remain explicit; tab IDs, keyboard behavior, and HWO freshness rules
are unchanged. The retained Bertie test keeps its original labels.

Changed files: the nine templates, County CSS, its reference in the retained
test template, the stylesheet-version contract, existing forecast-test label
expectations, and this handoff. CSS version: `20260912-forecast-labels-1`.

Validation: 11 focused forecast/CSS tests, both changed MJS syntax checks, site
validation (18 HTML, 352 JSON, 199 references), and `git diff --check` pass.
Controlled Bertie checks at 1280x900, 390x844, and 320x844 confirm the labels,
active colors, full accessible names, keyboard selection, and no overflow.
Dare and San Diego pass 320px checks, including hidden HWO on San Diego; the
retained Bertie labels remain unchanged. The sampled network capture returned
the new CSS with HTTP 200 and no failures; console checks were clear. Temporary
viewport overrides and the test tab were removed. Existing work and generated
weather data are preserved; nothing was staged, committed, pushed, or deployed.
Actual-device/200% zoom owner smoke and production remain open.

## Phase 11 compact desktop parameter layout — 2026-09-12

The owner clarified that Meteogram parameter controls should form a narrow,
centered group like the hour buttons. At widths of 601px and above, the
parameter container now uses flex layout, content-sized items, and 4px gaps;
button padding, font size, and weight match the hour controls. The earlier
200px grid override was removed. The owner's mobile grid, minimum sizing,
border/background removal, and spacing edits were preserved.

This slice changes `counties/css/county.css`, its references in all ten
consuming County/test templates, the stylesheet-version contract, and this
handoff. The CSS version is `20260912-meteogram-layout-2`; JavaScript asset
versions are unchanged.

Validation: both focused CSS ownership tests, contract syntax, site validation
(18 HTML, 352 JSON, 199 references), and `git diff --check` pass. Controlled
desktop checks on all nine County pages plus the retained Bertie test confirm
centered groups, exactly 4px gaps, matching hour-button padding/font size, and
no horizontal overflow. Mobile checks at 390px and 320px retain the grid;
600px/601px checks confirm the intended breakpoint without overflow. Keyboard
parameter selection and the regression console pass. Existing Phase 11 work
and generated weather data are preserved; nothing was staged, committed,
pushed, or deployed. Actual-device/200% zoom owner smoke and production remain
open. The local preview is refreshed to Meteogram.

## Phase 11 Meteogram parameter buttons — 2026-09-12

All 50 `.meteogram-param-item` controls across the nine County pages and the
retained Bertie test page now contain native toggle buttons instead of
checkbox/label pairs. `aria-pressed` exposes each selection; the same yellow
active styling, hover, and keyboard focus treatment as the Meteogram time-range
buttons is reused. Several parameters can be selected together. If the final
parameter is deselected, the existing Temperature fallback now visibly selects
Temp as well, keeping the controls consistent with the chart.

Both shared and San Diego meteogram controllers read button state. Repeated
chart initialization replaces owned parameter/time-range handlers so tab/zone
reloads do not accumulate callbacks or toggle a button twice. Data sources,
chart datasets, time-range choices, and the test page's other legacy behavior
are preserved. Concurrent CSS sizing/alignment edits were retained: parameters
currently use a 24px minimum and render at 32px high. Precip has enough width to
remain on one line at 320px.

Changed files: the ten templates, `counties/css/county.css`, both meteogram
modules, County entry-wrapper asset references, the asset contract, and the
zone-reference test. Changed CSS/meteogram/entry assets use
`20260912-meteogram-buttons-1`; HWO, Weather Center, and data-loader versions
remain unchanged from their preceding slices.

Validation: all 76 existing Node tests, 83 JavaScript/MJS syntax checks, site
validation (18 HTML, 352 JSON, 199 references), and final `git diff --check`
pass. No PHP changed. All nine pages pass final desktop 1280x900 and mobile
390x844/320x844 layout checks (27 cases): five buttons, no parameter checkboxes,
readable labels, and no horizontal overflow. Keyboard multi-selection,
Temperature fallback, chart legend changes, reopening Meteogram on Bertie,
Dare, Hyde, and San Diego, a San Diego zone reload, and retained Bertie test
controls pass. The local Bertie hourly package returned HTTP 200; the sampled
network capture and regression console reported no failures/warnings/errors.

Existing Phase 11 work and generated weather data were preserved. Nothing was
staged, committed, pushed, or deployed. Actual-device/200% zoom owner smoke and
external-provider/production verification remain open. The local preview was
refreshed to Meteogram for review.

## Phase 11 HWO inline-tab follow-up — 2026-09-12

The owner replaced the earlier HWO button/dialog decision: HWO is now the fourth
tab in `.subtabs--forecast`, with its own section inside
`.weather-center-forecast-content`, similar to Discussion. This is implemented
across all nine original V1 County pages. The complete label remains readable
on desktop and mobile, including 320px, and hidden HWO leaves three equal tabs.

Only nonempty HWO with `status: ok` is displayed. A supplied `validUntil` must
also be valid and unexpired; stale, expired, missing, not-applicable, and
unavailable products have no tab or retained inline content. Expiry is checked
while the page stays open and when it becomes visible again. Issued/valid-until
times, NWS office, zone, applicable area, escaped source text, and validated
official link remain in the inline panel. The nine live pages create no HWO
dialog or scroll lock. Active-alert dialogs are unchanged, and the retained
Bertie test page still uses its original HWO dialog, including stale behavior.

Forecast tab navigation skips hidden tabs. If the selected HWO disappears,
Forecast becomes active; focus returns there when it was within HWO. Zone
loading clears the previous product immediately. Existing forecast rows,
disclosures, Meteogram, Discussion, and zone-selection behavior remain intact.

Changed owners: the nine County templates; `countyForecast.js`, `countyAlerts.js`,
both County app controllers, and `county.css`. County entry wrappers, the
retained test template, and contract/test expectations received matching asset
references. These changed assets use `20260912-phase11-hwo-2`; Weather Center,
data loaders, and meteogram asset versions remain `20260912-phase11-1`.

Validation: all 76 Node tests, 83 JavaScript/MJS syntax checks, site validation
(18 HTML, 352 JSON, 199 local references), and `git diff --check` pass. No PHP
changed in this follow-up. Controlled-browser checks pass all nine pages at
1280x900, 390x844, and 320x844 (27 cases), with fitting tab labels, no horizontal
overflow, and no live-page HWO dialogs. Browser-only fixtures verify stale,
expired, missing, unavailable, and not-applicable HWO; active alerts remain
visible. Live expiry clears an open HWO and restores focus from its source link
to Forecast. A Dare zone switch clears old content during loading, hides a stale
replacement, skips HWO during keyboard navigation, and recovers with real data.
Native disclosures, Meteogram/Discussion, active-alert dialogs, and the retained
Bertie HWO dialog were checked. No console warnings/errors occurred in this
follow-up regression tab; local HWO package HTTP/identity checks passed.

This follow-up preserved the existing uncommitted Phase 11 work and generated
weather data. Browser response fixtures were cleared and real data restored.
Nothing was staged, committed, pushed, or deployed. Actual-device owner smoke,
actual 200% browser zoom, external-provider freshness, and production remain
separate open gates. The local PHP preview remains available on port 8085.

## Initial Phase 11 implementation — 2026-09-12

Historical implementation evidence. The HWO tab follow-up above supersedes this
entry's standalone button/dialog and stale-display behavior on the nine pages.

The owner approved the proposal and all recommendations, including the bounded
Alerts failure correction. Implementation started from clean `446fc43` on
`main`. The later owner instruction to show forecast periods as rows at every
viewport supersedes the proposed three/two/one-column layout. Implementation
and local validation are complete; staging, commit, push, deployment, generated
data changes, and the next phase remain unauthorized.

### Result and ownership

- All nine original V1 County pages now have Conditions / Radar / Satellite in
  Weather Center, followed by an independent Forecasts card with Forecast /
  Meteogram / Discussion tabs. Each period occupies one full-width row at every
  viewport. Matching details are collapsed native `details`/`summary` elements;
  several periods can remain expanded. Both views use the same fetched period
  list, eliminating the duplicate forecast request.
- HWO is a separate, fully labeled button in the forecast header, outside the
  tablist. Active alerts remain in Alerts. Existing metadata, official-link
  validation, stale warning, centered internally scrolling dialog, dismissal,
  scroll unlocking, and opener-focus restoration remain intact. Missing,
  not-applicable, and unavailable HWO have no trigger. A zone change immediately
  clears the previous outlook, including its dialog.
- Dare, Hyde, and San Diego selectors remain one row, including at 320px.
  Labels wrap inside buttons; controls retain a minimum 44px height.
- `weatherCenter.js` remains shared by Home and Counties and owns weather/map
  tabs. New `counties/js/countyForecast.js` owns County forecast markup and
  scoped keyboard tab behavior. `countyApp.js` and `countyApp.multizone.js`
  retain fetching and lifecycle ownership, with generation checks preventing
  superseded forecast/alert responses from overwriting the current zone.
- `countyAlerts.js` accepts the independent HWO mount and retains the legacy
  alert-row path. `countyData.js` and `countyData.multizone.js` reject malformed
  alert packages; network/HTTP/JSON failures show "Alerts temporarily
  unavailable." A valid empty alert list alone produces "No active alerts."
- `county.css` owns the scoped forecast rows, full mobile HWO label,
  disclosures, and selector layout. The owner's temporary commented CSS was
  replaced with an explicit single-column rule for the new card. The retained
  Bertie test page keeps its original seven-column desktop/two-column mobile
  summary layout and separate Detailed tab. Discussion visibility follows its
  active forecast panel rather than the old accordion's hidden content rule.

Changed file groups: all nine `counties/*/index.html` pages; the shared modules
above; County entry wrappers and loader/meteogram import references; County CSS;
the CSS ownership contract/site validator and focused tests. Home and
`counties/bertie/index_test.html` template changes are asset references only.
Changed assets use `20260912-phase11-1`; unrelated asset versions are unchanged.
New coverage is in `scripts/tests/county-forecast.test.mjs`.

### Validation evidence

- Static/automated: all 74 Node tests pass; 83 JavaScript/MJS syntax checks and
  70 tracked PHP lints pass; HWO PHP product tests pass 20 assertions. The site
  validator passes 18 HTML files, 352 JSON files, and 199 local references.
  `git diff --check` and focused asset/removed-hook searches pass.
- Controlled browser, local PHP at `http://127.0.0.1:8085/`: all nine pages pass
  the final row layout at actual 1280x900, 390x844, and 320x844 viewports (27
  cases). Each has 14 rendered periods, one forecast column, no horizontal
  document overflow, fitting HWO controls when present, and 44px disclosures.
  All multi-zone selectors stay on one row with fitting labels and 44px height.
- Bertie, Dare, Hyde, and San Diego pass keyboard tab navigation and collapsed
  period disclosure checks at desktop/mobile widths. Multiple disclosures stay
  open across forecast tab changes. Discussion content is visible without
  overflow at all three sizes (12 cases); Bertie's Meteogram chart draws.
- All Dare, Hyde, and San Diego zones were switched at mobile width; URL,
  selected zone, refreshed period content, closed new disclosures, and reload
  persistence pass. San Diego-to-Dare invalid-zone normalization plus
  Back/Forward pass. HWO Close/Escape/backdrop dismissal, metadata, official
  source link, focus restoration, internal overflow, and scroll unlocking pass
  across desktop and narrow mobile checks.
- Browser-only response fixtures verify HTTP/JSON/package alert failures,
  legitimate empty alerts, stale HWO, absent/not-applicable/unavailable HWO,
  two-alert dialog selection, and forecast failure independent of HWO. A failed
  Dare zone load clears old HWO during loading, shows Alerts unavailable, and
  recovers on a subsequent valid zone. Fixtures did not alter weather files.
- Network evidence confirms one Bertie forecast request and successful local
  forecast/alert packages. County Radar play/pause/scrub and Satellite product,
  frame, and legend controls were exercised. Home's Conditions/Radar/Satellite
  tabs pass at 1280px and 390px; the retained Bertie test's old forecast and
  Detailed/Discussion panels pass. The clean final regression tab recorded no
  console warnings/errors; intentional fixture failures were checked separately.

### Preservation and remaining gates

Stations, zone definitions/order, provider choices, current-condition sources,
San Diego exceptions, map engines, backgrounds, chart data, discussion/HWO/alert
payloads, generated weather output, caches, logs, and ignored V2 artifacts were
preserved. No files were staged, committed, pushed, or deployed. No generated
weather data was modified or used as a disposable fixture.

Owner smoke on actual devices and actual 200% browser zoom remain open. The
controlled browser's zoom shortcut did not establish a changed zoom level, so
the viewport checks are not claimed as zoom evidence. External-provider
freshness and production behavior were not certified; local cache content can
be old. The local PHP preview remains available on port 8085 for review.

## Planned Phase 11: County forecast structure — recorded 2026-09-09

Historical planning record; the implementation and validation entry above is
the current status and supersedes this record's pre-approval gate.

The owner identified the next County UI phase. This is the first work the next
session should review; recording it does not authorize implementation, staging,
commit, push, deployment, or generated-data changes.

Apply the phase consistently to all nine County pages while preserving their
existing data sources and page-specific behavior:

1. Remove `Forecast` from the first Weather Center tabset, leaving Conditions,
   Radar, and Satellite there. Add a separate forecast card/tabset below the
   Weather Center for forecast products and their subtabs.
2. Combine the current `7-Day` and `Detailed` forecast panels into one Forecast
   tab. Each period card should include its matching detailed forecast in a
   collapsed, keyboard-accessible disclosure. Prefer native `details`/`summary`
   semantics unless browser testing identifies a concrete conflict. Render the
   combined card and detail from the same fetched period list rather than the
   current second forecast request.
3. Keep the zone selectors for Dare, Hyde, and San Diego on one row at mobile
   widths. Preserve minimum control height, readable labels, active/disabled
   states, URL and localStorage normalization, and no horizontal page overflow.
4. Move the Hazardous Weather Outlook entry from the Alerts area into the new
   forecast section because it is a forecast product. Keep active alerts in the
   Alerts area, and preserve the outlook's official source, stale state,
   metadata, dialog dismissal, focus restoration, and unavailable behavior.

Current ownership to inspect before editing:

- County markup is duplicated across the nine `counties/*/index.html` pages.
- `counties/js/weatherCenter.js` owns the primary Weather Center tabs and
  forecast-subtab keyboard behavior.
- `counties/js/countyApp.js` and `counties/js/countyApp.multizone.js` render the
  7-day and detailed forecast markup.
- `counties/js/countyAlerts.js` currently appends the HWO trigger/dialog to the
  alert container and assumes an existing alert-status row.
- `counties/css/county.css` owns the forecast panels, HWO presentation, and the
  mobile zone-selector layout. Its current mobile rule gives each selector
  button full width, which causes the stacking reported by the owner.

Before implementation, capture the proposed desktop/mobile forecast-card
structure and confirm the final forecast tab labels. Validation must include a
standard County, Dare or Hyde, and San Diego at desktop and 390x844/320px mobile;
keyboard tab/disclosure navigation; zone switch, refresh, and Back/Forward;
populated/empty/stale HWO and active-alert combinations; console/network checks;
and horizontal overflow. Do not alter stations, zones, providers, forecasts,
meteograms, discussions, alert/HWO payloads, caches, or generated weather data.

## Phase 10 footer social row — 2026-09-09

The shared V1 footer now keeps all seven social icons in one responsive row.
The current CSS/UI plan owns implementation and validation evidence. County
content, maps, and weather data are unchanged. The owner reported, "Ok, that
looks good"; the exact device and viewport were not specified.

## Phase 10 typography/padding slice — 2026-09-09

The owner authorized the CSS audit recommendations. The first bounded Phase 10
slice is implemented locally on clean starting checkpoint `04f8502`; see the
[current CSS/UI record](site-css-architecture-and-ui-standardization-plan.md#phase-10-first-slice-typography-tokens-and-fluid-padding--2026-09-09)
for changes and evidence. Shared typography is preserved, token ownership is
clearer, and About/Active/Tropical padding becomes fluid. County CSS, weather
data, and page behavior are unchanged. This slice is included in the owner-requested
CSS Git checkpoint; owner smoke, 200% zoom, and production checks remain separate. Older uncommitted
closeout/Phase 10-not-started statements below describe earlier checkpoints.

## Original-site CSS/UI owner acceptance — 2026-09-09

The owner reported exactly, "Ok, from the dev tools all look good." They asked
to defer remaining layout preferences to a later phase. The
[CSS/UI plan](site-css-architecture-and-ui-standardization-plan.md) records this
as owner DevTools acceptance, adds planned Phase 10 for the forthcoming V1 layout
list, and retains the separate technical closeout findings. Exact pages,
devices, viewports, interactions, and actual-device touch were not specified.

Phases 0-9 are implemented; `0448038` now includes the V1 Home drawer and V2
separation. Older statements below that Phase 9 has not started, or that the
retained V1 changes are uncommitted, describe historical checkpoints. Use the
CSS/UI plan's September 9 record for current status. Its two local closeout
items are now resolved: the Home drawer Escape-focus repair passes regression
and browser checks, and 158 responsive browser cases pass across all page
families. Navigation references use `20260909-navigation-escape-1`; the repair
and evidence are uncommitted. Phase 10 has not started. Actual-device, populated
Home-alert, provider, and production evidence remain separate; no new County
product or V2 phase is authorized by this update.

## Map-first UI separated into V2 — 2026-09-09

The owner requested that the archived Home/Bertie/Dare map-first UI, viewport-aware
radar, and national alerts become a separate V2 project. Its local project path is
`K:\Web Design\NCHurricane V2`; start with that project's `README.md` and
`docs/v2-project.md` only when the owner explicitly resumes V2 work.

This V1 repository excludes the prototype source, stylesheet, dedicated tests,
roadmap, and archive through `.gitignore`. Retained local copies are ignored,
not required repo files. The CSS ownership contract no longer requires the three
prototype stylesheets; all other manual/shared changes are preserved. No main-site
UI rollback, generated-data refresh, or deployment is part of the separation.

The earlier prototype phase approvals, review queues, file paths, and continuation
prompts below are historical. Do not require ignored V2 material for V1 work or
resume prototype features/publishing/scheduling from this handoff.

Separation evidence: all 36 retained prototype/archive files are ignored and none
is tracked. V1 passed changed-JS syntax, 11 CSS/responsive tests, and site validation
with every V2 file physically absent (18 HTML, 60 JSON, 199 references); the normal
working-tree validator also skips ignored V2 inputs (18 HTML, 341 JSON, 199
references). The new V2 project passed 20 focused Node checks and site validation
at its final location (22 HTML, 66 JSON, 210 references); its prepared copy passed
20 deterministic PHP fixture checks. All 387 copied files matched their prepared
hashes, and all 393 existing V1 files outside the five declared targets matched
their starting hashes. Runtime weather/secrets/ignored outputs were excluded
from V2. No browser, fresh-provider, production, or new owner-smoke claim is made.
The only Git operation was initialization of V2's empty local repository; neither
project has been staged, committed, pushed, or deployed by this separation.

## Historical Dare prototype: national UI-2 alerts — 2026-09-06

The owner accepted the viewport-aware radar follow-up ("Awesome. That works
perfectly"; devices/cases unspecified), then authorized the next alert phase at
national scale. UI-2 is now implemented locally in `/test/county-map-ui/dare/`.
The historical implementation, validation, limitations, and review record are
preserved with V2 in `docs/map-first-ui-next-session-plan.md` and its archive.

A separate bounded CLI publisher supplies national NWS summaries, full bulletins,
issued polygons, and explicitly labeled official affected-area boundaries. Dare
loads map shapes for the visible area and retains every alert in its national
list, including missing/partial geometry. Alert access persists at all zooms;
turn Alerts On to expose the scoped list buttons. Desktop details remain nonmodal; mobile alerts use the
centered 95% dialog with internal scrolling and focus restoration.

Preserve the owner's 31rem menu, grids, labels, shared stylesheet edits, chart
controls, accepted 201-site NEXRAD/TDWR choices, zone lifecycle, and unrelated
dirty work. Shared map support adds only an optional existing-map announcement;
Home/Bertie/live adoption is unchanged. Asset references are updated consistently.
County alert/HWO and generated weather data are unchanged. Only isolated ignored
`test/output/national-alerts` was published locally; no scheduler was configured.

The September 6 owner-requested follow-up consolidates Alerts above Products
in the expanded dock and inside the compact Products drawer. Scope buttons open
list-only details with matching headings; the on/off button controls shading.
Browser cache refresh is automatic every 120 seconds, with no Refresh button.
The latest desktop refinement makes Alerts independently collapsible, places
Alerts On/Off first below its title, and hides the three scope buttons when off.
Status/count notices sit above the active map timestamp with room below the dock.
Alert bulletins no longer have Back to alerts; reopen a list through its scope.
All Dare details dismiss on outside click as well as X/Escape; map drags remain
usable without dismissal. Mobile layout polish is explicitly deferred by the owner.
The dedicated handoff records current validation and the unchanged publisher gate.

Owner review of UI-2 remains open. UI-3 through UI-5, Git publication, live
adoption, deployment, production cache publication, and scheduling remain gated.
The dated records below and historical Phase 9 plan are retained as history.

Updated: 2026-09-04
Repository: `K:\Web Design\NCHurricane 2025`
Status: the owner-accepted Phase 5 checkpoint is `af8577a`. The all-county UI migration, viewport-aware/statewide Conditions work, shared city-label workflow, shared CSS ownership follow-up, Hazardous Weather Outlook integration, nested county navigation, and sitemap CSS Phases 1-5 are implemented in the committed history described below. The bounded CI portability repair is committed in `7a32866`, owner-accepted sitemap CSS Phase 6 is committed in `5448d61`, and owner-accepted Phase 7 is committed in `dbd7c8c`. Phase 8 and the ArcGIS basemap replacement are implemented, validated, committed, and pushed in `2f53445`; the documentation checkpoint is `a096ddc`. The cross-county persisted-zone defect is fixed and validated in the current uncommitted working tree. Owner-managed staging/device smoke passed functionally at the reported overall level; Wave B layout closeout remains open for responsive height and mobile-scroll findings. The staging deployment at `http://s194842513.onlinehome.us/test/` serves the committed Phase 8/basemap checkpoint and current Dare, NC, and Atlantic packages; California Conditions is present but stale. `chuckcopelandwx.com` is the future production URL and has not yet replaced the current website. There is no additional authorized county product phase. Do not make another push, deploy, or change generated/runtime data without explicit authorization.

Pre-Phase 9 CSS note on 2026-08-31: the current uncommitted shared-component
fix keeps weather-tab icons hidden on mobile despite Font Awesome's unlayered
display rule. Local Home and Bertie browser checks pass at `390x844`, desktop
icons remain visible at `1280x900`, and the atomic CSS cache key is `20260831`.
Phase 9 has not started.

## Historical authorized prototype follow-up: 2026-09-04

The owner explicitly authorized two isolated map-first county test pages after
the shared Home UI extraction: Bertie for single-zone behavior and Dare for
multi-zone behavior. This authorization supersedes the historical phase-gate
notes above only for this prototype slice. Live county adoption is still gated.

- Test routes: `/test/county-map-ui/bertie/` and
  `/test/county-map-ui/dare/?zone=mainland` (also `northern` and `hatteras`).
- Both no-index harnesses use `css/map-ui.css` and one county adapter. Shared
  dialog builders, focus handling, and select-value overlays now live in
  `test/map-ui/components.js`, also imported by the Home test page. County view,
  condition, forecast, and basemap grids have four columns; Dare zones have
  three. Layout differences remain in the county adapter.
- Original county DOM controls/listeners, data paths, map engines, zone
  normalization/localStorage, alert/HWO dialogs, station details, forecast
  products, meteogram parameters/time ranges, legends, and animation remain
  in use. The outer test URL mirrors the county controller's `replaceState`
  zone policy. Header navigation exits the harness.
- Forecast content scrolls within the available viewport. Alert/HWO access
  sits below the settings trigger; source timestamps sit above animation
  controls. The prototype explicitly exposes forecast content formerly
  controlled by accordion/sibling CSS and reports the legacy no-chart state.
- Cache keys: shared CSS `20260904-map-ui-base-1`, shared test components
  `20260904-map-ui-components-1`, Home adapter `20260904-map-ui-prototype-16`,
  county adapter `20260904-county-map-ui-3`.
- Static/automated: five changed JavaScript/MJS syntax checks passed; the
  Home/shared-UI, responsive, and county-zone suites passed 14/14; the site
  validator passed 21 HTML files, 307 JSON files, and 209 local references;
  `git diff --check` passed with existing line-ending notices only.
- Local PHP/controlled browser: Bertie and Dare were exercised at 1280x900
  and 390x844 without horizontal document overflow. Checks covered four main
  views, forecast selectors/content, desktop/mobile station details, keyboard
  tab-state synchronization, Settings/info focus, HWO dismissal/focus return,
  radar station/product labels, basemap selection, satellite legends and
  12-frame playback/pause/manual stepping. Hatteras direct entry, Northern
  and Mainland switches, refresh, valid Back/Forward restoration, and invalid
  `coastal` normalization passed. Northern current/forecast/alert requests
  returned 200 from `data/northern/`; superseded map requests were aborted.
  The Home shared-helper regression opened Settings and information correctly.
- Limitations: local observation/forecast caches include old data. Bertie
  meteogram reports no data for the tested hourly ranges; the prototype shows
  an explicit unavailable message, but fresh-data chart drawing remains open.
  That legacy warning is distinct from UI errors; final Dare and Home console
  checks were clean. No synthetic active alerts or updated weather data were
  produced. Populated multi-alert, provider-failure, fresh-chart, and owner
  device smoke remain open before promotion.
- Preservation: live pages, the older `counties/bertie/index_test.html`,
  production controllers, generated data, and unrelated dirty edits are
  untouched. Nothing staged, committed, pushed, deployed, or deleted. A local
  PHP preview was started on 127.0.0.1:8085 after the prior server was unavailable.

See `test/county-map-ui/README.md` for reuse and owner-smoke guidance. The
remaining sections retain their dated historical evidence.

The complete August 2026 migration and validation ledger is preserved at [`docs/archive/county-ui/county-ui-migration-ledger-2026-08.md`](archive/county-ui/county-ui-migration-ledger-2026-08.md).

## Resume order

1. Read the repository-root `AGENTS.md` and apply any newer user instructions.
2. Read this handoff completely.
3. Run `git status --short --branch` and `git log -8 --oneline`.
4. Preserve every existing working-tree change. Do not infer ownership or completion from an uncommitted file.
5. Use the archived ledger only for historical evidence; it is not authorization to resume a completed phase.
6. Do not start another county product/source/UI phase unless the user explicitly requests it.

## Historical repository boundaries

- This pre-Phase 9 regression slice began from clean `6018db8`. Concurrent
  user-owned County edits removed the desktop/mobile minimum heights from
  `.county-hwo-trigger` and set County CSS references to `20260831`; preserve
  those edits and do not attribute them to the tab-icon correction. The shared
  correction owns only the component rule, atomic cache-reference alignment,
  contract/test updates, and current handoff evidence.

- Before the persisted-zone implementation on 2026-08-26, `HEAD`, `main`, and
  `origin/main` matched at documentation checkpoint `a096ddc`, and the working
  tree was clean. The current uncommitted slice changes only shared multi-zone
  initialization/loader code, Dare/Hyde/San Diego dependency cache keys, one
  focused test file, and the current handoffs. Neither the commit boundary nor
  the working tree establishes production deployment.
- At the 2026-08-23 documentation cleanup, `HEAD`, `main`, and `origin/main` were `7c46f80`.
- Before the cleanup began, the working tree already contained user-owned changes in all nine county pages, the Bertie prototype, county CSS/controllers, shared CSS, homepage/map modules, Tropical/Active modules, and an untracked `js/modules/mapBoundaryOverlays.js`.
- Those changes are not classified by this handoff. Audit and separate them before modifying or staging any overlapping file.
- The 2026-08-22 map-status slice changes only the status/note paths, the CSS needed to keep full mobile status text readable, matching asset cache-busters, and the site contract guard. It preserves concurrent font, attribution, Tropical SVG, satellite-provider, Active, fixture, and documentation work.
- `counties/data/*-current.json`, county weather output, shared HWO office cache, logs, and `test/output/` are generated/runtime artifacts. Do not delete, rewrite, or commit them as documentation cleanup.
- The sitemap CSS Phase 1-3 checkpoint is committed as `edc6a50`; the
  owner-accepted Phase 4 checkpoint is `1f6b0b1`; and owner-accepted Phase 5 is
  committed as `af8577a`. The bounded CI portability follow-up changes only
  exact harness tracking, vendor-byte attributes, official action versions,
  and these handoffs. Owner-accepted Phase 6 is committed locally in `5448d61`.
  The authorized Phase 7 dependency slice begins from that clean checkpoint;
  it changes only stylesheet ownership/consumers, their cache keys and
  contracts/tests, and these handoffs without changing products, sources,
  stations, zones, camera/data lifecycle, or generated/runtime data.

## Committed checkpoints

| Commit | Retained result |
| --- | --- |
| `9b5fbf1` | All nine live county pages migrated from the accepted Bertie prototype to the shared weather-center UI, alerts, maps, and county context. |
| `69c365a` | Viewport-aware markers combined with the North Carolina statewide Conditions source/catalog and mobile zoom policy. |
| `6d14cb2` | Token-free bounded NWS observation cache, statewide station/city thinning, shared city labels, marker geometry/anchor correction, atomic publication, and local fallback. |
| `9e3ecb6` | Shared scoped editorial city favorites; Greenville is `tropical` and `homepage`, with no current `county` favorite. |
| `ca89d62` | Shared weather-center CSS ownership moved into `css/components.css`/`css/styles.css` while county-specific presentation remained in `counties/css/county.css`. |
| `7c46f80` | Hazardous Weather Outlook integration and nested `Counties` > `Non-NC Counties` navigation, including San Diego, committed. |
| `edc6a50` | Sitemap CSS architecture Phases 1-3, self-hosted Leaflet 1.9.4, and owner-directed retirement of obsolete static pages/resources. |
| `1f6b0b1` | Owner-accepted sitemap CSS Phase 4 BEM components, state hooks, accessibility target/focus corrections, and validator ownership guards. |
| `af8577a` | Owner-accepted sitemap CSS Phase 5 shared map interface plus owner-adjusted condition short labels. |

## Current durable behavior

### County and zone ownership

- Beaufort, Bertie, Martin, Pitt, Tyrrell, and Washington retain standard single-zone loading.
- Dare, Hyde, and San Diego retain URL/localStorage zone state, active-zone data paths, invalid-zone normalization, and complete zone lifecycle.
- San Diego retains its local Conditions source, local meteogram implementation, and zone-specific exceptions.
- A zone change remains authoritative for map center, station inventory, observations, marker set, details, forecasts, alerts/HWO, meteogram, and map products.

### Alerts and Hazardous Weather Outlooks

- The `alerts` array remains the only authority for active-alert counts, alert selectors/dialogs, homepage warning color, and warning overlays.
- HWO is a separate official NWS product selected by exact office and active forecast zone. It must never inflate or replace alert semantics.
- HWO publication remains bounded, lock-aware, identity-checked, atomic, and last-known-good preserving.
- On the nine live Phase 11 pages, only current HWO appears in the inline Forecasts tab. Hidden/expired products leave no retained inline content. The Bertie test retains its legacy alert-adjacent HWO trigger.
- Active alerts retain the shared centered modal, scoped 95% tablet/mobile width, internal scrolling, no horizontal selector overflow, focus restoration, Escape/Close/backdrop dismissal, and scroll-lock cleanup. HWO uses this modal only on the retained Bertie test.
- Shared source bulletins must be described truthfully. Do not fabricate event-specific text.

### Conditions markers and labels

- The North Carolina statewide catalog remains complete and authoritative; viewport filtering controls marker materialization, not configuration or station deletion.
- Initial county/zone centers and responsive zoom policies remain authoritative. Do not fit the opening map to the full statewide inventory.
- Marker reconciliation remains buffered, viewport-aware, collision-thinned, generation-safe, and incremental.
- A selected marker with an open detail panel remains mounted until the detail closes.
- Observation transfer and marker rendering remain separate concerns. Do not introduce a new data/source architecture as a UI closeout.
- Editorial city priorities belong only in `js/data/map-city-favorites.json` with explicit `tropical`, `homepage`, or `county` scope and `minZoom`; do not edit large source/derived city datasets for a favorite.

### Interactive maps and presentation

- Preserve station order, zones, provider/product selectors, fallback order, county backgrounds, maps, frame counts, playback/pause, scrubbers, legends, boundary behavior, basemaps, meteograms, and responsive layout.
- Homepage and live county Conditions maps identify `NWS observations` with the latest observation time and freshness count. Radar and Satellite retain provider, frame time, and `Frame n of n`; mobile timestamp overlays wrap instead of clipping those fields.
- `weather-map-note` remains only for the live county Conditions instruction. Removed Radar, Satellite, homepage, Tropical, and prototype notes are not runtime dependencies, and CSS contains no selectors scoped only to those retired notes.
- Preserve the current retained ready-layer animation behavior; readiness timing alone is not an equivalent replacement.
- Shared weather-center structure belongs in shared components, and shared map
  cards, controls, timestamps, legends, markers, and city labels belong in
  `css/interactive-weather-map.css`. The shared Home/County observation popup
  and station-details presentation now has that same shared map owner. County
  forecast, alert-detail, multi-zone, San Diego, and explicit County variants
  remain county-owned.
- The Bertie prototype remains a prototype. Do not promote it to a live page without explicit authorization.

### Sitemap CSS Phase 6 popup closeout: 2026-08-24

- County observation markup now uses the `observation-popup` BEM block and
  element classes, with `data-observation-popup-trigger` and
  `data-observation-popup-close` behavior hooks. No `temperature-popup*`
  presentation alias remains.
- The accepted County interaction remains an inline station-details panel, not
  a Leaflet overlay. Standard County, Dare/Hyde multi-zone ownership, and San
  Diego's local source/zone exceptions remain unchanged. The shared stylesheet
  supplies only the common popup content rhythm, link target, and map-feature
  focus treatment; County CSS owns the observation grid, status, and inline
  close variant.
- The inline close target is 44 by 44 CSS pixels, has a visible focus ring,
  closes with mouse or Enter/Space, and restores focus to the originating
  marker. Generated observation markers now open from Enter/Space as well as
  pointer activation. The panel no longer creates its prior small internal
  horizontal overflow.
- Controlled browser at `1280x900` covered Bertie, Dare Hatteras, and San Diego
  Mountains; direct `390x844` checks repeated all three. Dare retained
  `?zone=hatteras`, San Diego retained `?zone=mountains`, all panels and
  documents had zero horizontal overflow, and applicable NWS links retained
  `_blank` plus `noopener noreferrer` with at least a 44-pixel target. Final
  console/network checks were clean for all County cases.
- Phase-wide evidence: 14 changed JavaScript syntax checks, full 70-file PHP
  lint and 75-file JavaScript syntax baselines, all 78 focused tests, the site
  validator at 18 HTML/307 JSON/167 references, focused retired-selector
  searches, `git diff --check`, and seven PHP-served HTTP probes all pass.
- No county zone, station, provider, product, alert/HWO, cache, camera,
  generated/runtime, or prototype-promotion behavior changed. Nothing was
  staged, committed, pushed, deployed, generated, or deleted.
- Owner smoke on 2026-08-24: the owner reported exactly, "Ok, smoke passed."
  No County page, zone, device, viewport, or individual interaction was named,
  so this closes Phase 6 owner review only at that overall granularity. The
  same message separately authorized Phase 7 dependency removal, not a new
  County product phase or Phase 8.

### Sitemap CSS Phase 7 dependency closeout: 2026-08-24

- Owner-accepted Phase 6 was committed locally as `5448d61`. Phase 7 began
  from that checkpoint and is now owner-accepted and committed locally as
  `dbd7c8c`.
- The reusable observation BEM content and inline station-details presentation
  moved from `counties/css/county.css` to
  `css/interactive-weather-map.css`, preserving the same generated markup,
  `data-observation-popup-*` hooks, station content, NWS links, and lifecycle.
  County CSS is now consumed only by the nine live County pages and the Bertie
  prototype; Home, Tropical, and Active no longer depend on it.
- All County and shared-map consumers use `20260824-phase7-1`. Focused ownership
  tests and the validator enforce the new consumer list and reject relocated
  observation selectors in County CSS.
- Controlled browser at `1280x900` and `390x844` covered Bertie, Dare Hatteras,
  and San Diego Mountains. Keyboard and mouse opening/closing, focus return,
  44-pixel close/NWS-link targets, below-map mobile placement, and zero document
  or panel horizontal overflow passed. Dare retained `?zone=hatteras`; San
  Diego retained `?zone=mountains`. Per-page console/network capture was clean.
- Phase-wide static evidence passes: five changed JavaScript/MJS syntax checks,
  full 70-file PHP and 76-file tracked/task JavaScript baselines, all 80 focused
  tests, the site validator at 18 HTML/307 JSON/164 local references, seven
  PHP-served HTTP probes, focused selector/dependency searches, and
  `git diff --check`.
- No County zone, station, provider, product, alert/HWO, cache, camera,
  generated/runtime, or prototype-promotion behavior changed. Nothing was
  pushed, deployed, generated, or deleted. The owner subsequently authorized
  Phase 8 cascade layers.
- Owner smoke on 2026-08-24 concluded with the exact report, "Ok, then it has
  passed." The owner explicitly confirmed the bounded Active fixture and alert
  popup in the same smoke sequence; no County page, zone, device, or viewport
  was individually named in the final confirmation, so County evidence remains
  at the overall Phase 7 acceptance level.

### Sitemap CSS Phase 8 cascade layers: 2026-08-24

- Phase 8 starts from committed Phase 7 baseline `dbd7c8c`. Every County page
  now loads `css/cascade-layers.css` first and the local Leaflet wrapper second,
  then the Phase 8-versioned token/base, component, shared-map, and County
  sheets. `counties/css/county.css` and the nine inline County background rules
  are contained in `pages`; shared map rules remain in `maps`.
- The untouched Leaflet 1.9.4 CSS is imported into `vendor`; no County HTML
  directly links it. All changed CSS uses `20260824-phase8-1`. Validator and
  focused tests enforce layer ownership, exact consumers, cache keys, no
  unlayered rules, exact Leaflet hashes, and the reduced `!important` allowlist.
- County controlled-browser checks at `1280x900` and `390x844` covered Bertie,
  Dare, and San Diego. Maps retained 450/400-pixel desktop/mobile family
  heights, responsive tabs and zone selectors had no horizontal overflow, and
  Dare/San Diego switching retained URL and active-state behavior. Bertie
  observation details retained keyboard opening, below-map mobile placement,
  44-pixel close targets, and focus restoration.
- At the Phase 8 checkpoint, a cross-county localStorage issue remained outside
  that CSS slice:
  a persisted San Diego `coastal` value caused Dare to request missing
  `data/coastal/*` once before a valid Dare zone was chosen. Explicit Dare
  `?zone=mainland` followed by Northern OBX switching produced no console
  errors. That historical finding is resolved by the later bounded lifecycle
  slice below; Phase 8 itself did not change controller or zone behavior.
- Phase-wide evidence passes: seven changed tracked or dependency-only MJS
  syntax checks, full 73-file PHP and 81-file JavaScript/MJS baselines, all 84
  focused tests, the site validator at 18 HTML/307 JSON/182 local references,
  exact Leaflet checksums, focused old-reference and `!important` searches, and
  `git diff --check`.
- Phase 8 is committed and pushed in `2f53445`. At that implementation
  checkpoint, nothing had been deployed, generated, or deleted; County data,
  stations, providers, alerts/HWO, maps, cameras, multi-zone behavior, San Diego
  exceptions, and the Bertie prototype boundary remained unchanged. The later
  owner pass closes functional smoke at its reported granularity while leaving
  Wave B layout closeout open.

### ArcGIS basemap replacement: 2026-08-26

- The shared basemap menu now exposes four label-free ArcGIS Online layers:
  World Terrain Base, World Imagery, World Dark Gray Base, and World Light Gray
  Base. The requested `USA_Topo_Maps` service was not used because its scanned
  raster maps contain baked-in labels; World Terrain Base preserves the
  intended terrain slot without adding a separate label layer.
- CARTO and the direct USGS National Map provider are removed from the shared
  browser configuration, CSP, documentation, Active hazard-tile proxy, and
  tile warmer. Esri hazard tiles use new `esri-*` cache namespaces, so retained
  generated USGS cache files are neither deleted nor reused.
- Every external basemap uses the self-hosted neutral SVG tile as Leaflet's
  automatic error tile. Bundled Natural Earth/Census reference layers and the
  existing weather markers/city labels remain visible over that fallback.
- Static/automated evidence: all 82 JavaScript/MJS syntax checks and 73 PHP
  lints passed; all 88 JavaScript tests passed; the site validator passed 18
  HTML files, 307 JSON files, and 199 local references; and `git diff --check`
  passed with line-ending notices only.
- Controlled browser: Home at `1280x900` loaded all four ArcGIS choices with
  nonzero 256-pixel tiles. Dare mainland at `390x844` switched to Dark Gray,
  retained a 357-by-400 map with no horizontal overflow, and had a clean
  console. Blocking ArcGIS in that mobile run produced six loaded local tiles
  while the County reference layer and eight observation markers remained.
- Live provider probes returned HTTP `200`, `image/jpeg`, CORS `*`, and nonzero
  bytes for representative tiles from all four services. These provider checks
  are time-dependent. No generated/runtime cache, county source, zone, station,
  scheduler, or production state was changed by the implementation. The source
  change is committed and pushed in `2f53445`; at that checkpoint nothing had
  been deployed, generated, or deleted. The later owner upload is recorded
  below.

### Owner functional smoke and deferred layout findings: 2026-08-26

- After uploading the checkpoint to the server and testing it on the owner's
  devices, the owner reported exactly, "All functions passed on all devices."
  Known coverage includes an unspecified Samsung phone and a `3840x2160`
  display; the exact page, browser, and remaining-device matrix was not
  supplied, so this closes functional owner smoke only at that reported overall
  level.
- Visual/layout acceptance remains open. On a `3840x2160` display, some page
  elements retain excessive empty height. On mobile and smaller desktops,
  alerts and/or zone selectors can push the map scrubber and Radar/Satellite
  color bar below the visible viewport.
- Mobile page scrolling is also impaired over maps and text-product regions:
  a vertical gesture scrolls or interacts with the element instead of the page
  unless the gesture begins near the extreme viewport edge. Treat this as a
  scroll-ergonomics issue, not a functional data or map failure.
- The owner supports handling these findings later through a final tuning
  phase. Prefer shared height calculations plus explicit Home, standard County,
  multi-zone County, Tropical, and Active variants; add literal per-page values
  only when measured content differences require them.
- The owner performed the upload to the staging site at
  `http://s194842513.onlinehome.us/test/`. The later read-only audit below
  verifies the committed Phase 8/basemap file set and public package health at
  that target. It is not the future `chuckcopelandwx.com` production deployment.

### Cross-county persisted-zone normalization: 2026-08-26

- Shared multi-zone initialization now validates URL and `selectedZone`
  localStorage values against the destination county's configured zones before
  any product path is built. Invalid state falls back to the destination's
  valid configured default, rewrites an invalid URL with `replaceState`, and
  repairs localStorage. Valid URL and stored state are preserved.
- `countyData.loader.js` now recognizes the actual `county.multiZone` config
  topology while preserving the standard single-zone loader. Dare and Hyde use
  the shared lifecycle directly; San Diego retains its local source and wrapper
  normalization exceptions. Versioned dependency and entry-module references
  prevent a mixed old/new module graph after upload.
- Five focused tests cover Bertie single-zone detection, Dare/Hyde/San Diego
  multi-zone detection, valid state, invalid URL/storage fallback, the original
  San Diego `coastal` to Dare case, and cache-key propagation. The integration
  test proves Dare requests `data/mainland/*` and never `data/coastal/*`.
- Full static/automated evidence passed: 83 JavaScript/MJS syntax checks, 73 PHP
  lints, all 93 JavaScript tests, the site validator at 18 HTML/307 JSON/199
  local references, focused stale-reference searches, and `git diff --check`
  with line-ending notices only.
- Controlled browser at `1280x900` and `390x844` covered San Diego Coastal to
  Dare, invalid direct `?zone=coastal`, valid Northern OBX switching, reload,
  Back/Forward restoration, and Bertie's unchanged single-zone paths. Dare
  normalized to `?zone=mainland` before product requests, valid Northern state
  survived reload and history navigation, Bertie made no nested zone request,
  page widths stayed bounded, and the captured consoles were clean.
- No county configuration, zone inventory, station, product/provider, map,
  generated/runtime data, or production state changed. Nothing was staged,
  committed, pushed, deployed, generated, or deleted by this slice.

### Read-only staging deployment health audit: 2026-08-26

- The owner clarified that live testing uses
  `http://s194842513.onlinehome.us/test/`; `chuckcopelandwx.com` is the future
  production URL after site readiness. The earlier probe of another public
  domain was not a probe of this deployment and must not be used as staging or
  production-readiness evidence.
- Cache-bypassed HTTP probes found staging Home, Dare, the Phase 8 cascade
  sheets, self-hosted fallback tile, current SVG logo, and shared map module at
  `200`. Home and Dare reference `20260824-phase8-1`; the map module contains the
  ArcGIS services. A controlled browser rendered nonzero 256-pixel World
  Imagery tiles on Home and Dare, Dare's zone selector was valid, page width was
  bounded at the desktop viewport, and the captured Dare console was clean.
- Staging Dare current, forecast, and alert packages were generated on August
  26/27; NC statewide Conditions was generated August 26; and the Atlantic
  overview was fresh at August 27 03:09 UTC. California Conditions returned
  `200` but its embedded generation time remained August 22 12:58 EDT, so the
  California publisher/log is the specific outstanding scheduler check.
- The current uncommitted persisted-zone fix is intentionally absent from
  staging: Dare still references its pre-fix `countyApp.js` URL. After the
  current slice is committed and uploaded by the owner, repeat the San Diego
  `coastal` to Dare normalization, reload, and Back/Forward smoke there.
- The repository's production cron candidate still has 56 syntactically valid
  job rows referencing 56 distinct existing PHP entry points, including the
  four CP publishers, California Conditions, San Diego alerts, and the all-basin
  map builder. The installed production crontab, `/usr/bin/php8.4-cli`, required
  PHP extensions/CA configuration, log permissions, and cron logs cannot be
  inspected from this workspace and remain unverified.
- No staging/production file, scheduler, cache, or configuration was changed by
  the audit. Inspect the installed California cron row and its log before
  treating statewide California Conditions as healthy. Do not treat staging as
  deployment proof for the future `chuckcopelandwx.com` replacement.

## Shared header breadcrumb follow-up: 2026-08-23

- The user-authorized shared navigation follow-up adds a visible, transparent second header row on interior pages while leaving the homepage unchanged. County pages render `Home > Counties > {County}`; `Counties` remains a truthful non-link category because the site has no Counties landing page.
- Breadcrumbs represent stable page hierarchy only. Dare, Hyde, and San Diego zone query/localStorage state remains owned by the county controllers and does not create or change breadcrumb levels.
- The shared route resolver fails closed for unknown pages, uses an accessible `Breadcrumb` navigation landmark and ordered list, marks the current page with `aria-current="page"`, and gives links a 24-pixel minimum height. All 20 shared stylesheet/navigation consumers use the matching `20260823-breadcrumbs-1` cache key.
- Static/automated: JavaScript syntax passed; six focused breadcrumb route tests passed; the site validator passed 20 HTML files, 307 JSON files, and 156 local references; and `git diff --check` passed before this documentation update.
- Local HTTP/browser: the versioned stylesheet and navigation module returned `200`. Dare at `1280x900` and `390x844` showed the intended trail with no horizontal overflow; the mobile header left a visible gap before the heading, and the menu opened below the full two-row header, closed with Escape, and restored hamburger focus. Home navigation removed the breadcrumb, and browser Back restored the Dare URL and trail. Tropical, Active, and Accessibility representative pages also had correct trails, no horizontal overflow, and no captured console errors or warnings at both viewport sizes.
- Owner smoke, deployment, and production behavior remain open. The breadcrumb follow-up did not change county zones, data, alerts/HWO, Conditions, maps, forecasts, generated/runtime files, or provider contracts.

## Historical open gates and known limitations

### Shared non-tropical SVG wordmark follow-up: 2026-08-24

- The user-authorized shared header update replaces the structured
  `ChuckCopeland` + lightning icon + `WX` wordmark on all 15 non-tropical
  navigation consumers, including the Bertie prototype, with
  `images/20260826_cc_wx_logo.svg`. Tropical and Active retain the separate
  `NCHurric` + hurricane icon + `ne` wordmark and `NCHurricane home` label.
- The SVG lettering is outlined, the single `lightning-bolt` group owns a
  self-contained 5.4-second flash animation, and its embedded reduced-motion
  rule disables the animation. The linked logo retains `Chuck Copeland WX
  home` as its accessible name; the image has `Chuck Copeland WX` alternative
  text.
- Static/automated validation passed the focused 15-page logo contract, SVG
  XML/animation checks, 15 navigation/Tropical tests, the site validator at 18
  HTML/307 JSON/182 local references, and `git diff --check`. PHP-served Home,
  Dare mainland, Tropical, and the SVG returned `200`; the SVG used
  `image/svg+xml`.
- Controlled browser at `1280x900` and `390x844` covered Home and Dare
  mainland with the correct root/deep relative asset paths, accessible label,
  responsive 300/230-pixel logo widths, zero horizontal overflow, and no
  captured console warnings or errors. A cropped logo comparison found 12
  distinct rendered frames across one animation cycle. Direct SVG computed
  styles showed `lightning-bolt-flash` at 5.4 seconds normally and
  `animation-name: none` under emulated reduced motion. Tropical retained its
  hurricane wordmark. Active's current local runtime redirected to the 404
  shell, so its preserved wordmark remains static/automated evidence rather
  than browser-rendered evidence.
- No county data, zones, stations, providers, maps, alerts/HWO, generated or
  runtime files, or production state changed. Nothing was staged, committed,
  pushed, deployed, generated, or deleted.

- The 2026-08-23 homepage county-popup mobile follow-up scopes Leaflet paragraph margins to `.home-county-leaflet-popup` at the base popup level, reducing the default vertical gaps without relying on a mobile media-query match or changing Tropical and other popup families. The homepage uses the matching `20260823f` `home.css` cache key. Owner re-smoke on the reported S23 Ultra remains open.
- The map-status slice passed JavaScript syntax checks, 14 focused Tropical/Active tests, `git diff --check`, and controlled browser checks at `1280x900` and `390x844` on the homepage, Beaufort, Dare, San Diego, Tropical, and Active. Conditions/Radar/Satellite status text was present and unclipped, map widths stayed bounded, and the exercised console had no errors or warnings. The site validator's new map-status/note guards passed, but the repository-level command remains blocked by the concurrent static skip link in `active/index.html`.
- Owner follow-up after the map-status/note cleanup reported, "Everything seems to pass." No exact pages, devices, or viewport sizes were supplied, so the evidence is retained only at that overall granularity.
- Navigation owner smoke passed for the committed nested desktop/mobile workflow.
- The owner confirmed keyboard activation for the current HWO button and previously accepted the disclosure treatment. The archived record does not contain a later owner acceptance for every side-by-side/modal refinement; treat that narrower visual owner gate as open unless the owner explicitly confirms it.
- The shared CSS follow-up has controlled-browser evidence in the archive, but its historical record says owner smoke was still open. Do not silently promote controlled-browser evidence to owner acceptance.
- The 2026-08-26 owner-managed server/device pass supersedes that historical
  functional-smoke gap at the reported overall level. Wave B layout acceptance
  remains open for the recorded height and nested-scroll findings.
- The owner-managed staging upload contains the committed Phase 8/basemap file
  set. Most inspected packages are current; California Conditions is present
  but stale. Its installed scheduler row/log and production PHP/CA state remain
  open, as does the future full replacement at `chuckcopelandwx.com`.
- Provider availability, missing-station cache warnings, and meteogram `No data for timeframe: 0` warnings are time-dependent/runtime findings. Reproduce before treating them as current defects.

## Historical next course: staging zone re-smoke, California publisher diagnosis, and deferred layout follow-up

There is no open county feature phase in this plan. The next bounded county task should be:

The separately authorized sitemap-wide CSS Phases 3 through 5 changed County
title/text roles plus general and shared-map component presentation/ownership.
Phase 4 migrated
the weather tabs, conditions/forecast subtabs, multi-zone selector, shared
alert/HWO dialog shell, navigation menu, and back-to-top control to BEM classes
with `data-*` JavaScript hooks. It added `aria-pressed` to the zone selector,
44-pixel minimum targets, container-based selector/tab layout, and explicit
opener-focus restoration for Close, Escape, and backdrop dialog dismissal.

Phase 5 migrated the shared map card, toolbars, fields, canvases, fallbacks,
timestamps, status overlays, timelines, legends, basemap menu, markers, and
city labels to their approved BEM contracts with IDs/`data-*` hooks and no
legacy aliases. Valid explicit Bertie, Dare, and San Diego routes passed the
desktop/mobile map, target-size, product/zone switch, loading-state, local
response, console, and horizontal-overflow gates. The separately authorized
Phase 6 popup migration is owner-accepted and committed in `5448d61`;
Phase 7 dependency removal is owner-accepted and committed in `dbd7c8c`. Phase
8 is committed and pushed in `2f53445`, with Wave B owner review still open.
The owner reported, "Ok, visual
acceptance passed." No exact County page, device, viewport, or interaction was
supplied, so the evidence is retained only at the overall Phase 5 level.

These CSS phases preserved URL/localStorage ownership, zone validation, data
paths, stations, alert/HWO content, maps, products, and generated output. The
separate cross-county lifecycle slice now validates persisted and URL-owned zone
state before the first product request. It closes the San Diego `coastal` to
Dare `data/coastal/*` failure without changing the CSS architecture or San
Diego's local exceptions.

1. Preserve the reported all-device functional pass while keeping the height
   and nested-scroll findings open as visual/interaction work.
2. After the current persisted-zone slice is committed and uploaded by the
   owner, repeat the cross-county normalization/reload/history smoke on staging.
3. Inspect the staging server's installed California Conditions cron row and
   log; the package exists but its embedded generation time is still August 22.
4. Do not start the proposed final responsive-tuning phase until the owner
   explicitly authorizes that implementation slice.
5. When authorized, inventory the actual vertical stack for each page family
   before choosing shared sizing rules and explicit family variants.
6. Keep any upload, scheduler change, cache publication, and generated/runtime
   data mutation outside local diagnosis unless separately authorized.

## Validation categories (historical deployment observations)

Report independently:

1. **Static/automated:** `node --check` for changed JavaScript, `php -l` for changed PHP, changed JSON parsing, focused tests, `node scripts/validate-site.mjs` where references/public pages are affected, reference searches, and `git diff --check`.
2. **Fixture/runtime/API:** deterministic alert/HWO/source states, exact office/zone identity, generated-cache success/fallback, bounded publication, and local HTTP/schema checks without altering production/generated fixtures.
3. **Controlled browser:** representative desktop near `1280x900` and mobile near `390x844`; standard county, multi-zone county, San Diego, affected maps/tabs/dialogs, keyboard/focus, rapid zone/product changes, console, network, and horizontal overflow.
4. **Owner smoke:** record only the exact page/device/case the owner confirms.
5. **External provider:** record live NWS/NOAA availability and freshness separately from local correctness.
6. **Deployment/production:** staging file parity is verified for the committed
   Phase 8/basemap checkpoint, but the current zone fix is not uploaded and the
   California package is stale. The future `chuckcopelandwx.com` replacement,
   installed scheduler/log repair, and production proof remain separate.

## Historical record

- [Complete August 2026 county migration and validation ledger](archive/county-ui/county-ui-migration-ledger-2026-08.md)

The archive retains completed phases, superseded dimensions/zoom/source decisions, exact historical browser evidence, alternatives, and known findings. It is evidence, not a backlog or authorization source.

## Ready-to-paste continuation prompt

```text
Continue the original V1 County UI work in K:\Web Design\NCHurricane 2025.

First read AGENTS.md and the current Phase 11 local-closeout section of docs/county-ui-next-session-plan.md, then inspect Git status and recent commits. The last verified committed checkpoint is d7c9f2d ("Changes to styling and layout"). The September 12 closeout adds an uncommitted mobile Meteogram label-fit correction, ten matching County CSS references using 20260912-phase11-closeout-1, its stylesheet contract, and the reconciled handoff. Recheck and preserve any newer work and all owner CSS tuning.

Phase 11 local validation is complete. Preserve the separate Weather Center/Forecasts cards, full-width forecast rows/native details, full/short accessible tabs at the 600px card boundary, current-only inline HWO, parameter toggle buttons/compact desktop group, one-row multi-zone selectors, Home behavior, and retained Bertie legacy structure. Reuse the recorded passing evidence; do not repeat the full matrix without a relevant change or new failure.

The recommended next bounded V1 step awaits approval: actual-device and actual 200% zoom owner acceptance using the short checklist in the handoff, followed by triage of concrete reported findings. Keep owner, local, provider, and production evidence separate. Reuse http://127.0.0.1:8085/ if available. Do not invent or begin another phase, resume V2, stage, commit, push, deploy, or alter generated weather data, caches, logs, or scheduler state. Older implementation/prototype/staging entries are dated history, not current status or authorization.
```
