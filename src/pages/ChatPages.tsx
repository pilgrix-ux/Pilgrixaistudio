import { ArrowLeft, ArrowUp, MessageCircle, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import '@/styles/crystal-theme.css'

export type ChatRecord = {
  id: string
  title: string
  preview: string
  createdAt: number
  messages: Array<{ role: 'user' | 'assistant'; text: string }>
  attachmentCount?: number
}

const CHAT_KEY = 'pilgrix.chat.history.v1'

export function loadChats(): ChatRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CHAT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveChats(chats: ChatRecord[]): void {
  window.localStorage.setItem(CHAT_KEY, JSON.stringify(chats.slice(0, 100)))
}

export function createChat(prompt: string, attachmentCount = 0): ChatRecord {
  const clean = prompt.trim() || (attachmentCount > 0 ? 'Media creation' : 'New conversation')
  const chat: ChatRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: clean.length > 48 ? `${clean.slice(0, 48).trim()}…` : clean,
    preview: clean,
    createdAt: Date.now(),
    messages: [{ role: 'user', text: clean }],
    attachmentCount,
  }
  saveChats([chat, ...loadChats()])
  return chat
}

export function getChat(id: string): ChatRecord | undefined {
  return loadChats().find((chat) => chat.id === id)
}

export function appendChatMessage(id: string, message: { role: 'user' | 'assistant'; text: string }): ChatRecord | undefined {
  const chats = loadChats()
  const index = chats.findIndex((chat) => chat.id === id)
  if (index < 0) return undefined
  const updated = { ...chats[index], messages: [...chats[index].messages, message], preview: message.text }
  chats[index] = updated
  saveChats(chats)
  return updated
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

type HistoryProps = { onBack: () => void; onOpenChat: (id: string) => void }
export function ChatHistoryPage({ onBack, onOpenChat }: HistoryProps): JSX.Element {
  const [chats, setChats] = useState<ChatRecord[]>(loadChats)
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    return value ? chats.filter((chat) => `${chat.title} ${chat.preview}`.toLowerCase().includes(value)) : chats
  }, [chats, query])

  const removeChat = (id: string) => {
    const next = chats.filter((chat) => chat.id !== id)
    setChats(next)
    saveChats(next)
  }

  useEffect(() => {
    const sync = () => setChats(loadChats())
    window.addEventListener('storage', sync)
    window.addEventListener('pilgrix-chat-change', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('pilgrix-chat-change', sync)
    }
  }, [])

  return (
    <main className="min-h-[100dvh] bg-[#f7faff] px-4 pb-8 pt-[calc(1rem+env(safe-area-inset-top))] text-slate-900">
      <div className="mx-auto w-full max-w-xl">
        <header className="flex items-center gap-3 py-2">
          <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white/80 text-slate-600 shadow-sm active:scale-95" aria-label="Back"><ArrowLeft size={19} /></button>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-sky-500">PILGRIX</p><h1 className="text-2xl font-black tracking-[-0.04em]">Conversations</h1></div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white/80 text-indigo-500 shadow-sm"><MessageCircle size={19} /></div>
        </header>

        {chats.length > 0 && <div className="relative mt-5"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" className="h-12 w-full rounded-2xl border border-white bg-white/80 pl-11 pr-4 text-sm font-medium outline-none placeholder:text-slate-400 shadow-sm backdrop-blur-xl" /></div>}

        <section className="mt-5">
          {filtered.length === 0 ? (
            <div className="flex min-h-[55vh] flex-col items-center justify-center text-center px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-white bg-white/75 text-sky-400 shadow-[0_16px_45px_rgba(56,189,248,.12)]"><MessageCircle size={28} strokeWidth={1.7} /></div>
              <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-800">No conversations or history yet</h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">Your conversations will appear here after you send your first message.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[26px] border border-white/90 bg-white/65 shadow-[0_16px_50px_rgba(30,64,175,.08)] backdrop-blur-xl">
              {filtered.map((chat, index) => (
                <div key={chat.id} className={`group flex items-center gap-3 px-4 py-4 ${index ? 'border-t border-slate-100/80' : ''}`}>
                  <button type="button" onClick={() => onOpenChat(chat.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[.99]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 text-indigo-500"><MessageCircle size={18} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{chat.title}</span><span className="mt-1 block truncate text-xs font-medium text-slate-400">{chat.preview}</span></span>
                    <span className="shrink-0 text-[10px] font-semibold text-slate-300">{formatDate(chat.createdAt)}</span>
                  </button>
                  <button type="button" onClick={() => removeChat(chat.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 opacity-100 transition hover:bg-rose-50 hover:text-rose-400" aria-label={`Delete ${chat.title}`}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

type ConversationProps = { id: string; onBack: () => void }
export function ConversationPage({ id, onBack }: ConversationProps): JSX.Element {
  const [chat, setChat] = useState<ChatRecord | undefined>(() => getChat(id))
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    const sync = () => setChat(getChat(id))
    window.addEventListener('pilgrix-chat-change', sync)
    return () => window.removeEventListener('pilgrix-chat-change', sync)
  }, [id])

  if (!chat) return <ChatHistoryPage onBack={onBack} onOpenChat={() => undefined} />

  const send = () => {
    const text = prompt.trim()
    if (!text) return
    const updated = appendChatMessage(id, { role: 'user', text })
    if (updated) setChat(updated)
    setPrompt('')
    window.dispatchEvent(new Event('pilgrix-chat-change'))
  }

  return (
    <main className="flex h-[100dvh] flex-col bg-[#f7faff] text-slate-900">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/80 bg-white/75 px-4 pb-3 pt-[calc(.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white text-slate-600 shadow-sm active:scale-95" aria-label="Back"><ArrowLeft size={19} /></button>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{chat.title}</p><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-sky-500">Conversation</p></div>
      </header>
      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
          {chat.messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={message.role === 'user' ? 'max-w-[84%] rounded-[22px] rounded-tr-md bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-lg' : 'max-w-[84%] rounded-[22px] rounded-tl-md border border-white bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm'}>{message.text}</div></div>)}
        </div>
      </section>
      <footer className="shrink-0 px-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-2"><div className="mx-auto flex max-w-xl items-end gap-2 rounded-[26px] border border-white bg-white/90 p-2.5 shadow-[0_14px_45px_rgba(30,64,175,.1)] backdrop-blur-2xl"><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} rows={1} placeholder="Continue the conversation..." className="max-h-28 min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2 text-sm font-medium outline-none placeholder:text-slate-400" /><button type="button" disabled={!prompt.trim()} onClick={send} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg active:scale-90 disabled:opacity-30"><ArrowUp size={19} /></button></div></footer>
    </main>
  )
}
