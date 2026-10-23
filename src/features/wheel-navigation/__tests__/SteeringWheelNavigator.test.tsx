// @vitest-environment jsdom
import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SteeringWheelNavigator } from '../SteeringWheelNavigator'
import { WHEEL_OUTER_CONTOUR } from '../wheelContour'
import { WHEEL_PRESENTATION } from '../presentation'

let rect: DOMRect
let captures: WeakMap<Element, Set<number>>
let motion: EventTarget & { matches: boolean }
const animations = vi.hoisted(() => ({ calls: [] as Array<{ value: { angleDeg: number }; vars: { angleDeg: number; duration: number; ease: string; onUpdate: () => void; onComplete: () => void }; kill: () => void }> }))
vi.mock('gsap', () => ({ gsap: { to: (value: { angleDeg: number }, vars: { angleDeg: number; duration: number; ease: string; onUpdate: () => void; onComplete: () => void }) => {
  const from = value.angleDeg
  const mid = setTimeout(() => { value.angleDeg = (from + vars.angleDeg)/2; vars.onUpdate() }, 120)
  const end = setTimeout(() => { value.angleDeg = vars.angleDeg; vars.onUpdate(); vars.onComplete() }, 240)
  const tween = { value, vars, kill: vi.fn(() => { clearTimeout(mid); clearTimeout(end) }) }
  animations.calls.push(tween)
  return tween
} } }))
class TestPointerEvent extends MouseEvent {
  pointerId: number
  pointerType: string
  isPrimary: boolean
  constructor(type: string, options: PointerEventInit = {}) {
    super(type, options)
    this.pointerId = options.pointerId ?? 1
    this.pointerType = options.pointerType ?? 'mouse'
    this.isPrimary = options.isPrimary ?? true
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  rect = { left: 100, top: 100, x: 100, y: 100, width: 526, height: 526, right: 626, bottom: 626, toJSON() {} }
  captures = new WeakMap()
  animations.calls.length = 0
  motion = Object.assign(new EventTarget(), { matches: false })
  vi.stubGlobal('matchMedia', () => motion)
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  vi.stubGlobal('PointerEvent', TestPointerEvent)
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} })
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id))
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect)
  HTMLElement.prototype.setPointerCapture = function(id) { captures.set(this, new Set([id])) }
  HTMLElement.prototype.hasPointerCapture = function(id) { return captures.get(this)?.has(id) ?? false }
  HTMLElement.prototype.releasePointerCapture = function(id) { captures.get(this)?.delete(id) }
})

describe('snap ownership and synchronization', () => {
  it('commits before a 240ms power2.out snap and finishes at the exact angle', () => {
    const { surface, navigator } = setup()
    pointer(surface, 'down', -90)
    pointer(surface, 'up', -70)
    expect(navigator.getAttribute('data-selected-index')).toBe('3')
    expect(navigator.getAttribute('data-phase')).toBe('settling')
    expect(animations.calls.at(-1)?.vars.duration).toBe(0.24)
    expect(animations.calls.at(-1)?.vars.ease).toBe('power2.out')
    expect(screen.getByText('04 / 05')).toBeTruthy()
    flush(136)
    expect(Number(navigator.getAttribute('data-angle'))).toBeGreaterThanOrEqual(18)
    expect(Number(navigator.getAttribute('data-angle'))).toBeLessThanOrEqual(20)
    flush()
    expect(navigator.getAttribute('data-angle')).toBe('18')
    expect(navigator.getAttribute('data-phase')).toBe('idle')
  })

  it('interrupts at the displayed angle and rejects obsolete tween callbacks', () => {
    const { surface, navigator } = setup()
    pointer(surface, 'down', -90); pointer(surface, 'up', -70)
    const obsolete = animations.calls.at(-1)!
    flush(136)
    const displayed = navigator.getAttribute('data-angle')
    pointer(surface, 'down', 20)
    expect(obsolete.kill).toHaveBeenCalled()
    expect(navigator.getAttribute('data-angle')).toBe(displayed)
    act(() => { obsolete.value.angleDeg = 36; obsolete.vars.onUpdate(); obsolete.vars.onComplete() })
    flush(16)
    expect(navigator.getAttribute('data-angle')).toBe(displayed)
    expect(navigator.getAttribute('data-phase')).toBe('armed')
  })

  it('uses immediate targets under reduced motion', () => {
    motion.matches = true
    const { surface, navigator } = setup()
    pointer(surface, 'down', -90); pointer(surface, 'up', -110)
    expect(navigator.getAttribute('data-angle')).toBe('-18')
    expect(navigator.getAttribute('data-phase')).toBe('idle')
    expect(animations.calls).toHaveLength(0)
  })

  it.each(['motion', 'hidden'])('finishes an existing snap when %s changes', reason => {
    const { surface, navigator } = setup()
    pointer(surface, 'down', -90); pointer(surface, 'up', -70)
    if (reason === 'motion') act(() => { motion.matches = true; motion.dispatchEvent(new Event('change')) })
    if (reason === 'hidden') { vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); fireEvent(document, new Event('visibilitychange')) }
    expect(navigator.getAttribute('data-angle')).toBe('18')
    expect(navigator.getAttribute('data-phase')).toBe('idle')
  })
})

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

