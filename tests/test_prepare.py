import tempfile
import unittest
from pathlib import Path
from tools.prepare import ROOT,stage

class StageTests(unittest.TestCase):
    def test_upstream_preservation_and_overlay(self):
        upstream=(ROOT/'vendor'/'plasmaterm'/'plasma.py').read_bytes()
        with tempfile.TemporaryDirectory() as tmp:
            destination=Path(tmp)/'site'
            meta=stage(destination)
            self.assertEqual(meta['sha'],'dfad2ddbdaa62438194a771ad4086ed1c2cfbff0')
            self.assertIn('POCKETPLASMA_STAGE_V1',(destination/'plasma.py').read_text())
            self.assertIn('pocket/controller.mjs',(destination/'web/index.html').read_text())
            self.assertIn('pocketMotion',(destination/'web/plasma-worker.js').read_text())
            self.assertEqual((ROOT/'vendor'/'plasmaterm'/'plasma.py').read_bytes(),upstream)
            self.assertTrue((destination/'web/pocket/controller.mjs').exists())
            self.assertTrue((destination/'LICENSE').exists())
    def test_refuses_unsafe_staging(self):
        with self.assertRaises(ValueError):stage(ROOT)
