import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gt3-race-start-expires-at', String(Date.now() + 900000)))
})

test('C6 performance: collect frame timing during real GSAP entry', async ({ page }, info) => {
  await page.goto('/')
  await page.getByRole('slider').press('ArrowRight')
  await expect(page.locator('.navigator')).toHaveAttribute('data-phase', 'idle')
  const timing = await page.evaluate(() => new Promise<{ frames: number; p95ms: number; maximumMs: number }>(resolve => {
    const deltas: number[] = []
    let previous = performance.now()
    const sample = (time: number) => {
      deltas.push(time - previous); previous = time
      if (document.querySelector('.cinematic-scenes')!.getAttribute('data-phase') === 'section') {
        const sorted = deltas.slice(2).sort((a, b) => a - b)
        resolve({ frames: deltas.length, p95ms: sorted[Math.floor(sorted.length * 0.95)], maximumMs: Math.max(...sorted) })
      } else requestAnimationFrame(sample)
    }
    document.querySelector<HTMLButtonElement>('.wheel-center')!.click()
    requestAnimationFrame(sample)
  }))
  await info.attach('entry-frame-timing', { body: JSON.stringify(timing), contentType: 'application/json' })
  expect(timing.frames).toBeGreaterThan(30)
  expect(timing.p95ms).toBeLessThan(50)
})

test('C5 reduced motion: HOME, duplicate guards, keyboard focus and scroll restoration', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 320, height: 600 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Confirm HOME', exact: true }).click()
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'navigation')
  const slider = page.getByRole('slider')
  await slider.focus()
  await slider.press('ArrowRight')
  const savedScroll = await page.evaluate(() => scrollY)
  await slider.evaluate(element => {
    for (let i = 0; i < 2; i++) element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })
  await expect(page.getByRole('status')).toHaveText('PROJECTS confirmed · 2')
  await expect(page.locator('.speed-streaks')).toHaveCSS('display', 'none')
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'section')
  await expect(page.getByRole('heading', { name: 'PROJECTS', exact: true })).toBeFocused()
  const proxy = (await page.locator('.cinematic-wheel').boundingBox())!
  expect(proxy.width).toBeCloseTo(56, 1)
  await expect(page.getByRole('slider')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.getByRole('button', { name: 'Open portfolio navigation' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'navigation')
  await expect(slider).toBeFocused()
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(savedScroll, 0)
  await expect(page.locator('.navigator')).toHaveAttribute('data-angle', '18')
})

test('C5 Escape: reverse entry without jumping or accepting another confirmation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('slider').press('End')
  await expect(page.locator('.navigator')).toHaveAttribute('data-phase', 'idle')
  await page.getByRole('button', { name: 'Confirm STACK', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.cinematic-wheel')!.getBoundingClientRect().width < 450)
  await page.keyboard.press('Escape')
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'restoring')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Enter')
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'navigation')
  await expect(page.locator('.navigator')).toHaveAttribute('data-angle', '36')
  await expect(page.getByRole('status')).toHaveText('STACK confirmed · 1')
  await expect(page.getByRole('button', { name: 'Confirm STACK', exact: true })).toBeFocused()
})

