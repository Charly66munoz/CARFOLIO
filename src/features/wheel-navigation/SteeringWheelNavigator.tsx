import graphite from '../../assets/atmosphere-graphite.svg'
import silver from '../../assets/atmosphere-silver.svg'
import { HorizontalSectionTrack } from './HorizontalSectionTrack'
import { SteeringWheel } from './SteeringWheel'
import { useWheelNavigation } from './useWheelNavigation'
import { SECTIONS } from './sections'
import type { SectionId } from './sections'
import { WHEEL_PRESENTATION } from './presentation'
import type { Ref } from 'react'

interface SteeringWheelNavigatorProps { onConfirm: (section: SectionId) => void; wheelStageRef?: Ref<HTMLDivElement> }

export function SteeringWheelNavigator({ onConfirm, wheelStageRef }: SteeringWheelNavigatorProps) {
  const navigation = useWheelNavigation(onConfirm)
  const displayIndex = navigation.state.phase === 'armed' || navigation.state.phase === 'dragging' ? navigation.previewIndex : navigation.state.selectedIndex
  const selected = SECTIONS[navigation.state.selectedIndex]
  return (
    <section className="navigator" aria-label="Steering-wheel navigation" aria-describedby="keyboard-help"
      data-angle={navigation.state.angleDeg} data-phase={navigation.state.phase} data-selected-index={navigation.state.selectedIndex}>
      <div className="atmosphere" aria-hidden="true">
        <div className="atmosphere-graphite"><img src={graphite} alt="" width="1136" height="1136" /></div>
        <div className="atmosphere-silver"><img src={silver} alt="" width="630" height="630" /></div>
      </div>
      <HorizontalSectionTrack angleDeg={navigation.state.angleDeg} selectedIndex={navigation.state.selectedIndex} displayIndex={displayIndex}
        activateLabel={navigation.activateLabel} onKeyDown={navigation.onKeyDown} />
      <SteeringWheel {...navigation} stageRef={wheelStageRef} />
      <div className="interaction-hints ">
        <div><span>Rotate the wheel to browse</span></div>
        <div><span>Confirm your destination</span></div>
      </div>
      <div className="navigator-controls">
        <button type="button" aria-label="Previous section" disabled={!navigation.canConfirm} aria-disabled={navigation.state.selectedIndex === 0}
          onClick={() => { if (navigation.state.selectedIndex > 0) navigation.step(-1) }} onKeyDown={event => navigation.onKeyDown(event)}>←</button>
        <button type="button" disabled={!navigation.canConfirm} onClick={navigation.confirm}
          onKeyDown={event => navigation.onKeyDown(event)}>ENTER {selected.label}</button>
        <button type="button" aria-label="Next section" disabled={!navigation.canConfirm} aria-disabled={navigation.state.selectedIndex === SECTIONS.length - 1}
          onClick={() => { if (navigation.state.selectedIndex < SECTIONS.length - 1) navigation.step(1) }} onKeyDown={event => navigation.onKeyDown(event)}>→</button>
      </div>
      <p id="keyboard-help" className="sr-only">Drag {WHEEL_PRESENTATION.dragBandMinInsetPx} to {WHEEL_PRESENTATION.dragBandMaxInsetPx} pixels inside the wheel rim or use arrow keys or the previous and next buttons to select. Enter confirms. Home key selects ABOUT; the HOME section is the middle option. End key selects STACK.</p>
      <p className="sr-only" aria-live="polite">{selected.label} selected. Confirm to enter.</p>
    </section>
  )
}
