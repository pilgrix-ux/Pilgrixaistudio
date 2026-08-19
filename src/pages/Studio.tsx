import type { ChangeEvent, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowUp,
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Eraser,
  FileText,
  Film,
  Folder,
  Image as ImageIcon,
  Link2,
  Menu,
  Mic,
  MoreHorizontal,
  Music2,
  Play,
  Plus,
  Search,
  Settings,
  Sparkles,
  Scissors,
  Trash2,
  User,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import '@/styles/attachment-sheet.css'

type View = 'ai' | 'main' | 'me'
type Theme = 'aurora' | 'deep-space' | 'warm-glow'
type Attachment = { id: string; file: File; url: string }
type Message = { id: string; role: 'user' | 'ai'; text: string; time: string }
type AttachmentSheetProps = {
  attachments: Attachment[]
  onClose: () => void
  onCamera: () => void
  onGallery: () => void
  onFiles: () => void
  onSelectRecent: (attachment: Attachment) => void
}

const themes: Array<{ id: Theme; name: string; detail: string; swatches: string[] }> = [
  { id: 'aurora', name: 'Aurora Glass', detail: 'Clean light', swatches: ['#F4F8FF', '#3A8DFF', '#9D6CFF'] },
  { id: 'deep-space', name: 'Deep Space', detail: 'Dark studio', swatches: ['#080B17', '#2F7DFF', '#B34CFF'] },
  { id: 'warm-glow', name: 'Warm Glow', detail: 'Soft energy', swatches: ['#FFF1E8', '#FF7656', '#B85CFF'] },
]

const starterPrompts = [
  { title: 'Auto Edit', detail: 'Find the strongest moments', icon: Wand2 },
  { title: 'Story Cut', detail: 'Turn clips into a narrative', icon: Scissors },
  { title: 'Beat Sync', detail: 'Match cuts to the music', icon: Music2 },
  { title: 'Viral Short', detail: 'Make a punchy 30s version', icon: Zap },
]

const toolActions = [
  { title: 'Smart Edit', detail: 'Cuts, pacing and transitions', icon: Wand2 },
  { title: 'Find Moments', detail: 'Highlights worth keeping', icon: Search },
  { title: 'Remove Background', detail: 'Clean subject isolation', icon: Eraser },
  { title: 'Reference Edit', detail: 'Use a clip as direction', icon: Link2 },
]

export function Studio(): JSX.Element {
  const [view, setView] = useState<View>('ai')
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'aurora'
    const saved = window.localStorage.getItem('pilgrix-theme') as Theme | null
    return saved && themes.some((item) => item.id === saved) ? saved : 'aurora'
  })
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [_messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'ai', text: 'Bring the footage. Bring the idea. Pilgrix does the rest.', time: 'Now' },
  ])
  const [prompt, setPrompt] = useState('')
  const [_isWorking, setIsWorking] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    document.documentElement.dataset.pilgrixTheme = theme
    window.localStorage.setItem('pilgrix-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!showAttachmentSheet) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [showAttachmentSheet])

  const hasVideo = attachments.some((item) => item.file.type.startsWith('video/'))

  const showNotice = (text: string): void => {
    setNotice(text)
    window.setTimeout(() => setNotice(null), 2400)
  }

  const addFiles = (files: File[]): void => {
    const valid = files.filter((file) => /^(video|audio|image)\//.test(file.type))
    const mapped = valid.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      url: URL.createObjectURL(file),
    }))
    if (!mapped.length) {
      showNotice('That file type is not supported here.')
      return
    }
    setAttachments((current) => [...current, ...mapped])
    const firstVideo = mapped.find((item) => item.file.type.startsWith('video/'))
    if (!previewUrl && firstVideo) setPreviewUrl(firstVideo.url)
    setShowAttachmentSheet(false)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    addFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

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
    if (!trimmed && attachments.length === 0) {
      showNotice('Add footage or describe what you want to create.')
      return
    }
    const userText = trimmed || 'Make the strongest edit from these files.'
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: userText, time: 'Just now' }])
    setPrompt('')
    setIsWorking(true)
    window.setTimeout(() => {
      setMessages((current) => [...current, { id: `ai-${Date.now()}`, role: 'ai', text: 'I’ve got the direction. I’ll build from the footage you actually supplied and keep the result focused on your idea.', time: 'Just now' }])
      setIsWorking(false)
    }, 800)
  }

  const togglePreview = (): void => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const openNewEdit = (): void => {
    attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url))
    setMessages([{ id: `welcome-${Date.now()}`, role: 'ai', text: 'Bring the footage. Bring the idea. Pilgrix does the rest.', time: 'Now' }])
    setAttachments([])
    setPreviewUrl(null)
    setPrompt('')
    setShowTools(false)
    showNotice('New edit ready.')
  }

  return (
    <div className="pilgrix-shell" data-theme={theme}>
      <div className="ambient-glow ambient-glow-one" />
      <div className="ambient-glow ambient-glow-two" />

      <header className="topbar">
        <button className="mobile-menu-button" onClick={() => setShowMenu((value) => !value)} aria-label="Open workspace menu">
          <Menu size={22} />
        </button>
        <button className="brand-lockup" onClick={() => setView('ai')} aria-label="Open AI Lab">
          <span className="brand-mark">P</span>
          <span><strong>PILGRIX</strong><small>AI Lab</small></span>
        </button>
        <div className="topbar-center"><span className="live-dot" /><span>AI Lab</span></div>
        <div className="topbar-actions">
          <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /></button>
          <button className="profile-chip" onClick={() => setView('me')} aria-label="Open Me"><span className="profile-avatar"><User size={16} /></span><span className="profile-name">Me</span></button>
        </div>
      </header>

      {showMenu && <div className="mobile-workspace-menu">
        <button onClick={() => { setView('ai'); setShowMenu(false) }}><Sparkles size={18} /> AI Lab <ChevronRight size={16} /></button>
        <button onClick={() => { setView('main'); setShowMenu(false) }}><Folder size={18} /> Projects <ChevronRight size={16} /></button>
        <button onClick={() => { setView('me'); setShowMenu(false) }}><Settings size={18} /> Me & settings <ChevronRight size={16} /></button>
      </div>}

      <main className="studio-frame">
        {view === 'ai' && <section className="ai-lab-view">
          <div className="ai-heading">
            <div>
              <p className="eyebrow">AI LAB</p>
              <h1>What are we creating<br />today?</h1>
              <p className="hero-copy">Bring the footage. Bring the idea.<br />Pilgrix does the rest.</p>
            </div>
            <button className="soft-button new-edit-button" onClick={openNewEdit}><Plus size={17} /> New</button>
          </div>

          <div className="creation-strip" aria-label="Recent AI creations">
            {attachments.length > 0 ? attachments.slice(-4).map((attachment) => (
              <button className="creation-card media-card" key={attachment.id} onClick={() => attachment.file.type.startsWith('video/') && setPreviewUrl(attachment.url)}>
                {attachment.file.type.startsWith('video/') ? <video src={attachment.url} muted playsInline /> : attachment.file.type.startsWith('image/') ? <img src={attachment.url} alt="" /> : <div className="creation-placeholder"><Mic size={22} /></div>}
                <span className="creation-overlay"><strong>{attachment.file.name}</strong><small>{attachment.file.type.startsWith('video/') ? 'Video' : 'Media'}</small></span>
              </button>
            )) : (
              <>
                <button className="creation-card creation-art art-one" onClick={() => sendPrompt('Remix viral content')}><span className="art-icon"><Wand2 size={25} /></span><strong>Remix viral content</strong><small>AI edit</small></button>
                <button className="creation-card creation-art art-two" onClick={() => sendPrompt('Make a cinematic edit')}><span className="art-icon"><Film size={25} /></span><strong>Cinematic edit</strong><small>AI template</small></button>
                <button className="creation-card creation-art art-three" onClick={() => sendPrompt('Create a story cut')}><span className="art-icon"><Sparkles size={25} /></span><strong>Story cut</strong><small>AI story</small></button>
                <button className="creation-card creation-art art-four" onClick={() => sendPrompt('Make a viral short')}><span className="art-icon"><Zap size={25} /></span><strong>Viral short</strong><small>AI template</small></button>
              </>
            )}
          </div>

          <div className="composer-zone">
            <div className="composer-glow glow-blue" />
            <div className="composer-glow glow-violet" />
            <div className="composer">
              <button className="composer-plus" onClick={() => setShowAttachmentSheet(true)} aria-label="Add media"><Plus size={24} /></button>
              <input ref={inputRef} type="file" accept="video/*,audio/*,image/*" multiple hidden onChange={handleFileChange} />
              <input ref={cameraInputRef} type="file" accept="video/*" capture="environment" hidden onChange={handleFileChange} />
              <input ref={galleryInputRef} type="file" accept="image/*,video/*" multiple hidden onChange={handleFileChange} />
              <div className="composer-main">
                <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendPrompt() } }} placeholder="Make Photo into Short Video" rows={2} />
                <div className="composer-bottom-row">
                  <button className="composer-tool-grid" onClick={() => setShowTools((value) => !value)} aria-label="Open AI tools">
                    <span /><span /><span /><span />
                  </button>
                  <div className="composer-mode"><Sparkles size={13} /><span>AI edit</span><span className="mode-dot" /><span>{attachments.length ? `${attachments.length} media attached` : 'Bring your footage'}</span></div>
                </div>
              </div>
              <button className="composer-mic" onClick={() => setPrompt((current) => current ? `${current} ` : 'Create a clean, natural edit. ')} aria-label="Voice input"><Mic size={20} /></button>
              <button className="send-button" onClick={() => sendPrompt()} aria-label="Create"><ArrowUp size={22} /></button>
            </div>
            {showTools && <div className="tool-popover">{toolActions.map((tool) => { const Icon = tool.icon; return <button key={tool.title} onClick={() => { setPrompt(tool.title); setShowTools(false) }}><span className="tool-popover-icon"><Icon size={17} /></span><span><strong>{tool.title}</strong><small>{tool.detail}</small></span><ChevronRight size={15} /></button> })}</div>}
            {attachments.length > 0 && <div className="attachment-strip">{attachments.map((attachment) => <div className="attachment" key={attachment.id}>{attachment.file.type.startsWith('video/') ? <Film size={15} /> : attachment.file.type.startsWith('image/') ? <ImageIcon size={15} /> : <Mic size={15} />}<span>{attachment.file.name}</span><button onClick={() => removeAttachment(attachment.id)} aria-label={`Remove ${attachment.file.name}`}><X size={13} /></button></div>)}</div>}
            <p className="composer-note">Your media stays attached to this edit session.</p>
          </div>

          <div className="section-heading"><div><p className="eyebrow">PILGRIX AI</p><h2>AI suggestions</h2></div><button onClick={() => setShowTools(true)}>See all <ChevronRight size={15} /></button></div>
          <div className="suggestion-grid">
            {starterPrompts.map((starter) => { const Icon = starter.icon; return <button className="suggestion-card" key={starter.title} onClick={() => sendPrompt(starter.title)}><span className="suggestion-icon"><Icon size={20} /></span><strong>{starter.title}</strong><small>{starter.detail}</small></button> })}
          </div>

          {previewUrl && hasVideo && <div className="preview-card">
            <div className="preview-topline"><div><span className="eyebrow">PREVIEW</span><strong>Your footage</strong></div><button className="icon-button small" onClick={() => setPreviewUrl(null)} aria-label="Close preview"><X size={16} /></button></div>
            <div className="video-stage"><video ref={videoRef} src={previewUrl} onEnded={() => setIsPlaying(false)} playsInline /><button className="video-play" onClick={togglePreview} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <span className="pause-bars" /> : <Play size={20} fill="currentColor" />}</button><div className="video-label">ORIGINAL FOOTAGE</div></div>
            <div className="preview-actions"><button onClick={() => sendPrompt('Make this into the strongest possible edit.')}>Make this an edit</button><button onClick={() => sendPrompt('Find the strongest moments.')}>Find best parts</button><button onClick={() => setView('main')}>Open project</button></div>
          </div>}

          <div className="section-heading creations-heading"><div><p className="eyebrow">YOUR WORK</p><h2>Your creations</h2></div><button onClick={() => setView('main')}>See all <ChevronRight size={15} /></button></div>
          <div className="recent-creations">
            {attachments.length > 0 ? attachments.slice(-3).map((attachment) => <button className="recent-card" key={attachment.id} onClick={() => attachment.file.type.startsWith('video/') && setPreviewUrl(attachment.url)}>{attachment.file.type.startsWith('video/') ? <video src={attachment.url} muted playsInline /> : attachment.file.type.startsWith('image/') ? <img src={attachment.url} alt="" /> : <div className="recent-fallback"><Mic size={25} /></div>}<span><strong>{attachment.file.name}</strong><small>Just now</small></span></button>) : <><RecentArt title="Morning glow" detail="32s · 2m ago" variant="one" /><RecentArt title="Night motion" detail="18s · 1h ago" variant="two" /><RecentArt title="City lights" detail="24s · 5h ago" variant="three" /></>}
          </div>
        </section>}

        {view === 'main' && <MainView onOpenAI={() => setView('ai')} />}
        {view === 'me' && <MeView theme={theme} onTheme={setTheme} showThemePicker={showThemePicker} setShowThemePicker={setShowThemePicker} onBack={() => setView('ai')} />}
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        <button className={view === 'ai' ? 'active' : ''} onClick={() => setView('ai')}><Sparkles size={19} /><span>AI Lab</span></button>
        <button className={view === 'main' ? 'active' : ''} onClick={() => setView('main')}><Folder size={19} /><span>Projects</span></button>
        <button className={view === 'me' ? 'active' : ''} onClick={() => setView('me')}><User size={19} /><span>Me</span></button>
      </nav>

      {notice && <div className="toast"><CheckCircle2 size={17} /> {notice}</div>}
      {showAttachmentSheet && <AttachmentSheet attachments={attachments} onClose={() => setShowAttachmentSheet(false)} onCamera={() => cameraInputRef.current?.click()} onGallery={() => galleryInputRef.current?.click()} onFiles={() => inputRef.current?.click()} onSelectRecent={selectRecent} />}
    </div>
  )
}

