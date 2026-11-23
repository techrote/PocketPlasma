# PocketPlasma: first executable showcase

## 1. Prerequisites

Python 3.10+, a modern Chromium browser, optionally Windows Terminal with a **working release build of ASCIIomium**. **No ESP32 is required for the simulator.** Running PlasmaTerm for the first time needs Internet connectivity for the pinned Pyodide and xterm.js CDN assets in the upstream web demo; this is not yet an offline portable package.

## 2. Stage, serve and open

From the PocketPlasma repository root:

~~~powershell
python tools/prepare.py
python -m http.server 8000 --directory build/site
~~~

Browse to **http://localhost:8000/web/**. The genuine PlasmaTerm renderer is served from the pinned AGPL vendor snapshot. A PocketPlasma control panel appears as an overlay. Drag Pitch, Roll and Twist sliders and observe PlasmaTerm's transient frequency/hue/velocity response. Try Prev/Next LUT, Shake, Re-centre and Stage view. The 8×8 display previews actual sampled xterm foreground colours if available; before startup it shows a clearly fallback procedural field.

### ASCIIomium / Windows Terminal

From the ASCIIomium repository root, using an existing Release build:

~~~powershell
.\build\bin\RELEASE\asciiomium_live.exe --url http://localhost:8000/web/ --width 1280 --height 800 --fps 15 --cef-fps 30 --colors 1024
~~~

**Important:** Run the HTTP server separately. On a physical terminal, use the existing Ctrl+Alt+Q quit chord. ASCIIomium's current windowless CEF does not yet have a proven WebSerial permission picker. The simulator and local bridge are intended to work without browser WebSerial; this must be confirmed by Windows tests.

## 3. Physical device transport

**Direct WebSerial:** after flashing PocketPlasma's *separate demo firmware*, click **Connect USB** on a localhost/HTTPS page and choose the device. The request is never automatic.

**Native bridge fallback:** when WebSerial is unavailable, install \`python -m pip install "pyserial>=3.5,<4" "websockets>=14,<17"\` and run \`python tools/serial_bridge.py --port COM5\` (replace COM5 with the actual USB CDC port). Click **Local bridge**. It binds only \`127.0.0.1:8765\`; only a page served at localhost or 127.0.0.1 port 8000 is permitted to connect. This is a locally trusted development aid, not an authentication or sandbox boundary.

## 4. Host verification

~~~powershell
node --test tests/pocket.test.mjs
python -m unittest discover -s tests -v
~~~

If a C compiler is available: \`gcc -std=c11 -Wall -Wextra -Werror firmware/main/pocket_protocol.c tests/test_pocket_protocol.c -o pocket-proto-test && ./pocket-proto-test\`.

## Gaps and cautions

- Source staging and host tests can run without Windows hardware, but do not establish browser rendering quality, CEF permission, COM enumeration, IMU axis convention, actual LED serpentine order or thermals.
- The browser WebSerial chooser may not work in CEF windowless/Alloy; the local bridge is the designed fallback.
- The current prototype uses upstream CDN resources (not an offline bundle); no CEF sandbox exception should be widened without review.
- Independent TiltMouse firmware and its HID/ESP-NOW paths are **not modified**.
