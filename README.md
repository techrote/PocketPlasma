# PocketPlasma

**A motion-controlled plasma synthesiser hosted through ASCIIomium's terminal-rendered Chromium browser.**

PocketPlasma is the *integration and experimentation repository* for three existing projects:

- [ASCIIomium](https://github.com/techrote/ASCIIomium) — CEF off-screen Chromium, BGRA-to-half-block/Unicode terminal rendering, quantisation, terminal keyboard/mouse forwarding and newest-frame scheduling.
- [PlasmaTerm](https://github.com/techrote/PlasmaTerm/tree/web-v0.1a/web) — a real web plasma engine (Python under Pyodide, xterm.js, keybed, modulation, palette/LUT editor).
- [ESP32-QMI8658C-TiltMouse](https://github.com/techrote/ESP32-QMI8658C-TiltMouse) — reference firmware and hardware documentation for the Waveshare ESP32-S3-Matrix with QMI8658C 6-axis IMU, capacitive touch and **8×8 (64-pixel)** RGB matrix.

## Mission

Turn a small physical ESP32-S3-Matrix into a bidirectional creative instrument: tilt reshapes the plasma, angular velocity modifies colour, gestures change presets, and the board mirrors a low-resolution plasma field on its RGB LEDs. PlasmaTerm is presented through ASCIIomium's deliberately stylised terminal rasterisation, while ordinary Chromium/Firefox can act as independent diagnostic hosts.

The central ambition is **prove ASCIIomium as a reusable, stylised browser-application host**. PocketPlasma is the first serious interactive application exercising high-churn animation, control, browser privileges, viewport/input coherence, two frame schedulers and external USB hardware.

## Non-negotiable boundaries

1. **This repository is the integration owner.** Do not rewrite or silently alter ASCIIomium, PlasmaTerm or TiltMouse mainlines.
2. Preserve a pinned, auditable PlasmaTerm source provenance and its **AGPL-3.0** licence. External third-party dependencies must be attributed.
3. A **simulated IMU** mode is always available; it must run without a board, Chromium feature flags, network-connected devices or privileged hardware access.
4. **Web Serial** is the preferred device path, but its availability/permission chooser in ASCIIomium's **CEF windowless/Alloy** runtime is an **unproven feasibility gate**. Provide explicit capability detection, never claim that upstream Chromium support proves CEF support.
5. A native serial-to-browser bridge is the fallback if Web Serial is unavailable. It must be **loopback-only, opt-in, origin-restricted, and not a generic remote scripting facility**.
6. Hardware uses USB CDC for the demo; do **not** mix this demo firmware into the TiltMouse's HID/ESP-NOW transport logic or emit duplicate HID reports.
7. The board has **no magnetometer**. Use gravity-referenced pitch/roll, short-term gyro angular-rate response and explicit re-centre; do not present gyro-integrated yaw as an absolute heading.
8. 8×8 LED frames need bounded duty/brightness and disconnection behaviour. The Waveshare documentation warns that high LED brightness can damage the board.
9. Never claim physical enumeration, runtime browser integration, USB serial permissions, actual LED orientation or hardware thermals have been validated without device-side evidence.
10. Keep CI small, predictable and focused on host logic. No heavy/browser/GPU workflow until explicitly justified by measured benefit. Draft/HOLD PRs; no auto-merge.

## First implementation track

- Reproducible **pinned PlasmaTerm source staging**, with a minimal adapter added to the staged copy (no destructive upstream edits).
- A browser overlay displaying hardware state, providing motion simulation, direct Web Serial with bounded packets, and a physical-LED preview.
- A persistent-configuration-safe **transient parameter bridge** into PlasmaTerm's existing Pyodide worker.
- A versioned bidirectional serial wire format plus host-side validation, stale-device watchdog and packet-drop/coalescing policy.
- An isolated ESP-IDF demonstrator using the Waveshare reference pinout: USB D-/D+ GPIO19/20; QMI8658C I2C SDA/SCL GPIO11/12; RGB matrix data GPIO14; BOOT GPIO0.
- Source-exact Windows validation: PlasmaTerm in standard Chromium, then ASCIIomium's CEF/terminal host, then physical ESP32 acceptance.

## Run the first prototype

The `feat/pocketplasma-vertical-slice` development branch now includes a source-exact PlasmaTerm web runtime snapshot, an optional controller overlay, WebSerial/localhost bridge transports and a candidate ESP32-S3-Matrix firmware project. For the live launch sequence see [docs/QUICKSTART.md](docs/QUICKSTART.md).

From the repository root:

```powershell
python tools/prepare.py
python -m http.server 8000 --directory build/site
```

Then open **http://localhost:8000/web/** in Chrome/Chromium (or use ASCIIomium's `--url` switch). The simulated IMU requires no hardware. The ESP-IDF firmware and CEF-specific device picker have **not** yet passed actual target/physical acceptance; consult [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md).

For architecture, protocol and board authority see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/PROTOCOL.md](docs/PROTOCOL.md), and [docs/HARDWARE.md](docs/HARDWARE.md).

## Status

Project charter recorded on **2026-11-23**. Implementation, test evidence and current qualification status are tracked in subsequent commits/issues/PRs. Presence of code does not imply the physical test gates have passed.

## Source anchors

- [PlasmaTerm web-v0.3a in the `web-v0.1a` branch](https://github.com/techrote/PlasmaTerm/tree/web-v0.1a/web)
- [ASCIIomium live browser](https://github.com/techrote/ASCIIomium/blob/main/src/app/live_main.cpp)
- [TiltMouse hardware pin contract](https://github.com/techrote/ESP32-QMI8658C-TiltMouse/blob/main/components/board/include/tiltmouse/board_pins.h)
- [Waveshare official documentation](https://docs.waveshare.com/ESP32-S3-Matrix)
