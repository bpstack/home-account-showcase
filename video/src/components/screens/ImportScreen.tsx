import React from 'react'
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS, alpha } from '../../design/theme'
import { enter, pop, progress } from '../../design/motion'
import { IMPORT_FILE, IMPORT_MAPPING, IMPORT_PREVIEW } from '../../data/demo'
import { Icon } from '../kit/Icon'
import { Button, Money } from '../kit/Primitives'

const fade = (p: number): React.CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * 10}px)` })

const SubTitle: React.FC<{ icon: 'file' | 'layers'; children: React.ReactNode }> = ({ icon, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
    <Icon name={icon} size={16} color={COLORS.accent} />
    {children}
  </div>
)

/**
 * Importar (frontend/app/(private)/import): the bank statement is chosen at `dropAt`, read until
 * `reviewAt`, and then reviewed: what was read, a preview and the category each bank category
 * goes to (proposed by keywords and remembered for next time).
 */
export const ImportScreen: React.FC<{ dropAt: number; reviewAt: number; compact?: boolean }> = ({
  dropAt,
  reviewAt,
  compact = false,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const reading = frame >= dropAt && frame < reviewAt
  const upload = 1 - progress(frame, reviewAt - 4, reviewAt + 4)
  const review = progress(frame, reviewAt, reviewAt + 10)
  const preview = IMPORT_PREVIEW.slice(0, compact ? 3 : 5)
  const mapping = IMPORT_MAPPING.slice(0, compact ? 2 : 3)
  const buttonIn = pop(frame, fps, reviewAt + 50)
  const hover = frame >= reviewAt + 56

  return (
    <div style={{ padding: compact ? 16 : 24, position: 'relative', height: '100%' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 24, borderBottom: `1px solid ${COLORS.line}`, fontSize: 14, marginBottom: 24 }}>
        {['Importar extracto', 'Añadir a mano'].map((t, i) => (
          <div
            key={t}
            style={{
              padding: '10px 2px',
              borderBottom: `2px solid ${i === 0 ? COLORS.accent : 'transparent'}`,
              color: i === 0 ? COLORS.text : COLORS.textSecondary,
              fontWeight: i === 0 ? 500 : 400,
              marginBottom: -1,
            }}
          >
            {t}
          </div>
        ))}
      </div>

      {/* Step 1: choose the file */}
      {upload > 0 && (
        <div style={{ opacity: upload }}>
          <div
            style={{
              borderRadius: 8,
              border: `2px dashed ${frame >= dropAt - 14 ? COLORS.accent : COLORS.line}`,
              backgroundColor: frame >= dropAt - 14 ? alpha(COLORS.accent, 0.05) : COLORS.surface,
              padding: compact ? '48px 20px' : '64px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ marginBottom: 12, color: COLORS.accent, transform: reading ? `rotate(${(frame - dropAt) * 14}deg)` : 'none' }}>
              {reading ? (
                <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth={2} strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <Icon name="upload" size={32} />
              )}
            </div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{reading ? 'Leyendo el archivo…' : 'Elige el extracto de tu banco'}</div>
            <div style={{ marginTop: 4, fontSize: 14, color: COLORS.textSecondary }}>Excel (.xls, .xlsx) o CSV, hasta 5 MB.</div>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: COLORS.textSecondary }}>
              <Icon name="lock" size={14} />
              Se lee en tu navegador y se guarda cifrado
            </div>
          </div>
        </div>
      )}

      {/* Step 2: review */}
      {review > 0 && (
        <div style={{ position: 'absolute', top: compact ? 76 : 88, left: compact ? 16 : 24, right: compact ? 16 : 24, ...fade(review) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textSecondary }}>
              <Icon name="chevronLeft" size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{IMPORT_FILE}</div>
              <div style={{ fontSize: compact ? 12 : 14, color: COLORS.textSecondary }}>
                47 transacciones leídas; 3 ya importadas, no se volverán a guardar
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 24,
              display: 'grid',
              gridTemplateColumns: compact ? 'minmax(0, 1fr)' : 'minmax(0, 1.25fr) minmax(0, 1fr)',
              gap: compact ? 20 : 32,
            }}
          >
            <div>
              <SubTitle icon="file">Vista previa</SubTitle>
              <div style={{ borderRadius: 12, border: `1px solid ${COLORS.line}`, overflow: 'hidden', fontSize: 13 }}>
                <div style={{ display: 'flex', padding: '10px 12px', fontSize: 12, fontWeight: 500, color: COLORS.textSecondary, backgroundColor: alpha('#12161c', 0.5) }}>
                  <span style={{ width: compact ? 80 : 92 }}>Fecha</span>
                  <span style={{ flex: 1 }}>Concepto</span>
                  <span style={{ width: 100, textAlign: 'right' }}>Importe</span>
                </div>
                {preview.map((row, i) => {
                  const p = progress(frame, reviewAt + 8 + i * 4, reviewAt + 18 + i * 4)
                  return (
                    <div
                      key={row.concept}
                      style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderTop: `1px solid ${COLORS.line}`, opacity: p }}
                    >
                      <span style={{ width: compact ? 80 : 92, fontVariantNumeric: 'tabular-nums', color: COLORS.textSecondary }}>{row.date}</span>
                      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>
                        {row.concept}
                      </span>
                      <Money value={row.amount} sign="always" tone="movement" weight={500} style={{ width: 100, textAlign: 'right' }} />
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <SubTitle icon="layers">Categorías</SubTitle>
              <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 12, lineHeight: 1.4 }}>
                Elige en qué subcategoría van las transacciones de cada categoría del banco. Lo recordaremos para la próxima vez.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {mapping.map((m, i) => {
                  const p = progress(frame, reviewAt + 22 + i * 6, reviewAt + 32 + i * 6)
                  const filled = progress(frame, reviewAt + 30 + i * 6, reviewAt + 38 + i * 6)
                  return (
                    <div key={m.bank} style={{ opacity: p }}>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                        {m.bank} ({m.count})
                      </div>
                      <div
                        style={{
                          height: 40,
                          borderRadius: 8,
                          border: `1px solid ${interpolate(filled, [0, 0.5, 1], [0, 1, 0]) > 0.3 ? COLORS.accent : COLORS.line}`,
                          backgroundColor: COLORS.surface,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0 12px',
                          fontSize: 14,
                        }}
                      >
                        <span style={{ opacity: filled }}>{m.target}</span>
                        <Icon name="chevronDown" size={16} color={COLORS.textSecondary} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: compact ? 'stretch' : 'flex-end' }}>
            <div style={{ transform: `scale(${buttonIn})`, opacity: buttonIn, width: compact ? '100%' : undefined }}>
              <Button
                style={{
                  justifyContent: 'center',
                  width: compact ? '100%' : undefined,
                  boxShadow: hover ? `0 0 0 4px ${alpha(COLORS.accent, 0.25)}` : 'none',
                }}
              >
                Importar 44 transacciones nuevas
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* The file being dropped */}
      {frame < dropAt + 6 && (
        <FileChip frame={frame} fps={fps} dropAt={dropAt} compact={compact} />
      )}
    </div>
  )
}

const FileChip: React.FC<{ frame: number; fps: number; dropAt: number; compact: boolean }> = ({ frame, fps, dropAt, compact }) => {
  const fly = enter(frame, fps, dropAt - 28)
  const land = progress(frame, dropAt - 2, dropAt + 6)
  const x = interpolate(fly, [0, 1], [compact ? 260 : 760, compact ? 110 : 360])
  const y = interpolate(fly, [0, 1], [compact ? 520 : 470, compact ? 170 : 190])
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: progress(frame, dropAt - 30, dropAt - 24) * (1 - land),
        transform: `scale(${1 - land * 0.3}) rotate(${(1 - fly) * 6}deg)`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        backgroundColor: COLORS.muted,
        border: `1px solid ${COLORS.line}`,
        boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
        fontSize: 14,
        zIndex: 10,
      }}
    >
      <Icon name="file" size={20} color={COLORS.success} />
      {IMPORT_FILE}
    </div>
  )
}
