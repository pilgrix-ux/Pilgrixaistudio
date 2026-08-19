const ROOT_ID = 'pilgrix-attachment-sheet'

let initialized = false

function getComposerInput(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('.composer input[type="file"]')
}

function dispatchFiles(files: FileList | File[]): void {
  const input = getComposerInput()
  if (!input || !files.length) return
  const transfer = new DataTransfer()
  Array.from(files).forEach((file) => transfer.items.add(file))
  input.files = transfer.files
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

function triggerSource(source: 'camera' | 'gallery' | 'files'): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = source !== 'camera'
  input.accept = source === 'files' ? 'video/*,image/*,audio/*,.pdf,.txt,.srt,.vtt' : 'video/*,image/*'
  if (source === 'camera') input.setAttribute('capture', 'environment')
  input.addEventListener('change', () => {
    if (input.files?.length) dispatchFiles(input.files)
    closeSheet()
  }, { once: true })
  input.click()
}

function icon(kind: string): string {
  if (kind === 'camera') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.5-2h3L13 7h3a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3Z"/><circle cx="10" cy="13.5" r="3.2"/></svg>'
  if (kind === 'gallery') return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="1.4"/><path d="m5 17 4.5-4 3.3 3 2.2-2 4 3"/></svg>'
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>'
}

function buildSheet(): HTMLElement {
  const sheet = document.createElement('div')
  sheet.id = ROOT_ID
  sheet.className = 'attachment-sheet'
  sheet.innerHTML = `
    <button class="attachment-sheet-backdrop" aria-label="Close attachment picker"></button>
    <section class="attachment-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="attachment-sheet-title">
      <div class="attachment-sheet-handle"></div>
      <div class="attachment-sheet-header">
        <div><span class="attachment-sheet-eyebrow">ADD TO THIS EDIT</span><h2 id="attachment-sheet-title">Bring in your media</h2><p>Choose footage, images, audio or a file. Everything stays attached to this edit.</p></div>
        <button class="attachment-sheet-close" aria-label="Close attachment picker">×</button>
      </div>
      <div class="attachment-source-grid">
        <button class="attachment-source attachment-source-camera" data-source="camera"><span class="attachment-source-icon">${icon('camera')}</span><strong>Camera</strong><small>Record now</small></button>
        <button class="attachment-source" data-source="gallery"><span class="attachment-source-icon">${icon('gallery')}</span><strong>Gallery</strong><small>Photos & videos</small></button>
        <button class="attachment-source" data-source="files"><span class="attachment-source-icon">${icon('files')}</span><strong>Files</strong><small>Audio & documents</small></button>
      </div>
      <div class="attachment-recent-head"><div><span class="attachment-sheet-eyebrow">RECENT MEDIA</span><strong>Pick something you already have</strong></div><button class="attachment-recent-more" data-source="gallery">See all</button></div>
      <div class="attachment-recent-grid" aria-label="Recent media">
        <button class="attachment-recent-empty" data-source="gallery"><span>+</span><strong>Add from gallery</strong><small>Your recent media will appear here</small></button>
        <button class="attachment-recent-tip" data-source="files"><span>⌁</span><strong>Reference files</strong><small>Use a video, image, audio or subtitle file</small></button>
      </div>
      <div class="attachment-sheet-footer"><span class="attachment-status-dot"></span><span>Media is attached to your current AI edit session.</span></div>
    </section>`
  document.body.appendChild(sheet)
  return sheet
}

function openSheet(): void {
  let sheet = document.getElementById(ROOT_ID)
  if (!sheet) sheet = buildSheet()
  sheet.classList.add('is-open')
  document.body.classList.add('attachment-sheet-open')
  window.setTimeout(() => sheet?.querySelector<HTMLButtonElement>('.attachment-sheet-close')?.focus(), 20)
}

function closeSheet(): void {
  const sheet = document.getElementById(ROOT_ID)
  sheet?.classList.remove('is-open')
  document.body.classList.remove('attachment-sheet-open')
}

function handleClick(event: MouseEvent): void {
  const target = event.target instanceof Element ? event.target : null
  if (!target) return
  const plus = target.closest('.composer-plus')
  if (plus) {
    event.preventDefault()
    event.stopPropagation()
    openSheet()
    return
  }
  const source = target.closest<HTMLElement>('[data-source]')?.dataset.source as 'camera' | 'gallery' | 'files' | undefined
  if (source) {
    event.preventDefault()
    triggerSource(source)
    return
  }
  if (target.closest('.attachment-sheet-backdrop, .attachment-sheet-close')) {
    event.preventDefault()
    closeSheet()
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeSheet()
}

export function initAttachmentPicker(): void {
  if (initialized) return
  initialized = true
  document.addEventListener('click', handleClick, true)
  document.addEventListener('keydown', handleKeydown)
}

initAttachmentPicker()
