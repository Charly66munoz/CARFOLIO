// @vitest-environment jsdom
import { StrictMode } from 'react'
import type { Ref } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RaceStartOverlay } from '../RaceStartOverlay'
import App from '../../../App'

const animation = vi.hoisted(() => ({
  complete: undefined as undefined | (() => void),
  fail: false,
  fromTo: vi.fn().mockReturnThis(),
  to: vi.fn().mockReturnThis(),
  kill: vi.fn(),
  revert: vi.fn(),
}))
vi.mock('gsap', () => ({ gsap: {
  context: (callback: () => void) => {
    if (animation.fail) throw new Error('Animation unavailable')
    callback()
    return { revert: animation.revert }
  },
  timeline: ({ onComplete }: { onComplete: () => void }) => {
    animation.complete = onComplete
    return { fromTo: animation.fromTo, to: animation.to, duration: () => 1.5, kill: animation.kill }
  },
} }))
// Keep App's actual startup integration and cinematic controller; isolate the
// already-tested wheel mechanics so these tests focus on the intro gate.
vi.mock('../../wheel-navigation/SteeringWheelNavigator', () => ({
  SteeringWheelNavigator: ({ wheelStageRef, onConfirm }: { wheelStageRef: Ref<HTMLDivElement>; onConfirm: (id: 'home') => void }) =>
    <div ref={wheelStageRef}><button className="section-label--active" onClick={() => onConfirm('home')}>HOME</button></div>,
}))

const key = 'gt3-race-start-expires-at'
const countLit = () => document.querySelectorAll('.race-light-column[data-lit="true"]').length
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))
const mountApp = () => render(<StrictMode><App /></StrictMode>)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-25T12:00:00Z'))
  localStorage.clear()
  animation.fail = false
  animation.complete = undefined
  vi.clearAllMocks()
  vi.stubGlobal('matchMedia', () => Object.assign(new EventTarget(), { matches: false }))
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Race Start introduction', () => {
  it('illuminates four columns at one-second intervals, then waits with the fifth off', () => {
    render(<StrictMode><RaceStartOverlay onComplete={vi.fn()} /></StrictMode>)
    expect(document.querySelectorAll('.race-lamp')).toHaveLength(5)
    advance(0)
    expect(countLit()).toBe(1)
    expect(screen.queryByRole('button')).toBeNull()
    advance(999)
    expect(countLit()).toBe(1)
    advance(1)
    expect(countLit()).toBe(2)
    advance(1000)
    expect(countLit()).toBe(3)
    advance(1000)
    expect(countLit()).toBe(4)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'PRESS TO START' }))
    advance(60000)
    expect(countLit()).toBe(4)
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('activates the fifth once, persists at activation, and completes exactly once', () => {
    const onComplete = vi.fn()
    const write = vi.spyOn(Storage.prototype, 'setItem')
    render(<RaceStartOverlay onComplete={onComplete} />)
    advance(3000)
    const button = screen.getByRole('button', { name: 'PRESS TO START' }) as HTMLButtonElement
    const activatedAt = Date.now()
    act(() => { button.click(); button.click() })
    expect(button.disabled).toBe(true)
    expect(countLit()).toBe(5)
    expect(write).toHaveBeenCalledExactlyOnceWith(key, String(activatedAt + 900000))
    expect(onComplete).not.toHaveBeenCalled()
    act(() => { animation.complete!(); animation.complete!() })
    expect(onComplete).toHaveBeenCalledTimes(1)
    advance(0) // Flush jsdom's zero-delay storage-event dispatch.
    expect(vi.getTimerCount()).toBe(0)
    expect(animation.kill).toHaveBeenCalled()
    expect(animation.revert).toHaveBeenCalled()
  })

  it('cleans pending light timers on unmount and starts a fresh sequence on remount', () => {
    const first = render(<RaceStartOverlay onComplete={vi.fn()} />)
    advance(1000)
    first.unmount()
    expect(vi.getTimerCount()).toBe(0)
    render(<RaceStartOverlay onComplete={vi.fn()} />)
    advance(0)
    expect(countLit()).toBe(1)
  })

  it('kills the animation and fallback on unmount without completing a stale intro', () => {
    const onComplete = vi.fn()
    const view = render(<RaceStartOverlay onComplete={onComplete} />)
    advance(3000)
    fireEvent.click(screen.getByRole('button', { name: 'PRESS TO START' }))
    view.unmount()
    advance(0) // Storage events are browser work, not intro-owned timers.
    expect(vi.getTimerCount()).toBe(0)
    act(() => animation.complete!())
    expect(onComplete).not.toHaveBeenCalled()
    expect(animation.kill).toHaveBeenCalled()
    expect(animation.revert).toHaveBeenCalled()
  })

  it('uses a short fade without streak tweens under reduced motion', () => {
    vi.stubGlobal('matchMedia', () => Object.assign(new EventTarget(), { matches: true }))
    render(<RaceStartOverlay onComplete={vi.fn()} />)
    advance(3000)
    fireEvent.click(screen.getByRole('button', { name: 'PRESS TO START' }))
    expect(countLit()).toBe(5)
    expect(animation.fromTo).not.toHaveBeenCalled()
    expect(animation.to).toHaveBeenCalledWith(expect.anything(), { opacity: 0, duration: 0.15 })
  })
})

