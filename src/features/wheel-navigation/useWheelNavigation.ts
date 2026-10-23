import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent, FocusEvent as ReactFocusEvent } from 'react'
import { gsap } from 'gsap'
import { HOME_INDEX, SECTIONS } from './sections'
import type { SectionId } from './sections'
import { advanceWheelAngle, getPointerAngle, isPointInAnnulus, nearestSectionIndex } from './wheelMath'
import { getDragBounds } from './presentation'

type Phase = 'idle' | 'armed' | 'dragging' | 'settling'
interface NavigationState { angleDeg: number; selectedIndex: number; phase: Phase }
interface Gesture {
  id: number; surface: HTMLDivElement; rect: DOMRect
  cx: number; cy: number; startX: number; startY: number
  startIndex: number; previousPolar: number | null; dragged: boolean
}

export function useWheelNavigation(onConfirm: (section: SectionId) => void) {
  const [state, setState] = useState<NavigationState>({ angleDeg: 0, selectedIndex: HOME_INDEX, phase: 'idle' })
  const current = useRef(state)
  const gesture = useRef<Gesture | null>(null)
  const frame = useRef<number | null>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const tween = useRef<gsap.core.Tween | null>(null)
  const generation = useRef(0)
  const reducedMotion = useRef(false)

  const publish = useCallback((next: NavigationState, coalesce = false) => {
    current.current = next
    if (coalesce) {
      if (frame.current === null) frame.current = requestAnimationFrame(() => {
        frame.current = null
        setState(current.current)
      })
    } else {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
      setState(next)
    }
  }, [])

  const stopSnap = useCallback(() => {
    generation.current++
    tween.current?.kill()
    tween.current = null
  }, [])

  const finishSnap = useCallback(() => {
    stopSnap()
    publish({ ...current.current, angleDeg: SECTIONS[current.current.selectedIndex].angleDeg, phase: 'idle' })
  }, [stopSnap, publish])

  const settle = useCallback((index: number) => {
    stopSnap()
    const target = SECTIONS[index].angleDeg
    if (reducedMotion.current || document.hidden || current.current.angleDeg === target) {
      publish({ angleDeg: target, selectedIndex: index, phase: 'idle' })
      return
    }
    const value = { angleDeg: current.current.angleDeg }
    const version = generation.current
    publish({ ...current.current, selectedIndex: index, phase: 'settling' })
    tween.current = gsap.to(value, {
      angleDeg: target, duration: 0.24, ease: 'power2.out',
      onUpdate: () => {
        if (version === generation.current) publish({ ...current.current, angleDeg: value.angleDeg }, true)
      },
      onComplete: () => {
        if (version !== generation.current) return
        tween.current = null
        publish({ angleDeg: target, selectedIndex: index, phase: 'idle' })
      },
    })
  }, [publish, stopSnap])

  const releaseOwnership = useCallback(() => {
    const owned = gesture.current
    gesture.current = null
    if (owned) owned.surface.style.cursor = ''
    if (owned?.surface.hasPointerCapture(owned.id)) owned.surface.releasePointerCapture(owned.id)
    return owned
  }, [])

  const cancel = useCallback(() => {
    const owned = releaseOwnership()
    if (owned) settle(owned.startIndex)
  }, [releaseOwnership, settle])

  const sample = useCallback((owned: Gesture, x: number, y: number) => {
    if (!owned.dragged && Math.hypot(x - owned.startX, y - owned.startY) < 6) return
    owned.dragged = true
    const center = { x: owned.cx, y: owned.cy }
    const polar = getPointerAngle({ x, y }, center)
    const inside = Math.hypot(x - owned.cx, y - owned.cy) < getDragBounds(owned.rect.width).inner
    const angleDeg = inside || owned.previousPolar === null
      ? current.current.angleDeg
      : advanceWheelAngle(current.current.angleDeg, owned.previousPolar, polar)
    owned.previousPolar = inside ? null : polar
    publish({ ...current.current, angleDeg, phase: 'dragging' }, true)
  }, [publish])

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (gesture.current || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
    const surface = event.currentTarget
    const rect = surface.getBoundingClientRect()
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const bounds = getDragBounds(rect.width)
    if (!isPointInAnnulus({ x: event.clientX, y: event.clientY }, center, bounds.inner, bounds.outer)) return
    const owned: Gesture = {
      id: event.pointerId, surface, rect, cx: center.x, cy: center.y,
      startX: event.clientX, startY: event.clientY,
      startIndex: current.current.selectedIndex,
      previousPolar: getPointerAngle({ x: event.clientX, y: event.clientY }, center), dragged: false,
    }
    gesture.current = owned
    try { surface.setPointerCapture(event.pointerId) } catch { gesture.current = null; return }
    stopSnap()
    surface.dataset.input = 'pointer'
    surface.style.cursor = 'grabbing'
    surface.focus({ preventScroll: true })
    event.preventDefault()
    publish({ ...current.current, angleDeg: state.angleDeg, phase: 'armed' })
  }, [publish, stopSnap, state.angleDeg])

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const owned = gesture.current
    if (owned?.id === event.pointerId) sample(owned, event.clientX, event.clientY)
    else if (!owned && event.pointerType === 'mouse') {
      const rect = event.currentTarget.getBoundingClientRect()
      const bounds = getDragBounds(rect.width)
      const eligible = isPointInAnnulus({ x: event.clientX, y: event.clientY }, { x: rect.left + rect.width/2, y: rect.top + rect.height/2 }, bounds.inner, bounds.outer)
      event.currentTarget.style.cursor = eligible ? 'grab' : ''
    }
  }, [sample])

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const owned = gesture.current
    if (!owned || owned.id !== event.pointerId) return
    sample(owned, event.clientX, event.clientY)
    const index = owned.dragged ? nearestSectionIndex(current.current.angleDeg) : owned.startIndex
    releaseOwnership()
    settle(index)
  }, [sample, releaseOwnership, settle])

  const onPointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (gesture.current?.id === event.pointerId) cancel()
  }, [cancel])

  const selectIndex = useCallback((index: number) => {
    if (!gesture.current) settle(Math.max(0, Math.min(SECTIONS.length - 1, index)))
  }, [settle])

  const confirm = useCallback(() => {
    if (gesture.current) return
    const captured = SECTIONS[current.current.selectedIndex].id
    finishSnap()
    onConfirm(captured)
  }, [finishSnap, onConfirm])

  const activateLabel = useCallback((index: number) => {
    if (gesture.current) return
    if (index === current.current.selectedIndex) confirm()
    else selectIndex(index)
  }, [confirm, selectIndex])

  const step = useCallback((direction: number) => {
    selectIndex(current.current.selectedIndex + direction)
  }, [selectIndex])

  const onKeyDown = useCallback((event: ReactKeyboardEvent, enterConfirms = false): number | null => {
    if (enterConfirms) (event.currentTarget as HTMLElement).dataset.input = 'keyboard'
    if (event.key === 'Enter') {
      if (event.repeat || enterConfirms) event.preventDefault()
      if (enterConfirms && !event.repeat) confirm()
      return null
    }
    const index = current.current.selectedIndex
    let target: number
    switch (event.key) {
      case 'ArrowLeft': case 'ArrowDown': target = index - 1; break
      case 'ArrowRight': case 'ArrowUp': target = index + 1; break
      case 'Home': target = 0; break
      case 'End': target = SECTIONS.length - 1; break
      default: return null
    }
    event.preventDefault()
    if (gesture.current) return null
    target = Math.max(0, Math.min(SECTIONS.length - 1, target))
    selectIndex(target)
    return target
  }, [confirm, selectIndex])

  useLayoutEffect(() => {
    const checkGeometry = () => {
      const owned = gesture.current
      if (!owned) return
      const rect = owned.surface.getBoundingClientRect()
      if (['left', 'top', 'width', 'height'].some(key => rect[key as keyof DOMRect] !== owned.rect[key as keyof DOMRect])) cancel()
    }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') cancel() }
    const hidden = () => { if (document.hidden) { cancel(); if (tween.current) finishSnap() } }
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.current = motion.matches
    const motionChanged = () => { reducedMotion.current = motion.matches; if (motion.matches && tween.current) finishSnap() }
    motion.addEventListener('change', motionChanged)
    const observer = new ResizeObserver(checkGeometry)
    if (surfaceRef.current) observer.observe(surfaceRef.current)
    window.addEventListener('blur', cancel)
    window.addEventListener('keydown', key)
    window.addEventListener('resize', checkGeometry)
    window.addEventListener('scroll', checkGeometry, true)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      observer.disconnect()
      window.removeEventListener('blur', cancel)
      window.removeEventListener('keydown', key)
      window.removeEventListener('resize', checkGeometry)
      window.removeEventListener('scroll', checkGeometry, true)
      document.removeEventListener('visibilitychange', hidden)
      motion.removeEventListener('change', motionChanged)
      stopSnap()
      releaseOwnership()
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
    }
  }, [cancel, releaseOwnership, finishSnap, stopSnap])

  return {
    state, surfaceRef, selectIndex, cancel, confirm, activateLabel, step, onKeyDown,
    canConfirm: state.phase === 'idle' || state.phase === 'settling',
    previewIndex: nearestSectionIndex(state.angleDeg),
    pointerEvents: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture: onPointerCancel,
      onBlur: (event: ReactFocusEvent<HTMLDivElement>) => { delete event.currentTarget.dataset.input } },
  }
}
