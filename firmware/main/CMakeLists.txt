idf_component_register(SRCS "app_main.c" "pocket_protocol.c"
  INCLUDE_DIRS "." REQUIRES esp_driver_i2c esp_driver_gpio esp_timer esp_tinyusb led_strip)
