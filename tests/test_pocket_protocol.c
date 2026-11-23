#include <assert.h>
#include <stdio.h>
#include <stdint.h>
#include "../firmware/main/pocket_protocol.h"
static void make(uint16_t seq,uint8_t out[PP_FRAME_LEN]){
  out[0]=0xa5;out[1]=0x5a;out[2]=1;out[3]=0x4c;
  out[4]=(uint8_t)seq;out[5]=(uint8_t)(seq>>8);out[6]=192;out[7]=0;
  for(int i=0;i<192;i++)out[i+8]=(uint8_t)i;
  uint16_t c=pp_crc16(out+2,PP_FRAME_LEN-4);
  out[200]=(uint8_t)c;out[201]=(uint8_t)(c>>8);
}
int main(void){
  assert(pp_crc16((const uint8_t*)"123456789",9)==0x29b1);
  pp_led_parser_t p;pp_parser_init(&p);
  uint8_t frame[PP_FRAME_LEN],rgb[PP_RGB_BYTES];make(65535,frame);
  int complete=0;
  for(unsigned i=0;i<PP_FRAME_LEN;i++)complete+=pp_parser_byte(&p,frame[i],rgb);
  assert(complete==1&&rgb[0]==0&&rgb[191]==191);
  for(unsigned i=0;i<PP_FRAME_LEN;i++)assert(!pp_parser_byte(&p,frame[i],rgb));
  make(0,frame);
  for(unsigned i=0;i<PP_FRAME_LEN-1;i++)assert(!pp_parser_byte(&p,frame[i],rgb));
  assert(pp_parser_byte(&p,frame[PP_FRAME_LEN-1],rgb));
  make(1,frame);frame[19]^=1;
  for(unsigned i=0;i<PP_FRAME_LEN;i++)assert(!pp_parser_byte(&p,frame[i],rgb));
  assert(p.accepted==2&&p.discarded==2);
  puts("PocketPlasma native parser tests passed");return 0;
}
