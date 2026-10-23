import statusIndicator from './assets/status-indicator.svg'
import { SteeringWheelNavigator } from './features/wheel-navigation/SteeringWheelNavigator'
import { useState } from 'react'
import type { SectionId } from './features/wheel-navigation/sections'

export default function App() {
  const [confirmation, setConfirmation] = useState<{ section: SectionId; count: number } | null>(null)
  return (
    <main className="portfolio-shell bg-carbon text-ice">
      <header className="site-header">
        <div className="identity mb-1.25">
          <span className="monogram" aria-hidden="true">
            AL
          </span>
          <div>
            <h1>AGUSTÍN LÓPEZ</h1>
            <p>SOFTWARE DEVELOPER</p>
          </div>
        </div>
        <p className="availability ">
          <span>AVAILABLE FOR WORK</span>
          <img src={statusIndicator} alt="" width="7" height="7" />
          <span>2026</span>
        </p>
      </header>
      <SteeringWheelNavigator
        onConfirm={(section) =>
          setConfirmation((previous) => ({
            section,
            count: (previous?.count ?? 0) + 1,
          }))
        }
      />
      <p className="confirmation-status" role="status" aria-live="polite">
        {confirmation
          ? `${confirmation.section.toUpperCase()} confirmed · ${confirmation.count}`
          : "Select a section, then confirm to enter."}
      </p>
      <footer className="site-footer text-silver">
        <p>DESIGNED TO MOVE.</p>
        {/* Contact destinations have not been supplied. Keep the reference text static. */}
        <p className="contact-labels">
          GITHUB <span>/</span> LINKEDIN <span>/</span> EMAIL
        </p>
      </footer>
    </main>
  );
}
