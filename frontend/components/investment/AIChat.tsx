// components/investment/AIChat.tsx
// AI Chat component with conversational context and session management

'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAIChat, QUICK_QUESTIONS } from '@/hooks/useAIChat'
import { investmentApi } from '@/lib/api/investment'
import { DisclaimerAlert } from './DisclaimerAlert'
import { Send, MessageCircle, Bot, User, Loader2, Trash2, ChevronDown, History, X } from 'lucide-react'
import { formatCurrency, formatDistanceToNow, cn } from '@/lib/utils'

interface AIChatProps {
  accountId: string
  sessionId?: string | null
  className?: string
}

interface ChatSessionInfo {
  sessionId: string
  provider: string
  messageCount: number
  createdAt: string
  lastMessageAt?: string
}

export function AIChat({ accountId, sessionId = null, className = '' }: AIChatProps) {
  const {
    messages,
    isLoading,
    isTyping,
    error,
    sendMessage,
    createSession,
    clearChat,
    session
  } = useAIChat({ accountId, sessionId })

  const [input, setInput] = useState('')
  const [sessions, setSessions] = useState<ChatSessionInfo[]>([])
  const [showSessions, setShowSessions] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevMessagesLength = useRef(messages.length)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
  }, [accountId])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSessions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadSessions = async () => {
    setIsLoadingSessions(true)
    try {
      const data = await investmentApi.getChatSessions(accountId)
      setSessions(data)
    } catch (err) {
      console.error('Error loading sessions:', err)
    } finally {
      setIsLoadingSessions(false)
    }
  }

  // Auto-scroll to bottom only when a new message is added
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
    prevMessagesLength.current = messages.length
  }, [messages.length])

  // Keep input focused
  useEffect(() => {
    if (!isTyping && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isTyping, messages])

  const handleSend = async () => {
    if (!input.trim()) return
    const tempInput = input
    setInput('')
    inputRef.current?.focus()
    await sendMessage(tempInput)
    loadSessions()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleDeleteSession = async (sessionIdToDelete: string) => {
    if (!confirm('¿Eliminar esta conversación?')) return
    try {
      await investmentApi.deleteChatSession(accountId, sessionIdToDelete)
      await loadSessions()
      if (session?.sessionId === sessionIdToDelete) {
        clearChat()
      }
    } catch (err) {
      console.error('Error deleting session:', err)
    }
  }

  const handleSelectSession = (sessionIdToSelect: string) => {
    router.push(`/investment?sessionId=${sessionIdToSelect}`)
  }

  const handleNewChat = async () => {
    clearChat()
    await createSession()
    loadSessions()
    setShowSessions(false)
  }

  return (
    <Card className={cn('flex flex-col h-[600px]', className)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Asesor IA
            </CardTitle>

            {/* Session Selector */}
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSessions(!showSessions)}
                className="h-8 px-2 gap-1"
              >
                <History className="h-4 w-4" />
                <span className="text-xs">
                  {messages.length > 0 ? 'Actual' : 'Historial'}
                </span>
                <ChevronDown className={cn('h-3 w-3 transition-transform', showSessions && 'rotate-180')} />
              </Button>

              {showSessions && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-background border rounded-lg shadow-xl z-[60] max-h-64 overflow-y-auto">
                  <div className="p-2 border-b bg-muted/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNewChat}
                      className="w-full justify-start gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Nueva conversación
                    </Button>
                  </div>

                  {isLoadingSessions ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Cargando...
                    </div>
                  ) : sessions.filter(s => s.messageCount > 0).length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Sin conversaciones guardadas
                    </div>
                  ) : (
                    sessions
                      .filter(s => s.messageCount > 0)
                      .map((s) => (
                      <div
                        key={s.sessionId}
                        className={cn(
                          'flex items-center justify-between p-2 hover:bg-muted cursor-pointer group',
                          session?.sessionId === s.sessionId && 'bg-muted/60'
                        )}
                        onClick={() => handleSelectSession(s.sessionId)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {s.messageCount === 0 ? 'Nueva' : `${s.messageCount} mensajes`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(s.lastMessageAt || s.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSession(s.sessionId)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={handleNewChat} className="text-xs">
            <MessageCircle className="h-4 w-4 mr-1" />
            Nuevo chat
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col pt-0 overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.length === 0 && !isLoading && (
            <EmptyState onStart={createSession} />
          )}

          {messages
            .filter((m) => m.role !== 'system' || messages.length <= 1)
            .map((message, index) => (
              <ChatBubble
                key={message.id || index}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
              />
            ))}

          {isTyping && <TypingIndicator />}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick questions */}
        {messages.length > 0 && messages.length <= 3 && (
          <div className="flex flex-wrap gap-2 my-3">
            {QUICK_QUESTIONS.slice(0, 4).map((question) => (
              <Button
                key={question}
                variant="secondary"
                size="sm"
                className="text-xs"
                onClick={() => sendMessage(question)}
                disabled={isTyping}
              >
                {question}
              </Button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex-shrink-0 pt-3 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta..."
              disabled={isTyping}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              size="default"
            >
              {isTyping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <DisclaimerAlert variant="compact" className="mt-2" type="chat" />
        </div>
      </CardContent>
    </Card>
  )
}

// ========================
// Subcomponents
// ========================

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-8">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Bot className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-semibold mb-2">Tu asistente de inversión</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        Pregúntame sobre conceptos financieros, mercados o estrategias de inversión.
      </p>
      <Button onClick={onStart}>
        <MessageCircle className="h-4 w-4 mr-2" />
        Empezar chat
      </Button>
    </div>
  )
}

function ChatBubble({
  role,
  content,
  timestamp
}: {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}) {
  const isUser = role === 'user'

  return (
    <div className={cn(
      'flex flex-col max-w-[85%]',
      isUser ? 'ml-auto items-end' : 'mr-auto items-start'
    )}>
      <div
        className={cn(
          'rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        )}
      >
        {content.split('\n').map((paragraph, i) => (
          <p key={i} className={i > 0 ? 'mt-2' : ''}>
            {paragraph}
          </p>
        ))}
      </div>
      <span className="text-xs text-muted-foreground mt-1 px-1">
        {isUser ? 'Tú' : 'IA'} • {formatDistanceToNow(timestamp, { addSuffix: true })}
      </span>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm">Escribiendo...</span>
    </div>
  )
}

// Compact version for sidebar
export function AIChatCompact({ accountId, sessionId = null }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <MessageCircle className="h-4 w-4" />
        Asesor IA
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background rounded-xl shadow-2xl overflow-hidden">
        <div className="flex justify-end p-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <AIChat
          accountId={accountId}
          sessionId={sessionId}
          className="h-[70vh] border-0 rounded-0"
        />
      </div>
    </div>
  )
}
