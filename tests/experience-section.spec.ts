import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gt3-race-start-expires-at', String(Date.now() + 900000)))
})

async function selectExperience(page: Page) {
  const slider = page.getByRole('slider')
  await slider.press('ArrowLeft')
  await expect(page.locator('.navigator')).toHaveAttribute('data-phase', 'idle')
  await expect(page.locator('.navigator')).toHaveAttribute('data-angle', '-18')
  await expect(page.locator('.section-counter')).toHaveText('02 / 05')
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'navigation')
  return slider
}

for (const width of [320, 390, 760, 761, 820, 1024, 1440]) {
  test(`EXPERIENCE layout and reading order at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 800 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const slider = await selectExperience(page)
    await slider.press('Enter')
    await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'section')
    await expect(page.getByRole('heading', { name: 'Built for the real world.', exact: true })).toBeFocused()
    await expect(page.getByRole('main')).toHaveCount(1)
    await expect(page.getByRole('heading', { name: 'VEISS', exact: true })).toBeVisible()
    await expect(page.getByText('Full Stack Developer', { exact: true })).toBeVisible()
    await expect(page.locator('.experience-period')).toHaveText('OCT 2025 — MAY 2026')
    await expect(page.locator('.experience-metric-value')).toHaveText(['2–3', '6–10', '01'])
    await expect(page.locator('.experience-metric-label')).toHaveText(['APPLICATIONS', 'FEATURES', 'API INTEGRATION'])
    await expect(page.locator('.experience-metric-description')).toHaveText(['Maintained in production', 'Developed or implemented', 'Mailrelay'])
    await expect(page.getByText('Application and feature counts are approximate.', { exact: true })).toBeVisible()
    await expect(page.locator('.experience-responsibility')).toHaveCount(3)
    await expect(page.locator('.experience-responsibility').nth(1)).toContainText('Used Node.js as the runtime for development tooling.')
    await expect(page.locator('.experience-section img, .experience-section button, .experience-section [tabindex="0"]')).toHaveCount(0)
    await expect(page.locator('#destination-heading')).toHaveCount(1)

    const metrics = await page.locator('.experience-metric').evaluateAll(elements => elements.map(element => {
      const { top, right } = element.getBoundingClientRect()
      return { top, right }
    }))
    if (width <= 760) {
      expect(metrics[1].top).toBeGreaterThan(metrics[0].top)
      expect(metrics[2].top).toBeGreaterThan(metrics[1].top)
    } else {
      expect(metrics.every(metric => Math.abs(metric.top - metrics[0].top) < 1)).toBe(true)
    }
    const dock = (await page.locator('.floating-wheel-control').boundingBox())!
    const bounds = await page.locator('.experience-section').boundingBox()
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(dock.x)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    // Check actual text bounds too: portfolio-shell clips overflow at the page edge.
    const overflowingText = await page.locator('.experience-section').evaluate(section => {
      const right = section.getBoundingClientRect().right
      return [...section.querySelectorAll('h2, h3, p, dt, dd')].filter(element => {
        const range = document.createRange()
        range.selectNodeContents(element)
        return [...range.getClientRects()].some(rect => rect.right > right + 1)
      }).map(element => element.textContent)
    })
    expect(overflowingText).toEqual([])
    await page.screenshot({ path: info.outputPath(`experience-${width}.png`), fullPage: true })
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Open portfolio navigation' })).toBeFocused()
  })
}

for (const width of [390, 1440]) {
  for (const reducedMotion of [false, true]) {
    test(`EXPERIENCE stationary restoration at ${width}px, reduced motion ${reducedMotion}`, async ({ page }) => {
      test.setTimeout(90_000)
      await page.setViewportSize({ width, height: 600 })
      await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' })
      await page.goto('/')
      const slider = await selectExperience(page)

      for (const navigationTop of [0, 200]) {
        for (const position of ['top', 'middle', 'bottom'] as const) {
          await slider.focus()
          await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), navigationTop)
          const savedScroll = await page.evaluate(() => scrollY)
          if (navigationTop > 0) expect(savedScroll).toBeGreaterThan(0)
          const source = await page.locator('.wheel-stage').boundingBox()
          await slider.press('Enter')
          await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'section')
          await expect(page.getByRole('heading', { name: 'Built for the real world.', exact: true })).toBeFocused()
          expect(await page.evaluate(() => scrollY)).toBe(0)

          const selector = position === 'top' ? '.experience-hero h2'
            : position === 'middle' ? '.experience-record-heading' : '.experience-responsibility:last-child h3'
          await page.evaluate(({ selector, position }) => {
            const point = document.querySelector(selector)!
            const top = position === 'top' ? 0 : position === 'bottom' ? document.documentElement.scrollHeight
              : point.getBoundingClientRect().top + scrollY - 60
            window.scrollTo({ top, behavior: 'instant' })
          }, { selector, position })
          if (position !== 'top') expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0)

          // Observe the real click and every painted frame, including phase handoff.
          const recording = await page.evaluateHandle(selector => {
            const content = document.querySelector<HTMLElement>('.section-scene')!
            const point = document.querySelector(selector)!
            const scenes = document.querySelector('.cinematic-scenes')!
            const button = document.querySelector<HTMLButtonElement>('.floating-wheel-control')!
            const wheel = document.querySelector('.cinematic-wheel')!
            const rotor = wheel.querySelector('.wheel-rotor')!
            const samples: { x: number; y: number; visible: boolean; phase: string | null; rotation: string }[] = []
            return { finished: new Promise<{
              samples: typeof samples; dock: { x: number; y: number; width: number };
              handoff: { x: number; y: number; width: number } | null
            }>(resolve => {
              let handoff: { x: number; y: number; width: number } | null = null
              let navigationFrames = 0
              const box = (element: Element) => {
                const { x, y, width } = element.getBoundingClientRect()
                return { x, y, width }
              }
              const dock = box(button)
              const sample = () => {
                const { x, y } = point.getBoundingClientRect()
                const style = getComputedStyle(content)
                samples.push({ x, y, visible: point.isConnected && style.visibility === 'visible' && Number(style.opacity) > 0,
                  phase: scenes.getAttribute('data-phase'), rotation: getComputedStyle(rotor).transform })
              }
              const observer = new MutationObserver(() => {
                if (scenes.getAttribute('data-phase') === 'restoring') handoff ??= box(wheel)
                sample()
              })
              button.addEventListener('click', () => {
                sample()
                observer.observe(scenes, { attributes: true, attributeFilter: ['data-phase'] })
                const frame = () => {
                  sample()
                  if (scenes.getAttribute('data-phase') === 'navigation' && ++navigationFrames === 2) {
                    observer.disconnect()
                    resolve({ samples, dock, handoff })
                  } else requestAnimationFrame(frame)
                }
                requestAnimationFrame(frame)
              }, { once: true, capture: true })
            }) }
          }, selector)
          await page.getByRole('button', { name: 'Open portfolio navigation' }).click()
          const { samples, dock, handoff } = await recording.evaluate(async recording => recording.finished)
          await recording.dispose()
          const visible = samples.filter(sample => sample.visible)
          expect(visible.length).toBeGreaterThan(2)
          expect(visible.some(sample => sample.phase === 'restoring')).toBe(true)
          for (const sample of visible) {
            expect(Math.abs(sample.x - samples[0].x)).toBeLessThan(0.25)
            expect(Math.abs(sample.y - samples[0].y)).toBeLessThan(0.25)
          }
          expect(samples.filter(sample => sample.phase !== 'navigation').every(sample => sample.rotation === samples[0].rotation)).toBe(true)
          expect(samples.filter(sample => sample.phase === 'navigation').every(sample => !sample.visible)).toBe(true)
          expect(handoff).not.toBeNull()
          for (const key of ['x', 'y', 'width'] as const) expect(Math.abs(handoff![key] - dock[key])).toBeLessThan(0.25)
          await expect(slider).toBeFocused()
          expect(await page.evaluate(() => scrollY)).toBeCloseTo(savedScroll, 0)
          expect(await page.locator('.wheel-stage').boundingBox()).toEqual(source)
          await expect(page.locator('.navigator')).toHaveAttribute('data-angle', '-18')
          await expect(page.locator('.section-scene')).toHaveCSS('transform', 'none')
          await expect(page.locator('.section-scene')).toHaveCSS('visibility', 'hidden')
        }
      }
    })
  }
}

test('EXPERIENCE: Escape, duplicate activation, resize and settled keyboard return follow ABOUT', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 })
  await page.goto('/')
  const slider = await selectExperience(page)
  await slider.press('Enter')
  await page.waitForFunction(() => document.querySelector('.cinematic-wheel')!.getBoundingClientRect().width < 450)
  await page.keyboard.press('Escape')
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'navigation')
  await expect(slider).toBeFocused()
  await expect(page.locator('.navigator')).toHaveAttribute('data-angle', '-18')
  const invoker = page.getByRole('button', { name: 'EXPERIENCE', exact: true })
  await invoker.evaluate(element => {
    for (let index = 0; index < 2; index++) (element as HTMLButtonElement).click()
  })
  await page.waitForFunction(() => document.querySelector('.cinematic-wheel')!.getBoundingClientRect().width < 450)
  await page.setViewportSize({ width: 390, height: 600 })
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'section')
  await expect(page.getByRole('heading', { name: 'Built for the real world.', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'section')
  const dock = (await page.locator('.floating-wheel-control').boundingBox())!
  const artwork = (await page.locator('.cinematic-wheel').boundingBox())!
  for (const key of ['x', 'y', 'width'] as const) expect(Math.abs(artwork[key] - dock[key])).toBeLessThan(0.25)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Open portfolio navigation' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'navigation')
  await expect(invoker).toBeFocused()
  await expect(page.locator('.navigator')).toHaveAttribute('data-angle', '-18')
})
