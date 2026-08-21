import { ArrowLeft, ArrowUp, Check, MessageCircle, Search, Sparkles, Trash2 } from 'lucide-react'
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
const CHAT_EVENT = 'pilgrix-chat-change'

export function loadChats(): ChatRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CHAT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function saveChats(chats: ChatRecord[]): void {
  window.localStorage.setItem(CHAT_KEY, JSON.stringify(chats.slice(0, 100)))
  window.dispatchEvent(new Event(CHAT_EVENT))
}

export function createChat(prompt: string, attachmentCount = 0): ChatRecord {
  const clean = prompt.trim() || (attachmentCount > 0 ? 'Media creation' : 'New conversation')
  const chat: ChatRecord = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, title: clean.length > 48 ? `${clean.slice(0, 48).trim()}…` : clean, preview: clean, createdAt: Date.now(), messages: [{ role: 'user', text: clean }], attachmentCount }
  saveChats([chat, ...loadChats()])
  return chat
}

export function getChat(id: string): ChatRecord | undefined { return loadChats().find((chat) => chat.id === id) }

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

  const removeChat = (id: string) => { const next = chats.filter((chat) => chat.id !== id); setChats(next); saveChats(next) }

  useEffect(() => {
    const sync = () => setChats(loadChats())
    window.addEventListener('storage', sync)
    window.addEventListener(CHAT_EVENT, sync)
    return () => { window.removeEventListener('storage', sync); window.removeEventListener(CHAT_EVENT, sync) }
  }, [])

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_50%_-10%,rgba(186,230,253,.55),transparent_45%),#f7faff] px-4 pb-8 pt-[calc(1rem+env(safe-area-inset-top))] text-slate-900">
      <div className="mx-auto w-full max-w-xl">
        <header className="flex items-center gap-3 py-2">
          <button type="button" onClick={onBack} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/90 bg-white/80 text-slate-600 shadow-[0_8px_24px_rgba(30,64,175,.08)] active:scale-95" aria-label="Back"><ArrowLeft size={19} /></button>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-sky-500">PILGRIX</p><h1 className="text-[28px] font-black tracking-[-0.05em]">Conversations</h1><p className="mt-0.5 text-xs font-medium text-slate-400">Pick up where you left off.</p></div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white bg-white/80 text-indigo-500 shadow-sm"><MessageCircle size={19} /></div>
        </header>

        {chats.length > 0 && <div className="relative mt-6"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" className="h-13 w-full rounded-[20px] border border-white/90 bg-white/75 pl-11 pr-4 text-sm font-semibold outline-none placeholder:text-slate-400 shadow-[0_10px_35px_rgba(30,64,175,.07)] backdrop-blur-xl focus:ring-2 focus:ring-sky-200" /></div>}

        <section className="mt-6">
          {filtered.length === 0 ? (
            <div className="flex min-h-[55vh] flex-col items-center justify-center px-6 text-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] border border-white bg-white/75 text-sky-400 shadow-[0_20px_55px_rgba(56,189,248,.14)]"><MessageCircle size={30} strokeWidth={1.6} /><span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-300 text-white shadow-lg"><Sparkles size={12} /></span></div>
              <h2 className="mt-6 text-xl font-black tracking-tight text-slate-800">No conversations or history yet</h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">Your conversations will appear here after you send your first message.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((chat) => (
                <div key={chat.id} className="group flex items-center gap-3 rounded-[24px] border border-white/90 bg-white/72 p-3 shadow-[0_12px_38px_rgba(30,64,175,.07)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[0_16px_45px_rgba(30,64,175,.1)]">
                  <button type="button" onClick={() => onOpenChat(chat.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[.99]">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-sky-100 via-white to-indigo-100 text-indigo-500 shadow-inner"><MessageCircle size={18} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-slate-800">{chat.title}</span><span className="mt-1 block truncate text-xs font-medium text-slate-400">{chat.preview}</span></span>
                    <span className="shrink-0 text-[10px] font-bold text-slate-300">{formatDate(chat.createdAt)}</span>
                  </button>
                  <button type="button" onClick={() => removeChat(chat.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-rose-50 hover:text-rose-400" aria-label={`Delete ${chat.title}`}><Trash2 size={15} /></button>
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
    window.addEventListener(CHAT_EVENT, sync)
    return () => window.removeEventListener(CHAT_EVENT, sync)
  }, [id])

  if (!chat) return <ChatHistoryPage onBack={onBack} onOpenChat={() => undefined} />

  const send = () => {
    const text = prompt.trim()
    if (!text) return
    const updated = appendChatMessage(id, { role: 'user', text })
    if (updated) setChat(updated)
    setPrompt('')
  }

  return (
    <main className="flex h-[100dvh] flex-col bg-[radial-gradient(circle_at_50%_-15%,rgba(186,230,253,.5),transparent_42%),#f7faff] text-slate-900">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/80 bg-white/70 px-4 pb-3 pt-[calc(.75rem+env(safe-area-inset-top))] backdrop-blur-2xl">
        <button type="button" onClick={onBack} className="flex h-11 w-11 items-center justify-center rounded-full border border-white bg-white text-slate-600 shadow-sm active:scale-95" aria-label="Back"><ArrowLeft size={19} /></button>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{chat.title}</p><div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-sky-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Conversation</div></div>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white/80 text-slate-500 shadow-sm" aria-label="Conversation options"><span className="text-lg leading-none">•••</span></button>
      </header>
      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <div className="py-2 text-center text-[10px] font-bold uppercase tracking-[.22em] text-slate-300">Today</div>
          {chat.messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && <div className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 text-indigo-500"><Sparkles size={14} /></div>}
              <div className={message.role === 'user' ? 'max-w-[84%] rounded-[24px] rounded-tr-md bg-gradient-to-br from-indigo-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(79,70,229,.2)]' : 'max-w-[84%] rounded-[24px] rounded-tl-md border border-white bg-white/82 px-4 py-3 text-sm font-medium leading-6 text-slate-700 shadow-[0_10px_30px_rgba(30,64,175,.07)]'}>{message.text}<span className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${message.role === 'user' ? 'text-white/60' : 'text-slate-300'}`}>{formatDate(chat.createdAt)} {message.role === 'user' && <Check size={11} />}</span></div>
            </div>
          ))}
        </div>
      </section>
      <footer className="shrink-0 px-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex max-w-xl items-end gap-2 rounded-[28px] border border-white bg-white/88 p-2.5 shadow-[0_16px_50px_rgba(30,64,175,.12)] backdrop-blur-2xl focus-within:ring-2 focus-within:ring-sky-100">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} rows={1} placeholder="Continue the conversation..." className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent px-2.5 py-2.5 text-sm font-medium outline-none placeholder:text-slate-400" />
          <button type="button" disabled={!prompt.trim()} onClick={send} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-[0_8px_20px_rgba(79,70,229,.25)] transition active:scale-90 disabled:opacity-30"><ArrowUp size={19} /></button>
        </div>
      </footer>
    </main>
  )
}
