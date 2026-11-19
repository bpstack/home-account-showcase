// The little markdown the AI writes (bold, code, lists, headings) turned into plain blocks for
// React to render as elements. Never HTML: nothing in a reply can become markup.

export interface Inline {
  text: string
  bold?: boolean
  code?: boolean
}

export type Block =
  | { type: 'paragraph'; inlines: Inline[] }
  | { type: 'heading'; inlines: Inline[] }
  | { type: 'bullets' | 'numbers'; items: Inline[][] }

const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBER = /^\s*\d+[.)]\s+(.*)$/
const HEADING = /^\s*#{1,6}\s+(.*)$/
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/

/** **bold** and `code` as separate pieces; single * or _ emphasis loses its markers. */
export function parseInline(text: string): Inline[] {
  const plain = text.replace(/(^|[\s(])[*_]([^*_\s][^*_]*?)[*_](?=[\s.,;:!?)]|$)/g, '$1$2')
  const pieces: Inline[] = []
  for (const part of plain.split(/(\*\*[^*]+\*\*|`[^`]+`)/)) {
    if (!part) continue
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      pieces.push({ text: part.slice(2, -2), bold: true })
    } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      pieces.push({ text: part.slice(1, -1), code: true })
    } else {
      pieces.push({ text: part })
    }
  }
  return pieces
}

export function parseChatText(source: string): Block[] {
  const blocks: Block[] = []
  let list: Extract<Block, { items: Inline[][] }> | null = null

  for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim() || RULE.test(line)) continue // a blank line does not end a list: items often come spaced

    const bullet = BULLET.exec(line)
    const number = bullet ? null : NUMBER.exec(line)
    const item = bullet ?? number
    if (item) {
      const type = bullet ? 'bullets' : 'numbers'
      if (!list || list.type !== type) {
        list = { type, items: [] }
        blocks.push(list)
      }
      list.items.push(parseInline(item[1]))
      continue
    }

    list = null
    const heading = HEADING.exec(line)
    blocks.push(
      heading
        ? { type: 'heading', inlines: parseInline(heading[1]) }
        : { type: 'paragraph', inlines: parseInline(line.trim()) }
    )
  }
  return blocks
}
