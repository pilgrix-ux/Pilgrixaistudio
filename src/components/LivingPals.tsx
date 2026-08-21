import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'

type Pal = { id: string; label: string; x: number; y: number; size: number; delay: number; drift: number; tint: string; accessory: 'star' | 'leaf' | 'spark' | 'bow' | 'heart' }
type Mood = 'happy' | 'surprised' | 'laughing' | 'dizzy'
type LivingPalsProps = { page: 'ai' | 'images' }
type Position = { x: number; y: number; scale: number; rotate: number }
type Gesture = { x: number; y: number; lastX: number; lastY: number }

const AI_PALS: Pal[] = [
  { id: 'spark', label: 'Spark', x: 13, y: 25, size: 94, delay: 0, drift: 7, tint: 'cyan', accessory: 'star' },
  { id: 'mochi', label: 'Mochi', x: 84, y: 29, size: 102, delay: 1.2, drift: 9, tint: 'violet', accessory: 'heart' },
  { id: 'pixel', label: 'Pixel', x: 9, y: 63, size: 88, delay: 2.1, drift: 8, tint: 'blue', accessory: 'spark' },
  { id: 'bubble', label: 'Bubble', x: 89, y: 64, size: 92, delay: 0.7, drift: 10, tint: 'sky', accessory: 'bow' },
  { id: 'sprout', label: 'Sprout', x: 19, y: 78, size: 84, delay: 1.8, drift: 6, tint: 'emerald', accessory: 'leaf' },
]
const IMAGE_PALS: Pal[] = [
  { id: 'dream', label: 'Dream', x: 12, y: 27, size: 96, delay: 0.3, drift: 8, tint: 'violet', accessory: 'star' },
  { id: 'color', label: 'Color', x: 86, y: 28, size: 102, delay: 1.5, drift: 10, tint: 'cyan', accessory: 'heart' },
  { id: 'lens', label: 'Lens', x: 10, y: 66, size: 88, delay: 2.3, drift: 7, tint: 'blue', accessory: 'spark' },
  { id: 'pixel', label: 'Pixel', x: 90, y: 63, size: 92, delay: 0.9, drift: 9, tint: 'sky', accessory: 'bow' },
]

const tintStyles: Record<Pal['tint'], string> = {
  cyan: 'from-white via-cyan-100 to-cyan-300',
  violet: 'from-white via-violet-100 to-indigo-300',
  blue: 'from-white via-blue-100 to-blue-300',
  sky: 'from-white via-sky-100 to-sky-300',
  emerald: 'from-white via-emerald-100 to-teal-300',
}

function Face({ mood }: { mood: Mood }) {
  if (mood === 'dizzy') return (
    <span className="absolute left-1/2 top-[38%] z-20 flex -translate-x-1/2 items-center gap-3 text-indigo-800">
      <span className="text-[18px] font-black">×</span><span className="text-[18px] font-black">×</span>
      <span className="absolute left-1/2 top-5 -translate-x-1/2 text-[22px] font-black">〰</span>
    </span>
  )
  if (mood === 'surprised') return (
    <span className="absolute left-1/2 top-[35%] z-20 flex -translate-x-1/2 items-center gap-4 text-indigo-800">
      <span className="h-3 w-3 rounded-full bg-indigo-800 shadow-[0_1px_2px_rgba(0,0,0,.12)]"/><span className="h-3 w-3 rounded-full bg-indigo-800 shadow-[0_1px_2px_rgba(0,0,0,.12)]"/>
      <span className="absolute left-1/2 top-6 h-4 w-3 -translate-x-1/2 rounded-full border-[2.5px] border-indigo-800 bg-white/30"/>
    </span>
  )
  if (mood === 'laughing') return (
    <span className="absolute left-1/2 top-[35%] z-20 flex -translate-x-1/2 items-center gap-4 text-indigo-800">
      <span className="h-2 w-4 rotate-[18deg] rounded-full bg-indigo-800"/><span className="h-2 w-4 -rotate-[18deg] rounded-full bg-indigo-800"/>
      <span className="absolute left-1/2 top-6 h-5 w-7 -translate-x-1/2 rounded-b-[55%] bg-indigo-700 shadow-inner"/>
      <span className="absolute -left-7 top-5 h-2.5 w-4 rounded-full bg-pink-300/80"/><span className="absolute -right-7 top-5 h-2.5 w-4 rounded-full bg-pink-300/80"/>
    </span>
  )
  return (
    <span className="absolute left-1/2 top-[35%] z-20 flex -translate-x-1/2 items-center gap-4">
      <span className="relative h-3 w-3 rounded-full bg-indigo-800 shadow-[0_1px_2px_rgba(0,0,0,.12)]"><i className="absolute left-[3px] top-[2px] h-1 w-1 rounded-full bg-white"/></span>
      <span className="relative h-3 w-3 rounded-full bg-indigo-800 shadow-[0_1px_2px_rgba(0,0,0,.12)]"><i className="absolute left-[3px] top-[2px] h-1 w-1 rounded-full bg-white"/></span>
      <span className="absolute left-1/2 top-6 h-2.5 w-6 -translate-x-1/2 rounded-b-full border-b-[3px] border-indigo-800"/>
      <span className="absolute -left-7 top-5 h-2 w-3.5 rounded-full bg-pink-300/65"/><span className="absolute -right-7 top-5 h-2 w-3.5 rounded-full bg-pink-300/65"/>
    </span>
  )
}

