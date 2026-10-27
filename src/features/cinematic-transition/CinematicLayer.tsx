import { SECTIONS } from '../wheel-navigation/sections'
import { WheelArtwork } from '../wheel-navigation/WheelArtwork'
import { SPEED_STREAKS } from './speedStreaks'
import type { Ref } from 'react'
import type { CinematicPhase, DestinationId } from './useCinematicTransition'

interface Props {
  state: { phase: CinematicPhase; destination: DestinationId | null }
  proxyRef: Ref<HTMLDivElement>
  dockRef: Ref<HTMLButtonElement>
  streaksRef: Ref<HTMLDivElement>
  onRestore: () => void
}
export function CinematicLayer({ state, proxyRef, dockRef, streaksRef, onRestore }: Props) {
  const angleDeg = SECTIONS.find(section => section.id === state.destination)?.angleDeg ?? 0
  return <div className="cinematic-layer" data-phase={state.phase}>
    <div className="speed-streaks" ref={streaksRef} aria-hidden="true">
      {SPEED_STREAKS.map(([left, top, rotate], index) => <span className="speed-streak" key={index} style={{ left, top, rotate }} />)}
    </div>
    <div className="cinematic-wheel" ref={proxyRef} aria-hidden="true">
      <WheelArtwork angleDeg={angleDeg} />
    </div>
    <button className="floating-wheel-control" type="button" ref={dockRef}
      aria-label="Open portfolio navigation" disabled={state.phase !== 'section'}
      onClick={onRestore} />
  </div>
}
