import type { ChangeEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowUp,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Eraser,
  Film,
  Folder,
  Image as ImageIcon,
  Link2,
  Menu,
  Mic,
  MoreHorizontal,
  Paperclip,
  Play,
  Plus,
  Scissors,
  Search,
  Settings,
  Sparkles,
  Trash2,
  User,
  Wand2,
  X,
} from 'lucide-react'

type View = 'ai' | 'main' | 'me'
type Attachment = { id: string; file: File; url: string }
type Message = { id: string; role: 'user' | 'ai'; text: string; time: string }

const starterPrompts = [
  { title: 'Make something good', detail: 'Find the strongest story in my footage', icon: Wand2 },
  { title: 'Find the viral parts', detail: 'Turn the best moments into short clips', icon: Sparkles },
  { title: 'Match a reference', detail: 'Upload a reference and I’ll adapt the edit', icon: Link2 },
]

const toolCards = [
  { title: 'Smart Edit', detail: 'Cuts, pacing, transitions', icon: Wand2 },
  { title: 'Remove Background', detail: 'Clean subject isolation', icon: Eraser },
  { title: 'Find Moments', detail: 'Precise highlights and scenes', icon: Search },
  { title: 'Cut & Clip', detail: 'Turn long footage into shorts', icon: Scissors },
]

