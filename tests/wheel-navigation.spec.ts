import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { SECTIONS } from '../src/features/wheel-navigation/sections'
import { WHEEL_PRESENTATION as presentation } from '../src/features/wheel-navigation/presentation'
import { WHEEL_OUTER_CONTOUR } from '../src/features/wheel-navigation/wheelContour'

let runtimeErrors: string[]
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gt3-race-start-expires-at', String(Date.now() + 900000)))
  runtimeErrors = []
  page.on('pageerror', error => runtimeErrors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '2')
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())))
})
test.afterEach(() => { expect(runtimeErrors).toEqual([]) })
test.beforeAll(async ({ browser }, info) => { console.log(`${info.project.name}: ${browser.version()}`) })

// Confirmation now enters a placeholder. Restore through the real UI before
// continuing assertions against the same mounted mechanical controller.
async function returnToNavigation(page: Page) {
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'section')
  await page.getByRole('button', { name: 'Open portfolio navigation' }).click()
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'navigation')
}

async function settled(page: Page, index: number) {
  await expect(page.locator('.navigator')).toHaveAttribute('data-phase', 'idle')
  await expect(page.locator('.navigator')).toHaveAttribute('data-angle', String(SECTIONS[index].angleDeg))
  await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', String(index))
}

// Construct browser coordinates from the source contour, independently of app hit testing.
async function bandPoint(page: Page, inset: number, segment = 270) {
  const rect = (await page.locator('.wheel-surface').boundingBox())!
  const angle = Number(await page.locator('.navigator').getAttribute('data-angle')) * Math.PI / 180
  const [ax, ay] = WHEEL_OUTER_CONTOUR[segment]
  const [bx, by] = WHEEL_OUTER_CONTOUR[(segment + 1) % WHEEL_OUTER_CONTOUR.length]
  const scale = rect.width * presentation.imageScale / presentation.sourceSizePx
  const length = Math.hypot(bx - ax, by - ay)
  const x = ((ax + bx) / 2 - presentation.hubX) * scale - (by - ay) / length * inset
  const y = ((ay + by) / 2 - presentation.hubY) * scale + (bx - ax) / length * inset
  const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2
  return { x: cx + x * Math.cos(angle) - y * Math.sin(angle), y: cy + x * Math.sin(angle) + y * Math.cos(angle), cx, cy }
}

async function beginDrag(page: Page) {
  const point = await bandPoint(page, 6)
  await page.getByRole('slider').evaluate(element => element.addEventListener('pointerdown', event => {
    element.setAttribute('data-test-pointer-id', String((event as PointerEvent).pointerId))
  }, { once: true }))
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await expect(page.locator('.navigator')).toHaveAttribute('data-phase', 'armed')
  return point
}

async function moveDrag(page: Page, point: Awaited<ReturnType<typeof bandPoint>>, degrees: number, extraRadius = 0) {
  const start = Math.atan2(point.y - point.cy, point.x - point.cx)
  const radius = Math.hypot(point.x - point.cx, point.y - point.cy) + extraRadius
  const steps = Math.max(1, Math.ceil(Math.abs(degrees) / 5))
  for (let i = 1; i <= steps; i++) {
    const angle = start + degrees * i / steps * Math.PI / 180
    await page.mouse.move(point.cx + radius * Math.cos(angle), point.cy + radius * Math.sin(angle))
  }
}

