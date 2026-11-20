import { interpolate, spring } from 'remotion'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** 0 → 1 between two frames, clamped. */
export const progress = (frame: number, from: number, to: number): number =>
  interpolate(frame, [from, to], [0, 1], clamp)

/** Scene opacity: fades in over `fadeIn` frames and out over the last `fadeOut`. */
export const sceneFade = (frame: number, duration: number, fadeIn = 12, fadeOut = 14): number =>
  interpolate(frame, [0, fadeIn, duration - fadeOut, duration], [0, 1, 1, 0], clamp)

/** A calm entrance spring, without overshoot. */
export const enter = (frame: number, fps: number, delay = 0): number =>
  spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 120, mass: 0.8 } })

/** A softer spring with a little life, for things that pop (chips, buttons). */
export const pop = (frame: number, fps: number, delay = 0): number =>
  spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 160, mass: 0.6 } })

/** Eases a number up to its target between two frames (figures counting up). */
export const countUp = (frame: number, from: number, to: number, value: number): number => {
  const t = progress(frame, from, to)
  const eased = 1 - Math.pow(1 - t, 3)
  return value * eased
}