export function Studio(): JSX.Element {
  const [view, setView] = useState<View>('ai')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'ai', text: 'Tell me what you want to make. You can drop your footage here, add a reference, or just describe the result.', time: 'Now' },
  ])
  const [prompt, setPrompt] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const primaryAttachment = attachments[0]
  const hasVideo = attachments.some((item) => item.file.type.startsWith('video/'))
  const attachmentCountLabel = useMemo(() => {
    if (attachments.length === 0) return 'Add footage'
    return `${attachments.length} ${attachments.length === 1 ? 'file' : 'files'} ready`
  }, [attachments.length])

  const addFiles = (files: File[]): void => {
    const next = files.filter((file) => file.type.startsWith('video/') || file.type.startsWith('audio/') || file.type.startsWith('image/'))
    const mapped = next.map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, file, url: URL.createObjectURL(file) }))
    setAttachments((current) => [...current, ...mapped])
    if (!previewUrl) {
      const firstVideo = mapped.find((item) => item.file.type.startsWith('video/'))
      if (firstVideo) setPreviewUrl(firstVideo.url)
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    addFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  const removeAttachment = (id: string): void => {
    setAttachments((current) => {
      const removed = current.find((item) => item.id === id)
      if (removed) URL.revokeObjectURL(removed.url)
      return current.filter((item) => item.id !== id)
    })
    if (previewUrl === attachments.find((item) => item.id === id)?.url) setPreviewUrl(null)
  }

  const sendPrompt = (text = prompt): void => {
    const trimmed = text.trim()
    if (!trimmed && attachments.length === 0) {
      setNotice('Add a video or tell Pilgrix what you want to make.')
      window.setTimeout(() => setNotice(null), 2600)
      return
    }
    const userText = trimmed || 'Work with these files and make the best edit.'
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: userText, time: 'Just now' }])
    setPrompt('')
    setIsWorking(true)
    window.setTimeout(() => {
      setMessages((current) => [...current, { id: `ai-${Date.now()}`, role: 'ai', text: 'Got it. I’ll work from the footage you provided and build the edit around what is actually there. I won’t force a section the footage cannot support.', time: 'Just now' }])
      setIsWorking(false)
    }, 900)
  }

  const togglePreview = (): void => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) { void video.play(); setIsPlaying(true) } else { video.pause(); setIsPlaying(false) }
  }

  const renderPreview = (): void => {
    if (!hasVideo || !primaryAttachment) {
      setNotice('Add a video first, then Pilgrix can preview the edit workspace.')
      window.setTimeout(() => setNotice(null), 2600)
      return
    }
    setPreviewUrl(primaryAttachment.url)
    setNotice('Preview workspace ready.')
    window.setTimeout(() => setNotice(null), 2200)
  }

  return (
    <div className="pilgrix-shell">
      <div className="ambient-glow ambient-glow-one" />
      <div className="ambient-glow ambient-glow-two" />
      <header className="topbar">
        <button className="brand-lockup" onClick={() => setView('ai')} aria-label="Open AI Lab"><span className="brand-mark">P</span><span><strong>Pilgrix</strong><small>AI Studio</small></span></button>
        <div className="topbar-center"><span className="live-dot" /><span>Studio</span></div>
        <div className="topbar-actions"><button className="icon-button" aria-label="Notifications"><Bell size={18} /></button><button className="profile-chip" onClick={() => setView('me')}><span className="profile-avatar">H</span><span className="profile-name">Harrison</span></button></div>
      </header>
      <main className="studio-frame">
        {view === 'ai' && <section className="ai-lab-view">
          <div className="ai-heading"><div><p className="eyebrow">AI LAB</p><h1>Make the video.<br /><span>We’ll handle the rest.</span></h1></div><button className="soft-button" onClick={() => setShowMenu((current) => !current)}><Menu size={17} /><span>Workspace</span></button></div>
          {showMenu && <div className="workspace-popover"><button onClick={() => setView('main')}><Folder size={16} /> Projects <ChevronRight size={15} /></button><button onClick={() => setView('me')}><Settings size={16} /> Preferences <ChevronRight size={15} /></button></div>}
          <div className="ai-canvas">
            <div className="conversation-column">
              {messages.map((message) => <article key={message.id} className={`message ${message.role}`}><div className={`message-avatar ${message.role}`}>{message.role === 'ai' ? <span>P</span> : <span>H</span>}</div><div className="message-body"><div className="message-meta"><strong>{message.role === 'ai' ? 'Pilgrix' : 'You'}</strong><span>{message.time}</span></div><p>{message.text}</p></div></article>)}
              {isWorking && <div className="working-row"><div className="message-avatar ai"><Sparkles size={15} /></div><div><strong>Pilgrix is working</strong><p>Preparing your edit.</p></div><span className="thinking-orb" /></div>}
              {previewUrl && hasVideo && <div className="preview-card"><div className="preview-topline"><div><span className="eyebrow">PREVIEW</span><strong>Your footage</strong></div><button className="icon-button small" onClick={() => setPreviewUrl(null)} aria-label="Close preview"><X size={16} /></button></div><div className="video-stage"><video ref={videoRef} src={previewUrl} onEnded={() => setIsPlaying(false)} playsInline /><button className="video-play" onClick={togglePreview} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <span className="pause-bars" /> : <Play size={20} fill="currentColor" />}</button><div className="video-label">4K • ORIGINAL</div></div><div className="preview-actions"><button onClick={() => sendPrompt('Make this into the strongest possible edit.')}>Make this an edit</button><button onClick={() => sendPrompt('Find the strongest moments and give me viral parts.')}>Find best parts</button><button onClick={() => setView('main')}>Open project</button></div></div>}
            </div>
            <aside className="context-rail"><div className="rail-card now-card"><div className="rail-label"><span className="blue-pulse" /> LIVE PROJECT</div><h3>{attachments.length ? 'Untitled edit' : 'Start with footage'}</h3><p>{attachments.length ? `${attachmentCountLabel} · Ready when you are.` : 'Your video becomes the canvas. The conversation becomes the controls.'}</p><button onClick={renderPreview}><Play size={15} /> Preview</button></div><div className="rail-card"><div className="rail-heading"><span>Tools</span><MoreHorizontal size={16} /></div><div className="tool-list">{toolCards.map((tool) => { const Icon = tool.icon; return <button key={tool.title} onClick={() => setPrompt(tool.title)}><span className="tool-icon"><Icon size={16} /></span><span><strong>{tool.title}</strong><small>{tool.detail}</small></span><ChevronRight size={15} /></button> })}</div></div></aside>
          </div>
          <div className="composer-wrap">
            {attachments.length > 0 && <div className="attachment-strip">{attachments.map((attachment) => <div className="attachment" key={attachment.id}>{attachment.file.type.startsWith('video/') ? <Film size={15} /> : attachment.file.type.startsWith('image/') ? <ImageIcon size={15} /> : <Mic size={15} />}<span>{attachment.file.name}</span><button onClick={() => removeAttachment(attachment.id)} aria-label={`Remove ${attachment.file.name}`}><X size={13} /></button></div>)}</div>}
            <div className="composer"><button className="composer-icon" onClick={() => inputRef.current?.click()} aria-label="Attach media"><Paperclip size={19} /></button><input ref={inputRef} type="file" accept="video/*,audio/*,image/*" multiple hidden onChange={handleFileChange} /><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendPrompt() } }} placeholder="Upload your video and tell Pilgrix what you want..." rows={1} /><button className="composer-tool" onClick={() => setPrompt((current) => current ? `${current} ` : 'Use the footage naturally. ')} aria-label="Voice input"><Mic size={18} /></button><button className="send-button" onClick={() => sendPrompt()} aria-label="Send"><ArrowUp size={20} /></button></div>
            <div className="composer-hint"><span><Plus size={13} /> {attachmentCountLabel}</span><span>MP4 · MOV · AVI · 4K/8K</span><span>Press Enter to send</span></div>
          </div>
          <div className="starter-row">{starterPrompts.map((starter) => { const Icon = starter.icon; return <button key={starter.title} onClick={() => sendPrompt(starter.title)}><span className="starter-icon"><Icon size={16} /></span><span><strong>{starter.title}</strong><small>{starter.detail}</small></span><ArrowUp size={14} /></button> })}</div>
        </section>}
        {view === 'main' && <MainView onOpenAI={() => setView('ai')} />}
        {view === 'me' && <MeView onBack={() => setView('ai')} />}
      </main>
      <nav className="bottom-nav" aria-label="Primary navigation"><button className={view === 'ai' ? 'active' : ''} onClick={() => setView('ai')}><Sparkles size={19} /><span>AI Lab</span></button><button className={view === 'main' ? 'active' : ''} onClick={() => setView('main')}><Folder size={19} /><span>Main</span></button><button className={view === 'me' ? 'active' : ''} onClick={() => setView('me')}><User size={19} /><span>Me</span></button></nav>
      {notice && <div className="toast"><CheckCircle2 size={17} /> {notice}</div>}
    </div>
  )
}