function setup() {
  const onConfirm = vi.fn()
  const rendered = render(<StrictMode><SteeringWheelNavigator onConfirm={onConfirm} /></StrictMode>)
  const surface = screen.getByRole('slider')
  const navigator = rendered.container.querySelector('.navigator')!
  return { ...rendered, surface, navigator, onConfirm }
}
function point(polar: number, radius = 216.5) {
  return { clientX: 363 + radius * Math.cos(polar * Math.PI / 180), clientY: 363 + radius * Math.sin(polar * Math.PI / 180) }
}
function pointer(surface: Element, type: 'down' | 'move' | 'up' | 'cancel', polar: number, extras: PointerEventInit = {}) {
  const wheelAngle = Number(surface.closest('.navigator')?.getAttribute('data-angle') ?? 0)
  const sourceAngle = ((polar - wheelAngle) % 360 + 360) % 360
  const [x, y] = WHEEL_OUTER_CONTOUR[Math.round(sourceAngle) % 360]
  const radius = Math.hypot(x - WHEEL_PRESENTATION.hubX, y - WHEEL_PRESENTATION.hubY) * 526 * 0.87 / 1254 - 6
  const event = { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, ...point(polar, type === 'down' ? radius : undefined), ...extras }
  if (type === 'down') fireEvent.pointerDown(surface, event)
  if (type === 'move') fireEvent.pointerMove(surface, event)
  if (type === 'up') fireEvent.pointerUp(surface, event)
  if (type === 'cancel') fireEvent.pointerCancel(surface, event)
}
function flush(ms = 300) { act(() => { vi.advanceTimersByTime(ms) }) }

