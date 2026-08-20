import { useEffect, useState } from 'react'
import { ArrowLeft, ImagePlus, Trash2 } from 'lucide-react'

type StoredImage = {
  id: string
  name: string
  url: string
  createdAt: string
}

const STORAGE_KEY = 'pilgrix.images.v1'

function readImages(): StoredImage[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is StoredImage => {
      if (!item || typeof item !== 'object') return false
      const value = item as Record<string, unknown>
      return typeof value.id === 'string' && typeof value.name === 'string' && typeof value.url === 'string' && typeof value.createdAt === 'string'
    }) : []
  } catch {
    return []
  }
}

function writeImages(images: StoredImage[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(images))
}

export function ImagesPage({ onBack }: { onBack: () => void }): JSX.Element {
  const [images, setImages] = useState<StoredImage[]>([])

  useEffect(() => {
    setImages(readImages())
  }, [])

  const addImages = async (files: FileList | null): Promise<void> => {
    if (!files) return
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    const next = [...images]
    for (const file of imageFiles) {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Unable to read image'))
        reader.onerror = () => reject(reader.error ?? new Error('Unable to read image'))
        reader.readAsDataURL(file)
      })
      next.unshift({ id: `image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: file.name, url, createdAt: new Date().toISOString() })
    }
    const limited = next.slice(0, 30)
    setImages(limited)
    writeImages(limited)
  }

  const removeImage = (id: string): void => {
    const next = images.filter((image) => image.id !== id)
    setImages(next)
    writeImages(next)
  }

  return (
    <main className="fixed inset-0 z-0 flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-50/95 font-sans text-slate-800">
      <div className="pointer-events-none absolute right-0 top-10 h-80 w-80 rounded-full bg-gradient-to-br from-sky-200/35 via-indigo-200/25 to-purple-200/25 blur-3xl" />
      <header className="relative z-10 flex shrink-0 items-center gap-3 px-5 pb-3 pt-6">
        <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/85 text-slate-600 shadow-sm" aria-label="Back"><ArrowLeft size={17} /></button>
        <div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-sky-500">PILGRIX</p><h1 className="text-2xl font-black tracking-tight text-slate-900">Images</h1></div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-6">
        <div className="mb-4 flex shrink-0 items-center justify-between rounded-2xl border border-sky-100 bg-white/80 p-3.5 shadow-sm backdrop-blur-md">
          <div><p className="text-sm font-bold text-slate-800">Your images</p><p className="mt-0.5 text-[11px] text-slate-400">Only images you actually add or generate appear here.</p></div>
          <label className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-3.5 text-xs font-bold text-white shadow-md shadow-indigo-500/15">
            <ImagePlus size={16} />Add
            <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => { void addImages(event.target.files); event.currentTarget.value = '' }} />
          </label>
        </div>

        <section className="min-h-0 flex-1 overflow-y-auto pb-4">
          {images.length === 0 ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 text-indigo-500"><ImagePlus size={27} strokeWidth={1.7} /></div>
              <h2 className="text-sm font-bold text-slate-800">No images yet</h2>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">There are no generated or uploaded images in your workspace yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {images.map((image) => (
                <article key={image.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 shadow-sm">
                  <div className="aspect-square bg-slate-100"><img src={image.url} alt={image.name} className="h-full w-full object-cover" /></div>
                  <div className="flex items-center justify-between gap-2 p-2.5"><div className="min-w-0"><p className="truncate text-[11px] font-bold text-slate-700">{image.name}</p><p className="mt-0.5 text-[9px] text-slate-400">{new Date(image.createdAt).toLocaleDateString()}</p></div><button type="button" onClick={() => removeImage(image.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500" aria-label={`Delete ${image.name}`}><Trash2 size={14} /></button></div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
