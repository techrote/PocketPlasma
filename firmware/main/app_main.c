/* Experimental ESP32-S3-Matrix PocketPlasma firmware.
 * Uses board/register facts from ESP32-QMI8658C-TiltMouse and Waveshare docs.
 * No TiltMouse code copied. CDC ONLY: no USB HID, ESP-NOW, Wi-Fi or BLE.
 * Physical axis sign, LED wire order, USB enumeration, IDF compile and thermal
 * performance remain UNVERIFIED pending owner hardware acceptance.
 */
#include <math.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include "driver/gpio.h"
#include "driver/i2c_master.h"
#include "esp_check.h"
#include "esp_err.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "led_strip.h"
#include "led_strip_rmt.h"
#include "tinyusb.h"
#include "tinyusb_cdc_acm.h"
#include "pocket_protocol.h"

#define PP_SDA 11
#define PP_SCL 12
#define PP_RGB 14
#define PP_BOOT 0
#define PP_LED_CAP 24u
#define PP_LED_WATCHDOG_US 600000LL
#define PP_IMU_PERIOD_US 33000LL
#define PP_DEGREES 57.2957795f

static const char *TAG="pocketplasma";
static i2c_master_bus_handle_t bus;
static i2c_master_dev_handle_t qmi;
static led_strip_handle_t leds;
static pp_led_parser_t parser;
static uint8_t led_pixels[PP_RGB_BYTES];
static int64_t last_led_us=0;
static bool led_on=false,orientation_valid=false;
static float pitch_state=0,roll_state=0;
static uint32_t last_sensor_ms=0,last_shake_ms=0;
static uint16_t motion_seq=0;

