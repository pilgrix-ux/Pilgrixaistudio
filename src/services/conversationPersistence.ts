import { authService, AUTH_EVENT } from '@/services/authService'
import { config } from '@/lib/config'
import type { AuthSession } from '@/types'

export type PersistedChat = {
  id: string
  title: string
  preview: string
  createdAt: number
  messages: Array<{ id?: string; role: 'user' | 'assistant'; text: string; createdAt?: number }>
  attachmentCount?: number
}

export type ImageCreationRecord = {
  id: string
  conversationId?: string
  prompt: string
  imageUrl: string
  metadata?: Record<string, unknown>
  createdAt?: number
}

const CHAT_KEY = 'pilgrix.chat.history.v1'
const CHAT_EVENT = 'pilgrix-chat-change'
const PENDING_KEY = 'pilgrix.chat.sync.pending.v1'
const KNOWN_KEY = 'pilgrix.chat.sync.known.v1'
const OWNER_KEY = 'pilgrix.chat.sync.owner.v1'

let started = false
let syncing = false
let retryTimer: number | undefined
let activeUserId: string | null = null
let knownIds = new Set<string>()

const readLocal = (): PersistedChat[] => {
  try {
    const raw = window.localStorage.getItem(CHAT_KEY)
    const value = raw ? JSON.parse(raw) : []
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

const writeLocal = (chats: PersistedChat[]): void => {
  try {
    window.localStorage.setItem(CHAT_KEY, JSON.stringify(chats.slice(0, 100)))
    window.dispatchEvent(new Event(CHAT_EVENT))
  } catch { /* local cache is best-effort */ }
}

const clearLocal = (): void => {
  try {
    window.localStorage.removeItem(CHAT_KEY)
    window.localStorage.removeItem(PENDING_KEY)
    window.localStorage.removeItem(KNOWN_KEY)
    window.dispatchEvent(new Event(CHAT_EVENT))
  } catch { /* ignore */ }
}

const readPending = (): string[] => {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY)
    const value = raw ? JSON.parse(raw) : []
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
  } catch { return [] }
}

const writePending = (ids: string[]): void => {
  try { window.localStorage.setItem(PENDING_KEY, JSON.stringify([...new Set(ids)].slice(-200))) } catch { /* ignore */ }
}

const session = (): AuthSession => authService.getSession()
const isAuthenticated = (): boolean => session().status === 'authenticated' && Boolean(session().token && session().user?.id)

const apiBase = (): string => {
  if (config.api.baseUrl && config.api.baseUrl !== 'http://localhost:3000') return config.api.baseUrl.replace(/\/$/, '')
  if (import.meta.env.PROD) return ''
  return 'http://localhost:3001'
}

const request = async (path: string, options: RequestInit = {}): Promise<Response> => {
  const current = session()
  if (!current.token) throw new Error('Authentication required')
  return fetch(`${apiBase()}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${current.token}`, ...(options.headers || {}) },
  })
}

const toServerChat = (chat: PersistedChat) => ({
  ...chat,
  messages: chat.messages.map((message, index) => ({
    id: message.id || `message-${chat.id}-${index}`,
    role: message.role,
    text: message.text,
    createdAt: message.createdAt || chat.createdAt,
  })),
})

const fromServer = (payload: any): PersistedChat[] => {
  const conversations = Array.isArray(payload?.conversations) ? payload.conversations : []
  const messages = Array.isArray(payload?.messages) ? payload.messages : []
  return conversations.map((row: any) => ({
    id: String(row.id),
    title: String(row.title || 'New conversation'),
    preview: String(row.preview || ''),
    createdAt: Date.parse(row.created_at || '') || Date.now(),
    attachmentCount: Number(row.attachment_count || 0),
    messages: messages
      .filter((message: any) => String(message.conversation_id) === String(row.id))
      .map((message: any) => ({
        id: String(message.id),
        role: message.role === 'assistant' ? 'assistant' : 'user',
        text: String(message.text || ''),
        createdAt: Date.parse(message.created_at || '') || undefined,
      })),
  }))
}

const mergeChats = (local: PersistedChat[], remote: PersistedChat[]): PersistedChat[] => {
  const merged = new Map<string, PersistedChat>()
  for (const chat of remote) merged.set(chat.id, chat)
  for (const chat of local) {
    const existing = merged.get(chat.id)
    if (!existing || chat.messages.length >= existing.messages.length) merged.set(chat.id, chat)
  }
  return [...merged.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100)
}

