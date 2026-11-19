'use client'

import { useEffect, useRef, useState } from 'react'
import { History, Plus, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Input } from '@/components/ui'
import { useAIChat, QUICK_QUESTIONS } from '@/hooks/useAIChat'
import { investmentApi } from '@/lib/api/investment'
import { cn, formatDistanceToNow } from '@/lib/utils'
import { validateChatMessage } from '@/validators/investment-validators'
import { AiNote } from './AiNote'
import { ChatText } from './ChatText'

const CHAT_MAX_LENGTH = 5000
const CHAT_COOLDOWN_MS = 1000

interface ChatSessionInfo {
  sessionId: string
  messageCount: number
  createdAt: string
  lastMessageAt?: string
}

interface AIChatProps {
  accountId: string
  /** The conversation to open; kept by the page so closing the panel does not lose it */
  sessionId: string | null
  onSessionChange: (_sessionId: string | null) => void
}

/** The AI advisor: past conversations, the current one and the box to write in. Fills a flush Sheet. */
export function AIChat({ accountId, sessionId, onSessionChange }: AIChatProps) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessionId)
  const { messages, isLoading, isTyping, error, sendMessage, createSession, clearChat, session } =
    useAIChat({ accountId, sessionId: activeSessionId })

  const [input, setInput] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [isCooldown, setIsCooldown] = useState(false)
  const [sessions, setSessions] = useState<ChatSessionInfo[]>([])
  const [showSessions, setShowSessions] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadSessions = async () => {
    try {
      setSessions(await investmentApi.getChatSessions(accountId))
    } catch {
      setSessions([])
    }
  }

  // Report the conversation in use, including one the hook creates on the first message
  useEffect(() => {
    // While a saved conversation loads, the one being loaded is still the one in use
    onSessionChange(session?.sessionId ?? activeSessionId)
  }, [session?.sessionId, activeSessionId, onSessionChange])

  useEffect(() => {
    loadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  // Keep the newest message in view
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages.length, isTyping])

  const send = async (text: string) => {
    const check = validateChatMessage(text)
    if (!check.success) {
      setInputError(check.error)
      return
    }
    setInputError(null)
    setInput('')
    setIsCooldown(true)
    setTimeout(() => setIsCooldown(false), CHAT_COOLDOWN_MS)
    await sendMessage(check.data)
    inputRef.current?.focus()
    loadSessions()
  }

  const startNew = async () => {
    setShowSessions(false)
    setActiveSessionId(null)
    clearChat()
    await createSession()
    loadSessions()
  }

  const remove = async (id: string) => {
    try {
      await investmentApi.deleteChatSession(accountId, id)
      if (session?.sessionId === id) {
        setActiveSessionId(null)
        clearChat()
      }
      await loadSessions()
      toast.success('Conversación eliminada')
    } catch {
      toast.error('No se pudo eliminar la conversación')
    }
  }

  const saved = sessions.filter((s) => s.messageCount > 0)
  const visible = messages.filter((m) => m.role !== 'system' || messages.length <= 1)
  const busy = isTyping || isCooldown

  return (
    <>
      <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-layer-3 px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={showSessions}
          onClick={() => setShowSessions(!showSessions)}
        >
          <History className="h-4 w-4" aria-hidden="true" />
          {showSessions ? 'Volver al chat' : 'Conversaciones'}
        </Button>
        <Button variant="ghost" size="sm" onClick={startNew}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nueva
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4" aria-live="polite">
        {showSessions ? (
          saved.length === 0 ? (
            <p className="text-sm text-text-secondary">Aún no hay conversaciones guardadas.</p>
          ) : (
            <ul className="divide-y divide-layer-3">
              {saved.map((s) => (
                <li key={s.sessionId} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSessionId(s.sessionId)
                      setShowSessions(false)
                    }}
                    className={cn(
                      'min-h-11 flex-1 rounded-md px-2 py-2 text-left hover:bg-layer-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      session?.sessionId === s.sessionId && 'bg-layer-2'
                    )}
                  >
                    <span className="block text-sm text-text-primary">
                      {s.messageCount} mensajes
                    </span>
                    <span className="block text-xs text-text-secondary">
                      {formatDistanceToNow(new Date(s.lastMessageAt || s.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(s.sessionId)}
                    aria-label="Eliminar conversación"
                    className="rounded-md p-2 text-text-secondary hover:bg-layer-2 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : isLoading ? (
          <p className="text-sm text-text-secondary">Cargando…</p>
        ) : visible.length === 0 ? (
          <div>
            <p className="text-sm text-text-primary">
              Pregunta sobre conceptos, mercados o cómo repartir tu ahorro.
            </p>
            <QuickQuestions onPick={send} disabled={busy} />
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((m) => (
              <div
                key={m.id}
                className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-[90%] space-y-2 rounded-xl px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-layer-2 text-text-primary'
                  )}
                >
                  {m.role === 'user' ? (
                    m.content.split('\n').map((paragraph, i) => <p key={i}>{paragraph}</p>)
                  ) : (
                    <ChatText text={m.content} />
                  )}
                </div>
                <span className="mt-1 text-xs text-text-secondary">
                  {m.role === 'user' ? 'Tú' : 'Asesor'} ·{' '}
                  {formatDistanceToNow(m.timestamp, { addSuffix: true })}
                </span>
              </div>
            ))}
            {visible.length <= 3 && !isTyping && <QuickQuestions onPick={send} disabled={busy} />}
            {isTyping && <p className="text-sm text-text-secondary">El asesor está escribiendo…</p>}
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex-shrink-0 space-y-2 border-t border-layer-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            aria-label="Tu pregunta"
            placeholder="Escribe tu pregunta"
            value={input}
            maxLength={CHAT_MAX_LENGTH}
            disabled={busy}
            error={inputError ?? undefined}
            onChange={(e) => {
              setInput(e.target.value)
              setInputError(null)
            }}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Enviar"
            disabled={!input.trim() || busy}
            className="shrink-0"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <AiNote />
      </form>
    </>
  )
}

function QuickQuestions({
  onPick,
  disabled,
}: {
  onPick: (_question: string) => void
  disabled: boolean
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {QUICK_QUESTIONS.slice(0, 4).map((question) => (
        <Button
          key={question}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onPick(question)}
        >
          {question}
        </Button>
      ))}
    </div>
  )
}
