import React from 'react'
import { useCurrentFrame, interpolate, useVideoConfig } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

interface BarDataPoint {
  label: string
  income: number
  expense: number
}

interface AnimatedBarChartProps {
  data: BarDataPoint[]
  delay?: number
  width?: number
  height?: number
}

export const AnimatedBarChart: React.FC<AnimatedBarChartProps> = ({
  data,
  delay = 0,
  width = 500,
  height = 250,
}) => {
  const frame = useCurrentFrame()

  const PADDING_LEFT = 50
  const PADDING_RIGHT = 20
  const PADDING_TOP = 10
  const PADDING_BOTTOM = 40
  const LABEL_HEIGHT = 30

  const chartWidth = width - PADDING_LEFT - PADDING_RIGHT
  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM - LABEL_HEIGHT

  // Find max value for scaling
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.income, d.expense)),
    1,
  )

  // Bar sizing
  const groupWidth = chartWidth / data.length
  const barWidth = Math.min(groupWidth * 0.3, 40)
  const barGap = barWidth * 0.25

  // Animation: each group staggers by 5 frames, bars grow over 15 frames
  const BAR_DURATION = 15
  const BAR_STAGGER = 5

  // Y-axis gridlines
  const gridLineCount = 4
  const gridLines = Array.from({ length: gridLineCount }, (_, i) => {
    const fraction = (i + 1) / gridLineCount
    const y = PADDING_TOP + chartHeight * (1 - fraction)
    const value = Math.round(maxValue * fraction)
    return { y, value }
  })

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Baseline */}
      <line
        x1={PADDING_LEFT}
        y1={PADDING_TOP + chartHeight}
        x2={PADDING_LEFT + chartWidth}
        y2={PADDING_TOP + chartHeight}
        stroke={COLORS.bgMuted}
        strokeWidth={1}
      />

      {/* Grid lines and labels */}
      {gridLines.map((gl, i) => (
        <g key={i}>
          <line
            x1={PADDING_LEFT}
            y1={gl.y}
            x2={PADDING_LEFT + chartWidth}
            y2={gl.y}
            stroke={COLORS.bgMuted}
            strokeWidth={0.5}
            opacity={0.5}
          />
          <text
            x={PADDING_LEFT - 8}
            y={gl.y + 4}
            fill={COLORS.textMuted}
            fontSize={10}
            fontFamily={FONTS.mono}
            textAnchor="end"
          >
            {gl.value >= 1000 ? `${(gl.value / 1000).toFixed(1)}k` : gl.value}
          </text>
        </g>
      ))}

      {/* Bar groups */}
      {data.map((d, i) => {
        const groupX = PADDING_LEFT + groupWidth * i + groupWidth / 2
        const groupDelay = delay + i * BAR_STAGGER

        const incomeProgress = interpolate(
          frame,
          [groupDelay, groupDelay + BAR_DURATION],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        )
        const expenseProgress = interpolate(
          frame,
          [groupDelay + 3, groupDelay + 3 + BAR_DURATION],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        )

        const incomeHeight = (d.income / maxValue) * chartHeight * incomeProgress
        const expenseHeight = (d.expense / maxValue) * chartHeight * expenseProgress

        const incomeX = groupX - barWidth - barGap / 2
        const expenseX = groupX + barGap / 2

        const baseY = PADDING_TOP + chartHeight

        // Label fade in
        const labelOpacity = interpolate(
          frame,
          [groupDelay, groupDelay + 10],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        )

        return (
          <g key={i}>
            {/* Income bar */}
            <rect
              x={incomeX}
              y={baseY - incomeHeight}
              width={barWidth}
              height={incomeHeight}
              fill={COLORS.green}
              rx={3}
            />

            {/* Expense bar */}
            <rect
              x={expenseX}
              y={baseY - expenseHeight}
              width={barWidth}
              height={expenseHeight}
              fill={COLORS.red}
              rx={3}
            />

            {/* Label */}
            <text
              x={groupX}
              y={baseY + 20}
              fill={COLORS.textSecondary}
              fontSize={11}
              fontFamily={FONTS.body}
              textAnchor="middle"
              opacity={labelOpacity}
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
