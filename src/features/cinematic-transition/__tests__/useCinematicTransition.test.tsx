// @vitest-environment jsdom
import { act, renderHook, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCinematicTransition } from '../useCinematicTransition'

beforeEach(() => vi.stubGlobal('matchMedia', () => Object.assign(new EventTarget(), { matches: false })))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('cinematic confirmation transactions', () => {
  it('keeps HOME in navigation and rejects repeated confirmations synchronously', () => {
    const { result } = renderHook(useCinematicTransition)
    act(() => {
      expect(result.current.enter('home')).toBe(false)
      expect(result.current.enter('projects')).toBe(true)
      expect(result.current.enter('about')).toBe(false)
    })
    expect(result.current.state).toEqual({ phase: 'entering', destination: 'projects' })
  })

  it('reverses entry without accepting stale completion or queuing destinations', () => {
    const { result } = renderHook(useCinematicTransition)
    act(() => { result.current.enter('contact'); result.current.restore(); result.current.complete('section') })
    expect(result.current.state).toEqual({ phase: 'restoring', destination: 'contact' })
    act(() => { expect(result.current.restore()).toBe(false); expect(result.current.enter('stack')).toBe(false) })
    act(() => result.current.complete('navigation'))
    expect(result.current.state).toEqual({ phase: 'navigation', destination: null })
    act(() => result.current.enter('stack'))
    expect(result.current.state.destination).toBe('stack')
  })

  it('restores a completed section only after an explicit request', () => {
    const { result } = renderHook(useCinematicTransition)
    act(() => { result.current.enter('about'); result.current.complete('section') })
    expect(result.current.state.phase).toBe('section')
    act(() => { result.current.complete('navigation'); expect(result.current.enter('stack')).toBe(false) })
    expect(result.current.state.destination).toBe('about')
    act(() => { result.current.restore(); result.current.complete('navigation') })
    expect(result.current.state.phase).toBe('navigation')
  })
})
