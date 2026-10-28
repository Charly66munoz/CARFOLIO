import statusIndicator from './assets/status-indicator.svg'
import { SteeringWheelNavigator } from './features/wheel-navigation/SteeringWheelNavigator'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { SectionId } from './features/wheel-navigation/sections'
import { useCinematicTransition } from './features/cinematic-transition/useCinematicTransition'
import { CinematicLayer } from './features/cinematic-transition/CinematicLayer'
import { SectionPlaceholder } from './features/cinematic-transition/SectionPlaceholder'
import { RaceStartOverlay } from './features/race-start/RaceStartOverlay'
import { InternalSectionLayout } from './features/internal-sections/InternalSectionLayout'
import { AboutSection } from './features/about/AboutSection'

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
  const [, setConfirmation] = useState<{ section: SectionId; count: number } | null>(null)
  const { state, enter, restore, rememberActivation, navigationRef, wheelStageRef, contentRef, proxyRef, dockRef, streaksRef } = useCinematicTransition()

  const getYear = new Date().getFullYear();

  useLayoutEffect(() => {
    if (!showIntro && introCompleted.current) {
      introCompleted.current = false
      navigationRef.current?.querySelector<HTMLButtonElement>('.section-label--active')?.focus({ preventScroll: true })
    }
  }, [showIntro, navigationRef])

  useLayoutEffect(() => {
    // Wait for travel to finish; the controller retains HOME's scroll for return.
    if (state.phase === 'section' && state.destination === 'about') {
      window.scrollTo({ left: 0, top: 0, behavior: 'instant' })
    }
  }, [state.phase, state.destination])

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
            <div className="identity mb-0.5">
              <span className="monogram" aria-hidden="true">
                AL
              </span>
              <div>
                <h1>AGUSTÍN LÓPEZ</h1>
                <p>SOFTWARE DEVELOPER</p>
              </div>
            </div>
            <p className="availability ">
              <span>OPEN TO WORK</span>
              <img src={statusIndicator} alt="" width="7" height="7" />
              <span className="hidden md:flex">{getYear}</span>
            </p>
          </header>
          <div className="cinematic-scenes" data-phase={state.phase}>
            <div
              className="navigation-scene"
              ref={navigationRef}
              inert={state.phase !== "navigation"}
              onClickCapture={rememberActivation}
              onKeyDownCapture={rememberActivation}
            >
              <SteeringWheelNavigator
                wheelStageRef={wheelStageRef}
                onConfirm={confirm}
              />
            </div>
            <div
              className="section-scene"
              ref={contentRef}
              inert={state.phase !== "section"}
              aria-hidden={state.phase === "navigation"}
            >
              {state.destination === "about" ? (
                <InternalSectionLayout>
                  <AboutSection />
                </InternalSectionLayout>
              ) : (
                state.destination && (
                  <SectionPlaceholder destination={state.destination} />
                )
              )}
            </div>
          </div>

          <footer className="site-footer text-silver">
            <p>DESIGNED TO MOVE.</p>
            {/* Contact destinations have not been supplied. Keep the reference text static. */}
            <p className="contact-labels">
              GIT <span>/</span> LIN <span>/</span> EMAIL
            </p>
          </footer>
        </main>
        <CinematicLayer
          state={state}
          proxyRef={proxyRef}
          dockRef={dockRef}
          streaksRef={streaksRef}
          onRestore={restore}
        />
      </div>
      {showIntro && <RaceStartOverlay onComplete={finishIntro} />}
    </>
  );
}
