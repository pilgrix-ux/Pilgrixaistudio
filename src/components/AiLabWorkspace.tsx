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
  UserRound,
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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [prompt, setPrompt] = useState('')
  const [pendingAsset, setPendingAsset] = useState<MediaAsset | null>(null)
  const [sessionProject, setSessionProject] = useState<Project | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isMeOpen, setIsMeOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = window.localStorage.getItem('pilgrix-ai-lab-thread')
    if (!saved) return
    try {
      setMessages(JSON.parse(saved) as ChatMessage[])
    } catch {
      window.localStorage.removeItem('pilgrix-ai-lab-thread')
    }
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      window.localStorage.setItem('pilgrix-ai-lab-thread', JSON.stringify(messages))
    }
  }, [messages])

  const ensureSessionProject = useCallback(async (): Promise<Project | null> => {
    if (sessionProject) return sessionProject
    const response = await projectService.createProject({
      name: 'AI Lab Session',
      description: 'Conversation-driven Pilgrix editing workspace',
      status: 'active',
    })
    if (!response.ok || !response.data) return null
    setSessionProject(response.data)
    return response.data
  }, [sessionProject])

  const handleFile = useCallback(async (file: File): Promise<void> => {
    if (!['video/', 'image/', 'audio/'].some((type) => file.type.startsWith(type))) return
    const project = await ensureSessionProject()
    if (!project) return
    const response = await mediaService.uploadMedia(project.id, file)
    if (response.ok && response.data) setPendingAsset(response.data)
  }, [ensureSessionProject])

  const handleSend = useCallback(async (): Promise<void> => {
    const text = prompt.trim()
    if (!text || isSending) return
    const project = await ensureSessionProject()
    if (!project) return

    const asset = pendingAsset ?? undefined
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text, asset }])
    setPrompt('')
    setPendingAsset(null)
    setIsSending(true)

    const result = await editorService.requestInstruction({
      projectId: project.id,
      mediaId: asset?.id,
      instruction: text,
      context: { interface: 'ai-lab', mediaAttached: Boolean(asset), requestIntent: text },
    })

    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text:
          result.status === 'not_configured'
            ? 'Your edit request is captured. The AI editing provider is not connected in this environment yet, so I will not pretend an edit was rendered.'
            : 'Your edit request has been accepted by the editing engine.',
      },
    ])
    setIsSending(false)
  }, [ensureSessionProject, isSending, pendingAsset, prompt])

  const handleNewChat = (): void => {
    setMessages([])
    setPendingAsset(null)
    setPrompt('')
    window.localStorage.removeItem('pilgrix-ai-lab-thread')
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-950">
      {isHistoryOpen && (
        <>
          <button aria-label="Close chat history" className="absolute inset-0 z-30 bg-slate-950/20" onClick={() => setIsHistoryOpen(false)} />
          <aside className="absolute inset-y-0 left-0 z-40 flex w-[310px] flex-col border-r border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p><h2 className="mt-1 text-lg font-semibold">Your chats</h2></div>
              <button onClick={() => setIsHistoryOpen(false)} className="rounded-full p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 p-3">
              <button className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-4 py-4 text-left ring-1 ring-slate-100">
                <Sparkles className="h-5 w-5 text-cyan-500" />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">AI Lab Session</span><span className="mt-1 block text-xs text-slate-500">Current conversation</span></span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <button onClick={handleNewChat} className="m-4 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold hover:bg-slate-50"><Plus className="h-4 w-4" /> New chat</button>
          </aside>
        </>
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur md:px-7">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsHistoryOpen(true)} aria-label="Open chat history" className="rounded-xl p-2.5 hover:bg-slate-100"><Menu className="h-5 w-5" /></button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-cyan-500/15"><Sparkles className="h-5 w-5 text-white" /></div>
              <div><h1 className="text-[17px] font-semibold tracking-tight">AI Lab</h1><div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Creative workspace</div></div>
            </div>
          </div>
          <button className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100" aria-label="More options"><MoreHorizontal className="h-5 w-5" /></button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 pb-36 pt-8 md:px-8 md:pt-12">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center pb-10 text-center">
                <div className="mb-7 flex h-20 w-20 items-center justify-center rounded-[28px] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-100"><Sparkles className="h-9 w-9 text-cyan-500" /></div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600">Pilgrix</p>
                <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.04em] md:text-5xl">What are we creating today?</h2>
                <p className="mt-4 max-w-lg text-sm leading-6 text-slate-500 md:text-base">Drop in your footage, describe the result, and let the Lab turn the conversation into an edit.</p>
                <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
                  {starterPrompts.map((item) => <button key={item} onClick={() => setPrompt(item)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm leading-5 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md">{item}</button>)}
                </div>
              </div>
            ) : (
              <div className="space-y-7">
                {messages.map((message) => (
                  <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    <div className={message.role === 'user' ? 'max-w-[85%] rounded-[24px] rounded-br-md bg-slate-950 px-5 py-4 text-white' : 'max-w-[88%] px-1 py-2'}>
                      {message.asset && <div className="mb-3 overflow-hidden rounded-2xl bg-slate-900/10 ring-1 ring-white/10">
                        {message.asset.mimeType.startsWith('video/') ? <video src={message.asset.previewUrl} controls className="max-h-80 w-full bg-black" /> : message.asset.mimeType.startsWith('image/') ? <img src={message.asset.previewUrl} alt={message.asset.filename} className="max-h-80 w-full object-contain" /> : null}
                        <div className="flex items-center gap-2 px-3 py-2 text-xs opacity-80"><FileVideo className="h-3.5 w-3.5" /><span className="truncate">{message.asset.filename}</span><span>{formatBytes(message.asset.size)}</span></div>
                      </div>}
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>
                    </div>
                  </div>
                ))}
                {isSending && <div className="flex items-center gap-3 px-1 py-3 text-sm text-slate-500"><div className="flex gap-1"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500 [animation-delay:120ms]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500 [animation-delay:240ms]" /></div>Preparing your edit request…</div>}
              </div>
            )}
          </div>
        </main>

        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#f7f8fa] via-[#f7f8fa] to-transparent px-3 pb-[86px] pt-8 md:px-8 md:pb-8">
          <div className="mx-auto max-w-4xl">
            {pendingAsset && <div className="mb-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"><div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-slate-100">{pendingAsset.mimeType.startsWith('image/') && pendingAsset.previewUrl ? <img src={pendingAsset.previewUrl} alt="" className="h-full w-full object-cover" /> : <FileVideo className="h-5 w-5 text-slate-500" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{pendingAsset.filename}</p><p className="text-xs text-slate-500">Attached to this edit request</p></div><button onClick={() => setPendingAsset(null)} className="rounded-full p-1.5 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>}
            <div className="rounded-[26px] border border-slate-200 bg-white p-2 shadow-[0_16px_50px_rgba(15,23,42,0.10)] focus-within:border-cyan-300 focus-within:ring-4 focus-within:ring-cyan-100/60">
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSend() } }} rows={2} placeholder="Tell Pilgrix what you want to make…" className="w-full resize-none bg-transparent px-4 pt-2 text-sm leading-6 outline-none placeholder:text-slate-400" />
              <div className="flex items-center justify-between px-2 pb-1 pt-1">
                <div className="flex items-center gap-1"><input ref={fileInputRef} type="file" accept="video/*,image/*,audio/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); event.target.value = '' }} /><button onClick={() => fileInputRef.current?.click()} className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Attach media"><Paperclip className="h-5 w-5" /></button><button onClick={() => fileInputRef.current?.click()} className="hidden rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 sm:flex sm:items-center sm:gap-1.5"><Upload className="h-4 w-4" /> Add media</button></div>
                <button onClick={() => void handleSend()} disabled={!prompt.trim() || isSending} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Send edit request"><Send className="h-4 w-4" /></button>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">Pilgrix works on the media you provide. It will tell you when a requested edit cannot be made from the available footage.</p>
          </div>
        </div>
      </section>

      <nav className="absolute inset-x-0 bottom-0 z-30 flex h-[70px] items-center justify-center border-t border-slate-200/80 bg-white/95 px-6 backdrop-blur md:hidden">
        <button className="flex flex-col items-center gap-1 rounded-2xl px-7 py-2 text-cyan-600"><Sparkles className="h-5 w-5" /><span className="text-[10px] font-semibold">AI Lab</span></button>
        <button onClick={() => setIsMeOpen(true)} className="flex flex-col items-center gap-1 rounded-2xl px-7 py-2 text-slate-500"><Settings className="h-5 w-5" /><span className="text-[10px] font-semibold">Me</span></button>
      </nav>

      {isMeOpen && <><button aria-label="Close account menu" className="absolute inset-0 z-40 bg-slate-950/20" onClick={() => setIsMeOpen(false)} /><aside className="absolute inset-x-0 bottom-0 z-50 rounded-t-[30px] border-t border-slate-200 bg-white p-5 shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:w-[360px] md:rounded-none md:border-l md:border-t-0"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Account</p><h2 className="mt-1 text-xl font-semibold">Me</h2></div><button onClick={() => setIsMeOpen(false)} className="rounded-full p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="space-y-2"><button className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-4 text-left hover:bg-slate-50"><UserRound className="h-5 w-5 text-slate-500" /><span className="flex-1 text-sm font-medium">Profile & account</span><ChevronRight className="h-4 w-4 text-slate-400" /></button><button className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-4 text-left hover:bg-slate-50"><Settings className="h-5 w-5 text-slate-500" /><span className="flex-1 text-sm font-medium">Settings</span><ChevronRight className="h-4 w-4 text-slate-400" /></button><button className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-4 text-left hover:bg-slate-50"><Archive className="h-5 w-5 text-slate-500" /><span className="flex-1 text-sm font-medium">Projects & saved work</span><ChevronRight className="h-4 w-4 text-slate-400" /></button></div></aside></>}
    </div>
  )
}