for (const reason of ['resize', 'reduced-motion', 'hiding']) {
  test(`C5 lifecycle: ${reason} settles the requested endpoint`, async ({ page }) => {
    await page.goto('/')
    await page.getByRole('slider').press('Home')
    await expect(page.locator('.navigator')).toHaveAttribute('data-phase', 'idle')
    await page.getByRole('button', { name: 'Confirm ABOUT', exact: true }).click()
    await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'entering')
    if (reason === 'resize') await page.setViewportSize({ width: 320, height: 600 })
    if (reason === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'reduce' })
    if (reason === 'hiding') await page.evaluate(() => {
      // Synthetic lifecycle-handler coverage; physical app switching stays manual.
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'section')
    if (reason === 'hiding') await page.evaluate(() => {
      delete (document as unknown as { hidden?: boolean }).hidden
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(page.getByRole('heading', { name: 'More than code.', exact: true })).toBeFocused()
    const a = (await page.locator('.cinematic-wheel').boundingBox())!, b = (await page.locator('.floating-wheel-control').boundingBox())!
    expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.width - b.width)).toBeLessThan(0.25)
    // Exercise interruption in the opposite direction as well.
    if (reason === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.getByRole('button', { name: 'Open portfolio navigation' }).click()
    await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'restoring')
    if (reason === 'resize') await page.setViewportSize({ width: 390, height: 700 })
    if (reason === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'reduce' })
    if (reason === 'hiding') await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'navigation')
    if (reason === 'hiding') await page.evaluate(() => {
      delete (document as unknown as { hidden?: boolean }).hidden
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(page.locator('.navigator')).toHaveAttribute('data-angle', '-36')
    await expect(page.locator('.cinematic-wheel')).toHaveCSS('visibility', 'hidden')
  })
}

for (const [width, columns] of [[320, 1], [390, 1], [820, 2], [1024, 4], [1440, 4]] as const) {
  test(`ABOUT layout: ${columns} columns and wheel clearance at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 800 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.locator('.internal-section-layout')).toHaveCount(0)
    await page.getByRole('slider').press('Home')
    await page.getByRole('slider').press('Enter')
    await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'section')
    await expect(page.getByRole('heading', { name: 'More than code.', exact: true })).toBeFocused()
    await expect(page.getByRole('main')).toHaveCount(1)
    await expect(page.locator('.section-background')).toHaveAttribute('aria-hidden', 'true')
    await expect(page.getByRole('heading', { name: 'My Story', exact: true })).toBeVisible()
    await expect(page.getByText('A journey of growth and discovery.', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Experience', exact: true })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Education', exact: true })).toHaveCount(0)
    await expect(page.getByText('Then came one of the most important opportunities of my life: moving to Europe.', { exact: true })).toHaveCount(1)

    const interests = page.locator('.about-interest')
    await expect(interests).toHaveCount(4)
    for (const title of ['Cats', 'Sports & Motorsport', 'Music', 'Travel']) {
      await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(1)
    }
    const boxes = await interests.evaluateAll(elements => elements.map(element => {
      const { left, top, right } = element.getBoundingClientRect()
      return { left, top, right }
    }))
    expect(boxes.slice(0, columns).every(box => Math.abs(box.top - boxes[0].top) < 1)).toBe(true)
    if (columns < 4) expect(boxes[columns].top).toBeGreaterThan(boxes[0].top)
    const dock = (await page.locator('.floating-wheel-control').boundingBox())!
    expect(boxes.every(box => box.right <= dock.x - 8)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await interests.last().scrollIntoViewIfNeeded()
    await page.screenshot({ path: info.outputPath(`about-interests-${width}.png`) })
    await page.getByRole('heading', { name: 'More than code.', exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: info.outputPath(`about-hero-${width}.png`) })
  })
}

for (const reducedMotion of [false, true]) {
  test(`ABOUT keyboard: scroll restoration and lighting with reduced motion ${reducedMotion}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 600 })
    await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' })
    await page.goto('/')
    const slider = page.getByRole('slider')
    await slider.press('Home')
    await expect(page.locator('.navigator')).toHaveAttribute('data-phase', 'idle')
    await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'instant' }))
    const savedScroll = await page.evaluate(() => scrollY)
    expect(savedScroll).toBeGreaterThan(0)
    await page.keyboard.press('Enter')
    await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'section')
    await expect(page.getByRole('heading', { name: 'More than code.', exact: true })).toBeFocused()
    expect(await page.evaluate(() => scrollY)).toBe(0)

    const interests = page.locator('.about-interest')
    for (let index = 0; index < 4; index++) {
      await page.keyboard.press('Tab')
      await expect(interests.nth(index)).toBeFocused()
      await expect(interests.nth(index)).toHaveCSS('outline-style', 'solid')
      await expect.poll(() => interests.nth(index).evaluate(element => getComputedStyle(element, '::before').opacity)).toBe('1')
      expect(await interests.nth(index).evaluate(element => getComputedStyle(element, '::before').transitionDuration)).toBe(reducedMotion ? '0s' : '0.3s')
    }
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Open portfolio navigation' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'navigation')
    await expect(slider).toBeFocused()
    await expect(page.locator('.navigator')).toHaveAttribute('data-angle', '-36')
    expect(await page.evaluate(() => scrollY)).toBeCloseTo(savedScroll, 0)
    await expect(page.locator('.internal-section-layout')).toHaveCount(0)
  })
}

