import type { CSSProperties, Ref } from 'react'
import { WheelArtwork } from './WheelArtwork'
import { WHEEL_PRESENTATION } from './presentation'
import type { useWheelNavigation } from './useWheelNavigation'
import { SECTIONS } from './sections'

export function SteeringWheel({ state, surfaceRef, pointerEvents, canConfirm, confirm, onKeyDown, stageRef }: ReturnType<typeof useWheelNavigation> & { stageRef?: Ref<HTMLDivElement> }) {
  const selected = SECTIONS[state.selectedIndex]
  return (
    <div className="wheel-stage" ref={stageRef}
      onPointerDownCapture={event => {
        // Track input even when the press cannot initiate a drag.
        if (event.target instanceof HTMLElement) event.target.dataset.input = 'pointer'
      }}
      onKeyDownCapture={event => {
        if (event.target instanceof HTMLElement) delete event.target.dataset.input
      }}
      onBlurCapture={event => { delete event.target.dataset.input }}
      style={{ '--wheel-max': `${WHEEL_PRESENTATION.stageMaxPx}px`, '--center-size': `max(${WHEEL_PRESENTATION.minimumTargetPx}px, ${WHEEL_PRESENTATION.centerButtonDiameterRatio * 100}%)` } as CSSProperties}>
      <WheelArtwork angleDeg={state.angleDeg} />
      <div className="wheel-surface" ref={surfaceRef} {...pointerEvents}
        tabIndex={0} role="slider" aria-label="Select portfolio section"
        aria-valuemin={0} aria-valuemax={SECTIONS.length - 1} aria-valuenow={state.selectedIndex}
        aria-valuetext={`${selected.label}, ${selected.angleDeg} degrees. Use arrow keys to select and Enter to confirm.`}
        aria-orientation="horizontal" aria-describedby="keyboard-help" onKeyDown={event => onKeyDown(event, true)} />
      <button type="button" className="wheel-center" aria-label={`Confirm ${selected.label}`}
        disabled={!canConfirm} onClick={confirm} onKeyDown={event => onKeyDown(event)} />
    </div>
  )
}