const pushChat = async (chat: PersistedChat): Promise<boolean> => {
  try {
    const response = await request('/api/conversations', { method: 'POST', body: JSON.stringify({ conversation: toServerChat(chat) }) })
    if (!response.ok) throw new Error(`sync failed: ${response.status}`)
    knownIds.add(chat.id)
    return true
  } catch { return false }
}

const hydrate = async (): Promise<void> => {
  if (!isAuthenticated()) return
  const userId = session().user?.id || null
  if (!userId) return
  activeUserId = userId
  try {
    const response = await request('/api/conversations')
    if (!response.ok) throw new Error(`hydrate failed: ${response.status}`)
    const payload = await response.json()
    const remote = fromServer(payload)
    const local = readLocal()
    const merged = mergeChats(local, remote)
    knownIds = new Set(remote.map((chat) => chat.id))
    try {
      window.localStorage.setItem(KNOWN_KEY, JSON.stringify([...knownIds]))
      window.localStorage.setItem(OWNER_KEY, userId)
    } catch { /* ignore */ }
    writeLocal(merged)
    for (const chat of merged) await pushChat(chat)
  } catch {
    // Keep the local cache fully usable while offline or before the backend is configured.
  }
}

const deleteChat = async (id: string): Promise<boolean> => {
  try {
    const response = await request('/api/conversations', { method: 'DELETE', body: JSON.stringify({ id }) })
    if (!response.ok) throw new Error(`delete failed: ${response.status}`)
    knownIds.delete(id)
    return true
  } catch { return false }
}

const flush = async (): Promise<void> => {
  if (syncing || !isAuthenticated()) return
  syncing = true
  try {
    const chats = readLocal()
    const currentIds = new Set(chats.map((chat) => chat.id))
    const pending = readPending()
    const missing = [...knownIds].filter((id) => !currentIds.has(id))
    for (const id of missing) {
      if (!(await deleteChat(id))) pending.push(id)
    }
    for (const chat of chats) {
      if (!(await pushChat(chat))) pending.push(chat.id)
    }
    writePending(pending.filter((id) => currentIds.has(id)))
    try { window.localStorage.setItem(KNOWN_KEY, JSON.stringify([...knownIds])) } catch { /* ignore */ }
  } finally {
    syncing = false
  }
}

const scheduleFlush = (): void => {
  window.clearTimeout(retryTimer)
  retryTimer = window.setTimeout(() => { void flush() }, 250)
}

const handleAuthChange = (): void => {
  const current = session()
  const nextUserId = current.status === 'authenticated' ? current.user?.id || null : null
  if (nextUserId === activeUserId) return
  activeUserId = nextUserId
  knownIds = new Set()
  if (!nextUserId) {
    clearLocal()
    return
  }
  let owner = ''
  try { owner = window.localStorage.getItem(OWNER_KEY) || '' } catch { /* ignore */ }
  if (owner && owner !== nextUserId) clearLocal()
  void hydrate().then(() => scheduleFlush())
}

export const saveImageCreation = async (creation: ImageCreationRecord): Promise<boolean> => {
  if (!isAuthenticated()) return false
  try {
    const response = await request('/api/conversations', { method: 'POST', body: JSON.stringify({ action: 'save_image', ...creation }) })
    return response.ok
  } catch { return false }
}

export const startConversationPersistence = (): (() => void) => {
  if (started || typeof window === 'undefined') return () => undefined
  started = true
  activeUserId = isAuthenticated() ? session().user?.id || null : null

  const onChange = () => scheduleFlush()
  const onOnline = () => { void flush() }
  const onAuth = () => handleAuthChange()
  window.addEventListener(CHAT_EVENT, onChange)
  window.addEventListener('online', onOnline)
  window.addEventListener(AUTH_EVENT, onAuth)
  if (activeUserId) void hydrate().then(() => scheduleFlush())
  const interval = window.setInterval(() => { void flush() }, 15000)

  return () => {
    window.removeEventListener(CHAT_EVENT, onChange)
    window.removeEventListener('online', onOnline)
    window.removeEventListener(AUTH_EVENT, onAuth)
    window.clearInterval(interval)
    window.clearTimeout(retryTimer)
    started = false
  }
}