test('ABOUT lighting: hover fades out and resizing preserves the floating wheel alignment', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('slider').press('Home')
  await expect(page.locator('.navigator')).toHaveAttribute('data-phase', 'idle')
  await page.getByRole('slider').press('Enter')
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'section')
  const interest = page.locator('.about-interest').first()
  await interest.hover()
  await expect.poll(() => interest.evaluate(element => getComputedStyle(element, '::before').opacity)).toBe('1')
  await page.mouse.move(0, 0)
  await expect.poll(() => interest.evaluate(element => getComputedStyle(element, '::before').opacity)).toBe('0')
  await page.setViewportSize({ width: 390, height: 700 })
  const artwork = (await page.locator('.cinematic-wheel').boundingBox())!
  const dock = (await page.locator('.floating-wheel-control').boundingBox())!
  expect(Math.abs(artwork.x - dock.x) + Math.abs(artwork.y - dock.y) + Math.abs(artwork.width - dock.width)).toBeLessThan(0.25)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('C4 choreography: restrained effects, fixed rotation and timed restoration', async ({ page }, info) => {
  await page.goto('/')
  const slider = page.getByRole('slider')
  await slider.press('ArrowRight')
  await expect(page.locator('.navigator')).toHaveAttribute('data-phase', 'idle')
  const source = (await page.locator('.wheel-stage').boundingBox())!
  const started = Date.now()
  await page.getByRole('button', { name: 'Confirm PROJECTS', exact: true }).click()
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.speed-streak')!).opacity) > 0.1)
  await expect(page.locator('.navigator')).toHaveAttribute('data-angle', '18')
  await expect(page.locator('.floating-wheel-control')).toBeDisabled()
  await page.waitForFunction(width => document.querySelector('.cinematic-wheel')!.getBoundingClientRect().width < width * 0.8, source.width)
  await page.screenshot({ path: info.outputPath('acceleration.png') })
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'section')
  expect(Date.now() - started).toBeGreaterThan(1600)
  expect(Date.now() - started).toBeLessThan(3000)
  await expect(page.getByRole('heading', { name: 'PROJECTS', exact: true })).toBeFocused()
  for (const streak of await page.locator('.speed-streak').all()) await expect(streak).toHaveCSS('visibility', 'hidden')
  const returning = Date.now()
  await page.getByRole('button', { name: 'Open portfolio navigation' }).click()
  await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'navigation')
  expect(Date.now() - returning).toBeGreaterThan(1000)
  expect(Date.now() - returning).toBeLessThan(2200)
  await expect(page.locator('.navigator')).toHaveAttribute('data-angle', '18')
})

