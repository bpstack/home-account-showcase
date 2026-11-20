import React from 'react'
import { interpolate, Easing } from 'remotion'
import { COLORS } from '../../design/theme'

export interface CursorKey {
  frame: number
  x: number
  y: number
}

/**
 * A mouse pointer that glides between keyframes and clicks at the frames in `clicks`
 * (a short press and a ring that fades out).
 */
export const Cursor: React.FC<{
  frame: number
  keys: CursorKey[]
  clicks?: number[]
  appear?: number
  size?: number
}> = ({ frame, keys, clicks = [], appear = keys[0]?.frame ?? 0, size = 26 }) => {
  const frames = keys.map((k) => k.frame)
  const opts = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) } as const
  const x = keys.length > 1 ? interpolate(frame, frames, keys.map((k) => k.x), opts) : keys[0].x
  const y = keys.length > 1 ? interpolate(frame, frames, keys.map((k) => k.y), opts) : keys[0].y
  const visible = interpolate(frame, [appear - 6, appear], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const click = clicks.find((c) => frame >= c && frame < c + 18)
  const t = click === undefined ? 1 : (frame - click) / 18
  const press = click === undefined ? 1 : interpolate(t, [0, 0.2, 0.5], [1, 0.85, 1], { extrapolateRight: 'clamp' })

  return (
    <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', opacity: visible, zIndex: 50 }}>
      {click !== undefined && (
        <div
          style={{
            position: 'absolute',
            left: -22,
            top: -22,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: `2px solid ${COLORS.accent}`,
            transform: `scale(${0.4 + t * 1.1})`,
            opacity: 1 - t,
          }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{ transform: `scale(${press})`, transformOrigin: '3px 2px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
      >
        <path d="M3 2 L3 19 L8 14.5 L11.5 22 L14.5 20.6 L11 13.3 L18 13.3 Z" fill="#fff" stroke="#111" strokeWidth={1.2} strokeLinejoin="round" />
      </svg>
    </div>
  )
}
