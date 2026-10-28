import type { ReactNode } from 'react'
import { SectionBackground } from './SectionBackground'

export function InternalSectionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="internal-section-layout">
      <SectionBackground />
      <div className="internal-section-content">{children}</div>
    </div>
  )
}
