import { describe, expect, it } from 'vitest'
import { parseChatText, parseInline } from './chat-markdown'

describe('parseInline', () => {
  it('bold and code become marked pieces, without their markers', () => {
    expect(parseInline('Un **ETF** cotiza como `IWDA`.')).toEqual([
      { text: 'Un ' },
      { text: 'ETF', bold: true },
      { text: ' cotiza como ' },
      { text: 'IWDA', code: true },
      { text: '.' },
    ])
  })

  it('single-star or underscore emphasis loses its markers', () => {
    expect(parseInline('es *muy* importante y _clave_.')).toEqual([
      { text: 'es muy importante y clave.' },
    ])
  })

  it('a lone asterisk is left alone', () => {
    expect(parseInline('5 * 3 = 15')).toEqual([{ text: '5 * 3 = 15' }])
  })

  it('markup-looking text stays text', () => {
    expect(parseInline('<script>alert(1)</script>')).toEqual([
      { text: '<script>alert(1)</script>' },
    ])
  })
})

describe('parseChatText', () => {
  it('the reply that showed raw markdown in the chat', () => {
    const reply = [
      'Dos tipos:',
      '',
      '- **ETF de acumulación**: reinvierte.',
      '- **ETF de distribución**: reparte.',
      '',
      '**Aspectos a considerar**:',
      '',
      '1. **Fiscalidad**: depende del país.',
      '',
      '2. **Objetivo**: crecer o cobrar.',
    ].join('\n')
    expect(parseChatText(reply)).toEqual([
      { type: 'paragraph', inlines: [{ text: 'Dos tipos:' }] },
      {
        type: 'bullets',
        items: [
          [{ text: 'ETF de acumulación', bold: true }, { text: ': reinvierte.' }],
          [{ text: 'ETF de distribución', bold: true }, { text: ': reparte.' }],
        ],
      },
      {
        type: 'paragraph',
        inlines: [{ text: 'Aspectos a considerar', bold: true }, { text: ':' }],
      },
      {
        type: 'numbers',
        items: [
          [{ text: 'Fiscalidad', bold: true }, { text: ': depende del país.' }],
          [{ text: 'Objetivo', bold: true }, { text: ': crecer o cobrar.' }],
        ],
      },
    ])
  })

  it('headings and horizontal rules', () => {
    expect(parseChatText('## Resumen\n---\nTexto')).toEqual([
      { type: 'heading', inlines: [{ text: 'Resumen' }] },
      { type: 'paragraph', inlines: [{ text: 'Texto' }] },
    ])
  })

  it('a paragraph between two lists splits them', () => {
    const blocks = parseChatText('- a\nTexto\n- b')
    expect(blocks.map((b) => b.type)).toEqual(['bullets', 'paragraph', 'bullets'])
  })
})
