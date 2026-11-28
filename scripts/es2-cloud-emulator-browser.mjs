import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const unlocked = process.env.ES2_QA_UNLOCKED === '1'
const base = 'http://127.0.0.1:' + (unlocked ? '4176' : '4175') + '/tests/fixtures/cloud-wallet.html'
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] })
const live = /^https?:\/\/(?:(?:identitytoolkit|securetoken|firestore)\.googleapis\.com|accounts\.google\.com)/
const waitStatus = async (page, state) => page.locator(`[data-es2-cloud-account][data-es2-cloud-state="${state}"]`).waitFor({timeout: 30000})
const balance = page => page.evaluate(() => window.__cloudQa.balance())
const waitBalance = async (page, expected) => page.waitForFunction(n => window.__cloudQa.balance() === n, expected, {timeout: 30000})
async function createPage(viewport, locale = 'en-US') {
  const context = await browser.newContext({ viewport, locale })
  await context.route(live, route => route.abort())
  const page = await context.newPage()
  page.on('console', message => { if (message.type() === 'warning' || message.type() === 'error') console.log('browser:', message.text()) })
  await page.goto(base)
  await waitStatus(page, 'guest')
  return page
}
async function login(page, selector, email, existing = false) {
  const button = page.locator(selector)
  await button.waitFor()
  await page.waitForFunction(sel => {
    const btn = document.querySelector(sel)
    const icon = btn?.querySelector('img')
    return !!btn && !btn.disabled && icon?.complete && icon.naturalWidth > 0
  }, selector)
  const rect = await button.boundingBox()
  assert.ok(rect && rect.height >= 44, 'Google login touch target must be >=44px')
  const popupPromise = page.waitForEvent('popup', { timeout: 20000 })
  await button.click()
  const popup = await popupPromise
  await popup.waitForLoadState('load')
  if (existing) await popup.locator('.js-reuse-account').filter({ hasText: email }).click()
  else {
    await popup.locator('.js-new-account').click()
    await popup.locator('#email-input').fill(email)
    await popup.locator('#sign-in').click()
  }
}
async function completeRun(page) {
  await page.locator('.es2-portal-start').click()
  await page.waitForFunction(() => window.__test?.mode === 'play')
  await page.evaluate(() => window.__cloudQa.finish())
  await page.locator('.es2-result').waitFor()
}
async function resultConfirmed(page) {
  await page.locator('[data-es2-result-cloud-status][data-confirmed="true"]').waitFor({ timeout: 30000 })
}
async function home(page) {
  await page.locator('.es2-dialog-actions .es2-secondary').filter({hasText: /Return to|Back to|返回主選單/i}).click()
  await page.locator('[data-es2-cloud-account]').waitFor()
}
try {
  const first = await createPage({width: 1280, height: 800})
  await login(first, '[data-es2-cloud-account]', 'ember-qa@example.test')
  await first.locator('[data-es2-account-toast="success"]').waitFor()
  await waitStatus(first, 'synced')
  assert.equal(await first.locator('[role="dialog"]').count(), 0, 'homepage login must not open a custom dialog')
  assert.equal(await balance(first), unlocked ? 100_000 : 0)
  if (unlocked) {
    const second = await createPage({width: 1280, height: 800})
    await login(second, '[data-es2-cloud-account]', 'ember-qa@example.test', true)
    await waitStatus(second, 'synced')
    await waitBalance(second, 100_000)
    console.log('PASS: unlocked emulator wallet initialized and restored separately')
  } else {
  await completeRun(first)
  await resultConfirmed(first)
  assert.equal(await first.locator('[data-es2-result-cloud]').getAttribute('data-state'), 'synced')
  assert.equal(await first.locator('[data-es2-result-google-login]').count(), 0)
  const earned = await balance(first)
  assert.ok(earned > 0, 'real run settlement must increase the account balance')
  await home(first)
  await first.evaluate(() => window.__cloudQa.spend())
  await first.waitForFunction(n => window.__cloudQa.balance() < n, earned)
  await waitStatus(first, 'synced')
  const remaining = await balance(first)
  assert.ok(remaining >= 0)
  const fresh = await createPage({width: 375, height: 812}, 'zh-TW')
  await login(fresh, '[data-es2-cloud-account]', 'ember-qa@example.test', true)
  await waitStatus(fresh, 'synced')
  await waitBalance(fresh, remaining)
  const guest = await createPage({width: 640, height: 360})
  await completeRun(guest)
  const guestBalance = await balance(guest)
  assert.ok(guestBalance > 0)
  assert.equal(await guest.locator('[role="dialog"]').count(), 1)
  await login(guest, '[data-es2-result-google-login]', 'guest-qa@example.test')
  await guest.locator('[data-es2-result-cloud] [data-es2-account-toast="success"]').waitFor()
  await resultConfirmed(guest)
  assert.equal(await guest.locator('[role="dialog"]').count(), 1, 'result login must not open a second game dialog')
  assert.equal(await balance(guest), 0, 'guest and new Google wallets are isolated')
  for (const page of [first, fresh, guest]) {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'page must not scroll horizontally')
    await page.context().close()
  }
  console.log('PASS: direct Google emulator OAuth from home and results, real settlement, spending, cross-device restoration, guest isolation, desktop and mobile')
  }
} finally { await browser.close() }
