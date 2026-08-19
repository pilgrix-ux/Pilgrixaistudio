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

export function AiLabWorkspace(): JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', text: 'Tell me what you want to make. Upload your footage or describe the edit.' },
  ])
  const [prompt, setPrompt] = useState('')
  const [attachments, setAttachments] = useState<MediaAsset[]>([])
  const [working, setWorking] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void projectService.listProjects().then(setProjects).catch(() => setProjects([]))
  }, [])

  const addFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    const next: MediaAsset[] = []
    for (const file of Array.from(files)) {
      try {
        next.push(await mediaService.createLocalAsset(file))
      } catch {
        // Keep a failed local asset out of the conversation rather than pretending it uploaded.
      }
    }
    setAttachments((current) => [...current, ...next])
  }, [])

  const send = useCallback(async (text = prompt) => {
    const trimmed = text.trim()
    if (!trimmed && attachments.length === 0) return
    setWorking(true)
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: trimmed || 'Uploaded media.' }
    setMessages((current) => [...current, userMessage])
    setPrompt('')

    try {
      const result = await editorService.createEditJob({
        prompt: trimmed || 'Analyze and prepare the uploaded media.',
        mediaIds: attachments.map((asset) => asset.id),
      })
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: result.message || 'Your edit request was accepted. I will show the finished result here when rendering completes.',
      }])
    } catch (error) {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: error instanceof Error ? error.message : 'I could not start that edit. Nothing was rendered or claimed as complete.',
      }])
    } finally {
      setWorking(false)
    }
  }, [attachments, prompt])

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-[#111]">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <button type="button" className="rounded-xl p-2 hover:bg-black/5" aria-label="Open chats"><Menu size={21} /></button>
          <div className="text-center"><div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#1688d4]">Pilgrix</div><h1 className="text-lg font-semibold">AI Lab</h1></div>
          <button type="button" className="rounded-xl p-2 hover:bg-black/5" aria-label="Account settings"><User size={21} /></button>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-5xl flex-col px-4 pb-32 pt-6">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.map((message) => (
            <article key={message.id} className={`max-w-[88%] rounded-3xl px-4 py-3 ${message.role === 'user' ? 'ml-auto bg-[#111] text-white' : 'bg-white shadow-sm ring-1 ring-black/5'}`}>
              <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>
            </article>
          ))}
          {attachments.map((asset) => (
            <div key={asset.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
              <video className="max-h-[420px] w-full object-contain" controls src={asset.url} />
              <div className="flex items-center gap-2 px-4 py-3 text-sm"><FileVideo size={17} /> {asset.name}</div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/5 bg-[#f8f7f4]/95 p-3 backdrop-blur">
          <div className="mx-auto max-w-5xl">
            <div className="mb-2 flex gap-2 overflow-x-auto">
              {starterPrompts.map((item) => <button key={item} type="button" onClick={() => { setPrompt(item); void send(item) }} className="shrink-0 rounded-full bg-white px-3 py-2 text-xs shadow-sm ring-1 ring-black/5">{item}</button>)}
            </div>
            <div className="flex items-end gap-2 rounded-3xl bg-white p-2 shadow-lg ring-1 ring-black/5">
              <input ref={fileInput} type="file" accept="video/*,audio/*,image/*" multiple hidden onChange={(event) => { void addFiles(event.target.files); event.currentTarget.value = '' }} />
              <button type="button" onClick={() => fileInput.current?.click()} className="rounded-2xl p-3 hover:bg-black/5" aria-label="Attach media"><Paperclip size={19} /></button>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }} rows={1} placeholder="Tell Pilgrix what you want to make..." className="max-h-32 min-h-12 flex-1 resize-none bg-transparent px-1 py-3 text-sm outline-none" />
              <button type="button" disabled={working} onClick={() => void send()} className="rounded-2xl bg-[#111] p-3 text-white disabled:opacity-40" aria-label="Send"><Send size={18} /></button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
