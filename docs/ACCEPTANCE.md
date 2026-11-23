# PocketPlasma acceptance — evidence ladder

Status as of 2026-11-23. Mark a row PASS only with actual execution evidence, toolchain, source SHA and target named.

| Gate | Expected proof | State |
|---|---|---|
| S0: Source pinned | PlasmaTerm commit and AGPL licence copied verbatim | Source present; checksum/provenance review required |
| S1: Host protocol | Node/Python C unit tests, malformed input and sequence wrap | Host development tests performed locally; GitHub source qualification pending |
| S2: Simulator | Browser loads genuine Pyodide PlasmaTerm and slider movement changes frames | Not yet verified in browser |
| S3: ASCIIomium | Windows Terminal shows live CEF/PlasmaTerm output and interactive controls | Not yet verified |
| S4: WebSerial feasibility | CEF Alloy windowless permission flow chooses and opens CDC port | Not yet verified |
| S5: Local bridge | Fallback opt-in loopback WS relays device telemetry/LED safely | Implemented; not physically verified |
| S6: ESP-IDF build | IDF 6.1 compiler builds complete esp32s3 firmware | Not yet verified |
| S7: Physical board | Real COM enumeration, IMU sign/calibration, matrix orientation, safe brightness | Not yet verified |
| S8: End-to-end | Motion visibly changes PlasmaTerm; true sampled xterm colours appear on LEDs; stale cleanup | Not yet verified |
| S9: Portability | Network-independent reproducible Windows ZIP; no CDN dependencies | Not yet implemented |

## Windows test matrix

Use source-matched builds. Run browser first, then ASCIIomium 1024 colours at 15 FPS, then compare 256 and true-colour and 10/20 FPS. Test 80x30,120x40,160x50 terminals, resize, alpha/popup correctness, keyboard/mouse, viewport letterbox and quit-key restoration. Record actual frame generation, presentation/terminal write time and dropped/coalesced counts; do not estimate numbers.

For hardware, test normal direct browser, CEF WebSerial feature/permission/chooser, local bridge fallback, auto-neutralisation after >750ms without IMU, LED off after >600ms without valid frame, USB disconnect/reconnect, BOOT reset/flashing recovery and matrix thermals.

## CI discipline

Prefer host tests: \`node --test tests/pocket.test.mjs\`, \`python -m unittest discover -s tests -v\`, and a single native C test binary. **Do not** add GPU/browser CI, an ESP-IDF build farm, nested validation workflow chains, or meta-tests without strong evidence of value. All physical/browser acceptance uses explicit operator evidence. No auto-merge; Draft/HOLD until owner approval.