static esp_err_t qread(uint8_t reg,uint8_t *out,size_t n){
  if(!qmi)return ESP_ERR_INVALID_STATE;
  uint8_t address=(uint8_t)(reg|(n>1?0x80:0));
  return i2c_master_transmit_receive(qmi,&address,1,out,n,20);
}
static esp_err_t qwrite(uint8_t reg,uint8_t value){
  const uint8_t bytes[]={reg,value};
  return i2c_master_transmit(qmi,bytes,2,20);
}
static esp_err_t imu_start(void){
  const i2c_master_bus_config_t config={
    .i2c_port=I2C_NUM_0,.sda_io_num=PP_SDA,.scl_io_num=PP_SCL,
    .glitch_ignore_cnt=7,.flags.enable_internal_pullup=true
  };
  ESP_RETURN_ON_ERROR(i2c_new_master_bus(&config,&bus),TAG,"I2C bus");
  for(int n=0;n<2;n++){
    const i2c_device_config_t spec={
      .dev_addr_length=I2C_ADDR_BIT_LEN_7,
      .device_address=n==0?0x6a:0x6b,.scl_speed_hz=400000
    };
    i2c_master_dev_handle_t candidate=NULL;
    if(i2c_master_bus_add_device(bus,&spec,&candidate)!=ESP_OK)continue;
    qmi=candidate;uint8_t who=0;
    if(qread(0x00,&who,1)==ESP_OK&&who==0x05)break;
    qmi=NULL;i2c_master_bus_rm_device(candidate);
  }
  if(!qmi)return ESP_ERR_NOT_FOUND;
  ESP_RETURN_ON_ERROR(qwrite(0x60,0xb0),TAG,"QMI reset");
  vTaskDelay(pdMS_TO_TICKS(200));
  const struct {uint8_t reg,value;} values[]={
    {0x02,0x40},{0x08,0x00},{0x03,0x15},{0x04,0x55},
    {0x06,0x00},{0x08,0x03}
  };
  for(unsigned i=0;i<sizeof(values)/sizeof(values[0]);i++)
    ESP_RETURN_ON_ERROR(qwrite(values[i].reg,values[i].value),TAG,"QMI config");
  vTaskDelay(pdMS_TO_TICKS(80));
  ESP_LOGI(TAG,"QMI8658C active");return ESP_OK;
}
static int16_t le16(const uint8_t *ptr){
  return (int16_t)((uint16_t)ptr[0]|((uint16_t)ptr[1]<<8));
}
static bool imu_sample(float *pitch,float *roll,float *zrate,bool *shake){
  uint8_t status=0,raw[17];
  if(qread(0x2e,&status,1)!=ESP_OK||(status&3)!=3||
     qread(0x30,raw,sizeof(raw))!=ESP_OK)return false;
  const float ax=le16(raw+5)/8192.f,ay=le16(raw+7)/8192.f,az=le16(raw+9)/8192.f;
  const float gx=le16(raw+11)/64.f,gy=le16(raw+13)/64.f,gz=le16(raw+15)/64.f;
  const float gravity=sqrtf(ax*ax+ay*ay+az*az);
  if(!isfinite(gravity)||gravity<.1f||gravity>16.f)return false;
  const float p=atan2f(-ax,sqrtf(ay*ay+az*az))*PP_DEGREES;
  const float r=atan2f(ay,az)*PP_DEGREES;
  const uint32_t now=(uint32_t)(esp_timer_get_time()/1000);
  float dt=last_sensor_ms?(now-last_sensor_ms)/1000.f:.033f;
  last_sensor_ms=now;if(dt<=0.f||dt>.2f)dt=.033f;
  if(!orientation_valid){pitch_state=p;roll_state=r;orientation_valid=true;}
  else{
    pitch_state=.965f*(pitch_state+gy*dt)+.035f*p;
    roll_state=.965f*(roll_state+gx*dt)+.035f*r;
  }
  *pitch=fmaxf(-180.f,fminf(180.f,pitch_state));
  *roll=fmaxf(-180.f,fminf(180.f,roll_state));
  *zrate=fmaxf(-4000.f,fminf(4000.f,gz)); // angular RATE, not heading
  *shake=gravity>1.8f&&(uint32_t)(now-last_shake_ms)>1200;
  if(*shake)last_shake_ms=now;
  return true;
}
static void leds_start(void){
  const led_strip_config_t config={
    .strip_gpio_num=PP_RGB,.max_leds=PP_LED_COUNT,
    .led_model=LED_MODEL_WS2812,
    .color_component_format=LED_STRIP_COLOR_COMPONENT_FMT_GRB
  };
  const led_strip_rmt_config_t rmt={.resolution_hz=10000000,.flags.with_dma=false};
  if(led_strip_new_rmt_device(&config,&rmt,&leds)==ESP_OK){
    (void)led_strip_clear(leds);
  }else ESP_LOGW(TAG,"LED matrix unavailable; motion-only");
}
static void leds_show(const uint8_t rgb[PP_RGB_BYTES]){
  if(!leds)return;
  for(unsigned i=0;i<PP_LED_COUNT;i++){
    const uint8_t *color=rgb+i*3;
    uint8_t maximum=color[0]>color[1]?color[0]:color[1];
    if(color[2]>maximum)maximum=color[2];
    const float brightness=maximum>PP_LED_CAP?(float)PP_LED_CAP/maximum:1.f;
    // LED order (row major vs serpentine) is a manual hardware acceptance gate.
    (void)led_strip_set_pixel(leds,i,
      (uint8_t)(color[0]*brightness),
      (uint8_t)(color[1]*brightness),
      (uint8_t)(color[2]*brightness));
  }
  if(led_strip_refresh(leds)==ESP_OK)led_on=true;
}
static void cdc_text(const char *message){
  if(!tud_mounted()||!tud_cdc_n_connected(0))return;
  const size_t size=strlen(message);
  if(tinyusb_cdcacm_write_queue(TINYUSB_CDC_ACM_0,(const uint8_t*)message,size)==size)
    (void)tinyusb_cdcacm_write_flush(TINYUSB_CDC_ACM_0,0);
}
static void cdc_input(void){
  uint8_t bytes[256];size_t count=0;
  if(tinyusb_cdcacm_read(TINYUSB_CDC_ACM_0,bytes,sizeof(bytes),&count)!=ESP_OK)return;
  for(size_t i=0;i<count;i++)if(pp_parser_byte(&parser,bytes[i],led_pixels)){
    last_led_us=esp_timer_get_time();leds_show(led_pixels);
  }
}
void app_main(void){
  pp_parser_init(&parser);
  const gpio_config_t boot={
    .pin_bit_mask=1ULL<<PP_BOOT,.mode=GPIO_MODE_INPUT,
    .pull_up_en=GPIO_PULLUP_ENABLE,.pull_down_en=GPIO_PULLDOWN_DISABLE,
    .intr_type=GPIO_INTR_DISABLE
  };
  ESP_ERROR_CHECK(gpio_config(&boot));
  leds_start();
  const tinyusb_config_t usb=TINYUSB_DEFAULT_CONFIG();
  ESP_ERROR_CHECK(tinyusb_driver_install(&usb));
  const tinyusb_config_cdcacm_t acm={.cdc_port=TINYUSB_CDC_ACM_0};
  ESP_ERROR_CHECK(tinyusb_cdcacm_init(&acm));
  const bool imu_ok=imu_start()==ESP_OK;
  if(!imu_ok)ESP_LOGE(TAG,"QMI unavailable. No invented motion will be sent.");
  int64_t next_imu=0,last_hello=0;
  char outgoing[256];
  while(true){
    const int64_t now=esp_timer_get_time();
    cdc_input();
    if(now-last_hello>=3000000){
      cdc_text("{\"v\":1,\"type\":\"hello\",\"device\":\"PocketPlasma-S3\",\"leds\":64}\n");
      last_hello=now;
    }
    if(led_on&&now-last_led_us>PP_LED_WATCHDOG_US){
      (void)led_strip_clear(leds);led_on=false;
    }
    if(last_led_us&&now-last_led_us>2000000&&parser.have_sequence)
      parser.have_sequence=false; // accept a new browser session after silence
    if(imu_ok&&now>=next_imu){
      next_imu=now+PP_IMU_PERIOD_US;
      float pitch=0,roll=0,z=0;bool shake=false;
      if(imu_sample(&pitch,&roll,&z,&shake)){
        const int n=snprintf(outgoing,sizeof(outgoing),
          "{\"v\":1,\"type\":\"imu\",\"seq\":%u,\"ms\":%lu,"
          "\"pitch\":%.2f,\"roll\":%.2f,\"yawRate\":%.2f,"
          "\"shake\":%s,\"touch\":0,\"boot\":%s}\n",
          (unsigned)motion_seq++,(unsigned long)(now/1000),
          pitch,roll,z,shake?"true":"false",
          gpio_get_level(PP_BOOT)==0?"true":"false");
        if(n>0&&(size_t)n<sizeof(outgoing))cdc_text(outgoing);
      }
    }
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}
