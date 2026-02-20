import React from 'react'
import { useCurrentFrame, interpolate, useVideoConfig } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

interface PieSegment {
  value: number
  color: string
  label?: string
}

interface AnimatedPieChartProps {
  segments: PieSegment[]
  size?: number
  delay?: number
  strokeWidth?: number
  centerLabel?: string
  showTotal?: boolean
}

export const AnimatedPieChart: React.FC<AnimatedPieChartProps> = ({
  segments,
  size = 200,
  delay = 0,
  strokeWidth = 30,
  centerLabel,
  showTotal = false,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const total = segments.reduce((sum, s) => sum + s.value, 0)
  if (total === 0) return null

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  // Each segment gets 15 frames to animate in, staggered by 8 frames
  const SEGMENT_DURATION = 15
  const SEGMENT_STAGGER = 8

  let cumulativeOffset = 0
  const segmentElements = segments.map((segment, i) => {
    const segmentFraction = segment.value / total
    const segmentLength = circumference * segmentFraction
    const gapLength = circumference - segmentLength

    const segmentDelay = delay + i * SEGMENT_STAGGER
    const progress = interpolate(
      frame,
      [segmentDelay, segmentDelay + SEGMENT_DURATION],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    )

    // strokeDasharray: visible portion then gap
    // strokeDashoffset: animate from segmentLength (hidden) to 0 (fully visible)
    const dashOffset = segmentLength * (1 - progress)

    // Rotation to position this segment after previous ones
    // SVG circles start at 3 o'clock, rotate -90 to start at 12 o'clock
    const rotationDeg = (cumulativeOffset / circumference) * 360 - 90
    cumulativeOffset += segmentLength

    return (
      <circle
        key={i}
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={segment.color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${segmentLength} ${gapLength}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="butt"
        style={{
          transform: `rotate(${rotationDeg}deg)`,
          transformOrigin: `${center}px ${center}px`,
        }}
      />
    )
  })

  // Center text fade in
  const centerTextOpacity = interpolate(
    frame,
    [delay + segments.length * SEGMENT_STAGGER, delay + segments.length * SEGMENT_STAGGER + 10],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  const displayText = centerLabel || (showTotal ? total.toLocaleString() : '')

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={COLORS.bgMuted}
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        {segmentElements}
      </svg>
      {displayText && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: centerTextOpacity,
          }}
        >
          <span
            style={{
              color: COLORS.textPrimary,
              fontSize: size * 0.12,
              fontFamily: FONTS.body,
              fontWeight: 600,
            }}
          >
            {displayText}
          </span>
        </div>
      )}
    </div>
  )
}
