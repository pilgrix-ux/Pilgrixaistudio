import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'

type Pal = { id: string; label: string; x: number; y: number; size: number; delay: number; drift: number }
type Mood = 'happy' | 'surprised' | 'laughing' | 'dizzy'
type LivingPalsProps = { page: 'ai' | 'images' }
type Position = { x: number; y: number; scale: number; rotate: number }
type Gesture = { x: number; y: number; lastX: number; lastY: number }

const AI_PALS: Pal[] = [
  { id: 'spark', label: 'Spark', x: 13, y: 25, size: 76, delay: 0, drift: 7 },
  { id: 'mochi', label: 'Mochi', x: 84, y: 29, size: 82, delay: 1.2, drift: 9 },
  { id: 'pixel', label: 'Pixel', x: 9, y: 63, size: 70, delay: 2.1, drift: 8 },
  { id: 'bubble', label: 'Bubble', x: 89, y: 64, size: 72, delay: 0.7, drift: 10 },
  { id: 'sprout', label: 'Sprout', x: 19, y: 78, size: 64, delay: 1.8, drift: 6 },
]
const IMAGE_PALS: Pal[] = [
  { id: 'dream', label: 'Dream', x: 12, y: 27, size: 76, delay: 0.3, drift: 8 },
  { id: 'color', label: 'Color', x: 86, y: 28, size: 82, delay: 1.5, drift: 10 },
  { id: 'lens', label: 'Lens', x: 10, y: 66, size: 70, delay: 2.3, drift: 7 },
  { id: 'pixel', label: 'Pixel', x: 90, y: 63, size: 72, delay: 0.9, drift: 9 },
]

function Face({ mood }: { mood: Mood }) {
  const eye = mood === 'dizzy' ? '✕' : '•'
  const mouth = mood === 'laughing' ? '◡' : mood === 'surprised' ? '○' : mood === 'dizzy' ? '⌁' : '⌣'
  return <span className={`relative z-10 flex items-center justify-center gap-2 text-indigo-700 transition-all duration-200 ${mood === 'laughing' ? 'scale-110' : ''}`}><span>{eye}</span><span>{eye}</span><span className="absolute left-1/2 top-[16px] -translate-x-1/2 text-[15px] font-black">{mouth}</span></span>
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
    setPositions((current) => ({ ...current, [id]: { ...current[id], scale: 0.84 } }))
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
      return { ...current, [id]: { ...pos, x: point.x, y: point.y, scale: 0.94, rotate: Math.max(-14, Math.min(14, dx * 90)) } }
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
        velocityRef.current[id] = { x: dx * 0.12, y: dy * 0.12 }
        setMood(id, distance > 9 ? 'laughing' : 'happy', 1100)
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
          <button key={pal.id} type="button" title={pal.label} aria-label={`${pal.label} interactive companion`} onPointerDown={(event) => handlePointerDown(event, pal.id)} onPointerMove={(event) => handlePointerMove(event, pal.id)} onPointerUp={(event) => release(event, pal.id)} onPointerCancel={(event) => release(event, pal.id)} className="pointer-events-auto absolute flex items-center justify-center rounded-[45%] border border-white/95 bg-white/65 text-slate-700 shadow-[0_20px_48px_rgba(77,90,180,0.2),inset_0_2px_0_rgba(255,255,255,1)] backdrop-blur-2xl select-none transition-[filter] duration-150 active:brightness-105" style={{ left: `${position.x}%`, top: `${position.y}%`, width: pal.size, height: pal.size, transform: `translate(-50%,-50%) rotate(${position.rotate}deg) scale(${isPressed ? 0.88 : position.scale})`, animation: `pilgrix-pal-float 4.8s ease-in-out ${pal.delay}s infinite`, touchAction: 'none', willChange: 'transform' }}>
            <span className="relative flex h-[76%] w-[76%] items-center justify-center rounded-[45%] border border-white/85 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,1),rgba(255,255,255,.86)_28%,rgba(191,235,255,.76)_64%,rgba(165,180,252,.72))] shadow-[inset_0_3px_12px_rgba(255,255,255,.95),inset_0_-8px_14px_rgba(99,102,241,.13),0_6px_16px_rgba(99,102,241,.14)]">
              <span className="absolute left-[20%] top-[16%] h-3 w-5 rounded-full bg-white/90 blur-[1px]" />
              <Face mood={mood} />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,.85)]" />
              {mood === 'laughing' && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[12px] text-cyan-400">✦</span>}
            </span>
          </button>
        )
      })}
      <style>{`@keyframes pilgrix-pal-float{0%,100%{margin-top:0}50%{margin-top:-7px}}@media(prefers-reduced-motion:reduce){button[title]{animation:none!important}}`}</style>
    </div>
  )
}