describe('explicit confirmation and keyboard controls', () => {
  it('selects an inactive label first and confirms only on its next activation', () => {
    const { navigator, onConfirm } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'PROJECTS' }))
    expect(navigator.getAttribute('data-selected-index')).toBe('3')
    expect(onConfirm).not.toHaveBeenCalled()
    const obsolete = animations.calls.at(-1)!
    fireEvent.click(screen.getByRole('button', { name: 'PROJECTS' }))
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith('projects')
    expect(navigator.getAttribute('data-angle')).toBe('18')
    expect(navigator.getAttribute('data-phase')).toBe('idle')
    act(() => { obsolete.vars.onComplete(); obsolete.vars.onUpdate() })
    flush()
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(navigator.getAttribute('data-angle')).toBe('18')
  })

  it('confirms the latest committed release synchronously during settling', () => {
    const { surface, navigator, onConfirm } = setup()
    pointer(surface, 'down', -90)
    act(() => { pointer(surface, 'up', -70); fireEvent.keyDown(surface, { key: 'Enter' }) })
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith('projects')
    expect(navigator.getAttribute('data-angle')).toBe('18')
    expect(navigator.getAttribute('data-phase')).toBe('idle')
    flush()
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('rejects all confirmation and selection commands during an active gesture', () => {
    const { surface, onConfirm, navigator } = setup()
    pointer(surface, 'down', -90)
    fireEvent.keyDown(surface, { key: 'Enter' })
    fireEvent.keyDown(surface, { key: 'ArrowRight' })
    fireEvent.click(screen.getByRole('button', { name: 'PROJECTS' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm HOME' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(navigator.getAttribute('data-selected-index')).toBe('2')
    pointer(surface, 'up', -90)
    flush()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('ignores repeated Enter and keeps native button activation separate', () => {
    const { surface, onConfirm } = setup()
    fireEvent.keyDown(surface, { key: 'Enter', repeat: true })
    expect(onConfirm).not.toHaveBeenCalled()
    fireEvent.keyDown(surface, { key: 'Enter' })
    expect(onConfirm).toHaveBeenCalledTimes(1)
    const center = screen.getByRole('button', { name: 'Confirm HOME' })
    expect(fireEvent.keyDown(center, { key: 'Enter', repeat: true })).toBe(false)
    fireEvent.click(center)
    expect(onConfirm).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: 'ENTER HOME' }))
    expect(onConfirm).toHaveBeenCalledTimes(3)
  })

  it('replaces rapid selections and rejects old completions without navigation', () => {
    const { navigator, onConfirm } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'PROJECTS' }))
    const obsolete = animations.calls.at(-1)!
    fireEvent.click(screen.getByRole('button', { name: 'CONTACT' }))
    fireEvent.click(screen.getByRole('button', { name: 'STACK' }))
    act(() => { obsolete.vars.onComplete() })
    flush()
    expect(navigator.getAttribute('data-angle')).toBe('36')
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('scopes keyboard movement and clamps both endpoints without wrapping', () => {
    const { surface, navigator, onConfirm } = setup()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(navigator.getAttribute('data-selected-index')).toBe('2')
    fireEvent.keyDown(surface, { key: 'ArrowRight' })
    expect(navigator.getAttribute('data-selected-index')).toBe('3')
    fireEvent.keyDown(surface, { key: 'End' })
    fireEvent.keyDown(surface, { key: 'ArrowRight' })
    expect(navigator.getAttribute('data-selected-index')).toBe('4')
    fireEvent.keyDown(surface, { key: 'Home' })
    fireEvent.keyDown(surface, { key: 'ArrowLeft' })
    flush()
    expect(navigator.getAttribute('data-angle')).toBe('-36')
    fireEvent.keyDown(surface, { key: 'ArrowUp' })
    expect(navigator.getAttribute('data-selected-index')).toBe('1')
    fireEvent.keyDown(surface, { key: 'ArrowDown' })
    expect(navigator.getAttribute('data-selected-index')).toBe('0')
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('moves label focus with arrow selection and keeps only the committed label in Tab order', () => {
    const { onConfirm } = setup()
    const home = screen.getByRole('button', { name: 'HOME' })
    home.focus()
    fireEvent.keyDown(home, { key: 'ArrowRight' })
    const projects = screen.getByRole('button', { name: 'PROJECTS' })
    expect(document.activeElement).toBe(projects)
    expect(projects.getAttribute('aria-pressed')).toBe('true')
    expect(projects.tabIndex).toBe(0)
    expect(home.tabIndex).toBe(-1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('provides previous/next alternatives and no confirmation on snap completion or rim click', () => {
    const { surface, navigator, onConfirm } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Next section' }))
    flush()
    expect(navigator.getAttribute('data-angle')).toBe('18')
    fireEvent.click(screen.getByRole('button', { name: 'Previous section' }))
    flush()
    pointer(surface, 'down', -90); pointer(surface, 'up', -90); fireEvent.click(surface)
    expect(onConfirm).not.toHaveBeenCalled()
    expect(surface.parentElement).toBe(screen.getByRole('button', { name: 'Confirm HOME' }).parentElement)
  })
})

describe('accessibility and non-drag alternatives', () => {
  it.each([
    { name: 'Previous section', key: 'Home', angle: '-36', reverse: 'ArrowRight', next: '-18' },
    { name: 'Next section', key: 'End', angle: '36', reverse: 'ArrowLeft', next: '18' },
  ])('retains focus at the $name endpoint and allows keyboard reversal', ({ name, key, angle, reverse, next }) => {
    const { navigator, onConfirm } = setup()
    const button = screen.getByRole('button', { name })
    button.focus()
    fireEvent.keyDown(button, { key })
    flush()
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(document.activeElement).toBe(button)
    fireEvent.click(button)
    flush()
    expect(navigator.getAttribute('data-angle')).toBe(angle)
    expect(onConfirm).not.toHaveBeenCalled()
    fireEvent.keyDown(button, { key: reverse })
    flush()
    expect(navigator.getAttribute('data-angle')).toBe(next)
    expect(button.getAttribute('aria-disabled')).toBe('false')
    expect(document.activeElement).toBe(button)
  })

  it('exposes the committed slider value and configured help without announcing drag previews', () => {
    const { surface, navigator } = setup()
    const help = document.getElementById(surface.getAttribute('aria-describedby')!)!
    expect(help.textContent).toContain(`Drag ${WHEEL_PRESENTATION.dragBandMinInsetPx} to ${WHEEL_PRESENTATION.dragBandMaxInsetPx} pixels`)
    expect(screen.getByRole('navigation', { name: 'Portfolio sections' })).toBeTruthy()
    expect(surface.getAttribute('aria-valuemin')).toBe('0')
    expect(surface.getAttribute('aria-valuemax')).toBe('4')
    expect(surface.getAttribute('aria-valuetext')).toContain('HOME, 0 degrees')
    const announcement = navigator.querySelector('[aria-live="polite"]')!
    pointer(surface, 'down', -90)
    pointer(surface, 'move', -70)
    flush(16)
    expect(announcement.textContent).toBe('HOME selected. Confirm to enter.')
    expect(surface.getAttribute('aria-valuenow')).toBe('2')
    pointer(surface, 'up', -70)
    flush()
    expect(announcement.textContent).toBe('PROJECTS selected. Confirm to enter.')
    expect(surface.getAttribute('aria-valuenow')).toBe('3')
  })
})

describe('pointer controller', () => {
  it('starts HOME at zero in Strict Mode', () => {
    const { navigator } = setup()
    expect(navigator.getAttribute('data-angle')).toBe('0')
    expect(navigator.getAttribute('data-selected-index')).toBe('2')
  })

  it.each([[20, '3', '18'], [-20, '1', '-18'], [100, '4', '36'], [-100, '0', '-36']])('captures, previews and commits a %s degree gesture', (delta, index, angle) => {
    const { surface, navigator } = setup()
    pointer(surface, 'down', -90)
    expect(surface.hasPointerCapture(1)).toBe(true)
    expect(navigator.getAttribute('data-angle')).toBe('0')
    pointer(surface, 'move', -90 + delta)
    flush(16)
    expect(navigator.getAttribute('data-phase')).toBe('dragging')
    expect(navigator.getAttribute('data-selected-index')).toBe('2')
    pointer(surface, 'up', -90 + delta)
    expect(surface.hasPointerCapture(1)).toBe(false)
    flush()
    expect(navigator.getAttribute('data-selected-index')).toBe(index)
    expect(navigator.getAttribute('data-angle')).toBe(angle)
  })

  it('processes the final release before a pending animation frame publishes', () => {
    const { surface, navigator } = setup()
    pointer(surface, 'down', -90)
    pointer(surface, 'move', -80)
    pointer(surface, 'up', -55)
    flush()
    expect(navigator.getAttribute('data-angle')).toBe('36')
  })

  it('keeps a sub-threshold press armed and restores the committed angle on release', () => {
    const { surface, navigator } = setup()
    pointer(surface, 'down', -90)
    pointer(surface, 'move', -89)
    flush(16)
    expect(navigator.getAttribute('data-phase')).toBe('armed')
    pointer(surface, 'up', -89)
    flush()
    expect(navigator.getAttribute('data-angle')).toBe('0')
  })

  it.each([
    { clientX: 363, clientY: 363 }, { clientX: 410, clientY: 363 },
    { clientX: 100, clientY: 100 }, { button: 2 }, { isPrimary: false },
  ])('rejects ineligible initiation %o', extras => {
    const { surface, navigator } = setup()
    pointer(surface, 'down', -90, extras)
    expect(surface.hasPointerCapture(1)).toBe(false)
    expect(navigator.getAttribute('data-phase')).toBe('idle')
  })

  it('continues outside the initial circle and ignores additional pointers', () => {
    const { surface, navigator } = setup()
    pointer(surface, 'down', -90, { pointerType: 'touch' })
    pointer(surface, 'down', 90, { pointerId: 2, isPrimary: false, pointerType: 'touch' })
    pointer(surface, 'move', 90, { pointerId: 2 })
    pointer(surface, 'up', -70, { ...point(-70, 400), pointerType: 'touch' })
    flush()
    expect(navigator.getAttribute('data-angle')).toBe('18')
  })

  it('freezes in the center and rebases when leaving it', () => {
    const { surface, navigator } = setup()
    pointer(surface, 'down', -90)
    pointer(surface, 'move', -70)
    pointer(surface, 'move', 90, { clientX: 363, clientY: 363 })
    pointer(surface, 'move', 120)
    flush(16)
    expect(Number(navigator.getAttribute('data-angle'))).toBeCloseTo(20)
    pointer(surface, 'up', 120)
    flush()
    expect(navigator.getAttribute('data-angle')).toBe('18')
  })

  it.each(['cancel', 'lost', 'escape', 'blur', 'resize', 'hidden'])('rolls back on %s', reason => {
    const { surface, navigator } = setup()
    pointer(surface, 'down', -90)
    pointer(surface, 'move', -55)
    if (reason === 'cancel') pointer(surface, 'cancel', -55)
    if (reason === 'lost') fireEvent.lostPointerCapture(surface, { pointerId: 1 })
    if (reason === 'escape') fireEvent.keyDown(window, { key: 'Escape' })
    if (reason === 'blur') fireEvent(window, new Event('blur'))
    if (reason === 'resize') { rect = { ...rect, width: 400 }; fireEvent(window, new Event('resize')) }
    if (reason === 'hidden') { vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); fireEvent(document, new Event('visibilitychange')) }
    flush()
    expect(navigator.getAttribute('data-angle')).toBe('0')
    expect(surface.hasPointerCapture(1)).toBe(false)
  })

  it('releases capture and pending frames on unmount', () => {
    const { surface, unmount } = setup()
    pointer(surface, 'down', -90)
    pointer(surface, 'move', -60)
    unmount()
    expect(surface.hasPointerCapture(1)).toBe(false)
    flush()
  })
})
