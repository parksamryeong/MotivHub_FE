import { Client, type IMessage } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuthStore } from '../stores/authStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string

type MessageHandler = (payload: unknown) => void

const subscribers = new Map<string, Set<MessageHandler>>()
const activeSubscriptions = new Map<string, { unsubscribe: () => void }>()

export const stompClient = new Client({
  webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
  reconnectDelay: 5000,
  heartbeatIncoming: 10000,
  heartbeatOutgoing: 10000,
  beforeConnect: () => {
    const { accessToken } = useAuthStore.getState()
    stompClient.connectHeaders = {
      Authorization: accessToken ? `Bearer ${accessToken}` : '',
    }
  },
  onConnect: () => {
    for (const destination of subscribers.keys()) {
      subscribeOnBroker(destination)
    }
  },
  onWebSocketClose: () => {
    // 물리적 연결이 끊기면 기존 구독 참조는 더 이상 유효하지 않다.
    // 재연결되면 onConnect가 subscribers에 남아있는 destination을 전부 다시 구독한다.
    activeSubscriptions.clear()
  },
  onStompError: (frame) => {
    console.warn('[stomp] broker error:', frame.headers.message, frame.body)
  },
  onWebSocketError: (event) => {
    console.warn('[stomp] websocket error:', event)
  },
})

function subscribeOnBroker(destination: string) {
  if (activeSubscriptions.has(destination)) return
  const subscription = stompClient.subscribe(destination, (message: IMessage) => {
    const handlers = subscribers.get(destination)
    if (!handlers || handlers.size === 0) return
    const payload = JSON.parse(message.body)
    handlers.forEach((handler) => handler(payload))
  })
  activeSubscriptions.set(destination, subscription)
}

export function subscribeTopic(destination: string, handler: MessageHandler): () => void {
  let handlers = subscribers.get(destination)
  if (!handlers) {
    handlers = new Set()
    subscribers.set(destination, handlers)
  }
  handlers.add(handler)

  if (stompClient.connected) {
    subscribeOnBroker(destination)
  }

  return () => {
    const current = subscribers.get(destination)
    if (!current) return
    current.delete(handler)
    if (current.size === 0) {
      subscribers.delete(destination)
      const subscription = activeSubscriptions.get(destination)
      if (subscription) {
        subscription.unsubscribe()
        activeSubscriptions.delete(destination)
      }
    }
  }
}

export function publishMessage(destination: string, payload: unknown): void {
  if (!stompClient.connected) return
  stompClient.publish({ destination, body: JSON.stringify(payload) })
}
