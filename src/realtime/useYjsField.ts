import { useEffect, useMemo, useRef, useState } from 'react'
import * as Y from 'yjs'
import { publishMessage } from './stompClient'
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
  const [text, setText] = useState('')

  // ydoc이 바뀌면(=새 태스크/필드로 전환) 초기화 상태를 리셋한다.
  useEffect(() => {
    initializedRef.current = false
    setText(ytext.toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ydoc])

  // Y.Text를 딱 한 번만 초기 내용으로 시딩한다. canEdit이 아니거나 아직 초기값을
  // 못 받았거나, 이미 내용이 있으면(원격 업데이트가 시딩보다 먼저 도착한 경우) 건너뛴다
  // (REST 재조회로 값이 갱신돼도 타이핑 중인 내용을 덮어쓰지 않기 위함이기도 함).
  useEffect(() => {
    if (!canEdit || initializedRef.current || initialContent === undefined) return
    if (ytext.length === 0) {
      ydoc.transact(() => {
        ytext.insert(0, initialContent)
      }, 'init')
    }
    initializedRef.current = true
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

  useTopic<Record<string, never>>(
    canEdit ? `/topic/tasks/${taskId}/${field}/save-request` : null,
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
    }
  }, [ydoc, taskId, field])

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
