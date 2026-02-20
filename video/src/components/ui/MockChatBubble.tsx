import React from 'react'
import { useCurrentFrame, spring, useVideoConfig } from 'remotion'
import { COLORS, FONTS } from '../../design/theme'

interface MockChatBubbleProps {
  role: 'user' | 'assistant'
  text: string
  delay?: number
}

export const MockChatBubble: React.FC<MockChatBubbleProps> = ({
  role,
  text,
  delay = 0,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 100 },
  })

  const isUser = role === 'user'

  // Typewriter for assistant: reveal characters progressively
  const framesAfterDelay = Math.max(0, frame - delay)
  const charsToShow = isUser
    ? text.length
    : Math.min(text.length, Math.floor(framesAfterDelay * 1.5))
  const displayText = text.slice(0, charsToShow)

  const opacity = entrance
  const translateY = (1 - entrance) * 16

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        width: '100%',
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          maxWidth: '70%',
          padding: '12px 16px',
          borderRadius: 16,
          borderBottomRightRadius: isUser ? 4 : 16,
          borderBottomLeftRadius: isUser ? 16 : 4,
          backgroundColor: isUser ? COLORS.accent : COLORS.bgMuted,
          fontFamily: FONTS.body,
          fontSize: 14,
          lineHeight: 1.5,
          color: isUser ? '#ffffff' : COLORS.textPrimary,
        }}
      >
        {displayText}
        {/* Blinking cursor for assistant while typing */}
        {!isUser && charsToShow < text.length && (
          <span
            style={{
              opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
              color: COLORS.textMuted,
            }}
          >
            |
          </span>
        )}
      </div>
    </div>
  )
}
