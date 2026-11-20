import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS } from '../../design/theme'
import { enter, pop, progress } from '../../design/motion'
import { CHAT } from '../../data/demo'
import { Icon } from '../kit/Icon'
import { Button } from '../kit/Primitives'

/** Renders "**bold**" segments of a string, cut to its first `chars` characters. */
const Rich: React.FC<{ text: string; chars: number }> = ({ text, chars }) => {
  const parts = text.split('**')
  let left = chars
  return (
    <>
      {parts.map((part, i) => {
        if (left <= 0) return null
        const shown = part.slice(0, left)
        left -= part.length
        return i % 2 === 1 ? (
          <strong key={i} style={{ fontWeight: 700 }}>
            {shown}
          </strong>
        ) : (
          <span key={i}>{shown}</span>
        )
      })}
    </>
  )
}

const plainLength = (text: string) => text.replace(/\*\*/g, '').length

/**
 * The AI advisor (frontend/components/investment/AIChat.tsx) in its sheet: the question goes in
 * at `askAt`, "El asesor está escribiendo…" shows until `answerAt`, then the answer streams in.
 */
export const ChatPanel: React.FC<{
  askAt: number
  answerAt: number
  charsPerFrame?: number
  /** Show the question being typed into the box before it is sent */
  typeQuestion?: boolean
}> = ({ askAt, answerAt, charsPerFrame = 4, typeQuestion = true }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const typeStart = askAt - 26
  const typed = typeQuestion
    ? Math.floor(progress(frame, typeStart, askAt - 4) * CHAT.question.length)
    : 0
  const sent = frame >= askAt
  const userIn = enter(frame, fps, askAt)
  const typing = frame >= askAt + 4 && frame < answerAt
  const answerIn = enter(frame, fps, answerAt)

  const budget = Math.max(0, (frame - answerAt) * charsPerFrame)
  const total = CHAT.answer.reduce((s, item) => s + plainLength(item.text), 0)
  const done = budget >= total
  let remaining = budget

  const bubble: React.CSSProperties = { maxWidth: '88%', borderRadius: 12, padding: '8px 12px', fontSize: 14, lineHeight: 1.5 }
  const meta: React.CSSProperties = { marginTop: 4, fontSize: 12, color: COLORS.textSecondary }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: COLORS.surface, color: COLORS.text }}>
      {/* Sheet header */}
      <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 0 20px', borderBottom: `1px solid ${COLORS.line}` }}>
        <span style={{ fontSize: 16, fontWeight: 500 }}>Asesor IA</span>
        <Icon name="x" size={20} color={COLORS.textSecondary} />
      </div>
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: `1px solid ${COLORS.line}` }}>
        <Button variant="ghost" size="sm" icon="history">Conversaciones</Button>
        <Button variant="ghost" size="sm" icon="plus">Nueva</Button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!sent && (
          <div style={{ fontSize: 14 }}>
            Pregunta sobre conceptos, mercados o cómo repartir tu ahorro.
          </div>
        )}
        {sent && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', opacity: userIn, transform: `translateY(${(1 - userIn) * 12}px)` }}>
            <div style={{ ...bubble, backgroundColor: COLORS.accent, color: COLORS.accentInk }}>{CHAT.question}</div>
            <span style={meta}>Tú · ahora</span>
          </div>
        )}
        {typing && <div style={{ fontSize: 14, color: COLORS.textSecondary }}>El asesor está escribiendo…</div>}
        {frame >= answerAt && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', opacity: answerIn, transform: `translateY(${(1 - answerIn) * 12}px)` }}>
            <div style={{ ...bubble, backgroundColor: COLORS.bg, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CHAT.answer.map((item, i) => {
                if (remaining <= 0) return null
                const chars = remaining
                remaining -= plainLength(item.text)
                return item.kind === 'li' ? (
                  <div key={i} style={{ display: 'flex', gap: 8, paddingLeft: 4 }}>
                    <span style={{ color: COLORS.textSecondary }}>•</span>
                    <span>
                      <Rich text={item.text} chars={chars} />
                    </span>
                  </div>
                ) : (
                  <div key={i}>
                    <Rich text={item.text} chars={chars} />
                  </div>
                )
              })}
            </div>
            {done && <span style={meta}>Asesor · ahora</span>}
          </div>
        )}
        {(!sent || done) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CHAT.quickQuestions.map((q, i) => {
              const s = sent ? pop(frame, fps, answerAt + Math.ceil(total / charsPerFrame) + 4 + i * 3) : 1
              return (
                <div key={q} style={{ transform: `scale(${s})`, opacity: s }}>
                  <Button variant="outline" size="sm">{q}</Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: 16, borderTop: `1px solid ${COLORS.line}` }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: 8,
              border: `1px solid ${typed > 0 && !sent ? COLORS.accent : COLORS.line}`,
              backgroundColor: COLORS.bg,
              padding: '9px 12px',
              fontSize: 14,
              lineHeight: 1.5,
              color: typed > 0 && !sent ? COLORS.text : COLORS.textSecondary,
            }}
          >
            {typed > 0 && !sent ? CHAT.question.slice(0, typed) : 'Escribe tu pregunta'}
            {typed > 0 && !sent && <span style={{ color: COLORS.accent }}>|</span>}
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: COLORS.accent, color: COLORS.accentInk, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="send" size={16} />
          </div>
        </div>
        <div style={{ marginTop: 6, textAlign: 'right', fontSize: 12, color: COLORS.textSecondary }}>
          {typed > 0 && !sent ? typed : 0} / 2.000
        </div>
      </div>
    </div>
  )
}
