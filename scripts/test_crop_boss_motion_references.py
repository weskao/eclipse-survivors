import unittest
from crop_boss_motion_references import crop_specs

class CropSpecsTest(unittest.TestCase):
    def test_all_reference_poses_are_unique_and_in_bounds(self):
        specs = list(crop_specs())
        self.assertEqual(len(specs), 113)
        self.assertEqual(len({path for _, path, _ in specs}), 113)
        self.assertEqual(sum(path.startswith('frames/') for _, path, _ in specs), 84)
        for _, _, (x1, y1, x2, y2) in specs:
            self.assertTrue(0 <= x1 < x2 <= 1536 and 0 <= y1 < y2 <= 1024)

if __name__ == '__main__':
    unittest.main()
