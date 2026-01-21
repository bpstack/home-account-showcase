// hooks/useAIChat.ts
// Chat hook with local state management

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { investmentApi, ChatSession, ChatMessage as ApiChatMessage } from '../lib/api/investment'

interface UseAIChatOptions {
  accountId: string
  sessionId?: string | null
  onMessage?: (message: string) => void
}

interface UseAIChatReturn {
  session: ChatSession | null
  messages: ChatMessage[]
  isLoading: boolean
  isTyping: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
  createSession: () => Promise<ChatSession>
  clearChat: () => void
  clearSessionError: () => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export function useAIChat({
  accountId,
  sessionId: initialSessionId,
  onMessage
}: UseAIChatOptions): UseAIChatReturn {
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const queryClient = useQueryClient()
  const messagesRef = useRef<ChatMessage[]>([])

  // Sync messages with ref
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Load existing session if provided
  useEffect(() => {
    if (initialSessionId) {
      loadChatHistory(initialSessionId)
    }
  }, [initialSessionId, accountId])

  const loadChatHistory = async (sessionId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const history = await investmentApi.getChatHistory(accountId, sessionId)

      const loadedMessages: ChatMessage[] = history.messages.map((m, i) => ({
        id: `msg-${i}`,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        timestamp: m.createdAt ? new Date(m.createdAt) : new Date()
      }))

      setSession({
        sessionId: history.sessionId,
        provider: 'claude',
        createdAt: history.createdAt
      })

      setMessages(loadedMessages)
    } catch (err: any) {
      console.error('Error loading chat history:', err)
      // If session not found, clear URL and start new chat
      if (err.message === 'Sesión no encontrada' || err.message?.includes('no encontrada')) {
        console.log('[AIChat] Session not found, creating new session...')
        window.history.replaceState(null, '', `/investment`)
        await createSession()
        // Force re-render by triggering a minimal state change
        setError(null)
      } else {
        setError('Error al cargar el historial del chat')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const createSession = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const newSession = await investmentApi.createChatSession(accountId)
      setSession(newSession)
      setMessages([])

      // Add system message
      const systemMessage: ChatMessage = {
        id: 'system-1',
        role: 'system',
        content: 'Soy tu asistente de inversión. Puedo explicarte conceptos financieros, analizar tu situación y responder preguntas sobre los mercados actuales. ¿En qué puedo ayudarte?',
        timestamp: new Date()
      }
      setMessages([systemMessage])

      return newSession
    } catch (err) {
      console.error('Error creating chat session:', err)
      setError('Error al crear la sesión de chat')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [accountId])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    let currentSessionId = session?.sessionId || initialSessionId

    if (!currentSessionId) {
      const newSession = await createSession()
      currentSessionId = newSession.sessionId
    }

    if (!currentSessionId) {
      setError('No hay sesión de chat activa')
      return
    }

    const sendToApi = async (sessionId: string) => {
      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date()
      }

      setMessages(prev => [...prev, userMessage])
      onMessage?.(content.trim())

      // Send to API
      const response = await investmentApi.sendChatMessage(accountId, sessionId, content.trim())

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      // Invalidate chat history query
      queryClient.invalidateQueries({ queryKey: ['investment', 'chat', 'history', sessionId] })
    }

    try {
      setIsTyping(true)
      setError(null)
      await sendToApi(currentSessionId)
    } catch (err: any) {
      // Si la sesión no existe, crear una nueva y reintentar
      if (err.message === 'Sesión no encontrada' || err.message?.includes('no encontrada')) {
        console.log('[AIChat] Sesión no encontrada, creando nueva sesión...')
        try {
          const newSession = await createSession()
          setMessages([]) // Limpiar mensajes anteriores
          await sendToApi(newSession.sessionId)
          return
        } catch (createErr) {
          console.error('[AIChat] Error al crear nueva sesión:', createErr)
          setError('Error al crear sesión de chat')
        }
      } else {
        console.error('Error sending message:', err)
        setError('Error al enviar el mensaje. Por favor, inténtalo de nuevo.')
      }
    } finally {
      setIsTyping(false)
    }
  }, [session, initialSessionId, accountId, createSession, onMessage, queryClient])

  const clearChat = useCallback(() => {
    setMessages([])
    setSession(null)
    setError(null)
  }, [])

  const clearSessionError = useCallback(() => {
    setError(null)
  }, [])

  return {
    session,
    messages,
    isLoading,
    isTyping,
    error,
    sendMessage,
    createSession,
    clearChat,
    clearSessionError
  }
}

// Quick questions for the chat
export const QUICK_QUESTIONS = [
  '¿Cómo está el mercado hoy?',
  '¿Qué es la diversificación?',
  '¿Debería invertir en crypto?',
  '¿Cuánto debería ahorrar al mes?',
  '¿Qué es un fondo indexado?',
  '¿Qué es el interés compuesto?',
  '¿Cómo funciona un ETF?',
  '¿Qué es el perfil de riesgo?'
]