for (const width of [1440, 390]) {
  test(`C3 continuity: aligned handoff and identical return at ${width}px`, async ({ page }, info) => {
    test.setTimeout(60_000)
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())))
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    for (const [section, angle] of [['ABOUT', -36], ['CONTACT', -18], ['PROJECTS', 18], ['STACK', 36]] as const) {
      const slider = page.getByRole('slider')
      await slider.press('Home')
      const index = ['ABOUT', 'CONTACT', 'HOME', 'PROJECTS', 'STACK'].indexOf(section)
      for (let step = 0; step < index; step++) await slider.press('ArrowRight')
      await expect(page.locator('.navigator')).toHaveAttribute('data-angle', String(angle))
      await expect(page.locator('.navigator')).toHaveAttribute('data-phase', 'idle')
      // Keep the same input/focus presentation on both sides of the comparison.
      await page.getByRole('button', { name: section, exact: true }).focus()
      const beforeBox = await page.locator('.wheel-stage').boundingBox()
      const before = await page.locator('.wheel-stage').screenshot({ path: info.outputPath(`before-${section}.png`) })
      const alignment = await page.evaluate(() => new Promise<{ image: number; shadow: number; visible: number }>(resolve => {
        const scenes = document.querySelector('.cinematic-scenes')!
        const observer = new MutationObserver(() => {
          if (scenes.getAttribute('data-phase') !== 'entering') return
          observer.disconnect()
          const delta = (selector: string) => {
            const a = document.querySelector(`.wheel-stage ${selector}`)!.getBoundingClientRect()
            const b = document.querySelector(`.cinematic-wheel ${selector}`)!.getBoundingClientRect()
            return Math.max(...(['left', 'top', 'width', 'height'] as const).map(key => Math.abs(a[key] - b[key])))
          }
          const visible = ['.wheel-stage', '.cinematic-wheel'].filter(selector => getComputedStyle(document.querySelector(selector)!).visibility === 'visible').length
          resolve({ image: delta('.wheel-artwork'), shadow: delta('.wheel-shadow img'), visible })
        })
        observer.observe(scenes, { attributes: true, attributeFilter: ['data-phase'] })
        document.querySelector<HTMLButtonElement>('.section-label--active')!.click()
      }))
      expect(alignment.image).toBeLessThan(0.25)
      expect(alignment.shadow).toBeLessThan(0.25)
      expect(alignment.visible).toBe(1)
      const sampleVisibleWheels = () => page.evaluate(() => new Promise<number[]>(resolve => {
        const counts: number[] = []
        const sample = () => {
          counts.push(['.wheel-stage', '.cinematic-wheel'].filter(selector => getComputedStyle(document.querySelector(selector)!).visibility === 'visible').length)
          const phase = document.querySelector('.cinematic-scenes')!.getAttribute('data-phase')
          if (phase === 'section' || phase === 'navigation') resolve(counts)
          else requestAnimationFrame(sample)
        }
        sample()
      }))
      expect((await sampleVisibleWheels()).every(count => count === 1)).toBe(true)
      await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'section')
      await expect(page.getByRole('slider')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Open portfolio navigation' })).toHaveCount(1)
      if (section === 'PROJECTS') await page.screenshot({ path: info.outputPath(`section-${width}.png`), fullPage: true })
      await page.getByRole('button', { name: 'Open portfolio navigation' }).click()
      expect((await sampleVisibleWheels()).every(count => count === 1)).toBe(true)
      await expect(page.locator('.cinematic-scenes')).toHaveAttribute('data-phase', 'navigation')
      await expect(page.locator('.navigator')).toHaveAttribute('data-angle', String(angle))
      expect(await page.locator('.wheel-stage').boundingBox()).toEqual(beforeBox)
      const after = await page.locator('.wheel-stage').screenshot({ path: info.outputPath(`after-${section}.png`) })
      // A compositing-layer round trip can change a channel by 1/255. Decode
      // with browser canvas, without adding a screenshot-comparison dependency.
      const maxDifference = await page.evaluate(async ([first, second]) => {
        const decode = async (png: string) => {
          const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob())
          const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
          const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0)
          return ctx.getImageData(0, 0, image.width, image.height).data
        }
        const a = await decode(first), b = await decode(second)
        let maximum = 0
        for (let i = 0; i < a.length; i++) maximum = Math.max(maximum, Math.abs(a[i] - b[i]))
        return maximum
      }, [before.toString('base64'), after.toString('base64')])
      expect(maxDifference, `${section} source artwork must return visually unchanged`).toBeLessThanOrEqual(1)
      await expect(page.locator('.cinematic-wheel')).toHaveCSS('visibility', 'hidden')
    }
    expect(errors).toEqual([])
  })
}
