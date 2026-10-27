import type { gsap } from 'gsap'

export const SPEED_STREAKS = [
  ['20%', '23%', '-18deg'], ['58%', '17%', '16deg'],
  ['7%', '52%', '-4deg'], ['67%', '58%', '8deg'],
  ['26%', '79%', '22deg'], ['61%', '83%', '-20deg'],
] as const

export function addSpeedStreaks(motion: ReturnType<typeof gsap.timeline>, streaks: HTMLCollection) {
  motion.fromTo(streaks, { autoAlpha: 0, x: 0, scaleX: 0.4, filter: 'blur(0px)' },
    { autoAlpha: 0.32, duration: 0.3, stagger: 0.02, ease: 'power1.in' }, 0.12)
    .to(streaks, { x: (index: number) => index % 2 ? 280 : -260, scaleX: 1.9, filter: 'blur(1.2px)', duration: 0.65, stagger: 0.02, ease: 'power2.in' }, 0.22)
    .to(streaks, { autoAlpha: 0, duration: 0.45, stagger: 0.02, ease: 'power2.out' }, 0.95)
}
