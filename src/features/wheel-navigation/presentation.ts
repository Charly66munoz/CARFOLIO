// Source-space hub fitted from twelve points on the circular silver housing.
// The interaction circle is independent of artwork alpha and rotation.
export const WHEEL_PRESENTATION = {
  stageMaxPx: 526,
  sourceSizePx: 1254,
  hubX: 625.95594,
  hubY: 645.82089,
  imageScale: 0.87,
  dragRadiusRatio: 0.37,
  centerButtonDiameterRatio: 0.22,
  minimumTargetPx: 44,
} as const

// The inscribed outer circle stays inside the artwork at every rotation.
export function getDragBounds(stageWidth: number) {
  const inner = Math.max(WHEEL_PRESENTATION.minimumTargetPx, stageWidth * WHEEL_PRESENTATION.centerButtonDiameterRatio) / 2
  return { inner, outer: stageWidth * WHEEL_PRESENTATION.dragRadiusRatio }
}
