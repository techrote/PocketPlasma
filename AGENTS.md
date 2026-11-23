# PocketPlasma contributor/agent instructions

Read README.md, docs/ARCHITECTURE.md, docs/PROTOCOL.md, docs/HARDWARE.md and docs/ACCEPTANCE.md before editing.

- The **only owner of PocketPlasma integration is this repository**. Never implement a shortcut by changing ASCIIomium, PlasmaTerm, TiltMouse, CyberSand or shared CI.
- Keep vendor/plasmaterm an unchanged, source-exact AGPL-3.0 snapshot. All adapters live in web/pocket and are added to the generated build/site by tools/prepare.py. Preserve provenance, licence and source notices.
- Never advertise Chromium WebSerial as proven within CEF windowless/Alloy until a real device-picker test succeeds; the bridge is loopback-only, explicit opt-in, origin-filtered and typed.
- All motion offsets are **transient** and must not rewrite PlasmaTerm saved configuration. Never integrate gyro Z as absolute yaw.
- Simulated hardware always works without a device. Local/hardware stalls must not block render frames. Decode/queue sizes bounded; stale IMU neutralised; stale LEDs blanked; physical LED duty capped.
- Physical acceptance is an explicit manual gate. Do not claim USB enumeration, actual axis orientation, touch sensing or thermal safety on host-test evidence alone. Touch in first firmware is intentionally zero until driver completed.
- Keep tests lightweight: Node/Python host plus small C packet parser; no CI engineering detours, GPU hardware assumptions or auto-merge.
- Publish changes to a feature branch and Draft/HOLD PR. Document exact source SHA, test commands/output, omissions and next manual tests.
