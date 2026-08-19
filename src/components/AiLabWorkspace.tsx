/** Pilgrix AI Lab — the primary conversation-driven editing workspace. */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Archive,
  ChevronRight,
  FileVideo,
  Menu,
  MoreHorizontal,
  Paperclip,
  Plus,
  Send,
  Settings,
  Sparkles,
  Upload,
  User,
  X,
} from 'lucide-react'
import { editorService } from '@/services/editorService'
import { mediaService } from '@/services/mediaService'
import { projectService } from '@/services/projectService'
import type { MediaAsset, Project } from '@/types'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  asset?: MediaAsset
}

const starterPrompts = [
  'Make the strongest moments into one clean edit',
  'Find the viral parts and cut them into one video',
  'Match this video to my reference exactly',
]

const formatBytes = (bytes: number): string =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

export function AiLabWorkspace(): JSX.Element {
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', text: 'Tell me what you want to make. Drop your footage here and describe the result.' },
  ])
  const [attachments, setAttachments] = useState<MediaAsset[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [showMenu, setShowMenu] = useState(false)
  const [working, setWorking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadProjects = useCallback(async () => {
    const result = await projectService.listProjects()
    if (result.ok) setProjects(result.projects)
  }, [])

  useEffect(() => { void loadProjects() }, [loadProjects])

  const attachFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const next: MediaAsset[] = []
    for (const file of Array.from(files)) {
      const result = await mediaService.uploadMedia(file)
      if (result.ok) next.push(result.asset)
    }
    setAttachments((current) => [...current, ...next])
  }

  const send = async (value = prompt) => {
    const text = value.trim()
    if (!text || working) return
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text, asset: attachments[0] }
    setMessages((current) => [...current, userMessage])
    setPrompt('')
    setWorking(true)
    const result = await editorService.createEditJob({
      prompt: text,
      mediaIds: attachments.map((asset) => asset.id),
    })
    if (result.ok) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: result.job.status === 'completed' ? 'Your edit is ready.' : 'Your edit has been queued. I’ll keep the result attached to this conversation.' }])
    } else {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: result.error ?? 'I could not start that edit. I will not pretend it was completed.' }])
    }
    setAttachments([])
    setWorking(false)
    void loadProjects()
  }

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#111]">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-white/90 px-4 py-3 backdrop-blur">
        <button aria-label="Open AI Lab menu" className="rounded-full p-2 hover:bg-black/5" onClick={() => setShowMenu((v) => !v)}><Menu size={21} /></button>
        <div className="text-center"><div className="text-[11px] font-semibold uppercase tracking-[.22em] text-[#6b7280]">Pilgrix</div><div className="text-base font-semibold">AI Lab</div></div>
        <button aria-label="New chat" className="rounded-full p-2 hover:bg-black/5" onClick={() => { setMessages([{ id: 'welcome', role: 'assistant', text: 'Tell me what you want to make. Drop your footage here and describe the result.' }]); setAttachments([]); setPrompt('') }}><Plus size={21} /></button>
      </header>

      {showMenu && (
        <aside className="absolute left-3 top-16 z-40 w-72 rounded-3xl border border-black/5 bg-white p-3 shadow-2xl">
          <div className="mb-2 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-gray-400">AI Lab</div>
          <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-black/5"><Archive size={18} /> Chats & projects <ChevronRight className="ml-auto" size={16} /></button>
          <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-black/5"><Settings size={18} /> Me & settings</button>
          <div className="mt-2 border-t border-black/5 pt-2 text-xs text-gray-500">{projects.length} saved project{projects.length === 1 ? '' : 's'}</div>
        </aside>
      )}

      <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-5xl flex-col px-4 pb-32 pt-8">
        <div className="mx-auto w-full max-w-3xl space-y-5">
          {messages.map((message) => (
            <div key={message.id} className={message.role === 'user' ? 'ml-auto max-w-[85%]' : 'max-w-[90%]'}>
              <div className={message.role === 'user' ? 'rounded-3xl rounded-br-md bg-black px-4 py-3 text-white' : 'rounded-3xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-black/5'}>{message.text}</div>
              {message.asset?.mimeType.startsWith('video/') && <video className="mt-3 max-h-[420px] w-full rounded-3xl bg-black object-contain" controls src={message.asset.url} />}
            </div>
          ))}
          {working && <div className="flex items-center gap-2 text-sm text-gray-500"><Sparkles size={16} className="animate-pulse" /> Working on your edit…</div>}
        </div>

        <div className="mt-auto pt-12">
          <div className="mx-auto mb-4 grid max-w-3xl gap-2 sm:grid-cols-3">
            {starterPrompts.map((item) => <button key={item} onClick={() => setPrompt(item)} className="rounded-2xl bg-white px-3 py-3 text-left text-xs shadow-sm ring-1 ring-black/5 hover:ring-black/15">{item}</button>)}
          </div>
          <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-3 shadow-xl ring-1 ring-black/5">
            {attachments.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{attachments.map((asset) => <div key={asset.id} className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-xs"><FileVideo size={15} /> {asset.name} · {formatBytes(asset.size)}<button aria-label={`Remove ${asset.name}`} onClick={() => setAttachments((current) => current.filter((item) => item.id !== asset.id))}><X size={14} /></button></div>)}</div>}
            <div className="flex items-end gap-2">
              <button aria-label="Attach media" className="rounded-full p-3 hover:bg-black/5" onClick={() => inputRef.current?.click()}><Paperclip size={20} /></button>
              <input ref={inputRef} type="file" accept="video/*,audio/*,image/*" multiple hidden onChange={(event) => { void attachFiles(event.target.files); event.target.value = '' }} />
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }} placeholder="Tell Pilgrix what you want to make…" rows={2} className="min-h-12 flex-1 resize-none bg-transparent px-2 py-2 outline-none" />
              <button aria-label="Send" disabled={!prompt.trim() || working} onClick={() => void send()} className="rounded-full bg-black p-3 text-white disabled:opacity-30"><Send size={19} /></button>
            </div>
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/5 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-around text-xs text-gray-500"><button className="font-semibold text-black"><Sparkles size={19} /><span>AI Lab</span></button><button><Archive size={19} /><span>Projects</span></button><button><User size={19} /><span>Me</span></button></div>
      </nav>
    </div>
  )
}
