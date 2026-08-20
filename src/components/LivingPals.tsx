import { useEffect, useMemo, useRef, useState } from 'react'

type Pal = {
  id: string
  emoji: string
  label: string
  x: number
  y: number
  size: number
  delay: number
  drift: number
}

type LivingPalsProps = {
  page: 'ai' | 'images'
}

const AI_PALS: Pal[] = [
  { id: 'spark', emoji: '✦', label: 'Spark', x: 13, y: 25, size: 58, delay: 0, drift: 7 },
  { id: 'mochi', emoji: '◕‿◕', label: 'Mochi', x: 84, y: 29, size: 64, delay: 1.2, drift: 9 },
  { id: 'pixel', emoji: '✧', label: 'Pixel', x: 9, y: 63, size: 52, delay: 2.1, drift: 8 },
  { id: 'bubble', emoji: '◌', label: 'Bubble', x: 89, y: 64, size: 54, delay: 0.7, drift: 10 },
  { id: 'sprout', emoji: '⌁', label: 'Sprout', x: 19, y: 78, size: 46, delay: 1.8, drift: 6 },
]

const IMAGE_PALS: Pal[] = [
  { id: 'dream', emoji: '✦', label: 'Dream', x: 12, y: 27, size: 58, delay: 0.3, drift: 8 },
  { id: 'color', emoji: '●', label: 'Color', x: 86, y: 28, size: 60, delay: 1.5, drift: 10 },
  { id: 'lens', emoji: '◉', label: 'Lens', x: 10, y: 66, size: 50, delay: 2.3, drift: 7 },
  { id: 'pixel', emoji: '◇', label: 'Pixel', x: 90, y: 63, size: 52, delay: 0.9, drift: 9 },
]

export function LivingPals({ page }: LivingPalsProps): JSX.Element {
  const pals = useMemo(() => page === 'ai' ? AI_PALS : IMAGE_PALS, [page])
  const [positions, setPositions] = useState<Record<string, { x: number; y: number; scale: number; rotate: number }>>({})
  const [pressed, setPressed] = useState<string | null>(null)
  const velocityRef = useRef<Record<string, { x: number; y: number }>>({})
  const pointerRef = useRef<{ x: number; y: number; lastX: number; lastY: number; lastT: number; active: boolean }>({ x: 0, y: 0, lastX: 0, lastY: 0, lastT: 0, active: false })
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setPositions(Object.fromEntries(pals.map((pal) => [pal.id, { x: pal.x, y: pal.y, scale: 1, rotate: 0 }])))
    velocityRef.current = Object.fromEntries(pals.map((pal) => [pal.id, { x: 0, y: 0 }]))
  }, [pals])

  useEffect(() => {
    const tick = () => {
      setPositions((current) => {
        const next = { ...current }
        for (const pal of pals) {
          const pos = next[pal.id]
          const velocity = velocityRef.current[pal.id]
          if (!pos || !velocity) continue
          const idleX = Math.sin(Date.now() / 1800 + pal.delay) * 0.012 * pal.drift
          const idleY = Math.cos(Date.now() / 2200 + pal.delay) * 0.009 * pal.drift
          velocity.x = velocity.x * 0.91 + idleX
          velocity.y = velocity.y * 0.91 + idleY
          pos.x = Math.max(4, Math.min(96, pos.x + velocity.x))
          pos.y = Math.max(17, Math.min(86, pos.y + velocity.y))
          pos.rotate = Math.max(-10, Math.min(10, velocity.x * 38))
          pos.scale += (1 - pos.scale) * 0.08
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [pals])

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    const now = performance.now()
    pointerRef.current = { x, y, lastX: pointerRef.current.x, lastY: pointerRef.current.y, lastT: now, active: true }
    setPositions((current) => {
      const next = { ...current }
      for (const pal of pals) {
        const pos = next[pal.id]
        if (!pos) continue
        const dx = pos.x - x
        const dy = pos.y - y
        const distance = Math.hypot(dx, dy)
        if (distance < 18) {
          const strength = (18 - distance) / 18
          const safe = distance || 1
          velocityRef.current[pal.id] = {
            x: (dx / safe) * strength * 0.75,
            y: (dy / safe) * strength * 0.75,
          }
          pos.scale = 1 + strength * 0.12
        }
      }
      return next
    })
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    const dx = x - pointerRef.current.lastX
    const dy = y - pointerRef.current.lastY
    const speed = Math.min(3, Math.hypot(dx, dy) * 0.18)
    if (speed > 0.25) {
      setPositions((current) => {
        const next = { ...current }
        for (const pal of pals) {
          const pos = next[pal.id]
          if (!pos) continue
          const distance = Math.hypot(pos.x - x, pos.y - y)
          if (distance < 22) velocityRef.current[pal.id] = { x: dx * speed, y: dy * speed }
        }
        return next
      })
    }
    pointerRef.current.active = false
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[15] overflow-hidden" aria-hidden="true">
      <div className="pointer-events-auto absolute inset-0 touch-none" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={() => { pointerRef.current.active = false }}>
        {pals.map((pal) => {
          const position = positions[pal.id] ?? { x: pal.x, y: pal.y, scale: 1, rotate: 0 }
          const isPressed = pressed === pal.id
          return (
            <button
              key={pal.id}
              type="button"
              title={pal.label}
              onPointerDown={() => { setPressed(pal.id); position.scale = 0.9 }}
              onPointerUp={() => setPressed(null)}
              onPointerCancel={() => setPressed(null)}
              className="absolute flex items-center justify-center rounded-[38%] border border-white/90 bg-white/60 text-slate-700 shadow-[0_14px_35px_rgba(99,102,241,0.14),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition-transform duration-150 select-none active:brightness-105"
              style={{
                left: `${position.x}%`, top: `${position.y}%`, width: pal.size, height: pal.size,
                transform: `translate(-50%,-50%) rotate(${position.rotate}deg) scale(${isPressed ? 0.88 : position.scale})`,
                animation: `pilgrix-pal-float 4.8s ease-in-out ${pal.delay}s infinite`,
              }}
            >
              <span className="relative flex h-[70%] w-[70%] items-center justify-center rounded-[40%] bg-gradient-to-br from-white via-sky-100/90 to-indigo-200/70 text-lg font-black text-indigo-500 shadow-[inset_0_2px_8px_rgba(255,255,255,0.95)]">
                {pal.emoji}
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
              </span>
            </button>
          )
        })}
      </div>
      <style>{`@keyframes pilgrix-pal-float{0%,100%{margin-top:0px}50%{margin-top:-7px}}@media(prefers-reduced-motion:reduce){.pointer-events-auto button{animation:none!important}}`}</style>
    </div>
  )
}
