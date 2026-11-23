# PlasmaTerm source provenance

PocketPlasma vendors an **unchanged text-only snapshot** of [techrote/PlasmaTerm](https://github.com/techrote/PlasmaTerm), branch `web-v0.1a`, commit `dfad2ddbdaa62438194a771ad4086ed1c2cfbff0` (web-v0.3a interface, 2026-11-22).

This folder contains `plasma.py`, `plasma_config_gen.py`, `web/index.html`, `web/plasma-browser.js`, `web/plasma-worker.js`, `web/plasma-lut-editor.mjs`, and the exact upstream `LICENSE`. It omits `web/og.png` (social-preview image; not needed for runtime) and other non-runtime files.

**Licence:** PlasmaTerm is AGPL-3.0. Preserve all source notices and license when redistributing or deriving it. PocketPlasma-generated adaptations are separate from this canonical snapshot. Do not silently patch the vendor source in place: build/staging overlays or separately documented patches are preferred.

This is an **upstream source snapshot**, not evidence of successful Pyodide startup, Chromium rendering, ASCIIomium integration, Web Serial permissions or physical USB operation. The web runtime still loads pinned Pyodide/xterm assets from public CDNs.
