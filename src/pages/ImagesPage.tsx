import { useRef, useState } from 'react'
import { ArrowLeft, ArrowUp, ImagePlus, Mic, Paperclip, Sparkles, X } from 'lucide-react'

type ChatAttachment = {
  id: string
  name: string
  url: string
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
  attachments?: ChatAttachment[]
}

const STARTER_PROMPTS = [
  'Create a clean product image',
  'Make a cinematic poster',
  'Create an anime-style scene',
]

export function ImagesPage({ onBack }: { onBack: () => void }): JSX.Element {
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [working, setWorking] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addAttachments = async (files: FileList | null): Promise<void> => {
    if (!files) return
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (!imageFiles.length) return

    const next: ChatAttachment[] = []
    for (const file of imageFiles) {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Unable to read image'))
        reader.onerror = () => reject(reader.error ?? new Error('Unable to read image'))
        reader.readAsDataURL(file)
      })
      next.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: file.name, url })
    }
    setAttachments((current) => [...current, ...next].slice(0, 6))
  }

  const removeAttachment = (id: string): void => {
    setAttachments((current) => current.filter((item) => item.id !== id))
  }

  const send = (): void => {
    const text = prompt.trim()
    if ((!text && attachments.length === 0) || working) return

    const currentAttachments = attachments
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text || 'Use these images as references.',
      attachments: currentAttachments.length ? currentAttachments : undefined,
    }

    setMessages((current) => [...current, userMessage])
    setPrompt('')
    setAttachments([])
    setWorking(true)

    // Keep the UI honest while the image-generation backend is being connected.
    // No fake image/result is inserted into the conversation.
    window.setTimeout(() => setWorking(false), 650)
  }

  const useStarter = (value: string): void => {
    setPrompt(value)
  }

  return (
    <main className="fixed inset-0 z-0 flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-slate-50 font-sans text-slate-800">
      <div className="pointer-events-none absolute left-1/2 top-[28%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-200/35 via-indigo-200/25 to-violet-200/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-sky-200/20 blur-3xl" />

      <header className="relative z-10 flex shrink-0 items-center justify-between px-5 pb-3 pt-[calc(1rem+env(safe-area-inset-top))]">
        <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/85 text-slate-600 shadow-sm backdrop-blur-md active:scale-95" aria-label="Back to AI Lab">
          <ArrowLeft size={19} />
        </button>
        <div className="text-center">
          <span className="block bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-[9px] font-extrabold uppercase tracking-[0.24em] text-transparent">PILGRIX</span>
          <h1 className="text-base font-black tracking-tight text-slate-900">Image Lab</h1>
        </div>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      <section className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="mx-auto flex min-h-full w-full max-w-xl flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-2 pb-8 pt-4 text-center">
              <div className="relative mb-5 flex h-24 w-24 items-center justify-center rounded-[30px] border border-white/80 bg-white/75 shadow-xl shadow-indigo-500/10 backdrop-blur-xl">
                <div className="absolute inset-2 rounded-[24px] bg-gradient-to-br from-sky-100 via-white to-indigo-100" />
                <ImagePlus className="relative text-indigo-500" size={34} strokeWidth={1.7} />
                <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400/40" />
              </div>
              <p className="mb-1 bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-[10px] font-extrabold uppercase tracking-[0.22em] text-transparent">IMAGE CREATION</p>
              <h2 className="max-w-sm text-2xl font-black tracking-tight text-slate-900">What do you want to create?</h2>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-400">Describe an image, upload a reference, or combine both. Your actual results will appear here.</p>

              <div className="mt-7 flex max-w-sm flex-wrap justify-center gap-2">
                {STARTER_PROMPTS.map((item) => (
                  <button key={item} type="button" onClick={() => useStarter(item)} className="rounded-full border border-indigo-100/80 bg-white/80 px-3.5 py-2 text-[10px] font-semibold text-slate-600 shadow-sm backdrop-blur-md transition active:scale-95 hover:border-indigo-200 hover:text-indigo-600">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 py-3">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] ${message.role === 'user' ? 'rounded-3xl rounded-tr-md bg-slate-900 text-white' : 'rounded-3xl rounded-tl-md border border-indigo-100 bg-white/85 text-slate-700'} px-4 py-3 shadow-sm backdrop-blur-md`}>
                    <p className="text-xs leading-relaxed">{message.text}</p>
                    {message.attachments?.length ? (
                      <div className="mt-3 grid grid-cols-3 gap-1.5">
                        {message.attachments.map((attachment) => (
                          <div key={attachment.id} className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                            <img src={attachment.url} alt={attachment.name} className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {working ? (
                <div className="flex items-center gap-2 self-start rounded-2xl border border-indigo-100 bg-white/85 px-4 py-3 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur-md">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
                  Ready for image generation
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <footer className="relative z-20 shrink-0 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto max-w-xl rounded-[28px] border border-indigo-100/80 bg-white/90 p-3 shadow-xl shadow-indigo-500/10 backdrop-blur-xl">
          {attachments.length > 0 ? (
            <div className="mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <img src={attachment.url} alt={attachment.name} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeAttachment(attachment.id)} className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/75 text-white" aria-label={`Remove ${attachment.name}`}><X size={11} /></button>
                </div>
              ))}
            </div>
          ) : null}

          <input value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') send() }} placeholder="Describe an image..." className="w-full bg-transparent px-2 py-1 text-sm text-slate-800 outline-none placeholder:text-slate-400" aria-label="Image prompt" />
          <div className="mt-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition active:scale-95" aria-label="Add reference image"><Paperclip size={16} /></button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { void addAttachments(event.target.files); event.currentTarget.value = '' }} />
              <button type="button" onClick={() => setPrompt((value) => value || 'Create a polished image with cinematic lighting and a clean composition.')} className="flex h-9 items-center gap-1.5 rounded-full border border-indigo-100 bg-gradient-to-r from-sky-50 to-indigo-50 px-3 text-[10px] font-bold text-indigo-600" aria-label="Add image idea"><Sparkles size={13} /> Inspire</button>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400" aria-label="Voice input"><Mic size={16} /></button>
              <button type="button" onClick={send} disabled={(!prompt.trim() && attachments.length === 0) || working} className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20 transition active:scale-95 disabled:opacity-35" aria-label="Send image prompt"><ArrowUp size={17} strokeWidth={2.6} /></button>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-2 max-w-xl text-center text-[9px] font-medium text-slate-400">Image creation stays in this session until you save a real result.</p>
      </footer>
    </main>
  )
}
