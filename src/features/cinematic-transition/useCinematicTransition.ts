import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { addSpeedStreaks } from './speedStreaks'
import type { SyntheticEvent } from 'react'
import type { SectionId } from '../wheel-navigation/sections'

export type CinematicPhase = 'navigation' | 'entering' | 'section' | 'restoring'
export type DestinationId = Exclude<SectionId, 'home'>
interface CinematicState { phase: CinematicPhase; destination: DestinationId | null }

// This transaction state is independent of the wheel controller and page content.
export function useCinematicTransition() {
  const [state, setState] = useState<CinematicState>({ phase: 'navigation', destination: null })
  const current = useRef(state)
  const wheelStageRef = useRef<HTMLDivElement>(null)
  const navigationRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const proxyRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLButtonElement>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const streaksRef = useRef<HTMLDivElement>(null)
  const timeline = useRef<gsap.core.Timeline | null>(null)
  const context = useRef<gsap.Context | null>(null)
  const invokingControl = useRef<HTMLElement | null>(null)
  const activationTarget = useRef<HTMLElement | null>(null)
  const navigationScroll = useRef({ x: 0, y: 0 })
  const outgoingScroll = useRef<{ x: number; y: number } | null>(null)
  const reverseEntry = useRef(false)
  const publish = useCallback((next: CinematicState) => {
    current.current = next
    setState(next)
  }, [])
  const rememberActivation = useCallback((event: SyntheticEvent) => {
    if (current.current.phase === 'navigation' && event.target instanceof Element) {
      activationTarget.current = event.target.closest<HTMLElement>('button, [role="slider"]')
    }
  }, [])
  const enter = useCallback((destination: SectionId) => {
    if (destination === 'home' || current.current.phase !== 'navigation') return false
    // Safari does not necessarily focus a button on pointer activation.
    invokingControl.current = activationTarget.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    activationTarget.current = null
    navigationScroll.current = { x: window.scrollX, y: window.scrollY }
    statusRef.current?.focus({ preventScroll: true })
    publish({ phase: 'entering', destination })
    return true
  }, [publish])
  const restore = useCallback(() => {
    if (current.current.phase !== 'entering' && current.current.phase !== 'section') return false
    if (current.current.phase === 'entering' && wheelStageRef.current && (!timeline.current || timeline.current.progress() === 0)) {
      publish({ phase: 'navigation', destination: null })
      invokingControl.current?.focus({ preventScroll: true })
      return true
    }
    reverseEntry.current = current.current.phase === 'entering'
    outgoingScroll.current = reverseEntry.current ? null : { x: window.scrollX, y: window.scrollY }
    statusRef.current?.focus({ preventScroll: true })
    if (reverseEntry.current && wheelStageRef.current) window.scrollTo({ left: navigationScroll.current.x, top: navigationScroll.current.y, behavior: 'instant' })
    publish({ ...current.current, phase: 'restoring' })
    return true
  }, [publish])
  const complete = useCallback((endpoint: 'navigation' | 'section') => {
    if (endpoint === 'section' && current.current.phase === 'entering') {
      publish({ ...current.current, phase: 'section' })
    } else if (endpoint === 'navigation' && current.current.phase === 'restoring') {
      publish({ phase: 'navigation', destination: null })
    }
  }, [publish])

  useLayoutEffect(() => {
    const proxy = proxyRef.current, wheel = wheelStageRef.current
    const dock = dockRef.current, navigation = navigationRef.current, content = contentRef.current
    if (!proxy || !wheel || !dock || !navigation || !content) return
    if (state.phase === 'navigation') {
      context.current?.revert()
      context.current = null
      timeline.current = null
      outgoingScroll.current = null
      // The carrier has no React-owned inline styles. Explicitly reset its
      // endpoint after revert, including zero-duration preference/resize sets.
      proxy.removeAttribute('style')
      if (!document.hidden && invokingControl.current?.isConnected) invokingControl.current.focus({ preventScroll: true })
      return
    }
    if (state.phase === 'section') {
      if (!document.hidden) content.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
      return
    }
    if (state.phase === 'restoring' && reverseEntry.current && timeline.current) {
      proxy.style.willChange = 'transform'
      timeline.current.timeScale(1.5).reverse()
      return
    }
    context.current?.revert()
    const outgoing = outgoingScroll.current
    const contentOffset = { x: 0, y: 0 }
    if (outgoing) {
      // Restore measurement coordinates and compensate the outgoing scene in
      // this same layout effect, so no intermediate scroll position is painted.
      window.scrollTo({ left: navigationScroll.current.x, top: navigationScroll.current.y, behavior: 'instant' })
      contentOffset.x = window.scrollX - outgoing.x
      contentOffset.y = window.scrollY - outgoing.y
    }
    const source = wheel.getBoundingClientRect(), target = dock.getBoundingClientRect()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    context.current = gsap.context(() => {
      gsap.set(proxy, {
        x: reduced ? target.left : source.left, y: reduced ? target.top : source.top,
        width: source.width, height: source.height,
        scale: reduced ? target.width / source.width : 1,
        autoAlpha: reduced ? 0 : 1, willChange: 'transform',
      })
      const motion = gsap.timeline({ paused: true,
        onComplete: () => { proxy.style.willChange = ''; complete('section') },
        onReverseComplete: () => complete('navigation'),
      })
      if (reduced) {
        motion.to(navigation, { opacity: 0, duration: 0.15 }, 0)
          .to(proxy, { autoAlpha: 1, duration: 0.15 }, 0)
          .fromTo(content, { autoAlpha: 0, ...contentOffset }, { autoAlpha: 1, ...contentOffset, duration: 0.15 }, 0)
      } else {
        motion.to(navigation, { opacity: 0, duration: 0.18, ease: 'power1.out' }, 0)
          .to(proxy, { x: target.left, y: target.top, scale: target.width / source.width, duration: 1.23, ease: 'power2.inOut' }, 0.22)
          // Completed sections fade out in place; entry retains its 12px lift.
          .fromTo(content, { autoAlpha: 0, x: contentOffset.x, y: outgoing ? contentOffset.y : 12 },
            { autoAlpha: 1, ...contentOffset, duration: 0.7, ease: 'power2.out' }, 1.1)
      }
      const streaks = streaksRef.current?.children
      if (streaks && !reduced) {
        addSpeedStreaks(motion, streaks)
      }
      timeline.current = motion
      if (state.phase === 'restoring') motion.progress(1, true).timeScale(reduced ? 1 : 1.5).reverse()
      else motion.play()
    })
    outgoingScroll.current = null
  }, [state.phase, state.destination, complete])

  useLayoutEffect(() => {
    const travelling = () => current.current.phase === 'entering' || current.current.phase === 'restoring'
    const positionDock = () => {
      const proxy = proxyRef.current, dock = dockRef.current
      if (!proxy || !dock) return
      const target = dock.getBoundingClientRect()
      gsap.set(proxy, { x: target.left, y: target.top, scale: target.width / parseFloat(proxy.style.width), willChange: '' })
    }
    const settle = () => {
      const phase = current.current.phase
      if (!travelling()) return
      timeline.current?.pause().progress(phase === 'entering' ? 1 : 0, true)
      if (phase === 'entering') positionDock()
      complete(phase === 'entering' ? 'section' : 'navigation')
    }
    const resize = () => {
      if (travelling()) settle()
      else if (current.current.phase === 'section') positionDock()
    }
    const visibility = () => {
      if (document.hidden) settle()
      else if (current.current.phase === 'section') contentRef.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
      else if (current.current.phase === 'navigation') invokingControl.current?.focus({ preventScroll: true })
    }
    const key = (event: KeyboardEvent) => {
      if (!travelling()) return
      if (event.key === 'Escape') { event.preventDefault(); restore() }
      else if ([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault()
    }
    const preventScroll = (event: Event) => { if (travelling()) event.preventDefault() }
    const scroll = () => {
      if (travelling() && !outgoingScroll.current && (window.scrollX !== navigationScroll.current.x || window.scrollY !== navigationScroll.current.y)) {
        window.scrollTo({ left: navigationScroll.current.x, top: navigationScroll.current.y, behavior: 'instant' })
      }
    }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const motionChanged = () => { if (media.matches) settle() }
    window.addEventListener('keydown', key)
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', scroll)
    window.addEventListener('wheel', preventScroll, { passive: false })
    window.addEventListener('touchmove', preventScroll, { passive: false })
    document.addEventListener('visibilitychange', visibility)
    media.addEventListener('change', motionChanged)
    return () => {
      window.removeEventListener('keydown', key)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', scroll)
      window.removeEventListener('wheel', preventScroll)
      window.removeEventListener('touchmove', preventScroll)
      document.removeEventListener('visibilitychange', visibility)
      media.removeEventListener('change', motionChanged)
    }
  }, [restore, complete])

  useLayoutEffect(() => () => {
    context.current?.revert()
    timeline.current = null
    outgoingScroll.current = null
  }, [])

  return { state, enter, restore, complete, rememberActivation, wheelStageRef, navigationRef, contentRef, proxyRef, dockRef, statusRef, streaksRef }
}
