import { useEffect, useRef } from 'react'
import { subscribeTopic } from './stompClient'

export function useTopic<T>(
  destination: string | null,
  onMessage: (payload: T) => void
): void {
  const handlerRef = useRef(onMessage)
  handlerRef.current = onMessage

  useEffect(() => {
    if (!destination) return
    const unsubscribe = subscribeTopic(destination, (payload) => {
      handlerRef.current(payload as T)
    })
    return unsubscribe
  }, [destination])
}
