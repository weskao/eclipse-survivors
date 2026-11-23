"""Check all real imported ES2 hero candidate assets against immutable hashes."""
import hashlib
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'src/assets/es2/production/heroes/candidates/east-run-candidate-assets.json'

class CandidateAssetIntegrity(unittest.TestCase):
    def test_art_is_present_but_still_unapproved(self):
        self.assertTrue(MANIFEST.is_file(), 'candidate asset manifest missing')
        m = json.loads(MANIFEST.read_text())
        self.assertEqual(m['status'], 'QA_PENDING')
        self.assertIs(m['native3x'], False)
        self.assertIs(m['runtimeApplied'], False)
        self.assertIs(m['completeEightDirections'], False)
        self.assertEqual(m['candidateHeroIds'], ['shadowblade', 'spirit-summoner'])
        self.assertEqual(m['framesPerHero'], 4)
        self.assertEqual(len(m['assets']), 16)
        self.assertEqual(len({i['path'] for i in m['assets']}), 16)
        for item in m['assets']:
            with self.subTest(path=item['path']):
                path=Path(item['path'])
                self.assertEqual(path.parts[:5], ('src','assets','es2','production','heroes'))
                self.assertIn(path.parts[5], m['candidateHeroIds'])
                self.assertIn('/candidates/east-run/', '/'+path.as_posix())
                self.assertTrue((ROOT/path).is_file(),f'MISSING: {path}')
                data=(ROOT/path).read_bytes()
                self.assertEqual(len(data),item['bytes'])
                self.assertEqual(hashlib.sha256(data).hexdigest(),item['sha256'])
        for hero in m['candidateHeroIds']:
            qa=ROOT/f'src/assets/es2/production/heroes/{hero}/candidates/east-run/asset-QA.json'
            metadata=json.loads(qa.read_text())
            self.assertIs(metadata['native3x'],False)
            self.assertIs(metadata['completeEightDirections'],False)
            self.assertIs(metadata['runtimeApplied'],False)

if __name__=='__main__':
    if len(sys.argv)>1:sys.argv=sys.argv[:1]
    unittest.main()
