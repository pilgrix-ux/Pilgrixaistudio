import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, Camera, File, FolderOpen, Image, Menu, Mic, Moon, Plus, Search, Settings, Sparkles, Sun, User, X } from 'lucide-react'
import { editorService } from '@/services/editorService'

type Theme = 'light' | 'dark'
type Panel = 'none' | 'menu' | 'account' | 'projects' | 'search' | 'settings'
type Attachment = { id: string; file: File; url: string }
type Message = { id: string; role: 'user' | 'assistant'; text: string }

const welcome: Message = { id: 'welcome', role: 'assistant', text: 'Ready when you are.' }

export function AiLabWorkspace(): JSX.Element {
  const [theme, setTheme] = useState<Theme>('light')
  const [panel, setPanel] = useState<Panel>('none')
  const [prompt, setPrompt] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [messages, setMessages] = useState<Message[]>([welcome])
  const [working, setWorking] = useState(false)
  const [focused, setFocused] = useState(false)
  const [notice, setNotice] = useState('')
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

  useEffect(() => () => attachments.forEach((item) => URL.revokeObjectURL(item.url)), [attachments])

  const showNotice = useCallback((text: string) => {
    setNotice(text)
    window.setTimeout(() => setNotice(''), 2200)
  }, [])

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return
    const next = Array.from(files).map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }))
    setAttachments((current) => [...current, ...next])
    setPanel('none')
  }, [])

  const startNew = useCallback(() => {
    attachments.forEach((item) => URL.revokeObjectURL(item.url))
    setAttachments([])
    setMessages([{ ...welcome, id: crypto.randomUUID() }])
    setPrompt('')
    setPanel('none')
  }, [attachments])

  const send = useCallback(async () => {
    const text = prompt.trim()
    if ((!text && attachments.length === 0) || working) return
    const files = [...attachments]
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: text || `Uploaded ${files.length} media file${files.length === 1 ? '' : 's'}.` }])
    setPrompt('')
    setWorking(true)
    try {
      const result = await editorService.requestInstruction({
        projectId: 'ai-lab',
        instruction: text || 'Analyze and prepare the uploaded media.',
        context: { attachments: files.map(({ id, file }) => ({ id, filename: file.name, mimeType: file.type, size: file.size })) },
      })
      const response = result.error?.userMessage ?? (result.status === 'accepted' ? 'Your edit is in the pipeline.' : `Edit request status: ${result.status}.`)
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: response }])
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: error instanceof Error ? error.message : 'I could not start that edit.' }])
    } finally {
      setWorking(false)
    }
  }, [attachments, prompt, working])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => {
      const item = current.find((attachment) => attachment.id === id)
      if (item) URL.revokeObjectURL(item.url)
      return current.filter((attachment) => attachment.id !== id)
    })
  }, [])

  const surface = dark ? 'bg-[#090b12] text-white' : 'bg-[#f8fafc] text-[#11141a]'
  const header = dark ? 'bg-[#090b12]/88 border-white/[.07]' : 'bg-white/88 border-black/[.055]'
  const control = dark ? 'border-white/[.09] bg-[#141722]' : 'border-black/[.07] bg-white'
  const muted = dark ? 'text-white/45' : 'text-[#8d98a8]'

  return (
    <main className={`relative min-h-screen overflow-hidden ${surface}`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -left-32 top-[25%] h-80 w-80 rounded-full blur-[110px] ${dark ? 'bg-cyan-500/[.08]' : 'bg-cyan-300/[.16]'}`} />
        <div className={`absolute -right-32 top-[42%] h-96 w-96 rounded-full blur-[120px] ${dark ? 'bg-violet-500/[.10]' : 'bg-violet-300/[.14]'}`} />
        <div className={`absolute bottom-[-180px] left-[30%] h-96 w-96 rounded-full blur-[120px] ${dark ? 'bg-blue-500/[.10]' : 'bg-blue-200/[.18]'}`} />
      </div>

      <header className={`relative z-30 h-[68px] border-b backdrop-blur-2xl ${header}`}>
        <div className="mx-auto grid h-full max-w-5xl grid-cols-3 items-center px-4">
          <button type="button" aria-label="Open menu" onClick={() => setPanel('menu')} className={`justify-self-start rounded-full border p-3 shadow-[0_7px_26px_rgba(20,40,70,.07)] transition active:scale-95 ${control}`}>
            <Menu size={20} strokeWidth={1.8} />
          </button>
          <button type="button" onClick={() => setPanel('projects')} className="justify-self-center text-center">
            <div className="text-[9px] font-extrabold tracking-[.38em] text-[#1688d4]">PILGRIX</div>
            <div className="mt-0.5 text-[14px] font-semibold tracking-[-.02em]">AI Lab</div>
          </button>
          <button type="button" aria-label="Open profile" onClick={() => setPanel('account')} className={`justify-self-end rounded-full border p-3 shadow-[0_7px_26px_rgba(20,40,70,.07)] transition active:scale-95 ${control}`}>
            <User size={20} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto min-h-[calc(100vh-68px)] max-w-5xl px-4 pb-[205px] pt-8">
        <div className="flex h-full min-h-[calc(100vh-105px)] flex-col">
          <div className="pointer-events-none select-none opacity-[.03]">
            <span className="text-[10px] tracking-[.35em]">PILGRIX AI</span>
          </div>

          <div className="mt-auto flex flex-col gap-3 pb-3">
            {messages.length > 1 && messages.slice(-4).map((message) => (
              <div key={message.id} className={`max-w-[82%] rounded-[22px] px-4 py-3 text-[13px] leading-5 shadow-[0_10px_35px_rgba(20,35,60,.07)] ${message.role === 'user' ? `ml-auto ${dark ? 'bg-white text-black' : 'bg-[#11141a] text-white'}` : `${control} border`}`}>
                {message.text}
              </div>
            ))}
            {working && (
              <div className={`w-fit rounded-[18px] border px-4 py-3 text-[11px] ${control} ${muted}`}>
                <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" /> Processing your edit…
              </div>
            )}
            {!working && messages.length === 1 && (
              <div className={`w-fit max-w-[330px] rounded-[18px] border px-4 py-3 text-[11px] shadow-[0_8px_28px_rgba(20,35,60,.05)] ${control} ${muted}`}>
                Ready to turn your footage and idea into an edit.
              </div>
            )}
            {!working && messages.length === 1 && (
              <div className={`ml-auto flex h-10 w-10 items-center justify-center rounded-[15px] text-[11px] shadow-[0_8px_25px_rgba(0,0,0,.12)] ${dark ? 'bg-white text-black' : 'bg-[#171a20] text-white'}`}>Hi</div>
            )}
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-4 sm:px-5 sm:pb-5">
        <div className="mx-auto max-w-5xl">
          {attachments.length > 0 && (
            <div className="mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
              {attachments.map((item) => (
                <div key={item.id} className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[10px] ${control}`}>
                  {item.file.type.startsWith('video/') ? <File size={13} /> : <Image size={13} />}
                  <span className="max-w-[120px] truncate">{item.file.name}</span>
                  <button type="button" onClick={() => removeAttachment(item.id)} aria-label={`Remove ${item.file.name}`}><X size={13} /></button>
                </div>
              ))}
            </div>
          )}

          <div className={`relative overflow-hidden rounded-[28px] border p-2.5 backdrop-blur-2xl transition-all duration-200 ${dark ? 'border-white/[.10] bg-[#11151f]/95' : 'border-white bg-white/92'} ${focused ? 'shadow-[0_16px_70px_rgba(43,194,255,.22),0_0_0_4px_rgba(43,194,255,.07)]' : 'shadow-[0_18px_55px_rgba(31,55,88,.12)]'}`}>
            <div className="pointer-events-none absolute -bottom-16 left-[8%] h-28 w-[45%] rounded-full bg-cyan-300/[.18] blur-3xl" />
            <div className="pointer-events-none absolute -right-10 -top-16 h-32 w-44 rounded-full bg-violet-300/[.16] blur-3xl" />

            <div className="relative flex min-h-[116px] flex-col">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }}
                placeholder="Tell Pilgrix what you want to make..."
                className={`min-h-[66px] w-full resize-none border-0 bg-transparent px-3 pt-2 text-[17px] font-medium tracking-[-.02em] outline-none placeholder:${dark ? 'text-white/35' : 'text-[#a3adba]'}`}
              />

              <div className="mt-auto flex items-center justify-between gap-2 px-1 pb-0.5">
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Add media" onClick={() => setPanel('attachments')} className={`grid h-10 w-10 place-items-center rounded-full border transition active:scale-95 ${control}`}>
                    <Plus size={21} strokeWidth={1.9} />
                  </button>
                  <button type="button" onClick={() => setPrompt((current) => current || 'Polish this edit with clean pacing and smooth transitions.')} className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-semibold transition active:scale-95 ${dark ? 'border-cyan-300/15 bg-cyan-300/[.08] text-cyan-200' : 'border-cyan-300/30 bg-cyan-50 text-cyan-700'}`}>
                    <Sparkles size={12} /> Magic Polish
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Voice input" onClick={() => setPrompt((current) => current ? `${current} ` : 'Create a clean cinematic edit. ')} className={`grid h-10 w-10 place-items-center rounded-full border ${control}`}>
                    <Mic size={18} strokeWidth={1.8} />
                  </button>
                  <button type="button" aria-label="Send edit request" disabled={!prompt.trim() && attachments.length === 0} onClick={() => void send()} className={`grid h-11 w-11 place-items-center rounded-full transition active:scale-95 disabled:opacity-35 ${dark ? 'bg-white text-black' : 'bg-[#171a20] text-white'}`}>
                    <ArrowUp size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p className={`mt-2 text-center text-[9px] ${muted}`}>Your media stays attached to this edit session.</p>
        </div>
      </div>

      <input ref={fileInput} hidden type="file" multiple accept="video/*,image/*,audio/*" onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} />
      <input ref={cameraInput} hidden type="file" accept="video/*" capture="environment" onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} />
      <input ref={galleryInput} hidden type="file" multiple accept="video/*,image/*" onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} />

      {panel !== 'none' && (
        <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setPanel('none') }}>
          {panel === 'menu' && <div className={`absolute left-3 top-[76px] w-[calc(100%-24px)] max-w-[330px] rounded-[24px] border p-2 shadow-[0_25px_80px_rgba(0,0,0,.16)] ${dark ? 'border-white/[.08] bg-[#151821]' : 'border-black/[.06] bg-white'}`}>
            <PanelButton icon={<Plus size={18} />} label="New edit" onClick={startNew} dark={dark} />
            <PanelButton icon={<FolderOpen size={18} />} label="Projects" onClick={() => setPanel('projects')} dark={dark} />
            <PanelButton icon={<Search size={18} />} label="Search" onClick={() => setPanel('search')} dark={dark} />
            <PanelButton icon={<Settings size={18} />} label="Settings" onClick={() => setPanel('settings')} dark={dark} />
          </div>}

          {panel === 'account' && <BottomPanel title="Me" dark={dark} onClose={() => setPanel('none')}>
            <div className={`mb-3 rounded-[20px] border p-4 ${dark ? 'border-white/[.07] bg-white/[.03]' : 'border-black/[.06] bg-black/[.02]'}`}>
              <div className="mb-1 text-[11px] font-bold tracking-[.22em] text-[#1688d4]">PILGRIX</div>
              <div className="text-[20px] font-semibold">Your studio</div>
            </div>
            <PanelButton icon={dark ? <Sun size={18} /> : <Moon size={18} />} label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme(dark ? 'light' : 'dark')} dark={dark} />
          </BottomPanel>}

          {panel === 'settings' && <BottomPanel title="Appearance" dark={dark} onClose={() => setPanel('none')}>
            <button type="button" onClick={() => setTheme('light')} className={`mb-2 flex w-full items-center gap-3 rounded-[18px] border p-4 text-left ${theme === 'light' ? 'border-cyan-300 bg-cyan-50 text-cyan-800' : control}`}><Sun size={18} /> Light</button>
            <button type="button" onClick={() => setTheme('dark')} className={`flex w-full items-center gap-3 rounded-[18px] border p-4 text-left ${theme === 'dark' ? 'border-violet-400/30 bg-violet-500/10 text-violet-200' : control}`}><Moon size={18} /> Dark</button>
          </BottomPanel>}

          {panel === 'projects' && <BottomPanel title="Projects" dark={dark} onClose={() => setPanel('none')}><p className={`text-sm ${muted}`}>Your projects will appear here as you create them.</p></BottomPanel>}
          {panel === 'search' && <BottomPanel title="Search" dark={dark} onClose={() => setPanel('none')}><div className={`flex items-center gap-2 rounded-[18px] border px-4 py-3 ${control}`}><Search size={17} /><input autoFocus placeholder="Search your creations" className="w-full bg-transparent outline-none" /></div></BottomPanel>}

          {panel === 'attachments' && <BottomPanel title="Add media" dark={dark} onClose={() => setPanel('none')}>
            <div className="grid grid-cols-3 gap-2">
              <SheetOption icon={<Camera size={22} />} label="Camera" onClick={() => cameraInput.current?.click()} dark={dark} />
              <SheetOption icon={<Image size={22} />} label="Gallery" onClick={() => galleryInput.current?.click()} dark={dark} />
              <SheetOption icon={<File size={22} />} label="Files" onClick={() => fileInput.current?.click()} dark={dark} />
            </div>
          </BottomPanel>}
        </div>
      )}

      {notice && <div className={`fixed left-1/2 top-20 z-[80] -translate-x-1/2 rounded-full border px-4 py-2 text-xs shadow-xl ${control}`}>{notice}</div>}
    </main>
  )
}

function PanelButton({ icon, label, onClick, dark }: { icon: React.ReactNode; label: string; onClick: () => void; dark: boolean }): JSX.Element {
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-[16px] p-3 text-left text-sm transition active:scale-[.99] ${dark ? 'hover:bg-white/[.05]' : 'hover:bg-black/[.035]'}`}>{icon}<span className="font-medium">{label}</span></button>
}

function SheetOption({ icon, label, onClick, dark }: { icon: React.ReactNode; label: string; onClick: () => void; dark: boolean }): JSX.Element {
  return <button type="button" onClick={onClick} className={`flex min-h-[100px] flex-col items-center justify-center gap-3 rounded-[20px] border text-xs font-semibold ${dark ? 'border-white/[.08] bg-white/[.03]' : 'border-black/[.06] bg-black/[.02]'}`}>{icon}<span>{label}</span></button>
}

function BottomPanel({ title, dark, onClose, children }: { title: string; dark: boolean; onClose: () => void; children: React.ReactNode }): JSX.Element {
  return <section className={`absolute inset-x-0 bottom-0 mx-auto w-full max-w-5xl rounded-t-[30px] border p-4 pb-7 shadow-[0_-25px_80px_rgba(0,0,0,.18)] ${dark ? 'border-white/[.08] bg-[#151821]' : 'border-black/[.06] bg-white'}`}>
    <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-black/10" />
    <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button type="button" onClick={onClose} className="rounded-full p-2"><X size={18} /></button></div>
    {children}
  </section>
}
