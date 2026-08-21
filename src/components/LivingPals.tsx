import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'

type Pal = { id: string; label: string; x: number; y: number; size: number; delay: number; drift: number; tint: string; accessory: 'star' | 'leaf' | 'spark' | 'bow' | 'heart' }
type Mood = 'happy' | 'surprised' | 'laughing' | 'dizzy'
type LivingPalsProps = { page: 'ai' | 'images' }
type Position = { x: number; y: number; scale: number; rotate: number }
type Gesture = { x: number; y: number; lastX: number; lastY: number }

const AI_PALS: Pal[] = [
  { id: 'spark', label: 'Spark', x: 13, y: 25, size: 88, delay: 0, drift: 7, tint: 'cyan', accessory: 'star' },
  { id: 'mochi', label: 'Mochi', x: 84, y: 29, size: 96, delay: 1.2, drift: 9, tint: 'violet', accessory: 'heart' },
  { id: 'pixel', label: 'Pixel', x: 9, y: 63, size: 82, delay: 2.1, drift: 8, tint: 'blue', accessory: 'spark' },
  { id: 'bubble', label: 'Bubble', x: 89, y: 64, size: 86, delay: 0.7, drift: 10, tint: 'sky', accessory: 'bow' },
  { id: 'sprout', label: 'Sprout', x: 19, y: 78, size: 78, delay: 1.8, drift: 6, tint: 'emerald', accessory: 'leaf' },
]
const IMAGE_PALS: Pal[] = [
  { id: 'dream', label: 'Dream', x: 12, y: 27, size: 90, delay: 0.3, drift: 8, tint: 'violet', accessory: 'star' },
  { id: 'color', label: 'Color', x: 86, y: 28, size: 96, delay: 1.5, drift: 10, tint: 'cyan', accessory: 'heart' },
  { id: 'lens', label: 'Lens', x: 10, y: 66, size: 82, delay: 2.3, drift: 7, tint: 'blue', accessory: 'spark' },
  { id: 'pixel', label: 'Pixel', x: 90, y: 63, size: 86, delay: 0.9, drift: 9, tint: 'sky', accessory: 'bow' },
]

const tintStyles: Record<Pal['tint'], string> = {
  cyan: 'from-white via-cyan-100 to-cyan-300',
  violet: 'from-white via-violet-100 to-indigo-300',
  blue: 'from-white via-blue-100 to-blue-300',
  sky: 'from-white via-sky-100 to-sky-300',
  emerald: 'from-white via-emerald-100 to-teal-300',
}

function Face({ mood }: { mood: Mood }) {
  if (mood === 'dizzy') return <span className="relative z-10 flex items-center justify-center gap-3 text-indigo-700"><span className="text-[15px] font-black">×</span><span className="text-[15px] font-black">×</span><span className="absolute top-[22px] text-[19px] font-black">〰</span></span>
  if (mood === 'surprised') return <span className="relative z-10 flex items-center justify-center gap-3 text-indigo-700"><span className="h-[8px] w-[8px] rounded-full bg-indigo-700"/><span className="h-[8px] w-[8px] rounded-full bg-indigo-700"/><span className="absolute top-[22px] h-[12px] w-[10px] rounded-full border-2 border-indigo-700 bg-white/40"/></span>
  if (mood === 'laughing') return <span className="relative z-10 flex items-center justify-center gap-3 text-indigo-700"><span className="h-[5px] w-[11px] rounded-full bg-indigo-700 rotate-[18deg]"/><span className="h-[5px] w-[11px] rounded-full bg-indigo-700 -rotate-[18deg]"/><span className="absolute top-[20px] h-[13px] w-[22px] rounded-b-full bg-indigo-600/90"/><span className="absolute -left-4 top-[19px] h-2 w-3 rounded-full bg-pink-300/70"/><span className="absolute -right-4 top-[19px] h-2 w-3 rounded-full bg-pink-300/70"/></span>
  return <span className="relative z-10 flex items-center justify-center gap-3 text-indigo-700"><span className="relative h-[9px] w-[9px] rounded-full bg-indigo-700"><i className="absolute left-[2px] top-[1px] h-[2px] w-[2px] rounded-full bg-white"/></span><span className="relative h-[9px] w-[9px] rounded-full bg-indigo-700"><i className="absolute left-[2px] top-[1px] h-[2px] w-[2px] rounded-full bg-white"/></span><span className="absolute top-[20px] h-[8px] w-[20px] rounded-b-full border-b-[3px] border-indigo-700"/></span>
}

