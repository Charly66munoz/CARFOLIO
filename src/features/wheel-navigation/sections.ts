export const SECTIONS = [
  { id: 'about', label: 'ABOUT', angleDeg: -36 },
  { id: 'experience', label: 'EXPERIENCE', angleDeg: -18 },
  { id: 'home', label: 'HOME', angleDeg: 0 },
  { id: 'projects', label: 'PROJECTS', angleDeg: 18 },
  { id: 'stack', label: 'STACK', angleDeg: 36 },
] as const

export type SectionId = (typeof SECTIONS)[number]['id']
export const HOME_INDEX = SECTIONS.findIndex(section => section.id === 'home')
export const HOME_ANGLE_DEG = SECTIONS[HOME_INDEX].angleDeg
export const MIN_WHEEL_ANGLE_DEG = SECTIONS[0].angleDeg
export const MAX_WHEEL_ANGLE_DEG = SECTIONS[SECTIONS.length - 1].angleDeg
export const SECTION_STEP_DEG = SECTIONS[HOME_INDEX + 1].angleDeg - HOME_ANGLE_DEG
