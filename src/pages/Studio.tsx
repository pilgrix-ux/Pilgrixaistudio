import type { ChangeEvent, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowUp, Bell, Camera, CheckCircle2, ChevronRight, Clock3, Download, Eraser, FileText, Film, Folder, Image as ImageIcon, Link2, Menu, Mic, MoreHorizontal, Play, Plus, Scissors, Search, Settings, Sparkles, Trash2, User, Wand2, X } from 'lucide-react'
import '@/styles/attachment-sheet.css'

type View = 'ai' | 'main' | 'me'
type Attachment = { id: string; file: File; url: string }
type Message = { id: string; role: 'user' | 'ai'; text: string; time: string }
type AttachmentSheetProps = { attachments: Attachment[]; onClose: () => void; onCamera: () => void; onGallery: () => void; onFiles: () => void; onSelectRecent: (attachment: Attachment) => void }

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
  const [messages, setMessages] = useState<Message[]>([{ id: 'welcome', role: 'ai', text: 'Tell me what you want to make. Upload your footage or describe the edit.', time: 'Now' }])
  const [prompt, setPrompt] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!showAttachmentSheet) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [showAttachmentSheet])

  const primaryAttachment = attachments[0]
  const hasVideo = attachments.some((item) => item.file.type.startsWith('video/'))

  const addFiles = (files: File[]): void => {
    const valid = files.filter((file) => /^(video|audio|image)\//.test(file.type))
    const mapped = valid.map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`, file, url: URL.createObjectURL(file) }))
    if (!mapped.length) return
    setAttachments((current) => [...current, ...mapped])
    if (!previewUrl) {
      const firstVideo = mapped.find((item) => item.file.type.startsWith('video/'))
      if (firstVideo) setPreviewUrl(firstVideo.url)
    }
    setShowAttachmentSheet(false)
  }
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => { addFiles(Array.from(event.target.files ?? [])); event.target.value = '' }
  const removeAttachment = (id: string): void => {
    const removed = attachments.find((item) => item.id === id)
    if (removed) URL.revokeObjectURL(removed.url)
    setAttachments((current) => current.filter((item) => item.id !== id))
    if (previewUrl === removed?.url) setPreviewUrl(null)
  }
  const selectRecent = (attachment: Attachment): void => {
    if (!attachments.some((item) => item.id === attachment.id)) setAttachments((current) => [...current, attachment])
    if (attachment.file.type.startsWith('video/')) setPreviewUrl(attachment.url)
    setShowAttachmentSheet(false)
  }
  const sendPrompt = (text = prompt): void => {
    const trimmed = text.trim()
    if (!trimmed && attachments.length === 0) { setNotice('Add media or tell Pilgrix what you want to make.'); window.setTimeout(() => setNotice(null), 2600); return }
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: trimmed || 'Work with these files and make the best edit.', time: 'Just now' }])
    setPrompt(''); setIsWorking(true)
    window.setTimeout(() => { setMessages((current) => [...current, { id: `ai-${Date.now()}`, role: 'ai', text: 'Got it. I’ll work from the footage you provided and build the edit around what is actually there.', time: 'Just now' }]); setIsWorking(false) }, 900)
  }
  const togglePreview = (): void => { const video = videoRef.current; if (!video) return; if (video.paused) { void video.play(); setIsPlaying(true) } else { video.pause(); setIsPlaying(false) } }
  const renderPreview = (): void => { if (!hasVideo || !primaryAttachment) { setNotice('Add a video first.'); window.setTimeout(() => setNotice(null), 2200); return }; setPreviewUrl(primaryAttachment.url); setNotice('Preview workspace ready.'); window.setTimeout(() => setNotice(null), 2200) }
  const openNewEdit = (): void => { attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url)); setMessages([{ id: `welcome-${Date.now()}`, role: 'ai', text: 'Tell me what you want to make. Upload your footage or describe the edit.', time: 'Now' }]); setAttachments([]); setPreviewUrl(null); setPrompt('') }

  return <div className="pilgrix-shell">
    <div className="ambient-glow ambient-glow-one" /><div className="ambient-glow ambient-glow-two" />
    <header className="topbar">
      <button className="mobile-menu-button" onClick={() => setShowMenu((value) => !value)} aria-label="Open workspace menu"><Menu size={22} /></button>
      <button className="brand-lockup" onClick={() => setView('ai')} aria-label="Open AI Lab"><span className="brand-mark">P</span><span><strong>Pilgrix</strong><small>AI Lab</small></span></button>
      <div className="topbar-center"><span className="live-dot" /><span>AI Lab</span></div>
      <div className="topbar-actions"><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /></button><button className="profile-chip" onClick={() => setView('me')} aria-label="Open Me"><span className="profile-avatar"><User size={16} /></span><span className="profile-name">Me</span></button></div>
    </header>
    {showMenu && <div className="mobile-workspace-menu"><button onClick={() => { setView('main'); setShowMenu(false) }}><Folder size={18} /> Projects <ChevronRight size={16} /></button><button onClick={() => { setView('ai'); setShowMenu(false) }}><Sparkles size={18} /> AI Lab <ChevronRight size={16} /></button><button onClick={() => { setView('me'); setShowMenu(false) }}><Settings size={18} /> Settings <ChevronRight size={16} /></button></div>}
    <main className="studio-frame">
      {view === 'ai' && <section className="ai-lab-view">
        <div className="ai-heading"><div><p className="eyebrow">EDIT WITH AI</p><h1>What are we making<br /><span>today?</span></h1></div><button className="soft-button new-edit-button" onClick={openNewEdit}><Plus size={17} /> New edit</button></div>
        <div className="ai-canvas">
          <div className="conversation-column">
            {messages.map((message) => <article key={message.id} className={`message ${message.role}`}><div className={`message-avatar ${message.role}`}>{message.role === 'ai' ? <Sparkles size={15} /> : <User size={15} />}</div><div className="message-body"><div className="message-meta"><strong>{message.role === 'ai' ? 'Pilgrix' : 'You'}</strong><span>{message.time}</span></div><p>{message.text}</p></div></article>)}
            {isWorking && <div className="working-row"><div className="message-avatar ai"><Sparkles size={15} /></div><div><strong>Pilgrix is working</strong><p>Preparing your edit.</p></div><span className="thinking-orb" /></div>}
            {previewUrl && hasVideo && <div className="preview-card"><div className="preview-topline"><div><span className="eyebrow">PREVIEW</span><strong>Your footage</strong></div><button className="icon-button small" onClick={() => setPreviewUrl(null)} aria-label="Close preview"><X size={16} /></button></div><div className="video-stage"><video ref={videoRef} src={previewUrl} onEnded={() => setIsPlaying(false)} playsInline /><button className="video-play" onClick={togglePreview} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <span className="pause-bars" /> : <Play size={20} fill="currentColor" />}</button><div className="video-label">ORIGINAL FOOTAGE</div></div><div className="preview-actions"><button onClick={() => sendPrompt('Make this into the strongest possible edit.')}>Make this an edit</button><button onClick={() => sendPrompt('Find the strongest moments.')}>Find best parts</button><button onClick={() => setView('main')}>Open project</button></div></div>}
          </div>
          <aside className="context-rail"><div className="rail-card now-card"><div className="rail-label"><span className="blue-pulse" /> EDIT SESSION</div><h3>{attachments.length ? 'Untitled edit' : 'Ready for your footage'}</h3><p>{attachments.length ? `${attachments.length} ${attachments.length === 1 ? 'file' : 'files'} · Ready when you are.` : 'Drop footage into the composer and describe the result you want.'}</p><button onClick={renderPreview}><Play size={15} /> Preview</button></div><div className="rail-card"><div className="rail-heading"><span>AI tools</span><MoreHorizontal size={16} /></div><div className="tool-list">{toolCards.map((tool) => { const Icon = tool.icon; return <button key={tool.title} onClick={() => setPrompt(tool.title)}><span className="tool-icon"><Icon size={16} /></span><span><strong>{tool.title}</strong><small>{tool.detail}</small></span><ChevronRight size={15} /></button> })}</div></div></aside>
        </div>
        <div className="composer-wrap">
          {attachments.length > 0 && <div className="attachment-strip">{attachments.map((attachment) => <div className="attachment" key={attachment.id}>{attachment.file.type.startsWith('video/') ? <Film size={15} /> : attachment.file.type.startsWith('image/') ? <ImageIcon size={15} /> : <Mic size={15} />}<span>{attachment.file.name}</span><button onClick={() => removeAttachment(attachment.id)} aria-label={`Remove ${attachment.file.name}`}><X size={13} /></button></div>)}</div>}
          <div className="composer"><button className="composer-plus" onClick={() => setShowAttachmentSheet(true)} aria-label="Add media"><Plus size={21} /></button><input ref={inputRef} type="file" accept="video/*,audio/*,image/*" multiple hidden onChange={handleFileChange} /><input ref={cameraInputRef} type="file" accept="video/*" capture="environment" hidden onChange={handleFileChange} /><input ref={galleryInputRef} type="file" accept="image/*,video/*" multiple hidden onChange={handleFileChange} /><div className="composer-main"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendPrompt() } }} placeholder="Tell Pilgrix what you want to create..." rows={1} /><div className="composer-mode"><Sparkles size={13} /><span>AI edit</span><span className="mode-dot" /><span>Use my footage</span></div></div><button className="composer-mic" onClick={() => setPrompt((current) => current ? `${current} ` : 'Create a natural, clean edit. ')} aria-label="Voice input"><Mic size={19} /></button><button className="send-button" onClick={() => sendPrompt()} aria-label="Create"><ArrowUp size={21} /></button></div>
          <div className="composer-hint"><span><Plus size={13} /> Add footage, reference or image</span><span>MP4 · MOV · image · audio</span></div>
        </div>
        <div className="starter-row">{starterPrompts.map((starter) => { const Icon = starter.icon; return <button key={starter.title} onClick={() => sendPrompt(starter.title)}><span className="starter-icon"><Icon size={16} /></span><span><strong>{starter.title}</strong><small>{starter.detail}</small></span><ArrowUp size={14} /></button> })}</div>
      </section>}
      {view === 'main' && <MainView onOpenAI={() => setView('ai')} />}{view === 'me' && <MeView onBack={() => setView('ai')} />}
    </main>
    <nav className="bottom-nav" aria-label="Primary navigation"><button className={view === 'ai' ? 'active' : ''} onClick={() => setView('ai')}><Sparkles size={19} /><span>AI Lab</span></button><button className={view === 'main' ? 'active' : ''} onClick={() => setView('main')}><Folder size={19} /><span>Projects</span></button><button className={view === 'me' ? 'active' : ''} onClick={() => setView('me')}><User size={19} /><span>Me</span></button></nav>
    {notice && <div className="toast"><CheckCircle2 size={17} /> {notice}</div>}
    {showAttachmentSheet && <AttachmentSheet attachments={attachments} onClose={() => setShowAttachmentSheet(false)} onCamera={() => cameraInputRef.current?.click()} onGallery={() => galleryInputRef.current?.click()} onFiles={() => inputRef.current?.click()} onSelectRecent={selectRecent} />}
  </div>
}

function AttachmentSheet({ attachments, onClose, onCamera, onGallery, onFiles, onSelectRecent }: AttachmentSheetProps): JSX.Element {
  return <div className="attachment-sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }} role="presentation"><section className="attachment-sheet" role="dialog" aria-modal="true" aria-labelledby="attachment-sheet-title"><div className="attachment-sheet-handle" /><div className="attachment-sheet-head"><div><p className="attachment-sheet-kicker">Add to your edit</p><h2 id="attachment-sheet-title">Bring something in.</h2></div><button className="attachment-sheet-close" onClick={onClose} aria-label="Close attachment picker"><X size={18} /></button></div><div className="attachment-sheet-options"><AttachmentOption icon={<Camera size={22} />} title="Camera" detail="Record a new clip" onClick={onCamera} /><AttachmentOption icon={<ImageIcon size={22} />} title="Gallery" detail="Photos & videos" onClick={onGallery} /><AttachmentOption icon={<FileText size={22} />} title="Files" detail="Browse your device" onClick={onFiles} /></div>{attachments.length > 0 && <div className="attachment-sheet-recent"><div className="attachment-sheet-recent-head"><strong>In this edit</strong><span>{attachments.length} selected</span></div><div className="attachment-recent-grid">{attachments.slice(-4).map((attachment) => <button className="attachment-recent-item" key={attachment.id} onClick={() => onSelectRecent(attachment)} aria-label={`Use ${attachment.file.name}`}>{attachment.file.type.startsWith('video/') ? <video src={attachment.url} muted playsInline /> : attachment.file.type.startsWith('image/') ? <img src={attachment.url} alt="" /> : <div className="attachment-audio-placeholder"><Mic size={24} /></div>}<span className="attachment-recent-type">{attachment.file.type.startsWith('video/') ? <Film size={11} /> : <ImageIcon size={11} />}</span></button>)}</div></div>}<p className="attachment-sheet-note">Your media stays attached to this edit session. You can add more at any time.</p></section></div>
}
function AttachmentOption({ icon, title, detail, onClick }: { icon: ReactNode; title: string; detail: string; onClick: () => void }): JSX.Element { return <button className="attachment-option" onClick={onClick}><span className="attachment-option-icon">{icon}</span><span><strong>{title}</strong><small>{detail}</small></span></button> }

function MainView({ onOpenAI }: { onOpenAI: () => void }): JSX.Element { return <section className="main-view"><div className="main-heading"><div><p className="eyebrow">PROJECTS</p><h1>Your studio, without the clutter.</h1><p>Projects and recent work stay here. AI Lab is where you create.</p></div><button className="primary-button" onClick={onOpenAI}><Sparkles size={17} /> Open AI Lab</button></div><div className="main-grid"><div className="hero-project"><div className="hero-project-art"><span>RECENT</span><div className="fake-frame"><div className="frame-light" /><div className="frame-subject" /></div></div><div className="project-info"><div><p className="eyebrow">PROJECT</p><h2>Untitled campaign</h2><span>Last worked on just now</span></div><button className="icon-button"><MoreHorizontal size={18} /></button></div></div><div className="quick-panel"><div className="rail-heading"><span>Continue</span><Clock3 size={16} /></div><button onClick={onOpenAI}><span className="quick-icon"><Sparkles size={18} /></span><span><strong>Continue with AI</strong><small>Pick up your last conversation</small></span><ChevronRight size={16} /></button><button><span className="quick-icon"><Film size={18} /></span><span><strong>Recent media</strong><small>Manage uploaded footage</small></span><ChevronRight size={16} /></button></div></div><div className="storage-line"><div><strong>Storage</strong><span>2.4 TB of 5 TB used</span></div><div className="storage-bar"><span /></div><button>Manage</button></div></section> }
function MeView({ onBack }: { onBack: () => void }): JSX.Element { return <section className="me-view"><div className="profile-hero"><div className="large-avatar">H</div><div><p className="eyebrow">ACCOUNT</p><h1>Harrison</h1><p>Personal workspace · Pro plan</p></div><button className="soft-button" onClick={onBack}><Sparkles size={16} /> AI Lab</button></div><div className="settings-grid"><div className="settings-card"><div className="settings-icon"><Settings size={18} /></div><div><strong>Preferences</strong><span>Appearance, editing defaults and notifications</span></div><ChevronRight size={17} /></div><div className="settings-card"><div className="settings-icon"><Bell size={18} /></div><div><strong>Activity</strong><span>Jobs, completed edits and things that need you</span></div><ChevronRight size={17} /></div><div className="settings-card"><div className="settings-icon"><Download size={18} /></div><div><strong>Storage</strong><span>Manage your videos, projects and deleted files</span></div><ChevronRight size={17} /></div><div className="settings-card danger"><div className="settings-icon"><Trash2 size={18} /></div><div><strong>Recently deleted</strong><span>Restore or permanently remove files</span></div><ChevronRight size={17} /></div></div><div className="account-note"><AlertCircle size={17} /><span>Pilgrix keeps the complex editing machinery behind the scenes. Your workspace only shows decisions, progress and results.</span></div></section> }
