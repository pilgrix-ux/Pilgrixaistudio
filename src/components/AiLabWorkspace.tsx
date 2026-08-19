/** Pilgrix AI Lab — primary conversation-driven editing workspace. */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FileVideo,
  FolderOpen,
  Menu,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { editorService } from '@/services/editorService'

type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string }
type LocalAttachment = { id: string; file: File; url: string }
type Panel = 'none' | 'menu' | 'account' | 'projects'

const starterPrompts = [
  'Make the strongest moments into one clean edit',
  'Find the viral parts and cut them into one video',
  'Match this video to my reference exactly',
]

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Tell me what you want to make. Upload your footage or describe the edit.',
}

export function AiLabWorkspace(): JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage])
  const [prompt, setPrompt] = useState('')
  const [attachments, setAttachments] = useState<LocalAttachment[]>([])
  const [working, setWorking] = useState(false)
  const [panel, setPanel] = useState<Panel>('none')
  const [chatTitle, setChatTitle] = useState('New edit')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => () => {
    attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url))
  }, [attachments])

  const closePanel = useCallback(() => setPanel('none'), [])

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return
    const next = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }))
    setAttachments((current) => [...current, ...next])
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
    setChatTitle('New edit')
    setPanel('none')
  }, [attachments])

  const send = useCallback(async () => {
    const trimmed = prompt.trim()
    if ((!trimmed && attachments.length === 0) || working) return
    const currentAttachments = [...attachments]
    setWorking(true)
    setChatTitle(trimmed ? trimmed.slice(0, 32) : 'Media analysis')
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
      const message = result.error?.userMessage ??
        (result.status === 'accepted'
          ? 'Your edit request was accepted. I will show the finished result here when rendering completes.'
          : `Edit request status: ${result.status}.`)
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: message }])
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
    <main className="min-h-screen bg-[#f7f6f2] text-[#111]">
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center">
          <button
            type="button"
            onClick={() => setPanel('menu')}
            className="justify-self-start rounded-2xl p-2.5 transition hover:bg-black/5 active:scale-95"
            aria-label="Open navigation"
          >
            <Menu size={23} strokeWidth={2} />
          </button>

          <button type="button" onClick={() => setPanel('projects')} className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#1688d4]">Pilgrix</div>
            <div className="flex items-center justify-center gap-1.5 text-lg font-semibold">AI Lab <span className="text-xs text-black/30">⌄</span></div>
          </button>

          <button
            type="button"
            onClick={() => setPanel('account')}
            className="justify-self-end rounded-2xl p-2.5 transition hover:bg-black/5 active:scale-95"
            aria-label="Open account"
          >
            <User size={23} strokeWidth={2} />
          </button>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-5xl flex-col px-4 pb-36 pt-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/35">Conversation</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{chatTitle}</h2>
          </div>
          <button type="button" onClick={startNewChat} className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-medium shadow-sm hover:bg-black/[0.02]">
            <Plus size={14} /> New chat
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`max-w-[88%] rounded-[26px] px-5 py-3.5 ${message.role === 'user' ? 'ml-auto bg-[#111] text-white shadow-sm' : 'bg-white shadow-sm ring-1 ring-black/[0.05]'}`}
            >
              <p className="whitespace-pre-wrap text-[15px] leading-7">{message.text}</p>
            </article>
          ))}

          {attachments.length > 0 && (
            <div className="space-y-3">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="relative overflow-hidden rounded-[26px] bg-white shadow-sm ring-1 ring-black/[0.06]">
                  {attachment.file.type.startsWith('video/') ? (
                    <video className="max-h-[420px] w-full bg-black object-contain" controls src={attachment.url} />
                  ) : attachment.file.type.startsWith('image/') ? (
                    <img className="max-h-[420px] w-full object-contain" src={attachment.url} alt={attachment.file.name} />
                  ) : null}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 truncate"><FileVideo size={17} /> {attachment.file.name}</span>
                    <button type="button" onClick={() => removeAttachment(attachment.id)} className="rounded-full p-2 hover:bg-black/5" aria-label={`Remove ${attachment.file.name}`}><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {working && (
            <div className="flex max-w-[88%] items-center gap-2 rounded-[26px] bg-white px-5 py-3.5 text-sm text-black/50 shadow-sm ring-1 ring-black/[0.05]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#1688d4]" /> Preparing your request…
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/[0.06] bg-[#f7f6f2]/95 p-3 backdrop-blur-xl">
          <div className="mx-auto max-w-5xl">
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {starterPrompts.map((item) => (
                <button key={item} type="button" onClick={() => setPrompt(item)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2.5 text-xs shadow-sm ring-1 ring-black/[0.05] hover:bg-black/[0.02]">
                  <Sparkles size={12} /> {item}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-2 rounded-[28px] bg-white p-2 shadow-[0_10px_35px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.07]">
              <input ref={fileInput} type="file" accept="video/*,audio/*,image/*" multiple hidden onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = '' }} />
              <button type="button" onClick={() => fileInput.current?.click()} className="rounded-2xl p-3 hover:bg-black/5" aria-label="Attach media"><Paperclip size={20} /></button>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }} rows={1} placeholder="Tell Pilgrix what you want to make…" className="max-h-32 min-h-12 flex-1 resize-none bg-transparent px-1 py-3 text-[15px] outline-none" />
              <button type="button" disabled={working || (!prompt.trim() && attachments.length === 0)} onClick={() => void send()} className="rounded-2xl bg-[#111] p-3.5 text-white transition hover:bg-black/80 disabled:opacity-35" aria-label="Send"><Send size={18} /></button>
            </div>
          </div>
        </div>
      </section>

      {panel !== 'none' && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]" onClick={closePanel}>
          <aside
            className={`absolute top-0 h-full w-[min(88vw,360px)] bg-white shadow-2xl ${panel === 'menu' ? 'left-0' : 'right-0'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#1688d4]">Pilgrix</div>
                <h3 className="mt-1 text-xl font-semibold">{panel === 'menu' ? 'Workspace' : panel === 'account' ? 'Me' : 'Projects'}</h3>
              </div>
              <button type="button" onClick={closePanel} className="rounded-full p-2 hover:bg-black/5" aria-label="Close panel"><X size={20} /></button>
            </div>

            {panel === 'menu' && (
              <nav className="space-y-1 p-4">
                <button type="button" onClick={startNewChat} className="flex w-full items-center gap-3 rounded-2xl bg-[#111] px-4 py-3.5 text-left text-sm font-medium text-white"><Plus size={18} /> New chat</button>
                <button type="button" onClick={() => setPanel('projects')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm hover:bg-black/5"><FolderOpen size={18} /> Projects</button>
                <button type="button" onClick={() => setPanel('account')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm hover:bg-black/5"><User size={18} /> Me</button>
                <button type="button" onClick={() => setPanel('account')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm hover:bg-black/5"><Settings size={18} /> Settings</button>
              </nav>
            )}

            {panel === 'account' && (
              <div className="space-y-4 p-5">
                <div className="rounded-3xl bg-[#f7f6f2] p-5">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111] text-white"><User size={22} /></div>
                  <h4 className="font-semibold">Your Pilgrix account</h4>
                  <p className="mt-1 text-sm leading-6 text-black/50">Account preferences, storage and subscription controls will live here.</p>
                </div>
                <button type="button" className="flex w-full items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-left text-sm hover:bg-black/[0.03]"><Settings size={17} /> Preferences</button>
              </div>
            )}

            {panel === 'projects' && (
              <div className="p-5">
                <div className="rounded-3xl border border-dashed border-black/15 p-6 text-center">
                  <Search size={22} className="mx-auto mb-3 text-black/35" />
                  <h4 className="font-semibold">Your projects</h4>
                  <p className="mt-1 text-sm leading-6 text-black/45">Finished edits and saved drafts will appear here. Start a new chat to create one.</p>
                  <button type="button" onClick={startNewChat} className="mt-4 rounded-full bg-[#111] px-4 py-2.5 text-xs font-medium text-white">Start editing</button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  )
}
