import statusIndicator from './assets/status-indicator.svg'
import { SteeringWheelNavigator } from './features/wheel-navigation/SteeringWheelNavigator'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { SectionId } from './features/wheel-navigation/sections'
import { useCinematicTransition } from './features/cinematic-transition/useCinematicTransition'
import { CinematicLayer } from './features/cinematic-transition/CinematicLayer'
import { SectionPlaceholder } from './features/cinematic-transition/SectionPlaceholder'
import { RaceStartOverlay } from './features/race-start/RaceStartOverlay'

export default function App() {
  const [showIntro, setShowIntro] = useState(() => {
    try {
      const expiresAt = Number(localStorage.getItem('gt3-race-start-expires-at'))
      return !(Number.isFinite(expiresAt) && expiresAt > Date.now())
    } catch { return true }
  })
  const introCompleted = useRef(false)
  const finishIntro = useCallback(() => {
    introCompleted.current = true
    setShowIntro(false)
  }, [])
  const [confirmation, setConfirmation] = useState<{ section: SectionId; count: number } | null>(null)
  const { state, enter, restore, rememberActivation, navigationRef, wheelStageRef, contentRef, proxyRef, dockRef, statusRef, streaksRef } = useCinematicTransition()

  useLayoutEffect(() => {
    if (!showIntro && introCompleted.current) {
      introCompleted.current = false
      navigationRef.current?.querySelector<HTMLButtonElement>('.section-label--active')?.focus({ preventScroll: true })
    }
  }, [showIntro, navigationRef])

  const confirm = (section: SectionId) => {
    if (state.phase !== 'navigation') return
    if (section !== 'home' && !enter(section)) return
    setConfirmation(previous => ({ section, count: (previous?.count ?? 0) + 1 }))
  }

  return (
    <>
      <div inert={showIntro}>
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
      <div className="cinematic-scenes" data-phase={state.phase}>
        <div className="navigation-scene" ref={navigationRef} inert={state.phase !== 'navigation'}
          onClickCapture={rememberActivation} onKeyDownCapture={rememberActivation}>
          <SteeringWheelNavigator wheelStageRef={wheelStageRef} onConfirm={confirm} />
        </div>
        <div className="section-scene" ref={contentRef} inert={state.phase !== 'section'} aria-hidden={state.phase === 'navigation'}>
          {state.destination && <SectionPlaceholder destination={state.destination} />}
        </div>
      </div>
      <p className="confirmation-status" role="status" aria-live="polite" tabIndex={-1} ref={statusRef}>
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
      <CinematicLayer state={state} proxyRef={proxyRef} dockRef={dockRef} streaksRef={streaksRef} onRestore={restore} />
      </div>
      {showIntro && <RaceStartOverlay onComplete={finishIntro} />}
    </>
  )
}
