# Active Phase 5 browser fixtures

These immutable, non-production fixtures exercise the production Active page
without changing `active/cache/nhc_current_storms.json`, generated storm
packages, or ignored test output.

- `AL052025` is the NHC Erin advisory 32 snapshot retained in Git history at
  `1d8faf6`. Its compact map and alert fixtures retain official issued tropical
  and storm-surge warning geometries from the normalized Phase 5 test snapshot.
- `EP152025` is the final NHC Octave advisory 38 snapshot. The advisory states
  that no coastal watches or warnings were in effect; the map intentionally
  exposes unavailable forecast products to exercise a truthful partial state.
- `CP012026` is the retained NHC Lala advisory 38 snapshot. Its compact map
  keeps the official track, cone, best-track, and one authentic 34-, 50-, and
  64-knot radii feature; warning and surge products are truthfully not issued.

The compact collections are test subsets, not operational weather packages.
They preserve the original feature coordinates and properties needed by the
browser checks. `advisory-mismatch` serves Octave's advisory for an Erin request,
and `map-mismatch` serves Octave's manifest for an Erin request, so both negative
cases use real data while confirming fail-closed identity handling.

Serve from the repository root with:

```text
php -S 127.0.0.1:8015 scripts/tests/active-phase5-router.php
```

Representative URLs:

```text
/active/?storm=AL052025&fixture=issued
/active/?storm=EP152025&fixture=partial
/active/?storm=CP012026&fixture=not-issued
/active/?storm=AL052025&fixture=advisory-mismatch
/active/?storm=AL052025&fixture=map-mismatch
```
