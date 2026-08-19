/** Pilgrix AI Lab — distinctive AI creation workspace. */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  Camera,
  ChevronRight,
  File,
  FileVideo,
  FolderOpen,
  Image,
  Menu,
  Mic,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  User,
  X,
  type LucideIcon,
} from 'lucide-react'
import { editorService } from '@/services/editorService'

type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string }
type LocalAttachment = { id: string; file: File; url: string }
type Panel = 'none' | 'menu' | 'account' | 'projects' | 'search' | 'settings'
type Theme = 'light' | 'dark'
type MenuItem = { label: string; icon: LucideIcon; action: () => void }

const starterPrompts = [
  { title: 'Auto Edit', text: 'Find the strongest moments and make one clean edit.', icon: Sparkles, tone: 'cyan' },
  { title: 'Story Cut', text: 'Turn these clips into a clear cinematic story.', icon: FolderOpen, tone: 'blue' },
  { title: 'Beat Sync', text: 'Cut the footage to the rhythm of my music.', icon: MoreHorizontal, tone: 'violet' },
  { title: 'Viral Short', text: 'Make a punchy short with the best moments.', icon: Sparkles, tone: 'pink' },
]

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Bring the footage. Bring the idea. Pilgrix does the rest.',
}

const recentCreations = [
  { title: 'Cinematic cut', meta: 'AI edit · ready to remix', className: 'from-[#0d2437] via-[#126b93] to-[#68d8ee]' },
  { title: 'Story sequence', meta: 'AI edit · 24s', className: 'from-[#261a46] via-[#6645b8] to-[#e38cff]' },
  { title: 'Beat montage', meta: 'AI edit · 31s', className: 'from-[#30251a] via-[#b46d36] to-[#ffd28c]' },
]

