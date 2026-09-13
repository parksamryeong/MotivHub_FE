import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as Y from 'yjs'
import { fetchTaskYjsState } from '../api/taskYjsState'
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

  // 마지막으로 저장된 Yjs 바이너리 상태를 먼저 조회한다 — 이게 있으면 모든 클라이언트가
  // 완전히 동일한 바이트에서 Y.applyUpdate로 복원하므로, 클라이언트마다 독립적으로 평문을
  // 재구성해서 생기던 구조적 불일치(=서로 다른 clientID로 "같은" 텍스트를 각자 시딩하면
  // Yjs가 다른 항목으로 취급해서 이후 실제 편집이 영원히 병합되지 않던 문제) 자체가
  // 발생하지 않는다.
  const yjsStateQuery = useQuery({
    queryKey: ['tasks', taskId, field, 'yjs-state'],
    queryFn: () => fetchTaskYjsState(taskId, field),
    enabled: canEdit,
  })

  // ydoc이 바뀌면(=새 태스크/필드로 전환) 초기화 상태를 리셋한다.
  useEffect(() => {
    initializedRef.current = false
    setSeeded(false)
    setText(ytext.toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ydoc])

  // 부트스트랩 우선순위: (1) 저장된 Yjs 바이너리 상태가 있으면 그걸로 복원(모든 클라이언트가
  // 구조적으로 동일한 문서에서 시작하게 됨) → (2) 원격 업데이트가 이미 도착해서 내용이 있으면
  // 건너뜀 → (3) 그 무엇도 없으면(이 필드에 한 번도 스냅샷이 저장된 적 없는 초기 상태) 기존
  // 평문(initialContent)으로 폴백 시딩한다. 폴백 시딩만 clientID=0으로 고정한다 — 여러
  // 클라이언트가 동시에 이 폴백 경로를 타면(스냅샷이 아직 한 번도 없었던 아주 초기 상태에서만
  // 가능한 경합) 여전히 구조적 불일치 위험이 있어서, 그 좁은 경우에 한해 예방한다. 바이너리
  // 상태로 복원하는 경우는 모든 클라이언트가 완전히 같은 바이트를 적용하므로 이 트릭이
  // 필요 없다.
  useEffect(() => {
    if (!canEdit || initializedRef.current) return
    if (ytext.length > 0) {
      // 원격 업데이트가 이미 도착해서 내용이 있음 — 이 클라이언트가 뭘 더 시딩할 필요 없음.
      initializedRef.current = true
      setSeeded(true)
      return
    }
    if (yjsStateQuery.data === undefined) return // 아직 로딩 중

    if (yjsStateQuery.data.state) {
      Y.applyUpdate(ydoc, fromBase64(yjsStateQuery.data.state), 'init')
      initializedRef.current = true
      setSeeded(true)
      return
    }

    // 저장된 바이너리 상태가 없음(한 번도 스냅샷이 없었던 초기 상태) — 평문으로 폴백.
    if (initialContent === undefined) return // 평문도 아직 로딩 중

    if (ytext.length === 0 && initialContent) {
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
  }, [canEdit, yjsStateQuery.data, initialContent, ydoc])

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

  // 아직 시딩되지 않은 상태에서는 save-request 구독 자체를 하지 않는다 — 시딩 전에
  // 응답하면 빈 문자열(또는 불완전한 내용)로 이미 저장된 내용을 덮어쓸 수 있다.
  useTopic<Record<string, never>>(
    canEdit && seeded ? `/topic/tasks/${taskId}/${field}/save-request` : null,
    () => {
      publishSnapshot(taskId, field, ytext, ydoc)
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
        publishSnapshot(taskId, field, ytext, ydoc)
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

function publishSnapshot(
  taskId: number,
  field: 'description' | 'note',
  ytext: Y.Text,
  ydoc: Y.Doc
): void {
  publishMessage(`/app/tasks/${taskId}/${field}/snapshot`, {
    content: ytext.toString(),
    yjsState: toBase64(Y.encodeStateAsUpdate(ydoc)),
  })
}
