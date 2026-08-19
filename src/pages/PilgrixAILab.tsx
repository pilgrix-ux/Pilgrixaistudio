import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowUp, Bell, ChevronRight, Eraser, Film, Folder, Image as ImageIcon, Link2, Menu, Mic, Paperclip, Play, Scissors, Search, Settings, Sparkles, User, Wand2, X } from 'lucide-react'
import { editorService } from '@/services/editorService'

type Attachment = { id: string; file: File; url: string }
type Message = { id: string; role: 'user' | 'ai'; text: string }

const tools = [
  ['Smart Edit', 'Cuts, pacing, transitions', Wand2],
  ['Remove Background', 'Subject isolation', Eraser],
  ['Find Moments', 'Precise highlights', Search],
  ['Cut & Clip', 'Shorts from long footage', Scissors],
] as const

export function PilgrixAILab(): JSX.Element {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [messages, setMessages] = useState<Message[]>([{ id: 'welcome', role: 'ai', text: 'Tell me what you want to make. Upload footage, add a reference, or describe the result.' }])
  const [prompt, setPrompt] = useState('')
  const [working, setWorking] = useState(false)
  const [menu, setMenu] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const projectId = useRef(`chat-${crypto.randomUUID?.() ?? Date.now()}`)
  const video = attachments.find((item) => item.file.type.startsWith('video/'))
  const count = useMemo(() => attachments.length ? `${attachments.length} ${attachments.length === 1 ? 'file' : 'files'} ready` : 'Add footage', [attachments.length])

  useEffect(() => () => attachments.forEach((item) => URL.revokeObjectURL(item.url)), [attachments])

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => /^(video|audio|image)\//.test(file.type))
    setAttachments((current) => [...current, ...files.map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, file, url: URL.createObjectURL(file) }))])
    event.target.value = ''
  }

  const send = async (value = prompt) => {
    const instruction = value.trim()
    if (!instruction && !attachments.length) {
      setNotice('Upload footage or describe what you want Pilgrix to make.')
      return
    }
    const text = instruction || 'Make the best edit possible from these files.'
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', text }])
    setPrompt('')
    setWorking(true)
    setNotice(null)
    try {
      const result = await editorService.requestInstruction({
        projectId: projectId.current,
        mediaId: video?.id,
        instruction: text,
        context: { source: 'pilgrix_ai_lab', files: attachments.map((a) => ({ name: a.file.name, type: a.file.type, size: a.file.size })) },
      })
      const response = result.status === 'not_configured'
        ? 'The editing engine is not connected in this environment yet. I will not pretend an edit was rendered. Connect the server-side provider and worker and this same chat request will run through the real pipeline.'
        : result.status === 'failed'
          ? (result.error?.userMessage ?? 'The edit failed. Nothing was marked as completed.')
          : `Request ${result.requestId} was accepted by the editing service. A finished preview will only appear after the renderer reports a completed result.`
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'ai', text: response }])
    } catch (error) {
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'ai', text: error instanceof Error ? error.message : 'The editing service could not be reached. No fake result was created.' }])
    } finally { setWorking(false) }
  }

  return <div className="pilgrix-shell">
    <header className="topbar">
      <button className="brand-lockup" aria-label="AI Lab"><span className="brand-mark">P</span><span><strong>Pilgrix</strong><small>AI Studio</small></span></button>
      <div className="topbar-center"><span className="live-dot" /><span>AI Lab</span></div>
      <div className="topbar-actions"><button className="icon-button" aria-label="Notifications"><Bell size={18} /></button><button className="profile-chip"><span className="profile-avatar">H</span><span className="profile-name">Me</span></button></div>
    </header>
    <main className="studio-frame">
      <section className="ai-lab-view">
        <div className="ai-heading"><div><p className="eyebrow">AI LAB</p><h1>Make the video.<br /><span>We’ll handle the rest.</span></h1></div><button className="soft-button" onClick={() => setMenu((v) => !v)}><Menu size={17} /> Workspace</button></div>
        {menu && <div className="workspace-popover"><button><Folder size={16} /> Projects <ChevronRight size={15} /></button><button><Settings size={16} /> Preferences <ChevronRight size={15} /></button></div>}
        <div className="ai-canvas">
          <div className="conversation-column">
            {messages.map((message) => <article className={`message ${message.role}`} key={message.id}><div className={`message-avatar ${message.role}`}>{message.role === 'ai' ? <Sparkles size={15} /> : <User size={15} />}</div><div className="message-body"><div className="message-meta"><strong>{message.role === 'ai' ? 'Pilgrix' : 'You'}</strong></div><p>{message.text}</p></div></article>)}
            {video && <div className="preview-card"><div className="preview-topline"><div><span className="eyebrow">SOURCE PREVIEW</span><strong>{video.file.name}</strong></div><button className="icon-button small" onClick={() => setAttachments((m) => m.filter((a) => a.id !== video.id))} aria-label="Remove video"><X size={16} /></button></div><div className="video-stage"><video src={video.url} controls playsInline /><div className="video-label">ORIGINAL SOURCE</div></div></div>}
            {working && <div className="working-row"><div className="message-avatar ai"><Sparkles size={15} /></div><div><strong>Pilgrix is working</strong><p>Processing your request.</p></div><span className="thinking-orb" /></div>}
          </div>
          <aside className="context-rail"><div className="rail-card now-card"><div className="rail-label"><span className="blue-pulse" /> AI LAB</div><h3>{attachments.length ? 'Ready to edit' : 'Start with footage'}</h3><p>{count}. Describe the result instead of learning an editor.</p></div><div className="rail-card"><div className="rail-heading"><span>Tools</span></div><div className="tool-list">{tools.map(([name, detail, Icon]) => <button key={name} onClick={() => setPrompt(name)}><span className="tool-icon"><Icon size={16} /></span><span><strong>{name}</strong><small>{detail}</small></span><ChevronRight size={15} /></button>)}</div></div></aside>
        </div>
        <div className="composer-wrap">
          {attachments.length > 0 && <div className="attachment-strip">{attachments.map((a) => <div className="attachment" key={a.id}><Film size={15} /><span>{a.file.name}</span><button onClick={() => { URL.revokeObjectURL(a.url); setAttachments((m) => m.filter((x) => x.id !== a.id)) }} aria-label={`Remove ${a.file.name}`}><X size={13} /></button></div>)}</div>}
          <div className="composer"><button className="composer-icon" onClick={() => input.current?.click()} aria-label="Attach media"><Paperclip size={19} /></button><input ref={input} hidden type="file" multiple accept="video/*,audio/*,image/*" onChange={addFiles} /><textarea rows={1} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }} placeholder="Upload your video and tell Pilgrix what you want..." /><button className="composer-tool" aria-label="Voice input"><Mic size={18} /></button><button className="send-button" disabled={working} onClick={() => void send()} aria-label="Send"><ArrowUp size={20} /></button></div>
          <div className="composer-hint"><span>{count}</span><span>MP4 · MOV · AVI · 4K/8K</span><span>Enter to send</span></div>
        </div>
      </section>
    </main>
    <nav className="bottom-nav" aria-label="Primary navigation"><button className="active"><Sparkles size={19} /><span>AI Lab</span></button><button><Folder size={19} /><span>Main</span></button><button><User size={19} /><span>Me</span></button></nav>
    {notice && <div className="toast"><AlertCircle size={17} /> {notice}</div>}
  </div>
}
