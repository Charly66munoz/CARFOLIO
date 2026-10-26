import wheel from '../../assets/steering-wheel-transparent-candidate.webp'
import shadow from '../../assets/wheel-shadow.svg'
import { WHEEL_PRESENTATION } from './presentation'

// Shared decoration only. Interaction and rotation state belong to the navigator.
export function WheelArtwork({ angleDeg }: { angleDeg: number }) {
  return <>
    <div className="wheel-shadow" aria-hidden="true">
      <img src={shadow} alt="" width="570" height="570" />
    </div>
    <div className="wheel-rotor" style={{ transform: `rotate(${angleDeg}deg)` }}>
      <img className="wheel-artwork" src={wheel} alt="" width="1254" height="1254" draggable={false}
        style={{ width: `${WHEEL_PRESENTATION.imageScale * 100}%`, height: `${WHEEL_PRESENTATION.imageScale * 100}%`, transform: `translate(${-100 * WHEEL_PRESENTATION.hubX / WHEEL_PRESENTATION.sourceSizePx}%, ${-100 * WHEEL_PRESENTATION.hubY / WHEEL_PRESENTATION.sourceSizePx}%)` }} />
    </div>
  </>
}
