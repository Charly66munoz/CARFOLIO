import type { CSSProperties } from 'react'
import wheel from '../../assets/steering-wheel-transparent-candidate.png'
import shadow from '../../assets/wheel-shadow.svg'
import { WHEEL_PRESENTATION } from './presentation'
import type { useWheelNavigation } from './useWheelNavigation'
import { SECTIONS } from './sections'

export function SteeringWheel({ state, surfaceRef, pointerEvents, canConfirm, confirm, onKeyDown }: ReturnType<typeof useWheelNavigation>) {
  const selected = SECTIONS[state.selectedIndex]
  return (
    <div className="wheel-stage"
      onPointerDownCapture={event => {
        // Track input even when the press cannot initiate a drag.
        if (event.target instanceof HTMLElement) event.target.dataset.input = 'pointer'
      }}
      onKeyDownCapture={event => {
        if (event.target instanceof HTMLElement) delete event.target.dataset.input
      }}
      onBlurCapture={event => { delete event.target.dataset.input }}
      style={{ '--wheel-max': `${WHEEL_PRESENTATION.stageMaxPx}px`, '--center-size': `max(${WHEEL_PRESENTATION.minimumTargetPx}px, ${WHEEL_PRESENTATION.centerButtonDiameterRatio * 100}%)` } as CSSProperties}>
      <div className="wheel-shadow" aria-hidden="true">
        <img src={shadow} alt="" width="570" height="570" />
      </div>
      <div className="wheel-rotor" style={{ transform: `rotate(${state.angleDeg}deg)` }}>
        <img className="wheel-artwork" src={wheel} alt="" width="1254" height="1254" draggable={false}
          style={{ width: `${WHEEL_PRESENTATION.imageScale * 100}%`, height: `${WHEEL_PRESENTATION.imageScale * 100}%`, transform: `translate(${-100 * WHEEL_PRESENTATION.hubX / WHEEL_PRESENTATION.sourceSizePx}%, ${-100 * WHEEL_PRESENTATION.hubY / WHEEL_PRESENTATION.sourceSizePx}%)` }} />
      </div>
      <div className="wheel-surface" ref={surfaceRef} {...pointerEvents}
        tabIndex={0} role="slider" aria-label="Select portfolio section"
        aria-valuemin={0} aria-valuemax={4} aria-valuenow={state.selectedIndex}
        aria-valuetext={`${selected.label}, ${selected.angleDeg} degrees. Use arrow keys to select and Enter to confirm.`}
        aria-orientation="horizontal" aria-describedby="keyboard-help" onKeyDown={event => onKeyDown(event, true)} />
      <button type="button" className="wheel-center" aria-label={`Confirm ${selected.label}`}
        disabled={!canConfirm} onClick={confirm} onKeyDown={event => onKeyDown(event)} />
    </div>
  )
}