function Accessory({ type }: { type: Pal['accessory'] }) {
  const content = type === 'heart' ? '♥' : type === 'star' ? '✦' : type === 'spark' ? '✧' : type === 'leaf' ? '⌁' : '⌒'
  return <span className="absolute -right-1 -top-3 z-20 flex h-7 w-7 rotate-12 items-center justify-center rounded-full border border-white/80 bg-white/75 text-[13px] font-black text-cyan-500 shadow-[0_5px_15px_rgba(56,189,248,.22)] backdrop-blur-md">{content}</span>
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
          <button key={pal.id} type="button" title={pal.label} aria-label={`${pal.label} interactive companion`} onPointerDown={(event) => handlePointerDown(event, pal.id)} onPointerMove={(event) => handlePointerMove(event, pal.id)} onPointerUp={(event) => release(event, pal.id)} onPointerCancel={(event) => release(event, pal.id)} className="pointer-events-auto absolute flex items-center justify-center rounded-[48%] border border-white/90 bg-white/55 text-slate-700 shadow-[0_24px_60px_rgba(76,81,191,.22),inset_0_2px_0_rgba(255,255,255,1)] backdrop-blur-xl select-none outline-none transition-[filter,box-shadow] duration-200 hover:shadow-[0_28px_70px_rgba(76,81,191,.28),inset_0_2px_0_rgba(255,255,255,1)] focus-visible:ring-2 focus-visible:ring-cyan-300/70 active:brightness-105" style={{ left: `${position.x}%`, top: `${position.y}%`, width: pal.size, height: pal.size, transform: `translate(-50%,-50%) rotate(${position.rotate}deg) scale(${isPressed ? 0.9 : position.scale})`, animation: `pilgrix-pal-float 4.8s ease-in-out ${pal.delay}s infinite`, touchAction: 'none', willChange: 'transform' }}>
            <span className={`relative flex h-[82%] w-[82%] items-center justify-center rounded-[46%] border border-white/90 bg-gradient-to-br ${tintStyles[pal.tint]} shadow-[inset_0_5px_18px_rgba(255,255,255,.98),inset_0_-12px_18px_rgba(79,70,229,.16),0_10px_22px_rgba(99,102,241,.18)]`}>
              <span className="absolute left-[17%] top-[13%] h-4 w-7 rotate-[-18deg] rounded-full bg-white/95 blur-[.4px]" />
              <span className="absolute left-[27%] top-[24%] h-2 w-2 rounded-full bg-white/75" />
              <span className="absolute bottom-[12%] left-[21%] h-3 w-[58%] rounded-full bg-white/20 blur-md" />
              <span className="absolute -bottom-1 left-1/2 h-2 w-[42%] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-md" />
              <Face mood={mood} />
              <span className="absolute -left-2 top-1/2 h-4 w-2 -translate-y-1/2 rounded-full bg-white/55 shadow-sm" />
              <span className="absolute -right-2 top-1/2 h-4 w-2 -translate-y-1/2 rounded-full bg-white/55 shadow-sm" />
              <Accessory type={pal.accessory} />
              {mood === 'laughing' && <><span className="absolute -left-3 top-0 text-[14px] font-black text-cyan-400">✦</span><span className="absolute -right-4 bottom-1 text-[11px] font-black text-violet-400">✧</span></>}
              {mood === 'surprised' && <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[11px] font-black text-indigo-400">!</span>}
            </span>
          </button>
        )
      })}
      <style>{`@keyframes pilgrix-pal-float{0%,100%{margin-top:0}50%{margin-top:-8px}}@keyframes pilgrix-pal-pop{0%{transform:scale(.8)}60%{transform:scale(1.08)}100%{transform:scale(1)}}@media(prefers-reduced-motion:reduce){button[title]{animation:none!important}}`}</style>
    </div>
  )
}
