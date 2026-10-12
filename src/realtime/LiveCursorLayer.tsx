import { useEffect, useRef, useState, type ReactElement } from 'react'
import { publishMessage } from './stompClient'
import { useTopic } from './useTopic'
import { useAuthStore } from '../stores/authStore'
import { CursorPointerIcon } from '../components/icons'
import { CURSOR_PALETTE } from './cursorPalette'

const SEND_THROTTLE_MS = 50
const STALE_TIMEOUT_MS = 10000
const STALE_CHECK_INTERVAL_MS = 2000

interface CursorMessage {
  userId: number
  nickname: string
  profileImageUrl: string | null
  x?: number
  y?: number
  visible: boolean
}

interface RemoteCursor {
  nickname: string
  x: number
  y: number
  color: string
  lastSeen: number
}

function pickColor(used: Iterable<string>): string {
  const usedSet = new Set(used)
  return CURSOR_PALETTE.find((color) => !usedSet.has(color)) ?? CURSOR_PALETTE[0]
}

export function LiveCursorLayer({ topic, sendTo }: { topic: string; sendTo: string }): ReactElement {
  const selfUserId = useAuthStore((state) => state.user?.id)
  const [cursors, setCursors] = useState<Map<number, RemoteCursor>>(new Map())
  const colorByUserRef = useRef<Map<number, string>>(new Map())

  useTopic<CursorMessage>(topic, (message) => {
    if (message.userId === selfUserId) return
    setCursors((prev) => {
      const next = new Map(prev)
      if (!message.visible || message.x === undefined || message.y === undefined) {
        next.delete(message.userId)
        return next
      }
      let color = colorByUserRef.current.get(message.userId)
      if (!color) {
        color = pickColor(colorByUserRef.current.values())
        colorByUserRef.current.set(message.userId, color)
      }
      next.set(message.userId, {
        nickname: message.nickname,
        x: message.x,
        y: message.y,
        color,
        lastSeen: Date.now(),
      })
      return next
    })
  })

  // 네트워크가 끊겨 visible:false를 못 받는 경우를 대비한 안전장치 — 일정 시간 업데이트가
  // 없는 커서는 지운다.
  useEffect(() => {
    const interval = setInterval(() => {
      setCursors((prev) => {
        const now = Date.now()
        let changed = false
        const next = new Map(prev)
        for (const [userId, cursor] of prev) {
          if (now - cursor.lastSeen > STALE_TIMEOUT_MS) {
            next.delete(userId)
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, STALE_CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let lastSent = 0
    function send(payload: { x?: number; y?: number; visible: boolean }) {
      publishMessage(sendTo, payload)
    }
    function handleMouseMove(e: MouseEvent) {
      const now = performance.now()
      if (now - lastSent < SEND_THROTTLE_MS) return
      lastSent = now
      send({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight, visible: true })
    }
    function handleMouseOut(e: MouseEvent) {
      if (e.relatedTarget === null) send({ visible: false })
    }
    function handleBlur() {
      send({ visible: false })
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseout', handleMouseOut)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseout', handleMouseOut)
      window.removeEventListener('blur', handleBlur)
      send({ visible: false })
    }
  }, [sendTo])

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {[...cursors.entries()].map(([userId, cursor]) => (
        <div
          key={userId}
          className="absolute flex items-center gap-1 transition-[left,top] duration-75 ease-linear"
          style={{ left: `${cursor.x * 100}vw`, top: `${cursor.y * 100}vh` }}
        >
          <CursorPointerIcon className="h-4 w-4" style={{ color: cursor.color }} />
          <span
            className="rounded-md px-1.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.nickname}
          </span>
        </div>
      ))}
    </div>
  )
}
