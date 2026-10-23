import { describe, expect, it } from 'vitest'
import { getDragBounds } from '../presentation'
import { isPointInAnnulus } from '../wheelMath'

describe('broad circular drag area excluding the confirmation hub', () => {
  it.each([273, 400, 526])('scales to the wheel at %s CSS pixels', width => {
    const bounds = getDragBounds(width)
    for (const ratio of [0.15, 0.25, 0.36]) {
      expect(isPointInAnnulus({ x: width * ratio, y: 0 }, { x: 0, y: 0 }, bounds.inner, bounds.outer)).toBe(true)
    }
    expect(bounds.inner).toBe(Math.max(44, width * 0.22) / 2)
    expect(isPointInAnnulus({ x: bounds.inner - 1, y: 0 }, { x: 0, y: 0 }, bounds.inner, bounds.outer)).toBe(false)
    expect(isPointInAnnulus({ x: bounds.outer + 1, y: 0 }, { x: 0, y: 0 }, bounds.inner, bounds.outer)).toBe(false)
  })
})
