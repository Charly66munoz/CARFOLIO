import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import graphite from '../../assets/atmosphere-graphite.svg'
import silver from '../../assets/atmosphere-silver.svg'
import { addSpeedStreaks, SPEED_STREAKS } from '../cinematic-transition/speedStreaks'

export function RaceStartOverlay({ onComplete }: { onComplete: () => void }) {
  const [litColumns, setLitColumns] = useState(0)
  const [starting, setStarting] = useState(false)
  const activated = useRef(false)
  const overlay = useRef<HTMLElement>(null)
  const streaks = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const timers = [0, 1000, 2000, 3000].map((delay, index) =>
      window.setTimeout(() => setLitColumns(index + 1), delay))
    return () => timers.forEach(window.clearTimeout)
  }, [])

  useLayoutEffect(() => {
    if (litColumns === 4) button.current?.focus({ preventScroll: true })
  }, [litColumns])

  useLayoutEffect(() => {
    if (!starting) return
    let finished = false
    let fallback: number | undefined
    let context: gsap.Context | undefined
    let motion: gsap.core.Timeline | undefined
    const finish = () => {
      if (finished) return
      finished = true
      window.clearTimeout(fallback)
      motion?.kill()
      context?.revert()
      // Keep the completed cover hidden until React removes it.
      if (overlay.current) overlay.current.style.visibility = 'hidden'
      onComplete()
    }
    try {
      context = gsap.context(() => {
        motion = gsap.timeline({ onComplete: finish })
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          motion.to(overlay.current, { opacity: 0, duration: 0.15 })
        } else {
          addSpeedStreaks(motion, streaks.current!.children)
          motion.to(overlay.current, { opacity: 0, duration: 0.25 }, motion.duration() - 0.25)
        }
        fallback = window.setTimeout(finish, Math.ceil(motion.duration() * 1000) + 500)
      }, overlay)
    } catch {
      finish()
    }
    return () => {
      finished = true
      window.clearTimeout(fallback)
      motion?.kill()
      context?.revert()
    }
  }, [starting, onComplete])

  const start = () => {
    if (activated.current || litColumns !== 4) return
    activated.current = true
    setStarting(true)
    setLitColumns(5)
    try {
      localStorage.setItem('gt3-race-start-expires-at', String(Date.now() + 15 * 60 * 1000))
    } catch { /* Storage is optional; entry must remain available. */ }
  }

  return <section className="race-start-overlay" ref={overlay} aria-label="Race Start introduction" data-starting={starting}>
    <div className="race-start-atmosphere" aria-hidden="true">
      <div className="atmosphere-graphite"><img src={graphite} alt="" width="1136" height="1136" /></div>
      <div className="atmosphere-silver"><img src={silver} alt="" width="630" height="630" /></div>
    </div>
    <div className="race-start-content">
      <div className="race-light-assembly" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(column => <span className="race-light-column race-lamp" key={column} data-lit={column < litColumns} />)}
      </div>
      <div className="race-start-action">
        {litColumns >= 4 && <button className="race-start-button" ref={button} type="button" disabled={starting} onClick={start}>
          PRESS TO START
        </button>}
      </div>
      <p className="sr-only" role="status">{starting ? 'Starting.' : litColumns === 4 ? 'Press to start.' : 'Race Start introduction.'}</p>
    </div>
    <div className="speed-streaks" ref={streaks} aria-hidden="true">
      {SPEED_STREAKS.map(([left, top, rotate], index) => <span className="speed-streak" key={index} style={{ left, top, rotate }} />)}
    </div>
  </section>
}
