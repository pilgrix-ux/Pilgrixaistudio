import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUp, Camera, File, Image, ImagePlus, Mic, Plus, Sparkles, X } from 'lucide-react'
import { appendChatMessage, createChat } from '@/pages/ChatPages'
import { saveImageCreation } from '@/services/conversationPersistence'

type ChatAttachment = { id: string; name: string; url: string }
type Message = { id: string; role: 'user' | 'assistant'; text: string; attachments?: ChatAttachment[] }
const STARTER_PROMPTS = ['Create a clean product image', 'Make a cinematic poster', 'Create an anime-style scene']

export function ImagesPage({ onBack }: { onBack: () => void }): JSX.Element {
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [working, setWorking] = useState(false)
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const photosInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 44), 160)
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > 160 ? 'auto' : 'hidden'
  }, [prompt])

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
    setAttachmentMenuOpen(false)
  }

  const removeAttachment = (id: string): void => setAttachments((current) => current.filter((item) => item.id !== id))

  const send = (): void => {
    const text = prompt.trim()
    if ((!text && attachments.length === 0) || working) return
    const currentAttachments = attachments
    const creationId = `image-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const creationPrompt = text || 'Use these images as references.'
    const chat = conversationId ? null : createChat(creationPrompt, currentAttachments.length)
    const activeConversationId = conversationId || chat?.id || null

    if (chat) setConversationId(chat.id)
    if (conversationId) appendChatMessage(conversationId, { role: 'user', text: creationPrompt })

    void saveImageCreation({
      id: creationId,
      conversationId: activeConversationId || undefined,
      prompt: creationPrompt,
      imageUrl: '',
      metadata: { type: 'image', status: 'pending', referenceCount: currentAttachments.length },
    })

    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: creationPrompt, attachments: currentAttachments.length ? currentAttachments : undefined }])
    setPrompt('')
    setAttachments([])
    setWorking(true)
    setAttachmentMenuOpen(false)
    window.setTimeout(() => setWorking(false), 650)
  }

  return (
    <main className="fixed inset-0 z-0 flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-[#f7faff] font-sans text-slate-800">
      <div className="pointer-events-none absolute left-1/2 top-[24%] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-200/30 via-indigo-200/20 to-violet-200/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-sky-200/20 blur-3xl" />
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-white/80 px-5 pb-3 pt-[calc(1rem+env(safe-area-inset-top))] shadow-[0_8px_28px_rgba(30,64,175,.045)]">
        <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/85 text-slate-600 shadow-sm backdrop-blur-md transition active:scale-95" aria-label="Back to AI Lab"><ArrowLeft size={19} /></button>
        <div className="text-center"><span className="block bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-[9px] font-extrabold uppercase tracking-[0.24em] text-transparent">PILGRIX</span><h1 className="text-base font-black tracking-tight text-slate-900">Image Lab</h1></div>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      <section className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pb-5">
        <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center px-1 pb-7 pt-8 text-center">
              <div className="relative mb-7 flex h-[min(42vw,220px)] w-[min(42vw,220px)] min-h-[184px] min-w-[184px] items-center justify-center rounded-[32%] border border-white/95 bg-white/60 shadow-[0_30px_90px_rgba(56,189,248,.16),inset_0_2px_0_rgba(255,255,255,1)] backdrop-blur-2xl">
                <span className="absolute inset-[6%] rounded-[29%] border border-white/80 bg-gradient-to-br from-white/85 via-cyan-50/80 to-indigo-100/90 shadow-[inset_0_8px_25px_rgba(255,255,255,.95)]" />
                <span className="absolute left-[12%] top-[12%] h-[25%] w-[25%] rounded-full bg-white/90 blur-sm" />
                <span className="absolute right-[13%] top-[14%] h-3 w-3 rounded-full bg-cyan-300/80 shadow-[0_0_18px_rgba(34,211,238,.55)]" />
                <span className="absolute bottom-[13%] left-[16%] h-2 w-2 rounded-full bg-indigo-300/60" />
                <div className="relative flex h-[58%] w-[58%] items-center justify-center rounded-[28%] border border-white/80 bg-gradient-to-br from-sky-50 via-white to-indigo-100 text-indigo-500 shadow-[0_18px_40px_rgba(79,70,229,.14),inset_0_3px_12px_rgba(255,255,255,.98)]"><ImagePlus size={48} strokeWidth={1.65} /><Sparkles className="absolute -right-3 -top-3 text-cyan-400" size={18} strokeWidth={2} /></div>
              </div>
              <p className="mb-2 bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-[10px] font-extrabold uppercase tracking-[0.28em] text-transparent">IMAGE CREATION</p>
              <h2 className="max-w-[520px] text-[clamp(34px,8vw,52px)] font-black leading-[.96] tracking-[-0.055em] text-slate-950">What do you want to create?</h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">Describe your idea or add a reference.</p>
              <div className="mt-7 flex max-w-lg flex-wrap justify-center gap-2.5">{STARTER_PROMPTS.map((item) => <button key={item} type="button" onClick={() => setPrompt(item)} className="rounded-full border border-white/95 bg-white/85 px-4 py-2.5 text-[11px] font-semibold text-slate-600 shadow-[0_8px_24px_rgba(51,65,85,.06)] backdrop-blur-md transition active:scale-95 hover:border-indigo-200 hover:text-indigo-600">{item}</button>)}</div>
            </div>
          ) : (
            <div className="mx-auto flex w-full flex-col gap-7 py-5">
              {messages.map((message) => (
                <article key={message.id} className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex w-full max-w-[88%] flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`overflow-hidden ${message.role === 'user' ? 'max-w-[min(100%,34rem)] rounded-[24px] rounded-tr-md bg-slate-900 text-white shadow-[0_12px_30px_rgba(15,23,42,.12)]' : 'w-full max-w-xl rounded-[26px] border border-white bg-white/90 text-slate-700 shadow-[0_12px_32px_rgba(30,64,175,.07)]'} backdrop-blur-md`}>
                      <div className="px-4 py-3.5"><p className="whitespace-pre-wrap break-words text-[14px] leading-6">{message.text}</p></div>
                      {message.attachments?.length ? <div className="grid grid-cols-2 gap-2 border-t border-white/10 bg-black/5 p-2 sm:grid-cols-3">{message.attachments.map((attachment) => <div key={attachment.id} className="aspect-square overflow-hidden rounded-2xl bg-slate-100"><img src={attachment.url} alt={attachment.name} className="h-full w-full object-cover" /></div>)}</div> : null}
                    </div>
                  </div>
                </article>
              ))}
              {working ? <div className="flex w-full justify-start"><div className="rounded-full border border-white bg-white/80 px-4 py-2.5 shadow-sm"><div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400 [animation-delay:120ms]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400 [animation-delay:240ms]" /></div></div></div> : null}
            </div>
          )}
        </div>
      </section>

      <footer className="relative z-30 shrink-0 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
        <div className="relative mx-auto max-w-2xl rounded-[30px] border border-white/90 bg-white/92 p-2.5 shadow-[0_16px_50px_rgba(67,56,202,0.12)] backdrop-blur-2xl">
          {attachmentMenuOpen ? <div className="absolute bottom-[calc(100%+10px)] left-1 flex w-[205px] flex-col overflow-hidden rounded-[24px] border border-white/90 bg-white/95 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur-2xl"><button type="button" onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition active:bg-slate-100"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600"><Camera size={19} /></span><span className="text-sm font-semibold text-slate-700">Camera</span></button><button type="button" onClick={() => photosInputRef.current?.click()} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition active:bg-slate-100"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"><Image size={19} /></span><span className="text-sm font-semibold text-slate-700">Photos</span></button><button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition active:bg-slate-100"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600"><File size={19} /></span><span className="text-sm font-semibold text-slate-700">Files</span></button></div> : null}
          {attachments.length > 0 ? <div className="mb-2 flex gap-2 overflow-x-auto px-1 pb-1">{attachments.map((attachment) => <div key={attachment.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"><img src={attachment.url} alt={attachment.name} className="h-full w-full object-cover" /><button type="button" onClick={() => removeAttachment(attachment.id)} className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/75 text-white" aria-label={`Remove ${attachment.name}`}><X size={11} /></button></div>)}</div> : null}
          <textarea ref={textareaRef} value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() } }} rows={1} placeholder="Describe an image..." className="max-h-40 min-h-11 w-full resize-none overflow-y-auto bg-transparent px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400" aria-label="Image prompt" />
          <div className="mt-1 flex items-center justify-between px-1"><div className="flex items-center gap-1.5"><button type="button" onClick={() => setAttachmentMenuOpen((open) => !open)} className={`flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95 ${attachmentMenuOpen ? 'rotate-45 bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`} aria-label="Add reference"><Plus size={19} /></button><input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { void addAttachments(event.target.files); event.currentTarget.value = '' }} /><input ref={photosInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { void addAttachments(event.target.files); event.currentTarget.value = '' }} /><input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { void addAttachments(event.target.files); event.currentTarget.value = '' }} /><button type="button" onClick={() => setPrompt((value) => value || 'Create a polished image with cinematic lighting and a clean composition.')} className="flex h-10 items-center gap-1.5 rounded-full border border-indigo-100 bg-gradient-to-r from-sky-50 to-indigo-50 px-3 text-[10px] font-bold text-indigo-600" aria-label="Add image idea"><Sparkles size={13} /> Inspire</button></div><div className="flex items-center gap-1.5"><button type="button" className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400" aria-label="Voice input"><Mic size={17} /></button><button type="button" onClick={send} disabled={(!prompt.trim() && attachments.length === 0) || working} className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 transition active:scale-95 disabled:opacity-35" aria-label="Send image prompt"><ArrowUp size={18} strokeWidth={2.6} /></button></div></div>
        </div>
      </footer>
    </main>
  )
}