function Accessory({ type }: { type: Pal['accessory'] }) {
  const content = type === 'heart' ? '♥' : type === 'star' ? '✦' : type === 'spark' ? '✧' : type === 'leaf' ? '⌁' : '⌒'
  return <span className="absolute -right-2 -top-4 z-30 flex h-8 w-8 rotate-12 items-center justify-center rounded-full border border-white/90 bg-white/80 text-[14px] font-black text-cyan-500 shadow-[0_6px_18px_rgba(56,189,248,.24)] backdrop-blur-md">{content}</span>
}

export function LivingPals({ page }: LivingPalsProps): JSX.Element {
  const pals = useMemo(() => page === 'ai' ? AI_PALS : IMAGE_PALS, [page])
  const [positions, setPositions] = useState<Record<string, Position>>({})
  const [pressed, setPressed] = useState<string | null>(null)
  const [moods, setMoods] = useState<Record<string, Mood>>({})
  const velocityRef = useRef<Record<string, { x: number; y: number }>>({})
  const gestureRef = useRef<Record<string, Gesture>>({})
  const rafRef = useRef<number | null>(null)
  const moodTimers = useRef<Record<string, number>>({})

  useEffect(() => {
    setPositions(Object.fromEntries(pals.map((pal) => [pal.id, { x: pal.x, y: pal.y, scale: 1, rotate: 0 }])))
    velocityRef.current = Object.fromEntries(pals.map((pal) => [pal.id, { x: 0, y: 0 }]))
  }, [pals])

  useEffect(() => () => Object.values(moodTimers.current).forEach(clearTimeout), [])

  useEffect(() => {
    const tick = () => {
      const time = performance.now()
      setPositions((current) => {
        const next = { ...current }
        for (const pal of pals) {
          const pos = next[pal.id]
          const velocity = velocityRef.current[pal.id]
          if (!pos || !velocity) continue
          velocity.x = velocity.x * 0.93 + Math.sin(time / 1800 + pal.delay) * 0.0035 * pal.drift
          velocity.y = velocity.y * 0.93 + Math.cos(time / 2200 + pal.delay) * 0.0028 * pal.drift
          pos.x = Math.max(5, Math.min(95, pos.x + velocity.x))
          pos.y = Math.max(18, Math.min(84, pos.y + velocity.y))
          pos.rotate = Math.max(-12, Math.min(12, velocity.x * 90))
          pos.scale += (1 - pos.scale) * 0.08
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [pals])

  const setMood = (id: string, mood: Mood, duration = 900) => {
    if (moodTimers.current[id]) clearTimeout(moodTimers.current[id])
    setMoods((current) => ({ ...current, [id]: mood }))
    moodTimers.current[id] = window.setTimeout(() => setMoods((current) => ({ ...current, [id]: 'happy' })), duration)
  }

  const getPercent = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect()
    if (!rect) return { x: 50, y: 50 }
    return { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 }
  }

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    const point = getPercent(event)
    gestureRef.current[id] = { x: point.x, y: point.y, lastX: point.x, lastY: point.y }
    setPressed(id)
    setMood(id, 'surprised', 650)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setPositions((current) => ({ ...current, [id]: { ...current[id], scale: 0.82 } }))
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    const gesture = gestureRef.current[id]
    if (!gesture) return
    const point = getPercent(event)
    const dx = point.x - gesture.lastX
    const dy = point.y - gesture.lastY
    velocityRef.current[id] = { x: dx * 0.65, y: dy * 0.65 }
    gesture.lastX = point.x
    gesture.lastY = point.y
    setPositions((current) => {
      const pos = current[id]
      if (!pos) return current
      return { ...current, [id]: { ...pos, x: point.x, y: point.y, scale: 0.94, rotate: Math.max(-18, Math.min(18, dx * 100)) } }
    })
  }

  const release = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    const gesture = gestureRef.current[id]
    if (gesture) {
      const point = getPercent(event)
      const dx = point.x - gesture.x
      const dy = point.y - gesture.y
      const distance = Math.hypot(dx, dy)
      if (distance > 1.5) {
        velocityRef.current[id] = { x: dx * 0.14, y: dy * 0.14 }
        setMood(id, distance > 8 ? 'laughing' : 'happy', 1200)
      } else setMood(id, 'laughing', 850)
    }
    delete gestureRef.current[id]
    setPressed(null)
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[40] overflow-hidden" data-pilgrix-living-pals="true" aria-label="Pilgrix living companions">
      {pals.map((pal) => {
        const position = positions[pal.id] ?? { x: pal.x, y: pal.y, scale: 1, rotate: 0 }
        const isPressed = pressed === pal.id
        const mood = moods[pal.id] ?? 'happy'
        return (
          <button key={pal.id} type="button" title={pal.label} aria-label={`${pal.label} interactive companion`} onPointerDown={(event) => handlePointerDown(event, pal.id)} onPointerMove={(event) => handlePointerMove(event, pal.id)} onPointerUp={(event) => release(event, pal.id)} onPointerCancel={(event) => release(event, pal.id)} className="pointer-events-auto absolute flex items-center justify-center select-none outline-none" style={{ left: `${position.x}%`, top: `${position.y}%`, width: pal.size, height: pal.size + 10, transform: `translate(-50%,-50%) rotate(${position.rotate}deg) scale(${isPressed ? 0.9 : position.scale})`, animation: `pilgrix-pal-float 4.8s ease-in-out ${pal.delay}s infinite`, touchAction: 'none', willChange: 'transform' }}>
            {/* Defined chubby character: head, cheek/body silhouette and feet are separate layers instead of one rounded square. */}
            <span className={`relative block h-[86%] w-[86%] rounded-[47%_53%_50%_50%/43%_45%_55%_57%] border border-white/90 bg-gradient-to-br ${tintStyles[pal.tint]} shadow-[0_24px_50px_rgba(76,81,191,.22),inset_0_5px_20px_rgba(255,255,255,.98),inset_0_-14px_22px_rgba(79,70,229,.16)]`}>
              <span className="absolute -left-[9%] top-[39%] h-[20%] w-[16%] rounded-full border border-white/80 bg-white/55 shadow-sm" />
              <span className="absolute -right-[9%] top-[39%] h-[20%] w-[16%] rounded-full border border-white/80 bg-white/55 shadow-sm" />
              <span className="absolute left-[18%] top-[15%] h-[18%] w-[30%] -rotate-[20deg] rounded-full bg-white/90 blur-[.5px]" />
              <span className="absolute left-[27%] top-[26%] h-2.5 w-2.5 rounded-full bg-white/75" />
              <span className="absolute bottom-[13%] left-[19%] h-[12%] w-[62%] rounded-full bg-white/25 blur-md" />
              <Face mood={mood} />
              {/* tiny feet give the silhouette a character-like base */}
              <span className="absolute -bottom-[2%] left-[22%] h-[12%] w-[23%] rounded-full border border-white/70 bg-indigo-300/35 shadow-sm" />
              <span className="absolute -bottom-[2%] right-[22%] h-[12%] w-[23%] rounded-full border border-white/70 bg-indigo-300/35 shadow-sm" />
              <Accessory type={pal.accessory} />
              {mood === 'laughing' && <><span className="absolute -left-4 top-0 text-[16px] font-black text-cyan-400">✦</span><span className="absolute -right-4 bottom-2 text-[12px] font-black text-violet-400">✧</span></>}
              {mood === 'surprised' && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[12px] font-black text-indigo-400">!</span>}
            </span>
          </button>
        )
      })}
      <style>{`@keyframes pilgrix-pal-float{0%,100%{margin-top:0}50%{margin-top:-8px}}@media(prefers-reduced-motion:reduce){button[title]{animation:none!important}}`}</style>
    </div>
  )
}
