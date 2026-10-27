import { expect, test } from '@playwright/test'

let runtimeErrors: string[]
test.beforeEach(async ({ page }) => {
  runtimeErrors = []
  page.on('pageerror', error => runtimeErrors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') runtimeErrors.push(message.text())
  })
  page.on('requestfailed', request => runtimeErrors.push(`${request.url()}: ${request.failure()?.errorText}`))
})
test.afterEach(() => expect(runtimeErrors).toEqual([]))

test('START fades in before pulsing and remains usable during its entrance', async ({ page }) => {
  await page.goto('/')
  const start = page.getByRole('button', { name: 'PRESS TO START' })
  await expect(start).toBeAttached()
  const samples = await start.evaluate(element => {
    const animations = element.getAnimations()
    animations.forEach(animation => animation.pause())
    const sample = (time: number) => {
      animations.forEach(animation => { animation.currentTime = time })
      return Number(getComputedStyle(element).opacity)
    }
    const values = [0, 150, 300, 600, 1600, 2600].map(sample)
    // Leave the button partway through its entrance to verify early activation.
    sample(150)
    return values
  })
  expect(samples[0]).toBe(0)
  expect(samples[1]).toBeGreaterThan(0)
  expect(samples[2]).toBeGreaterThan(samples[1])
  expect(samples[2]).toBeLessThan(1)
  expect(samples[3]).toBeCloseTo(1, 3)
  expect(samples[4]).toBeCloseTo(0.7, 3)
  expect(samples[5]).toBeCloseTo(1, 3)
  await expect(start).toBeFocused()
  await start.press('Enter')
  await expect(start).toBeDisabled()
  await expect(start).toHaveCSS('opacity', '1')
  await expect(page.locator('.race-start-overlay')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'HOME', exact: true })).toBeFocused()
})

test('four timed columns, fifth on START, cinematic HOME reveal and persistent reload', async ({ page, browserName }, info) => {
  const assets = new Set<string>()
  page.on('request', request => { if (request.url().includes('/assets/')) assets.add(request.url()) })
  await page.addInitScript(() => {
    const samples: Array<{ count: number; time: number }> = []
    const observer = new MutationObserver(() => {
      const count = document.querySelectorAll('.race-light-column[data-lit="true"]').length
      if (count && samples.at(-1)?.count !== count) samples.push({ count, time: performance.now() })
    })
    observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-lit'] })
    Object.assign(window, { raceLightSamples: samples })
  })
  await page.goto('/')
  const overlay = page.getByRole('region', { name: 'Race Start introduction' })
  const lit = page.locator('.race-light-column[data-lit="true"]')
  await expect(overlay).toBeVisible()
  expect(await page.locator('.wheel-surface').evaluate(element => {
    element.focus()
    return { inert: (element.closest('[inert]') as HTMLElement)?.inert, blocked: document.activeElement !== element }
  })).toEqual({ inert: true, blocked: true })
  if (browserName === 'chromium') {
    const session = await page.context().newCDPSession(page)
    const tree = await session.send('Accessibility.getFullAXTree')
    expect(tree.nodes.filter(node => !node.ignored && node.role?.value === 'slider')).toHaveLength(0)
    await session.detach()
  }
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.navigator')).toHaveAttribute('data-angle', '0')
  const start = page.getByRole('button', { name: 'PRESS TO START' })
  await expect(start).toBeVisible()
  await expect(start).toBeFocused()
  await expect(lit).toHaveCount(4)
  await expect(page.locator('.race-light-column').nth(4)).toHaveAttribute('data-lit', 'false')
  const lamps = await page.locator('.race-lamp').evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  }))
  expect(lamps).toHaveLength(5)
  for (const [index, lamp] of lamps.entries()) {
    expect(Math.abs(lamp.width - lamp.height)).toBeLessThan(1)
    expect(Math.abs(lamp.width - lamps[0].width)).toBeLessThan(1)
    expect(Math.abs(lamp.y - lamps[0].y)).toBeLessThan(1)
    if (index > 1) expect(Math.abs((lamp.x - lamps[index - 1].x) - (lamps[1].x - lamps[0].x))).toBeLessThan(1)
  }
  await expect(page.locator('.race-light-assembly')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(start).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(start).toHaveCSS('border-top-width', '0px')
  await expect(start).toHaveCSS('box-shadow', 'none')
  const samples = await page.evaluate(() => (window as unknown as { raceLightSamples: Array<{ count: number; time: number }> }).raceLightSamples)
  expect(samples.map(sample => sample.count)).toEqual([1, 2, 3, 4])
  for (let i = 1; i < samples.length; i++) {
    expect(samples[i].time - samples[i - 1].time).toBeGreaterThan(850)
    expect(samples[i].time - samples[i - 1].time).toBeLessThan(1250)
  }
  await page.screenshot({ path: info.outputPath('race-start-ready.png') })
  const rect = (await start.boundingBox())!
  const before = await page.evaluate(() => Date.now())
  await page.mouse.dblclick(rect.x + rect.width / 2, rect.y + rect.height / 2)
  await expect(start).toBeDisabled()
  await expect(lit).toHaveCount(5)
  const expiresAt = await page.evaluate(() => Number(localStorage.getItem('gt3-race-start-expires-at')))
  expect(expiresAt).toBeGreaterThanOrEqual(before + 900000)
  expect(expiresAt).toBeLessThanOrEqual(await page.evaluate(() => Date.now() + 900000))
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.race-start-overlay .speed-streak')!).opacity) > 0.1)
  await expect(page.locator('.navigator')).toHaveAttribute('data-angle', '0')
  await page.screenshot({ path: info.outputPath('race-start-acceleration.png') })
  await expect(overlay).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'HOME', exact: true })).toBeFocused()
  await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '2')
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'navigation')
  await expect(page.locator('.confirmation-status')).toHaveText('Select a section, then confirm to enter.')
  const home = (await page.locator('.section-label--active').boundingBox())!
  const track = (await page.locator('.track-viewport').boundingBox())!
  expect(Math.abs(home.x + home.width / 2 - track.x - track.width / 2)).toBeLessThanOrEqual(1)
  await page.getByRole('slider').press('ArrowRight')
  await page.getByRole('slider').press('Enter')
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'section')
  await page.getByRole('button', { name: 'Open portfolio navigation' }).click()
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'navigation')
  await expect(page.locator('.navigator')).toHaveAttribute('data-angle', '18')
  await page.reload()
  await expect(overlay).toHaveCount(0)
  await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '2')
  expect(await page.evaluate(() => Number(localStorage.getItem('gt3-race-start-expires-at')))).toBe(expiresAt)
  expect([...assets].filter(url => /\.(png|webp|avif|svg|woff2?)(\?|$)/.test(url))).toHaveLength(1)
  expect([...assets].some(url => url.endsWith('.webp'))).toBe(true)
})

