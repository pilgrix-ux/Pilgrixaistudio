/** Pilgrix AI Lab — custom AI video creation workspace. */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  ChevronRight,
  FileVideo,
  FolderOpen,
  Menu,
  Paperclip,
  Plus,
  Search,
  Settings,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { editorService } from '@/services/editorService'

type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string }
type LocalAttachment = { id: string; file: File; url: string }
type Panel = 'none' | 'menu' | 'account' | 'projects' | 'search' | 'settings'

const starterPrompts = [
  'Make the strongest moments into one clean edit',
  'Turn this footage into a fast cinematic reel',
  'Match my footage to this reference style',
]

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Create a video with Pilgrix AI',
}

export function AiLabWorkspace(): JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage])
  const [prompt, setPrompt] = useState('')
  const [attachments, setAttachments] = useState<LocalAttachment[]>([])
  const [working, setWorking] = useState(false)
  const [panel, setPanel] = useState<Panel>('none')
  const [chatTitle, setChatTitle] = useState('AI Video')
  const [searchTerm, setSearchTerm] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => () => {
    attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url))
  }, [attachments])

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return
    setAttachments((current) => [
      ...current,
      ...Array.from(files).map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      })),
    ])
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => {
      const item = current.find((attachment) => attachment.id === id)
      if (item) URL.revokeObjectURL(item.url)
      return current.filter((attachment) => attachment.id !== id)
    })
  }, [])

  const startNewChat = useCallback(() => {
    attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url))
    setMessages([{ ...welcomeMessage, id: crypto.randomUUID() }])
    setAttachments([])
    setPrompt('')
    setChatTitle('AI Video')
    setPanel('none')
  }, [attachments])

  const send = useCallback(async () => {
    const trimmed = prompt.trim()
    if ((!trimmed && attachments.length === 0) || working) return

    const currentAttachments = [...attachments]
    setWorking(true)
    setChatTitle(trimmed ? trimmed.slice(0, 34) : 'Media edit')
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: 'user',
        text: trimmed || `Uploaded ${currentAttachments.length} media file${currentAttachments.length === 1 ? '' : 's'}.`,
      },
    ])
    setPrompt('')

    try {
      const result = await editorService.requestInstruction({
        projectId: 'ai-lab',
        instruction: trimmed || 'Analyze and prepare the uploaded media.',
        context: {
          attachments: currentAttachments.map(({ id, file }) => ({
            id,
            filename: file.name,
            mimeType: file.type,
            size: file.size,
          })),
        },
      })

      const message = result.error?.userMessage
        ?? (result.status === 'accepted'
          ? 'Your edit request was accepted. The finished result will appear here when rendering completes.'
          : `Edit request status: ${result.status}.`)

      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'assistant', text: message },
      ])
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: error instanceof Error
            ? error.message
            : 'I could not start that edit. Nothing was rendered or claimed as complete.',
        },
      ])
    } finally {
      setWorking(false)
    }
  }, [attachments, prompt, working])

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#111]">
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#fdfcf9]/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center">
          <button
            type="button"
            onClick={() => setPanel('menu')}
            className="group flex h-11 w-11 items-center justify-center justify-self-start rounded-2xl border border-black/[0.07] bg-white shadow-[0_5px_20px_rgba(0,0,0,.07)] transition hover:-translate-y-0.5 hover:shadow-[0_9px_28px_rgba(0,0,0,.10)] active:scale-95"
            aria-label="Open workspace menu"
          >
            <Menu size={22} strokeWidth={1.7} className="transition group-hover:scale-105" />
          </button>

          <button type="button" onClick={() => setPanel('projects')} className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.34em] text-[#1591d0]">PILGRIX</div>
            <div className="mt-0.5 text-[18px] font-semibold tracking-[-0.03em]">AI Lab</div>
          </button>

          <button
            type="button"
            onClick={() => setPanel('account')}
            className="group flex h-11 w-11 items-center justify-center justify-self-end rounded-2xl border border-black/[0.07] bg-white shadow-[0_5px_20px_rgba(0,0,0,.07)] transition hover:-translate-y-0.5 hover:shadow-[0_9px_28px_rgba(0,0,0,.10)] active:scale-95"
            aria-label="Open Me"
          >
            <User size={22} strokeWidth={1.7} className="transition group-hover:scale-105" />
          </button>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-65px)] max-w-5xl flex-col px-4 pb-48 pt-8">
        <div className="flex flex-1 flex-col">
          <div className="mb-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#1591d0]">AI VIDEO CREATOR</p>
            <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.045em] sm:text-[34px]">{chatTitle}</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/45">Describe the video you want. Add footage, references, or both.</p>
          </div>

          <div className="mx-auto w-full max-w-3xl flex-1 space-y-4">
            {messages.length > 1 && messages.slice(1).map((message) => (
              <article
                key={message.id}
                className={`max-w-[88%] rounded-[26px] px-5 py-4 ${message.role === 'user'
                  ? 'ml-auto bg-[#111] text-white shadow-[0_10px_30px_rgba(0,0,0,.13)]'
                  : 'bg-white text-[#111] shadow-[0_8px_28px_rgba(0,0,0,.055)] ring-1 ring-black/[0.05]'}`}
              >
                <p className="whitespace-pre-wrap text-[15px] leading-7">{message.text}</p>
              </article>
            ))}

            {attachments.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="relative overflow-hidden rounded-[24px] bg-white shadow-[0_8px_28px_rgba(0,0,0,.055)] ring-1 ring-black/[0.06]">
                    {attachment.file.type.startsWith('video/') ? (
                      <video className="max-h-72 w-full bg-black object-contain" controls src={attachment.url} />
                    ) : attachment.file.type.startsWith('image/') ? (
                      <img className="max-h-72 w-full object-contain" src={attachment.url} alt={attachment.file.name} />
                    ) : (
                      <div className="flex h-28 items-center justify-center bg-[#f1f5f7]"><FileVideo size={26} className="text-black/35" /></div>
                    )}
                    <div className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2 truncate"><FileVideo size={16} /> {attachment.file.name}</span>
                      <button type="button" onClick={() => removeAttachment(attachment.id)} className="rounded-full p-2 hover:bg-black/5" aria-label={`Remove ${attachment.file.name}`}><X size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {working && (
              <div className="flex max-w-[88%] items-center gap-3 rounded-[26px] bg-white px-5 py-4 text-sm text-black/50 shadow-sm ring-1 ring-black/[0.05]">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#1591d0]" /> Preparing your request…
              </div>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/[0.05] bg-[#f7f5f0]/95 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {starterPrompts.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPrompt(item)}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-black/[0.07] bg-white px-4 py-2.5 text-xs font-medium text-black/70 shadow-[0_4px_18px_rgba(0,0,0,.045)] transition hover:-translate-y-0.5 hover:text-black"
                >
                  <Sparkles size={13} className="text-[#1591d0]" /> {item}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-[30px] border border-black/[0.10] bg-white shadow-[0_16px_55px_rgba(0,0,0,.13)] ring-1 ring-white">
              {attachments.length > 0 && (
                <div className="flex gap-2 overflow-x-auto border-b border-black/[0.06] px-4 py-3">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex shrink-0 items-center gap-2 rounded-xl bg-[#f2f5f6] px-3 py-2 text-xs">
                      <FileVideo size={14} />
                      <span className="max-w-32 truncate">{attachment.file.name}</span>
                      <button type="button" onClick={() => removeAttachment(attachment.id)} aria-label={`Remove ${attachment.file.name}`}><X size={13} /></button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void send()
                  }
                }}
                rows={3}
                placeholder="Describe the video you want to create…"
                className="block min-h-[92px] w-full resize-none bg-transparent px-5 pt-5 text-[16px] font-medium leading-7 text-[#111] caret-[#1591d0] outline-none placeholder:text-black/35 placeholder:opacity-100"
                aria-label="Describe your video"
              />

              <div className="flex items-center justify-between gap-2 px-3 pb-3">
                <div className="flex items-center gap-1.5">
                  <input
                    ref={fileInput}
                    type="file"
                    accept="video/*,audio/*,image/*"
                    multiple
                    hidden
                    onChange={(event) => {
                      addFiles(event.target.files)
                      event.currentTarget.value = ''
                    }}
                  />
                  <button type="button" onClick={() => fileInput.current?.click()} className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-black/55 transition hover:bg-black/[0.05] hover:text-black" aria-label="Add media">
                    <Paperclip size={19} strokeWidth={1.8} /> Add media
                  </button>
                  <span className="hidden h-5 w-px bg-black/10 sm:block" />
                  <span className="hidden text-xs text-black/35 sm:block">Video • Image • Audio</span>
                </div>

                <button
                  type="button"
                  disabled={working || (!prompt.trim() && attachments.length === 0)}
                  onClick={() => void send()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[#111] text-white shadow-[0_7px_22px_rgba(0,0,0,.18)] transition hover:-translate-y-0.5 hover:bg-[#1591d0] disabled:translate-y-0 disabled:opacity-25"
                  aria-label="Create video"
                >
                  <ArrowUp size={20} strokeWidth={2.2} />
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] tracking-wide text-black/30">Pilgrix turns your direction into an editable video.</p>
          </div>
        </div>
      </section>

      {panel !== 'none' && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[3px]" onClick={() => setPanel('none')}>
          <aside
            onClick={(event) => event.stopPropagation()}
            className={`absolute top-0 h-full w-[90%] max-w-[390px] overflow-y-auto bg-[#fbfaf7] p-5 shadow-[20px_0_60px_rgba(0,0,0,.18)] ${panel === 'menu' || panel === 'projects' ? 'left-0' : 'right-0'}`}
          >
            <div className="mb-8 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.34em] text-[#1591d0]">PILGRIX</div>
                <div className="mt-1 text-xl font-semibold">{panel === 'menu' ? 'Your workspace' : panel === 'account' ? 'Me' : panel === 'projects' ? 'Projects' : panel === 'search' ? 'Find a chat' : 'Settings'}</div>
              </div>
              <button type="button" onClick={() => setPanel('none')} className="rounded-2xl border border-black/[0.07] bg-white p-2.5 shadow-sm hover:bg-black/[0.03]" aria-label="Close"><X size={19} /></button>
            </div>

            {panel === 'menu' && (
              <div className="space-y-3">
                {([
                  ['New edit', Plus, startNewChat],
                  ['Projects', FolderOpen, () => setPanel('projects')],
                  ['Search chats', Search, () => setPanel('search')],
                  ['Settings', Settings, () => setPanel('settings')],
                ] as const).map(([label, Icon, action]) => (
                  <button key={label} type="button" onClick={action} className="group flex w-full items-center gap-3 rounded-[22px] border border-black/[0.06] bg-white px-4 py-4 text-left shadow-[0_6px_24px_rgba(0,0,0,.045)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,.08)]">
                    <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#edf5f8] text-[#1591d0]"><Icon size={18} /></span>
                    <span className="flex-1 text-sm font-semibold">{label}</span>
                    <ChevronRight size={16} className="text-black/20 transition group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            )}

            {panel === 'account' && (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-[28px] bg-[#111] p-6 text-white shadow-[0_14px_35px_rgba(0,0,0,.15)]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/10"><User size={24} /></div>
                  <div className="mt-5 text-xl font-semibold tracking-[-0.02em]">Your Pilgrix space</div>
                  <p className="mt-1.5 text-sm leading-6 text-white/55">Your profile, plan and creative preferences.</p>
                </div>
                {['Profile & preferences', 'Plan & usage', 'Notifications', 'Appearance'].map((item) => (
                  <button key={item} type="button" className="flex w-full items-center justify-between rounded-[20px] border border-black/[0.06] bg-white px-4 py-4 text-sm font-medium shadow-sm hover:bg-black/[0.015]"><span>{item}</span><ChevronRight size={16} className="text-black/20" /></button>
                ))}
              </div>
            )}

            {panel === 'projects' && (
              <div className="rounded-[28px] border border-black/[0.07] bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#edf5f8] text-[#1591d0]"><FolderOpen size={21} /></div>
                <h3 className="mt-5 text-lg font-semibold">Your edits</h3>
                <p className="mt-1.5 text-sm leading-6 text-black/45">Drafts and finished creations will live here as you build.</p>
                <button type="button" onClick={startNewChat} className="mt-5 rounded-full bg-[#111] px-5 py-2.5 text-xs font-semibold text-white">Start a new edit</button>
              </div>
            )}

            {panel === 'search' && (
              <div>
                <div className="flex items-center gap-2 rounded-[20px] border border-black/[0.07] bg-white px-4 py-3.5 shadow-sm">
                  <Search size={17} className="text-black/35" />
                  <input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search your chats…" className="min-w-0 flex-1 bg-transparent text-sm text-[#111] outline-none placeholder:text-black/35" />
                </div>
                <div className="mt-5 rounded-[22px] bg-white p-5 text-sm text-black/45 ring-1 ring-black/[0.05]">{searchTerm ? `Searching for “${searchTerm}”…` : 'Your saved conversations will appear here.'}</div>
              </div>
            )}

            {panel === 'settings' && (
              <div className="space-y-3">
                {['Appearance', 'Notifications', 'Language', 'Privacy'].map((item) => (
                  <button key={item} type="button" className="flex w-full items-center justify-between rounded-[20px] border border-black/[0.06] bg-white px-4 py-4 text-sm font-medium shadow-sm"><span>{item}</span><ChevronRight size={16} className="text-black/20" /></button>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  )
}