export function AiLabWorkspace(): JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage])
  const [prompt, setPrompt] = useState('')
  const [attachments, setAttachments] = useState<LocalAttachment[]>([])
  const [working, setWorking] = useState(false)
  const [focused, setFocused] = useState(false)
  const [panel, setPanel] = useState<Panel>('none')
  const [search, setSearch] = useState('')
  const [theme, setTheme] = useState<Theme>('light')
  const [attachmentSheet, setAttachmentSheet] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)

  const dark = theme === 'dark'

  useEffect(() => {
    const saved = window.localStorage.getItem('pilgrix-theme')
    if (saved === 'dark' || saved === 'light') setTheme(saved)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('pilgrix-theme', theme)
  }, [theme])

  useEffect(() => {
    return () => attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url))
  }, [attachments])

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return
    const next = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }))
    setAttachments((current) => [...current, ...next])
    setAttachmentSheet(false)
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
    setPanel('none')
    setAttachmentSheet(false)
  }, [attachments])

  const send = useCallback(async () => {
    const trimmed = prompt.trim()
    if ((!trimmed && !attachments.length) || working) return

    const files = [...attachments]
    setWorking(true)
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: 'user',
        text: trimmed || `Uploaded ${files.length} media file${files.length === 1 ? '' : 's'}.`,
      },
    ])
    setPrompt('')

    try {
      const result = await editorService.requestInstruction({
        projectId: 'ai-lab',
        instruction: trimmed || 'Analyze and prepare the uploaded media.',
        context: {
          attachments: files.map(({ id, file }) => ({
            id,
            filename: file.name,
            mimeType: file.type,
            size: file.size,
          })),
        },
      })

      const text = result.error?.userMessage ?? (
        result.status === 'accepted'
          ? 'Your request is in the edit pipeline. The finished result will appear here when rendering completes.'
          : `Edit request status: ${result.status}.`
      )

      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text }])
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: error instanceof Error ? error.message : 'I could not start that edit.',
        },
      ])
    } finally {
      setWorking(false)
    }
  }, [attachments, prompt, working])

  const hasInput = prompt.trim().length > 0 || attachments.length > 0

  const menuItems: MenuItem[] = [
    { label: 'New creation', icon: Plus, action: startNewChat },
    { label: 'Projects', icon: FolderOpen, action: () => setPanel('projects') },
    { label: 'Search creations', icon: Search, action: () => setPanel('search') },
    { label: 'Settings', icon: Settings, action: () => setPanel('settings') },
  ]

  const surface = dark ? 'bg-[#0b0d12]' : 'bg-[#f3f7fb]'
  const text = dark ? 'text-white' : 'text-[#101318]'
  const muted = dark ? 'text-white/45' : 'text-black/38'
  const card = dark ? 'bg-[#151821] border-white/[.08]' : 'bg-white border-black/[.05]'

  return (
    <main className={`min-h-screen overflow-x-hidden transition-colors duration-300 ${surface} ${text}`}>
      <header className={`sticky top-0 z-40 border-b px-4 py-3 backdrop-blur-2xl transition-colors ${dark ? 'border-white/[.06] bg-[#0b0d12]/90' : 'border-black/[.045] bg-white/90'}`}>
        <div className="mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center">
          <button type="button" onClick={() => setPanel('menu')} aria-label="Open menu" className={`group justify-self-start rounded-[18px] border p-2.5 shadow-[0_6px_22px_rgba(15,23,42,.07)] transition hover:-translate-y-0.5 active:scale-95 ${dark ? 'border-white/[.08] bg-[#151821]' : 'border-black/[.07] bg-white'}`}>
            <Menu size={22} strokeWidth={1.8} />
          </button>
          <button type="button" onClick={() => setPanel('projects')} className="text-center">
            <div className="text-[9px] font-bold tracking-[.36em] text-[#1688d4]">PILGRIX</div>
            <div className="mt-0.5 text-[18px] font-semibold tracking-[-.03em]">AI Lab</div>
          </button>
          <button type="button" onClick={() => setPanel('account')} aria-label="Open Me" className={`group justify-self-end rounded-[18px] border p-2.5 shadow-[0_6px_22px_rgba(15,23,42,.07)] transition hover:-translate-y-0.5 active:scale-95 ${dark ? 'border-white/[.08] bg-[#151821]' : 'border-black/[.07] bg-white'}`}>
            <User size={22} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-61px)] max-w-5xl flex-col px-4 pb-60 pt-9">
        <div className="mb-7">
          <div className={`mb-3 text-[10px] font-bold uppercase tracking-[.28em] ${muted}`}>AI creation studio</div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-[34px] font-semibold leading-[.98] tracking-[-.06em] sm:text-[44px]">What are we creating<br className="sm:hidden" /> today?</h1>
              <p className={`mt-3 max-w-[310px] text-[14px] leading-6 ${muted}`}>Bring the footage. Bring the idea. Pilgrix does the rest.</p>
            </div>
            <button type="button" onClick={startNewChat} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium shadow-[0_7px_25px_rgba(15,23,42,.07)] transition active:scale-95 ${card}`}>
              <Plus size={17} /> New
            </button>
          </div>
        </div>

        {messages.length > 1 && (
          <div className="mb-5 space-y-3">
            {messages.slice(1).map((message) => (
              <article key={message.id} className={`max-w-[88%] rounded-[24px] px-5 py-4 ${message.role === 'user' ? 'ml-auto bg-[#101217] text-white shadow-[0_8px_24px_rgba(0,0,0,.18)]' : `${card} border shadow-[0_8px_28px_rgba(0,0,0,.045)]`}`}>
                <p className="whitespace-pre-wrap text-[14px] leading-6">{message.text}</p>
              </article>
            ))}
          </div>
        )}

        {working && (
          <div className={`mb-5 flex items-center gap-2 rounded-full border px-4 py-3 text-xs ${card} ${muted}`}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00c7ff]" /> Preparing your creation…
          </div>
        )}

        <div className="mt-auto">
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold uppercase tracking-[.22em]">AI ideas</span>
              <button type="button" onClick={() => setPanel('projects')} className="text-xs font-medium text-[#1688d4]">See all</button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {starterPrompts.map((item) => {
                const Icon = item.icon
                return (
                  <button key={item.title} type="button" onClick={() => setPrompt(item.text)} className={`group w-[142px] shrink-0 rounded-[20px] border p-3 text-left transition hover:-translate-y-0.5 active:scale-[.98] ${card}`}>
                    <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-[13px] ${item.tone === 'cyan' ? 'bg-cyan-400/[.12] text-cyan-500' : item.tone === 'blue' ? 'bg-blue-500/[.12] text-blue-500' : item.tone === 'violet' ? 'bg-violet-500/[.12] text-violet-500' : 'bg-pink-500/[.12] text-pink-500'}`}>
                      <Icon size={17} />
                    </span>
                    <span className="block text-[13px] font-semibold">{item.title}</span>
                    <span className={`mt-1 block text-[10px] leading-4 ${muted}`}>{item.text}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold uppercase tracking-[.22em]">Your creations</span>
              <button type="button" onClick={() => setPanel('projects')} className="text-xs font-medium text-[#1688d4]">See all</button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {recentCreations.map((creation) => (
                <button key={creation.title} type="button" onClick={() => setPanel('projects')} className="group w-[152px] shrink-0 text-left">
                  <div className={`relative h-[94px] overflow-hidden rounded-[18px] bg-gradient-to-br ${creation.className} p-3 shadow-sm transition group-hover:-translate-y-0.5`}>
                    <Sparkles className="absolute right-3 top-3 text-white/75" size={14} />
                    <span className="absolute bottom-3 left-3 rounded-full bg-black/20 px-2 py-1 text-[9px] font-medium text-white backdrop-blur-sm">AI creation</span>
                  </div>
                  <div className="mt-2 text-[12px] font-semibold">{creation.title}</div>
                  <div className={`mt-0.5 text-[10px] ${muted}`}>{creation.meta}</div>
                </button>
              ))}
            </div>
          </div>

          <div className={`relative overflow-hidden rounded-[30px] border p-2.5 backdrop-blur-xl transition-all duration-300 ${dark ? 'border-white/[.09] bg-[#111823]/95' : 'border-white bg-[#f7fbff]/95'} ${focused ? 'shadow-[0_18px_65px_rgba(0,184,255,.23),0_0_0_5px_rgba(75,205,246,.10)]' : 'shadow-[0_16px_50px_rgba(33,55,78,.13)]'}`}>
            <div className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-[82%] -translate-x-1/2 rounded-full bg-[#00c7ff]/[.12] blur-3xl" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-violet-500/[.10] blur-3xl" />

            <div className="relative px-2 pt-1">
              <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-[#1688d4]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00c7ff]/[.12]"><Sparkles size={12} /></span>
                Pilgrix AI
              </div>

              {attachments.length > 0 && (
                <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-[12px] ${dark ? 'bg-[#202632]' : 'bg-white'} shadow-sm ring-1 ring-black/[.06]`}>
                      {attachment.file.type.startsWith('video/') ? (
                        <video className="h-full w-full object-cover" muted src={attachment.url} />
                      ) : attachment.file.type.startsWith('image/') ? (
                        <img className="h-full w-full object-cover" src={attachment.url} alt={attachment.file.name} />
                      ) : (
                        <div className="flex h-full items-center justify-center"><FileVideo size={17} className="text-[#1688d4]" /></div>
                      )}
                      <button type="button" onClick={() => removeAttachment(attachment.id)} aria-label="Remove attachment" className="absolute right-0.5 top-0.5 rounded-full bg-black/65 p-0.5 text-white"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={prompt}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void send()
                  }
                }}
                rows={2}
                placeholder="Describe the video you imagine…"
                className={`block min-h-[76px] w-full resize-none bg-transparent px-1 pt-1 text-[18px] leading-7 caret-[#00aeea] outline-none sm:text-[19px] ${dark ? 'text-white placeholder:text-white/30' : 'text-[#15191e] placeholder:text-[#a6b0bb]'}`}
              />
            </div>

            <div className="relative flex items-center justify-between gap-2 px-0.5 pb-0.5 pt-2">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setAttachmentSheet(true)} aria-label="Add media" className={`flex h-12 w-12 items-center justify-center rounded-full border transition hover:border-[#9bdff4] hover:text-[#00aeea] hover:shadow-[0_0_28px_rgba(0,196,255,.20)] active:scale-95 ${dark ? 'border-white/[.09] bg-[#171d27]' : 'border-black/[.07] bg-white'}`}>
                  <Plus size={25} strokeWidth={1.8} />
                </button>
                <button type="button" onClick={() => setPanel('menu')} aria-label="More AI tools" className={`flex h-12 w-12 items-center justify-center rounded-full border transition hover:border-[#9bdff4] hover:text-[#00aeea] active:scale-95 ${dark ? 'border-white/[.09] bg-[#171d27]' : 'border-black/[.07] bg-white'}`}>
                  <span className="grid grid-cols-2 gap-[4px]">{Array.from({ length: 4 }).map((_, index) => <span key={index} className="h-[5px] w-[5px] rounded-full bg-current" />)}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" aria-label="Voice input" className={`hidden h-12 w-12 items-center justify-center rounded-full border sm:flex ${dark ? 'border-white/[.09] bg-[#171d27]' : 'border-black/[.07] bg-white'}`}><Mic size={19} /></button>
                <button type="button" disabled={working || !hasInput} onClick={() => void send()} aria-label={hasInput ? 'Create edit' : 'Voice input'} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-[0_8px_22px_rgba(15,23,42,.18)] transition active:scale-95 ${hasInput ? 'bg-[#101217] hover:bg-[#1688d4] hover:shadow-[0_0_30px_rgba(0,174,234,.32)]' : dark ? 'bg-white/12 text-white/45' : 'bg-[#101217]'}`}>
                  {hasInput ? <ArrowUp size={21} strokeWidth={2.3} /> : <Mic size={20} strokeWidth={2} />}
                </button>
              </div>
            </div>
          </div>
          <p className={`mt-2 text-center text-[10px] ${muted}`}>Your media stays attached to this creation session.</p>
        </div>
      </section>

      <input ref={fileInput} type="file" accept="*/*" multiple hidden onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = '' }} />
      <input ref={cameraInput} type="file" accept="image/*,video/*" capture="environment" hidden onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = '' }} />
      <input ref={galleryInput} type="file" accept="image/*,video/*,audio/*" multiple hidden onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = '' }} />

      {attachmentSheet && (
        <div className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm" onClick={() => setAttachmentSheet(false)}>
          <div onClick={(event) => event.stopPropagation()} className={`absolute bottom-0 left-0 right-0 rounded-t-[30px] p-5 pb-7 shadow-[0_-20px_70px_rgba(0,0,0,.25)] ${dark ? 'bg-[#111318] text-white' : 'bg-[#f8fafc] text-[#111318]'}`}>
            <div className="mx-auto mb-6 h-1.5 w-11 rounded-full bg-current opacity-20" />
            <div className="mb-5 flex items-center justify-between">
              <div><div className="text-lg font-semibold">Add to your creation</div><div className={`mt-1 text-xs ${muted}`}>Bring in the media Pilgrix should work with.</div></div>
              <button type="button" onClick={() => setAttachmentSheet(false)} className="rounded-full p-2 opacity-60"><X size={19} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Camera', icon: Camera, action: () => cameraInput.current?.click() },
                { label: 'Gallery', icon: Image, action: () => galleryInput.current?.click() },
                { label: 'Files', icon: File, action: () => fileInput.current?.click() },
              ].map((item) => {
                const Icon = item.icon
                return <button key={item.label} type="button" onClick={item.action} className={`flex min-h-[105px] flex-col items-center justify-center gap-3 rounded-[22px] border transition active:scale-[.98] ${dark ? 'border-white/[.08] bg-[#1a1e26]' : 'border-black/[.05] bg-white shadow-sm'}`}><span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#1688d4]/10 text-[#1688d4]"><Icon size={23} /></span><span className="text-xs font-medium">{item.label}</span></button>
              })}
            </div>
          </div>
        </div>
      )}

      {panel !== 'none' && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[3px]" onClick={() => setPanel('none')}>
          <aside onClick={(event) => event.stopPropagation()} className={`absolute top-0 h-full w-[88%] max-w-[370px] p-5 shadow-[20px_0_60px_rgba(0,0,0,.22)] ${panel === 'menu' || panel === 'search' ? 'left-0' : 'right-0'} ${dark ? 'bg-[#111318] text-white' : 'bg-[#f8fafc] text-[#101318]'}`}>
            <div className="mb-7 flex items-center justify-between">
              <div><div className="text-[9px] font-bold tracking-[.3em] text-[#1688d4]">PILGRIX</div><div className="mt-1 text-xl font-semibold">{panel === 'menu' ? 'Workspace' : panel === 'account' ? 'Me' : panel === 'projects' ? 'Projects' : panel === 'search' ? 'Search' : 'Settings'}</div></div>
              <button type="button" onClick={() => setPanel('none')} className={`rounded-full p-2 ${dark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`} aria-label="Close"><X size={19} /></button>
            </div>

            {panel === 'menu' && <div className="space-y-2">{menuItems.map((item) => { const Icon = item.icon; return <button key={item.label} type="button" onClick={item.action} className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 ${dark ? 'border-white/[.07] bg-[#181c24]' : 'border-black/[.05] bg-white'}`}><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${dark ? 'bg-white/5' : 'bg-[#f1f5f7]'}`}><Icon size={17} /></span><span className="flex-1 text-sm font-medium">{item.label}</span><ChevronRight size={15} className="opacity-25" /></button> })}</div>}

            {panel === 'account' && (
              <div className="space-y-3">
                <div className="rounded-[25px] bg-gradient-to-br from-[#0f1722] via-[#124a6a] to-[#6f42c1] p-5 text-white shadow-[0_15px_45px_rgba(22,136,212,.20)]"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><User size={20} /></div><div className="mt-4 text-lg font-semibold">Your workspace</div><p className="mt-1 text-sm leading-5 text-white/55">Your account, plan and creative preferences.</p></div>
                <button type="button" onClick={() => setTheme(dark ? 'light' : 'dark')} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-sm ${dark ? 'border-white/[.07] bg-[#181c24]' : 'border-black/[.05] bg-white shadow-sm'}`}><span className="flex items-center gap-3">{dark ? <Moon size={17} /> : <Sun size={17} />} Appearance</span><span className="text-xs font-medium text-[#1688d4]">{dark ? 'Dark' : 'Light'}</span></button>
                {['Profile & preferences', 'Plan & usage', 'Notifications'].map((item) => <button key={item} type="button" className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-sm ${dark ? 'border-white/[.07] bg-[#181c24]' : 'border-black/[.05] bg-white shadow-sm'}`}><span>{item}</span><ChevronRight size={15} className="opacity-25" /></button>)}
              </div>
            )}

            {panel === 'projects' && <div className="space-y-3">{recentCreations.map((creation) => <button key={creation.title} type="button" onClick={() => setPanel('none')} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${dark ? 'border-white/[.07] bg-[#181c24]' : 'border-black/[.05] bg-white shadow-sm'}`}><div className={`h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br ${creation.className}`} /><div className="min-w-0"><div className="truncate text-sm font-semibold">{creation.title}</div><div className={`mt-1 text-xs ${muted}`}>{creation.meta}</div></div></button>)}<button type="button" onClick={startNewChat} className="mt-2 w-full rounded-full bg-[#101217] px-4 py-3 text-xs font-semibold text-white">New creation</button></div>}

            {panel === 'search' && <div><div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 ${dark ? 'border-white/[.07] bg-[#181c24]' : 'border-black/[.05] bg-white'}`}><Search size={17} className="opacity-40" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your creations" className={`w-full bg-transparent text-sm outline-none ${dark ? 'placeholder:text-white/25' : 'placeholder:text-black/30'}`} /></div><p className={`mt-5 text-center text-xs ${muted}`}>{search ? `No saved creations matching “${search}” yet.` : 'Search your AI creations and sessions.'}</p></div>}

            {panel === 'settings' && <div className="space-y-2"><button type="button" onClick={() => setTheme(dark ? 'light' : 'dark')} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-sm ${dark ? 'border-white/[.07] bg-[#181c24]' : 'border-black/[.05] bg-white shadow-sm'}`}><span className="flex items-center gap-3">{dark ? <Moon size={17} /> : <Sun size={17} />} Theme</span><span className="text-xs font-medium text-[#1688d4]">{dark ? 'Dark mode' : 'Light mode'}</span></button>{['Notifications', 'AI preferences', 'Storage'].map((item) => <button key={item} type="button" className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-sm ${dark ? 'border-white/[.07] bg-[#181c24]' : 'border-black/[.05] bg-white shadow-sm'}`}><span>{item}</span><ChevronRight size={15} className="opacity-25" /></button>)}</div>}
          </aside>
        </div>
      )}
    </main>
  )
}
