#include "pocket_protocol.h"
#include <string.h>
uint16_t pp_crc16(const uint8_t *data,size_t length){
  uint16_t crc=0xffff;
  for(size_t i=0;i<length;i++){
    crc^=(uint16_t)data[i]<<8;
    for(int b=0;b<8;b++)crc=(crc&0x8000u)?(uint16_t)((crc<<1)^0x1021u):(uint16_t)(crc<<1);
  }
  return crc;
}
void pp_parser_init(pp_led_parser_t *p){memset(p,0,sizeof(*p));}
bool pp_parser_byte(pp_led_parser_t *p,uint8_t value,uint8_t rgb[PP_RGB_BYTES]){
  if(p->length==0&&value!=0xa5)return false;
  if(p->length==1&&value!=0x5a){p->length=value==0xa5?1:0;return false;}
  p->buffer[p->length++]=value;
  if(p->length<PP_FRAME_LEN)return false;
  p->length=0;
  const uint8_t *b=p->buffer;
  if(b[2]!=1||b[3]!=0x4c||b[6]!=192||b[7]!=0){p->discarded++;return false;}
  const uint16_t want=pp_crc16(b+2,PP_FRAME_LEN-4);
  const uint16_t got=(uint16_t)b[PP_FRAME_LEN-2]|((uint16_t)b[PP_FRAME_LEN-1]<<8);
  if(want!=got){p->discarded++;return false;}
  const uint16_t seq=(uint16_t)b[4]|((uint16_t)b[5]<<8);
  if(p->have_sequence){const uint16_t delta=(uint16_t)(seq-p->last_sequence);
    if(delta==0||delta>=32768u){p->discarded++;return false;}}
  p->last_sequence=seq;p->have_sequence=true;
  memcpy(rgb,b+8,PP_RGB_BYTES);p->accepted++;return true;
}
