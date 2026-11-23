# ESP32-S3-Matrix — hardware and firmware guide

**Board:** Waveshare ESP32-S3-Matrix, 8x8 addressable RGB matrix (64 pixels), QMI8658C/QMI8658 6-axis accelerometer + gyroscope, native USB-C, BOOT/RESET.

References:
- https://docs.waveshare.com/ESP32-S3-Matrix
- https://github.com/techrote/ESP32-QMI8658C-TiltMouse/blob/main/RAG.md
- https://github.com/techrote/ESP32-QMI8658C-TiltMouse/blob/main/components/board/include/tiltmouse/board_pins.h
- https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/usb_device.html

| Function | ESP32-S3 pins |
|---|---|
| USB D-/D+ | GPIO19/20 |
| IMU I2C SDA/SCL | GPIO11/12 |
| IMU interrupts | GPIO10/13 |
| Matrix serial data | GPIO14 |
| BOOT (held low) | GPIO0 |
| Capacitive left | GPIO1, GPIO2, GPIO3 |
| Touch reference | GPIO4, never a button |
| Capacitive right | GPIO5, GPIO6, GPIO7 |

The IMU probes 7-bit 0x6A then 0x6B, WHO_AM_I 0x00 expected 0x05. Reference config: CTRL1 0x02=0x40; CTRL2 0x03=0x15 (+/-4g, 235Hz); CTRL3 0x04=0x55 (+/-512dps,235Hz); CTRL5 0x06=0; CTRL7 0x08=3; reset 0x60=0xB0. Coherent burst from timestamp register 0x30 (17 bytes). Scaling: accel raw/8192 g, gyro raw/64 deg/s.

## Demo firmware

Directory \`firmware/\` is a separate ESP-IDF project. Target ESP-IDF 6.1 and \`espressif/esp_tinyusb\` 2.3.0 plus \`led_strip\` 3.x. It intentionally replaces mouse behavior while loaded: **USB CDC only**, no HID mouse output, no ESP-NOW, no Wi-Fi/BLE. Save original TiltMouse binaries before flashing if needed.

~~~powershell
cd firmware
idf.py set-target esp32s3
idf.py build
idf.py -p COM5 flash
~~~

Use a real port from Device Manager (Windows); port may change when CDC firmware starts. To recover from non-working firmware: hold BOOT, press RESET, release BOOT, then flash again using the chip's ROM loader. Do not confuse reset/BOOT with all-firmware permanent changes. **No flashing has been performed here.**

## Safety and test status

- The RMT colour matrix receives at most 24/255 per colour channel after device scaling; the browser also limits outgoing brightness. **Waveshare warns about overheating at high brightness**, so real thermal observations remain required even at these provisional caps.
- The 600ms device-side LED watchdog turns the display black on lost host output. It is not a hardware over-current protection circuit.
- The first firmware has a complementary accelerometer/gyro pitch/roll estimate and uses gyro Z RATE only. Axis signs and mounting orientation need physical calibration; there is no magnetometer.
- Capacitive touch integration is **not implemented yet** in the first firmware; logical protocol field is reserved and emitted as zero. BOOT is sampled as a hardware input for user re-centre.
- Matrix serpentine/row-major ordering and RGB-vs-GRB driver mapping need physical confirmation and adjustment.
- Host test success never means IDF compile success, physical device enumeration, sensor/LED performance or heat has been verified.

See [the hardware acceptance issue](https://github.com/techrote/PocketPlasma/issues/3) for the remaining concrete work.
