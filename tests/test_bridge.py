import unittest
from tools.serial_bridge import crc16,valid_led_frame,FRAME_SIZE

class BridgeTests(unittest.TestCase):
    def test_crc_reference(self):
        self.assertEqual(crc16(b'123456789'),0x29b1)
    def test_binary_frame_validation(self):
        header=bytes((0xa5,0x5a,1,0x4c,0x34,0x12,192,0))
        body=bytes(range(192))
        message=header+body+crc16((header+body)[2:]).to_bytes(2,'little')
        self.assertEqual(len(message),FRAME_SIZE)
        self.assertTrue(valid_led_frame(message))
        self.assertFalse(valid_led_frame(message[:-1]+b'\x00'))
