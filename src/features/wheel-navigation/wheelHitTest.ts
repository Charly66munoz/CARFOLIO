import { getHubRadius, WHEEL_PRESENTATION } from './presentation'
import { WHEEL_OUTER_CONTOUR } from './wheelContour'

interface Point { x: number; y: number }

/** Signed shortest distance from the calibrated outer contour, in CSS pixels. */
export function getWheelBandDepth(point: Point, center: Point, stageWidth: number, angleDeg: number): number {
  if (stageWidth <= 0) return -Infinity
  const scale = stageWidth * WHEEL_PRESENTATION.imageScale / WHEEL_PRESENTATION.sourceSizePx
  const angle = -angleDeg * Math.PI / 180
  const dx = point.x - center.x, dy = point.y - center.y
  const x = (dx * Math.cos(angle) - dy * Math.sin(angle)) / scale + WHEEL_PRESENTATION.hubX
  const y = (dx * Math.sin(angle) + dy * Math.cos(angle)) / scale + WHEEL_PRESENTATION.hubY
  let inside = false, distanceSquared = Infinity
  for (let i = 0, j = WHEEL_OUTER_CONTOUR.length - 1; i < WHEEL_OUTER_CONTOUR.length; j = i++) {
    const [ax, ay] = WHEEL_OUTER_CONTOUR[j], [bx, by] = WHEEL_OUTER_CONTOUR[i]
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside
    const vx = bx - ax, vy = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)))
    distanceSquared = Math.min(distanceSquared, (x - ax - t * vx) ** 2 + (y - ay - t * vy) ** 2)
  }
  return Math.sqrt(distanceSquared) * scale * (inside ? 1 : -1)
}

export function isWheelDragPoint(point: Point, center: Point, stageWidth: number, angleDeg: number): boolean {
  if (Math.hypot(point.x - center.x, point.y - center.y) <= getHubRadius(stageWidth)) return false
  const depth = getWheelBandDepth(point, center, stageWidth, angleDeg)
  // Absorb subpixel browser event rounding at inclusive endpoints (0.0001 CSS px).
  return depth >= WHEEL_PRESENTATION.dragBandMinInsetPx - 1e-4
    && depth <= WHEEL_PRESENTATION.dragBandMaxInsetPx + 1e-4
}
