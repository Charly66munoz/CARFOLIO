import { describe, expect, it } from 'vitest'
import { HOME_ANGLE_DEG, HOME_INDEX, MAX_WHEEL_ANGLE_DEG, MIN_WHEEL_ANGLE_DEG, SECTIONS, SECTION_STEP_DEG } from '../sections'
import { advanceWheelAngle, clampWheelAngle, getFractionalIndex, getPointerAngle, getTrackX, isPointInAnnulus, nearestSectionIndex, normalizeAngleDelta } from '../wheelMath'

describe('approved section configuration', () => {
  it('preserves all five section IDs, labels, angles and left-to-right order', () => {
    expect(SECTIONS).toEqual([
      { id: 'about', label: 'ABOUT', angleDeg: -36 },
      { id: 'experience', label: 'EXPERIENCE', angleDeg: -18 },
      { id: 'home', label: 'HOME', angleDeg: 0 },
      { id: 'projects', label: 'PROJECTS', angleDeg: 18 },
      { id: 'stack', label: 'STACK', angleDeg: 36 },
    ])
    expect(HOME_INDEX).toBe(2)
    expect(HOME_ANGLE_DEG).toBe(0)
    expect(MIN_WHEEL_ANGLE_DEG).toBe(-36)
    expect(MAX_WHEEL_ANGLE_DEG).toBe(36)
    expect(SECTION_STEP_DEG).toBe(18)
  })
})

describe('angle limits', () => {
  it.each([[-720, -36], [-36, -36], [-12.5, -12.5], [0, 0], [12.5, 12.5], [36, 36], [720, 36]])('clamps %s to %s without wrapping', (angle, expected) => {
    expect(clampWheelAngle(angle)).toBe(expected)
  })
})

describe('signed branch normalization', () => {
  it.each([
    [-1080, 0], [-720, 0], [-540, 180], [-360, 0], [-358, 2],
    [-181, 179], [-180, 180], [-179, -179], [-0, 0], [0, 0],
    [179, 179], [180, 180], [181, -179], [358, -2], [360, 0], [540, 180], [1080, 0],
  ])('normalizes %s to %s', (delta, expected) => {
    expect(normalizeAngleDelta(delta)).toBe(expected)
  })
})

describe('pointer mathematics', () => {
  const center = { x: 300, y: 200 }
  it.each([
    [{ x: 400, y: 200 }, 0], [{ x: 300, y: 300 }, 90],
    [{ x: 200, y: 200 }, 180], [{ x: 300, y: 100 }, -90],
    [{ x: 400, y: 100 }, -45],
  ])('measures screen-coordinate polar angle for %o', (point, expected) => {
    expect(getPointerAngle(point, center)).toBeCloseTo(expected, 10)
  })

  it('turns clockwise from the top toward PROJECTS, then STACK', () => {
    const angle = advanceWheelAngle(0, -90, -72)
    expect(angle).toBe(18)
    expect(SECTIONS[nearestSectionIndex(angle)].id).toBe('projects')
    expect(advanceWheelAngle(angle, -72, -54)).toBe(36)
  })

  it('turns counterclockwise from the top toward EXPERIENCE, then ABOUT', () => {
    const angle = advanceWheelAngle(0, -90, -108)
    expect(angle).toBe(-18)
    expect(SECTIONS[nearestSectionIndex(angle)].id).toBe('experience')
    expect(advanceWheelAngle(angle, -108, -126)).toBe(-36)
  })

  it.each([[179, -179, 2], [-179, 179, -2]])('crosses the polar branch from %s to %s with a small delta', (previous, current, expected) => {
    expect(advanceWheelAngle(0, previous, current)).toBe(expected)
  })

  it.each([-150, -90, 0, 45, 179])('preserves the current wheel angle when grabbed at polar %s', polar => {
    expect(advanceWheelAngle(12.5, polar, polar)).toBe(12.5)
  })

  it.each([1, -1])('discards overshoot and reverses immediately at endpoint direction %s', direction => {
    let angle = direction * 30
    let previousPolar = 0
    for (const polar of [direction * 20, direction * 80, direction * 79]) {
      angle = advanceWheelAngle(angle, previousPolar, polar)
      previousPolar = polar // Retain each real sample, even while clamped.
    }
    expect(angle).toBe(direction * 35)
  })
})

