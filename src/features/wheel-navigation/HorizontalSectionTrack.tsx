import { useLayoutEffect, useRef, useState } from 'react'
import { SECTIONS } from './sections'
import { getFractionalIndex, getTrackX } from './wheelMath'
import type { useWheelNavigation } from './useWheelNavigation'

interface Props {
  angleDeg: number; selectedIndex: number; displayIndex: number
  activateLabel: ReturnType<typeof useWheelNavigation>['activateLabel']
  onKeyDown: ReturnType<typeof useWheelNavigation>['onKeyDown']
}

export function HorizontalSectionTrack({ angleDeg, selectedIndex, displayIndex, activateLabel, onKeyDown }: Props) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const viewportRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLLIElement>(null)
  const [geometry, setGeometry] = useState({ viewport: 0, slot: 0 })
  useLayoutEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current?.getBoundingClientRect().width ?? 0
      const slot = slotRef.current?.getBoundingClientRect().width ?? 0
      setGeometry(previous => previous.viewport === viewport && previous.slot === slot ? previous : { viewport, slot })
    }
    const observer = new ResizeObserver(measure)
    if (viewportRef.current) observer.observe(viewportRef.current)
    if (slotRef.current) observer.observe(slotRef.current)
    return () => observer.disconnect()
  }, [])
  const fractionalIndex = getFractionalIndex(angleDeg)
  return (
    <div className="section-navigation" aria-label="Portfolio sections">
      <p className="section-counter">{String(displayIndex + 1).padStart(2, '0')} / {String(SECTIONS.length).padStart(2, '0')}</p>
      <div className="track-viewport" ref={viewportRef}>
        <ol className="section-track" style={geometry.slot ? { marginLeft: 0, transform: `translateX(${getTrackX(angleDeg, geometry.viewport, geometry.slot)}px)` } : undefined}>
          {SECTIONS.map((section, index) => {
            const distance = Math.abs(index - fractionalIndex)
            const scale = distance <= 1 ? 1 - distance * (1 - 16/39) : Math.max(13/39, 16/39 - (distance-1) * 3/39)
            return (
              <li className="section-slot" key={section.id} ref={index === 0 ? slotRef : undefined}>
                <button type="button" className={`section-label ${index === displayIndex ? 'section-label--active' : ''}`}
                  aria-pressed={index === selectedIndex} tabIndex={index === selectedIndex ? 0 : -1}
                  ref={element => { buttons.current[index] = element }}
                  onClick={() => activateLabel(index)}
                  onKeyDown={event => { const target = onKeyDown(event); if (target !== null) buttons.current[target]?.focus({ preventScroll: true }) }}
                  style={{ opacity: Math.max(0.43, 1-distance*0.21) }}>
                  <span style={{ display: 'block', transform: `scale(${scale})` }}>{section.label}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
      <div className="turn-cues" aria-hidden="true">
        <span>← &nbsp; TURN LEFT</span>
        <span>TURN RIGHT &nbsp; →</span>
      </div>
    </div>
  )
}
