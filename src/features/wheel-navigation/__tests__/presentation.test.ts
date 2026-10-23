import { describe, expect, it } from 'vitest'
import { getHubRadius, WHEEL_PRESENTATION } from '../presentation'
import { WHEEL_OUTER_CONTOUR } from '../wheelContour'
import { getWheelBandDepth, isWheelDragPoint } from '../wheelHitTest'

// Construct points from contour segments, independently of the inverse transform under test.
function pointOnBand(segment: number, inset: number, width: number, angle: number) {
  const [ax, ay] = WHEEL_OUTER_CONTOUR[segment]
  const [bx, by] = WHEEL_OUTER_CONTOUR[(segment + 1) % WHEEL_OUTER_CONTOUR.length]
  const scale = width * WHEEL_PRESENTATION.imageScale / WHEEL_PRESENTATION.sourceSizePx
  const length = Math.hypot(bx - ax, by - ay)
  const x = ((ax + bx) / 2 - WHEEL_PRESENTATION.hubX) * scale - (by - ay) / length * inset
  const y = ((ay + by) / 2 - WHEEL_PRESENTATION.hubY) * scale + (bx - ax) / length * inset
  const a = angle * Math.PI / 180
  return { x: 125 + x * Math.cos(a) - y * Math.sin(a), y: 250 + x * Math.sin(a) + y * Math.cos(a) }
}
const center = { x: 125, y: 250 }

describe('visible-edge band in CSS pixels', () => {
  it.each([273, 400, 526])('keeps fixed insets across rotations at stage width %s', width => {
    const { dragBandMinInsetPx: minInset, dragBandMaxInsetPx: maxInset } = WHEEL_PRESENTATION
    for (const angle of [-36, -18, 0, 18, 36]) {
      for (const segment of [0, 45, 90, 135, 180, 225, 270, 315]) {
        for (const inset of [minInset, 3, 8, 11, 12, 20, (minInset + maxInset) / 2, maxInset - 1, maxInset]) {
          const point = pointOnBand(segment, inset, width, angle)
          expect(isWheelDragPoint(point, center, width, angle), JSON.stringify({ width, angle, segment, inset })).toBe(true)
        }
        for (const inset of [-1, 0, minInset / 2, maxInset + 1, maxInset + 5]) {
          expect(isWheelDragPoint(pointOnBand(segment, inset, width, angle), center, width, angle)).toBe(false)
        }
      }
    }
  })

  it('excludes the hub and interior openings and preserves an independent center guard', () => {
    expect(getHubRadius(526)).toBeCloseTo(57.86)
    expect(getHubRadius(100)).toBe(22)
    expect(isWheelDragPoint(center, center, 526, 0)).toBe(false)
    expect(isWheelDragPoint({ x: 125, y: 150 }, center, 526, 0)).toBe(false)
    expect(getWheelBandDepth({ x: 125, y: 150 }, center, 526, 0)).toBeGreaterThan(11)
    expect(isWheelDragPoint(center, center, 0, 0)).toBe(false)
  })
})