test('T7: keyboard Tab order, semantics, all sections and explicit confirmation', async ({ page }) => {
  const slider = page.getByRole('slider')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'HOME', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(slider).toBeFocused()
  await expect(page.locator('.wheel-stage')).toHaveCSS('touch-action', 'auto')
  await expect(slider).toHaveCSS('touch-action', 'none')
  await expect(page.getByRole('navigation', { name: 'Portfolio sections' })).toBeVisible()
  await expect(page.locator('#keyboard-help')).toContainText(`Drag ${presentation.dragBandMinInsetPx} to ${presentation.dragBandMaxInsetPx} pixels`)
  const badge = await page.locator('.wheel-stage').evaluate(element => getComputedStyle(element, '::after').content)
  expect(badge).toContain('ARROW KEYS')
  await slider.press('Home')
  for (let i = 0; i < SECTIONS.length; i++) {
    await settled(page, i)
    await expect(slider).toHaveAttribute('aria-valuetext', new RegExp(SECTIONS[i].label))
    if (i < SECTIONS.length - 1) await slider.press('ArrowRight')
  }
  await expect(page.getByRole('status')).toContainText('Select a section')
  const url = page.url()
  await slider.press('Enter')
  await expect(page.getByRole('status')).toHaveText('STACK confirmed · 1')
  expect(page.url()).toBe(url)
  await returnToNavigation(page)
  await slider.press('Tab')
  await expect(page.getByRole('button', { name: 'Confirm STACK', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(slider).toBeFocused()
})

test('T7: endpoint arrows retain focus, clamp native activation and reverse', async ({ page }) => {
  for (const [name, key, endpoint, reverse, next] of [
    ['Previous section', 'Home', 0, 'ArrowRight', 1],
    ['Next section', 'End', 4, 'ArrowLeft', 3],
  ] as const) {
    const button = page.getByRole('button', { name })
    await button.focus()
    await button.press(key)
    await settled(page, endpoint)
    await expect(button).toBeFocused()
    await expect(button).toHaveAttribute('aria-disabled', 'true')
    await button.press('Enter')
    await button.press('Space')
    await settled(page, endpoint)
    await button.press(reverse)
    await settled(page, next)
    await expect(button).toBeFocused()
  }
  await expect(page.getByRole('status')).toContainText('Select a section')
})

test('T7: reduced motion finishes immediately and 320px layout scrolls outside the wheel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 320, height: 600 })
  const slider = page.getByRole('slider')
  await slider.focus()
  await slider.press('ArrowRight')
  // Read immediately after the key event, without waiting for animation completion.
  expect(await page.locator('.navigator').getAttribute('data-phase')).toBe('idle')
  await settled(page, 3)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  for (const control of await page.locator('.navigator-controls button').all()) {
    const box = (await control.boundingBox())!
    // Firefox can report a 44px CSS target as 43.999996px after coordinate conversion.
    expect(box.width).toBeGreaterThanOrEqual(presentation.minimumTargetPx - 1e-4)
    expect(box.height).toBeGreaterThanOrEqual(presentation.minimumTargetPx - 1e-4)
  }
  await page.mouse.move(4, 220)
  await page.mouse.wheel(0, 200)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await settled(page, 3)
})

test('T7: auxiliary controls do not overlap the wheel interaction surface', async ({ page }) => {
  for (const width of [761, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    const wheel = (await page.locator('.wheel-surface').boundingBox())!
    const controls = (await page.locator('.navigator-controls').boundingBox())!
    expect(controls.y - wheel.y - wheel.height).toBeGreaterThanOrEqual(12)
  }
})

test('T8: five exact settled positions, centered track and stable screenshots', async ({ page }, info) => {
  const slider = page.getByRole('slider')
  await slider.focus()
  await slider.press('Home')
  for (let i = 0; i < SECTIONS.length; i++) {
    await settled(page, i)
    const label = (await page.locator('.section-label--active').boundingBox())!
    const track = (await page.locator('.track-viewport').boundingBox())!
    expect(Math.abs(label.x + label.width / 2 - track.x - track.width / 2)).toBeLessThanOrEqual(1)
    const first = await page.screenshot({ path: info.outputPath(`settled-${SECTIONS[i].id}.png`), fullPage: true, animations: 'disabled' })
    const second = await page.screenshot({ fullPage: true, animations: 'disabled' })
    expect(first.equals(second)).toBe(true)
    if (i < SECTIONS.length - 1) await slider.press('ArrowRight')
  }
  await expect(page.getByRole('status')).toContainText('Select a section')
})

test('T8: real mouse capture, direction, limits and release over hub never confirm', async ({ page }) => {
  let point = await beginDrag(page)
  await moveDrag(page, point, 20, 80)
  await page.mouse.move(point.cx, point.cy)
  await page.mouse.up()
  await settled(page, 3)
  await expect(page.getByRole('status')).toContainText('Select a section')
  await page.getByRole('slider').press('Home')
  await settled(page, 0)
  point = await beginDrag(page)
  await moveDrag(page, point, -30)
  await page.mouse.up()
  await settled(page, 0)
  point = await beginDrag(page)
  await moveDrag(page, point, 100)
  await page.mouse.up()
  await settled(page, 4)
  await expect(page.getByRole('status')).toContainText('Select a section')
  await page.getByRole('button', { name: 'Confirm STACK', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('STACK confirmed · 1')
})

test('T8: Escape and synthetic pointer cancellation restore committed selection', async ({ page }) => {
  for (const reason of ['escape', 'pointercancel']) {
    const point = await beginDrag(page)
    await moveDrag(page, point, -25)
    if (reason === 'escape') await page.keyboard.press('Escape')
    else await page.getByRole('slider').evaluate(element => {
      // Handler check only; not a claim of OS/device cancellation.
      element.dispatchEvent(new PointerEvent('pointercancel', { pointerId: Number(element.getAttribute('data-test-pointer-id')), bubbles: true }))
    })
    await page.mouse.up()
    await settled(page, 2)
  }
  await expect(page.getByRole('status')).toContainText('Select a section')
})

test('T8: inactive labels select; native buttons confirm once; active gestures reject Enter', async ({ page }) => {
  const projects = page.getByRole('button', { name: 'PROJECTS', exact: true })
  await projects.click()
  await settled(page, 3)
  await expect(page.getByRole('status')).toContainText('Select a section')
  await projects.click()
  await expect(page.getByRole('status')).toHaveText('PROJECTS confirmed · 1')
  await returnToNavigation(page)
  const enter = page.getByRole('button', { name: 'ENTER PROJECTS', exact: true })
  await enter.focus()
  await enter.press('Enter')
  await expect(page.getByRole('status')).toHaveText('PROJECTS confirmed · 2')
  await returnToNavigation(page)
  await beginDrag(page)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toHaveText('PROJECTS confirmed · 2')
  await page.mouse.up()
  await settled(page, 3)
})

test('T8: rapid selections and confirmation during snap use the latest committed section once', async ({ page }) => {
  const slider = page.getByRole('slider')
  const url = page.url()
  await slider.focus()
  await slider.press('End')
  await slider.press('Home')
  await slider.press('ArrowRight')
  await slider.press('Enter')
  await expect(page.getByRole('status')).toHaveText('CONTACT confirmed · 1')
  await returnToNavigation(page)
  await settled(page, 1)
  await page.keyboard.down('Enter')
  await page.keyboard.down('Enter')
  await page.keyboard.up('Enter')
  await expect(page.getByRole('status')).toHaveText('CONTACT confirmed · 2')
  expect(page.url()).toBe(url)
})

test('T8: resizing during a captured gesture cancels without confirming', async ({ page }) => {
  const point = await beginDrag(page)
  await moveDrag(page, point, 20)
  await page.setViewportSize({ width: 320, height: 600 })
  await page.mouse.up()
  await settled(page, 2)
  await expect(page.getByRole('status')).toContainText('Select a section')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

for (const width of [320, 1440]) for (const dpr of [1, 2]) {
  test(`T8: band boundaries at ${width}px / DPR ${dpr}`, async ({ browser }) => {
    test.setTimeout(90_000)
    const context = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: dpr, reducedMotion: 'reduce' })
    await context.addInitScript(() => localStorage.setItem('gt3-race-start-expires-at', String(Date.now() + 900000)))
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto('/')
      const slider = page.getByRole('slider')
      await slider.focus()
      await slider.press('Home')
      const min = presentation.dragBandMinInsetPx, max = presentation.dragBandMaxInsetPx
      for (let index = 0; index < SECTIONS.length; index++) {
        await settled(page, index)
        // Firefox/WebKit truncate native mouse coordinates to whole CSS pixels.
        // Keep a 2px margin here; unit tests verify exact inclusive boundaries.
        for (const segment of [0, 90, 180, 270]) for (const inset of [min - 2, min + 2, 20, max - 2, max + 2]) {
          const point = await bandPoint(page, inset, segment)
          const accepted = inset >= min && inset <= max
          await page.mouse.move(point.x, point.y)
          await expect(slider).toHaveCSS('cursor', accepted ? 'grab' : 'auto')
          await page.mouse.down()
          await expect(page.locator('.navigator')).toHaveAttribute('data-phase', accepted ? 'armed' : 'idle')
          await page.mouse.up()
          await settled(page, index)
          await expect(page.getByRole('status')).toContainText('Select a section')
        }
        if (index < SECTIONS.length - 1) await slider.press('ArrowRight')
      }
      expect(errors).toEqual([])
    } finally { await context.close() }
  })
}

test('T8: Chromium protocol touch drag, cancellation and outside-wheel scrolling', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'DevTools touch input is Chromium-only; physical Android/iOS testing remains manual.')
  await page.setViewportSize({ width: 390, height: 600 })
  const session = await context.newCDPSession(page)
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  const start = await bandPoint(page, 6)
  const angle = Math.atan2(start.y - start.cy, start.x - start.cx) + 20 * Math.PI / 180
  const radius = Math.hypot(start.x - start.cx, start.y - start.cy)
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start.x, y: start.y, id: 7 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.cx + radius * Math.cos(angle), y: start.cy + radius * Math.sin(angle), id: 7 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await settled(page, 3)
  const next = await bandPoint(page, 6)
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: next.x, y: next.y, id: 7 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  await settled(page, 3)
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 4, y: 450, id: 8 }] })
  for (const y of [420, 370, 300, 220]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 4, y, id: 8 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await expect(page.getByRole('status')).toContainText('Select a section')
})
