import {
  HOME_ANGLE_DEG,
  HOME_INDEX,
  MAX_WHEEL_ANGLE_DEG,
  MIN_WHEEL_ANGLE_DEG,
  SECTIONS,
  SECTION_STEP_DEG,
} from './sections'

interface Point {
  x: number
  y: number
}

export function clampWheelAngle(angleDeg: number): number {
  return Math.max(MIN_WHEEL_ANGLE_DEG, Math.min(MAX_WHEEL_ANGLE_DEG, angleDeg))
}

/** Signed shortest difference in (-180, 180]; an exact half-turn is positive. */
export function normalizeAngleDelta(deltaDeg: number): number {
  const remainder = deltaDeg % 360
  if (remainder <= -180) return remainder + 360
  if (remainder > 180) return remainder - 360
  return remainder === 0 ? 0 : remainder
}

/** Screen coordinates: positive angles advance clockwise. */
export function getPointerAngle(point: Point, center: Point): number {
  return Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI
}

/** The controller must retain the latest polar sample, including at a limit. */
export function advanceWheelAngle(angleDeg: number, previousPolarDeg: number, currentPolarDeg: number): number {
  return clampWheelAngle(angleDeg + normalizeAngleDelta(currentPolarDeg - previousPolarDeg))
}

export function nearestSectionIndex(angleDeg: number): number {
  let nearestIndex = HOME_INDEX
  for (let index = 0; index < SECTIONS.length; index++) {
    const candidate = SECTIONS[index].angleDeg
    const nearest = SECTIONS[nearestIndex].angleDeg
    const candidateDistance = Math.abs(candidate - angleDeg)
    const nearestDistance = Math.abs(nearest - angleDeg)
    if (candidateDistance < nearestDistance || (
      candidateDistance === nearestDistance
      && Math.abs(candidate - HOME_ANGLE_DEG) < Math.abs(nearest - HOME_ANGLE_DEG)
    )) {
      nearestIndex = index
    }
  }
  return nearestIndex
}

/** Radii are measured by presentation; this does not certify artwork calibration. */
export function isPointInAnnulus(point: Point, center: Point, innerRadius: number, outerRadius: number): boolean {
  const distance = Math.hypot(point.x - center.x, point.y - center.y)
  return innerRadius >= 0 && outerRadius >= innerRadius
    && distance >= innerRadius && distance <= outerRadius
}

export function getFractionalIndex(angleDeg: number): number {
  return HOME_INDEX + (angleDeg - HOME_ANGLE_DEG) / SECTION_STEP_DEG
}

/** Direct position for equal-width slots; no independent track interpolation. */
export function getTrackX(angleDeg: number, viewportWidth: number, slotWidth: number): number {
  return viewportWidth / 2 - (getFractionalIndex(angleDeg) + 0.5) * slotWidth
}
