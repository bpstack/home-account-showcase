import { Fragment } from 'react'
import { parseChatText, type Inline } from '@/lib/chat-markdown'

function Inlines({ inlines }: { inlines: Inline[] }) {
  return (
    <>
      {inlines.map((piece, i) =>
        piece.bold ? (
          <strong key={i} className="font-medium">
            {piece.text}
          </strong>
        ) : piece.code ? (
          <code key={i} className="rounded bg-layer-3 px-1 text-[0.95em]">
            {piece.text}
          </code>
        ) : (
          <Fragment key={i}>{piece.text}</Fragment>
        )
      )}
    </>
  )
}

/** An AI reply with its bold, lists and headings, rendered as elements (never as HTML). */
export function ChatText({ text }: { text: string }) {
  return (
    <>
      {parseChatText(text).map((block, i) => {
        if (block.type === 'paragraph') {
          return (
            <p key={i}>
              <Inlines inlines={block.inlines} />
            </p>
          )
        }
        if (block.type === 'heading') {
          return (
            <p key={i} className="font-medium">
              <Inlines inlines={block.inlines} />
            </p>
          )
        }
        const List = block.type === 'numbers' ? 'ol' : 'ul'
        return (
          <List
            key={i}
            className={`space-y-1 pl-5 ${block.type === 'numbers' ? 'list-decimal' : 'list-disc'}`}
          >
            {block.items.map((item, j) => (
              <li key={j}>
                <Inlines inlines={item} />
              </li>
            ))}
          </List>
        )
      })}
    </>
  )
}
