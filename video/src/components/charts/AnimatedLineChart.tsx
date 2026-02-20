import React, { useMemo } from 'react'
import { useCurrentFrame, interpolate, useVideoConfig } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

interface AnimatedLineChartProps {
  points: number[]
  color?: string
  delay?: number
  width?: number
  height?: number
  showGradient?: boolean
}

export const AnimatedLineChart: React.FC<AnimatedLineChartProps> = ({
  points,
  color = COLORS.accent,
  delay = 0,
  width = 500,
  height = 200,
  showGradient = true,
}) => {
  const frame = useCurrentFrame()

  const PADDING_LEFT = 10
  const PADDING_RIGHT = 10
  const PADDING_TOP = 10
  const PADDING_BOTTOM = 10

  const chartWidth = width - PADDING_LEFT - PADDING_RIGHT
  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM

  const minVal = Math.min(...points)
  const maxVal = Math.max(...points)
  const range = maxVal - minVal || 1

  // Build SVG path and area path
  const { linePath, areaPath, totalLength } = useMemo(() => {
    if (points.length < 2) {
      return { linePath: '', areaPath: '', totalLength: 0 }
    }

    const coords = points.map((val, i) => {
      const x = PADDING_LEFT + (i / (points.length - 1)) * chartWidth
      const y = PADDING_TOP + chartHeight - ((val - minVal) / range) * chartHeight
      return { x, y }
    })

    // Build smooth cubic bezier path using Catmull-Rom to Bezier conversion
    let line = `M ${coords[0].x} ${coords[0].y}`
    let len = 0

    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[Math.max(0, i - 1)]
      const p1 = coords[i]
      const p2 = coords[i + 1]
      const p3 = coords[Math.min(coords.length - 1, i + 2)]

      // Tension factor
      const t = 0.3

      const cp1x = p1.x + (p2.x - p0.x) * t
      const cp1y = p1.y + (p2.y - p0.y) * t
      const cp2x = p2.x - (p3.x - p1.x) * t
      const cp2y = p2.y - (p3.y - p1.y) * t

      line += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`

      // Approximate segment length
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      len += Math.sqrt(dx * dx + dy * dy)
    }

    // Area path for gradient fill: line path + close along bottom
    const lastCoord = coords[coords.length - 1]
    const firstCoord = coords[0]
    const baseY = PADDING_TOP + chartHeight
    const area = `${line} L ${lastCoord.x} ${baseY} L ${firstCoord.x} ${baseY} Z`

    return { linePath: line, areaPath: area, totalLength: len }
  }, [points, chartWidth, chartHeight, minVal, range])

  if (points.length < 2) return null

  // Animate over 30 frames
  const DRAW_DURATION = 30

  const drawProgress = interpolate(
    frame,
    [delay, delay + DRAW_DURATION],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  // Use a large enough dasharray value to cover the full path
  const dashTotal = totalLength * 1.1
  const dashOffset = dashTotal * (1 - drawProgress)

  // Gradient opacity fades in after line is partially drawn
  const gradientOpacity = interpolate(
    frame,
    [delay + DRAW_DURATION * 0.3, delay + DRAW_DURATION],
    [0, 0.15],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  const gradientId = `line-gradient-${color.replace('#', '')}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={1} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Gradient fill area */}
      {showGradient && (
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
          opacity={gradientOpacity}
        />
      )}

      {/* Animated line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashTotal}
        strokeDashoffset={dashOffset}
      />

      {/* Dot at the current draw position */}
      {drawProgress > 0 && (() => {
        // Place dot at the progress point along the path
        const pointIndex = Math.min(
          Math.floor(drawProgress * (points.length - 1)),
          points.length - 1,
        )
        const x = PADDING_LEFT + (pointIndex / (points.length - 1)) * chartWidth
        const y =
          PADDING_TOP +
          chartHeight -
          ((points[pointIndex] - minVal) / range) * chartHeight

        const dotOpacity = interpolate(
          frame,
          [delay, delay + 5],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        )

        return (
          <circle
            cx={x}
            cy={y}
            r={4}
            fill={color}
            opacity={dotOpacity}
          />
        )
      })()}
    </svg>
  )
}