function RecentArt({ title, detail, variant }: { title: string; detail: string; variant: 'one' | 'two' | 'three' }): JSX.Element {
  return <div className={`recent-card recent-art ${variant}`}><div className="recent-art-shape" /><span><strong>{title}</strong><small>{detail}</small></span></div>
}

function AttachmentSheet({ attachments, onClose, onCamera, onGallery, onFiles, onSelectRecent }: AttachmentSheetProps): JSX.Element {
  return <div className="attachment-sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }} role="presentation"><section className="attachment-sheet" role="dialog" aria-modal="true" aria-labelledby="attachment-sheet-title"><div className="attachment-sheet-handle" /><div className="attachment-sheet-head"><div><p className="attachment-sheet-kicker">Add to your edit</p><h2 id="attachment-sheet-title">Bring something in.</h2></div><button className="attachment-sheet-close" onClick={onClose} aria-label="Close attachment picker"><X size={18} /></button></div><div className="attachment-sheet-options"><AttachmentOption icon={<Camera size={22} />} title="Camera" detail="Record a new clip" onClick={onCamera} /><AttachmentOption icon={<ImageIcon size={22} />} title="Gallery" detail="Photos & videos" onClick={onGallery} /><AttachmentOption icon={<FileText size={22} />} title="Files" detail="Browse your device" onClick={onFiles} /></div>{attachments.length > 0 && <div className="attachment-sheet-recent"><div className="attachment-sheet-recent-head"><strong>In this edit</strong><span>{attachments.length} selected</span></div><div className="attachment-recent-grid">{attachments.slice(-4).map((attachment) => <button className="attachment-recent-item" key={attachment.id} onClick={() => onSelectRecent(attachment)} aria-label={`Use ${attachment.file.name}`}>{attachment.file.type.startsWith('video/') ? <video src={attachment.url} muted playsInline /> : attachment.file.type.startsWith('image/') ? <img src={attachment.url} alt="" /> : <div className="attachment-audio-placeholder"><Mic size={24} /></div>}<span className="attachment-recent-type">{attachment.file.type.startsWith('video/') ? <Film size={11} /> : <ImageIcon size={11} />}</span></button>)}</div></div>}<p className="attachment-sheet-note">Your media stays attached to this edit session. You can add more at any time.</p></section></div>
}

