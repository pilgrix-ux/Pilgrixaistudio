import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'

type Pal = { id: string; emoji: string; label: string; x: number; y: number; size: number; delay: number; drift: number }
type LivingPalsProps = { page: 'ai' | 'images' }
type Position = { x: number; y: number; scale: number; rotate: number }
type Gesture = { x: number; y: number; lastX: number; lastY: number; time: number }

const AI_PALS: Pal[] = [
  { id: 'spark', emoji: '✦', label: 'Spark', x: 13, y: 25, size: 66, delay: 0, drift: 7 },
  { id: 'mochi', emoji: '◕‿◕', label: 'Mochi', x: 84, y: 29, size: 72, delay: 1.2, drift: 9 },
  { id: 'pixel', emoji: '✧', label: 'Pixel', x: 9, y: 63, size: 60, delay: 2.1, drift: 8 },
  { id: 'bubble', emoji: '◌', label: 'Bubble', x: 89, y: 64, size: 62, delay: 0.7, drift: 10 },
  { id: 'sprout', emoji: '⌁', label: 'Sprout', x: 19, y: 78, size: 54, delay: 1.8, drift: 6 },
]
const IMAGE_PALS: Pal[] = [
  { id: 'dream', emoji: '✦', label: 'Dream', x: 12, y: 27, size: 66, delay: 0.3, drift: 8 },
  { id: 'color', emoji: '●', label: 'Color', x: 86, y: 28, size: 70, delay: 1.5, drift: 10 },
  { id: 'lens', emoji: '◉', label: 'Lens', x: 10, y: 66, size: 58, delay: 2.3, drift: 7 },
  { id: 'pixel', emoji: '◇', label: 'Pixel', x: 90, y: 63, size: 60, delay: 0.9, drift: 9 },
]

export function LivingPals({ page }: LivingPalsProps): JSX.Element {
  const pals = useMemo(() => page === 'ai' ? AI_PALS : IMAGE_PALS, [page])
  const [positions, setPositions] = useState<Record<string, Position>>({})
  const [pressed, setPressed] = useState<string | null>(null)
  const velocityRef = useRef<Record<string, { x: number; y: number }>>({})
  const gestureRef = useRef<Record<string, Gesture>>({})
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setPositions(Object.fromEntries(pals.map((pal) => [pal.id, { x: pal.x, y: pal.y, scale: 1, rotate: 0 }])))
    velocityRef.current = Object.fromEntries(pals.map((pal) => [pal.id, { x: 0, y: 0 }]))
  }, [pals])

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

  const getPercent = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect()
    if (!rect) return { x: 50, y: 50 }
    return { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 }
  }

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    const point = getPercent(event)
    gestureRef.current[id] = { x: point.x, y: point.y, lastX: point.x, lastY: point.y, time: performance.now() }
    setPressed(id)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setPositions((current) => ({ ...current, [id]: { ...current[id], scale: 0.88 } }))
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
    gesture.time = performance.now()
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
      if (distance > 1.5) velocityRef.current[id] = { x: dx * 0.12, y: dy * 0.12 }
    }
    delete gestureRef.current[id]
    setPressed(null)
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[40] overflow-hidden" aria-label="Pilgrix living companions">
      {pals.map((pal) => {
        const position = positions[pal.id] ?? { x: pal.x, y: pal.y, scale: 1, rotate: 0 }
        const isPressed = pressed === pal.id
        return (
          <button
            key={pal.id}
            type="button"
            title={pal.label}
            aria-label={`${pal.label} interactive companion`}
            onPointerDown={(event) => handlePointerDown(event, pal.id)}
            onPointerMove={(event) => handlePointerMove(event, pal.id)}
            onPointerUp={(event) => release(event, pal.id)}
            onPointerCancel={(event) => release(event, pal.id)}
            className="pointer-events-auto absolute flex items-center justify-center rounded-[42%] border border-white/95 bg-white/65 text-slate-700 shadow-[0_18px_42px_rgba(77,90,180,0.18),inset_0_2px_0_rgba(255,255,255,1)] backdrop-blur-2xl select-none transition-[filter] duration-150 active:brightness-105"
            style={{ left: `${position.x}%`, top: `${position.y}%`, width: pal.size, height: pal.size, transform: `translate(-50%,-50%) rotate(${position.rotate}deg) scale(${isPressed ? 0.9 : position.scale})`, animation: `pilgrix-pal-float 4.8s ease-in-out ${pal.delay}s infinite`, touchAction: 'none', willChange: 'transform' }}
          >
            <span className="relative flex h-[72%] w-[72%] items-center justify-center rounded-[44%] border border-white/80 bg-[radial-gradient(circle_at_32%_25%,rgba(255,255,255,1),rgba(255,255,255,.82)_30%,rgba(186,230,253,.72)_68%,rgba(165,180,252,.7))] text-[17px] font-black text-indigo-500 shadow-[inset_0_3px_10px_rgba(255,255,255,.95),inset_0_-6px_12px_rgba(99,102,241,.12),0_5px_12px_rgba(99,102,241,.12)]">
              <span className="absolute left-[22%] top-[19%] h-2 w-3 rounded-full bg-white/90 blur-[1px]" />
              <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,.8)]">{pal.emoji}</span>
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,.85)]" />
            </span>
          </button>
        )
      })}
      <style>{`@keyframes pilgrix-pal-float{0%,100%{margin-top:0px}50%{margin-top:-7px}}@media(prefers-reduced-motion:reduce){button[title]{animation:none!important}}`}</style>
    </div>
  )
}