describe('nearest section', () => {
  it.each([[-36, 'about'], [-18, 'experience'], [0, 'home'], [18, 'projects'], [36, 'stack'], [-1000, 'about'], [1000, 'stack']])('maps %s to %s', (angle, expected) => {
    expect(SECTIONS[nearestSectionIndex(angle)].id).toBe(expected)
  })

  it.each([
    [-27.000001, 'about'], [-27, 'experience'], [-26.999999, 'experience'],
    [-9.000001, 'experience'], [-9, 'home'], [-8.999999, 'home'],
    [8.999999, 'home'], [9, 'home'], [9.000001, 'projects'],
    [26.999999, 'projects'], [27, 'projects'], [27.000001, 'stack'],
  ])('resolves midpoint and adjacent angle %s toward %s', (angle, expected) => {
    expect(SECTIONS[nearestSectionIndex(angle)].id).toBe(expected)
  })
})

describe('annular hit testing independent of artwork', () => {
  it.each([288, 400, 526])('includes both rim boundaries and excludes the center and background at stage width %s', width => {
    // These are the plan's provisional ratios, not approved artwork calibration.
    const inner = 0.30 * width
    const outer = 0.41 * width
    const center = { x: 0, y: 0 }
    expect(isPointInAnnulus({ x: inner, y: 0 }, center, inner, outer)).toBe(true)
    expect(isPointInAnnulus({ x: 0, y: -outer }, center, inner, outer)).toBe(true)
    expect(isPointInAnnulus({ x: 0, y: inner - 0.001 }, center, inner, outer)).toBe(false)
    expect(isPointInAnnulus({ x: outer + 0.001, y: 0 }, center, inner, outer)).toBe(false)
    expect(isPointInAnnulus(center, center, inner, outer)).toBe(false)
    expect(isPointInAnnulus({ x: width / 2, y: width / 2 }, center, inner, outer)).toBe(false)
  })

  it('uses the supplied stationary center and accepts a diagonal point on the rim', () => {
    expect(isPointInAnnulus({ x: 130, y: 240 }, { x: 100, y: 200 }, 40, 60)).toBe(true)
    expect(isPointInAnnulus({ x: 130, y: 240 }, { x: 0, y: 0 }, 40, 60)).toBe(false)
  })

  it('rejects negative or reversed radius bounds', () => {
    expect(isPointInAnnulus({ x: 10, y: 0 }, { x: 0, y: 0 }, -1, 20)).toBe(false)
    expect(isPointInAnnulus({ x: 10, y: 0 }, { x: 0, y: 0 }, 20, 5)).toBe(false)
  })
})

describe('direct horizontal track positioning', () => {
  it.each([[-36, 0], [-27, 0.5], [-18, 1], [-9, 1.5], [0, 2], [9, 2.5], [18, 3], [27, 3.5], [36, 4]])('maps angle %s to fractional index %s', (angle, expected) => {
    expect(getFractionalIndex(angle)).toBe(expected)
  })

  it.each([[-36, 595], [-18, 345], [0, 95], [18, -155], [36, -405], [9, -30], [-9, 220]])('positions the desktop track at %s for angle %s', (angle, expected) => {
    expect(getTrackX(angle, 1440, 250)).toBe(expected)
  })

  it.each([[320, 160], [305, 160], [768, 180], [1440, 250]])('centers every valid section for viewport %s and slot %s', (viewport, slot) => {
    for (let index = 0; index < SECTIONS.length; index++) {
      const x = getTrackX(SECTIONS[index].angleDeg, viewport, slot)
      expect(x + index * slot + slot / 2).toBeCloseTo(viewport / 2, 10)
    }
  })

  it('keeps continuous movement between labels and preserves selection across a resize', () => {
    expect(getTrackX(9, 320, 160)).toBe(-320)
    expect(nearestSectionIndex(9)).toBe(HOME_INDEX)
    expect(getTrackX(18, 320, 160)).toBe(-400)
    expect(getTrackX(18, 768, 180)).toBe(-246)
    expect(nearestSectionIndex(18)).toBe(3)
  })
})
