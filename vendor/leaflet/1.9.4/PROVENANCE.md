# Leaflet 1.9.4 vendor provenance

- Project: Leaflet
- Version: 1.9.4
- Release date: 2023-05-18
- Project download page: https://leafletjs.com/download.html
- Release: https://github.com/Leaflet/Leaflet/releases/tag/v1.9.4
- Source package: https://registry.npmjs.org/leaflet/-/leaflet-1.9.4.tgz
- Source package SHA-256: `84c65a256e50657896f54c33bd857b6849ebe94c817803be818bf32a3dde0b77`
- License: BSD-2-Clause; the unchanged upstream text is stored in `LICENSE`
- Retrieved: 2026-08-24

The runtime files below were copied byte-for-byte from the official npm 1.9.4
package. That package is the build used by the previously configured unpkg
URLs. The CSS and JavaScript hashes also match the integrity values published
on Leaflet's download page.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `LICENSE` | 1395 | `53e8dc25862014e4324741ca18fbe3611e11d42ef69f59f86ea8c5389647d4cb` |
| `leaflet.css` | 14806 | `a7837102824184820dfa198d1ebcd109ff6d0ff9a2672a074b9a1b4d147d04c6` |
| `leaflet.js` | 147552 | `db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a` |
| `leaflet.js.map` | 225544 | `600a10dc5cd110de0699510d322afcbe01c7ca90b4c5f48adc20314c70aac753` |
| `images/layers-2x.png` | 1259 | `066daca850d8ffbef007af00b06eac0015728dee279c51f3cb6c716df7c42edf` |
| `images/layers.png` | 696 | `1dbbe9d028e292f36fcba8f8b3a28d5e8932754fc2215b9ac69e4cdecf5107c6` |
| `images/marker-icon-2x.png` | 2464 | `00179c4c1ee830d3a108412ae0d294f55776cfeb085c60129a39aa6fc4ae2528` |
| `images/marker-icon.png` | 1466 | `574c3a5cca85f4114085b6841596d62f00d7c892c7b03f28cbfa301deb1dc437` |
| `images/marker-shadow.png` | 618 | `264f5c640339f042dd729062cfc04c17f8ea0f29882b538e3848ed8f10edb4da` |

Published Subresource Integrity values retained on consumers:

- `leaflet.css`: `sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=`
- `leaflet.js`: `sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=`

The optional unminified and ESM builds were not copied because no site consumer
loads them. `leaflet.js.map` is retained because the runtime JavaScript names it.