function AttachmentOption({ icon, title, detail, onClick }: { icon: ReactNode; title: string; detail: string; onClick: () => void }): JSX.Element {
  return <button className="attachment-option" onClick={onClick}><span className="attachment-option-icon">{icon}</span><span><strong>{title}</strong><small>{detail}</small></span></button>
}

function MainView({ onOpenAI }: { onOpenAI: () => void }): JSX.Element {
  return <section className="main-view"><div className="main-heading"><div><p className="eyebrow">PROJECTS</p><h1>Your studio, without the clutter.</h1><p>Projects and recent work stay here. AI Lab is where you create.</p></div><button className="primary-button" onClick={onOpenAI}><Sparkles size={17} /> Open AI Lab</button></div><div className="main-grid"><div className="hero-project"><div className="hero-project-art"><span>RECENT</span><div className="fake-frame"><div className="frame-light" /><div className="frame-subject" /></div></div><div className="project-info"><div><p className="eyebrow">PROJECT</p><h2>Untitled campaign</h2><span>Last worked on just now</span></div><button className="icon-button"><MoreHorizontal size={18} /></button></div></div><div className="quick-panel"><div className="rail-heading"><span>Continue</span><Clock3 size={16} /></div><button onClick={onOpenAI}><span className="quick-icon"><Sparkles size={18} /></span><span><strong>Continue with AI</strong><small>Pick up your last conversation</small></span><ChevronRight size={16} /></button><button onClick={onOpenAI}><span className="quick-icon"><Film size={18} /></span><span><strong>Recent media</strong><small>Manage uploaded footage</small></span><ChevronRight size={16} /></button></div></div><div className="storage-line"><div><strong>Storage</strong><span>2.4 TB of 5 TB used</span></div><div className="storage-bar"><span /></div><button>Manage</button></div></section>
}

