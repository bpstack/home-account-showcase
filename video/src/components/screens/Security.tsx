import React from 'react'
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS, FONTS, alpha } from '../../design/theme'
import { enter, pop, progress } from '../../design/motion'
import { RECOVERY_WORDS } from '../../data/demo'
import { Pill } from '../kit/Primitives'

/** A padlock that closes at `closeAt`, with rings spreading out from it. */
export const Padlock: React.FC<{ size?: number; closeAt?: number }> = ({ size = 160, closeAt = 26 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const appear = pop(frame, fps, 4)
  const close = progress(frame, closeAt, closeAt + 10)
  const shackle = 30 - close * 10

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {[0, 1, 2].map((i) => {
        const p = progress(frame, closeAt + 8 + i * 12, closeAt + 44 + i * 12)
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `2px solid ${COLORS.accent}`,
              transform: `scale(${1 + p * 1.6})`,
              opacity: (1 - p) * 0.45 * (p > 0 ? 1 : 0),
            }}
          />
        )
      })}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          backgroundColor: alpha(COLORS.accent, 0.1),
          border: `1px solid ${alpha(COLORS.accent, 0.35)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${appear})`,
        }}
      >
        <svg width={size * 0.45} height={size * 0.55} viewBox="0 0 80 100">
          <path
            d={`M 22 46 L 22 ${shackle + 10} A 18 18 0 0 1 58 ${shackle + 10} L 58 ${46 - (1 - close) * 14}`}
            fill="none"
            stroke={COLORS.accent}
            strokeWidth={8}
            strokeLinecap="round"
          />
          <rect x={10} y={44} width={60} height={48} rx={10} fill={COLORS.accent} />
          <circle cx={40} cy={63} r={6} fill={COLORS.bg} />
          <rect x={37} y={63} width={6} height={14} rx={3} fill={COLORS.bg} />
        </svg>
      </div>
    </div>
  )
}

export const SECURITY_BADGES = ['AES-256-GCM', 'Argon2id', 'BIP39']

export const SecurityBadges: React.FC<{ start: number; size?: number; column?: boolean }> = ({ start, size = 18, column = false }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return (
    <div style={{ display: 'flex', flexDirection: column ? 'column' : 'row', gap: size * 0.7, alignItems: 'center' }}>
      {SECURITY_BADGES.map((b, i) => {
        const s = pop(frame, fps, start + i * 5)
        return (
          <div key={b} style={{ transform: `scale(${s})`, opacity: Math.min(1, s) }}>
            <Pill size={size} color={i === 0 ? COLORS.accent : COLORS.textSecondary} style={{ fontFamily: FONTS.mono, fontWeight: 700 }}>
              {b}
            </Pill>
          </div>
        )
      })}
    </div>
  )
}

/**
 * The recovery phrase as the app shows it (frontend/components/auth/RecoveryPhrase.tsx): the 24
 * words numbered in a bordered grid. They show up one after another from `start`.
 */
export const RecoveryPhrase: React.FC<{ start: number; columns?: number; scale?: number }> = ({ start, columns = 3, scale = 1 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const panel = enter(frame, fps, start - 8)
  return (
    <div
      style={{
        width: 440 * scale,
        borderRadius: 12 * scale,
        border: `1px solid ${COLORS.line}`,
        backgroundColor: COLORS.surface,
        padding: 24 * scale,
        opacity: panel,
        transform: `translateY(${(1 - panel) * 20}px)`,
      }}
    >
      <div style={{ fontSize: 20 * scale, fontWeight: 500 }}>Tu frase de recuperación</div>
      <div style={{ marginTop: 4 * scale, fontSize: 14 * scale, color: COLORS.textSecondary, lineHeight: 1.4 }}>
        Si olvidas la contraseña, estas 24 palabras te devuelven tus datos.
      </div>
      <div
        style={{
          marginTop: 16 * scale,
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          columnGap: 16 * scale,
          rowGap: 8 * scale,
          padding: 16 * scale,
          borderRadius: 8 * scale,
          border: `1px solid ${COLORS.line}`,
          backgroundColor: COLORS.bg,
        }}
      >
        {RECOVERY_WORDS.map((word, i) => {
          const p = interpolate(frame, [start + i * 1.6, start + i * 1.6 + 6], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          return (
            <div key={word} style={{ display: 'flex', gap: 8 * scale, fontSize: 15 * scale, fontFamily: FONTS.mono, opacity: 0.25 + p * 0.75 }}>
              <span style={{ width: 20 * scale, textAlign: 'right', color: COLORS.textSecondary }}>{i + 1}</span>
              <span style={{ color: COLORS.text }}>{p > 0.5 ? word : '••••'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