describe('App startup integration', () => {
  it('keeps HOME inert, then releases it and restores focus without confirming a section', () => {
    mountApp()
    const home = screen.getByText('HOME')
    expect(home.closest('[inert]')).not.toBeNull()
    advance(3000)
    fireEvent.click(screen.getByRole('button', { name: 'PRESS TO START' }))
    act(() => animation.complete!())
    expect(screen.queryByRole('region', { name: 'Race Start introduction' })).toBeNull()
    expect(home.closest('[inert]')).toBeNull()
    expect(document.activeElement).toBe(home)
    expect(document.querySelector('.confirmation-status')!.textContent).toBe('Select a section, then confirm to enter.')
  })

  it('skips a valid expiry without extending it or reopening the intro during this visit', () => {
    const expiresAt = String(Date.now() + 1000)
    localStorage.setItem(key, expiresAt)
    const write = vi.spyOn(Storage.prototype, 'setItem')
    mountApp()
    expect(screen.queryByRole('region', { name: 'Race Start introduction' })).toBeNull()
    expect(screen.getByText('HOME').closest('[inert]')).toBeNull()
    expect(write).not.toHaveBeenCalled()
    advance(2000)
    expect(screen.queryByRole('region', { name: 'Race Start introduction' })).toBeNull()
    expect(localStorage.getItem(key)).toBe(expiresAt)
  })

  it.each([null, '', 'not-a-date', 'Infinity', '-Infinity', 'NaN', 'expired', 'boundary'])('shows the introduction for %s expiry', value => {
    if (value !== null) localStorage.setItem(key, value === 'expired' ? String(Date.now() - 1) : value === 'boundary' ? String(Date.now()) : value)
    mountApp()
    expect(screen.getByRole('region', { name: 'Race Start introduction' })).toBeTruthy()
  })

  it.each(['getItem', 'setItem'] as const)('continues normally when storage %s throws', method => {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new Error('Storage blocked') })
    mountApp()
    advance(3000)
    fireEvent.click(screen.getByRole('button', { name: 'PRESS TO START' }))
    act(() => animation.complete!())
    expect(screen.queryByRole('region', { name: 'Race Start introduction' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByText('HOME'))
  })

  it.each(['setup error', 'missing completion'])('releases HOME after animation %s', failure => {
    animation.fail = failure === 'setup error'
    mountApp()
    advance(3000)
    fireEvent.click(screen.getByRole('button', { name: 'PRESS TO START' }))
    if (failure === 'missing completion') advance(2000)
    expect(screen.queryByRole('region', { name: 'Race Start introduction' })).toBeNull()
    expect(screen.getByText('HOME').closest('[inert]')).toBeNull()
    expect(document.activeElement).toBe(screen.getByText('HOME'))
    expect(document.querySelector('.confirmation-status')!.textContent).not.toContain('confirmed')
  })
})