for (const key of ['Enter', 'Space']) {
  test(`native ${key} activation does not confirm HOME across handoff`, async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'PRESS TO START' })).toBeFocused()
    await page.keyboard.down(key)
    if (key === 'Space') {
      await expect(page.locator('.race-start-overlay')).toHaveAttribute('data-starting', 'false')
      await page.keyboard.up(key)
    }
    await expect(page.locator('.race-start-overlay')).toHaveCount(0)
    if (key === 'Enter') {
      await page.keyboard.down(key) // A repeated keydown after HOME receives focus.
      await page.keyboard.up(key)
    }
    await expect(page.getByRole('button', { name: 'HOME', exact: true })).toBeFocused()
    await expect(page.locator('.confirmation-status')).toHaveText('Select a section, then confirm to enter.')
  })
}

test('320px reduced-motion introduction works with unavailable storage', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 600 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage unavailable') }
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable') }
  })
  await page.goto('/')
  const start = page.getByRole('button', { name: 'PRESS TO START' })
  await expect(start).toBeVisible()
  await expect(start).toHaveCSS('animation-name', 'none')
  await expect(start).toHaveCSS('opacity', '1')
  const rect = (await start.boundingBox())!
  expect(rect.width).toBeGreaterThanOrEqual(44)
  expect(rect.height).toBeGreaterThanOrEqual(44)
  expect(rect.x).toBeGreaterThanOrEqual(0)
  expect(rect.x + rect.width).toBeLessThanOrEqual(320)
  const lamps = await page.locator('.race-lamp').evaluateAll(elements => elements.map(element => {
    const bounds = element.getBoundingClientRect()
    return { left: bounds.left, right: bounds.right, y: bounds.y }
  }))
  expect(lamps).toHaveLength(5)
  for (const lamp of lamps) {
    expect(lamp.left).toBeGreaterThanOrEqual(0)
    expect(lamp.right).toBeLessThanOrEqual(320)
    expect(Math.abs(lamp.y - lamps[0].y)).toBeLessThan(1)
  }
  await page.screenshot({ path: info.outputPath('race-start-mobile.png') })
  await start.press('Space')
  await expect(page.locator('.race-start-overlay')).toHaveCount(0)
  await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '2')
  await expect(page.locator('.confirmation-status')).not.toContainText('confirmed')
  await page.reload()
  await expect(page.locator('.race-start-overlay')).toBeVisible()
})

for (const value of ['valid', 'expired', 'malformed']) {
  test(`${value} expiration is checked at page load without refreshing it`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('gt3-race-start-expires-at', value === 'valid' ? String(Date.now() + 600000) : value === 'expired' ? String(Date.now() - 1) : 'invalid'), value)
    await page.goto('/')
    if (value === 'valid') {
      await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '2')
      await expect(page.locator('.race-start-overlay')).toHaveCount(0)
      const remaining = await page.evaluate(() => Number(localStorage.getItem('gt3-race-start-expires-at')) - Date.now())
      expect(remaining).toBeGreaterThan(590000)
      expect(remaining).toBeLessThanOrEqual(600000)
    } else {
      await expect(page.locator('.race-start-overlay')).toBeVisible()
      expect(await page.locator('.wheel-surface').evaluate(element => {
        element.focus()
        return document.activeElement !== element && Boolean(element.closest('[inert]'))
      })).toBe(true)
    }
  })
}

test('Chromium touch activates START and releases HOME', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'Protocol touch is Chromium-only; physical-device checks remain manual.')
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto('/')
    const start = page.getByRole('button', { name: 'PRESS TO START' })
    await expect(start).toBeVisible()
    await start.tap()
    await expect(page.locator('.race-start-overlay')).toHaveCount(0)
    await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '2')
    await expect(page.locator('.confirmation-status')).not.toContainText('confirmed')
    expect(errors).toEqual([])
  } finally { await context.close() }
})
