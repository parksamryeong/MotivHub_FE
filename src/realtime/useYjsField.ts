import { useEffect, useMemo, useRef, useState } from 'react'
import * as Y from 'yjs'
import { onStompConnect, publishMessage } from './stompClient'
import { useTopic } from './useTopic'

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function useYjsField({
  taskId,
  field,
  canEdit,
  initialContent,
}: {
  taskId: number
  field: 'description' | 'note'
  canEdit: boolean
  initialContent: string | undefined
}): { text: string; handleChange: (newValue: string) => void } {
  // taskId/field가 바뀌면(같은 컴포넌트 인스턴스가 리마운트 없이 다른 태스크를 보게 되는
  // 라우팅 케이스) 새 Y.Doc을 만든다 — 이전 태스크의 문서를 새 태스크에 이어 쓰지 않기 위함.
  const ydoc = useMemo(() => new Y.Doc(), [taskId, field])
  const ytext = ydoc.getText('content')
  const initializedRef = useRef(false)
  const [seeded, setSeeded] = useState(false)
  const [text, setText] = useState('')

  const canEditRef = useRef(canEdit)
  canEditRef.current = canEdit
  const seededRef = useRef(seeded)
  seededRef.current = seeded

  // ydoc이 바뀌면(=새 태스크/필드로 전환) 초기화 상태를 리셋한다.
  useEffect(() => {
    initializedRef.current = false
    setSeeded(false)
    setText(ytext.toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ydoc])

  // Y.Text를 딱 한 번만 초기 내용으로 시딩한다. canEdit이 아니거나 아직 초기값을
  // 못 받았으면 대기한다. 이미 내용이 있으면(원격 업데이트가 시딩보다 먼저 도착한 경우)
  // 시딩을 건너뛴다(REST 재조회로 값이 갱신돼도 타이핑 중인 내용을 덮어쓰지 않기 위함이기도 함).
  //
  // 시딩은 반드시 clientID=0으로 수행한다 — 여러 클라이언트가 REST로 받은 "같은" 초기
  // 문자열을 각자 자기 clientID로 독립적으로 시딩하면, Yjs 입장에서는 내용은 같아도
  // 구조적으로 다른 항목이 되어버린다(clientID+clock이 아이템의 정체성이므로). 이 상태로
  // 그 위에 실제 편집이 쌓이면, 서로의 시딩 항목을 모르는 두 클라이언트는 그 편집을
  // 영원히 병합하지 못한다. clientID=0으로 고정하면 모든 클라이언트의 시딩 항목이 완전히
  // 동일해져서 Yjs가 자동으로 중복 제거하고, 이후 진짜 편집은 모두 정상적으로 병합된다.
  useEffect(() => {
    if (!canEdit || initializedRef.current || initialContent === undefined) return
    if (ytext.length === 0) {
      const realClientId = ydoc.clientID
      ydoc.clientID = 0
      try {
        ydoc.transact(() => {
          ytext.insert(0, initialContent)
        }, 'init')
      } finally {
        ydoc.clientID = realClientId
      }
    }
    initializedRef.current = true
    setSeeded(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, initialContent, ydoc])

  useEffect(() => {
    const observer = () => setText(ytext.toString())
    ytext.observe(observer)
    setText(ytext.toString())
    return () => ytext.unobserve(observer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ydoc])

  useTopic<{ update: string }>(
    canEdit ? `/topic/tasks/${taskId}/${field}/edits` : null,
    (message) => {
      Y.applyUpdate(ydoc, fromBase64(message.update), 'remote')
    }
  )

  useTopic<{ updates: string[] }>(
    canEdit ? `/user/queue/tasks/${taskId}/${field}/edits` : null,
    (message) => {
      message.updates.forEach((update) => Y.applyUpdate(ydoc, fromBase64(update), 'remote'))
    }
  )

  // 아직 시딩 안 된(REST 초기값 도착 전) 클라이언트가 save-request에
  // 응답해서 저장된 내용을 빈 문자열(또는 불완전한 내용)로 덮어쓸 수 있던 문제 수정 — seeded
  // 상태를 추적해서 시딩 완료 전에는 save-request 구독 자체를 안 함
  useTopic<Record<string, never>>(
    canEdit && seeded ? `/topic/tasks/${taskId}/${field}/save-request` : null,
    () => {
      publishMessage(`/app/tasks/${taskId}/${field}/snapshot`, { content: ytext.toString() })
    }
  )

  useEffect(() => {
    function onUpdate(update: Uint8Array, origin: unknown) {
      if (origin === 'remote' || origin === 'init') return
      publishMessage(`/app/tasks/${taskId}/${field}/edits`, { update: toBase64(update) })
    }
    ydoc.on('update', onUpdate)
    return () => {
      ydoc.off('update', onUpdate)
      // 이 문서를 더 이상 안 쓰게 되는 시점(다른 태스크/필드로 전환, 또는 컴포넌트
      // 언마운트)에 마지막으로 한 번 스냅샷을 보낸다 — 서버가 구독 해제 감지 시
      // 즉시저장을 시도해주지만, 클라이언트 쪽에서도 마지막 상태를 적극적으로 보내두면
      // 유실 가능성을 줄일 수 있다.
      if (canEditRef.current && seededRef.current) {
        publishMessage(`/app/tasks/${taskId}/${field}/snapshot`, { content: ytext.toString() })
      }
    }
  }, [ydoc, taskId, field])

  // 웹소켓이 (재)연결되면 이 클라이언트가 가진 문서 전체 상태를 다시 브로드캐스트한다.
  // 연결이 끊겨있던 동안 로컬에서만 적용되고 서버로 못 나간 변경이 있었다면, 연결 직후
  // 이걸로 다른 사람에게도 반영된다. 이미 같은 내용인 클라이언트가 받아도 Yjs가 알아서
  // 중복 제거하므로 해롭지 않다.
  useEffect(() => {
    if (!canEdit) return
    return onStompConnect(() => {
      if (!seededRef.current) return
      const update = Y.encodeStateAsUpdate(ydoc)
      publishMessage(`/app/tasks/${taskId}/${field}/edits`, { update: toBase64(update) })
    })
  }, [canEdit, ydoc, taskId, field])

  function handleChange(newValue: string): void {
    if (!canEdit) return
    const oldValue = ytext.toString()
    if (oldValue === newValue) return

    let start = 0
    while (
      start < oldValue.length &&
      start < newValue.length &&
      oldValue[start] === newValue[start]
    ) {
      start++
    }
    let oldEnd = oldValue.length
    let newEnd = newValue.length
    while (oldEnd > start && newEnd > start && oldValue[oldEnd - 1] === newValue[newEnd - 1]) {
      oldEnd--
      newEnd--
    }

    ydoc.transact(() => {
      if (oldEnd > start) ytext.delete(start, oldEnd - start)
      if (newEnd > start) ytext.insert(start, newValue.slice(start, newEnd))
    })
  }

  return {
    text: canEdit ? text : (initialContent ?? ''),
    handleChange,
  }
}