function MeView({ theme, onTheme, showThemePicker, setShowThemePicker, onBack }: { theme: Theme; onTheme: (theme: Theme) => void; showThemePicker: boolean; setShowThemePicker: (open: boolean) => void; onBack: () => void }): JSX.Element {
  return <section className="me-view"><div className="profile-hero"><div className="large-avatar">H</div><div><p className="eyebrow">ACCOUNT</p><h1>Harrison</h1><p>Personal workspace · Pro plan</p></div><button className="soft-button" onClick={onBack}><Sparkles size={16} /> AI Lab</button></div><div className="settings-grid"><button className="settings-card" onClick={() => setShowThemePicker(!showThemePicker)}><div className="settings-icon"><Sparkles size={18} /></div><div><strong>Appearance</strong><span>{themes.find((item) => item.id === theme)?.name} · light & dark themes</span></div><ChevronRight size={17} /></button><button className="settings-card"><div className="settings-icon"><Settings size={18} /></div><div><strong>Preferences</strong><span>Editing defaults and notifications</span></div><ChevronRight size={17} /></button><button className="settings-card"><div className="settings-icon"><Download size={18} /></div><div><strong>Storage</strong><span>Manage videos, projects and deleted files</span></div><ChevronRight size={17} /></button><button className="settings-card danger"><div className="settings-icon"><Trash2 size={18} /></div><div><strong>Recently deleted</strong><span>Restore or permanently remove files</span></div><ChevronRight size={17} /></button></div>{showThemePicker && <div className="theme-panel">{themes.map((item) => <button className={theme === item.id ? 'selected' : ''} key={item.id} onClick={() => { onTheme(item.id); setShowThemePicker(false) }}><span className="theme-swatches">{item.swatches.map((swatch) => <i key={swatch} style={{ background: swatch }} />)}</span><span><strong>{item.name}</strong><small>{item.detail}</small></span>{theme === item.id && <CheckCircle2 size={17} />}</button>)}</div>}<div className="account-note"><AlertCircle size={17} /><span>Pilgrix keeps the complex editing machinery behind the scenes. Your workspace stays focused on ideas, media and results.</span></div></section>
}
