import { SECTIONS } from '../wheel-navigation/sections'
import type { DestinationId } from './useCinematicTransition'

export function SectionPlaceholder({ destination }: { destination: DestinationId }) {
  const section = SECTIONS.find(section => section.id === destination)!
  return <section className="destination-placeholder" aria-labelledby="destination-heading">
    <p className="destination-eyebrow">{String(SECTIONS.indexOf(section) + 1).padStart(2, '0')} / 05 — AGUSTÍN LÓPEZ</p>
    <h2 id="destination-heading" tabIndex={-1}>{section.label}</h2>
    <div className="destination-rule" aria-hidden="true" />
    <p className="destination-description">A space for {section.label.toLowerCase()}.</p>
    <p className="destination-hint">Use the wheel to return to navigation.</p>
  </section>
}
