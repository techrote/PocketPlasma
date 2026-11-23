# PP-USB-001 — Versioned bidirectional USB CDC protocol

Transport is a dedicated USB CDC ACM interface at 115200 nominal baud (CDC is USB; line speed is a configuration convention). Browser WebSerial preferred; opt-in localhost WebSocket relay fallback. No USB HID and no radios. Endianness is little-endian.

## Device → host: newline-delimited JSON

UTF-8, **at most 512 characters per line**, \n terminator. Every record has \`v:1\`.

- Hello: \`{"v":1,"type":"hello","device":"PocketPlasma-S3","leds":64}\`
- IMU: \`{"v":1,"type":"imu","seq":123,"ms":45678,"pitch":-4.2,"roll":17.3,"yawRate":22.5,"shake":false,"touch":0,"boot":false}\`

\`seq\` unsigned 16-bit wraps modulo 65536. \`ms\` unsigned 32-bit monotonic-ish device uptime, wraps naturally; use host reception time for freshness. Pitch/roll degrees bounded [-180,+180]; yawRate degrees/second bounded [-4000,+4000]. \`shake\` is one rising event subject to cooldown. \`touch\` bit 0 = left pads, bit 1 = right pads. \`boot\` = BOOT button held; the browser re-centres on its rising edge. 16-bit sequence distance is newer iff \`0 < ((next - previous) mod 65536) < 32768\`. New Hello permits resynchronisation after device reboot. Malformed/missing/non-finite values, overlong lines and stale packets are ignored. A 750ms valid-sample timeout neutralises plasma controls; stale input must never keep drifting.

## Host → device: fixed binary LED packet

| Offset | Length | Field |
|---|---:|---|
| 0 | 2 | Magic A5 5A |
| 2 | 1 | Version = 01 |
| 3 | 1 | Command = 4C ('L') |
| 4 | 2 | Frame sequence u16 LE |
| 6 | 2 | Payload length u16 LE = 192 |
| 8 | 192 | 64 consecutive RGB888 pixels (R,G,B) |
| 200 | 2 | CRC16 CCITT-FALSE u16 LE |

CRC-16/CCITT-FALSE = polynomial 0x1021, init 0xFFFF, no reflection, xorout 0. Compute across **bytes 2 through 199**, inclusive (version, command, sequence, length, payload), excluding magic and CRC. Reference \`crc16("123456789") == 0x29B1\`. Full packet = 202 bytes. Invalid length/type/version/CRC/sequence is discarded. Firmware may re-arm sequence after prolonged silence for a new browser session.

Packets arrive at **at most 10Hz** (browser pacing); no packet history or serial retransmission. Browser holds at most one pending unsent frame and replaces it with the newest; fallback WebSocket transport drops writes when its buffered bytes exceed ~2 frame lengths. Board resets LED colours to black after **600ms** without an accepted packet.

Brightness: JS scales source RGB by at most 0.25 (default 0.18); the firmware independently scales each pixel so its brightest component is **at most 24/255**. Thermal acceptance is required before changing caps. Pixel physical ordering and orientation need a real 8x8 board test; current firmware assumes logical index = physical index.

## Ownership rules

An application chooses **one** hardware transport: WebSerial or local bridge. Do not send the same packet simultaneously through both. Do not mistake simulated IMU for device telemetry. Physical touch is reserved, **not implemented** by first CDC firmware; \`touch:0\` is intentional. Raw yaw is not represented; only gyro Z angular rate.

## Contract tests

Node tests validate JSON parsing/sequence/CRC/LED framing and motion mapping. Python bridge tests validate matching binary CRC. The isolated C parser is compiled as a host C test with malicious CRC, duplicate/stale and rollover fixtures. Real I/O/permission/LED orientation remains a manual hardware acceptance gate.