function MainView({ onOpenAI }: { onOpenAI: () => void }): JSX.Element {
  return <section className="main-view"><div className="main-heading"><div><p className="eyebrow">MAIN</p><h1>Your studio, without the clutter.</h1><p>Projects and recent work stay here. AI Lab is where you create.</p></div><button className="primary-button" onClick={onOpenAI}><Sparkles size={17} /> Open AI Lab</button></div><div className="main-grid"><div className="hero-project"><div className="hero-project-art"><span>RECENT</span><div className="fake-frame"><div className="frame-light" /><div className="frame-subject" /></div></div><div className="project-info"><div><p className="eyebrow">PROJECT</p><h2>Untitled campaign</h2><span>Last worked on just now</span></div><button className="icon-button"><MoreHorizontal size={18} /></button></div></div><div className="quick-panel"><div className="rail-heading"><span>Continue</span><Clock3 size={16} /></div><button onClick={onOpenAI}><span className="quick-icon"><Sparkles size={18} /></span><span><strong>Continue with AI</strong><small>Pick up your last conversation</small></span><ChevronRight size={16} /></button><button><span className="quick-icon"><Film size={18} /></span><span><strong>Recent media</strong><small>Manage uploaded footage</small></span><ChevronRight size={16} /></button></div></div><div className="storage-line"><div><strong>Storage</strong><span>2.4 TB of 5 TB used</span></div><div className="storage-bar"><span /></div><button>Manage</button></div></section>
}

function MeView({ onBack }: { onBack: () => void }): JSX.Element {
  return <section className="me-view"><div className="profile-hero"><div className="large-avatar">H</div><div><p className="eyebrow">ACCOUNT</p><h1>Harrison</h1><p>Personal workspace · Pro plan</p></div><button className="soft-button" onClick={onBack}><Sparkles size={16} /> AI Lab</button></div><div className="settings-grid"><div className="settings-card"><div className="settings-icon"><Settings size={18} /></div><div><strong>Preferences</strong><span>Appearance, editing defaults and notifications</span></div><ChevronRight size={17} /></div><div className="settings-card"><div className="settings-icon"><Bell size={18} /></div><div><strong>Activity</strong><span>Jobs, completed edits and things that need you</span></div><ChevronRight size={17} /></div><div className="settings-card"><div className="settings-icon"><Download size={18} /></div><div><strong>Storage</strong><span>Manage your videos, projects and deleted files</span></div><ChevronRight size={17} /></div><div className="settings-card danger"><div className="settings-icon"><Trash2 size={18} /></div><div><strong>Recently deleted</strong><span>Restore or permanently remove files</span></div><ChevronRight size={17} /></div></div><div className="account-note"><AlertCircle size={17} /><span>Pilgrix keeps the complex editing machinery behind the scenes. Your workspace only shows decisions, progress and results.</span></div></section>
}
