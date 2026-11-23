# Architecture — PocketPlasma v0.1

## Goals and composition

PocketPlasma is an **application integration project**, not a new plasma engine or a new browser. It proves that ASCIIomium can host a demanding real Chromium application with a deliberately transformed visual style, while an ESP32-S3-Matrix acts as bidirectional creative hardware.

Source ownership:
- ASCIIomium (separate repository): CEF OSR browser; BGRA source; quantised, Unicode half-block ANSI output; terminal keyboard/SGR mouse mapping; newest-frame scheduling. No changes required for simulator.
- PlasmaTerm (this repository's pinned AGPL vendor snapshot; separately owned upstream): browser Python/Pyodide worker; ANSI frame generation; xterm.js; Keybed, Energy modulation, LUT editor.
- PocketPlasma (this repository): staging adapters, bounded hardware transport, mapping, LED mirroring, firmware and acceptance.
- TiltMouse (separate): board schematics, verified register/pin contracts and prior orientation-filtering lessons. Not modified.

## Data paths

**Display:** PlasmaTerm Python \`BrowserRuntime.step()\` -> ANSI string -> xterm.js DOM -> CEF off-screen BGRA -> ASCIIomium half-block resampler + RGB 1024/256/true-colour quantiser -> VT/ANSI Windows Terminal.

**Controls:** simulated sliders OR ESP32 IMU -> validated telemetry parser -> calibrated/deadzoned exponential smoother -> JS bridge -> typed worker message \`pocketMotion\` -> Python transient parameter overlay at \`_effective_energy_values()\` -> actual plasma output. Existing PlasmaTerm config/LUT persistence is untouched by transient motion. Physical actions: x roll -> fx, y pitch -> fy, gyro Z rate -> hue-shift/speed, tilt magnitude -> radius; shake -> randomize; touch bits -> LUT previous/next; BOOT -> recenter.

**Return:** xterm.js current foreground RGB samples (8x8 grid) -> browser LED preview -> 18% brightness limit -> newest-frame serial write at max ~10Hz -> firmware binary CRC/sequence parser -> RMT GPIO14 output with additional 24/255 peak cap. If the real terminal buffer cannot be sampled or PlasmaTerm has not started, the preview explicitly uses a synthetic procedural fallback.

## Reproducible staging

\`vendor/plasmaterm/\` is an **unchanged** text source snapshot at commit \`dfad2ddbdaa62438194a771ad4086ed1c2cfbff0\`, with upstream AGPL-3.0 licence. \`python tools/prepare.py\` copies it to ignored \`build/site/\`, then appends the PocketPlasma hooks only to the staged \`plasma.py\`, \`web/plasma-browser.js\`, and \`web/plasma-worker.js\`. It inserts the controller module and CSS into the staged HTML. Re-running regenerates the site; no upstream changes are written.

The Python hook monkeypatches the browser instance's transient effective render parameters **after** existing Energy output is computed. It does not mutate \`cfg\`, LUTs or configuration files. The JS worker hook rejects non-finite/out-of-range motion before calling the Python API. The browser adapter also rejects out-of-range input.

## Frame ownership and pacing

There are three clocks: (1) PlasmaTerm Python worker frame generation and xterm presentation, (2) CEF capture / ASCIIomium terminal emission, (3) USB input/LED output. Their rates are independent: roughly 30Hz sensor, 10Hz LED and 15Hz terminal are initial targets, not proven measurements. Serial output never blocks browser drawing: one pending LED payload is replaced by the newest. ASCIIomium already coalesces superseded browser paint generations.

Normal PlasmaTerm web uses a Pyodide worker, xterm.js 6, and CDN assets. Offline portable packaging is future work; no new browser infrastructure or patched Chromium is required by the simulator.

## Permissions and failure

- \`navigator.serial.requestPort()\` is called only from Connect USB, under a real user gesture. Desktop Chromium availability does NOT establish CEF windowless Alloy support.
- The fallback Python bridge is opt-in, binds \`127.0.0.1:8765\`, enforces a small localhost:8000 Origin whitelist and only forwards valid LED binary messages. This is not strong authentication against a malicious **local** process.
- Bad telemetry / stale sequences are dropped. No valid IMU sample for >750ms -> zero transient offsets. If no recent LED payload reaches firmware for >600ms -> LEDs off.
- Firmware uses CDC only, not HID/ESP-NOW. No Wi-Fi or BLE.
- BOARD thermals, matrix wiring order and sensor axes are physical test gates; none is inferred from host unit tests.
- Existing ASCIIomium directly disables the CEF sandbox in the bootstrap executable. A developer machine and a trusted localhost PlasmaTerm are the intended first test environment; do not market this build as hardened for arbitrary pages.

## Current limitations

No physical device test, no successful CEF WebSerial permission probe, no Windows/CEF visual acceptance, no measured performance. Capacitive touch fields are reserved by protocol, but first firmware intentionally emits \`touch:0\` pending a proper touch driver. No absolute yaw: the QMI8658C has accel/gyro only. The LED colour sampling assumes xterm.js BufferCell RGB mode semantics and needs real browser evidence.
