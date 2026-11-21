import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const url = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/'
await mkdir('artifacts/meta-progression', { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
await desktop.goto(url, { waitUntil: 'networkidle' })
await desktop.locator('.mode-grid button').first().waitFor()
await desktop.screenshot({ path: 'artifacts/meta-progression/menu-desktop.png' })
await desktop.getByRole('radio').nth(1).click()
await desktop.screenshot({ path: 'artifacts/meta-progression/standard-selected.png' })

const progress = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
await progress.addInitScript(() => {
  // Screenshot-only illustrative saved progress. No production data is modified.
  const p = {
    version: 2, runs: 12, wins: 4, embers: 180,
    best: { quick: { seconds: 160, kills: 147, level: 16, victory: true }, standard: { seconds: 480, kills: 330, level: 25, victory: true } },
    achievements: ['first-blood', 'first-victory', 'monster-hunter', 'boss-slayer'],
    recentRunIds: ['preview-run'],
    discoveredMonsters: { slime: 340, bat: 221, goblin: 185, golem: 89, boss: 5 },
    discoveredAbilities: ['damage', 'speed', 'frost', 'orb', 'bolt', 'shield'],
    heroesPlayed: ['knight', 'ranger', 'wizard'],
    unlockedCosmetics: ['knight-default', 'ranger-default', 'wizard-default', 'knight-gilded', 'ranger-moonlit', 'wizard-astral'],
    equippedCosmetics: { knight: 'knight-gilded', ranger: 'ranger-default', wizard: 'wizard-default' },
    upgrades: { power: 2, vitality: 1 },
  }
  localStorage.setItem('eclipse-survivors.profile.v2', JSON.stringify(p))
})
await progress.goto(url, { waitUntil: 'networkidle' })
await progress.locator('.progression-drawer summary').click()
await progress.locator('.progression-drawer').screenshot({ path: 'artifacts/meta-progression/progression-showcase-demo.png' })
await progress.locator('.progression-drawer summary').click()
await progress.screenshot({ path: 'artifacts/meta-progression/unlocked-cosmetic-demo.png' })

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
await mobile.goto(url, { waitUntil: 'networkidle' })
await mobile.screenshot({ path: 'artifacts/meta-progression/menu-mobile.png' })
await mobile.getByRole('radio').nth(3).click()
await mobile.locator('#start').click()
await mobile.waitForTimeout(1200)
await mobile.screenshot({ path: 'artifacts/meta-progression/challenge-gameplay-mobile.png' })

try {
  await mobile.locator('#result.active').waitFor({ timeout: 65000 })
  await mobile.screenshot({ path: 'artifacts/meta-progression/defeat-result-mobile.png' })
} catch {
  console.log('Defeat screen was not reached in 65 seconds; menu/gameplay captures remain valid.')
}
await browser.close()
console.log('Captured real Vue app screenshots in artifacts/meta-progression/')
