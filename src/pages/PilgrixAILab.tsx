import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, Bell, Eraser, Folder, Menu, Paperclip, Scissors, Search, Sparkles, User, Wand2 } from 'lucide-react'
import { editorService } from '@/services/editorService'

type Attachment = { id: string; file: File; url: string }
type Message = { id: string; role: 'user' | 'ai'; text: string }

const tools = [
  ['Smart Edit', 'Cuts, pacing, transitions', Wand2],
  ['Remove Background', 'Subject isolation', Eraser],
  ['Find Moments', 'Precise highlights', Search],
  ['Cut & Clip', 'Shorts from long videos', Scissors],
] as const

export default function PilgrixAILab(): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([{ id: 'welcome', role: 'ai', text: 'Tell me what you want to make. Upload your footage or describe the edit.' }])
  const [prompt, setPrompt] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [working, setWorking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrls = useMemo(() => attachments.map((item) => item.url), [attachments])
  useEffect(() => () => objectUrls.forEach((url) => URL.revokeObjectURL(url)), [objectUrls])

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setAttachments((current) => [...current, ...files.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }))])
    event.target.value = ''
  }

  const send = async () => {
    const text = prompt.trim()
    if (!text || working) return
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text }])
    setPrompt('')
    setWorking(true)
    const result = await editorService.createEditJob({ prompt: text, mediaIds: [] })
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'ai', text: result.ok ? 'Your edit has been queued.' : (result.error ?? 'I could not start that edit.') }])
    setWorking(false)
  }

  return <div className="min-h-screen bg-[#f7f5f0] text-black">
    <header className="flex items-center justify-between border-b bg-white/95 px-4 py-3"><button aria-label="Menu"><Menu /></button><div className="text-center"><div className="text-[10px] uppercase tracking-[.25em] text-gray-500">Pilgrix</div><strong>AI Lab</strong></div><button aria-label="Notifications"><Bell /></button></header>
    <main className="mx-auto flex max-w-4xl flex-col px-4 pb-40 pt-8">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{tools.map(([title, detail, Icon]) => <button key={title} className="rounded-2xl bg-white p-3 text-left shadow-sm"><Icon size={18} /><div className="mt-2 text-xs font-semibold">{title}</div><div className="text-[10px] text-gray-500">{detail}</div></button>)}</div>
      <section className="mt-6 space-y-4">{messages.map((message) => <div key={message.id} className={message.role === 'user' ? 'ml-auto max-w-[85%] rounded-3xl bg-black px-4 py-3 text-white' : 'max-w-[85%] rounded-3xl bg-white px-4 py-3 shadow-sm'}>{message.text}</div>)}{attachments.map((item) => item.file.type.startsWith('video/') && <video key={item.id} controls className="max-h-96 w-full rounded-3xl bg-black" src={item.url} />)}{working && <div className="text-sm text-gray-500">Working…</div>}</section>
      <div className="fixed bottom-16 left-1/2 w-[calc(100%-24px)] max-w-4xl -translate-x-1/2 rounded-3xl bg-white p-3 shadow-2xl"><div className="flex items-end gap-2"><button aria-label="Attach media" onClick={() => inputRef.current?.click()}><Paperclip /></button><input ref={inputRef} hidden type="file" accept="video/*,audio/*,image/*" multiple onChange={onFiles} /><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }} placeholder="Tell Pilgrix what you want to make…" rows={2} className="flex-1 resize-none outline-none" /><button aria-label="Send" disabled={!prompt.trim() || working} onClick={() => void send()} className="rounded-full bg-black p-3 text-white disabled:opacity-30"><ArrowUp /></button></div></div>
    </main>
    <nav className="fixed bottom-0 left-0 right-0 flex justify-center gap-12 border-t bg-white py-2 text-xs"><button><Sparkles size={18} />AI Lab</button><button><Folder size={18} />Projects</button><button><User size={18} />Me</button></nav>
  </div>
}
