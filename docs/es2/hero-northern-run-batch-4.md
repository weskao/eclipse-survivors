# ES2 northern run candidate batch 4

Owner upload: 5cb28ee04f4b677aa9d644761c609b680fa3996c. Relocation: 42731bff461eb15702deffa1e78f4ae5b2e873e4. Nine original PNGs, nine manifests, four WebP atlases. Source pixels preserved.

- DEV only: Shadowblade NE/NW, Spirit Summoner N, Crimson Paladin N. Each is four real frames, 768px cells padded from 627px source cells. Explicit direction mapping and lazy Canvas loading; canonical production art remains unchanged.
- Blocked: Shadowblade N (original alpha margin under 8px), Spirit Summoner NE (edge contact), Spirit Summoner NW (staff handedness), Crimson Paladin NE/NW (identity mismatch). The five blocked draft PNGs were retired from the working tree during the five-source/WebP cleanup; the original bytes remain recoverable from the exact pre-cleanup commit recorded in each manifest, and Shadowblade N has an identical canonical batch-5 source. Review notes remain; no runtime import of rejected sources.
- The existing manifest runtimeApplied=false refers to production release, not opt-in DEV review. Native 3x detail and visual approval remain unverified. Do not claim full 8-direction or 10-frame run coverage. Real recordings and exact source draw coverage must pass before visual review; actual approval remains separate.
