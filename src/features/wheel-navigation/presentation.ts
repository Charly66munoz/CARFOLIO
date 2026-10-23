// Source-space hub fitted from twelve points on the circular silver housing.
// Band distances stay in CSS pixels; the calibrated contour follows the artwork.
export const WHEEL_PRESENTATION = {
  stageMaxPx: 526,
  sourceSizePx: 1254,
  hubX: 625.95594,
  hubY: 645.82089,
  imageScale: 0.87,
  dragBandMinInsetPx: 1,
  dragBandMaxInsetPx: 45,
  centerButtonDiameterRatio: 0.22,
  minimumTargetPx: 44,
} as const

// Kept separate from band eligibility for ongoing gestures and confirmation.
export function getHubRadius(stageWidth: number) {
  return Math.max(WHEEL_PRESENTATION.minimumTargetPx, stageWidth * WHEEL_PRESENTATION.centerButtonDiameterRatio) / 2
}
