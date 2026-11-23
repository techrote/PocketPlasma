#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#define PP_LED_COUNT 64u
#define PP_RGB_BYTES (PP_LED_COUNT*3u)
#define PP_FRAME_LEN (8u+PP_RGB_BYTES+2u)
typedef struct {
  uint8_t buffer[PP_FRAME_LEN];
  size_t length;
  uint16_t last_sequence;
  bool have_sequence;
  uint32_t accepted,discarded;
} pp_led_parser_t;
uint16_t pp_crc16(const uint8_t *data,size_t size);
void pp_parser_init(pp_led_parser_t *parser);
bool pp_parser_byte(pp_led_parser_t *parser,uint8_t value,uint8_t rgb[PP_RGB_BYTES]);
